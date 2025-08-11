-- Fix content table security vulnerability by implementing proper authentication and plan-based access control

-- Drop the existing public access policy that exposes business content
DROP POLICY IF EXISTS "Everyone can view active content" ON public.content;

-- Create authenticated user access policy with plan-based restrictions  
CREATE POLICY "Users can view content based on their plan and authentication"
ON public.content
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (
    required_plan = 'free'
    OR (
      required_plan = 'vip' 
      AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND plan IN ('vip', 'pro')
      )
    )
    OR (
      required_plan = 'pro' 
      AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND plan = 'pro'
      )
    )
  )
);

-- Add admin access policy for content management
CREATE POLICY "Admins can manage all content"
ON public.content
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);