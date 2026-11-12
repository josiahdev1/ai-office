/**
 * Office Real Activities Engine (Phase K4)
 * Branch: office-v3
 *
 * Implements:
 * - Activity slot reservations (Nap beds, CR stalls, Cafeteria seats, Water dispensers, Gym, Coffee)
 * - Polite FIFO queues with deadlock timeout auto-release
 * - Activity state machine (reserve -> walk -> active animation -> complete -> release -> return)
 * - Strictly derived campus live counters from real state
 * - Name tag status icons and activity props
 */

import { ActivityKind } from './needsEngine'
import { officeSupabase } from '../supabase/officeService'

export interface FacilitySlot {
  id: string
  kind: 'bed' | 'cr_stall' | 'dining_chair' | 'water_dispenser' | 'gym_spot' | 'coffee_spot'
  roomId: string
  label: string
  position: [number, number, number]
  facing?: 'SE' | 'SW' | 'NE' | 'NW'
  occupiedBy?: string | null
  occupiedSince?: string | null
  timeoutMs: number
}

export interface ActivityQueueEntry {
  agentId: string
  kind: FacilitySlot['kind']
  requestedAt: number
}

export interface CampusLiveCounters {
  working: number
  available: number
  eating: number
  resting: number
  sleeping: number
  inCr: number
  inGym: number
  onBreak: number
  cleaning: number
  totalOnline: number
}

export const ACTIVITY_STATUS_ICONS: Record<string, string> = {
  work: '💻',
  eat: '🍽️',
  drink: '💧',
  coffee: '☕',
  cr: '🚻',
  nap: '💤',
  sleep: '😴',
  gym: '🏋️',
  lounge: '🎮',
  social: '💬',
  clean: '🧹',
  walk_break: '🚶',
  idle: '🟢',
}

/**
 * Standard slots seeded across the office building and Wellness Wing.
 */
export const DEFAULT_FACILITY_SLOTS: FacilitySlot[] = [
  // 8 Nap Beds
  { id: 'nap_bed_1', kind: 'bed', roomId: 'NAP_ROOM', label: 'Single Bed #1', position: [-33, 0, -18], facing: 'NW', timeoutMs: 900000 },
  { id: 'nap_bed_2', kind: 'bed', roomId: 'NAP_ROOM', label: 'Single Bed #2', position: [-33, 0, -15], facing: 'NW', timeoutMs: 900000 },
  { id: 'nap_bed_3', kind: 'bed', roomId: 'NAP_ROOM', label: 'Bunk Bed #3 (Lower)', position: [-37, 0, -18], facing: 'NE', timeoutMs: 900000 },
  { id: 'nap_bed_4', kind: 'bed', roomId: 'NAP_ROOM', label: 'Bunk Bed #4 (Upper)', position: [-37, 0, -18], facing: 'NE', timeoutMs: 900000 },
  { id: 'nap_bed_5', kind: 'bed', roomId: 'NAP_ROOM', label: 'Bunk Bed #5 (Lower)', position: [-37, 0, -15], facing: 'NE', timeoutMs: 900000 },
  { id: 'nap_bed_6', kind: 'bed', roomId: 'NAP_ROOM', label: 'Bunk Bed #6 (Upper)', position: [-37, 0, -15], facing: 'NE', timeoutMs: 900000 },
  { id: 'nap_bed_7', kind: 'bed', roomId: 'NAP_ROOM', label: 'Single Bed #7', position: [-35, 0, -12], facing: 'SW', timeoutMs: 900000 },
  { id: 'nap_bed_8', kind: 'bed', roomId: 'NAP_ROOM', label: 'Single Bed #8', position: [-33, 0, -12], facing: 'SW', timeoutMs: 900000 },

  // 6 CR Stalls
  { id: 'cr_stall_1', kind: 'cr_stall', roomId: 'COMFORT_ROOM', label: 'CR Stall #1', position: [-33, 0, -4], facing: 'NW', timeoutMs: 300000 },
  { id: 'cr_stall_2', kind: 'cr_stall', roomId: 'COMFORT_ROOM', label: 'CR Stall #2', position: [-33, 0, -2], facing: 'NW', timeoutMs: 300000 },
  { id: 'cr_stall_3', kind: 'cr_stall', roomId: 'COMFORT_ROOM', label: 'CR Stall #3', position: [-33, 0, 0], facing: 'NW', timeoutMs: 300000 },
  { id: 'cr_stall_4', kind: 'cr_stall', roomId: 'COMFORT_ROOM', label: 'CR Stall #4', position: [-37, 0, -4], facing: 'NE', timeoutMs: 300000 },
  { id: 'cr_stall_5', kind: 'cr_stall', roomId: 'COMFORT_ROOM', label: 'CR Stall #5', position: [-37, 0, -2], facing: 'NE', timeoutMs: 300000 },
  { id: 'cr_stall_6', kind: 'cr_stall', roomId: 'COMFORT_ROOM', label: 'CR Stall #6', position: [-37, 0, 0], facing: 'NE', timeoutMs: 300000 },

  // 6 Water Dispensers
  { id: 'dispenser_corridor_north', kind: 'water_dispenser', roomId: 'CORRIDORS', label: 'North Corridor Water', position: [0, 0, -8], facing: 'SW', timeoutMs: 120000 },
  { id: 'dispenser_corridor_south', kind: 'water_dispenser', roomId: 'CORRIDORS', label: 'South Corridor Water', position: [0, 0, 8], facing: 'NW', timeoutMs: 120000 },
  { id: 'dispenser_engineering', kind: 'water_dispenser', roomId: 'ENGINEERING', label: 'Engineering Water Station', position: [-11, 0, -11], facing: 'SE', timeoutMs: 120000 },
  { id: 'dispenser_secops', kind: 'water_dispenser', roomId: 'SECOPS', label: 'SecOps Water Station', position: [11, 0, -1], facing: 'SW', timeoutMs: 120000 },
  { id: 'dispenser_gym', kind: 'water_dispenser', roomId: 'GYM', label: 'Gym Hydration Station', position: [5, 0, 11], facing: 'NE', timeoutMs: 120000 },
  { id: 'dispenser_cafeteria', kind: 'water_dispenser', roomId: 'CAFETERIA', label: 'Cafeteria Water Cooler', position: [-31, 0, 12], facing: 'SE', timeoutMs: 120000 },

  // Coffee Machines (Pantry)
  { id: 'coffee_machine_1', kind: 'coffee_spot', roomId: 'PANTRY', label: 'Espresso Bar #1', position: [-17, 0, 15], facing: 'SE', timeoutMs: 180000 },
  { id: 'coffee_machine_2', kind: 'coffee_spot', roomId: 'PANTRY', label: 'Espresso Bar #2', position: [-15, 0, 15], facing: 'SE', timeoutMs: 180000 },

  // Gym Fitness Spots
  { id: 'gym_treadmill_1', kind: 'gym_spot', roomId: 'GYM', label: 'Treadmill Alpha', position: [4, 0, 14], facing: 'SW', timeoutMs: 600000 },
  { id: 'gym_treadmill_2', kind: 'gym_spot', roomId: 'GYM', label: 'Treadmill Beta', position: [6, 0, 14], facing: 'SW', timeoutMs: 600000 },
  { id: 'gym_weights_1', kind: 'gym_spot', roomId: 'GYM', label: 'Free Weights Bench', position: [2, 0, 16], facing: 'SE', timeoutMs: 600000 },
  { id: 'gym_yoga_1', kind: 'gym_spot', roomId: 'GYM', label: 'Yoga Stretching Mat', position: [8, 0, 16], facing: 'NE', timeoutMs: 600000 },
]

