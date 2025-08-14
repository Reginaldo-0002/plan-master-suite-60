-- Verificar e corrigir notificações de chat que estão aparecendo para usuários comuns
-- Criar política mais específica para notificações

DROP POLICY IF EXISTS "Users can view notifications targeted to them" ON notifications;

-- Criar nova política que bloqueia notificações de chat para usuários comuns
CREATE POLICY "Users can view notifications targeted to them" 
ON notifications 
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    -- Se é notificação de chat, só admins/moderators podem ver
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
    -- Se não é notificação de chat, aplicar regras normais
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

-- Garantir que todas as configurações de bloqueio global sejam respeitadas
-- Atualizar trigger para garantir real-time
CREATE OR REPLACE FUNCTION notify_chat_restriction_changes()
RETURNS trigger AS $$
BEGIN
  -- Notificar mudanças nas configurações globais
  PERFORM pg_notify('admin_settings_change', NEW.key);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_settings_notify ON admin_settings;
CREATE TRIGGER admin_settings_notify
  AFTER INSERT OR UPDATE OR DELETE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION notify_chat_restriction_changes();