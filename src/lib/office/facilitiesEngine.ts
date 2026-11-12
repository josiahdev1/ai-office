/**
 * Office Facilities & Cleaners Engine (Phase K6)
 * Branch: office-v3
 *
 * Implements:
 * - Real-use event-driven dirt, bin fill, and supply depletion accumulation
 * - 6 Water Dispenser jugs tracking and replacement loops
 * - Cleaners priority queue (mop, wipe tables, empty bins, sanitize CR, water jug replacement)
 * - Dynamic room cleanliness scores and HQ average
 * - Wet-floor sign tracking while mopping
 * - Manual cleaning request dispatch from operator and JARVIS
 */

import { officeSupabase } from '../supabase/officeService'
import { ActivityKind, needsManager } from './needsEngine'
import { getPHTParts } from './clock'

export type FacilityKind =
  | 'room_cleanliness'
  | 'bin_level'
  | 'water_jug'
  | 'supplies'
  | 'table_crumbs'
  | 'sweat_dirt'
  | 'cr_hygiene'

export type FacilityStatus = 'clean' | 'normal' | 'needs_attention' | 'dirty' | 'critical'

export interface FacilityRecord {
  id: string
  targetId: string
  roomId: string
  kind: FacilityKind
  dirtLevel: number // 0 to 100
  fillLevel: number // 0 to 100
  suppliesLevel: number // 0 to 100
  status: FacilityStatus
  assignedCleanerId?: string | null
  lastCleanedAt: string
  updatedAt: string
}

export type CleaningTaskKind =
  | 'mop'
  | 'wipe_tables'
  | 'empty_bins'
  | 'clean_cr'
  | 'replace_water_jug'
  | 'restock_pantry'
  | 'water_plants'

export type CleaningPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface CleaningTask {
  id: string
  roomId: string
  kind: CleaningTaskKind
  priority: CleaningPriority
  reason: string
  targetId?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assignedCleanerId?: string | null
  createdAt: string
  completedAt?: string | null
}

export interface RoomCleanlinessReport {
  roomId: string
  roomName: string
  score: number // 0 to 100
  dirtLevel: number
  binFillLevel: number
  suppliesLevel: number
  status: FacilityStatus
  activeIssue?: string
  isWetFloor?: boolean
}

export const ROOM_DISPLAY_NAMES: Record<string, string> = {
  CAFETERIA: 'Grand Cafeteria',
  COMFORT_ROOM: 'Comfort Room',
  GYM: 'Rec & Fitness Gym',
  PANTRY: 'Executive Pantry',
  ENGINEERING: 'Engineering Core',
  QA: 'QA & SecOps NOC',
  GROWTH: 'Growth & Marketing',
  INTELLIGENCE: 'Intelligence Lab',
  OPERATIONS: 'Operations Hub',
  THE_BRAIN: 'The Brain Core',
  CORRIDORS: 'Main Campus Corridors',
  NAP_ROOM: 'Wellness Nap Chamber',
  SECOPS: 'Security Operations',
}

