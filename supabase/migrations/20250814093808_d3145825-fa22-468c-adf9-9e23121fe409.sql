-- Fix critical security vulnerability: Profiles table publicly readable
-- Currently ANY authenticated user can view ALL user profiles and sensitive data

-- Drop the dangerous policy that allows any authenticated user to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create secure policies that only allow users to view their own data
-- Users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all profiles (needed for admin functionality)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::public.app_role
  )
);

-- The existing policies for INSERT, UPDATE, DELETE should remain as they are secure:
-- "Users can insert their own profile" - allows users to create their own profile only
-- "Users can update their own profile" - allows users to update only their own profile  
-- "Admins can update user plans" - allows admins to manage user plans
-- "Admins can delete profiles" - allows admins to delete profiles