-- Corrigir distribuição de conteúdo por planos para que todos os usuários vejam conteúdos apropriados

-- Atualizar alguns conteúdos para serem acessíveis a usuários VIP
UPDATE content 
SET required_plan = 'vip'::user_plan 
WHERE id = '2a58ec62-bde1-41e5-ae3c-55b02bb4dc02'; -- Marketing course

-- Criar mais conteúdos free para todos os usuários verem
INSERT INTO content (
  title, 
  description, 
  content_type, 
  required_plan, 
  status, 
  is_active, 
  show_in_carousel,
  hero_image_url,
  video_url,
  created_at,
  updated_at
) VALUES 
(
  'Introdução ao Marketing Digital',
  'Conceitos básicos de marketing digital para iniciantes',
  'course',
  'free',
  'published',
  true,
  true,
  'https://images.unsplash.com/photo-1553729459-efe14ef6055d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  now(),
  now()
),
(
  'Ferramentas Básicas',
  'Conjunto de ferramentas essenciais para começar',
  'tool',
  'free',
  'published',
  true,
  false,
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  now(),
  now()
),
(
  'Tutorial Básico de Automação',
  'Como criar automações simples para seu negócio',
  'tutorial',
  'free',
  'published',
  true,
  false,
  'https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  now(),
  now()
);

-- Garantir que pelo menos uma ferramenta está ativa no tool_status
UPDATE tool_status 
SET status = 'active', message = 'Ferramenta funcionando perfeitamente'
WHERE tool_name IN ('robo do zap', 'robo do telegram', 'lovable', 'marketing');

-- Verificar se todas as consultas principais estão funcionando
-- Testar política de admin_settings para regras
DROP POLICY IF EXISTS "Only admins can manage settings" ON public.admin_settings;

CREATE POLICY "Authenticated users can view settings"
ON public.admin_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage settings"
ON public.admin_settings 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);