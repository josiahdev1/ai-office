---
name: supabase-realtime-data
description: Supabase Realtime Architecture, SSR Helpers, and Database Schema for EasyUp HQ.
---

# Supabase Realtime Data System

## 1. Setup & Environment
- Environment Variables:
  - `NEXT_PUBLIC_SUPABASE_URL`: Target Supabase project URL (`https://spacfnutrnhzxxbkjrji.supabase.co`).
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Public anonymous/publishable key (`sb_publishable_dkDalV5egnrWSKymMPEjvg_E81nLzdi`).
- Client Utilities:
  - Browser Client: `src/utils/supabase/client.ts` using `createBrowserClient`.
  - Server Client: `src/utils/supabase/server.ts` using `createServerClient` with `cookies` from `next/headers`.
  - Proxy/Middleware: `src/utils/supabase/middleware.ts` invoked via `src/proxy.ts` (Next.js 16).

## 2. Core Database Schema
The database schema manages all persistent state in `supabase/migrations/0001_ai_office.sql`:
1. `agents`: ID, name, role, department, avatar, status (`idle`, `busy`, `in_meeting`, `on_break`), desk_x, desk_y, current_task_id, updated_at.
2. `tasks`: ID, title, description, assigned_to, department, status (`backlog`, `in_progress`, `review`, `done`), priority, progress, updated_at.
3. `approvals`: ID, title, requested_by, details, risk_level, status (`pending`, `approved`, `rejected`), created_at.
4. `activity_log`: ID, agent_id, agent_name, action, details, department, timestamp.
5. `audit_log`: ID, event, actor, details, severity, created_at.
6. `messages`: ID, sender_id, sender_name, receiver_id, receiver_name, content, channel, created_at.
7. `goals`: ID, department, title, target_kpi, progress, status.
8. `office_settings`: ID, mode (`FOCUS_WORK`, `ALL_HANDS`, `COFFEE_BREAK`, `GYM_WELLNESS`), sound_enabled, speed, updated_at.

## 3. Realtime Synchronization
- Components subscribe to `postgres_changes` on `agents`, `tasks`, `approvals`, `messages`, and `office_settings`.
- If connection drops or during offline dev, fallback gracefully to initial SSR data / memory store without throwing uncaught exceptions.
- Zero fake random loops in production: messages and logs represent actual agent task events and communications.
