-- Text-based normalize_webhook_payload (core implementation)
CREATE OR REPLACE FUNCTION public.normalize_webhook_payload(provider_input text, payload_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  v_provider text := lower(coalesce(provider_input, ''));
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
    payload_input->>'user_email',
    payload_input->>'email',
    payload_input#>>'{buyer,email}',
    payload_input#>>'{customer,email}',
    payload_input#>>'{customer_email}',
    payload_input#>>'{user,email}',
    payload_input#>>'{order,buyer,email}',
    payload_input#>>'{purchase,buyer_email}',
    NULL
  );

  IF v_provider = 'kiwify' THEN
    v_product_id := COALESCE(
      payload_input->>'product_id',
      payload_input#>>'{product,id}',
      payload_input#>>'{order,product_id}',
      payload_input#>>'{order,items,0,product_id}',
      payload_input#>>'{items,0,product_id}',
      payload_input#>>'{plan,product_id}',
      NULL
    );

    v_plan_slug := lower(COALESCE(
      payload_input->>'plan_slug',
      payload_input#>>'{plan,slug}',
      payload_input#>>'{product,slug}',
      payload_input#>>'{order,plan_slug}',
      NULL
    ));

    v_subscription_id := COALESCE(
      payload_input->>'subscription_id',
      payload_input#>>'{subscription,id}',
      payload_input#>>'{order,subscription,id}',
      payload_input#>>'{order,subscription_id}',
      NULL
    );

    v_amount_txt := COALESCE(
      payload_input->>'amount_cents',
      payload_input->>'amount',
      payload_input#>>'{order,amount}',
      payload_input#>>'{charge,amount}',
      payload_input#>>'{payment,total}',
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
      (payload_input->>'next_payment')::timestamptz,
      (payload_input#>>'{subscription,next_payment_date}')::timestamptz,
      (payload_input#>>'{order,next_charge_date}')::timestamptz,
      NULL
    );

    v_access_until := COALESCE(
      (payload_input->>'access_until')::timestamptz,
      (payload_input#>>'{access,valid_until}')::timestamptz,
      (payload_input#>>'{subscription,access_expires_at}')::timestamptz,
      NULL
    );

  ELSIF v_provider = 'hotmart' THEN
    v_product_id := COALESCE(
      payload_input->>'product_id',
      payload_input#>>'{product,prod}',
      payload_input#>>'{purchase,product,id}',
      NULL
    );

    v_plan_slug := lower(COALESCE(
      payload_input->>'plan',
      payload_input#>>'{subscription,plan}',
      payload_input#>>'{product,plan_slug}',
      NULL
    ));

    v_subscription_id := COALESCE(
      payload_input->>'subscription_id',
      payload_input#>>'{subscription,id}',
      payload_input#>>'{purchase,subscription_id}',
      NULL
    );

    v_amount_txt := COALESCE(
      payload_input->>'amount_cents',
      payload_input#>>'{purchase,price}',
      payload_input#>>'{invoice,amount}',
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
      (payload_input#>>'{subscription,next_billing}')::timestamptz,
      (payload_input#>>'{invoice,next_payment}')::timestamptz,
      NULL
    );

    v_access_until := COALESCE(
      (payload_input#>>'{subscription,access_expires_at}')::timestamptz,
      (payload_input#>>'{access,valid_until}')::timestamptz,
      NULL
    );

  ELSE
    v_product_id := COALESCE(
      payload_input->>'product_id',
      payload_input#>>'{product,id}',
      payload_input#>>'{order,items,0,product_id}',
      NULL
    );

    v_plan_slug := lower(COALESCE(
      payload_input->>'plan_slug',
      payload_input#>>'{plan,slug}',
      NULL
    ));

    v_subscription_id := COALESCE(
      payload_input->>'subscription_id',
      payload_input#>>'{subscription,id}',
      NULL
    );

    v_amount_txt := COALESCE(payload_input->>'amount_cents', payload_input->>'amount', NULL);
    IF v_amount_txt IS NOT NULL AND v_amount_txt ~ '^[0-9]+$' THEN
      v_amount_cents := v_amount_txt::int;
    ELSIF v_amount_txt IS NOT NULL THEN
      v_amount_num := NULLIF(replace(replace(v_amount_txt, ',', '.'), 'R$', ''), '')::numeric;
      IF v_amount_num IS NOT NULL THEN
        v_amount_cents := round(v_amount_num * 100)::int;
      END IF;
    END IF;

    v_next_payment := (payload_input->>'next_payment')::timestamptz;
    v_access_until := (payload_input->>'access_until')::timestamptz;
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