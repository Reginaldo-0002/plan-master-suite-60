-- Criar tabela para tracking de notificações visualizadas pelos admins
CREATE TABLE IF NOT EXISTS public.admin_notification_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  notification_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_id, notification_id)
);

-- Enable RLS
ALTER TABLE public.admin_notification_views ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para admin_notification_views
CREATE POLICY "Admins can manage their notification views"
ON public.admin_notification_views
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) AND admin_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) AND admin_id = auth.uid()
);

-- Adicionar metadata às notificações para incluir informações do usuário e chat
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_metadata JSONB DEFAULT '{}';

-- Atualizar a função de notificação de nova mensagem para incluir metadata
CREATE OR REPLACE FUNCTION public.notify_admins_new_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_name text;
  is_admin_sender boolean := false;
  ticket_id_var uuid;
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
    
    -- Get ticket_id from the message
    ticket_id_var := NEW.ticket_id;
    
    -- Notify admins with metadata including user_id and ticket_id
    INSERT INTO public.notifications (
      title,
      message,
      type,
      target_plans,
      is_active,
      is_popup,
      popup_duration,
      notification_metadata
    ) VALUES (
      'Nova Mensagem no Chat',
      'O usuário ' || user_name || ' enviou uma nova mensagem no chat de suporte.',
      'info',
      ARRAY['admin'],
      true,
      true,
      0, -- Não remover automaticamente por tempo
      jsonb_build_object(
        'user_id', NEW.sender_id,
        'user_name', user_name,
        'ticket_id', ticket_id_var,
        'action_type', 'chat_message'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;