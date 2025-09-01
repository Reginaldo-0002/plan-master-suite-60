-- Admin RPCs for soft deletion to bypass RLS safely
CREATE OR REPLACE FUNCTION public.admin_soft_delete_topic_resource(resource_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected int := 0;
BEGIN
  -- Ensure only admins or moderators can execute
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin'::public.app_role, 'moderator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ou moderadores';
  END IF;

  UPDATE public.topic_resources
  SET is_active = false, updated_at = now()
  WHERE id = resource_uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;

  RETURN json_build_object('success', affected > 0, 'affected', affected);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_soft_delete_topic_resource(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_soft_delete_content_topic(topic_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_topics int := 0;
  affected_resources int := 0;
BEGIN
  -- Ensure only admins or moderators can execute
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin'::public.app_role, 'moderator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ou moderadores';
  END IF;

  -- Soft delete all resources under the topic
  UPDATE public.topic_resources
  SET is_active = false, updated_at = now()
  WHERE topic_id = topic_uuid;
  GET DIAGNOSTICS affected_resources = ROW_COUNT;

  -- Soft delete the topic
  UPDATE public.content_topics
  SET is_active = false, updated_at = now()
  WHERE id = topic_uuid;
  GET DIAGNOSTICS affected_topics = ROW_COUNT;

  RETURN json_build_object(
    'success', affected_topics > 0,
    'topics_affected', affected_topics,
    'resources_affected', affected_resources
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_soft_delete_content_topic(uuid) TO authenticated;