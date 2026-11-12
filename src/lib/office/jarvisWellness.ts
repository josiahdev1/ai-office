import { z } from 'zod'
import { Agent } from '@/components/office/types'
import { needsManager } from './needsEngine'
import { officeSupabase } from '../supabase/officeService'
import { brainLearningManager } from './brainLearningEngine'

export type AutonomyMode = 'ASK_FOR_ALL' | 'STANDING_POLICY' | 'OFF'
export type AgentPinStatus = 'NORMAL' | 'NEVER_REST' | 'MUST_REST'
export type BreakRequestKind =
  | 'water'
  | 'cr'
  | 'coffee'
  | 'meal'
  | 'lunch'
  | 'nap'
  | 'sleep'
  | 'gym'
  | 'rest'
  | 'snack'

export interface WellnessPolicy {
  mode: AutonomyMode
  departmentBreakCapPct: number // Default 30%
  maxPersonalBreakMinutes: number // Default 10 min
  quietHoursEnabled: boolean
  agentPins: Record<string, AgentPinStatus>
}

export const DEFAULT_WELLNESS_POLICY: WellnessPolicy = {
  mode: 'STANDING_POLICY',
  departmentBreakCapPct: 30,
  maxPersonalBreakMinutes: 10,
  quietHoursEnabled: false,
  agentPins: {},
}

export interface BreakRequestInput {
  agentId: string
  department: string
  kind: BreakRequestKind
  durationMinutes: number
  isUrgentTaskRunning?: boolean
  isHealthCritical?: boolean
  reason: string
}

export interface PolicyEvaluationResult {
  allowedAutomatically: boolean
  requiresApproval: boolean
  reason: string
  suggestedAlternativeAgentId?: string
}

/**
 * Evaluates whether an agent break can proceed automatically or requires Josiah's Go-Signal approval.
 * Grounded in strict business rules defined in docs/OFFICE_LIFE.md Phase K5.
 */
export function evaluateBreakRequest(
  request: BreakRequestInput,
  policy: WellnessPolicy,
  departmentStatus: {
    totalAgentsInDept: number
    currentlyAwayInDept: number
  }
): PolicyEvaluationResult {
  const pin = policy.agentPins[request.agentId] || 'NORMAL'

  // Rule 1: Master switch OFF disables all automated breaks
  if (policy.mode === 'OFF') {
    return {
      allowedAutomatically: false,
      requiresApproval: false,
      reason: 'Jarvis Autonomy is OFF. Breaks must be initiated manually by operator.',
    }
  }

  // Rule 2: Agent pinned "NEVER_REST" cannot take breaks unless health is critical
  if (pin === 'NEVER_REST' && !request.isHealthCritical) {
    return {
      allowedAutomatically: false,
      requiresApproval: true,
      reason: 'Agent is pinned NEVER_REST. Break blocked unless health is critical.',
    }
  }

  // Rule 3: Agent pinned "MUST_REST" gets high priority
  if (pin === 'MUST_REST') {
    return {
      allowedAutomatically: true,
      requiresApproval: false,
      reason: 'Agent is pinned MUST_REST. Mandatory recovery permitted automatically.',
    }
  }

  // Rule 4: Critical health override - always permitted
  if (request.isHealthCritical) {
    return {
      allowedAutomatically: true,
      requiresApproval: false,
      reason: 'Critical health override: Agent health is critical (<=20). Urgent recovery permitted.',
    }
  }

  // Rule 5: Work protection - never allow an agent with an urgent/critical task away unless health is critical
  if (request.isUrgentTaskRunning) {
    return {
      allowedAutomatically: false,
      requiresApproval: true,
      reason: 'Agent has an active urgent or critical task. Break blocked until task is paused or completed.',
    }
  }

  // Rule 6: Mode "ASK_FOR_ALL" requires operator approval for everything
  if (policy.mode === 'ASK_FOR_ALL') {
    return {
      allowedAutomatically: false,
      requiresApproval: true,
      reason: 'Mode is set to "Ask me for everything". Staging Go-Signal approval.',
    }
  }

  // Rule 6: STANDING POLICY evaluation
  const isSmallPersonalNeed =
    request.kind === 'water' ||
    request.kind === 'cr' ||
    ((request.kind === 'coffee' || request.kind === 'snack') &&
      request.durationMinutes <= policy.maxPersonalBreakMinutes)

  if (isSmallPersonalNeed) {
    // Check department cap (at most 30% of any department away at once)
    const total = Math.max(1, departmentStatus.totalAgentsInDept)
    const away = departmentStatus.currentlyAwayInDept
    const newAwayPct = Math.round(((away + 1) / total) * 100)

    if (newAwayPct > policy.departmentBreakCapPct) {
      return {
        allowedAutomatically: false,
        requiresApproval: true,
        reason: `Department cap exceeded (${newAwayPct}% > ${policy.departmentBreakCapPct}% away in ${request.department}). Operator approval needed to override cap.`,
      }
    }

    return {
      allowedAutomatically: true,
      requiresApproval: false,
      reason: `Approved automatically under Standing Policy (${request.kind}, ${request.durationMinutes}m, within ${policy.departmentBreakCapPct}% department cap).`,
    }
  }

  // Anything bigger (lunch waves, gym, naps, sleep, extended coffee) requires Josiah's approval
  return {
    allowedAutomatically: false,
    requiresApproval: true,
    reason: `Activity "${request.kind}" (${request.durationMinutes}m) exceeds personal break limits. Staging Go-Signal approval card for Josiah.`,
  }
}

