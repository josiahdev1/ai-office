-- ============================================================================
-- Migration 0013: Office Facility State & Cleaning Maintenance Queue (Phase K6)
--
-- Idempotent schema for:
-- 1. office_facility_state: Room dirt, bin fill levels, water jug levels, supplies
-- 2. office_cleaning_requests: Cleaners task dispatch and maintenance log
-- ============================================================================

-- 1. Create office_facility_state table
CREATE TABLE IF NOT EXISTS office_facility_state (
  id text PRIMARY KEY,
  target_id text NOT NULL,
  room_id text NOT NULL,
  kind text NOT NULL, -- 'room_cleanliness' | 'bin_level' | 'water_jug' | 'supplies' | 'table_crumbs' | 'sweat_dirt' | 'cr_hygiene'
  dirt_level double precision NOT NULL DEFAULT 0.0, -- 0.0 (pristine) to 100.0 (filthy)
  fill_level double precision NOT NULL DEFAULT 0.0, -- 0.0 to 100.0 (trash bins, dirty tray carts)
  supplies_level double precision NOT NULL DEFAULT 100.0, -- 0.0 to 100.0 (coffee beans, soap, tissues)
  status text NOT NULL DEFAULT 'clean', -- 'clean' | 'normal' | 'needs_attention' | 'dirty' | 'critical'
  assigned_cleaner_id text,
  last_cleaned_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create office_cleaning_requests table
CREATE TABLE IF NOT EXISTS office_cleaning_requests (
  id text PRIMARY KEY,
  room_id text NOT NULL,
  kind text NOT NULL DEFAULT 'mop', -- 'mop' | 'wipe_tables' | 'empty_bins' | 'clean_cr' | 'replace_water_jug' | 'restock_pantry' | 'water_plants'
  requested_by text NOT NULL, -- 'operator' | 'jarvis' | 'automated_sensor'
  priority text NOT NULL DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'urgent'
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assigned_cleaner_id text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS and permissive policies
ALTER TABLE office_facility_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_cleaning_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_facility_state' AND policyname = 'Allow public select on office_facility_state'
  ) THEN
    CREATE POLICY "Allow public select on office_facility_state" ON office_facility_state FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_facility_state' AND policyname = 'Allow public insert on office_facility_state'
  ) THEN
    CREATE POLICY "Allow public insert on office_facility_state" ON office_facility_state FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_facility_state' AND policyname = 'Allow public update on office_facility_state'
  ) THEN
    CREATE POLICY "Allow public update on office_facility_state" ON office_facility_state FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_cleaning_requests' AND policyname = 'Allow public select on office_cleaning_requests'
  ) THEN
    CREATE POLICY "Allow public select on office_cleaning_requests" ON office_cleaning_requests FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_cleaning_requests' AND policyname = 'Allow public insert on office_cleaning_requests'
  ) THEN
    CREATE POLICY "Allow public insert on office_cleaning_requests" ON office_cleaning_requests FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_cleaning_requests' AND policyname = 'Allow public update on office_cleaning_requests'
  ) THEN
    CREATE POLICY "Allow public update on office_cleaning_requests" ON office_cleaning_requests FOR UPDATE USING (true);
  END IF;
END $$;

-- 4. Enable Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'office_facility_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE office_facility_state;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'office_cleaning_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE office_cleaning_requests;
  END IF;
END $$;

-- 5. Seed initial facility items idempotently
INSERT INTO office_facility_state (id, target_id, room_id, kind, dirt_level, fill_level, supplies_level, status)
VALUES
  -- Room cleanliness baselines
  ('fac_cafeteria', 'CAFETERIA', 'CAFETERIA', 'room_cleanliness', 12.0, 15.0, 95.0, 'clean'),
  ('fac_comfort_room', 'COMFORT_ROOM', 'COMFORT_ROOM', 'cr_hygiene', 8.0, 10.0, 90.0, 'clean'),
  ('fac_gym', 'GYM', 'GYM', 'sweat_dirt', 6.0, 8.0, 98.0, 'clean'),
  ('fac_pantry', 'PANTRY', 'PANTRY', 'supplies', 5.0, 12.0, 92.0, 'clean'),
  ('fac_engineering', 'ENGINEERING', 'ENGINEERING', 'room_cleanliness', 4.0, 18.0, 100.0, 'clean'),
  ('fac_qa', 'QA', 'QA', 'room_cleanliness', 3.0, 10.0, 100.0, 'clean'),
  ('fac_growth', 'GROWTH', 'GROWTH', 'room_cleanliness', 5.0, 14.0, 100.0, 'clean'),
  ('fac_intelligence', 'INTELLIGENCE', 'INTELLIGENCE', 'room_cleanliness', 2.0, 8.0, 100.0, 'clean'),
  ('fac_operations', 'OPERATIONS', 'OPERATIONS', 'room_cleanliness', 6.0, 20.0, 100.0, 'clean'),
  ('fac_the_brain', 'THE_BRAIN', 'THE_BRAIN', 'room_cleanliness', 1.0, 2.0, 100.0, 'clean'),
  ('fac_corridors', 'CORRIDORS', 'CORRIDORS', 'room_cleanliness', 7.0, 5.0, 100.0, 'clean'),
  ('fac_nap_room', 'NAP_ROOM', 'NAP_ROOM', 'room_cleanliness', 3.0, 4.0, 100.0, 'clean'),

  -- 6 Water Dispenser Jugs (100% full capacity)
  ('fac_dispenser_corridor_north_jug', 'dispenser_corridor_north', 'CORRIDORS', 'water_jug', 0.0, 0.0, 100.0, 'clean'),
  ('fac_dispenser_corridor_south_jug', 'dispenser_corridor_south', 'CORRIDORS', 'water_jug', 0.0, 0.0, 100.0, 'clean'),
  ('fac_dispenser_engineering_jug', 'dispenser_engineering', 'ENGINEERING', 'water_jug', 0.0, 0.0, 100.0, 'clean'),
  ('fac_dispenser_secops_jug', 'dispenser_secops', 'SECOPS', 'water_jug', 0.0, 0.0, 100.0, 'clean'),
  ('fac_dispenser_gym_jug', 'dispenser_gym', 'GYM', 'water_jug', 0.0, 0.0, 100.0, 'clean'),
  ('fac_dispenser_cafeteria_jug', 'dispenser_cafeteria', 'CAFETERIA', 'water_jug', 0.0, 0.0, 100.0, 'clean')
ON CONFLICT (id) DO NOTHING;
