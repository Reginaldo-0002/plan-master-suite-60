-- Verificar e corrigir políticas RLS para dados de usuários normais

-- Política mais permissiva para visualização de perfis entre usuários autenticados
DROP POLICY IF EXISTS "Users can view profiles based on admin status" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Nova política unificada para visualização de perfis
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Política para notificações - usuários devem ver notificações direcionadas a eles
DROP POLICY IF EXISTS "Users can view notifications targeted to them" ON public.notifications;

CREATE POLICY "Users can view notifications targeted to them"
ON public.notifications 
FOR SELECT 
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND auth.uid() IS NOT NULL
  AND (
    target_users IS NULL 
    OR auth.uid()::text = ANY(target_users)
    OR (
      target_plans IS NULL 
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND plan::text = ANY(target_plans)
      )
    )
  )
);

-- Política para conteúdo - usuários devem ver conteúdo baseado no plano
DROP POLICY IF EXISTS "Authenticated users can view content based on plan" ON public.content;
DROP POLICY IF EXISTS "Users can view content based on their plan and authentication" ON public.content;

CREATE POLICY "Users can view content based on plan"
ON public.content 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
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

-- Política para upcoming releases
DROP POLICY IF EXISTS "Authenticated users can view upcoming releases" ON public.upcoming_releases;

CREATE POLICY "Users can view upcoming releases based on plan"
ON public.upcoming_releases 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
  AND (
    target_plans IS NULL 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND plan::text = ANY(target_plans)
    )
  )
);

-- Atualizar política para content_topics
DROP POLICY IF EXISTS "Users can view topics based on content plan requirement" ON public.content_topics;

CREATE POLICY "Users can view topics based on content plan"
ON public.content_topics 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM content c
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE c.id = content_topics.content_id 
    AND c.is_active = true
    AND (
      c.required_plan = 'free'::user_plan
      OR (c.required_plan = 'vip'::user_plan AND p.plan IN ('vip'::user_plan, 'pro'::user_plan))
      OR (c.required_plan = 'pro'::user_plan AND p.plan = 'pro'::user_plan)
    )
  )
);