-- Corrigir funções para ter search_path seguro
CREATE OR REPLACE FUNCTION public.calculate_referral_commission(referrer_user_id uuid, referred_plan text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Corrigir função update_chat_session_activity
CREATE OR REPLACE FUNCTION public.update_chat_session_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.chat_sessions 
  SET last_activity = now()
  WHERE user_id = NEW.sender_id;
  RETURN NEW;
END;
$function$;

-- Garantir que a tabela user_roles tenha realtime habilitado
ALTER PUBLICATION supabase_realtime ADD TABLE user_roles;
ALTER TABLE user_roles REPLICA IDENTITY FULL;

-- Garantir que todas as tabelas críticas tenham realtime
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- Corrigir política RLS para garantir que todos os admins tenham acesso total
DROP POLICY IF EXISTS "Only direct admin function can manage roles" ON user_roles;

CREATE POLICY "Admins can manage all roles" 
ON user_roles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);

-- Garantir que admins possam ver todos os profiles
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;

CREATE POLICY "Everyone can view profiles" 
ON profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage all profiles" 
ON profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);

-- Garantir que admins possam deletar usuários completamente
CREATE POLICY "Admins can delete profiles" 
ON profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);