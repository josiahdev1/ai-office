# EasyUp Software Solution HQ — Supabase Setup & Migration Guide

This directory contains the database schema, seed data, and Next.js SSR integration guide for **EasyUp Software Solution HQ** autonomous multi-agent AI office.

> **AGENT / ANTIGRAVITY DIRECTIVE:** Follow the installed skills in `.agent/skills/supabase` (and `.agent/skills/supabase-postgres-best-practices`, `.agent/skills/supabase-realtime-data`) and execute automated database workflows following the `Autonomous Supabase Database & MCP Migration Rules` in `AGENTS.md`.

---

## 1. Supabase Execution & Security Architecture

1. **Client Anon Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)**:
   - Used by the Next.js frontend and API routes for table operations (SELECT, INSERT, UPDATE) governed by Row Level Security (RLS).
   - PostgREST restricts anon key users from running raw DDL (`CREATE TABLE`, `DROP`, `ALTER`) by PostgreSQL security design.
2. **Automated DDL & Migrations**:
   - Follow `.agent/skills/supabase` for schema migrations, declarative schemas, and MCP execution.
3. **Consolidated Migration Script**:
   - `supabase/migrations/0016_consolidated_missing_tables.sql` is 100% safe, additive, and non-destructive (no DROP, no CASCADE) for running in the Supabase SQL editor without warnings or errors.

1. **Apply Schema Migration**
   - Read `supabase/migrations/0001_ai_office.sql` (and any subsequent migration files in chronological order).
   - Call the Supabase MCP **`apply_migration`** tool on project `spacfnutrnhzxxbkjrji` with the migration name and SQL contents.
   - This creates all 8 tables (`agents`, `tasks`, `approvals`, `activity_log`, `audit_log`, `messages`, `goals`, `office_settings`), configures indexes, sets up Row Level Security (RLS) policies, and enables Supabase Realtime replication.

2. **Execute Seed Data**
   - Read `supabase/seed.sql`.
   - Call the Supabase MCP **`execute_sql`** tool on project `spacfnutrnhzxxbkjrji` to run the seed script.
   - This seeds all 23 specialized engineering agents, live tasks, approvals, messages, and office settings.

3. **Automated Verification**
   - Run `SELECT count(*) AS agent_count FROM public.agents;` via **`execute_sql`** and confirm `23` agents exist across all 8 tables.

---

## 2. Next.js SSR Client & Agent Skills Setup

Ensure the Next.js application has the required Supabase SSR packages, client utilities, and AI agent skills configured (`.agent/skills/supabase` is installed in this repo):

### A. Install Dependencies & Agent Skills

```bash
# Install Supabase SSR packages
npm install @supabase/supabase-js @supabase/ssr

# Install official Supabase Agent Skills (if setting up on a fresh clone)
npx skills add supabase/agent-skills
```

### B. Required Client & Middleware Files

**`utils/supabase/server.ts`**
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    },
  );
};
```

**`utils/supabase/client.ts`**
```ts
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
```

**`utils/supabase/middleware.ts`**
```ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  return supabaseResponse;
};
```

**Example Server Component Usage (`app/supabase-test/page.tsx` or `page.tsx`)**
```tsx
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: agents } = await supabase.from('agents').select();

  return (
    <ul>
      {agents?.map((agent) => (
        <li key={agent.id}>{agent.name}</li>
      ))}
    </ul>
  );
}
```

---

## 3. Environment Variables Verification

Ensure your `.env.local` contains:

```env
NEXT_PUBLIC_SUPABASE_URL=[https://spacfnutrnhzxxbkjrji.supabase.co](https://spacfnutrnhzxxbkjrji.supabase.co)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_dkDalV5egnrWSKymMPEjvg_E81nLzdi
```

Test your database connection anytime by visiting `http://localhost:3000/supabase-test`.

---

## 4. Quick Migration via Supabase Web Dashboard (Manual Fallback)

1. Open your project dashboard at [https://supabase.com/dashboard/project/spacfnutrnhzxxbkjrji](https://supabase.com/dashboard/project/spacfnutrnhzxxbkjrji).
2. In the left navigation menu, click **SQL Editor**.
3. Click **+ New Query**.
4. Open `supabase/migrations/0001_ai_office.sql`, copy its entire contents, and paste into the SQL Editor.
5. Click **Run** (or `Ctrl+Enter`).
   - This creates all 8 tables (`agents`, `tasks`, `approvals`, `activity_log`, `audit_log`, `messages`, `goals`, `office_settings`), configures indexes, sets up Row Level Security (RLS) policies, and enables Supabase Realtime replication.
6. Next, open `supabase/seed.sql`, copy its entire contents, and paste into a new query window.
7. Click **Run**.
   - This seeds all 23 specialized engineering agents, live tasks, approvals, messages, and office settings.

---

## 5. Migration via Supabase CLI (Optional)

If you have the Supabase CLI linked locally:

```bash
# Link local project to remote Supabase instance
npx supabase link --project-ref spacfnutrnhzxxbkjrji

# Push schema migration
npx supabase db push

# Run seed data
npx supabase db execute --file supabase/seed.sql
```