/**
 * Agent Needs Engine (Human-Like Dynamics), Plan & Activity Log
 * Branch: office-v3 (Phase K3)
 *
 * Implements lazy, deterministic evaluation of human-like agent needs:
 * - 0 to 100 scales for Energy, Hunger, Thirst, Bladder, Health, Morale
 * - Hidden stats for Caffeine and Sleep Debt
 * - Astronomical / Circadian rhythm shaping by PHT solar hour
 * - Break requests and next action planning
 * - Rich Activity Log formatting, timeline grouping, and CSV export
 */

import { getPHTParts } from './clock'
import { officeSupabase } from '../supabase/officeService'

export type ActivityKind =
  | 'eat'
  | 'drink'
  | 'coffee'
  | 'cr'
  | 'nap'
  | 'sleep'
  | 'gym'
  | 'lounge'
  | 'social'
  | 'work'
  | 'clean'
  | 'walk_break'
  | 'request'
  | 'decision'
  | 'wake'

export type ActivityPhase =
  | 'planned'
  | 'started'
  | 'completed'
  | 'cancelled'
  | 'denied'

export type DecidedBy =
  | 'needs engine'
  | 'schedule'
  | 'jarvis'
  | 'boss'
  | 'agent'
  | 'me'

export type PlanSource =
  | 'needs'
  | 'schedule'
  | 'jarvis'
  | 'boss'
  | 'agent_request'
  | 'me'

export type PlanStatus =
  | 'planned'
  | 'approved'
  | 'started'
  | 'done'
  | 'cancelled'
  | 'skipped'

export interface AgentTraits {
  metabolism: 'fast' | 'normal' | 'slow'
  sleepiness: 'early_bird' | 'night_owl' | 'balanced'
  gymLover: boolean
  caffeineSensitivity: number // 0.8 to 1.2
  bladderCapacity: number // 0.8 to 1.2
}

export interface AgentNeeds {
  energy: number // 0 to 100
  hunger: number // 0 to 100 (100 = completely full)
  thirst: number // 0 to 100 (100 = completely hydrated)
  bladder: number // 0 to 100 (100 = empty / relieved, drops towards 0 as urge builds)
  health: number // 0 to 100
  morale: number // 0 to 100
  caffeine: number // 0 to 100 (hidden)
  sleepDebt: number // 0 to 100 (hidden)
}

export interface AgentNeedsRecord extends AgentNeeds {
  agentId: string
  baseTs: string
  traits: AgentTraits
  state: ActivityKind
  stateUntil?: string | null
  lastMealAt?: string | null
  lastSleepAt?: string | null
  lastGymAt?: string | null
}

export interface TirednessVisualState {
  level: 'energized' | 'normal' | 'tired' | 'exhausted'
  expression: 'alert' | 'typing_slow' | 'yawn_stretch' | 'head_nodding'
  walkSpeedMultiplier: number
  statusIcon:
    | 'sleeping'
    | 'nodding'
    | 'yawn'
    | 'low_energy'
    | 'hungry'
    | 'thirsty'
    | 'cr_urgent'
    | 'healthy'
  description: string
}

export interface AgentPlanRecord {
  id: string
  agentId: string
  kind: ActivityKind
  plannedStart: string
  plannedEnd: string
  reason: string
  source: PlanSource
  approvalId?: string | null
  status: PlanStatus
  createdAt: string
}

export interface BreakRequestRecord {
  id: string
  agentId: string
  kind: 'rest' | 'meal' | 'coffee' | 'cr' | 'gym' | 'walk'
  reason: string
  requestedAt: string
  status: 'pending' | 'approved' | 'denied' | 'cancelled' | 'expired'
  decidedBy?: string | null
  decidedAt?: string | null
  createdAt: string
}

export interface AgentActivityLogRecord {
  id: string
  ts: string
  tsPht: string
  agentId: string
  kind: ActivityKind
  phase: ActivityPhase
  reason: string
  decidedBy: DecidedBy
  planId?: string | null
  approvalId?: string | null
  needsBefore?: Partial<AgentNeeds> | null
  needsAfter?: Partial<AgentNeeds> | null
  durationS: number
  demo: boolean
}

