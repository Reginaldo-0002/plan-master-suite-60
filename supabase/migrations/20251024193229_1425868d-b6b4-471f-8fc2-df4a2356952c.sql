-- Adicionar tipo 'premium' ao enum user_plan se ainda não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_plan' AND typcategory = 'E') THEN
        CREATE TYPE user_plan AS ENUM ('free', 'vip', 'pro', 'premium');
    ELSE
        -- Adicionar 'premium' ao enum existente se ainda não estiver presente
        BEGIN
            ALTER TYPE user_plan ADD VALUE IF NOT EXISTS 'premium';
        EXCEPTION WHEN duplicate_object THEN
            NULL; -- Ignorar se já existir
        END;
    END IF;
END $$;

-- Adicionar colunas de bloqueio à tabela content se não existirem
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS password_protected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS content_password TEXT,
ADD COLUMN IF NOT EXISTS scheduled_lock BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lock_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lock_end_date TIMESTAMPTZ;

-- Criar índices para melhor performance nas queries de bloqueio
CREATE INDEX IF NOT EXISTS idx_content_password_protected ON public.content(password_protected);
CREATE INDEX IF NOT EXISTS idx_content_scheduled_lock ON public.content(scheduled_lock);
CREATE INDEX IF NOT EXISTS idx_content_lock_dates ON public.content(lock_start_date, lock_end_date) WHERE scheduled_lock = TRUE;

-- Comentários para documentação
COMMENT ON COLUMN public.content.password_protected IS 'Indica se o conteúdo está protegido por senha';
COMMENT ON COLUMN public.content.content_password IS 'Senha para acessar o conteúdo protegido';
COMMENT ON COLUMN public.content.scheduled_lock IS 'Indica se o conteúdo tem bloqueio agendado';
COMMENT ON COLUMN public.content.lock_start_date IS 'Data de início do bloqueio agendado';
COMMENT ON COLUMN public.content.lock_end_date IS 'Data de fim do bloqueio agendado';