export const INITIAL_FACILITY_RECORDS: FacilityRecord[] = [
  { id: 'fac_cafeteria', targetId: 'CAFETERIA', roomId: 'CAFETERIA', kind: 'room_cleanliness', dirtLevel: 12.0, fillLevel: 15.0, suppliesLevel: 95.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_comfort_room', targetId: 'COMFORT_ROOM', roomId: 'COMFORT_ROOM', kind: 'cr_hygiene', dirtLevel: 8.0, fillLevel: 10.0, suppliesLevel: 90.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_gym', targetId: 'GYM', roomId: 'GYM', kind: 'sweat_dirt', dirtLevel: 6.0, fillLevel: 8.0, suppliesLevel: 98.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_pantry', targetId: 'PANTRY', roomId: 'PANTRY', kind: 'supplies', dirtLevel: 5.0, fillLevel: 12.0, suppliesLevel: 92.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_engineering', targetId: 'ENGINEERING', roomId: 'ENGINEERING', kind: 'room_cleanliness', dirtLevel: 4.0, fillLevel: 18.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_qa', targetId: 'QA', roomId: 'QA', kind: 'room_cleanliness', dirtLevel: 3.0, fillLevel: 10.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_growth', targetId: 'GROWTH', roomId: 'GROWTH', kind: 'room_cleanliness', dirtLevel: 5.0, fillLevel: 14.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_intelligence', targetId: 'INTELLIGENCE', roomId: 'INTELLIGENCE', kind: 'room_cleanliness', dirtLevel: 2.0, fillLevel: 8.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_operations', targetId: 'OPERATIONS', roomId: 'OPERATIONS', kind: 'room_cleanliness', dirtLevel: 6.0, fillLevel: 20.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_the_brain', targetId: 'THE_BRAIN', roomId: 'THE_BRAIN', kind: 'room_cleanliness', dirtLevel: 1.0, fillLevel: 2.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_corridors', targetId: 'CORRIDORS', roomId: 'CORRIDORS', kind: 'room_cleanliness', dirtLevel: 7.0, fillLevel: 5.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_nap_room', targetId: 'NAP_ROOM', roomId: 'NAP_ROOM', kind: 'room_cleanliness', dirtLevel: 3.0, fillLevel: 4.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // 6 Water Dispensers
  { id: 'fac_dispenser_corridor_north_jug', targetId: 'dispenser_corridor_north', roomId: 'CORRIDORS', kind: 'water_jug', dirtLevel: 0.0, fillLevel: 0.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_dispenser_corridor_south_jug', targetId: 'dispenser_corridor_south', roomId: 'CORRIDORS', kind: 'water_jug', dirtLevel: 0.0, fillLevel: 0.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_dispenser_engineering_jug', targetId: 'dispenser_engineering', roomId: 'ENGINEERING', kind: 'water_jug', dirtLevel: 0.0, fillLevel: 0.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_dispenser_secops_jug', targetId: 'dispenser_secops', roomId: 'SECOPS', kind: 'water_jug', dirtLevel: 0.0, fillLevel: 0.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_dispenser_gym_jug', targetId: 'dispenser_gym', roomId: 'GYM', kind: 'water_jug', dirtLevel: 0.0, fillLevel: 0.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'fac_dispenser_cafeteria_jug', targetId: 'dispenser_cafeteria', roomId: 'CAFETERIA', kind: 'water_jug', dirtLevel: 0.0, fillLevel: 0.0, suppliesLevel: 100.0, status: 'clean', lastCleanedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

export class FacilitiesManager {
  private records: Map<string, FacilityRecord> = new Map()
  private cleaningTasks: Map<string, CleaningTask> = new Map()
  private activeWetFloors: Set<string> = new Set()

  constructor(initialRecords: FacilityRecord[] = INITIAL_FACILITY_RECORDS) {
    for (const rec of initialRecords) {
      this.records.set(rec.id, { ...rec })
    }
  }

  public getRecords(): FacilityRecord[] {
    return Array.from(this.records.values())
  }

  public getRecord(id: string): FacilityRecord | null {
    return this.records.get(id) || null
  }

  /**
   * Computes a normalized 0-100 cleanliness score for a room.
   */
  public computeRoomCleanliness(roomId: string): RoomCleanlinessReport {
    const normRoom = roomId.toUpperCase()
    const recs = Array.from(this.records.values()).filter((r) => r.roomId === normRoom)

    let totalDirt = 0
    let totalBins = 0
    let totalSupplies = 100
    let count = 0

    for (const r of recs) {
      if (r.kind !== 'water_jug') {
        totalDirt += r.dirtLevel
        totalBins += r.fillLevel
        totalSupplies = Math.min(totalSupplies, r.suppliesLevel)
        count++
      }
    }

    const avgDirt = count > 0 ? totalDirt / count : 5.0
    const avgBins = count > 0 ? totalBins / count : 10.0
    const rawScore = 100 - (avgDirt * 0.6 + avgBins * 0.2 + (100 - totalSupplies) * 0.2)
    const score = Math.max(0, Math.min(100, Math.round(rawScore)))

    let status: FacilityStatus = 'clean'
    if (score < 30) status = 'critical'
    else if (score < 50) status = 'dirty'
    else if (score < 70) status = 'needs_attention'
    else if (score < 85) status = 'normal'

    let activeIssue: string | undefined
    if (avgDirt > 50) activeIssue = 'Floors and surfaces require thorough mopping'
    else if (avgBins > 70) activeIssue = 'Trash receptacles over capacity'
    else if (totalSupplies < 30) activeIssue = 'Critical supplies depleted'

    return {
      roomId: normRoom,
      roomName: ROOM_DISPLAY_NAMES[normRoom] || normRoom,
      score,
      dirtLevel: Math.round(avgDirt),
      binFillLevel: Math.round(avgBins),
      suppliesLevel: Math.round(totalSupplies),
      status,
      activeIssue,
      isWetFloor: this.activeWetFloors.has(normRoom),
    }
  }

  /**
   * Returns reports across all tracked rooms in the office.
   */
  public getAllRoomReports(): RoomCleanlinessReport[] {
    const roomKeys = [
      'CAFETERIA',
      'COMFORT_ROOM',
      'GYM',
      'PANTRY',
      'ENGINEERING',
      'QA',
      'GROWTH',
      'INTELLIGENCE',
      'OPERATIONS',
      'THE_BRAIN',
      'CORRIDORS',
      'NAP_ROOM',
    ]
    return roomKeys.map((k) => this.computeRoomCleanliness(k))
  }

  /**
   * HQ Average Cleanliness Score (derived strictly from room records).
   */
  public getHQCleanlinessAverage(): number {
    const reports = this.getAllRoomReports()
    if (reports.length === 0) return 100
    const total = reports.reduce((acc, r) => acc + r.score, 0)
    return Math.round(total / reports.length)
  }

  /**
   * Real event-driven accumulation triggered by agents living their day.
   */
  public recordActivityImpression(
    agentId: string,
    activity: ActivityKind,
    roomId: string,
    targetSlotId?: string
  ): void {
    const normRoom = roomId.toUpperCase()
    const now = new Date().toISOString()

    switch (activity) {
      case 'eat': {
        const cafe = this.records.get('fac_cafeteria')
        if (cafe) {
          cafe.dirtLevel = Math.min(100, cafe.dirtLevel + 8.0)
          cafe.fillLevel = Math.min(100, cafe.fillLevel + 10.0)
          cafe.updatedAt = now
          if (cafe.dirtLevel >= 50 || cafe.fillLevel >= 65) {
            this.ensureCleaningTask('CAFETERIA', 'wipe_tables', 'normal', 'Leftover trays & dining crumbs after cafeteria lunch wave')
          }
        }
        break
      }

      case 'drink': {
        // Find matching dispenser jug or fallback to room dispenser
        let jug = Array.from(this.records.values()).find(
          (r) => r.kind === 'water_jug' && (r.targetId === targetSlotId || r.roomId === normRoom)
        )
        if (!jug) {
          jug = this.records.get('fac_dispenser_corridor_north_jug')
        }
        if (jug) {
          jug.suppliesLevel = Math.max(0, jug.suppliesLevel - 4.0) // -4% per drink (approx 25 cups per 5-gal jug)
          jug.updatedAt = now
          if (jug.suppliesLevel <= 20) {
            jug.status = 'needs_attention'
            this.ensureCleaningTask(
              jug.roomId,
              'replace_water_jug',
              jug.suppliesLevel <= 5 ? 'urgent' : 'high',
              `Water jug at ${jug.targetId} depleted (${Math.round(jug.suppliesLevel)}% remaining). Fresh 5-gallon jug replacement needed.`,
              jug.targetId
            )
          }
        }
        break
      }

      case 'cr': {
        const cr = this.records.get('fac_comfort_room')
        if (cr) {
          cr.dirtLevel = Math.min(100, cr.dirtLevel + 10.0)
          cr.suppliesLevel = Math.max(0, cr.suppliesLevel - 5.0)
          cr.fillLevel = Math.min(100, cr.fillLevel + 8.0)
          cr.updatedAt = now
          if (cr.dirtLevel >= 45 || cr.suppliesLevel <= 30) {
            this.ensureCleaningTask('COMFORT_ROOM', 'clean_cr', 'high', 'Comfort room hygiene servicing & tissue restock')
          }
        }
        break
      }

      case 'gym': {
        const gym = this.records.get('fac_gym')
        if (gym) {
          gym.dirtLevel = Math.min(100, gym.dirtLevel + 7.5)
          gym.fillLevel = Math.min(100, gym.fillLevel + 6.0)
          gym.updatedAt = now
          if (gym.dirtLevel >= 50) {
            this.ensureCleaningTask('GYM', 'mop', 'normal', 'Workout equipment wipe-down & floor sanitization')
          }
        }
        break
      }

      case 'coffee': {
        const pantry = this.records.get('fac_pantry')
        if (pantry) {
          pantry.suppliesLevel = Math.max(0, pantry.suppliesLevel - 6.0)
          pantry.fillLevel = Math.min(100, pantry.fillLevel + 7.0)
          pantry.updatedAt = now
          if (pantry.suppliesLevel <= 25) {
            this.ensureCleaningTask('PANTRY', 'restock_pantry', 'normal', 'Espresso beans and coffee pods depletion')
          }
        }
        break
      }

      case 'work': {
        const roomRec = this.records.get(`fac_${normRoom.toLowerCase()}`)
        if (roomRec) {
          roomRec.dirtLevel = Math.min(100, roomRec.dirtLevel + 0.4)
          roomRec.fillLevel = Math.min(100, roomRec.fillLevel + 0.6)
          roomRec.updatedAt = now
          if (roomRec.fillLevel >= 75) {
            this.ensureCleaningTask(normRoom, 'empty_bins', 'normal', `Trash bins in ${normRoom} near capacity`)
          }
        }
        break
      }
    }
  }

  /**
   * Ensures an idempotent cleaning task is queued without duplicates.
   */
  public ensureCleaningTask(
    roomId: string,
    kind: CleaningTaskKind,
    priority: CleaningPriority,
    reason: string,
    targetId?: string,
    requestedBy = 'operator'
  ): CleaningTask {
    const normRoom = roomId.toUpperCase()
    // Look for existing pending/in_progress task of same kind & room
    const existing = Array.from(this.cleaningTasks.values()).find(
      (t) => t.roomId === normRoom && t.kind === kind && (t.status === 'pending' || t.status === 'in_progress')
    )
    if (existing) {
      if (priority === 'urgent' && existing.priority !== 'urgent') {
        existing.priority = 'urgent'
      }
      return existing
    }

    const newTask: CleaningTask = {
      id: `clean_${Date.now()}_${normRoom.toLowerCase()}_${kind}`,
      roomId: normRoom,
      kind,
      priority,
      reason,
      targetId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    this.cleaningTasks.set(newTask.id, newTask)
    this.persistCleaningRequest(newTask, requestedBy)
    return newTask
  }

  /**
   * Returns pending cleaning tasks ordered by priority (urgent > high > normal > low).
   */
  public getPendingTasks(): CleaningTask[] {
    const priorityWeight: Record<CleaningPriority, number> = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1,
    }

    return Array.from(this.cleaningTasks.values())
      .filter((t) => t.status === 'pending')
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
  }

  /**
   * Next available job for a facility cleaner.
   */
  public getNextCleaningTask(cleanerId: string): CleaningTask | null {
    // Check if cleaner has sufficient energy
    const needs = needsManager.getAgentNeeds(cleanerId)
    if (needs.energy < 15) {
      return null // Cleaner must rest before taking another heavy job
    }

    const pending = this.getPendingTasks()
    if (pending.length === 0) return null

    const task = pending[0]
    task.status = 'in_progress'
    task.assignedCleanerId = cleanerId

    if (task.kind === 'mop') {
      this.activeWetFloors.add(task.roomId)
    }

    return task
  }

  /**
   * Completes a cleaning task: resets dirt/bins, restocks, logs to activity log, and clears wet floor sign.
   */
  public async completeCleaningTask(
    taskId: string,
    cleanerId: string,
    cleanerName = 'Cleaner'
  ): Promise<boolean> {
    const task = this.cleaningTasks.get(taskId)
    if (!task) return false

    const now = new Date()
    const nowIso = now.toISOString()
    const pht = getPHTParts(now)
    const phtStr = `${pht.hour % 12 || 12}:${pht.minute.toString().padStart(2, '0')} ${pht.hour >= 12 ? 'PM' : 'AM'} PHT`

    task.status = 'completed'
    task.completedAt = nowIso

    // Reset corresponding room / target facility record
    if (task.kind === 'replace_water_jug') {
      const jug = Array.from(this.records.values()).find(
        (r) => r.kind === 'water_jug' && (r.targetId === task.targetId || r.roomId === task.roomId)
      )
      if (jug) {
        jug.suppliesLevel = 100.0
        jug.status = 'clean'
        jug.lastCleanedAt = nowIso
        jug.updatedAt = nowIso
      }
    } else {
      const roomRecs = Array.from(this.records.values()).filter((r) => r.roomId === task.roomId)
      for (const rec of roomRecs) {
        if (task.kind === 'mop') {
          rec.dirtLevel = Math.max(0, rec.dirtLevel - 40.0)
        } else if (task.kind === 'wipe_tables') {
          rec.dirtLevel = Math.max(0, rec.dirtLevel - 35.0)
          rec.fillLevel = Math.max(0, rec.fillLevel - 20.0)
        } else if (task.kind === 'empty_bins') {
          rec.fillLevel = 0.0
        } else if (task.kind === 'clean_cr') {
          rec.dirtLevel = 2.0
          rec.suppliesLevel = 100.0
          rec.fillLevel = 0.0
        } else if (task.kind === 'restock_pantry') {
          rec.suppliesLevel = 100.0
        }
        rec.status = 'clean'
        rec.lastCleanedAt = nowIso
        rec.updatedAt = nowIso
      }
    }

    if (task.kind === 'mop') {
      this.activeWetFloors.delete(task.roomId)
    }

    // Record activity log for cleaner
    needsManager.recordActivityLog({
      agentId: cleanerId,
      kind: 'clean',
      phase: 'completed',
      reason: `${cleanerName} completed at ${phtStr}: ${task.reason} in ${ROOM_DISPLAY_NAMES[task.roomId] || task.roomId}`,
      decidedBy: 'agent',
    })

    // Consume moderate cleaner stamina
    const rec = needsManager.getNeedsRecord(cleanerId)
    rec.energy = Math.max(0, rec.energy - 6.0)
    rec.thirst = Math.max(0, rec.thirst - 5.0)

    // Persist to Supabase
    try {
      const client = officeSupabase.getClient()
      await client
        .from('office_cleaning_requests')
        .update({
          status: 'completed',
          assigned_cleaner_id: cleanerId,
          completed_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', taskId)
    } catch {
      // Non-fatal
    }

    return true
  }

  /**
   * Manual cleaning request from Josiah or JARVIS.
   */
  public requestCleaning(
    roomId: string,
    kind: CleaningTaskKind = 'mop',
    requestedBy = 'operator',
    priority: CleaningPriority = 'high',
    reason = 'Manual operator cleaning directive'
  ): CleaningTask {
    const task = this.ensureCleaningTask(roomId, kind, priority, reason, undefined, requestedBy)
    task.priority = priority
    return task
  }

  public isWetFloor(roomId: string): boolean {
    return this.activeWetFloors.has(roomId.toUpperCase())
  }

  private async persistCleaningRequest(task: CleaningTask, requestedBy = 'operator'): Promise<void> {
    try {
      const client = officeSupabase.getClient()
      await client.from('office_cleaning_requests').insert({
        id: task.id,
        room_id: task.roomId,
        kind: task.kind,
        requested_by: requestedBy,
        priority: task.priority,
        reason: task.reason,
        status: task.status,
        created_at: task.createdAt,
        updated_at: task.createdAt,
      })
    } catch {
      // Non-fatal
    }
  }
}

export const facilitiesManager = new FacilitiesManager()

/**
 * Executes one maintenance evaluation tick for cleaners.
 * Assigns next pending cleaning task to any idle cleaner who is not exhausted.
 */
export function runCleanersMaintenanceTick(
  cleanerIds: string[] = ['cleaner_1', 'cleaner_2']
): Array<{ cleanerId: string; task: CleaningTask | null; action: string }> {
  const results: Array<{ cleanerId: string; task: CleaningTask | null; action: string }> = []

  for (const cleanerId of cleanerIds) {
    const needs = needsManager.getAgentNeeds(cleanerId)
    if (needs.energy < 20 || needs.hunger < 20 || needs.thirst < 20) {
      // Cleaner needs a break
      results.push({
        cleanerId,
        task: null,
        action: `Cleaner ${cleanerId} vital reserves low (Energy: ${Math.round(needs.energy)}%). Resting/taking break.`,
      })
      continue
    }

    const task = facilitiesManager.getNextCleaningTask(cleanerId)
    if (task) {
      results.push({
        cleanerId,
        task,
        action: `Assigned ${task.kind} in ${ROOM_DISPLAY_NAMES[task.roomId] || task.roomId}: ${task.reason}`,
      })
    } else {
      results.push({
        cleanerId,
        task: null,
        action: `All facilities nominal. Continuous patrol across campus corridors and common areas.`,
      })
    }
  }

  return results
}
