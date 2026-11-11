-- =============================================================================
-- EasyUp Software Solution HQ - Migration 0007: Agent Brain & Collective Knowledge Base
-- Supports continuous self-learning, architectural memory, code patterns, and Antigravity sync
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.office_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'learning' CHECK (category IN ('learning', 'architecture', 'code_pattern', 'agent_memory', 'rule', 'decision')),
  title text NOT NULL,
  content text NOT NULL,
  agent_id text,
  agent_name text,
  tags text[] DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast search
CREATE INDEX IF NOT EXISTS idx_office_knowledge_category ON public.office_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_office_knowledge_agent_id ON public.office_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_office_knowledge_created_at ON public.office_knowledge(created_at DESC);

-- Enable RLS
ALTER TABLE public.office_knowledge ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_knowledge' AND policyname = 'Allow public read office_knowledge'
  ) THEN
    CREATE POLICY "Allow public read office_knowledge"
      ON public.office_knowledge FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'office_knowledge' AND policyname = 'Allow public write office_knowledge'
  ) THEN
    CREATE POLICY "Allow public write office_knowledge"
      ON public.office_knowledge FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add to Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'office_knowledge') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.office_knowledge;
    END IF;
  END IF;
END $$;

-- Initial Seed of EasyUp HQ Collective Knowledge Brain
INSERT INTO public.office_knowledge (category, title, content, agent_id, agent_name, tags, metadata)
VALUES
  (
    'architecture',
    'EasyUp HQ Core Architecture & Tech Stack',
    'EasyUp Software Solution HQ is powered by Next.js 16 (App Router), React 19, Tailwind CSS v4, Three.js/Fiber 3D & HTML5 Canvas 2D viewports, and Supabase Realtime for state synchronization. All telemetry streams across office_agents, office_tasks, office_approvals, and office_logs.',
    'arwin',
    'Arwin',
    ARRAY['architecture', 'tech-stack', 'nextjs', 'react19', 'supabase'],
    '{"framework": "Next.js 16", "database": "Supabase Postgres", "ui": "Tailwind CSS v4"}'::jsonb
  ),
  (
    'agent_memory',
    '24 Autonomous Agent Fleet & AI Model Distribution',
    'EasyUp HQ operates a 24-agent autonomous AI workforce across 6 functional departments (Engineering, Product & Design, QA & Security, Operations & DevOps, Marketing & Growth, HR & Culture). Agents use live Gemini models (gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-pro) and Hugging Face in-project Neural Local SLMs (jarvis-local-slm-v1, hf-smollm2-135m, hf-smollm2-360m, hf-qwen2.5-0.5b).',
    'jarvis',
    'J.A.R.V.I.S.',
    ARRAY['agents', 'fleet', 'ai-models', 'gemini', 'local-slm'],
    '{"agentCount": 24, "primaryModel": "gemini-2.0-flash", "localSlm": "jarvis-local-slm-v1"}'::jsonb
  ),
  (
    'code_pattern',
    'Go-Signal Human-in-the-Loop Governance Pattern',
    'High-risk operations (production deployments, database migrations, security modifications) require human operator Go-Signal approval via office_approvals. Tasks are staged and await operator confirmation before dispatching.',
    'blaise',
    'Blaise',
    ARRAY['security', 'governance', 'approvals', 'go-signal'],
    '{"riskLevels": ["low", "medium", "high", "critical"]}'::jsonb
  )
ON CONFLICT DO NOTHING;
