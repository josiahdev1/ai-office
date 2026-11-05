/**
 * Zero-Teleportation 3-Phase A* Pathfinding & Navigation Engine
 * EasyUp Software Solution HQ (Iloilo City)
 *
 * Implements:
 * - Tile-by-tile A* collision & corridor pathfinding (findPath)
 * - Staggered group departures (50ms-150ms per agent) + corridor lane offsets to prevent clumping
 * - Phase 1 ('standing_up', ~300ms): Agent unseats and steps back from desk
 * - Phase 2 ('walking'): Smooth tile-by-tile traversal with directional rotation & leg walk cycle
 * - Phase 3 ('seated' / 'standing'): Arrives at unique slot, faces monitor/center, and triggers DB persistence
 */

export const GRID_MIN = -23
export const GRID_MAX = 23
export const GRID_SIZE = GRID_MAX - GRID_MIN + 1 // 47x47 1m tiles

export type NavigationSubState = 'seated' | 'standing_up' | 'walking' | 'standing'

export interface AgentNavState {
  currentPos: [number, number, number]
  targetPos: [number, number, number]
  waypoints: [number, number, number][]
  waypointIndex: number
  rotationY: number
  subState: NavigationSubState
  walkPhase: number
  staggerRemainingSec?: number
  standingUpRemainingSec?: number
  hasNotifiedArrival?: boolean
}

/**
 * Checks whether a 1m x 1m world tile (gx, gz) is walkable or blocked by walls/pedestal.
 */
export function isWorldTileWalkable(gx: number, gz: number): boolean {
  if (gx < GRID_MIN || gx > GRID_MAX || gz < GRID_MIN || gz > GRID_MAX) {
    return false
  }

  // Central Brain holographic pedestal at (0, 0) with radius ~2.0m
  if (gx * gx + gz * gz <= 4) {
    return false
  }

  // Brain curved glass half-walls at radius ~6.2m except N/S/E/W doorways
  const distSq = gx * gx + gz * gz
  if (distSq >= 33 && distSq <= 42) {
    const inDoorway = Math.abs(gx) <= 2 || Math.abs(gz) <= 2
    if (!inDoorway) return false
  }

  // Interior partition half-walls at z = -8 and z = 8
  if (gz === -8 || gz === 8) {
    const absX = Math.abs(gx)
    if ((absX >= 9 && absX <= 14) || (absX >= 18 && absX <= 23)) {
      return false
    }
  }

  return true
}

/**
 * Computes a tile-by-tile A* path of 3D waypoints [x, 0, z] from (startX, startZ) to (targetX, targetZ).
 * Applies a subtle per-agent corridor lane offset so multiple agents walking down the same hallway
 * walk in an organic staggered formation without stacking on top of each other.
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

  while (openSet.length > 0 && iterations < 1800) {
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
      const nKey = key(nx, nz)
      if (closed.has(nKey)) continue

      if (nKey !== targetKey && nKey !== startKey && !isWorldTileWalkable(nx, nz)) {
        continue
      }

      const isCorridor = Math.abs(nx) === 8 || Math.abs(nz) === 8
      const weightedStep = isCorridor ? stepCost * 0.85 : stepCost
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
    return [
      [startX, 0, -8],
      [targetX, 0, targetZ],
    ]
  }

  // Reconstruct tile-by-tile path
  const rawPoints: [number, number][] = []
  let curr: number | undefined = reachedKey
  while (curr !== undefined && curr !== startKey) {
    const px = Math.floor(curr / GRID_SIZE) + GRID_MIN
    const pz = (curr % GRID_SIZE) + GRID_MIN
    rawPoints.push([px, pz])
    curr = cameFrom.get(curr)
  }
  rawPoints.reverse()

  // Apply subtle corridor lane offset so agents never stack into a single sprite
  const laneOffset = ((agentIndex % 5) - 2) * 0.28
  const waypoints: [number, number, number][] = []

  // Keep every 2nd tile + all turns so path is granular and tile-by-tile
  for (let i = 0; i < rawPoints.length; i++) {
    if (i === rawPoints.length - 1) {
      waypoints.push([targetX, 0, targetZ])
    } else {
      const pt = rawPoints[i]
      let wx = pt[0]
      let wz = pt[1]
      if (Math.abs(wx) === 8) wx += laneOffset
      if (Math.abs(wz) === 8) wz += laneOffset

      if (i === 0 || i % 2 === 0) {
        waypoints.push([Number(wx.toFixed(2)), 0, Number(wz.toFixed(2))])
      } else {
        const prev = rawPoints[i - 1]
        const next = rawPoints[i + 1]
        if (pt[0] - prev[0] !== next[0] - pt[0] || pt[1] - prev[1] !== next[1] - pt[1]) {
          waypoints.push([Number(wx.toFixed(2)), 0, Number(wz.toFixed(2))])
        }
      }
    }
  }

  return waypoints.length > 0 ? waypoints : [[targetX, 0, targetZ]]
}

export const computeAStarWaypoints = findPath

/**
 * Advances an agent through the 3-Phase Navigation State Machine:
 * - Phase 1 ('standing_up', ~300ms): Unseats from chair and steps back
 * - Phase 2 ('walking'): Walks tile-by-tile along A* pathQueue with directional rotation
 * - Phase 3 ('seated' / 'standing'): Arrives at destination, faces target, and fires onArrive
 */
