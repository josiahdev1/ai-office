# [TICKET-32] Walk-3D Full Exterior Enclosure (Walls, Windows & Doors), Working Interactive `[E]` Doors, Smooth Delta-Time Movement, Crisp Ultra-HD Resolution & Wider Expanded Office

**Phase / Milestone**: Phase K10 Post-Release & Polish  
**Status**: COMPLETED  
**Date**: 2026-11-13  
**Commit SHA**: recorded-on-merge  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet  

---

## 1. Context & Objectives
- **Open Exterior Perimeter Walls in Walk-3D (`image_0c2b9d.png` & `image_0c27c2.png`)**: In Walk-3D mode, the outer perimeter currently only renders low waist-high cutaway walls with a wide open gap to the street, making the building look unfinished from inside. In Walk-3D, all exterior perimeter walls must extend full floor-to-ceiling height with architectural window frames, clear glass panes, and proper exterior doors—while automatically lowering back to cutaway height in top-down Isometric 3D view.
- **Broken Interactive `[E]` Key Doors (`image_0c2786.png`)**: Doorway openings in Walk-3D are currently empty gaps with no physical hinged door mesh rendered and no working `[E]` key prompt or open/close toggle. Every interior and exterior doorway must render a visible framed hinged door panel (with handle/glass insert), detect player proximity reliably, display an on-screen `Press [E] to Open` / `Press [E] to Close` prompt, and smoothly swing open/closed on `KeyE` (updating collision in real time).
- **Choppy / Non-Smooth Walk-3D Movement**: Walking and looking around inside Walk-3D feels jerky/stiff. Implement frame-rate-independent delta-time velocity acceleration/damping (`lerp` smoothing) for `W/A/S/D` + Arrow movement and smooth mouse-look / pointer-lock rotation so walking through the office feels fluid and natural.
- **Blurry Walk-3D Resolution**: Walk-3D still renders blurry/aliased. Enforce full native HiDPI pixel ratio (`dpr={[1, 2]}` with `gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))`), disable low-res canvas downscaling, sharpen Html/CSS3D nameplate overlays (distance-culled/clamped so distant labels like `Rex` or `Bonnie` in `image_0c2786.png` don't bleed through walls as blurry floating pills), and sharpen textures.
- **Narrow / Cramped Office Width & Layout (`image_0c2786.png`)**: As seen in the 3rd screenshot (`image_0c2786.png`), the main office corridors, doorways, and workspace aisles feel narrow and cramped. Expand the overall office width and room dimensions (`validateMap` passing, full A* walkability across 3D, Walk-3D, and 2D `?v=2`) so hallways, doorways, and departments feel spacious, realistic, and comfortably walkable.

## 2. Architectural Design & Key Changes
1. **Expanded Office Width & Spacious Interior Layout (`src/config/officeLayout.ts`, `OfficeCanvas3D.tsx`, `OfficeCanvas2D.tsx`)**:
   - Widen the entire office campus footprint and increase doorway/corridor widths (`>= 2.4m` clear aisles) across the Main Office, Executive/Brain, Engineering/Ops, Server Room, Comfort Rooms, Bedroom, Canteen, Pantry, and Gym so walking inside feels spacious and realistic (`image_0c2786.png`), maintaining 100% parity across 3D, Walk-3D, and 2D (`?v=2`).
2. **Walk-3D Full Exterior Enclosure (Ceiling-High Outer Walls, Framed Windows & Exterior Doors) (`OfficeCanvas3D.tsx`)**:
   - When `viewMode === 'walk'`, render full ceiling-height exterior walls around the entire building perimeter (including the street-facing wall in `image_0c2b9d.png` and Gym exterior wall in `image_0c27c2.png`) with framed glass windows (letting sunlight, clouds, and street views shine through realistically) and double/single exterior entry doors.
   - Keep cutaway wall heights when `viewMode === '3d'` so top-down isometric visibility remains unobstructed.
3. **Working Interactive Hinged Doors & `[E]` Key Handler (`OfficeCanvas3D.tsx`, `CameraController.tsx`)**:
   - Render physical framed hinged doors at every room doorway and exterior entrance (fixing the empty doorway gap in `image_0c2786.png`).
   - Attach a global `window` `keydown` listener for `e` / `E` (when not typing in an input/textarea) that toggles the nearest door within `3.2m` of the Walk-3D camera, animates a smooth 90-degree hinge rotation in `useFrame`, displays a crisp centered HUD prompt (`Press [E] to Open` / `Press [E] to Close`), and toggles the door's solid AABB collision state.
4. **Smooth Physics-Based Walk-3D Movement & Look (`CameraController.tsx`)**:
   - Replace discrete step movement with smooth delta-time velocity interpolation (acceleration + friction damping), smooth mouse-look (supporting both click-drag and optional pointer-lock), subtle head-bob toggle, and smooth circle-vs-AABB wall/closed-door sliding collision.
5. **Ultra-Crisp HD Resolution & Occlusion-Clean Nameplates (`OfficeCanvas3D.tsx`)**:
   - Force crisp WebGL rendering (`dpr={[1, 2]}`, `antialias: true`, `powerPreference: 'high-performance'`, anisotropic texture filtering, and crisp shadow map resolution `2048x2048`).
   - Fix floating agent nameplates in Walk-3D (`image_0c2786.png`): hide/fade nameplates behind walls or beyond `10m` distance and remove `transform` CSS blur scaling on `<Html>` badges so labels stay razor-sharp and never clutter through walls.

## 3. Data & Schema Modifications
- `supabase/migrations/0020_wider_office_floorplan_and_doorways.sql` (additive `IF NOT EXISTS` migration): Seed the widened, spacious office `office_map_versions` layout and doorway coordinates, applied autonomously via Supabase MCP (`apply_migration` / `execute_sql`).

## 4. Verification & Quality Gates
- **Lint**: PASS (`npm run lint` — 0 errors, canonical Tailwind v4 classes)
- **Type Check**: PASS (`npx tsc --noEmit` — 0 errors)
- **Unit & Integration Tests**: PASS (`npm test -- --run` — 28/28 test files, 267/267 tests passed in 12.28s)
- **Build**: PASS (`npm run build` — Next.js 16.4.5 Turbopack production build compiled and generated 18/18 routes)
- **Playwright Visual & E2E QA**: PASS against live production server (`http://localhost:3001`) at `1440x900` and `1280x800`:
  - Verified Walk-3D full floor-to-ceiling exterior enclosure with framed panoramic glass windows and exterior entry doors, 14 interactive `[E]` hinged doors (`walkCollision.ts`), smooth delta-time velocity/look damping (`CameraController.tsx`), HiDPI sharpness (`gl.setPixelRatio(Math.min(dpr, 2))`), and distance-culled (`<= 10.5m`) occlusion-clean nameplates (`ProceduralAgent3D.tsx`) with zero React/hydration console errors.

## 5. Notes & Dependencies
- Follows `tickets/ticket-31-2d-server-room-fix-walk-3d-wall-collision-hd-monitors-sky-and-smooth-ui-animations.md`.
- Visual references attached by Josiah: `image_0c2b9d.png` (open exterior gap needing full wall/windows), `image_0c27c2.png` (Gym exterior wall/window enclosure), and `image_0c2786.png` (narrow doorway needing wider office proportions, visible hinged door with working `[E]` interaction, and distance-culled crisp labels).