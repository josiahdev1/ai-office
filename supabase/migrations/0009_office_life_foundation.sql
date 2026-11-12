-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0009: Office Life Data Foundation
-- Covers: office_map_versions, office_settings, office_calendar,
--         office_schedule_blocks, office_world_state
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. OFFICE MAP VERSIONS (Document-driven building map with rollback & undo)
CREATE TABLE IF NOT EXISTS public.office_map_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  map_data jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  author text NOT NULL DEFAULT 'system',
  change_summary text DEFAULT 'Initial baseline map',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_office_map_version_num ON public.office_map_versions(version);
CREATE INDEX IF NOT EXISTS idx_office_map_is_active ON public.office_map_versions(is_active) WHERE is_active = true;

-- 2. OFFICE SETTINGS (Iloilo City coordinates, PHT timezone, schedule config, demo speed)
CREATE TABLE IF NOT EXISTS public.office_settings (
  id text PRIMARY KEY DEFAULT 'default',
  timezone text NOT NULL DEFAULT 'Asia/Manila',
  latitude numeric(8, 4) NOT NULL DEFAULT 10.7202,
  longitude numeric(8, 4) NOT NULL DEFAULT 122.5621,
  city_label text NOT NULL DEFAULT 'Iloilo City',
  demo_speed integer NOT NULL DEFAULT 1 CHECK (demo_speed IN (1, 5, 10, 30, 60)),
  demo_mode boolean NOT NULL DEFAULT false,
  workday_start text NOT NULL DEFAULT '08:00',
  workday_end text NOT NULL DEFAULT '17:00',
  lunch_start text NOT NULL DEFAULT '12:00',
  lunch_end text NOT NULL DEFAULT '13:00',
  scheduler_mode text NOT NULL DEFAULT 'hybrid' CHECK (scheduler_mode IN ('cron', 'edge_function', 'leader_tab', 'hybrid')),
  weather_provider text NOT NULL DEFAULT 'open-meteo',
  weather_cache jsonb DEFAULT '{}'::jsonb,
  weather_cached_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. OFFICE CALENDAR (Workdays, Weekends, Holidays)
CREATE TABLE IF NOT EXISTS public.office_calendar (
  date date PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('workday', 'weekend', 'holiday')),
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_calendar_kind ON public.office_calendar(kind);

-- 4. OFFICE SCHEDULE BLOCKS (Department-scoped human workday schedule)
CREATE TABLE IF NOT EXISTS public.office_schedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('work', 'coffee_break', 'lunch', 'gym', 'night_rest', 'social', 'available')),
  days text[] NOT NULL DEFAULT '{"mon","tue","wed","thu","fri"}'::text[],
  start_time text NOT NULL,
  end_time text NOT NULL,
  department text NOT NULL DEFAULT 'ALL',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_schedule_dept ON public.office_schedule_blocks(department);
CREATE INDEX IF NOT EXISTS idx_office_schedule_enabled ON public.office_schedule_blocks(enabled);

