-- Adicionar política RLS para admins visualizarem todos os perfis
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Garantir que admins podem ver todos os user_roles também
CREATE POLICY "Admins can view all user roles" ON public.user_roles
FOR SELECT TO authenticated  
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = auth.uid() 
    AND ur2.role = 'admin'
  )
);