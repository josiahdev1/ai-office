# [TICKET-31] 2D Server Room Glitch Fix, Walk-3D Full Room Walls & Interactive Doors (`E` Key), Solid Wall Collision, Crisp HD Resolution, Role-Specific PC Monitors, Sky (Sun/Moon/Clouds) & Smooth Animations

**Phase / Milestone**: Phase K10 Post-Release & Polish  
**Status**: COMPLETED  
**Date**: 2026-11-13  
**Commit SHA**: recorded-on-merge  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet  

---

## 1. Context & Objectives
- **2D Server Room Visual Glitch (`image_0dee1a.png` vs `image_0dedd7.png`)**: In 3D (`image_0dee1a.png`), the expanded Server Room renders cleanly with aligned racks, cable trays, Rex's terminal, and clear doorway access. In 2D (`?v=2`, `image_0dedd7.png`), the Server Room shows dark/misaligned overlapping geometry, clipped rack/cable tray rendering, and cramped lighting/contrast glitches.
- **Full Floor-to-Ceiling Room Walls & Interactive Hinged Doors (`E` Key) in Walk-3D**: While 2D View, 3D View, and Walk-3D share the exact same layout and live state, in **Walk-3D** every room in the office must have full-height solid architectural walls (with glass office partitions/windows where appropriate) so walking inside feels like a real-world building interior—and every doorway must feature a realistic hinged door with an on-screen prompt (`Press [E] to Open` / `Press [E] to Close`) that smoothly swings open/closed and toggles doorway walkability/collision.
- **Walk-3D Solid Wall & Prop Collision (No Walking Through Walls)**: Currently in Walk-3D mode, the player camera can pass straight through interior and exterior walls ("noclip"). Movement must enforce real solid wall, closed door, window, partition, and furniture collision with smooth wall-sliding while allowing passage through open doors.
- **Walk-3D Crisp HD Rendering Quality (Fix Blurriness)**: Walk-3D currently looks blurry/low-DPI. Upgrade canvas DPR (`devicePixelRatio`), texture filtering, antialiasing, and camera near/far/FOV crispness so close-up desks, walls, and screens render razor-sharp.
- **Role-Specific Realistic PC Monitor Screens for All Agents**: Every agent's desk monitor must display crisp, realistic, role-appropriate screen content visible up close in Walk-3D (e.g., live scrolling syntax-highlighted IDE code & terminal logs for Engineering/Dev agents; server metrics/CLI topology for SysAdmin Rex; Figma/wireframe artboards for Design; Kanban boards/Gantt charts for PM/Ops; analytics dashboards/spreadsheets for Finance/Admin; executive KPIs for Boss).
- **Realistic Sky in Walk-3D (Sun, Moon & Drifting Clouds)**: Visible through the panoramic office windows and skylights in Walk-3D, render a dynamic sky dome synced to real Iloilo PHT sun/moon cycles—glowing sun during daytime/sunset, luminous moon & stars at night, and softly drifting volumetric/layered 3D clouds.
- **Smooth System-Wide UI & Mode Transition Animations**: Add polished, fluid motion and micro-interactions across the entire interface—smooth camera & view transitions when clicking **3D View**, **3D Walk**, and **2D View**, animated sidebar navigation indicators, smooth drawer/modal/popover reveals, interactive button press/hover transitions, and smooth panel state changes.

## 2. Architectural Design & Key Changes
1. **Fix 2D Server Room Rendering & Lighting (`OfficeCanvas2D.tsx`)**:
   - Audit `OfficeCanvas2D.tsx` Server Room drawing coordinates, isometric z-sort order, floor lighting/contrast, server rack positions, overhead cable tray alignment, CRAC unit, and Rex's workstation so it matches the 3D Server Room (`image_0dee1a.png`) cleanly without dark overlapping blocks or clipping.
2. **Full-Height Interior Room Walls & Interactive Doors (`E` Key) in Walk-3D (`OfficeCanvas3D.tsx`, `CameraController.tsx`)**:
   - **Full Room Walls in Walk-3D**: When entering Walk-3D mode, smoothly raise/enable full-height ceiling-high walls (with architectural trim, baseboards, and glass office windows/partitions) across all rooms (Main Office, Executive/Brain, Engineering/Ops, Server Room, Men's CR, Women's CR, Bedroom, Canteen, Pantry, and Gym) while keeping the isometric cutaway wall height in top-down 3D View so both views look authentic.
   - **Interactive Hinged Doors (`E` Key)**: Place realistic framed doors with handles and glass/wood panels at all room entrances. When the player approaches a door within interaction range in Walk-3D, display a clean HUD prompt (`Press [E] to Open Door` / `Press [E] to Close Door`), animate a smooth 90-degree hinge swing on `E` keypress, and update the door's collision state in real time (and allow autonomous agents to trigger/pass through doors cleanly).
