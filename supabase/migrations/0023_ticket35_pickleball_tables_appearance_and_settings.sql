-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0023: Ticket-35 Pickleball Tables,
-- Agent Appearance JSONB & Office Settings (Shadow Quality / Auto-Start)
-- 100% Idempotent & Non-Destructive (No DROP, No CASCADE).
-- =============================================================================

-- 1. Agent Appearance JSONB column on public.office_agents
ALTER TABLE IF EXISTS public.office_agents
  ADD COLUMN IF NOT EXISTS appearance jsonb DEFAULT '{}'::jsonb;

-- 2. Pickleball Matches table
CREATE TABLE IF NOT EXISTS public.office_pickleball_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'idle',
  team_a jsonb NOT NULL DEFAULT '[]'::jsonb,
  team_b jsonb NOT NULL DEFAULT '[]'::jsonb,
  slots jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_a integer NOT NULL DEFAULT 0,
  score_b integer NOT NULL DEFAULT 0,
  server_agent_id text,
  seed bigint NOT NULL DEFAULT 35001,
  demo boolean NOT NULL DEFAULT false
);

-- 3. Pickleball Sideline Bench Queue (capacity 8 enforced in app/DB)
CREATE TABLE IF NOT EXISTS public.office_pickleball_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  position integer NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  reason text
);

-- 4. Pickleball Match Events Log
CREATE TABLE IF NOT EXISTS public.office_pickleball_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  match_id uuid REFERENCES public.office_pickleball_matches(id) ON DELETE SET NULL,
  kind text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 5. Enable RLS & Permissive Read/Write Policies (matching office_* tables)
ALTER TABLE public.office_pickleball_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_pickleball_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_pickleball_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_pickleball_matches' AND policyname = 'Allow public read/write on office_pickleball_matches') THEN
    CREATE POLICY "Allow public read/write on office_pickleball_matches" ON public.office_pickleball_matches FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_pickleball_queue' AND policyname = 'Allow public read/write on office_pickleball_queue') THEN
    CREATE POLICY "Allow public read/write on office_pickleball_queue" ON public.office_pickleball_queue FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_pickleball_events' AND policyname = 'Allow public read/write on office_pickleball_events') THEN
    CREATE POLICY "Allow public read/write on office_pickleball_events" ON public.office_pickleball_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Default Ticket-35 settings in public.office_settings if present
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'office_settings' AND table_schema = 'public') THEN
    INSERT INTO public.office_settings (key, value)
    VALUES
      ('auto_start_pickleball', 'true'::jsonb),
      ('shadow_quality', '"medium"'::jsonb),
      ('camera_preset', '"OVERVIEW"'::jsonb)
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;
