
-- Adicionar colunas para imagens do carrossel na tabela content
ALTER TABLE public.content 
ADD COLUMN carousel_image_url TEXT,
ADD COLUMN carousel_order INTEGER DEFAULT 0,
ADD COLUMN show_in_carousel BOOLEAN DEFAULT false;

-- Criar tabela para tópicos
CREATE TABLE public.content_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic_image_url TEXT,
  topic_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para recursos dos tópicos (vídeos, PDFs, links)
CREATE TABLE public.topic_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.content_topics(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('video', 'pdf', 'link', 'unlock_link')),
  title TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  resource_order INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  required_plan TEXT DEFAULT 'free' CHECK (required_plan IN ('free', 'vip', 'pro')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para visibilidade personalizada por usuário
CREATE TABLE public.user_content_visibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  is_visible BOOLEAN DEFAULT true,
  scheduled_show_date TIMESTAMP WITH TIME ZONE,
  scheduled_hide_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Índices para performance
CREATE INDEX idx_content_topics_content_id ON public.content_topics(content_id);
CREATE INDEX idx_topic_resources_topic_id ON public.topic_resources(topic_id);
CREATE INDEX idx_user_content_visibility_user_id ON public.user_content_visibility(user_id);
CREATE INDEX idx_user_content_visibility_content_id ON public.user_content_visibility(content_id);

-- RLS para content_topics
ALTER TABLE public.content_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active topics" 
ON public.content_topics 
FOR SELECT 
USING (is_active = true);

-- RLS para topic_resources
ALTER TABLE public.topic_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active resources" 
ON public.topic_resources 
FOR SELECT 
USING (is_active = true);

-- RLS para user_content_visibility
ALTER TABLE public.user_content_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own visibility settings" 
ON public.user_content_visibility 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_id = user_content_visibility.user_id
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_content_topics_updated_at
  BEFORE UPDATE ON public.content_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topic_resources_updated_at
  BEFORE UPDATE ON public.topic_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_content_visibility_updated_at
  BEFORE UPDATE ON public.user_content_visibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime para as novas tabelas
ALTER TABLE public.content_topics REPLICA IDENTITY FULL;
ALTER TABLE public.topic_resources REPLICA IDENTITY FULL;
ALTER TABLE public.user_content_visibility REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.content_topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.topic_resources;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_content_visibility;
