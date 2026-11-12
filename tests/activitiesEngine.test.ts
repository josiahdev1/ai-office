import { describe, it, expect, beforeEach } from 'vitest'
import {
  ActivitySlotManager,
  deriveCampusLiveCounters,
  getAgentStatusIcon,
} from '../src/lib/office/activitiesEngine'

describe('Office Activities Engine (Phase K4)', () => {
  let slotManager: ActivitySlotManager

  beforeEach(() => {
    slotManager = new ActivitySlotManager()
  })

  it('provisions all 8 beds, 6 CR stalls, 24 dining chairs, and 6 water dispensers', () => {
    const beds = slotManager.getSlotsByKind('bed')
    const stalls = slotManager.getSlotsByKind('cr_stall')
    const seats = slotManager.getSlotsByKind('dining_chair')
    const dispensers = slotManager.getSlotsByKind('water_dispenser')

    expect(beds).toHaveLength(8)
    expect(stalls).toHaveLength(6)
    expect(seats).toHaveLength(24)
    expect(dispensers).toHaveLength(6)

    // Verify all approach coordinates are valid numbers without NaN
    for (const slot of slotManager.getSlots()) {
      expect(Number.isFinite(slot.position[0])).toBe(true)
      expect(Number.isFinite(slot.position[1])).toBe(true)
      expect(Number.isFinite(slot.position[2])).toBe(true)
    }
  })

  it('prevents double-booking and enqueues agents when capacity is reached', () => {
    // Fill all 8 nap beds
    for (let i = 1; i <= 8; i++) {
      const res = slotManager.reserveSlot('bed', `agent_${i}`)
      expect(res.success).toBe(true)
      expect(res.slot).toBeDefined()
    }

    // 9th agent attempting to reserve a bed should be enqueued at position 1
    const overbookedRes = slotManager.reserveSlot('bed', 'agent_9')
    expect(overbookedRes.success).toBe(false)
    expect(overbookedRes.queuedPosition).toBe(1)

    // 10th agent should be at position 2
    const overbookedRes2 = slotManager.reserveSlot('bed', 'agent_10')
    expect(overbookedRes2.success).toBe(false)
    expect(overbookedRes2.queuedPosition).toBe(2)

    // Re-reserving by the same agent returns their existing slot without double-booking
    const reReserve = slotManager.reserveSlot('bed', 'agent_1')
    expect(reReserve.success).toBe(true)
    expect(reReserve.slot?.occupiedBy).toBe('agent_1')
  })

  it('promotes the next queued agent when a slot is released', () => {
    // Reserve all 6 CR stalls
    for (let i = 1; i <= 6; i++) {
      slotManager.reserveSlot('cr_stall', `agent_${i}`)
    }

    // 7th agent queues up
    const queueRes = slotManager.reserveSlot('cr_stall', 'agent_7')
    expect(queueRes.success).toBe(false)
    expect(queueRes.queuedPosition).toBe(1)

    // agent_1 finishes CR visit and releases their stall
    const firstStall = slotManager.getSlotForAgent('agent_1')
    expect(firstStall).toBeDefined()

    const released = slotManager.releaseSlot(firstStall!.id, 'agent_1')
    expect(released).toBe(true)

    // agent_7 should have been automatically promoted and now occupies the stall!
    const agent7Slot = slotManager.getSlotForAgent('agent_7')
    expect(agent7Slot).toBeDefined()
    expect(agent7Slot?.id).toBe(firstStall!.id)
    expect(agent7Slot?.occupiedBy).toBe('agent_7')
  })

  it('cleans up stale/expired reservations to prevent deadlocks', () => {
    const res = slotManager.reserveSlot('water_dispenser', 'thirsty_agent')
    expect(res.success).toBe(true)
    expect(res.slot).toBeDefined()

    // Manually simulate expired occupiedSince
    const slot = slotManager.getSlot(res.slot!.id)!
    slot.occupiedSince = new Date(Date.now() - 300000).toISOString() // 5 minutes ago (timeout is 2 min)

    const cleaned = slotManager.cleanExpiredReservations()
    expect(cleaned).toBeGreaterThanOrEqual(1)

    // Slot is now free
    const refreshed = slotManager.getSlot(res.slot!.id)!
    expect(refreshed.occupiedBy).toBeNull()
  })

  it('strictly derives campus live counters without hardcoded formulas', () => {
    const agents = [
      { id: 'josiah', status: 'working', current_task: 'PR Review', room: 'Command' },
      { id: 'gian', status: 'available', current_task: '', room: 'Engineering' },
      { id: 'arwin', status: 'available', current_task: '', room: 'Engineering' },
      { id: 'cleaner_1', status: 'available', current_task: '', room: 'Facilities' },
      { id: 'cleaner_2', status: 'available', current_task: '', room: 'Facilities' },
    ]

    const needsMap = {
      josiah: { state: 'work' as const, energy: 90 },
      gian: { state: 'eat' as const, energy: 75 },
      arwin: { state: 'cr' as const, energy: 80 },
      cleaner_1: { state: 'clean' as const, energy: 85 },
      cleaner_2: { state: 'work' as const, energy: 88 },
    }

    const counters = deriveCampusLiveCounters(agents, needsMap)

    expect(counters.totalOnline).toBe(5)
    expect(counters.working).toBe(1) // only josiah has a real running task
    expect(counters.eating).toBe(1) // gian is eating
    expect(counters.inCr).toBe(1) // arwin is in CR
    expect(counters.cleaning).toBe(2) // cleaner_1 (clean state) + cleaner_2 (cleaner agent)
    expect(counters.available).toBe(0)
  })

  it('provides correct small status icons for activities', () => {
    expect(getAgentStatusIcon('nap')).toBe('💤')
    expect(getAgentStatusIcon('sleep')).toBe('😴')
    expect(getAgentStatusIcon('eat')).toBe('🍽️')
    expect(getAgentStatusIcon('coffee')).toBe('☕')
    expect(getAgentStatusIcon('cr')).toBe('🚻')
    expect(getAgentStatusIcon('gym')).toBe('🏋️')
    expect(getAgentStatusIcon('drink')).toBe('💧')
    expect(getAgentStatusIcon('clean')).toBe('🧹')
    expect(getAgentStatusIcon('work', true)).toBe('💻')
  })
})
