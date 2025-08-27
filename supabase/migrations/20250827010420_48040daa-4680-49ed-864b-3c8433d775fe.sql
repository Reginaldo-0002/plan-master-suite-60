-- Create admin_delete_chatbot_response function to safely delete responses and related analytics
CREATE OR REPLACE FUNCTION public.admin_delete_chatbot_response(response_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_analytics integer := 0;
  deleted_responses integer := 0;
BEGIN
  -- Ensure only admins can execute
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir respostas do chatbot';
  END IF;

  -- Delete analytics referencing the response
  IF response_uuid IS NOT NULL THEN
    DELETE FROM public.chatbot_analytics WHERE response_id = response_uuid;
    GET DIAGNOSTICS deleted_analytics = ROW_COUNT;
  END IF;

  -- Delete the response itself
  DELETE FROM public.chatbot_rich_responses WHERE id = response_uuid;
  GET DIAGNOSTICS deleted_responses = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted_analytics', deleted_analytics,
    'deleted_responses', deleted_responses
  );
END;
$$;