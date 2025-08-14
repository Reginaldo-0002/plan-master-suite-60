-- Primeiro tentar adicionar a constraint única se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_trigger_text' 
        AND conrelid = 'chatbot_rich_responses'::regclass
    ) THEN
        ALTER TABLE chatbot_rich_responses ADD CONSTRAINT unique_trigger_text UNIQUE (trigger_text);
    END IF;
END $$;

-- Agora inserir apenas as respostas que não existem
INSERT INTO chatbot_rich_responses (trigger_text, response_type, title, message, rich_content, priority, is_active) 
SELECT * FROM (VALUES
    ('como funciona', 'text', '❓ Como Funciona', 
     'Nossa plataforma funciona de forma simples:

1️⃣ **Cadastre-se gratuitamente**
2️⃣ **Escolha seu plano ideal**  
3️⃣ **Acesse ferramentas exclusivas**
4️⃣ **Receba suporte personalizado**

Você pode começar com o plano gratuito e fazer upgrade a qualquer momento! 🚀', 
     '{}', 80, true),
    
    ('problema_tecnico', 'card', '💻 Problemas Técnicos', 'Vamos resolver seu problema:',
     '{"cards": [
       {
         "title": "Não consigo fazer login",
         "description": "Problema de acesso à conta",
         "button": {"text": "Resetar Senha", "url": "/reset-password"}
       },
       {
         "title": "Site não carrega",
         "description": "Problemas de conectividade", 
         "button": {"text": "Teste de Conexão", "value": "teste_conexao"}
       }
     ]}', 25, true)
) AS t(trigger_text, response_type, title, message, rich_content, priority, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM chatbot_rich_responses c 
    WHERE c.trigger_text = t.trigger_text
);