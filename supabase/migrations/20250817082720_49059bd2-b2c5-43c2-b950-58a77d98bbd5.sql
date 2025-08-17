-- Fix type mismatch in get_all_users_for_admin (cast varchar to text for user_email)
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE(
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
  role app_role,
  whatsapp text,
  purchase_source text,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure only admins can access
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar todos os usuários';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name::text,
    p.avatar_url::text,
    p.plan,
    p.pix_key::text,
    p.total_session_time,
    p.areas_accessed,
    p.referral_code::text,
    p.referral_earnings,
    p.created_at,
    p.updated_at,
    COALESCE(ur.role, 'user'::app_role) as role,
    p.whatsapp::text,
    p.purchase_source::text,
    (au.email)::text as user_email
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  LEFT JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$function$;