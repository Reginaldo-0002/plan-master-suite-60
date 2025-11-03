-- Fix RLS policy for content_topics to include premium plan access
DROP POLICY IF EXISTS "Users can view topics based on content plan access" ON content_topics;

CREATE POLICY "Users can view topics based on content plan access"
ON content_topics
FOR SELECT
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM content c
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE c.id = content_topics.content_id
    AND c.is_active = true
    AND c.status = 'published'
    AND (
      c.required_plan = 'free'
      OR (c.required_plan = 'vip' AND p.plan IN ('vip', 'pro', 'premium'))
      OR (c.required_plan = 'pro' AND p.plan IN ('pro', 'premium'))
      OR (c.required_plan = 'premium' AND p.plan = 'premium')
    )
  )
);

-- Drop the policy that depends on the function first
DROP POLICY IF EXISTS "Users can only view accessible resources" ON topic_resources;

-- Drop and recreate user_has_resource_access function to include premium plan
DROP FUNCTION IF EXISTS user_has_resource_access(text, boolean) CASCADE;

CREATE FUNCTION user_has_resource_access(
  resource_required_plan text,
  resource_is_premium boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_plan_value text;
BEGIN
  SELECT plan::text INTO user_plan_value
  FROM profiles
  WHERE user_id = auth.uid();
  
  -- Premium users have access to everything
  IF user_plan_value = 'premium' THEN
    RETURN true;
  END IF;
  
  -- Pro users have access to pro, vip, and free
  IF user_plan_value = 'pro' AND resource_required_plan IN ('free', 'vip', 'pro') THEN
    RETURN true;
  END IF;
  
  -- VIP users have access to vip and free
  IF user_plan_value = 'vip' AND resource_required_plan IN ('free', 'vip') THEN
    RETURN true;
  END IF;
  
  -- Free users only have access to free
  IF user_plan_value = 'free' AND resource_required_plan = 'free' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Recreate the policy that depends on the function
CREATE POLICY "Users can only view accessible resources"
ON topic_resources
FOR SELECT
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL 
  AND user_has_resource_access(required_plan, is_premium)
);