-- Configurar cron job para executar o processador automático de status
-- Executar a cada 5 minutos

SELECT cron.schedule(
  'auto-status-processor',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT
    net.http_post(
        url:='https://srnwogrjwhqjjyodxalx.supabase.co/functions/v1/auto-status-processor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNybndvZ3Jqd2hxamp5b2R4YWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzY0NDIsImV4cCI6MjA3MDQ1MjQ0Mn0.MGvm-0S7W6NPtav5Gu2IbBwCvrs7VbcV04Py5eq66xc"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Verificar se o cron foi criado
SELECT 
  'Sistema de status automático configurado!' as message,
  jobname, 
  schedule, 
  active 
FROM cron.job 
WHERE jobname = 'auto-status-processor';