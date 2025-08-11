-- Fix admin_settings table to prevent duplicate key error for rules
UPDATE admin_settings 
SET key = 'site_rules' 
WHERE key = 'platform_rules';

-- Ensure we use consistent key for rules
DELETE FROM admin_settings 
WHERE key = 'platform_rules' AND EXISTS (
  SELECT 1 FROM admin_settings WHERE key = 'site_rules'
);

-- Add unique constraint if not exists
ALTER TABLE admin_settings 
ADD CONSTRAINT admin_settings_key_unique UNIQUE (key);