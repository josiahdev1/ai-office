import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

if (!url || !key) {
  console.error('Missing Supabase URL or ANON KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

const AGENTS = [
  // Engineering Core
  {
    id: 'josiah', name: 'Josiah', role: 'Founder & Lead Architect', department: 'Engineering Core', avatar: '/avatars/josiah.png', status: 'working', sub_state: 'typing',
    current_task: 'Synchronize multi-agent telemetry and optimize Next.js 16 canvas pipeline', current_file: 'src/lib/josiah/service.ts',
    terminal_preview: '$ agy execute --agent=josiah --task="Synchronize multi-agent telemetry"\n[EasyUp Runtime] Executing workflow...\n✓ Verified static types (0 errors)\n✓ 26/26 unit tests passed\nStatus: STABLE_60FPS',
    progress_pct: 92, desk_id: 'eng-1', desk_x: 188, desk_y: 340, color: '#3b82f6', hair: '#1e293b', skin: '#fcd34d', last_action: 'Synchronizing multi-agent telemetry'
  },
  {
    id: 'arwin', name: 'Arwin', role: 'Lead Backend Engineer', department: 'Engineering Core', avatar: '/avatars/arwin.png', status: 'working', sub_state: 'typing',
    current_task: 'Stress-testing PostgreSQL connection pool on Supabase transaction pooler', current_file: 'src/lib/arwin/service.ts',
    terminal_preview: '$ pgbench -c 50 -j 4 -T 60 -U postgres -d postgres\ntransaction type: <builtin: TPC-B (sort of)>\nlatency average = 1.42 ms\ntps = 704.81 (including connections establishing)',
    progress_pct: 85, desk_id: 'eng-2', desk_x: 252, desk_y: 372, color: '#6366f1', hair: '#334155', skin: '#fcd34d', last_action: 'Benchmarking Supabase pooler latency'
  },
  {
    id: 'neil_mar', name: 'Neil Mar', role: 'Frontend / UI Architect', department: 'Engineering Core', avatar: '/avatars/neil_mar.png', status: 'working', sub_state: 'typing',
    current_task: 'Refining 2.5D open-plan isometric canvas overlays and Tailwind CSS v4 tokens', current_file: 'src/components/office/IsometricOffice.tsx',
    terminal_preview: '$ npm run build\n▲ Next.js 16.4.5 (Turbopack) - Compiled in 2.4s\nGenerating static pages (8/8) in 180ms\n✓ Canonical CSS classes validated',
    progress_pct: 78, desk_id: 'eng-3', desk_x: 316, desk_y: 404, color: '#06b6d4', hair: '#0f172a', skin: '#fcd34d', last_action: 'Verifying Tailwind v4 canonical tokens'
  },
  {
    id: 'nelmar', name: 'Nelmar', role: 'Full-Stack Systems Engineer', department: 'Engineering Core', avatar: '/avatars/nelmar.png', status: 'working', sub_state: 'typing',
    current_task: 'Building real-time Server-Sent Events (SSE) live task streaming pipeline', current_file: 'src/app/api/office/stream/route.ts',
    terminal_preview: '$ curl -N http://localhost:3000/api/office/stream\nevent: ping\ndata: {"status":"connected"}\nevent: task_stream\ndata: {"pct": 65}',
    progress_pct: 65, desk_id: 'eng-4', desk_x: 380, desk_y: 388, color: '#8b5cf6', hair: '#1e293b', skin: '#fed7aa', last_action: 'Testing SSE event throughput'
  },
  {
    id: 'bonnie', name: 'Bonnie', role: 'Database & Cache Specialist', department: 'Engineering Core', avatar: '/avatars/bonnie.png', status: 'working', sub_state: 'typing',
    current_task: 'Implementing automated dirty-read cache invalidation on Supabase changes', current_file: 'src/lib/cache/redis.ts',
    terminal_preview: '$ redis-cli monitor | grep "EASYUP_HQ"\nOK - [GET] agent:josiah:telemetry (HIT, 0.4ms)\nOK - [SET] agent:arwin:state (EXPIRE 300s)',
    progress_pct: 90, desk_id: 'eng-5', desk_x: 444, desk_y: 420, color: '#ec4899', hair: '#0f172a', skin: '#fed7aa', last_action: 'Validating redis cache eviction policy'
  },
  {
    id: 'john_lloyd', name: 'John Lloyd', role: 'DevOps & Docker Architect', department: 'Engineering Core', avatar: '/avatars/john_lloyd.png', status: 'working', sub_state: 'typing',
    current_task: 'Optimizing multi-stage Docker build and GitHub Actions CI cache layers', current_file: 'Dockerfile',
    terminal_preview: '$ docker build --target runner -t ai-office:latest .\n=> exporting to image\n=> naming to docker.io/library/ai-office:latest\nSize: 114MB (Reduced by 62%)',
    progress_pct: 70, desk_id: 'eng-6', desk_x: 508, desk_y: 452, color: '#14b8a6', hair: '#334155', skin: '#fcd34d', last_action: 'Verifying image size reduction'
  },

  // QA & SecOps NOC
  {
    id: 'khent', name: 'Khent', role: 'Lead QA Automation', department: 'QA & SecOps NOC', avatar: '/avatars/khent.png', status: 'working', sub_state: 'typing',
    current_task: 'Running Vitest suite and Playwright end-to-end regression across all office modes', current_file: 'tests/regression-modes.test.ts',
    terminal_preview: '$ npx vitest run\n✓ tests/regression-modes.test.ts (4 tests)\n✓ tests/validateMap.test.ts (8 tests)\nTest Files: 6 passed (6)\nTests: 26 passed (26)',
    progress_pct: 95, desk_id: 'qa-1', desk_x: 412, desk_y: 516, color: '#f43f5e', hair: '#1e293b', skin: '#fcd34d', last_action: 'Executing automated mode tests'
  },
  {
    id: 'joshua', name: 'Joshua', role: 'SecOps & Penetration Tester', department: 'QA & SecOps NOC', avatar: '/avatars/joshua.png', status: 'working', sub_state: 'typing',
    current_task: 'Automated static code security analysis and RLS vulnerability probing', current_file: 'src/security/audit.ts',
    terminal_preview: '$ npx semgrep scan --config auto .\nRan 48 rules on 64 files: 0 findings (HIGH/CRITICAL: 0)\n✓ Supabase RLS policies enforced on all tables',
    progress_pct: 88, desk_id: 'qa-2', desk_x: 444, desk_y: 532, color: '#ef4444', hair: '#0f172a', skin: '#fed7aa', last_action: 'Probing Row-Level Security barriers'
  },
  {
    id: 'reymark', name: 'Reymark', role: 'Performance & Load Tester', department: 'QA & SecOps NOC', avatar: '/avatars/reymark.png', status: 'working', sub_state: 'typing',
    current_task: 'Benchmarking 60 FPS requestAnimationFrame canvas render budget under 23 agents', current_file: 'src/lib/office/perf.ts',
    terminal_preview: '$ k6 run --vus 100 --duration 30s benchmark.js\nhttp_req_duration..............: avg=18.4ms p(95)=34.1ms\niterations.....................: 14200 (473/s)',
    progress_pct: 82, desk_id: 'qa-3', desk_x: 540, desk_y: 500, color: '#fb7185', hair: '#334155', skin: '#fcd34d', last_action: 'Profiling frame budget delta'
  },
  {
    id: 'bryan', name: 'Bryan', role: 'Compliance & Vulnerability Auditor', department: 'QA & SecOps NOC', avatar: '/avatars/bryan.png', status: 'working', sub_state: 'typing',
    current_task: 'Checking npm audit dependencies and validating zero secret leaks', current_file: 'package.json',
    terminal_preview: '$ npm audit --omit=dev\nfound 0 vulnerabilities across 412 packages\n✓ Zero tokens detected in git tracked tree',
    progress_pct: 98, desk_id: 'qa-4', desk_x: 572, desk_y: 516, color: '#e11d48', hair: '#1e293b', skin: '#fcd34d', last_action: 'Running vulnerability dependency scan'
  },

  // Intelligence Lab
  {
    id: 'roy_jhan', name: 'Roy Jhan', role: 'AI Research & Vector Pipeline', department: 'Intelligence Lab', avatar: '/avatars/roy_jhan.png', status: 'working', sub_state: 'typing',
    current_task: 'Generating pgvector embeddings for multi-agent knowledge base index', current_file: 'src/lib/ai/embeddings.ts',
    terminal_preview: '$ python3 -m pipeline.embed --model=text-embedding-3-small\n[Embedded 4,820 chunks | Cosine Distance < 0.18 | Latency: 12ms]',
    progress_pct: 74, desk_id: 'intel-1', desk_x: 828, desk_y: 496, color: '#06b6d4', hair: '#0f172a', skin: '#fed7aa', last_action: 'Generating embeddings for code graph'
  },
  {
    id: 'gabriel', name: 'Gabriel', role: 'MLOps & Model Fine-Tuning', department: 'Intelligence Lab', avatar: '/avatars/gabriel.png', status: 'working', sub_state: 'typing',
    current_task: 'Evaluating Gemini 2.5 Flash vs Claude 3.5 Sonnet autonomous task tool-calling', current_file: 'src/lib/ai/eval.ts',
    terminal_preview: '$ python3 eval_tool_use.py\nGemini 2.5 Flash Tool Accuracy: 98.4%\nClaude 3.5 Sonnet Tool Accuracy: 99.1%\nAverage Tool Invocation: 410ms',
    progress_pct: 80, desk_id: 'intel-2', desk_x: 764, desk_y: 528, color: '#0284c7', hair: '#334155', skin: '#fcd34d', last_action: 'Benchmarking LLM agent tool calls'
  },
  {
    id: 'keiru', name: 'Keiru', role: 'Knowledge Graph Architect', department: 'Intelligence Lab', avatar: '/avatars/keiru.png', status: 'working', sub_state: 'typing',
    current_task: 'Constructing Neo4j and Supabase relational schema graph for EasyUp codebases', current_file: 'src/lib/ai/graph.ts',
    terminal_preview: '$ node scripts/build-graph.js\nIndexed 14,200 AST nodes | Cross-reference edges: 38,400\nGraph Depth: 6 levels',
    progress_pct: 68, desk_id: 'intel-3', desk_x: 924, desk_y: 448, color: '#38bdf8', hair: '#1e293b', skin: '#fed7aa', last_action: 'Indexing TypeScript AST syntax trees'
  },
  {
    id: 'ryan', name: 'Ryan', role: 'Agent Evaluation Engineer', department: 'Intelligence Lab', avatar: '/avatars/ryan.png', status: 'working', sub_state: 'typing',
    current_task: 'Simulating inter-agent negotiation and consensus voting on pull requests', current_file: 'src/lib/ai/consensus.ts',
    terminal_preview: '$ ts-node scripts/run-consensus-simulation.ts\nRound 1: 4/5 Approvals\nConsensus Reached in 2 iterations (420ms)',
    progress_pct: 85, desk_id: 'intel-4', desk_x: 860, desk_y: 480, color: '#0ea5e9', hair: '#0f172a', skin: '#fcd34d', last_action: 'Validating multi-agent consensus algorithm'
  },

  // Growth Lab
  {
    id: 'jo_vincent', name: 'Jo Vincent', role: 'Growth & Strategy Lead', department: 'Growth Lab', avatar: '/avatars/jo_vincent.png', status: 'working', sub_state: 'typing',
    current_task: 'Analyzing developer conversion funnels and EasyUp client onboarding metrics', current_file: 'analytics/funnels.sql',
    terminal_preview: '$ psql -d easyup_analytics -c "SELECT funnel_step, count(*) FROM onboardings GROUP BY 1;"\nSignups: 420 | Active Workspaces: 380 | Retention D30: 84%',
    progress_pct: 77, desk_id: 'growth-1', desk_x: 636, desk_y: 592, color: '#3b82f6', hair: '#334155', skin: '#fcd34d', last_action: 'Aggregating client retention metrics'
  },
  {
    id: 'jesmond', name: 'Jesmond', role: 'Product & Conversion Specialist', department: 'Growth Lab', avatar: '/avatars/jesmond.png', status: 'working', sub_state: 'typing',
    current_task: 'Designing interactive executive telemetry dashboard for enterprise clients', current_file: 'app/dashboard/page.tsx',
    terminal_preview: '$ npm run test:ui\n✓ Dashboard KPI widget responsive layout passes on all screens\n✓ Time-to-interactive: 0.8s',
    progress_pct: 83, desk_id: 'growth-2', desk_x: 572, desk_y: 624, color: '#2563eb', hair: '#1e293b', skin: '#fed7aa', last_action: 'Optimizing client telemetry view'
  },
  {
    id: 'kin', name: 'Kin', role: 'Analytics & Telemetry Engineer', department: 'Growth Lab', avatar: '/avatars/kin.png', status: 'working', sub_state: 'typing',
    current_task: 'Building real-time ClickHouse event ingestion pipeline for product telemetry', current_file: 'src/lib/telemetry/clickhouse.ts',
    terminal_preview: '$ clickhouse-client --query "SELECT count() FROM telemetry_events WHERE timestamp >= now() - INTERVAL 1 HOUR"\nEvents/hr: 184,200 | Ingestion Latency: 2.1ms',
    progress_pct: 91, desk_id: 'growth-3', desk_x: 732, desk_y: 544, color: '#1d4ed8', hair: '#0f172a', skin: '#fcd34d', last_action: 'Streaming telemetry events into warehouse'
  },

  // Operations Hub & Command
  {
    id: 'christian', name: 'Christian', role: 'Lead Cloud Architect', department: 'Operations Hub', avatar: '/avatars/christian.png', status: 'working', sub_state: 'typing',
    current_task: 'Configuring multi-region cloud failover and Kubernetes cluster auto-scaling', current_file: 'infra/terraform/k8s.tf',
    terminal_preview: '$ terraform plan -out=tfplan\nPlan: 0 to add, 2 to change, 0 to destroy.\nCluster Node Autoscale: Min 3, Max 12 | Health: 100% ALL REGIONS',
    progress_pct: 86, desk_id: 'ops-1', desk_x: 476, desk_y: 672, color: '#10b981', hair: '#334155', skin: '#fed7aa', last_action: 'Monitoring multi-region Kubernetes nodes'
  },
  {
    id: 'kenneth', name: 'Kenneth', role: 'Incident Response Commander', department: 'Operations Hub', avatar: '/avatars/kenneth.png', status: 'working', sub_state: 'typing',
    current_task: 'Automated health probes verifying 99.99% uptime across production endpoints', current_file: 'src/lib/ops/health.ts',
    terminal_preview: '$ curl -I https://api.easyup.dev/healthz\nHTTP/2 200 OK\nuptime: 99.994%\nactive_workers: 23',
    progress_pct: 96, desk_id: 'ops-2', desk_x: 412, desk_y: 704, color: '#059669', hair: '#1e293b', skin: '#fcd34d', last_action: 'Probing edge network health endpoints'
  },
  {
    id: 'michael', name: 'Michael', role: 'Monitoring & SRE Lead', department: 'Operations Hub', avatar: '/avatars/michael.png', status: 'working', sub_state: 'typing',
    current_task: 'Setting up Prometheus alerts and Grafana dashboards for agent resource usage', current_file: 'infra/grafana/dashboards.json',
    terminal_preview: '$ promtool check rules alerts.yml\nSUCCESS: 14 rules found\nAlert rules active: HighMemoryUsage, HighLatencySpike',
    progress_pct: 79, desk_id: 'ops-3', desk_x: 572, desk_y: 624, color: '#047857', hair: '#0f172a', skin: '#fed7aa', last_action: 'Configuring Prometheus alerting rules'
  },
  {
    id: 'aljon', name: 'Aljon', role: 'Release & Pipeline Manager', department: 'Operations Hub', avatar: '/avatars/aljon.png', status: 'working', sub_state: 'typing',
    current_task: 'Orchestrating automated staging-to-production blue-green deployments', current_file: 'scripts/deploy-bluegreen.sh',
    terminal_preview: '$ ./scripts/deploy-bluegreen.sh --target=production\n[DEPLOY] Blue instance healthy. Switching traffic router...\n[DEPLOY] 100% traffic on Green. Deployment SUCCESS.',
    progress_pct: 88, desk_id: 'ops-4', desk_x: 508, desk_y: 656, color: '#065f46', hair: '#334155', skin: '#fcd34d', last_action: 'Validating green deployment container status'
  },
  {
    id: 'gloria', name: 'Gloria', role: 'Chief of Staff & Governance', department: 'Command Center', avatar: '/avatars/gloria.png', status: 'working', sub_state: 'typing',
    current_task: 'Reviewing executive agent compliance reports and engineering budget allocation', current_file: 'governance/audit_q4.md',
    terminal_preview: '$ agy audit --quarter=Q4 --format=executive_summary\nAudit completed: 100% compliance with ISO-27001 AI governance standards',
    progress_pct: 94, desk_id: 'cmd-1', desk_x: 380, desk_y: 720, color: '#d97706', hair: '#1e293b', skin: '#fed7aa', last_action: 'Reviewing executive compliance reports'
  },
  {
    id: 'jb', name: 'JB', role: 'Strategic Operations Director', department: 'Command Center', avatar: '/avatars/jb.png', status: 'working', sub_state: 'typing',
    current_task: 'Coordinating cross-department roadmaps and client delivery milestones', current_file: 'operations/roadmap.json',
    terminal_preview: '$ agy roadmap sync --department=ALL\n✓ Engineering Core: On Track\n✓ QA & SecOps: 100% Pass\n✓ Growth Lab: +24% YoY',
    progress_pct: 90, desk_id: 'cmd-2', desk_x: 476, desk_y: 672, color: '#b45309', hair: '#0f172a', skin: '#fcd34d', last_action: 'Aligning roadmap milestones across teams'
  }
];

const TASKS = [
  { id: 'task-1', title: 'Next.js 16.4 App Router Migration', description: 'Refactor isometric canvas and layout overlays for zero layout shift and 60 FPS render', assigned_to: 'josiah', department: 'Engineering Core', status: 'in_progress', priority: 'critical', progress: 92 },
  { id: 'task-2', title: 'Supabase Realtime Channel Pooler', description: 'Stress test high-throughput broadcast messages on Supabase postgres pooler', assigned_to: 'arwin', department: 'Engineering Core', status: 'in_progress', priority: 'high', progress: 85 },
  { id: 'task-3', title: 'Tailwind CSS v4 Canonical Token Audit', description: 'Ensure all classes obey integer percentages and 4px spacing rules', assigned_to: 'neil_mar', department: 'Engineering Core', status: 'in_progress', priority: 'medium', progress: 78 },
  { id: 'task-4', title: 'Server-Sent Events Task Streamer', description: 'Stream live agent telemetry chunks directly to the web cockpit', assigned_to: 'nelmar', department: 'Engineering Core', status: 'in_progress', priority: 'medium', progress: 65 },
  { id: 'task-5', title: 'Automated Vitest & E2E Mode Suite', description: 'Continuous regression testing for ALL_HANDS, FOCUS_WORK, and PANTRY modes', assigned_to: 'khent', department: 'QA & SecOps NOC', status: 'done', priority: 'high', progress: 100 },
  { id: 'task-6', title: 'Row-Level Security Hardening', description: 'Audit all anon and authenticated policies across all 8 tables', assigned_to: 'joshua', department: 'QA & SecOps NOC', status: 'in_progress', priority: 'critical', progress: 88 },
  { id: 'task-7', title: 'Autonomous Vector Index Pipeline', description: 'Generate pgvector embeddings for code AST syntax tree graph', assigned_to: 'roy_jhan', department: 'Intelligence Lab', status: 'in_progress', priority: 'high', progress: 74 },
  { id: 'task-8', title: 'Kubernetes Multi-Region Auto-Scaler', description: 'Zero-downtime rolling updates with blue-green traffic switching', assigned_to: 'christian', department: 'Operations Hub', status: 'in_progress', priority: 'medium', progress: 86 }
];

const APPROVALS = [
  { id: 'app-1', title: 'Production Deploy v2.4 to Vercel', summary: 'Release updated 2.5D Isometric Open-Plan AI Office HQ to production domain', requested_by: 'josiah', agent_id: 'josiah', agent_name: 'Josiah', room: 'Engineering Core', type: 'DEPLOYMENT', details: 'All 26 unit tests passing. Bundle size optimized. Zero secret leaks detected.', risk_level: 'high', status: 'pending' },
  { id: 'app-2', title: 'Apply Supabase Migration 0001_ai_office.sql', summary: 'Apply comprehensive table schema and RLS policies to live Supabase database', requested_by: 'arwin', agent_id: 'arwin', agent_name: 'Arwin', room: 'Engineering Core', type: 'DATABASE_MIGRATION', details: 'Creates 8 tables with indexes and enables Realtime replication.', risk_level: 'critical', status: 'pending' },
  { id: 'app-3', title: 'Scale Pgvector Embedding Cache Pool', summary: 'Increase dedicated memory cache for code knowledge graph embeddings to 500k tokens', requested_by: 'roy_jhan', agent_id: 'roy_jhan', agent_name: 'Roy Jhan', room: 'Intelligence Lab', type: 'RESOURCE_EXPANSION', details: 'Improves agent retrieval latency from 45ms to 12ms during cross-repo searches.', risk_level: 'medium', status: 'pending' }
];

const MESSAGES = [
  { sender_id: 'josiah', sender_name: 'Josiah', receiver_id: 'arwin', receiver_name: 'Arwin', content: 'Arwin, how is the Supabase Realtime channel latency looking under stress?', channel: 'engineering' },
  { sender_id: 'arwin', sender_name: 'Arwin', receiver_id: 'josiah', receiver_name: 'Josiah', content: 'PostgreSQL pooler latency is holding rock solid at 1.4ms over 50 concurrent transactions.', channel: 'engineering' },
  { sender_id: 'khent', sender_name: 'Khent', receiver_id: 'neil_mar', receiver_name: 'Neil Mar', content: 'Neil, all 26 vitest unit tests are green. The open-plan collision matrix is 100% clean.', channel: 'qa' },
  { sender_id: 'neil_mar', sender_name: 'Neil Mar', receiver_id: 'khent', receiver_name: 'Khent', content: 'Awesome Khent! The canvas rendering loop is locked at 60 FPS with zero layout shift.', channel: 'qa' },
  { sender_id: 'joshua', sender_name: 'Joshua', receiver_id: 'josiah', receiver_name: 'Josiah', content: 'Josiah, completed the automated RLS policy scan. Zero privilege escalations possible.', channel: 'security' },
  { sender_id: 'gloria', sender_name: 'Gloria', receiver_id: 'jb', receiver_name: 'JB', content: 'JB, executive audit reports for all 23 agents are complete and archived for Q4 review.', channel: 'management' }
];

const ACTIVITY_LOG = [
  { agent_id: 'josiah', agent_name: 'Josiah', action: 'PIPELINE_OPT', details: 'Synchronized multi-agent state buffer with 60 FPS render cycle', department: 'Engineering Core', level: 'success' },
  { agent_id: 'arwin', agent_name: 'Arwin', action: 'DB_BENCH', details: 'Verified Supabase connection pool latency < 2ms', department: 'Engineering Core', level: 'info' },
  { agent_id: 'khent', agent_name: 'Khent', action: 'TEST_PASS', details: 'Verified 26/26 unit tests in Vitest regression suite', department: 'QA & SecOps NOC', level: 'success' },
  { agent_id: 'joshua', agent_name: 'Joshua', action: 'SEC_AUDIT', details: 'Verified RLS security policies across all 8 tables', department: 'QA & SecOps NOC', level: 'info' },
  { agent_id: 'roy_jhan', agent_name: 'Roy Jhan', action: 'VECTOR_EMBED', details: 'Indexed 4,820 AST chunks into knowledge vector space', department: 'Intelligence Lab', level: 'info' }
];

const AUDIT_LOG = [
  { event: 'SYSTEM_BOOT', actor: 'system', details: 'EasyUp Software Solution HQ telemetry runtime initialized', severity: 'info' },
  { event: 'MIGRATION_PREP', actor: 'arwin', details: 'Migration 0001_ai_office.sql generated and validated', severity: 'info' },
  { event: 'SECURITY_BASELINE', actor: 'joshua', details: 'Zero-day vulnerability scan completed with 0 findings', severity: 'info' }
];

const GOALS = [
  { department: 'Engineering Core', title: 'Next.js 16 & Turbopack Production Delivery', target_kpi: 'Zero hydration error & 60 FPS render', progress: 92, status: 'on_track' },
  { department: 'QA & SecOps NOC', title: '100% Automated Test Coverage on Office Engine', target_kpi: 'Pass all unit, regression & collision tests', progress: 100, status: 'completed' },
  { department: 'Intelligence Lab', title: 'Multi-Agent Autonomous Code Reasoning', target_kpi: '< 500ms median tool response time', progress: 84, status: 'on_track' },
  { department: 'Operations Hub', title: '99.99% Cloud Service Level Objective', target_kpi: 'Zero downtime blue-green releases', progress: 96, status: 'on_track' }
];

const SETTINGS = {
  id: 'default_hq',
  mode: 'FOCUS_WORK',
  sound_enabled: true,
  speed: '1x',
  company_name: 'EasyUp Software Solution'
};

async function runSeed() {
  console.log('--- Seeding Project spacfnutrnhzxxbkjrji ---');

  // 1. Upsert Agents
  const { error: errAgents } = await supabase.from('agents').upsert(AGENTS, { onConflict: 'id' });
  if (errAgents) console.error('Error seeding agents:', errAgents);
  else console.log('✓ Seeded 23 agents');

  // 2. Upsert Tasks
  const { error: errTasks } = await supabase.from('tasks').upsert(TASKS, { onConflict: 'id' });
  if (errTasks) console.error('Error seeding tasks:', errTasks);
  else console.log('✓ Seeded 8 tasks');

  // 3. Upsert Approvals
  const { error: errApprovals } = await supabase.from('approvals').upsert(APPROVALS, { onConflict: 'id' });
  if (errApprovals) console.error('Error seeding approvals:', errApprovals);
  else console.log('✓ Seeded 3 approvals');

  // 4. Insert Messages
  const { error: errMessages } = await supabase.from('messages').insert(MESSAGES);
  if (errMessages) console.error('Error seeding messages:', errMessages);
  else console.log('✓ Seeded 6 messages');

  // 5. Insert Activity Log
  const { error: errActivity } = await supabase.from('activity_log').insert(ACTIVITY_LOG);
  if (errActivity) console.error('Error seeding activity log:', errActivity);
  else console.log('✓ Seeded 5 activity logs');

  // 6. Insert Audit Log
  const { error: errAudit } = await supabase.from('audit_log').insert(AUDIT_LOG);
  if (errAudit) console.error('Error seeding audit log:', errAudit);
  else console.log('✓ Seeded 3 audit logs');

  // 7. Insert Goals
  const { error: errGoals } = await supabase.from('goals').insert(GOALS);
  if (errGoals) console.error('Error seeding goals:', errGoals);
  else console.log('✓ Seeded 4 goals');

  // 8. Upsert Office Settings
  const { error: errSettings } = await supabase.from('office_settings').upsert({
    id: 'default',
    mode: 'FOCUS_WORK',
    sound_enabled: true,
    speed: 1,
    theme: 'dark',
    layout: 'isometric'
  }, { onConflict: 'id' });
  if (errSettings) console.error('Error seeding office settings:', errSettings);
  else console.log('✓ Seeded office settings');

  console.log('\n--- Verification of 8 Tables ---');
  const tables = ['agents', 'tasks', 'approvals', 'activity_log', 'audit_log', 'messages', 'goals', 'office_settings'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Table ${t}: FAILED (${error.message})`);
    } else {
      console.log(`Table ${t}: OK (row count = ${count})`);
    }
  }
}

runSeed();