/**
 * Task-to-Agent Mapping with Human-Like Needs & Work Protection.
 * Ensures tasks are not assigned to sleeping agents or exhausted agents,
 * and proposes waking someone only when tasks are urgent.
 */
export function mapTaskToBestAgent(
  task: {
    title: string
    requiredDepartment?: string
    isUrgent?: boolean
  },
  agents: Agent[],
  _policy: WellnessPolicy
): {
  chosenAgent: Agent | null
  reason: string
  wakeRequiredAgent?: Agent
  needsPausingCurrentTask?: boolean
} {
  const targetDept = task.requiredDepartment?.toUpperCase()

  // Filter candidates by department
  const candidates = agents.filter((a) => {
    if (a.id.startsWith('cleaner_')) return false // Cleaners maintain facilities
    if (!targetDept || targetDept === 'ALL') return true
    return (a.department || '').toUpperCase() === targetDept
  })

  if (candidates.length === 0) {
    return {
      chosenAgent: null,
      reason: `No resident agents found in department "${targetDept || 'ALL'}".`,
    }
  }

  // Fetch real needs per candidate
  const candidatesWithNeeds = candidates.map((ag) => {
    const needs = needsManager.getAgentNeeds(ag.id)
    const isSleeping =
      ag.status === 'sleeping' ||
      ag.status === 'resting' ||
      needs.state === 'sleep' ||
      needs.state === 'nap'
    const isCritical = needs.health <= 20 || needs.energy <= 20
    const isBusy = ag.status === 'working' || (ag.current_task && ag.current_task.trim().length > 0)
    return { agent: ag, needs, isSleeping, isCritical, isBusy }
  })

  // Priority 1: Available agents scored by energy + matching learned Brain insights
  const taskKeywords = task.title.toLowerCase().split(/\s+/)
  const healthyAvailable = candidatesWithNeeds.filter(
    (c) => !c.isSleeping && !c.isCritical && !c.isBusy
  )

  const candidateInsightScores = healthyAvailable
    .map((c) => {
      const insights = brainLearningManager.getAgentInsights(c.agent.id)
      const matchingInsight = insights.find(
        (ins) =>
          ins.kind === 'strength' &&
          taskKeywords.some((kw) => kw.length >= 4 && ins.text.toLowerCase().includes(kw))
      )
      return {
        ...c,
        matchingInsight,
        score: c.needs.energy + (matchingInsight ? 45 : 0),
      }
    })
    .sort((a, b) => b.score - a.score)

  if (candidateInsightScores.length > 0) {
    const best = candidateInsightScores[0]
    if (best.matchingInsight) {
      return {
        chosenAgent: best.agent,
        reason: `${best.matchingInsight.text} (Energy: ${Math.round(best.needs.energy)}%, Morale: ${Math.round(best.needs.morale)}%).`,
      }
    }
    return {
      chosenAgent: best.agent,
      reason: `Selected ${best.agent.name} (Energy: ${Math.round(best.needs.energy)}%, Morale: ${Math.round(best.needs.morale)}%, status: available).`,
    }
  }

  // Priority 3: Urgent task handling when all available agents are resting/sleeping
  if (task.isUrgent) {
    const sleepingAgents = candidatesWithNeeds
      .filter((c) => c.isSleeping)
      .sort((a, b) => b.needs.energy - a.needs.energy) // pick highest recovered sleeper

    if (sleepingAgents.length > 0) {
      const candidateToWake = sleepingAgents[0].agent
      return {
        chosenAgent: null,
        wakeRequiredAgent: candidateToWake,
        reason: `All qualified agents in ${targetDept || 'HQ'} are currently resting. ${candidateToWake.name} is resting with ${Math.round(sleepingAgents[0].needs.energy)}% energy. Proposing to wake ${candidateToWake.name} for urgent mission.`,
      }
    }
  }

  // Fallback: Pick candidate with highest energy even if working, or report bottleneck
  const fallback = candidatesWithNeeds.sort((a, b) => b.needs.energy - a.needs.energy)[0]
  return {
    chosenAgent: fallback.agent,
    reason: `All agents currently assigned or resting. Queued behind ${fallback.agent.name} (Energy: ${Math.round(fallback.needs.energy)}%).`,
  }
}

