-- Remover dados fictícios que adicionei e manter apenas dados reais originais

-- 1. Remover conteúdos fictícios que criei
DELETE FROM content 
WHERE id IN (
  'e1413ccd-c66b-4b1e-87b7-e8c5010569bb', -- Curso de Vendas Online (fictício)
  '5bbee93d-33a8-4f16-924f-fd27e228f897', -- Produto Premium (fictício)
  '535b1153-9b94-468b-a7f8-4410d5b5bdd3', -- Tutorial Básico de Automação (fictício)
  'b7174e8b-78e0-4241-acf6-1dedc271136b', -- Introdução ao Marketing Digital (fictício)
  '526d4d5f-6918-4cf8-ab49-73c9022ac325'  -- Ferramentas Básicas (fictício)
);

-- 2. Remover notificação fictícia que criei
DELETE FROM notifications 
WHERE id = '53e996d3-cddb-4bcc-9b37-edcef73b5d45'; -- Bem-vindo à Plataforma (fictício)

-- 3. Limpar tool_status fictício e manter apenas ferramentas reais
DELETE FROM tool_status;

-- Inserir apenas as ferramentas que realmente existem no content
INSERT INTO tool_status (tool_name, status, message, created_at, updated_at)
SELECT DISTINCT 
  title as tool_name,
  'active' as status,
  'Ferramenta ativa' as message,
  now() as created_at,
  now() as updated_at
FROM content 
WHERE content_type = 'tool' 
  AND is_active = true 
  AND status = 'published'
ON CONFLICT (tool_name) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = now();

-- 4. Verificar se as políticas RLS estão funcionando corretamente apenas para dados reais
-- Atualizar política de content para mostrar apenas status published (não scheduled)
DROP POLICY IF EXISTS "Users can view content based on plan" ON public.content;

CREATE POLICY "Users can view content based on plan"
ON public.content 
FOR SELECT 
USING (
  is_active = true 
  AND status = 'published'
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