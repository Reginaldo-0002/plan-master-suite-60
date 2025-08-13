-- Corrigir a recursão infinita na política RLS
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Criar política que usa a função SECURITY DEFINER para evitar recursão
CREATE POLICY "Admins can manage all roles" 
ON user_roles 
FOR ALL 
USING (is_user_admin(auth.uid()));

-- Garantir que a função is_user_admin não causa recursão usando uma abordagem diferente
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid 
    AND role = 'admin'::app_role
  )
$function$;

-- Alternativa: Usar a política original que funcionava
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

CREATE POLICY "Users can view their own roles only" 
ON user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admin function can manage roles" 
ON user_roles 
FOR ALL 
USING (is_admin_user());

-- Corrigir função is_admin_user para não causar recursão
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