/**
 * Morning daily schedule plan generator for Jarvis (staggered lunch, coffee, gym).
 */
export function generateDailyWellnessPlan(
  phtHour: number,
  agents: Agent[],
  _policy: WellnessPolicy
): {
  title: string
  summary: string
  planItems: Array<{
    department: string
    window: string
    activity: string
    agentsCount: number
  }>
} {
  const planItems = [
    {
      department: 'ALL DEPARTMENTS',
      window: '10:00 - 10:15 PHT',
      activity: 'Morning Espresso & Coffee Recharge',
      agentsCount: agents.length,
    },
    {
      department: 'ENGINEERING & INTELLIGENCE',
      window: '12:00 - 12:45 PHT',
      activity: 'Grand Cafeteria Lunch (Wave 1)',
      agentsCount: agents.filter(
        (a) => a.department === 'ENGINEERING' || a.department === 'INTELLIGENCE'
      ).length,
    },
    {
      department: 'QA, GROWTH & OPERATIONS',
      window: '12:45 - 13:30 PHT',
      activity: 'Grand Cafeteria Lunch (Wave 2)',
      agentsCount: agents.filter(
        (a) =>
          a.department === 'QA' || a.department === 'GROWTH' || a.department === 'OPERATIONS'
      ).length,
    },
    {
      department: 'ALL DEPARTMENTS',
      window: '15:00 - 15:15 PHT',
      activity: 'Afternoon Tea & Hydration Break',
      agentsCount: agents.length,
    },
    {
      department: 'ALL DEPARTMENTS',
      window: '17:00 - 18:00 PHT',
      activity: 'Rec & Gym Active Recovery / Game Lounge',
      agentsCount: agents.length,
    },
    {
      department: 'ALL RESIDENT AGENTS',
      window: '22:00 - 06:00 PHT',
      activity: 'Night Rest (Wellness Wing Nap Room)',
      agentsCount: agents.length,
    },
  ]

  return {
    title: `Autonomous HQ Daily Wellness Schedule (${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`,
    summary: `JARVIS scheduled daily wellness schedule with 2-wave staggered lunch, morning/afternoon coffee, gym slots, and night rest.`,
    planItems,
  }
}

/**
 * Checks for day-time wellness exceptions (e.g. 5+ agents with energy < 20%).
 */
export function checkDayWellnessExceptions(
  agents: Agent[],
  _policy: WellnessPolicy
): Array<{
  department: string
  lowEnergyCount: number
  suggestedBreakMinutes: number
  reason: string
}> {
  const deptMap: Record<string, Agent[]> = {}
  agents.forEach((ag) => {
    const dept = ag.department || 'ENGINEERING'
    if (!deptMap[dept]) deptMap[dept] = []
    deptMap[dept].push(ag)
  })

  const exceptions: Array<{
    department: string
    lowEnergyCount: number
    suggestedBreakMinutes: number
    reason: string
  }> = []

  Object.entries(deptMap).forEach(([dept, deptAgents]) => {
    let lowCount = 0
    deptAgents.forEach((ag) => {
      const needs = needsManager.getAgentNeeds(ag.id)
      if (needs.energy < 20) {
        lowCount++
      }
    })

    if (lowCount >= 5) {
      exceptions.push({
        department: dept,
        lowEnergyCount: lowCount,
        suggestedBreakMinutes: 15,
        reason: `${lowCount} agents in ${dept} have energy under 20%. Suggesting a 15-minute coffee recharge break for the department.`,
      })
    }
  })

  return exceptions
}

