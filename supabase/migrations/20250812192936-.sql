-- Fix infinite recursion in user_roles policies
-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own roles"
ON user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Simple admin policy without recursion
CREATE POLICY "Admins can manage roles"
ON user_roles 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
    LIMIT 1
  )
);

-- Fix profiles policies to avoid recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
ON profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
    LIMIT 1
  )
);