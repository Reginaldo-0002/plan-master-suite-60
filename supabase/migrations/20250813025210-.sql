-- Criar tabela para configurações de segurança
CREATE TABLE public.security_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  max_ips_per_user integer NOT NULL DEFAULT 3,
  block_duration_minutes integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Criar tabela para rastrear sessões de usuários
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  ip_address inet NOT NULL,
  user_agent text,
  session_start timestamp with time zone NOT NULL DEFAULT now(),
  session_end timestamp with time zone,
  duration_minutes integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  location_data jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela para bloqueios de usuários
CREATE TABLE public.user_security_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  block_reason text NOT NULL,
  blocked_until timestamp with time zone NOT NULL,
  ip_count integer,
  blocked_by_system boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Criar índices para performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_ip ON public.user_sessions(ip_address);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active, user_id);
CREATE INDEX idx_user_security_blocks_user_id ON public.user_security_blocks(user_id);
CREATE INDEX idx_user_security_blocks_active ON public.user_security_blocks(is_active, blocked_until);

-- RLS Policies para security_settings
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security settings"
ON public.security_settings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- RLS Policies para user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "System can insert sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update sessions"
ON public.user_sessions
FOR UPDATE
USING (true);

-- RLS Policies para user_security_blocks
ALTER TABLE public.user_security_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security blocks"
ON public.user_security_blocks
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can view their own blocks"
ON public.user_security_blocks
FOR SELECT
USING (user_id = auth.uid());

-- Função para verificar se usuário está bloqueado
CREATE OR REPLACE FUNCTION public.is_user_blocked(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_security_blocks
    WHERE user_id = target_user_id
      AND is_active = true
      AND blocked_until > now()
  );
END;
$$;

-- Função para verificar limite de IPs
CREATE OR REPLACE FUNCTION public.check_ip_limit(target_user_id uuid, current_ip inet)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings_record RECORD;
  active_ips_count integer;
  result json;
BEGIN
  -- Buscar configurações ativas
  SELECT * INTO settings_record
  FROM security_settings
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Se não há configurações, permitir
  IF settings_record IS NULL THEN
    RETURN json_build_object('allowed', true, 'message', 'No security settings configured');
  END IF;

  -- Contar IPs únicos ativos nas últimas 24 horas
  SELECT COUNT(DISTINCT ip_address) INTO active_ips_count
  FROM user_sessions
  WHERE user_id = target_user_id
    AND session_start > now() - interval '24 hours'
    AND (is_active = true OR session_end > now() - interval '1 hour');

  -- Se IP atual já está sendo usado, permitir
  IF EXISTS (
    SELECT 1 FROM user_sessions
    WHERE user_id = target_user_id
      AND ip_address = current_ip
      AND session_start > now() - interval '24 hours'
  ) THEN
    RETURN json_build_object('allowed', true, 'message', 'IP already registered');
  END IF;

  -- Verificar se excede o limite
  IF active_ips_count >= settings_record.max_ips_per_user THEN
    -- Criar bloqueio
    INSERT INTO user_security_blocks (
      user_id, 
      block_reason, 
      blocked_until, 
      ip_count,
      blocked_by_system
    ) VALUES (
      target_user_id,
      'Limite de IPs excedido: ' || (active_ips_count + 1) || ' IPs detectados',
      now() + (settings_record.block_duration_minutes || ' minutes')::interval,
      active_ips_count + 1,
      true
    );

    RETURN json_build_object(
      'allowed', false, 
      'message', 'Limite de IPs excedido. Usuário bloqueado por ' || settings_record.block_duration_minutes || ' minutos',
      'blocked_until', now() + (settings_record.block_duration_minutes || ' minutes')::interval
    );
  END IF;

  RETURN json_build_object('allowed', true, 'message', 'Within IP limit');
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_security_settings_updated_at
BEFORE UPDATE ON public.security_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configuração padrão
INSERT INTO public.security_settings (max_ips_per_user, block_duration_minutes, is_active)
VALUES (3, 60, true);