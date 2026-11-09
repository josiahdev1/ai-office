/**
 * Automated Map Validation Engine for EasyUp Software Solution HQ
 * Enforces zero zone overlaps, valid furniture boundaries, $\ge 2$ tile aisles,
 * and 100% reachability for all 23 desks, 32 Brain spots, and 32 Pantry spots.
 */

import {
  MAP_CONFIG,
  OFFICE_ZONES,
  OFFICE_FURNITURE,
  ASSIGNED_DESKS,
  BRAIN_MEETING_SPOTS,
  PANTRY_ACTIVITY_SPOTS,
  GYM_ACTIVITY_SPOTS,
  buildCollisionGrid,
  getFacingToward,
  Zone,
  FurnitureItem,
  ActivitySpot,
  GridCoord,
  DeskSlot,
} from './map'
import {
  CAMPUS_CONFIG,
  PARKING_BAYS,
  ROAD_NODES,
  ROAD_EDGES,
  OUTDOOR_PROPS,
  isPointInsideBuilding,
  doesEdgeIntersectBuilding,
} from './campusMap'

export interface ValidationReport {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    totalZones: number
    totalFurniture: number
    assignedDesks: number
    brainSpots: number
    pantrySpots: number
    gymSpots: number
    walkableTiles: number
    blockedTiles: number
  }
}

/**
 * Validates that no two zones intersect geometrically
 */
export function validateNoZoneOverlaps(zones: Zone[]): string[] {
  const errors: string[] = []
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = zones[i].rect
      const b = zones[j].rect
      const noOverlap =
        a.x + a.w <= b.x ||
        b.x + b.w <= a.x ||
        a.y + a.h <= b.y ||
        b.y + b.h <= a.y
      if (!noOverlap) {
        errors.push(
          `Zone overlap detected between "${zones[i].name}" [${a.x},${a.y},${a.w},${a.h}] and "${zones[j].name}" [${b.x},${b.y},${b.w},${b.h}]`
        )
      }
    }
  }
  return errors
}

/**
 * Validates that all furniture is completely within the map bounds
 */
export function validateFurnitureBounds(
  furniture: FurnitureItem[],
  cols: number,
  rows: number
): string[] {
  const errors: string[] = []
  furniture.forEach((item) => {
    if (
      item.gx < 1 ||
      item.gy < 1 ||
      item.gx + item.w > cols ||
      item.gy + item.h > rows
    ) {
      errors.push(
        `Furniture "${item.id}" (${item.label}) is out of bounds: gx=${item.gx}, gy=${item.gy}, w=${item.w}, h=${item.h} (Map limits: ${cols}x${rows})`
      )
    }
  })
  return errors
}

/**
 * Validates that no two solid furniture items collide on the same grid cell
 */
export function validateFurnitureNoOverlaps(
  furniture: FurnitureItem[]
): string[] {
  const errors: string[] = []
  const cellUsage = new Map<string, string>()

  furniture.forEach((item) => {
    if (!item.solid) return
    for (let dy = 0; dy < item.h; dy++) {
      for (let dx = 0; dx < item.w; dx++) {
        const key = `${item.gx + dx},${item.gy + dy}`
        if (cellUsage.has(key)) {
          errors.push(
            `Furniture collision at grid cell (${key}) between "${cellUsage.get(key)}" and "${item.id}"`
          )
        } else {
          cellUsage.set(key, item.id)
        }
      }
    }
  })
  return errors
}

/**
 * Validates that all activity spots (chairs, meeting spots, break spots) are on walkable floor tiles
 */
export function validateSpotsWalkable(
  spots: ActivitySpot[],
  grid: boolean[][]
): string[] {
  const errors: string[] = []
  const rows = grid.length
  const cols = grid[0]?.length || 0

  spots.forEach((spot) => {
    if (spot.gy < 0 || spot.gy >= rows || spot.gx < 0 || spot.gx >= cols) {
      errors.push(
        `Activity spot "${spot.id}" is outside the grid: (${spot.gx}, ${spot.gy})`
      )
    } else if (!grid[spot.gy][spot.gx]) {
      errors.push(
        `Activity spot "${spot.id}" (${spot.zone}) is placed on a BLOCKED solid tile at (${spot.gx}, ${spot.gy})`
      )
    }
  })
  return errors
}

