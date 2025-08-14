-- Limpar duplicatas mantendo apenas o mais recente de cada trigger_text
DELETE FROM chatbot_rich_responses
WHERE id NOT IN (
    SELECT DISTINCT ON (trigger_text) id
    FROM chatbot_rich_responses
    ORDER BY trigger_text, created_at DESC
);

-- Agora adicionar a constraint única
ALTER TABLE chatbot_rich_responses ADD CONSTRAINT unique_trigger_text UNIQUE (trigger_text);