-- Corrigir sistema de bloqueio por IP para funcionar automaticamente

-- 1. Melhorar a função check_ip_limit para bloqueio automático mais rigoroso
CREATE OR REPLACE FUNCTION public.check_ip_limit(target_user_id uuid, current_ip inet)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  settings_record RECORD;
  active_ips_count integer;
  result json;
  current_ip_exists boolean := false;
BEGIN
  -- Buscar configurações ativas
  SELECT * INTO settings_record
  FROM security_settings
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Se não há configurações, usar padrão de 1 IP
  IF settings_record IS NULL THEN
    settings_record.max_ips_per_user := 1;
    settings_record.block_duration_minutes := 60;
  END IF;

  -- Verificar se usuário já está bloqueado
  IF EXISTS (
    SELECT 1 FROM user_security_blocks
    WHERE user_id = target_user_id
      AND is_active = true
      AND blocked_until > now()
  ) THEN
    RETURN json_build_object(
      'allowed', false, 
      'message', 'Usuário já está bloqueado',
      'blocked_until', (SELECT blocked_until FROM user_security_blocks WHERE user_id = target_user_id AND is_active = true AND blocked_until > now() LIMIT 1)
    );
  END IF;

  -- Verificar se IP atual já existe para este usuário
  SELECT EXISTS (
    SELECT 1 FROM user_sessions
    WHERE user_id = target_user_id
      AND ip_address = current_ip
      AND session_start > now() - interval '24 hours'
  ) INTO current_ip_exists;

  -- Contar IPs únicos ativos nas últimas 24 horas
  SELECT COUNT(DISTINCT ip_address) INTO active_ips_count
  FROM user_sessions
  WHERE user_id = target_user_id
    AND session_start > now() - interval '24 hours';

  -- Se IP atual não existe, seria um novo IP
  IF NOT current_ip_exists THEN
    active_ips_count := active_ips_count + 1;
  END IF;

  -- Verificar se excede o limite
  IF active_ips_count > settings_record.max_ips_per_user THEN
    -- Criar bloqueio imediatamente
    INSERT INTO user_security_blocks (
      user_id, 
      block_reason, 
      blocked_until, 
      ip_count,
      blocked_by_system
    ) VALUES (
      target_user_id,
      'Limite de IPs excedido: ' || active_ips_count || ' IPs detectados (limite: ' || settings_record.max_ips_per_user || ')',
      now() + (settings_record.block_duration_minutes || ' minutes')::interval,
      active_ips_count,
      true
    );

    -- Finalizar todas as sessões ativas do usuário
    UPDATE user_sessions 
    SET 
      session_end = now(),
      is_active = false
    WHERE user_id = target_user_id AND is_active = true;

    RETURN json_build_object(
      'allowed', false, 
      'message', 'Limite de IPs excedido. Usuário bloqueado por ' || settings_record.block_duration_minutes || ' minutos',
      'blocked_until', now() + (settings_record.block_duration_minutes || ' minutes')::interval,
      'ip_count', active_ips_count,
      'limit', settings_record.max_ips_per_user
    );
  END IF;

  RETURN json_build_object(
    'allowed', true, 
    'message', 'Dentro do limite de IPs',
    'ip_count', active_ips_count,
    'limit', settings_record.max_ips_per_user
  );
END;
$function$;

-- 2. Criar trigger automático para verificar IPs ao inserir sessões
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

-- Criar trigger para verificação automática
DROP TRIGGER IF EXISTS trigger_check_ip_limit ON user_sessions;
CREATE TRIGGER trigger_check_ip_limit
  BEFORE INSERT ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_check_ip_limit();

-- 3. Função para verificar e aplicar bloqueios em usuários existentes
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

-- 4. Executar verificação inicial para aplicar bloqueios existentes
SELECT enforce_ip_limits();

-- 5. Melhorar função de desbloqueio para ser mais eficiente
CREATE OR REPLACE FUNCTION public.admin_unblock_user(block_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  target_user_id uuid;
BEGIN
  -- Verificar se é admin usando user_roles
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem desbloquear usuários';
  END IF;

  -- Buscar user_id do bloqueio
  SELECT user_id INTO target_user_id
  FROM user_security_blocks
  WHERE id = block_id AND is_active = true;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Bloqueio não encontrado ou já inativo';
  END IF;

  -- Desativar bloqueio
  UPDATE user_security_blocks
  SET is_active = false
  WHERE id = block_id;

  -- Desativar todos os outros bloqueios ativos do mesmo usuário
  UPDATE user_security_blocks
  SET is_active = false
  WHERE user_id = target_user_id 
    AND is_active = true 
    AND id != block_id;

  result := json_build_object(
    'success', true,
    'message', 'Usuário desbloqueado com sucesso',
    'user_id', target_user_id
  );
  
  RETURN result;
END;
$function$;