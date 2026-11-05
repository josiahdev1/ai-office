import { describe, it, expect } from 'vitest'
import {
  validateOfficeMap,
  validateNoZoneOverlaps,
  validateFurnitureBounds,
  validateFurnitureNoOverlaps,
  validateSpotsWalkable,
  validateConnectivity,
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
})
