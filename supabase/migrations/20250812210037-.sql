-- Adicionar política para admins poderem atualizar planos de usuários
CREATE POLICY "Admins can update user plans"
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);