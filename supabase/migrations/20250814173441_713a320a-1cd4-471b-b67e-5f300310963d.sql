-- Permitir que usuários comuns leiam configurações globais de chat para verificar bloqueios
CREATE POLICY "Users can read global chat settings" 
ON admin_settings 
FOR SELECT 
TO authenticated 
USING (key = 'global_chat_settings');

-- Garantir que a configuração de bloqueio global esteja ativa
UPDATE admin_settings 
SET 
  chat_blocked_until = NOW() + INTERVAL '24 hours',
  value = '{"chat_blocked": true, "reason": "Sistema em manutenção - chat temporariamente indisponível"}',
  updated_at = NOW()
WHERE key = 'global_chat_settings';