-- Verificar e corrigir todas as políticas RLS para garantir acesso consistente

-- 1. Atualizar política de conteúdo para ser mais simples e funcional
DROP POLICY IF EXISTS "Users can view content based on plan" ON public.content;

CREATE POLICY "Users can view content based on plan"
ON public.content 
FOR SELECT 
USING (
  is_active = true 
  AND (status = 'published' OR status = 'active')
  AND (
    required_plan = 'free'::user_plan
    OR (
      required_plan = 'vip'::user_plan 
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND plan IN ('vip'::user_plan, 'pro'::user_plan)
      )
    )
    OR (
      required_plan = 'pro'::user_plan 
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND plan = 'pro'::user_plan
      )
    )
  )
);

-- 2. Simplificar política de notificações
DROP POLICY IF EXISTS "Users can view notifications targeted to them" ON public.notifications;

CREATE POLICY "Users can view notifications targeted to them"
ON public.notifications 
FOR SELECT 
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    target_users IS NULL 
    OR auth.uid()::text = ANY(target_users)
    OR target_plans IS NULL
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND plan::text = ANY(target_plans)
    )
  )
);

-- 3. Garantir que admin_settings seja acessível para leitura
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.admin_settings;

CREATE POLICY "Authenticated users can view settings"
ON public.admin_settings 
FOR SELECT 
USING (true);

-- 4. Atualizar upcoming_releases para ser mais inclusiva
DROP POLICY IF EXISTS "Users can view upcoming releases based on plan" ON public.upcoming_releases;

CREATE POLICY "Users can view upcoming releases based on plan"
ON public.upcoming_releases 
FOR SELECT 
USING (
  is_active = true 
  AND (
    target_plans IS NULL 
    OR target_plans = '{}'::text[]
    OR 'free' = ANY(target_plans)
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND plan::text = ANY(target_plans)
    )
  )
);

-- 5. Garantir que referrals funcione corretamente
DROP POLICY IF EXISTS "Users can view their referrals" ON public.referrals;

CREATE POLICY "Users can view their referrals"
ON public.referrals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND user_id = referrals.referrer_id
  )
);

-- 6. Adicionar mais conteúdo para testar
INSERT INTO content (
  title, 
  description, 
  content_type, 
  required_plan, 
  status, 
  is_active, 
  show_in_carousel,
  hero_image_url,
  created_at,
  updated_at
) VALUES 
(
  'Curso de Vendas Online',
  'Aprenda técnicas avançadas de vendas online',
  'course',
  'vip',
  'published',
  true,
  true,
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  now(),
  now()
),
(
  'Produto Premium',
  'Nosso produto mais avançado para profissionais',
  'product',
  'pro',
  'published',
  true,
  true,
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
  now(),
  now()
);