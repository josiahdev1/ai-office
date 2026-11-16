# [TICKET-35] Merged Upgrade: Real Pickleball (incl. TICKET-34), Video-Style Agents, Real Shadows, Full 2D/3D Parity, Unlocked 3D Zoom/Orbit & Detailed Canteen, Work Offices, Gym and Facilities

**Phase / Milestone**: Phase K12 Office Visual Upgrade (includes Phase K11.1 Pickleball Court & 3D Camera Hotfix)  
**Status**: IN PROGRESS  
**Date**: 2026-11-16  
**Commit SHA**: pending  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet  

---

## 1. Context & Objectives
- **Merged Scope**: TICKET-34 is merged into TICKET-35 (`docs/tickets/ticket-35-merge-audit.md` & `docs/tickets/ticket-35-diagnosis.md`). Verified TICKET-34 fixes (ghost-ball guard, camera-only `Pickleball Court` pill, 2D/3D court lines, `CameraController` one-shot tween) are retained; remaining Part A and all Part B objectives are executed sequentially below.
- **Reference Frames (`docs/design-ref/video/pickleball/p01..p08`)**: Chunky low-poly block characters, bold outfit colors, name-only dark tags with status badge & orange selection/queue foot ring, beveled room slabs with glowing neon edges, green kitchen strips on the Pickleball Court, low white railings with glowing green corner lamps, wooden benches, floating dark plaque signs, soft grounded shadows, and a top camera-only room-tab bar.

## 2. Architectural Design & Key Changes

### Execution Checklist
- [x] **0. Save WIP, Audit (`docs/tickets/ticket-35-merge-audit.md`), Diagnosis (`docs/tickets/ticket-35-diagnosis.md`)**
- [ ] **A1. One Scene Model (`src/lib/office/sceneModel.ts`) + Shared Movement**
- [ ] **A2. Full Pickleball Simulation (`idle/warmup/serve/rally/point/rotate/ended`), Bench Queue (cap 8), `!play pickleball` & Scoreboard**
- [ ] **A3. Passageway (`>= 2` tiles) + `validateMap` Reachability & Passage Checks**
- [ ] **A4. Camera-Only Top Room Tabs & Pill Verification**
- [ ] **A5. Court Parity (Green Kitchen Strips, White Railings, Corner Lamps, Ball Basket, Scoreboard)**
- [ ] **A6. Unlock 3D Zoom/Orbit + `Fit all` + Double-Click Focus + Keyboard/Follow-Cam**
- [ ] **B1. Character Model (`AgentModel3D.tsx`), `office_agents.appearance` Backfill & Editor, Skill Update**
- [ ] **B2. Sprite Baker (`src/lib/office/spriteBaker.ts`) & 2D Parity**
- [ ] **B3. Real Iloilo Solar Shadows (3D & 2D) + Quality Setting (`low`/`medium`/`high`)**
- [ ] **B4. Detailed Facilities (Canteen, Dept Offices, Gym, Pantry/Lounge, Corridors) + `/dev/gallery3d`**
- [ ] **B5. Camera HUD & Top Room-Tab Bar**
- [ ] **Final QA, Evidence (`docs/evidence/ticket-35/`), CI Green, `COMPLETED`**

## 3. Data & Schema Modifications
- Idempotent migration `supabase/migrations/0023_ticket35_pickleball_tables_appearance_and_settings.sql` (`office_pickleball_matches`, `office_pickleball_queue`, `office_pickleball_events`, `office_agents.appearance`, `office_settings` shadow/auto-start keys, and `office_map_versions` update) applied via `src/lib/office/db-map.ts` and Supabase.

## 4. Verification & Quality Gates
- **Lint**: Pending (`npm run lint`)
- **Type Check**: Pending (`npx tsc --noEmit`)
- **Unit & Integration Tests**: Pending (`npm test`)
- **Build**: Pending (`npm run build`)
- **Evidence**: Pending (`docs/evidence/ticket-35/`)

## 5. Notes & Dependencies
- TICKET-34 status is `MERGED INTO TICKET-35`.
- Next ticket: **TICKET-36** (after evidence review).
