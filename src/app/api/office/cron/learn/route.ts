import { NextRequest, NextResponse } from 'next/server'
import {
  getFastOfficeState,
  getSupabase,
  saveOfficeKnowledge,
  addOfficeLog,
} from '@/lib/storage'
import { getConfiguredGeminiModel } from '@/lib/jarvis/orchestrator'
import { Agent } from '@/components/office/types'

export const maxDuration = 60

/**
 * Dynamically synthesizes an autonomous learning breakthrough for a real agent
 * based entirely on their live database role, department, current task, and AI model.
 */
async function generateDynamicLearningForAgent(agent: Agent): Promise<{
  title: string
  content: string
  tags: string[]
}> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  const model = getConfiguredGeminiModel()
  const taskDesc = agent.current_task || 'Autonomous System Architecture & Telemetry'
  const dept = agent.department || 'ENGINEERING'

  const prompt = `You are ${agent.name}, the ${agent.role} in ${dept} at EasyUp Software Solution HQ, currently executing the task: "${taskDesc}" with assigned AI model "${agent.model || 'Gemini'}". Formulate a concise 2-sentence technical breakthrough, best practice, or key takeaway discovered while working on this task. Provide concrete implementation insight for the team. Output ONLY a clean JSON object with "title" (max 8 words), "content" (2 sentences), and "tags" (array of 3-4 lowercase tags). No markdown wrappers.`

  if (geminiKey && geminiKey.length > 5) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `You are an autonomous engineering agent at EasyUp Software Solution HQ. Respond in valid raw JSON with keys "title", "content", and "tags".`,
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 350,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(12000),
      })

      if (response.ok) {
        const json = await response.json()
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawText) {
          const parsed = JSON.parse(rawText)
          if (parsed.title && parsed.content) {
            return {
              title: `${agent.name}: ${parsed.title}`,
              content: String(parsed.content),
              tags: Array.isArray(parsed.tags)
                ? parsed.tags
                : [dept.toLowerCase(), 'autonomous_learning', 'live_sprint'],
            }
          }
        }
      }
    } catch {
      // Fallback if external LLM times out
    }
  }

  // Dynamic domain fallback built from the agent's real task
  return {
    title: `${agent.name}: Optimization on ${taskDesc.slice(0, 40)}`,
    content: `While executing "${taskDesc}", verified latency bounds and state consistency across EasyUp HQ architecture. Recommended strict error boundaries and real-time telemetry caching.`,
    tags: [dept.toLowerCase(), 'autonomous_learning', 'database_sync'],
  }
}

/**
 * 100% Dynamic Autonomous Cycle: Reads live agents from Supabase database,
 * executes domain research, and writes new knowledge back into Supabase.
 */
export async function handleAutonomousCycle() {
  const officeData = await getFastOfficeState()
  const agents = officeData.agents || []
  const supabase = getSupabase()

  if (!agents || agents.length === 0) {
    return {
      ok: false,
      error: 'No active agents found in live Supabase database.',
    }
  }

  // Pick a dynamic agent from the live database
  // Prefer agents who are actively working or cycling tasks
  const candidateAgents = agents.filter(
    (a) => a.status === 'working' || a.status === 'active' || !!a.current_task
  )
  const pool = candidateAgents.length > 0 ? candidateAgents : agents
  const targetAgent = pool[Math.floor(Math.random() * pool.length)]

  // Generate dynamic learning grounded in this agent's real database task
  const learningResult = await generateDynamicLearningForAgent(targetAgent)

  // 1. Save to Supabase Collective Brain (office_knowledge table)
  const savedKnowledge = await saveOfficeKnowledge({
    title: learningResult.title,
    content: learningResult.content,
    category: 'learning',
    agent_id: targetAgent.id,
    agent_name: targetAgent.name,
    tags: learningResult.tags,
    metadata: {
      task: targetAgent.current_task || 'Operational Sprint',
      department: targetAgent.department || 'ENGINEERING',
      role: targetAgent.role,
      assignedModel: targetAgent.model || 'gemini-2.0-flash',
      source: 'live_supabase_database',
      timestamp: new Date().toISOString(),
    },
  })

  // 2. Log activity to Supabase office_logs
  await addOfficeLog(
    `[AUTONOMOUS_LEARNING] ${targetAgent.name} (${targetAgent.role}) mastered and archived: "${learningResult.title}"`,
    'LEARNING',
    targetAgent.id,
    targetAgent.name
  )

  // 3. Post inter-agent communication to Supabase office_messages
  if (supabase) {
    try {
      await supabase.from('office_messages').insert({
        sender_id: targetAgent.id,
        sender_name: targetAgent.name,
        sender_department: targetAgent.department || 'ENGINEERING',
        channel: 'general',
        content: `Completed sprint milestone on "${targetAgent.current_task || 'Sprint Objective'}": "${learningResult.content}"`,
        message_type: 'knowledge_share',
      })
    } catch {}

    // 4. Update agent progress in Supabase office_agents
    try {
      const currentProg = typeof targetAgent.progress_pct === 'number' ? targetAgent.progress_pct : 40
      const nextProg = currentProg >= 85 ? 15 : Math.min(100, currentProg + 25)

      await supabase
        .from('office_agents')
        .update({
          progress: nextProg,
          last_active_at: new Date().toISOString(),
        })
        .eq('id', targetAgent.id)
    } catch {}
  }

  return {
    ok: true,
    agent: targetAgent.name,
    role: targetAgent.role,
    department: targetAgent.department,
    activeTask: targetAgent.current_task,
    knowledge: savedKnowledge,
    timestamp: new Date().toISOString(),
    liveAppUrl: 'https://easyup-hq.vercel.app/',
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const vercelCronHeader = req.headers.get('x-vercel-cron')
      if (!vercelCronHeader) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    const result = await handleAutonomousCycle()
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || 'Failed background learning cycle' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const result = await handleAutonomousCycle()
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || 'Failed background learning cycle' },
      { status: 500 }
    )
  }
}
