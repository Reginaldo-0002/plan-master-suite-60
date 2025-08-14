-- Inserir dados reais no sistema (simplificado)
-- Limpar dados de exemplo primeiro
DELETE FROM content WHERE title LIKE '%Exemplo%' OR title LIKE '%Demo%' OR title LIKE '%Teste%';
DELETE FROM tool_status WHERE tool_name LIKE '%exemplo%' OR tool_name LIKE '%demo%' OR tool_name LIKE '%teste%';

-- Inserir ferramentas reais (usando apenas status válidos)
INSERT INTO tool_status (tool_name, status, message) VALUES 
('ChatBot Inteligente', 'active', 'Sistema de chatbot com IA funcionando perfeitamente'),
('Gerador de Conteúdo', 'active', 'Ferramenta de criação de conteúdo disponível'),
('Analytics Avançado', 'maintenance', 'Em manutenção para melhorias'),
('Automação de Marketing', 'active', 'Sistema de automação funcionando'),
('API de Integração', 'active', 'API funcionando normalmente'),
('Sistema de Relatórios', 'maintenance', 'Temporariamente indisponível para atualizações'),
('Backup Automático', 'active', 'Sistema de backup funcionando'),
('Monitor de Performance', 'active', 'Monitoramento ativo');

-- Inserir conteúdos reais se não existirem
INSERT INTO content (
  title, 
  description, 
  content_type, 
  required_plan, 
  status, 
  is_active,
  order_index,
  difficulty_level,
  estimated_duration,
  published_at
) SELECT 
  'Introdução ao Sistema',
  'Aprenda os fundamentos da plataforma e como navegar pelas funcionalidades principais.',
  'tutorial',
  'free',
  'published',
  true,
  1,
  'beginner',
  30,
  now()
WHERE NOT EXISTS (SELECT 1 FROM content WHERE title = 'Introdução ao Sistema');

INSERT INTO content (
  title, 
  description, 
  content_type, 
  required_plan, 
  status, 
  is_active,
  order_index,
  difficulty_level,
  estimated_duration,
  published_at
) SELECT 
  'Configuração Avançada',
  'Configure recursos avançados para maximizar sua produtividade na plataforma.',
  'course',
  'vip',
  'published',
  true,
  2,
  'intermediate',
  60,
  now()
WHERE NOT EXISTS (SELECT 1 FROM content WHERE title = 'Configuração Avançada');

INSERT INTO content (
  title, 
  description, 
  content_type, 
  required_plan, 
  status, 
  is_active,
  order_index,
  difficulty_level,
  estimated_duration,
  published_at
) SELECT 
  'Automação Profissional',
  'Domine as ferramentas de automação para otimizar seus processos de trabalho.',
  'course',
  'pro',
  'published',
  true,
  3,
  'advanced',
  120,
  now()
WHERE NOT EXISTS (SELECT 1 FROM content WHERE title = 'Automação Profissional');

-- Verificar resultado
SELECT 
  'Dados reais inseridos com sucesso!' as message,
  (SELECT COUNT(*) FROM tool_status) as total_tools,
  (SELECT COUNT(*) FROM content WHERE is_active = true) as total_content;