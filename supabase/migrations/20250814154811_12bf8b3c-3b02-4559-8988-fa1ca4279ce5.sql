-- Atualizar a política RLS para notificações de chat para aparecer apenas para admins
DROP POLICY IF EXISTS "Users can view notifications targeted to them" ON notifications;

CREATE POLICY "Users can view notifications targeted to them" 
ON notifications 
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    -- Notificações de chat APENAS para admins
    (notification_metadata->>'action_type' = 'chat_message' AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ))
    OR
    -- Outras notificações seguem a lógica original (não são de chat)
    (
      (notification_metadata->>'action_type' IS NULL OR notification_metadata->>'action_type' != 'chat_message')
      AND (
        (target_users IS NULL OR auth.uid()::text = ANY(target_users))
        OR
        (target_plans IS NULL OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE user_id = auth.uid() AND plan::text = ANY(target_plans)
        ))
      )
    )
  )
);