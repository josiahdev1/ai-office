-- Migration: 0008_supabase_cron_learning.sql
-- Enables 24/7 background AI learning schedule directly inside Supabase Postgres using pg_cron and pg_net.

-- 1. Enable pg_cron and pg_net extensions if not already present
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Create helper function to trigger the live Vercel AI learning cycle
create or replace function public.trigger_autonomous_fleet_learning()
returns jsonb
language plpgsql
security definer
as $$
declare
  request_id bigint;
begin
  -- Pings the live Vercel endpoint which runs Gemini domain synthesis and inserts into office_knowledge
  select net.http_post(
    url := 'https://easyup-hq.vercel.app/api/office/cron/learn',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'User-Agent', 'Supabase-pg_cron-Autonomous-Learner'
    ),
    body := jsonb_build_object(
      'source', 'supabase_pg_cron',
      'triggered_at', now()
    )
  ) into request_id;

  return jsonb_build_object(
    'success', true,
    'net_request_id', request_id,
    'scheduled_at', now()
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
end;
$$;

-- 3. Schedule the cron job to run every hour (0 * * * *)
-- To activate in Supabase SQL editor:
-- select cron.schedule('easyup_autonomous_learning_hourly', '0 * * * *', $$select public.trigger_autonomous_fleet_learning()$$);
