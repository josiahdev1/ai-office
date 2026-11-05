# EasyUp Software Solution HQ — Office V3 Progress

Tracking progress for Office V3 architecture implementation across Phases 1 through 8.

---

## Phase 1: Art Pipeline & Dev Gallery
- [ ] Palette-indexed pixel grid engine (`32x32`, `48x48`, `64x32`) with 1px dark hue outline, 3 shades, highlight, and baked soft shadow.
- [ ] Procedural asset generator for walls, floors, desks, monitors, office props, decor, and characters.
- [ ] License tracking document (`docs/ASSET_LICENSES.md`) verifying all used assets allow public redistribution.
- [ ] Dev Gallery page (`src/app/dev/gallery/page.tsx`) rendering catalog of tiles, props, and character animation frames on an interactive grid.
- [ ] Vitest tests for pixel asset rendering and palette index verification.

---

## Phase 2: Floor Plan Architecture (3×3 Grid & Real Walls)
- [ ] 3×3 room geometry in `src/lib/office/building3x3Map.ts`:
  - [ ] Center: Command Center with THE BRAIN (round dark floor, cyan holographic core, arc console ring, 40+ seat/ring capacity).
  - [ ] 8 surrounding rooms: Intelligence Lab (teal), Operations Hub (green), QA & SecOps NOC (magenta), Executive Lounge (purple), Pantry & Canteen (cream/orange), Rec & Gym / Game (pink), Growth Lab (blue), Engineering Core (indigo).
  - [ ] 2-tile checkered corridors connecting all rooms to The Brain.
  - [ ] Thick partition walls with visible thickness, beveled top face, and door cutaways.
  - [ ] Floating pixel room-name signs on room corners with zero overlap.
- [ ] Workstations & Desks:
  - [ ] Wall desks (monitor against wall, seated agent facing away from camera).
  - [ ] Island desk pairs with monitors facing away.
  - [ ] Collaborative long table in Engineering Core with PCs on both sides and head seat.
  - [ ] Josiah's executive L-shaped workstation with triple-monitor rig.
- [ ] Map validation engine (`validateMap.ts`):
  - [ ] Zero overlapping furniture, walls, or rooms.
  - [ ] Every desk has an assigned chair with facing direction and accessible approach tile.
  - [ ] All room doorways reachable from The Brain via 2-tile corridors.
  - [ ] Brain $\ge 40$ spots, Pantry $\ge 30$ spots.
- [ ] Vitest tests passing for 3×3 floor plan validation.

---

## Phase 3: High-Fidelity Isometric Renderer
- [ ] Dual-layer rendering pipeline:
  - [ ] Static cached layer (floors, walls, doorways, shadows, stationary decor).
  - [ ] Dynamic layer (agents, vehicles, holographic core pulse, floating particles, screen animations, tree sway).
- [ ] Real wall visual styling:
  - [ ] Thick dark navy walls, lighter top beveled face, baseboards.
  - [ ] Wall decor: city view windows, wall clock, whiteboards, corkboards with notes, framed certificates, monitors, vents.
- [ ] Soft contact shadows and ambient occlusion where furniture meets walls and floors.
- [ ] Animated details: monitor syntax scrolling, pulsing Brain core with orbital particles, arcade cabinet screen glow, ticking clock.
- [ ] Smooth 60 FPS performance; respect `prefers-reduced-motion`.

---

## Phase 4: Characters in New Scene (Facing & Real PC Typing)
- [ ] Seated agents strictly face monitors: showing back or side view, never facing camera while seated at workstations.
- [ ] Dual-arm keyboard typing animation:
  - [ ] Alternating hand movements on keyboard.
  - [ ] Subtle shoulder and head movement.
  - [ ] Key press flicker and monitor code scroll (blue for edit, orange for shell, cyan for read).
