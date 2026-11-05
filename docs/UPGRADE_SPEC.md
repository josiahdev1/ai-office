# Technical Specification: EasyUp Software Solution HQ (2.5D Isometric AI Office)

## 1. System Overview

**EasyUp Software Solution HQ** is an executive-grade, real-time 2.5D isometric corporate simulation and multi-agent AI command cockpit built with **Next.js 16 (Turbopack)**, **React 19**, and **Tailwind CSS v4**.

The platform simulates 23 specialized engineering and operations AI agents collaborating in a physically grounded, living studio space. It features:

- A floating 3D extruded isometric slab floor with 10 color-coded department rooms and glowing glass partition walls.
- Authentic workplace behaviors powered by A* grid pathfinding, multi-directional walk cycles, desk-bound work states, and mode transitions (`FOCUS WORK`, `ALL HANDS`, `COFFEE BREAK`).
- A real multi-provider LLM task orchestration pipeline with Google Gemini, Anthropic Claude, and OpenAI integration, backed by Human-in-the-Loop "Go-Signal" authorization.
- Resilient storage architecture safe for both local development and Vercel serverless environments.

---

## 2. Visual Architecture & 2.5D Isometric Canvas

The visual engine faithfully reproduces the isometric aesthetic established in the reference designs:

### 2.1 Coordinate System & Isometric Projection

- Screen coordinates \((sx, sy)\) are derived from world isometric coordinates \((x, y, z)\):
  \[
  sx = (x - y) \cdot \cos(30^\circ) \cdot \text{scale} + \text{offsetX}
  \]
  \[
  sy = (x + y) \cdot \sin(30^\circ) \cdot \text{scale} - z \cdot \text{scale} + \text{offsetY}
  \]
- Rendering utilizes an off-screen cache for static floor tiles, room borders, and isometric floor slab extrusion, maximizing performance for 60 FPS animation loops.

### 2.2 Facility Layout & Room Palette

1. **Central Crossroads & The Brain (`#0f172a` base, `#06b6d4` glowing cyan core)**: Central command dais with curved consoles and a pulsating holographic AI core with floating particles.
2. **Operations Hub (`#10b981` emerald green)**: 4 dedicated workstations, file cabinets, operations whiteboard, corner ficus plants.
3. **Growth Lab (`#3b82f6` royal blue)**: 3 workstations, metrics display board, collaboration table.
4. **Engineering Core (`#6366f1` electric indigo)**: 6 high-spec workstations featuring multi-monitor setups (triple-monitor L-desk for Founder Josiah).
5. **QA & SecOps NOC (`#ec4899` neon magenta)**: 3 workstations, security wall monitors, dark alert terminals.
6. **Intelligence Lab (`#06b6d4` vivid cyan)**: 4 workstations, model benchmark screens, server rack units.
7. **Command Center (`#0f172a` obsidian with `#f59e0b` amber accents)**: Executive desks for operations coordination and leadership.
8. **Meeting Room / All-Hands Amphitheater (`#a855f7` lavender)**: Long conference table, executive chairs, presentation screen.
9. **Pantry & Game Lounge (`#d97706` warm oak parquet)**: Coffee bar with espresso machine, water dispenser, cafe tables, lounge sofas, gaming console.
10. **Recreation Area (Gym & Tennis/Pool Court)**:

- Tennis/Pickleball court (`#0284c7` bright court blue with white boundary lines and net).
- Fitness Gym (`#334155` dark slate rubber flooring with workout benches, dumbbell racks, and treadmill).

---

## 3. Fleet Roster & Dynamic Desk Allocation

The facility accommodates a primary fleet of 23 named agents, with an automated spatial layout engine supporting 30+ agents dynamically:

### Primary Fleet Roster (23 Agents)

