-- SOLUÇÃO DEFINITIVA: Remover toda recursão das políticas RLS
-- Primeiro, dropar todas as políticas problemáticas
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Criar função SECURITY DEFINER para verificar se usuário é admin SEM consultar user_roles
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Usar a função get_current_user_role que já existe e é SECURITY DEFINER
  RETURN (SELECT get_current_user_role()) = 'admin';
END;
$$;

-- Políticas SIMPLES sem recursão para user_roles
CREATE POLICY "Users can view their own roles only"
ON user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only direct admin function can manage roles"
ON user_roles 
FOR ALL
TO authenticated
USING (is_admin_user());

-- Política simples para profiles sem consultar user_roles
CREATE POLICY "Users can view profiles based on admin status"
ON profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id OR 
  is_admin_user()
);

-- Garantir que a função get_current_user_role não cause recursão
-- Substituir por versão que não consulta user_roles nas políticas
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  user_role text;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN 'user';
  END IF;
  
  -- Consulta direta sem políticas RLS ativas (SECURITY DEFINER)
  SELECT role::text INTO user_role 
  FROM public.user_roles 
  WHERE user_id = current_user_id 
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'user');
END;
$$;