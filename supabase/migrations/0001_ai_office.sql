-- =========================================================================
-- EasyUp Software Solution HQ — Autonomous Multi-Agent AI Office Schema
-- Migration: 0001_ai_office.sql
-- =========================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AGENTS TABLE (23 Specialized Engineering Agents)
CREATE TABLE IF NOT EXISTS public.agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    avatar TEXT,
    status TEXT NOT NULL DEFAULT 'working', -- 'working', 'idle', 'in_meeting', 'on_break', 'awaiting_approval'
    sub_state TEXT DEFAULT 'typing',
    current_task_id TEXT,
    current_task TEXT,
    current_file TEXT,
    terminal_preview TEXT,
    progress_pct INTEGER DEFAULT 0,
    desk_id TEXT,
    desk_x NUMERIC DEFAULT 200,
    desk_y NUMERIC DEFAULT 340,
    color TEXT DEFAULT '#3b82f6',
    hair TEXT DEFAULT '#1e293b',
    skin TEXT DEFAULT '#fcd34d',
    last_action TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT REFERENCES public.agents(id) ON DELETE SET NULL,
    department TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'backlog', 'in_progress', 'review', 'done'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. APPROVALS TABLE (Human-in-the-Loop & Go-Signals)
CREATE TABLE IF NOT EXISTS public.approvals (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    summary TEXT,
    requested_by TEXT REFERENCES public.agents(id) ON DELETE CASCADE,
    agent_id TEXT,
    agent_name TEXT,
    room TEXT,
    type TEXT NOT NULL DEFAULT 'DEPLOYMENT', -- 'DEPLOYMENT', 'DATABASE_MIGRATION', 'SECURITY_OVERRIDE', 'BUDGET'
    details TEXT,
    risk_level TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ACTIVITY_LOG TABLE (Live Telemetry & Work Feed)
CREATE TABLE IF NOT EXISTS public.activity_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_id TEXT REFERENCES public.agents(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    department TEXT NOT NULL,
    level TEXT DEFAULT 'info', -- 'info', 'success', 'warn', 'error'
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. AUDIT_LOG TABLE (Security & Governance Traceability)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event TEXT NOT NULL,
    actor TEXT NOT NULL,
    details TEXT,
    severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warn', 'critical'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. MESSAGES TABLE (Real-Time Inter-Agent Telemetry & Collaboration)
CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sender_id TEXT REFERENCES public.agents(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    receiver_id TEXT REFERENCES public.agents(id) ON DELETE CASCADE,
    receiver_name TEXT NOT NULL,
    content TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'direct', -- 'direct', 'all-hands', 'incident-response', 'engineering'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. GOALS TABLE (Executive Department OKRs)
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    department TEXT NOT NULL,
    title TEXT NOT NULL,
    target_kpi TEXT,
    progress INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'on_track', -- 'on_track', 'at_risk', 'completed'
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. OFFICE_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.office_settings (
    id TEXT PRIMARY KEY DEFAULT 'default_hq',
    mode TEXT NOT NULL DEFAULT 'FOCUS_WORK', -- 'FOCUS_WORK', 'ALL_HANDS', 'COFFEE_BREAK', 'RECREATION'
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    speed TEXT NOT NULL DEFAULT '1x',
    company_name TEXT NOT NULL DEFAULT 'EasyUp Software Solution',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. INDEXES FOR HIGH-THROUGHPUT REALTIME QUERIES
CREATE INDEX IF NOT EXISTS idx_agents_dept ON public.agents(department);
CREATE INDEX IF NOT EXISTS idx_agents_status ON public.agents(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_activity_log_time ON public.activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS across all tables
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_settings ENABLE ROW LEVEL SECURITY;

-- Allow unrestricted read & write for anon and authenticated clients (internal studio cockpit)
DO $$
BEGIN
    -- Agents
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agents' AND policyname = 'allow_anon_agents') THEN
        CREATE POLICY allow_anon_agents ON public.agents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Tasks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'allow_anon_tasks') THEN
        CREATE POLICY allow_anon_tasks ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Approvals
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'approvals' AND policyname = 'allow_anon_approvals') THEN
        CREATE POLICY allow_anon_approvals ON public.approvals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Activity Log
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'allow_anon_activity') THEN
        CREATE POLICY allow_anon_activity ON public.activity_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Audit Log
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'allow_anon_audit') THEN
        CREATE POLICY allow_anon_audit ON public.audit_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Messages
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'allow_anon_messages') THEN
        CREATE POLICY allow_anon_messages ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Goals
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'allow_anon_goals') THEN
        CREATE POLICY allow_anon_goals ON public.goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Office Settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_settings' AND policyname = 'allow_anon_settings') THEN
        CREATE POLICY allow_anon_settings ON public.office_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 11. ENABLE REALTIME REPLICATION FOR LIVING DASHBOARD
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.office_settings;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
