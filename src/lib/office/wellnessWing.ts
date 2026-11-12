/**
 * Wellness Wing & Facilities Management System
 * EasyUp Software Solution HQ (Iloilo City)
 *
 * Implements:
 * 1. Nap Room with 8+ beds (single and bunk), blankets, pillows, and reservation slots
 * 2. Comfort Room (CR) with 6+ stalls with doors, occupied signs, and sinks
 * 3. Grand Cafeteria with serving line, trays, 24 dining seats, microwave, fridge, and trash
 * 4. Facilities Room with cleaning carts, mops, buckets, bins, and supply shelves
 * 5. 6 Water Dispensers with live jug levels
 * 6. Department Registry & "Add Department" Wizard with map versioning
 */

export interface WellnessBed {
  id: string
  label: string
  type: 'single' | 'bunk_lower' | 'bunk_upper'
  position: [number, number, number]
  headFacing: 'NW' | 'NE' | 'SE' | 'SW'
  approachTile: [number, number, number]
  occupiedBy?: string | null
  occupiedSince?: string | null
  dndLight: boolean
}

export interface ComfortRoomStall {
  id: string
  label: string
  stallNumber: number
  position: [number, number, number]
  approachTile: [number, number, number]
  isOccupied: boolean
  occupiedBy?: string | null
  occupiedSince?: string | null
}

export interface DiningSeat {
  id: string
  tableIndex: number
  seatIndex: number
  position: [number, number, number]
  approachTile: [number, number, number]
  isOccupied: boolean
  occupiedBy?: string | null
}

export interface WaterDispenser {
  id: string
  label: string
  roomId: string
  position: [number, number, number]
  jugLevelPct: number // 0 to 100%
  lastRefilledAt: string
}

export interface DepartmentRecord {
  id: string
  name: string
  color: string
  roomId: string
  kind: 'open_office' | 'lab' | 'studio' | 'meeting' | 'wellness'
}

// =============================================================================
// 1. WELLNESS WING SPECIFICATIONS & SLOTS
// =============================================================================

export const WELLNESS_BEDS: WellnessBed[] = [
  {
    id: 'nap_bed_1',
    label: 'Nap Bed 1 (Single, North Window)',
    type: 'single',
    position: [-33, 0.45, -18],
    headFacing: 'NW',
    approachTile: [-33, 0, -17],
    dndLight: true,
  },
  {
    id: 'nap_bed_2',
    label: 'Nap Bed 2 (Single, North Window)',
    type: 'single',
    position: [-33, 0.45, -14],
    headFacing: 'NW',
    approachTile: [-33, 0, -13],
    dndLight: true,
  },
  {
    id: 'nap_bed_3',
    label: 'Nap Bed 3 (Bunk 1 Lower)',
    type: 'bunk_lower',
    position: [-37, 0.45, -18],
    headFacing: 'NE',
    approachTile: [-36, 0, -18],
    dndLight: false,
  },
  {
    id: 'nap_bed_4',
    label: 'Nap Bed 4 (Bunk 1 Upper)',
    type: 'bunk_upper',
    position: [-37, 1.45, -18],
    headFacing: 'NE',
    approachTile: [-36, 0, -18],
    dndLight: false,
  },
  {
    id: 'nap_bed_5',
    label: 'Nap Bed 5 (Bunk 2 Lower)',
    type: 'bunk_lower',
    position: [-37, 0.45, -14],
    headFacing: 'NE',
    approachTile: [-36, 0, -14],
    dndLight: false,
  },
  {
    id: 'nap_bed_6',
    label: 'Nap Bed 6 (Bunk 2 Upper)',
    type: 'bunk_upper',
    position: [-37, 1.45, -14],
    headFacing: 'NE',
    approachTile: [-36, 0, -14],
    dndLight: false,
  },
  {
    id: 'nap_bed_7',
    label: 'Nap Bed 7 (Single, Dim Corner)',
    type: 'single',
    position: [-35, 0.45, -11],
    headFacing: 'SW',
    approachTile: [-35, 0, -12],
    dndLight: true,
  },
  {
    id: 'nap_bed_8',
    label: 'Nap Bed 8 (Single, Dim Corner)',
    type: 'single',
    position: [-33, 0.45, -11],
    headFacing: 'SW',
    approachTile: [-33, 0, -12],
    dndLight: true,
  },
]

