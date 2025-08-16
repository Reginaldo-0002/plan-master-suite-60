-- Criar tabela para controle de aceitação de termos (user_sessions já existe)
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

-- Habilitar realtime para a tabela de termos
ALTER PUBLICATION supabase_realtime ADD TABLE public.terms_acceptance;