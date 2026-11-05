/**
 * Zero-Teleportation 3-Phase A* Pathfinding & Waypoint Queue Engine
 * EasyUp Software Solution HQ (Iloilo City)
 *
 * Implements:
 * - Tile-by-tile A* collision & corridor pathfinding (findAStarPath / findPath)
 * - Per-agent pathQueue: Array<{ x: number; y: number; z: number }>
 * - Staggered group departures (index * 80ms) + corridor lane offsets to prevent clumping
 * - Phase 1 ('standing_up', 250ms): Agent unseats from chair before walking
 * - Phase 2 ('walking'): Smooth tick-based interpolation along pathQueue (never teleports!)
 * - Phase 3 ('sitting_down', 300ms -> 'seated' / 'standing'): Arrives at unique slot and persists to Supabase
 */

export const GRID_MIN = -23
export const GRID_MAX = 23
export const GRID_SIZE = GRID_MAX - GRID_MIN + 1 // 47x47 1m tiles

export type NavigationSubState =
  | 'seated'
  | 'standing_up'
  | 'walking'
  | 'sitting_down'
  | 'standing'

export interface WaypointNode {
  x: number
  y: number
  z: number
}

export interface AgentNavState {
  currentPos: [number, number, number]
  targetPos: [number, number, number]
  waypoints: [number, number, number][]
  pathQueue: WaypointNode[]
  waypointIndex: number
  isWalking?: boolean
  facingAngle?: number
  rotationY: number
  subState: NavigationSubState
  walkPhase: number
  walkCycle?: number
  staggerRemainingSec?: number
  standingUpRemainingSec?: number
  sittingDownRemainingSec?: number
  hasNotifiedArrival?: boolean
}

function isDoorwayCoord(c: number): boolean {
  const abs = Math.abs(c)
  // Doorways at center (0: -2..2), corridor intersections (8: 7..9), and room centers (16: 15..17)
  return abs <= 2 || (abs >= 7 && abs <= 9) || (abs >= 15 && abs <= 17)
}

/**
 * Checks whether a 1m x 1m world tile (gx, gz) is walkable or blocked by walls/pedestal.
 */
export function isWorldTileWalkable(gx: number, gz: number): boolean {
  if (gx < GRID_MIN || gx > GRID_MAX || gz < GRID_MIN || gz > GRID_MAX) {
    return false
  }

  // 1. Central Brain holographic pedestal at (0, 0) with radius ~2.0m
  if (gx * gx + gz * gz <= 4) {
    return false
  }

  // 2. Brain curved glass half-walls at radius ~6.2m except N/S/E/W doorways (|x| <= 2 or |z| <= 2)
  const distSq = gx * gx + gz * gz
  if (distSq >= 34 && distSq <= 44) {
    const inBrainDoorway = Math.abs(gx) <= 2 || Math.abs(gz) <= 2
    if (!inBrainDoorway) return false
  }

  // 3. Horizontal interior partition walls separating N/Center/S rows (at z = -9, -8, 8, 9)
  if (Math.abs(gz) === 9) {
    if (!isDoorwayCoord(gx)) {
      return false
    }
  }
  if (Math.abs(gz) === 8) {
    const absX = Math.abs(gx)
    if ((absX >= 10 && absX <= 14) || (absX >= 19 && absX <= 23)) {
      return false
    }
  }

  // 4. Vertical interior partition walls separating W/Center/E columns (at x = -9, 9)
  if (Math.abs(gx) === 9) {
    if (!isDoorwayCoord(gz)) {
      return false
    }
  }

  return true
}

/**
 * Computes a tile-by-tile A* path of 3D waypoints [x, 0, z] from (startX, startZ) to (targetX, targetZ).
 * Routes agents through room doorways and along the checkered corridors (|x| = 8, |z| = 8).
 */
