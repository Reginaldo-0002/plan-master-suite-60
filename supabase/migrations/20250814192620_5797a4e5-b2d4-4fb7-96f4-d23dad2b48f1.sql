-- Check for any remaining security definer views and resolve the issue properly

-- First, let's see what views might be causing the issue
-- The error might be caused by functions or other database objects

-- Create a simple table-based approach instead of using views with potential security issues
-- Drop the view and create a simple function instead

DROP VIEW IF EXISTS public.user_accessible_resources;

-- Create a simple function that returns only authorized resources
CREATE OR REPLACE FUNCTION public.get_user_resources(topic_id_param UUID)
RETURNS TABLE (
  id UUID,
  topic_id UUID,
  title TEXT,
  description TEXT,
  resource_type TEXT,
  thumbnail_url TEXT,
  resource_order INTEGER,
  is_premium BOOLEAN,
  required_plan TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  resource_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_plan user_plan;
BEGIN
  -- Get current user's plan
  SELECT plan INTO user_plan
  FROM profiles
  WHERE user_id = auth.uid();
  
  -- Return resources based on user's access level
  RETURN QUERY
  SELECT 
    tr.id,
    tr.topic_id,
    tr.title,
    tr.description,
    tr.resource_type,
    tr.thumbnail_url,
    tr.resource_order,
    tr.is_premium,
    tr.required_plan,
    tr.is_active,
    tr.created_at,
    tr.updated_at,
    -- Only return URL if user has access
    CASE 
      WHEN NOT tr.is_premium THEN tr.resource_url
      WHEN tr.is_premium AND (
        (tr.required_plan = 'free') OR
        (tr.required_plan = 'vip' AND user_plan IN ('vip', 'pro')) OR
        (tr.required_plan = 'pro' AND user_plan = 'pro')
      ) THEN tr.resource_url
      ELSE NULL
    END as resource_url
  FROM topic_resources tr
  WHERE tr.topic_id = topic_id_param
    AND tr.is_active = true
  ORDER BY tr.resource_order;
END;
$$;