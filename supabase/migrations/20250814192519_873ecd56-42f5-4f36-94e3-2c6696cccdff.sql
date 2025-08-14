-- Fix Security Definer View issue by creating a standard view without security_barrier

-- Drop the existing view 
DROP VIEW IF EXISTS public.user_accessible_resources;

-- Create a standard view without any security_barrier property
CREATE VIEW public.user_accessible_resources AS
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
  -- Conditionally return URL based on user access using the secure function
  CASE 
    WHEN NOT tr.is_premium THEN tr.resource_url
    WHEN tr.is_premium AND auth.uid() IS NOT NULL THEN
      get_authorized_resource_url(tr.id, auth.uid())
    ELSE NULL
  END as resource_url
FROM topic_resources tr
WHERE tr.is_active = true
  AND auth.uid() IS NOT NULL
  AND (
    -- Apply the same access control logic as RLS policies
    NOT tr.is_premium OR
    (
      tr.is_premium AND
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = auth.uid() AND
        (
          (tr.required_plan = 'free') OR
          (tr.required_plan = 'vip' AND p.plan IN ('vip', 'pro')) OR
          (tr.required_plan = 'pro' AND p.plan = 'pro')
        )
      )
    )
  );

-- Grant access to the view for authenticated users
GRANT SELECT ON public.user_accessible_resources TO authenticated;