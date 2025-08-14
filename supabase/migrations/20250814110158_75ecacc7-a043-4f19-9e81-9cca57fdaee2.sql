-- Inserir respostas padrão no novo sistema de chatbot inteligente
INSERT INTO chatbot_rich_responses (trigger_text, response_type, title, message, rich_content, priority, is_active, created_by) VALUES
('ola', 'buttons', 'Bem-vindo! 👋', 'Olá! Como posso ajudá-lo hoje? Selecione uma das opções abaixo:', 
 '{"buttons": [
   {"text": "📋 Minha Conta", "value": "conta", "variant": "outline"},
   {"text": "💳 Planos", "value": "planos", "variant": "outline"},
   {"text": "🎯 Indicações", "value": "indicacoes", "variant": "outline"},
   {"text": "🆘 Suporte", "value": "suporte", "variant": "outline"}
 ]}', 10, true, null),

('conta', 'text', 'Informações da Conta', 'Para acessar informações da sua conta, vá para o menu "Perfil" no painel lateral. Lá você pode atualizar seus dados, alterar seu plano e gerenciar suas configurações.', '{}', 8, true, null),

('planos', 'image', 'Nossos Planos', 'Confira nossos planos disponíveis e escolha o que melhor se adequa às suas necessidades!',
 '{"image": {"url": "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800", "alt": "Planos disponíveis"}, 
   "buttons": [
     {"text": "Ver Planos", "url": "/dashboard#pricing", "variant": "default"},
     {"text": "Upgrade Agora", "url": "/dashboard#upgrade", "variant": "destructive"}
   ]}', 8, true, null),

('indicacoes', 'card', 'Programa de Indicações', 'Nosso programa de indicações oferece ótimas recompensas!',
 '{"items": [
   {"title": "Como Funciona", "description": "Compartilhe seu código e ganhe comissões", "button": {"text": "Saiba Mais", "url": "/dashboard#referral"}},
   {"title": "Seus Ganhos", "description": "Acompanhe suas comissões em tempo real", "button": {"text": "Ver Ganhos", "url": "/dashboard#earnings"}},
   {"title": "Sacar Comissões", "description": "Solicite o saque via PIX", "button": {"text": "Solicitar Saque", "url": "/dashboard#withdraw"}}
 ]}', 8, true, null),

('suporte', 'buttons', 'Central de Suporte 🆘', 'Como podemos ajudá-lo com o suporte?',
 '{"buttons": [
   {"text": "💬 Chat ao Vivo", "value": "chat_vivo", "variant": "default"},
   {"text": "❓ FAQ", "value": "faq", "variant": "outline"},
   {"text": "📧 Contato", "value": "contato", "variant": "outline"}
 ]}', 8, true, null),

('chat_vivo', 'text', 'Chat ao Vivo', 'Você já está no chat ao vivo! Continue digitando suas dúvidas e nossa equipe responderá o mais rápido possível. Para suporte urgente, use a palavra "urgente" em sua mensagem.', '{}', 7, true, null),

('ajuda', 'buttons', 'Central de Ajuda', 'Selecione o tipo de ajuda que você precisa:',
 '{"buttons": [
   {"text": "🔐 Login/Acesso", "value": "login_help", "variant": "outline"},
   {"text": "💳 Pagamentos", "value": "payment_help", "variant": "outline"},
   {"text": "📱 Problemas Técnicos", "value": "tech_help", "variant": "outline"},
   {"text": "📞 Falar com Humano", "value": "human_support", "variant": "destructive"}
 ]}', 9, true, null),

('payment_help', 'image', 'Ajuda com Pagamentos', 'Problemas com pagamentos? Vamos resolver!',
 '{"image": {"url": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600", "alt": "Pagamentos"}, 
   "buttons": [
     {"text": "PIX não Processado", "value": "pix_problema", "variant": "outline"},
     {"text": "Cartão Recusado", "value": "cartao_problema", "variant": "outline"},
     {"text": "Reembolso", "value": "reembolso", "variant": "destructive"}
   ]}', 7, true, null),

('login_help', 'text', 'Problemas de Acesso', 'Para problemas de login: 1) Verifique se está usando o email correto 2) Tente redefinir a senha 3) Limpe o cache do navegador 4) Se ainda não conseguir, nos informe seu email cadastrado.', '{}', 7, true, null),

('human_support', 'text', 'Suporte Humano', 'Entendi que você precisa falar com uma pessoa! Nossa equipe foi notificada e responderá em breve. Enquanto isso, pode descrever detalhadamente seu problema para acelerar o atendimento.', '{}', 9, true, null);

-- Desativar as configurações antigas do chatbot
UPDATE admin_settings 
SET value = jsonb_build_object(
  'menu_options', '[]'::jsonb,
  'migration_note', 'Migrado para chatbot_rich_responses em ' || NOW()::text
)
WHERE key = 'chatbot_config';