
-- Criar tabela para configurações de indicação
CREATE TABLE public.referral_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('fixed', 'percentage')),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  target_plan TEXT NOT NULL DEFAULT 'vip' CHECK (target_plan IN ('free', 'vip', 'pro')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_payout DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para próximos lançamentos
CREATE TABLE public.upcoming_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  release_date TIMESTAMP WITH TIME ZONE NOT NULL,
  target_plans TEXT[] DEFAULT ARRAY['free', 'vip', 'pro'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  countdown_enabled BOOLEAN NOT NULL DEFAULT true,
  announcement_image TEXT,
  content_preview TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para controle de visibilidade de usuários específicos
CREATE TABLE public.user_content_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.content_topics(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL DEFAULT 'allow' CHECK (access_type IN ('allow', 'deny')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Garantir que pelo menos um dos dois seja especificado
  CONSTRAINT check_content_or_topic CHECK (
    (content_id IS NOT NULL AND topic_id IS NULL) OR 
    (content_id IS NULL AND topic_id IS NOT NULL)
  )
);

-- Criar tabela para logs de limpeza do sistema
CREATE TABLE public.system_cleanup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cleanup_type TEXT NOT NULL,
  affected_tables TEXT[],
  records_deleted INTEGER DEFAULT 0,
  executed_by UUID REFERENCES auth.users(id),
  backup_created BOOLEAN DEFAULT false,
  backup_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campos de agendamento ao content se não existirem
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_hide_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS target_users UUID[];

-- Adicionar campos extras para referral_settings se necessário
ALTER TABLE public.referral_settings
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS max_referrals_per_user INTEGER DEFAULT NULL;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_content_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para referral_settings
CREATE POLICY "Admins can manage referral settings"
  ON public.referral_settings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Políticas RLS para upcoming_releases
CREATE POLICY "Everyone can view active releases"
  ON public.upcoming_releases
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage upcoming releases"
  ON public.upcoming_releases
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Políticas RLS para user_content_access
CREATE POLICY "Admins can manage user content access"
  ON public.user_content_access
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ));

CREATE POLICY "Users can view their own access rules"
  ON public.user_content_access
  FOR SELECT
  USING (user_id = auth.uid());

-- Políticas RLS para system_cleanup_logs
CREATE POLICY "Admins can manage cleanup logs"
  ON public.system_cleanup_logs
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Criar triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_referral_settings_updated_at 
  BEFORE UPDATE ON public.referral_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upcoming_releases_updated_at 
  BEFORE UPDATE ON public.upcoming_releases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular comissões de indicação
CREATE OR REPLACE FUNCTION calculate_referral_commission(referrer_user_id UUID, referred_plan TEXT)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Função para limpeza do sistema
CREATE OR REPLACE FUNCTION system_cleanup(
  cleanup_type TEXT,
  target_tables TEXT[] DEFAULT NULL,
  keep_admin BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_result JSON;
  total_deleted INTEGER := 0;
  admin_user_id UUID;
BEGIN
  -- Verificar se o usuário é admin
  SELECT user_id INTO admin_user_id
  FROM profiles
  WHERE user_id = auth.uid() AND role = 'admin';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Apenas administradores podem executar limpeza do sistema';
  END IF;
  
  -- Log da operação
  INSERT INTO public.system_cleanup_logs (cleanup_type, affected_tables, executed_by)
  VALUES (cleanup_type, target_tables, auth.uid());
  
  -- Executar limpeza baseada no tipo
  CASE cleanup_type
    WHEN 'users' THEN
      IF keep_admin THEN
        DELETE FROM auth.users WHERE id != admin_user_id;
      ELSE
        DELETE FROM auth.users;
      END IF;
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    WHEN 'content' THEN
      DELETE FROM public.content;
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    WHEN 'logs' THEN
      DELETE FROM public.user_activity_logs;
      DELETE FROM public.support_messages;
      DELETE FROM public.notifications;
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    WHEN 'all' THEN
      -- Limpeza completa em ordem correta devido às FK
      DELETE FROM public.topic_resources;
      DELETE FROM public.content_topics;
      DELETE FROM public.content;
      DELETE FROM public.user_activity_logs;
      DELETE FROM public.support_messages;
      DELETE FROM public.support_tickets;
      DELETE FROM public.notifications;
      DELETE FROM public.referrals;
      
      IF keep_admin THEN
        DELETE FROM public.profiles WHERE user_id != admin_user_id;
        DELETE FROM auth.users WHERE id != admin_user_id;
      ELSE
        DELETE FROM public.profiles;
        DELETE FROM auth.users;
      END IF;
      
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
  END CASE;
  
  -- Atualizar log com resultados
  UPDATE public.system_cleanup_logs 
  SET records_deleted = total_deleted
  WHERE executed_by = auth.uid() 
    AND cleanup_type = system_cleanup.cleanup_type
    AND created_at = (
      SELECT MAX(created_at) FROM public.system_cleanup_logs 
      WHERE executed_by = auth.uid()
    );
  
  cleanup_result := json_build_object(
    'success', true,
    'records_deleted', total_deleted,
    'cleanup_type', cleanup_type
  );
  
  RETURN cleanup_result;
END;
$$;