export interface NeedsRatesConfig {
  energyDrainWorkPerHr: number
  energyDrainIdlePerHr: number
  energyRestoreNapPerHr: number
  energyRestoreSleepPerHr: number
  hungerGrowPerHr: number
  thirstGrowPerHr: number
  bladderFillPerHr: number
  caffeineDecayPerHr: number
  sleepDebtAccrualPerHr: number
}

export interface NeedsThresholdsConfig {
  energyCritical: number
  energyLow: number
  hungerCritical: number
  hungerHungry: number
  thirstCritical: number
  thirstThirsty: number
  bladderUrgent: number
  moraleLow: number
}

export const DEFAULT_NEEDS_RATES: NeedsRatesConfig = {
  energyDrainWorkPerHr: 7.5,
  energyDrainIdlePerHr: 3.0,
  energyRestoreNapPerHr: 35.0,
  energyRestoreSleepPerHr: 20.0,
  hungerGrowPerHr: 8.0,
  thirstGrowPerHr: 10.0,
  bladderFillPerHr: 9.0,
  caffeineDecayPerHr: 25.0,
  sleepDebtAccrualPerHr: 8.0,
}

export const DEFAULT_NEEDS_THRESHOLDS: NeedsThresholdsConfig = {
  energyCritical: 20.0,
  energyLow: 35.0,
  hungerCritical: 20.0,
  hungerHungry: 40.0,
  thirstCritical: 20.0,
  thirstThirsty: 40.0,
  bladderUrgent: 25.0,
  moraleLow: 35.0,
}

/**
 * Deterministically generates immutable per-agent traits from the agent ID string.
 */
export function generateAgentTraits(agentId: string): AgentTraits {
  const cleanId = agentId.toLowerCase().trim()
  let hash = 0
  for (let i = 0; i < cleanId.length; i++) {
    hash = (hash * 31 + cleanId.charCodeAt(i)) >>> 0
  }

  const metaOptions: AgentTraits['metabolism'][] = ['fast', 'normal', 'slow']
  const sleepOptions: AgentTraits['sleepiness'][] = [
    'early_bird',
    'night_owl',
    'balanced',
  ]

  const metabolism = metaOptions[hash % 3]
  const sleepiness = sleepOptions[(hash >>> 2) % 3]
  const gymLover = (hash & 1) === 0
  const caffeineSensitivity = 0.85 + (((hash >>> 4) % 7) * 0.05) // 0.85 to 1.15
  const bladderCapacity = 0.85 + (((hash >>> 7) % 7) * 0.05) // 0.85 to 1.15

  return {
    metabolism,
    sleepiness,
    gymLover,
    caffeineSensitivity: Number(caffeineSensitivity.toFixed(2)),
    bladderCapacity: Number(bladderCapacity.toFixed(2)),
  }
}

/**
 * Calculates circadian multiplier based on PHT solar decimal hour and agent sleepiness trait.
 * Peaks mid-morning (09:00 - 11:30), post-lunch dip (13:00 - 15:00), low late night (22:00 - 06:00).
 */
export function getCircadianEnergyMultiplier(
  decimalPhtHour: number,
  sleepiness: AgentTraits['sleepiness'] = 'balanced'
): number {
  // Normalize hour into 0 - 24 range
  const h = ((decimalPhtHour % 24) + 24) % 24

  // Trait hour shift: early birds peak ~1hr earlier, night owls peak ~2hrs later
  let shift = 0
  if (sleepiness === 'early_bird') shift = -1.0
  if (sleepiness === 'night_owl') shift = 1.8
  const adjHour = ((h - shift + 24) % 24)

  // Mid-morning peak: 09:00 - 11:30
  if (adjHour >= 9.0 && adjHour <= 11.5) {
    return 1.18
  }

  // Early afternoon post-lunch dip: 13:00 - 15:00
  if (adjHour >= 13.0 && adjHour <= 15.0) {
    const dipFactor = Math.sin(((adjHour - 13.0) / 2.0) * Math.PI)
    return 0.78 - dipFactor * 0.08 // Drops to ~0.70 at 14:00
  }

  // Late afternoon / early evening second wind: 15.5 - 19.0
  if (adjHour >= 15.5 && adjHour <= 19.0) {
    return 1.05
  }

  // Night rest window: 22:00 - 06:00
  if (adjHour >= 22.0 || adjHour < 6.0) {
    const nightDist = adjHour >= 22.0 ? adjHour - 22.0 : adjHour + 2.0
    const sleepDip = Math.sin((nightDist / 8.0) * Math.PI)
    return 0.55 - sleepDip * 0.15 // Drops to ~0.40 between 02:00 - 04:00
  }

  // Default normal waking baseline
  return 1.0
}

