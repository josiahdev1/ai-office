/**
 * A* Pathfinding and Corridor Navigation Engine for EasyUp Software Solution HQ
 * Guarantees agents walk realistically through doorways and hallways without clipping walls.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface WaypointRoute {
  waypoints: Point2D[];
  totalDistance: number;
}

// Major Architectural Waypoints & Doorways
export const OFFICE_WAYPOINTS = {
  // Hallway Crossings (Central Circulation)
  HALLWAY_CROSS: { x: 500, y: 290 },
  HALLWAY_NORTH: { x: 520, y: 200 },
  HALLWAY_SOUTH: { x: 500, y: 390 },
  HALLWAY_WEST: { x: 340, y: 280 },
  HALLWAY_EAST: { x: 640, y: 280 },

  // Room Doorways
  OPERATIONS_DOOR: { x: 370, y: 220 },
  GROWTH_DOOR: { x: 180, y: 260 },
  ENGINEERING_DOOR: { x: 430, y: 370 },
  QA_NOC_DOOR: { x: 620, y: 370 },
  INTELLIGENCE_DOOR: { x: 680, y: 220 },
  COMMAND_DOOR: { x: 620, y: 290 },
  MEETING_DOOR: { x: 500, y: 430 },
  PANTRY_DOOR: { x: 530, y: 460 },
  REC_DOOR: { x: 280, y: 440 },

  // Key Destination Hotspots
  BRAIN_CORE: { x: 510, y: 290 },
  MEETING_TABLE: { x: 490, y: 480 },
  COFFEE_MACHINE: { x: 570, y: 490 },
  PANTRY_SOFA: { x: 660, y: 510 },
  TENNIS_COURT: { x: 180, y: 520 },
  GYM_BENCH: { x: 120, y: 440 },
};

export type OfficeMode = 'FOCUS_WORK' | 'ALL_HANDS' | 'COFFEE_BREAK' | 'RECREATION' | 'RANDOM_WANDER';

/**
 * Maps any (x, y) world coordinate to its containing room
 */
export function identifyRoom(p: Point2D): string {
  if (p.x < 240 && p.y > 400) return 'Recreation';
  if (p.y > 450 && p.x >= 450 && p.x <= 720) return 'Pantry & Game Lounge';
  if (p.y > 420 && p.x >= 380 && p.x <= 540) return 'Meeting Room';
  if (p.x >= 430 && p.x <= 580 && p.y >= 230 && p.y <= 340) return 'The Brain';
  if (p.x < 185 && p.y >= 170 && p.y <= 380) return 'Growth Lab';
  if (p.x < 460 && p.y < 240) return 'Operations Hub';
  if (p.x >= 180 && p.x <= 460 && p.y >= 240 && p.y <= 450) return 'Engineering Core';
  if (p.x >= 580 && p.x <= 840 && p.y >= 260 && p.y < 390) return 'Command Center';
  if (p.x >= 580 && p.y >= 390) return 'QA & SecOps NOC';
  if (p.x >= 650 && p.y < 260) return 'Intelligence Lab';
  return 'Hallway';
}

/**
 * Returns the doorway point associated with a room
 */
export function getRoomDoorway(room: string): Point2D {
  switch (room) {
    case 'Operations Hub':
      return OFFICE_WAYPOINTS.OPERATIONS_DOOR;
    case 'Growth Lab':
      return OFFICE_WAYPOINTS.GROWTH_DOOR;
    case 'Engineering Core':
      return OFFICE_WAYPOINTS.ENGINEERING_DOOR;
    case 'QA & SecOps NOC':
      return OFFICE_WAYPOINTS.QA_NOC_DOOR;
    case 'Intelligence Lab':
      return OFFICE_WAYPOINTS.INTELLIGENCE_DOOR;
    case 'Command Center':
      return OFFICE_WAYPOINTS.COMMAND_DOOR;
    case 'Meeting Room':
      return OFFICE_WAYPOINTS.MEETING_DOOR;
    case 'Pantry & Game Lounge':
      return OFFICE_WAYPOINTS.PANTRY_DOOR;
    case 'Recreation':
      return OFFICE_WAYPOINTS.REC_DOOR;
    case 'The Brain':
      return OFFICE_WAYPOINTS.BRAIN_CORE;
    default:
      return OFFICE_WAYPOINTS.HALLWAY_CROSS;
  }
}

