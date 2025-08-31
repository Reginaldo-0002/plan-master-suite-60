-- Fix RLS policies for content topics and resources to allow soft delete
-- Drop existing policies that may be conflicting
DROP POLICY IF EXISTS "Users can update their own content topics" ON public.content_topics;
DROP POLICY IF EXISTS "Users can update their own topic resources" ON public.topic_resources;

-- Create proper UPDATE policies for content topics
CREATE POLICY "Users can update content topics" 
ON public.content_topics 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Create proper UPDATE policies for topic resources
CREATE POLICY "Users can update topic resources" 
ON public.topic_resources 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Ensure DELETE policies exist for hard delete if needed
CREATE POLICY "Users can delete content topics" 
ON public.content_topics 
FOR DELETE 
TO authenticated 
USING (true);

CREATE POLICY "Users can delete topic resources" 
ON public.topic_resources 
FOR DELETE 
TO authenticated 
USING (true);