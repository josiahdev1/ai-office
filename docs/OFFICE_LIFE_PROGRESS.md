# Office Life & Real Iloilo Time Progress Tracker (Phases K1 to K10)

This document tracks progress on the Office Life, Real Iloilo Time, Needs Engine, and JARVIS Reminders milestone.

---

### Phase K1: Data Foundation + Real Clock + Working-Is-Real + Scheduler
- [x] Phase K1 Completed:
  - Added migration 0009 with office_map_versions, office_settings, office_calendar, office_schedule_blocks, and office_world_state.
  - Implemented real Iloilo solar clock (Asia/Manila, UTC+8) driving 3D sky/lighting and triple-tier hybrid scheduler (docs/SCHEDULING.md).
  - Fixed "WORKING is real": agents without active tasks default to AVAILABLE, removed Math.random cycles, 20/20 test suites (150 tests) passing.
- [x] Move map to `office_map_versions` (seed from existing map once, read active version at runtime with Realtime and cache)
- [x] Move settings to `office_settings`
- [x] Build real Iloilo clock (`Asia/Manila`, UTC+8, standard solar algorithm for Iloilo day/night/sun position)
- [x] Calendar table (`office_calendar`) and schedule blocks (`office_schedule_blocks`)
- [x] Shared scheduler (cron tick endpoint / Edge function / leader-tab fallback with lease in `office_world_state`)
- [x] Documentation in `docs/SCHEDULING.md`
- [x] Fix "WORKING is real": an agent is WORKING only while it has a real running task or active Jarvis plan step; otherwise AVAILABLE
- [x] Component scan test failing on hardcoded sample data and Math.random feeding displayed values
- [x] Vitest unit tests for clock, timezone, solar day/night, schedule blocks, lease idempotency, map version undo

---

### Phase K2: Wellness Wing + Departments + New Agents
- [x] Phase K2 Completed:
  - Modeled full 3D Wellness Wing: Nap Room (8 beds, lamps, DND lights), Comfort Room (6 stalls, mirrors, dryers), Cafeteria (buffet, fridge, 24 dining seats), Facilities (yellow cart, jugs shelf), and 6 water dispensers.
  - Implemented data-driven `office_departments` table + interactive "+ DEPT" Provisioning Wizard modal with full validation.
  - Upserted 3 new resident agents into Supabase: Boss (Chief of Staff beside THE BRAIN with clipboard), Cleaner 1, and Cleaner 2 (Facilities & Wellness), verified via 21/21 passing test suites.
- [x] Nap Room (8+ beds, single/bunk, approach tile, reservation slot)
- [x] Comfort Room (6+ stalls with doors, occupied sign, sinks, dryers)
- [x] Cafeteria (24+ seats, serving line, trays, microwave, fridge, time-based meal props)
- [x] Facilities Room (cleaning cart, mops, buckets, supply shelves)
- [x] Water Dispensers (6+ with jug levels)
- [x] Idempotent `office_departments` table + "Add department" wizard
- [x] New resident agents: Boss (Chief of Staff), Cleaner 1, Cleaner 2

---

### Phase K3: Needs Engine (Human-Like) + Plan + Activity Log
- [x] Phase K3 Completed:
  - Added idempotent tables in migration 0011: office_agent_needs, office_needs_config, office_break_requests, office_agent_plan, and office_agent_activity_log.
  - Implemented human-like Needs Engine with deterministic lazy evaluation, circadian rhythm curve, caffeine/sleep debt, traits, and break request dispatch.
  - Built 24-hr PHT Day Timeline & Agent Log Drawer with real-time stream and RFC-4180 CSV export; verified with 9/9 passing tests.
- [x] Idempotent `office_agent_needs` (energy, hunger, thirst, bladder, health, morale, caffeine, sleep_debt)
- [x] Circadian rhythm & human-like dynamics in `office_needs_config`
- [x] Visible tiredness behaviors & break requests in `office_break_requests`
- [x] Agent Plan in `office_agent_plan`
- [x] Activity Log in `office_agent_activity_log` with Agent Log drawer & timeline

---

### Phase K4: Real Activities in the 3D Office
- [x] Phase K4 Completed:
  - Implemented ActivitySlotManager managing reservations, FIFO queues, and deadlock timeouts across Nap Beds (8), CR Stalls (6), Dining Seats (24), Dispensers (6), and Gym spots.
  - Added procedural 3D activity poses, props (meal trays, coffee cups, mop/cart), sleep Z particles, and sprite nameplate activity status icons (💤, 🍽️, ☕, 🚻, 🏋️, 💧, 💻, 🧹, 🟢).
  - Wired derived live counters (WORKING, AVAILABLE, EATING, RESTING, SLEEPING, IN CR, IN GYM, ON BREAK, CLEANING) strictly from real states, passing 23/23 test suites (185 tests).
