-- Fix ambiguous column reference and allow moderators to access analytics
CREATE OR REPLACE FUNCTION public.get_all_users_stats()
RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_plan text,
  total_areas_accessed integer,
  total_referrals integer,
  today_minutes integer,
  week_minutes integer,
  month_minutes integer,
  year_minutes integer,
  last_activity timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := CURRENT_DATE;
  v_week_start date := date_trunc('week', v_today)::date;
  v_month_start date := date_trunc('month', v_today)::date;
  v_year_start date := date_trunc('year', v_today)::date;
BEGIN
  -- Ensure only admins or moderators can access
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::public.app_role, 'moderator'::public.app_role])
  ) THEN
    RAISE EXCEPTION 'Apenas administradores ou moderadores podem acessar essas estatísticas';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.full_name, 'Usuário sem nome') AS user_name,
    COALESCE(p.plan::text, 'free') AS user_plan,
    COALESCE(ua.total_areas, 0)::int AS total_areas_accessed,
    COALESCE(rf.total_refs, 0)::int AS total_referrals,
    COALESCE(tday.minutes, 0)::int AS today_minutes,
    COALESCE(tweek.minutes, 0)::int AS week_minutes,
    COALESCE(tmonth.minutes, 0)::int AS month_minutes,
    COALESCE(tyear.minutes, 0)::int AS year_minutes,
    p.last_activity
  FROM public.profiles p
  LEFT JOIN (
    SELECT uat.user_id, COUNT(DISTINCT uat.area_name) AS total_areas
    FROM public.user_area_tracking uat
    GROUP BY uat.user_id
  ) ua ON ua.user_id = p.user_id
  LEFT JOIN (
    SELECT ref.referrer_id, COUNT(*) AS total_refs
    FROM public.referrals ref
    GROUP BY ref.referrer_id
  ) rf ON rf.referrer_id = p.user_id
  LEFT JOIN (
    SELECT uts.user_id, SUM(uts.minutes) AS minutes
    FROM public.user_time_sessions uts
    WHERE uts.date = v_today
    GROUP BY uts.user_id
  ) tday ON tday.user_id = p.user_id
  LEFT JOIN (
    SELECT uts.user_id, SUM(uts.minutes) AS minutes
    FROM public.user_time_sessions uts
    WHERE uts.date >= v_week_start
    GROUP BY uts.user_id
  ) tweek ON tweek.user_id = p.user_id
  LEFT JOIN (
    SELECT uts.user_id, SUM(uts.minutes) AS minutes
    FROM public.user_time_sessions uts
    WHERE uts.date >= v_month_start
    GROUP BY uts.user_id
  ) tmonth ON tmonth.user_id = p.user_id
  LEFT JOIN (
    SELECT uts.user_id, SUM(uts.minutes) AS minutes
    FROM public.user_time_sessions uts
    WHERE uts.date >= v_year_start
    GROUP BY uts.user_id
  ) tyear ON tyear.user_id = p.user_id
  ORDER BY p.created_at DESC;
END;
$function$;