export function findPath(
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number,
  agentIndex = 0
): [number, number, number][] {
  const distDirect = Math.hypot(targetX - startX, targetZ - startZ)
  if (distDirect < 0.25) {
    return [[targetX, 0, targetZ]]
  }

  const sx = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(startX)))
  const sz = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(startZ)))
  const tx = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(targetX)))
  const tz = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(targetZ)))

  if (sx === tx && sz === tz) {
    return [[targetX, 0, targetZ]]
  }

  const key = (x: number, z: number) => (x - GRID_MIN) * GRID_SIZE + (z - GRID_MIN)
  const startKey = key(sx, sz)
  const targetKey = key(tx, tz)

  const openSet: number[] = [startKey]
  const inOpen = new Set<number>([startKey])
  const closed = new Set<number>()
  const cameFrom = new Map<number, number>()
  const gScore = new Map<number, number>([[startKey, 0]])
  const fScore = new Map<number, number>([[startKey, Math.hypot(tx - sx, tz - sz)]])

  const dirs: [number, number, number][] = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414],
  ]

  let iterations = 0
  let reachedKey = -1

  while (openSet.length > 0 && iterations < 2500) {
    iterations++
    let bestIdx = 0
    let bestF = fScore.get(openSet[0]) ?? Infinity
    for (let i = 1; i < openSet.length; i++) {
      const f = fScore.get(openSet[i]) ?? Infinity
      if (f < bestF) {
        bestF = f
        bestIdx = i
      }
    }

    const current = openSet[bestIdx]
    openSet.splice(bestIdx, 1)
    inOpen.delete(current)

    if (current === targetKey) {
      reachedKey = current
      break
    }

    closed.add(current)
    const cx = Math.floor(current / GRID_SIZE) + GRID_MIN
    const cz = (current % GRID_SIZE) + GRID_MIN

    for (const [dx, dz, stepCost] of dirs) {
      const nx = cx + dx
      const nz = cz + dz
      if (nx < GRID_MIN || nx > GRID_MAX || nz < GRID_MIN || nz > GRID_MAX) {
        continue
      }

      const nKey = key(nx, nz)
      if (closed.has(nKey)) continue

      if (nKey !== targetKey && nKey !== startKey && !isWorldTileWalkable(nx, nz)) {
        continue
      }

      // Prevent diagonal corner-cutting across wall segments
      if (dx !== 0 && dz !== 0) {
        if (!isWorldTileWalkable(cx + dx, cz) || !isWorldTileWalkable(cx, cz + dz)) {
          continue
        }
      }

      // Strongly prefer walking along the checkered hallways (|x| = 7..8 or |z| = 7..8)
      const isCorridor =
        Math.abs(nx) === 8 ||
        Math.abs(nz) === 8 ||
        Math.abs(nx) === 7 ||
        Math.abs(nz) === 7
      const weightedStep = isCorridor ? stepCost * 0.68 : stepCost
      const tentativeG = (gScore.get(current) ?? Infinity) + weightedStep

      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, current)
        gScore.set(nKey, tentativeG)
        fScore.set(nKey, tentativeG + Math.hypot(tx - nx, tz - nz))
        if (!inOpen.has(nKey)) {
          openSet.push(nKey)
          inOpen.add(nKey)
        }
      }
    }
  }

  if (reachedKey === -1) {
    // Fallback multi-step corridor path if target was unreachable
    const midZ = startZ < 0 ? -8 : 8
    const steps: [number, number, number][] = []
    const totalSteps = Math.max(8, Math.round(distDirect))
    for (let s = 1; s <= totalSteps; s++) {
      const t = s / totalSteps
      const ix = startX + (targetX - startX) * t
      const iz =
        t < 0.35
          ? startZ + (midZ - startZ) * (t / 0.35)
          : midZ + (targetZ - midZ) * ((t - 0.35) / 0.65)
      steps.push([Number(ix.toFixed(2)), 0, Number(iz.toFixed(2))])
    }
    return steps
  }

  // Reconstruct full tile-by-tile path
  const rawPoints: [number, number][] = []
  let curr: number | undefined = reachedKey
  while (curr !== undefined && curr !== startKey) {
    const px = Math.floor(curr / GRID_SIZE) + GRID_MIN
    const pz = (curr % GRID_SIZE) + GRID_MIN
    rawPoints.push([px, pz])
    curr = cameFrom.get(curr)
  }
  rawPoints.reverse()

  // Apply subtle corridor lane offset so agents walk in staggered formation without overlapping
  const laneOffset = ((agentIndex % 5) - 2) * 0.26
  const waypoints: [number, number, number][] = []

  // Keep every tile along the A* path so movement is strictly tile-by-tile
  for (let i = 0; i < rawPoints.length; i++) {
    if (i === rawPoints.length - 1) {
      waypoints.push([targetX, 0, targetZ])
    } else {
      const pt = rawPoints[i]
      let wx = pt[0]
      let wz = pt[1]
      if (Math.abs(wx) === 8 || Math.abs(wx) === 7) wx += laneOffset
      if (Math.abs(wz) === 8 || Math.abs(wz) === 7) wz += laneOffset
      waypoints.push([Number(wx.toFixed(2)), 0, Number(wz.toFixed(2))])
    }
  }

  return waypoints.length > 0 ? waypoints : [[targetX, 0, targetZ]]
}