/**
 * Computes current needs deterministically from a base snapshot and elapsed real time.
 */
export function computeCurrentNeeds(
  base: AgentNeedsRecord,
  now: Date = new Date(),
  overrideState?: ActivityKind,
  rates: NeedsRatesConfig = DEFAULT_NEEDS_RATES
): AgentNeeds {
  const baseDate = new Date(base.baseTs)
  const elapsedMs = Math.max(0, now.getTime() - baseDate.getTime())
  const elapsedHours = elapsedMs / 3600000.0

  const phtParts = getPHTParts(now)
  const circadian = getCircadianEnergyMultiplier(
    phtParts.decimalHour,
    base.traits.sleepiness
  )

  const activeState = overrideState || base.state

  // Trait multipliers
  const metaMult =
    base.traits.metabolism === 'fast'
      ? 1.25
      : base.traits.metabolism === 'slow'
        ? 0.8
        : 1.0
  const bladderMult = 1.0 / (base.traits.bladderCapacity || 1.0)
  const caffeineMult = base.traits.caffeineSensitivity || 1.0

  // 1. Caffeine boost & crash curve
  const currentCaffeine = Math.max(
    0,
    base.caffeine - elapsedHours * rates.caffeineDecayPerHr
  )
  const caffeineEffective = currentCaffeine * caffeineMult
  let caffeineEnergyBoost = 0
  let caffeineEnergyCrash = 0
  if (caffeineEffective > 0) {
    // Sharp rise peaking around 30 min, decay into crash after 2 hours
    if (elapsedHours < 2.0) {
      caffeineEnergyBoost = caffeineEffective * 0.25 * Math.sin((elapsedHours / 2.0) * Math.PI)
    } else {
      caffeineEnergyCrash = Math.min(15, (elapsedHours - 2.0) * 4.0)
    }
  }

  // 2. Sleep Debt Accrual & Relief
  let currentSleepDebt = base.sleepDebt
  if (activeState === 'sleep' || activeState === 'nap') {
    const reliefRate = activeState === 'sleep' ? 25.0 : 40.0
    currentSleepDebt = Math.max(0, base.sleepDebt - elapsedHours * reliefRate)
  } else {
    // Sleep debt grows if awake past night rest start (22:00)
    if (phtParts.decimalHour >= 22.0 || phtParts.decimalHour < 6.0) {
      currentSleepDebt = Math.min(
        100,
        base.sleepDebt + elapsedHours * rates.sleepDebtAccrualPerHr
      )
    }
  }

  // 3. Energy Computation
  let rawEnergy = base.energy
  if (activeState === 'nap') {
    rawEnergy += elapsedHours * rates.energyRestoreNapPerHr
  } else if (activeState === 'sleep') {
    rawEnergy += elapsedHours * rates.energyRestoreSleepPerHr
  } else if (activeState === 'work') {
    rawEnergy -= elapsedHours * rates.energyDrainWorkPerHr * metaMult
  } else if (activeState === 'gym') {
    // Gym drains short-term energy but builds morale & health
    rawEnergy -= elapsedHours * rates.energyDrainWorkPerHr * 1.6
  } else {
    // Idle, coffee, social, eat
    rawEnergy -= elapsedHours * rates.energyDrainIdlePerHr * metaMult
  }

  // Apply circadian scaling, caffeine modulation, and sleep debt drag
  const sleepDebtPenalty = (currentSleepDebt / 100.0) * 22.0
  let netEnergy = (rawEnergy + caffeineEnergyBoost - caffeineEnergyCrash) * circadian - sleepDebtPenalty
  netEnergy = Math.max(0, Math.min(100, Math.round(netEnergy * 10) / 10))

  // 4. Hunger (100 = full)
  let rawHunger = base.hunger
  if (activeState === 'eat') {
    rawHunger += elapsedHours * 75.0 // Restores quickly while eating
  } else {
    rawHunger -= elapsedHours * rates.hungerGrowPerHr * metaMult
  }
  const netHunger = Math.max(0, Math.min(100, Math.round(rawHunger * 10) / 10))

  // 5. Thirst (100 = hydrated)
  let rawThirst = base.thirst
  if (activeState === 'drink') {
    rawThirst += elapsedHours * 90.0
  } else if (activeState === 'coffee') {
    // Coffee hydrates slightly initially but acts as mild diuretic
    rawThirst += elapsedHours * 20.0 - elapsedHours * 8.0
  } else {
    rawThirst -= elapsedHours * rates.thirstGrowPerHr * metaMult
  }
  const netThirst = Math.max(0, Math.min(100, Math.round(rawThirst * 10) / 10))

  // 6. Bladder (100 = empty/comfortable, drops towards 0 as urge builds)
  let rawBladder = base.bladder
  if (activeState === 'cr') {
    rawBladder += elapsedHours * 160.0 // Instant relief in CR
  } else {
    let fillRate = rates.bladderFillPerHr * bladderMult
    if (activeState === 'drink') fillRate *= 2.2
    if (activeState === 'coffee') fillRate *= 2.8 // Caffeine increases bladder urge
    rawBladder -= elapsedHours * fillRate
  }
  const netBladder = Math.max(0, Math.min(100, Math.round(rawBladder * 10) / 10))

  // 7. Health & Morale
  let netHealth = base.health
  let netMorale = base.morale

  // Long starving or severe dehydration lowers health
  if (netHunger < 15.0 || netThirst < 15.0) {
    netHealth -= elapsedHours * 4.0
  }
  if (activeState === 'gym') {
    netHealth += elapsedHours * 2.0
    netMorale += elapsedHours * 6.0
  }
  if (activeState === 'lounge' || activeState === 'social') {
    netMorale += elapsedHours * 8.0
  }
  if (activeState === 'work' && elapsedHours > 3.0) {
    // Long uninterrupted work fatigue
    netMorale -= (elapsedHours - 3.0) * 3.0
  }

  netHealth = Math.max(0, Math.min(100, Math.round(netHealth * 10) / 10))
  netMorale = Math.max(0, Math.min(100, Math.round(netMorale * 10) / 10))

  return {
    energy: netEnergy,
    hunger: netHunger,
    thirst: netThirst,
    bladder: netBladder,
    health: netHealth,
    morale: netMorale,
    caffeine: Math.round(currentCaffeine * 10) / 10,
    sleepDebt: Math.round(currentSleepDebt * 10) / 10,
  }
}

