
-- Adicionar colunas faltantes na tabela content
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS content_url text,
ADD COLUMN IF NOT EXISTS image_url text;

-- Verificar se a coluna hero_image_alt existe, se não, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='content' AND column_name='hero_image_alt') THEN
        ALTER TABLE public.content ADD COLUMN hero_image_alt text;
    END IF;
END $$;

-- Criar enum para resource_type se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type_enum') THEN
        CREATE TYPE resource_type_enum AS ENUM ('link', 'video', 'pdf', 'unlock_link');
    END IF;
END $$;

-- Atualizar a coluna resource_type na tabela topic_resources para usar o enum
ALTER TABLE public.topic_resources 
ALTER COLUMN resource_type TYPE resource_type_enum USING resource_type::resource_type_enum;

-- Adicionar RLS policies para admins gerenciarem conteúdo
DROP POLICY IF EXISTS "Admins can manage all content" ON public.content;
CREATE POLICY "Admins can manage all content" 
ON public.content 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Adicionar RLS policies para admins gerenciarem tópicos
DROP POLICY IF EXISTS "Admins can manage all topics" ON public.content_topics;
CREATE POLICY "Admins can manage all topics" 
ON public.content_topics 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Adicionar RLS policies para admins gerenciarem recursos de tópicos
DROP POLICY IF EXISTS "Admins can manage all topic resources" ON public.topic_resources;
CREATE POLICY "Admins can manage all topic resources" 
ON public.topic_resources 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
