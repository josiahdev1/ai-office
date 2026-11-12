import { describe, it, expect } from 'vitest'
import {
  generateAgentTraits,
  getCircadianEnergyMultiplier,
  computeCurrentNeeds,
  getTirednessVisualState,
  evaluateNextAction,
  formatActivityLogLine,
  exportActivityLogToCSV,
  needsManager,
  AgentNeedsRecord,
} from '../src/lib/office/needsEngine'

describe('Agent Needs Engine & Dynamics (Phase K3)', () => {
  it('generates consistent and deterministic traits from agent ID', () => {
    const traits1 = generateAgentTraits('christian')
    const traits2 = generateAgentTraits('christian')
    const traitsOther = generateAgentTraits('gian')

    expect(traits1).toEqual(traits2)
    expect(traitsOther).toBeDefined()
    expect(['fast', 'normal', 'slow']).toContain(traits1.metabolism)
    expect(['early_bird', 'night_owl', 'balanced']).toContain(traits1.sleepiness)
    expect(typeof traits1.gymLover).toBe('boolean')
    expect(traits1.caffeineSensitivity).toBeGreaterThanOrEqual(0.8)
    expect(traits1.caffeineSensitivity).toBeLessThanOrEqual(1.2)

    // Boss agent traits
    const bossTraits = generateAgentTraits('boss')
    expect(bossTraits).toBeDefined()
  })

  it('exhibits realistic circadian rhythm energy multipliers across 24 PHT hours', () => {
    // Alert mid-morning (10:00 AM)
    const morningMult = getCircadianEnergyMultiplier(10.0, 'balanced')
    expect(morningMult).toBeGreaterThanOrEqual(1.1)

    // Post-lunch dip (14:00 / 2:00 PM)
    const postLunchDip = getCircadianEnergyMultiplier(14.0, 'balanced')
    expect(postLunchDip).toBeLessThanOrEqual(0.8)
    expect(postLunchDip).toBeLessThan(morningMult)

    // Late afternoon rebound (17:00 / 5:00 PM)
    const lateAfternoon = getCircadianEnergyMultiplier(17.0, 'balanced')
    expect(lateAfternoon).toBeGreaterThanOrEqual(1.0)

    // Deep night (03:00 AM)
    const deepNight = getCircadianEnergyMultiplier(3.0, 'balanced')
    expect(deepNight).toBeLessThanOrEqual(0.6)
  })

  it('computes needs lazily and deterministically at any read time without divergence', () => {
    const baseDate = new Date('2026-11-12T09:00:00+08:00') // 9:00 AM PHT
    const readDate1 = new Date('2026-11-12T11:00:00+08:00') // 2 hours later
    const readDate2 = new Date('2026-11-12T11:00:00+08:00') // Same timestamp

    const record: AgentNeedsRecord = {
      agentId: 'christian',
      energy: 90.0,
      hunger: 90.0,
      thirst: 90.0,
      bladder: 95.0,
      health: 98.0,
      morale: 90.0,
      caffeine: 0.0,
      sleepDebt: 0.0,
      baseTs: baseDate.toISOString(),
      traits: generateAgentTraits('christian'),
      state: 'work',
    }

    const needs1 = computeCurrentNeeds(record, readDate1)
    const needs2 = computeCurrentNeeds(record, readDate2)

    expect(needs1).toEqual(needs2)
    // After 2 hours of working, hunger, thirst, and bladder should decrease (higher urges)
    expect(needs1.hunger).toBeLessThan(record.hunger)
    expect(needs1.thirst).toBeLessThan(record.thirst)
    expect(needs1.bladder).toBeLessThan(record.bladder)
    expect(needs1.energy).toBeGreaterThan(0)
  })

  it('models caffeine boost and subsequent crash', () => {
    const baseDate = new Date('2026-11-12T13:00:00+08:00')
    const boostTime = new Date('2026-11-12T14:00:00+08:00') // 1 hr after coffee (peak window)
    const crashTime = new Date('2026-11-12T17:00:00+08:00') // 4 hrs after coffee (crash window)

    const recordWithCoffee: AgentNeedsRecord = {
      agentId: 'blaze',
      energy: 50.0,
      hunger: 80.0,
      thirst: 80.0,
      bladder: 85.0,
      health: 95.0,
      morale: 80.0,
      caffeine: 80.0, // Just had double espresso
      sleepDebt: 5.0,
      baseTs: baseDate.toISOString(),
      traits: {
        metabolism: 'normal',
        sleepiness: 'balanced',
        gymLover: false,
        caffeineSensitivity: 1.0,
        bladderCapacity: 1.0,
      },
      state: 'work',
    }

    const boosted = computeCurrentNeeds(recordWithCoffee, boostTime)
    const crashed = computeCurrentNeeds(recordWithCoffee, crashTime)

    // During crash, caffeine decayed significantly
    expect(crashed.caffeine).toBeLessThan(boosted.caffeine)
    expect(crashed.energy).toBeLessThan(boosted.energy)
  })

  it('accumulates sleep debt during late night and discharges it during rest', () => {
    const nightStart = new Date('2026-11-12T22:00:00+08:00')
    const lateNight = new Date('2026-11-13T02:00:00+08:00') // 4 hours awake past night rest

    const awakeRecord: AgentNeedsRecord = {
      agentId: 'john_arvy',
      energy: 60.0,
      hunger: 70.0,
      thirst: 70.0,
      bladder: 80.0,
      health: 90.0,
      morale: 80.0,
      caffeine: 0.0,
      sleepDebt: 10.0,
      baseTs: nightStart.toISOString(),
      traits: generateAgentTraits('john_arvy'),
      state: 'work',
    }

    const lateAwake = computeCurrentNeeds(awakeRecord, lateNight)
    expect(lateAwake.sleepDebt).toBeGreaterThan(awakeRecord.sleepDebt)

    // Now test nap/sleep discharge
    const sleepRecord: AgentNeedsRecord = {
      ...awakeRecord,
      sleepDebt: 50.0,
      state: 'sleep',
    }
    const slept = computeCurrentNeeds(sleepRecord, lateNight)
    expect(slept.sleepDebt).toBeLessThan(sleepRecord.sleepDebt)
  })

  it('derives visible tiredness states and status icons', () => {
    const freshState = getTirednessVisualState({
      energy: 90,
      hunger: 85,
      thirst: 85,
      bladder: 90,
      health: 95,
      morale: 90,
      caffeine: 0,
      sleepDebt: 0,
    })
    expect(freshState.level).toBe('energized')
    expect(freshState.walkSpeedMultiplier).toBe(1.0)
    expect(freshState.statusIcon).toBe('healthy')

    const tiredState = getTirednessVisualState({
      energy: 28,
      hunger: 70,
      thirst: 70,
      bladder: 80,
      health: 90,
      morale: 75,
      caffeine: 0,
      sleepDebt: 20,
    })
    expect(tiredState.level).toBe('tired')
    expect(tiredState.expression).toBe('yawn_stretch')
    expect(tiredState.walkSpeedMultiplier).toBeLessThan(1.0)

    const exhaustedState = getTirednessVisualState({
      energy: 12,
      hunger: 50,
      thirst: 50,
      bladder: 80,
      health: 85,
      morale: 60,
      caffeine: 0,
      sleepDebt: 45,
    })
    expect(exhaustedState.level).toBe('exhausted')
    expect(exhaustedState.expression).toBe('head_nodding')
    expect(exhaustedState.walkSpeedMultiplier).toBe(0.65)
    expect(exhaustedState.statusIcon).toBe('nodding')
  })

  it('triggers break requests and generates intelligent next plan actions based on thresholds', () => {
    const noonTime = new Date('2026-11-12T12:15:00+08:00') // Lunch window

    const hungryAgentNeeds = {
      energy: 70,
      hunger: 32, // Hungry
      thirst: 65,
      bladder: 85,
      health: 95,
      morale: 80,
      caffeine: 0,
      sleepDebt: 5,
    }

    const decision = evaluateNextAction('arwin', hungryAgentNeeds, null, noonTime)
    expect(decision.nextKind).toBe('eat')
    expect(decision.shouldRequestBreak).toBe(true)
    expect(decision.breakKind).toBe('meal')
    expect(decision.reason).toContain('Cafeteria meal')

    // Low energy triggers nap / sleep break request
    const tiredNeeds = {
      energy: 18, // Critical energy
      hunger: 80,
      thirst: 80,
      bladder: 90,
      health: 95,
      morale: 70,
      caffeine: 0,
      sleepDebt: 30,
    }
    const restDecision = evaluateNextAction('arwin', tiredNeeds, null, noonTime)
    expect(restDecision.nextKind).toBe('nap')
    expect(restDecision.shouldRequestBreak).toBe(true)
    expect(restDecision.breakKind).toBe('rest')

    // Urgent bladder triggers CR trip
    const crNeeds = {
      energy: 75,
      hunger: 80,
      thirst: 80,
      bladder: 20, // Critical urge
      health: 95,
      morale: 75,
      caffeine: 0,
      sleepDebt: 0,
    }
    const crDecision = evaluateNextAction('arwin', crNeeds, null, noonTime)
    expect(crDecision.nextKind).toBe('cr')
    expect(crDecision.shouldRequestBreak).toBe(true)
  })

  it('formats readable activity log lines and exports to CSV', () => {
    const logLine = formatActivityLogLine({
      id: 'act_1',
      ts: '2026-11-12T17:22:00+08:00',
      tsPht: '5:22 PM PHT',
      agentId: 'christian',
      kind: 'eat',
      phase: 'started',
      reason: 'lunch window, hunger 31%',
      decidedBy: 'jarvis',
      durationS: 1200,
      demo: false,
    })

    expect(logLine).toContain('5:22 PM PHT')
    expect(logLine).toContain('CHRISTIAN')
    expect(logLine).toContain('EAT')
    expect(logLine).toContain('reason: lunch window, hunger 31%')
    expect(logLine).toContain('decided by jarvis')

    const csv = exportActivityLogToCSV([
      {
        id: 'act_1',
        ts: '2026-11-12T09:22:00Z',
        tsPht: '5:22 PM PHT',
        agentId: 'christian',
        kind: 'eat',
        phase: 'started',
        reason: 'lunch window, hunger 31%',
        decidedBy: 'jarvis',
        durationS: 1200,
        demo: false,
      },
    ])

    expect(csv).toContain('Timestamp (UTC)')
    expect(csv).toContain('"christian"')
    expect(csv).toContain('"lunch window, hunger 31%"')
  })

  it('supports needsManager singleton caching and state updates', async () => {
    const current = needsManager.getCurrentNeeds('boss')
    expect(current).toBeDefined()
    expect(current.energy).toBeGreaterThanOrEqual(0)
    expect(current.energy).toBeLessThanOrEqual(100)

    const updated = await needsManager.updateAgentState(
      'boss',
      'social',
      'Briefing department leads beside THE BRAIN',
      'boss'
    )
    expect(updated).toBeDefined()

    const logs = needsManager.getActivityLogs({ agentId: 'boss' })
    expect(logs.length).toBeGreaterThanOrEqual(1)
    expect(logs[0].kind).toBe('social')
  })
})
