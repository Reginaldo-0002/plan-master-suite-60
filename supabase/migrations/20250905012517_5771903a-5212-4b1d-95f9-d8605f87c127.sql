-- Create or replace a robust webhook processor that updates user plans in realtime
-- This function is called by multiple edge functions after inserting into webhook_events
-- It resolves the user by email, maps product/price to a plan via platform_products -> plans,
-- updates profiles.plan and period dates, and marks the webhook event as processed.

-- SAFETY: SECURITY DEFINER so it can read auth.users and bypass RLS where required.
-- LOGGING: store errors back into webhook_events.status = 'failed' with processed_at.

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
  already_processed boolean := false;
BEGIN
  -- Fetch event
  SELECT * INTO ev FROM public.webhook_events WHERE id = event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- Avoid double-processing
  already_processed := (ev.status = 'processed');
  IF already_processed THEN
    RETURN jsonb_build_object('success', true, 'message', 'already_processed');
  END IF;

  payload := ev.canonical_event;
  provider := COALESCE(ev.provider,
                       payload ->> 'provider',
                       (payload -> 'headers' ->> 'x-provider'));

  -- Normalize event fields
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

  -- Extract email (try multiple paths and lower-case)
  customer_email := LOWER(COALESCE(
    payload #>> '{Customer,email}',
    payload #>> '{customer,email}',
    payload #>> '{buyer,email}',
    payload #>> '{client,email}',
    payload #>> '{data,customer,email}',
    payload #>> '{subscriber,email}',
    payload ->> 'email'
  ));

  -- Product/price identifiers to map to plan
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

  -- Determine if event represents a paid/success state across providers
  -- Common paid indicators
  IF COALESCE(LOWER(status_text), '') NOT IN (
      'paid','approved','active','completed','succeeded','charge.succeeded','purchase_approved','order.paid')
     AND NOT (event_type ILIKE '%paid%' OR event_type ILIKE '%approved%' OR event_type ILIKE '%succeeded%' OR event_type ILIKE '%active%')
  THEN
    -- Not a payment success; mark as discarded
    UPDATE public.webhook_events SET status = 'discarded', processed_at = now() WHERE id = event_id;
    RETURN jsonb_build_object('success', true, 'message', 'event_discarded_non_paid', 'event_type', event_type, 'status', status_text);
  END IF;

  -- Resolve plan via platform_products -> plans
  SELECT pp.*, p.slug AS plan_slug, p.interval AS plan_interval
  INTO plan_record
  FROM public.platform_products pp
  JOIN public.plans p ON p.id = pp.plan_id
  WHERE pp.active = true AND p.active = true
    AND (
      (product_id IS NOT NULL AND pp.product_id = product_id)
      OR (price_id IS NOT NULL AND pp.price_id = price_id)
    )
    AND (
      provider IS NULL OR pp.platform::text = provider
    )
  LIMIT 1;

  IF plan_record IS NULL THEN
    -- Could not map product -> plan; mark failed for investigation
    UPDATE public.webhook_events SET status = 'failed', processed_at = now() WHERE id = event_id;
    RETURN jsonb_build_object('success', false, 'error', 'plan_mapping_not_found', 'provider', provider, 'product_id', product_id, 'price_id', price_id);
  END IF;

  target_plan_slug := plan_record.plan_slug;
  interval_text := COALESCE(plan_record.plan_interval, 'monthly');

  -- Resolve user by email
  IF customer_email IS NULL OR customer_email = '' THEN
    UPDATE public.webhook_events SET status = 'failed', processed_at = now() WHERE id = event_id;
    RETURN jsonb_build_object('success', false, 'error', 'customer_email_not_found');
  END IF;

  SELECT id INTO user_uuid FROM auth.users WHERE LOWER(email) = customer_email LIMIT 1;

  IF user_uuid IS NULL THEN
    -- Not registered yet; mark as received (to be processed later when user signs up)
    UPDATE public.webhook_events SET status = 'received', processed_at = now() WHERE id = event_id;
    RETURN jsonb_build_object('success', true, 'message', 'user_not_found_stored_for_later', 'email', customer_email);
  END IF;

  -- Compute plan end date by interval
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

  -- Update profile plan and dates
  UPDATE public.profiles p
  SET plan = target_plan_enum,
      plan_status = 'active',
      plan_start_date = now(),
      plan_end_date = plan_end,
      updated_at = now()
  WHERE p.user_id = user_uuid;

  -- Optional: upsert a subscription record for reference
  INSERT INTO public.subscriptions (
    user_id, platform, plan_id, status, amount_cents, currency, current_period_start, current_period_end, metadata
  ) VALUES (
    user_uuid, plan_record.platform, plan_record.plan_id, 'active', amount_cents, 'BRL', now(), plan_end,
    jsonb_build_object('webhook_event_id', event_id, 'provider', provider, 'product_id', product_id, 'price_id', price_id)
  ) ON CONFLICT DO NOTHING;

  -- Mark event as processed
  UPDATE public.webhook_events SET status = 'processed', processed_at = now() WHERE id = event_id;

  -- Audit log
  INSERT INTO public.audit_logs(action, area, actor_id, target_id, metadata)
  VALUES ('plan_upgraded_via_webhook', 'billing', NULL, user_uuid,
          jsonb_build_object('provider', provider, 'plan', target_plan_slug, 'event_id', event_id));

  RETURN jsonb_build_object('success', true, 'provider', provider, 'plan', target_plan_slug, 'user_id', user_uuid);
EXCEPTION WHEN OTHERS THEN
  -- Mark as failed and bubble error
  UPDATE public.webhook_events SET status = 'failed', processed_at = now() WHERE id = event_id;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Ensure realtime sends full old/new rows so frontend hook can detect plan change reliably
ALTER TABLE public.profiles REPLICA IDENTITY FULL;