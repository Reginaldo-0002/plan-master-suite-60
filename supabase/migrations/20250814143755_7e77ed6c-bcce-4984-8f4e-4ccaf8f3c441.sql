-- Atualizar dados existentes e inserir novos dados reais
-- Primeiro, atualizar ferramentas existentes com dados reais
UPDATE tool_status SET 
  message = CASE tool_name
    WHEN 'ChatBot Inteligente' THEN 'Sistema de chatbot com IA funcionando perfeitamente'
    WHEN 'Gerador de Conteúdo' THEN 'Ferramenta de criação de conteúdo disponível'
    WHEN 'Analytics Avançado' THEN 'Em manutenção para melhorias'
    WHEN 'Automação de Marketing' THEN 'Sistema de automação funcionando'
    WHEN 'API de Integração' THEN 'API funcionando normalmente'
    WHEN 'Sistema de Relatórios' THEN 'Temporariamente indisponível para atualizações'
    WHEN 'Backup Automático' THEN 'Sistema de backup funcionando'
    WHEN 'Monitor de Performance' THEN 'Monitoramento ativo'
    ELSE message
  END,
  status = CASE tool_name
    WHEN 'Analytics Avançado' THEN 'maintenance'
    WHEN 'Sistema de Relatórios' THEN 'maintenance'
    ELSE 'active'
  END,
  updated_at = now()
WHERE tool_name IN (
  'ChatBot Inteligente', 'Gerador de Conteúdo', 'Analytics Avançado', 
  'Automação de Marketing', 'API de Integração', 'Sistema de Relatórios', 
  'Backup Automático', 'Monitor de Performance'
);

-- Inserir ferramentas que não existem ainda
INSERT INTO tool_status (tool_name, status, message)
SELECT 'ChatBot Inteligente', 'active', 'Sistema de chatbot com IA funcionando perfeitamente'
WHERE NOT EXISTS (SELECT 1 FROM tool_status WHERE tool_name = 'ChatBot Inteligente');

INSERT INTO tool_status (tool_name, status, message)
SELECT 'Gerador de Conteúdo', 'active', 'Ferramenta de criação de conteúdo disponível'
WHERE NOT EXISTS (SELECT 1 FROM tool_status WHERE tool_name = 'Gerador de Conteúdo');

INSERT INTO tool_status (tool_name, status, message)
SELECT 'Analytics Avançado', 'maintenance', 'Em manutenção para melhorias'
WHERE NOT EXISTS (SELECT 1 FROM tool_status WHERE tool_name = 'Analytics Avançado');

INSERT INTO tool_status (tool_name, status, message)
SELECT 'Automação de Marketing', 'active', 'Sistema de automação funcionando'
WHERE NOT EXISTS (SELECT 1 FROM tool_status WHERE tool_name = 'Automação de Marketing');

INSERT INTO tool_status (tool_name, status, message)
SELECT 'API de Integração', 'active', 'API funcionando normalmente'
WHERE NOT EXISTS (SELECT 1 FROM tool_status WHERE tool_name = 'API de Integração');

INSERT INTO tool_status (tool_name, status, message)
SELECT 'Sistema de Relatórios', 'maintenance', 'Temporariamente indisponível para atualizações'
WHERE NOT EXISTS (SELECT 1 FROM tool_status WHERE tool_name = 'Sistema de Relatórios');

INSERT INTO tool_status (tool_name, status, message)
SELECT 'Backup Automático', 'active', 'Sistema de backup funcionando'
WHERE NOT EXISTS (SELECT 1 FROM tool_status WHERE tool_name = 'Backup Automático');

INSERT INTO tool_status (tool_name, status, message)
SELECT 'Monitor de Performance', 'active', 'Monitoramento ativo'
WHERE NOT EXISTS (SELECT 1 FROM tool_status WHERE tool_name = 'Monitor de Performance');

-- Verificar resultado final
SELECT 
  'Sistema atualizado com dados reais!' as message,
  (SELECT COUNT(*) FROM tool_status) as total_tools,
  (SELECT COUNT(*) FROM tool_status WHERE status = 'active') as active_tools,
  (SELECT COUNT(*) FROM tool_status WHERE status = 'maintenance') as maintenance_tools;