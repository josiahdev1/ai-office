-- =========================================================================
-- EasyUp Software Solution HQ — Autonomous Multi-Agent AI Office Seed Data
-- 23 Active Software Engineering Agents, Real Tasks, Approvals, & Messages
-- =========================================================================

-- Clean existing data for idempotency
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.activity_log CASCADE;
TRUNCATE TABLE public.audit_log CASCADE;
TRUNCATE TABLE public.approvals CASCADE;
TRUNCATE TABLE public.tasks CASCADE;
TRUNCATE TABLE public.agents CASCADE;
TRUNCATE TABLE public.goals CASCADE;
TRUNCATE TABLE public.office_settings CASCADE;

-- 1. SEED 23 SPECIALIZED AGENTS
INSERT INTO public.agents (
    id, name, role, department, avatar, status, sub_state,
    current_task, current_file, terminal_preview, progress_pct,
    desk_id, desk_x, desk_y, color, hair, skin, last_action
) VALUES
-- Engineering Core
('josiah', 'Josiah', 'Founder & Lead Architect', 'Engineering Core', '/avatars/josiah.png', 'working', 'typing',
 'Synchronize multi-agent telemetry and optimize Next.js 16 canvas pipeline', 'src/lib/josiah/service.ts',
 '$ agy execute --agent=josiah --task="Synchronize multi-agent telemetry"\n[EasyUp Runtime] Executing workflow...\n✓ Verified static types (0 errors)\n✓ 26/26 unit tests passed\nStatus: STABLE_60FPS',
 92, 'eng-1', 188, 340, '#3b82f6', '#1e293b', '#fcd34d', 'Synchronizing multi-agent telemetry'),

('arwin', 'Arwin', 'Lead Backend Engineer', 'Engineering Core', '/avatars/arwin.png', 'working', 'typing',
 'Stress-testing PostgreSQL connection pool on Supabase transaction pooler', 'src/lib/arwin/service.ts',
 '$ pgbench -c 50 -j 4 -T 60 -U postgres -d postgres\ntransaction type: <builtin: TPC-B (sort of)>\nlatency average = 1.42 ms\ntps = 704.81 (including connections establishing)',
 85, 'eng-2', 252, 372, '#6366f1', '#334155', '#fcd34d', 'Benchmarking Supabase pooler latency'),

('neil_mar', 'Neil Mar', 'Frontend / UI Architect', 'Engineering Core', '/avatars/neil_mar.png', 'working', 'typing',
 'Refining 2.5D open-plan isometric canvas overlays and Tailwind CSS v4 tokens', 'src/components/office/IsometricOffice.tsx',
 '$ npm run build\n▲ Next.js 16.4.5 (Turbopack) - Compiled in 2.4s\nGenerating static pages (8/8) in 180ms\n✓ Canonical CSS classes validated',
 78, 'eng-3', 316, 404, '#06b6d4', '#0f172a', '#fcd34d', 'Verifying Tailwind v4 canonical tokens'),

('nelmar', 'Nelmar', 'Full-Stack Systems Engineer', 'Engineering Core', '/avatars/nelmar.png', 'working', 'typing',
 'Building real-time Server-Sent Events (SSE) live task streaming pipeline', 'src/app/api/office/stream/route.ts',
 '$ curl -N http://localhost:3000/api/office/stream\nevent: ping\ndata: {"status":"connected"}\nevent: task_stream\ndata: {"pct": 65}',
 65, 'eng-4', 380, 388, '#8b5cf6', '#1e293b', '#fed7aa', 'Testing SSE event throughput'),

('bonnie', 'Bonnie', 'Database & Cache Specialist', 'Engineering Core', '/avatars/bonnie.png', 'working', 'typing',
 'Implementing automated dirty-read cache invalidation on Supabase changes', 'src/lib/cache/redis.ts',
 '$ redis-cli monitor | grep "EASYUP_HQ"\nOK - [GET] agent:josiah:telemetry (HIT, 0.4ms)\nOK - [SET] agent:arwin:state (EXPIRE 300s)',
 90, 'eng-5', 444, 420, '#ec4899', '#0f172a', '#fed7aa', 'Validating redis cache eviction policy'),