| Agent Name     | Department       | Role                              | Workspace Rig                            |
| -------------- | ---------------- | --------------------------------- | ---------------------------------------- |
| **Josiah**     | Engineering Core | Founder & Lead Architect          | Executive L-Desk, Triple 4K Monitors     |
| **Arwin**      | Engineering Core | Lead Backend Engineer             | Dual Monitor Rig                         |
| **Neil Mar**   | Engineering Core | Frontend / UI Architect           | Dual Monitor Rig                         |
| **Nelmar**     | Engineering Core | Full-Stack Systems Engineer       | Dual Monitor Rig                         |
| **Bonnie**     | Engineering Core | Cloud & DevOps Specialist         | Dual Monitor Rig                         |
| **John Lloyd** | Engineering Core | Database & Infrastructure Eng     | Dual Monitor Rig                         |
| **Khent**      | QA & SecOps NOC  | Lead Security & QA Engineer       | Dual Monitor Rig + SecOps Stream         |
| **John Arvy**  | QA & SecOps NOC  | Penetration Tester & Auditor      | Dual Monitor Rig                         |
| **Gian**       | QA & SecOps NOC  | Automated Test Automation Eng     | Dual Monitor Rig                         |
| **Mary Grace** | Operations Hub   | Head of Operations                | Dual Monitor Rig                         |
| **Anthony**    | Operations Hub   | Logistics & Resource Planner      | Dual Monitor Rig                         |
| **Blaze**      | Operations Hub   | Incident & Support Coordinator    | Dual Monitor Rig                         |
| **Ferwin**     | Operations Hub   | Process Automation Engineer       | Dual Monitor Rig                         |
| **Jo Vincent** | Growth Lab       | Growth & Marketing Strategist     | Dual Monitor Rig                         |
| **Jesmond**    | Growth Lab       | SEO & Content Intelligence Lead   | Dual Monitor Rig                         |
| **Kin**        | Growth Lab       | User Acquisition Specialist       | Dual Monitor Rig                         |
| **Roy Jhan**   | Intelligence Lab | Chief AI Research Engineer        | Dual Monitor Rig + Neural Net Visualizer |
| **Gabriel**    | Intelligence Lab | NLP & Prompt Systems Engineer     | Dual Monitor Rig                         |
| **Keiru**      | Intelligence Lab | Computer Vision & Multimodal Lead | Dual Monitor Rig                         |
| **Ryan**       | Intelligence Lab | MLOps & Fine-Tuning Specialist    | Dual Monitor Rig                         |
| **Gloria**     | Command Center   | Executive Operations Manager      | Executive Station                        |
| **JB**         | Command Center   | Technical Program Manager         | Dual Monitor Station                     |
| **Julian**     | Command Center   | Strategy & Financial Director     | Dual Monitor Station                     |

### Dynamic Desk Allocation Algorithm

When new agents are added to `brain/live_status.json`:

1. The room grid computes available desk slots based on room dimensions \((W \times H)\).
2. If explicit coordinates (`desk_coord`) are omitted, the next unoccupied coordinate tile within the department boundary is dynamically reserved.
3. Furniture rigs and chairs are automatically instanced and rendered in the 2.5D layer hierarchy.

---

## 4. Movement, A* Pathfinding & State Machine

### 4.1 Collision & Grid System

- Office space is partitioned into a discrete $64 \times 64$ grid of isometric tiles.
- Tiles are classified as:
  - `WALKABLE` (hallways, room interior pathways, door openings)
  - `BLOCKED` (walls, glass partitions, desks, monitors, plants, server racks)
  - `SEATING` (agent desk chairs, conference chairs, lounge sofas)

### 4.2 A* Pathfinding Engine

- Uses Manhattan/Octile heuristic with diagonal path smoothing.
- Doorway arbitration prevents agent overlapping or collision deadlocks.
- Physics loop updates coordinates via linear interpolation (`lerp`) clamped to target delta time ($60 \text{ FPS}$).

### 4.3 Behavioral State Machine & Modes

