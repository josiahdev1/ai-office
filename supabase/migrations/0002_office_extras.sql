-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0002: Office Extras & Extensions
-- Tables: office_tasks, office_goals, office_settings
-- Extensions: office_agents (sub_state, progress, seat_id, facing, avatar, appearance)
-- =============================================================================

-- 1. Extend office_agents with rich visual simulation columns (idempotent)
alter table public.office_agents add column if not exists sub_state text default 'idle';
alter table public.office_agents add column if not exists progress integer default 0;
alter table public.office_agents add column if not exists seat_id text;
alter table public.office_agents add column if not exists facing text default 'SE';
alter table public.office_agents add column if not exists avatar text;
alter table public.office_agents add column if not exists appearance jsonb default '{}'::jsonb;

-- 2. Tasks Table
create table if not exists public.office_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  assigned_to text references public.office_agents(id) on delete set null,
  department text not null,
  status text not null default 'in_progress',
  priority text default 'medium',
  progress integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Goals Table
create table if not exists public.office_goals (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  title text not null,
  target_kpi text,
  progress integer default 0,
  status text default 'on_track',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Settings Table
create table if not exists public.office_settings (
  id text primary key default 'default',
  mode text not null default 'FOCUS_WORK',
  sound_enabled boolean default true,
  speed integer default 1,
  theme text default 'dark',
  layout text default 'isometric',
  updated_at timestamptz default now()
);

-- Initial default settings row
insert into public.office_settings (id, mode, sound_enabled, speed, theme, layout)
values ('default', 'FOCUS_WORK', true, 1, 'dark', 'isometric')
on conflict (id) do nothing;

-- 5. Enable Row Level Security (RLS)
alter table public.office_tasks enable row level security;
alter table public.office_goals enable row level security;
alter table public.office_settings enable row level security;

-- 6. Policies for Public App Access
create policy "Allow public read office_tasks" on public.office_tasks for select using (true);
create policy "Allow public insert/update office_tasks" on public.office_tasks for all using (true) with check (true);

create policy "Allow public read office_goals" on public.office_goals for select using (true);
create policy "Allow public insert/update office_goals" on public.office_goals for all using (true) with check (true);

create policy "Allow public read office_settings" on public.office_settings for select using (true);
create policy "Allow public insert/update office_settings" on public.office_settings for all using (true) with check (true);

-- 7. Add Tables to Realtime Publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'office_tasks') then
    alter publication supabase_realtime add table public.office_tasks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'office_goals') then
    alter publication supabase_realtime add table public.office_goals;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'office_settings') then
    alter publication supabase_realtime add table public.office_settings;
  end if;
exception when others then
  null; -- Gracefully ignore if publication doesn't exist in local dev
end $$;
