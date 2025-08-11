-- CRITICAL SECURITY FIXES - PHASE 1
-- Fix Role Escalation and Content Exposure Vulnerabilities

-- 1. Create user_roles table for proper role management
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Create function to get current user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT user_id, 
       CASE 
         WHEN role = 'admin' THEN 'admin'::app_role
         WHEN role = 'moderator' THEN 'moderator'::app_role
         ELSE 'user'::app_role
       END,
       created_at
FROM public.profiles 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Update profiles table policies to prevent role modification
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (OLD.role = NEW.role OR NEW.role IS NULL)  -- Prevent role changes
);

-- 6. Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Secure content table - require authentication
DROP POLICY IF EXISTS "Everyone can view active content" ON public.content;

CREATE POLICY "Authenticated users can view content based on plan" 
ON public.content 
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (
      required_plan = 'free'
      OR (required_plan = 'vip' AND p.plan IN ('vip', 'pro'))
      OR (required_plan = 'pro' AND p.plan = 'pro')
    )
  )
);

-- 8. Secure upcoming_releases - require authentication
DROP POLICY IF EXISTS "Everyone can view active releases" ON public.upcoming_releases;

CREATE POLICY "Authenticated users can view upcoming releases" 
ON public.upcoming_releases 
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (
      target_plans IS NULL 
      OR p.plan::text = ANY(target_plans)
    )
  )
);

-- 9. Secure notifications properly
DROP POLICY IF EXISTS "Users can view notifications targeted to them" ON public.notifications;

CREATE POLICY "Authenticated users can view targeted notifications" 
ON public.notifications 
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    target_users IS NULL 
    OR auth.uid()::text = ANY(target_users)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (target_plans IS NULL OR p.plan::text = ANY(target_plans))
    )
  )
);

-- 10. Update database functions to use secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role);
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_loyalty_points(user_uuid UUID, points_amount INTEGER, activity_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_points INTEGER;
  new_level TEXT;
BEGIN
  -- Insert or update user points
  INSERT INTO public.user_loyalty_points (user_id, points, total_earned)
  VALUES (user_uuid, points_amount, points_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    points = public.user_loyalty_points.points + points_amount,
    total_earned = public.user_loyalty_points.total_earned + points_amount,
    updated_at = NOW();
  
  -- Get current points
  SELECT points INTO current_points
  FROM public.user_loyalty_points
  WHERE user_id = user_uuid;
  
  -- Calculate new level
  IF current_points >= 10000 THEN
    new_level := 'diamond';
  ELSIF current_points >= 5000 THEN
    new_level := 'gold';
  ELSIF current_points >= 2000 THEN
    new_level := 'silver';
  ELSE
    new_level := 'bronze';
  END IF;
  
  -- Update level if changed
  UPDATE public.user_loyalty_points
  SET level = new_level
  WHERE user_id = user_uuid AND level != new_level;
  
  -- Update profile
  UPDATE public.profiles
  SET loyalty_level = new_level, total_points = current_points
  WHERE user_id = user_uuid;
END;
$function$;