# EasyUp Headquarters — Office v2 Progress Tracker

## Completed Phases

- **Phase 0: Setup & Specification**
  - Technical specification (`docs/UPGRADE_SPEC.md`, `docs/REDESIGN.md`)
  - CI workflow with fallback credentials
  - Vitest test setup and test infrastructure

- **Phase 1: Multi-Agent Fleet Storage & Telemetry**
  - Storage adapter (`src/lib/storage/index.ts`)
  - 23 resident agents with distinct roles, skills, and departments
  - Dynamic desk allocation and REST endpoints

- **Phase 2: 2.5D Isometric Engine & Open-Plan Architecture**
  - Diamond slab isometric canvas (2:1 projection)
  - Wall depth caps and perimeter cutaways
  - Procedural pixel-art employee sprites matching `src/components/office/pixel-sprites.tsx`

- **Phase 3: Pathfinding & Activity Modes**
  - A* pathfinding without teleportation
  - Mode transitions: `FOCUS_WORK`, `ALL_HANDS`, `COFFEE_BREAK`, `RECREATION`
  - Regression test suite (`tests/regression-modes.test.ts`)

- **Phase 4: Communication & Event Bus**
  - In-memory event bus (`src/lib/office/bus.ts`)
  - Procedural typewriter speech bubbles
  - Non-repeating realistic developer dialogue (`src/lib/office/dialogueEngine.ts`)

- **Phase 5: Cockpit UI/UX Chrome**
  - Top navigation HUD with scrolling agent chips
  - Bottom action bar with mode buttons and zoom controls
  - Slide-over `AGENTS` roster drawer with real-time search

- **Phase 6: Supabase Production Schema & Realtime Architecture**
  - Schema documentation (`docs/SUPABASE_SCHEMA.md`)
  - Production tables: `office_agents`, `office_approvals`, `office_logs`, `office_messages`, `office_settings`
  - Bidirectional db-map adapter (`src/lib/office/db-map.ts`) and Vitest test suite (`tests/db-map.test.ts`)

---

## Add-on: Pixtuoid-Style Features + Live Coding-Agent Bridge

### Phase 9: Multi-Floor Cutaway + Elevator
- [ ] Split building into cutaway slab floors:
  - Ground Floor: Lobby, Canteen & Pantry, Gym & Recreation
  - Floor 1: Engineering Core, QA & SecOps NOC, Operations Hub
  - Floor 2: Growth Lab, Intelligence Lab, Command Center, Executive Lounge
  - Top Floor (Penthouse): THE BRAIN Meeting Core & Observation Deck
- [ ] Floor switcher:
  - UI buttons, PageUp/PageDown, Up/Down arrow keys, `j`/`k`
  - Smooth slide transition between floors
  - Floor strip with live agent count per floor
- [ ] Elevator system on every floor:
  - Shaft & door opening/closing visual animation
  - Inter-floor routing via elevator waypoints and entry/exit queues
  - Cross-floor support for `ALL_HANDS`, `COFFEE_BREAK` / `PANTRY`, and `RECREATION`
  - Camera follow switches floors automatically when following an agent across floors
  - Update `validateMap` and tests for multi-floor reachability

### Phase 10: Atmosphere
- [ ] Time-of-day slider and clock (Dawn, Day, Dusk, Night)
  - Ambient canvas lighting and window backdrop adjustments
  - Day light shafts, glowing monitors and night lamps
- [ ] Weather system:
  - Clear, Rain, Storm (lightning flash), Snow, Fog, Overcast, Windy
  - Visible outside window cutaways with subtle raindrop effects
- [ ] Color Themes:
  - Coworking (default), Cyberpunk, Dracula, Tokyo Night, Catppuccin, Gruvbox
  - Token-driven room palettes, wall trim, and UI cockpit accents
  - Persistence in `office_settings`
