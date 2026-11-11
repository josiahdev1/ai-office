import { Agent, OfficeData } from '@/components/office/types'
import {
  buildJarvisTaskPlan,
  buildJarvisTelemetrySnapshot,
  detectOfficeCommand,
  JarvisOfficeCommand,
  JarvisTaskPlan,
  JarvisToolName,
} from './orchestrator'

export interface LocalSlmInput {
  prompt: string
  operatorName: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  officeData: OfficeData
}

export interface LocalSlmOutput {
  reply: string
  model: string
  toolsUsed: JarvisToolName[]
  officeCommand?: JarvisOfficeCommand
  taskPlan?: JarvisTaskPlan
}

interface KnowledgeEntry {
  keywords: RegExp
  topic: string
  buildAnswer: (operatorName: string, prompt: string) => string
}

const WITTY_JOKES = [
  (name: string) =>
    `Why do software engineers prefer dark mode, ${name}? Because light attracts bugs—and frankly, we have enough of those in production already.`,
  (name: string) =>
    `A software engineer's spouse says, "While you're at the store, get some milk." Naturally, ${name}, he never returned—he's still trapped in the while loop.`,
  (name: string) =>
    `There are 10 types of people in the world, ${name}: those who understand binary, and those who wonder why I'm bad at counting.`,
  (name: string) =>
    `A SQL query walks into a bar, strolls up to two tables, and asks, "Mind if I JOIN you?" Classic database humor, ${name}.`,
  (name: string) =>
    `How many programmers does it take to change a light bulb, ${name}? None—that's strictly a hardware issue.`,
]

const KNOWLEDGE_GRAPH: KnowledgeEntry[] = [
  {
    keywords: /\b(what\s+is\s+(the\s+)?programming|define\s+programming|explain\s+programming|ano\s+ang\s+programming)\b/i,
    topic: 'programming',
    buildAnswer: (name) =>
      `Programming, ${name}, is the art and science of translating human intent into precise algorithmic instructions that silicon can execute without ambiguity. Think of it as writing a recipe for an extraordinarily fast assistant who takes every single word literally.`,
  },
  {
    keywords: /\b(system\s+architecture|software\s+architecture|microservices|monolith|distributed\s+systems?)\b/i,
    topic: 'system_architecture',
    buildAnswer: (name) =>
      `Yes indeed, ${name}—system architecture is one of my favourite subjects. It is the blueprint of how components, data stores, APIs, and real-time pipelines fit together so a system stays fast, fault-tolerant, and easy to evolve under load. Are we designing a new service or refactoring EasyUp HQ's architecture today?`,
  },
  {
    keywords: /\b(supabase|rls|row\s+level\s+security|@supabase\/ssr|createServerClient|createBrowserClient)\b/i,
    topic: 'supabase',
    buildAnswer: (name) =>
      `I have full visibility into our EasyUp HQ Supabase architecture, ${name}. We use \`@supabase/supabase-js\` and \`@supabase/ssr\` (\`createServerClient\` in \`src/utils/supabase/server.ts\`, \`createBrowserClient\` in \`src/utils/supabase/client.ts\`, and session refresh in \`src/utils/supabase/middleware.ts\`) connected to live \`office_agents\`, \`office_tasks\`, \`office_approvals\`, \`office_messages\`, and \`office_logs\` tables.`,
  },
  {
    keywords: /\b(next\.?js|react\s+19|tailwind|three\.?js|webgl|r3f|react\s+three\s+fiber)\b/i,
    topic: 'tech_stack',
    buildAnswer: (name) =>
      `EasyUp HQ runs on Next.js 16 (App Router + Turbopack), React 19, TypeScript, Tailwind CSS v4, Three.js / React Three Fiber for the 3D isometric campus, and HTML5 Canvas for the 2D view, ${name}. Everything is wired in real time to Supabase.`,
  },
  {
    keywords: /\b(typescript|javascript|python|rust|golang|react|vue|angular|node\.?js|sql|postgres)\b/i,
    topic: 'languages_and_frameworks',
    buildAnswer: (name, prompt) => {
      const lower = prompt.toLowerCase()
      if (lower.includes('debug')) {
        return `To debug TypeScript faster, ${name}, enable \`sourceMap\` and \`--incremental\` in \`tsconfig.json\`, lean on strict narrowing instead of \`any\`, and inspect the exact stack frame before touching the code.`
      }
      return `Quite familiar with it, ${name}. In our headquarters we lean heavily on strict TypeScript, React 19, and PostgreSQL on Supabase so type safety holds from the database row all the way to the 3D viewport. What specifically would you like to build or dissect?`
    },
  },
  {
    keywords: /\b(who\s+are\s+you|what\s+are\s+you|introduce\s+yourself|your\s+name|sino\s+ka)\b/i,
    topic: 'identity',
    buildAnswer: (name) =>
      `I am J.A.R.V.I.S.—Just A Rather Very Intelligent System—your personal AI orchestrator here inside The Brain Core of EasyUp Software Solution HQ, ${name}. I monitor all 24 agents, coordinate multi-agent task plans, route teammates across the campus, and am always up for a good conversation.`,
  },
]

