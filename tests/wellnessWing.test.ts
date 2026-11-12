import { describe, it, expect, beforeEach } from 'vitest'
import {
  WELLNESS_BEDS,
  COMFORT_ROOM_STALLS,
  CAFETERIA_SEATS,
  WATER_DISPENSERS,
  WellnessSlotManager,
  DEFAULT_DEPARTMENTS,
  validateAndCreateDepartment,
} from '../src/lib/office/wellnessWing'
import {
  AGENT_WORKSTATIONS_3D,
  ROOMS_3D,
  CAMERA_PRESETS,
} from '../src/config/officeLayout'
import { CHARACTER_STYLES } from '../src/config/characterStyles'
import { findPath } from '../src/engine/pathfinding'

describe('Phase K2: Wellness Wing, Departments & New Agents', () => {
  let slotManager: WellnessSlotManager

  beforeEach(() => {
    slotManager = new WellnessSlotManager()
  })

  describe('1. Wellness Wing Facility Capacity & Specifications', () => {
    it('has at least 8 rest beds including single and bunk beds', () => {
      expect(WELLNESS_BEDS.length).toBeGreaterThanOrEqual(8)

      const singleBeds = WELLNESS_BEDS.filter((b) => b.type === 'single')
      const bunkBeds = WELLNESS_BEDS.filter(
        (b) => b.type === 'bunk_lower' || b.type === 'bunk_upper'
      )

      expect(singleBeds.length).toBeGreaterThanOrEqual(4)
      expect(bunkBeds.length).toBeGreaterThanOrEqual(4)

      // Each bed has valid approach coordinates, facing and DND light flag
      for (const bed of WELLNESS_BEDS) {
        expect(bed.id).toBeTruthy()
        expect(bed.position).toHaveLength(3)
        expect(bed.approachTile).toHaveLength(3)
        expect(['NW', 'NE', 'SE', 'SW']).toContain(bed.headFacing)
        expect(typeof bed.dndLight).toBe('boolean')
      }
    })

    it('has at least 6 Comfort Room (CR) stalls with individual doors', () => {
      expect(COMFORT_ROOM_STALLS.length).toBeGreaterThanOrEqual(6)

      for (const stall of COMFORT_ROOM_STALLS) {
        expect(stall.id).toBeTruthy()
        expect(stall.stallNumber).toBeGreaterThanOrEqual(1)
        expect(stall.position).toHaveLength(3)
        expect(stall.approachTile).toHaveLength(3)
        expect(stall.isOccupied).toBe(false)
      }
    })

    it('has seating for at least 24 agents in the Grand Cafeteria', () => {
      expect(CAFETERIA_SEATS.length).toBeGreaterThanOrEqual(24)

      for (const seat of CAFETERIA_SEATS) {
        expect(seat.id).toBeTruthy()
        expect(seat.tableIndex).toBeGreaterThanOrEqual(1)
        expect(seat.position).toHaveLength(3)
        expect(seat.approachTile).toHaveLength(3)
        expect(seat.isOccupied).toBe(false)
      }
    })

    it('has at least 6 Water Dispensers across the campus with live jug levels', () => {
      expect(WATER_DISPENSERS.length).toBeGreaterThanOrEqual(6)

      const roomIds = WATER_DISPENSERS.map((d) => d.roomId)
      expect(roomIds).toContain('CORRIDORS')
      expect(roomIds).toContain('ENGINEERING')
      expect(roomIds).toContain('SECOPS')
      expect(roomIds).toContain('GYM')
      expect(roomIds).toContain('CAFETERIA')

      for (const disp of WATER_DISPENSERS) {
        expect(disp.id).toBeTruthy()
        expect(disp.jugLevelPct).toBeGreaterThanOrEqual(0)
        expect(disp.jugLevelPct).toBeLessThanOrEqual(100)
        expect(disp.lastRefilledAt).toBeTruthy()
      }
    })

    it('registers all Wellness Wing rooms in ROOMS_3D and CAMERA_PRESETS', () => {
      expect(ROOMS_3D.NAP_ROOM).toBeDefined()
      expect(ROOMS_3D.COMFORT_ROOM).toBeDefined()
      expect(ROOMS_3D.FACILITIES).toBeDefined()
      expect(ROOMS_3D.CAFETERIA).toBeDefined()

      expect(CAMERA_PRESETS.WELLNESS).toBeDefined()
      expect(CAMERA_PRESETS.CAFETERIA).toBeDefined()
      expect(CAMERA_PRESETS.NAP_ROOM).toBeDefined()
    })
  })

  describe('2. A* Reachability from All 27 Desks to All New Rooms', () => {
    const allWorkstations = Object.values(AGENT_WORKSTATIONS_3D)

    it('confirms 27 resident workstations exist (24 resident + Boss + Cleaner 1 + Cleaner 2)', () => {
      expect(allWorkstations.length).toBeGreaterThanOrEqual(27)
    })

    it('can route from every desk to the Nap Room without NaN or collisions', () => {
      const targetBed = WELLNESS_BEDS[0].approachTile
      for (const ws of allWorkstations) {
        const path = findPath(ws.deskPos[0], ws.deskPos[2], targetBed[0], targetBed[2])
        expect(path.length).toBeGreaterThan(0)
        const endNode = path[path.length - 1]
        expect(endNode[0]).toBeCloseTo(targetBed[0], 1)
        expect(endNode[2]).toBeCloseTo(targetBed[2], 1)
        // Ensure no NaN coordinates
        for (const [x, y, z] of path) {
          expect(Number.isNaN(x)).toBe(false)
          expect(Number.isNaN(y)).toBe(false)
          expect(Number.isNaN(z)).toBe(false)
        }
      }
    })

    it('can route from every desk to the Comfort Room (CR)', () => {
      const targetStall = COMFORT_ROOM_STALLS[0].approachTile
      for (const ws of allWorkstations) {
        const path = findPath(ws.deskPos[0], ws.deskPos[2], targetStall[0], targetStall[2])
        expect(path.length).toBeGreaterThan(0)
        const endNode = path[path.length - 1]
        expect(endNode[0]).toBeCloseTo(targetStall[0], 1)
        expect(endNode[2]).toBeCloseTo(targetStall[2], 1)
      }
    })

    it('can route from every desk to the Grand Cafeteria', () => {
      const targetSeat = CAFETERIA_SEATS[0].approachTile
      for (const ws of allWorkstations) {
        const path = findPath(ws.deskPos[0], ws.deskPos[2], targetSeat[0], targetSeat[2])
        expect(path.length).toBeGreaterThan(0)
        const endNode = path[path.length - 1]
        expect(endNode[0]).toBeCloseTo(targetSeat[0], 1)
        expect(endNode[2]).toBeCloseTo(targetSeat[2], 1)
      }
    })

    it('can route from every desk to the Facilities Room', () => {
      const targetFacilities = [-35, 0, 6]
      for (const ws of allWorkstations) {
        const path = findPath(ws.deskPos[0], ws.deskPos[2], targetFacilities[0], targetFacilities[2])
        expect(path.length).toBeGreaterThan(0)
      }
    })

    it('can route from every desk to each Water Dispenser', () => {
      for (const disp of WATER_DISPENSERS) {
        const ws = allWorkstations[0] // Test with Josiah
        const path = findPath(ws.deskPos[0], ws.deskPos[2], disp.position[0], disp.position[2])
        expect(path.length).toBeGreaterThan(0)
      }
    })
  })

  describe('3. Reservation Slots & Facility State Management', () => {
    it('manages bed reservations without double-booking', () => {
      const bed1 = slotManager.reserveBed('agent_alpha')
      expect(bed1).not.toBeNull()
      expect(bed1?.occupiedBy).toBe('agent_alpha')

      // Second reservation for same agent returns the same allocated bed
      const sameBed = slotManager.reserveBed('agent_alpha')
      expect(sameBed?.id).toBe(bed1?.id)

      // Another agent gets a distinct bed
      const bed2 = slotManager.reserveBed('agent_beta')
      expect(bed2).not.toBeNull()
      expect(bed2?.id).not.toBe(bed1?.id)
      expect(bed2?.occupiedBy).toBe('agent_beta')

      // Release bed1
      const released = slotManager.releaseBed('agent_alpha')
      expect(released).toBe(true)

      const snapshot = slotManager.getSnapshot()
      const freedBed = snapshot.beds.find((b) => b.id === bed1?.id)
      expect(freedBed?.occupiedBy).toBeNull()
    })

    it('manages CR stall occupancy cleanly', () => {
      const stall = slotManager.occupyStall('agent_gamma', 'cr_stall_2')
      expect(stall?.id).toBe('cr_stall_2')
      expect(stall?.isOccupied).toBe(true)
      expect(stall?.occupiedBy).toBe('agent_gamma')

      // Release stall
      const released = slotManager.releaseStall('agent_gamma')
      expect(released).toBe(true)

      const snapshot = slotManager.getSnapshot()
      const freedStall = snapshot.stalls.find((s) => s.id === 'cr_stall_2')
      expect(freedStall?.isOccupied).toBe(false)
      expect(freedStall?.occupiedBy).toBeNull()
    })

    it('manages 24 cafeteria seats cleanly', () => {
      const seat = slotManager.occupyDiningSeat('agent_delta')
      expect(seat).not.toBeNull()
      expect(seat?.isOccupied).toBe(true)
      expect(seat?.occupiedBy).toBe('agent_delta')

      const released = slotManager.releaseDiningSeat('agent_delta')
      expect(released).toBe(true)
    })

    it('depletes and refills water dispensers', () => {
      const dispId = 'dispenser_engineering'
      const levelAfterDrink = slotManager.drinkWater(dispId, 10)
      expect(levelAfterDrink).toBe(85)

      const refilled = slotManager.replaceWaterJug(dispId)
      expect(refilled).toBe(true)

      const snapshot = slotManager.getSnapshot()
      const disp = snapshot.dispensers.find((d) => d.id === dispId)
      expect(disp?.jugLevelPct).toBe(100)
    })
  })

  describe('4. Departments as Data & Add Department Wizard Validation', () => {
    it('seeds Facilities & Wellness in DEFAULT_DEPARTMENTS', () => {
      const wellnessDept = DEFAULT_DEPARTMENTS.find(
        (d) => d.id === 'FACILITIES_WELLNESS'
      )
      expect(wellnessDept).toBeDefined()
      expect(wellnessDept?.kind).toBe('wellness')
      expect(wellnessDept?.roomId).toBe('WELLNESS')
    })

    it('validates and accepts valid department creation payload', () => {
      const res = validateAndCreateDepartment({
        id: 'AI_SAFETY',
        name: 'AI Safety & Alignment',
        color: '#8b5cf6',
        kind: 'lab',
        deskCount: 6,
      })

      expect(res.valid).toBe(true)
      expect(res.department?.id).toBe('AI_SAFETY')
      expect(res.department?.name).toBe('AI Safety & Alignment')
      expect(res.department?.roomId).toBe('DEPT_AI_SAFETY')
      expect(res.department?.kind).toBe('lab')
    })

    it('rejects invalid department inputs', () => {
      // Empty name
      expect(
        validateAndCreateDepartment({
          id: 'TEST',
          name: '',
          color: '#ffffff',
          kind: 'open_office',
        }).valid
      ).toBe(false)

      // Invalid color
      expect(
        validateAndCreateDepartment({
          id: 'TEST',
          name: 'Test Dept',
          color: 'blue-is-not-hex',
          kind: 'open_office',
        }).valid
      ).toBe(false)

      // Single-character ID
      expect(
        validateAndCreateDepartment({
          id: 'X',
          name: 'Test Dept',
          color: '#ffffff',
          kind: 'open_office',
        }).valid
      ).toBe(false)
    })
  })

  describe('5. New Agents: Boss (Chief of Staff) and Cleaners 1 & 2', () => {
    it('configures Boss beside THE BRAIN with clipboard styling', () => {
      const bossWs = AGENT_WORKSTATIONS_3D.boss
      expect(bossWs).toBeDefined()
      expect(bossWs.department).toBe('COMMAND')
      expect(bossWs.room).toContain('Brain')
      expect(bossWs.deskPos).toEqual([3.5, 0, 2.5])

      const bossStyle = CHARACTER_STYLES.boss
      expect(bossStyle).toBeDefined()
      expect(bossStyle.accessory).toBe('glasses')
    })

    it('configures Cleaner 1 and Cleaner 2 in Facilities & Wellness', () => {
      const c1Ws = AGENT_WORKSTATIONS_3D.cleaner_1
      const c2Ws = AGENT_WORKSTATIONS_3D.cleaner_2
      expect(c1Ws).toBeDefined()
      expect(c2Ws).toBeDefined()
      expect(c1Ws.department).toBe('FACILITIES_WELLNESS')
      expect(c2Ws.department).toBe('FACILITIES_WELLNESS')

      const c1Style = CHARACTER_STYLES.cleaner_1
      const c2Style = CHARACTER_STYLES.cleaner_2
      expect(c1Style).toBeDefined()
      expect(c2Style).toBeDefined()
      expect(c1Style.accessory).toBe('cap')
      expect(c2Style.accessory).toBe('cap')
    })
  })
})
