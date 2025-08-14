-- Inserir/atualizar configuração de bloqueio global do chat
INSERT INTO admin_settings (key, value, chat_blocked_until)
VALUES (
  'global_chat_settings',
  '{"chat_blocked": true, "reason": "Manutenção do sistema"}',
  NOW() + INTERVAL '24 hours'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  chat_blocked_until = EXCLUDED.chat_blocked_until,
  updated_at = NOW();