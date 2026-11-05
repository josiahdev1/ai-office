-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0004: Car Commute & Accessories
-- Columns: car_style, car_color, bay, accessories on office_agents
-- Settings: commute_enabled, traffic_density, cars_enabled on office_settings
-- =============================================================================

-- 1. Extend office_agents with car and cosmetic accessories (idempotent)
alter table public.office_agents add column if not exists car_style text;
alter table public.office_agents add column if not exists car_color text;
alter table public.office_agents add column if not exists bay integer;
alter table public.office_agents add column if not exists accessories jsonb default '[]'::jsonb;

-- 2. Extend office_settings with campus traffic configurations (idempotent)
alter table public.office_settings add column if not exists commute_enabled boolean default true;
alter table public.office_settings add column if not exists traffic_density text default 'medium';
alter table public.office_settings add column if not exists cars_enabled boolean default true;

-- 3. Update default settings row if present
update public.office_settings
set commute_enabled = coalesce(commute_enabled, true),
    traffic_density = coalesce(traffic_density, 'medium'),
    cars_enabled = coalesce(cars_enabled, true)
where id = 'default';
