-- Drop and recreate the get_current_user_role function with better security and debugging
DROP FUNCTION IF EXISTS public.get_current_user_role();

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  user_role text;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- Log for debugging (will appear in Supabase logs)
  RAISE LOG 'get_current_user_role called for user_id: %', current_user_id;
  
  -- Return null if no authenticated user
  IF current_user_id IS NULL THEN
    RAISE LOG 'No authenticated user found';
    RETURN 'user';
  END IF;
  
  -- Get the user's role from user_roles table
  SELECT role::text INTO user_role 
  FROM public.user_roles 
  WHERE user_id = current_user_id 
  LIMIT 1;
  
  -- Log the result
  RAISE LOG 'Found role for user %: %', current_user_id, COALESCE(user_role, 'null');
  
  -- Return the role or default to 'user'
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Also create a more robust function to check specific roles
CREATE OR REPLACE FUNCTION public.check_user_role(target_role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  has_role boolean := false;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = current_user_id 
    AND role::text = target_role
  ) INTO has_role;
  
  RETURN has_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_role(text) TO authenticated;