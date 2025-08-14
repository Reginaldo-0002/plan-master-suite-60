-- Enable pg_cron and create scheduled task for auto status processing
-- First enable the extensions if they're not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run every minute for auto status processing
SELECT cron.schedule(
  'auto-status-processor',
  '* * * * *', -- every minute
  $$
  SELECT process_auto_status_schedules();
  $$
);

-- Verify the cron job was created
SELECT cron.job_id, schedule, command, active 
FROM cron.job 
WHERE jobname = 'auto-status-processor';