-- Remover todas as políticas conflitantes
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Admin function can manage roles" ON user_roles;

-- Recriar apenas a política original que funcionava
CREATE POLICY "Only direct admin function can manage roles" 
ON user_roles 
FOR ALL 
USING (is_admin_user());

-- Garantir que a função is_admin_user funciona corretamente sem recursão
CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Usar a função get_current_user_role que já funciona sem recursão
  RETURN (SELECT get_current_user_role()) = 'admin';
END;
$function$;