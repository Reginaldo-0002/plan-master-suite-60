-- Reverter RLS para estado anterior (permitir visualização de conteúdo publicado e ativo, respeitando regras de ocultação, sem checar plano)

-- Remover a política que passou a exigir checagem de plano
DROP POLICY IF EXISTS "Users can view content based on their plan level" ON public.content;

-- Restaurar a política anterior
CREATE POLICY "Users can view all published content regardless of plan" ON public.content
FOR SELECT
TO authenticated
USING (
  (is_active = true)
  AND (status = 'published'::text)
  AND (
    NOT EXISTS (
      SELECT 1 FROM content_visibility_rules cvr
      WHERE cvr.content_id = content.id
        AND cvr.user_id = auth.uid()
        AND cvr.is_visible = false
    )
  )
);