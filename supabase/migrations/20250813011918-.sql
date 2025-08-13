-- Criar tabela para controle de visibilidade do chat por usuário
CREATE TABLE public.user_chat_visibility (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  hidden_by uuid,
  hidden_at timestamp with time zone DEFAULT now(),
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_chat_visibility ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage chat visibility"
ON public.user_chat_visibility
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Users can view their own chat visibility"
ON public.user_chat_visibility
FOR SELECT
USING (user_id = auth.uid());

-- Função para ocultar/mostrar chat para usuário específico
CREATE OR REPLACE FUNCTION public.admin_toggle_user_chat_visibility(
  target_user_id uuid,
  hide_chat boolean,
  hide_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
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
  INSERT INTO public.user_chat_visibility (user_id, is_hidden, hidden_by, reason, updated_at)
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

-- Criar índice único para user_id
CREATE UNIQUE INDEX idx_user_chat_visibility_user_id ON public.user_chat_visibility(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_chat_visibility_updated_at
  BEFORE UPDATE ON public.user_chat_visibility
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();