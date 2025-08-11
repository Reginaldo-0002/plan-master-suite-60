-- Clean up duplicate keys and fix rules storage
DELETE FROM admin_settings WHERE key = 'platform_rules';

-- Fix the rules key to use consistent naming
UPDATE admin_settings SET key = 'site_rules' WHERE key IN ('platform_rules', 'site_rules');

-- Ensure we have the correct structure for JSON content
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE key = 'site_rules') THEN
    INSERT INTO admin_settings (key, value) VALUES ('site_rules', '{"content": "Regras ainda não foram configuradas pelo administrador."}');
  END IF;
END $$;