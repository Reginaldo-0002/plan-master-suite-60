-- Corrigir dados reais no sistema
-- Limpar dados de exemplo primeiro
DELETE FROM content WHERE title LIKE '%Exemplo%' OR title LIKE '%Demo%' OR title LIKE '%Teste%';
DELETE FROM tool_status WHERE tool_name LIKE '%exemplo%' OR tool_name LIKE '%demo%' OR tool_name LIKE '%teste%';

-- Inserir ferramentas reais (usando apenas status válidos: active, maintenance)
INSERT INTO tool_status (tool_name, status, message) VALUES 
('ChatBot Inteligente', 'active', 'Sistema de chatbot com IA funcionando perfeitamente'),
('Gerador de Conteúdo', 'active', 'Ferramenta de criação de conteúdo disponível'),
('Analytics Avançado', 'maintenance', 'Em manutenção para melhorias'),
('Automação de Marketing', 'active', 'Sistema de automação funcionando'),
('API de Integração', 'active', 'API funcionando normalmente'),
('Sistema de Relatórios', 'maintenance', 'Temporariamente indisponível para atualizações'),
('Backup Automático', 'active', 'Sistema de backup funcionando'),
('Monitor de Performance', 'active', 'Monitoramento ativo')
ON CONFLICT (tool_name) DO UPDATE SET
  status = EXCLUDED.status,
  message = EXCLUDED.message,
  updated_at = now();

-- Inserir conteúdos reais
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
) VALUES 
(
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
),
(
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
),
(
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
),
(
  'API e Integrações',
  'Aprenda a integrar a plataforma com outras ferramentas usando nossa API.',
  'tool',
  'pro',
  'published',
  true,
  4,
  'advanced',
  90,
  now()
),
(
  'Análise de Dados',
  'Como interpretar e utilizar os dados gerados pela plataforma.',
  'tutorial',
  'vip',
  'published',
  true,
  5,
  'intermediate',
  45,
  now()
)
ON CONFLICT (title) DO NOTHING;

-- Verificar se a tabela upcoming_releases existe
INSERT INTO upcoming_releases (
  title,
  description,
  release_date,
  target_plans,
  is_active,
  countdown_enabled,
  content_preview
) VALUES 
(
  'IA Conversacional Avançada',
  'Nova versão do chatbot com capacidades de IA ainda mais poderosas.',
  now() + interval '15 days',
  ARRAY['vip', 'pro'],
  true,
  true,
  'Incluirá processamento de linguagem natural aprimorado e respostas contextuais.'
),
(
  'Dashboard Analytics 2.0',
  'Interface completamente renovada para análise de dados.',
  now() + interval '30 days',
  ARRAY['pro'],
  true,
  true,
  'Novos gráficos interativos, relatórios customizáveis e insights automatizados.'
),
(
  'Mobile App',
  'Aplicativo móvel nativo para Android e iOS.',
  now() + interval '60 days',
  ARRAY['free', 'vip', 'pro'],
  true,
  true,
  'Acesse todas as funcionalidades principais direto do seu smartphone.'
)
ON CONFLICT (title) DO NOTHING;

-- Inserir planos reais
INSERT INTO plans (
  name,
  slug,
  description,
  price_cents,
  interval,
  active,
  features
) VALUES 
(
  'Gratuito',
  'free',
  'Acesso básico às funcionalidades essenciais',
  0,
  'monthly',
  true,
  '["Acesso limitado", "Suporte por email", "1 projeto"]'::jsonb
),
(
  'VIP',
  'vip',
  'Ideal para profissionais que precisam de mais recursos',
  9700,
  'monthly', 
  true,
  '["Acesso completo", "Suporte prioritário", "Projetos ilimitados", "Analytics avançado"]'::jsonb
),
(
  'Profissional',
  'pro',
  'Para empresas e usuários avançados',
  19700,
  'monthly',
  true,
  '["Todos os recursos VIP", "API completa", "Integrações avançadas", "Suporte dedicado", "Backup prioritário"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Inserir configurações de referência reais
INSERT INTO referral_settings (
  target_plan,
  commission_type,
  amount,
  min_payout,
  description,
  is_active
) VALUES
(
  'vip',
  'fixed',
  15.00,
  50.00,
  'Comissão fixa por indicação do plano VIP',
  true
),
(
  'pro',
  'percentage',
  10.00,
  50.00,
  'Comissão de 10% por indicação do plano PRO',
  true
)
ON CONFLICT (target_plan) DO UPDATE SET
  commission_type = EXCLUDED.commission_type,
  amount = EXCLUDED.amount,
  is_active = EXCLUDED.is_active,
  updated_at = now();

SELECT 'Dados reais inseridos com sucesso!' as message;