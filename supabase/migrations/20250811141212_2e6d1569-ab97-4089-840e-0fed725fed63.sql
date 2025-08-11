
-- Adicionar campos para gestão de conteúdo e planos
ALTER TABLE content ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE content ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE content ADD COLUMN IF NOT EXISTS auto_publish_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campos para gestão de planos dos usuários
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active';

-- Criar tabela para sessões de chat
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  session_status TEXT DEFAULT 'active',
  first_message_sent BOOLEAN DEFAULT false,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para fila de chat administrativo
CREATE TABLE IF NOT EXISTS admin_chat_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  chat_session_id UUID REFERENCES chat_sessions(id),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  assigned_admin UUID REFERENCES profiles(user_id),
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Criar tabela para notificações agendadas de expiração de plano
CREATE TABLE IF NOT EXISTS plan_expiration_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_7_days BOOLEAN DEFAULT false,
  reminder_1_day BOOLEAN DEFAULT false,
  expiration_notice BOOLEAN DEFAULT false,
  downgrade_executed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar campos para agendamento de mensagens
ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(user_id);
ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES profiles(user_id);
ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS is_personal_message BOOLEAN DEFAULT false;

-- Habilitar RLS nas novas tabelas
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chat_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_expiration_queue ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chat_sessions
CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
FOR SELECT USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_id = chat_sessions.user_id
));

CREATE POLICY "Users can insert their own chat sessions" ON chat_sessions
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_id = chat_sessions.user_id
));

CREATE POLICY "Users can update their own chat sessions" ON chat_sessions
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_id = chat_sessions.user_id
));

-- Políticas RLS para admin_chat_queue
CREATE POLICY "Admins can manage chat queue" ON admin_chat_queue
FOR ALL USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator')
));

CREATE POLICY "Users can view their own queue items" ON admin_chat_queue
FOR SELECT USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_id = admin_chat_queue.user_id
));

-- Políticas RLS para plan_expiration_queue
CREATE POLICY "Admins can manage expiration queue" ON plan_expiration_queue
FOR ALL USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

-- Trigger para atualizar chat sessions
CREATE OR REPLACE FUNCTION update_chat_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions 
  SET last_activity = now()
  WHERE user_id = NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_activity
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_activity();

-- Função para criar automaticamente queue de expiração quando plano é definido
CREATE OR REPLACE FUNCTION create_expiration_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan_end_date IS NOT NULL AND (OLD.plan_end_date IS NULL OR OLD.plan_end_date != NEW.plan_end_date) THEN
    INSERT INTO plan_expiration_queue (user_id, expiration_date)
    VALUES (NEW.user_id, NEW.plan_end_date)
    ON CONFLICT (user_id) DO UPDATE SET
      expiration_date = NEW.plan_end_date,
      reminder_7_days = false,
      reminder_1_day = false,
      expiration_notice = false,
      downgrade_executed = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_plan_expiration_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_expiration_queue();
