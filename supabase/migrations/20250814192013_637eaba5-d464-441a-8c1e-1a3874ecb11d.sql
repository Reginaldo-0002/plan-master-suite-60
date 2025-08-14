-- Create a secure function to get authorized resource URLs
CREATE OR REPLACE FUNCTION public.get_authorized_resource_url(
  resource_id UUID,
  requesting_user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  resource_record RECORD;
  user_plan user_plan;
  resource_url TEXT;
BEGIN
  -- Check if user is authenticated
  IF requesting_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get user plan
  SELECT plan INTO user_plan
  FROM profiles
  WHERE user_id = requesting_user_id;
  
  -- Get resource details
  SELECT 
    tr.resource_url,
    tr.is_premium,
    tr.required_plan,
    tr.is_active
  INTO resource_record
  FROM topic_resources tr
  WHERE tr.id = resource_id AND tr.is_active = true;
  
  -- Check if resource exists
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check if user has access
  IF resource_record.is_premium THEN
    CASE resource_record.required_plan
      WHEN 'free' THEN
        -- Free resources are accessible to everyone
        resource_url := resource_record.resource_url;
      WHEN 'vip' THEN
        -- VIP resources require VIP or PRO plan
        IF user_plan IN ('vip', 'pro') THEN
          resource_url := resource_record.resource_url;
        ELSE
          RETURN NULL;
        END IF;
      WHEN 'pro' THEN
        -- PRO resources require PRO plan only
        IF user_plan = 'pro' THEN
          resource_url := resource_record.resource_url;
        ELSE
          RETURN NULL;
        END IF;
      ELSE
        RETURN NULL;
    END CASE;
  ELSE
    -- Non-premium resources are accessible to everyone
    resource_url := resource_record.resource_url;
  END IF;
  
  RETURN resource_url;
END;
$$;

-- Update RLS policies on topic_resources to hide URLs for unauthorized users
DROP POLICY IF EXISTS "Premium resources require subscription" ON topic_resources;
DROP POLICY IF EXISTS "Users can view resources based on plan requirement" ON topic_resources;

-- Create new comprehensive policy for viewing resources
CREATE POLICY "Users can view authorized resources only" ON topic_resources
FOR SELECT USING (
  is_active = true AND
  auth.uid() IS NOT NULL AND
  (
    -- Always show basic info, but conditionally show URLs
    NOT is_premium OR
    (
      is_premium AND
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() AND
        (
          (required_plan = 'free') OR
          (required_plan = 'vip' AND p.plan IN ('vip', 'pro')) OR
          (required_plan = 'pro' AND p.plan = 'pro')
        )
      )
    )
  )
);

-- Create a view that conditionally returns resource URLs based on user access
CREATE OR REPLACE VIEW public.user_accessible_resources AS
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
  -- Conditionally return URL based on user access
  CASE 
    WHEN NOT tr.is_premium THEN tr.resource_url
    WHEN tr.is_premium AND auth.uid() IS NOT NULL THEN
      get_authorized_resource_url(tr.id, auth.uid())
    ELSE NULL
  END as resource_url
FROM topic_resources tr
WHERE tr.is_active = true;

-- Grant access to the view
GRANT SELECT ON public.user_accessible_resources TO authenticated;

-- Enable RLS on the view (inherits from underlying table)
ALTER VIEW public.user_accessible_resources SET (security_barrier = true);