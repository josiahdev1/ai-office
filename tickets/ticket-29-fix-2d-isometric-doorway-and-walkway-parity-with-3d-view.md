# [TICKET-29] Fix 2D Isometric Doorway & Walkway Parity with 3D View

**Phase / Milestone**: Phase K10 Post-Release & Polish  
**Status**: COMPLETED  
**Date**: 2026-11-13  
**Commit SHA**: pending  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet  

---

## 1. Context & Objectives
- **Missing Doorway / Walkway Openings in 2D (`?v=2`)**: In the 3D view (`image_1946a5.png`), the main exterior wall separating the main office from the West Wing / Comfort Rooms and the interior department partitions have clear doorway openings and glowing floor walkways allowing agents to pass through. However, in the 2D isometric view (`image_19473d.png` and `image_194721.png`), `OfficeCanvas2D.tsx` renders solid continuous wall segments right across the doorway openings, visually blocking the walkway path even though the white walkway slab appears outside the wall.
- **Objective**: Audit and update wall/doorway rendering in `OfficeCanvas2D.tsx` (and shared wall/portal definitions in `src/config/officeLayout.ts` / `office_map_versions`) so every doorway, hallway portal, and interior partition opening rendered in 3D is identically carved out and visually open in 2D.

## 2. Architectural Design & Key Changes
1. **Doorway & Wall Gap Synchronization (`OfficeCanvas2D.tsx` & `BuildingArchitecture.tsx`)**:
   - Split the Main Building West Wall (`x = -23.2`) in `OfficeCanvas2D.tsx` into 3 doorway-aware segments (`z = -16.3` len `14.2`, `z = 0` len `13.6`, `z = 16.3` len `14.2`) matching `BuildingArchitecture.tsx`, and enqueued them into `renderQueue` for accurate back-to-front isometric occlusion.
   - Aligned `BuildingArchitecture.tsx` West Wall segment lengths (`14.2` / `13.6` / `14.2`) so the `z = -8` and `z = 8` 2.4m doorway portals are completely unobstructed and added glowing cyan doorway threshold strips at `(-23.2, 0.045, -8)` and `(-23.2, 0.045, 8)`.
2. **Walkability & West Wing Shell Parity (`OfficeCanvas2D.tsx`)**:
   - Aligned West Wing corridor connectors (`[-25.5, 0.02, -8, 5.0, 0.04, 2.4]` and `[-25.5, 0.02, 8, 5.0, 0.04, 2.4]`) and Main Corridor (`[-27.5, 0.02, 0, 2.4, 0.04, 44]`) to match 3D and A\* walkable grid coordinates (`src/engine/pathfinding.ts`).
   - Added the missing Wellness Wing Concrete Apron, Foundation Slab, North Wall (`z = -23.2`), West Exterior Wall (`x = -41.2`) with windows, and South Cutaway Front Wall (`z = 23.2`) in `OfficeCanvas2D.tsx`.

## 3. Data & Schema Modifications
- No database schema changes required; consumes existing doorway/portal geometry and active `office_map_versions`.

## 4. Verification & Quality Gates
- **Lint**: `npm run lint` — **PASSED** (0 errors, 7 pre-existing warnings).
- **Type Check**: `npx tsc --noEmit` — **PASSED** (0 errors).
- **Unit & Integration Tests**: `npm test` — **PASSED** (28/28 test files, 267/267 tests passed in 10.82s).
- **Build**: `npm run build` — **PASSED** (Next.js 16.4.5 Turbopack compiled in 7.0s, 18/18 static pages generated).
- **Playwright Visual QA**: **PASSED** on live production server (`http://localhost:3000/` and `http://localhost:3000/?v=2`) at `1440x900` and `1280x800`:
  - Confirmed `z = -8` and `z = 8` doorways between Main Building and West Wing are cleanly open with glowing cyan thresholds and continuous white walkway strips in both 2D and 3D views.
  - Confirmed Wellness Wing shell, corridors, and depth-sorted walls match 3D with zero React hydration errors or JS runtime exceptions (only local `/_vercel/insights/script.js` 404).

## 5. Notes & Dependencies
- Follows `tickets/ticket-28-header-navigation-consolidation-and-responsive-layout.md`.
- Strictly adheres to `AGENTS.md` Ticket-First and Mandatory Playwright Verification rules.
