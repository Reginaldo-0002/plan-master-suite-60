-- User area tracking and time tracking setup
-- 1) Table: user_area_tracking
CREATE TABLE IF NOT EXISTS public.user_area_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  area_name text NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_area_tracking_user ON public.user_area_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_area_tracking_user_area ON public.user_area_tracking(user_id, area_name);
CREATE INDEX IF NOT EXISTS idx_user_area_tracking_accessed_at ON public.user_area_tracking(accessed_at);

-- Enable RLS
ALTER TABLE public.user_area_tracking ENABLE ROW LEVEL SECURITY;

-- Policies: users manage own, admins manage all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_area_tracking' AND policyname = 'Users can manage their own area tracking'
  ) THEN
    CREATE POLICY "Users can manage their own area tracking"
    ON public.user_area_tracking
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_area_tracking' AND policyname = 'Admins can manage all area tracking'
  ) THEN
    CREATE POLICY "Admins can manage all area tracking"
    ON public.user_area_tracking
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin'::app_role,'moderator'::app_role])
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin'::app_role,'moderator'::app_role])
    ));
  END IF;
END$$;

-- RPC: track_area_access
CREATE OR REPLACE FUNCTION public.track_area_access(area_name text)
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
  IF area_name IS NULL OR btrim(area_name) = '' THEN
    RAISE EXCEPTION 'area_name is required';
  END IF;

  INSERT INTO public.user_area_tracking(user_id, area_name)
  VALUES (v_uid, btrim(area_name));
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_area_access(text) TO authenticated;

-- 2) Table: user_time_tracking (per-day aggregated minutes)
CREATE TABLE IF NOT EXISTS public.user_time_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day date NOT NULL,
  minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_time_tracking_user_day_unique UNIQUE (user_id, day)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_time_tracking_user_day ON public.user_time_tracking(user_id, day);
CREATE INDEX IF NOT EXISTS idx_user_time_tracking_day ON public.user_time_tracking(day);

-- Enable RLS
ALTER TABLE public.user_time_tracking ENABLE ROW LEVEL SECURITY;

-- Policies: users see/manage own; admins see/manage all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_time_tracking' AND policyname = 'Users can select their own time tracking'
  ) THEN
    CREATE POLICY "Users can select their own time tracking"
    ON public.user_time_tracking
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_time_tracking' AND policyname = 'Users can upsert their own time tracking'
  ) THEN
    CREATE POLICY "Users can upsert their own time tracking"
    ON public.user_time_tracking
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own time tracking"
    ON public.user_time_tracking
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_time_tracking' AND policyname = 'Admins can manage all time tracking'
  ) THEN
    CREATE POLICY "Admins can manage all time tracking"
    ON public.user_time_tracking
    FOR ALL
    USING (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin'::app_role,'moderator'::app_role])
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = ANY(ARRAY['admin'::app_role,'moderator'::app_role])
    ));
  END IF;
END$$;

-- Generic updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_time_tracking_updated_at ON public.user_time_tracking;
CREATE TRIGGER trg_user_time_tracking_updated_at
BEFORE UPDATE ON public.user_time_tracking
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: track_session_minute - increments today's minutes for current user
CREATE OR REPLACE FUNCTION public.track_session_minute(minutes_delta integer DEFAULT 1)
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
  IF minutes_delta IS NULL OR minutes_delta <= 0 THEN
    RETURN; -- nothing to add
  END IF;

  INSERT INTO public.user_time_tracking(user_id, day, minutes)
  VALUES (v_uid, CURRENT_DATE, minutes_delta)
  ON CONFLICT (user_id, day)
  DO UPDATE SET minutes = public.user_time_tracking.minutes + EXCLUDED.minutes,
                updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_session_minute(integer) TO authenticated;

-- RPC: get_user_time_stats - returns today/week/month/year minutes for a user
CREATE OR REPLACE FUNCTION public.get_user_time_stats(target_user_id uuid DEFAULT NULL)
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
    COALESCE((SELECT SUM(minutes) FROM public.user_time_tracking utt WHERE utt.user_id = v_uid AND utt.day = CURRENT_DATE), 0) AS today_minutes,
    COALESCE((SELECT SUM(minutes) FROM public.user_time_tracking utt WHERE utt.user_id = v_uid AND utt.day >= date_trunc('week', now())::date), 0) AS week_minutes,
    COALESCE((SELECT SUM(minutes) FROM public.user_time_tracking utt WHERE utt.user_id = v_uid AND utt.day >= date_trunc('month', now())::date), 0) AS month_minutes,
    COALESCE((SELECT SUM(minutes) FROM public.user_time_tracking utt WHERE utt.user_id = v_uid AND utt.day >= date_trunc('year', now())::date), 0) AS year_minutes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_time_stats(uuid) TO authenticated;

-- Optional: keep user_time_tracking in sync when user_sessions exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_sessions'
  ) THEN
    -- Create a trigger function to propagate duration changes
    CREATE OR REPLACE FUNCTION public.propagate_session_duration_to_time_tracking()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_delta integer := 0;
    BEGIN
      -- Assumes a column duration_minutes exists
      IF TG_OP = 'INSERT' THEN
        v_delta := COALESCE(NEW.duration_minutes, 0);
      ELSIF TG_OP = 'UPDATE' THEN
        v_delta := GREATEST(COALESCE(NEW.duration_minutes, 0) - COALESCE(OLD.duration_minutes, 0), 0);
      ELSE
        RETURN NEW;
      END IF;

      IF v_delta > 0 THEN
        PERFORM public.track_session_minute(v_delta);
      END IF;

      RETURN NEW;
    END;
    $$;

    -- Attach trigger (idempotent drop/create)
    IF EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE t.tgname = 'trg_user_sessions_propagate_duration' AND n.nspname = 'public' AND c.relname = 'user_sessions'
    ) THEN
      DROP TRIGGER trg_user_sessions_propagate_duration ON public.user_sessions;
    END IF;

    CREATE TRIGGER trg_user_sessions_propagate_duration
    AFTER INSERT OR UPDATE ON public.user_sessions
    FOR EACH ROW EXECUTE FUNCTION public.propagate_session_duration_to_time_tracking();
  END IF;
END$$;