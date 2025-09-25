-- Normalize webhook payloads into a canonical shape, prioritizing reliable user linkage via tracking params
CREATE OR REPLACE FUNCTION public.normalize_webhook_payload(provider text, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  s1 text;
  email text;
  plan_slug text;
  product_id text;
  amount_cents integer;
  next_payment timestamptz;
  access_until timestamptz;
  external_subscription_id text;
BEGIN
  IF lower(provider) = 'kiwify' THEN
    -- Try multiple known locations for Kiwify tracking and fields
    s1 := COALESCE(
      payload #>> '{TrackingParameters,s1}',
      payload #>> '{trackingParameters,s1}',
      payload #>> '{tracking_parameters,s1}',
      payload #>> '{s1}',
      payload #>> '{order,tracking_parameters,s1}',
      payload #>> '{data,tracking_parameters,s1}',
      payload #>> '{custom_fields,s1}'
    );

    email := COALESCE(
      payload #>> '{customer,email}',
      payload #>> '{Customer,email}',
      payload #>> '{Subscription,customer,email}',
      payload #>> '{order,customer,email}',
      payload #>> '{email}',
      payload #>> '{data,customer_email}',
      payload #>> '{customer_email}'
    );

    plan_slug := lower(COALESCE(
      payload #>> '{Subscription,plan,slug}',
      payload #>> '{Subscription,plan,name}',
      payload #>> '{plan,slug}',
      payload #>> '{plan,name}',
      payload #>> '{order,plan,slug}',
      payload #>> '{order,plan,name}',
      payload #>> '{Product,Name}', -- sometimes the product name maps to a plan
      payload #>> '{plan_slug}'
    ));

    product_id := COALESCE(
      payload #>> '{Subscription,product_id}',
      payload #>> '{order,product_id}',
      payload #>> '{Product,Id}',
      payload #>> '{product_id}',
      payload #>> '{data,product_id}'
    );

    amount_cents := NULLIF(COALESCE(
      payload #>> '{amount_cents}',
      payload #>> '{Subscription,amount_cents}',
      payload #>> '{order,total}',
      payload #>> '{amount}'
    ), '')::int;

    next_payment := (COALESCE(
      payload #>> '{Subscription,next_payment}',
      payload #>> '{next_payment}'
    ))::timestamptz;

    access_until := (COALESCE(
      payload #>> '{Subscription,customer_access,access_until}',
      payload #>> '{customer_access,access_until}',
      payload #>> '{access_until}'
    ))::timestamptz;

    external_subscription_id := COALESCE(
      payload #>> '{Subscription,id}',
      payload #>> '{subscription_id}',
      payload #>> '{order,subscription_id}'
    );

    result := jsonb_build_object(
      'user_id', s1,
      'email', email,
      'user_email', email,
      'plan_slug', plan_slug,
      'product_id', product_id,
      'amount_cents', amount_cents,
      'next_payment', next_payment,
      'access_until', access_until,
      'external_subscription_id', external_subscription_id
    );

    RETURN result;
  ELSE
    RETURN jsonb_build_object(
      'user_id', payload #>> '{user_id}',
      'user_email', COALESCE(payload #>> '{user_email}', payload #>> '{email}'),
      'plan_slug', lower(COALESCE(payload #>> '{plan_slug}', payload #>> '{plan}')),
      'product_id', payload #>> '{product_id}',
      'amount_cents', NULLIF(payload #>> '{amount_cents}', '')::int,
      'next_payment', (payload #>> '{next_payment}')::timestamptz,
      'access_until', (payload #>> '{access_until}')::timestamptz,
      'external_subscription_id', payload #>> '{external_subscription_id}'
    );
  END IF;
END;
$$;

-- Update main processor to prioritize user_id from normalized payload
CREATE OR REPLACE FUNCTION public.process_webhook_event(event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ev RECORD;
  normalized jsonb;
  v_email text;
  v_user_id uuid;
  v_plan_slug text;
  v_product_id text;
  v_plan_id uuid;
  v_next_payment timestamptz;
  v_access_until timestamptz;
  v_period_end timestamptz;
  v_subscription_id text;
  v_amount_cents integer;
  v_existing boolean;
BEGIN
  SELECT id, provider, raw_payload
  INTO ev
  FROM webhook_events
  WHERE id = event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  normalized := normalize_webhook_payload(ev.provider, ev.raw_payload::jsonb);

  -- Prefer reliable user linkage via user_id (tracking s1)
  v_user_id := NULL;
  IF (normalized ? 'user_id') AND length(COALESCE(normalized->>'user_id','')) > 0 THEN
    BEGIN
      v_user_id := (normalized->>'user_id')::uuid;
    EXCEPTION WHEN others THEN
      v_user_id := NULL;
    END;
  END IF;

  v_email := COALESCE(normalized->>'user_email', normalized->>'email');

  -- If user_id not provided or invalid, fallback to email resolution
  IF v_user_id IS NULL THEN
    IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
      UPDATE webhook_events SET status = 'failed', error_message = 'missing_customer_email' WHERE id = event_id;
      RETURN jsonb_build_object('success', false, 'error', 'missing_customer_email');
    END IF;

    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email) LIMIT 1;

    IF v_user_id IS NULL THEN
      UPDATE webhook_events SET status = 'failed', error_message = 'user_not_found' WHERE id = event_id;
      RETURN jsonb_build_object('success', false, 'error', 'user_not_found', 'email', v_email);
    END IF;
  END IF;

  v_product_id := normalized->>'product_id';
  v_plan_slug := lower(COALESCE(normalized->>'plan_slug', ''));
  v_subscription_id := normalized->>'external_subscription_id';
  v_amount_cents := NULLIF((normalized->>'amount_cents'), '')::int;
  v_next_payment := (normalized->>'next_payment')::timestamptz;
  v_access_until := (normalized->>'access_until')::timestamptz;
  v_period_end := COALESCE(v_access_until, v_next_payment, now() + interval '30 days');

  -- Resolve plan via platform_products if needed
  IF v_plan_slug IS NULL OR v_plan_slug = '' THEN
    SELECT p.slug INTO v_plan_slug
    FROM platform_products pp
    JOIN plans p ON p.id = pp.plan_id AND p.active = true
    WHERE pp.platform::text = ev.provider
      AND pp.product_id = v_product_id
      AND pp.active = true
    LIMIT 1;
  END IF;

  -- Fallback to 'vip' if still empty/unexpected
  IF v_plan_slug IS NULL OR v_plan_slug NOT IN ('vip','pro') THEN
    v_plan_slug := 'vip';
  END IF;

  -- Get internal plan id (optional)
  SELECT id INTO v_plan_id FROM plans WHERE slug = v_plan_slug AND active = true LIMIT 1;

  -- Upsert subscription
  IF v_subscription_id IS NOT NULL AND v_subscription_id <> '' THEN
    SELECT EXISTS(
      SELECT 1 FROM subscriptions 
      WHERE user_id = v_user_id AND external_subscription_id = v_subscription_id
    ) INTO v_existing;

    IF v_existing THEN
      UPDATE subscriptions
      SET 
        status = 'active',
        current_period_start = now(),
        current_period_end = v_period_end,
        amount_cents = COALESCE(v_amount_cents, amount_cents),
        plan_id = COALESCE(v_plan_id, plan_id),
        updated_at = now()
      WHERE user_id = v_user_id AND external_subscription_id = v_subscription_id;
    ELSE
      INSERT INTO subscriptions (
        user_id, external_subscription_id, status, current_period_start, current_period_end, 
        amount_cents, currency, plan_id, metadata
      ) VALUES (
        v_user_id, v_subscription_id, 'active', now(), v_period_end,
        v_amount_cents, 'BRL', v_plan_id, jsonb_build_object('event_id', event_id, 'provider', ev.provider)
      );
    END IF;
  END IF;

  -- Update profile with new plan and period
  UPDATE profiles
  SET 
    plan = v_plan_slug::user_plan,
    plan_status = 'active',
    plan_start_date = now(),
    plan_end_date = v_period_end,
    auto_renewal = true,
    updated_at = now()
  WHERE user_id = v_user_id;

  -- Mark processed
  UPDATE webhook_events SET status = 'processed', processed_at = now() WHERE id = event_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id::text,
    'plan', v_plan_slug,
    'period_end', v_period_end
  );
END;
$function$;