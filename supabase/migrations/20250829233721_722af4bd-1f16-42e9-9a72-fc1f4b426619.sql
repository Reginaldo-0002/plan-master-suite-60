-- Atualizar função de exclusão para garantir que o usuário seja removido do auth.users também
-- Isso garante que usuários excluídos precisem criar uma nova conta

DROP FUNCTION IF EXISTS public.admin_delete_user_completely(uuid);

CREATE OR REPLACE FUNCTION public.admin_delete_user_completely(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  user_email text;
BEGIN
  -- Verificar se é admin usando função existente
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários';
  END IF;

  -- Verificar se o usuário existe e pegar o email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = target_user_id;

  IF user_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Impedir exclusão do próprio admin
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta';
  END IF;

  -- Primeiro, limpar todas as tabelas relacionadas no schema público
  
  -- Mensagens de suporte (depende de support_tickets)
  IF to_regclass('public.support_messages') IS NOT NULL THEN
    IF to_regclass('public.support_tickets') IS NOT NULL THEN
      EXECUTE 'DELETE FROM public.support_messages WHERE ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = $1)'
      USING target_user_id;
    END IF;
    EXECUTE 'DELETE FROM public.support_messages WHERE sender_id = $1' USING target_user_id;
  END IF;

  -- Tickets de suporte
  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.support_tickets WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Sessões de chat
  IF to_regclass('public.chat_sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.chat_sessions WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Restrições de chat
  IF to_regclass('public.user_chat_restrictions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_chat_restrictions WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Interações do usuário
  IF to_regclass('public.user_interactions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_interactions WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Logs de atividade
  IF to_regclass('public.user_activity_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_activity_logs WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Conquistas
  IF to_regclass('public.user_achievements') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_achievements WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Missões
  IF to_regclass('public.user_missions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_missions WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Pontos de fidelidade
  IF to_regclass('public.user_loyalty_points') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_loyalty_points WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Acesso a conteúdo
  IF to_regclass('public.user_content_access') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_content_access WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Visibilidade de conteúdo específica do usuário
  IF to_regclass('public.user_content_visibility') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_content_visibility WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Visibilidade de conteúdo por regras
  IF to_regclass('public.content_visibility_rules') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.content_visibility_rules WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Visibilidade de chat
  IF to_regclass('public.user_chat_visibility') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_chat_visibility WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Bloqueios de segurança
  IF to_regclass('public.user_security_blocks') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_security_blocks WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Solicitações de saque
  IF to_regclass('public.withdrawal_requests') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.withdrawal_requests WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Referrals: primeiro como referido, depois como referenciador
  IF to_regclass('public.referrals') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.referrals WHERE referred_id = $1' USING target_user_id;
    EXECUTE 'DELETE FROM public.referrals WHERE referrer_id = $1' USING target_user_id;
  END IF;

  -- Analytics de conteúdo
  IF to_regclass('public.content_analytics') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.content_analytics WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Fila de expiração de plano
  IF to_regclass('public.plan_expiration_queue') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.plan_expiration_queue WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Fila de chat admin
  IF to_regclass('public.admin_chat_queue') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.admin_chat_queue WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Notificações para admins
  IF to_regclass('public.admin_notification_views') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.admin_notification_views WHERE admin_id = $1' USING target_user_id;
  END IF;

  -- Sessões de usuário
  IF to_regclass('public.user_sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_sessions WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Rastreamento de áreas
  IF to_regclass('public.user_area_tracking') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_area_tracking WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Tempo de uso diário
  IF to_regclass('public.user_time_sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_time_sessions WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Analytics do chatbot
  IF to_regclass('public.chatbot_analytics') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.chatbot_analytics WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Aceite de termos
  IF to_regclass('public.terms_acceptance') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.terms_acceptance WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Assinaturas
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.subscriptions WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Roles do usuário
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_roles WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Por fim, o perfil do usuário
  DELETE FROM public.profiles WHERE user_id = target_user_id;

  -- CRÍTICO: Remover o usuário da tabela auth.users para garantir que precise criar nova conta
  DELETE FROM auth.users WHERE id = target_user_id;

  -- Log da ação
  INSERT INTO audit_logs (actor_id, action, area, target_id, metadata)
  VALUES (
    auth.uid(),
    'USER_COMPLETELY_DELETED',
    'ADMIN',
    target_user_id,
    jsonb_build_object(
      'deleted_user_email', user_email,
      'deletion_timestamp', NOW()
    )
  );

  result := json_build_object(
    'success', true,
    'message', 'Usuário excluído completamente do sistema - precisará criar nova conta para acessar',
    'user_id', target_user_id,
    'user_email', user_email
  );
  RETURN result;
END;
$function$;