-- Criar um novo bloqueio de 1 hora para teste
INSERT INTO user_chat_restrictions (user_id, blocked_until, reason, created_by)
VALUES ('2ff46b80-307b-4e34-b523-127f6dafaa07', NOW() + INTERVAL '1 hour', 'Teste de bloqueio - 1 hora', 'f1c49adc-db5e-44d3-861a-59f9192a9068');