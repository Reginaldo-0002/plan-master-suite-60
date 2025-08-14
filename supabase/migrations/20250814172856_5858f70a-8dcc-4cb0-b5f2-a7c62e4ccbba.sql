-- Verificar e corrigir configuração global de chat bloqueado
INSERT INTO admin_settings (key, value, chat_blocked_until, created_at, updated_at)
VALUES (
  'global_chat_settings',
  '{"chat_blocked": true, "reason": "Manutenção do sistema de chat"}',
  NOW() + INTERVAL '24 hours',
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  chat_blocked_until = EXCLUDED.chat_blocked_until,
  updated_at = NOW();

-- Verificar se a tabela está sendo consultada corretamente
-- Criar índice para melhorar performance na consulta
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);

-- Adicionar constraint para garantir que a chave seja única
ALTER TABLE admin_settings ADD CONSTRAINT unique_admin_settings_key UNIQUE (key);