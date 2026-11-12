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
- [ ] Idempotent `office_agent_needs` (energy, hunger, thirst, bladder, health, morale, caffeine, sleep_debt)
- [ ] Circadian rhythm & human-like dynamics in `office_needs_config`
- [ ] Visible tiredness behaviors & break requests in `office_break_requests`
- [ ] Agent Plan in `office_agent_plan`
- [ ] Activity Log in `office_agent_activity_log` with Agent Log drawer & timeline

---

### Phase K4: Real Activities in the 3D Office
- [ ] 3D activity pathfinding, reservations, queues, and animations (water, coffee, eat, CR, nap, sleep, gym, lounge, social, work)
- [ ] Small status icons on name tags
- [ ] Derived live counters (WORKING, AVAILABLE, EATING, RESTING, SLEEPING, IN CR, IN GYM, ON BREAK, CLEANING)

---

### Phase K5: Jarvis Wellness Manager + Policy + Approvals + Wellness UI
- [ ] Autonomy policy in Supabase (Ask me for everything, Standing policy, Off)
- [ ] Daily schedule planning & exception proposals in WAITING FOR YOU
- [ ] Work protection & task-to-agent mapping with needs
- [ ] Jarvis function-calling wellness tools
- [ ] Wellness tab in AGENTS and inspector card

---

### Phase K6: Cleaners and Facilities
- [ ] Idempotent `office_facility_state` (dirt, bin levels, water jug levels, supplies)
- [ ] Cleaners queue and maintenance animations
- [ ] Cleanliness score per room and CLEANING counter

---

### Phase K7: Boss Gathering + Brain Learning Log
- [ ] Boss Gather job (delta scan, statistics, structured insights)
- [ ] `office_gather_runs`, `office_brain_learning_log`, and `office_agent_insights`
- [ ] Brain log UI panel in Jarvis dashboard & 3D delivery animation

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
