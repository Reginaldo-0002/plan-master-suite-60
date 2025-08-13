-- Corrigir função admin_unblock_user para usar user_roles corretamente
CREATE OR REPLACE FUNCTION public.admin_unblock_user(block_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  target_user_id uuid;
  affected_rows integer;
BEGIN
  -- Verificar se é admin usando user_roles
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
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

  -- Desativar bloqueio específico
  UPDATE user_security_blocks
  SET is_active = false
  WHERE id = block_id;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  -- Desativar todos os outros bloqueios ativos do mesmo usuário
  UPDATE user_security_blocks
  SET is_active = false
  WHERE user_id = target_user_id 
    AND is_active = true 
    AND id != block_id;

  -- Log da ação
  RAISE NOTICE 'Admin % desbloqueou usuário % (bloqueio %)', auth.uid(), target_user_id, block_id;

  result := json_build_object(
    'success', true,
    'message', 'Usuário desbloqueado com sucesso',
    'user_id', target_user_id,
    'affected_rows', affected_rows
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao desbloquear usuário: %', SQLERRM;
END;
$$;