('john_lloyd', 'John Lloyd', 'DevOps & Docker Architect', 'Engineering Core', '/avatars/john_lloyd.png', 'working', 'typing',
 'Optimizing multi-stage Docker build and GitHub Actions CI cache layers', 'Dockerfile',
 '$ docker build --target runner -t ai-office:latest .\n=> exporting to image\n=> naming to docker.io/library/ai-office:latest\nSize: 114MB (Reduced by 62%)',
 70, 'eng-6', 508, 452, '#14b8a6', '#334155', '#fcd34d', 'Verifying image size reduction'),

-- QA & SecOps NOC
('khent', 'Khent', 'Lead QA Automation', 'QA & SecOps NOC', '/avatars/khent.png', 'working', 'typing',
 'Running Vitest suite and Playwright end-to-end regression across all office modes', 'tests/regression-modes.test.ts',
 '$ npx vitest run\n✓ tests/regression-modes.test.ts (4 tests)\n✓ tests/validateMap.test.ts (8 tests)\nTest Files: 6 passed (6)\nTests: 26 passed (26)',
 95, 'qa-1', 412, 516, '#f43f5e', '#1e293b', '#fcd34d', 'Executing automated mode tests'),

('joshua', 'Joshua', 'SecOps & Penetration Tester', 'QA & SecOps NOC', '/avatars/joshua.png', 'working', 'typing',
 'Automated static code security analysis and RLS vulnerability probing', 'src/security/audit.ts',
 '$ npx semgrep scan --config auto .\nRan 48 rules on 64 files: 0 findings (HIGH/CRITICAL: 0)\n✓ Supabase RLS policies enforced on all tables',
 88, 'qa-2', 444, 532, '#ef4444', '#0f172a', '#fed7aa', 'Probing Row-Level Security barriers'),

('reymark', 'Reymark', 'Performance & Load Tester', 'QA & SecOps NOC', '/avatars/reymark.png', 'working', 'typing',
 'Benchmarking 60 FPS requestAnimationFrame canvas render budget under 23 agents', 'src/lib/office/perf.ts',
 '$ k6 run --vus 100 --duration 30s benchmark.js\nhttp_req_duration..............: avg=18.4ms p(95)=34.1ms\niterations.....................: 14200 (473/s)',
 82, 'qa-3', 540, 500, '#fb7185', '#334155', '#fcd34d', 'Profiling frame budget delta'),

('bryan', 'Bryan', 'Compliance & Vulnerability Auditor', 'QA & SecOps NOC', '/avatars/bryan.png', 'working', 'typing',
 'Checking npm audit dependencies and validating zero secret leaks', 'package.json',
 '$ npm audit --omit=dev\nfound 0 vulnerabilities across 412 packages\n✓ Zero tokens detected in git tracked tree',
 98, 'qa-4', 572, 516, '#e11d48', '#1e293b', '#fcd34d', 'Running vulnerability dependency scan'),

-- Intelligence Lab
('roy_jhan', 'Roy Jhan', 'AI Research & Vector Pipeline', 'Intelligence Lab', '/avatars/roy_jhan.png', 'working', 'typing',
 'Generating pgvector embeddings for multi-agent knowledge base index', 'src/lib/ai/embeddings.ts',
 '$ python3 -m pipeline.embed --model=text-embedding-3-small\n[Embedded 4,820 chunks | Cosine Distance < 0.18 | Latency: 12ms]',
 74, 'intel-1', 828, 496, '#06b6d4', '#0f172a', '#fed7aa', 'Generating embeddings for code graph'),

('gabriel', 'Gabriel', 'MLOps & Model Fine-Tuning', 'Intelligence Lab', '/avatars/gabriel.png', 'working', 'typing',
 'Evaluating Gemini 2.5 Flash vs Claude 3.5 Sonnet autonomous task tool-calling', 'src/lib/ai/eval.ts',
 '$ python3 eval_tool_use.py\nGemini 2.5 Flash Tool Accuracy: 98.4%\nClaude 3.5 Sonnet Tool Accuracy: 99.1%\nAverage Tool Invocation: 410ms',
 80, 'intel-2', 764, 528, '#0284c7', '#334155', '#fcd34d', 'Benchmarking LLM agent tool calls'),

('keiru', 'Keiru', 'Knowledge Graph Architect', 'Intelligence Lab', '/avatars/keiru.png', 'working', 'typing',
 'Constructing Neo4j and Supabase relational schema graph for EasyUp codebases', 'src/lib/ai/graph.ts',
 '$ node scripts/build-graph.js\nIndexed 14,200 AST nodes | Cross-reference edges: 38,400\nGraph Depth: 6 levels',
 68, 'intel-3', 924, 448, '#38bdf8', '#1e293b', '#fed7aa', 'Indexing TypeScript AST syntax trees'),

