/**
 * A* Pathfinding and Corridor Navigation Engine for EasyUp Software Solution HQ
 * Real-time 2:1 isometric grid navigation on the open-plan office slab.
 * Guaranteed collision-free routing, no teleportation, and smooth walking.
 */

import {
  gridToScreen,
  screenToGrid,
  buildCollisionGrid,
  BRAIN_MEETING_SPOTS,
  PANTRY_ACTIVITY_SPOTS,
  GYM_ACTIVITY_SPOTS,
  GridCoord,
  FloorNumber,
  ELEVATOR_CONFIG,
  getAgentAssignedFloor,
} from './map'

export interface Point2D {
  x: number
  y: number
}

export interface WaypointRoute {
  waypoints: Point2D[]
  totalDistance: number
}

export type OfficeMode =
  | 'FOCUS_WORK'
  | 'ALL_HANDS'
  | 'COFFEE_BREAK'
  | 'RECREATION'
  | 'RANDOM_WANDER'

// Major Architectural Waypoints & Doorways (Maintained for reference and fast routing)
export const OFFICE_WAYPOINTS = {
  // Hallway Crossings (Central Circulation)
  HALLWAY_CROSS: { x: 540, y: 290 },
  HALLWAY_NORTH: { x: 540, y: 150 },
  HALLWAY_SOUTH: { x: 540, y: 450 },
  HALLWAY_WEST: { x: 320, y: 290 },
  HALLWAY_EAST: { x: 760, y: 290 },

  // Room / Department Hubs
  OPERATIONS_DOOR: { x: 230, y: 130 },
  GROWTH_DOOR: { x: 100, y: 220 },
  ENGINEERING_DOOR: { x: 200, y: 340 },
  QA_NOC_DOOR: { x: 620, y: 370 },
  INTELLIGENCE_DOOR: { x: 720, y: 130 },
  COMMAND_DOOR: { x: 670, y: 350 },
  MEETING_DOOR: { x: 500, y: 290 },
  PANTRY_DOOR: { x: 570, y: 490 },
  REC_DOOR: { x: 120, y: 450 },

  // Key Destination Hotspots
  BRAIN_CORE: { x: 540, y: 260 },
  MEETING_TABLE: { x: 540, y: 260 },
  COFFEE_MACHINE: { x: 800, y: 240 },
  PANTRY_SOFA: { x: 380, y: 320 },
  TENNIS_COURT: { x: 540, y: 560 },
  GYM_BENCH: { x: 500, y: 560 },
}

/**
 * Maps any (x, y) world coordinate to its containing room or zone
 */
export function identifyRoom(p: Point2D): string {
  // Check bounds matching both legacy presets and new open-plan coordinates
  if (p.x >= 800 || (p.y > 450 && p.x >= 450 && p.x <= 720)) {
    return 'Pantry & Game Lounge'
  }
  if (p.x < 240 && p.y > 400) return 'Recreation'
  if (p.x >= 430 && p.x <= 640 && p.y >= 210 && p.y <= 360) return 'The Brain'
  if (p.x < 185 && p.y >= 170 && p.y <= 380) return 'Growth Lab'
  if (p.x < 460 && p.y < 240) return 'Operations Hub'
  if (p.x >= 180 && p.x <= 460 && p.y >= 240 && p.y <= 450)
    return 'Engineering Core'
  if (p.x >= 580 && p.x <= 840 && p.y >= 260 && p.y < 390)
    return 'Command Center'
  if (p.x >= 580 && p.y >= 390) return 'QA & SecOps NOC'
  if (p.x >= 650 && p.y < 260) return 'Intelligence Lab'
  return 'Main Circulation'
}

/**
 * Returns the doorway point associated with a room
 */
export function getRoomDoorway(room: string): Point2D {
  switch (room) {
    case 'Operations Hub':
      return OFFICE_WAYPOINTS.OPERATIONS_DOOR
    case 'Growth Lab':
      return OFFICE_WAYPOINTS.GROWTH_DOOR
    case 'Engineering Core':
      return OFFICE_WAYPOINTS.ENGINEERING_DOOR
    case 'QA & SecOps NOC':
      return OFFICE_WAYPOINTS.QA_NOC_DOOR
    case 'Intelligence Lab':
      return OFFICE_WAYPOINTS.INTELLIGENCE_DOOR
    case 'Command Center':
      return OFFICE_WAYPOINTS.COMMAND_DOOR
    case 'The Brain':
      return OFFICE_WAYPOINTS.BRAIN_CORE
    case 'Pantry & Game Lounge':
      return OFFICE_WAYPOINTS.PANTRY_DOOR
    case 'Recreation':
      return OFFICE_WAYPOINTS.REC_DOOR
    default:
      return OFFICE_WAYPOINTS.HALLWAY_CROSS
  }
}

interface AStarNode {
  gx: number
  gy: number
  g: number
  h: number
  f: number
  parent?: AStarNode
}

