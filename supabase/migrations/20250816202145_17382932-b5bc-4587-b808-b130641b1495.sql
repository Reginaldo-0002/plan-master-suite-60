-- Fix syntax error and create simplified tracking system

-- Table: user_time_sessions (per session tracking)
CREATE TABLE IF NOT EXISTS public.user_time_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_time_sessions_user_date ON public.user_time_sessions(user_id, date);

-- Enable RLS
ALTER TABLE public.user_time_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage their own time sessions" ON public.user_time_sessions;
CREATE POLICY "Users can manage their own time sessions"
ON public.user_time_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all time sessions" ON public.user_time_sessions;
CREATE POLICY "Admins can manage all time sessions"
ON public.user_time_sessions
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin'::app_role,'moderator'::app_role])
))
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin'::app_role,'moderator'::app_role])
));

-- RPC: add_session_time - adds minutes to today's count
CREATE OR REPLACE FUNCTION public.add_session_time(minutes_to_add integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF minutes_to_add IS NULL OR minutes_to_add <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.user_time_sessions(user_id, date, minutes)
  VALUES (v_uid, CURRENT_DATE, minutes_to_add)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    minutes = public.user_time_sessions.minutes + EXCLUDED.minutes,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_session_time(integer) TO authenticated;

-- RPC: get_time_stats - returns time stats for user
CREATE OR REPLACE FUNCTION public.get_time_stats(target_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  today_minutes integer,
  week_minutes integer,
  month_minutes integer,
  year_minutes integer
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(target_user_id, auth.uid());
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(minutes) FROM public.user_time_sessions uts WHERE uts.user_id = v_uid AND uts.date = CURRENT_DATE), 0)::integer AS today_minutes,
    COALESCE((SELECT SUM(minutes) FROM public.user_time_sessions uts WHERE uts.user_id = v_uid AND uts.date >= date_trunc('week', now())::date), 0)::integer AS week_minutes,
    COALESCE((SELECT SUM(minutes) FROM public.user_time_sessions uts WHERE uts.user_id = v_uid AND uts.date >= date_trunc('month', now())::date), 0)::integer AS month_minutes,
    COALESCE((SELECT SUM(minutes) FROM public.user_time_sessions uts WHERE uts.user_id = v_uid AND uts.date >= date_trunc('year', now())::date), 0)::integer AS year_minutes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_time_stats(uuid) TO authenticated;

-- Add unique constraint to prevent duplicates
ALTER TABLE public.user_time_sessions 
DROP CONSTRAINT IF EXISTS user_time_sessions_user_date_unique;

ALTER TABLE public.user_time_sessions 
ADD CONSTRAINT user_time_sessions_user_date_unique UNIQUE (user_id, date);