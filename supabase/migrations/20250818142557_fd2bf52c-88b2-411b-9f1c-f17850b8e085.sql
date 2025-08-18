-- Performance optimization indexes to reduce 504 errors and speed up queries

-- Index for user_area_tracking to speed up COUNT DISTINCT in track_area_access
CREATE INDEX IF NOT EXISTS idx_user_area_tracking_user_area 
ON user_area_tracking(user_id, area_name);

-- Index for referrals to speed up referral statistics
CREATE INDEX IF NOT EXISTS idx_referrals_referrer 
ON referrals(referrer_id);

-- Index for notifications to speed up banner/popup queries
CREATE INDEX IF NOT EXISTS idx_notifications_active_created 
ON notifications(is_active, created_at DESC) 
WHERE is_active = true;

-- Index for content to speed up recent content queries
CREATE INDEX IF NOT EXISTS idx_content_active_created 
ON content(is_active, created_at DESC) 
WHERE is_active = true;

-- Index for terms_acceptance to speed up terms verification
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user 
ON terms_acceptance(user_id);

-- Index for user_time_sessions to speed up time dashboard queries
CREATE INDEX IF NOT EXISTS idx_user_time_sessions_user_date 
ON user_time_sessions(user_id, date);

-- Index for user_sessions to improve session/IP verification
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active_start 
ON user_sessions(user_id, is_active, session_start) 
WHERE is_active = true;