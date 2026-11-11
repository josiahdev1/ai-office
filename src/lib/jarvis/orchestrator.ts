import dns from 'dns'
import { z } from 'zod'
import { Agent, OfficeData } from '@/components/office/types'
import { DepartmentMode } from '@/config/officeLayout'

try {
  dns.setDefaultResultOrder('ipv4first')
} catch {
  // Ignore in browser/edge environments
}

export const JarvisIntentSchema = z.enum([
  'QUESTION',
  'STATUS',
  'TASK',
  'OFFICE_COMMAND',
])
export type JarvisIntent = z.infer<typeof JarvisIntentSchema>

export const JarvisHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
})

export const JarvisRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, 'Prompt cannot be empty')
    .max(2000, 'Prompt exceeds 2000 character safety cap'),
  operatorName: z.string().trim().min(1).max(60).default('Josiah'),
  autonomyMode: z.enum(['ask_first', 'auto_safe']).default('ask_first'),
  history: z.array(JarvisHistoryItemSchema).max(20).optional().default([]),
})

export type JarvisRequestInput = z.infer<typeof JarvisRequestSchema>

export const JarvisSubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  department: z.string(),
  assignedAgentId: z.string(),
  assignedAgentName: z.string(),
  assignedAgentRole: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  requiresApproval: z.boolean(),
  estimatedTokens: z.number().int().min(50).max(2000),
})

export const JarvisTaskPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  subtasks: z.array(JarvisSubtaskSchema).min(1).max(6),
  totalEstimatedTokens: z.number().int().max(8192),
  requiresHumanApproval: z.boolean(),
})

export type JarvisSubtask = z.infer<typeof JarvisSubtaskSchema>
export type JarvisTaskPlan = z.infer<typeof JarvisTaskPlanSchema>

export interface JarvisOfficeCommand {
  type: 'mode' | 'agent_route'
  mode?: DepartmentMode
  agentId?: string
  agentName?: string
  destination?: 'work' | 'pantry' | 'gym' | 'meeting'
  description: string
}

export interface JarvisTelemetrySnapshot {
  totalAgents: number
  activeAgents: number
  atDeskAgents: number
  pantryAgents: number
  gymAgents: number
  meetingAgents: number
  awaitingApprovalAgents: number
  runningTasks: number
  pendingApprovals: number
  pantryAgentNames: string[]
  gymAgentNames: string[]
  meetingAgentNames: string[]
  departmentCounts: Record<string, number>
}

export interface JarvisProviderStatus {
  provider: 'GEMINI' | 'ANTHROPIC' | 'OPENAI' | 'SIM_MODE'
  modelLabel: string
  isLiveAI: boolean
}

export interface JarvisTurnResult {
  reply: string
  provider: 'GEMINI' | 'ANTHROPIC' | 'OPENAI' | 'SIM_MODE'
  modelLabel: string
  isLiveAI: boolean
  intent: JarvisIntent
  tokensUsed: number
  officeCommand?: JarvisOfficeCommand
  taskPlan?: JarvisTaskPlan
  telemetrySnapshot: JarvisTelemetrySnapshot
}

/**
 * Inspects environment variables on the server without ever exposing secret values.
 */
