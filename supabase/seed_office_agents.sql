-- =============================================================================
-- EasyUp Software Solution HQ - Master Seed for office_agents (23 Specialists)
-- Idempotent upsert: Safe to execute repeatedly without duplicating agents
-- =============================================================================

insert into public.office_agents (
  id, name, role, department, desk_x, desk_y, current_x, current_y,
  status, current_task, current_room, model, color, updated_at
) values
  -- Engineering Core
  ('josiah', 'Josiah', 'Founder & Lead Architect', 'ENGINEERING', 2, 10, 2, 10, 'coding', 'Multi-Agent Autonomous Architecture Oversight', 'Engineering Core', 'claude-3-7-sonnet', '#3b82f6', now()),
  ('arwin', 'Arwin', 'Lead Backend Engineer', 'ENGINEERING', 2, 11, 2, 11, 'coding', 'Realtime WebSockets & Supabase Postgres Syncer', 'Engineering Core', 'claude-3-7-sonnet', '#6366f1', now()),
  ('neil_mar', 'Neil Mar', 'Frontend / UI Architect', 'ENGINEERING', 2, 12, 2, 12, 'coding', 'Isometric Canvas 60 FPS Viewport Optimization', 'Engineering Core', 'claude-3-7-sonnet', '#06b6d4', now()),
  ('nelmar', 'Nelmar', 'Full-Stack Systems Engineer', 'ENGINEERING', 4, 10, 4, 10, 'coding', 'State Machine & Mode Transition Synchronization', 'Engineering Core', 'claude-3-7-sonnet', '#8b5cf6', now()),
  ('bonnie', 'Bonnie', 'Cloud & DevOps Specialist', 'ENGINEERING', 4, 11, 4, 11, 'coding', 'GitHub Actions CI Matrix Pipeline & Containerization', 'Engineering Core', 'claude-3-7-sonnet', '#10b981', now()),
  ('john_lloyd', 'John Lloyd', 'Database & Infrastructure Eng', 'ENGINEERING', 4, 12, 4, 12, 'coding', 'Postgres RLS Policies & Performance Index Tuning', 'Engineering Core', 'claude-3-7-sonnet', '#f59e0b', now()),

  -- QA & SecOps NOC
  ('khent', 'Khent', 'Lead Security & QA Engineer', 'QA & SECOPS', 2, 14, 2, 14, 'coding', 'Automated Penetration Scans & Vulnerability Triage', 'QA & SecOps NOC', 'gpt-4o', '#ec4899', now()),
  ('john_arvy', 'John Arvy', 'Penetration Tester & Auditor', 'QA & SECOPS', 2, 15, 2, 15, 'coding', 'API Endpoint Auth Boundary & RLS Audit', 'QA & SecOps NOC', 'gpt-4o', '#f43f5e', now()),
  ('gian', 'Gian', 'Automated Test Automation Eng', 'QA & SECOPS', 4, 14, 4, 14, 'coding', 'Playwright E2E & Vitest Regression Suite Runner', 'QA & SecOps NOC', 'gpt-4o', '#a855f7', now()),

  -- Growth Lab
  ('jo_vincent', 'Jo Vincent', 'Growth & Marketing Strategist', 'GROWTH', 13, 9, 13, 9, 'coding', 'Product Funnel Analytics & Conversion Attribution', 'Growth Lab', 'gpt-4o', '#2563eb', now()),
  ('jesmond', 'Jesmond', 'SEO & Content Intelligence Lead', 'GROWTH', 13, 10, 13, 10, 'coding', 'Automated Content Pipeline & Keyword Heatmap', 'Growth Lab', 'gpt-4o', '#3b82f6', now()),
  ('kin', 'Kin', 'User Acquisition Specialist', 'GROWTH', 15, 9, 15, 9, 'coding', 'Paid Acquisition Budget & Creative RoAS Tuning', 'Growth Lab', 'gpt-4o', '#60a5fa', now()),

  -- Intelligence Lab
  ('roy_jhan', 'Roy Jhan', 'Chief AI Research Engineer', 'INTELLIGENCE', 13, 5, 13, 5, 'coding', 'Vector Embeddings & Hybrid Retrieval Synthesizer', 'Intelligence Lab', 'claude-3-7-sonnet', '#06b6d4', now()),
  ('gabriel', 'Gabriel', 'NLP & Prompt Systems Engineer', 'INTELLIGENCE', 13, 6, 13, 6, 'coding', 'Chain-of-Thought Guardrails & Token Compression', 'Intelligence Lab', 'claude-3-7-sonnet', '#0ea5e9', now()),
  ('keiru', 'Keiru', 'Computer Vision & Multimodal Lead', 'INTELLIGENCE', 15, 5, 15, 5, 'coding', 'Pixel-Art Sprite Generator & Pose Alignment', 'Intelligence Lab', 'claude-3-7-sonnet', '#22d3ee', now()),
  ('ryan', 'Ryan', 'MLOps & Fine-Tuning Specialist', 'INTELLIGENCE', 15, 6, 15, 6, 'coding', 'LoRA Adapter Checkpoint Evaluation & Quantization', 'Intelligence Lab', 'claude-3-7-sonnet', '#38bdf8', now()),

  -- Operations Hub
  ('mary_grace', 'Mary Grace', 'Head of Operations', 'OPERATIONS', 13, 12, 13, 12, 'coding', 'Agency Workflows & Resource Capacity Forecasting', 'Operations Hub', 'gpt-4o', '#10b981', now()),
  ('anthony', 'Anthony', 'Logistics & Resource Planner', 'OPERATIONS', 13, 13, 13, 13, 'coding', 'Sprint Velocity & Inter-Department Dependency Board', 'Operations Hub', 'gpt-4o', '#059669', now()),
  ('blaze', 'Blaze', 'Incident & Support Coordinator', 'OPERATIONS', 15, 12, 15, 12, 'coding', '24/7 SLA Telemetry & Escalation Dispatch', 'Operations Hub', 'gpt-4o', '#ea580c', now()),
  ('ferwin', 'Ferwin', 'Process Automation Engineer', 'OPERATIONS', 15, 13, 15, 13, 'coding', 'Zapier/Webhook Workflows & CRM Sync Engine', 'Operations Hub', 'gpt-4o', '#14b8a6', now()),

  -- Command Center
  ('gloria', 'Gloria', 'Executive Operations Manager', 'COMMAND', 13, 15, 13, 15, 'coding', 'Quarterly OKR Tracking & Board Cockpit Metrics', 'Command Center', 'claude-3-7-sonnet', '#f59e0b', now()),
  ('jb', 'JB', 'Technical Program Manager', 'COMMAND', 15, 15, 15, 15, 'coding', 'Release Gate Checklist & Engineering Roadmaps', 'Command Center', 'claude-3-7-sonnet', '#d97706', now()),
  ('julian', 'Julian', 'Strategy & Financial Director', 'COMMAND', 14, 16, 14, 16, 'coding', 'Cloud Unit Economics & P&L Runway Analysis', 'Command Center', 'claude-3-7-sonnet', '#b45309', now())
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  department = excluded.department,
  desk_x = excluded.desk_x,
  desk_y = excluded.desk_y,
  current_room = excluded.current_room,
  model = excluded.model,
  color = excluded.color,
  updated_at = now();
