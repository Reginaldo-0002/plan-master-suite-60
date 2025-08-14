-- Limpar todas as ferramentas fictícias da tool_status
-- Manter apenas as 2 ferramentas reais: robo do zap e robo do telegram

DELETE FROM tool_status WHERE tool_name NOT IN ('robo do zap', 'robo do telegram');

-- Limpar auto_status_schedules para ferramentas fictícias
DELETE FROM auto_status_schedules WHERE tool_name NOT IN ('robo do zap', 'robo do telegram');

-- Verificar se as ferramentas reais existem na tool_status, se não, criar
INSERT INTO tool_status (tool_name, status, message) 
SELECT 'robo do zap', 'active', 'Bot para WhatsApp funcionando'
WHERE NOT EXISTS (SELECT 1 FROM tool_status WHERE tool_name = 'robo do zap');

INSERT INTO tool_status (tool_name, status, message)
SELECT 'robo do telegram', 'active', 'Bot para Telegram funcionando'  
WHERE NOT EXISTS (SELECT 1 FROM tool_status WHERE tool_name = 'robo do telegram');

-- Verificar resultado
SELECT 
  'Sistema corrigido!' as message,
  (SELECT COUNT(*) FROM tool_status) as total_ferramentas_status,
  (SELECT COUNT(*) FROM content WHERE content_type = 'tool') as total_conteudo_ferramentas;