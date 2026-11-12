import { SERVER_RACKS } from '@/lib/office/wellnessWing'

export interface AABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface DoorDefinition {
  id: string
  label: string
  x: number
  z: number
  /** 'z' = doorway spans along Z (wall runs north-south); 'x' = doorway spans along X */
  axis: 'x' | 'z'
  width: number
  thickness: number
  hingeSide: 1 | -1
  openDirection: 1 | -1
}

function boxToAABB(cx: number, cz: number, width: number, depth: number): AABB {
  return {
    minX: cx - width / 2,
    maxX: cx + width / 2,
    minZ: cz - depth / 2,
    maxZ: cz + depth / 2,
  }
}

export const DOOR_DEFINITIONS: DoorDefinition[] = [
  // Exterior Building Entrances (South & East)
  { id: 'ext-south', label: 'South Main Entrance', x: 0, z: 23.2, axis: 'x', width: 2.6, thickness: 0.18, hingeSide: -1, openDirection: -1 },
  { id: 'ext-east', label: 'East Parking Entrance', x: 23.2, z: 0, axis: 'z', width: 2.6, thickness: 0.18, hingeSide: -1, openDirection: -1 },
  // Main Building Interior Department Doors
  { id: 'door-eng', label: 'Engineering Door', x: -16, z: -8, axis: 'x', width: 2.6, thickness: 0.16, hingeSide: -1, openDirection: -1 },
  { id: 'door-pantry', label: 'Pantry Door', x: -16, z: 8, axis: 'x', width: 2.6, thickness: 0.16, hingeSide: -1, openDirection: 1 },
  { id: 'door-growth', label: 'Growth Lab Door', x: 16, z: -8, axis: 'x', width: 2.6, thickness: 0.16, hingeSide: -1, openDirection: -1 },
  { id: 'door-intel', label: 'Intelligence Lab Door', x: 16, z: 8, axis: 'x', width: 2.6, thickness: 0.16, hingeSide: -1, openDirection: 1 },
  // Main Building <-> West Wing Connectors
  { id: 'portal-nw', label: 'West Wing North Door', x: -23.2, z: -8, axis: 'z', width: 2.4, thickness: 0.16, hingeSide: -1, openDirection: -1 },
  { id: 'portal-sw', label: 'West Wing South Door', x: -23.2, z: 8, axis: 'z', width: 2.4, thickness: 0.16, hingeSide: 1, openDirection: -1 },
  // West Wing Room Doors (x = -28.9)
  { id: 'door-nap', label: 'Nap Room Door', x: -28.9, z: -16, axis: 'z', width: 2.2, thickness: 0.14, hingeSide: -1, openDirection: -1 },
  { id: 'door-mens-cr', label: "Men's CR Door", x: -28.9, z: -8, axis: 'z', width: 2.2, thickness: 0.14, hingeSide: -1, openDirection: -1 },
  { id: 'door-womens-cr', label: "Women's CR Door", x: -28.9, z: -2, axis: 'z', width: 2.2, thickness: 0.14, hingeSide: -1, openDirection: -1 },
  { id: 'door-server', label: 'Server Room Door', x: -28.9, z: 3.5, axis: 'z', width: 2.4, thickness: 0.16, hingeSide: -1, openDirection: -1 },
  { id: 'door-facilities', label: 'Facilities Door', x: -28.9, z: 9, axis: 'z', width: 2.2, thickness: 0.14, hingeSide: -1, openDirection: -1 },
  { id: 'door-cafeteria', label: 'Cafeteria Door', x: -28.9, z: 16, axis: 'z', width: 2.2, thickness: 0.14, hingeSide: -1, openDirection: -1 },
]