// Add 24 Cafeteria Dining Chairs
for (let i = 1; i <= 24; i++) {
  const tableIdx = Math.floor((i - 1) / 4)
  const seatIdx = (i - 1) % 4
  const tableCenter = [
    -38 + (tableIdx % 3) * 6,
    0,
    11 + Math.floor(tableIdx / 3) * 5,
  ]
  const offset = seatIdx === 0 ? [-1, -1] : seatIdx === 1 ? [1, -1] : seatIdx === 2 ? [-1, 1] : [1, 1]
  DEFAULT_FACILITY_SLOTS.push({
    id: `cafe_seat_${i}`,
    kind: 'dining_chair',
    roomId: 'CAFETERIA',
    label: `Cafeteria Seat #${i} (Table ${tableIdx + 1})`,
    position: [tableCenter[0] + offset[0] * 0.9, 0, tableCenter[2] + offset[1] * 0.9],
    facing: offset[1] < 0 ? 'NW' : 'SE',
    timeoutMs: 600000,
  })
}

/**
 * Activity & Reservation Slot Manager
 */
export class ActivitySlotManager {
  private slots: Map<string, FacilitySlot> = new Map()
  private queues: Map<FacilitySlot['kind'], ActivityQueueEntry[]> = new Map()

  constructor(initialSlots: FacilitySlot[] = DEFAULT_FACILITY_SLOTS) {
    for (const slot of initialSlots) {
      this.slots.set(slot.id, { ...slot })
    }
  }

  public getSlots(): FacilitySlot[] {
    return Array.from(this.slots.values())
  }

  public getSlotsByKind(kind: FacilitySlot['kind']): FacilitySlot[] {
    return this.getSlots().filter((s) => s.kind === kind)
  }

  public getSlot(id: string): FacilitySlot | undefined {
    return this.slots.get(id)
  }

  public getSlotForAgent(agentId: string): FacilitySlot | undefined {
    return this.getSlots().find((s) => s.occupiedBy === agentId)
  }

