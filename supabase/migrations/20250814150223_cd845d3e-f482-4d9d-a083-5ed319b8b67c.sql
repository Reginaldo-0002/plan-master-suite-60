-- Corrigir estrutura e dados das ferramentas
-- Primeiro verificar se já existe constraint única
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tool_status_tool_name_unique' 
        AND table_name = 'tool_status'
    ) THEN
        ALTER TABLE tool_status ADD CONSTRAINT tool_status_tool_name_unique UNIQUE (tool_name);
    END IF;
END $$;

-- Atualizar mensagens das ferramentas reais
UPDATE tool_status 
SET 
  message = CASE 
    WHEN tool_name = 'robo do zap' THEN 'Bot para WhatsApp funcionando normalmente'
    WHEN tool_name = 'robo do telegram' THEN 'Bot para Telegram funcionando normalmente'
    ELSE message
  END,
  status = 'active',  -- Ambas ativas
  scheduled_maintenance = NULL,  -- Limpar agendamentos antigos
  updated_at = now()
WHERE tool_name IN ('robo do zap', 'robo do telegram');

-- Verificar resultado
SELECT 
  'Status das ferramentas corrigido!' as message,
  tool_name,
  status,
  message,
  updated_at
FROM tool_status 
ORDER BY tool_name;