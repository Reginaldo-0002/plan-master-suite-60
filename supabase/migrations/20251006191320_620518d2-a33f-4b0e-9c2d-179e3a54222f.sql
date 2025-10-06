-- Fix admin_clear_area_tracking_history function to include WHERE clause
DROP FUNCTION IF EXISTS public.admin_clear_area_tracking_history();

CREATE OR REPLACE FUNCTION public.admin_clear_area_tracking_history()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem limpar o histórico';
  END IF;

  -- Limpar todo o histórico de áreas acessadas (com WHERE clause)
  DELETE FROM user_area_tracking WHERE true;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Resetar contador de áreas acessadas em todos os perfis
  UPDATE profiles 
  SET areas_accessed = 0, updated_at = NOW()
  WHERE true;

  -- Log da ação
  INSERT INTO audit_logs (actor_id, action, area, metadata)
  VALUES (
    auth.uid(),
    'AREA_TRACKING_HISTORY_CLEARED',
    'ADMIN',
    jsonb_build_object(
      'records_deleted', deleted_count,
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Histórico de áreas acessadas limpo com sucesso',
    'records_deleted', deleted_count,
    'timestamp', NOW()
  );
END;
$$;