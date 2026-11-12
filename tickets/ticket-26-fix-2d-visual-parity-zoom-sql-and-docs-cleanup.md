# [TICKET-26] 2D Visual Parity, 100% Zoom Framing, Safe SQL Migrations, and Docs/Skills Consolidation

**Phase / Milestone**: Phase K10 Post-Release & Polish  
**Status**: COMPLETED  
**Date**: 2026-11-12  
**Commit SHA**: pending  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet  

---

## 1. Context & Objectives
- **Supabase Direct Execution vs DDL**: User inquired why manual SQL execution in Supabase was needed. Explained with full transparency that `.env.local` contains `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which has client-level DML permissions (PostgREST table reads/writes) but is strictly forbidden by Supabase from executing raw DDL (`CREATE TABLE`, `ALTER TABLE`) without `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`.
- **SQL Migration Errors & Warnings**:
  - `0014_office_brain_learning.sql`: Threw `ERROR: 42703: column "ts" does not exist` when `office_brain_learning_log` or `office_agent_insights` pre-existed without column `ts`.
  - `0016_consolidated_missing_tables.sql`: Supabase flagged destructive operations warning due to `DROP POLICY IF EXISTS` and `ON DELETE CASCADE`.
- **2D View Incompleteness**: In 2D isometric view (`?v=2`), the West Wing rooms were rendered as empty flat colored floor slabs with 3 lonely floating desks, missing the Server Room racks, CRAC chiller, Rex's workstation, toilet stalls, wash basins, vanity mirrors, nap beds, janitorial carts, buffet counter, and dining tables.
- **Camera Zoom & 100% Viewport Clipping**: At standard 100% browser zoom, the camera was centered at `(2, 0, 2)` with minimum zoom clamped at 18, cutting off the entire West Wing on the left and forcing the user to zoom out.
- **Deduplication of `.agent` / `.agents` and Skills Migration**: Deduplicated root agent directories by removing the redundant `.agents` symlink, moved all skills to `docs/skills/`, and ensured seamless discovery.

## 2. Architectural Design & Key Changes
1. **Full 2D Isometric Props & Parity in `OfficeCanvas2D.tsx`**:
   - Added complete 2D isometric prop rendering routines for the entire West Wing:
     - **Server Room NOC**: Rex's dedicated workstation desk with dual curved monitors (matrix green CLI + cyan telemetry), keyboard, mouse, task chair, 3 heavy server racks with real-time animated blinking LEDs (green/blue/amber), CRAC cooling chiller unit with digital display, suspended overhead cable trays, and glowing amber door sign.
     - **Men's CR**: 3 private toilet cubicles with doors, chrome handles, and occupied/vacant LED indicator plates, wash basin counter with 2 sinks, vanity mirror, commercial hand dryer, and glowing blue door sign.
     - **Women's CR**: 3 private toilet cubicles with doors, chrome handles, and occupied/vacant LED indicator plates, wash basin counter with 2 sinks, vanity mirror, hand dryer, and glowing rose door sign.
     - **Nap Room / Wellness Suite**: 3 executive single and bunk beds with mattresses, soft pillows, navy indigo duvets, bedside nightstands with warm glowing lamps, and DND status lights.
     - **Facilities & Janitorial**: Yellow commercial cleaning carts with wheels, mop buckets, and refuse bags, multi-tier rack with blue 5-gallon water jugs, wall mop tool brackets, and glowing yellow door sign.
     - **Grand Cafeteria**: 8.4m hot meal food buffet serving counter with glass sneeze guard and 5 steam trays (jasmine rice, chicken adobo, sinigang soup, sautéed greens, fresh fruit), plus 6 dining tables with 24 dining chairs matching `CAFETERIA_SEATS`.
   - Added `hasDedicatedFurniture` check: removed floating generic desks for `boss`, `cleaner_1`, `cleaner_2`, and `server_admin`.
   - Added autonomous roaming patrol navigation in 2D mode: Boss patrols departments, Cleaners patrol all rooms and wings, and Rex patrols between his terminal desk and the server racks.
2. **Camera Centering & 100% Viewport Fit**:
   - Calibrated `CAMERA_PRESETS.OVERVIEW` target from `[2, 0, 2]` to `[-6.5, 0, 0]` and zoom to `13.5` in `src/config/officeLayout.ts`.
   - Updated `OrthographicCamera` position in `OfficeCanvas3D.tsx` to `[43.5, 42, 50]` with zoom `13.5`.
   - Lowered `minZoom` in `CameraController.tsx` from `18` to `8` to prevent artificial zoom clamping.
   - Lowered 2D wheel zoom minimum clamp in `OfficeCanvas2D.tsx` to `0.4`.
   - Both 2D and 3D modes now display the entire campus (Main building + West Wing + parking lot + highway) centered and fully visible at 100% browser zoom without manual zooming.
3. **Safe, Additive SQL Migrations**:
   - Fixed `0014_office_brain_learning.sql`: added `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ts` for both `office_brain_learning_log` and `office_agent_insights` before index creation and inserts.
   - Rewrote `0016_consolidated_missing_tables.sql`: strictly additive with zero `DROP`, `TRUNCATE`, or `CASCADE` keywords. Added `IF NOT EXISTS` guards around all table and column definitions, RLS policies, and Realtime publications.
4. **Docs & Skills Organization**:
   - Removed `.agents` duplicate symlink.
   - Relocated skills to `docs/skills/` (`docs/skills/campus-traffic`, `docs/skills/iso-office-art`, `docs/skills/keep-existing-sprites`, `docs/skills/office-ui-chrome`, `docs/skills/supabase`, `docs/skills/supabase-postgres-best-practices`, `docs/skills/supabase-realtime-data`, `docs/skills/tilemap-walkability`).
   - Symlinked `.agent/skills -> ../docs/skills` for Antigravity discovery compatibility.

## 3. Data & Schema Modifications
- `supabase/migrations/0014_office_brain_learning.sql`: Idempotent column additions (`ts`, `confidence`, `source_ids`, etc.) for `office_brain_learning_log` and `office_agent_insights`.
- `supabase/migrations/0016_consolidated_missing_tables.sql`: Consolidated master schema script containing all 26 additive tables across Phases K1 through K10 with safe non-destructive policies.

## 4. Verification & Quality Gates
- **Lint**: Passed (`npm run lint` — 0 errors, 5 pre-existing warnings in unrelated files)
- **Type Check**: Passed (`npx tsc --noEmit` — 0 errors)
- **Unit & Integration Tests**: Passed (`npm test` — 28 test files, 267 tests passed 100%)
- **Build**: Passed (`npm run build` — production build compiled cleanly with Turbopack)
- **Evidence**: 2D and 3D camera presets aligned, West Wing visual props rendered identically in 2D and 3D.

## 5. Notes & Dependencies
- Resolves all visual discrepancy issues reported between 2D view and 3D view.
- Provides a clean single copy-paste SQL migration in `0016_consolidated_missing_tables.sql` with zero destructive warnings in the Supabase SQL editor.
