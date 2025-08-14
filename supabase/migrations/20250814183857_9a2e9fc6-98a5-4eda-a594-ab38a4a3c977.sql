-- Corrigir a função is_current_user_admin para ser mais robusta
DROP FUNCTION IF EXISTS public.is_current_user_admin();

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Verificar se há um usuário logado
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Buscar o role do usuário
  SELECT role INTO user_role
  FROM user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  -- Retornar true se for admin ou moderator
  RETURN user_role = 'admin'::app_role OR user_role = 'moderator'::app_role;
END;
$$;

-- Testar a função
SELECT is_current_user_admin() as current_user_is_admin;