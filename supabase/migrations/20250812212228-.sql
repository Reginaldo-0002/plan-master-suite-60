-- Inserir regras padrão na tabela admin_settings para resolver o erro das regras
INSERT INTO admin_settings (key, value, created_at, updated_at)
VALUES (
  'site_rules',
  '{"content": "# Regras da Plataforma\n\n## 1. Termos de Uso\n\nBem-vindo à nossa plataforma. Ao utilizar nossos serviços, você concorda com as seguintes regras:\n\n### 1.1 Condutas Permitidas\n- Uso respeitoso da plataforma\n- Compartilhamento de conteúdo apropriado\n- Respeito aos outros usuários\n\n### 1.2 Condutas Proibidas\n- Spam ou conteúdo não relacionado\n- Assédio ou discriminação\n- Violação de direitos autorais\n\n## 2. Política de Privacidade\n\n### 2.1 Coleta de Dados\nColetamos apenas os dados necessários para o funcionamento da plataforma.\n\n### 2.2 Uso de Dados\nOs dados são utilizados exclusivamente para melhorar sua experiência.\n\n## 3. Sistema de Afiliados\n\n### 3.1 Programa de Indicações\n- Ganhe comissões ao indicar novos usuários\n- Comissões são creditadas automaticamente\n- Saques podem ser solicitados a qualquer momento\n\n### 3.2 Regras de Comissão\n- Comissão de 10% sobre vendas de indicados\n- Mínimo de R$ 50,00 para saque\n- Pagamentos via PIX em até 48h\n\n## 4. Suporte\n\nPara dúvidas ou problemas, entre em contato através do chat de suporte disponível na plataforma.\n\n## 5. Alterações nas Regras\n\nEstas regras podem ser alteradas a qualquer momento. Os usuários serão notificados sobre mudanças importantes."}',
  now(),
  now()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- Também garantir que a política de tool_status está correta
DROP POLICY IF EXISTS "Everyone can view tool status" ON public.tool_status;

CREATE POLICY "Everyone can view tool status"
ON public.tool_status 
FOR SELECT 
USING (true);

-- Certificar que temos dados de notificações para todos os usuários
-- Inserir uma notificação de boas-vindas para todos
INSERT INTO notifications (title, message, type, is_active, target_plans, created_at)
VALUES (
  'Bem-vindo à Plataforma!',
  'Explore todos os recursos disponíveis para o seu plano. Acesse cursos, tutoriais e ferramentas exclusivas.',
  'info',
  true,
  ARRAY['free', 'vip', 'pro'],
  now()
)
ON CONFLICT DO NOTHING;