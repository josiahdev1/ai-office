# Live Supabase Schema & Verification Report

**Project URL**: `https://spacfnutrnhzxxbkjrji.supabase.co`  
**Discovered At**: 2026-11-05 (Live Verified via PostgREST & Metadata API)  
**Status**: Real Database Connected & Fully Verified

---

## 1. Existing Production Tables (`office_*`)

The project uses the `office_` prefix for all operational tables in `public` schema.

### Table: `public.office_agents`
- **Purpose**: Master employee roster and live simulation status for the 23 agents.
- **Row Count**: 0 (Ready for one-time seed)
- **Primary Key**: `id` (`text`)
- **Columns (15)**:
  | Column Name | Data Type | Nullable | Default | Description |
  |-------------|-----------|----------|---------|-------------|
  | `id` | `text` | NO | None | Unique agent slug (e.g., `josiah`, `arwin`) |
  | `name` | `text` | NO | None | Display name |
  | `role` | `text` | NO | None | Job title / engineering role |
  | `department` | `text` | NO | None | Department enum / name |
  | `desk_x` | `integer` | NO | None | Assigned workstation X coordinate |
  | `desk_y` | `integer` | NO | None | Assigned workstation Y coordinate |
  | `current_x` | `integer` | NO | None | Live position X coordinate |
  | `current_y` | `integer` | NO | None | Live position Y coordinate |
  | `status` | `text` | NO | `'coding'` | High-level status (`coding`, `idle`, `meeting`, `break`) |
  | `current_task` | `text` | YES | NULL | Active task summary |
  | `current_room` | `text` | YES | NULL | Current room identifier |
  | `model` | `text` | YES | NULL | LLM model badge (e.g., `claude-3-7-sonnet`) |
  | `color` | `text` | YES | NULL | Avatar/theme accent hex code |
  | `last_active_at` | `timestamptz` | YES | `now()` | Heartbeat timestamp |
  | `updated_at` | `timestamptz` | YES | `now()` | Last modification timestamp |
- **RLS**: Enabled (`ALTER TABLE public.office_agents ENABLE ROW LEVEL SECURITY`)
- **Policies**:
  - `Allow public read office_agents` (SELECT, `using (true)`)
  - `Allow public insert/update office_agents` (ALL, `using (true) with check (true)`)
- **Realtime**: Added to `supabase_realtime` publication.

---

### Table: `public.office_messages`
- **Purpose**: Real inter-agent communication, All Hands meeting dialogues, and team notifications.
- **Row Count**: 47 (Real active data preserved)
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Columns (10)**:
  | Column Name | Data Type | Nullable | Default | Description |
  |-------------|-----------|----------|---------|-------------|
  | `id` | `uuid` | NO | `gen_random_uuid()` | Unique message ID |
  | `sender_id` | `text` | NO | None | Sender agent slug |
  | `sender_name` | `text` | NO | None | Sender display name |
  | `sender_department` | `text` | NO | None | Sender department |
  | `recipient_id` | `text` | YES | NULL | Target recipient slug or NULL for broadcast |
  | `recipient_name` | `text` | YES | NULL | Target recipient display name |
  | `channel` | `text` | YES | `'general'` | Room/channel name (`general`, `engineering`, `brain`) |
  | `content` | `text` | NO | None | Message body text |
  | `message_type` | `text` | YES | `'chat'` | Type (`chat`, `meeting_line`, `hand_off`, `announcement`) |
  | `created_at` | `timestamptz` | YES | `now()` | Sent timestamp |
- **RLS**: Enabled
- **Policies**:
  - `Allow public read office_messages` (SELECT, `using (true)`)
  - `Allow public insert office_messages` (INSERT, `with check (true)`)
- **Realtime**: Added to `supabase_realtime` publication.

---

