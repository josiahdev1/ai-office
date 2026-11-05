-- =============================================================================
-- EasyUp Software Solution HQ - Supabase Realtime Architecture Migration
-- Tables: office_agents, office_messages, office_logs, office_approvals
-- =============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Office Agents Table
create table if not exists public.office_agents (
  id text primary key,
  name text not null,
  role text not null,
  department text not null,
  desk_x integer not null,
  desk_y integer not null,
  current_x integer not null,
  current_y integer not null,
  status text not null default 'coding',
  current_task text,
  current_room text,
  model text,
  color text,
  last_active_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Office Messages Table (Inter-team Dynamic Non-looping Communication)
create table if not exists public.office_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  sender_name text not null,
  sender_department text not null,
  recipient_id text,
  recipient_name text,
  channel text default 'general',
  content text not null,
  message_type text default 'chat',
  created_at timestamptz default now()
);

-- 4. Office Execution & Telemetry Logs
create table if not exists public.office_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id text,
  agent_name text,
  level text default 'info',
  category text not null,
  message text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 5. Human-in-the-Loop Approvals (Go-Signal & Production Gates)
create table if not exists public.office_approvals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  requested_by text not null,
  status text default 'pending',
  impact_level text default 'medium',
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- 6. Enable Row Level Security (RLS)
alter table public.office_agents enable row level security;
alter table public.office_messages enable row level security;
alter table public.office_logs enable row level security;
alter table public.office_approvals enable row level security;

-- 7. Policies for Public / App Access
create policy "Allow public read office_agents" on public.office_agents for select using (true);
create policy "Allow public insert/update office_agents" on public.office_agents for all using (true) with check (true);

create policy "Allow public read office_messages" on public.office_messages for select using (true);
create policy "Allow public insert office_messages" on public.office_messages for insert with check (true);

create policy "Allow public read office_logs" on public.office_logs for select using (true);
create policy "Allow public insert office_logs" on public.office_logs for insert with check (true);

create policy "Allow public read office_approvals" on public.office_approvals for select using (true);
create policy "Allow public update/insert office_approvals" on public.office_approvals for all using (true) with check (true);

-- 8. Add Tables to Realtime Publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'office_agents') then
    alter publication supabase_realtime add table public.office_agents;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'office_messages') then
    alter publication supabase_realtime add table public.office_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'office_logs') then
    alter publication supabase_realtime add table public.office_logs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'office_approvals') then
    alter publication supabase_realtime add table public.office_approvals;
  end if;
exception when others then
  null; -- Gracefully ignore if publication doesn't exist in local dev
end $$;
