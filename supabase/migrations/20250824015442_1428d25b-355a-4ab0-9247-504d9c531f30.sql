-- Atualizar política RLS para permitir que usuários FREE vejam todos os conteúdos
-- mas o controle de acesso será feito na aplicação

DROP POLICY IF EXISTS "Users can view content based on plan access" ON content;

CREATE POLICY "Users can view all published content regardless of plan" 
ON content 
FOR SELECT 
USING (
  is_active = true 
  AND status = 'published'
  AND NOT EXISTS (
    SELECT 1 FROM content_visibility_rules cvr
    WHERE cvr.content_id = content.id 
    AND cvr.user_id = auth.uid() 
    AND cvr.is_visible = false
  )
);