export const MENS_CR_STALLS: ComfortRoomStall[] = [
  {
    id: 'cr_stall_1',
    label: "Men's Stall 1",
    stallNumber: 1,
    position: [-33, 0, -9],
    approachTile: [-32, 0, -9],
    isOccupied: false,
  },
  {
    id: 'cr_stall_2',
    label: "Men's Stall 2",
    stallNumber: 2,
    position: [-33, 0, -7],
    approachTile: [-32, 0, -7],
    isOccupied: false,
  },
  {
    id: 'cr_stall_3',
    label: "Men's Stall 3 (Accessible)",
    stallNumber: 3,
    position: [-37, 0, -8],
    approachTile: [-36, 0, -8],
    isOccupied: false,
  },
]

export const WOMENS_CR_STALLS: ComfortRoomStall[] = [
  {
    id: 'cr_stall_4',
    label: "Women's Stall 1",
    stallNumber: 1,
    position: [-33, 0, -3],
    approachTile: [-32, 0, -3],
    isOccupied: false,
  },
  {
    id: 'cr_stall_5',
    label: "Women's Stall 2",
    stallNumber: 2,
    position: [-33, 0, -1],
    approachTile: [-32, 0, -1],
    isOccupied: false,
  },
  {
    id: 'cr_stall_6',
    label: "Women's Stall 3 (Accessible)",
    stallNumber: 3,
    position: [-37, 0, -2],
    approachTile: [-36, 0, -2],
    isOccupied: false,
  },
]

export const COMFORT_ROOM_STALLS: ComfortRoomStall[] = [
  ...MENS_CR_STALLS,
  ...WOMENS_CR_STALLS,
]

export interface ServerRackSlot {
  id: string
  label: string
  position: [number, number, number]
  approachTile: [number, number, number]
  status: 'nominal' | 'inspected' | 'cooling'
  ledColor: string
}

export const SERVER_RACKS: ServerRackSlot[] = [
  {
    id: 'rack_alpha',
    label: 'Primary Compute Rack 01',
    position: [-37, 0, 2.5],
    approachTile: [-36, 0, 2.5],
    status: 'nominal',
    ledColor: '#22c55e',
  },
  {
    id: 'rack_beta',
    label: 'Database Storage Array 02',
    position: [-37, 0, 4.5],
    approachTile: [-36, 0, 4.5],
    status: 'nominal',
    ledColor: '#0ea5e9',
  },
  {
    id: 'rack_gamma',
    label: 'Inference Accelerator 03',
    position: [-35, 0, 5],
    approachTile: [-35, 0, 4],
    status: 'nominal',
    ledColor: '#a855f7',
  },
]

// 24 Dining Seats arranged across 6 four-person cafeteria tables
export const CAFETERIA_SEATS: DiningSeat[] = Array.from({ length: 24 }, (_, i) => {
  const tableIdx = Math.floor(i / 4) + 1
  const seatIdx = (i % 4) + 1
  const tableRow = Math.floor((tableIdx - 1) / 3) // 0 or 1
  const tableCol = (tableIdx - 1) % 3 // 0, 1, 2

  const tableBaseX = -38 + tableCol * 4
  const tableBaseZ = 12 + tableRow * 4

  const offsets: Record<number, [number, number]> = {
    1: [-0.9, 0],
    2: [0.9, 0],
    3: [0, -0.9],
    4: [0, 0.9],
  }
  const [ox, oz] = offsets[seatIdx] || [0, 0]

  return {
    id: `cafe_seat_${i + 1}`,
    tableIndex: tableIdx,
    seatIndex: seatIdx,
    position: [tableBaseX + ox, 0.45, tableBaseZ + oz],
    approachTile: [tableBaseX + ox * 1.3, 0, tableBaseZ + oz * 1.3],
    isOccupied: false,
  }
})

