-- Função para reset completo de dados dos usuários (corrigida)
CREATE OR REPLACE FUNCTION admin_reset_user_data(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
  deleted_counts JSONB := '{}'::JSONB;
  sessions_count INTEGER := 0;
  tracking_count INTEGER := 0;
  analytics_count INTEGER := 0;
  tickets_count INTEGER := 0;
  referrals_count INTEGER := 0;
BEGIN
  -- Verificar se quem está executando é admin
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin';
  
  IF current_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: Only admins can reset user data';
  END IF;

  -- Deletar dados sequencialmente (não em CTE)
  DELETE FROM user_sessions WHERE user_id = target_user_id;
  GET DIAGNOSTICS sessions_count = ROW_COUNT;
  
  DELETE FROM user_area_tracking WHERE user_id = target_user_id;
  GET DIAGNOSTICS tracking_count = ROW_COUNT;
  
  DELETE FROM user_time_sessions WHERE user_id = target_user_id;
  
  DELETE FROM chatbot_analytics WHERE user_id = target_user_id;
  GET DIAGNOSTICS analytics_count = ROW_COUNT;
  
  DELETE FROM content_analytics WHERE user_id = target_user_id;
  
  DELETE FROM support_tickets WHERE user_id = target_user_id;
  GET DIAGNOSTICS tickets_count = ROW_COUNT;
  
  DELETE FROM support_messages WHERE sender_id = target_user_id;
  
  DELETE FROM referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id;
  GET DIAGNOSTICS referrals_count = ROW_COUNT;
  
  DELETE FROM subscriptions WHERE user_id = target_user_id;
  
  DELETE FROM terms_acceptance WHERE user_id = target_user_id;
  
  DELETE FROM content_visibility_rules WHERE user_id = target_user_id;

  -- Contar estatísticas
  deleted_counts := jsonb_build_object(
    'sessions_deleted', sessions_count,
    'area_tracking_deleted', tracking_count,
    'analytics_deleted', analytics_count,
    'tickets_deleted', tickets_count,
    'referrals_deleted', referrals_count
  );

  -- Reset campos do perfil para valores padrão
  UPDATE profiles 
  SET 
    total_session_time = 0,
    areas_accessed = 0,
    referral_earnings = 0,
    total_points = 0,
    plan = 'free',
    plan_start_date = NOW(),
    plan_end_date = NULL,
    plan_status = 'active',
    auto_renewal = true,
    loyalty_level = 'bronze',
    preferences = '{}',
    last_activity = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id;

  -- Log da ação
  INSERT INTO audit_logs (actor_id, action, area, target_id, metadata)
  VALUES (
    auth.uid(),
    'USER_DATA_RESET',
    'ADMIN',
    target_user_id,
    jsonb_build_object(
      'deleted_counts', deleted_counts,
      'reset_timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User data reset successfully',
    'deleted_counts', deleted_counts,
    'reset_timestamp', NOW()
  );
END;
$$;

-- Função para melhor detecção de navegador
CREATE OR REPLACE FUNCTION get_browser_info(user_agent_string TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  browser_name TEXT := 'Unknown';
  browser_version TEXT := 'Unknown';
  os_name TEXT := 'Unknown';
  device_type TEXT := 'Desktop';
BEGIN
  -- Detectar navegador
  IF user_agent_string ILIKE '%Firefox%' THEN
    browser_name := 'Firefox';
    browser_version := substring(user_agent_string from 'Firefox/([0-9.]+)');
  ELSIF user_agent_string ILIKE '%Chrome%' AND user_agent_string NOT ILIKE '%Chromium%' THEN
    browser_name := 'Chrome';
    browser_version := substring(user_agent_string from 'Chrome/([0-9.]+)');
  ELSIF user_agent_string ILIKE '%Safari%' AND user_agent_string NOT ILIKE '%Chrome%' THEN
    browser_name := 'Safari';
    browser_version := substring(user_agent_string from 'Version/([0-9.]+)');
  ELSIF user_agent_string ILIKE '%Edge%' THEN
    browser_name := 'Edge';
    browser_version := substring(user_agent_string from 'Edge/([0-9.]+)');
  ELSIF user_agent_string ILIKE '%Opera%' THEN
    browser_name := 'Opera';
    browser_version := substring(user_agent_string from 'Opera/([0-9.]+)');
  END IF;

  -- Detectar sistema operacional
  IF user_agent_string ILIKE '%Windows%' THEN
    os_name := 'Windows';
  ELSIF user_agent_string ILIKE '%Mac OS%' OR user_agent_string ILIKE '%macOS%' THEN
    os_name := 'macOS';
  ELSIF user_agent_string ILIKE '%Linux%' THEN
    os_name := 'Linux';
  ELSIF user_agent_string ILIKE '%Android%' THEN
    os_name := 'Android';
    device_type := 'Mobile';
  ELSIF user_agent_string ILIKE '%iOS%' OR user_agent_string ILIKE '%iPhone%' OR user_agent_string ILIKE '%iPad%' THEN
    os_name := 'iOS';
    device_type := CASE 
      WHEN user_agent_string ILIKE '%iPad%' THEN 'Tablet'
      ELSE 'Mobile'
    END;
  END IF;

  -- Detectar se é mobile/tablet
  IF user_agent_string ILIKE '%Mobile%' AND device_type = 'Desktop' THEN
    device_type := 'Mobile';
  ELSIF user_agent_string ILIKE '%Tablet%' AND device_type = 'Desktop' THEN
    device_type := 'Tablet';
  END IF;

  RETURN jsonb_build_object(
    'browser_name', browser_name,
    'browser_version', COALESCE(browser_version, 'Unknown'),
    'os_name', os_name,
    'device_type', device_type,
    'is_mobile', device_type IN ('Mobile', 'Tablet'),
    'full_user_agent', user_agent_string
  );
END;
$$;