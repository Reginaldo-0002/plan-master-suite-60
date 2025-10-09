
-- Correção de segurança: Adicionar verificação explícita de autenticação nas políticas RLS
-- Isso evita acesso público inadvertido quando auth.uid() é NULL

-- ============= TABELA PROFILES =============

-- Remover políticas antigas e recriar com verificação de autenticação

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO public
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO public
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO public
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO public
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

DROP POLICY IF EXISTS "Admins can update user plans" ON public.profiles;
CREATE POLICY "Admins can update user plans" 
ON public.profiles 
FOR UPDATE 
TO public
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
TO public
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);

-- ============= TABELA USER_FINANCIAL_DATA =============

DROP POLICY IF EXISTS "Users can view own financial data" ON public.user_financial_data;
CREATE POLICY "Users can view own financial data" 
ON public.user_financial_data 
FOR SELECT 
TO public
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can update own financial data" ON public.user_financial_data;
CREATE POLICY "Users can update own financial data" 
ON public.user_financial_data 
FOR UPDATE 
TO public
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can insert own financial data" ON public.user_financial_data;
CREATE POLICY "Users can insert own financial data" 
ON public.user_financial_data 
FOR INSERT 
TO public
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admins can manage all financial data" ON public.user_financial_data;
CREATE POLICY "Admins can manage all financial data" 
ON public.user_financial_data 
FOR ALL 
TO public
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

-- Log da correção de segurança
INSERT INTO audit_logs (action, area, actor_id, metadata)
VALUES (
  'SECURITY_FIX_RLS_POLICIES',
  'SECURITY',
  NULL,
  jsonb_build_object(
    'tables', ARRAY['profiles', 'user_financial_data'],
    'fix_type', 'Added explicit authentication checks to RLS policies',
    'timestamp', NOW()
  )
);
