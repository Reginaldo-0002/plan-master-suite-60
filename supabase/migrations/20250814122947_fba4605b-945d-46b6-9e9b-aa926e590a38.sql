-- Atualizar a função process_webhook_event para funcionar corretamente
CREATE OR REPLACE FUNCTION process_webhook_event(event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_record webhook_events%ROWTYPE;
  canonical_data jsonb;
  result json;
  user_email text;
  user_external_id text;
  plan_slug text;
  subscription_record subscriptions%ROWTYPE;
  event_type text;
BEGIN
  -- Buscar o evento
  SELECT * INTO event_record
  FROM webhook_events
  WHERE id = event_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Event not found');
  END IF;
  
  -- Normalizar dados do payload
  canonical_data := normalize_webhook_payload(event_record.provider::text, event_record.raw_payload);
  
  -- Extrair informações chave
  user_email := canonical_data->>'user_email';
  user_external_id := canonical_data->>'user_external_id';
  plan_slug := canonical_data->>'plan_slug';
  event_type := canonical_data->>'type';
  
  -- Atualizar evento com dados canônicos
  UPDATE webhook_events 
  SET 
    canonical_event = canonical_data,
    status = 'processed'::webhook_event_status,
    processed_at = now()
  WHERE id = event_id;
  
  -- Processar baseado no tipo de evento
  CASE event_type
    WHEN 'payment_succeeded', 'subscription_created' THEN
      -- Criar ou atualizar assinatura
      INSERT INTO subscriptions (
        user_id, 
        external_subscription_id,
        external_customer_id,
        platform,
        status,
        amount_cents,
        currency,
        metadata,
        current_period_start,
        current_period_end
      ) VALUES (
        COALESCE(
          (SELECT user_id FROM profiles WHERE email = user_email LIMIT 1),
          (SELECT id FROM auth.users WHERE email = user_email LIMIT 1)
        ),
        canonical_data->>'external_subscription_id',
        canonical_data->>'external_customer_id',
        event_record.provider,
        'active'::subscription_status,
        (canonical_data->>'amount_cents')::integer,
        COALESCE(canonical_data->>'currency', 'BRL'),
        canonical_data,
        COALESCE((canonical_data->>'occurred_at')::timestamp with time zone, now()),
        COALESCE((canonical_data->>'occurred_at')::timestamp with time zone, now()) + interval '1 month'
      )
      ON CONFLICT (external_subscription_id) DO UPDATE SET
        status = 'active'::subscription_status,
        amount_cents = EXCLUDED.amount_cents,
        metadata = EXCLUDED.metadata,
        updated_at = now();
        
    WHEN 'subscription_canceled' THEN
      -- Cancelar assinatura
      UPDATE subscriptions 
      SET 
        status = 'canceled'::subscription_status,
        updated_at = now()
      WHERE external_subscription_id = canonical_data->>'external_subscription_id';
      
    WHEN 'refund', 'chargeback' THEN
      -- Processar reembolso
      UPDATE subscriptions 
      SET 
        status = 'canceled'::subscription_status,
        metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{refund_info}',
          canonical_data
        ),
        updated_at = now()
      WHERE external_subscription_id = canonical_data->>'external_subscription_id';
  END CASE;
  
  -- Disparar evento no event bus para notificações
  INSERT INTO event_bus (type, user_id, data) VALUES (
    'webhook_processed',
    COALESCE(
      (SELECT user_id FROM profiles WHERE email = user_email LIMIT 1),
      (SELECT id FROM auth.users WHERE email = user_email LIMIT 1)
    ),
    jsonb_build_object(
      'event_type', event_type,
      'platform', event_record.provider,
      'canonical_data', canonical_data,
      'processed_at', now()
    )
  );
  
  result := json_build_object(
    'success', true,
    'event_id', event_id,
    'event_type', event_type,
    'platform', event_record.provider,
    'processed_at', now()
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Marcar evento como falhou
    UPDATE webhook_events 
    SET 
      status = 'failed'::webhook_event_status,
      error_message = SQLERRM,
      processed_at = now()
    WHERE id = event_id;
    
    RETURN json_build_object(
      'error', 'Processing failed: ' || SQLERRM,
      'event_id', event_id
    );
END;
$$;

-- Função para gerar URLs de webhook
CREATE OR REPLACE FUNCTION generate_webhook_url(provider_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_url text := 'https://srnwogrjwhqjjyodxalx.supabase.co/functions/v1/';
  webhook_url text;
BEGIN
  CASE provider_name
    WHEN 'hotmart' THEN
      webhook_url := base_url || 'webhook-hotmart';
    WHEN 'kiwify' THEN  
      webhook_url := base_url || 'webhook-kiwify';
    WHEN 'caktor' THEN
      webhook_url := base_url || 'webhook-generic?provider=caktor';
    WHEN 'generic' THEN
      webhook_url := base_url || 'webhook-generic';
    ELSE
      webhook_url := base_url || 'webhook-generic?provider=' || provider_name;
  END CASE;
  
  RETURN webhook_url;
END;
$$;