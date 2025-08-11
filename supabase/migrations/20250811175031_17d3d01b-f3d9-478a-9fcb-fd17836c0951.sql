
-- Recriar a função system_cleanup com correção definitiva do erro de ambiguidade
CREATE OR REPLACE FUNCTION public.system_cleanup(
  p_cleanup_type text, 
  p_target_tables text[] DEFAULT NULL::text[], 
  p_keep_admin boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  cleanup_result JSON;
  total_deleted INTEGER := 0;
  admin_user_id UUID;
  temp_count INTEGER;
  log_record_id UUID;
  current_user_id UUID;
BEGIN
  -- Validação de entrada
  IF p_cleanup_type IS NULL OR p_cleanup_type = '' THEN
    RAISE EXCEPTION 'Tipo de limpeza não pode ser nulo ou vazio';
  END IF;
  
  IF p_cleanup_type NOT IN ('users', 'content', 'logs', 'all') THEN
    RAISE EXCEPTION 'Tipo de limpeza não suportado: %. Tipos válidos: users, content, logs, all', p_cleanup_type;
  END IF;
  
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  -- Verificar se o usuário é admin
  SELECT p.user_id INTO admin_user_id
  FROM public.profiles p
  WHERE p.user_id = current_user_id AND p.role = 'admin';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Apenas administradores podem executar limpeza do sistema';
  END IF;
  
  -- Criar log da operação e obter o ID
  INSERT INTO public.system_cleanup_logs (cleanup_type, affected_tables, executed_by)
  VALUES (p_cleanup_type, p_target_tables, current_user_id)
  RETURNING id INTO log_record_id;
  
  -- Executar limpeza baseada no tipo
  CASE p_cleanup_type
    WHEN 'users' THEN
      -- Limpeza de usuários
      IF p_keep_admin THEN
        DELETE FROM public.profiles WHERE user_id != admin_user_id;
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        total_deleted := total_deleted + temp_count;
      ELSE
        DELETE FROM public.profiles WHERE user_id IS NOT NULL;
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        total_deleted := total_deleted + temp_count;
      END IF;
      
    WHEN 'content' THEN
      -- Limpeza de conteúdo (ordem das FK)
      DELETE FROM public.topic_resources WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.content_topics WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.content WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
    WHEN 'logs' THEN
      -- Limpeza de logs e histórico
      DELETE FROM public.user_activity_logs WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.support_messages WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.notifications WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
    WHEN 'all' THEN
      -- Limpeza completa em ordem correta das FK
      DELETE FROM public.topic_resources WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.content_topics WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.content WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.user_activity_logs WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.support_messages WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.support_tickets WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.notifications WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.referrals WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.user_loyalty_points WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.user_achievements WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.user_missions WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.content_analytics WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.user_interactions WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.user_content_visibility WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.user_content_access WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.withdrawal_requests WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.chat_sessions WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.admin_chat_queue WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.scheduled_notifications WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.content_schedules WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      DELETE FROM public.plan_expiration_queue WHERE id IS NOT NULL;
      GET DIAGNOSTICS temp_count = ROW_COUNT;
      total_deleted := total_deleted + temp_count;
      
      -- Limpar profiles por último (manter admin se solicitado)
      IF p_keep_admin THEN
        DELETE FROM public.profiles WHERE user_id != admin_user_id;
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        total_deleted := total_deleted + temp_count;
      ELSE
        DELETE FROM public.profiles WHERE user_id IS NOT NULL;
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        total_deleted := total_deleted + temp_count;
      END IF;
      
  END CASE;
  
  -- Atualizar log com resultados (correção definitiva da ambiguidade)
  UPDATE public.system_cleanup_logs 
  SET records_deleted = total_deleted
  WHERE id = log_record_id;
  
  -- Construir resultado
  cleanup_result := json_build_object(
    'success', true,
    'records_deleted', total_deleted,
    'cleanup_type', p_cleanup_type,
    'keep_admin', p_keep_admin,
    'executed_by', current_user_id,
    'timestamp', now()
  );
  
  RETURN cleanup_result;
  
EXCEPTION 
  WHEN OTHERS THEN
    -- Log do erro com ID específico se disponível
    IF log_record_id IS NOT NULL THEN
      UPDATE public.system_cleanup_logs 
      SET records_deleted = -1
      WHERE id = log_record_id;
    ELSE
      INSERT INTO public.system_cleanup_logs (cleanup_type, affected_tables, executed_by, records_deleted)
      VALUES (p_cleanup_type, p_target_tables, current_user_id, -1);
    END IF;
    
    -- Re-raise o erro com contexto
    RAISE EXCEPTION 'Falha na limpeza do sistema (tipo: %): %', p_cleanup_type, SQLERRM;
END;
$function$;
