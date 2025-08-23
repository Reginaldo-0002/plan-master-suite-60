-- Fix RLS policy for content table to ensure ALL authenticated users can see content based on their plan
-- The current policy has a complex condition that may be blocking some users

-- Drop the existing complex policy
DROP POLICY IF EXISTS "Users can view content based on plan access" ON content;

-- Create a simplified, working policy that ensures all authenticated users can see content
CREATE POLICY "Users can view content based on plan access" 
ON content 
FOR SELECT 
TO authenticated
USING (
  -- Content must be active and published
  is_active = true 
  AND status = 'published'
  AND (
    -- Free content is accessible to everyone
    required_plan = 'free'
    OR 
    -- For paid content, check user's plan
    (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.user_id = auth.uid() 
        AND (
          (required_plan = 'vip' AND p.plan IN ('vip', 'pro'))
          OR 
          (required_plan = 'pro' AND p.plan = 'pro')
        )
      )
    )
  )
  -- And not explicitly hidden from user
  AND NOT EXISTS (
    SELECT 1 FROM content_visibility_rules cvr 
    WHERE cvr.content_id = content.id 
    AND cvr.user_id = auth.uid() 
    AND cvr.is_visible = false
  )
);

-- Also ensure the content_topics policy is correct
DROP POLICY IF EXISTS "Users can view topics based on content plan access" ON content_topics;

CREATE POLICY "Users can view topics based on content plan access" 
ON content_topics 
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
    AND c.status = 'published'
    AND (
      c.required_plan = 'free'
      OR 
      (c.required_plan = 'vip' AND p.plan IN ('vip', 'pro'))
      OR 
      (c.required_plan = 'pro' AND p.plan = 'pro')
    )
  )
);