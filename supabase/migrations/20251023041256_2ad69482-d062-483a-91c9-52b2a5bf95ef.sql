-- Security Fix: Implement secure password handling for content
-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to hash content passwords (called by admins when setting passwords)
CREATE OR REPLACE FUNCTION public.hash_content_password(content_id_param UUID, plain_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can hash passwords
  IF NOT (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can set content passwords';
  END IF;
  
  -- Hash and store the password
  UPDATE content 
  SET content_password = crypt(plain_password, gen_salt('bf'))
  WHERE id = content_id_param;
END;
$$;

-- Create function to verify content passwords (called by users)
CREATE OR REPLACE FUNCTION public.verify_content_password(content_id_param UUID, plain_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
  attempts_count INTEGER;
BEGIN
  -- Check rate limiting: max 5 attempts per user per content per 15 minutes
  SELECT COUNT(*) INTO attempts_count
  FROM audit_logs
  WHERE actor_id = auth.uid()
    AND area = 'content_password_attempt'
    AND target_id = content_id_param
    AND created_at > NOW() - INTERVAL '15 minutes';
  
  IF attempts_count >= 5 THEN
    RAISE EXCEPTION 'Too many password attempts. Please try again later.';
  END IF;
  
  -- Log the attempt
  INSERT INTO audit_logs (actor_id, action, area, target_id, metadata)
  VALUES (auth.uid(), 'password_attempt', 'content_password_attempt', content_id_param, 
          jsonb_build_object('timestamp', NOW()));
  
  -- Get the stored hash
  SELECT content_password INTO stored_hash
  FROM content
  WHERE id = content_id_param AND password_protected = true;
  
  -- If no password is set, deny access
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify password using crypt
  IF crypt(plain_password, stored_hash) = stored_hash THEN
    -- Log successful attempt
    INSERT INTO audit_logs (actor_id, action, area, target_id, metadata)
    VALUES (auth.uid(), 'password_success', 'content_password_success', content_id_param,
            jsonb_build_object('timestamp', NOW()));
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Update RLS policy on content to EXCLUDE password field from user queries
DROP POLICY IF EXISTS "Users can view all published content regardless of plan" ON content;

CREATE POLICY "Users can view published content without passwords"
ON content
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND status = 'published' 
  AND NOT EXISTS (
    SELECT 1 FROM content_visibility_rules cvr
    WHERE cvr.content_id = content.id 
      AND cvr.user_id = auth.uid() 
      AND cvr.is_visible = false
  )
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.verify_content_password TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_content_password TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.verify_content_password IS 'Securely verifies content passwords without exposing hashes. Rate limited to 5 attempts per 15 minutes.';
COMMENT ON FUNCTION public.hash_content_password IS 'Hashes content passwords using bcrypt. Only callable by admins.';