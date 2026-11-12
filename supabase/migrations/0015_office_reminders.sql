-- ============================================================================
-- Migration 0015: Jarvis Reminders, Reminder Events & Push Subscriptions (Phase K8)
--
-- Idempotent schema for:
-- 1. office_reminders: Scheduled, recurring, and event-triggered reminders
-- 2. office_reminder_events: Audit log of delivery attempts, ringing, answers, snooze
-- 3. office_push_subscriptions: Web push notification endpoints and VAPID keys
-- ============================================================================

-- 1. Create office_reminders table
CREATE TABLE IF NOT EXISTS public.office_reminders (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'voice' CHECK (created_by IN ('voice', 'text', 'ui', 'jarvis')),
  title text NOT NULL,
  message text NOT NULL,
  trigger_kind text NOT NULL DEFAULT 'time' CHECK (trigger_kind IN ('time', 'recurring', 'task_complete', 'approval_waiting')),
  due_at timestamptz,
  recurrence jsonb NOT NULL DEFAULT '{}'::jsonb,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  channels jsonb NOT NULL DEFAULT '["in_app_call", "push"]'::jsonb,
  escalation jsonb NOT NULL DEFAULT '{"repeat_after_mins": 2, "push_fallback": true}'::jsonb,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'due', 'ringing', 'answered', 'acknowledged', 'snoozed', 'missed', 'failed', 'cancelled', 'done')),
  last_delivery_at timestamptz,
  source_message_id text,
  next_due_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create office_reminder_events table
CREATE TABLE IF NOT EXISTS public.office_reminder_events (
  id text PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  ts_pht text NOT NULL,
  reminder_id text REFERENCES public.office_reminders(id) ON DELETE CASCADE,
  occurrence_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('scheduled', 'claimed', 'ringing', 'answered', 'declined', 'acknowledged', 'snoozed', 'escalated', 'push_sent', 'channel_sent', 'missed', 'failed', 'cancelled', 'edited')),
  channel text,
  detail text,
  error text,
  tab_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create office_push_subscriptions table
CREATE TABLE IF NOT EXISTS public.office_push_subscriptions (
  id text PRIMARY KEY,
  endpoint text UNIQUE NOT NULL,
  keys jsonb NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_ok_at timestamptz,
  revoked boolean NOT NULL DEFAULT false
);

-- Indexes for high-performance scheduling and queries
CREATE INDEX IF NOT EXISTS idx_office_reminders_status_due ON public.office_reminders(status, due_at);
CREATE INDEX IF NOT EXISTS idx_office_reminders_next_due ON public.office_reminders(next_due_at);
CREATE INDEX IF NOT EXISTS idx_office_reminder_events_reminder ON public.office_reminder_events(reminder_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_office_reminder_events_occurrence ON public.office_reminder_events(occurrence_key);

-- Enable RLS
ALTER TABLE public.office_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_reminder_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to office_reminders' AND tablename = 'office_reminders') THEN
    CREATE POLICY "Allow all access to office_reminders" ON public.office_reminders FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to office_reminder_events' AND tablename = 'office_reminder_events') THEN
    CREATE POLICY "Allow all access to office_reminder_events" ON public.office_reminder_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access to office_push_subscriptions' AND tablename = 'office_push_subscriptions') THEN
    CREATE POLICY "Allow all access to office_push_subscriptions" ON public.office_push_subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime publication
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.office_reminders; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.office_reminder_events; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.office_push_subscriptions; EXCEPTION WHEN duplicate_object THEN END;
  END IF;
END $$;
