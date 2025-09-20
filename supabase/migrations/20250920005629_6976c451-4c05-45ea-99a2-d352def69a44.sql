-- Drop and recreate normalize_webhook_payload function with proper parameter names
DROP FUNCTION IF EXISTS public.normalize_webhook_payload(text, jsonb);
DROP FUNCTION IF EXISTS public.normalize_webhook_payload(platform_enum, jsonb);

-- Text-based normalize_webhook_payload (core implementation)
CREATE OR REPLACE FUNCTION public.normalize_webhook_payload(provider text, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  v_provider text := lower(coalesce(provider, ''));
  v_email text;
  v_product_id text;
  v_plan_slug text;
  v_subscription_id text;
  v_amount_cents integer;
  v_next_payment timestamptz;
  v_access_until timestamptz;
  v_amount_txt text;
  v_amount_num numeric;
BEGIN
  v_email := COALESCE(
    payload->>'user_email',
    payload->>'email',
    payload#>>'{buyer,email}',
    payload#>>'{customer,email}',
    payload#>>'{customer_email}',
    payload#>>'{user,email}',
    payload#>>'{order,buyer,email}',
    payload#>>'{purchase,buyer_email}',
    NULL
  );

  IF v_provider = 'kiwify' THEN
    v_product_id := COALESCE(
      payload->>'product_id',
      payload#>>'{product,id}',
      payload#>>'{order,product_id}',
      payload#>>'{order,items,0,product_id}',
      payload#>>'{items,0,product_id}',
      payload#>>'{plan,product_id}',
      NULL
    );

    v_plan_slug := lower(COALESCE(
      payload->>'plan_slug',
      payload#>>'{plan,slug}',
      payload#>>'{product,slug}',
      payload#>>'{order,plan_slug}',
      NULL
    ));

    v_subscription_id := COALESCE(
      payload->>'subscription_id',
      payload#>>'{subscription,id}',
      payload#>>'{order,subscription,id}',
      payload#>>'{order,subscription_id}',
      NULL
    );

    v_amount_txt := COALESCE(
      payload->>'amount_cents',
      payload->>'amount',
      payload#>>'{order,amount}',
      payload#>>'{charge,amount}',
      payload#>>'{payment,total}',
      NULL
    );

    IF v_amount_txt IS NOT NULL AND v_amount_txt ~ '^[0-9]+$' THEN
      v_amount_cents := v_amount_txt::int;
    ELSIF v_amount_txt IS NOT NULL THEN
      v_amount_num := NULLIF(replace(replace(v_amount_txt, ',', '.'), 'R$', ''), '')::numeric;
      IF v_amount_num IS NOT NULL THEN
        v_amount_cents := round(v_amount_num * 100)::int;
      END IF;
    END IF;

    v_next_payment := COALESCE(
      (payload->>'next_payment')::timestamptz,
      (payload#>>'{subscription,next_payment_date}')::timestamptz,
      (payload#>>'{order,next_charge_date}')::timestamptz,
      NULL
    );

    v_access_until := COALESCE(
      (payload->>'access_until')::timestamptz,
      (payload#>>'{access,valid_until}')::timestamptz,
      (payload#>>'{subscription,access_expires_at}')::timestamptz,
      NULL
    );

  ELSIF v_provider = 'hotmart' THEN
    v_product_id := COALESCE(
      payload->>'product_id',
      payload#>>'{product,prod}',
      payload#>>'{purchase,product,id}',
      NULL
    );

    v_plan_slug := lower(COALESCE(
      payload->>'plan',
      payload#>>'{subscription,plan}',
      payload#>>'{product,plan_slug}',
      NULL
    ));

    v_subscription_id := COALESCE(
      payload->>'subscription_id',
      payload#>>'{subscription,id}',
      payload#>>'{purchase,subscription_id}',
      NULL
    );

    v_amount_txt := COALESCE(
      payload->>'amount_cents',
      payload#>>'{purchase,price}',
      payload#>>'{invoice,amount}',
      NULL
    );
    IF v_amount_txt IS NOT NULL AND v_amount_txt ~ '^[0-9]+$' THEN
      v_amount_cents := v_amount_txt::int;
    ELSIF v_amount_txt IS NOT NULL THEN
      v_amount_num := NULLIF(replace(replace(v_amount_txt, ',', '.'), 'R$', ''), '')::numeric;
      IF v_amount_num IS NOT NULL THEN
        v_amount_cents := round(v_amount_num * 100)::int;
      END IF;
    END IF;

    v_next_payment := COALESCE(
      (payload#>>'{subscription,next_billing}')::timestamptz,
      (payload#>>'{invoice,next_payment}')::timestamptz,
      NULL
    );

    v_access_until := COALESCE(
      (payload#>>'{subscription,access_expires_at}')::timestamptz,
      (payload#>>'{access,valid_until}')::timestamptz,
      NULL
    );

  ELSE
    v_product_id := COALESCE(
      payload->>'product_id',
      payload#>>'{product,id}',
      payload#>>'{order,items,0,product_id}',
      NULL
    );

    v_plan_slug := lower(COALESCE(
      payload->>'plan_slug',
      payload#>>'{plan,slug}',
      NULL
    ));

    v_subscription_id := COALESCE(
      payload->>'subscription_id',
      payload#>>'{subscription,id}',
      NULL
    );

    v_amount_txt := COALESCE(payload->>'amount_cents', payload->>'amount', NULL);
    IF v_amount_txt IS NOT NULL AND v_amount_txt ~ '^[0-9]+$' THEN
      v_amount_cents := v_amount_txt::int;
    ELSIF v_amount_txt IS NOT NULL THEN
      v_amount_num := NULLIF(replace(replace(v_amount_txt, ',', '.'), 'R$', ''), '')::numeric;
      IF v_amount_num IS NOT NULL THEN
        v_amount_cents := round(v_amount_num * 100)::int;
      END IF;
    END IF;

    v_next_payment := (payload->>'next_payment')::timestamptz;
    v_access_until := (payload->>'access_until')::timestamptz;
  END IF;

  RETURN jsonb_build_object(
    'user_email', v_email,
    'product_id', v_product_id,
    'plan_slug', v_plan_slug,
    'external_subscription_id', v_subscription_id,
    'amount_cents', v_amount_cents,
    'next_payment', CASE WHEN v_next_payment IS NULL THEN NULL ELSE to_char(v_next_payment, 'YYYY-MM-DD"T"HH24:MI:SSOF') END,
    'access_until', CASE WHEN v_access_until IS NULL THEN NULL ELSE to_char(v_access_until, 'YYYY-MM-DD"T"HH24:MI:SSOF') END
  );
END;
$$;

-- Overload for platform_enum → call text implementation
CREATE OR REPLACE FUNCTION public.normalize_webhook_payload(provider platform_enum, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN public.normalize_webhook_payload((provider::text), payload);
END;
$$;