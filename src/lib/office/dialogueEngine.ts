/**
 * Dynamic Procedural Office Dialogue & Communication Engine
 * Generates non-looping, contextual, real-world technical and workplace conversations
 * for EasyUp Software Solution HQ's 23 agents across 6 departments.
 */

export interface DynamicDialogue {
  from: string
  fromName: string
  fromRole: string
  to: string
  toName: string
  toRole: string
  text: string
  replyText: string
  topic:
    | 'engineering'
    | 'secops'
    | 'ai'
    | 'operations'
    | 'growth'
    | 'command'
    | 'casual'
}

interface TeamMember {
  id: string
  name: string
  role: string
  department: string
}

const AGENTS_BY_TEAM: Record<string, TeamMember[]> = {
  engineering: [
    {
      id: 'josiah',
      name: 'Josiah',
      role: 'Principal Architect & Lead',
      department: 'Engineering Core',
    },
    {
      id: 'arwin',
      name: 'Arwin',
      role: 'Senior Full-Stack Architect',
      department: 'Engineering Core',
    },
    {
      id: 'neil_mar',
      name: 'Neil Mar',
      role: 'Staff Frontend Engineer',
      department: 'Engineering Core',
    },
    {
      id: 'nelmar',
      name: 'Nelmar',
      role: 'Lead Backend Engineer',
      department: 'Engineering Core',
    },
    {
      id: 'bonnie',
      name: 'Bonnie',
      role: 'DevOps & CI/CD Lead',
      department: 'Engineering Core',
    },
    {
      id: 'john_lloyd',
      name: 'John Lloyd',
      role: 'Database & Systems Specialist',
      department: 'Engineering Core',
    },
  ],
  secops: [
    {
      id: 'khent',
      name: 'Khent',
      role: 'Lead SecOps & Security Architect',
      department: 'QA & SecOps NOC',
    },
    {
      id: 'john_arvy',
      name: 'John Arvy',
      role: 'Senior AppSec Engineer',
      department: 'QA & SecOps NOC',
    },
    {
      id: 'gian',
      name: 'Gian',
      role: 'QA Automation Engineer',
      department: 'QA & SecOps NOC',
    },
  ],
  intelligence: [
    {
      id: 'roy_jhan',
      name: 'Roy Jhan',
      role: 'Lead AI & Machine Learning Scientist',
      department: 'Intelligence Lab',
    },
    {
      id: 'gabriel',
      name: 'Gabriel',
      role: 'Senior LLM Systems Engineer',
      department: 'Intelligence Lab',
    },
    {
      id: 'keiru',
      name: 'Keiru',
      role: 'Computer Vision & Multimodal Lead',
      department: 'Intelligence Lab',
    },
    {
      id: 'ryan',
      name: 'Ryan',
      role: 'Edge Inference Engineer',
      department: 'Intelligence Lab',
    },
  ],
  operations: [
    {
      id: 'mary_grace',
      name: 'Mary Grace',
      role: 'Lead FinOps & Systems Controller',
      department: 'Operations Hub',
    },
    {
      id: 'anthony',
      name: 'Anthony',
      role: 'Cloud Infrastructure Architect',
      department: 'Operations Hub',
    },
    {
      id: 'blaze',
      name: 'Blaze',
      role: 'Reliability & Network Engineer',
      department: 'Operations Hub',
    },
    {
      id: 'ferwin',
      name: 'Ferwin',
      role: 'Integrations & Webhooks Specialist',
      department: 'Operations Hub',
    },
  ],
  growth: [
    {
      id: 'jo_vincent',
      name: 'Jo Vincent',
      role: 'Chief Growth & Marketing Strategist',
      department: 'Growth Lab',
    },
    {
      id: 'jesmond',
      name: 'Jesmond',
      role: 'Senior Growth & Conversion Engineer',
      department: 'Growth Lab',
    },
    {
      id: 'kin',
      name: 'Kin',
      role: 'Performance & Analytics Lead',
      department: 'Growth Lab',
    },
  ],
  command: [
    {
      id: 'gloria',
      name: 'Gloria',
      role: 'Head of Operations & Delivery',
      department: 'Command Center',
    },
    {
      id: 'jb',
      name: 'JB',
      role: 'Product Strategy & Roadmap Lead',
      department: 'Command Center',
    },
    {
      id: 'julian',
      name: 'Julian',
      role: 'Agile Delivery & Scrum Master',
      department: 'Command Center',
    },
  ],
}

