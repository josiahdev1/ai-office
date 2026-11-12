# [TICKET-27] 30-Agent Campus Expansion, Canteen Staff & Buffet Queue, 2D/3D Parity, Responsive Auto-Fit, and Hydration Fix

**Phase / Milestone**: Phase K10 Post-Release & Polish  
**Status**: COMPLETED  
**Date**: 2026-11-12  
**Commit SHA**: `b5d8128`  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet  

---

## 1. Context & Objectives
- **SSR/Client Hydration Error**: Next.js threw a Recoverable Hydration Error at `src/app/page.tsx:2750` inside `HQCommandPage` / `EasyUpOfficeHQ` where the server rendered `39%` and the client rendered `41%` for `<span>{Math.round(needs.energy)}%</span>`.
- **Responsive Viewport & Auto-Fit Camera**: At standard 100% browser zoom, the camera framing cuts off outer rooms, forcing manual zoom-out across screen sizes.
- **2D (`?v=2`) vs 3D Discrepancy**: 3D mode renders 5 beds in the Bedroom while 2D mode only renders 3 beds, alongside layout/furniture mismatches between the two views.
- **Under-Sized Capacity for 30+ Agents**: The office, Bedroom, and Canteen/Pantry need comfortable, non-sharing capacity for up to 30+ agents simultaneously.
- **Missing Canteen/Pantry Staff & Realistic Activity Flows**: Sending agents to eat, drink coffee, or rest needs dedicated Canteen/Pantry service staff and realistic multi-step sequences (lining up -> picking up plate & utensils -> getting food at the buffet -> sitting at individual tables/chairs to eat; real coffee prep/drink at Pantry; real sleeping in individual beds in the Bedroom).

## 2. Architectural Design & Key Changes
1. **Fix Hydration Mismatch (`src/app/page.tsx:2750`)**:
   - Implemented `getDeterministicNeeds(agentId)` in `src/lib/office/needsEngine.ts` and `useSyncExternalStore` in `src/app/page.tsx` for client-only mounting state.
   - Initial SSR and first hydration pass render identical deterministic evaluations, with live dynamic `Date.now()` updates safely transitioning post-mount with `suppressHydrationWarning`.
2. **Responsive Full-Campus Auto-Fit Camera & UI/UX**:
   - Added responsive auto-fit zoom calculations in 3D (`CameraController.tsx` / `OfficeCanvas3D.tsx`) and 2D (`OfficeCanvas2D.tsx`) targeting `[-7.5, 0, 0]` with base zoom `11.5`. The full expanded campus fits inside 100% viewport zoom on any desktop/laptop display.
3. **Full 2D (`?v=2`) & 3D Parity**:
   - Synchronized 2D and 3D bedroom layouts to render all 16 `WELLNESS_BEDS` and all 8 cafeteria dining tables with 32 chairs.
4. **Office Campus Expansion for 30+ Agents (Zero Sharing)**:
   - Expanded `WELLNESS_BEDS` to 16 beds and `CAFETERIA_SEATS` to 32 dining seats across 8 four-person tables in `src/lib/office/wellnessWing.ts`.
   - Added `cafeteriaSlots` and `napBedSlots` in `src/config/officeLayout.ts` ensuring deterministic, zero-sharing routing in `getAgentTargetPosition`.
5. **Canteen & Pantry Staff + Realistic Buffet, Coffee, Eating & Sleeping Loops**:
   - Upserted `chef_maria` (Grand Cafeteria buffet counter) and `barista_ken` (Pantry & Canteen espresso bar) into `public.agents`, `public.office_agents` (bringing fleet total to 30), and `office_agent_needs`.
   - Added custom 3D animations and props for Chef Maria (food prep/stirring), Barista Ken (espresso lever pull / milk steaming), agents dining (eating with fork/plate props), agents at pantry (holding coffee mug), and sleeping in nap beds.

## 3. Data & Schema Modifications
- `supabase/migrations/0018_campus_30_agent_expansion_and_canteen_staff.sql`:
  - Upserted `chef_maria` and `barista_ken` into `public.agents` and `public.office_agents`.
  - Seeded initial needs in `public.office_agent_needs` and daily plans in `public.office_daily_plans`.
  - Expanded `public.office_facility_slots` with 32 dining chairs and 16 wellness beds.
  - Successfully verified in Supabase: `public.office_agents` count = 30, `public.agents` count = 25.

## 4. Verification & Quality Gates
- **Lint**: Passed (`npm run lint` — 0 errors, 6 existing warnings).
- **Type Check**: Passed (`npx tsc --noEmit` — 0 errors).
- **Unit & Integration Tests**: Passed (`npm test` — 28/28 test files passed, 267/267 tests passed).
- **Build**: Passed (`npm run build` — 18/18 routes statically generated in Next.js 16.4.5 Turbopack).
- **Evidence**:
  - `public.office_agents` count verified at 30.
  - Hydration mismatch resolved at `src/app/page.tsx:2750`.
  - 2D and 3D rendering verified with 16 beds and 32 dining seats.

## 5. Notes & Dependencies
- Preceded by `tickets/ticket-26-fix-2d-visual-parity-zoom-sql-and-docs-cleanup.md`.