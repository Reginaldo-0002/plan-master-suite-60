-- Fix security vulnerability: Protect premium content based on user subscription
-- Update RLS policies for content_topics and topic_resources

-- First, drop existing policies
DROP POLICY IF EXISTS "Everyone can view active topics" ON public.content_topics;
DROP POLICY IF EXISTS "Everyone can view active resources" ON public.topic_resources;

-- Create secure policies for content_topics
-- Users can only see topics if they have the required plan for the parent content
CREATE POLICY "Users can view topics based on content plan requirement" 
ON public.content_topics 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.content c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.id = content_topics.content_id
    AND c.is_active = true
    AND (
      c.required_plan = 'free'
      OR (c.required_plan = 'vip' AND p.plan IN ('vip', 'pro'))
      OR (c.required_plan = 'pro' AND p.plan = 'pro')
    )
  )
);

-- Create secure policies for topic_resources  
-- Users can only see resources if they have the required plan
CREATE POLICY "Users can view resources based on plan requirement" 
ON public.topic_resources 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (
      topic_resources.required_plan = 'free'
      OR (topic_resources.required_plan = 'vip' AND p.plan IN ('vip', 'pro'))
      OR (topic_resources.required_plan = 'pro' AND p.plan = 'pro')
    )
  )
);

-- Also ensure premium resources are properly marked
-- Update any unmarked premium resources
UPDATE public.topic_resources 
SET is_premium = true, required_plan = 'vip'
WHERE resource_type IN ('video', 'pdf') 
AND is_premium = false 
AND required_plan = 'free';

-- Add policy to prevent access to premium resources for free users
CREATE POLICY "Premium resources require subscription" 
ON public.topic_resources 
FOR SELECT 
USING (
  is_active = true 
  AND (
    is_premium = false 
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        (is_premium = true AND p.plan IN ('vip', 'pro'))
      )
    )
  )
);