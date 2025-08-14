-- Fix critical security vulnerability: Restrict admin_settings access to admins only
-- Currently ALL authenticated users can read sensitive admin configuration data

-- Drop the overly permissive policy that allows any user to view admin settings
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.admin_settings;

-- Create a secure policy that only allows admin users to view admin settings
CREATE POLICY "Only admins can view admin settings" 
ON public.admin_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::public.app_role
  )
);

-- Ensure the admin management policy is still in place
-- (This should already exist but let's make sure)
CREATE POLICY "Admins can manage settings" 
ON public.admin_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::public.app_role
  )
);