// Conversational scenario templates with parametric placeholders
const CONVERSATION_TEMPLATES = [
  // 1. Engineering Core <-> Backend / Frontend
  {
    topic: 'engineering' as const,
    pair: ['arwin', 'neil_mar'],
    generate: (runIndex: number) => {
      const tickets = ['PR #184', 'PR #205', 'PR #212', 'PR #229', 'PR #245']
      const modules = [
        'TanStack Query cache',
        'canvas viewport matrix',
        'isometric z-indexing',
        'Next.js 16 SSR prefetch',
        'Supabase realtime sync',
      ]
      const ticket = tickets[runIndex % tickets.length]
      const mod = modules[runIndex % modules.length]
      return {
        text: `@Neil Mar ${ticket} for ${mod} is merged to staging. Ready for your reactive card hooks.`,
        replyText: `@Arwin Testing rehydration on live stream now. P99 render frame is solid at 16.6ms.`,
      }
    },
  },
  {
    topic: 'engineering' as const,
    pair: ['nelmar', 'john_lloyd'],
    generate: (runIndex: number) => {
      const metrics = [
        'query latency down to 0.28ms',
        'connection pool utilization at 18%',
        'composite index on office_logs active',
        'partitioned audit table indexed',
      ]
      const metric = metrics[runIndex % metrics.length]
      return {
        text: `@John Lloyd PostgreSQL telemetry optimization complete: ${metric}.`,
        replyText: `@Nelmar Verified on staging cluster. Vacuum and re-index scheduled for tonight.`,
      }
    },
  },
  {
    topic: 'engineering' as const,
    pair: ['bonnie', 'josiah'],
    generate: (runIndex: number) => {
      const builds = [
        'Build #419 (turbopack)',
        'Docker staging release v1.4.2',
        'Edge worker bundle #88',
        'E2E regression suite',
      ]
      const build = builds[runIndex % builds.length]
      return {
        text: `@Josiah ${build} passed all gates. Ready for your Go-Signal signoff.`,
        replyText: `@Bonnie Inspected the diff and unit test reports. Signoff authorized.`,
      }
    },
  },

  // 2. QA & SecOps NOC <-> Security & QA
  {
    topic: 'secops' as const,
    pair: ['khent', 'john_arvy'],
    generate: (runIndex: number) => {
      const checks = [
        'OWASP Top 10 automated pen-sweep',
        'CSP nonce evaluation',
        'JWT token expiration & refresh cycle',
        'Supabase RLS bypass probe',
      ]
      const check = checks[runIndex % checks.length]
      return {
        text: `@John Arvy Completed ${check}. Zero vulnerabilities or privilege leaks detected.`,
        replyText: `@Khent AppSec audit signed off. Adding digital signature to compliance vault.`,
      }
    },
  },
  {
    topic: 'secops' as const,
    pair: ['gian', 'arwin'],
    generate: (runIndex: number) => {
      const suites = [
        'Vitest unit suite (12/12 passing)',
        'Playwright isometric pathfinding E2E',
        'A* door navigation stress test',
        'Web-first locator regression',
      ]
      const suite = suites[runIndex % suites.length]
      return {
        text: `@Arwin ${suite} finished with 0 failures across 60 simulated agent cycles.`,
        replyText: `@Gian Fantastic. Moving build artifact to staging candidate repository.`,
      }
    },
  },

  // 3. AI & Intelligence Lab <-> LLM Orchestration
  {
    topic: 'ai' as const,
    pair: ['roy_jhan', 'gabriel'],
    generate: (runIndex: number) => {
      const models = [
        'Gemini 2.5 Flash',
        'Claude 3.5 Sonnet',
        'OpenAI o3-mini pool',
        'DeepSeek fallback router',
      ]
      const latencies = ['62ms TTFT', '74ms TTFT', '81ms TTFT', '68ms TTFT']
      const m = models[runIndex % models.length]
      const lat = latencies[runIndex % latencies.length]
      return {
        text: `@Gabriel Benchmarked ${m} for autonomous agent tasks: achieved ${lat}.`,
        replyText: `@Roy Jhan Token usage reduced by 22% with semantic KV caching enabled.`,
      }
    },
  },
  {
    topic: 'ai' as const,
    pair: ['keiru', 'ryan'],
    generate: (runIndex: number) => {
      const visionTasks = [
        'OCR document extraction',
        'multimodal blueprint parsing',
        'sprite animation keyframe interpolation',
        'spatial room boundary classifier',
      ]
      const vt = visionTasks[runIndex % visionTasks.length]
      return {
        text: `@Ryan ${vt} weights quantized to INT8 for local browser edge execution.`,
        replyText: `@Keiru Loaded in WebWorker. Memory consumption capped at 48MB.`,
      }
    },
  },

  // 4. Operations Hub <-> Cloud & FinOps
  {
    topic: 'operations' as const,
    pair: ['mary_grace', 'anthony'],
    generate: (runIndex: number) => {
      const savings = [
        '-18.4% below monthly allocation',
        '-12.8% cloud compute reduction',
        '-24.0% database egress optimization',
        '-15.5% spot instance reclaim',
      ]
      const sav = savings[runIndex % savings.length]
      return {
        text: `@Anthony Monthly cloud infrastructure review completed: spending is ${sav}.`,
        replyText: `@Mary Grace Reserved instances and auto-downscaling policies working perfectly.`,
      }
    },
  },
  {
    topic: 'operations' as const,
    pair: ['blaze', 'ferwin'],
    generate: (runIndex: number) => {
      const hooks = [
        'Discord webhook notifications',
        'GitHub Actions deployment gate',
        'Supabase realtime change listener',
        'Staging healthcheck probes',
      ]
      const hook = hooks[runIndex % hooks.length]
      return {
        text: `@Ferwin Validated ${hook}: p99 latency 1.8ms with zero packet drops.`,
        replyText: `@Blaze Heartbeat monitors updated in centralized observability dashboard.`,
      }
    },
  },

  // 5. Growth Lab <-> Product & Analytics
  {
    topic: 'growth' as const,
    pair: ['jo_vincent', 'jesmond'],
    generate: (runIndex: number) => {
      const funnels = [
        'organic client signup conversion +28.4%',
        'AI Office demo engagement time up 3.4x',
        'programmatic SEO top-ranking pages +19%',
        'landing page bounce rate dropped to 18%',
      ]
      const fun = funnels[runIndex % funnels.length]
      return {
        text: `@Jesmond Latest sprint analytics confirmed: ${fun}.`,
        replyText: `@Jo Vincent A/B test on hero interactive preview is the highest performing variant.`,
      }
    },
  },
  {
    topic: 'growth' as const,
    pair: ['kin', 'jo_vincent'],
    generate: (runIndex: number) => {
      const stats = [
        'Core Web Vitals scored 100/100 on desktop',
        'INP under 35ms on mobile devices',
        'client retention index up 14%',
        'referral virality coefficient hit 1.4',
      ]
      const stat = stats[runIndex % stats.length]
      return {
        text: `@Jo Vincent Growth performance telemetry: ${stat}.`,
        replyText: `@Kin Excellent. Exporting executive report for Josiah and client stakeholders.`,
      }
    },
  },

  // 6. Command Center <-> Cross-Company Alignment
  {
    topic: 'command' as const,
    pair: ['gloria', 'jb'],
    generate: (runIndex: number) => {
      const sprints = [
        'Sprint 44 deliverables',
        'Q4 AI Studio roadmap',
        'Client milestone MVP release',
        'Supabase realtime sync epic',
      ]
      const sprint = sprints[runIndex % sprints.length]
      return {
        text: `@JB ${sprint} tracking at 98% completion across all 23 agents.`,
        replyText: `@Gloria Velocity is healthy. No critical impediments on the sprint board.`,
      }
    },
  },
  {
    topic: 'command' as const,
    pair: ['julian', 'josiah'],
    generate: (runIndex: number) => {
      const items = [
        'daily multi-agent standup summary',
        'cross-department dependency graph',
        'automated code review queue',
        'production rollout checklist',
      ]
      const itm = items[runIndex % items.length]
      return {
        text: `@Josiah Compiled ${itm}. All teams synchronized for seamless delivery.`,
        replyText: `@Julian Great leadership. Keep up the high standard of engineering execution.`,
      }
    },
  },

  // 7. Casual & Pantry / Gym Chit-Chat
  {
    topic: 'casual' as const,
    pair: ['mary_grace', 'bonnie'],
    generate: (runIndex: number) => {
      const coffees = [
        'iced oat latte',
        'double shot espresso',
        'caramel macchiato',
        'cold brew',
      ]
      const coffee = coffees[runIndex % coffees.length]
      return {
        text: `@Bonnie Heading to the canteen for a quick ${coffee}, want me to grab you one?`,
        replyText: `@Mary Grace That would be awesome, thank you! Just finishing a CI run.`,
      }
    },
  },
  {
    topic: 'casual' as const,
    pair: ['khent', 'anthony'],
    generate: (runIndex: number) => {
      const recs = [
        'a table tennis rally at the recreation court',
        'a quick gym stretch session',
        'a coffee break by the pantry lounge',
      ]
      const rec = recs[runIndex % recs.length]
      return {
        text: `@Anthony How about ${rec} once the security scan completes?`,
        replyText: `@Khent You're on! Meet you there in 10 minutes.`,
      }
    },
  },
]