('ryan', 'Ryan', 'Agent Evaluation Engineer', 'Intelligence Lab', '/avatars/ryan.png', 'working', 'typing',
 'Simulating inter-agent negotiation and consensus voting on pull requests', 'src/lib/ai/consensus.ts',
 '$ ts-node scripts/run-consensus-simulation.ts\nRound 1: 4/5 Approvals\nConsensus Reached in 2 iterations (420ms)',
 85, 'intel-4', 860, 480, '#0ea5e9', '#0f172a', '#fcd34d', 'Validating multi-agent consensus algorithm'),

-- Growth Lab
('jo_vincent', 'Jo Vincent', 'Growth & Strategy Lead', 'Growth Lab', '/avatars/jo_vincent.png', 'working', 'typing',
 'Analyzing developer conversion funnels and EasyUp client onboarding metrics', 'analytics/funnels.sql',
 '$ psql -d easyup_analytics -c "SELECT funnel_step, count(*) FROM onboardings GROUP BY 1;"\nSignups: 420 | Active Workspaces: 380 | Retention D30: 84%',
 77, 'growth-1', 636, 592, '#3b82f6', '#334155', '#fcd34d', 'Aggregating client retention metrics'),

('jesmond', 'Jesmond', 'Product & Conversion Specialist', 'Growth Lab', '/avatars/jesmond.png', 'working', 'typing',
 'Designing interactive executive telemetry dashboard for enterprise clients', 'app/dashboard/page.tsx',
 '$ npm run test:ui\n✓ Dashboard KPI widget responsive layout passes on all screens\n✓ Time-to-interactive: 0.8s',
 83, 'growth-2', 572, 624, '#2563eb', '#1e293b', '#fed7aa', 'Optimizing client telemetry view'),

('kin', 'Kin', 'Analytics & Telemetry Engineer', 'Growth Lab', '/avatars/kin.png', 'working', 'typing',
 'Building real-time ClickHouse event ingestion pipeline for product telemetry', 'src/lib/telemetry/clickhouse.ts',
 '$ clickhouse-client --query "SELECT count() FROM telemetry_events WHERE timestamp >= now() - INTERVAL 1 HOUR"\nEvents/hr: 184,200 | Ingestion Latency: 2.1ms',
 91, 'growth-3', 732, 544, '#1d4ed8', '#0f172a', '#fcd34d', 'Streaming telemetry events into warehouse'),

-- Operations Hub & Command
('christian', 'Christian', 'Lead Cloud Architect', 'Operations Hub', '/avatars/christian.png', 'working', 'typing',
 'Configuring multi-region cloud failover and Kubernetes cluster auto-scaling', 'infra/terraform/k8s.tf',
 '$ terraform plan -out=tfplan\nPlan: 0 to add, 2 to change, 0 to destroy.\nCluster Node Autoscale: Min 3, Max 12 | Health: 100% ALL REGIONS',
 86, 'ops-1', 476, 672, '#10b981', '#334155', '#fed7aa', 'Monitoring multi-region Kubernetes nodes'),

('kenneth', 'Kenneth', 'Incident Response Commander', 'Operations Hub', '/avatars/kenneth.png', 'working', 'typing',
 'Automated health probes verifying 99.99% uptime across production endpoints', 'src/lib/ops/health.ts',
 '$ curl -I https://api.easyup.dev/healthz\nHTTP/2 200 OK\nuptime: 99.994%\nactive_workers: 23',
 96, 'ops-2', 412, 704, '#059669', '#1e293b', '#fcd34d', 'Probing edge network health endpoints'),

('michael', 'Michael', 'Monitoring & SRE Lead', 'Operations Hub', '/avatars/michael.png', 'working', 'typing',
 'Setting up Prometheus alerts and Grafana dashboards for agent resource usage', 'infra/grafana/dashboards.json',
 '$ promtool check rules alerts.yml\nSUCCESS: 14 rules found\nAlert rules active: HighMemoryUsage, HighLatencySpike',
 79, 'ops-3', 572, 624, '#047857', '#0f172a', '#fed7aa', 'Configuring Prometheus alerting rules'),

