-- Add role field to profiles table
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- Create admin_settings table
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy for admin_settings
CREATE POLICY "Only admins can manage settings" 
ON public.admin_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create support_tickets table for chat/support system
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  subject TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for support_tickets
CREATE POLICY "Users can view their own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND (profiles.user_id = support_tickets.user_id OR profiles.role IN ('admin', 'moderator'))
));

CREATE POLICY "Users can create their own tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND user_id = support_tickets.user_id
));

CREATE POLICY "Admins can manage all tickets" 
ON public.support_tickets 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
));

-- Create support_messages table for chat messages
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on support_messages
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for support_messages
CREATE POLICY "Users can view messages from their tickets" 
ON public.support_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.support_tickets st
  JOIN public.profiles p ON p.user_id = auth.uid()
  WHERE st.id = support_messages.ticket_id 
  AND (st.user_id = p.user_id OR p.role IN ('admin', 'moderator'))
));

CREATE POLICY "Users can send messages to their tickets" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.support_tickets st
  JOIN public.profiles p ON p.user_id = auth.uid()
  WHERE st.id = support_messages.ticket_id 
  AND (st.user_id = p.user_id OR p.role IN ('admin', 'moderator'))
  AND p.user_id = support_messages.sender_id
));

-- Create notifications table for pop-ups and system notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  target_users TEXT[] DEFAULT NULL, -- NULL means all users, or specific user IDs
  target_plans TEXT[] DEFAULT NULL, -- NULL means all plans, or specific plans
  is_popup BOOLEAN DEFAULT false,
  popup_duration INTEGER DEFAULT NULL, -- in minutes, NULL means until dismissed
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view notifications targeted to them" 
ON public.notifications 
FOR SELECT 
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    target_users IS NULL 
    OR auth.uid()::text = ANY(target_users)
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (target_plans IS NULL OR plan::text = ANY(target_plans))
    )
  )
);

CREATE POLICY "Admins can manage all notifications" 
ON public.notifications 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create tool_status table for managing tool maintenance status
CREATE TABLE public.tool_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance')),
  scheduled_maintenance JSONB DEFAULT NULL, -- For automatic rotation
  message TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tool_status
ALTER TABLE public.tool_status ENABLE ROW LEVEL SECURITY;

-- Create policies for tool_status
CREATE POLICY "Everyone can view tool status" 
ON public.tool_status 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage tool status" 
ON public.tool_status 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create triggers for updated_at
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tool_status_updated_at
BEFORE UPDATE ON public.tool_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin settings
INSERT INTO public.admin_settings (key, value) VALUES
('referral_bonus_amount', '{"amount": 10, "currency": "BRL"}'),
('site_rules', '{"content": "Regras do site serão definidas aqui..."}'),
('chatbot_config', '{"menu_options": [{"id": "faq", "title": "Perguntas Frequentes", "response": "Aqui estão as perguntas mais comuns..."}, {"id": "payment", "title": "Problemas com Pagamento", "response": "Para problemas de pagamento, verifique..."}]}');

-- Set current user as admin (will be updated via code)
-- INSERT INTO public.profiles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Enable realtime for all tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.content REPLICA IDENTITY FULL;
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
ALTER TABLE public.withdrawal_requests REPLICA IDENTITY FULL;
ALTER TABLE public.user_activity_logs REPLICA IDENTITY FULL;
ALTER TABLE public.admin_settings REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.tool_status REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tool_status;