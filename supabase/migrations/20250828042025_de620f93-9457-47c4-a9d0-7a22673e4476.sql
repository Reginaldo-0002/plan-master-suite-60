-- Fix critical security vulnerability: Premium content accessible without payment
-- Update RLS policy to properly check user plan against content required_plan

-- Drop the existing insecure policy
DROP POLICY IF EXISTS "Users can view all published content regardless of plan" ON public.content;

-- Create new secure policy that enforces plan-based access control
CREATE POLICY "Users can view content based on their plan level" ON public.content
FOR SELECT
TO authenticated
USING (
  (is_active = true) 
  AND (status = 'published'::text) 
  AND (
    -- Check if content is not hidden for this specific user
    NOT (EXISTS (
      SELECT 1
      FROM content_visibility_rules cvr
      WHERE cvr.content_id = content.id 
        AND cvr.user_id = auth.uid() 
        AND cvr.is_visible = false
    ))
  )
  AND (
    -- Plan-based access control: check if user's plan allows access to this content
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND (
          -- Free content: accessible to all plans
          (content.required_plan = 'free'::user_plan)
          OR
          -- VIP content: accessible to VIP and PRO users
          (content.required_plan = 'vip'::user_plan AND p.plan IN ('vip'::user_plan, 'pro'::user_plan))
          OR
          -- PRO content: accessible only to PRO users
          (content.required_plan = 'pro'::user_plan AND p.plan = 'pro'::user_plan)
        )
    )
  )
);