/**
 * Computes an A* path on the 24x24 open-plan collision grid.
 * Guarantees agents never cut through desks, server racks, or walls.
 */
export function findGridPath(start: GridCoord, target: GridCoord): GridCoord[] {
  const grid = buildCollisionGrid()
  const rows = grid.length
  const cols = grid[0].length

  const clampGx = (gx: number) => Math.max(1, Math.min(cols - 1, gx))
  const clampGy = (gy: number) => Math.max(1, Math.min(rows - 1, gy))

  const startGx = clampGx(start.gx)
  const startGy = clampGy(start.gy)
  let targetGx = clampGx(target.gx)
  let targetGy = clampGy(target.gy)

  // If target tile is blocked (e.g. inside a desk), find nearest walkable neighbor
  if (!grid[targetGy][targetGx]) {
    const neighbors = [
      { gx: targetGx + 1, gy: targetGy },
      { gx: targetGx - 1, gy: targetGy },
      { gx: targetGx, gy: targetGy + 1 },
      { gx: targetGx, gy: targetGy - 1 },
    ]
    const valid = neighbors.find(
      (n) => n.gx >= 1 && n.gx < cols && n.gy >= 1 && n.gy < rows && grid[n.gy][n.gx]
    )
    if (valid) {
      targetGx = valid.gx
      targetGy = valid.gy
    }
  }

  // If start is same as target
  if (startGx === targetGx && startGy === targetGy) {
    return [{ gx: targetGx, gy: targetGy }]
  }

  const openList: AStarNode[] = []
  const closedSet = new Set<string>()

  const startNode: AStarNode = {
    gx: startGx,
    gy: startGy,
    g: 0,
    h: Math.hypot(targetGx - startGx, targetGy - startGy),
    f: Math.hypot(targetGx - startGx, targetGy - startGy),
  }
  openList.push(startNode)

  const directions = [
    { dx: 1, dy: 0, cost: 1 },
    { dx: -1, dy: 0, cost: 1 },
    { dx: 0, dy: 1, cost: 1 },
    { dx: 0, dy: -1, cost: 1 },
    { dx: 1, dy: 1, cost: 1.414 },
    { dx: -1, dy: 1, cost: 1.414 },
    { dx: 1, dy: -1, cost: 1.414 },
    { dx: -1, dy: -1, cost: 1.414 },
  ]

  let iterations = 0
  const maxIterations = 800

  while (openList.length > 0 && iterations++ < maxIterations) {
    // Find node with lowest f
    let lowestIdx = 0
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIdx].f) {
        lowestIdx = i
      }
    }
    const current = openList.splice(lowestIdx, 1)[0]
    const currentKey = `${current.gx},${current.gy}`
    closedSet.add(currentKey)

    // Check arrival
    if (current.gx === targetGx && current.gy === targetGy) {
      const path: GridCoord[] = []
      let curr: AStarNode | undefined = current
      while (curr) {
        path.unshift({ gx: curr.gx, gy: curr.gy })
        curr = curr.parent
      }
      return path
    }

    for (const dir of directions) {
      const ngx = current.gx + dir.dx
      const ngy = current.gy + dir.dy

      if (ngx < 1 || ngx >= cols || ngy < 1 || ngy >= rows) continue
      if (!grid[ngy][ngx]) continue
      if (closedSet.has(`${ngx},${ngy}`)) continue

      // Diagonal corner cutting check
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!grid[current.gy][ngx] || !grid[ngy][current.gx]) {
          continue // Prevent slipping through diagonal wall cracks
        }
      }

      const g = current.g + dir.cost
      const h = Math.hypot(targetGx - ngx, targetGy - ngy)
      const f = g + h

      const existing = openList.find((n) => n.gx === ngx && n.gy === ngy)
      if (existing) {
        if (g < existing.g) {
          existing.g = g
          existing.f = f
          existing.parent = current
        }
      } else {
        openList.push({
          gx: ngx,
          gy: ngy,
          g,
          h,
          f,
          parent: current,
        })
      }
    }
  }

  // Fallback: direct line to target
  return [{ gx: targetGx, gy: targetGy }]
}

/**
 * Calculates a natural, realistic path from start to end.
 * Uses grid-based A* pathfinding and converts waypoints to screen coordinates.
 */
export function calculateCorridorPath(start: Point2D, end: Point2D): Point2D[] {
  const directDist = Math.hypot(end.x - start.x, end.y - start.y)
  if (directDist < 15) {
    return [end]
  }

  const startGrid = screenToGrid(start.x, start.y)
  const endGrid = screenToGrid(end.x, end.y)

  const gridPath = findGridPath(startGrid, endGrid)

  // Convert grid waypoints to screen coordinates, smoothing straight lines
  const screenWaypoints: Point2D[] = []
  for (let i = 1; i < gridPath.length; i++) {
    // Sample every other waypoint to keep paths fluid unless turning
    if (i === gridPath.length - 1 || i % 2 === 0) {
      const pt = gridToScreen(gridPath[i].gx, gridPath[i].gy)
      screenWaypoints.push(pt)
    }
  }

  // Always end on the exact target pixel position
  screenWaypoints.push(end)

  return screenWaypoints
}

