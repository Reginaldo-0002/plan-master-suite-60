-- Verificar e completar o sistema de integrações e webhooks

-- 1. Adicionar tabela tracking_meta se não existir
CREATE TABLE IF NOT EXISTS public.tracking_meta (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pixel_id text,
  access_token text,
  test_event_code text,
  enable_client boolean DEFAULT true,
  enable_server boolean DEFAULT true,
  enable_dedup boolean DEFAULT true,
  created_by uuid REFERENCES profiles(user_id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Verificar se as tabelas existem e adicionar colunas que possam estar faltando

-- Adicionar colunas faltantes em webhook_events se necessário
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'processed_at') THEN
    ALTER TABLE webhook_events ADD COLUMN processed_at timestamp with time zone;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'canonical_event') THEN
    ALTER TABLE webhook_events ADD COLUMN canonical_event jsonb;
  END IF;
END $$;

-- Adicionar colunas faltantes em subscriptions se necessário
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'external_order_id') THEN
    ALTER TABLE subscriptions ADD COLUMN external_order_id text;
  END IF;
END $$;

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events(received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency ON webhook_events(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_event_bus_status ON event_bus(status);
CREATE INDEX IF NOT EXISTS idx_event_bus_created_at ON event_bus(created_at);
CREATE INDEX IF NOT EXISTS idx_event_bus_user_id ON event_bus(user_id);

CREATE INDEX IF NOT EXISTS idx_outbound_deliveries_status ON outbound_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_outbound_deliveries_next_retry ON outbound_deliveries(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_platform ON subscriptions(platform);

CREATE INDEX IF NOT EXISTS idx_platform_products_plan_id ON platform_products(plan_id);
CREATE INDEX IF NOT EXISTS idx_platform_products_platform ON platform_products(platform);

-- 4. Adicionar políticas RLS para tracking_meta
ALTER TABLE tracking_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tracking meta" ON tracking_meta
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- 5. Criar função para processar webhooks
CREATE OR REPLACE FUNCTION process_webhook_event(
  event_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_record webhook_events%ROWTYPE;
  canonical_data jsonb;
  user_record profiles%ROWTYPE;
  plan_record plans%ROWTYPE;
  result json;
BEGIN
  -- Buscar o evento
  SELECT * INTO event_record FROM webhook_events WHERE id = event_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;
  
  -- Se já foi processado, retornar sucesso
  IF event_record.status = 'processed' THEN
    RETURN json_build_object('success', true, 'message', 'Already processed');
  END IF;
  
  -- Processar baseado no provider
  canonical_data := event_record.canonical_event;
  
  IF canonical_data IS NULL THEN
    UPDATE webhook_events 
    SET status = 'failed', error = 'No canonical event data'
    WHERE id = event_id;
    RETURN json_build_object('success', false, 'error', 'No canonical event data');
  END IF;
  
  -- Buscar ou criar usuário baseado no email
  IF canonical_data->>'user_email' IS NOT NULL THEN
    SELECT p.* INTO user_record 
    FROM profiles p 
    JOIN auth.users u ON u.id = p.user_id 
    WHERE u.email = canonical_data->>'user_email';
    
    -- Se usuário não existe, criar um ghost user (seria implementado via auth admin)
    IF NOT FOUND THEN
      UPDATE webhook_events 
      SET status = 'failed', error = 'User not found: ' || (canonical_data->>'user_email')
      WHERE id = event_id;
      RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
  END IF;
  
  -- Processar baseado no tipo de evento
  CASE canonical_data->>'type'
    WHEN 'payment_succeeded' THEN
      -- Buscar plano pelo slug
      IF canonical_data->>'plan_slug' IS NOT NULL THEN
        SELECT * INTO plan_record FROM plans WHERE slug = canonical_data->>'plan_slug' AND active = true;
        
        IF FOUND THEN
          -- Criar/atualizar subscription
          INSERT INTO subscriptions (
            user_id, plan_id, status, platform, amount_cents, 
            external_order_id, external_subscription_id, 
            current_period_start, current_period_end
          ) VALUES (
            user_record.user_id,
            plan_record.id,
            'active'::subscription_status,
            event_record.provider::platform_enum,
            (canonical_data->>'amount_cents')::integer,
            canonical_data->>'external_order_id',
            canonical_data->>'external_subscription_id',
            now(),
            now() + interval '1 month'
          )
          ON CONFLICT (user_id, plan_id) DO UPDATE SET
            status = 'active'::subscription_status,
            current_period_start = now(),
            current_period_end = now() + interval '1 month',
            updated_at = now();
          
          -- Atualizar plano do usuário
          UPDATE profiles 
          SET plan = plan_record.slug::user_plan,
              plan_start_date = now(),
              plan_end_date = now() + interval '1 month'
          WHERE user_id = user_record.user_id;
        END IF;
      END IF;
      
    WHEN 'subscription_canceled' THEN
      -- Cancelar subscription
      UPDATE subscriptions 
      SET status = 'canceled'::subscription_status 
      WHERE user_id = user_record.user_id 
        AND external_subscription_id = canonical_data->>'external_subscription_id';
        
    ELSE
      -- Outros tipos de evento
      NULL;
  END CASE;
  
  -- Publicar no event bus
  INSERT INTO event_bus (type, user_id, data) 
  VALUES (
    canonical_data->>'type',
    user_record.user_id,
    canonical_data
  );
  
  -- Marcar como processado
  UPDATE webhook_events 
  SET status = 'processed', processed_at = now()
  WHERE id = event_id;
  
  RETURN json_build_object('success', true, 'processed_event', canonical_data->>'type');
  
EXCEPTION
  WHEN OTHERS THEN
    UPDATE webhook_events 
    SET status = 'failed', error = SQLERRM 
    WHERE id = event_id;
    
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. Função para normalizar eventos de diferentes providers
CREATE OR REPLACE FUNCTION normalize_webhook_payload(
  provider text,
  raw_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  canonical jsonb;
BEGIN
  CASE provider
    WHEN 'hotmart' THEN
      canonical := jsonb_build_object(
        'type', CASE 
          WHEN raw_payload->>'event' = 'PURCHASE_APPROVED' THEN 'payment_succeeded'
          WHEN raw_payload->>'event' = 'PURCHASE_REFUNDED' THEN 'refund'
          WHEN raw_payload->>'event' = 'SUBSCRIPTION_CANCELLATION' THEN 'subscription_canceled'
          ELSE 'unknown'
        END,
        'external_order_id', raw_payload->'data'->>'transaction',
        'external_subscription_id', raw_payload->'data'->'subscription'->>'subscriber_code',
        'user_email', raw_payload->'data'->'buyer'->>'email',
        'user_external_id', raw_payload->'data'->'buyer'->>'checkout_key',
        'amount_cents', ((raw_payload->'data'->'purchase'->>'price_value')::numeric * 100)::integer,
        'currency', raw_payload->'data'->'purchase'->>'currency_code',
        'occurred_at', raw_payload->'data'->>'creation_date',
        'raw', raw_payload
      );
      
    WHEN 'kiwify' THEN
      canonical := jsonb_build_object(
        'type', CASE 
          WHEN raw_payload->>'event_type' = 'order.approved' THEN 'payment_succeeded'
          WHEN raw_payload->>'event_type' = 'order.refunded' THEN 'refund'
          WHEN raw_payload->>'event_type' = 'subscription.canceled' THEN 'subscription_canceled'
          ELSE 'unknown'
        END,
        'external_order_id', raw_payload->'order'->>'id',
        'external_subscription_id', raw_payload->'subscription'->>'id',
        'user_email', raw_payload->'customer'->>'email',
        'user_external_id', raw_payload->'customer'->>'id',
        'amount_cents', ((raw_payload->'order'->>'total_value')::numeric * 100)::integer,
        'currency', 'BRL',
        'occurred_at', raw_payload->>'created_at',
        'raw', raw_payload
      );
      
    WHEN 'generic' THEN
      canonical := jsonb_build_object(
        'type', raw_payload->>'event_type',
        'external_order_id', raw_payload->>'order_id',
        'external_subscription_id', raw_payload->>'subscription_id',
        'user_email', raw_payload->>'email',
        'user_external_id', raw_payload->>'customer_id',
        'plan_slug', raw_payload->>'plan_slug',
        'amount_cents', (raw_payload->>'amount_cents')::integer,
        'currency', COALESCE(raw_payload->>'currency', 'BRL'),
        'occurred_at', COALESCE(raw_payload->>'occurred_at', now()::text),
        'raw', raw_payload
      );
      
    ELSE
      canonical := jsonb_build_object(
        'type', 'unknown',
        'raw', raw_payload
      );
  END CASE;
  
  RETURN canonical;
END;
$$;

-- 7. Trigger para auto-processar eventos
CREATE OR REPLACE FUNCTION auto_process_webhook_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalizar o evento se ainda não foi normalizado
  IF NEW.canonical_event IS NULL THEN
    NEW.canonical_event := normalize_webhook_payload(NEW.provider::text, NEW.raw_payload);
  END IF;
  
  -- Processar o evento em background (seria feito via edge function)
  -- Por agora apenas marcar como recebido
  NEW.status := 'received'::webhook_event_status;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_process_webhook_event_trigger
  BEFORE INSERT ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_webhook_event();

-- 8. Função para verificar saúde dos endpoints
CREATE OR REPLACE FUNCTION check_webhook_endpoint_health(endpoint_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  endpoint_record webhook_endpoints%ROWTYPE;
  result json;
BEGIN
  SELECT * INTO endpoint_record FROM webhook_endpoints WHERE id = endpoint_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Endpoint not found');
  END IF;
  
  -- Atualizar último health check
  UPDATE webhook_endpoints 
  SET last_healthcheck_at = now()
  WHERE id = endpoint_id;
  
  RETURN json_build_object(
    'success', true, 
    'endpoint_id', endpoint_id,
    'url', endpoint_record.url,
    'active', endpoint_record.active,
    'last_check', now()
  );
END;
$$;