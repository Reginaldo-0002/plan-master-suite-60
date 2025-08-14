-- Create function to update total_session_time from user_sessions
CREATE OR REPLACE FUNCTION public.update_user_total_session_time()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update total_session_time for all users based on their user_sessions
  UPDATE profiles 
  SET total_session_time = COALESCE(session_totals.total_time, 0)
  FROM (
    SELECT 
      user_id,
      SUM(COALESCE(duration_minutes, 0)) as total_time
    FROM user_sessions
    WHERE duration_minutes IS NOT NULL
    GROUP BY user_id
  ) session_totals
  WHERE profiles.user_id = session_totals.user_id;
  
  -- Log the operation
  INSERT INTO audit_logs (
    action,
    area,
    metadata
  ) VALUES (
    'update_total_session_time',
    'system',
    jsonb_build_object(
      'timestamp', now(),
      'updated_users', (SELECT COUNT(*) FROM profiles WHERE total_session_time > 0)
    )
  );
END;
$$;

-- Create trigger to automatically update total_session_time when user_sessions changes
CREATE OR REPLACE FUNCTION public.trigger_update_session_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the specific user's total session time
  UPDATE profiles 
  SET total_session_time = (
    SELECT COALESCE(SUM(duration_minutes), 0)
    FROM user_sessions 
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND duration_minutes IS NOT NULL
  )
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_session_time_update ON user_sessions;

-- Create trigger on user_sessions table
CREATE TRIGGER trigger_session_time_update
  AFTER INSERT OR UPDATE OR DELETE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_session_time();

-- Run initial update to sync existing data
SELECT update_user_total_session_time();