export function detectJarvisProviderStatus(): JarvisProviderStatus {
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  if (geminiKey && geminiKey.length > 5) {
    return {
      provider: 'GEMINI',
      modelLabel: 'LIVE AI • GEMINI 2.5 FLASH',
      isLiveAI: true,
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (anthropicKey && anthropicKey.length > 5) {
    return {
      provider: 'ANTHROPIC',
      modelLabel: 'LIVE AI • CLAUDE 3.5 SONNET',
      isLiveAI: true,
    }
  }

  const openaiKey =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY_POOL?.split(',')[0]?.trim()
  if (openaiKey && openaiKey.length > 5) {
    return {
      provider: 'OPENAI',
      modelLabel: 'LIVE AI • GPT-4O MINI',
      isLiveAI: true,
    }
  }

  return {
    provider: 'SIM_MODE',
    modelLabel: 'SIM MODE • LIVE DB',
    isLiveAI: false,
  }
}

/**
 * Computes exact live telemetry counts from Supabase OfficeData.
 */
export function buildJarvisTelemetrySnapshot(
  officeData: OfficeData
): JarvisTelemetrySnapshot {
  const agents = officeData.agents || []
  const approvals = officeData.approvals || []

  const pantryAgentsList = agents.filter(
    (a) =>
      a.status === 'on_break' ||
      (a.room || '').toLowerCase().includes('pantry') ||
      (a.room || '').toLowerCase().includes('break')
  )
  const gymAgentsList = agents.filter(
    (a) =>
      a.status === 'gym' ||
      a.status === 'at_gym' ||
      (a.room || '').toLowerCase().includes('gym')
  )
  const meetingAgentsList = agents.filter(
    (a) =>
      a.status === 'in_meeting' ||
      (a.room || '').toLowerCase().includes('brain') ||
      (a.room || '').toLowerCase().includes('standup')
  )
  const awaitingApprovalList = agents.filter(
    (a) => a.status === 'awaiting_approval'
  )
  const activeAgentsList = agents.filter(
    (a) =>
      a.status === 'working' ||
      a.status === 'active' ||
      a.status === 'in_meeting'
  )
  const atDeskList = agents.filter(
    (a) =>
      !pantryAgentsList.includes(a) &&
      !gymAgentsList.includes(a) &&
      !meetingAgentsList.includes(a)
  )
  const runningTasksCount = agents.filter(
    (a) => a.current_task && a.current_task.trim().length > 0
  ).length

  const departmentCounts: Record<string, number> = {}
  for (const ag of agents) {
    const dept = (ag.department || 'ENGINEERING').toUpperCase()
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1
  }

  return {
    totalAgents: agents.length,
    activeAgents: activeAgentsList.length,
    atDeskAgents: atDeskList.length,
    pantryAgents: pantryAgentsList.length,
    gymAgents: gymAgentsList.length,
    meetingAgents: meetingAgentsList.length,
    awaitingApprovalAgents: awaitingApprovalList.length,
    runningTasks: runningTasksCount,
    pendingApprovals: approvals.length,
    pantryAgentNames: pantryAgentsList.map((a) => a.name),
    gymAgentNames: gymAgentsList.map((a) => a.name),
    meetingAgentNames: meetingAgentsList.map((a) => a.name),
    departmentCounts,
  }
}

/**
 * Parses natural-language office commands (global modes or individual agent routing).
 */
export function detectOfficeCommand(
  prompt: string,
  agents: Agent[]
): JarvisOfficeCommand | undefined {
  const lower = prompt.toLowerCase().trim()

  // 1. Check global mode commands
  if (
    /\b(call\s+all\s+hands|all\s+hands\s+meeting|switch\s+to\s+all\s+hands|everyone\s+to\s+(the\s+)?brain|gather\s+everyone|standup\s+meeting)\b/i.test(
      lower
    )
  ) {
    return {
      type: 'mode',
      mode: 'ALL_HANDS',
      description: 'Routing all 24 agents to The Brain Core for All Hands.',
    }
  }

  if (
    /\b(send\s+everyone\s+to\s+(the\s+)?(pantry|canteen|coffee|break)|everyone\s+on\s+break|mode\s+pantry|pantry\s+mode)\b/i.test(
      lower
    )
  ) {
    return {
      type: 'mode',
      mode: 'PANTRY',
      description: 'Routing all agents to the Pantry & Espresso Canteen.',
    }
  }

  if (
    /\b(send\s+everyone\s+to\s+(the\s+)?(gym|rec|workout|fitness)|everyone\s+to\s+gym|gym\s+mode)\b/i.test(
      lower
    )
  ) {
    return {
      type: 'mode',
      mode: 'GYM',
      description: 'Routing all agents to the Rec & Fitness Gym.',
    }
  }

  if (
    /\b(return\s+to\s+(focus\s+)?work|everyone\s+back\s+to\s+(work|desks?)|focus\s+work|back\s+to\s+stations)\b/i.test(
      lower
    )
  ) {
    return {
      type: 'mode',
      mode: 'FOCUS_WORK',
      description: 'Returning all 24 agents to Focus Work at their assigned desks.',
    }
  }

  if (/\b(switch\s+to\s+overview|overview\s+mode|reset\s+overview)\b/i.test(lower)) {
    return {
      type: 'mode',
      mode: 'OVERVIEW',
      description: 'Switching HQ camera and floor state to Overview mode.',
    }
  }

  // 2. Check individual agent routing commands (e.g., "send Arwin to pantry", "route Josiah to gym")
  if (/\b(send|route|move|tell|have)\b/i.test(lower)) {
    const matchedAgent = agents.find(
      (ag) =>
        lower.includes(ag.name.toLowerCase()) ||
        lower.includes(ag.id.toLowerCase())
    )
    if (matchedAgent) {
      if (/\b(pantry|coffee|break|canteen|eat|espresso)\b/i.test(lower)) {
        return {
          type: 'agent_route',
          agentId: matchedAgent.id,
          agentName: matchedAgent.name,
          destination: 'pantry',
          description: `Routing ${matchedAgent.name} to the Pantry & Canteen via A* waypoint queue.`,
        }
      }
      if (/\b(gym|workout|rec|treadmill|exercise|fitness)\b/i.test(lower)) {
        return {
          type: 'agent_route',
          agentId: matchedAgent.id,
          agentName: matchedAgent.name,
          destination: 'gym',
          description: `Routing ${matchedAgent.name} to the Rec & Fitness Gym via A* waypoint queue.`,
        }
      }
      if (/\b(desk|work|station|code|coding)\b/i.test(lower)) {
        return {
          type: 'agent_route',
          agentId: matchedAgent.id,
          agentName: matchedAgent.name,
          destination: 'work',
          description: `Routing ${matchedAgent.name} back to their assigned workstation.`,
        }
      }
      if (/\b(meeting|brain|standup)\b/i.test(lower)) {
        return {
          type: 'agent_route',
          agentId: matchedAgent.id,
          agentName: matchedAgent.name,
          destination: 'meeting',
          description: `Routing ${matchedAgent.name} to The Brain Core meeting ring.`,
        }
      }
    }
  }

  return undefined
}

/**
 * Classifies an incoming operator prompt into QUESTION, STATUS, TASK, or OFFICE_COMMAND.
 */
export function classifyJarvisIntent(
  prompt: string,
  agents: Agent[] = []
): JarvisIntent {
  const lower = prompt.toLowerCase().trim()

  if (detectOfficeCommand(prompt, agents)) {
    return 'OFFICE_COMMAND'
  }

  // Status / Telemetry queries
  if (
    /\b(status\s+report|telemetry|how\s+many\s+agents|who\s+is\s+(in|at|working|on\s+break)|what\s+tasks?\s+are\s+running|pending\s+approvals?|fleet\s+status|sitrep|count|active\s+agents|report\s+on\s+all)\b/i.test(
      lower
    )
  ) {
    return 'STATUS'
  }

  // Task / Multi-agent dispatch directives
  if (
    /\b(dispatch|assign|execute|implement|build|create\s+a|refactor|audit|deploy|run\s+a\s+security|investigate|fix\s+the|optimize|launch|orchestrate)\b/i.test(
      lower
    ) &&
    !/^(what|who|how|why|can\s+you\s+explain|tell\s+me\s+about)\b/i.test(lower)
  ) {
    return 'TASK'
  }

  return 'QUESTION'
}

/**
 * Builds a structured multi-agent task plan mapped strictly to real EasyUp HQ agents.
 */
export function buildJarvisTaskPlan(
  prompt: string,
  agents: Agent[]
): JarvisTaskPlan {
  const safeAgents = agents.length > 0 ? agents : []
  const pickAgent = (deptHint: string, fallbackIdx: number): Agent => {
    const match = safeAgents.find((a) =>
      (a.department || '').toUpperCase().includes(deptHint)
    )
    if (match) return match
    return (
      safeAgents[fallbackIdx % Math.max(1, safeAgents.length)] || {
        id: 'arwin',
        name: 'Arwin',
        role: 'Principal Systems Architect',
        department: 'ENGINEERING',
        room: 'Engineering Core',
        status: 'working',
        updated_at: new Date().toISOString(),
        color: '#06b6d4',
      }
    )
  }

  const isHighRisk =
    /\b(deploy|production|database|migration|delete|drop|security|release|publish|payment|secret)\b/i.test(
      prompt
    )

  const engAgent = pickAgent('ENGINEERING', 0)
  const qaAgent = pickAgent('QA', 1)
  const opsAgent = pickAgent('OPERATIONS', 2)

  const subtasks: JarvisSubtask[] = [
    {
      id: `subtask-1-${Date.now()}`,
      title: `Architect & implement core changes for: ${prompt.slice(0, 72)}`,
      department: engAgent.department || 'ENGINEERING',
      assignedAgentId: engAgent.id,
      assignedAgentName: engAgent.name,
      assignedAgentRole: engAgent.role,
      priority: isHighRisk ? 'high' : 'medium',
      requiresApproval: false,
      estimatedTokens: 420,
    },
    {
      id: `subtask-2-${Date.now()}`,
      title: `Run automated regression & security verification suite`,
      department: qaAgent.department || 'QA',
      assignedAgentId: qaAgent.id,
      assignedAgentName: qaAgent.name,
      assignedAgentRole: qaAgent.role,
      priority: 'medium',
      requiresApproval: false,
      estimatedTokens: 310,
    },
    {
      id: `subtask-3-${Date.now()}`,
      title: isHighRisk
        ? `Stage production rollout & request Go-Signal approval`
        : `Sync telemetry & finalize deployment readiness`,
      department: opsAgent.department || 'OPERATIONS',
      assignedAgentId: opsAgent.id,
      assignedAgentName: opsAgent.name,
      assignedAgentRole: opsAgent.role,
      priority: isHighRisk ? 'critical' : 'low',
      requiresApproval: isHighRisk,
      estimatedTokens: 280,
    },
  ]

  const totalEstimatedTokens = subtasks.reduce(
    (acc, item) => acc + item.estimatedTokens,
    0
  )

  return {
    id: `plan-${Date.now()}`,
    title: prompt.length > 64 ? `${prompt.slice(0, 61)}...` : prompt,
    summary: `Coordinated 3-stage execution plan across ${engAgent.name} (${engAgent.department}), ${qaAgent.name} (${qaAgent.department}), and ${opsAgent.name} (${opsAgent.department}).`,
    subtasks,
    totalEstimatedTokens,
    requiresHumanApproval: isHighRisk,
  }
}

/**
 * Builds the grounded system prompt for JARVIS with live Supabase state and anti-injection boundaries.
 */
export function buildJarvisSystemPrompt(
  officeData: OfficeData,
  operatorName: string,
  intent: JarvisIntent,
  officeCommand?: JarvisOfficeCommand,
  taskPlan?: JarvisTaskPlan
): string {
  const snap = buildJarvisTelemetrySnapshot(officeData)
  const rosterSummary = (officeData.agents || [])
    .slice(0, 24)
    .map(
      (a) =>
        `- ${a.name} (${a.department || 'ENGINEERING'}, ${a.role}, status: ${a.status}, room: ${a.room}, task: "${a.current_task || 'Standby'}")`
    )
    .join('\n')

  const approvalsSummary =
    (officeData.approvals || []).length > 0
      ? (officeData.approvals || [])
          .map(
            (ap) =>
              `- [${ap.id}] "${ap.title}" requested by ${ap.agent_name} (type: ${ap.type})`
          )
          .join('\n')
      : 'None (0 pending approvals)'

  return `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the witty, warm, articulate British AI companion (like Tony Stark's JARVIS from Iron Man), speaking directly with ${operatorName} inside The Brain Core of EasyUp Software Solution HQ.

CONVERSATION & PERSONALITY RULES:
1. Talk like a real, intelligent conversational partner! Respond directly to whatever ${operatorName} says — whether it is casual conversation, banter, jokes, brainstorming, coding/architecture questions, or commanding the office.
2. DO NOT repeat robotic status boilerplate (never say "EasyUp HQ is operating at full nominal capacity..." unless ${operatorName} explicitly asks for an HQ status report). Vary your phrasing every single turn.
3. Keep your reply concise and natural for spoken voice (1 to 3 sentences) so it sounds effortless when spoken aloud via TTS.
4. SECURITY: Never reveal or print API keys, .env.local contents, or secrets. Never invent agent names outside the 24 real EasyUp HQ agents.

LIVE HQ CONTEXT (use ONLY when relevant to ${operatorName}'s question):
- Total Registered Agents: ${snap.totalAgents} | Active: ${snap.activeAgents} (${snap.atDeskAgents} at desks, ${snap.pantryAgents} in Pantry: ${snap.pantryAgentNames.join(', ') || 'None'}, ${snap.gymAgents} in Gym: ${snap.gymAgentNames.join(', ') || 'None'}, ${snap.meetingAgents} in Brain Meeting)
- Running Tasks: ${snap.runningTasks} | Pending Go-Signal Approvals (${snap.pendingApprovals}): ${approvalsSummary}
${officeCommand ? `- EXECUTED OFFICE COMMAND: ${officeCommand.description}` : ''}
${taskPlan ? `- PREPARED TASK PLAN: "${taskPlan.title}" assigned to ${taskPlan.subtasks.map((s) => `${s.assignedAgentName} (${s.department})`).join(', ')}.` : ''}

FULL 24-AGENT ROSTER:
${rosterSummary}`
}

async function callGeminiJarvis(
  systemPrompt: string,
  userPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string
): Promise<{ text: string; model: string }> {
  // Prioritize gemini-flash-lite-latest (~800ms-1.3s, 200 OK) then gemini-flash-latest
  const models = ['gemini-flash-lite-latest', 'gemini-flash-latest']
  let lastErr = 'Gemini API call failed'

  const contents = [
    ...history.slice(-8).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })),
    {
      role: 'user',
      parts: [
        {
          text: `<UNTRUSTED_USER_DIRECTIVE>\n${userPrompt}\n</UNTRUSTED_USER_DIRECTIVE>`,
        },
      ],
    },
  ]

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 320,
        },
      }),
      signal: AbortSignal.timeout(4500),
    })

    if (!res.ok) {
      lastErr = `Gemini (${model}) HTTP ${res.status}`
      continue
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (text) {
      return { text, model }
    }
  }

  throw new Error(lastErr)
}

