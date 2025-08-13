-- Garantir que user_roles tenha realtime habilitado apenas se ainda não tiver
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_roles;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL; -- Tabela já está na publicação, ignore
    END;
END $$;

ALTER TABLE user_roles REPLICA IDENTITY FULL;

-- Corrigir política RLS para garantir que todos os admins tenham acesso total
DROP POLICY IF EXISTS "Only direct admin function can manage roles" ON user_roles;

CREATE POLICY "Admins can manage all roles" 
ON user_roles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);

-- Garantir que admins possam deletar usuários completamente
CREATE POLICY "Admins can delete profiles" 
ON profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);

-- Criar função atualizada para verificar role de admin com melhor performance
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid 
    AND role = 'admin'::app_role
  );
END;
$function$;

-- Atualizar função get_current_user_role para ter search_path seguro
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  user_role text;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN 'user';
  END IF;
  
  -- Consulta direta sem políticas RLS ativas (SECURITY DEFINER)
  SELECT role::text INTO user_role 
  FROM user_roles 
  WHERE user_id = current_user_id 
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'user');
END;
$function$;

-- Garantir que a função admin_delete_user_completely funcione para todos os admins
CREATE OR REPLACE FUNCTION public.admin_delete_user_completely(target_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Verificar se é admin usando a nova função
  IF NOT is_user_admin() THEN
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
$function$;