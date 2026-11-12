-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0017: Server Room & CR Split
-- Adds Server Admin (Rex), Server Room racks, and splits Comfort Room into Men's CR & Women's CR
-- =============================================================================

-- 1. Idempotently upsert Server Admin (Rex) into office_agents
INSERT INTO public.office_agents (
  id, name, role, department, current_room, status, sub_state, color, desk_x, desk_y, current_x, current_y, kind, model
)
VALUES
  (
    'server_admin',
    'Rex',
    'Systems & Infrastructure Admin',
    'ENGINEERING',
    'Server Room',
    'active',
    'typing',
    '#4f46e5',
    1,
    3,
    1,
    3,
    'resident',
    'gemini-2.0-flash'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  current_room = EXCLUDED.current_room,
  color = EXCLUDED.color,
  desk_x = EXCLUDED.desk_x,
  desk_y = EXCLUDED.desk_y,
  kind = EXCLUDED.kind,
  model = EXCLUDED.model,
  updated_at = now();

-- 2. Seed initial needs for server_admin if office_agent_needs exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'office_agent_needs') THEN
    INSERT INTO public.office_agent_needs (agent_id, energy, hunger, bladder, social, focus)
    VALUES ('server_admin', 92, 18, 12, 35, 96)
    ON CONFLICT (agent_id) DO UPDATE SET
      energy = EXCLUDED.energy,
      hunger = EXCLUDED.hunger,
      bladder = EXCLUDED.bladder,
      focus = EXCLUDED.focus,
      updated_at = now();
  END IF;
END $$;

-- 3. Seed initial daily plan for server_admin if office_daily_plans exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'office_daily_plans') THEN
    INSERT INTO public.office_daily_plans (
      id, agent_id, date, plan_items, current_step_index, state, created_at, updated_at
    )
    VALUES (
      'plan_server_admin_' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYYMMDD'),
      'server_admin',
      (now() AT TIME ZONE 'Asia/Manila')::date,
      '[
        {"time": "09:00", "task": "Check server rack telemetry and temperature loops", "room": "Server Room"},
        {"time": "11:00", "task": "Patch compute node cluster and firmware updates", "room": "Server Room"},
        {"time": "12:30", "task": "Lunch at Grand Cafeteria", "room": "Grand Cafeteria"},
        {"time": "14:00", "task": "Fiber optic cable line audit and latency benchmarks", "room": "Server Room"},
        {"time": "16:30", "task": "Infrastructure backup sync & UPS failover check", "room": "Server Room"}
      ]'::jsonb,
      0,
      'in_progress',
      now(),
      now()
    )
    ON CONFLICT (agent_id, date) DO NOTHING;
  END IF;
END $$;

-- 4. Split and update facility slots for Men's CR, Women's CR, and Server Racks
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'office_facility_slots') THEN
    -- Expand check constraint to include server_rack
    ALTER TABLE public.office_facility_slots DROP CONSTRAINT IF EXISTS office_facility_slots_kind_check;
    ALTER TABLE public.office_facility_slots ADD CONSTRAINT office_facility_slots_kind_check 
      CHECK (kind IN ('bed', 'cr_stall', 'dining_chair', 'water_dispenser', 'server_rack'));

    -- Men's CR Stalls
    INSERT INTO public.office_facility_slots (id, kind, room_id, label, meta)
    VALUES
      ('cr_stall_1', 'cr_stall', 'MENS_CR', 'Men''s Stall 1', '{"approach_tile": [-32, 0, -9]}'::jsonb),
      ('cr_stall_2', 'cr_stall', 'MENS_CR', 'Men''s Stall 2', '{"approach_tile": [-32, 0, -7]}'::jsonb),
      ('cr_stall_3', 'cr_stall', 'MENS_CR', 'Men''s Stall 3 (Accessible)', '{"approach_tile": [-36, 0, -8]}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      room_id = 'MENS_CR',
      label = EXCLUDED.label,
      meta = EXCLUDED.meta,
      updated_at = now();

    -- Women's CR Stalls
    INSERT INTO public.office_facility_slots (id, kind, room_id, label, meta)
    VALUES
      ('cr_stall_4', 'cr_stall', 'WOMENS_CR', 'Women''s Stall 1', '{"approach_tile": [-32, 0, -3]}'::jsonb),
      ('cr_stall_5', 'cr_stall', 'WOMENS_CR', 'Women''s Stall 2', '{"approach_tile": [-32, 0, -1]}'::jsonb),
      ('cr_stall_6', 'cr_stall', 'WOMENS_CR', 'Women''s Stall 3 (Accessible)', '{"approach_tile": [-36, 0, -2]}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      room_id = 'WOMENS_CR',
      label = EXCLUDED.label,
      meta = EXCLUDED.meta,
      updated_at = now();

    -- Server Racks
    INSERT INTO public.office_facility_slots (id, kind, room_id, label, meta)
    VALUES
      ('rack_alpha', 'server_rack', 'SERVER_ROOM', 'Primary Compute Rack 01', '{"approach_tile": [-36, 0, 2.5]}'::jsonb),
      ('rack_beta', 'server_rack', 'SERVER_ROOM', 'Database Storage Array 02', '{"approach_tile": [-36, 0, 4.5]}'::jsonb),
      ('rack_gamma', 'server_rack', 'SERVER_ROOM', 'Inference Accelerator 03', '{"approach_tile": [-35, 0, 4]}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      room_id = 'SERVER_ROOM',
      label = EXCLUDED.label,
      meta = EXCLUDED.meta,
      updated_at = now();
  END IF;
END $$;

-- 5. Activity log entry
INSERT INTO public.office_logs (agent_id, agent_name, level, category, message, details)
VALUES (
  'server_admin',
  'Rex',
  'info',
  'system',
  'Rex initialized Server Room telemetry and active rack cooling loops.',
  '{"status": "nominal", "cooling": "active", "racks_online": 3}'::jsonb
);
