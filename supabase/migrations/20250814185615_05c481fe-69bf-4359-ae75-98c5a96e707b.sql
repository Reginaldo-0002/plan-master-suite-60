-- Adicionar constraint única para permitir upsert na tabela content_visibility_rules
ALTER TABLE content_visibility_rules 
ADD CONSTRAINT content_visibility_rules_content_user_unique 
UNIQUE (content_id, user_id);