export const findAStarPath = findPath
export const computeAStarWaypoints = findPath

/**
 * Advances an agent through the 3-Phase Waypoint Queue State Machine:
 * - Phase 1 ('standing_up', 250ms + stagger): Unseats from chair and steps back
 * - Phase 2 ('walking'): Interpolates tile-by-tile along pathQueue using delta
 * - Phase 3 ('sitting_down', 300ms -> 'seated' / 'standing'): Settles at destination & calls onArrive
 */
export function stepAgentNavigation(
  nav: AgentNavState,
  desiredTarget: [number, number, number],
  finalFacingAngle: number,
  isAtDeskDestination: boolean,
  dt: number,
  walkSpeed = 3.8,
  agentIndex = 0,
  onArrive?: (finalPos: [number, number, number]) => void,
  staggerIndex = agentIndex
): void {
  const safeDt = Math.min(Math.max(dt, 0.001), 0.1)

  // Ensure pathQueue is initialized on legacy nav objects
  if (!nav.pathQueue) {
    nav.pathQueue = []
  }

  // 1. Detect target change -> populate pathQueue via A* (NEVER modify currentPos directly!)
  const targetDiff = Math.hypot(
    desiredTarget[0] - nav.targetPos[0],
    desiredTarget[2] - nav.targetPos[2]
  )
  if (targetDiff > 0.15) {
    nav.targetPos = [desiredTarget[0], desiredTarget[1], desiredTarget[2]]
    const generatedWaypoints = findAStarPath(
      nav.currentPos[0],
      nav.currentPos[2],
      desiredTarget[0],
      desiredTarget[2],
      agentIndex
    )
    nav.waypoints = generatedWaypoints
    nav.pathQueue = generatedWaypoints.map(([x, y, z]) => ({ x, y, z }))
    nav.waypointIndex = 0

    // Stagger group departures by index * 80ms so agents file out in a line
    nav.staggerRemainingSec = Math.max(0, staggerIndex) * 0.08
    // Phase 1: 250ms standing_up transition before walking
    nav.standingUpRemainingSec = 0.25
    nav.sittingDownRemainingSec = 0
    nav.subState = 'standing_up'
    nav.isWalking = false
    nav.hasNotifiedArrival = false
  }

  // 2. Staggered departure delay (agents wait at their chair before standing up)
  if ((nav.staggerRemainingSec ?? 0) > 0) {
    nav.staggerRemainingSec = Math.max(0, (nav.staggerRemainingSec ?? 0) - safeDt)
    return
  }

  // 3. Phase 1: Standing up from chair (250ms)
  if ((nav.standingUpRemainingSec ?? 0) > 0) {
    nav.standingUpRemainingSec = Math.max(0, (nav.standingUpRemainingSec ?? 0) - safeDt)
    nav.subState = 'standing_up'
    nav.isWalking = false
    // Gently push back from desk while standing up
    nav.currentPos[0] -= Math.sin(nav.rotationY) * safeDt * 0.55
    nav.currentPos[2] -= Math.cos(nav.rotationY) * safeDt * 0.55
    if (nav.standingUpRemainingSec === 0) {
      nav.subState = 'walking'
      nav.isWalking = true
    }
    return
  }

  // Sync pathQueue if waypoints were externally set in unit tests
  if (nav.pathQueue.length === 0 && nav.waypointIndex < nav.waypoints.length) {
    nav.pathQueue = nav.waypoints
      .slice(nav.waypointIndex)
      .map(([x, y, z]) => ({ x, y, z }))
  }

  // 4. Phase 2: Per-frame movement along pathQueue
  if (nav.pathQueue.length > 0) {
    const stepDist = walkSpeed * safeDt
    const nextNode = nav.pathQueue[0]
    const dx = nextNode.x - nav.currentPos[0]
    const dz = nextNode.z - nav.currentPos[2]
    const dist = Math.hypot(dx, dz)

    if (dist <= stepDist) {
      // Reached this waypoint, pop and proceed to next on subsequent ticks
      nav.currentPos[0] = nextNode.x
      nav.currentPos[1] = nextNode.y
      nav.currentPos[2] = nextNode.z
      nav.pathQueue.shift()
      nav.waypointIndex++

      if (nav.pathQueue.length > 0) {
        const upcoming = nav.pathQueue[0]
        const ndx = upcoming.x - nav.currentPos[0]
        const ndz = upcoming.z - nav.currentPos[2]
        if (Math.hypot(ndx, ndz) > 0.01) {
          const desiredRot = Math.atan2(ndx, ndz)
          let rotDiff = desiredRot - nav.rotationY
          while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
          while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
          nav.rotationY += rotDiff * Math.min(1, safeDt * 12)
          nav.facingAngle = nav.rotationY
        }
        nav.subState = 'walking'
        nav.isWalking = true
        nav.walkPhase += safeDt * 10
        nav.walkCycle = nav.walkPhase
        return
      }
      // Just popped the final waypoint -> transition to sitting_down!
      nav.isWalking = false
      nav.subState = 'sitting_down'
      nav.sittingDownRemainingSec = 0.3
      return
    } else {
      // Step towards current waypoint
      nav.currentPos[0] += (dx / dist) * stepDist
      nav.currentPos[2] += (dz / dist) * stepDist
      const desiredRot = Math.atan2(dx, dz)
      let rotDiff = desiredRot - nav.rotationY
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
      nav.rotationY += rotDiff * Math.min(1, safeDt * 12)
      nav.facingAngle = nav.rotationY
      nav.subState = 'walking'
      nav.isWalking = true
      nav.walkPhase += safeDt * 10
      nav.walkCycle = nav.walkPhase
      return
    }
  }

  // 5. Phase 3: Sitting down / settling (300ms) before final 'seated' / 'standing' state
  if ((nav.sittingDownRemainingSec ?? 0) > 0) {
    nav.sittingDownRemainingSec = Math.max(
      0,
      (nav.sittingDownRemainingSec ?? 0) - safeDt
    )
    nav.subState = 'sitting_down'
    let rotDiff = finalFacingAngle - nav.rotationY
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
    nav.rotationY += rotDiff * Math.min(1, safeDt * 10)
    nav.facingAngle = nav.rotationY
    return
  }

  // Final resting location reached
  nav.currentPos[0] = nav.targetPos[0]
  nav.currentPos[1] = nav.targetPos[1]
  nav.currentPos[2] = nav.targetPos[2]
  nav.isWalking = false
  nav.subState = isAtDeskDestination ? 'seated' : 'standing'

  let rotDiff = finalFacingAngle - nav.rotationY
  while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
  while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
  nav.rotationY += rotDiff * Math.min(1, safeDt * 10)
  nav.facingAngle = nav.rotationY

  if (!nav.hasNotifiedArrival) {
    nav.hasNotifiedArrival = true
    onArrive?.([nav.currentPos[0], nav.currentPos[1], nav.currentPos[2]])
  }
}
