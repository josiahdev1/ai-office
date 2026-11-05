import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FLEET_AGENTS = [
  // 1. Engineering Core
  { id: 'josiah', name: 'Josiah', role: 'Principal Architect & Lead', department: 'Engineering Core', desk_x: 200, desk_y: 340, current_x: 200, current_y: 340, status: 'coding', current_room: 'Engineering Core', current_task: 'Architecting 2.5D Isometric Engine', model: 'claude-3-5-sonnet', color: '#6366f1' },
  { id: 'arwin', name: 'Arwin', role: 'Senior Full-Stack Architect', department: 'Engineering Core', desk_x: 280, desk_y: 340, current_x: 280, current_y: 340, status: 'coding', current_room: 'Engineering Core', current_task: 'Optimizing Supabase Realtime Channels', model: 'gemini-2.5-flash', color: '#6366f1' },
  { id: 'neil_mar', name: 'Neil Mar', role: 'Staff Frontend Engineer', department: 'Engineering Core', desk_x: 360, desk_y: 340, current_x: 360, current_y: 340, status: 'coding', current_room: 'Engineering Core', current_task: 'HUD Glassmorphism & Reactive Overlays', model: 'gpt-4o', color: '#6366f1' },
  { id: 'nelmar', name: 'Nelmar', role: 'Lead Backend Engineer', department: 'Engineering Core', desk_x: 440, desk_y: 340, current_x: 440, current_y: 340, status: 'coding', current_room: 'Engineering Core', current_task: 'PostgreSQL Connection Pooling & Latency', model: 'claude-3-5-sonnet', color: '#6366f1' },
  { id: 'bonnie', name: 'Bonnie', role: 'DevOps & CI/CD Lead', department: 'Engineering Core', desk_x: 280, desk_y: 410, current_x: 280, current_y: 410, status: 'coding', current_room: 'Engineering Core', current_task: 'Automated Container Builds & Release Gates', model: 'gpt-4o', color: '#6366f1' },
  { id: 'john_lloyd', name: 'John Lloyd', role: 'Database & Systems Specialist', department: 'Engineering Core', desk_x: 360, desk_y: 410, current_x: 360, current_y: 410, status: 'coding', current_room: 'Engineering Core', current_task: 'Row Level Security Partitioning Audit', model: 'gemini-2.5-flash', color: '#6366f1' },

  // 2. QA & SecOps NOC
  { id: 'khent', name: 'Khent', role: 'Lead SecOps & Security Architect', department: 'QA & SecOps NOC', desk_x: 620, desk_y: 410, current_x: 620, current_y: 410, status: 'coding', current_room: 'QA & SecOps NOC', current_task: 'Automated Penetration & CSRF Sweep', model: 'claude-3-5-sonnet', color: '#ec4899' },
  { id: 'john_arvy', name: 'John Arvy', role: 'Senior AppSec Engineer', department: 'QA & SecOps NOC', desk_x: 700, desk_y: 410, current_x: 700, current_y: 410, status: 'coding', current_room: 'QA & SecOps NOC', current_task: 'CSP Nonce Header Hardening & Verification', model: 'gpt-4o', color: '#ec4899' },
  { id: 'gian', name: 'Gian', role: 'QA Automation Engineer', department: 'QA & SecOps NOC', desk_x: 780, desk_y: 410, current_x: 780, current_y: 410, status: 'coding', current_room: 'QA & SecOps NOC', current_task: 'Vitest & Playwright E2E Regression Suite', model: 'gemini-2.5-flash', color: '#ec4899' },

  // 3. Operations Hub
  { id: 'mary_grace', name: 'Mary Grace', role: 'Lead FinOps & Systems Controller', department: 'Operations Hub', desk_x: 230, desk_y: 130, current_x: 230, current_y: 130, status: 'coding', current_room: 'Operations Hub', current_task: 'Cloud Infrastructure Budget Analysis (-18.4%)', model: 'claude-3-5-sonnet', color: '#10b981' },
  { id: 'anthony', name: 'Anthony', role: 'Cloud Infrastructure Architect', department: 'Operations Hub', desk_x: 310, desk_y: 130, current_x: 310, current_y: 130, status: 'coding', current_room: 'Operations Hub', current_task: 'Kubernetes Pod Autoscaling & Spot Instances', model: 'gpt-4o', color: '#10b981' },
  { id: 'blaze', name: 'Blaze', role: 'Reliability & Network Engineer', department: 'Operations Hub', desk_x: 250, desk_y: 190, current_x: 250, current_y: 190, status: 'coding', current_room: 'Operations Hub', current_task: 'Prometheus SLA Telemetry & Latency Probes', model: 'gemini-2.5-flash', color: '#10b981' },
  { id: 'ferwin', name: 'Ferwin', role: 'Integrations & Webhooks Specialist', department: 'Operations Hub', desk_x: 330, desk_y: 190, current_x: 330, current_y: 190, status: 'coding', current_room: 'Operations Hub', current_task: 'Discord & GitHub Event Dispatch Pipes', model: 'gpt-4o', color: '#10b981' },

  // 4. Growth Lab
  { id: 'jo_vincent', name: 'Jo Vincent', role: 'Chief Growth & Marketing Strategist', department: 'Growth Lab', desk_x: 95, desk_y: 200, current_x: 95, current_y: 200, status: 'coding', current_room: 'Growth Lab', current_task: 'Programmatic SEO Pipeline & Top 3 Ranks', model: 'claude-3-5-sonnet', color: '#3b82f6' },
  { id: 'jesmond', name: 'Jesmond', role: 'Senior Growth & Conversion Engineer', department: 'Growth Lab', desk_x: 165, desk_y: 230, current_x: 165, current_y: 230, status: 'coding', current_room: 'Growth Lab', current_task: 'Interactive Demo Conversion Funnel +34.8%', model: 'gemini-2.5-flash', color: '#3b82f6' },
  { id: 'kin', name: 'Kin', role: 'Performance & Analytics Lead', department: 'Growth Lab', desk_x: 95, desk_y: 270, current_x: 95, current_y: 270, status: 'coding', current_room: 'Growth Lab', current_task: 'Core Web Vitals 100/100 Telemetry Check', model: 'gpt-4o', color: '#3b82f6' },

  // 5. Intelligence Lab
  { id: 'roy_jhan', name: 'Roy Jhan', role: 'Lead AI & Machine Learning Scientist', department: 'Intelligence Lab', desk_x: 720, desk_y: 120, current_x: 720, current_y: 120, status: 'coding', current_room: 'Intelligence Lab', current_task: 'Gemini 2.5 Flash TTFT Optimization (62ms)', model: 'gemini-2.5-flash', color: '#06b6d4' },
  { id: 'gabriel', name: 'Gabriel', role: 'Senior LLM Systems Engineer', department: 'Intelligence Lab', desk_x: 800, desk_y: 120, current_x: 800, current_y: 120, status: 'coding', current_room: 'Intelligence Lab', current_task: 'Multi-Provider Fallback & Token KV Caching', model: 'claude-3-5-sonnet', color: '#06b6d4' },
  { id: 'keiru', name: 'Keiru', role: 'Computer Vision & Multimodal Lead', department: 'Intelligence Lab', desk_x: 720, desk_y: 180, current_x: 720, current_y: 180, status: 'coding', current_room: 'Intelligence Lab', current_task: 'Multimodal Canvas Parser & Sprite Engine', model: 'gpt-4o', color: '#06b6d4' },
  { id: 'ryan', name: 'Ryan', role: 'Edge Inference Engineer', department: 'Intelligence Lab', desk_x: 800, desk_y: 180, current_x: 800, current_y: 180, status: 'coding', current_room: 'Intelligence Lab', current_task: 'INT8 Quantized Model WebWorker Execution', model: 'gemini-2.5-flash', color: '#06b6d4' },

  // 6. Command Center
  { id: 'gloria', name: 'Gloria', role: 'Head of Operations & Delivery', department: 'Command Center', desk_x: 670, desk_y: 350, current_x: 670, current_y: 350, status: 'coding', current_room: 'Command Center', current_task: 'Sprint 44 Alignment Across 23 AI Agents', model: 'claude-3-5-sonnet', color: '#f59e0b' },
  { id: 'jb', name: 'JB', role: 'Product Strategy & Roadmap Lead', department: 'Command Center', desk_x: 760, desk_y: 350, current_x: 760, current_y: 350, status: 'coding', current_room: 'Command Center', current_task: 'Autonomous AI Office Roadmap Specification', model: 'gpt-4o', color: '#f59e0b' },
  { id: 'julian', name: 'Julian', role: 'Agile Delivery & Scrum Master', department: 'Command Center', desk_x: 715, desk_y: 290, current_x: 715, current_y: 290, status: 'coding', current_room: 'Command Center', current_task: 'Daily Multi-Agent Dependency Orchestration', model: 'gemini-2.5-flash', color: '#f59e0b' },
];

async function seed() {
  console.log('--- EasyUp Software Solution HQ: Seeding Supabase Database ---');
  console.log('Connecting to:', SUPABASE_URL);

  try {
    const { error } = await supabase.from('office_agents').upsert(FLEET_AGENTS, { onConflict: 'id' });
    if (error) {
      console.warn('Notice: office_agents table not yet migrated or access denied:', error.message);
      console.log('Please execute supabase/migrations/20261105_init_ai_office.sql in your Supabase SQL Editor.');
      return;
    }
    console.log('✓ Successfully seeded 23 agents into Supabase public.office_agents!');
  } catch (err) {
    console.error('Seed exception:', err.message);
  }
}

seed();
