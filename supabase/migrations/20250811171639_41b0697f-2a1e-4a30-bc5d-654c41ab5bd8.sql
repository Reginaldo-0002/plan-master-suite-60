
-- Corrigir a função system_cleanup que está causando erro "DELETE requires a WHERE clause"
CREATE OR REPLACE FUNCTION public.system_cleanup(cleanup_type text, target_tables text[] DEFAULT NULL::text[], keep_admin boolean DEFAULT true)
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
  
  -- Log da operação
  INSERT INTO public.system_cleanup_logs (cleanup_type, affected_tables, executed_by)
  VALUES (cleanup_type, target_tables, auth.uid());
  
  -- Executar limpeza baseada no tipo
  CASE cleanup_type
    WHEN 'users' THEN
      IF keep_admin THEN
        DELETE FROM public.profiles WHERE user_id != admin_user_id;
        DELETE FROM auth.users WHERE id != admin_user_id;
      ELSE
        DELETE FROM public.profiles WHERE TRUE;
        DELETE FROM auth.users WHERE TRUE;
      END IF;
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
      
    WHEN 'content' THEN
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
      
      IF keep_admin THEN
        DELETE FROM public.profiles WHERE user_id != admin_user_id;
        DELETE FROM auth.users WHERE id != admin_user_id;
      ELSE
        DELETE FROM public.profiles WHERE TRUE;
        DELETE FROM auth.users WHERE TRUE;
      END IF;
      
      GET DIAGNOSTICS total_deleted = ROW_COUNT;
  END CASE;
  
  -- Atualizar log com resultados
  UPDATE public.system_cleanup_logs 
  SET records_deleted = total_deleted
  WHERE executed_by = auth.uid() 
    AND cleanup_type = system_cleanup.cleanup_type
    AND created_at = (
      SELECT MAX(created_at) FROM public.system_cleanup_logs 
      WHERE executed_by = auth.uid()
    );
  
  cleanup_result := json_build_object(
    'success', true,
    'records_deleted', total_deleted,
    'cleanup_type', cleanup_type
  );
  
  RETURN cleanup_result;
END;
$function$
