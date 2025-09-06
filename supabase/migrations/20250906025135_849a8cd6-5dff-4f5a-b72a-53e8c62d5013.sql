-- Improve webhook processing: robust user resolution, plan mapping fallback, proper error_message logging, and user_id backfill on event
CREATE OR REPLACE FUNCTION public.process_webhook_event(event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev RECORD;
  payload jsonb;
  provider text;
  event_type text;
  status_text text;
  customer_email text;
  product_id text;
  price_id text;
  plan_record RECORD;
  target_plan_slug text;
  target_plan_enum public.user_plan;
  interval_text text := 'monthly';
  plan_end timestamptz;
  user_uuid uuid;
  amount_cents integer;
  mapped boolean := false;
BEGIN
  -- Fetch event row
  SELECT * INTO ev FROM public.webhook_events WHERE id = event_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- Idempotency
  IF ev.status = 'processed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'already_processed');
  END IF;

  payload := ev.canonical_event;
  provider := ev.provider::text;

  -- Determine event and status markers
  event_type := COALESCE(
    payload ->> 'event_type',
    payload ->> 'type',
    payload ->> 'event',
    payload #>> '{event,type}',
    payload #>> '{notification_type}'
  );

  status_text := COALESCE(
    payload #>> '{order,status}',
    payload #>> '{status}',
    payload #>> '{data,status}',
    payload #>> '{purchase,status}',
    event_type
  );

  -- Extract customer email
  customer_email := LOWER(COALESCE(
    payload #>> '{Customer,email}',
    payload #>> '{customer,email}',
    payload #>> '{buyer,email}',
    payload #>> '{client,email}',
    payload #>> '{data,customer,email}',
    payload #>> '{subscriber,email}',
    payload ->> 'user_email',
    payload ->> 'email'
  ));

  -- Only process payment success events
  IF COALESCE(LOWER(status_text), '') NOT IN (
      'paid','approved','active','completed','succeeded','purchase_approved','order.paid'
    )
    AND NOT (event_type ILIKE '%paid%' OR event_type ILIKE '%approved%' OR event_type ILIKE '%succeeded%' OR event_type ILIKE '%active%')
  THEN
    UPDATE public.webhook_events SET status = 'discarded', processed_at = now(), error_message = 'non_payment_event' WHERE id = event_id;
    RETURN jsonb_build_object('success', true, 'message', 'event_discarded_non_paid', 'event_type', event_type, 'status', status_text);
  END IF;

  IF customer_email IS NULL OR customer_email = '' THEN
    UPDATE public.webhook_events SET status = 'failed', processed_at = now(), error_message = 'missing_customer_email' WHERE id = event_id;
    RETURN jsonb_build_object('success', false, 'error', 'missing_customer_email');
  END IF;

  -- Resolve user by email (exact case-insensitive)
  SELECT id INTO user_uuid FROM auth.users WHERE LOWER(email) = customer_email LIMIT 1;
  IF user_uuid IS NULL THEN
    -- Keep for later reconciliation when the user signs up
    UPDATE public.webhook_events SET status = 'received', processed_at = now(), error_message = 'user_not_found' WHERE id = event_id;
    RETURN jsonb_build_object('success', true, 'message', 'user_not_found_stored_for_later', 'email', customer_email);
  END IF;

  -- Try to map product/price to plan via platform_products -> plans
  product_id := COALESCE(
    payload #>> '{Product,Id}',
    payload #>> '{product,id}',
    payload ->> 'product_id',
    payload #>> '{data,product_id}',
    payload #>> '{item,product_id}'
  );
  price_id := COALESCE(
    payload ->> 'price_id',
    payload #>> '{data,price_id}'
  );
  amount_cents := COALESCE(
    NULLIF(payload #>> '{order,total}', '')::int,
    NULLIF(payload #>> '{amount_cents}', '')::int,
    NULLIF(payload #>> '{data,amount_cents}', '')::int
  );

  SELECT pp.*, p.slug AS plan_slug, p.interval AS plan_interval
  INTO plan_record
  FROM public.platform_products pp
  JOIN public.plans p ON p.id = pp.plan_id
  WHERE pp.active = true AND p.active = true
    AND (
      (product_id IS NOT NULL AND pp.product_id = product_id)
      OR (price_id IS NOT NULL AND pp.price_id = price_id)
    )
    AND (provider IS NULL OR pp.platform::text = provider)
  LIMIT 1;

  IF plan_record IS NOT NULL THEN
    target_plan_slug := plan_record.plan_slug;
    interval_text := COALESCE(plan_record.plan_interval, 'monthly');
    mapped := true;
  ELSE
    -- Fallback: trust a provided plan_slug if present and valid
    target_plan_slug := LOWER(COALESCE(
      payload ->> 'plan_slug',
      payload #>> '{Subscription,plan,name}',
      payload ->> 'plan'
    ));
    IF target_plan_slug NOT IN ('free','vip','pro') THEN
      UPDATE public.webhook_events SET status = 'failed', processed_at = now(), error_message = 'plan_mapping_not_found' WHERE id = event_id;
      RETURN jsonb_build_object('success', false, 'error', 'plan_mapping_not_found', 'provider', provider, 'product_id', product_id, 'price_id', price_id);
    END IF;
  END IF;

  -- Compute plan end date
  plan_end := CASE LOWER(interval_text)
                WHEN 'monthly' THEN now() + interval '30 days'
                WHEN 'yearly'  THEN now() + interval '365 days'
                WHEN 'weekly'  THEN now() + interval '7 days'
                ELSE now() + interval '30 days'
              END;

  -- Map slug to enum
  target_plan_enum := CASE target_plan_slug
                         WHEN 'vip' THEN 'vip'::public.user_plan
                         WHEN 'pro' THEN 'pro'::public.user_plan
                         ELSE 'free'::public.user_plan
                       END;

  -- Update profile plan and period
  UPDATE public.profiles p
  SET plan = target_plan_enum,
      plan_status = 'active',
      plan_start_date = now(),
      plan_end_date = plan_end,
      updated_at = now()
  WHERE p.user_id = user_uuid;

  -- Upsert subscription only if we mapped to a known platform product
  IF mapped THEN
    INSERT INTO public.subscriptions (
      user_id, platform, plan_id, status, amount_cents, currency, current_period_start, current_period_end, metadata
    ) VALUES (
      user_uuid, plan_record.platform, plan_record.plan_id, 'active', amount_cents, 'BRL', now(), plan_end,
      jsonb_build_object('webhook_event_id', event_id, 'provider', provider, 'product_id', product_id, 'price_id', price_id)
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Mark event processed and backfill user_id (if column exists)
  UPDATE public.webhook_events SET status = 'processed', processed_at = now() WHERE id = event_id;
  BEGIN
    UPDATE public.webhook_events SET user_id = user_uuid WHERE id = event_id;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  -- Audit log
  INSERT INTO public.audit_logs(action, area, actor_id, target_id, metadata)
  VALUES ('plan_upgraded_via_webhook', 'billing', NULL, user_uuid,
          jsonb_build_object('provider', provider, 'plan', target_plan_slug, 'event_id', event_id));

  RETURN jsonb_build_object('success', true, 'provider', provider, 'plan', target_plan_slug, 'user_id', user_uuid);
EXCEPTION WHEN OTHERS THEN
  UPDATE public.webhook_events SET status = 'failed', processed_at = now(), error_message = SQLERRM WHERE id = event_id;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Ensure realtime sends full old/new rows so frontend hook detects plan change
ALTER TABLE public.profiles REPLICA IDENTITY FULL;