class DynamicDialogueEngine {
  private usedDialogueKeys: Set<string> = new Set()
  private cycleCounter = 0

  /**
   * Generates a novel, non-looping dialogue between real EasyUp HQ agents.
   */
  public getNextDialogue(): DynamicDialogue {
    this.cycleCounter++

    // Pick template index with rotation + pseudo-random offset
    const templateIdx =
      (this.cycleCounter +
        Math.floor(Math.random() * CONVERSATION_TEMPLATES.length)) %
      CONVERSATION_TEMPLATES.length
    const template = CONVERSATION_TEMPLATES[templateIdx]

    const senderId = template.pair[0]
    const recipientId = template.pair[1]

    // Find agent records
    let sender: TeamMember | undefined
    let recipient: TeamMember | undefined

    for (const team of Object.values(AGENTS_BY_TEAM)) {
      if (!sender) sender = team.find((a) => a.id === senderId)
      if (!recipient) recipient = team.find((a) => a.id === recipientId)
    }

    if (!sender)
      sender = {
        id: senderId,
        name: senderId,
        role: 'Software Engineer',
        department: 'Engineering Core',
      }
    if (!recipient)
      recipient = {
        id: recipientId,
        name: recipientId,
        role: 'Systems Engineer',
        department: 'Operations Hub',
      }

    const content = template.generate(this.cycleCounter)

    // Keep history bounded to avoid memory build-up while guaranteeing freshness
    const key = `${senderId}:${content.text}`
    if (this.usedDialogueKeys.has(key) && this.usedDialogueKeys.size > 200) {
      this.usedDialogueKeys.clear()
    }
    this.usedDialogueKeys.add(key)

    return {
      from: sender.id,
      fromName: sender.name,
      fromRole: sender.role,
      to: recipient.id,
      toName: recipient.name,
      toRole: recipient.role,
      text: content.text,
      replyText: content.replyText,
      topic: template.topic,
    }
  }
}

export const dialogueEngine = new DynamicDialogueEngine()
