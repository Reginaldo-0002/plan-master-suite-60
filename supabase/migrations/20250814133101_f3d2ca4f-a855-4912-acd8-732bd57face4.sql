-- Criar função normalizar webhook payload
CREATE OR REPLACE FUNCTION public.normalize_webhook_payload(provider_name text, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  canonical_event jsonb := '{}';
  event_type text;
  user_email text;
  plan_info jsonb;
BEGIN
  CASE provider_name
    WHEN 'hotmart' THEN
      event_type := payload->>'event';
      user_email := payload->'data'->'buyer'->>'email';
      
      canonical_event := jsonb_build_object(
        'type', CASE 
          WHEN event_type = 'PURCHASE_APPROVED' THEN 'payment_succeeded'
          WHEN event_type = 'PURCHASE_REFUNDED' THEN 'refund'
          WHEN event_type = 'SUBSCRIPTION_CREATED' THEN 'subscription_created'
          WHEN event_type = 'SUBSCRIPTION_CANCELED' THEN 'subscription_canceled'
          ELSE event_type
        END,
        'user_email', user_email,
        'user_external_id', payload->'data'->'buyer'->>'email',
        'external_subscription_id', payload->'data'->'purchase'->>'order_id',
        'external_customer_id', payload->'data'->'buyer'->>'email',
        'amount_cents', (payload->'data'->'purchase'->>'payment_value')::numeric * 100,
        'currency', COALESCE(payload->'data'->'purchase'->>'currency_code', 'BRL'),
        'plan_slug', CASE 
          WHEN (payload->'data'->'purchase'->>'payment_value')::numeric <= 100 THEN 'vip'
          ELSE 'pro'
        END,
        'occurred_at', now()
      );
      
    WHEN 'kiwify' THEN
      event_type := payload->>'webhook_event_type';
      user_email := payload->'Customer'->>'email';
      
      canonical_event := jsonb_build_object(
        'type', CASE 
          WHEN event_type = 'order_paid' THEN 'payment_succeeded'
          WHEN event_type = 'order_refunded' THEN 'refund'
          WHEN event_type = 'subscription_created' THEN 'subscription_created'
          WHEN event_type = 'subscription_canceled' THEN 'subscription_canceled'
          ELSE event_type
        END,
        'user_email', user_email,
        'user_external_id', payload->'Customer'->>'email',
        'external_subscription_id', payload->>'order_id',
        'external_customer_id', payload->'Customer'->>'email',
        'amount_cents', (payload->'CommissionAs'->>'value')::numeric * 100,
        'currency', 'BRL',
        'plan_slug', CASE 
          WHEN (payload->'CommissionAs'->>'value')::numeric <= 100 THEN 'vip'
          ELSE 'pro'
        END,
        'occurred_at', COALESCE((payload->>'created_at')::timestamp with time zone, now())
      );
      
    ELSE
      -- Generic provider
      canonical_event := payload;
  END CASE;
  
  RETURN canonical_event;
END;
$$;

-- Atualizar função process_webhook_event para atualizar planos dos usuários
CREATE OR REPLACE FUNCTION public.process_webhook_event(event_id uuid)
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
  plan_slug text;
  target_user_id uuid;
  event_type text;
  amount_cents integer;
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
  plan_slug := canonical_data->>'plan_slug';
  event_type := canonical_data->>'type';
  amount_cents := (canonical_data->>'amount_cents')::integer;
  
  -- Buscar usuário por email
  SELECT user_id INTO target_user_id
  FROM profiles 
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = user_email
  )
  LIMIT 1;
  
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
      IF target_user_id IS NOT NULL THEN
        -- Atualizar plano do usuário
        UPDATE profiles 
        SET 
          plan = plan_slug::user_plan,
          plan_start_date = now(),
          plan_end_date = now() + interval '1 month',
          plan_status = 'active',
          updated_at = now()
        WHERE user_id = target_user_id;
        
        -- Criar/atualizar assinatura
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
          target_user_id,
          canonical_data->>'external_subscription_id',
          canonical_data->>'external_customer_id',
          event_record.provider,
          'active'::subscription_status,
          amount_cents,
          COALESCE(canonical_data->>'currency', 'BRL'),
          canonical_data,
          now(),
          now() + interval '1 month'
        )
        ON CONFLICT (external_subscription_id) DO UPDATE SET
          status = 'active'::subscription_status,
          amount_cents = EXCLUDED.amount_cents,
          metadata = EXCLUDED.metadata,
          current_period_end = now() + interval '1 month',
          updated_at = now();
          
        -- Notificar admins
        PERFORM notify_admins(
          'Novo Pagamento Processado',
          'Usuário ' || user_email || ' ativou o plano ' || plan_slug || ' (R$ ' || (amount_cents::decimal/100) || ')',
          'success'
        );
      END IF;
        
    WHEN 'subscription_canceled', 'refund' THEN
      IF target_user_id IS NOT NULL THEN
        -- Voltar para plano free
        UPDATE profiles 
        SET 
          plan = 'free'::user_plan,
          plan_status = 'canceled',
          updated_at = now()
        WHERE user_id = target_user_id;
        
        -- Cancelar assinatura
        UPDATE subscriptions 
        SET 
          status = 'canceled'::subscription_status,
          updated_at = now()
        WHERE external_subscription_id = canonical_data->>'external_subscription_id';
        
        -- Notificar admins
        PERFORM notify_admins(
          'Plano Cancelado',
          'Usuário ' || user_email || ' cancelou o plano ' || plan_slug,
          'warning'
        );
      END IF;
  END CASE;
  
  result := json_build_object(
    'success', true,
    'event_id', event_id,
    'event_type', event_type,
    'platform', event_record.provider,
    'user_updated', target_user_id IS NOT NULL,
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