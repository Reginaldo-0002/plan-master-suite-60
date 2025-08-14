-- Create function to delete all tickets and related messages
CREATE OR REPLACE FUNCTION public.admin_delete_all_tickets()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_messages_count INTEGER;
  deleted_tickets_count INTEGER;
  result json;
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir todos os tickets';
  END IF;

  -- Primeiro, excluir todas as mensagens de suporte
  DELETE FROM support_messages;
  GET DIAGNOSTICS deleted_messages_count = ROW_COUNT;
  
  -- Depois, excluir todos os tickets
  DELETE FROM support_tickets;
  GET DIAGNOSTICS deleted_tickets_count = ROW_COUNT;
  
  -- Log da ação
  INSERT INTO audit_logs (
    action,
    area,
    actor_id,
    metadata
  ) VALUES (
    'delete_all_tickets',
    'support',
    auth.uid(),
    jsonb_build_object(
      'deleted_tickets', deleted_tickets_count,
      'deleted_messages', deleted_messages_count,
      'timestamp', now()
    )
  );
  
  result := json_build_object(
    'success', true,
    'message', 'Todos os tickets foram excluídos com sucesso',
    'deleted_tickets', deleted_tickets_count,
    'deleted_messages', deleted_messages_count
  );
  
  RETURN result;
END;
$$;