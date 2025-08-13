-- Teste do sistema de notificação em tempo real
-- Criar uma notificação de teste para verificar o pop-up
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
  'Teste de Notificação Pop-up', 
  'Esta é uma notificação de teste para verificar se o sistema de pop-up está funcionando corretamente', 
  'info', 
  ARRAY['f1c49adc-db5e-44d3-861a-59f9192a9068'], 
  true, 
  true, 
  8000, 
  ARRAY['admin']
);

-- Verificar se os triggers estão funcionando
-- Criar uma função para testar notificações automáticas
CREATE OR REPLACE FUNCTION public.test_admin_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simular nova mensagem de chat
  PERFORM notify_admins(
    'Teste - Nova Mensagem no Chat',
    'Teste do sistema de notificação automática para nova mensagem',
    'info'
  );
  
  -- Simular novo usuário cadastrado
  PERFORM notify_admins(
    'Teste - Novo Membro Cadastrado',
    'Teste do sistema de notificação automática para novo usuário',
    'success'
  );
  
  -- Simular usuário bloqueado
  PERFORM notify_admins(
    'Teste - Usuário Bloqueado',
    'Teste do sistema de notificação automática para usuário bloqueado',
    'error'
  );
END;
$$;