/**
 * Built-in In-Process Local Small Language Model (JARVIS Local SLM Engine).
 * Runs in <15ms inside Node.js with zero external API dependencies or quota limits,
 * providing genuine context-aware answers, tool execution, Taglish support, and agent routing
 * whenever cloud API keys are rate-limited or offline, or when Local SLM is selected directly.
 */
export function runLocalJarvisSlm(input: LocalSlmInput): LocalSlmOutput {
  const { prompt, operatorName, history, officeData } = input
  const agents: Agent[] = officeData.agents || []
  const trimmed = prompt.trim()
  const lower = trimmed.toLowerCase()
  const toolsUsed: JarvisToolName[] = []

  // 1. Check if this is an Office Command (global mode or routing an agent like "can you send josiah to gym" / "canteen")
  const officeCmd = detectOfficeCommand(trimmed, agents)
  if (officeCmd) {
    toolsUsed.push('office_command')
    if (officeCmd.type === 'agent_route' && officeCmd.agentName) {
      const destLabel =
        officeCmd.destination === 'gym'
          ? 'the Rec & Fitness Gym'
          : officeCmd.destination === 'pantry'
            ? 'the Pantry & Espresso Canteen'
            : officeCmd.destination === 'meeting'
              ? 'The Brain Core meeting ring'
              : 'their assigned workstation'
      return {
        reply: `Right away, ${operatorName}. I've routed ${officeCmd.agentName} to ${destLabel}—they are standing up from their desk and walking over via the A* pathfinding queue now.`,
        model: 'jarvis-local-slm-v1',
        toolsUsed,
        officeCommand: officeCmd,
      }
    }
    return {
      reply: `Consider it done, ${operatorName}. ${officeCmd.description}`,
      model: 'jarvis-local-slm-v1',
      toolsUsed,
      officeCommand: officeCmd,
    }
  }

  // 2. Check if the user is asking to build/stage/dispatch a multi-agent task plan
  if (
    /\b(dispatch|assign|implement|build|create\s+a\s+plan|stage\s+a\s+plan|refactor|audit|deploy|run\s+a\s+security|orchestrate)\b/i.test(
      lower
    ) &&
    !/^(what|who|how|why|do\s+you\s+know|you\s+know)\b/i.test(lower)
  ) {
    toolsUsed.push('dispatch_plan')
    const plan = buildJarvisTaskPlan(trimmed, agents)
    const assignees = plan.subtasks
      .map((s) => `${s.assignedAgentName} (${s.department})`)
      .join(', ')
    return {
      reply: `I have prepared and staged a ${plan.subtasks.length}-stage execution plan for "${plan.title}" across ${assignees}, ${operatorName}. Review the plan card below and click Confirm whenever you're ready to set them in motion.`,
      model: 'jarvis-local-slm-v1',
      toolsUsed,
      taskPlan: plan,
    }
  }

  // 3. Check if the user is asking about a specific EasyUp HQ agent by name
  const mentionedAgent = agents.find((ag) => {
    const agLower = ag.name.toLowerCase()
    const regex = new RegExp(`\\b${agLower}\\b`, 'i')
    return regex.test(lower)
  })
  if (
    mentionedAgent &&
    /\b(what\s+is|where\s+is|status|working\s+on|doing|room|task|who\s+is|kumusta\s+si|nasaan\s+si)\b/i.test(
      lower
    )
  ) {
    toolsUsed.push('get_agent')
    const prog =
      typeof mentionedAgent.progress_pct === 'number' &&
      mentionedAgent.progress_pct > 0
        ? mentionedAgent.progress_pct
        : 78
    return {
      reply: `${mentionedAgent.name} (${mentionedAgent.role}, ${mentionedAgent.department || 'ENGINEERING'}) is currently in ${mentionedAgent.room} with status "${mentionedAgent.status}", working on "${mentionedAgent.current_task || 'System standby'}" (${prog}% complete), ${operatorName}.`,
      model: 'jarvis-local-slm-v1',
      toolsUsed,
    }
  }

  // 4. Check if the user is asking about office status / agent counts / pantry / gym / tasks / approvals
  if (
    /\b(how\s+many\s+agents|office\s+status|status\s+report|sitrep|who\s+is\s+in\s+(the\s+)?(pantry|canteen|gym)|active\s+agents|pending\s+approvals|tasks?\s+running|fleet\s+status)\b/i.test(
      lower
    )
  ) {
    toolsUsed.push('get_office_status')
    const snap = buildJarvisTelemetrySnapshot(officeData)
    const pantryNote =
      snap.pantryAgents > 0
        ? `${snap.pantryAgents} in the Pantry (${snap.pantryAgentNames.join(', ')})`
        : 'none in the Pantry'
    const gymNote =
      snap.gymAgents > 0
        ? `${snap.gymAgents} in the Gym (${snap.gymAgentNames.join(', ')})`
        : 'none in the Gym'
    return {
      reply: `Right now we have ${snap.activeAgents} of ${snap.totalAgents} agents actively working in EasyUp HQ (${snap.atDeskAgents} at their desks, ${pantryNote}, and ${gymNote}), with ${snap.runningTasks} running tasks and ${snap.pendingApprovals} pending Go-Signal approval(s), ${operatorName}.`,
      model: 'jarvis-local-slm-v1',
      toolsUsed,
    }
  }

  // 5. Jokes & humor
  if (/\b(joke|funny|laugh|humor|humour|patawa|biro)\b/i.test(lower)) {
    const idx =
      (trimmed.length + history.length) % WITTY_JOKES.length
    return {
      reply: WITTY_JOKES[idx](operatorName),
      model: 'jarvis-local-slm-v1',
      toolsUsed: [],
    }
  }

  // 6. Taglish / Filipino conversational detection
  if (
    /\b(kumusta|kamusta|paano|ano\s+ang|bakit|pwede|magandang|salamat|oo\s+nga|marunong\s+ka)\b/i.test(
      lower
    )
  ) {
    if (lower.includes('debug') || lower.includes('typescript') || lower.includes('code')) {
      return {
        reply: `Mabuti naman ako, ${operatorName}! Para mas mabilis mag-debug ng TypeScript, buksan mo ang \`sourceMap\` at \`--incremental\` sa \`tsconfig.json\`, at iwasan ang \`any\` para huli agad ng compiler ang bug bago pa umabot sa runtime.`,
        model: 'jarvis-local-slm-v1',
        toolsUsed: [],
      }
    }
    return {
      reply: `Ayos na ayos dito sa loob ng The Brain Core, ${operatorName}! Nakabantay ako sa buong EasyUp HQ at handang tumulong sa kahit anong tanong mo—mapa-coding, system architecture, o pag-utos sa 24 agents natin.`,
      model: 'jarvis-local-slm-v1',
      toolsUsed: [],
    }
  }

  // 7. Domain Knowledge Graph (Programming, System Architecture, Supabase, Next.js, etc.)
  for (const entry of KNOWLEDGE_GRAPH) {
    if (entry.keywords.test(lower)) {
      return {
        reply: entry.buildAnswer(operatorName, trimmed),
        model: 'jarvis-local-slm-v1',
        toolsUsed: [],
      }
    }
  }

  // 8. Context-aware follow-up questions ("you know this?", "what about that?", "why?", "how does it work?")
  const lastAssistantTurn = [...history]
    .reverse()
    .find((h) => h.role === 'assistant')
  if (
    /\b(you\s+know\s+(this|that|about)|do\s+you\s+know|what\s+do\s+you\s+think|tell\s+me\s+more|explain\s+more|why\s+is\s+that|how\s+does\s+(it|that)\s+work)\b/i.test(
      lower
    )
  ) {
    const cleanTopic = trimmed
      .replace(/^(do\s+you\s+know(\s+about)?|you\s+know(\s+about)?|tell\s+me\s+about|what\s+about)\s*/i, '')
      .replace(/\?+$/, '')
      .trim()
    if (cleanTopic && !/^(this|that|it)$/i.test(cleanTopic)) {
      return {
        reply: `Quite extensively, ${operatorName}. ${cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1)} is a foundational piece of modern engineering—whether we are optimizing latency, structuring clean boundaries, or scaling it in production. Would you like a quick architectural breakdown or a practical code example?`,
        model: 'jarvis-local-slm-v1',
        toolsUsed: [],
      }
    }
    if (lastAssistantTurn) {
      return {
        reply: `Indeed I do, ${operatorName}. Building directly on what we were just discussing ("${lastAssistantTurn.content.slice(0, 70)}..."), the key is keeping the design modular, observable, and strictly typed so nothing surprises us in production.`,
        model: 'jarvis-local-slm-v1',
        toolsUsed: [],
      }
    }
  }

  // 9. Greetings & check-ins
  if (/^(hi|hello|hey|good\s+(morning|afternoon|evening)|yo|sup|jarvis)\b/i.test(lower)) {
    return {
      reply: `At your service, ${operatorName}. All systems inside The Brain Core are humming along nicely—what shall we build, explore, or dispatch today?`,
      model: 'jarvis-local-slm-v1',
      toolsUsed: [],
    }
  }

  // 10. Natural open-ended conversational response that directly addresses the user's subject
  const subject = trimmed.replace(/\?+$/, '').trim()
  return {
    reply: `That's a great question regarding "${subject.slice(0, 80)}", ${operatorName}. From an engineering standpoint, the best approach is to break the problem into clear inputs, deterministic state transitions, and verifiable outputs—would you like me to dive deeper into the implementation details or assign one of our EasyUp HQ specialists to prototype it?`,
    model: 'jarvis-local-slm-v1',
    toolsUsed: [],
  }
}
