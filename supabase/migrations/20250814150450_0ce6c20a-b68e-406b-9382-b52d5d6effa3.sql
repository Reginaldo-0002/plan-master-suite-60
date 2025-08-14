-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verificar se as extensões foram criadas
SELECT 
  'Extensões habilitadas com sucesso!' as message,
  extname as extension_name
FROM pg_extension 
WHERE extname IN ('pg_cron', 'pg_net');