-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0019: Architectural Overhaul & Gym Trainer
-- Adds Resident Gym Trainer (Coach Miguel) and Fitness Conditioning
-- Total Autonomous Fleet Size: 31 Agents
-- =============================================================================

-- 1. Idempotently upsert Coach Miguel into public.agents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public') THEN
    INSERT INTO public.agents (
      id, name, role, department, avatar, status, sub_state,
      current_task, current_file, terminal_preview, progress_pct,
      desk_id, desk_x, desk_y, color, hair, skin, last_action
    )
    VALUES
      (
        'coach_miguel',
        'Coach Miguel',
        'Head Athletic Trainer & Ergonomics Coach',
        'Facilities & Wellness',
        '/avatars/coach_miguel.png',
        'working',
        'working',
        'Leading functional conditioning circuits, treadmill runs, and desk ergonomics',
        'wellness/gym_schedule.ts',
        'Active circuits: Treadmill Intervals, Prone Core Plank, Dumbbell Hypertrophy',
        92,
        'gym-coach-1',
        20,
        28,
        '#ef4444',
        '#1e293b',
        '#fed7aa',
        'Coaching treadmill form and floor conditioning in Rec & Gym'
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

-- 2. Idempotently upsert Coach Miguel into public.office_agents
INSERT INTO public.office_agents (
  id, name, role, department, current_room, status, sub_state, color, desk_x, desk_y, current_x, current_y, kind, model
)
VALUES
  (
    'coach_miguel',
    'Coach Miguel',
    'Head Athletic Trainer & Ergonomics Coach',
    'FACILITIES_WELLNESS',
    'Rec & Gym',
    'active',
    'working',
    '#ef4444',
    20,
    28,
    20,
    28,
    'resident',
    'gemini-2.0-flash'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  current_room = EXCLUDED.current_room,
  status = EXCLUDED.status,
  sub_state = EXCLUDED.sub_state,
  color = EXCLUDED.color,
  desk_x = EXCLUDED.desk_x,
  desk_y = EXCLUDED.desk_y,
  kind = EXCLUDED.kind,
  model = EXCLUDED.model;

-- 3. Idempotently seed Coach Miguel needs if public.office_agent_needs exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'office_agent_needs' AND table_schema = 'public') THEN
    INSERT INTO public.office_agent_needs (
      agent_id, energy, hunger, thirst, bladder, health, morale, caffeine, sleep_debt, state
    )
    VALUES
      ('coach_miguel', 95.0, 85.0, 90.0, 90.0, 99.0, 95.0, 0.0, 0.0, 'working')
    ON CONFLICT (agent_id) DO UPDATE SET
      energy = EXCLUDED.energy,
      hunger = EXCLUDED.hunger,
      thirst = EXCLUDED.thirst,
      bladder = EXCLUDED.bladder,
      health = EXCLUDED.health,
      morale = EXCLUDED.morale,
      state = EXCLUDED.state;
  END IF;
END $$;
