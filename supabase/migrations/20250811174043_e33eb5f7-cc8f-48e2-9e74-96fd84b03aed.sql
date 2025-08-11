
-- Recriar completamente a função system_cleanup com correções definitivas
CREATE OR REPLACE FUNCTION public.system_cleanup(
  cleanup_type text, 
  target_tables text[] DEFAULT NULL::text[], 
  keep_admin boolean DEFAULT true
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
BEGIN
  -- Validação de entrada
  IF cleanup_type IS NULL OR cleanup_type = '' THEN
    RAISE EXCEPTION 'Tipo de limpeza não pode ser nulo ou vazio';
  END IF;
  
  IF cleanup_type NOT IN ('users', 'content', 'logs', 'all') THEN
    RAISE EXCEPTION 'Tipo de limpeza não suportado: %. Tipos válidos: users, content, logs, all', cleanup_type;
  END IF;
  
  -- Verificar se o usuário é admin
  SELECT p.user_id INTO admin_user_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid() AND p.role = 'admin';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Apenas administradores podem executar limpeza do sistema';
  END IF;
  
  -- Iniciar transação e log da operação
  INSERT INTO public.system_cleanup_logs (cleanup_type, affected_tables, executed_by)
  VALUES (cleanup_type, target_tables, auth.uid());
  
  -- Executar limpeza baseada no tipo com WHERE clauses explícitas
  CASE cleanup_type
    WHEN 'users' THEN
      -- Limpeza de usuários
      IF keep_admin THEN
        DELETE FROM public.profiles WHERE user_id != admin_user_id;
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        total_deleted := total_deleted + temp_count;
        
        -- Não deletar do auth.users pois pode causar problemas de autenticação
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
      IF keep_admin THEN
        DELETE FROM public.profiles WHERE user_id != admin_user_id;
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        total_deleted := total_deleted + temp_count;
      ELSE
        DELETE FROM public.profiles WHERE user_id IS NOT NULL;
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        total_deleted := total_deleted + temp_count;
      END IF;
      
  END CASE;
  
  -- Atualizar log com resultados (correção do UPDATE)
  UPDATE public.system_cleanup_logs 
  SET records_deleted = total_deleted
  WHERE executed_by = auth.uid() 
    AND cleanup_type = cleanup_type
    AND created_at = (
      SELECT MAX(created_at) 
      FROM public.system_cleanup_logs 
      WHERE executed_by = auth.uid()
    );
  
  -- Construir resultado
  cleanup_result := json_build_object(
    'success', true,
    'records_deleted', total_deleted,
    'cleanup_type', cleanup_type,
    'keep_admin', keep_admin,
    'executed_by', auth.uid(),
    'timestamp', now()
  );
  
  RETURN cleanup_result;
  
EXCEPTION 
  WHEN OTHERS THEN
    -- Log do erro
    INSERT INTO public.system_cleanup_logs (cleanup_type, affected_tables, executed_by, records_deleted)
    VALUES (cleanup_type, target_tables, auth.uid(), -1);
    
    -- Re-raise o erro com contexto
    RAISE EXCEPTION 'Falha na limpeza do sistema (tipo: %): %', cleanup_type, SQLERRM;
END;
$function$
