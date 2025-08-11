-- Fix remaining function search_path security warnings
CREATE OR REPLACE FUNCTION public.update_chat_session_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.chat_sessions 
  SET last_activity = now()
  WHERE user_id = NEW.sender_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_expiration_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.plan_end_date IS NOT NULL AND (OLD.plan_end_date IS NULL OR OLD.plan_end_date != NEW.plan_end_date) THEN
    INSERT INTO public.plan_expiration_queue (user_id, expiration_date)
    VALUES (NEW.user_id, NEW.plan_end_date)
    ON CONFLICT (user_id) DO UPDATE SET
      expiration_date = NEW.plan_end_date,
      reminder_7_days = false,
      reminder_1_day = false,
      expiration_notice = false,
      downgrade_executed = false;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_referral_commission(referrer_user_id UUID, referred_plan TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  setting_record RECORD;
  commission_amount DECIMAL(10,2) := 0;
  plan_price DECIMAL(10,2);
BEGIN
  -- Buscar configuração ativa para o plano
  SELECT * INTO setting_record
  FROM public.referral_settings
  WHERE target_plan = referred_plan 
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF setting_record IS NOT NULL THEN
    IF setting_record.commission_type = 'fixed' THEN
      commission_amount := setting_record.amount;
    ELSE
      -- Para percentual, assumir valores padrão dos planos
      plan_price := CASE 
        WHEN referred_plan = 'vip' THEN 97.00
        WHEN referred_plan = 'pro' THEN 197.00
        ELSE 0
      END;
      
      commission_amount := (plan_price * setting_record.amount / 100);
    END IF;
  END IF;
  
  RETURN commission_amount;
END;
$function$;