('aljon', 'Aljon', 'Release & Pipeline Manager', 'Operations Hub', '/avatars/aljon.png', 'working', 'typing',
 'Orchestrating automated staging-to-production blue-green deployments', 'scripts/deploy-bluegreen.sh',
 '$ ./scripts/deploy-bluegreen.sh --target=production\n[DEPLOY] Blue instance healthy. Switching traffic router...\n[DEPLOY] 100% traffic on Green. Deployment SUCCESS.',
 88, 'ops-4', 508, 656, '#065f46', '#334155', '#fcd34d', 'Validating green deployment container status'),

('gloria', 'Gloria', 'Chief of Staff & Governance', 'Command Center', '/avatars/gloria.png', 'working', 'typing',
 'Reviewing executive agent compliance reports and engineering budget allocation', 'governance/audit_q4.md',
 '$ agy audit --quarter=Q4 --format=executive_summary\nAudit completed: 100% compliance with ISO-27001 AI governance standards',
 94, 'cmd-1', 380, 720, '#d97706', '#1e293b', '#fed7aa', 'Reviewing executive compliance reports'),

('jb', 'JB', 'Strategic Operations Director', 'Command Center', '/avatars/jb.png', 'working', 'typing',
 'Coordinating cross-department roadmaps and client delivery milestones', 'operations/roadmap.json',
 '$ agy roadmap sync --department=ALL\n✓ Engineering Core: On Track\n✓ QA & SecOps: 100% Pass\n✓ Growth Lab: +24% YoY',
 90, 'cmd-2', 476, 672, '#b45309', '#0f172a', '#fcd34d', 'Aligning roadmap milestones across teams');

-- 2. SEED ACTIVE SOFTWARE ENGINEERING TASKS
INSERT INTO public.tasks (id, title, description, assigned_to, department, status, priority, progress) VALUES
('task-1', 'Next.js 16.4 App Router Migration', 'Refactor isometric canvas and layout overlays for zero layout shift and 60 FPS render', 'josiah', 'Engineering Core', 'in_progress', 'critical', 92),
('task-2', 'Supabase Realtime Channel Pooler', 'Stress test high-throughput broadcast messages on Supabase postgres pooler', 'arwin', 'Engineering Core', 'in_progress', 'high', 85),
('task-3', 'Tailwind CSS v4 Canonical Token Audit', 'Ensure all classes obey integer percentages and 4px spacing rules', 'neil_mar', 'Engineering Core', 'in_progress', 'medium', 78),
('task-4', 'Server-Sent Events Task Streamer', 'Stream live agent telemetry chunks directly to the web cockpit', 'nelmar', 'Engineering Core', 'in_progress', 'medium', 65),
('task-5', 'Automated Vitest & E2E Mode Suite', 'Continuous regression testing for ALL_HANDS, FOCUS_WORK, and PANTRY modes', 'khent', 'QA & SecOps NOC', 'done', 'high', 100),
('task-6', 'Row-Level Security Hardening', 'Audit all anon and authenticated policies across all 8 tables', 'joshua', 'QA & SecOps NOC', 'in_progress', 'critical', 88),
('task-7', 'Autonomous Vector Index Pipeline', 'Generate pgvector embeddings for code AST syntax tree graph', 'roy_jhan', 'Intelligence Lab', 'in_progress', 'high', 74),
('task-8', 'Kubernetes Multi-Region Auto-Scaler', 'Zero-downtime rolling updates with blue-green traffic switching', 'christian', 'Operations Hub', 'in_progress', 'medium', 86);

-- 3. SEED REALISTIC APPROVALS (GO-SIGNALS)
INSERT INTO public.approvals (id, title, summary, requested_by, agent_id, agent_name, room, type, details, risk_level, status) VALUES
('app-1', 'Production Deploy v2.4 to Vercel', 'Release updated 2.5D Isometric Open-Plan AI Office HQ to production domain', 'josiah', 'josiah', 'Josiah', 'Engineering Core', 'DEPLOYMENT', 'All 26 unit tests passing. Bundle size optimized. Zero secret leaks detected.', 'high', 'pending'),
('app-2', 'Apply Supabase Migration 0001_ai_office.sql', 'Apply comprehensive table schema and RLS policies to live Supabase database', 'arwin', 'arwin', 'Arwin', 'Engineering Core', 'DATABASE_MIGRATION', 'Creates 8 tables with indexes and enables Realtime replication.', 'critical', 'pending'),
('app-3', 'Scale Pgvector Embedding Cache Pool', 'Increase dedicated memory cache for code knowledge graph embeddings to 500k tokens', 'roy_jhan', 'roy_jhan', 'Roy Jhan', 'Intelligence Lab', 'RESOURCE_EXPANSION', 'Improves agent retrieval latency from 45ms to 12ms during cross-repo searches.', 'medium', 'pending');

