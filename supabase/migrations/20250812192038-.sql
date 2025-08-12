-- Criar função RPC para administradores buscarem todos os usuários
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  plan user_plan,
  pix_key text,
  total_session_time integer,
  areas_accessed integer,
  referral_code text,
  referral_earnings numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar todos os usuários';
  END IF;

  -- Retornar todos os usuários com suas funções
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.plan,
    p.pix_key,
    p.total_session_time,
    p.areas_accessed,
    p.referral_code,
    p.referral_earnings,
    p.created_at,
    p.updated_at,
    COALESCE(ur.role, 'user'::app_role) as role
  FROM profiles p
  LEFT JOIN user_roles ur ON p.user_id = ur.user_id
  ORDER BY p.created_at DESC;
END;
$$;