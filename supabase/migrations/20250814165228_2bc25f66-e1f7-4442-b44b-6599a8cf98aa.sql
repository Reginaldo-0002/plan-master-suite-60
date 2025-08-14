-- Limpar notificações antigas que já foram vistas por todos os admins para performance
DELETE FROM notifications 
WHERE is_active = true 
  AND created_at < NOW() - INTERVAL '7 days'
  AND (target_plans IS NULL OR 'admin' = ANY(target_plans));

-- Atualizar o timestamp do bloqueio global para garantir que está ativo
UPDATE admin_settings 
SET chat_blocked_until = NOW() + INTERVAL '1 hour',
    updated_at = NOW()
WHERE key = 'global_chat_settings';