export const WATER_DISPENSERS: WaterDispenser[] = [
  {
    id: 'dispenser_corridor_north',
    label: 'Corridor North Water Dispenser',
    roomId: 'CORRIDORS',
    position: [0, 0, -8],
    jugLevelPct: 100,
    lastRefilledAt: new Date().toISOString(),
  },
  {
    id: 'dispenser_corridor_south',
    label: 'Corridor South Water Dispenser',
    roomId: 'CORRIDORS',
    position: [0, 0, 8],
    jugLevelPct: 100,
    lastRefilledAt: new Date().toISOString(),
  },
  {
    id: 'dispenser_engineering',
    label: 'Engineering Core Water Dispenser',
    roomId: 'ENGINEERING',
    position: [-11, 0, -11],
    jugLevelPct: 95,
    lastRefilledAt: new Date().toISOString(),
  },
  {
    id: 'dispenser_secops',
    label: 'QA & SecOps Water Dispenser',
    roomId: 'SECOPS',
    position: [11, 0, -1],
    jugLevelPct: 90,
    lastRefilledAt: new Date().toISOString(),
  },
  {
    id: 'dispenser_gym',
    label: 'Fitness Gym Hydration Station',
    roomId: 'GYM',
    position: [5, 0, 11],
    jugLevelPct: 85,
    lastRefilledAt: new Date().toISOString(),
  },
  {
    id: 'dispenser_cafeteria',
    label: 'Grand Cafeteria Water Dispenser',
    roomId: 'CAFETERIA',
    position: [-31, 0, 12],
    jugLevelPct: 100,
    lastRefilledAt: new Date().toISOString(),
  },
]

// =============================================================================
// 2. RESERVATION & ALLOCATION ENGINE (No Double-Booking, Polite Queues)
// =============================================================================

export class WellnessSlotManager {
  private beds: Map<string, WellnessBed> = new Map()
  private stalls: Map<string, ComfortRoomStall> = new Map()
  private seats: Map<string, DiningSeat> = new Map()
  private dispensers: Map<string, WaterDispenser> = new Map()

  constructor() {
    WELLNESS_BEDS.forEach((b) => this.beds.set(b.id, { ...b }))
    COMFORT_ROOM_STALLS.forEach((s) => this.stalls.set(s.id, { ...s }))
    CAFETERIA_SEATS.forEach((c) => this.seats.set(c.id, { ...c }))
    WATER_DISPENSERS.forEach((d) => this.dispensers.set(d.id, { ...d }))
  }

  // --- Bed Reservations ---
  reserveBed(agentId: string, preferredBedId?: string): WellnessBed | null {
    // Prevent double reservation
    for (const bed of this.beds.values()) {
      if (bed.occupiedBy === agentId) return bed
    }

    if (preferredBedId) {
      const bed = this.beds.get(preferredBedId)
      if (bed && !bed.occupiedBy) {
        bed.occupiedBy = agentId
        bed.occupiedSince = new Date().toISOString()
        return bed
      }
    }

    // Auto-allocate first available bed
    for (const bed of this.beds.values()) {
      if (!bed.occupiedBy) {
        bed.occupiedBy = agentId
        bed.occupiedSince = new Date().toISOString()
        return bed
      }
    }
    return null
  }

  releaseBed(agentId: string): boolean {
    for (const bed of this.beds.values()) {
      if (bed.occupiedBy === agentId) {
        bed.occupiedBy = null
        bed.occupiedSince = null
        return true
      }
    }
    return false
  }

  // --- CR Stall Reservations ---
  occupyStall(agentId: string, preferredStallId?: string): ComfortRoomStall | null {
    for (const stall of this.stalls.values()) {
      if (stall.occupiedBy === agentId) return stall
    }

    if (preferredStallId) {
      const stall = this.stalls.get(preferredStallId)
      if (stall && !stall.isOccupied) {
        stall.isOccupied = true
        stall.occupiedBy = agentId
        stall.occupiedSince = new Date().toISOString()
        return stall
      }
    }

    for (const stall of this.stalls.values()) {
      if (!stall.isOccupied) {
        stall.isOccupied = true
        stall.occupiedBy = agentId
        stall.occupiedSince = new Date().toISOString()
        return stall
      }
    }
    return null
  }

  releaseStall(agentId: string): boolean {
    for (const stall of this.stalls.values()) {
      if (stall.occupiedBy === agentId) {
        stall.isOccupied = false
        stall.occupiedBy = null
        stall.occupiedSince = null
        return true
      }
    }
    return false
  }

