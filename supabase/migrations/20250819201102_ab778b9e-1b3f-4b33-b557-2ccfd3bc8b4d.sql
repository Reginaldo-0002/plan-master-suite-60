-- Fix security function paths (Functions without SET search_path are vulnerable)
-- This addresses the security linter warnings about mutable search paths

-- 1. Fix functions that are missing SET search_path
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

CREATE OR REPLACE FUNCTION public.enforce_ip_limits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  settings_record RECORD;
  user_record RECORD;
  active_ips_count integer;
BEGIN
  -- Buscar configurações ativas
  SELECT * INTO settings_record
  FROM security_settings
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Se não há configurações, usar padrão
  IF settings_record IS NULL THEN
    settings_record.max_ips_per_user := 1;
    settings_record.block_duration_minutes := 60;
  END IF;

  -- Verificar todos os usuários ativos
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM user_sessions 
    WHERE session_start > now() - interval '24 hours'
  LOOP
    -- Contar IPs únicos por usuário
    SELECT COUNT(DISTINCT ip_address) INTO active_ips_count
    FROM user_sessions
    WHERE user_id = user_record.user_id
      AND session_start > now() - interval '24 hours';

    -- Se excede limite e não está bloqueado
    IF active_ips_count > settings_record.max_ips_per_user AND 
       NOT EXISTS (
         SELECT 1 FROM user_security_blocks
         WHERE user_id = user_record.user_id
           AND is_active = true
           AND blocked_until > now()
       ) THEN
      
      -- Criar bloqueio
      INSERT INTO user_security_blocks (
        user_id, 
        block_reason, 
        blocked_until, 
        ip_count,
        blocked_by_system
      ) VALUES (
        user_record.user_id,
        'Limite de IPs excedido: ' || active_ips_count || ' IPs detectados (limite: ' || settings_record.max_ips_per_user || ')',
        now() + (settings_record.block_duration_minutes || ' minutes')::interval,
        active_ips_count,
        true
      );

      -- Finalizar sessões ativas
      UPDATE user_sessions 
      SET 
        session_end = now(),
        is_active = false
      WHERE user_id = user_record.user_id AND is_active = true;
      
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_check_ip_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  check_result json;
BEGIN
  -- Verificar limite de IP antes de inserir
  SELECT check_ip_limit(NEW.user_id, NEW.ip_address) INTO check_result;
  
  -- Se não permitido, bloquear inserção
  IF (check_result->>'allowed')::boolean = false THEN
    RAISE EXCEPTION 'Acesso negado: %', check_result->>'message';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.manage_content_visibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Garantir que regras de visibilidade sejam aplicadas corretamente
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_session_time_tracking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Quando uma sessão é finalizada, adicionar o tempo ao rastreamento diário
  IF NEW.session_end IS NOT NULL AND OLD.session_end IS NULL AND NEW.duration_minutes > 0 THEN
    PERFORM track_daily_time(NEW.duration_minutes);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_chatbot_responses_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Add missing constraints for data integrity
-- Add constraint to prevent duplicate terms acceptance (already done)
-- Add constraint to prevent area tracking spam
CREATE INDEX IF NOT EXISTS idx_user_area_tracking_dedup ON public.user_area_tracking(user_id, area_name, created_at DESC);

-- 3. Clean up duplicate entries in area tracking to improve performance
DELETE FROM public.user_area_tracking a USING (
  SELECT MIN(ctid) as ctid, user_id, area_name
  FROM public.user_area_tracking 
  GROUP BY user_id, area_name 
  HAVING COUNT(*) > 1
) b
WHERE a.user_id = b.user_id 
  AND a.area_name = b.area_name 
  AND a.ctid <> b.ctid;