3. **Walk-3D Solid Wall, Closed Door & Obstacle Collision (`CameraController.tsx` / `OfficeCanvas3D.tsx`)**:
   - Build a spatial collision map (AABB / bounding segments derived from all exterior walls, full interior room walls, closed doors, glass partitions, server racks, counters, and desks, with open gaps only where doors are open).
   - Resolve player movement per frame using circle-vs-AABB collision with smooth sliding along walls so the player can **never** walk through solid walls or closed doors.
4. **Walk-3D Crisp HD Quality Upgrade (`OfficeCanvas3D.tsx`)**:
   - Configure Three.js `<Canvas dpr={[1, 2]}>` (matching native `window.devicePixelRatio` up to 2x), enable crisp antialiasing, set anisotropic filtering (`anisotropy = 8`) on procedural screen/sign textures, and tune Walk-3D camera FOV/near-plane so close-up monitors, doors, and room details are sharp and clear.
5. **Role-Specific Dynamic PC Monitor Canvases (`OfficeCanvas3D.tsx`)**:
   - Create crisp high-DPI procedural `<canvas>` textures (`CanvasTexture`) mapped onto every agent's PC monitor mesh based on their department/role:
     - **Engineering / Dev / QA**: Dark-mode VS Code / IDE split-pane with syntax-highlighted TypeScript/React code, line numbers, file tree, and live terminal output.
     - **Server Admin (Rex)**: Live server rack telemetry, CPU/RAM graphs, green/cyan SSH CLI logs, and node status matrix.
     - **Design / Creative**: UI canvas artboard with color swatches, layout grids, and component layers.
     - **PM / Product / Ops**: Sprint Kanban board columns (`TODO`, `IN PROGRESS`, `DONE`) with colored task cards.
     - **Executive / Boss / Finance / HR**: Real-time revenue/efficiency charts, agent status table, and calendar schedule.
6. **Dynamic Sky with Sun, Moon & Drifting Clouds (`OfficeCanvas3D.tsx`)**:
   - Render a sky backdrop visible through all office windows synced to real Iloilo PHT time:
     - **Day / Golden Hour**: Warm glowing Sun disc with soft halo + sunlit drifting clouds.
     - **Night**: Glowing Moon disc with crater shading, subtle night sky stars, and moonlit drifting clouds.
7. **System-Wide Smooth Animations (`src/app/globals.css`, `src/app/page.tsx`, and HUD components)**:
   - Smooth animated transitions when switching between **3D View**, **3D Walk**, and **2D View** (smooth camera flight/crossfade transition overlay + active pill indicator glide).
   - Add consistent, smooth transitions (`transition-all duration-200 ease-out`) across sidebar items, drawers, modals, roster cards, action buttons, and toast/status badges using canonical Tailwind v4 classes per `AGENTS.md`.

## 3. Data & Schema Modifications
- No database schema changes required; consumes active `office_map_versions`, live `office_agents` department/role metadata, and real Iloilo PHT sun/time state.

## 4. Verification & Quality Gates
- **Lint**: PASS (`npm run lint` — 0 errors, 7 pre-existing warnings; canonical Tailwind v4 classes)
- **Type Check**: PASS (`npx tsc --noEmit` — 0 errors)
- **Unit & Integration Tests**: PASS (`npm test -- --run` — 28/28 test files, 267/267 tests passed in 11.32s)
- **Build**: PASS (`npm run build` — Next.js 16.4.5 Turbopack production build compiled and generated 18/18 static/dynamic routes)
- **Playwright Visual & E2E QA**: PASS against live production server (`http://localhost:3001`) at `1440x900` and `1280x800`:
  - **2D View (`/?v=2`)**: Verified Server Room renders all 6 racks, dual CRAC chillers, NOC display, Rex's desk, and segmented cable trays cleanly without wall overlap; zero React/hydration errors.
  - **Walk-3D**: Verified full-height 3.0m interior room walls with 4.4m Brain archway, crisp HD role-specific monitor textures (`MonitorTextures.ts`), interactive hinged doors (`DOOR_DEFINITIONS` + `[E]` HUD prompt), circle-vs-AABB wall/closed-door/rack collision (`walkCollision.ts`), dynamic Sun/Moon/Clouds sky dome (`BuildingArchitecture.tsx`), and smooth mode-switch transition overlay (`globals.css`, `page.tsx`); zero React/hydration errors.

## 5. Notes & Dependencies
- Follows `tickets/ticket-30-walkable-3d-office-server-room-expansion-and-sidebar-ui.md`.
- Visual references attached by Josiah: `image_0dee1a.png` (clean 3D Server Room reference) and `image_0dedd7.png` (2D Server Room glitch to fix).
