-- =============================================================================
-- Migration 0016: Consolidated Additive Tables for EasyUp AI Office
-- 
-- Applies all additive tables across Phases K1 - K10 needed in Supabase,
-- strictly using non-destructive IF NOT EXISTS, idempotent ADD COLUMN checks,
-- non-destructive RLS policies, and safe Realtime publications.
-- Zero destructive statements (no DROP, no TRUNCATE, no CASCADE).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. System Metrics & Telemetry
CREATE TABLE IF NOT EXISTS public.office_system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    unit TEXT,
    recorded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_office_sys_metrics_time ON public.office_system_metrics(recorded_at DESC);

-- 2. Presence & Agent Styles
CREATE TABLE IF NOT EXISTS public.office_presence (
    agent_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'offline',
    room TEXT,
    last_ping TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.office_agent_styles (
    agent_id TEXT PRIMARY KEY,
    palette JSONB DEFAULT '{}'::jsonb,
    accessories JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Task Dependencies
CREATE TABLE IF NOT EXISTS public.office_task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    depends_on_task_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. External Sessions & LLM Usage
CREATE TABLE IF NOT EXISTS public.office_external_sessions (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    kind TEXT NOT NULL DEFAULT 'external',
    cli TEXT NOT NULL DEFAULT 'antigravity',
    status TEXT NOT NULL DEFAULT 'active',
    tokens_used BIGINT DEFAULT 0,
    tool_call_count INT DEFAULT 0,
    last_seen_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.office_llm_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT,
    model TEXT NOT NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 6) DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_office_llm_usage_recorded ON public.office_llm_usage(recorded_at DESC);

-- 5. Cars & Parking
CREATE TABLE IF NOT EXISTS public.office_cars (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    car_style TEXT DEFAULT 'sedan',
    color TEXT DEFAULT '#4f46e5',
    bay_number INT,
    status TEXT DEFAULT 'parked',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.office_parking_spots (
    bay_number INT PRIMARY KEY,
    assigned_agent_id TEXT,
    is_occupied BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. 3D Coordinates & Waypoints
CREATE TABLE IF NOT EXISTS public.office_3d_coordinates (
    id TEXT PRIMARY KEY,
    x NUMERIC NOT NULL DEFAULT 0,
    y NUMERIC NOT NULL DEFAULT 0,
    z NUMERIC NOT NULL DEFAULT 0,
    rotation_y NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.office_waypoints (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    room TEXT,
    x NUMERIC NOT NULL,
    y NUMERIC NOT NULL,
    z NUMERIC NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. Jarvis Conversations & Messages
CREATE TABLE IF NOT EXISTS public.office_jarvis_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'josiah',
    title TEXT DEFAULT 'JARVIS Session',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.office_jarvis_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.office_jarvis_conversations(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'model', 'system')),
    content TEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_office_jarvis_msgs_conv ON public.office_jarvis_messages(conversation_id, created_at);

-- 8. Map Versions, Calendar, Schedule Blocks & World State
CREATE TABLE IF NOT EXISTS public.office_map_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INT NOT NULL UNIQUE,
    map_data JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    author TEXT NOT NULL DEFAULT 'system',
    change_summary TEXT DEFAULT 'Initial baseline map',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_office_map_is_active ON public.office_map_versions(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.office_calendar (
    date DATE PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('workday', 'weekend', 'holiday')),
    label TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.office_schedule_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL,
    days TEXT[] NOT NULL DEFAULT '{"mon","tue","wed","thu","fri"}'::text[],
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    department_scope TEXT DEFAULT 'ALL',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.office_world_state (
    id TEXT PRIMARY KEY DEFAULT 'current',
    leader_id TEXT,
    lease_until TIMESTAMPTZ,
    last_tick_at TIMESTAMPTZ,
    tick_count BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
INSERT INTO public.office_world_state (id, tick_count, updated_at)
VALUES ('current', 0, now())
ON CONFLICT (id) DO NOTHING;

-- 9. Reservations, Wellness Policy & Facility Queue
CREATE TABLE IF NOT EXISTS public.office_agent_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    reserved_from TIMESTAMPTZ NOT NULL,
    reserved_until TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_office_reservations_status ON public.office_agent_reservations(status, reserved_until);

CREATE TABLE IF NOT EXISTS public.office_wellness_policy (
    id TEXT PRIMARY KEY DEFAULT 'current',
    mode TEXT NOT NULL DEFAULT 'STANDING_POLICY',
    department_away_cap_pct INT NOT NULL DEFAULT 30,
    max_personal_break_minutes INT NOT NULL DEFAULT 10,
    pinned_agent_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
INSERT INTO public.office_wellness_policy (id, mode)
VALUES ('current', 'STANDING_POLICY')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.office_facility_cleaning_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_cleaner_id TEXT,
    requested_by TEXT NOT NULL DEFAULT 'facilities_engine',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Reminders, Events & Push Subscriptions
CREATE TABLE IF NOT EXISTS public.office_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    notes TEXT,
    due_at TIMESTAMPTZ NOT NULL,
    recurrence_rule TEXT,
    channel TEXT NOT NULL DEFAULT 'web_call',
    status TEXT NOT NULL DEFAULT 'scheduled',
    target_user_id TEXT NOT NULL DEFAULT 'josiah',
    voice_script TEXT,
    snooze_count INT NOT NULL DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    claimed_by TEXT,
    claimed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_office_reminders_due_status ON public.office_reminders(due_at, status);

CREATE TABLE IF NOT EXISTS public.office_reminder_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID REFERENCES public.office_reminders(id),
    event_type TEXT NOT NULL,
    channel TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_office_reminder_events_rem ON public.office_reminder_events(reminder_id);

CREATE TABLE IF NOT EXISTS public.office_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'josiah',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Boss Gathering & Brain Learning Log & Agent Insights (Consolidated Phase K7/K8)
CREATE TABLE IF NOT EXISTS public.office_gather_runs (
    id TEXT PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    trigger TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'running',
    rows_scanned JSONB NOT NULL DEFAULT '{}'::jsonb,
    insights_created INT NOT NULL DEFAULT 0,
    insights_updated INT NOT NULL DEFAULT 0,
    duplicates_skipped INT NOT NULL DEFAULT 0,
    rejected INT NOT NULL DEFAULT 0,
    tokens_in INT NOT NULL DEFAULT 0,
    tokens_out INT NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.office_brain_learning_log (
    id TEXT PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    ts_pht TEXT NOT NULL DEFAULT '',
    run_id TEXT,
    kind TEXT NOT NULL DEFAULT 'learned',
    agent_id TEXT,
    category TEXT NOT NULL DEFAULT 'agent_strength',
    text TEXT NOT NULL DEFAULT '',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    by TEXT NOT NULL DEFAULT 'boss',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column additions for office_brain_learning_log
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS ts TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS ts_pht TEXT NOT NULL DEFAULT '';
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS run_id TEXT;
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'learned';
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'agent_strength';
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS text TEXT NOT NULL DEFAULT '';
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION NOT NULL DEFAULT 0.85;
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS source_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS by TEXT NOT NULL DEFAULT 'boss';
ALTER TABLE public.office_brain_learning_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.office_agent_insights (
    id TEXT PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    agent_id TEXT,
    kind TEXT NOT NULL DEFAULT 'strength',
    category TEXT NOT NULL DEFAULT 'agent_strength',
    text TEXT NOT NULL DEFAULT '',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    pinned BOOLEAN NOT NULL DEFAULT false,
    deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column additions for office_agent_insights
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS ts TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'strength';
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'agent_strength';
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS text TEXT NOT NULL DEFAULT '';
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION NOT NULL DEFAULT 0.85;
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS source_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.office_agent_insights ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.office_jarvis_memory (
    id TEXT PRIMARY KEY,
    insight_id TEXT,
    agent_id TEXT,
    category TEXT NOT NULL DEFAULT 'insight',
    memory_text TEXT NOT NULL DEFAULT '',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_gather_runs_started ON public.office_gather_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_office_brain_log_ts ON public.office_brain_learning_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_office_agent_insights_agent ON public.office_agent_insights(agent_id);
CREATE INDEX IF NOT EXISTS idx_office_jarvis_memory_agent ON public.office_jarvis_memory(agent_id);

-- =============================================================================
-- RLS POLICIES (Safe, Non-Destructive, Permissive for Office Operations)
-- =============================================================================

DO $$
DECLARE
    t text;
    pol_name text;
    tables text[] := ARRAY[
        'office_system_metrics', 'office_presence', 'office_agent_styles',
        'office_task_dependencies', 'office_external_sessions', 'office_llm_usage',
        'office_cars', 'office_parking_spots', 'office_3d_coordinates',
        'office_waypoints', 'office_jarvis_conversations', 'office_jarvis_messages',
        'office_map_versions', 'office_calendar', 'office_schedule_blocks',
        'office_world_state', 'office_agent_reservations', 'office_wellness_policy',
        'office_facility_cleaning_queue', 'office_reminders',
        'office_reminder_events', 'office_push_subscriptions',
        'office_gather_runs', 'office_brain_learning_log',
        'office_agent_insights', 'office_jarvis_memory'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            pol_name := 'Allow all access to ' || t;
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE schemaname = 'public' AND tablename = t AND policyname = pol_name
            ) THEN
                EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true);', pol_name, t);
            END IF;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- REALTIME PUBLICATIONS (Idempotent, Non-Destructive)
-- =============================================================================

DO $$
DECLARE
    t text;
    pub_tables text[] := ARRAY[
        'office_presence', 'office_agent_styles', 'office_external_sessions',
        'office_cars', 'office_jarvis_conversations', 'office_jarvis_messages',
        'office_map_versions', 'office_world_state', 'office_agent_reservations',
        'office_wellness_policy', 'office_facility_cleaning_queue', 'office_reminders',
        'office_gather_runs', 'office_brain_learning_log', 'office_agent_insights', 'office_jarvis_memory'
    ];
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH t IN ARRAY pub_tables LOOP
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_publication_tables 
                    WHERE pubname = 'supabase_realtime' 
                      AND schemaname = 'public' 
                      AND tablename = t
                ) THEN
                    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
                END IF;
            END IF;
        END LOOP;
    END IF;
END $$;