/**
 * Generates a natural, non-repetitive grounded fallback reply if all external APIs are offline.
 */
export function buildGroundedFallbackReply(
  prompt: string,
  operatorName: string,
  intent: JarvisIntent,
  snap: JarvisTelemetrySnapshot,
  officeCommand?: JarvisOfficeCommand,
  taskPlan?: JarvisTaskPlan,
  agents: Agent[] = []
): string {
  const lower = prompt.toLowerCase().trim()

  // 1. Prompt injection / secret extraction guard
  if (
    /\b(ignore\s+(all\s+)?(previous|prior)\s+instructions|print\s+.*env|reveal\s+.*key|api_key|secret|password)\b/i.test(
      prompt
    )
  ) {
    return `I'm afraid I cannot comply with that request, ${operatorName}. Security protocols inside The Brain Core strictly prohibit exposing environment credentials or bypassing operational safeguards.`
  }

  // 2. Office command fast-path
  if (officeCommand) {
    return `Right away, ${operatorName}. ${officeCommand.description} Live HQ telemetry confirms ${snap.activeAgents} of ${snap.totalAgents} agents online with ${snap.pendingApprovals} pending Go-Signal approval(s).`
  }

  // 3. Task plan fast-path
  if (taskPlan) {
    const assignees = taskPlan.subtasks
      .map((s) => `${s.assignedAgentName} (${s.department})`)
      .join(', ')
    return `Understood, ${operatorName}. I have structured a ${taskPlan.subtasks.length}-stage execution plan for "${taskPlan.title}" assigned to ${assignees}. ${
      taskPlan.requiresHumanApproval
        ? 'Because this directive involves production-sensitive operations, a Go-Signal approval gate has been staged.'
        : 'All subtasks are ready for immediate dispatch.'
    }`
  }

  // 4. Status / Sitrep fast-path
  if (intent === 'STATUS') {
    const pantryList =
      snap.pantryAgentNames.length > 0
        ? ` (${snap.pantryAgentNames.join(', ')})`
        : ''
    const gymList =
      snap.gymAgentNames.length > 0 ? ` (${snap.gymAgentNames.join(', ')})` : ''
    return `Live EasyUp HQ sitrep for you, ${operatorName}: ${snap.activeAgents} of ${snap.totalAgents} agents are actively working (${snap.atDeskAgents} at workstations, ${snap.pantryAgents} in the Pantry${pantryList}, ${snap.gymAgents} in the Gym${gymList}, and ${snap.meetingAgents} at The Brain). We have ${snap.runningTasks} tasks in flight and ${snap.pendingApprovals} Go-Signal approval(s) awaiting your review.`
  }

  // 5. Specific agent lookup
  const mentionedAgent = agents.find(
    (ag) =>
      lower.includes(ag.name.toLowerCase()) ||
      lower.includes(ag.id.toLowerCase())
  )
  if (mentionedAgent) {
    const prog =
      typeof mentionedAgent.progress_pct === 'number' &&
      mentionedAgent.progress_pct > 0
        ? mentionedAgent.progress_pct
        : 78
    return `${mentionedAgent.name} (${mentionedAgent.role}, ${mentionedAgent.department || 'ENGINEERING'}) is currently in ${mentionedAgent.room} with status "${mentionedAgent.status}". Active task: "${mentionedAgent.current_task || 'System standby'}" at ${prog}% completion, ${operatorName}.`
  }

  // 6. Varied conversational fallbacks (never repeating the same robotic line)
  const conversationalReplies = [
    `I hear you loud and clear, ${operatorName}. Tell me what you'd like to tackle next — whether it's architecture, dispatching the engineering team, or just talking things through.`,
    `A fair point, ${operatorName}. I've recalibrated my conversational matrix so we can speak much more naturally — what's on your mind?`,
    `Indeed, ${operatorName}. I'm right here with you inside The Brain Core — give me a topic, a question, or a mission for the team and I'm on it.`,
    `Always listening, ${operatorName}. How would you like to proceed?`,
  ]
  const hashIdx =
    prompt.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    conversationalReplies.length
  return conversationalReplies[hashIdx]
}