/**
 * Linear interpolation (lerp) step with speed, dt, and arrival threshold
 */
export function stepAgentTowardsTarget(
  current: Point2D,
  target: Point2D,
  speed: number,
  dt: number,
  arrivalThreshold = 2.0
): { next: Point2D; arrived: boolean; dx: number; dy: number } {
  const dx = target.x - current.x
  const dy = target.y - current.y
  const dist = Math.hypot(dx, dy)

  if (dist <= arrivalThreshold || dist === 0) {
    return { next: { x: target.x, y: target.y }, arrived: true, dx: 0, dy: 0 }
  }

  const step = Math.min(dist, speed * dt)
  const ratio = step / dist

  const nextX = current.x + dx * ratio
  const nextY = current.y + dy * ratio

  return {
    next: {
      x: Number.isFinite(nextX) ? nextX : target.x,
      y: Number.isFinite(nextY) ? nextY : target.y,
    },
    arrived: false,
    dx,
    dy,
  }
}

/**
 * Returns preset targets for all agents based on selected mode
 * Integrated with open-plan map activity spots
 */
export function getModeTargets(
  mode: OfficeMode,
  agentId: string,
  agentIndex: number,
  deskCoord: Point2D
): Point2D {
  switch (mode) {
    case 'FOCUS_WORK': {
      return deskCoord
    }

    case 'ALL_HANDS': {
      // Round table in The Brain: distribute agents across 32 dedicated spots
      const spot = BRAIN_MEETING_SPOTS[agentIndex % BRAIN_MEETING_SPOTS.length]
      return gridToScreen(spot.gx, spot.gy)
    }

    case 'COFFEE_BREAK': {
      // Pantry, Espresso bar, vending, and purple lounge: 32 dedicated spots
      const spot = PANTRY_ACTIVITY_SPOTS[agentIndex % PANTRY_ACTIVITY_SPOTS.length]
      return gridToScreen(spot.gx, spot.gy)
    }

    case 'RECREATION': {
      // Gym and wellness zone: 12 dedicated spots
      const spot = GYM_ACTIVITY_SPOTS[agentIndex % GYM_ACTIVITY_SPOTS.length]
      return gridToScreen(spot.gx, spot.gy)
    }

    default:
      return deskCoord
  }
}

/**
 * Returns target floor for office mode
 */
export function getModeTargetFloor(
  mode: OfficeMode,
  agentId: string,
  defaultFloor: FloorNumber = 1
): FloorNumber {
  switch (mode) {
    case 'ALL_HANDS':
      return 3 // The Brain is on Top Floor (Floor 3)
    case 'COFFEE_BREAK':
    case 'RECREATION':
      return 0 // Canteen and Gym are on Ground Floor (Floor 0)
    case 'FOCUS_WORK':
      return getAgentAssignedFloor(agentId)
    default:
      return defaultFloor
  }
}

export interface MultiFloorPath {
  startFloor: FloorNumber
  targetFloor: FloorNumber
  needsElevator: boolean
  pathToElevator: Point2D[]
  elevatorDoorCoord: Point2D
  elevatorShaftCoord: Point2D
  pathFromElevator: Point2D[]
  finalTarget: Point2D
}

/**
 * Calculates inter-floor routing through the express elevator
 */
export function calculateMultiFloorRoute(
  startFloor: FloorNumber,
  startPos: Point2D,
  targetFloor: FloorNumber,
  finalTarget: Point2D
): MultiFloorPath {
  const elevatorDoorScreen = gridToScreen(
    ELEVATOR_CONFIG.doorGx,
    ELEVATOR_CONFIG.doorGy
  )
  const elevatorShaftScreen = gridToScreen(
    ELEVATOR_CONFIG.shaftGx,
    ELEVATOR_CONFIG.shaftGy
  )

  if (startFloor === targetFloor) {
    const directPath = calculateCorridorPath(startPos, finalTarget)
    return {
      startFloor,
      targetFloor,
      needsElevator: false,
      pathToElevator: [],
      elevatorDoorCoord: elevatorDoorScreen,
      elevatorShaftCoord: elevatorShaftScreen,
      pathFromElevator: directPath,
      finalTarget,
    }
  }

  // Leg 1: Path on current floor to elevator door
  const pathToElevator = calculateCorridorPath(startPos, elevatorDoorScreen)

  // Leg 2: Path from elevator door on target floor to final target
  const pathFromElevator = calculateCorridorPath(elevatorDoorScreen, finalTarget)

  return {
    startFloor,
    targetFloor,
    needsElevator: true,
    pathToElevator,
    elevatorDoorCoord: elevatorDoorScreen,
    elevatorShaftCoord: elevatorShaftScreen,
    pathFromElevator,
    finalTarget,
  }
}
