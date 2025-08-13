-- Create notification system for admins on important events
CREATE OR REPLACE FUNCTION public.notify_admins(
  notification_title text,
  notification_message text,
  notification_type text DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_user_ids text[];
BEGIN
  -- Get all admin user IDs
  SELECT array_agg(user_id::text) INTO admin_user_ids
  FROM user_roles 
  WHERE role = 'admin'::app_role;
  
  -- Only proceed if we have admins
  IF admin_user_ids IS NOT NULL AND array_length(admin_user_ids, 1) > 0 THEN
    -- Insert notification for admins
    INSERT INTO notifications (
      title,
      message,
      type,
      target_users,
      is_active,
      is_popup,
      popup_duration,
      target_plans
    ) VALUES (
      notification_title,
      notification_message,
      notification_type,
      admin_user_ids,
      true,
      true,
      5000,  -- 5 seconds
      ARRAY['admin']
    );
  END IF;
END;
$$;

-- Function to trigger admin notifications on chat messages
CREATE OR REPLACE FUNCTION public.notify_admins_new_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name text;
  is_admin_sender boolean := false;
BEGIN
  -- Check if sender is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.sender_id AND role = 'admin'::app_role
  ) INTO is_admin_sender;
  
  -- Only notify if sender is not admin
  IF NOT is_admin_sender THEN
    -- Get user name
    SELECT COALESCE(full_name, 'Usuário') INTO user_name
    FROM profiles 
    WHERE user_id = NEW.sender_id;
    
    -- Notify admins
    PERFORM notify_admins(
      'Nova Mensagem no Chat',
      'O usuário ' || user_name || ' enviou uma nova mensagem no chat de suporte.',
      'info'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to trigger admin notifications on new support tickets
CREATE OR REPLACE FUNCTION public.notify_admins_new_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name text;
BEGIN
  -- Get user name
  SELECT COALESCE(full_name, 'Usuário') INTO user_name
  FROM profiles 
  WHERE user_id = NEW.user_id;
  
  -- Notify admins
  PERFORM notify_admins(
    'Novo Ticket de Suporte',
    'O usuário ' || user_name || ' abriu um novo ticket de suporte: ' || NEW.subject,
    'warning'
  );
  
  RETURN NEW;
END;
$$;

-- Function to trigger admin notifications on new user registration
CREATE OR REPLACE FUNCTION public.notify_admins_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Notify admins about new user
  PERFORM notify_admins(
    'Novo Membro Cadastrado',
    'Um novo membro se cadastrou na plataforma: ' || COALESCE(NEW.full_name, 'Nome não informado'),
    'success'
  );
  
  RETURN NEW;
END;
$$;

-- Function to trigger admin notifications on user blocks
CREATE OR REPLACE FUNCTION public.notify_admins_user_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name text;
BEGIN
  -- Get user name
  SELECT COALESCE(full_name, 'Usuário') INTO user_name
  FROM profiles 
  WHERE user_id = NEW.user_id;
  
  -- Notify admins
  PERFORM notify_admins(
    'Usuário Bloqueado',
    'O usuário ' || user_name || ' foi bloqueado por: ' || NEW.block_reason,
    'error'
  );
  
  RETURN NEW;
END;
$$;

-- Create triggers for admin notifications
DROP TRIGGER IF EXISTS trigger_notify_admins_chat_message ON support_messages;
CREATE TRIGGER trigger_notify_admins_chat_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  WHEN (NEW.is_bot = false AND NEW.is_internal = false)
  EXECUTE FUNCTION notify_admins_new_chat_message();

DROP TRIGGER IF EXISTS trigger_notify_admins_support_ticket ON support_tickets;
CREATE TRIGGER trigger_notify_admins_support_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_support_ticket();

DROP TRIGGER IF EXISTS trigger_notify_admins_new_user ON profiles;
CREATE TRIGGER trigger_notify_admins_new_user
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_user();

DROP TRIGGER IF EXISTS trigger_notify_admins_user_blocked ON user_security_blocks;
CREATE TRIGGER trigger_notify_admins_user_blocked
  AFTER INSERT ON user_security_blocks
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_user_blocked();