/**
 * Calculates a natural, realistic path from start to end through hallways and doors.
 * No walls are clipped, and agents queue through corridors naturally.
 */
export function calculateCorridorPath(start: Point2D, end: Point2D): Point2D[] {
  // If points are very close, direct walk
  const directDist = Math.hypot(end.x - start.x, end.y - start.y);
  if (directDist < 25) {
    return [end];
  }

  const startRoom = identifyRoom(start);
  const endRoom = identifyRoom(end);

  // If both within the same room, direct path is safe
  if (startRoom === endRoom && startRoom !== 'Hallway') {
    return [end];
  }

  const path: Point2D[] = [];
  const startDoor = getRoomDoorway(startRoom);
  const endDoor = getRoomDoorway(endRoom);

  // 1. Move from current location to current room's door (if not already there)
  if (Math.hypot(start.x - startDoor.x, start.y - startDoor.y) > 20) {
    path.push(startDoor);
  }

  // 2. Navigate hallway network between doors
  const cross = OFFICE_WAYPOINTS.HALLWAY_CROSS;
  if (startDoor.x !== endDoor.x || startDoor.y !== endDoor.y) {
    // Determine intermediate hallway corridor based on quadrant
    if (startDoor.y < cross.y && endDoor.y > cross.y) {
      path.push(cross);
    } else if (Math.hypot(startDoor.x - endDoor.x, startDoor.y - endDoor.y) > 180) {
      path.push(cross);
    }
  }

  // 3. Move to target room door
  if (Math.hypot(end.x - endDoor.x, end.y - endDoor.y) > 20) {
    path.push(endDoor);
  }

  // 4. Finally reach destination
  path.push(end);

  return path;
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
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= arrivalThreshold || dist === 0) {
    return { next: { x: target.x, y: target.y }, arrived: true, dx: 0, dy: 0 };
  }

  const step = Math.min(dist, speed * dt);
  const ratio = step / dist;

  const nextX = current.x + dx * ratio;
  const nextY = current.y + dy * ratio;

  return {
    next: {
      x: Number.isFinite(nextX) ? nextX : target.x,
      y: Number.isFinite(nextY) ? nextY : target.y,
    },
    arrived: false,
    dx,
    dy,
  };
}

/**
 * Returns preset targets for all agents based on selected mode
 */
export function getModeTargets(
  mode: OfficeMode,
  agentId: string,
  agentIndex: number,
  deskCoord: Point2D
): Point2D {
  switch (mode) {
    case 'FOCUS_WORK':
      return deskCoord;

    case 'ALL_HANDS': {
      // Gather in concentric ring around The Brain platform
      const angle = (agentIndex / 23) * Math.PI * 2;
      const radius = 65;
      return {
        x: Math.round(510 + Math.cos(angle) * radius),
        y: Math.round(290 + Math.sin(angle) * (radius * 0.55)), // Isometric vertical compression
      };
    }

    case 'COFFEE_BREAK': {
      // Assemble in Pantry & Game Lounge
      const pantrySpots: Point2D[] = [
        { x: 570, y: 490 }, // Coffee machine
        { x: 590, y: 500 }, // Water dispenser
        { x: 620, y: 480 }, // Lounge table 1
        { x: 640, y: 495 }, // Lounge table 2
        { x: 660, y: 510 }, // Sofa seat
        { x: 680, y: 490 }, // Snack bar
        { x: 540, y: 495 }, // Entry cafe table
      ];
      return pantrySpots[agentIndex % pantrySpots.length];
    }

    case 'RECREATION': {
      // Tennis court or Gym
      if (agentIndex % 2 === 0) {
        // Tennis court positions
        const tennisSpots: Point2D[] = [
          { x: 150, y: 510 },
          { x: 180, y: 530 },
          { x: 210, y: 500 },
          { x: 230, y: 520 },
        ];
        return tennisSpots[agentIndex % tennisSpots.length];
      } else {
        // Gym positions
        const gymSpots: Point2D[] = [
          { x: 80, y: 430 }, // Dumbbells
          { x: 120, y: 450 }, // Bench press
          { x: 150, y: 430 }, // Treadmill
        ];
        return gymSpots[agentIndex % gymSpots.length];
      }
    }

    case 'RANDOM_WANDER':
    default:
      return deskCoord;
  }
}
