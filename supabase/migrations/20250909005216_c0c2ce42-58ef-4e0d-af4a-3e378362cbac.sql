-- 1) Normalização de payloads (inclui Kiwify)
CREATE OR REPLACE FUNCTION public.normalize_webhook_payload(provider text, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb := payload;
  v_amount numeric;
  v_amount_cents int;
  v_email text;
BEGIN
  IF lower(provider) = 'kiwify' THEN
    v_email := COALESCE(
      payload #>> '{Customer,email}',
      payload->>'email'
    );

    v_amount := NULLIF(payload #>> '{Commissions,product_base_price}', '')::numeric;
    IF v_amount IS NULL THEN
      v_amount := NULLIF(payload #>> '{Commissions,charge_amount}', '')::numeric;
    END IF;

    IF v_amount IS NOT NULL THEN
      -- Se valor vier em reais, converte para centavos
      IF v_amount < 1000 THEN
        v_amount_cents := round(v_amount * 100)::int;
      ELSE
        v_amount_cents := v_amount::int;
      END IF;
    END IF;

    result := jsonb_build_object(
      'provider', 'kiwify',
      'event_type', COALESCE(payload->>'webhook_event_type', payload->>'event_type', 'unknown'),
      'order_status', payload->>'order_status',
      'order_id', COALESCE(payload->>'order_id', payload->'order'->>'id'),
      'user_email', v_email,
      'product_id', COALESCE(payload #>> '{Product,product_id}', payload->>'product_id'),
      'plan_slug', lower(COALESCE(payload #>> '{Subscription,plan,name}', payload->>'plan')),
      'external_subscription_id', COALESCE(payload->>'subscription_id', payload #>> '{Subscription,id}'),
      'next_payment', COALESCE(payload #>> '{Subscription,next_payment}', payload #>> '{Subscription,charges,future,0,charge_date}'),
      'access_until', payload #>> '{Subscription,customer_access,access_until}',
      'amount_cents', v_amount_cents
    );
  END IF;

  RETURN COALESCE(result, payload);
END;
$$;

-- 2) Ajustes na tabela de endpoints para controlar verificação
ALTER TABLE public.webhook_endpoints
  ADD COLUMN IF NOT EXISTS require_signature boolean NOT NULL DEFAULT false;
ALTER TABLE public.webhook_endpoints
  ADD COLUMN IF NOT EXISTS ip_allowlist text[];

-- 3) Índice de idempotência para evitar duplicidade (se ainda não existir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_idempotency_key ON public.webhook_events (idempotency_key);

-- 4) Realtime no perfil + replica identity para detectar diffs
DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

ALTER TABLE public.profiles REPLICA IDENTITY FULL;