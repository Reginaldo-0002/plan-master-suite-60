-- Corrigir o problema identificado: tool_status table está vazia e políticas podem ter problemas
-- Primeiro, vamos inserir dados de ferramentas se não existirem

INSERT INTO tool_status (tool_name, status, message, created_at, updated_at)
VALUES 
  ('robo do zap', 'active', 'Ferramenta funcionando normalmente', now(), now()),
  ('robo do telegram', 'active', 'Ferramenta funcionando normalmente', now(), now()),
  ('lovable', 'active', 'Ferramenta funcionando normalmente', now(), now()),
  ('marketing', 'active', 'Ferramenta funcionando normalmente', now(), now())
ON CONFLICT (tool_name) DO UPDATE SET
  updated_at = now();

-- Corrigir política de content que pode estar muito restritiva
DROP POLICY IF EXISTS "Users can view content based on plan" ON public.content;

CREATE POLICY "Users can view content based on plan"
ON public.content 
FOR SELECT 
USING (
  is_active = true 
  AND status = 'published'
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

-- Também corrigir upcoming releases para ser mais inclusiva
DROP POLICY IF EXISTS "Users can view upcoming releases based on plan" ON public.upcoming_releases;

CREATE POLICY "Users can view upcoming releases based on plan"
ON public.upcoming_releases 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
  AND (
    target_plans IS NULL 
    OR target_plans = '{}'::text[]
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND plan::text = ANY(target_plans)
    )
  )
);

-- Atualizar um conteúdo free para todos verem
UPDATE content 
SET required_plan = 'free'::user_plan 
WHERE id = 'c4008041-2f6f-4d66-93e0-e7dbf5d8b3e4'; -- robo do zap