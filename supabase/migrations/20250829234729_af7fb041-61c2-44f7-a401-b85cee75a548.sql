-- Ensure users cannot see content hidden for them by enabling SELECT on their own visibility rules
-- This allows the RLS policy on content to correctly evaluate NOT EXISTS against content_visibility_rules

-- Create SELECT policy for users to read their own visibility rules
CREATE POLICY "Users can read their own visibility rules"
ON public.content_visibility_rules
FOR SELECT
TO authenticated
USING (user_id = auth.uid());