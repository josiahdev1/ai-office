# [TICKET-36] 100% Real Supabase State Persistence (Zero Mock Resets), Walkable Path & Gate to Pickleball Court, Realistic Arm-Swing Pickleball Rallies & Full Prop Animations (Eating, Coffee, Gym) Across 3D, 2D & Walk-3D

**Phase / Milestone**: Phase K13 Real-Data Fidelity & Articulated Action Animations  
**Status**: COMPLETED  
**Date**: 2026-11-16  
**Commit SHA**: recorded-on-merge  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet

---

## 1. Context & Objectives

- **100% Real Supabase State (Zero Mock Resets on Reload / New Tab)**: Remove all client-side auto-seeding of hardcoded agents (`boss`, `josiah`, `khent`, `blaze`, `ferwin`, `jo_vincent`) onto the Pickleball Court in `OfficeScene.tsx`, `OfficeCanvas2D.tsx`, and `PickleballCourt3D.tsx`. Hydrate strictly from Supabase (`office_agents`): when all agents are `WORKING` / at desks, 0 agents are on the Pickleball Court and the ball rests stationary.
- **Walkable Path & Gate to Pickleball Court**: Ensure the North Garden Gate (`z = -23.2`), paved outdoor footpath, and open court fence gate are walkable in `pathfinding.ts` and rendered cleanly in 3D, 2D (`?v=2`), and `Walk-3D` (verified by `validateMap`).
- **Realistic Pickleball Footwork & Arm/Paddle Swings**: Only when `>= 2` real Supabase-assigned players are on court does the rally animate, with dynamic lateral footwork + full articulated shoulder/arm forehand & backhand paddle swings across 3D, 2D (`?v=2`), and `Walk-3D`.
- **Real Prop & Limb Animations for Eating, Coffee & Gym**:
  - **Eating**: Visible plate + food on table + spoon in hand with animated scoop-to-mouth arm motion.
  - **Coffee**: Visible coffee mug in hand with periodic raise-to-mouth sip animation.
  - **Gym**: Dumbbell curls with visible dumbbells, bench press, and treadmill running stride.

## 2. Architectural Design & Key Changes

1. **Zero-Mock Supabase Hydration (`OfficeScene.tsx`, `OfficeCanvas2D.tsx`, `PickleballCourt3D.tsx`)**:
   - Compute active court & bench agents strictly from live `agents` (`agent.room === 'Pickleball Court'` or `agentRouteOverrides[agent.id] === 'PICKLEBALL'`).
   - Pass real active court player count & IDs to `PickleballCourt3D` and `OfficeCanvas2D` so `stepPickleballRally` only runs when `activePlayers.length >= 2`; otherwise the ball rests stationary in the ball basket.
2. **Walkable Exterior Door, Outdoor Path & Court Gate (`BuildingArchitecture.tsx`, `OfficeCanvas2D.tsx`, `walkCollision.ts`)**:
   - Add an explicit `North Garden Door` (`[0, -23.2]`, `axis: 'x'`, `width: 2.6`) in `DOOR_DEFINITIONS` + matching opening in `BuildingArchitecture.tsx` North Wall so Walk-3D and agents walk seamlessly from the central corridor out to the Pickleball Court!
3. **Articulated Prop & Limb Animations (`VoxelAgentMesh.tsx`, `ProceduralAgent3D.tsx`, `OfficeCanvas2D.tsx`)**:
   - Shared `resolveAgentPoseAndProps(agent, effectiveMode, time)` helper in `src/lib/office/sceneModel.ts`.
   - `VoxelAgentMesh.tsx`: Render plate + food & spoon when `EATING`/`CAFETERIA`, coffee mug when `PANTRY`/`COFFEE`, dumbbells when `GYM`, and paddle when `PICKLEBALL` with full shoulder/elbow forehand & backhand swings in `ProceduralAgent3D.tsx` (and mirrored in `OfficeCanvas2D.tsx`).

## 3. Data & Schema Modifications

- `supabase/migrations/0024_enforce_real_agent_activity_and_court_slots.sql` (idempotent, non-destructive): Adds `activity_detail text` and `court_slot text` to `public.office_agents` and `public.agents` if not present.

## 4. Verification & Quality Gates

- **Lint**: PASS (`npm run lint` — 0 errors, canonical Tailwind v4 classes)
- **Type Check**: PASS (`npx tsc --noEmit` — 0 errors)
- **Unit & Integration Tests**: PASS (`npm test -- --run` — **30/30** test files, **279/279** tests passed in 11.94s, including `tests/ticket35.test.ts` and `tests/pickleballSimulation.test.ts`)
- **Build**: PASS (`npm run build` — Next.js 16.4.5 Turbopack production build compiled and generated 18/18 routes)
- **Playwright E2E & Visual QA**: PASS against live production server (`http://localhost:3001` at `1440x900`):
  - **3D View & 2D View (`?v=2`)**: Verified zero mock Pickleball seeding—with real Supabase state, 0 ghost players appear on the court and the ball stays stationary in the ball basket while all agents remain at their real Supabase stations; verified green non-volley kitchen strips, glowing green corner lamps, white perimeter railings, wooden benches, North Garden Gate exterior path, and top camera-only room-tab bar with zero React/hydration console errors.

## 5. Notes & Dependencies

- Follows `tickets/ticket-35-pickleball-video-style-agents-shadows-parity-orbit-and-facilities.md`.