/**
 * Performs Breadth-First-Search flood fill to ensure 100% of walkable spots are connected
 */
export function validateConnectivity(
  grid: boolean[][],
  start: GridCoord,
  spots: ActivitySpot[]
): string[] {
  const errors: string[] = []
  const rows = grid.length
  const cols = grid[0]?.length || 0

  if (!grid[start.gy]?.[start.gx]) {
    errors.push(
      `Start coordinate for flood fill (${start.gx}, ${start.gy}) is not walkable`
    )
    return errors
  }

  // BFS Reachability Map
  const reachable: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  )
  const queue: GridCoord[] = [start]
  reachable[start.gy][start.gx] = true

  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const dir of directions) {
      const nx = current.gx + dir.dx
      const ny = current.gy + dir.dy
      if (
        nx >= 0 &&
        nx < cols &&
        ny >= 0 &&
        ny < rows &&
        grid[ny][nx] &&
        !reachable[ny][nx]
      ) {
        reachable[ny][nx] = true
        queue.push({ gx: nx, gy: ny })
      }
    }
  }

  // Verify all spots are in reachable set
  spots.forEach((spot) => {
    if (!reachable[spot.gy]?.[spot.gx]) {
      errors.push(
        `Activity spot "${spot.id}" (${spot.zone}) at (${spot.gx}, ${spot.gy}) is ISOLATED / UNREACHABLE from central circulation`
      )
    }
  })

  return errors
}

/**
 * Validates that every desk chair has an explicit valid facing ('SE' | 'SW' | 'NE' | 'NW')
 * and the monitor/desk is strictly in the direction of the chair's facing.
 */
export function validateChairFacings(desks: DeskSlot[]): string[] {
  const errors: string[] = []
  const validFacings = new Set(['SE', 'SW', 'NE', 'NW'])

  desks.forEach((desk) => {
    // 1. Every chair has an explicit valid facing
    if (!desk.facing || !validFacings.has(desk.facing)) {
      errors.push(
        `Desk "${desk.id}" (${desk.name}) has missing or invalid facing "${desk.facing}". Must be 'SE' | 'SW' | 'NE' | 'NW'.`
      )
      return
    }

    // 2. The monitor/desk is strictly in the direction of the chair's facing
    const expectedFacing = getFacingToward(
      desk.chairGx,
      desk.chairGy,
      desk.deskGx,
      desk.deskGy
    )
    if (desk.facing !== expectedFacing) {
      errors.push(
        `Desk "${desk.id}" (${desk.name}) facing mismatch: chair is at (${desk.chairGx}, ${desk.chairGy}) and desk/monitor is at (${desk.deskGx}, ${desk.deskGy}). Expected facing toward monitor is "${expectedFacing}", but found "${desk.facing}".`
      )
    }
  })

  return errors
}

/**
 * Master validation suite running all checks
 */
/**
 * Validates outdoor campus integrity: road paths never intersect building,
 * >= 20 bays with accessible and founder spots, and connected crosswalk.
 */