  // --- Cafeteria Seat Reservations ---
  occupyDiningSeat(agentId: string): DiningSeat | null {
    for (const seat of this.seats.values()) {
      if (seat.occupiedBy === agentId) return seat
    }

    for (const seat of this.seats.values()) {
      if (!seat.isOccupied) {
        seat.isOccupied = true
        seat.occupiedBy = agentId
        return seat
      }
    }
    return null
  }

  releaseDiningSeat(agentId: string): boolean {
    for (const seat of this.seats.values()) {
      if (seat.occupiedBy === agentId) {
        seat.isOccupied = false
        seat.occupiedBy = null
        return true
      }
    }
    return false
  }

  // --- Water Dispenser Depletion & Service ---
  drinkWater(dispenserId: string, amountPct = 2): number {
    const disp = this.dispensers.get(dispenserId)
    if (!disp) return 0
    disp.jugLevelPct = Math.max(0, disp.jugLevelPct - amountPct)
    return disp.jugLevelPct
  }

  replaceWaterJug(dispenserId: string): boolean {
    const disp = this.dispensers.get(dispenserId)
    if (!disp) return false
    disp.jugLevelPct = 100
    disp.lastRefilledAt = new Date().toISOString()
    return true
  }

  getSnapshot() {
    return {
      beds: Array.from(this.beds.values()),
      stalls: Array.from(this.stalls.values()),
      seats: Array.from(this.seats.values()),
      dispensers: Array.from(this.dispensers.values()),
    }
  }
}

// Global Singleton Slot Manager
export const wellnessSlotManager = new WellnessSlotManager()

// =============================================================================
// 3. DEPARTMENT REGISTRY & "ADD DEPARTMENT" WIZARD
// =============================================================================

export const DEFAULT_DEPARTMENTS: DepartmentRecord[] = [
  { id: 'ENGINEERING', name: 'Engineering Core', color: '#6366f1', roomId: 'ENGINEERING', kind: 'open_office' },
  { id: 'OPERATIONS', name: 'Operations Hub', color: '#22c55e', roomId: 'OPERATIONS', kind: 'open_office' },
  { id: 'GROWTH', name: 'Growth Lab', color: '#3b82f6', roomId: 'GROWTH', kind: 'lab' },
  { id: 'EXECUTIVE', name: 'Executive Lounge', color: '#a855f7', roomId: 'EXECUTIVE', kind: 'studio' },
  { id: 'COMMAND', name: 'Command Center ("The Brain")', color: '#00e5ff', roomId: 'COMMAND', kind: 'meeting' },
  { id: 'SECOPS', name: 'QA & SecOps NOC', color: '#ec4899', roomId: 'SECOPS', kind: 'lab' },
  { id: 'INTELLIGENCE', name: 'Intelligence Lab', color: '#14b8a6', roomId: 'INTELLIGENCE', kind: 'lab' },
  { id: 'FACILITIES_WELLNESS', name: 'Facilities & Wellness', color: '#10b981', roomId: 'WELLNESS', kind: 'wellness' },
]

export interface AddDepartmentInput {
  id: string
  name: string
  color: string
  kind: 'open_office' | 'lab' | 'studio' | 'meeting'
  deskCount?: number
}

/**
 * Validates and provisions a new department configuration
 */
export function validateAndCreateDepartment(input: AddDepartmentInput): {
  valid: boolean
  department?: DepartmentRecord
  error?: string
} {
  const normId = input.id.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  if (!normId || normId.length < 2) {
    return { valid: false, error: 'Department ID must be at least 2 alphanumeric characters' }
  }
  if (!input.name || input.name.trim().length === 0) {
    return { valid: false, error: 'Department name is required' }
  }
  if (!input.color || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(input.color)) {
    return { valid: false, error: 'Valid hex color is required' }
  }

  // Pre-configured room template
  const roomId = `DEPT_${normId}`
  const dept: DepartmentRecord = {
    id: normId,
    name: input.name.trim(),
    color: input.color,
    roomId,
    kind: input.kind,
  }

  return { valid: true, department: dept }
}
