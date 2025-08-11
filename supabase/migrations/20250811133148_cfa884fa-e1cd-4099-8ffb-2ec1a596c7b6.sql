
-- Sistema de Loyalty e Pontos
CREATE TABLE public.user_loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'bronze',
  total_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  points_awarded INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mission_type TEXT NOT NULL,
  mission_description TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  points_reward INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sistema de Mídia e Conteúdo Avançado
CREATE TABLE public.media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  tags TEXT[],
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.content_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'show', 'hide', 'publish'
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  target_plans TEXT[],
  target_users UUID[],
  executed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.content_visibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_visible BOOLEAN DEFAULT true,
  override_plan_restrictions BOOLEAN DEFAULT false,
  scheduled_show_date TIMESTAMP WITH TIME ZONE,
  scheduled_hide_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sistema de Automações
CREATE TABLE public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_conditions JSONB,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'info',
  target_users UUID[],
  target_plans TEXT[],
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT false,
  template_data JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sistema de Analytics
CREATE TABLE public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB,
  session_id TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  view_duration INTEGER,
  interaction_type TEXT,
  completion_percentage DECIMAL(5,2),
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Expandir tabela content para suportar imagens 1920x1080 e recursos avançados
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS hero_image_alt TEXT;
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS estimated_duration INTEGER;
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner';

-- Expandir tabela content_topics para múltiplos recursos
ALTER TABLE public.content_topics ADD COLUMN IF NOT EXISTS resource_metadata JSONB DEFAULT '{}';
ALTER TABLE public.content_topics ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]';
ALTER TABLE public.content_topics ADD COLUMN IF NOT EXISTS pdf_urls TEXT[];
ALTER TABLE public.content_topics ADD COLUMN IF NOT EXISTS video_urls TEXT[];

-- Expandir tabela profiles para loyalty
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_level TEXT DEFAULT 'bronze';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- RLS Policies
ALTER TABLE public.user_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_visibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_analytics ENABLE ROW LEVEL SECURITY;

-- Policies para loyalty system
CREATE POLICY "Users can view their own loyalty data" ON public.user_loyalty_points
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_id = user_loyalty_points.user_id
  ));

CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_id = user_achievements.user_id
  ));

CREATE POLICY "Users can view their own missions" ON public.user_missions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_id = user_missions.user_id
  ));

CREATE POLICY "Everyone can view active rewards" ON public.loyalty_rewards
  FOR SELECT USING (is_active = true);

-- Policies para mídia
CREATE POLICY "Admins can manage media library" ON public.media_library
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Everyone can view media" ON public.media_library
  FOR SELECT USING (true);

-- Policies para automação (apenas admins)
CREATE POLICY "Admins can manage content schedules" ON public.content_schedules
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Admins can manage visibility rules" ON public.content_visibility_rules
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Admins can manage workflows" ON public.automation_workflows
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Admins can manage scheduled notifications" ON public.scheduled_notifications
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  ));

-- Policies para analytics
CREATE POLICY "Users can view their own interactions" ON public.user_interactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_id = user_interactions.user_id
  ));

CREATE POLICY "Users can view their own analytics" ON public.content_analytics
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.user_id = content_analytics.user_id
  ));

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_loyalty_points_updated_at 
  BEFORE UPDATE ON public.user_loyalty_points 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular pontos de loyalty
CREATE OR REPLACE FUNCTION public.award_loyalty_points(
  user_uuid UUID,
  points_amount INTEGER,
  activity_type TEXT
) RETURNS void AS $$
DECLARE
  current_points INTEGER;
  new_level TEXT;
BEGIN
  -- Inserir ou atualizar pontos do usuário
  INSERT INTO public.user_loyalty_points (user_id, points, total_earned)
  VALUES (user_uuid, points_amount, points_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    points = user_loyalty_points.points + points_amount,
    total_earned = user_loyalty_points.total_earned + points_amount,
    updated_at = NOW();
  
  -- Obter pontos atuais
  SELECT points INTO current_points
  FROM public.user_loyalty_points
  WHERE user_id = user_uuid;
  
  -- Calcular novo nível
  IF current_points >= 10000 THEN
    new_level := 'diamond';
  ELSIF current_points >= 5000 THEN
    new_level := 'gold';
  ELSIF current_points >= 2000 THEN
    new_level := 'silver';
  ELSE
    new_level := 'bronze';
  END IF;
  
  -- Atualizar nível se mudou
  UPDATE public.user_loyalty_points
  SET level = new_level
  WHERE user_id = user_uuid AND level != new_level;
  
  -- Atualizar profile
  UPDATE public.profiles
  SET loyalty_level = new_level, total_points = current_points
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
