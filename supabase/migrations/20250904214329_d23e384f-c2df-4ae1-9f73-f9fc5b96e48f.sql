-- Primeiro, fazer DROP das funções existentes para recriar
DROP FUNCTION IF EXISTS public.process_webhook_event(uuid);
DROP FUNCTION IF EXISTS public.create_platform_checkout(text, text, text);

-- Criar tabela para armazenar códigos de referência usados em compras
CREATE TABLE IF NOT EXISTS public.purchase_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  purchase_amount NUMERIC DEFAULT 0,
  plan_purchased TEXT NOT NULL,
  platform TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_referrals ENABLE ROW LEVEL SECURITY;

-- Policies para purchase_referrals
CREATE POLICY "Admins can manage purchase referrals" 
ON public.purchase_referrals 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "System can insert purchase referrals" 
ON public.purchase_referrals 
FOR INSERT 
WITH CHECK (true);

-- Recriar função create_platform_checkout com suporte a código de referência
CREATE OR REPLACE FUNCTION public.create_platform_checkout(
  platform_name text,
  plan_slug text,
  user_email text,
  referral_code_param text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  platform_product RECORD;
  result jsonb;
BEGIN
  -- Buscar produto da plataforma
  SELECT pp.*, p.name as plan_name, p.price_cents, p.description as plan_description
  INTO platform_product
  FROM platform_products pp
  INNER JOIN plans p ON p.id = pp.plan_id
  WHERE pp.platform::text = platform_name
    AND p.slug = plan_slug
    AND pp.active = true
    AND p.active = true
  LIMIT 1;

  IF platform_product IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plataforma/plano não encontrado ou não ativo'
    );
  END IF;

  -- Se há código de referência, validar e armazenar
  IF referral_code_param IS NOT NULL AND referral_code_param != '' THEN
    -- Validar se o código existe
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = referral_code_param) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Código de referência inválido'
      );
    END IF;
    
    -- Armazenar para processamento posterior
    INSERT INTO purchase_referrals (
      user_email,
      referral_code,
      purchase_amount,
      plan_purchased,
      platform,
      processed
    ) VALUES (
      user_email,
      referral_code_param,
      platform_product.price_cents::numeric / 100,
      plan_slug,
      platform_name,
      false
    );
  END IF;

  -- Retornar dados do checkout
  result := jsonb_build_object(
    'success', true,
    'checkout_url', platform_product.checkout_url,
    'product_id', platform_product.product_id,
    'platform', platform_product.platform,
    'plan_name', platform_product.plan_name,
    'plan_slug', plan_slug,
    'price_cents', platform_product.price_cents,
    'user_email', user_email,
    'referral_code_used', referral_code_param
  );

  RETURN result;
END;
$$;

-- Recriar função process_webhook_event para processar referrals
CREATE OR REPLACE FUNCTION public.process_webhook_event(event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  webhook_event RECORD;
  user_email TEXT;
  plan_purchased TEXT;
  purchase_amount NUMERIC;
  referral_record RECORD;
  result jsonb;
BEGIN
  -- Buscar evento do webhook
  SELECT * INTO webhook_event
  FROM webhook_events
  WHERE id = event_id;
  
  IF webhook_event IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento não encontrado');
  END IF;
  
  -- Extrair dados baseado na plataforma
  IF webhook_event.provider = 'hotmart' THEN
    -- Extrair dados do Hotmart
    user_email := COALESCE(
      webhook_event.raw_payload->>'email',
      webhook_event.raw_payload->'buyer'->>'email',
      webhook_event.raw_payload->'subscriber'->>'email'
    );
    purchase_amount := COALESCE(
      (webhook_event.raw_payload->>'price')::numeric,
      (webhook_event.raw_payload->'purchase'->>'price')::numeric,
      (webhook_event.raw_payload->>'value')::numeric,
      0
    );
    
  ELSIF webhook_event.provider = 'kiwify' THEN
    -- Extrair dados do Kiwify
    user_email := COALESCE(
      webhook_event.raw_payload->'Customer'->>'email',
      webhook_event.raw_payload->>'customer_email',
      webhook_event.raw_payload->>'email'
    );
    purchase_amount := COALESCE(
      (webhook_event.raw_payload->'order'->>'total')::numeric,
      (webhook_event.raw_payload->>'amount')::numeric,
      (webhook_event.raw_payload->>'value')::numeric,
      0
    );
  ELSE
    -- Para outros provedores
    user_email := webhook_event.raw_payload->>'email';
    purchase_amount := COALESCE(
      (webhook_event.raw_payload->>'amount')::numeric,
      (webhook_event.raw_payload->>'value')::numeric,
      0
    );
  END IF;
  
  -- Determinar plano baseado no valor
  IF purchase_amount >= 100 THEN
    plan_purchased := 'pro';
  ELSIF purchase_amount >= 50 THEN
    plan_purchased := 'vip';
  ELSE
    plan_purchased := 'vip'; -- Default
  END IF;
  
  -- Buscar se há referral pendente para este email
  SELECT * INTO referral_record
  FROM purchase_referrals
  WHERE user_email = user_email
    AND NOT processed
    AND created_at > now() - interval '24 hours'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF referral_record IS NOT NULL THEN
    -- Processar o referral
    SELECT process_referral_purchase(
      user_email,
      referral_record.referral_code,
      purchase_amount,
      plan_purchased
    ) INTO result;
    
    -- Marcar como processado
    UPDATE purchase_referrals
    SET 
      processed = true,
      updated_at = now()
    WHERE id = referral_record.id;
    
    -- Atualizar status do webhook
    UPDATE webhook_events
    SET 
      status = 'processed_with_referral',
      processed_at = now()
    WHERE id = event_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'referral_processed', true,
      'referral_result', result,
      'referral_code', referral_record.referral_code
    );
  ELSE
    -- Atualizar status do webhook
    UPDATE webhook_events
    SET 
      status = 'processed_no_referral',
      processed_at = now()
    WHERE id = event_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'referral_processed', false,
      'message', 'Compra processada sem referral'
    );
  END IF;
END;
$$;