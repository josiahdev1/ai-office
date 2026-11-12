-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0010: Departments, New Agents & Wellness Wing Slots
-- Covers: office_departments, new resident agents (Boss, Cleaner 1, Cleaner 2),
--         office_facility_slots (beds, CR stalls, dining chairs, water dispensers)
-- =============================================================================

-- 1. OFFICE DEPARTMENTS (Data-driven department registry)
CREATE TABLE IF NOT EXISTS public.office_departments (
  id text PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL,
  room_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('open_office', 'lab', 'studio', 'meeting', 'wellness')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS & Security for office_departments
ALTER TABLE public.office_departments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_departments' AND policyname = 'office_departments_public_read'
  ) THEN
    CREATE POLICY office_departments_public_read ON public.office_departments FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_departments' AND policyname = 'office_departments_public_all'
  ) THEN
    CREATE POLICY office_departments_public_all ON public.office_departments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime for office_departments
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.office_departments;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Seed departments idempotently
INSERT INTO public.office_departments (id, name, color, room_id, kind)
VALUES
  ('ENGINEERING', 'Engineering Core', '#6366f1', 'ENGINEERING', 'open_office'),
  ('OPERATIONS', 'Operations Hub', '#22c55e', 'OPERATIONS', 'open_office'),
  ('GROWTH', 'Growth Lab', '#3b82f6', 'GROWTH', 'lab'),
  ('EXECUTIVE', 'Executive Lounge', '#a855f7', 'EXECUTIVE', 'studio'),
  ('COMMAND', 'Command Center ("The Brain")', '#00e5ff', 'COMMAND', 'meeting'),
  ('SECOPS', 'QA & SecOps NOC', '#ec4899', 'SECOPS', 'lab'),
  ('INTELLIGENCE', 'Intelligence Lab', '#14b8a6', 'INTELLIGENCE', 'lab'),
  ('FACILITIES_WELLNESS', 'Facilities & Wellness', '#10b981', 'WELLNESS', 'wellness')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  room_id = EXCLUDED.room_id,
  kind = EXCLUDED.kind,
  updated_at = now();