export const STATIC_WALL_COLLIDERS: AABB[] = [
  // Exterior North, South, East Perimeter Walls (Main Building)
  boxToAABB(0, -23.2, 46.8, 0.45),
  boxToAABB(0, 23.2, 46.8, 0.45),
  boxToAABB(23.2, 0, 0.45, 46.8),

  // West Wall of Main Building (x = -23.2) with portals at z = -8 and z = 8
  boxToAABB(-23.2, -16.2, 0.45, 14.0),
  boxToAABB(-23.2, 0, 0.45, 13.6),
  boxToAABB(-23.2, 16.2, 0.45, 14.0),

  // West Wing North/South Perimeter & West Exterior Wall (including expanded Server Room bay)
  boxToAABB(-32.1, -22.2, 18.2, 0.45),
  boxToAABB(-32.1, 22.2, 18.2, 0.45),
  boxToAABB(-41.2, -10.6, 0.45, 23.2),
  boxToAABB(-41.2, 14.8, 0.45, 14.8),
  // Expanded Server Room West Bay (x = -46.2, z in [1, 7.5])
  boxToAABB(-46.2, 4.25, 0.45, 6.8),
  boxToAABB(-43.7, 1.0, 5.2, 0.35),
  boxToAABB(-43.7, 7.5, 5.2, 0.35),

  // Main Building Interior Partitions (|x| = 8, |z| = 8) with corridor doorways
  // North-South partitions at x = -8 and x = 8
  boxToAABB(-8, -16, 0.3, 14.0),
  boxToAABB(-8, 0, 0.3, 13.6),
  boxToAABB(-8, 16, 0.3, 14.0),
  boxToAABB(8, -16, 0.3, 14.0),
  boxToAABB(8, 0, 0.3, 13.6),
  boxToAABB(8, 16, 0.3, 14.0),
  // East-West partitions at z = -8 and z = 8
  boxToAABB(-19.5, -8, 4.6, 0.3),
  boxToAABB(-11.5, -8, 4.6, 0.3),
  boxToAABB(-4.8, -8, 4.4, 0.3),
  boxToAABB(4.8, -8, 4.4, 0.3),
  boxToAABB(11.5, -8, 4.6, 0.3),
  boxToAABB(19.5, -8, 4.6, 0.3),
  boxToAABB(-19.5, 8, 4.6, 0.3),
  boxToAABB(-11.5, 8, 4.6, 0.3),
  boxToAABB(-4.8, 8, 4.4, 0.3),
  boxToAABB(4.8, 8, 4.4, 0.3),
  boxToAABB(11.5, 8, 4.6, 0.3),
  boxToAABB(19.5, 8, 4.6, 0.3),

  // West Wing Dividing Walls
  boxToAABB(-35, -11, 12.2, 0.32),
  boxToAABB(-35, -5, 12.2, 0.32),
  boxToAABB(-35, 1, 12.2, 0.32),
  boxToAABB(-35, 7.5, 12.2, 0.32),
  boxToAABB(-35, 11, 12.2, 0.32),

  // West Wing East Corridor Wall (x = -28.9) with 6 doorways
  boxToAABB(-28.9, -19.5, 0.32, 5.0),
  boxToAABB(-28.9, -12.0, 0.32, 6.0),
  boxToAABB(-28.9, -5.0, 0.32, 4.0),
  boxToAABB(-28.9, 0.7, 0.32, 3.4),
  boxToAABB(-28.9, 6.3, 0.32, 3.4),
  boxToAABB(-28.9, 12.5, 0.32, 5.0),
  boxToAABB(-28.9, 19.5, 0.32, 5.0),

  // Central Brain Core Pillar
  boxToAABB(0, 0, 2.8, 2.8),

  // Server Racks & CRAC Chillers & Rex NOC Desk
  ...SERVER_RACKS.map((r) => boxToAABB(r.position[0], r.position[2], 1.25, 0.85)),
  boxToAABB(-45, 4.25, 1.45, 1.05),
  boxToAABB(-35.5, 6.35, 1.45, 1.05),
  boxToAABB(-32.5, 3.8, 1.65, 0.9),
]

function doorToAABB(door: DoorDefinition): AABB {
  return door.axis === 'z'
    ? boxToAABB(door.x, door.z, door.thickness + 0.16, door.width)
    : boxToAABB(door.x, door.z, door.width, door.thickness + 0.16)
}

/**
 * Push a circle (x, z, radius) out of any intersecting AABB colliders.
 * Runs 2 passes for clean corner resolution and smooth wall sliding.
 */
export function resolveWalkCollision(
  x: number,
  z: number,
  radius: number,
  openDoorIds: ReadonlySet<string>
): { x: number; z: number } {
  let px = x
  let pz = z

  const activeColliders: AABB[] = [...STATIC_WALL_COLLIDERS]
  for (const door of DOOR_DEFINITIONS) {
    if (!openDoorIds.has(door.id)) {
      activeColliders.push(doorToAABB(door))
    }
  }

  for (let pass = 0; pass < 2; pass++) {
    for (const box of activeColliders) {
      const closestX = Math.max(box.minX, Math.min(px, box.maxX))
      const closestZ = Math.max(box.minZ, Math.min(pz, box.maxZ))
      const dx = px - closestX
      const dz = pz - closestZ
      const distSq = dx * dx + dz * dz

      if (distSq < radius * radius) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq)
          const overlap = radius - dist
          px += (dx / dist) * overlap
          pz += (dz / dist) * overlap
        } else {
          // Center is inside the box; push out along the shallowest axis
          const penLeft = Math.abs(px - box.minX)
          const penRight = Math.abs(box.maxX - px)
          const penTop = Math.abs(pz - box.minZ)
          const penBottom = Math.abs(box.maxZ - pz)
          const minPen = Math.min(penLeft, penRight, penTop, penBottom)
          if (minPen === penLeft) px = box.minX - radius
          else if (minPen === penRight) px = box.maxX + radius
          else if (minPen === penTop) pz = box.minZ - radius
          else pz = box.maxZ + radius
        }
      }
    }
  }

  return { x: px, z: pz }
}

/**
 * Find the closest interactive door within maxDist meters of (x, z).
 */
export function findNearestDoor(x: number, z: number, maxDist = 3.2): DoorDefinition | null {
  let best: DoorDefinition | null = null
  let bestDist = maxDist
  for (const door of DOOR_DEFINITIONS) {
    const d = Math.hypot(x - door.x, z - door.z)
    if (d < bestDist) {
      bestDist = d
      best = door
    }
  }
  return best
}
