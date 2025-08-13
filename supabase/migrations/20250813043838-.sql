-- Corrigir função com ambiguidade na coluna user_id
CREATE OR REPLACE FUNCTION public.get_user_security_stats()
RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_plan text,
  total_sessions bigint,
  unique_ips bigint,
  last_session_start timestamp with time zone,
  total_time_minutes numeric,
  is_currently_active boolean,
  is_blocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Limpar sessões antes de calcular estatísticas
  PERFORM cleanup_user_sessions();
  
  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.full_name, 'Usuário sem nome') as user_name,
    COALESCE(p.plan::text, 'free') as user_plan,
    COALESCE(session_stats.total_sessions, 0) as total_sessions,
    COALESCE(session_stats.unique_ips, 0) as unique_ips,
    session_stats.last_session_start,
    COALESCE(session_stats.total_time_minutes, 0) as total_time_minutes,
    COALESCE(session_stats.is_currently_active, false) as is_currently_active,
    COALESCE(blocks.is_blocked, false) as is_blocked
  FROM profiles p
  LEFT JOIN (
    SELECT 
      us.user_id as session_user_id,
      COUNT(*)::bigint as total_sessions,
      COUNT(DISTINCT us.ip_address)::bigint as unique_ips,
      MAX(us.session_start) as last_session_start,
      SUM(us.duration_minutes)::numeric as total_time_minutes,
      BOOL_OR(us.is_active) as is_currently_active
    FROM user_sessions us
    GROUP BY us.user_id
  ) session_stats ON p.user_id = session_stats.session_user_id
  LEFT JOIN (
    SELECT 
      usb.user_id as block_user_id,
      true as is_blocked
    FROM user_security_blocks usb
    WHERE usb.is_active = true 
      AND usb.blocked_until > now()
    GROUP BY usb.user_id
  ) blocks ON p.user_id = blocks.block_user_id
  WHERE p.user_id IS NOT NULL
  ORDER BY 
    CASE WHEN session_stats.last_session_start IS NULL THEN 1 ELSE 0 END,
    session_stats.last_session_start DESC;
END;
$function$;