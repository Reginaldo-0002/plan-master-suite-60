-- Verificar se as políticas estão funcionando corretamente para admins
-- Criar índice para melhorar performance nas consultas de visibilidade

-- Criar um índice composto para content_visibility_rules
CREATE INDEX IF NOT EXISTS idx_content_visibility_rules_content_user 
ON content_visibility_rules(content_id, user_id);

-- Criar um índice para consultas por usuário específico
CREATE INDEX IF NOT EXISTS idx_content_visibility_rules_user 
ON content_visibility_rules(user_id);

-- Verificar se a política está correta para inserção
-- A política atual deveria permitir que admins façam INSERT, UPDATE e DELETE
-- Vamos garantir que as políticas estão funcionando

-- Criar uma função helper para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  );
END;
$$;

-- Atualizar a política para garantir que funcione corretamente
DROP POLICY IF EXISTS "Admins can manage visibility rules" ON content_visibility_rules;

CREATE POLICY "Admins can manage visibility rules"
ON content_visibility_rules
FOR ALL
TO authenticated
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());