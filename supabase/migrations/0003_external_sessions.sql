-- ============================================================
-- EasyUp Software Solution HQ — External Sessions & Bridge Migration
-- Migration: 0003_external_sessions.sql
-- Supports Pixtuoid-style Live Coding-Agent Bridge
-- ============================================================

-- 1. Create public.office_sessions table
CREATE TABLE IF NOT EXISTS public.office_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'external' CHECK (kind IN ('resident', 'external')),
  cli text NOT NULL CHECK (cli IN ('claude-code', 'antigravity', 'codex', 'opencode', 'cursor', 'other')),
  session_id text NOT NULL UNIQUE,
  cwd_hash text,
  status text NOT NULL DEFAULT 'working',
  current_tool text,
  tokens_used integer NOT NULL DEFAULT 0,
  tool_call_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for session queries and heartbeat timeouts
CREATE INDEX IF NOT EXISTS idx_office_sessions_cli ON public.office_sessions(cli);
CREATE INDEX IF NOT EXISTS idx_office_sessions_last_seen ON public.office_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_office_sessions_status ON public.office_sessions(status);

-- 2. Extend public.office_agents with nullable columns for live guest representations
ALTER TABLE public.office_agents ADD COLUMN IF NOT EXISTS kind text DEFAULT 'resident';
ALTER TABLE public.office_agents ADD COLUMN IF NOT EXISTS cli text;
ALTER TABLE public.office_agents ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.office_agents ADD COLUMN IF NOT EXISTS cwd_hash text;
ALTER TABLE public.office_agents ADD COLUMN IF NOT EXISTS current_tool text;
ALTER TABLE public.office_agents ADD COLUMN IF NOT EXISTS tokens_used integer DEFAULT 0;
ALTER TABLE public.office_agents ADD COLUMN IF NOT EXISTS tool_call_count integer DEFAULT 0;

-- 3. Row Level Security Posture
ALTER TABLE public.office_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_sessions' AND policyname = 'Allow public read office_sessions'
  ) THEN
    CREATE POLICY "Allow public read office_sessions"
      ON public.office_sessions FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_sessions' AND policyname = 'Allow server write office_sessions'
  ) THEN
    CREATE POLICY "Allow server write office_sessions"
      ON public.office_sessions FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 4. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.office_sessions;
