-- Atualizar os valores dos planos no chatbot para usar valores corretos do banco de dados
UPDATE chatbot_rich_responses 
SET rich_content = jsonb_set(
  jsonb_set(
    rich_content,
    '{cards,0,price}',
    '"R$ 49,90/mês"'
  ),
  '{cards,1,price}',
  '"R$ 97,90/mês"'
)
WHERE trigger_text = 'planos' AND response_type = 'card';