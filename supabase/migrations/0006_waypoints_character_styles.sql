-- ============================================================================
-- EasyUp Software Solution HQ — Additive Waypoints, Targets & Character Styles
-- Branch: office-v3
-- Strictly additive migration preserving all existing rows in public.office_agents
-- ============================================================================

-- 1. Ensure waypoint navigation, target destinations, and character style columns exist
alter table public.office_agents
  add column if not exists target_x float default null,
  add column if not exists target_y float default null,
  add column if not exists target_z float default null,
  add column if not exists desk_z float default 0,
  add column if not exists current_z float default 0,
  add column if not exists rotation_y float default 0,
  add column if not exists gender text default 'unspecified',
  add column if not exists sprite_key text default 'dev_male_1',
  add column if not exists hair_color text default '#2d3748',
  add column if not exists outfit_color text default '#3182ce',
  add column if not exists sub_state text default 'seated';

-- 2. Team Communications & Dynamic Dialogues (Non-looping event-driven dialogues)
create table if not exists public.office_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text references public.office_agents(id) on delete cascade,
  receiver_id text references public.office_agents(id) on delete set null,
  department text not null default 'GENERAL',
  message text,
  topic text default 'sync',
  context_metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Telemetry & Execution Logs
create table if not exists public.office_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id text references public.office_agents(id) on delete set null,
  level text not null default 'INFO',
  category text not null default 'SYSTEM',
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Human-in-the-Loop Go-Signal Approvals
create table if not exists public.office_approvals (
  id uuid primary key default gen_random_uuid(),
  agent_id text references public.office_agents(id) on delete cascade,
  type text not null,
  title text not null,
  summary text not null,
  payload jsonb default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Row Level Security and Idempotent Policies
alter table public.office_messages enable row level security;
alter table public.office_logs enable row level security;
alter table public.office_approvals enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow read messages') then
    create policy "Allow read messages" on public.office_messages for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow insert messages') then
    create policy "Allow insert messages" on public.office_messages for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow read logs') then
    create policy "Allow read logs" on public.office_logs for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow insert logs') then
    create policy "Allow insert logs" on public.office_logs for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow read approvals') then
    create policy "Allow read approvals" on public.office_approvals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Allow update approvals') then
    create policy "Allow update approvals" on public.office_approvals for update using (true);
  end if;
end $$;