- [ ] Lofi soundtrack:
  - Live synthesized via Web Audio API (procedural, 0 external audio files)
  - Tempo and mood modulate based on clock, weather, and floor busyness
  - Muted by default (`muted: true`), toggleable via `♩` button
  - Respect `prefers-reduced-motion` and maintain 60 FPS

### Phase 11: Office Life
- [ ] Pets:
  - Resident cat or dog per floor roaming aisles, pantry, and sofas
  - Sleeping near idle agents
  - Interactive: clicking pets with floating heart animation
  - Dedicated non-blocking walkability rules (never block elevator or doorways)
- [ ] Idle behavior & banter:
  - Idle agents drift to meeting spaces for banter bubbles
  - Coffee runs (walk to pantry, carry cup back to desk, cup stays on desk)
  - Throttled, pausable, banter logged to `office_messages`
- [ ] Status glyphs above heads:
  - `?` when waiting on approval
  - `z` when napping/idle
  - Spinner when thinking
  - Red `!` when blocked
- [ ] Per-tool monitor glow:
  - Editing = Blue
  - Shell / commands = Orange
  - Reading / research = Cyan
  - Waiting / idle = Dim
- [ ] Token meter:
  - Growing paper piles on desks reflecting token spend from tasks/logs
  - Sheet drop animation on major spend
- [ ] Hover tooltips:
  - Agents: role, session length, task count, running-time %
  - Desks and plants: names and details
- [ ] Agent tree dashboard (`Tab` key):
  - Hierarchical view grouped by floor and room
  - Displays current CLI / task and status
  - Clicking any node navigates/follows that agent
- [ ] Team accents:
  - Team-color accents on tags, desk trims, and rugs (never recolor character sprites)

### Phase 12: Live Coding-Agent Bridge
- [ ] Database Schema:
  - Migration `supabase/migrations/0003_external_sessions.sql`
  - Support external sessions (`kind`: resident | external, `cli`: claude-code | antigravity | codex, `session_id`, `cwd_hash`, `status`, `current_tool`, `tokens_used`, `tool_call_count`, `started_at`, `last_seen_at`, `ended_at`)
  - Update `src/lib/office/db-map.ts` preserving all existing columns
- [ ] Ingest API (`POST /api/office/ingest`):
  - Server-side bearer token validation (`OFFICE_INGEST_TOKEN`) with constant-time comparison
  - Zod schema validation & rate limiting
  - Accepted events: `session_start`, `tool_start`, `tool_end`, `waiting_approval`, `token_usage`, `session_end`
  - Writes to Supabase & logs to `office_logs`
  - Kill-switch toggle (`ingest_enabled`) in `office_settings`
- [ ] Local Bridge CLI & Hook Shim (`bridge/`):
  - `bridge/office-hook.mjs`: Zero runtime dependencies, reads stdin JSON, hard ~300ms timeout, guaranteed `exit 0`
  - Privacy safeguards: sends only non-sensitive metadata (never code or prompts)
  - Transcript tailer fallback
  - Adapters: Claude Code (`~/.claude/settings.json`) & Antigravity CLI (`~/.gemini/config/plugins/`)
  - Setup CLI: `node bridge/setup.mjs` (`connect`, `disconnect`, `status`)
  - Simulation script: `bridge/simulate.mjs`
- [ ] App-Side Integration:
  - Sources panel in Settings
  - Guests group in AGENTS panel and Agent Tree with CLI badges (`cc`, `ag`, `cx`)
  - Guest lifecycle: elevator entry, guest desk claim, monitor glow, leave via elevator
  - Vitest test suite for ingest schema, token auth, hook shim exit-0, and guest lifecycle

### Phase 13: Floating Window + Final QA
- [ ] Floating Window:
  - Compact `/floating` route
  - Document Picture-in-Picture API with popup fallback
- [ ] End-to-end verification and QA:
  - Visual testing and browser screenshots
  - Multi-floor navigation, elevator trips, and cross-floor `ALL_HANDS`
  - Simulation testing with `bridge/simulate.mjs`
  - Documentation: `docs/BRIDGE.md`