-- 2. NEW RESIDENT AGENTS (Boss, Cleaner 1, Cleaner 2)
-- Idempotent upsert into office_agents table
INSERT INTO public.office_agents (
  id, name, role, department, current_room, status, sub_state, color, desk_x, desk_y, current_x, current_y, kind, model
)
VALUES
  (
    'boss',
    'Boss',
    'Chief of Staff',
    'COMMAND',
    'Command Center ("The Brain")',
    'available',
    'seated',
    '#00e5ff',
    2,
    -1,
    2,
    -1,
    'resident',
    'gemini-2.5-pro'
  ),
  (
    'cleaner_1',
    'Cleaner 1',
    'Lead Facilities & Sanitation Specialist',
    'FACILITIES_WELLNESS',
    'Facilities Room',
    'available',
    'standing',
    '#10b981',
    -35,
    -2,
    -35,
    -2,
    'resident',
    'hf-smollm2-135m'
  ),
  (
    'cleaner_2',
    'Cleaner 2',
    'Campus Maintenance & Logistics Specialist',
    'FACILITIES_WELLNESS',
    'Facilities Room',
    'available',
    'standing',
    '#10b981',
    -35,
    2,
    -35,
    2,
    'resident',
    'hf-smollm2-135m'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  color = EXCLUDED.color,
  kind = EXCLUDED.kind,
  updated_at = now();

-- 3. OFFICE FACILITY SLOTS (Reservation slots for beds, stalls, dining seats, water dispensers)
CREATE TABLE IF NOT EXISTS public.office_facility_slots (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('bed', 'cr_stall', 'dining_chair', 'water_dispenser')),
  room_id text NOT NULL,
  label text NOT NULL,
  occupied_by text,
  occupied_since timestamptz,
  meta jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS & Security for office_facility_slots
ALTER TABLE public.office_facility_slots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_facility_slots' AND policyname = 'office_facility_slots_public_read'
  ) THEN
    CREATE POLICY office_facility_slots_public_read ON public.office_facility_slots FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_facility_slots' AND policyname = 'office_facility_slots_public_all'
  ) THEN
    CREATE POLICY office_facility_slots_public_all ON public.office_facility_slots FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime for office_facility_slots
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.office_facility_slots;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. Seed 8 Nap Beds
INSERT INTO public.office_facility_slots (id, kind, room_id, label, meta)
VALUES
  ('nap_bed_1', 'bed', 'NAP_ROOM', 'Nap Bed 1 (Single, Window View)', '{"bed_type":"single","approach_tile":[-33, 0, -18],"head_facing":"NW"}'::jsonb),
  ('nap_bed_2', 'bed', 'NAP_ROOM', 'Nap Bed 2 (Single, Window View)', '{"bed_type":"single","approach_tile":[-33, 0, -15],"head_facing":"NW"}'::jsonb),
  ('nap_bed_3', 'bed', 'NAP_ROOM', 'Nap Bed 3 (Bunk Lower)', '{"bed_type":"bunk_lower","approach_tile":[-37, 0, -18],"head_facing":"NE"}'::jsonb),
  ('nap_bed_4', 'bed', 'NAP_ROOM', 'Nap Bed 4 (Bunk Upper)', '{"bed_type":"bunk_upper","approach_tile":[-37, 0, -18],"head_facing":"NE"}'::jsonb),
  ('nap_bed_5', 'bed', 'NAP_ROOM', 'Nap Bed 5 (Bunk Lower)', '{"bed_type":"bunk_lower","approach_tile":[-37, 0, -15],"head_facing":"NE"}'::jsonb),
  ('nap_bed_6', 'bed', 'NAP_ROOM', 'Nap Bed 6 (Bunk Upper)', '{"bed_type":"bunk_upper","approach_tile":[-37, 0, -15],"head_facing":"NE"}'::jsonb),
  ('nap_bed_7', 'bed', 'NAP_ROOM', 'Nap Bed 7 (Single, Dim Corner)', '{"bed_type":"single","approach_tile":[-35, 0, -12],"head_facing":"SW"}'::jsonb),
  ('nap_bed_8', 'bed', 'NAP_ROOM', 'Nap Bed 8 (Single, Dim Corner)', '{"bed_type":"single","approach_tile":[-33, 0, -12],"head_facing":"SW"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  meta = EXCLUDED.meta;

-- 5. Seed 6 CR Stalls
INSERT INTO public.office_facility_slots (id, kind, room_id, label, meta)
VALUES
  ('cr_stall_1', 'cr_stall', 'COMFORT_ROOM', 'CR Stall 1', '{"stall_number":1,"approach_tile":[-33, 0, -4]}'::jsonb),
  ('cr_stall_2', 'cr_stall', 'COMFORT_ROOM', 'CR Stall 2', '{"stall_number":2,"approach_tile":[-33, 0, -2]}'::jsonb),
  ('cr_stall_3', 'cr_stall', 'COMFORT_ROOM', 'CR Stall 3', '{"stall_number":3,"approach_tile":[-33, 0, 0]}'::jsonb),
  ('cr_stall_4', 'cr_stall', 'COMFORT_ROOM', 'CR Stall 4', '{"stall_number":4,"approach_tile":[-37, 0, -4]}'::jsonb),
  ('cr_stall_5', 'cr_stall', 'COMFORT_ROOM', 'CR Stall 5', '{"stall_number":5,"approach_tile":[-37, 0, -2]}'::jsonb),
  ('cr_stall_6', 'cr_stall', 'COMFORT_ROOM', 'CR Stall 6', '{"stall_number":6,"approach_tile":[-37, 0, 0]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  meta = EXCLUDED.meta;

-- 6. Seed 24 Cafeteria Dining Chairs
DO $$
DECLARE
  i integer;
BEGIN
  FOR i IN 1..24 LOOP
    INSERT INTO public.office_facility_slots (id, kind, room_id, label, meta)
    VALUES (
      'cafe_seat_' || i,
      'dining_chair',
      'CAFETERIA',
      'Cafeteria Seat #' || i,
      jsonb_build_object(
        'table_index', ((i - 1) / 4) + 1,
        'seat_index', ((i - 1) % 4) + 1,
        'approach_tile', jsonb_build_array(-38 + (((i - 1) % 6) * 2), 0, 11 + (((i - 1) / 6) * 2))
      )
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- 7. Seed 6 Water Dispensers
INSERT INTO public.office_facility_slots (id, kind, room_id, label, meta)
VALUES
  ('dispenser_corridor_north', 'water_dispenser', 'CORRIDORS', 'Corridor North Water Dispenser', '{"jug_pct":100,"pos":[0, 0, -8]}'::jsonb),
  ('dispenser_corridor_south', 'water_dispenser', 'CORRIDORS', 'Corridor South Water Dispenser', '{"jug_pct":100,"pos":[0, 0, 8]}'::jsonb),
  ('dispenser_engineering', 'water_dispenser', 'ENGINEERING', 'Engineering Core Water Dispenser', '{"jug_pct":100,"pos":[-11, 0, -11]}'::jsonb),
  ('dispenser_secops', 'water_dispenser', 'SECOPS', 'QA & SecOps Water Dispenser', '{"jug_pct":100,"pos":[11, 0, -1]}'::jsonb),
  ('dispenser_gym', 'water_dispenser', 'GYM', 'Fitness Gym Hydration Station', '{"jug_pct":100,"pos":[5, 0, 11]}'::jsonb),
  ('dispenser_cafeteria', 'water_dispenser', 'CAFETERIA', 'Cafeteria Fresh Water Dispenser', '{"jug_pct":100,"pos":[-31, 0, 12]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  meta = EXCLUDED.meta;