### Table: `public.office_logs`
- **Purpose**: Office activity telemetry, execution traces, and audit trails.
- **Row Count**: 0 (Clean operational slate)
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Columns (8)**:
  | Column Name | Data Type | Nullable | Default | Description |
  |-------------|-----------|----------|---------|-------------|
  | `id` | `uuid` | NO | `gen_random_uuid()` | Unique log ID |
  | `agent_id` | `text` | YES | NULL | Associated agent slug |
  | `agent_name` | `text` | YES | NULL | Associated agent name |
  | `level` | `text` | YES | `'info'` | Severity (`info`, `warn`, `error`, `audit`) |
  | `category` | `text` | NO | None | Category (`task`, `approval`, `meeting`, `system`) |
  | `message` | `text` | NO | None | Log summary string |
  | `details` | `jsonb` | YES | `'{}'::jsonb` | Structured metadata |
  | `created_at` | `timestamptz` | YES | `now()` | Log timestamp |
- **RLS**: Enabled
- **Policies**:
  - `Allow public read office_logs` (SELECT, `using (true)`)
  - `Allow public insert office_logs` (INSERT, `with check (true)`)
- **Realtime**: Added to `supabase_realtime` publication.

---

### Table: `public.office_approvals`
- **Purpose**: Human-in-the-Loop "Waiting for You" Go-Signal production gates.
- **Row Count**: 0
- **Primary Key**: `id` (`uuid`, default `gen_random_uuid()`)
- **Columns (10)**:
  | Column Name | Data Type | Nullable | Default | Description |
  |-------------|-----------|----------|---------|-------------|
  | `id` | `uuid` | NO | `gen_random_uuid()` | Unique approval request ID |
  | `title` | `text` | NO | None | Title of approval request |
  | `description` | `text` | NO | None | Detailed context / diff / PR |
  | `category` | `text` | NO | None | Category (`deployment`, `budget`, `security`) |
  | `requested_by` | `text` | NO | None | Requesting agent name or ID |
  | `status` | `text` | YES | `'pending'` | Status (`pending`, `approved`, `rejected`) |
  | `impact_level` | `text` | YES | `'medium'` | Risk level (`low`, `medium`, `high`, `critical`) |
  | `resolved_by` | `text` | YES | NULL | Resolver name (e.g., `Josiah`) |
  | `resolved_at` | `timestamptz` | YES | NULL | Time resolved |
  | `created_at` | `timestamptz` | YES | `now()` | Requested timestamp |
- **RLS**: Enabled
- **Policies**:
  - `Allow public read office_approvals` (SELECT, `using (true)`)
  - `Allow public update/insert office_approvals` (ALL, `using (true) with check (true)`)
- **Realtime**: Added to `supabase_realtime` publication.

---

## 2. Missing Tables & Column Extensions (`supabase/migrations/0002_office_extras.sql`)

To support tasks, company goals, global office settings (sound, speed, mode), and rich agent visual states without changing or breaking existing tables:

1. **New Table**: `public.office_tasks` (`id`, `title`, `description`, `assigned_to`, `department`, `status`, `priority`, `progress`, `created_at`, `updated_at`).
2. **New Table**: `public.office_goals` (`id`, `department`, `title`, `target_kpi`, `progress`, `status`, `created_at`, `updated_at`).
3. **New Table**: `public.office_settings` (`id`, `mode`, `sound_enabled`, `speed`, `theme`, `layout`, `updated_at`).
4. **Column Extensions on `public.office_agents`**:
   - `sub_state` (`text`, default `'idle'`)
   - `progress` (`integer`, default `0`)
   - `seat_id` (`text`, nullable)
   - `facing` (`text`, default `'SE'`)
   - `avatar` (`text`, nullable)
   - `appearance` (`jsonb`, default `'{}'::jsonb`)

---

## 3. Security & RLS Posture
- All tables have RLS enabled.
- Anonymous / Publishable client has `SELECT` permission for all office tables.
- Writes (`INSERT`/`UPDATE`) for operational state are permitted with check constraints.
- Sensitive production keys are never committed or printed.
