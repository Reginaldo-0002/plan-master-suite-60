-- Adicionar mais respostas ao chatbot para funcionalidade completa
INSERT INTO chatbot_rich_responses (
  trigger_text,
  response_type,
  title,
  message,
  rich_content,
  priority,
  is_active
) VALUES 
-- Resposta para planos
(
  'planos',
  'card',
  '🎯 Nossos Planos',
  'Conheça nossos planos disponíveis:',
  '{
    "cards": [
      {
        "title": "Plano VIP",
        "description": "Acesso a ferramentas avançadas e suporte prioritário",
        "price": "R$ 97,00/mês",
        "features": ["Suporte 24/7", "Ferramentas Premium", "Grupo VIP"]
      },
      {
        "title": "Plano PRO",
        "description": "Acesso completo a todas as funcionalidades",
        "price": "R$ 197,00/mês", 
        "features": ["Tudo do VIP", "Acesso Beta", "Mentoria 1:1"]
      }
    ]
  }',
  90,
  true
),
-- Resposta para como funciona
(
  'como funciona',
  'text',
  '❓ Como Funciona',
  'Nossa plataforma oferece:\n\n🎯 Ferramentas especializadas\n📚 Conteúdo exclusivo\n💬 Suporte personalizado\n🏆 Sistema de recompensas\n\nCada plano dá acesso a diferentes níveis de funcionalidades. Comece com o plano gratuito e faça upgrade quando precisar de mais recursos!',
  '{}',
  80,
  true
),
-- Resposta para suporte
(
  'suporte',
  'text',
  '💬 Falar com Suporte',
  'Para falar com nosso suporte:\n\n1️⃣ Use este chat para dúvidas rápidas\n2️⃣ Abra um ticket de suporte para questões complexas\n3️⃣ Entre em contato via WhatsApp para urgências\n\nEstamos aqui para ajudar! 😊',
  '{}',
  70,
  true
),
-- Resposta para contato
(
  'contato',
  'buttons',
  '📞 Contato',
  'Escolha como deseja entrar em contato:',
  '{
    "buttons": [
      {
        "text": "📱 WhatsApp",
        "value": "whatsapp"
      },
      {
        "text": "📧 Email",
        "value": "email"
      },
      {
        "text": "🎫 Abrir Ticket",
        "value": "ticket"
      }
    ]
  }',
  60,
  true
),
-- Resposta para WhatsApp
(
  'whatsapp',
  'link',
  '📱 WhatsApp',
  'Clique no link abaixo para falar conosco no WhatsApp:',
  '{
    "url": "https://wa.me/5511999999999",
    "text": "Falar no WhatsApp",
    "description": "Resposta rápida em horário comercial"
  }',
  50,
  true
),
-- Resposta para email
(
  'email',
  'text',
  '📧 Email',
  'Entre em contato conosco por email:\n\n📧 contato@empresa.com\n\nResposta em até 24 horas úteis.',
  '{}',
  40,
  true
),
-- Resposta para ticket
(
  'ticket',
  'text',
  '🎫 Abrir Ticket',
  'Para abrir um ticket de suporte:\n\n1️⃣ Clique no ícone de suporte no menu\n2️⃣ Descreva detalhadamente sua questão\n3️⃣ Aguarde retorno da nossa equipe\n\nTickets são priorizados por plano! 🚀',
  '{}',
  30,
  true
);