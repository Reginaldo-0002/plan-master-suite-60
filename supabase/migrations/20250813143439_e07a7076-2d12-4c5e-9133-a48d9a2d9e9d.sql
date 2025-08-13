-- Corrigir todas as funções administrativas para usar user_roles

-- Função admin_clear_chat_messages
CREATE OR REPLACE FUNCTION public.admin_clear_chat_messages(ticket_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se é admin usando user_roles
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem apagar mensagens';
  END IF;

  -- Apagar todas as mensagens do ticket
  DELETE FROM support_messages 
  WHERE ticket_id = ticket_id_param;
END;
$function$;

-- Corrigir todas as outras políticas problemáticas
-- Tabela referral_settings
DROP POLICY IF EXISTS "Admins can manage referral settings" ON referral_settings;
CREATE POLICY "Admins can manage referral settings" 
ON referral_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela notifications
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;
CREATE POLICY "Admins can manage all notifications" 
ON notifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela scheduled_notifications
DROP POLICY IF EXISTS "Admins can manage scheduled notifications" ON scheduled_notifications;
CREATE POLICY "Admins can manage scheduled notifications" 
ON scheduled_notifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela content_schedules
DROP POLICY IF EXISTS "Admins can manage content schedules" ON content_schedules;
CREATE POLICY "Admins can manage content schedules" 
ON content_schedules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela content_visibility_rules
DROP POLICY IF EXISTS "Admins can manage visibility rules" ON content_visibility_rules;
CREATE POLICY "Admins can manage visibility rules" 
ON content_visibility_rules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela automation_workflows
DROP POLICY IF EXISTS "Admins can manage workflows" ON automation_workflows;
CREATE POLICY "Admins can manage workflows" 
ON automation_workflows 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela auto_status_schedules
DROP POLICY IF EXISTS "Admins can manage auto status schedules" ON auto_status_schedules;
CREATE POLICY "Admins can manage auto status schedules" 
ON auto_status_schedules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela tool_status
DROP POLICY IF EXISTS "Admins can manage tool status" ON tool_status;
CREATE POLICY "Admins can manage tool status" 
ON tool_status 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela upcoming_releases
DROP POLICY IF EXISTS "Admins can manage upcoming releases" ON upcoming_releases;
CREATE POLICY "Admins can manage upcoming releases" 
ON upcoming_releases 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela plan_expiration_queue
DROP POLICY IF EXISTS "Admins can manage expiration queue" ON plan_expiration_queue;
CREATE POLICY "Admins can manage expiration queue" 
ON plan_expiration_queue 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela security_settings
DROP POLICY IF EXISTS "Admins can manage security settings" ON security_settings;
CREATE POLICY "Admins can manage security settings" 
ON security_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela user_security_blocks
DROP POLICY IF EXISTS "Admins can manage security blocks" ON user_security_blocks;
CREATE POLICY "Admins can manage security blocks" 
ON user_security_blocks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela user_content_access
DROP POLICY IF EXISTS "Admins can manage user content access" ON user_content_access;
CREATE POLICY "Admins can manage user content access" 
ON user_content_access 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Tabela media_library
DROP POLICY IF EXISTS "Admins can manage media library" ON media_library;
CREATE POLICY "Admins can manage media library" 
ON media_library 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);