-- Drop the existing insecure policy
DROP POLICY IF EXISTS "Users can view all active content" ON public.content;

-- Create a new secure policy that checks user plan access
CREATE POLICY "Users can view content based on plan access" 
ON public.content 
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND status = 'published'::text 
  AND (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    AND (
      -- Allow free content to everyone
      required_plan = 'free'::user_plan
      OR 
      -- Check if user has sufficient plan level
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.user_id = auth.uid() 
        AND (
          (required_plan = 'vip'::user_plan AND p.plan IN ('vip'::user_plan, 'pro'::user_plan))
          OR 
          (required_plan = 'pro'::user_plan AND p.plan = 'pro'::user_plan)
        )
      )
    )
  )
  -- Respect content visibility rules
  AND NOT EXISTS (
    SELECT 1 FROM content_visibility_rules cvr
    WHERE cvr.content_id = content.id 
    AND cvr.user_id = auth.uid() 
    AND cvr.is_visible = false
  )
);

-- Add security for topic_resources table as well
DROP POLICY IF EXISTS "Users can view topics based on content plan" ON public.content_topics;

CREATE POLICY "Users can view topics based on content plan access" 
ON public.content_topics 
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM content c
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE c.id = content_topics.content_id 
    AND c.is_active = true 
    AND c.status = 'published'::text
    AND (
      c.required_plan = 'free'::user_plan
      OR 
      (c.required_plan = 'vip'::user_plan AND p.plan IN ('vip'::user_plan, 'pro'::user_plan))
      OR 
      (c.required_plan = 'pro'::user_plan AND p.plan = 'pro'::user_plan)
    )
  )
);

-- Secure topic_resources table
DROP POLICY IF EXISTS "Users can view topics based on content plan" ON public.topic_resources;

CREATE POLICY "Users can view resources based on plan access" 
ON public.topic_resources 
FOR SELECT 
TO authenticated
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL 
  AND (
    NOT is_premium 
    OR EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND (
        (required_plan = 'free'::text)
        OR 
        (required_plan = 'vip'::text AND p.plan IN ('vip'::user_plan, 'pro'::user_plan))
        OR 
        (required_plan = 'pro'::text AND p.plan = 'pro'::user_plan)
      )
    )
  )
);