- [ ] Chair mechanics: chair pull-out, swivel, and tucking animation on sit/stand.
- [ ] Preserved employee sprite identity per `keep-existing-sprites`.
- [ ] Poses for walking, idle, coffee sip, phone glance, eating, drinking, playing pool/arcade, and gym workout.
- [ ] Export documentation artifact `docs/sprite-sheet-check.png` showing all poses across 4 facings.

---

## Phase 5: Name Tags: Name Only + Anti-Overlap System
- [ ] Name tags display **NAME ONLY** and status dot in crisp monospace font.
- [ ] Role and department text completely removed from canvas tags (preserved in tooltips and agent inspector).
- [ ] Anti-overlap algorithm:
  - [ ] Screen-space bounding box collision detection.
  - [ ] Priority sorting (selected, followed, speaking, waiting_on_you, then remaining).
  - [ ] Greedy vertical/diagonal offset shifting on collision.
  - [ ] Distant zoom fallback: collapse to status dot only below zoom threshold.
  - [ ] Smooth interpolation to prevent jitter.
- [ ] Vitest test verifying zero tag overlap across 24 agents at 3 distinct zoom levels.

---

## Phase 6: Behaviors on New Layout, Command Bar & New Agent "Christian"
- [ ] New resident agent "Christian":
  - [ ] Onboarded to Engineering Core as "Developer".
  - [ ] Assigned workstation and chair with approach tile in Engineering Core.
  - [ ] "NEW" badge on agent card and roster.
  - [ ] Idempotent upsert in `db-map.ts` and update to `supabase/seed_office_agents.sql`.
  - [ ] Total master roster: 24 specialist agents.
- [ ] Interactive in-app Command Bar:
  - [ ] Commands: `!work`, `!eat`, `!play`, `!meet`, `!gym` (e.g. `!eat Christian`, `!work`).
  - [ ] Autocomplete agent names with Tab / click.
  - [ ] Smooth A* pathfinding through room doorways and corridors to targets without teleportation.
  - [ ] Telemetry emitted to `office_logs` and `office_messages`.
- [ ] Focus Work, All Hands, Pantry & Canteen, and Rec & Gym behaviors mapped to 3×3 rooms.

---

## Phase 7: UI & Navigation (Agent Card & Room Focus Camera)
- [ ] Agent Card matching video frame `v13`:
  - [ ] Pixel avatar, NAME, `role • department`, status chip (`WORKING`, `WAITING ON YOU`, `EATING`, `PLAYING`, `MEETING`, `IN GYM`), `NEW` badge.
- [ ] Room focus camera:
  - [ ] Clicking any room sign or room selector smoothly glides and zooms camera to that room.
  - [ ] "Fit All" button restoring full 3×3 building view.
  - [ ] HUD title capsule displaying active room name.
- [ ] Floating room signs in pixel font, positioned cleanly with zero overlap.

---

## Phase 8: Final QA, Screenshots & CI Verification
- [ ] Playwright visual verification screenshots:
  - [ ] Full 3×3 building overview.
  - [ ] Close-ups of all 8 perimeter rooms and The Brain center.
  - [ ] Agents typing from behind at wall desks, island desks, and long table.
  - [ ] ALL HANDS assembly at The Brain.
  - [ ] Pantry eating and Rec/Game room activity.
  - [ ] Name tags at 3 zoom levels with zero overlap.
  - [ ] Agent Christian with "NEW" badge and card.
  - [ ] Command bar execution (`!work`, `!eat`, `!play`).
- [ ] Self-review audit against reference images and video frames.
- [ ] Comprehensive quality gates:
  - [ ] `npm run lint` — 0 errors.
  - [ ] `npx tsc --noEmit` — 0 errors.
  - [ ] `npm test` — all unit tests passing.
  - [ ] `npm run build` — Next.js Turbopack production build succeeds.
- [ ] Git commit and push to `origin office-v3`.
- [ ] Remote GitHub Actions CI verified green.
- [ ] PR created if GitHub CLI available.
