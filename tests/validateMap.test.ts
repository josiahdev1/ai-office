import { describe, it, expect } from 'vitest'
import {
  validateOfficeMap,
  validateNoZoneOverlaps,
  validateFurnitureBounds,
  validateFurnitureNoOverlaps,
  validateSpotsWalkable,
  validateConnectivity,
  validateChairFacings,
} from '../src/lib/office/validateMap'
import {
  OFFICE_ZONES,
  OFFICE_FURNITURE,
  MAP_CONFIG,
  ASSIGNED_DESKS,
  BRAIN_MEETING_SPOTS,
  PANTRY_ACTIVITY_SPOTS,
  GYM_ACTIVITY_SPOTS,
  buildCollisionGrid,
} from '../src/lib/office/map'

describe('Isometric Office Map & Collision Validation (Bug 3 Prevention)', () => {
  it('should have zero zone overlaps across all departments and facilities', () => {
    const errors = validateNoZoneOverlaps(OFFICE_ZONES)
    expect(errors).toEqual([])
  })

  it('should have all furniture strictly inside map boundaries', () => {
    const errors = validateFurnitureBounds(
      OFFICE_FURNITURE,
      MAP_CONFIG.cols,
      MAP_CONFIG.rows
    )
    expect(errors).toEqual([])
  })

  it('should have zero furniture collisions or overlaps', () => {
    const errors = validateFurnitureNoOverlaps(OFFICE_FURNITURE)
    expect(errors).toEqual([])
  })

  it('should have all 23 desk chairs on walkable tiles', () => {
    const grid = buildCollisionGrid()
    const deskSpots = ASSIGNED_DESKS.map((d) => ({
      id: `chair-${d.id}`,
      zone: 'desk' as const,
      gx: d.chairGx,
      gy: d.chairGy,
      activity: 'typing',
      facing: d.facing,
    }))
    const errors = validateSpotsWalkable(deskSpots, grid)
    expect(errors).toEqual([])
  })

  it('should have $\\ge 30$ Brain meeting spots and all must be walkable', () => {
    expect(BRAIN_MEETING_SPOTS.length).toBeGreaterThanOrEqual(30)
    const grid = buildCollisionGrid()
    const errors = validateSpotsWalkable(BRAIN_MEETING_SPOTS, grid)
    expect(errors).toEqual([])
  })

  it('should have $\\ge 30$ Pantry/Lounge break spots and all must be walkable', () => {
    expect(PANTRY_ACTIVITY_SPOTS.length).toBeGreaterThanOrEqual(30)
    const grid = buildCollisionGrid()
    const errors = validateSpotsWalkable(PANTRY_ACTIVITY_SPOTS, grid)
    expect(errors).toEqual([])
  })

  it('should have 100% reachability from central circulation to all activity spots', () => {
    const grid = buildCollisionGrid()
    const allSpots = [
      ...ASSIGNED_DESKS.map((d) => ({
        id: `chair-${d.id}`,
        zone: 'desk' as const,
        gx: d.chairGx,
        gy: d.chairGy,
        activity: 'typing',
        facing: d.facing,
      })),
      ...BRAIN_MEETING_SPOTS,
      ...PANTRY_ACTIVITY_SPOTS,
      ...GYM_ACTIVITY_SPOTS,
    ]
    const errors = validateConnectivity(grid, { gx: 9, gy: 8 }, allSpots)
    expect(errors).toEqual([])
  })

  it('should pass full master map validation suite', () => {
    const report = validateOfficeMap()
    expect(report.valid).toBe(true)
    expect(report.errors).toEqual([])
    expect(report.stats.assignedDesks).toBe(23)
  })

  it('should have a valid, walkable elevator entrance connected to circulation on every floor', () => {
    const grid = buildCollisionGrid()
    // Elevator door tile at (8, 2) must be walkable
    expect(grid[2][8]).toBe(true)

    // Elevator door must be reachable from central circulation
    const elevatorSpot = [
      {
        id: 'elevator-door',
        zone: 'desk' as const,
        gx: 8,
        gy: 2,
        activity: 'waiting_elevator',
        facing: 'SE' as const,
      },
    ]
    const errors = validateConnectivity(grid, { gx: 9, gy: 8 }, elevatorSpot)
    expect(errors).toEqual([])
  })

  it('should assign all 23 resident desks to either Floor 1 (Engineering/QA/Ops) or Floor 2 (Growth/Intel/Cmd)', () => {
    const floor1Desks = ASSIGNED_DESKS.filter((d) => d.floor === 1)
    const floor2Desks = ASSIGNED_DESKS.filter((d) => d.floor === 2)
    expect(floor1Desks.length).toBe(13)
    expect(floor2Desks.length).toBe(10)
    expect(floor1Desks.length + floor2Desks.length).toBe(23)
  })

  it('should enforce that all 23 desk chairs have valid facing and point directly at their monitor', () => {
    const errors = validateChairFacings(ASSIGNED_DESKS)
    expect(errors).toEqual([])
  })

  it('should have varied desk orientations across the office (NW rows, NE rows, SE executive/back-to-back)', () => {
    const nwDesks = ASSIGNED_DESKS.filter((d) => d.facing === 'NW')
    const neDesks = ASSIGNED_DESKS.filter((d) => d.facing === 'NE')
    const seDesks = ASSIGNED_DESKS.filter((d) => d.facing === 'SE')

    // Must have a healthy variety of facings instead of all facing the camera
    expect(nwDesks.length).toBeGreaterThanOrEqual(10) // Behind view facing monitor
    expect(neDesks.length).toBeGreaterThanOrEqual(3)  // QA NOC rows facing up-right
    expect(seDesks.length).toBeGreaterThanOrEqual(4)  // Managers and back-to-back facing camera
    expect(nwDesks.length + neDesks.length + seDesks.length).toBe(23)
  })
})