export function stepAgentNavigation(
  nav: AgentNavState,
  desiredTarget: [number, number, number],
  finalFacingAngle: number,
  isAtDeskDestination: boolean,
  dt: number,
  walkSpeed = 4.2,
  agentIndex = 0,
  onArrive?: (finalPos: [number, number, number]) => void
): void {
  // Detect target change -> initialize 3-phase A* transition (NEVER teleport!)
  const targetDiff = Math.hypot(
    desiredTarget[0] - nav.targetPos[0],
    desiredTarget[2] - nav.targetPos[2]
  )
  if (targetDiff > 0.15) {
    const wasSeated = nav.subState === 'seated'
    nav.targetPos = [desiredTarget[0], desiredTarget[1], desiredTarget[2]]
    nav.waypoints = findPath(
      nav.currentPos[0],
      nav.currentPos[2],
      desiredTarget[0],
      desiredTarget[2],
      agentIndex
    )
    nav.waypointIndex = 0
    // Stagger departure by 65ms per agent index (0ms .. 1.5s) so group modes flow naturally
    nav.staggerRemainingSec = (agentIndex % 16) * 0.065
    // Phase 1: 300ms standing_up unseating animation
    nav.standingUpRemainingSec = wasSeated ? 0.3 : 0.08
    nav.subState = 'standing_up'
    nav.hasNotifiedArrival = false
  }

  // Wait out staggered departure delay before stepping into corridor
  if ((nav.staggerRemainingSec ?? 0) > 0) {
    nav.staggerRemainingSec = Math.max(0, (nav.staggerRemainingSec ?? 0) - dt)
    return
  }

  // Phase 1: Standing up from chair (~300ms)
  if ((nav.standingUpRemainingSec ?? 0) > 0) {
    nav.standingUpRemainingSec = Math.max(0, (nav.standingUpRemainingSec ?? 0) - dt)
    nav.subState = 'standing_up'
    // Gently push back from desk while standing up
    nav.currentPos[0] -= Math.sin(nav.rotationY) * dt * 0.6
    nav.currentPos[2] -= Math.cos(nav.rotationY) * dt * 0.6
    if (nav.standingUpRemainingSec === 0) {
      nav.subState = 'walking'
    }
    return
  }

  // Phase 2: Tile-by-tile A* walking along waypoints
  if (nav.waypointIndex < nav.waypoints.length) {
    const wp = nav.waypoints[nav.waypointIndex]
    const dx = wp[0] - nav.currentPos[0]
    const dz = wp[2] - nav.currentPos[2]
    const dist = Math.hypot(dx, dz)

    if (dist <= walkSpeed * dt) {
      nav.currentPos[0] = wp[0]
      nav.currentPos[1] = wp[1]
      nav.currentPos[2] = wp[2]
      nav.waypointIndex++
    } else {
      const step = walkSpeed * dt
      nav.currentPos[0] += (dx / dist) * step
      nav.currentPos[2] += (dz / dist) * step
      const desiredRot = Math.atan2(dx, dz)
      let rotDiff = desiredRot - nav.rotationY
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
      nav.rotationY += rotDiff * Math.min(1, dt * 12)
      nav.subState = 'walking'
      nav.walkPhase += dt * 11
      return
    }
  }

  // Phase 3: Arrived at destination slot -> settle & persist to Supabase once
  nav.currentPos[0] = nav.targetPos[0]
  nav.currentPos[1] = nav.targetPos[1]
  nav.currentPos[2] = nav.targetPos[2]
  nav.subState = isAtDeskDestination ? 'seated' : 'standing'

  let rotDiff = finalFacingAngle - nav.rotationY
  while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
  while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
  nav.rotationY += rotDiff * Math.min(1, dt * 10)

  if (!nav.hasNotifiedArrival) {
    nav.hasNotifiedArrival = true
    onArrive?.([nav.currentPos[0], nav.currentPos[1], nav.currentPos[2]])
  }
}