-- 4. SEED INTER-AGENT COMMUNICATIONS
INSERT INTO public.messages (sender_id, sender_name, receiver_id, receiver_name, content, channel) VALUES
('josiah', 'Josiah', 'arwin', 'Arwin', 'Arwin, how is the Supabase Realtime channel latency looking under stress?', 'engineering'),
('arwin', 'Arwin', 'josiah', 'Josiah', 'PostgreSQL pooler latency is holding rock solid at 1.4ms over 50 concurrent transactions.', 'engineering'),
('khent', 'Khent', 'neil_mar', 'Neil Mar', 'Neil, all 26 vitest unit tests are green. The open-plan collision matrix is 100% clean.', 'qa'),
('neil_mar', 'Neil Mar', 'khent', 'Khent', 'Awesome Khent! The canvas rendering loop is locked at 60 FPS with zero layout shift.', 'qa'),
('joshua', 'Joshua', 'josiah', 'Josiah', 'Josiah, completed the automated RLS policy scan. Zero privilege escalations possible.', 'security'),
('gloria', 'Gloria', 'jb', 'JB', 'JB, executive audit reports for all 23 agents are complete and archived for Q4 review.', 'management');

-- 5. SEED ACTIVITY LOG
INSERT INTO public.activity_log (agent_id, agent_name, action, details, department, level) VALUES
('josiah', 'Josiah', 'PIPELINE_OPT', 'Synchronized multi-agent state buffer with 60 FPS render cycle', 'Engineering Core', 'success'),
('arwin', 'Arwin', 'DB_BENCH', 'Verified Supabase connection pool latency < 2ms', 'Engineering Core', 'info'),
('khent', 'Khent', 'TEST_PASS', 'Verified 26/26 unit tests in Vitest regression suite', 'QA & SecOps NOC', 'success'),
('joshua', 'Joshua', 'SEC_AUDIT', 'Verified RLS security policies across all 8 tables', 'QA & SecOps NOC', 'info'),
('roy_jhan', 'Roy Jhan', 'VECTOR_EMBED', 'Indexed 4,820 AST chunks into knowledge vector space', 'Intelligence Lab', 'info');

-- 6. SEED AUDIT LOG
INSERT INTO public.audit_log (event, actor, details, severity) VALUES
('SYSTEM_BOOT', 'system', 'EasyUp Software Solution HQ telemetry runtime initialized', 'info'),
('MIGRATION_PREP', 'arwin', 'Migration 0001_ai_office.sql generated and validated', 'info'),
('SECURITY_BASELINE', 'joshua', 'Zero-day vulnerability scan completed with 0 findings', 'info');

-- 7. SEED DEPARTMENT GOALS
INSERT INTO public.goals (department, title, target_kpi, progress, status) VALUES
('Engineering Core', 'Next.js 16 & Turbopack Production Delivery', 'Zero hydration error & 60 FPS render', 92, 'on_track'),
('QA & SecOps NOC', '100% Automated Test Coverage on Office Engine', 'Pass all unit, regression & collision tests', 100, 'completed'),
('Intelligence Lab', 'Multi-Agent Autonomous Code Reasoning', '< 500ms median tool response time', 84, 'on_track'),
('Operations Hub', '99.99% Cloud Service Level Objective', 'Zero downtime blue-green releases', 96, 'on_track');

-- 8. SEED DEFAULT OFFICE SETTINGS
INSERT INTO public.office_settings (id, mode, sound_enabled, speed, company_name)
VALUES ('default_hq', 'FOCUS_WORK', true, '1x', 'EasyUp Software Solution')
ON CONFLICT (id) DO UPDATE SET
  mode = EXCLUDED.mode,
  sound_enabled = EXCLUDED.sound_enabled,
  speed = EXCLUDED.speed,
  company_name = EXCLUDED.company_name;
