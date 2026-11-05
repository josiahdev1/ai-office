# EasyUp Software Solution HQ — Isometric Redesign Blueprint

## 1. Executive Summary & Design Directive
This document outlines the architectural upgrade of the EasyUp Software Solution HQ AI Office from isolated floating room clusters to a unified, high-fidelity **Isometric Open-Plan Studio** matching `/design-ref/ref-hq.png`.

### Core Design Tenets
1. **Contiguous Open-Plan Floor Slab**:
   - Single floating 2:1 isometric floor slab (`tileWidth = 64px`, `tileHeight = 32px`).
   - Warm cream/beige floor tiles (`#e5dec9` / `#d8cfb8`) with subtle grout borders.
   - High dark charcoal cutaway back walls (`#181c26` / `#222735`) with 3D visible top depth (`#32394c`). Front walls are cut away for full visibility.
   - Deep obsidian navy backdrop (`#06080f` to `#0a0d16`).
2. **Preserve Existing Worker Sprites**:
   - Employee visual identity strictly anchored to `src/components/office/pixel-sprites.tsx` (chunky pixel person, blue cap, dark face silhouette, blue shirt, dark pants).
   - Augmented with 4-direction facing, sitting/typing/walking frames, and floating name tags with status indicators.
3. **Walkable Aisles & Collision Grid**:
   - 28x28 grid tilemap with main walkways and aisles at least 2 tiles wide.
   - Non-overlapping departmental desk rows, meeting area, pantry, and lounge.
   - Strictly no teleporting: A* pathfinding calculates smooth waypoint travel for all mode transitions.
4. **Supabase Realtime Backend**:
   - Live persistent database backing agents, tasks, approvals, messages, goals, and office settings.
   - Eliminates fake mock loops with genuine events, Realtime change streams, and SSR helpers.

---

## 2. Floor Plan & Spatial Layout (28x28 Grid)

```
   [0,0] Top Corner (Back Charcoal Walls)
      /\
     /  \   THE BRAIN (Meeting Core) - Round dark table + 30 chairs + pulsing core
    /    \  [Tiles (8,8) to (14,14)]
   /  /\  \
  /  /  \  \  ENGINEERING & QA ROWS (Center-Left & Center-Right)
 /  /    \  \ Desks in 2x2 rows, dual monitors, clear 2-tile aisles
/  /      \  \
\  \      /  / PANTRY & RECEPTION (Right Wing) - L-counter, coffee, cooler, snacks
 \  \    /  /  LOUNGE & NOC (Left Wing) - Purple velvet sofa, server racks with LEDs
  \  \  /  /   GYM & WELLNESS (Bottom Corner) - Treadmills, mats, weights
   \  \/  /
    \    /
     \  /
      \/ [28,28] Front Cutaway (No front walls)
```

### Department Zones & Desk Allocations
1. **Executive / Lead Architect**:
   - Coordinates: `(4, 5)` — Josiah's triple-monitor command rig.
2. **Engineering Core (4 Desks)**:
   - Backend & Infra: `(5, 7)`, `(5, 9)`
   - Frontend & Mobile: `(7, 7)`, `(7, 9)`
3. **QA & SecOps NOC (4 Desks)**:
   - Penetration Testing & Auditing: `(5, 12)`, `(5, 14)`
   - Automated Testing & CI: `(7, 12)`, `(7, 14)`
4. **Intelligence Lab (4 Desks)**:
   - LLM & Vector Pipeline: `(16, 7)`, `(16, 9)`
   - Data & Analytics: `(18, 7)`, `(18, 9)`
5. **Growth Lab (4 Desks)**:
   - Product, Marketing & SEO: `(16, 12)`, `(16, 14)`
   - Community & Developer Relations: `(18, 12)`, `(18, 14)`
6. **Operations Hub (6 Desks)**:
   - Finance, Legal, Support & People Ops: `(16, 17)`, `(18, 17)`, `(16, 19)`, `(18, 19)`, `(16, 21)`, `(18, 21)`

---

## 3. Interactive Office Modes & Behaviors

| Mode | Trigger | Agent Behavior | Reservation Target |
| :--- | :--- | :--- | :--- |
| **FOCUS_WORK** | Default / "Focus Work" button | Agents walk back to their assigned departmental desks and resume typing. | Assigned Desk Chair Coordinates |
| **ALL_HANDS** | "All Hands" button | All 23 agents pathfind to the central round table ("The Brain") and take seats / stand in the outer ring. | 30+ Brain Meeting Spots |
| **COFFEE_BREAK**| "Pantry & Canteen" button | Agents walk to the L-counter, coffee machine, vending snacks, or lounge sofas. | 30+ Pantry & Lounge Spots |
| **GYM_WELLNESS**| "Rec & Gym" button | Agents pathfind to wellness zone, treadmills, yoga mats, or stretching areas. | Gym Equipment Coordinates |

---

## 4. Map Validation & Integrity Engine (`validateMap.ts`)
To permanently eliminate overlaps and pathfinding traps (Bug 3), `validateMap.ts` enforces:
1. `validateNoOverlaps(zones)`: Checks every bounding box; zero overlaps allowed.
2. `validateFurnitureBounds(furniture, mapWidth, mapHeight)`: All items strictly within the 28x28 grid.
3. `validateAisles(grid)`: All primary pathways guarantee $\ge 2$ walkable contiguous tiles.
4. `validateReachability(grid, start, targets)`: Verifies every single desk and activity spot is reachable via A* pathfinding.
