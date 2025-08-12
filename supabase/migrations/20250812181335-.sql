-- Performance and integrity improvements
-- 1) Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_content_is_active ON public.content (is_active);
CREATE INDEX IF NOT EXISTS idx_content_content_type ON public.content (content_type);
CREATE INDEX IF NOT EXISTS idx_content_required_plan ON public.content (required_plan);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON public.content (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_topics_content_id ON public.content_topics (content_id);
CREATE INDEX IF NOT EXISTS idx_content_topics_is_active ON public.content_topics (is_active);

CREATE INDEX IF NOT EXISTS idx_topic_resources_topic_id ON public.topic_resources (topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_resources_is_active ON public.topic_resources (is_active);

CREATE INDEX IF NOT EXISTS idx_notifications_active_expires ON public.notifications (is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_created ON public.user_interactions (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON public.support_tickets (user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created ON public.support_messages (ticket_id, created_at);

-- 2) Ensure upsert works for admin_settings by enforcing unique key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_settings_key_unique'
  ) THEN
    ALTER TABLE public.admin_settings
    ADD CONSTRAINT admin_settings_key_unique UNIQUE (key);
  END IF;
END $$;