/**
 * Derives visible tiredness level and behavioral expressions for 3D/2D animation loops.
 */
export function getTirednessVisualState(needs: AgentNeeds): TirednessVisualState {
  if (needs.energy < 15.0) {
    return {
      level: 'exhausted',
      expression: 'head_nodding',
      walkSpeedMultiplier: 0.65,
      statusIcon: 'nodding',
      description: 'Critically exhausted, head nodding at workstation desk',
    }
  }

  if (needs.energy < 32.0) {
    return {
      level: 'tired',
      expression: 'yawn_stretch',
      walkSpeedMultiplier: 0.85,
      statusIcon: 'yawn',
      description: 'Fatigued, periodic yawning and arm stretching',
    }
  }

  if (needs.energy < 45.0) {
    return {
      level: 'tired',
      expression: 'typing_slow',
      walkSpeedMultiplier: 0.92,
      statusIcon: 'low_energy',
      description: 'Mildly fatigued, slowed cadence',
    }
  }

  if (needs.bladder < 25.0) {
    return {
      level: 'normal',
      expression: 'alert',
      walkSpeedMultiplier: 1.15, // Walking briskly to CR
      statusIcon: 'cr_urgent',
      description: 'Urgent comfort room need',
    }
  }

  if (needs.thirst < 30.0) {
    return {
      level: 'normal',
      expression: 'alert',
      walkSpeedMultiplier: 0.95,
      statusIcon: 'thirsty',
      description: 'Parched, hydration needed',
    }
  }

  if (needs.hunger < 30.0) {
    return {
      level: 'normal',
      expression: 'alert',
      walkSpeedMultiplier: 0.95,
      statusIcon: 'hungry',
      description: 'Hungry, cafeteria meal window approaching',
    }
  }

  return {
    level: 'energized',
    expression: 'alert',
    walkSpeedMultiplier: 1.0,
    statusIcon: 'healthy',
    description: 'Active, high focus and sustained morale',
  }
}

