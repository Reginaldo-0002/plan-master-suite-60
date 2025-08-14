-- Corrigir problemas do sistema: notificações e ferramentas fictícias

-- 1. Limpar todas as ferramentas fictícias da tabela tool_status
DELETE FROM tool_status WHERE tool_name IN (
  'ChatBot Inteligente', 'Gerador de Conteúdo', 'Analytics Avançado', 
  'Automação de Marketing', 'API de Integração', 'Sistema de Relatórios', 
  'Backup Automático', 'Monitor de Performance', 'Ferramenta A', 'Ferramenta B',
  'Ferramenta C', 'Ferramenta D', 'Ferramenta E', 'Ferramenta F'
);

-- 2. Atualizar política de notificações para garantir que notificações de chat só apareçam para admins
DROP POLICY IF EXISTS "Users can view notifications targeted to them" ON notifications;

-- Nova política que exclui notificações de chat para usuários comuns
CREATE POLICY "Users can view notifications targeted to them" 
ON notifications 
FOR SELECT 
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now()) 
  AND (
    -- Se for notificação de chat, só admins podem ver
    (notification_metadata->>'action_type' = 'chat_message' AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ))
    OR 
    -- Outras notificações seguem a lógica normal
    (notification_metadata->>'action_type' != 'chat_message' AND (
      (target_users IS NULL OR auth.uid()::text = ANY(target_users)) 
      OR 
      (target_plans IS NULL OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() AND plan::text = ANY(notifications.target_plans)
      ))
    ))
    OR
    -- Se não tem action_type, segue lógica normal
    (notification_metadata->>'action_type' IS NULL AND (
      (target_users IS NULL OR auth.uid()::text = ANY(target_users)) 
      OR 
      (target_plans IS NULL OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() AND plan::text = ANY(notifications.target_plans)
      ))
    ))
  )
);

-- 3. Verificar e limpar auto_status_schedules relacionados às ferramentas fictícias
DELETE FROM auto_status_schedules WHERE tool_name IN (
  'ChatBot Inteligente', 'Gerador de Conteúdo', 'Analytics Avançado', 
  'Automação de Marketing', 'API de Integração', 'Sistema de Relatórios', 
  'Backup Automático', 'Monitor de Performance', 'Ferramenta A', 'Ferramenta B',
  'Ferramenta C', 'Ferramenta D', 'Ferramenta E', 'Ferramenta F'
);

-- Verificar resultado
SELECT 
  'Sistema limpo! Dados fictícios removidos.' as message,
  (SELECT COUNT(*) FROM tool_status) as ferramentas_restantes,
  (SELECT COUNT(*) FROM content WHERE content_type = 'tool') as conteudos_ferramenta;