-- 5. OFFICE WORLD STATE (Leader tab lease election & world tick tracking)
CREATE TABLE IF NOT EXISTS public.office_world_state (
  id text PRIMARY KEY DEFAULT 'primary',
  leader_id text,
  lease_until timestamptz,
  last_tick_at timestamptz,
  tick_count bigint NOT NULL DEFAULT 0,
  last_gap_duration_s bigint DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================
ALTER TABLE public.office_map_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_world_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- office_map_versions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_map_versions' AND policyname = 'Public read office_map_versions') THEN
    CREATE POLICY "Public read office_map_versions" ON public.office_map_versions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_map_versions' AND policyname = 'Public write office_map_versions') THEN
    CREATE POLICY "Public write office_map_versions" ON public.office_map_versions FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- office_settings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_settings' AND policyname = 'Public read office_settings') THEN
    CREATE POLICY "Public read office_settings" ON public.office_settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_settings' AND policyname = 'Public write office_settings') THEN
    CREATE POLICY "Public write office_settings" ON public.office_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- office_calendar
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_calendar' AND policyname = 'Public read office_calendar') THEN
    CREATE POLICY "Public read office_calendar" ON public.office_calendar FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_calendar' AND policyname = 'Public write office_calendar') THEN
    CREATE POLICY "Public write office_calendar" ON public.office_calendar FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- office_schedule_blocks
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_schedule_blocks' AND policyname = 'Public read office_schedule_blocks') THEN
    CREATE POLICY "Public read office_schedule_blocks" ON public.office_schedule_blocks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_schedule_blocks' AND policyname = 'Public write office_schedule_blocks') THEN
    CREATE POLICY "Public write office_schedule_blocks" ON public.office_schedule_blocks FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- office_world_state
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_world_state' AND policyname = 'Public read office_world_state') THEN
    CREATE POLICY "Public read office_world_state" ON public.office_world_state FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'office_world_state' AND policyname = 'Public write office_world_state') THEN
    CREATE POLICY "Public write office_world_state" ON public.office_world_state FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- Supabase Realtime Publication
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'office_map_versions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.office_map_versions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'office_settings') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.office_settings;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'office_calendar') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.office_calendar;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'office_schedule_blocks') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.office_schedule_blocks;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'office_world_state') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.office_world_state;
    END IF;
  END IF;
END $$;

-- =============================================================================
-- Initial Seeds
-- =============================================================================

-- 1. Default Settings (Iloilo City, Asia/Manila)
INSERT INTO public.office_settings (id, timezone, latitude, longitude, city_label, demo_speed, demo_mode, workday_start, workday_end, lunch_start, lunch_end, scheduler_mode)
VALUES ('default', 'Asia/Manila', 10.7202, 122.5621, 'Iloilo City', 1, false, '08:00', '17:00', '12:00', '13:00', 'hybrid')
ON CONFLICT (id) DO UPDATE SET
  timezone = EXCLUDED.timezone,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  city_label = EXCLUDED.city_label,
  updated_at = now();

-- 2. Default Schedule Blocks (PHT)
INSERT INTO public.office_schedule_blocks (kind, days, start_time, end_time, department, enabled)
VALUES
  ('night_rest', '{"mon","tue","wed","thu","fri","sat","sun"}'::text[], '22:00', '06:00', 'ALL', true),
  ('available',  '{"mon","tue","wed","thu","fri"}'::text[], '06:00', '08:00', 'ALL', true),
  ('work',       '{"mon","tue","wed","thu","fri"}'::text[], '08:00', '10:00', 'ALL', true),
  ('coffee_break','{"mon","tue","wed","thu","fri"}'::text[], '10:00', '10:15', 'ALL', true),
  ('work',       '{"mon","tue","wed","thu","fri"}'::text[], '10:15', '12:00', 'ALL', true),
  ('lunch',      '{"mon","tue","wed","thu","fri"}'::text[], '12:00', '13:00', 'ALL', true),
  ('work',       '{"mon","tue","wed","thu","fri"}'::text[], '13:00', '15:00', 'ALL', true),
  ('coffee_break','{"mon","tue","wed","thu","fri"}'::text[], '15:00', '15:15', 'ALL', true),
  ('work',       '{"mon","tue","wed","thu","fri"}'::text[], '15:15', '17:00', 'ALL', true),
  ('gym',        '{"mon","tue","wed","thu","fri"}'::text[], '17:00', '18:00', 'ALL', true),
  ('social',     '{"mon","tue","wed","thu","fri"}'::text[], '18:00', '22:00', 'ALL', true),
  ('available',  '{"sat","sun"}'::text[], '06:00', '22:00', 'ALL', true)
ON CONFLICT DO NOTHING;

-- 3. Initial World State
INSERT INTO public.office_world_state (id, leader_id, tick_count, metadata)
VALUES ('primary', 'init', 0, '{"initialized": true, "version": 1}'::jsonb)
ON CONFLICT (id) DO NOTHING;
