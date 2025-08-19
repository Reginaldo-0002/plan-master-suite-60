-- 1) Deduplicate and enforce single acceptance per user
WITH ranked AS (
  SELECT id, user_id, accepted_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY accepted_at ASC) AS rn
  FROM public.terms_acceptance
)
DELETE FROM public.terms_acceptance t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS terms_acceptance_user_unique ON public.terms_acceptance(user_id);

-- 2) Performance indexes for high-traffic queries
CREATE INDEX IF NOT EXISTS idx_user_area_tracking_user_area ON public.user_area_tracking(user_id, area_name);
CREATE INDEX IF NOT EXISTS idx_user_time_sessions_user_date ON public.user_time_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_active_expires ON public.notifications (is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_start ON public.user_sessions(user_id, session_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_status ON public.webhook_events (created_at DESC, status);

-- 3) Optional: speed up plan/product lookups
CREATE INDEX IF NOT EXISTS idx_platform_products_active ON public.platform_products(active);
CREATE INDEX IF NOT EXISTS idx_plans_active_slug ON public.plans(active, slug);
