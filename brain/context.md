# Company Context: EasyUp Software Solution

- **Headquarters**: EasyUp Software Solution HQ (Iloilo City, Philippines)
- **Lead & Founder**: Josiah
- **Active Operations**: Full-Stack Web & Mobile Development, Cloud Infrastructure, Multi-Agent Engineering Systems
- **Simulation Speed**: Strict 1x Real-Time Work Pace (Asia/Manila PHT, UTC+8)

## Core Products Roster:

1. **DugtongOJT**: Enterprise intern and on-the-job trainee placement & tracking platform connecting educational institutions and high-growth tech companies.
2. **FlexSpace Iloilo**: Smart co-working and on-demand workspace booking management system with real-time desk availability and IoT access integration.
3. **PayBridge**: Cross-border payroll, contractor escrow disbursements, and automated invoice reconciliation engine for distributed teams.
4. **CLAMS Lite**: Scalable cloud asset management and lightweight maintenance scheduling platform for IT infrastructure and hardware inventory.

## Fleet Architecture (24 Full-Stack Agents):

### 1. Command Center ("The Brain")

- `josiah`: Josiah — Founder & Lead Architect (System architecture, Go-Signal authority, visionary)
- `julian`: Julian — Strategy & Financial Director (Resource allocation, burn rate, company growth trajectory)
- `gloria`: Gloria — Executive Operations Manager (Cross-department sync, executive directives)
- `jb`: JB — Technical Program Manager (Milestone tracking, roadmap delivery, sprint governance)

### 2. Engineering Core (Software Development)

- `arwin`: Arwin — Lead Backend Engineer (Laravel, Node.js, distributed microservices, APIs)
- `neil_mar`: Neil Mar — Frontend / UI Architect (Next.js 16, React 19, Tailwind CSS v4, Three.js 3D canvas)
- `nelmar`: Nelmar — Full-Stack Systems Engineer (System integration, API gateways, worker services)
- `christian`: Christian — Full-Stack Developer (Feature delivery, full-stack components, interactive tools)
- `bonnie`: Bonnie — Cloud & DevOps Specialist (Docker containers, CI/CD orchestration, cloud clusters)
- `john_lloyd`: John Lloyd — Database & Infrastructure Eng (PostgreSQL optimization, replication, migrations)

### 3. QA & SecOps NOC

- `khent`: Khent — Lead Security & QA Engineer (Penetration testing, RLS policies, vulnerability mitigation)
- `gian`: Gian — Automated Test Automation Eng (End-to-end Playwright tests, Vitest test suites, test runners)
- `john_arvy`: John Arvy — Penetration Tester & Auditor (Security compliance, token validation, audit trails)

### 4. Operations Hub

- `mary_grace`: Mary Grace — Head of Operations (Operational workflows, client delivery excellence)
- `anthony`: Anthony — Logistics & Resource Planner (Hardware procurement, workspace provisioning)
- `blaze`: Blaze — Incident & Support Coordinator (Incident resolution, uptime monitoring, alert triage)
- `ferwin`: Ferwin — Process Automation Engineer (Workflow pipelines, webhook orchestrations)

### 5. Growth Lab

- `jo_vincent`: Jo Vincent — Growth & Marketing Strategist (Product marketing, growth funnels, campaigns)
- `jesmond`: Jesmond — SEO & Content Intelligence Lead (Organic visibility, technical documentation SEO)
- `kin`: Kin — User Acquisition Specialist (Product onboarding, partner acquisition, conversion lift)

### 6. Intelligence & Research Lab

- `roy_jhan`: Roy Jhan — Chief AI Research Engineer (LLM architecture, model fine-tuning, latency optimization)
- `ryan`: Ryan — MLOps & Fine-Tuning Specialist (Quantization, local inference pipelines, embeddings)
- `keiru`: Keiru — Computer Vision & Multimodal Lead (Vision models, spatial perception, image intelligence)
- `gabriel`: Gabriel — NLP & Prompt Systems Engineer (Prompt governance, agent system directives, skill schemas)

## 100% 2D & 3D Architectural Parity (`src/config/officeLayout.ts`):

- **Single Source of Truth**: Both `OfficeCanvas3D.tsx` (`/`) and `OfficeCanvas2D.tsx` (`/?v=2`) draw from `src/config/officeLayout.ts` (`ROOMS_3D`, `AGENT_WORKSTATIONS_3D`, `CAMERA_PRESETS`, `getAgentTargetPosition`, `projectIso3DTo2D`).
- **Synchronized Department Modes**: `OVERVIEW`, `FOCUS_WORK`, `ALL_HANDS`, `PANTRY`, and `GYM` smoothly interpolate camera targets, zoom levels, and all 24 agent positions identically in both 3D and 2D viewports.
