-- Add content blocking columns to content table
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS password_protected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS content_password TEXT,
ADD COLUMN IF NOT EXISTS scheduled_lock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lock_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lock_end_date TIMESTAMP WITH TIME ZONE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_password_protected ON public.content(password_protected) WHERE password_protected = true;
CREATE INDEX IF NOT EXISTS idx_content_scheduled_lock ON public.content(scheduled_lock, lock_start_date, lock_end_date) WHERE scheduled_lock = true;

-- Add comments for documentation
COMMENT ON COLUMN public.content.password_protected IS 'Whether this content requires a password to access';
COMMENT ON COLUMN public.content.content_password IS 'Password required to access this content (if password_protected is true)';
COMMENT ON COLUMN public.content.scheduled_lock IS 'Whether this content has a scheduled lock period';
COMMENT ON COLUMN public.content.lock_start_date IS 'Start date/time when content becomes locked';
COMMENT ON COLUMN public.content.lock_end_date IS 'End date/time when content becomes unlocked again';