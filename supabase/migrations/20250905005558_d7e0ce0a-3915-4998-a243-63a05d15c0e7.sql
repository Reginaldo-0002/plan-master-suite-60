-- Fix webhook processing to update user plan in real time and avoid ambiguous column errors
-- Create or replace the RPC used by edge webhooks
CREATE OR REPLACE FUNCTION public.process_webhook_event(event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evt RECORD;
  v_now timestamptz := now();
  v_type text;
  v_user_email text;
  v_plan_slug text;
  v_user_id uuid;
BEGIN
  -- Lock and read event
  SELECT id, provider, status, canonical_event
  INTO v_evt
  FROM public.webhook_events
  WHERE id = process_webhook_event.event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Webhook event not found (%).', process_webhook_event.event_id;
  END IF;

  -- Idempotency
  IF v_evt.status = 'processed' THEN
    RETURN jsonb_build_object('status','already_processed','event_id', v_evt.id);
  END IF;

  -- Determine event type (canonical or provider specific)
  v_type := COALESCE(
    v_evt.canonical_event->>'type',
    v_evt.canonical_event->>'event_type'
  );

  IF v_type IS NULL AND v_evt.provider = 'kiwify' THEN
    IF (v_evt.canonical_event->>'order_status') IN ('paid','approved')
       OR (v_evt.canonical_event->>'webhook_event_type') IN ('order_approved','order.paid') THEN
      v_type := 'payment_succeeded';
    END IF;
  END IF;

  -- Only process payment success
  IF v_type IS DISTINCT FROM 'payment_succeeded' THEN
    UPDATE public.webhook_events SET status = 'discarded', processed_at = v_now WHERE id = v_evt.id;
    RETURN jsonb_build_object('status','discarded','reason','non_payment_event','event_id', v_evt.id);
  END IF;

  -- Extract essentials
  v_user_email := COALESCE(
    v_evt.canonical_event->>'user_email',
    v_evt.canonical_event->>'customer_email',
    v_evt.canonical_event->'Customer'->>'email'
  );

  v_plan_slug := COALESCE(
    lower(v_evt.canonical_event->>'plan_slug'),
    lower(v_evt.canonical_event->'Subscription'->'plan'->>'name'),
    lower(v_evt.canonical_event->>'plan')
  );

  IF v_user_email IS NULL THEN
    UPDATE public.webhook_events SET status = 'failed', processed_at = v_now WHERE id = v_evt.id;
    RETURN jsonb_build_object('status','failed','error','missing_email','event_id', v_evt.id);
  END IF;

  -- Resolve user_id via auth.users
  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower(v_user_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    UPDATE public.webhook_events SET status = 'failed', processed_at = v_now WHERE id = v_evt.id;
    RETURN jsonb_build_object('status','failed','error','user_not_found','email', v_user_email,'event_id', v_evt.id);
  END IF;

  -- Update profile plan in real time
  UPDATE public.profiles
  SET plan = CASE WHEN v_plan_slug IN ('free','vip','pro') THEN v_plan_slug::user_plan ELSE plan END,
      plan_status = 'active',
      plan_start_date = v_now,
      plan_end_date = NULL,
      updated_at = v_now
  WHERE user_id = v_user_id;

  -- Mark event processed
  UPDATE public.webhook_events
  SET status = 'processed', processed_at = v_now
  WHERE id = v_evt.id;

  -- Best-effort: store resolved user_id on the event for easier realtime filtering (if column exists)
  BEGIN
    UPDATE public.webhook_events SET user_id = v_user_id WHERE id = v_evt.id;
  EXCEPTION WHEN undefined_column THEN
    -- ignore if column doesn't exist
    NULL;
  END;

  RETURN jsonb_build_object('status','processed','user_id', v_user_id,'plan_slug', v_plan_slug,'event_id', v_evt.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_webhook_event(uuid) TO anon, authenticated, service_role;