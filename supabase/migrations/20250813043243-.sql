-- Função para limpar sessões duplicadas e ativas orfãs
CREATE OR REPLACE FUNCTION public.cleanup_user_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Finalizar sessões ativas que não foram fechadas há mais de 1 hora
  UPDATE user_sessions 
  SET 
    session_end = session_start + (duration_minutes || ' minutes')::interval,
    is_active = false
  WHERE 
    is_active = true 
    AND session_start < now() - interval '1 hour'
    AND session_end IS NULL;
    
  -- Atualizar duração de sessões sem fim que ainda estão ativas
  UPDATE user_sessions 
  SET duration_minutes = EXTRACT(EPOCH FROM (now() - session_start)) / 60
  WHERE 
    is_active = true 
    AND session_end IS NULL
    AND duration_minutes = 0;
END;
$function$;

-- Função para obter estatísticas completas de usuários
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
      us.user_id,
      COUNT(*) as total_sessions,
      COUNT(DISTINCT us.ip_address) as unique_ips,
      MAX(us.session_start) as last_session_start,
      SUM(us.duration_minutes) as total_time_minutes,
      BOOL_OR(us.is_active) as is_currently_active
    FROM user_sessions us
    GROUP BY us.user_id
  ) session_stats ON p.user_id = session_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      true as is_blocked
    FROM user_security_blocks
    WHERE is_active = true 
      AND blocked_until > now()
    GROUP BY user_id
  ) blocks ON p.user_id = blocks.user_id
  ORDER BY session_stats.last_session_start DESC NULLS LAST;
END;
$function$;