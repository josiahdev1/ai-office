# [TICKET-33] Outdoor Pickleball Court & Live 2v2 Rally Simulation, Detailed Voxel Character Overhaul, Soft Ground Shadows, Free 3D Orbit/Zoom Camera & Full Facility Detail (2D/3D Parity)

**Phase / Milestone**: Phase K11 Campus Recreation & Architectural Realism  
**Status**: COMPLETED  
**Date**: 2026-11-16  
**Commit SHA**: recorded-on-merge  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet

---

## 1. Context & Objectives

- **Live Outdoor Pickleball Court & 2v2 Match Simulation**: Add a realistic, full-featured **PICKLEBALL COURT** complex to the EasyUp HQ campus (blue/teal court surfaces, crisp white kitchen/non-volley & baseline markings, center net with posts, perimeter low glass/rail fencing, spectator wooden benches, court floor label `PICKLEBALL COURT`, and a room quick-jump pill). Up to 4 agents (including Boss & staff on break/recreation) walk to the court, equip paddles, and play an animated **2v2 pickleball rally** with real parabolic ball physics, paddle swing animations, lateral court footwork, and dynamic player sub-in/sub-out rotation from the sideline bench.
- **Detailed Voxel Agent Character Redesign**: Upgrade all 30 AI agent models in 3D (and matching 2D sprites) to a crisp, expressive voxel-block character style—distinct hair/beards/accessories, articulated arms holding paddles/tools/coffee/dumbbells that swing naturally while walking or playing, expressive eyes, role-colored tops/pants/shoes, and crisp floating nameplates (`Name` + status dot).
- **Soft Grounded Shadows & Studio Ambient Lighting**: Enable realistic directional soft shadows (`PCFSoftShadowMap`, crisp shadow bias, warm directional sunlight + hemisphere ambient bounce) across all characters, furniture, benches, walls, and the bouncing pickleball so every object feels grounded on the floor.
- **Full 360-Degree 3D Orbit, Pan & Smooth Zoom Controls**: Upgrade the 3D Isometric/Overview camera (`OrbitControls` / `CameraController.tsx`) so the user can smoothly zoom all the way in (close-up on the pickleball rally, canteen tables, or agent desks), zoom out to see the entire campus, pan freely, and orbit/rotate 360 degrees around the building without camera locks or clipping.
- **High-Detail Campus Facilities & 100% 2D/3D Parity (`?v=2`)**: Upgrade interior detail across Canteen & Pantry, Work Offices, Gym & Wellness, Server Room, Comfort Rooms, and Bedroom—and ensure both **3D View** and **2D Isometric View (`?v=2`)** share the exact same layout, Pickleball Court, furniture placements, and live agent positions.

## 2. Architectural Design & Key Changes

1. **Pickleball Court Arena & 2v2 Rally Engine (`src/config/officeLayout.ts`, `src/lib/office/pickleballSimulation.ts`, `OfficeCanvas3D.tsx`, `OfficeCanvas2D.tsx`)**:
   - Add the `PICKLEBALL` court zone (`[-16, 0, -33]` north outdoor campus court, `16m x 12m` apron, accessible via North Campus gate & A* pathfinding) with blue inner court, teal outer apron, white boundary/kitchen lines, center net, perimeter glass railing, two sideline spectator benches, and `PICKLEBALL COURT` ground typography.
   - Build a deterministic 60fps rally state machine (`pickleballSimulation.ts`) managing 2v2 court slots + sideline bench queue, parabolic ball arcs over the net, forehand/backhand paddle swings, lateral court footwork, and player sub-in/sub-out rotation.
2. **Detailed Articulated Voxel Characters (`src/components/office/three/VoxelAgentMesh.tsx` & `OfficeCanvas2D.tsx`)**:
   - Extract and upgrade the articulated voxel character mesh into `VoxelAgentMesh.tsx` with distinct head/hair/glasses/beard/cap variants, expressive eyes, articulated shoulder-pivoted arms (holding pickleball paddles, coffee cups, dumbbells, or clipboards), and alternating leg-swing walk/rally cycles, mirrored in `OfficeCanvas2D.tsx`.
3. **Soft Shadow Pipeline & Studio Lighting (`OfficeCanvas3D.tsx`, `OfficeScene.tsx`)**:
   - Configure `<Canvas shadows="soft">` (`THREE.PCFSoftShadowMap`), tune directional sun shadow frustum (`2048x2048`, `shadow-bias={-0.0004}`) to cover the entire campus + Pickleball Court, and enable `castShadow` / `receiveShadow` across limbs, paddles, ball, benches, furniture, and slabs.
4. **Unrestricted 3D Orbit, Pan & Close-Up Zoom (`CameraController.tsx`)**:
   - Tune `OrbitControls` for smooth damped 360° rotation (`enableRotate`, `enablePan`, `enableZoom`, `enableDamping`, `dampingFactor={0.07}`), wide zoom range (`minZoom={7}` to `maxZoom={95}`), polar angle clamping (`0.15` to `Math.PI / 2.15`), and room quick-jump focus (`PICKLEBALL` pill).
5. **Detailed Facilities Upgrade Across 3D & 2D (`OfficeFurniture.tsx`, `OfficeCanvas2D.tsx`, `page.tsx`)**:
   - Add `Pickleball Court` quick-jump pill in the Wing Switcher and enrich Canteen, Gym, Work Offices, and Pantry detail across both 3D and 2D (`?v=2`).

## 3. Data & Schema Modifications

- `supabase/migrations/0022_add_pickleball_court_and_facility_waypoints.sql` (additive `IF NOT EXISTS` migration): Record the `pickleball_court` room zone, court player slots (`court_nw`, `court_ne`, `court_sw`, `court_se`), sideline bench waypoints, and updated facility coordinates in `office_map_versions` (using `0022` since `0021` is already occupied by `0021_wider_office_floorplan_and_doorways.sql`).

## 4. Verification & Quality Gates

- **Lint**: PASS (`npm run lint` — 0 errors, canonical Tailwind v4 classes)
- **Type Check**: PASS (`npx tsc --noEmit` — 0 errors)
- **Unit & Integration Tests**: PASS (`npm test -- --run` — 29/29 test files, 271/271 tests passed in 12.57s, including `tests/pickleballSimulation.test.ts` and `tests/parity-2d-3d.test.ts`)
- **Build**: PASS (`npm run build` — Next.js 16.4.5 Turbopack production build compiled and generated 18/18 routes)
- **Playwright Visual & E2E QA**: PASS against live production server (`http://localhost:3001`) at `1440x900` and `1280x800`:
  - Verified 3D View `Pickleball Court` quick-jump pill focuses smoothly on the outdoor court with teal apron, blue court, white lines, center net, glass perimeter fencing, wooden benches, articulated voxel characters holding Pickleball paddles, soft `PCFSoftShadowMap` shadows, and zero React/hydration console errors.

## 5. Notes & Dependencies

- Follows `tickets/ticket-32-walk-3d-exterior-enclosure-working-e-doors-smooth-movement-crisp-hd-and-wider-office.md`.
