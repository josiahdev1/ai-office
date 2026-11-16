# \[TICKET-34\] Hotfix: True 2v2 Pickleball Match with Active Players & Sideline Bench Queue, Complete 2D/3D Court Lines & Net, Non-Summoning Room Camera Jump & Unlocked 3D Zoom/Orbit

**Phase / Milestone**: Phase K11.1 Pickleball Court & 3D Camera Hotfix
**Status**: MERGED INTO TICKET-35
**Date**: 2026-11-16
**Commit SHA**: db8915e
**Branch**: `office-v3`
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet

> Superseded by TICKET-35 on 2026-11-16. Remaining and verified work continues in `tickets/ticket-35-pickleball-video-style-agents-shadows-parity-orbit-and-facilities.md`. The original content below is kept unchanged for history.

## 1. Root-Cause Diagnosis (From Live Screenshots)

1. **Ghost Ball Without Players (3D)**: The pickleball animation loop is ticking even when 0 agents are assigned to the 4 court slots (`court_nw`, `court_ne`, `court_sw`, `court_se`), and the 4 active match players are not being spawned/locked onto the court slots with paddles equipped.
2. **Clicking `Pickleball Court` Pill Summons All 31 Employees**: Clicking the bottom `Pickleball Court` room pill is currently dispatching a mass-move command to all agents instead of **only** smoothly panning/zooming the camera to focus on the Pickleball Court.
3. **Missing Court Lines, Blue Inner Court & Net in 2D (`?v=2`) and 3D**:
   - In `2D View` (`OfficeCanvas2D.tsx`), the Pickleball Court renders as a blank teal rectangle without the blue inner court, crisp white boundary & non-volley ("kitchen") lines, center net, perimeter railing, wooden sideline benches, or `PICKLEBALL COURT` label.
   - In `3D View` (`OfficeCanvas3D.tsx`), the blue inner court surface, white court lines, and `PICKLEBALL COURT` ground typography are missing/z-fighting below the teal slab.
4. **3D Zoom / Orbit Still Locked**: `CameraController.tsx` is fighting or clamping `OrbitControls` wheel zoom and drag rotation in `3D View`, preventing smooth close-up zoom (`minDistance`) and campus overview zoom (`maxDistance`) that works in `2D View`.

## 2. Exact Requirements & Fixes

1. **Strict 2v2 Match Roster + Sideline Bench Waiting Queue (`src/lib/office/pickleballSimulation.ts` & `src/app/page.tsx`)**:
   - **Maximum 4 Active Players on Court (`2v2`)**: At most 4 agents (2 on North blue court, 2 on South blue court) can ever step onto the court at the same time. **NEVER** summon all 31 employees to the court.
   - **Auto-Seeded Live 2v2 Match**: By default on load (and whenever agents go on break/wellness), 4 designated agents (e.g., 2 teams of 2) occupy the 4 court positions (`court_nw`, `court_ne`, `court_sw`, `court_se`), hold pickleball paddles in their right hand, face the net, shuffle laterally to track incoming shots, and execute visible forehand/backhand **paddle swing animations** when striking the ball.
   - **Ball Only Moves When Players Rally**: If fewer than 2 players are on court, the ball rests stationary beside the server—never bouncing on an empty ghost court.
   - **Sideline Bench Queue & Sub-In Rotation**: Any 5th+ agent who wants to play walks to one of the two wooden **sideline benches**, sits/waits there with a queue badge (`Waiting for next game`), and smoothly swaps in for one of the 4 court players after a point ends (the subbed-out player walks back to the bench or returns to their desk).
   - **Room Pill Behavior (`Pickleball Court` button)**: Clicking `Pickleball Court` in the bottom room bar **ONLY** smoothly flies/focuses the 2D or 3D camera onto the Pickleball Court—it must **never** reassign or move agents.

2. **Full 2D & 3D Pickleball Court Parity (`OfficeCanvas2D.tsx` & `OfficeCanvas3D.tsx`)**:
   - Render the **exact same** detailed Pickleball Court in both `3D View` and `2D View` (`?v=2`):
     - Teal outer court apron (`#0d9488` / `#14b8a6`) + vibrant blue inner playing court (`#2563eb` / `#3b82f6`) raised slightly (`+0.02y` in 3D so zero z-fighting).
     - Crisp white (`#f8fafc`) perimeter sidelines, baselines, center service lines, and non-volley ("kitchen") zone lines.
     - Center mesh net with black/metallic posts and white top tape.
     - Low perimeter glass/rail fence with entrance gap, two wooden spectator benches on the sidelines, and crisp `PICKLEBALL COURT` ground text.
     - Live 2v2 players with paddles, animated rally ball, and bench spectators rendered in **both** 2D isometric canvas and 3D WebGL scene.

3. **Unblocked, Silky-Smooth 3D Zoom, Pan & 360° Orbit (`CameraController.tsx`)**:
   - Fix `CameraController.tsx` so `useFrame` does **not** overwrite `camera.position` or `controls.target` once a one-shot room focus tween finishes (or as soon as the user touches the mouse wheel / drags).
   - Enable unrestricted mouse-wheel zoom (`enableZoom={true}`, `zoomSpeed={1.2}`, `minDistance={3.5}` for close-up inspection of players/paddles/ball, `maxDistance={75}` for full campus overview), left-drag 360° orbit (`enableRotate={true}`), right-drag pan (`enablePan={true}`), and top-right `+` / `-` / `Recenter` HUD buttons wired directly to 3D `OrbitControls` zoom distance as well as 2D zoom.

## 3. Verification & Quality Gates

* **Lint & Type Check**: PASS (`npm run lint` — 0 errors; `npx tsc --noEmit` — 0 errors).
* **Unit Tests**: PASS (`npm test -- --run` — **29/29** test files, **273/273** tests passed in 11.01s, including `tests/pickleballSimulation.test.ts` verifying max 4 court players, sideline bench queue, and stationary ball when `< 2` players).
* **Build**: PASS (`npm run build` — Next.js 16.4.5 Turbopack production build compiled and generated 18/18 routes).
* **Playwright Visual & Interactive QA**: PASS against live production server (`http://localhost:3001` at `1440x900`):
  - **3D View**: Verified `Pickleball Court` pill smoothly focuses camera onto the court without summoning all 31 employees; `+` zoom button smoothly zooms in close-up (`CameraController.tsx`); 2v2 players (`Josiah`, `Blaze`, `Khent`, `Boss`) equip paddles on the blue court while `Ferwin` and `Jo Vincent` wait on the wooden sideline bench; zero React/hydration errors.
  - **2D View (`?v=2`)**: Verified identical blue inner court, teal apron, crisp white kitchen/boundary lines, center net, wooden benches, `PICKLEBALL COURT` label, live ball, and 4-player + 2-bench roster parity.