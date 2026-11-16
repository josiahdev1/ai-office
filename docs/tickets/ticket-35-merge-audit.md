# TICKET-34 -> TICKET-35 Merge Audit

**Date**: 2026-11-16  
**Branch**: `office-v3`  
**Base Commit**: `db8915e`

## Audit Table (PART A Items)

| Item | State | Evidence | Root Cause (if broken/partial) |
|---|---|---|---|
| A1 Ghost ball | **Done (Partial)** | `src/lib/office/pickleballSimulation.ts` (`stepPickleballRally` returns early when `validPlayers.length < 2`); `tests/pickleballSimulation.test.ts` passes | Needs full state machine (`idle`, `warmup`, `serve`, `rally`, `point`, `rotate`, `ended`), ball basket resting state, and DB-backed match seed. |
| A2 Pill summons everyone | **Done** | `src/app/page.tsx` (`handleGlobalModeChange` returns early for `PICKLEBALL` without mutating `agents`); verified in `ticket34-3d-closeup.png` | Top room-tab bar (`Intelligence Lab`, `Dev Studio`, ..., `Pickleball Court`) still needs to be added as camera-only. |
| A3 2D/3D court detail | **Partial** | `PickleballCourt3D.tsx` & `OfficeCanvas2D.tsx` render blue inner court, white lines, net, benches, `PICKLEBALL COURT` label | Missing bright green kitchen strips beside the net (frames `p02`, `p05`), glowing green corner lamps, beveled neon-edged slab, and DB map-driven court geometry. |
| A4 3D zoom/orbit | **Done (Partial)** | `CameraController.tsx` (`isTweeningRef` + `OrbitControls` `onStart` cancelling tween); verified `+` zoom in `ticket34-3d-closeup.png` | Needs `Fit all` button, double-click room focus, `Q`/`E` orbit + arrow pan keys, follow-cam release on drag/zoom, and dedicated camera unit tests. |
| A5 2D/3D one implementation | **Not started** | `OfficeCanvas2D.tsx` and `OfficeCanvas3D.tsx` still duplicate scene/prop/agent rendering | No shared `src/lib/office/sceneModel.ts` (`buildSceneModel`) or `src/lib/office/spriteBaker.ts` yet. |
| A6 Passageway | **Partial** | `src/engine/pathfinding.ts` opens North walkway `x in [-24, 2], z in [-27, -24]` | `validateMap.ts` does not yet assert passage >= 2 tiles, bench seats, or ball basket reachability; needs explicit threshold & floor sign. |
| A7 Real playing (move + swing) | **Partial** | `ProceduralAgent3D.tsx` oscillates right arm in `PICKLEBALL` mode; `pickleballSimulation.ts` computes parabolic ball arc | Players do not yet shuffle/step to intercept tiles in sync with hit time or play serve/forehand/backhand poses in shared `sceneModel.ts`. |
| A8 Bench queue | **Partial** | `OfficeScene.tsx` / `OfficeCanvas2D.tsx` assign `ferwin` & `jo_vincent` to `PICKLEBALL_BENCH_SLOTS` | Needs full 2x4 (capacity 8) bench queue, `Next`/`2nd` badges, orange foot ring, toast on full (`"Court full: queue is 8"`), and Supabase `office_pickleball_queue` persistence. |