  /**
   * Attempts to reserve a slot of the given kind.
   * If available, claims it and returns the slot.
   * If all full, enqueues the agent in the polite queue.
   */
  public reserveSlot(
    kind: FacilitySlot['kind'],
    agentId: string
  ): { success: boolean; slot?: FacilitySlot; queuedPosition?: number } {
    this.cleanExpiredReservations()

    // Check if agent already holds a slot of this kind
    const existing = this.getSlots().find((s) => s.kind === kind && s.occupiedBy === agentId)
    if (existing) {
      return { success: true, slot: existing }
    }

    // Find first vacant slot of kind
    const available = this.getSlots().find((s) => s.kind === kind && !s.occupiedBy)
    if (available) {
      available.occupiedBy = agentId
      available.occupiedSince = new Date().toISOString()
      this.slots.set(available.id, available)

      // Remove from queue if previously queued
      this.removeFromQueue(kind, agentId)
      return { success: true, slot: available }
    }

    // All occupied: add to FIFO queue
    const queue = this.queues.get(kind) || []
    if (!queue.some((q) => q.agentId === agentId)) {
      queue.push({ agentId, kind, requestedAt: Date.now() })
      this.queues.set(kind, queue)
    }

    const pos = queue.findIndex((q) => q.agentId === agentId) + 1
    return { success: false, queuedPosition: pos }
  }

  /**
   * Releases an agent's slot reservation and immediately promotes the next queued agent if any.
   */
  public releaseSlot(slotId: string, agentId?: string): boolean {
    const slot = this.slots.get(slotId)
    if (!slot) return false

    if (agentId && slot.occupiedBy !== agentId) {
      return false
    }

    slot.occupiedBy = null
    slot.occupiedSince = null
    this.slots.set(slot.id, slot)

    // Promote next in queue
    const queue = this.queues.get(slot.kind)
    if (queue && queue.length > 0) {
      const next = queue.shift()!
      this.reserveSlot(slot.kind, next.agentId)
    }

    return true
  }

  public removeFromQueue(kind: FacilitySlot['kind'], agentId: string) {
    const queue = this.queues.get(kind)
    if (queue) {
      this.queues.set(
        kind,
        queue.filter((q) => q.agentId !== agentId)
      )
    }
  }

  /**
   * Auto-releases expired slots to prevent deadlocks from stale tabs or disconnected clients.
   */
  public cleanExpiredReservations(): number {
    let released = 0
    const now = Date.now()

    for (const slot of this.slots.values()) {
      if (slot.occupiedBy && slot.occupiedSince) {
        const elapsed = now - new Date(slot.occupiedSince).getTime()
        if (elapsed > slot.timeoutMs) {
          this.releaseSlot(slot.id)
          released++
        }
      }
    }

    return released
  }

  /**
   * Synchronizes reservations with live Supabase `office_facility_slots` table.
   */
  public async syncWithSupabase(): Promise<void> {
    try {
      const client = officeSupabase.getClient()
      const { data } = await client.from('office_facility_slots').select('*')
      if (data && Array.isArray(data)) {
        for (const row of data) {
          const slot = this.slots.get(row.id)
          if (slot) {
            slot.occupiedBy = row.occupied_by
            slot.occupiedSince = row.occupied_since
          }
        }
      }
    } catch {
      // Graceful fallback to memory
    }
  }
}

export const activitySlotManager = new ActivitySlotManager()

/**
 * Strictly derives the campus live counters from actual agent statuses and needs states.
 * Replaces any hardcoded or estimated numbers.
 */
export function deriveCampusLiveCounters(
  agents: Array<{ id: string; status: string; current_task?: string | null; room?: string }>,
  agentNeedsMap: Record<string, { state: ActivityKind; energy: number }> = {}
): CampusLiveCounters {
  let working = 0
  let available = 0
  let eating = 0
  let resting = 0
  let sleeping = 0
  let inCr = 0
  let inGym = 0
  let onBreak = 0
  let cleaning = 0

  for (const agent of agents) {
    const state = agentNeedsMap[agent.id]?.state || 'work'
    const isCleaner = agent.id.startsWith('cleaner_')
    const hasRealTask = Boolean(agent.current_task && agent.current_task.trim())

    if (state === 'clean' || isCleaner && state === 'work') {
      cleaning++
    } else if (state === 'eat') {
      eating++
    } else if (state === 'cr') {
      inCr++
    } else if (state === 'gym') {
      inGym++
    } else if (state === 'sleep') {
      sleeping++
    } else if (state === 'nap' || state === 'lounge') {
      resting++
    } else if (state === 'coffee' || state === 'walk_break') {
      onBreak++
    } else if (hasRealTask || agent.status === 'working') {
      working++
    } else {
      available++
    }
  }

  return {
    working,
    available,
    eating,
    resting,
    sleeping,
    inCr,
    inGym,
    onBreak,
    cleaning,
    totalOnline: agents.length,
  }
}

/**
 * Returns the small status icon for an agent's current activity or state.
 */
export function getAgentStatusIcon(state?: string, isWorking = false): string {
  if (state && ACTIVITY_STATUS_ICONS[state]) {
    return ACTIVITY_STATUS_ICONS[state]
  }
  return isWorking ? '💻' : '🟢'
}
