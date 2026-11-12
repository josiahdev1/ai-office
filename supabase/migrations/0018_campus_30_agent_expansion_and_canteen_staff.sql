-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0018: 30-Agent Campus Expansion & Canteen Staff
-- Adds Canteen Staff (Chef Maria) and Pantry Staff (Barista Ken)
-- Expands Dining Seats to 32 and Nap Beds to 16 with zero agent sharing
-- =============================================================================

-- 1. Idempotently upsert Chef Maria and Barista Ken into public.agents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public') THEN
    INSERT INTO public.agents (
      id, name, role, department, avatar, status, sub_state,
      current_task, current_file, terminal_preview, progress_pct,
      desk_id, desk_x, desk_y, color, hair, skin, last_action
    )
    VALUES
      (
        'chef_maria',
        'Chef Maria',
        'Executive Head Chef & Culinary Lead',
        'Facilities & Wellness',
        '/avatars/chef_maria.png',
        'working',
        'working',
        'Preparing farm-to-table organic hot buffet and supervising serving lines',
        'kitchen/buffet_menu.ts',
        'Active buffet lines: Garlic Rice, Chicken Adobo, Sinigang Broth, Veggies, Fruits',
        90,
        'canteen-buffet-1',
        2,
        28,
        '#f59e0b',
        '#334155',
        '#fed7aa',
        'Supervising hot meal buffet line'
      ),
      (
        'barista_ken',
        'Barista Ken',
        'Master Barista & Beverage Specialist',
        'Facilities & Wellness',
        '/avatars/barista_ken.png',
        'working',
        'working',
        'Crafting artisan espresso beverages and cold brew for engineering teams',
        'pantry/coffee_roster.ts',
        'Espresso bar: 9 bar extraction, single-origin Philippine Arabica',
        88,
        'pantry-bar-1',
        12,
        28,
        '#d97706',
        '#1e293b',
        '#fcd34d',
        'Pulling espresso shots at coffee bar'
      )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      department = EXCLUDED.department,
      status = EXCLUDED.status,
      sub_state = EXCLUDED.sub_state,
      current_task = EXCLUDED.current_task,
      progress_pct = EXCLUDED.progress_pct,
      color = EXCLUDED.color,
      desk_x = EXCLUDED.desk_x,
      desk_y = EXCLUDED.desk_y,
      last_action = EXCLUDED.last_action;
  END IF;
END $$;

-- 2. Idempotently upsert Chef Maria and Barista Ken into public.office_agents
INSERT INTO public.office_agents (
  id, name, role, department, current_room, status, sub_state, color, desk_x, desk_y, current_x, current_y, kind, model
)
VALUES
  (
    'chef_maria',
    'Chef Maria',
    'Executive Head Chef & Culinary Lead',
    'FACILITIES_WELLNESS',
    'Grand Cafeteria',
    'active',
    'working',
    '#f59e0b',
    2,
    28,
    2,
    28,
    'resident',
    'gemini-2.0-flash'
  ),
  (
    'barista_ken',
    'Barista Ken',
    'Master Barista & Beverage Specialist',
    'FACILITIES_WELLNESS',
    'Pantry & Canteen',
    'active',
    'working',
    '#d97706',
    12,
    28,
    12,
    28,
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

-- 3. Seed initial needs for chef_maria and barista_ken
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'office_agent_needs' AND table_schema = 'public') THEN
    INSERT INTO public.office_agent_needs (agent_id, energy, hunger, thirst, bladder, health, morale)
    VALUES
      ('chef_maria', 95, 85, 90, 90, 95, 92),
      ('barista_ken', 92, 88, 95, 90, 95, 90)
    ON CONFLICT (agent_id) DO UPDATE SET
      energy = EXCLUDED.energy,
      hunger = EXCLUDED.hunger,
      thirst = EXCLUDED.thirst,
      bladder = EXCLUDED.bladder,
      health = EXCLUDED.health,
      morale = EXCLUDED.morale,
      updated_at = now();
  END IF;
END $$;

-- 4. Seed initial daily plans for chef_maria and barista_ken
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'office_daily_plans' AND table_schema = 'public') THEN
    INSERT INTO public.office_daily_plans (
      id, agent_id, date, plan_items, current_step_index, state, created_at, updated_at
    )
    VALUES
      (
        'plan_chef_maria_' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYYMMDD'),
        'chef_maria',
        CURRENT_DATE,
        '[{"time": "08:30", "room": "Grand Cafeteria", "task": "Prepare hot buffet breakfast"}, {"time": "12:00", "room": "Grand Cafeteria", "task": "Supervise lunch dining line"}, {"time": "15:00", "room": "Grand Cafeteria", "task": "Afternoon merienda prep"}]'::jsonb,
        0,
        'in_progress',
        now(),
        now()
      ),
      (
        'plan_barista_ken_' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYYMMDD'),
        'barista_ken',
        CURRENT_DATE,
        '[{"time": "08:00", "room": "Pantry & Canteen", "task": "Morning espresso calibrations"}, {"time": "10:30", "room": "Pantry & Canteen", "task": "Serve peak morning coffee rush"}, {"time": "14:00", "room": "Pantry & Canteen", "task": "Cold brew and iced tea refills"}]'::jsonb,
        0,
        'in_progress',
        now(),
        now()
      )
    ON CONFLICT (agent_id, date) DO NOTHING;
  END IF;
END $$;

-- 5. Expand facility slots: 32 dining chairs and 16 nap beds
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'office_facility_slots' AND table_schema = 'public') THEN
    -- Ensure 32 Cafeteria Dining Chairs
    INSERT INTO public.office_facility_slots (id, kind, room_id, label, meta)
    SELECT
      'dining_chair_' || i,
      'dining_chair',
      'CAFETERIA',
      'Cafeteria Seat ' || i,
      json_build_object('seat_number', i)::jsonb
    FROM generate_series(1, 32) AS i
    ON CONFLICT (id) DO UPDATE SET
      room_id = 'CAFETERIA',
      label = EXCLUDED.label,
      updated_at = now();

    -- Ensure 16 Wellness Beds
    INSERT INTO public.office_facility_slots (id, kind, room_id, label, meta)
    SELECT
      'nap_bed_' || i,
      'bed',
      'NAP_ROOM',
      'Wellness Bed ' || i,
      json_build_object('bed_number', i)::jsonb
    FROM generate_series(1, 16) AS i
    ON CONFLICT (id) DO UPDATE SET
      room_id = 'NAP_ROOM',
      label = EXCLUDED.label,
      updated_at = now();
  END IF;
END $$;

-- 6. Activity log entry
INSERT INTO public.office_logs (agent_id, agent_name, level, category, message, details)
VALUES
  (
    'chef_maria',
    'Chef Maria',
    'info',
    'facility',
    'Chef Maria opened the Grand Cafeteria hot buffet line with 32 dining seats.',
    '{"seats": 32, "buffet_stations": 5, "capacity": "nominal"}'::jsonb
  ),
  (
    'barista_ken',
    'Barista Ken',
    'info',
    'facility',
    'Barista Ken dialed in the espresso grinder and stocked artisan single-origin beans.',
    '{"espresso_bar": "online", "roast": "Benguet Arabica"}'::jsonb
  );
