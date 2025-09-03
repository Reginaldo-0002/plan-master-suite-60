-- Garantir que o sistema de referrals funcione corretamente
-- Função para processar referrals quando alguém faz uma compra

CREATE OR REPLACE FUNCTION public.process_referral_purchase(
  referred_user_email TEXT,
  referral_code_used TEXT,
  purchase_amount NUMERIC,
  plan_purchased TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  referrer_user_id UUID;
  referred_user_id UUID;
  commission_amount NUMERIC;
  referral_settings_record RECORD;
  result JSON;
BEGIN
  -- Buscar o usuário que fez a indicação pelo código
  SELECT user_id INTO referrer_user_id
  FROM profiles
  WHERE referral_code = referral_code_used;
  
  IF referrer_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Código de referência não encontrado'
    );
  END IF;
  
  -- Buscar o usuário que foi indicado
  SELECT id INTO referred_user_id
  FROM auth.users 
  WHERE email = referred_user_email;
  
  IF referred_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuário indicado não encontrado'
    );
  END IF;
  
  -- Verificar se o referral já existe
  IF EXISTS (
    SELECT 1 FROM referrals 
    WHERE referrer_id = referrer_user_id AND referred_id = referred_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Referral já processado para este usuário'
    );
  END IF;
  
  -- Buscar configurações de referral ativas
  SELECT * INTO referral_settings_record
  FROM referral_settings
  WHERE is_active = true AND target_plan = plan_purchased
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Se não há configurações específicas, usar configuração padrão
  IF referral_settings_record IS NULL THEN
    SELECT * INTO referral_settings_record
    FROM referral_settings
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- Calcular comissão
  IF referral_settings_record IS NOT NULL THEN
    IF referral_settings_record.commission_type = 'percentage' THEN
      commission_amount := (purchase_amount * referral_settings_record.amount / 100);
    ELSE
      commission_amount := referral_settings_record.amount;
    END IF;
  ELSE
    -- Comissão padrão de 10%
    commission_amount := (purchase_amount * 0.10);
  END IF;
  
  -- Inserir o referral
  INSERT INTO referrals (referrer_id, referred_id, bonus_amount)
  VALUES (referrer_user_id, referred_user_id, commission_amount);
  
  -- Atualizar ganhos do referenciador
  UPDATE profiles
  SET 
    referral_earnings = referral_earnings + commission_amount,
    updated_at = now()
  WHERE user_id = referrer_user_id;
  
  -- Log da ação
  INSERT INTO audit_logs (
    action, 
    area, 
    actor_id, 
    target_id, 
    metadata
  ) VALUES (
    'referral_processed',
    'referrals',
    referrer_user_id,
    referred_user_id,
    jsonb_build_object(
      'referral_code', referral_code_used,
      'commission_amount', commission_amount,
      'purchase_amount', purchase_amount,
      'plan_purchased', plan_purchased
    )
  );
  
  result := json_build_object(
    'success', true,
    'message', 'Referral processado com sucesso',
    'referrer_id', referrer_user_id,
    'referred_id', referred_user_id,
    'commission_amount', commission_amount
  );
  
  RETURN result;
END;
$$;

-- Função para verificar se um código de referência é válido
CREATE OR REPLACE FUNCTION public.validate_referral_code(code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE referral_code = code
  );
END;
$$;

-- Trigger para notificar admins quando um novo referral é processado
CREATE OR REPLACE FUNCTION public.notify_admins_new_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  referrer_name TEXT;
  referred_name TEXT;
BEGIN
  -- Buscar nomes dos usuários
  SELECT COALESCE(p1.full_name, 'Usuário') INTO referrer_name
  FROM public.profiles p1
  WHERE p1.user_id = NEW.referrer_id;
  
  SELECT COALESCE(p2.full_name, 'Usuário') INTO referred_name
  FROM public.profiles p2
  WHERE p2.user_id = NEW.referred_id;
  
  -- Notificar admins
  PERFORM public.notify_admins(
    'Nova Indicação Processada',
    referrer_name || ' indicou ' || referred_name || ' e ganhou R$ ' || NEW.bonus_amount::TEXT,
    'success'
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS notify_admins_new_referral_trigger ON referrals;
CREATE TRIGGER notify_admins_new_referral_trigger
  AFTER INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_referral();