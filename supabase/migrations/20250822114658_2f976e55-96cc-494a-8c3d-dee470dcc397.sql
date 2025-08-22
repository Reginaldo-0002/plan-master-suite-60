-- Função para reset completo de dados dos usuários (apenas para admins)
CREATE OR REPLACE FUNCTION admin_reset_user_data(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
  deleted_counts JSONB := '{}'::JSONB;
BEGIN
  -- Verificar se quem está executando é admin
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin';
  
  IF current_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: Only admins can reset user data';
  END IF;

  -- Deletar dados do usuário (preservando apenas perfil básico)
  WITH deletion_results AS (
    SELECT 
      (DELETE FROM user_sessions WHERE user_id = target_user_id) AS sessions_deleted,
      (DELETE FROM user_area_tracking WHERE user_id = target_user_id) AS area_tracking_deleted,
      (DELETE FROM user_time_sessions WHERE user_id = target_user_id) AS time_sessions_deleted,
      (DELETE FROM chatbot_analytics WHERE user_id = target_user_id) AS chatbot_analytics_deleted,
      (DELETE FROM content_analytics WHERE user_id = target_user_id) AS content_analytics_deleted,
      (DELETE FROM support_tickets WHERE user_id = target_user_id) AS support_tickets_deleted,
      (DELETE FROM support_messages WHERE sender_id = target_user_id) AS support_messages_deleted,
      (DELETE FROM referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id) AS referrals_deleted,
      (DELETE FROM subscriptions WHERE user_id = target_user_id) AS subscriptions_deleted,
      (DELETE FROM terms_acceptance WHERE user_id = target_user_id) AS terms_deleted,
      (DELETE FROM content_visibility_rules WHERE user_id = target_user_id) AS visibility_rules_deleted
  )
  SELECT jsonb_build_object(
    'sessions_deleted', sessions_deleted,
    'area_tracking_deleted', area_tracking_deleted,
    'time_sessions_deleted', time_sessions_deleted,
    'chatbot_analytics_deleted', chatbot_analytics_deleted,
    'content_analytics_deleted', content_analytics_deleted,
    'support_tickets_deleted', support_tickets_deleted,
    'support_messages_deleted', support_messages_deleted,
    'referrals_deleted', referrals_deleted,
    'subscriptions_deleted', subscriptions_deleted,
    'terms_deleted', terms_deleted,
    'visibility_rules_deleted', visibility_rules_deleted
  ) INTO deleted_counts
  FROM deletion_results;

  -- Reset campos do perfil para valores padrão (mas mantém perfil)
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
  browser_info JSONB := '{}'::JSONB;
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