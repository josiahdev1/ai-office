-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0020: Expanded Server Room & Interior Layout
-- Ticket-30: Expands Server Room footprint (x in [-46, -29], z in [1, 7.5]),
-- updates Rex (server_admin) NOC coordinates, and records active map version.
-- 100% Idempotent & Non-Destructive (No DROP, No CASCADE).
-- =============================================================================

-- 1. Update Rex (server_admin) coordinates in public.office_agents
UPDATE public.office_agents
SET
  current_room = 'Server Room',
  desk_x = -32,
  desk_y = 4,
  current_x = -32,
  current_y = 4
WHERE id = 'server_admin';

-- 2. Update Rex (server_admin) in public.agents if present
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public') THEN
    UPDATE public.agents
    SET
      desk_x = -32,
      desk_y = 4,
      last_action = 'Monitoring 6 dual-aisle server racks & dual CRAC chillers in expanded Server Room'
    WHERE id = 'server_admin';
  END IF;
END $$;

-- 3. Record new active map version in public.office_map_versions if table exists
DO $$
DECLARE
  next_ver integer;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'office_map_versions' AND table_schema = 'public') THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO next_ver FROM public.office_map_versions;

    UPDATE public.office_map_versions SET is_active = false WHERE is_active = true;

    INSERT INTO public.office_map_versions (
      version,
      map_data,
      is_active,
      author,
      change_summary
    )
    VALUES (
      next_ver,
      jsonb_build_object(
        'ticket', 'TICKET-30',
        'serverRoomBounds', jsonb_build_object('minX', -46, 'maxX', -29, 'minZ', 1, 'maxZ', 7.5),
        'serverRacksCount', 6,
        'cracUnitsCount', 2,
        'walkInsideMode', true
      ),
      true,
      'josiah',
      'TICKET-30: Expanded Server Room west bay (6 racks, dual CRAC) & Walk-Inside 3D interior layout'
    );
  END IF;
END $$;