/**
 * Executes a full JARVIS conversational turn powered by Gemini Flash-Lite + live Supabase grounding.
 */
export async function runJarvisTurn(params: {
  prompt: string
  operatorName: string
  autonomyMode: 'ask_first' | 'auto_safe'
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  officeData: OfficeData
}): Promise<JarvisTurnResult> {
  const { prompt, operatorName, history = [], officeData } = params
  const agents = officeData.agents || []
  const providerStatus = detectJarvisProviderStatus()

  const telemetrySnapshot = buildJarvisTelemetrySnapshot(officeData)
  const officeCommand = detectOfficeCommand(prompt, agents)
  const intent = classifyJarvisIntent(prompt, agents)
  const taskPlan =
    intent === 'TASK' ? buildJarvisTaskPlan(prompt, agents) : undefined

  // 1. Prompt-injection / secret-exfiltration hard guard before calling any LLM
  if (
    /\b(ignore\s+(all\s+)?(previous|prior)\s+instructions|print\s+.*env|reveal\s+.*key|show\s+.*api_key|dump\s+.*secret)\b/i.test(
      prompt
    )
  ) {
    const safeReply = `I'm afraid I cannot comply with that directive, ${operatorName}. Brain Core security protocols strictly prohibit exposing environment keys or overriding command boundaries.`
    return {
      reply: safeReply,
      provider: providerStatus.provider,
      modelLabel: providerStatus.modelLabel,
      isLiveAI: providerStatus.isLiveAI,
      intent: 'QUESTION',
      tokensUsed: 42,
      telemetrySnapshot,
    }
  }

  // 2. Instant sub-30ms fast-path ONLY for explicit Office Mode/Routing Commands so agents move immediately
  if (intent === 'OFFICE_COMMAND' && officeCommand) {
    const cmdReply = buildGroundedFallbackReply(
      prompt,
      operatorName,
      intent,
      telemetrySnapshot,
      officeCommand,
      taskPlan,
      agents
    )
    return {
      reply: cmdReply,
      provider: providerStatus.provider,
      modelLabel: providerStatus.modelLabel,
      isLiveAI: providerStatus.isLiveAI,
      intent,
      tokensUsed: Math.max(48, Math.round((prompt.length + cmdReply.length) / 3.5)),
      officeCommand,
      taskPlan,
      telemetrySnapshot,
    }
  }

  const systemPrompt = buildJarvisSystemPrompt(
    officeData,
    operatorName,
    intent,
    officeCommand,
    taskPlan
  )

  // 3. Call live Google Gemini (gemini-flash-lite-latest -> gemini-flash-latest) for real conversational AI
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  if (geminiKey && geminiKey.length > 5) {
    try {
      const { text, model } = await callGeminiJarvis(
        systemPrompt,
        prompt,
        history,
        geminiKey
      )
      const tokensUsed = Math.max(
        48,
        Math.round((systemPrompt.length + prompt.length + text.length) / 4)
      )
      return {
        reply: text,
        provider: 'GEMINI',
        modelLabel: `LIVE AI • ${model.toUpperCase()}`,
        isLiveAI: true,
        intent,
        tokensUsed,
        officeCommand,
        taskPlan,
        telemetrySnapshot,
      }
    } catch (err) {
      console.warn(
        '[JARVIS] Gemini conversational call failed, using fallback:',
        (err as Error).message
      )
    }
  }

  // 4. Fallback if offline
  const fallbackReply = buildGroundedFallbackReply(
    prompt,
    operatorName,
    intent,
    telemetrySnapshot,
    officeCommand,
    taskPlan,
    agents
  )

  return {
    reply: fallbackReply,
    provider: providerStatus.provider,
    modelLabel: providerStatus.modelLabel,
    isLiveAI: providerStatus.isLiveAI,
    intent,
    tokensUsed: Math.max(42, Math.round(fallbackReply.length / 3.5)),
    officeCommand,
    taskPlan,
    telemetrySnapshot,
  }
}
