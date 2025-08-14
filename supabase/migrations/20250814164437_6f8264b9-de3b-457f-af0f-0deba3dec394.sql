-- Inserir resposta padrão para "olá" no chatbot
INSERT INTO chatbot_rich_responses (
  trigger_text,
  response_type,
  title,
  message,
  rich_content,
  priority,
  is_active
) VALUES (
  'ola',
  'buttons',
  'Olá! Como posso ajudá-lo?',
  'Escolha uma das opções abaixo:',
  '{
    "buttons": [
      {
        "text": "🎯 Planos Disponíveis",
        "value": "planos"
      },
      {
        "text": "❓ Como Funciona",
        "value": "como funciona"
      },
      {
        "text": "💬 Falar com Suporte",
        "value": "suporte"
      },
      {
        "text": "📞 Contato",
        "value": "contato"
      }
    ]
  }',
  100,
  true
);