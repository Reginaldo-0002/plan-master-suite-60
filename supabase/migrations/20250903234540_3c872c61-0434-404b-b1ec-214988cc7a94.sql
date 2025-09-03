-- Criar uma notificação de teste visível para todos os usuários
INSERT INTO notifications (
  title,
  message,
  type,
  is_active,
  is_popup,
  popup_duration,
  target_plans
) VALUES (
  'Sistema de Notificações Ativo',
  'O sistema de notificações em tempo real está funcionando perfeitamente! Esta notificação aparece para todos os usuários.',
  'info',
  true,
  true,
  10000,
  NULL
);

-- Criar uma notificação específica para usuários do plano free
INSERT INTO notifications (
  title,
  message,
  type,
  is_active,
  is_popup,
  popup_duration,
  target_plans
) VALUES (
  'Bem-vindos usuários FREE',
  'Esta notificação é específica para usuários do plano gratuito. Faça upgrade para ter acesso a mais recursos!',
  'success',
  true,
  true,
  15000,
  ARRAY['free']
);

-- Criar uma notificação para usuários VIP
INSERT INTO notifications (
  title,
  message,
  type,
  is_active,
  is_popup,
  popup_duration,
  target_plans
) VALUES (
  'Usuários VIP - Novos Recursos',
  'Novos recursos exclusivos foram adicionados para usuários VIP! Confira em sua dashboard.',
  'warning',
  true,
  true,
  12000,
  ARRAY['vip']
);