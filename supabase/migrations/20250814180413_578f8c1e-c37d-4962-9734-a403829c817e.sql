-- Inserir as respostas que faltam para completar 22
INSERT INTO chatbot_rich_responses (trigger_text, response_type, title, message, rich_content, priority, is_active) VALUES
('como funciona', 'text', '❓ Como Funciona', 
 'Nossa plataforma funciona de forma simples:

1️⃣ **Cadastre-se gratuitamente**
2️⃣ **Escolha seu plano ideal**  
3️⃣ **Acesse ferramentas exclusivas**
4️⃣ **Receba suporte personalizado**

Você pode começar com o plano gratuito e fazer upgrade a qualquer momento! 🚀', 
 '{}', 85, true),

('precos', 'text', '💰 Preços', 
 'Nossos preços são simples e transparentes:

🆓 **Gratuito:** R$ 0 - Funcionalidades básicas
⭐ **VIP:** R$ 97/mês - Recursos avançados  
🚀 **PRO:** R$ 197/mês - Acesso completo

Sem taxas extras! Cancele quando quiser.', 
 '{}', 75, true),

('horarios', 'text', '🕐 Horários de Atendimento', 
 'Nossos horários:

💬 **Chat:** 24/7 (resposta automática)
👤 **Suporte humano:** Seg-Sex 8h-18h  
📱 **WhatsApp:** Seg-Sex 9h-17h
📧 **Email:** Resposta em até 24h

Urgências fora do horário: digite "emergencia"!', 
 '{}', 65, true),

('obrigado', 'text', '😊 De nada!', 
 'Foi um prazer ajudar! 

Se precisar de mais alguma coisa, é só chamar. Digite "ola" para ver o menu principal novamente.

Tenha um ótimo dia! 🌟', 
 '{}', 55, true)

ON CONFLICT (trigger_text) DO NOTHING;