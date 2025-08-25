-- Fix 1: Ensure plan_expiration_queue supports upserts on user_id
-- Deduplicate existing rows to allow a UNIQUE constraint
WITH dups AS (
  SELECT user_id, COUNT(*) cnt
  FROM public.plan_expiration_queue
  GROUP BY user_id
  HAVING COUNT(*) > 1
)
DELETE FROM public.plan_expiration_queue pq
USING public.plan_expiration_queue pq2
WHERE pq.user_id = pq2.user_id
  AND pq.ctid < pq2.ctid
  AND EXISTS (SELECT 1 FROM dups WHERE dups.user_id = pq.user_id);

-- Add UNIQUE constraint on user_id to match ON CONFLICT (user_id)
ALTER TABLE public.plan_expiration_queue
  ADD CONSTRAINT plan_expiration_queue_user_id_key UNIQUE (user_id);

-- Fix 2: Make admin_chat_queue.chat_session_id cascade on chat_sessions delete
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_chat_queue_chat_session_id_fkey'
      AND table_name = 'admin_chat_queue'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.admin_chat_queue
      DROP CONSTRAINT admin_chat_queue_chat_session_id_fkey;
  END IF;
END $$;

ALTER TABLE public.admin_chat_queue
  ADD CONSTRAINT admin_chat_queue_chat_session_id_fkey
  FOREIGN KEY (chat_session_id)
  REFERENCES public.chat_sessions(id)
  ON DELETE CASCADE;

-- Optional safety: index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_chat_queue_chat_session_id
  ON public.admin_chat_queue(chat_session_id);
