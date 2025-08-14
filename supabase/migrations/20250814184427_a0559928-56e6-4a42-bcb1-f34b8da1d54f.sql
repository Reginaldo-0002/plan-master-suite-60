-- Reverter as políticas de content_visibility_rules para o estado original

-- Remover política temporária
DROP POLICY IF EXISTS "Allow authenticated users to manage visibility rules" ON content_visibility_rules;

-- Restaurar política original para admins
CREATE POLICY "Admins can manage visibility rules"
ON content_visibility_rules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);