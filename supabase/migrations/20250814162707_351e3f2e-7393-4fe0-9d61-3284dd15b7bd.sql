-- Teste para verificar o bloqueio global atual
SELECT 
  key,
  chat_blocked_until,
  chat_blocked_until > NOW() as is_currently_blocked,
  EXTRACT(EPOCH FROM (chat_blocked_until - NOW())) / 3600 as hours_remaining
FROM admin_settings 
WHERE key = 'global_chat_settings';