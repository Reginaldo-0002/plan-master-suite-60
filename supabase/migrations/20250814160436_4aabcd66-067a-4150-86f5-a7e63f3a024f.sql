-- Corrigir política RLS para notificações de chat
-- Remover a política existente e criar uma nova mais específica

DROP POLICY IF EXISTS "Users can view notifications targeted to them" ON notifications;

-- Criar nova política que exclui notificações de chat para usuários comuns
CREATE POLICY "Users can view notifications targeted to them" 
ON notifications 
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    -- Se é notificação de chat, só admins podem ver
    (
      (notification_metadata->>'action_type' = 'chat_message') 
      AND 
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
      )
    )
    OR
    -- Se não é notificação de chat, aplicar regras normais de target
    (
      (notification_metadata->>'action_type' IS NULL OR notification_metadata->>'action_type' != 'chat_message')
      AND
      (
        target_users IS NULL 
        OR auth.uid()::text = ANY(target_users)
        OR (
          target_plans IS NOT NULL 
          AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND plan::text = ANY(target_plans)
          )
        )
      )
    )
  )
);

-- Garantir que as configurações globais de chat sejam corretamente verificadas
-- Inserir configuração global se não existir
INSERT INTO admin_settings (key, value, chat_blocked_until)
VALUES ('global_chat_settings', '{"chat_globally_blocked": false}'::jsonb, NULL)
ON CONFLICT (key) DO NOTHING;