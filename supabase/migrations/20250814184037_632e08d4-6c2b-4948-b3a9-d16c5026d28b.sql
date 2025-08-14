-- Criar uma política mais permissiva temporariamente para debugging
-- Remover a política atual
DROP POLICY IF EXISTS "Admins can manage visibility rules" ON content_visibility_rules;

-- Criar política que permite a todos os usuários autenticados (temporário para debug)
CREATE POLICY "Allow authenticated users to manage visibility rules"
ON content_visibility_rules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Também vamos verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'content_visibility_rules';