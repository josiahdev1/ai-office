-- ============================================================================
-- Migration 0014: Boss Gathering, Brain Learning Log & Agent Insights (Phase K7)
--
-- Idempotent schema for:
-- 1. office_gather_runs: Track delta gather batches run by Boss agent
-- 2. office_brain_learning_log: Complete chronological event log of learned insights
-- 3. office_agent_insights: Extracted knowledge patterns, strengths, and preferences
-- 4. office_jarvis_memory: Long-term operational memories retrieved by JARVIS
-- ============================================================================

-- 1. Create office_gather_runs table
CREATE TABLE IF NOT EXISTS public.office_gather_runs (
  id text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  trigger text NOT NULL DEFAULT 'manual', -- 'manual' | 'schedule' | 'tasks'
  status text NOT NULL DEFAULT 'running', -- 'running' | 'completed' | 'failed'
  rows_scanned jsonb NOT NULL DEFAULT '{}'::jsonb,
  insights_created integer NOT NULL DEFAULT 0,
  insights_updated integer NOT NULL DEFAULT 0,
  duplicates_skipped integer NOT NULL DEFAULT 0,
  rejected integer NOT NULL DEFAULT 0,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create office_brain_learning_log table
CREATE TABLE IF NOT EXISTS public.office_brain_learning_log (
  id text PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  ts_pht text NOT NULL,
  run_id text,
  kind text NOT NULL DEFAULT 'learned', -- 'learned' | 'updated' | 'duplicate' | 'rejected' | 'forgotten'
  agent_id text,
  category text NOT NULL, -- 'agent_strength' | 'team_pattern' | 'operator_preference' | 'failure_lesson' | 'wellness_pattern'
  text text NOT NULL,
  confidence double precision NOT NULL DEFAULT 0.85,
  source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  by text NOT NULL DEFAULT 'boss', -- 'boss' | 'jarvis' | 'me'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create office_agent_insights table
CREATE TABLE IF NOT EXISTS public.office_agent_insights (
  id text PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  agent_id text,
  kind text NOT NULL DEFAULT 'strength', -- 'strength' | 'weakness' | 'preference' | 'team_pattern' | 'lesson'
  category text NOT NULL,
  text text NOT NULL,
  confidence double precision NOT NULL DEFAULT 0.85,
  source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create office_jarvis_memory table
CREATE TABLE IF NOT EXISTS public.office_jarvis_memory (
  id text PRIMARY KEY,
  insight_id text,
  agent_id text,
  category text NOT NULL DEFAULT 'insight',
  memory_text text NOT NULL,
  confidence double precision NOT NULL DEFAULT 0.85,
  source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_office_gather_runs_started ON public.office_gather_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_office_brain_log_ts ON public.office_brain_learning_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_office_brain_log_agent ON public.office_brain_learning_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_office_agent_insights_agent ON public.office_agent_insights(agent_id);
CREATE INDEX IF NOT EXISTS idx_office_agent_insights_pinned ON public.office_agent_insights(pinned);
CREATE INDEX IF NOT EXISTS idx_office_jarvis_memory_agent ON public.office_jarvis_memory(agent_id);

-- Enable RLS
ALTER TABLE public.office_gather_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_brain_learning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_agent_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_jarvis_memory ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_gather_runs' AND policyname = 'Allow public all on office_gather_runs') THEN
    CREATE POLICY "Allow public all on office_gather_runs" ON public.office_gather_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_brain_learning_log' AND policyname = 'Allow public all on office_brain_learning_log') THEN
    CREATE POLICY "Allow public all on office_brain_learning_log" ON public.office_brain_learning_log FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_agent_insights' AND policyname = 'Allow public all on office_agent_insights') THEN
    CREATE POLICY "Allow public all on office_agent_insights" ON public.office_agent_insights FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_jarvis_memory' AND policyname = 'Allow public all on office_jarvis_memory') THEN
    CREATE POLICY "Allow public all on office_jarvis_memory" ON public.office_jarvis_memory FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'office_gather_runs') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.office_gather_runs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'office_brain_learning_log') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.office_brain_learning_log;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'office_agent_insights') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.office_agent_insights;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'office_jarvis_memory') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.office_jarvis_memory;
    END IF;
  END IF;
END $$;

-- Idempotent baseline seed insights for EasyUp HQ core
INSERT INTO public.office_agent_insights (id, ts, agent_id, kind, category, text, confidence, source_ids, pinned, deleted)
VALUES
  (
    'insight_gian_tests',
    now(),
    'gian',
    'strength',
    'agent_strength',
    'Gian is fastest on test automation and verification, success rate 94% over recent test tasks.',
    0.94,
    '["task_init_1", "task_init_2"]'::jsonb,
    true,
    false
  ),
  (
    'insight_christian_architecture',
    now(),
    'christian',
    'strength',
    'agent_strength',
    'Christian excels at systems architecture, refactoring, and clean module decoupling.',
    0.92,
    '["task_init_3"]'::jsonb,
    true,
    false
  ),
  (
    'insight_standing_policy',
    now(),
    NULL,
    'preference',
    'operator_preference',
    'Josiah prefers autonomous hydration and CR breaks under standing policy with 30% department cap.',
    0.98,
    '["policy_init_1"]'::jsonb,
    true,
    false
  )
ON CONFLICT (id) DO NOTHING;
