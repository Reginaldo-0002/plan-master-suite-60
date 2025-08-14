-- Adicionar constraint única para trigger_text se não existir
ALTER TABLE chatbot_rich_responses ADD CONSTRAINT IF NOT EXISTS unique_trigger_text UNIQUE (trigger_text);

-- Inserir/atualizar respostas do chatbot
INSERT INTO chatbot_rich_responses (trigger_text, response_type, title, message, rich_content, priority, is_active) VALUES
('ola', 'buttons', 'Olá! Como posso ajudá-lo?', 'Escolha uma das opções abaixo:', 
 '{"buttons": [
   {"text": "🎯 Planos Disponíveis", "value": "planos"},
   {"text": "❓ Como Funciona", "value": "como funciona"},
   {"text": "💬 Falar com Suporte", "value": "suporte"},
   {"text": "📞 Contato", "value": "contato"}
 ]}', 100, true),

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
 ]}', 25, true),

('tutorial', 'buttons', '📚 Tutorial da Plataforma', 'Escolha o que deseja aprender:',
 '{"buttons": [
   {"text": "🎯 Primeiros Passos", "value": "primeiros_passos"},
   {"text": "⚙️ Configurações", "value": "configuracoes"},
   {"text": "🔧 Ferramentas", "value": "ferramentas"}, 
   {"text": "📊 Relatórios", "value": "relatorios"}
 ]}', 15, true),

('humano', 'text', '👤 Suporte Humano', 'Entendi que você precisa falar com uma pessoa! Nossa equipe foi notificada e responderá em breve. 

Enquanto isso, pode descrever detalhadamente seu problema para acelerar o atendimento.',
 '{}', 10, true),

('primeiros_passos', 'text', '🎯 Primeiros Passos', 'Bem-vindo! Siga este guia:

1️⃣ **Complete seu perfil** - Adicione foto e informações
2️⃣ **Explore o dashboard** - Conheça as funcionalidades  
3️⃣ **Teste as ferramentas** - Experimente gratuitamente
4️⃣ **Faça upgrade** - Desbloqueie recursos premium

Precisa de ajuda? Digite "suporte"!',
 '{}', 8, true),

('configuracoes', 'text', '⚙️ Configurações', 'Para acessar suas configurações:

👤 **Perfil:** Clique no avatar no canto superior direito
🔔 **Notificações:** Menu > Configurações > Notificações
🎨 **Tema:** Menu > Configurações > Aparência  
🔐 **Privacidade:** Menu > Configurações > Privacidade

Dúvidas? Digite "suporte"!',
 '{}', 7, true),

('ferramentas', 'card', '🔧 Nossas Ferramentas', 'Conheça nossas principais ferramentas:',
 '{"cards": [
   {
     "title": "Ferramenta A", 
     "description": "Descrição da ferramenta A",
     "features": ["Recurso 1", "Recurso 2"]
   },
   {
     "title": "Ferramenta B",
     "description": "Descrição da ferramenta B", 
     "features": ["Recurso 3", "Recurso 4"]
   }
 ]}', 6, true),

('relatorios', 'text', '📊 Relatórios', 'Acesse seus relatórios:

📈 **Dashboard:** Visão geral dos dados
📋 **Detalhado:** Análises completas  
📅 **Histórico:** Dados anteriores
📤 **Exportar:** Download em Excel/PDF

Disponível nos planos VIP e PRO!',
 '{}', 5, true),

('teste_conexao', 'text', '🌐 Teste de Conexão', 'Para resolver problemas de conexão:

🔄 **Atualize a página** (F5 ou Ctrl+R)
🧹 **Limpe o cache** do navegador
🔌 **Verifique sua internet**  
🌐 **Teste outro navegador**

Se persistir, digite "humano" para suporte!',
 '{}', 4, true),

('preco', 'text', '💰 Preços', 'Nossos preços são simples e transparentes:

🆓 **Gratuito:** R$ 0 - Funcionalidades básicas
⭐ **VIP:** R$ 97/mês - Recursos avançados  
🚀 **PRO:** R$ 197/mês - Acesso completo

Sem taxas extras! Cancele quando quiser.',
 '{}', 3, true),

('seguranca', 'text', '🔐 Segurança', 'Sua segurança é nossa prioridade:

🛡️ **Criptografia:** Dados protegidos SSL
🔐 **Senhas:** Use senhas fortes
🚫 **Nunca compartilhe:** Suas credenciais
📱 **2FA:** Ative autenticação dupla

Suspeita de invasão? Digite "humano" imediatamente!',
 '{}', 2, true),

('horario', 'text', '🕐 Horários de Atendimento', 'Nossos horários:

💬 **Chat:** 24/7 (resposta automática)
👤 **Suporte humano:** Seg-Sex 8h-18h  
📱 **WhatsApp:** Seg-Sex 9h-17h
📧 **Email:** Resposta em até 24h

Urgências fora do horário: digite "emergencia"!',
 '{}', 1, true),

('emergencia', 'text', '🚨 Emergência', 'Para emergências fora do horário:

📱 WhatsApp: +55 11 99999-9999
📧 Email: urgente@empresa.com  
🎫 Ticket: Marque como "URGENTE"

Nossa equipe será notificada imediatamente!',
 '{}', 1, true),

('obrigado', 'text', '😊 De nada!', 'Foi um prazer ajudar! 

Se precisar de mais alguma coisa, é só chamar. Digite "ola" para ver o menu principal novamente.

Tenha um ótimo dia! 🌟',
 '{}', 1, true)

ON CONFLICT (trigger_text) DO UPDATE SET
  response_type = EXCLUDED.response_type,
  title = EXCLUDED.title, 
  message = EXCLUDED.message,
  rich_content = EXCLUDED.rich_content,
  priority = EXCLUDED.priority,
  is_active = EXCLUDED.is_active,
  updated_at = now();