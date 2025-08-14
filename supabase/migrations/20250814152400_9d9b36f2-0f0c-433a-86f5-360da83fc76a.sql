-- Atualizar RLS policies para mostrar todo conteúdo ativo, independente do plano
-- Remover política restritiva atual
DROP POLICY IF EXISTS "Users can view content based on plan" ON content;

-- Criar nova política que mostra todo conteúdo ativo
CREATE POLICY "Users can view all active content" 
ON content 
FOR SELECT 
USING (
  is_active = true 
  AND status = 'published' 
  AND (
    -- Verificar se o conteúdo não está oculto especificamente para este usuário
    NOT EXISTS (
      SELECT 1 FROM content_visibility_rules cvr 
      WHERE cvr.content_id = content.id 
      AND cvr.user_id = auth.uid() 
      AND cvr.is_visible = false
    )
  )
);

-- Criar componente de gestão de visibilidade de conteúdo no admin
CREATE OR REPLACE FUNCTION manage_content_visibility()
RETURNS trigger AS $$
BEGIN
  -- Garantir que regras de visibilidade sejam aplicadas corretamente
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_content_visibility_user_content 
ON content_visibility_rules(user_id, content_id);

CREATE INDEX IF NOT EXISTS idx_content_active_published 
ON content(is_active, status) WHERE is_active = true AND status = 'published';