-- Função para apagar mensagens de chat completamente
CREATE OR REPLACE FUNCTION admin_clear_chat_messages(ticket_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem apagar mensagens';
  END IF;

  -- Apagar todas as mensagens do ticket
  DELETE FROM support_messages 
  WHERE ticket_id = ticket_id_param;
END;
$$;

-- Função para apagar usuário completamente do sistema
CREATE OR REPLACE FUNCTION admin_delete_user_completely(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários';
  END IF;

  -- Verificar se o usuário existe
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = target_user_id
  ) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Impedir que admin exclua a si mesmo
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta';
  END IF;

  -- Excluir dados do usuário em ordem (dependências primeiro)
  
  -- Mensagens de suporte
  DELETE FROM support_messages WHERE sender_id = target_user_id;
  
  -- Tickets de suporte
  DELETE FROM support_tickets WHERE user_id = target_user_id;
  
  -- Sessões de chat
  DELETE FROM chat_sessions WHERE user_id = target_user_id;
  
  -- Restrições de chat
  DELETE FROM user_chat_restrictions WHERE user_id = target_user_id;
  
  -- Interações do usuário
  DELETE FROM user_interactions WHERE user_id = target_user_id;
  
  -- Logs de atividade
  DELETE FROM user_activity_logs WHERE user_id = target_user_id;
  
  -- Conquistas
  DELETE FROM user_achievements WHERE user_id = target_user_id;
  
  -- Missões
  DELETE FROM user_missions WHERE user_id = target_user_id;
  
  -- Pontos de fidelidade
  DELETE FROM user_loyalty_points WHERE user_id = target_user_id;
  
  -- Acesso a conteúdo
  DELETE FROM user_content_access WHERE user_id = target_user_id;
  
  -- Visibilidade de conteúdo
  DELETE FROM user_content_visibility WHERE user_id = target_user_id;
  
  -- Solicitações de saque
  DELETE FROM withdrawal_requests WHERE user_id = target_user_id;
  
  -- Referências (como referenciado)
  DELETE FROM referrals WHERE referred_id = target_user_id;
  
  -- Referências (como referenciador) - atualizar os referenciados
  UPDATE profiles SET referral_earnings = 0 WHERE user_id IN (
    SELECT referred_id FROM referrals WHERE referrer_id = target_user_id
  );
  DELETE FROM referrals WHERE referrer_id = target_user_id;
  
  -- Analytics de conteúdo
  DELETE FROM content_analytics WHERE user_id = target_user_id;
  
  -- Filas de expiração de plano
  DELETE FROM plan_expiration_queue WHERE user_id = target_user_id;
  
  -- Fila de chat admin
  DELETE FROM admin_chat_queue WHERE user_id = target_user_id;
  
  -- Roles do usuário
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  -- Profile do usuário
  DELETE FROM profiles WHERE user_id = target_user_id;
  
  result := json_build_object(
    'success', true,
    'message', 'Usuário excluído completamente do sistema',
    'user_id', target_user_id
  );
  
  RETURN result;
END;
$$;