// ============================================================================
// JARVIS WELLNESS FUNCTION CALLING TOOLS (Zod Schemas & Implementations)
// ============================================================================

export const GetWellnessArgsSchema = z.object({
  agent_id: z.string().optional(),
  department: z.string().optional(),
})

export const ProposeBreakArgsSchema = z.object({
  agent_id: z.string().optional(),
  department: z.string().optional(),
  kind: z.enum(['coffee', 'lunch', 'nap', 'gym', 'rest', 'water', 'cr']),
  duration_minutes: z.number().int().min(1).max(120),
  reason: z.string().min(1),
})

export const ListRestingArgsSchema = z.object({})

export const WakeAgentArgsSchema = z.object({
  agent_id: z.string().min(1),
  reason: z.string().min(1),
})

export const SetPolicyArgsSchema = z.object({
  mode: z.enum(['ASK_FOR_ALL', 'STANDING_POLICY', 'OFF']),
  department_cap_pct: z.number().int().min(10).max(100).optional(),
  confirmation: z.boolean(),
})

export const GetAgentLogArgsSchema = z.object({
  agent_id: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional(),
})

export const WhatShouldAgentDoNextArgsSchema = z.object({
  agent_id: z.string().min(1),
})

export class JarvisWellnessManager {
  private policy: WellnessPolicy = { ...DEFAULT_WELLNESS_POLICY }

  constructor() {
    this.loadPolicyFromSettings()
  }

  public getPolicy(): WellnessPolicy {
    return { ...this.policy }
  }

  public setPolicyMode(
    mode: AutonomyMode,
    departmentCapPct?: number
  ): { ok: boolean; policy: WellnessPolicy } {
    this.policy.mode = mode
    if (departmentCapPct) {
      this.policy.departmentBreakCapPct = departmentCapPct
    }
    return { ok: true, policy: { ...this.policy } }
  }

  public updatePolicy(partial: Partial<WellnessPolicy>): void {
    if (partial.mode) this.policy.mode = partial.mode
    if (typeof partial.departmentBreakCapPct === 'number') {
      this.policy.departmentBreakCapPct = partial.departmentBreakCapPct
    }
    if (typeof partial.maxPersonalBreakMinutes === 'number') {
      this.policy.maxPersonalBreakMinutes = partial.maxPersonalBreakMinutes
    }
    if (typeof partial.quietHoursEnabled === 'boolean') {
      this.policy.quietHoursEnabled = partial.quietHoursEnabled
    }
    if (partial.agentPins) {
      this.policy.agentPins = { ...this.policy.agentPins, ...partial.agentPins }
    }
  }

  public setAgentPin(agentId: string, pin: AgentPinStatus): void {
    this.policy.agentPins[agentId] = pin
  }

  public getAgentPin(agentId: string): AgentPinStatus {
    return this.policy.agentPins[agentId] || 'NORMAL'
  }

  public async loadPolicyFromSettings(): Promise<void> {
    try {
      const client = officeSupabase.getClient()
      const { data } = await client
        .from('office_settings')
        .select('jarvis_autonomy_mode, department_break_cap_pct, max_personal_break_minutes')
        .eq('id', 'default')
        .single()

      if (data) {
        if (data.jarvis_autonomy_mode) {
          this.policy.mode = data.jarvis_autonomy_mode as AutonomyMode
        }
        if (data.department_break_cap_pct) {
          this.policy.departmentBreakCapPct = data.department_break_cap_pct
        }
        if (data.max_personal_break_minutes) {
          this.policy.maxPersonalBreakMinutes = data.max_personal_break_minutes
        }
      }
    } catch {
      // Fallback cleanly to default in-memory policy
    }
  }

  /**
   * Records a remembered operator preference from an approval decision.
   */
  public async recordPreference(preference: {
    action: 'approve' | 'reject' | 'hold' | 'instruct'
    category: string
    agentId?: string
    department?: string
    reason: string
    instruction?: string
  }): Promise<void> {
    try {
      const client = officeSupabase.getClient()
      await client.from('office_wellness_preferences').insert({
        operator_action: preference.action,
        category: preference.category,
        agent_id: preference.agentId || null,
        department: preference.department || null,
        reason: preference.reason,
        instruction: preference.instruction || null,
      })
    } catch {
      // Non-fatal
    }
  }
}

export const jarvisWellnessManager = new JarvisWellnessManager()
