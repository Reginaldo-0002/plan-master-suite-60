
-- Corrigir a função system_cleanup para usar nomes de parâmetros compatíveis com TypeScript
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
  cleanup_type_var text := cleanup_type;
  target_tables_var text[] := target_tables;
  keep_admin_var boolean := keep_admin;
BEGIN
  -- Verificar se o usuário é admin
  SELECT p.user_id INTO admin_user_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid() AND p.role = 'admin';
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Apenas administradores podem executar limpeza do sistema';
  END IF;
  
  -- Log da operação
  INSERT INTO public.system_cleanup_logs (cleanup_type, affected_tables, executed_by)
  VALUES (cleanup_type_var, target_tables_var, auth.uid());
  
  -- Executar limpeza baseada no tipo
  CASE cleanup_type_var
    WHEN 'users' THEN
      IF keep_admin_var THEN
        DELETE FROM public.profiles p WHERE p.user_id != admin_user_id;
        DELETE FROM auth.users u WHERE u.id != admin_user_id;
      ELSE
        DELETE FROM public.profiles;
        DELETE FROM auth.users;
      END IF;
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    WHEN 'content' THEN
      DELETE FROM public.topic_resources;
      DELETE FROM public.content_topics;
      DELETE FROM public.content;
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    WHEN 'logs' THEN
      DELETE FROM public.user_activity_logs;
      DELETE FROM public.support_messages;
      DELETE FROM public.notifications;
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    WHEN 'all' THEN
      -- Limpeza completa em ordem correta devido às FK
      DELETE FROM public.topic_resources;
      DELETE FROM public.content_topics;
      DELETE FROM public.content;
      DELETE FROM public.user_activity_logs;
      DELETE FROM public.support_messages;
      DELETE FROM public.support_tickets;
      DELETE FROM public.notifications;
      DELETE FROM public.referrals;
      DELETE FROM public.user_loyalty_points;
      DELETE FROM public.user_achievements;
      DELETE FROM public.user_missions;
      DELETE FROM public.content_analytics;
      DELETE FROM public.user_interactions;
      DELETE FROM public.user_content_visibility;
      DELETE FROM public.user_content_access;
      DELETE FROM public.withdrawal_requests;
      DELETE FROM public.chat_sessions;
      DELETE FROM public.admin_chat_queue;
      DELETE FROM public.scheduled_notifications;
      DELETE FROM public.content_schedules;
      DELETE FROM public.plan_expiration_queue;
      
      IF keep_admin_var THEN
        DELETE FROM public.profiles p WHERE p.user_id != admin_user_id;
        DELETE FROM auth.users u WHERE u.id != admin_user_id;
      ELSE
        DELETE FROM public.profiles;
        DELETE FROM auth.users;
      END IF;
      
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    ELSE
      RAISE EXCEPTION 'Tipo de limpeza não suportado: %', cleanup_type_var;
  END CASE;
  
  -- Atualizar log com resultados
  UPDATE public.system_cleanup_logs 
  SET records_deleted = total_deleted
  WHERE executed_by = auth.uid() 
    AND scl.cleanup_type = cleanup_type_var
    AND scl.created_at = (
      SELECT MAX(scl2.created_at) 
      FROM public.system_cleanup_logs scl2
      WHERE scl2.executed_by = auth.uid()
    );
  
  cleanup_result := json_build_object(
    'success', true,
    'records_deleted', total_deleted,
    'cleanup_type', cleanup_type_var
  );
  
  RETURN cleanup_result;
END;
$function$
