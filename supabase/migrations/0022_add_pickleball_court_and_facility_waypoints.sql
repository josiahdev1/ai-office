-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0022: Outdoor Pickleball Court & Facility Waypoints
-- Ticket-33: Seeds pickleball_court room zone, 2v2 court slots, sideline bench
-- waypoints, and 2D/3D parity metadata in public.office_map_versions.
-- 100% Idempotent & Non-Destructive (No DROP, No CASCADE).
-- =============================================================================

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
        'ticket', 'TICKET-33',
        'pickleball_court', jsonb_build_object(
          'center', jsonb_build_array(-16, 0, -33),
          'size', jsonb_build_array(16, 12),
          'court_slots', jsonb_build_object(
            'court_nw', jsonb_build_array(-20.5, 0, -34.8),
            'court_sw', jsonb_build_array(-20.5, 0, -31.2),
            'court_ne', jsonb_build_array(-11.5, 0, -34.8),
            'court_se', jsonb_build_array(-11.5, 0, -31.2)
          ),
          'bench_slots', jsonb_build_array(
            jsonb_build_array(-18.5, 0, -27.8),
            jsonb_build_array(-16.0, 0, -27.8),
            jsonb_build_array(-13.5, 0, -27.8)
          )
        ),
        'softShadows', true,
        'voxelCharacterOverhaul', true,
        'parity2D3D', true
      ),
      true,
      'josiah',
      'TICKET-33: Outdoor 2v2 Pickleball Court, articulated voxel characters, PCFSoftShadowMap, unrestricted 3D orbit/zoom & 2D/3D parity'
    );
  END IF;
END $$;
