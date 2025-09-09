-- Normalize webhook payloads from different providers (adds Kiwify mapping)
CREATE OR REPLACE FUNCTION public.normalize_webhook_payload(provider_name text, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  p_lower text := lower(provider_name);
  amount_raw text;
  amount_num numeric;
BEGIN
  IF p_lower = 'kiwify' THEN
    -- Prefer product_base_price first, fallback to charge_amount
    amount_raw := COALESCE(
      payload #>> '{Commissions,product_base_price}',
      payload #>> '{Commissions,charge_amount}'
    );

    -- Convert to cents if looks like a decimal; otherwise assume already in BRL units
    -- We'll multiply by 100 defensively when it parses as numeric
    BEGIN
      amount_num := NULLIF(amount_raw, '')::numeric;
    EXCEPTION WHEN others THEN
      amount_num := NULL;
    END;

    RETURN jsonb_build_object(
      'user_email', payload #>> '{Customer,email}',
      'email', payload #>> '{Customer,email}',
      'product_id', payload #>> '{Product,product_id}',
      'plan_slug', lower(COALESCE(payload #>> '{Subscription,plan,name}', '')),
      'external_subscription_id', payload #>> '{subscription_id}',
      'next_payment', payload #>> '{Subscription,next_payment}',
      'access_until', payload #>> '{Subscription,customer_access,access_until}',
      'amount_cents', CASE WHEN amount_num IS NULL THEN NULL ELSE (amount_num * 100)::int END
    );
  ELSE
    -- Generic mapping
    RETURN jsonb_build_object(
      'user_email', COALESCE(payload #>> '{user_email}', payload #>> '{email}', payload #>> '{customer,email}'),
      'email', COALESCE(payload #>> '{email}', payload #>> '{customer,email}'),
      'product_id', COALESCE(payload #>> '{product_id}', payload #>> '{data,object,product}', payload #>> '{Product,product_id}'),
      'plan_slug', lower(COALESCE(payload #>> '{plan,slug}', payload #>> '{plan}', payload #>> '{Subscription,plan,name}', '')),
      'external_subscription_id', COALESCE(payload #>> '{subscription_id}', payload #>> '{data,object,id}', payload #>> '{subscription,id}'),
      'next_payment', COALESCE(payload #>> '{next_payment}', payload #>> '{data,object,current_period_end}'),
      'access_until', COALESCE(payload #>> '{access_until}', payload #>> '{data,object,current_period_end}'),
      'amount_cents', NULLIF(payload #>> '{amount_cents}', '')::int
    );
  END IF;
END;
$$;

-- Ensure realtime updates for profiles propagate full row data
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  END IF;
END$$;