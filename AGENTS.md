<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Tailwind CSS Developer Guide for Agents

This project uses **Tailwind CSS v4** alongside the **Tailwind CSS IntelliSense** engine. To prevent `suggestCanonicalClasses` warnings from appearing in the user's IDE, agents must always write **canonical utility classes** instead of arbitrary bracket syntax (`[...]`).

### 1. Opacity Rule: Use Percentage Values (`/N`) Instead of Bracket Decimals (`/[.N]`)

Never write decimal opacities inside brackets like `bg-black/[.08]` or `border-white/[.12]`. Always convert the decimal to an integer percentage (`decimal × 100`).

- **Pattern**: `<property>-<color>/<percentage>`
- **Conversion formula**: `0.06` → `/6`, `0.12` → `/12`, `0.5` → `/50`
- **Examples**:
  - `/[.02]` → `/2` (e.g., `bg-black/2`)
  - `/[.04]` → `/4` (e.g., `hover:bg-black/4`)
  - `/[.06]` → `/6` (e.g., `bg-black/6`)
  - `/[.08]` → `/8` (e.g., `border-black/8`, `dark:bg-white/8`)
  - `/[.12]` → `/12` (e.g., `dark:border-white/12`)
  - `/[.145]` or `/[.15]` → `/15` (e.g., `dark:border-white/15`)
  - `/[.50]` → `/50` (e.g., `text-black/50`)

### 2. Spacing & Sizing Rule: Use Multiples of 4px (`pixels ÷ 4`)

Tailwind's scale is based on `1 unit = 4px` (0.25rem). Avoid arbitrary pixel brackets (`w-[100px]`, `h-[14px]`) whenever a standard integer or half-step value exists.

- **Conversion formula**: `pixels ÷ 4 = utility value`
- **Examples**:
  - `w-[100px]` → `100 ÷ 4 = 25` → `w-25`
  - `h-[14px]` → `14 ÷ 4 = 3.5` → `h-3.5`
  - `p-[6px]` → `6 ÷ 4 = 1.5` → `p-1.5`
  - `gap-[18px]` → `18 ÷ 4 = 4.5` → `gap-4.5`
  - `w-[160px]` → `160 ÷ 4 = 40` → `w-40`

### 3. General Principles for Canonical Classes

- **Avoid unnecessary brackets**: Never write `border-[1px]`, `text-[14px]`, or `rounded-[12px]` when standard classes like `border`, `text-sm`, or `rounded-xl` exist.
- **Button & Flex layout safety**: Always include `whitespace-nowrap` on buttons, pills, or badges that contain text next to icons to prevent awkward multiline line breaks.
- **Semantic theme tokens**: Prefer project CSS variables and theme tokens (e.g., `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`) over arbitrary hardcoded hex codes.

## Autonomous Team Git & GitHub Contribution Rules

This project operates on an autonomous AI team workflow where Josiah is the lead architect accompanied by an autonomous engineering fleet. To continuously track progress, farm GitHub contributions (PRs & merges), and maintain zero-drift release integrity:

### 1. Active Working Branch: `office-v3`
- All active development, features, and fixes must be developed and committed on the `office-v3` branch.
- Never commit broken code or secrets (`.env.local`, API keys) to any branch.
- Before every commit, verify all quality gates pass: `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`.

### 2. Autonomous Pull Request Creation & Conflict Prevention
- After committing and pushing to `office-v3`, compare `office-v3` with the base `main` branch.
- **Zero-Conflict Guarantee**: If `main` has advanced with new commits (e.g. from upstream merges or Dependabot), fetch `main` and test the merge into `office-v3` first:
  ```bash
  git fetch origin main
  git merge --no-commit --no-ff origin/main
  ```
- If any merge conflict is detected, **resolve all conflicts immediately** on `office-v3`, verify tests and build pass cleanly, and commit the resolved merge before proceeding. Never push or merge with unresolved conflict markers.

### 3. Automated Pull Request & Merge Workflow
- Never require manual Pull Request creation or manual merging on the GitHub UI.
- Open an automated Pull Request from `office-v3` targeting `main`:
  - Handled automatically in the cloud on every push via `.github/workflows/auto-pr-merge.yml`.
  - Or executed locally via `npm run sync:pr` (`scripts/sync-pr-merge.sh`).
- Once checks pass, the Pull Request is automatically merged into `main` without manual intervention.
- Synchronize `origin/main` so that `main` and `office-v3` remain perfectly in sync, recording both Pull Request creation and Pull Request Merge activity on Josiah's GitHub profile (`josiahdev1`).

## Autonomous Supabase Database & MCP Migration Rules

This project uses Supabase (project ref: `spacfnutrnhzxxbkjrji`) with installed skills in `.agent/skills/supabase`, `.agent/skills/supabase-postgres-best-practices`, and `.agent/skills/supabase-realtime-data`.

### 1. Mandatory Read & Zero Manual Ops
- Before making any database schema, RLS, Realtime, or seed changes, always read `supabase/README.md` and `.agent/skills/supabase/SKILL.md` first.
- **Zero Manual Dashboard Ops**: Never instruct Josiah to open the Supabase Web Dashboard, click SQL Editor, or manually copy-paste SQL.

### 2. Autonomous MCP Execution
- Whenever `supabase/migrations/*.sql` or `supabase/seed.sql` is created or modified, immediately apply it to project `spacfnutrnhzxxbkjrji` using the Supabase MCP tools (`apply_migration` for schema migrations and `execute_sql` for `supabase/seed.sql`).
- After applying any migration or seed update, verify row counts and table integrity via `execute_sql` (e.g., confirming all 8 tables and 23 agents exist in `public.agents`) before marking the task complete.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
