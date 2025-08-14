-- Criar estrutura para mensagens ricas do chatbot
-- Adicionar colunas para suportar mensagens com rich content (links, botões, imagens)

-- Atualizar tabela support_messages para suportar conteúdo rico
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS rich_content JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL;

-- Criar tabela para configurações avançadas do chatbot
CREATE TABLE IF NOT EXISTS chatbot_rich_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_text TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'buttons', 'image', 'link', 'card'
  title TEXT,
  message TEXT NOT NULL,
  rich_content JSONB DEFAULT '{}', -- Para armazenar botões, links, imagens
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_chatbot_rich_responses_trigger ON chatbot_rich_responses(trigger_text);
CREATE INDEX IF NOT EXISTS idx_chatbot_rich_responses_active ON chatbot_rich_responses(is_active);
CREATE INDEX IF NOT EXISTS idx_support_messages_type ON support_messages(message_type);

-- Criar tabela para analytics do chatbot
CREATE TABLE IF NOT EXISTS chatbot_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trigger_text TEXT,
  response_id UUID REFERENCES chatbot_rich_responses(id),
  interaction_type TEXT NOT NULL, -- 'view', 'click', 'button_click'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS policies para chatbot_rich_responses
ALTER TABLE chatbot_rich_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chatbot responses" ON chatbot_rich_responses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Users can view active chatbot responses" ON chatbot_rich_responses
FOR SELECT USING (is_active = true);

-- RLS policies para chatbot_analytics
ALTER TABLE chatbot_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own analytics" ON chatbot_analytics
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics" ON chatbot_analytics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Atualizar função de trigger para timestamps
CREATE OR REPLACE FUNCTION update_chatbot_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chatbot_responses_updated_at
BEFORE UPDATE ON chatbot_rich_responses
FOR EACH ROW
EXECUTE FUNCTION update_chatbot_responses_updated_at();

-- Inserir respostas padrão do chatbot com rich content
INSERT INTO chatbot_rich_responses (trigger_text, response_type, title, message, rich_content, priority) VALUES
('ola', 'buttons', 'Olá! Como posso ajudar?', 'Escolha uma das opções abaixo:', '{"buttons": [{"text": "Problemas com conta", "value": "conta"}, {"text": "Informações sobre planos", "value": "planos"}, {"text": "Suporte técnico", "value": "tecnico"}, {"text": "Falar com humano", "value": "humano"}]}', 10),
('conta', 'card', 'Problemas com Conta', 'Aqui estão algumas soluções rápidas para problemas comuns:', '{"items": [{"title": "Resetar senha", "description": "Clique no link para resetar sua senha", "button": {"text": "Resetar", "url": "/reset-password"}}, {"title": "Atualizar dados", "description": "Acesse seu perfil para atualizar informações", "button": {"text": "Ir para perfil", "url": "/profile"}}]}', 8),
('planos', 'buttons', 'Nossos Planos', 'Conheça nossos planos disponíveis:', '{"buttons": [{"text": "Plano VIP - R$ 97", "value": "vip_info"}, {"text": "Plano PRO - R$ 197", "value": "pro_info"}, {"text": "Comparar planos", "url": "/plans"}], "description": "Escolha o plano ideal para você"}', 8),
('vip_info', 'image', 'Plano VIP', 'O Plano VIP oferece acesso a conteúdos exclusivos e ferramentas avançadas.', '{"image": {"url": "/placeholder.svg", "alt": "Plano VIP"}, "buttons": [{"text": "Assinar agora", "url": "/subscribe/vip"}, {"text": "Mais informações", "value": "vip_details"}]}', 7),
('pro_info', 'image', 'Plano PRO', 'O Plano PRO é nossa opção mais completa com todos os recursos liberados.', '{"image": {"url": "/placeholder.svg", "alt": "Plano PRO"}, "buttons": [{"text": "Assinar agora", "url": "/subscribe/pro"}, {"text": "Mais informações", "value": "pro_details"}]}', 7),
('tecnico', 'card', 'Suporte Técnico', 'Problemas técnicos? Veja nossas soluções:', '{"items": [{"title": "Limpeza de cache", "description": "Limpe o cache do navegador", "button": {"text": "Tutorial", "url": "/help/cache"}}, {"title": "Problemas de login", "description": "Soluções para acesso", "button": {"text": "Ajuda", "url": "/help/login"}}]}', 6),
('humano', 'text', 'Conectando com atendente...', 'Você será conectado com um de nossos atendentes em breve. Por favor, descreva seu problema.', '{}', 5)
ON CONFLICT DO NOTHING;