-- Criar tabela para rastrear áreas acessadas por usuários
CREATE TABLE IF NOT EXISTS user_area_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  area_name TEXT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para rastrear tempo por períodos
CREATE TABLE IF NOT EXISTS user_time_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  minutes_spent INTEGER NOT NULL DEFAULT 0,
  week_start DATE NOT NULL,
  month_start DATE NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Habilitar RLS
ALTER TABLE user_area_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_time_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_area_tracking
CREATE POLICY "Users can view their own area tracking" 
ON user_area_tracking FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own area tracking" 
ON user_area_tracking FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all area tracking" 
ON user_area_tracking FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Políticas RLS para user_time_tracking
CREATE POLICY "Users can view their own time tracking" 
ON user_time_tracking FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own time tracking" 
ON user_time_tracking FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all time tracking" 
ON user_time_tracking FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Função para rastrear acesso a áreas
CREATE OR REPLACE FUNCTION track_area_access(area_name TEXT, session_uuid UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Inserir registro de acesso
  INSERT INTO user_area_tracking (user_id, area_name, session_id)
  VALUES (current_user_id, area_name, session_uuid);
  
  -- Atualizar contador de áreas acessadas no perfil
  UPDATE profiles 
  SET areas_accessed = (
    SELECT COUNT(DISTINCT area_name) 
    FROM user_area_tracking 
    WHERE user_id = current_user_id
  )
  WHERE user_id = current_user_id;
END;
$$;

-- Função para rastrear tempo diário
CREATE OR REPLACE FUNCTION track_daily_time(minutes_to_add INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  today DATE;
  week_start DATE;
  month_start DATE;
  current_year INTEGER;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  today := CURRENT_DATE;
  week_start := date_trunc('week', today)::DATE;
  month_start := date_trunc('month', today)::DATE;
  current_year := EXTRACT(YEAR FROM today);
  
  -- Inserir ou atualizar tempo do dia
  INSERT INTO user_time_tracking (
    user_id, date, minutes_spent, week_start, month_start, year
  ) VALUES (
    current_user_id, today, minutes_to_add, week_start, month_start, current_year
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    minutes_spent = user_time_tracking.minutes_spent + minutes_to_add,
    updated_at = now();
END;
$$;

-- Função para obter estatísticas de tempo por usuário
CREATE OR REPLACE FUNCTION get_user_time_stats(target_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(
  today_minutes INTEGER,
  week_minutes INTEGER,
  month_minutes INTEGER,
  year_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  week_start DATE := date_trunc('week', today)::DATE;
  month_start DATE := date_trunc('month', today)::DATE;
  current_year INTEGER := EXTRACT(YEAR FROM today);
BEGIN
  -- Verificar permissões
  IF target_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  RETURN QUERY
  SELECT 
    COALESCE((SELECT minutes_spent FROM user_time_tracking WHERE user_id = target_user_id AND date = today), 0) as today_minutes,
    COALESCE((SELECT SUM(minutes_spent) FROM user_time_tracking WHERE user_id = target_user_id AND week_start = week_start), 0)::INTEGER as week_minutes,
    COALESCE((SELECT SUM(minutes_spent) FROM user_time_tracking WHERE user_id = target_user_id AND month_start = month_start), 0)::INTEGER as month_minutes,
    COALESCE((SELECT SUM(minutes_spent) FROM user_time_tracking WHERE user_id = target_user_id AND year = current_year), 0)::INTEGER as year_minutes;
END;
$$;

-- Função para admins obterem estatísticas de todos os usuários
CREATE OR REPLACE FUNCTION get_all_users_stats()
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_plan TEXT,
  total_areas_accessed INTEGER,
  total_referrals INTEGER,
  today_minutes INTEGER,
  week_minutes INTEGER,
  month_minutes INTEGER,
  year_minutes INTEGER,
  last_activity TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  week_start DATE := date_trunc('week', today)::DATE;
  month_start DATE := date_trunc('month', today)::DATE;
  current_year INTEGER := EXTRACT(YEAR FROM today);
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar essas estatísticas';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.full_name, 'Usuário sem nome') as user_name,
    p.plan::TEXT as user_plan,
    COALESCE(areas.total_areas, 0) as total_areas_accessed,
    COALESCE(refs.total_refs, 0) as total_referrals,
    COALESCE(time_today.minutes, 0) as today_minutes,
    COALESCE(time_week.minutes, 0) as week_minutes,
    COALESCE(time_month.minutes, 0) as month_minutes,
    COALESCE(time_year.minutes, 0) as year_minutes,
    p.last_activity
  FROM profiles p
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(DISTINCT area_name) as total_areas
    FROM user_area_tracking
    GROUP BY user_id
  ) areas ON p.user_id = areas.user_id
  LEFT JOIN (
    SELECT 
      referrer_id,
      COUNT(*) as total_refs
    FROM referrals
    GROUP BY referrer_id
  ) refs ON p.user_id = refs.referrer_id
  LEFT JOIN (
    SELECT 
      user_id,
      minutes_spent as minutes
    FROM user_time_tracking
    WHERE date = today
  ) time_today ON p.user_id = time_today.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(minutes_spent) as minutes
    FROM user_time_tracking
    WHERE week_start = week_start
    GROUP BY user_id
  ) time_week ON p.user_id = time_week.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(minutes_spent) as minutes
    FROM user_time_tracking
    WHERE month_start = month_start
    GROUP BY user_id
  ) time_month ON p.user_id = time_month.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(minutes_spent) as minutes
    FROM user_time_tracking
    WHERE year = current_year
    GROUP BY user_id
  ) time_year ON p.user_id = time_year.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Atualizar trigger para rastrear tempo das sessões
CREATE OR REPLACE FUNCTION update_session_time_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Quando uma sessão é finalizada, adicionar o tempo ao rastreamento diário
  IF NEW.session_end IS NOT NULL AND OLD.session_end IS NULL AND NEW.duration_minutes > 0 THEN
    PERFORM track_daily_time(NEW.duration_minutes);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para rastrear tempo das sessões
DROP TRIGGER IF EXISTS track_session_time_trigger ON user_sessions;
CREATE TRIGGER track_session_time_trigger
  AFTER UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_time_tracking();

-- Habilitar realtime para as novas tabelas
ALTER TABLE user_area_tracking REPLICA IDENTITY FULL;
ALTER TABLE user_time_tracking REPLICA IDENTITY FULL;

-- Adicionar tabelas ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_area_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE user_time_tracking;