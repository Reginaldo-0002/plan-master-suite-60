-- Verificar e criar triggers para notificações automáticas aos admins

-- Trigger para nova mensagem de chat (apenas se não existe)
CREATE OR REPLACE FUNCTION public.notify_admins_new_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_name text;
  is_admin_sender boolean := false;
BEGIN
  -- Check if sender is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.sender_id AND role = 'admin'::public.app_role
  ) INTO is_admin_sender;
  
  -- Only notify if sender is not admin
  IF NOT is_admin_sender THEN
    -- Get user name
    SELECT COALESCE(full_name, 'Usuário') INTO user_name
    FROM public.profiles 
    WHERE user_id = NEW.sender_id;
    
    -- Notify admins
    PERFORM public.notify_admins(
      'Nova Mensagem no Chat',
      'O usuário ' || user_name || ' enviou uma nova mensagem no chat de suporte.',
      'info'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para novo usuário cadastrado
CREATE OR REPLACE FUNCTION public.notify_admins_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Notify admins about new user
  PERFORM public.notify_admins(
    'Novo Membro Cadastrado',
    'Um novo membro se cadastrou na plataforma: ' || COALESCE(NEW.full_name, 'Nome não informado'),
    'success'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para usuário bloqueado
CREATE OR REPLACE FUNCTION public.notify_admins_user_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_name text;
BEGIN
  -- Get user name
  SELECT COALESCE(full_name, 'Usuário') INTO user_name
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  -- Notify admins
  PERFORM public.notify_admins(
    'Usuário Bloqueado',
    'O usuário ' || user_name || ' foi bloqueado por: ' || NEW.block_reason,
    'error'
  );
  
  RETURN NEW;
END;
$$;

-- Criar triggers se não existem
DROP TRIGGER IF EXISTS trigger_notify_admins_chat_message ON public.support_messages;
CREATE TRIGGER trigger_notify_admins_chat_message
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_chat_message();

DROP TRIGGER IF EXISTS trigger_notify_admins_new_user ON public.profiles;
CREATE TRIGGER trigger_notify_admins_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_user();

DROP TRIGGER IF EXISTS trigger_notify_admins_user_blocked ON public.user_security_blocks;
CREATE TRIGGER trigger_notify_admins_user_blocked
  AFTER INSERT ON public.user_security_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_user_blocked();