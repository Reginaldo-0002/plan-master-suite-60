-- Create a scheduled function to run every minute to process auto status changes
CREATE OR REPLACE FUNCTION process_auto_status_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schedule_record RECORD;
  next_execution_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get all active schedules that need to be executed
  FOR schedule_record IN 
    SELECT * FROM auto_status_schedules 
    WHERE is_active = true 
    AND next_execution <= now()
  LOOP
    -- Update the tool status
    UPDATE tool_status 
    SET 
      status = schedule_record.target_status,
      message = 'Status automaticamente alterado para ' || schedule_record.target_status,
      updated_at = now()
    WHERE tool_name = schedule_record.tool_name;
    
    -- If no existing record, insert one
    INSERT INTO tool_status (tool_name, status, message, updated_at)
    SELECT 
      schedule_record.tool_name, 
      schedule_record.target_status, 
      'Status automaticamente alterado para ' || schedule_record.target_status,
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM tool_status WHERE tool_name = schedule_record.tool_name
    );
    
    -- Calculate next execution time
    CASE schedule_record.schedule_type
      WHEN 'minutes' THEN 
        next_execution_time := now() + (schedule_record.schedule_value || ' minutes')::interval;
      WHEN 'hours' THEN
        next_execution_time := now() + (schedule_record.schedule_value || ' hours')::interval;
      WHEN 'days' THEN
        next_execution_time := now() + (schedule_record.schedule_value || ' days')::interval;
      ELSE
        next_execution_time := now() + interval '1 hour';
    END CASE;
    
    -- Update the schedule for next execution
    UPDATE auto_status_schedules 
    SET 
      next_execution = next_execution_time,
      updated_at = now()
    WHERE id = schedule_record.id;
    
    -- Log the status change
    INSERT INTO audit_logs (
      action, 
      area, 
      actor_id, 
      target_id, 
      metadata
    ) VALUES (
      'auto_status_change',
      'tools',
      null, -- System action
      schedule_record.id,
      jsonb_build_object(
        'tool_name', schedule_record.tool_name,
        'old_status', (SELECT status FROM tool_status WHERE tool_name = schedule_record.tool_name),
        'new_status', schedule_record.target_status,
        'schedule_type', schedule_record.schedule_type,
        'schedule_value', schedule_record.schedule_value
      )
    );
  END LOOP;
END;
$$;

-- Create some default tools for demonstration
INSERT INTO tool_status (tool_name, status, message) VALUES
  ('Chatbot Inteligente', 'active', 'Sistema de chatbot funcionando normalmente'),
  ('API de Pagamentos', 'active', 'API funcionando normalmente'),
  ('Sistema de E-mail', 'active', 'Envio de e-mails operacional'),
  ('Backup Automático', 'maintenance', 'Manutenção programada')
ON CONFLICT (tool_name) DO NOTHING;