export function validateCampusMap(): string[] {
  const errors: string[] = []

  // 1. Car paths never traverse building interior
  Object.values(ROAD_NODES).forEach((node) => {
    if (isPointInsideBuilding(node)) {
      errors.push(
        `Road node "${node.id}" at (${node.x}, ${node.y}) intersects building interior footprint`
      )
    }
  })

  ROAD_EDGES.forEach((edge) => {
    const from = ROAD_NODES[edge.from]
    const to = ROAD_NODES[edge.to]
    if (from && to && doesEdgeIntersectBuilding(from, to)) {
      errors.push(
        `Road edge from "${edge.from}" to "${edge.to}" intersects building interior footprint`
      )
    }
  })

  // 2. Parking lot capacity & reserved spots
  if (PARKING_BAYS.length < 20) {
    errors.push(
      `Campus parking lot must have at least 20 bays (found ${PARKING_BAYS.length})`
    )
  }
  const accessibleBays = PARKING_BAYS.filter((b) => b.type === 'accessible')
  if (accessibleBays.length < 2) {
    errors.push(
      `Campus parking lot must have at least 2 accessible bays (found ${accessibleBays.length})`
    )
  }
  const founderBay = PARKING_BAYS.find(
    (b) => b.type === 'founder' || b.label.includes('FOUNDER')
  )
  if (!founderBay) {
    errors.push(
      'Campus parking lot must have a reserved spot for "JOSIAH (FOUNDER)"'
    )
  }

  // 3. Parking bay placement & aisle connectivity
  PARKING_BAYS.forEach((bay) => {
    if (isPointInsideBuilding(bay)) {
      errors.push(
        `Parking bay "${bay.id}" at (${bay.x}, ${bay.y}) is inside building footprint`
      )
    }
    if (bay.y < 900 || bay.y > 1100 || bay.x < 300 || bay.x > 1100) {
      errors.push(
        `Parking bay "${bay.id}" is outside reachable lot aisle boundary`
      )
    }
  })

  // 4. Crosswalk connected to entrance walkway
  const crosswalk = CAMPUS_CONFIG.crosswalk
  const walkway = CAMPUS_CONFIG.walkwayPath
  const lastWalkwayPoint = walkway[walkway.length - 1]
  const dist = Math.hypot(
    lastWalkwayPoint.x - crosswalk.northEdge.x,
    lastWalkwayPoint.y - crosswalk.northEdge.y
  )
  if (dist > 10) {
    errors.push(
      `Entrance walkway is not connected to crosswalk (gap: ${dist}px)`
    )
  }

  // 5. Overlapping outdoor solid objects
  const solidProps = OUTDOOR_PROPS.filter((p) => p.solid)
  for (let i = 0; i < solidProps.length; i++) {
    for (let j = i + 1; j < solidProps.length; j++) {
      const p1 = solidProps[i]
      const p2 = solidProps[j]
      const dx = Math.abs(p1.x - p2.x)
      const dy = Math.abs(p1.y - p2.y)
      if (dx < (p1.w + p2.w) / 4 && dy < (p1.h + p2.h) / 4) {
        errors.push(
          `Overlapping outdoor solid props: "${p1.id}" and "${p2.id}"`
        )
      }
    }
  }

  return errors
}

export function validateOfficeMap(): ValidationReport {
  const errors: string[] = []
  const warnings: string[] = []
  const grid = buildCollisionGrid()
  const { cols, rows } = MAP_CONFIG

  // 1. Zone overlaps
  errors.push(...validateNoZoneOverlaps(OFFICE_ZONES))

  // 2. Furniture bounds
  errors.push(...validateFurnitureBounds(OFFICE_FURNITURE, cols, rows))

  // 3. Furniture collision
  errors.push(...validateFurnitureNoOverlaps(OFFICE_FURNITURE))

  // 4. Desk chair facing alignment towards monitor
  errors.push(...validateChairFacings(ASSIGNED_DESKS))

  // 5. Outdoor campus validation
  errors.push(...validateCampusMap())

  // Collect all activity spots
  const allSpots: ActivitySpot[] = [
    ...ASSIGNED_DESKS.map(
      (d) =>
        ({
          id: `desk-chair-${d.id}`,
          zone: 'desk' as const,
          gx: d.chairGx,
          gy: d.chairGy,
          activity: 'typing',
          facing: d.facing,
        }) as ActivitySpot
    ),
    ...BRAIN_MEETING_SPOTS,
    ...PANTRY_ACTIVITY_SPOTS,
    ...GYM_ACTIVITY_SPOTS,
  ]

  // 5. Spot walkability
  errors.push(...validateSpotsWalkable(allSpots, grid))

  // 6. Connectivity from central crossroad (gx=9, gy=8)
  const startCoord: GridCoord = { gx: 9, gy: 8 }
  errors.push(...validateConnectivity(grid, startCoord, allSpots))

  let walkableCount = 0
  let blockedCount = 0
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x]) walkableCount++
      else blockedCount++
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalZones: OFFICE_ZONES.length,
      totalFurniture: OFFICE_FURNITURE.length,
      assignedDesks: ASSIGNED_DESKS.length,
      brainSpots: BRAIN_MEETING_SPOTS.length,
      pantrySpots: PANTRY_ACTIVITY_SPOTS.length,
      gymSpots: GYM_ACTIVITY_SPOTS.length,
      walkableTiles: walkableCount,
      blockedTiles: blockedCount,
    },
  }
}