/**
 * Evaluates current needs and real PHT clock to derive the agent's NEXT action plan item.
 */
export function evaluateNextAction(
  agentId: string,
  needs: AgentNeeds,
  currentPlan: AgentPlanRecord | null,
  now: Date = new Date()
): {
  nextKind: ActivityKind
  reason: string
  shouldRequestBreak: boolean
  breakKind?: BreakRequestRecord['kind']
} {
  const pht = getPHTParts(now)
  const h = pht.decimalHour

  // 1. Critical Bladder Urgency (< 25)
  if (needs.bladder <= 25.0) {
    return {
      nextKind: 'cr',
      reason: `Comfort room visit: bladder urge acute (${Math.round(100 - needs.bladder)}% capacity)`,
      shouldRequestBreak: true,
      breakKind: 'cr',
    }
  }

  // 2. Critical Thirst (< 30)
  if (needs.thirst <= 30.0) {
    return {
      nextKind: 'drink',
      reason: `Hydration stop: thirst level at ${needs.thirst}% (refill at dispenser)`,
      shouldRequestBreak: false,
    }
  }

  // 3. Critical Energy (< 20) -> Rest/Sleep Break
  if (needs.energy <= 20.0) {
    const isNight = h >= 22.0 || h < 6.0
    const kind = isNight ? 'sleep' : 'nap'
    return {
      nextKind: kind,
      reason: `${isNight ? 'Sleep window' : 'Recharge nap'}: energy low (${needs.energy}%), sleep debt ${needs.sleepDebt}%`,
      shouldRequestBreak: true,
      breakKind: 'rest',
    }
  }

  // 4. Meal windows (Lunch 11:45 - 13:30, Dinner 18:30 - 20:00) or Hunger (< 35)
  const isLunchWindow = h >= 11.75 && h <= 13.5
  const isDinnerWindow = h >= 18.5 && h <= 20.0
  if (needs.hunger <= 35.0 || (isLunchWindow && needs.hunger <= 55.0)) {
    return {
      nextKind: 'eat',
      reason: `Cafeteria meal: ${isLunchWindow ? 'lunch window' : 'hunger calibration'} and hunger at ${needs.hunger}%`,
      shouldRequestBreak: true,
      breakKind: 'meal',
    }
  }

  if (isDinnerWindow && needs.hunger <= 60.0) {
    return {
      nextKind: 'eat',
      reason: `Cafeteria dinner: evening meal window, hunger ${needs.hunger}%`,
      shouldRequestBreak: true,
      breakKind: 'meal',
    }
  }

  // 5. Afternoon Coffee Boost (13:30 - 15:30 post-lunch dip) or Coffee need
  if (h >= 13.5 && h <= 15.5 && needs.energy < 50.0 && needs.caffeine < 20.0) {
    return {
      nextKind: 'coffee',
      reason: `Afternoon coffee break at Pantry: post-lunch dip counter (energy ${needs.energy}%)`,
      shouldRequestBreak: true,
      breakKind: 'coffee',
    }
  }

  // 6. Gym / Fitness session (late afternoon 16:30 - 18:30 for gym lovers)
  const traits = generateAgentTraits(agentId)
  if (traits.gymLover && h >= 16.5 && h <= 18.5 && needs.energy > 40.0) {
    return {
      nextKind: 'gym',
      reason: `Fitness workout at Campus Gym: daily physical conditioning and morale booster`,
      shouldRequestBreak: true,
      breakKind: 'gym',
    }
  }

  // 7. Corridor walk recharge or mental break if morale is sagging
  if (needs.morale <= 40.0) {
    return {
      nextKind: 'walk_break',
      reason: `Corridor walk: mental refresh and morale reset (${needs.morale}%)`,
      shouldRequestBreak: true,
      breakKind: 'walk',
    }
  }

  // Default: sustained workstation focus
  return {
    nextKind: 'work',
    reason: `Sustained focus work: nominal vital reserves (energy ${needs.energy}%, morale ${needs.morale}%)`,
    shouldRequestBreak: false,
  }
}

