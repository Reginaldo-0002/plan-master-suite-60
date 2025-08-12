-- Inserir um bloqueio de teste para a usuária Maiara por 2 horas
INSERT INTO user_chat_restrictions (
  user_id, 
  blocked_until, 
  reason, 
  created_by
) VALUES (
  '2ff46b80-307b-4e34-b523-127f6dafaa07',
  NOW() + INTERVAL '2 hours',
  'Teste de bloqueio - violação de regras do chat',
  (SELECT auth.uid())
);