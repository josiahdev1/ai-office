# EasyUp Software Solution HQ — Supabase Setup & Migration Guide

This directory contains the database schema and seed data for **EasyUp Software Solution HQ** autonomous multi-agent AI office.

## 1. Quick Migration via Supabase Web Dashboard (Recommended)

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

## 2. Migration via Supabase CLI (Optional)

If you have the Supabase CLI linked locally:

```bash
# Link local project to remote Supabase instance
npx supabase link --project-ref spacfnutrnhzxxbkjrji

# Push schema migration
npx supabase db push

# Run seed data
npx supabase db execute --file supabase/seed.sql
```

---

## 3. Environment Variables Verification

Ensure your `.env.local` contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://spacfnutrnhzxxbkjrji.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_dkDalV5egnrWSKymMPEjvg_E81nLzdi
```

Test your database connection anytime by visiting `http://localhost:3000/supabase-test`.
