-- Overload for platform_enum → call text implementation
CREATE OR REPLACE FUNCTION public.normalize_webhook_payload(provider_input platform_enum, payload_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN public.normalize_webhook_payload((provider_input::text), payload_input);
END;
$$;