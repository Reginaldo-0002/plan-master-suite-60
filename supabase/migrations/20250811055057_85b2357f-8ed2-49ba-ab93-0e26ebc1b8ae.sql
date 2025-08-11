-- Create enum for user plans
CREATE TYPE public.user_plan AS ENUM ('free', 'vip', 'pro');

-- Create enum for content types
CREATE TYPE public.content_type AS ENUM ('product', 'tool', 'course', 'tutorial');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  plan user_plan NOT NULL DEFAULT 'free',
  pix_key TEXT,
  total_session_time INTEGER DEFAULT 0,
  areas_accessed INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE DEFAULT SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
  referral_earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create content table
CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  content_type content_type NOT NULL,
  required_plan user_plan NOT NULL DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Create withdrawal requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  pix_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create user activity logs table
CREATE TABLE public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for content (public read)
CREATE POLICY "Everyone can view active content" 
ON public.content FOR SELECT 
USING (is_active = true);

-- RLS Policies for referrals
CREATE POLICY "Users can view their referrals" 
ON public.referrals FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = referrer_id AND profiles.user_id = auth.uid()));

-- RLS Policies for withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests" 
ON public.withdrawal_requests FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = user_id AND profiles.user_id = auth.uid()));

CREATE POLICY "Users can create their own withdrawal requests" 
ON public.withdrawal_requests FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = user_id AND profiles.user_id = auth.uid()));

-- RLS Policies for user activity logs
CREATE POLICY "Users can view their own activity logs" 
ON public.user_activity_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = user_id AND profiles.user_id = auth.uid()));

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample content
INSERT INTO public.content (title, description, content_type, required_plan, video_url) VALUES
('Introdução ao Sistema', 'Bem-vindo à nossa plataforma! Este tutorial mostra como navegar pelo sistema.', 'tutorial', 'free', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
('Ferramenta Básica', 'Uma ferramenta essencial para iniciantes.', 'tool', 'free', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
('Curso Avançado VIP', 'Curso exclusivo para membros VIP e Pro.', 'course', 'vip', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
('Produto Premium', 'Produto exclusivo para membros Pro.', 'product', 'pro', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');