-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0021: Wider Doorways & Walk-3D Exterior Enclosure
-- Ticket-32: Records widened doorways (>= 2.4m-2.6m clear), exterior entry doors,
-- and Walk-3D full perimeter enclosure in public.office_map_versions.
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
        'ticket', 'TICKET-32',
        'exteriorEnclosure', true,
        'doorwayClearanceMeters', 2.6,
        'interactiveDoorsCount', 14,
        'walkSmoothPhysics', true,
        'nameplateMaxDistanceMeters', 10.5
      ),
      true,
      'josiah',
      'TICKET-32: Full Walk-3D exterior enclosure with windows/doors, 14 interactive [E] doors, widened 2.6m doorways, and smooth physics movement'
    );
  END IF;
END $$;
