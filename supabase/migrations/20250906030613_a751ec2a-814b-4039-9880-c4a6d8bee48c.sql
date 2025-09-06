-- Add missing columns to profiles to match application queries and RPCs
BEGIN;

-- 1) Add pix_key (used for withdrawals PIX key) if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pix_key text;

-- 2) Add referral_earnings (used across admin and dashboard) if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_earnings numeric DEFAULT 0;

-- Ensure not null with a default for robust aggregations
UPDATE public.profiles SET referral_earnings = 0 WHERE referral_earnings IS NULL;
ALTER TABLE public.profiles ALTER COLUMN referral_earnings SET NOT NULL;

-- Optional: comment for documentation
COMMENT ON COLUMN public.profiles.pix_key IS 'User PIX key for payouts (sensitive).';
COMMENT ON COLUMN public.profiles.referral_earnings IS 'Accumulated referral earnings in BRL.';

COMMIT;