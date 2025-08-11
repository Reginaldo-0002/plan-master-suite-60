
-- Adicionar colunas para controle de chat e status automatizado
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS chat_blocked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_status_config JSONB;

-- Criar tabela para controle de chat por usuário
CREATE TABLE IF NOT EXISTS user_chat_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  blocked_until TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para user_chat_restrictions
ALTER TABLE user_chat_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chat restrictions" 
  ON user_chat_restrictions 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_chat_restrictions_user_id ON user_chat_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chat_restrictions_blocked_until ON user_chat_restrictions(blocked_until);

-- Atualizar a tabela support_messages para incluir is_bot
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- Criar tabela para configurações automáticas de status
CREATE TABLE IF NOT EXISTS auto_status_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  target_status TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('minutes', 'hours', 'days')),
  schedule_value INTEGER NOT NULL,
  next_execution TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para auto_status_schedules
ALTER TABLE auto_status_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auto status schedules" 
  ON auto_status_schedules 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_auto_status_schedules_updated_at
  BEFORE UPDATE ON auto_status_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_chat_restrictions_updated_at
  BEFORE UPDATE ON user_chat_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