- [x] 3D activity pathfinding, reservations, queues, and animations (water, coffee, eat, CR, nap, sleep, gym, lounge, social, work)
- [x] Small status icons on name tags
- [x] Derived live counters (WORKING, AVAILABLE, EATING, RESTING, SLEEPING, IN CR, IN GYM, ON BREAK, CLEANING)

---

### Phase K5: Jarvis Wellness Manager + Policy + Approvals + Wellness UI
- [x] Phase K5 Completed:
  - Stored Jarvis Autonomy policy in Supabase (Ask me for everything, Standing policy, Off), with 30% department cap, work protection, pins (Never rest, Must rest), and remembered operator decisions.
  - Implemented 7 Zod-validated function calling tools in Jarvis (`get_wellness`, `propose_break`, `list_resting`, `wake_agent`, `set_policy`, `get_agent_log`, `what_should_agent_do_next`).
  - Delivered Wellness & Vitals UI with `[SIMULATED]` badges, department vitals heat strip, sorting, quick action buttons, approval cards with Edit/Hold/Deny/Approve, and real needs WARN alerts in Jarvis.
- [x] Autonomy policy in Supabase (Ask me for everything, Standing policy, Off)
- [x] Daily schedule planning & exception proposals in WAITING FOR YOU
- [x] Work protection & task-to-agent mapping with needs
- [x] Jarvis function-calling wellness tools
- [x] Wellness tab in AGENTS and inspector card

---

### Phase K6: Cleaners and Facilities
- [x] Phase K6 Completed:
  - Added idempotent tables in migration 0013: office_facility_state (dirt, fill_level, supplies_level, water jugs) and office_cleaning_requests.
  - Implemented real-use event-driven dirt accumulation (meals, CR, sweat, coffee), 6 water dispenser jug tracking/replacement (-4% per drink), and cleaners priority queue with break protection.
  - Delivered HQ Facilities & Cleanliness UI card, wet-floor sign tracking, manual cleaning dispatch dropdown, cleaner direct tasking controls, and JARVIS tools (`get_facility_status`, `request_cleaning`) verified with 25/25 passing test suites.
- [x] Idempotent `office_facility_state` (dirt, bin levels, water jug levels, supplies)
- [x] Cleaners queue and maintenance animations
- [x] Cleanliness score per room and CLEANING counter

---

### Phase K7: Boss Gathering + Brain Learning Log
- [x] Phase K7 Completed:
  - Idempotent schema migration 0014: `office_gather_runs`, `office_brain_learning_log`, `office_agent_insights`, and `office_jarvis_memory` with permissive RLS, indexes, and Realtime publication.
  - Built `BrainLearningManager` engine with secret sanitization/rejection filter, deterministic statistics, semantic deduplication (`kind: 'duplicate'`), daily token cap, and RFC-4180 CSV export.
  - Delivered Brain Learning Log drawer, HUD Last Learned chip, task-to-agent mapping booster (+45 boost citing learned insights in assignment reason), and JARVIS tools (`trigger_boss_gather`, `get_brain_learning_log`, `manage_brain_insight`).
- [x] Boss Gather job (delta scan, statistics, structured insights)
- [x] `office_gather_runs`, `office_brain_learning_log`, and `office_agent_insights`
- [x] Brain log UI panel in Jarvis dashboard & 3D delivery animation

---

### Phase K8: Jarvis Reminders and "Jarvis Calls Me"
- [ ] Function calling reminder tools & natural language voice parser (`src/lib/reminders/parse.ts`)
- [ ] Idempotent tables (`office_reminders`, `office_reminder_events`, `office_push_subscriptions`)
- [ ] Web Audio synthesized incoming call UI overlay & two-way voice call
- [ ] Web Push service worker & optional channels (Telegram, Discord)

---

### Phase K9: Full Supabase Data Audit (No Mock Data Anywhere)
- [ ] `scripts/verify-supabase.mjs` (`npm run verify:supabase`)
- [ ] Feature write-test matrix
- [ ] Data Health panel in Settings and Jarvis dashboard
- [ ] Hardcoded data scan enforcement test


---

### Phase K10: Final QA
- [ ] Full end-to-end verification checklist (a through q)
- [ ] Visual screenshots, self-review defects & fixes, PR merge update
- [ ] Server Room + resident Server Room agent (PC work + periodic server rack inspection loop)
- [ ] Men's & Women's Comfort Rooms (separated/labeled stalls, sinks, dryers, routing)
- [ ] Roaming Boss & roaming Cleaner 1 / Cleaner 2 (no desk-bound idle; continuous patrol & cleaning)
- [ ] 2D (`?v=2`) vs 3D mode parity audit and sync/banner fix
- [ ] Move `brain/`, `bridge/`, and `design-ref/` into `docs/` organized + consolidate `.agent/` and `.agents/` skills
- [ ] Root `tickets/TEMPLATE.md` + chronological milestone tickets (`tickets/ticket-01-<short-task-name>.md` onward from first Antigravity chat to K10)