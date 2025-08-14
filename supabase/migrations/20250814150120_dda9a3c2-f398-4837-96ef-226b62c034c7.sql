-- Corrigir estrutura e adicionar constraint única para tool_status
-- Primeiro garantir que existe constraint única
ALTER TABLE tool_status ADD CONSTRAINT IF NOT EXISTS tool_status_tool_name_unique UNIQUE (tool_name);

-- Atualizar mensagens das ferramentas reais
UPDATE tool_status 
SET 
  message = CASE 
    WHEN tool_name = 'robo do zap' THEN 'Bot para WhatsApp funcionando normalmente'
    WHEN tool_name = 'robo do telegram' THEN 'Bot para Telegram funcionando normalmente'
    ELSE message
  END,
  status = CASE 
    WHEN tool_name = 'robo do telegram' THEN 'active'  -- Remover manutenção
    ELSE status
  END,
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