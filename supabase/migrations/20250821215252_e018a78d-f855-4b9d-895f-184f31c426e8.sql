-- Limpar tabelas vazias não utilizadas
DROP TABLE IF EXISTS loyalty_rewards CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS user_missions CASCADE;
DROP TABLE IF EXISTS user_loyalty_points CASCADE;
DROP TABLE IF EXISTS automation_workflows CASCADE;
DROP TABLE IF EXISTS content_schedules CASCADE;
DROP TABLE IF EXISTS event_bus CASCADE;
DROP TABLE IF EXISTS outbound_deliveries CASCADE;
DROP TABLE IF EXISTS outbound_subscriptions CASCADE;
DROP TABLE IF EXISTS user_content_access CASCADE;
DROP TABLE IF EXISTS user_content_visibility CASCADE;

-- Limpar dados órfãos de rastreamento muito antigos (manter apenas últimos 3 meses)
DELETE FROM user_area_tracking WHERE created_at < NOW() - INTERVAL '3 months';
DELETE FROM chatbot_analytics WHERE created_at < NOW() - INTERVAL '3 months';
DELETE FROM user_time_sessions WHERE date < NOW() - INTERVAL '3 months';

-- Limpar user_interactions órfãos (não conectados a usuários existentes)
DELETE FROM user_interactions 
WHERE user_id NOT IN (SELECT user_id FROM profiles);

-- Otimizar índices das tabelas principais
REINDEX INDEX CONCURRENTLY profiles_user_id_idx;
REINDEX INDEX CONCURRENTLY support_tickets_user_id_idx;
REINDEX INDEX CONCURRENTLY support_messages_ticket_id_idx;