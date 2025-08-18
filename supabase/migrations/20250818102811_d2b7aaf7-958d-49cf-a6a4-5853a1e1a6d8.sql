-- Corrigir a função track_area_access que está com ambiguidade
DROP FUNCTION IF EXISTS public.track_area_access(text, uuid);

CREATE OR REPLACE FUNCTION public.track_area_access(area_name_param text, session_uuid uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Inserir registro de acesso
  INSERT INTO user_area_tracking (user_id, area_name, session_id)
  VALUES (current_user_id, area_name_param, session_uuid);
  
  -- Atualizar contador de áreas acessadas no perfil
  UPDATE profiles 
  SET 
    areas_accessed = (
      SELECT COUNT(DISTINCT uat.area_name) 
      FROM user_area_tracking uat 
      WHERE uat.user_id = current_user_id
    ),
    updated_at = now()
  WHERE user_id = current_user_id;
END;
$function$;

-- Verificar se a tabela user_area_tracking existe, se não existir, criar
CREATE TABLE IF NOT EXISTS public.user_area_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  area_name text NOT NULL,
  session_id uuid,
  accessed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela user_area_tracking
ALTER TABLE public.user_area_tracking ENABLE ROW LEVEL SECURITY;

-- Criar política RLS para user_area_tracking
DROP POLICY IF EXISTS "Users can view their own area tracking" ON public.user_area_tracking;
CREATE POLICY "Users can view their own area tracking" 
ON public.user_area_tracking 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own area tracking" ON public.user_area_tracking;
CREATE POLICY "Users can insert their own area tracking" 
ON public.user_area_tracking 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins podem ver tudo
DROP POLICY IF EXISTS "Admins can view all area tracking" ON public.user_area_tracking;
CREATE POLICY "Admins can view all area tracking" 
ON public.user_area_tracking 
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));