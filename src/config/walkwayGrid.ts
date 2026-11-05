/**
 * Shared 2D & 3D A* Waypoint & Walkability Navigation Engine
 * EasyUp Software Solution HQ (Iloilo City)
 *
 * Eliminates instant teleportation when switching modes (Overview, Focus Work,
 * All Hands, Pantry, Gym) or dispatching individual agents. Agents walk along
 * corridors, doorways, and pathways with smooth directional rotation and leg walk cycles.
 */

export const GRID_MIN = -23
export const GRID_MAX = 23
export const GRID_SIZE = GRID_MAX - GRID_MIN + 1 // 47x47 1m tiles

export interface AgentNavState {
  currentPos: [number, number, number]
  targetPos: [number, number, number]
  waypoints: [number, number, number][]
  waypointIndex: number
  rotationY: number
  subState: 'seated' | 'walking' | 'standing'
  walkPhase: number
}

/**
 * Checks whether a 1m x 1m world tile (gx, gz) is walkable or blocked by partition walls / core pedestal.
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
  // Segments at x in [-23..-17], [-15..-9], [9..15], [17..23] (doorway gap at x = -16 and x = 16, corridor at x = -8 and x = 8)
  if (gz === -8 || gz === 8) {
    const absX = Math.abs(gx)
    if ((absX >= 9 && absX <= 14) || (absX >= 18 && absX <= 23)) {
      return false
    }
  }

  return true
}

/**
 * Computes an A* path of 3D waypoints [x, 0, z] from (startX, startZ) to (targetX, targetZ)
 * through walkable corridors and room doorways.
 */
export function computeAStarWaypoints(
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number
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

  while (openSet.length > 0 && iterations < 1600) {
    iterations++
    // Pick node with lowest fScore
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

      // Allow start and target tiles even if near furniture
      if (nKey !== targetKey && nKey !== startKey && !isWorldTileWalkable(nx, nz)) {
        continue
      }

      // Slight preference for staying on main corridors (x = -8, 8 or z = -8, 8)
      const isCorridor = nx === -8 || nx === 8 || nz === -8 || nz === 8
      const weightedStep = isCorridor ? stepCost * 0.88 : stepCost
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
    // Fallback via nearest corridor intersection if direct grid search hit limit
    return [
      [startX, 0, -8],
      [targetX, 0, targetZ],
    ]
  }

  // Reconstruct raw path
  const rawPoints: [number, number][] = []
  let curr: number | undefined = reachedKey
  while (curr !== undefined && curr !== startKey) {
    const px = Math.floor(curr / GRID_SIZE) + GRID_MIN
    const pz = (curr % GRID_SIZE) + GRID_MIN
    rawPoints.push([px, pz])
    curr = cameFrom.get(curr)
  }
  rawPoints.reverse()

  // Simplify collinear segments so movement is smooth and natural
  const simplified: [number, number, number][] = []
  for (let i = 0; i < rawPoints.length; i++) {
    if (i === rawPoints.length - 1) {
      simplified.push([targetX, 0, targetZ])
    } else if (i === 0) {
      simplified.push([rawPoints[i][0], 0, rawPoints[i][1]])
    } else {
      const prev = rawPoints[i - 1]
      const cur = rawPoints[i]
      const next = rawPoints[i + 1]
      const dx1 = cur[0] - prev[0]
      const dz1 = cur[1] - prev[1]
      const dx2 = next[0] - cur[0]
      const dz2 = next[1] - cur[1]
      if (dx1 !== dx2 || dz1 !== dz2) {
        simplified.push([cur[0], 0, cur[1]])
      }
    }
  }

  return simplified.length > 0 ? simplified : [[targetX, 0, targetZ]]
}

/**
 * Advances an agent along their active A* waypoint path using frame delta time.
 * Smoothly rotates the agent toward their walking vector and updates walkPhase.
 */
export function stepAgentNavigation(
  nav: AgentNavState,
  desiredTarget: [number, number, number],
  finalFacingAngle: number,
  isAtDeskDestination: boolean,
  dt: number,
  walkSpeed = 6.2
): void {
  // Check if desiredTarget changed -> compute new A* path!
  const targetDiff = Math.hypot(
    desiredTarget[0] - nav.targetPos[0],
    desiredTarget[2] - nav.targetPos[2]
  )
  if (targetDiff > 0.15) {
    nav.targetPos = [desiredTarget[0], desiredTarget[1], desiredTarget[2]]
    nav.waypoints = computeAStarWaypoints(
      nav.currentPos[0],
      nav.currentPos[2],
      desiredTarget[0],
      desiredTarget[2]
    )
    nav.waypointIndex = 0
    nav.subState = 'walking'
  }

  // Advance along waypoints if still walking
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
      // Smoothly face immediate walking direction
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

  // Arrived at final destination
  nav.currentPos[0] = nav.targetPos[0]
  nav.currentPos[1] = nav.targetPos[1]
  nav.currentPos[2] = nav.targetPos[2]
  nav.subState = isAtDeskDestination ? 'seated' : 'standing'

  // Smoothly rotate to final station facing angle
  let rotDiff = finalFacingAngle - nav.rotationY
  while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
  while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
  nav.rotationY += rotDiff * Math.min(1, dt * 10)
}
