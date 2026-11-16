# EasyUp Software Solution HQ — Office V3 Architecture & Goals

## Executive Summary

Office V3 upgrades the EasyUp Software Solution HQ AI Office into a production-grade, 2.5D isometric 3×3 building architecture matching reference designs (`ref-layout-3x3.png`, `ref-room-closeup.png`, `ref-building-cutaway.png`, `ref-table-topdown.png`, `ref-brain-center.png`, and video frames `v01`–`v13`).

The upgrade introduces:

1. **Authentic 3×3 Isometric Layout**: A central Command Center housing **THE BRAIN** (pulsing cyan holographic core, particle orbit, arc console ring, curved wall displays) surrounded by **eight specialized walled rooms** connected by **2-tile checkered corridors** and doorways.
2. **Real Cutaway Thick Walls & Floor Materials**:
   - Dark navy perimeter and room partition walls with visible thickness, lighter beveled top edges, and door cutaways.
   - Distinct floor materials per room (wood parquet, blue ceramic tile, green linoleum, magenta circuit, purple carpet, warm cream tile, pink recreation tile, indigo development floor).
   - Rich environmental decor: windows with city views, wall clocks, whiteboards, corkboards, posters, bookshelves, coffee machines, water coolers, vending machines, pool table, arcade cabinet, and swaying potted plants.
3. **Name-Only White Pill Name Tags**:
   - Floating white rounded pill displaying **ONLY** the agent's name and status dot.
   - Anti-overlap solver: greedy screen-space collision detection with vertical/diagonal offset shifting and dot-only fallback at distant zoom.
   - Role and department details preserved in tooltips, agent inspection cards, and the AGENTS roster.
4. **Authentic Seated PC Use & Real Typing**:
   - Seated agents face their monitors, showing their **back or side profile**, never facing the camera while working at desks.
   - Dual-arm procedural typing animation with alternating hand movements, subtle shoulder/head bounce, keyboard key flashes, and monitors streaming syntax-highlighted code.
   - Ergonomic swivel chairs with pull-out and swivel animations.
5. **New Agent "Christian"**:
   - Onboarded to **Engineering Core** as "Developer".
   - Full workstation assigned in the Engineering room with chair facing the desk.
   - "NEW" badge on agent card and roster.
   - Idempotent database upsert via `src/lib/office/db-map.ts` and `supabase/seed_office_agents.sql`.
   - Expands master resident roster to 24 specialist agents.
6. **Command Bar (`!work`, `!eat`, `!play`, `!meet`, `!gym`)**:
   - Interactive prompt bar supporting natural Discord-style dispatch commands with agent name autocompletion.
   - Directs agent pathfinding through room doorways and corridors to corresponding facilities without teleportation.
   - Emits structured telemetry to `office_logs` and `office_messages`.
7. **Room Focus Cinematic Camera**:
   - Smooth pan/zoom presets for each of the 8 rooms and The Brain.
   - "Fit All" 3×3 overview mode alongside interactive drag-pan and scroll-zoom.

---

## 3×3 Room Layout Matrix

```
       [ Intelligence Lab (Teal) ]       [ Operations Hub (Green) ]       [ QA & SecOps NOC (Magenta) ]
                          \                         |                         /
      [ Growth Lab (Blue) ]   -------  [ THE BRAIN (Center Core) ]  -------   [ Executive Lounge (Purple) ]
                          /                         |                         \
       [ Engineering Core (Indigo) ]     [ Pantry & Canteen (Cream) ]     [ Rec & Gym / Game (Pink) ]
```

- **Corridors**: 2-tile wide checkered hallways (`#1e293b` & `#334155` squares) connecting all 8 perimeter rooms directly to the central Brain plaza.
- **Door Openings**: 2-tile wide cutaway archways on room corridor walls allowing smooth pedestrian pathfinding.
- **Outdoor Campus Retention**: The building slab rests upon the outdoor campus grounds (lawn, zen pond, flagpole, two-way roadway loop, crosswalk, bus shelter, and 22-bay parking lot with moving and parked procedural vehicles).

---

## Technical Architecture & Quality Gates

- **Framework**: Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript 5.8+.
- **Database**: Supabase Realtime (`office_agents`, `office_approvals`, `office_logs`, `office_messages`, `office_tasks`, `office_settings`).
- **Art Engine**: Palette-indexed pixel art pipeline compiled to canvas memory / OffscreenCanvas caches.
- **Zero-Overlap Validation**: Enforced via `tests/validateMap.test.ts` and `src/lib/office/validateMap.ts`.
- **Remote CI**: Mandatory green status on branch `office-v3`.
