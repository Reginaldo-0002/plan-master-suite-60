-- Criar tabela para controle de aceitação de termos
CREATE TABLE public.terms_acceptance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can insert their own terms acceptance"
ON public.terms_acceptance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own terms acceptance"
ON public.terms_acceptance
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all terms acceptance"
ON public.terms_acceptance
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Criar tabela para sessões de usuário com IP e horário
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Função para verificar se usuário aceitou os termos
CREATE OR REPLACE FUNCTION public.has_accepted_terms(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM terms_acceptance 
    WHERE user_id = user_uuid
  );
END;
$$;

-- Função para iniciar sessão do usuário
CREATE OR REPLACE FUNCTION public.start_user_session(user_ip INET DEFAULT NULL, user_agent_string TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Finalizar sessões ativas do usuário
  UPDATE user_sessions 
  SET 
    session_end = now(),
    is_active = false,
    duration_minutes = EXTRACT(EPOCH FROM (now() - session_start)) / 60
  WHERE user_id = auth.uid() AND is_active = true;
  
  -- Criar nova sessão
  INSERT INTO user_sessions (user_id, ip_address, user_agent)
  VALUES (auth.uid(), user_ip, user_agent_string)
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

-- Habilitar realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.terms_acceptance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;