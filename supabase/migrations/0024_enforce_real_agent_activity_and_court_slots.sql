-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0024: Real Agent Activity & Court Slots
-- Ticket-36: Ensures office_agents tracks activity_detail & court_slot so
-- Supabase is 100% single source of truth across reloads and tabs.
-- 100% Idempotent & Non-Destructive (No DROP, No CASCADE).
-- =============================================================================

ALTER TABLE IF EXISTS public.office_agents
  ADD COLUMN IF NOT EXISTS activity_detail text,
  ADD COLUMN IF NOT EXISTS court_slot text;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public') THEN
    ALTER TABLE public.agents
      ADD COLUMN IF NOT EXISTS activity_detail text,
      ADD COLUMN IF NOT EXISTS court_slot text;
  END IF;
END $$;
