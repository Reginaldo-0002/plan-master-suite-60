
-- Corrigir a função system_cleanup para resolver a ambiguidade de referência de coluna
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
BEGIN
  -- Verificar se o usuário é admin
  SELECT user_id INTO admin_user_id
  FROM profiles
  WHERE user_id = auth.uid() AND role = 'admin';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Apenas administradores podem executar limpeza do sistema';
  END IF;
  
  -- Log da operação (usar o parâmetro com prefixo p_)
  INSERT INTO public.system_cleanup_logs (cleanup_type, affected_tables, executed_by)
  VALUES (p_cleanup_type, p_target_tables, auth.uid());
  
  -- Executar limpeza baseada no tipo
  CASE p_cleanup_type
    WHEN 'users' THEN
      IF p_keep_admin THEN
        DELETE FROM public.profiles WHERE user_id != admin_user_id;
        DELETE FROM auth.users WHERE id != admin_user_id;
      ELSE
        DELETE FROM public.profiles WHERE TRUE;
        DELETE FROM auth.users WHERE TRUE;
      END IF;
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    WHEN 'content' THEN
      DELETE FROM public.topic_resources WHERE TRUE;
      DELETE FROM public.content_topics WHERE TRUE;
      DELETE FROM public.content WHERE TRUE;
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    WHEN 'logs' THEN
      DELETE FROM public.user_activity_logs WHERE TRUE;
      DELETE FROM public.support_messages WHERE TRUE;
      DELETE FROM public.notifications WHERE TRUE;
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    WHEN 'all' THEN
      -- Limpeza completa em ordem correta devido às FK
      DELETE FROM public.topic_resources WHERE TRUE;
      DELETE FROM public.content_topics WHERE TRUE;
      DELETE FROM public.content WHERE TRUE;
      DELETE FROM public.user_activity_logs WHERE TRUE;
      DELETE FROM public.support_messages WHERE TRUE;
      DELETE FROM public.support_tickets WHERE TRUE;
      DELETE FROM public.notifications WHERE TRUE;
      DELETE FROM public.referrals WHERE TRUE;
      DELETE FROM public.user_loyalty_points WHERE TRUE;
      DELETE FROM public.user_achievements WHERE TRUE;
      DELETE FROM public.user_missions WHERE TRUE;
      DELETE FROM public.content_analytics WHERE TRUE;
      DELETE FROM public.user_interactions WHERE TRUE;
      DELETE FROM public.user_content_visibility WHERE TRUE;
      DELETE FROM public.user_content_access WHERE TRUE;
      DELETE FROM public.withdrawal_requests WHERE TRUE;
      DELETE FROM public.chat_sessions WHERE TRUE;
      DELETE FROM public.admin_chat_queue WHERE TRUE;
      DELETE FROM public.scheduled_notifications WHERE TRUE;
      DELETE FROM public.content_schedules WHERE TRUE;
      DELETE FROM public.plan_expiration_queue WHERE TRUE;
      
      IF p_keep_admin THEN
        DELETE FROM public.profiles WHERE user_id != admin_user_id;
        DELETE FROM auth.users WHERE id != admin_user_id;
      ELSE
        DELETE FROM public.profiles WHERE TRUE;
        DELETE FROM auth.users WHERE TRUE;
      END IF;
      
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    ELSE
      RAISE EXCEPTION 'Tipo de limpeza não suportado: %', p_cleanup_type;
  END CASE;
  
  -- Atualizar log com resultados (usar alias para evitar ambiguidade)
  UPDATE public.system_cleanup_logs scl
  SET records_deleted = total_deleted
  WHERE scl.executed_by = auth.uid() 
    AND scl.cleanup_type = p_cleanup_type
    AND scl.created_at = (
      SELECT MAX(scl2.created_at) FROM public.system_cleanup_logs scl2
      WHERE scl2.executed_by = auth.uid()
    );
  
  cleanup_result := json_build_object(
    'success', true,
    'records_deleted', total_deleted,
    'cleanup_type', p_cleanup_type
  );
  
  RETURN cleanup_result;
END;
$function$