/**
 * Formats an activity log record into a concise, readable one-liner.
 * Example: "5:22 PM PHT · Christian · EAT · started · reason: lunch window, hunger 31% · decided by Jarvis plan (approved by Josiah)"
 */
export function formatActivityLogLine(entry: AgentActivityLogRecord): string {
  const parts: string[] = [
    entry.tsPht || 'PHT',
    entry.agentId.toUpperCase(),
    entry.kind.toUpperCase(),
    entry.phase,
    `reason: ${entry.reason}`,
    `decided by ${entry.decidedBy}`,
  ]
  return parts.join(' · ')
}

/**
 * Generates RFC 4180 compliant CSV export for agent activity logs.
 */
export function exportActivityLogToCSV(logs: AgentActivityLogRecord[]): string {
  const header = [
    'ID',
    'Timestamp (UTC)',
    'Time (PHT)',
    'Agent ID',
    'Activity Kind',
    'Phase',
    'Reason',
    'Decided By',
    'Duration (s)',
    'Demo Mode',
  ].join(',')

  const rows = logs.map((log) => {
    const sanitize = (val: string | number | boolean | undefined | null) => {
      const str = String(val ?? '').replace(/"/g, '""')
      return `"${str}"`
    }
    return [
      sanitize(log.id),
      sanitize(log.ts),
      sanitize(log.tsPht),
      sanitize(log.agentId),
      sanitize(log.kind),
      sanitize(log.phase),
      sanitize(log.reason),
      sanitize(log.decidedBy),
      log.durationS ?? 0,
      log.demo ? 'TRUE' : 'FALSE',
    ].join(',')
  })

  return [header, ...rows].join('\n')
}

/**
 * Singleton In-Memory + Supabase Synchronizer for Agent Needs & Plans
 */
class AgentNeedsManager {
  private cache: Map<string, AgentNeedsRecord> = new Map()
  private plans: Map<string, AgentPlanRecord> = new Map()
  private activityLogs: AgentActivityLogRecord[] = []
  private breakRequests: BreakRequestRecord[] = []

  constructor() {
    this.seedDefaultFallback()
  }

  private seedDefaultFallback() {
    const defaultIds = [
      'boss',
      'cleaner_1',
      'cleaner_2',
      'josiah',
      'gian',
      'arwin',
      'blaze',
      'bonnie',
      'christian',
      'john_arvy',
      'john_lloyd',
      'mar',
      'mary_grace',
      'roy_jhan',
      'anthony',
      'keiru',
      'nelmar',
      'khent',
      'jb',
      'ryan',
      'gloria',
      'jesmar',
      'julian',
      'jo_vincent',
      'gabriel',
      'kin',
      'ferwin',
    ]

    const now = new Date()
    const pht = getPHTParts(now)
    const phtStr = `${pht.hour % 12 || 12}:${pht.minute.toString().padStart(2, '0')} ${pht.hour >= 12 ? 'PM' : 'AM'} PHT`

    for (const id of defaultIds) {
      const traits = generateAgentTraits(id)
      const record: AgentNeedsRecord = {
        agentId: id,
        energy: 82.0,
        hunger: 78.0,
        thirst: 85.0,
        bladder: 90.0,
        health: 96.0,
        morale: 88.0,
        caffeine: 0.0,
        sleepDebt: 5.0,
        baseTs: now.toISOString(),
        traits,
        state: 'work',
      }
      this.cache.set(id, record)

      const plan: AgentPlanRecord = {
        id: `plan_${id}_init`,
        agentId: id,
        kind: id === 'boss' ? 'social' : 'eat',
        plannedStart: new Date(now.getTime() + 1800000).toISOString(),
        plannedEnd: new Date(now.getTime() + 3600000).toISOString(),
        reason:
          id === 'boss'
            ? 'Department synchronization & cross-team performance review'
            : 'Scheduled cafeteria lunch wave (hunger 78%)',
        source: 'needs',
        status: 'planned',
        createdAt: now.toISOString(),
      }
      this.plans.set(id, plan)

      this.activityLogs.push({
        id: `act_${id}_0`,
        ts: now.toISOString(),
        tsPht: phtStr,
        agentId: id,
        kind: 'work',
        phase: 'started',
        reason: 'Autonomous engineering execution & system operations',
        decidedBy: 'needs engine',
        durationS: 1800,
        demo: false,
      })
    }
  }

  public getNeedsRecord(agentId: string, now: Date = new Date()): AgentNeedsRecord {
    let rec = this.cache.get(agentId)
    if (!rec) {
      rec = {
        agentId,
        energy: 80.0,
        hunger: 80.0,
        thirst: 80.0,
        bladder: 90.0,
        health: 95.0,
        morale: 85.0,
        caffeine: 0.0,
        sleepDebt: 0.0,
        baseTs: now.toISOString(),
        traits: generateAgentTraits(agentId),
        state: 'work',
      }
      this.cache.set(agentId, rec)
    }
    return rec
  }

  public getDeterministicNeeds(agentId: string): AgentNeeds {
    const fixedNow = new Date('2026-11-12T12:00:00Z')
    const rec = this.getNeedsRecord(agentId, fixedNow)
    return computeCurrentNeeds(rec, fixedNow)
  }

  public getCurrentNeeds(agentId: string, now: Date = new Date()): AgentNeeds {
    const rec = this.getNeedsRecord(agentId, now)
    return computeCurrentNeeds(rec, now)
  }

  public getAgentNeeds(agentId: string, now: Date = new Date()): AgentNeeds & { state: ActivityKind } {
    const rec = this.getNeedsRecord(agentId, now)
    const current = computeCurrentNeeds(rec, now)
    return {
      ...current,
      state: rec.state,
    }
  }

  public getPlan(agentId: string): AgentPlanRecord | null {
    return this.plans.get(agentId) || null
  }

  public evaluateNextAction(agentId: string, now: Date = new Date()) {
    const current = this.getCurrentNeeds(agentId, now)
    const plan = this.getPlan(agentId)
    const res = evaluateNextAction(agentId, current, plan, now)
    return {
      kind: res.nextKind,
      reason: res.reason,
      shouldRequestBreak: res.shouldRequestBreak,
      breakKind: res.breakKind,
    }
  }

  public setPlan(plan: AgentPlanRecord) {
    this.plans.set(plan.agentId, plan)
  }

  public recordActivityLog(params: {
    agentId: string
    kind: ActivityKind
    phase: ActivityPhase
    reason: string
    decidedBy: DecidedBy
    durationS?: number
  }) {
    const now = new Date()
    const pht = getPHTParts(now)
    const phtStr = `${pht.hour % 12 || 12}:${pht.minute.toString().padStart(2, '0')} ${pht.hour >= 12 ? 'PM' : 'AM'} PHT`
    const current = this.getCurrentNeeds(params.agentId, now)

    const logEntry: AgentActivityLogRecord = {
      id: `act_${Date.now()}_${params.agentId}`,
      ts: now.toISOString(),
      tsPht: phtStr,
      agentId: params.agentId,
      kind: params.kind,
      phase: params.phase,
      reason: params.reason,
      decidedBy: params.decidedBy,
      needsBefore: { ...current },
      needsAfter: { ...current },
      durationS: params.durationS || 0,
      demo: false,
    }
    this.addActivityLog(logEntry)
  }

  public addActivityLog(log: AgentActivityLogRecord) {
    this.activityLogs.unshift(log)
    if (this.activityLogs.length > 500) {
      this.activityLogs.pop()
    }
  }

  public getActivityLogs(filter?: {
    agentId?: string
    kind?: ActivityKind
    phase?: ActivityPhase
    search?: string
  }): AgentActivityLogRecord[] {
    let result = [...this.activityLogs]
    if (!filter) return result

    if (filter.agentId && filter.agentId !== 'ALL') {
      result = result.filter((l) => l.agentId === filter.agentId)
    }
    if (filter.kind) {
      result = result.filter((l) => l.kind === filter.kind)
    }
    if (filter.phase) {
      result = result.filter((l) => l.phase === filter.phase)
    }
    if (filter.search && filter.search.trim()) {
      const q = filter.search.toLowerCase()
      result = result.filter(
        (l) =>
          l.agentId.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q) ||
          l.kind.toLowerCase().includes(q)
      )
    }
    return result
  }

  public async syncFromSupabase(agentId?: string): Promise<void> {
    try {
      const client = officeSupabase.getClient()
      if (agentId) {
        const { data } = await client
          .from('office_agent_needs')
          .select('*')
          .eq('agent_id', agentId)
          .maybeSingle()
        if (data) {
          this.cache.set(agentId, {
            agentId: data.agent_id,
            energy: data.energy,
            hunger: data.hunger,
            thirst: data.thirst,
            bladder: data.bladder,
            health: data.health,
            morale: data.morale,
            caffeine: data.caffeine,
            sleepDebt: data.sleep_debt,
            baseTs: data.base_ts,
            traits: data.traits || generateAgentTraits(agentId),
            state: data.state as ActivityKind,
            stateUntil: data.state_until,
            lastMealAt: data.last_meal_at,
            lastSleepAt: data.last_sleep_at,
            lastGymAt: data.last_gym_at,
          })
        }
      } else {
        const { data } = await client.from('office_agent_needs').select('*')
        if (data && Array.isArray(data)) {
          for (const row of data) {
            this.cache.set(row.agent_id, {
              agentId: row.agent_id,
              energy: row.energy,
              hunger: row.hunger,
              thirst: row.thirst,
              bladder: row.bladder,
              health: row.health,
              morale: row.morale,
              caffeine: row.caffeine,
              sleepDebt: row.sleep_debt,
              baseTs: row.base_ts,
              traits: row.traits || generateAgentTraits(row.agent_id),
              state: row.state as ActivityKind,
              stateUntil: row.state_until,
              lastMealAt: row.last_meal_at,
              lastSleepAt: row.last_sleep_at,
              lastGymAt: row.last_gym_at,
            })
          }
        }
      }
    } catch {
      // Graceful fallback to cached memory
    }
  }

  public async updateAgentState(
    agentId: string,
    newState: ActivityKind,
    reason: string,
    decidedBy: DecidedBy = 'needs engine'
  ): Promise<AgentNeeds> {
    const now = new Date()
    const current = this.getCurrentNeeds(agentId, now)
    const rec = this.getNeedsRecord(agentId, now)

    const updatedRecord: AgentNeedsRecord = {
      ...rec,
      ...current,
      baseTs: now.toISOString(),
      state: newState,
    }
    this.cache.set(agentId, updatedRecord)

    const pht = getPHTParts(now)
    const phtStr = `${pht.hour % 12 || 12}:${pht.minute.toString().padStart(2, '0')} ${pht.hour >= 12 ? 'PM' : 'AM'} PHT`

    const logEntry: AgentActivityLogRecord = {
      id: `act_${Date.now()}_${agentId}`,
      ts: now.toISOString(),
      tsPht: phtStr,
      agentId,
      kind: newState,
      phase: 'started',
      reason,
      decidedBy,
      needsBefore: { ...current },
      needsAfter: { ...current },
      durationS: 0,
      demo: false,
    }
    this.addActivityLog(logEntry)

    // Asynchronously persist to Supabase if available
    try {
      const client = officeSupabase.getClient()
      await client.from('office_agent_needs').upsert({
        agent_id: agentId,
        energy: current.energy,
        hunger: current.hunger,
        thirst: current.thirst,
        bladder: current.bladder,
        health: current.health,
        morale: current.morale,
        caffeine: current.caffeine,
        sleep_debt: current.sleepDebt,
        base_ts: now.toISOString(),
        state: newState,
        updated_at: now.toISOString(),
      })

      await client.from('office_agent_activity_log').insert({
        ts: now.toISOString(),
        ts_pht: phtStr,
        agent_id: agentId,
        kind: newState,
        phase: 'started',
        reason,
        decided_by: decidedBy,
        needs_before: current,
        duration_s: 0,
        demo: false,
      })
    } catch {
      // Ignore background persistence failure
    }

    return current
  }
}

export const needsManager = new AgentNeedsManager()