- **`FOCUS WORK`**: All agents stand up, calculate optimal paths to their assigned room desks, sit down, and engage in the typing walk/work cycle.
- **`ALL HANDS`**: Agents transition to The Brain or Meeting Room conference table.
- **`COFFEE BREAK`**: Agents walk to the Pantry & Game Lounge, gather near the coffee machine or lounge sofas, and trigger idle beverage animations.
- **`RANDOM WANDER`**: Occasional natural corridor movement during idle periods without disrupting assigned desk work.

---

## 5. Real LLM Dispatch & Inter-Agent Communication Bus

### 5.1 Event Bus Architecture (`src/lib/office/bus.ts`)

- Lightweight in-memory EventEmitter delivering pub/sub messaging across agents.
- Cross-team messaging triggers:
  1. Spatial pathfinding for the sender to approach the recipient's desk (or display line-of-sight laser link).
  2. Typewriter speech bubble popup above agent sprite with speech bubble tails.
  3. Structured activity log record pushed to client telemetry.

### 5.2 Multi-Provider LLM Integration (`src/lib/llm/index.ts`)

When a directive is dispatched to an agent, the server attempts execution through the configured provider hierarchy:

1. **Google Gemini** (`GEMINI_API_KEY` via `@google/genai` or direct REST API v1beta).
2. **Anthropic Claude** (`ANTHROPIC_API_KEY` via Anthropic Messages API).
3. **OpenAI** (`OPENAI_API_KEY` via OpenAI Chat Completions API).
4. **Resilient SIM Mode**: If no API keys are active or if network limits are reached, the system executes high-fidelity simulated engineering workflows with realistic terminal outputs and an explicit `SIM MODE` badge in the UI.

### 5.3 Human-in-the-Loop (HITL) Go-Signal Approvals

Critical actions require human approval before execution:

- Staged in `brain/approvals/` with title, agent name, impact summary, and status.
- UI renders an authorization card under **WAITING FOR YOU** with "Approve" (Go-Signal) or "Reject" buttons.
- Approval triggers audit logging to `brain/logs/audit.log` and updates the agent's live task.

---

## 6. Serverless-Safe Storage Abstraction (`src/lib/storage/index.ts`)

To support both local Node.js environments and Vercel serverless deployments (where local filesystem writes are ephemeral or read-only):

- In-memory reactive state cache initialized from `brain/live_status.json`.
- Filesystem synchronization enabled when write permissions are available.
- Extensible storage provider interface ready for Supabase or Upstash Redis integration without modifying business logic.

---

## 7. Cockpit UI/UX & Interactive Controls

- **Canvas Viewport (68%)**:
  - Pan (click-and-drag), zoom (mouse wheel / pinch gesture), and reset view controls.
  - Camera tracking: clicking an agent smoothly centers the viewport on their sprite.
  - Minimap with real-time agent dots and viewport rectangle indicator.
  - Simulation Speed toggle (`1x` default, `2x`, `5x`).
  - Day / Night lighting toggle with ambient tint and glowing neon highlights.
  - Audio SFX synthesized via the Web Audio API (keystrokes, footsteps, approvals, notifications).
- **Control Cockpit (32%)**:
  - **IN PROGRESS**: Active tasks with percentage progress bars and current file paths.
  - **WAITING FOR YOU**: Pending Go-Signal approvals with one-click actions.
  - **DONE TODAY**: Real-time ticker of verified deliverables.
- **Lower Dashboard**:
  - **Filter Bar**: Quick department filtering (All, Engineering, QA/SecOps, Operations, Growth, Intelligence, Command, Pantry, Rec).
  - **TEAM TODAY**: Complete searchable fleet roster with live status badges.
  - **RUNNING GOAL LIST**: Active sprint targets and deliverables.
  - **ACTIVITY LOG**: Live terminal event log.
- **Agent Inspector Drawer**:
  - Slide-out panel with full agent metadata, current task, terminal output preview, and direct instruction prompt.
