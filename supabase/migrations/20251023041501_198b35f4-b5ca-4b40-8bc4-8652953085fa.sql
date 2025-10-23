-- Security Fix: Tighten webhook_events RLS policies to prevent manipulation

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "System can insert webhook events" ON webhook_events;
DROP POLICY IF EXISTS "System can update webhook events" ON webhook_events;

-- Create restrictive policy for inserting webhook events
-- Only allow inserts from service role (edge functions) with verified=true
CREATE POLICY "Service role can insert verified webhook events"
ON webhook_events
FOR INSERT
TO service_role
WITH CHECK (verified = true);

-- Create restrictive policy for updating webhook events
-- Only allow service role to update status and processing fields
CREATE POLICY "Service role can update webhook processing status"
ON webhook_events
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view all webhook events for monitoring
CREATE POLICY "Admins can view all webhook events"
ON webhook_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Add index for faster webhook event lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_verified ON webhook_events(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status, created_at);

-- Add comment
COMMENT ON TABLE webhook_events IS 'Stores incoming webhook events from payment platforms. Only service role can insert/update. All events must be verified via HMAC signatures.';