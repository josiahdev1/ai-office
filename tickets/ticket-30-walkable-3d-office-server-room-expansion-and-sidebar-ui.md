# [TICKET-30] Walkable Eye-Level 3D Office, Expanded Server Room, Realistic Interior Aesthetic, Clean Sidebar UI & Fullscreen Mode

**Phase / Milestone**: Phase K10 Post-Release & Polish  
**Status**: COMPLETED  
**Date**: 2026-11-13  
**Commit SHA**: `638367c`  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet  

---

## 1. Context & Objectives
- **Playwright Visual & Glitch Audit**: Run a full Playwright inspection across both 3D and 2D (`?v=2`) views to detect and fix any remaining visual glitches, clipping geometry, overlapping props, floating labels, or broken camera bounds before and after applying the redesign.
- **Server Room Expansion**: The current Server Room is too cramped. Expand its floorplan footprint (`validateMap` passing, full A* walkability) to comfortably house multiple server rack aisles, overhead cable trays, dual CRAC cooling units, telemetry wall displays, and Rex's SysAdmin workstation with generous patrol clearances.
- **Realistic Walkable 3D Interior Mode (Reference Image 1)**: Upgrade the 3D office aesthetic and camera system to support an immersive, realistic interior perspective where you can walk inside the office (`WASD` / Arrow keys + mouse look / click-to-walk interior navigation) with realistic architectural details—drop-ceiling acoustic grid panels with recessed LED light strips, large panoramic exterior windows with Iloilo skyline/day-night lighting, warm wood-grain executive desks, potted indoor plants, ergonomic task chairs, and depth-rich lighting.
- **Clean Agent-Office Sidebar UI/UX + True Fullscreen Canvas Toggle (Reference Image 2)**: Redesign the surrounding HUD chrome into a clean, structured workspace layout featuring:
  - **Left Navigation Sidebar**: Clean vertical navigation (`Office / HQ`, `Jarvis Chat`, `Workflows / Daily Plan`, `Departments`, `Approvals`, `Agent Log`, `Brain Log`, `Reminders`, `System Health`), quick theme/lighting mode switcher (`Auto / Day / Night`), and compact status footer.
  - **Top KPI & Control Strip**: Compact live telemetry counters (`Active Agents`, `Running Tasks`, `Available`, `Scheduled`, `Total Tokens`, `System Load`), canvas zoom/reset controls (`+`, `-`, `Recenter`, `Fullscreen`), and live PHT clock.
  - **Right Live Agent Hierarchy / Roster Drawer**: Collapsible real-time agent status tree (`Boss` -> department leads & staff with live badges like `Working`, `Available`, `Resting`, `Patrolling`) plus room floor switcher pills (`Main Wing`, `West Wing & Facilities`, `Server Room & Gym`).
  - **True Fullscreen Office-Only Mode (`[ ]` Fullscreen Button & `F` Hotkey)**: Clicking the Fullscreen button (or pressing `F`) smoothly collapses the sidebars and top telemetry bars so the 3D/2D office canvas fills 100% of the viewport edge-to-edge, with a subtle floating exit-fullscreen pill in the corner.

## 2. Architectural Design & Key Changes
1. **Playwright Glitch Detection & Remediation Pass**:
   - Audited 3D, Walk-3D, Fullscreen, and 2D (`?v=2`) views at `1440x900` and `1280x800`; fixed bottom-right help tooltip overlap at `1280x800` (`hidden 2xl:flex`), eliminated Wing Quick-Switcher horizontal scrollbar, and moved the Jarvis Voice HUD pill to `top-3` so bottom controls never collide.
2. **Server Room Floorplan & Prop Expansion (`src/lib/office/wellnessWing.ts`, `src/config/officeLayout.ts`, `src/engine/pathfinding.ts`, `BuildingArchitecture.tsx`, `OfficeFurniture.tsx`, `OfficeCanvas2D.tsx`)**:
   - Expanded Server Room footprint (`x in [-46, -29]`, `z in [1, 7.5]`, 110.5 m²) with a dedicated West Bay exterior enclosure and shifted the Facilities dividing wall to `z = 7.5` (moving exterior west tree to `[-51, 0]`).
   - Added 6 dual-aisle server racks (`SERVER_RACKS`), dual CRAC chillers, dual overhead cable trays, NOC telemetry wall display, and Rex's dual-monitor workstation at `[-32.5, 0, 3.8]` with matching A\* walkability (`pathfinding.ts`) and 2D/3D parity.
3. **Realistic Office Interior & Walk-Inside 3D Camera (`CameraController.tsx`, `OfficeScene.tsx`, `OfficeCanvas3D.tsx`, `BuildingArchitecture.tsx`)**:
   - Added `Walk Inside [V]` perspective camera mode (`y = 1.65m`, `WASD` / Arrow keys + mouse-drag look) and suspended acoustic ceiling + recessed LED light troffer grid (`visible={isWalkMode}`).
   - Added `Auto / Day / Night` office lighting theme switcher and unified `+ / - / Recenter` zoom controls across 3D and 2D.
4. **Clean Sidebar Dashboard Chrome & Fullscreen Office-Only Toggle (`src/app/page.tsx`)**:
   - Added Left Navigation Sidebar, Top KPI & Control Strip, Wing Quick-Switcher Bar, and `Fullscreen [F]` edge-to-edge Office-Only mode with floating `Exit Fullscreen [F]` pill.

## 3. Data & Schema Modifications
- `supabase/migrations/0020_expand_server_room_and_interior_layout.sql` (additive, idempotent migration): Updates `server_admin` coordinates and records the new active `office_map_versions` entry for the expanded Server Room & Walk-Inside 3D layout.

## 4. Verification & Quality Gates
- **Lint**: `npm run lint` — **PASSED** (0 errors, 7 pre-existing warnings).
- **Type Check**: `npx tsc --noEmit` — **PASSED** (0 errors).
- **Unit & Integration Tests**: `npm test` — **PASSED** (28/28 test files, 267/267 tests passed in 10.78s).
- **Build**: `npm run build` — **PASSED** (Next.js 16.4.5 Turbopack compiled in 3.2s, 18/18 static pages generated).
- **Playwright Visual & E2E QA**: **PASSED** on live production server (`http://localhost:3000/` and `http://localhost:3000/?v=2`) at `1440x900` and `1280x800`:
  - Verified Left Sidebar, Top KPI Strip, `Auto / Day / Night` lighting switcher, `Walk Inside [V]` eye-level 3D perspective with acoustic drop ceiling & LED strips, `Fullscreen [F]` edge-to-edge mode, expanded 6-rack Server Room in 3D & 2D, zero HUD overlap at `1280x800`, and zero React hydration/JS runtime errors.

## 5. Notes & Dependencies
- Follows `tickets/ticket-29-fix-2d-isometric-doorway-and-walkway-parity-with-3d-view.md`.
- Reference visuals provided by Josiah: Reference 1 (realistic eye-level interior office with ceiling light grid, panoramic windows, wood desks, and plants) and Reference 2 (clean left-sidebar + top KPI strip + right agent hierarchy + fullscreen canvas toggle).
