-- EasyUp Software Solution HQ - Migration 0011: Agent Needs Engine, Plans, Break Requests & Activity Log
-- Branch: office-v3 (Phase K3)

-- 1. Needs Configuration Table
CREATE TABLE IF NOT EXISTS public.office_needs_config (
  id text PRIMARY KEY DEFAULT 'default',
  rates jsonb NOT NULL,
  thresholds jsonb NOT NULL,
  circadian jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default configuration if not present
INSERT INTO public.office_needs_config (id, rates, thresholds, circadian)
VALUES (
  'default',
  '{
    "energy_drain_work_per_hr": 7.5,
    "energy_drain_idle_per_hr": 3.0,
    "energy_restore_nap_per_hr": 35.0,
    "energy_restore_sleep_per_hr": 20.0,
    "hunger_grow_per_hr": 8.0,
    "thirst_grow_per_hr": 10.0,
    "bladder_fill_per_hr": 9.0,
    "caffeine_decay_per_hr": 25.0,
    "sleep_debt_accrual_per_hr": 8.0
  }'::jsonb,
  '{
    "energy_critical": 20.0,
    "energy_low": 35.0,
    "hunger_critical": 20.0,
    "hunger_hungry": 40.0,
    "thirst_critical": 20.0,
    "thirst_thirsty": 40.0,
    "bladder_urgent": 25.0,
    "morale_low": 35.0
  }'::jsonb,
  '{
    "morning_peak_start": 9.0,
    "morning_peak_end": 11.5,
    "post_lunch_dip_start": 13.0,
    "post_lunch_dip_end": 15.0,
    "night_rest_start": 22.0,
    "night_rest_end": 6.0
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  rates = EXCLUDED.rates,
  thresholds = EXCLUDED.thresholds,
  circadian = EXCLUDED.circadian,
  updated_at = now();

-- 2. Agent Needs Table
CREATE TABLE IF NOT EXISTS public.office_agent_needs (
  agent_id text PRIMARY KEY REFERENCES public.office_agents(id) ON DELETE CASCADE,
  energy float NOT NULL DEFAULT 85.0,
  hunger float NOT NULL DEFAULT 85.0,
  thirst float NOT NULL DEFAULT 85.0,
  bladder float NOT NULL DEFAULT 90.0,
  health float NOT NULL DEFAULT 95.0,
  morale float NOT NULL DEFAULT 85.0,
  caffeine float NOT NULL DEFAULT 0.0,
  sleep_debt float NOT NULL DEFAULT 0.0,
  base_ts timestamptz NOT NULL DEFAULT now(),
  traits jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'working',
  state_until timestamptz,
  last_meal_at timestamptz,
  last_sleep_at timestamptz,
  last_gym_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Agent Break Requests Table
CREATE TABLE IF NOT EXISTS public.office_break_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL REFERENCES public.office_agents(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('rest', 'meal', 'coffee', 'cr', 'gym', 'walk')),
  reason text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'expired')),
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Agent Plan Table
CREATE TABLE IF NOT EXISTS public.office_agent_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL REFERENCES public.office_agents(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('work', 'eat', 'drink', 'coffee', 'cr', 'nap', 'sleep', 'gym', 'lounge', 'social', 'walk_break')),
  planned_start timestamptz NOT NULL,
  planned_end timestamptz NOT NULL,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'needs' CHECK (source IN ('needs', 'schedule', 'jarvis', 'boss', 'agent_request', 'me')),
  approval_id uuid,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'approved', 'started', 'done', 'cancelled', 'skipped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Agent Activity Log Table
CREATE TABLE IF NOT EXISTS public.office_agent_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  ts_pht text NOT NULL,
  agent_id text NOT NULL REFERENCES public.office_agents(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('eat', 'drink', 'coffee', 'cr', 'nap', 'sleep', 'gym', 'lounge', 'social', 'work', 'clean', 'walk_break', 'request', 'decision', 'wake')),
  phase text NOT NULL DEFAULT 'started' CHECK (phase IN ('planned', 'started', 'completed', 'cancelled', 'denied')),
  reason text NOT NULL,
  decided_by text NOT NULL DEFAULT 'needs engine' CHECK (decided_by IN ('needs engine', 'schedule', 'jarvis', 'boss', 'agent', 'me')),
  plan_id uuid,
  approval_id uuid,
  needs_before jsonb,
  needs_after jsonb,
  duration_s integer DEFAULT 0,
  demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for high-throughput querying & filtering
