-- Limpeza final de sessões antigas
UPDATE user_sessions 
SET 
  is_active = false,
  session_end = session_start + (duration_minutes || ' minutes')::interval
WHERE 
  is_active = true 
  AND session_start < NOW() - INTERVAL '24 hours';

-- Otimizar estatísticas das tabelas principais
ANALYZE profiles;
ANALYZE user_roles;
ANALYZE support_tickets;
ANALYZE support_messages;
ANALYZE notifications;
ANALYZE content;