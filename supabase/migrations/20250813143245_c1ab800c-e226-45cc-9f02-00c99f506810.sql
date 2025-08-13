-- Corrigir todas as políticas que ainda usam profiles.role em vez de user_roles

-- Tabela admin_settings
DROP POLICY IF EXISTS "Only admins can manage settings" ON admin_settings;
CREATE POLICY "Admins can manage settings" 
ON admin_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela admin_chat_queue
DROP POLICY IF EXISTS "Admins can manage chat queue" ON admin_chat_queue;
CREATE POLICY "Admins can manage chat queue" 
ON admin_chat_queue 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin'::app_role, 'moderator'::app_role)
  )
);

-- Tabela user_chat_restrictions
DROP POLICY IF EXISTS "Admins can manage chat restrictions" ON user_chat_restrictions;
CREATE POLICY "Admins can manage chat restrictions" 
ON user_chat_restrictions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela user_chat_visibility
DROP POLICY IF EXISTS "Admins can manage chat visibility" ON user_chat_visibility;
CREATE POLICY "Admins can manage chat visibility" 
ON user_chat_visibility 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Corrigir todas as outras tabelas que possam ter referências incorretas
-- Tabela support_tickets
DROP POLICY IF EXISTS "Admins can manage all tickets" ON support_tickets;
CREATE POLICY "Admins can manage all tickets" 
ON support_tickets 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin'::app_role, 'moderator'::app_role)
  )
);

-- Tabela support_messages  
DROP POLICY IF EXISTS "Users can send messages to their tickets" ON support_messages;
DROP POLICY IF EXISTS "Users can view messages from their tickets" ON support_messages;

CREATE POLICY "Users can send messages to their tickets" 
ON support_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets st
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE st.id = support_messages.ticket_id 
    AND (
      st.user_id = p.user_id 
      OR EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = p.user_id 
        AND ur.role IN ('admin'::app_role, 'moderator'::app_role)
      )
    )
    AND p.user_id = support_messages.sender_id
  )
);

CREATE POLICY "Users can view messages from their tickets" 
ON support_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM support_tickets st
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE st.id = support_messages.ticket_id 
    AND (
      st.user_id = p.user_id 
      OR EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = p.user_id 
        AND ur.role IN ('admin'::app_role, 'moderator'::app_role)
      )
    )
  )
);

-- Atualizar funções admin para usar user_roles corretamente
CREATE OR REPLACE FUNCTION public.admin_toggle_user_chat_visibility(target_user_id uuid, hide_chat boolean, hide_reason text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Verificar se é admin usando user_roles
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar visibilidade do chat';
  END IF;

  -- Verificar se o usuário existe
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = target_user_id
  ) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Inserir ou atualizar visibilidade
  INSERT INTO user_chat_visibility (user_id, is_hidden, hidden_by, reason, updated_at)
  VALUES (target_user_id, hide_chat, auth.uid(), hide_reason, now())
  ON CONFLICT (user_id) DO UPDATE SET
    is_hidden = hide_chat,
    hidden_by = auth.uid(),
    reason = hide_reason,
    hidden_at = CASE WHEN hide_chat THEN now() ELSE user_chat_visibility.hidden_at END,
    updated_at = now();

  result := json_build_object(
    'success', true,
    'message', CASE 
      WHEN hide_chat THEN 'Chat ocultado para o usuário'
      ELSE 'Chat liberado para o usuário'
    END,
    'user_id', target_user_id,
    'is_hidden', hide_chat
  );
  
  RETURN result;
END;
$function$;