CREATE INDEX IF NOT EXISTS idx_office_agent_needs_state ON public.office_agent_needs(state);
CREATE INDEX IF NOT EXISTS idx_office_break_requests_agent ON public.office_break_requests(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_office_agent_plan_agent_status ON public.office_agent_plan(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_office_activity_log_agent_ts ON public.office_agent_activity_log(agent_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_office_activity_log_ts ON public.office_agent_activity_log(ts DESC);

-- Enable RLS on all 4 new tables
ALTER TABLE public.office_needs_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_agent_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_break_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_agent_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_agent_activity_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- office_needs_config
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_needs_config' AND policyname = 'office_needs_config_public_all') THEN
    CREATE POLICY office_needs_config_public_all ON public.office_needs_config FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- office_agent_needs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_agent_needs' AND policyname = 'office_agent_needs_public_all') THEN
    CREATE POLICY office_agent_needs_public_all ON public.office_agent_needs FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- office_break_requests
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_break_requests' AND policyname = 'office_break_requests_public_all') THEN
    CREATE POLICY office_break_requests_public_all ON public.office_break_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- office_agent_plan
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_agent_plan' AND policyname = 'office_agent_plan_public_all') THEN
    CREATE POLICY office_agent_plan_public_all ON public.office_agent_plan FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- office_agent_activity_log
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_agent_activity_log' AND policyname = 'office_agent_activity_log_public_all') THEN
    CREATE POLICY office_agent_activity_log_public_all ON public.office_agent_activity_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime publication for real-time reactivity
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.office_needs_config;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.office_agent_needs;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.office_break_requests;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.office_agent_plan;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.office_agent_activity_log;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 6. Seed initial needs and deterministic traits for all resident agents
DO $$
DECLARE
  ag RECORD;
  t_meta text;
  t_sleep text;
  t_gym boolean;
  h_val integer;
BEGIN
  FOR ag IN SELECT id FROM public.office_agents LOOP
    -- Deterministic trait computation based on agent_id ASCII sum
    h_val := (SELECT coalesce(sum(ascii(c)), 0)::integer FROM regexp_split_to_table(ag.id, '') AS c);
    
    IF (h_val % 3) = 0 THEN
      t_meta := 'fast';
    ELSIF (h_val % 3) = 1 THEN
      t_meta := 'normal';
    ELSE
      t_meta := 'slow';
    END IF;

    IF (h_val % 4) = 0 THEN
      t_sleep := 'early_bird';
    ELSIF (h_val % 4) = 1 THEN
      t_sleep := 'night_owl';
    ELSE
      t_sleep := 'balanced';
    END IF;

    t_gym := ((h_val % 2) = 0);

    -- Upsert agent needs
    INSERT INTO public.office_agent_needs (
      agent_id, energy, hunger, thirst, bladder, health, morale, caffeine, sleep_debt, base_ts, traits, state
    )
    VALUES (
      ag.id,
      75.0 + ((h_val % 20)::float),
      70.0 + (((h_val * 3) % 25)::float),
      80.0 + (((h_val * 7) % 18)::float),
      85.0 + (((h_val * 5) % 15)::float),
      92.0 + ((h_val % 8)::float),
      80.0 + (((h_val * 11) % 20)::float),
      CASE WHEN (h_val % 3) = 0 THEN 45.0 ELSE 0.0 END,
      CASE WHEN (h_val % 5) = 0 THEN 18.0 ELSE 2.0 END,
      now(),
      jsonb_build_object(
        'metabolism', t_meta,
        'sleepiness', t_sleep,
        'gymLover', t_gym,
        'caffeineSensitivity', 0.9 + (((h_val % 5)::float) * 0.05),
        'bladderCapacity', 0.9 + (((h_val % 4)::float) * 0.05)
      ),
      'working'
    )
    ON CONFLICT (agent_id) DO NOTHING;

    -- Upsert an initial planned next step for the agent
    INSERT INTO public.office_agent_plan (
      agent_id, kind, planned_start, planned_end, reason, source, status
    )
    VALUES (
      ag.id,
      CASE 
        WHEN ag.id = 'boss' THEN 'social'
        WHEN (h_val % 4) = 0 THEN 'coffee'
        WHEN (h_val % 4) = 1 THEN 'eat'
        WHEN (h_val % 4) = 2 THEN 'walk_break'
        ELSE 'gym'
      END,
      now() + interval '30 minutes',
      now() + interval '45 minutes',
      CASE 
        WHEN ag.id = 'boss' THEN 'Campus operational check-in with department leads'
        WHEN (h_val % 4) = 0 THEN 'Afternoon focus boost: coffee corner at Pantry'
        WHEN (h_val % 4) = 1 THEN 'Scheduled lunch window and hunger calibration'
        WHEN (h_val % 4) = 2 THEN 'Post-sprint mental recharge and corridor walk'
        ELSE 'Endurance workout session at Fitness Gym'
      END,
      'needs',
      'planned'
    )
    ON CONFLICT DO NOTHING;

    -- Upsert an initial readable activity log line
    INSERT INTO public.office_agent_activity_log (
      ts, ts_pht, agent_id, kind, phase, reason, decided_by, duration_s, demo
    )
    VALUES (
      now(),
      to_char(timezone('Asia/Manila', now()), 'HH12:MI AM') || ' PHT',
      ag.id,
      'work',
      'started',
      'Autonomous system operations & roadmap execution',
      'needs engine',
      1800,
      false
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
