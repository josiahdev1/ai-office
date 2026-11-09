/**
 * Unified Isometric Open-Plan Office Map for EasyUp Software Solution HQ
 * Exact 2:1 isometric diamond slab (18x18 grid) matching design-ref/ref-hq.png
 * Single contiguous warm beige floor, tall charcoal back walls, non-overlapping zones.
 */

import { FacingDirection } from '@/components/office/types'

export interface GridCoord {
  gx: number
  gy: number
}

export interface Zone {
  id: string
  name: string
  label: string
  color: string
  rect: { x: number; y: number; w: number; h: number } // Grid tile bounding box
}

export interface FurnitureItem {
  id: string
  type:
    | 'desk'
    | 'brain_table'
    | 'chair'
    | 'server_rack'
    | 'purple_sofa'
    | 'coffee_bar'
    | 'vending_machine'
    | 'water_cooler'
    | 'fridge'
    | 'plant'
    | 'wall_monitor'
    | 'wall_clock'
    | 'bookshelf'
    | 'treadmill'
    | 'gym_mat'
    | 'dumbbell_rack'
    | 'glass_partition'
  gx: number
  gy: number
  w: number
  h: number
  solid: boolean
  label?: string
  color?: string
  interactiveSpot?: GridCoord
}

export type FloorNumber = 0 | 1 | 2 | 3

export interface ElevatorConfig {
  shaftGx: number
  shaftGy: number
  doorGx: number
  doorGy: number
  width: number
  height: number
}

export const ELEVATOR_CONFIG: ElevatorConfig = {
  shaftGx: 8,
  shaftGy: 1,
  doorGx: 8,
  doorGy: 2,
  width: 1,
  height: 1,
}

export interface OfficeFloorMeta {
  id: FloorNumber
  code: 'GF' | '1F' | '2F' | '3F'
  name: string
  subtitle: string
  color: string
}

export const OFFICE_FLOORS: OfficeFloorMeta[] = [
  {
    id: 0,
    code: 'GF',
    name: 'Ground Floor',
    subtitle: 'Lobby, Canteen & Fitness',
    color: '#10b981',
  },
  {
    id: 1,
    code: '1F',
    name: 'Floor 1',
    subtitle: 'Engineering Core, QA & Operations',
    color: '#6366f1',
  },
  {
    id: 2,
    code: '2F',
    name: 'Floor 2',
    subtitle: 'Growth Lab, Intelligence & Command',
    color: '#06b6d4',
  },
  {
    id: 3,
    code: '3F',
    name: 'Top Floor',
    subtitle: 'The Brain Meeting Core & Sky Lounge',
    color: '#a855f7',
  },
]

export interface DeskSlot {
  id: string
  agentId: string
  name: string
  room: string
  deskGx: number
  deskGy: number
  chairGx: number
  chairGy: number
  facing: FacingDirection
  monitors: number
  floor?: FloorNumber
}

export interface ActivitySpot {
  id: string
  zone: 'brain' | 'pantry' | 'lounge' | 'gym' | 'desk'
  gx: number
  gy: number
  activity: string
  facing: FacingDirection
}

export const MAP_CONFIG = {
  cols: 18,
  rows: 18,
  tileWidth: 64,
  tileHeight: 32,
  originX: 700,
  originY: 120,
  floorColor: '#ded5c4',
  floorGrout: '#cfc6b0',
  wallCharcoal: '#181c26',
  wallCap: '#2e3546',
  wallHeight: 70,
}

// Convert grid (gx, gy) to 2D pixel space in viewport
export function gridToScreen(
  gx: number,
  gy: number,
  originX = MAP_CONFIG.originX,
  originY = MAP_CONFIG.originY
): { x: number; y: number } {
  const x = originX + (gx - gy) * (MAP_CONFIG.tileWidth / 2)
  const y = originY + (gx + gy) * (MAP_CONFIG.tileHeight / 2)
  return { x, y }
}

// Convert pixel coordinate back to grid coordinate
export function screenToGrid(
  x: number,
  y: number,
  originX = MAP_CONFIG.originX,
  originY = MAP_CONFIG.originY
): GridCoord {
  const dx = x - originX
  const dy = y - originY
  const halfW = MAP_CONFIG.tileWidth / 2
  const halfH = MAP_CONFIG.tileHeight / 2
  const gx = Math.round((dx / halfW + dy / halfH) / 2)
  const gy = Math.round((dy / halfH - dx / halfW) / 2)
  return { gx, gy }
}

/**
 * Calculates isometric facing direction ('SE' | 'SW' | 'NE' | 'NW') from movement delta in screen pixels.
 * Uses hysteresis to prevent flickering along diagonal transitions.
 */
export function calculateWalkingFacing(
  dx: number,
  dy: number,
  currentFacing: FacingDirection = 'SE'
): FacingDirection {
  const dist = Math.hypot(dx, dy)
  if (dist < 0.5) return currentFacing

  // Convert screen delta (2:1 isometric) to grid delta
  // screenX = (gx - gy) * 32, screenY = (gx + gy) * 16
  const dgx = (dx / 32 + dy / 16) / 2
  const dgy = (dy / 16 - dx / 32) / 2

  const absGpx = Math.abs(dgx)
  const absGpy = Math.abs(dgy)

  // Hysteresis threshold to prevent jitter when moving along diagonals
  const hysteresis = 0.15
  if (Math.abs(absGpx - absGpy) < hysteresis) {
    if (dgx > 0 && currentFacing === 'SE') return 'SE'
    if (dgx < 0 && currentFacing === 'NW') return 'NW'
    if (dgy > 0 && currentFacing === 'SW') return 'SW'
    if (dgy < 0 && currentFacing === 'NE') return 'NE'
  }

  if (absGpx >= absGpy) {
    return dgx >= 0 ? 'SE' : 'NW'
  } else {
    return dgy >= 0 ? 'SW' : 'NE'
  }
}

/**
 * Calculates facing from a source grid coordinate toward a target grid coordinate.
 */
export function getFacingToward(
  fromGx: number,
  fromGy: number,
  toGx: number,
  toGy: number
): FacingDirection {
  const dgx = toGx - fromGx
  const dgy = toGy - fromGy

  if (Math.abs(dgx) >= Math.abs(dgy)) {
    return dgx >= 0 ? 'SE' : 'NW'
  } else {
    return dgy >= 0 ? 'SW' : 'NE'
  }
}

/**
 * Calculates facing from a source screen position toward a target screen position.
 */
export function calculateFacingBetweenPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): FacingDirection {
  const dx = x2 - x1
  const dy = y2 - y1
  const dgx = (dx / 32 + dy / 16) / 2
  const dgy = (dy / 16 - dx / 32) / 2

  if (Math.abs(dgx) >= Math.abs(dgy)) {
    return dgx >= 0 ? 'SE' : 'NW'
  } else {
    return dgy >= 0 ? 'SW' : 'NE'
  }
}

/**
 * ZONES (Non-overlapping department zones and facility areas)
 */
export const OFFICE_ZONES: Zone[] = [
  {
    id: 'server_room',
    name: 'Server & NOC Room',
    label: 'SERVER / NOC',
    color: '#0ea5e9',
    rect: { x: 1, y: 1, w: 3, h: 3 },
  },
  {
    id: 'pantry_corner',
    name: 'Pantry & Canteen',
    label: 'PANTRY & CANTEEN',
    color: '#f59e0b',
    rect: { x: 14, y: 1, w: 3, h: 4 },
  },
  {
    id: 'lounge_corner',
    name: 'Purple Velvet Lounge',
    label: 'EXECUTIVE LOUNGE',
    color: '#a855f7',
    rect: { x: 1, y: 5, w: 3, h: 4 },
  },
  {
    id: 'brain_meeting',
    name: 'The Brain Meeting Core',
    label: 'THE BRAIN',
    color: '#38bdf8',
    rect: { x: 6, y: 6, w: 6, h: 6 },
  },
  {
    id: 'engineering_core',
    name: 'Engineering Core',
    label: 'ENGINEERING CORE',
    color: '#6366f1',
    rect: { x: 1, y: 10, w: 5, h: 4 },
  },
  {
    id: 'qa_secops',
    name: 'QA & SecOps NOC',
    label: 'QA & SECOPS',
    color: '#ec4899',
    rect: { x: 1, y: 14, w: 5, h: 3 },
  },
  {
    id: 'intelligence_lab',
    name: 'Intelligence Lab',
    label: 'INTELLIGENCE LAB',
    color: '#06b6d4',
    rect: { x: 12, y: 5, w: 5, h: 4 },
  },
  {
    id: 'growth_lab',
    name: 'Growth Lab',
    label: 'GROWTH LAB',
    color: '#3b82f6',
    rect: { x: 12, y: 9, w: 5, h: 3 },
  },
  {
    id: 'ops_command',
    name: 'Operations & Command',
    label: 'OPERATIONS & COMMAND',
    color: '#10b981',
    rect: { x: 12, y: 12, w: 5, h: 5 },
  },
  {
    id: 'gym_wellness',
    name: 'Fitness & Wellness Zone',
    label: 'FITNESS & WELLNESS',
    color: '#14b8a6',
    rect: { x: 6, y: 14, w: 5, h: 3 },
  },
]

/**
 * 23 ASSIGNED DESKS (One per agent)
 * Positioned in clean rows with clear 2-tile aisles
 */
export const ASSIGNED_DESKS: DeskSlot[] = [
  // 1. Josiah - Executive Triple Monitor Desk (Engineering Core Head) - Faces NW towards triple monitors
  {
    id: 'eng-1',
    agentId: 'josiah',
    name: 'Josiah',
    room: 'Engineering Core',
    deskGx: 2,
    deskGy: 10,
    chairGx: 3,
    chairGy: 10,
    facing: 'NW',
    monitors: 3,
    floor: 1,
  },
  // Engineering Core Rows (Facing NW - workers seen from behind facing monitors)
  {
    id: 'eng-2',
    agentId: 'arwin',
    name: 'Arwin',
    room: 'Engineering Core',
    deskGx: 2,
    deskGy: 11,
    chairGx: 3,
    chairGy: 11,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'eng-3',
    agentId: 'neil_mar',
    name: 'Neil Mar',
    room: 'Engineering Core',
    deskGx: 2,
    deskGy: 12,
    chairGx: 3,
    chairGy: 12,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'eng-4',
    agentId: 'nelmar',
    name: 'Nelmar',
    room: 'Engineering Core',
    deskGx: 4,
    deskGy: 10,
    chairGx: 5,
    chairGy: 10,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'eng-5',
    agentId: 'bonnie',
    name: 'Bonnie',
    room: 'Engineering Core',
    deskGx: 4,
    deskGy: 11,
    chairGx: 5,
    chairGy: 11,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'eng-6',
    agentId: 'john_lloyd',
    name: 'John Lloyd',
    room: 'Engineering Core',
    deskGx: 4,
    deskGy: 12,
    chairGx: 5,
    chairGy: 12,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'eng-7',
    agentId: 'christian',
    name: 'Christian',
    room: 'Engineering Core',
    deskGx: 4,
    deskGy: 13,
    chairGx: 5,
    chairGy: 13,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },

  // 2. QA & SecOps NOC (3 Desks) - Facing NE towards monitors
  {
    id: 'qa-1',
    agentId: 'khent',
    name: 'Khent',
    room: 'QA & SecOps NOC',
    deskGx: 2,
    deskGy: 14,
    chairGx: 2,
    chairGy: 15,
    facing: 'NE',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'qa-2',
    agentId: 'john_arvy',
    name: 'John Arvy',
    room: 'QA & SecOps NOC',
    deskGx: 3,
    deskGy: 14,
    chairGx: 3,
    chairGy: 15,
    facing: 'NE',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'qa-3',
    agentId: 'gian',
    name: 'Gian',
    room: 'QA & SecOps NOC',
    deskGx: 4,
    deskGy: 14,
    chairGx: 4,
    chairGy: 15,
    facing: 'NE',
    monitors: 2,
    floor: 1,
  },

  // 3. Intelligence Lab (4 Desks) - Back-to-Back Pairs (gx 14 facing NW, gx 15 facing SE)
  {
    id: 'intel-1',
    agentId: 'roy_jhan',
    name: 'Roy Jhan',
    room: 'Intelligence Lab',
    deskGx: 13,
    deskGy: 5,
    chairGx: 14,
    chairGy: 5,
    facing: 'NW',
    monitors: 2,
    floor: 2,
  },
  {
    id: 'intel-2',
    agentId: 'gabriel',
    name: 'Gabriel',
    room: 'Intelligence Lab',
    deskGx: 13,
    deskGy: 6,
    chairGx: 14,
    chairGy: 6,
    facing: 'NW',
    monitors: 2,
    floor: 2,
  },
  {
    id: 'intel-3',
    agentId: 'keiru',
    name: 'Keiru',
    room: 'Intelligence Lab',
    deskGx: 16,
    deskGy: 5,
    chairGx: 15,
    chairGy: 5,
    facing: 'SE',
    monitors: 2,
    floor: 2,
  },
  {
    id: 'intel-4',
    agentId: 'ryan',
    name: 'Ryan',
    room: 'Intelligence Lab',
    deskGx: 16,
    deskGy: 6,
    chairGx: 15,
    chairGy: 6,
    facing: 'SE',
    monitors: 2,
    floor: 2,
  },

  // 4. Growth Lab (3 Desks) - Varied NW and NE
  {
    id: 'growth-1',
    agentId: 'jo_vincent',
    name: 'Jo Vincent',
    room: 'Growth Lab',
    deskGx: 13,
    deskGy: 9,
    chairGx: 14,
    chairGy: 9,
    facing: 'NW',
    monitors: 2,
    floor: 2,
  },
  {
    id: 'growth-2',
    agentId: 'jesmond',
    name: 'Jesmond',
    room: 'Growth Lab',
    deskGx: 13,
    deskGy: 10,
    chairGx: 14,
    chairGy: 10,
    facing: 'NW',
    monitors: 2,
    floor: 2,
  },
  {
    id: 'growth-3',
    agentId: 'kin',
    name: 'Kin',
    room: 'Growth Lab',
    deskGx: 15,
    deskGy: 9,
    chairGx: 15,
    chairGy: 10,
    facing: 'NE',
    monitors: 2,
    floor: 2,
  },

  // 5. Operations Hub (4 Desks) - Manager (SE) + Tech rows (NW)
  {
    id: 'ops-1',
    agentId: 'mary_grace',
    name: 'Mary Grace',
    room: 'Operations Hub',
    deskGx: 14,
    deskGy: 12,
    chairGx: 13,
    chairGy: 12,
    facing: 'SE',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'ops-2',
    agentId: 'anthony',
    name: 'Anthony',
    room: 'Operations Hub',
    deskGx: 15,
    deskGy: 12,
    chairGx: 16,
    chairGy: 12,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'ops-3',
    agentId: 'blaze',
    name: 'Blaze',
    room: 'Operations Hub',
    deskGx: 15,
    deskGy: 13,
    chairGx: 16,
    chairGy: 13,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'ops-4',
    agentId: 'ferwin',
    name: 'Ferwin',
    room: 'Operations Hub',
    deskGx: 13,
    deskGy: 13,
    chairGx: 14,
    chairGy: 13,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },

  // 6. Command Center (3 Desks) - Executive desks facing camera (SE) + Architect (NW)
  {
    id: 'cmd-1',
    agentId: 'gloria',
    name: 'Gloria',
    room: 'Command Center',
    deskGx: 14,
    deskGy: 15,
    chairGx: 13,
    chairGy: 15,
    facing: 'SE',
    monitors: 2,
    floor: 2,
  },
  {
    id: 'cmd-2',
    agentId: 'jb',
    name: 'JB',
    room: 'Command Center',
    deskGx: 15,
    deskGy: 15,
    chairGx: 16,
    chairGy: 15,
    facing: 'NW',
    monitors: 2,
    floor: 2,
  },
  {
    id: 'cmd-3',
    agentId: 'julian',
    name: 'Julian',
    room: 'Command Center',
    deskGx: 14,
    deskGy: 16,
    chairGx: 13,
    chairGy: 16,
    facing: 'SE',
    monitors: 2,
    floor: 2,
  },
]

/**
 * 32 BRAIN MEETING SPOTS (Centered around The Brain table at gx=9, gy=9)
 */
export const BRAIN_MEETING_SPOTS: ActivitySpot[] = [
  // Inner ring chairs around the round table (16 spots)
  {
    id: 'brain-1',
    zone: 'brain',
    gx: 9,
    gy: 7,
    activity: 'seated_meeting',
    facing: 'SW',
  },
  {
    id: 'brain-2',
    zone: 'brain',
    gx: 10,
    gy: 7,
    activity: 'seated_meeting',
    facing: 'SW',
  },
  {
    id: 'brain-3',
    zone: 'brain',
    gx: 11,
    gy: 8,
    activity: 'seated_meeting',
    facing: 'SW',
  },
  {
    id: 'brain-4',
    zone: 'brain',
    gx: 11,
    gy: 9,
    activity: 'seated_meeting',
    facing: 'NW',
  },
  {
    id: 'brain-5',
    zone: 'brain',
    gx: 11,
    gy: 10,
    activity: 'seated_meeting',
    facing: 'NW',
  },
  {
    id: 'brain-6',
    zone: 'brain',
    gx: 10,
    gy: 11,
    activity: 'seated_meeting',
    facing: 'NW',
  },
  {
    id: 'brain-7',
    zone: 'brain',
    gx: 9,
    gy: 11,
    activity: 'seated_meeting',
    facing: 'NE',
  },
  {
    id: 'brain-8',
    zone: 'brain',
    gx: 8,
    gy: 11,
    activity: 'seated_meeting',
    facing: 'NE',
  },
  {
    id: 'brain-9',
    zone: 'brain',
    gx: 7,
    gy: 10,
    activity: 'seated_meeting',
    facing: 'NE',
  },
  {
    id: 'brain-10',
    zone: 'brain',
    gx: 7,
    gy: 9,
    activity: 'seated_meeting',
    facing: 'SE',
  },
  {
    id: 'brain-11',
    zone: 'brain',
    gx: 7,
    gy: 8,
    activity: 'seated_meeting',
    facing: 'SE',
  },
  {
    id: 'brain-12',
    zone: 'brain',
    gx: 8,
    gy: 7,
    activity: 'seated_meeting',
    facing: 'SE',
  },
  {
    id: 'brain-13',
    zone: 'brain',
    gx: 10,
    gy: 8,
    activity: 'seated_meeting',
    facing: 'SW',
  },
  {
    id: 'brain-14',
    zone: 'brain',
    gx: 10,
    gy: 10,
    activity: 'seated_meeting',
    facing: 'NW',
  },
  {
    id: 'brain-15',
    zone: 'brain',
    gx: 8,
    gy: 10,
    activity: 'seated_meeting',
    facing: 'NE',
  },
  {
    id: 'brain-16',
    zone: 'brain',
    gx: 8,
    gy: 8,
    activity: 'seated_meeting',
    facing: 'SE',
  },

  // Outer ring standing / discussion (16 spots)
  {
    id: 'brain-17',
    zone: 'brain',
    gx: 9,
    gy: 6,
    activity: 'standing_discussion',
    facing: 'SW',
  },
  {
    id: 'brain-18',
    zone: 'brain',
    gx: 11,
    gy: 7,
    activity: 'standing_discussion',
    facing: 'SW',
  },
  {
    id: 'brain-19',
    zone: 'brain',
    gx: 12,
    gy: 8,
    activity: 'standing_discussion',
    facing: 'NW',
  },
  {
    id: 'brain-20',
    zone: 'brain',
    gx: 12,
    gy: 9,
    activity: 'standing_discussion',
    facing: 'NW',
  },
  {
    id: 'brain-21',
    zone: 'brain',
    gx: 12,
    gy: 10,
    activity: 'standing_discussion',
    facing: 'NW',
  },
  {
    id: 'brain-22',
    zone: 'brain',
    gx: 11,
    gy: 11,
    activity: 'standing_discussion',
    facing: 'NE',
  },
  {
    id: 'brain-23',
    zone: 'brain',
    gx: 9,
    gy: 12,
    activity: 'standing_discussion',
    facing: 'NE',
  },
  {
    id: 'brain-24',
    zone: 'brain',
    gx: 8,
    gy: 12,
    activity: 'standing_discussion',
    facing: 'NE',
  },
  {
    id: 'brain-25',
    zone: 'brain',
    gx: 7,
    gy: 11,
    activity: 'standing_discussion',
    facing: 'SE',
  },
  {
    id: 'brain-26',
    zone: 'brain',
    gx: 6,
    gy: 10,
    activity: 'standing_discussion',
    facing: 'SE',
  },
  {
    id: 'brain-27',
    zone: 'brain',
    gx: 6,
    gy: 9,
    activity: 'standing_discussion',
    facing: 'SE',
  },
  {
    id: 'brain-28',
    zone: 'brain',
    gx: 6,
    gy: 8,
    activity: 'standing_discussion',
    facing: 'SE',
  },
  {
    id: 'brain-29',
    zone: 'brain',
    gx: 7,
    gy: 7,
    activity: 'standing_discussion',
    facing: 'SE',
  },
  {
    id: 'brain-30',
    zone: 'brain',
    gx: 8,
    gy: 6,
    activity: 'standing_discussion',
    facing: 'SW',
  },
  {
    id: 'brain-31',
    zone: 'brain',
    gx: 10,
    gy: 6,
    activity: 'standing_discussion',
    facing: 'SW',
  },
  {
    id: 'brain-32',
    zone: 'brain',
    gx: 11,
    gy: 6,
    activity: 'standing_discussion',
    facing: 'SW',
  },
]

/**
 * 32 PANTRY & BREAK SPOTS
 */
export const PANTRY_ACTIVITY_SPOTS: ActivitySpot[] = [
  // 1. Espresso Bar Counter & Stools (8 spots)
  {
    id: 'pantry-1',
    zone: 'pantry',
    gx: 14,
    gy: 2,
    activity: 'coffee_brewing',
    facing: 'NW',
  },
  {
    id: 'pantry-2',
    zone: 'pantry',
    gx: 15,
    gy: 2,
    activity: 'coffee_brewing',
    facing: 'NW',
  },
  {
    id: 'pantry-3',
    zone: 'pantry',
    gx: 16,
    gy: 2,
    activity: 'snack_chat',
    facing: 'NW',
  },
  {
    id: 'pantry-4',
    zone: 'pantry',
    gx: 14,
    gy: 3,
    activity: 'bar_stool_sitting',
    facing: 'SW',
  },
  {
    id: 'pantry-5',
    zone: 'pantry',
    gx: 15,
    gy: 3,
    activity: 'bar_stool_sitting',
    facing: 'SW',
  },
  {
    id: 'pantry-6',
    zone: 'pantry',
    gx: 16,
    gy: 3,
    activity: 'bar_stool_sitting',
    facing: 'SW',
  },
  {
    id: 'pantry-7',
    zone: 'pantry',
    gx: 14,
    gy: 4,
    activity: 'break_chat',
    facing: 'SW',
  },
  {
    id: 'pantry-8',
    zone: 'pantry',
    gx: 15,
    gy: 4,
    activity: 'break_chat',
    facing: 'SW',
  },

  // 2. Fridge, Water Cooler & Vending Area (8 spots)
  {
    id: 'pantry-9',
    zone: 'pantry',
    gx: 16,
    gy: 4,
    activity: 'refrigerator_snack',
    facing: 'NE',
  },
  {
    id: 'pantry-10',
    zone: 'pantry',
    gx: 17,
    gy: 2,
    activity: 'water_dispenser',
    facing: 'NE',
  },
  {
    id: 'pantry-11',
    zone: 'pantry',
    gx: 17,
    gy: 3,
    activity: 'vending_machine',
    facing: 'NE',
  },
  {
    id: 'pantry-12',
    zone: 'pantry',
    gx: 17,
    gy: 4,
    activity: 'snack_counter',
    facing: 'NE',
  },
  {
    id: 'pantry-13',
    zone: 'pantry',
    gx: 14,
    gy: 5,
    activity: 'break_chat',
    facing: 'SW',
  },
  {
    id: 'pantry-14',
    zone: 'pantry',
    gx: 14,
    gy: 1,
    activity: 'break_chat',
    facing: 'SE',
  },
  {
    id: 'pantry-15',
    zone: 'pantry',
    gx: 17,
    gy: 1,
    activity: 'break_chat',
    facing: 'SW',
  },
  {
    id: 'pantry-16',
    zone: 'pantry',
    gx: 17,
    gy: 5,
    activity: 'break_chat',
    facing: 'SW',
  },

  // 3. Purple Velvet Lounge Sofas & Coffee Tables (16 spots)
  {
    id: 'lounge-1',
    zone: 'lounge',
    gx: 2,
    gy: 5,
    activity: 'sofa_relaxing',
    facing: 'SE',
  },
  {
    id: 'lounge-2',
    zone: 'lounge',
    gx: 3,
    gy: 5,
    activity: 'sofa_relaxing',
    facing: 'SE',
  },
  {
    id: 'lounge-3',
    zone: 'lounge',
    gx: 2,
    gy: 6,
    activity: 'sofa_relaxing',
    facing: 'SE',
  },
  {
    id: 'lounge-4',
    zone: 'lounge',
    gx: 3,
    gy: 6,
    activity: 'sofa_relaxing',
    facing: 'SE',
  },
  {
    id: 'lounge-5',
    zone: 'lounge',
    gx: 2,
    gy: 7,
    activity: 'reading_bookshelf',
    facing: 'SE',
  },
  {
    id: 'lounge-6',
    zone: 'lounge',
    gx: 3,
    gy: 7,
    activity: 'reading_bookshelf',
    facing: 'SE',
  },
  {
    id: 'lounge-7',
    zone: 'lounge',
    gx: 2,
    gy: 8,
    activity: 'casual_chat',
    facing: 'SE',
  },
  {
    id: 'lounge-8',
    zone: 'lounge',
    gx: 3,
    gy: 8,
    activity: 'casual_chat',
    facing: 'SE',
  },
  {
    id: 'lounge-9',
    zone: 'lounge',
    gx: 1,
    gy: 9,
    activity: 'lounge_coffee',
    facing: 'SW',
  },
  {
    id: 'lounge-10',
    zone: 'lounge',
    gx: 1,
    gy: 6,
    activity: 'lounge_coffee',
    facing: 'SW',
  },
  {
    id: 'lounge-11',
    zone: 'lounge',
    gx: 1,
    gy: 7,
    activity: 'lounge_coffee',
    facing: 'SW',
  },
  {
    id: 'lounge-12',
    zone: 'lounge',
    gx: 1,
    gy: 8,
    activity: 'lounge_coffee',
    facing: 'SW',
  },
  {
    id: 'lounge-13',
    zone: 'lounge',
    gx: 4,
    gy: 5,
    activity: 'window_view',
    facing: 'SE',
  },
  {
    id: 'lounge-14',
    zone: 'lounge',
    gx: 4,
    gy: 6,
    activity: 'window_view',
    facing: 'SE',
  },
  {
    id: 'lounge-15',
    zone: 'lounge',
    gx: 4,
    gy: 7,
    activity: 'window_view',
    facing: 'SE',
  },
  {
    id: 'lounge-16',
    zone: 'lounge',
    gx: 4,
    gy: 8,
    activity: 'window_view',
    facing: 'SE',
  },
]

/**
 * GYM & WELLNESS ACTIVITY SPOTS (12 spots)
 */
export const GYM_ACTIVITY_SPOTS: ActivitySpot[] = [
  {
    id: 'gym-1',
    zone: 'gym',
    gx: 7,
    gy: 14,
    activity: 'treadmill_running',
    facing: 'SE',
  },
  {
    id: 'gym-2',
    zone: 'gym',
    gx: 8,
    gy: 14,
    activity: 'treadmill_running',
    facing: 'SE',
  },
  {
    id: 'gym-3',
    zone: 'gym',
    gx: 9,
    gy: 14,
    activity: 'treadmill_running',
    facing: 'SE',
  },
  {
    id: 'gym-4',
    zone: 'gym',
    gx: 10,
    gy: 14,
    activity: 'treadmill_running',
    facing: 'SE',
  },
  {
    id: 'gym-5',
    zone: 'gym',
    gx: 7,
    gy: 15,
    activity: 'yoga_stretching',
    facing: 'SW',
  },
  {
    id: 'gym-6',
    zone: 'gym',
    gx: 8,
    gy: 15,
    activity: 'yoga_stretching',
    facing: 'SW',
  },
  {
    id: 'gym-7',
    zone: 'gym',
    gx: 9,
    gy: 15,
    activity: 'yoga_stretching',
    facing: 'SW',
  },
  {
    id: 'gym-8',
    zone: 'gym',
    gx: 10,
    gy: 15,
    activity: 'yoga_stretching',
    facing: 'SW',
  },
  {
    id: 'gym-9',
    zone: 'gym',
    gx: 7,
    gy: 16,
    activity: 'dumbbell_curl',
    facing: 'NW',
  },
  {
    id: 'gym-10',
    zone: 'gym',
    gx: 8,
    gy: 16,
    activity: 'dumbbell_curl',
    facing: 'NW',
  },
  {
    id: 'gym-11',
    zone: 'gym',
    gx: 9,
    gy: 16,
    activity: 'dumbbell_curl',
    facing: 'NW',
  },
  {
    id: 'gym-12',
    zone: 'gym',
    gx: 10,
    gy: 16,
    activity: 'dumbbell_curl',
    facing: 'NW',
  },
]

/**
 * FIXED FURNITURE & ARCHITECTURAL ASSETS
 */
export const OFFICE_FURNITURE: FurnitureItem[] = [
  // 1. The Brain Round Conference Table (Center: gx 9, gy 9)
  {
    id: 'brain_table_center',
    type: 'brain_table',
    gx: 9,
    gy: 9,
    w: 1,
    h: 1,
    solid: true,
    label: 'THE BRAIN',
    color: '#0f172a',
  },

  // 2. Server Room Racks (gx 2, gy 2)
  {
    id: 'server_rack_1',
    type: 'server_rack',
    gx: 2,
    gy: 2,
    w: 1,
    h: 1,
    solid: true,
    label: 'EDGE-SRV-01',
  },

  // 3. Pantry Bar L-Counter (gx 15..16, gy 1)
  {
    id: 'pantry_counter_long',
    type: 'coffee_bar',
    gx: 15,
    gy: 1,
    w: 2,
    h: 1,
    solid: true,
    label: 'ESPRESSO BAR',
  },

  // 4. Purple Velvet Lounge Sofas
  {
    id: 'purple_sofa_main',
    type: 'purple_sofa',
    gx: 1,
    gy: 5,
    w: 1,
    h: 1,
    solid: true,
    label: 'SOFA',
  },

  // 5. Fitness Equipment
  {
    id: 'treadmill_1',
    type: 'treadmill',
    gx: 6,
    gy: 14,
    w: 1,
    h: 1,
    solid: true,
    label: 'TREADMILL',
  },

  // 6. Wall & Decorative Plants
  {
    id: 'plant_1',
    type: 'plant',
    gx: 4,
    gy: 1,
    w: 1,
    h: 1,
    solid: true,
    label: 'MONSTERA',
  },
  {
    id: 'plant_2',
    type: 'plant',
    gx: 13,
    gy: 1,
    w: 1,
    h: 1,
    solid: true,
    label: 'FIDDLE-LEAF FIG',
  },
  // 7. Express Elevator Bank (gx 8, gy 1) on the central back wall
  {
    id: 'elevator_shaft_main',
    type: 'glass_partition',
    gx: 8,
    gy: 1,
    w: 1,
    h: 1,
    solid: true,
    label: 'EXPRESS ELEVATOR',
    interactiveSpot: { gx: 8, gy: 2 },
  },
]

// Add the 23 assigned desks as solid furniture items
ASSIGNED_DESKS.forEach((d) => {
  OFFICE_FURNITURE.push({
    id: `desk_fixture_${d.id}`,
    type: 'desk',
    gx: d.deskGx,
    gy: d.deskGy,
    w: 1,
    h: 1,
    solid: true,
    label: `${d.name}'s Desk`,
    interactiveSpot: { gx: d.chairGx, gy: d.chairGy },
  })
})

/**
 * Builds the Boolean Walkability Collision Matrix for the 18x18 grid.
 */
export function buildCollisionGrid(): boolean[][] {
  const { cols, rows } = MAP_CONFIG
  const grid: boolean[][] = []

  for (let y = 0; y < rows; y++) {
    const row: boolean[] = []
    for (let x = 0; x < cols; x++) {
      if (x === 0 || y === 0) {
        row.push(false)
      } else {
        row.push(true)
      }
    }
    grid.push(row)
  }

  OFFICE_FURNITURE.forEach((item) => {
    if (!item.solid) return
    for (let dy = 0; dy < item.h; dy++) {
      for (let dx = 0; dx < item.w; dx++) {
        const tx = item.gx + dx
        const ty = item.gy + dy
        if (ty >= 0 && ty < rows && tx >= 0 && tx < cols) {
          grid[ty][tx] = false
        }
      }
    }
  })

  return grid
}

/**
 * 4 GUEST HOT DESKS FOR LIVE BRIDGE SESSIONS
 */
export const GUEST_DESKS: DeskSlot[] = [
  {
    id: 'guest-1',
    agentId: 'guest_1',
    name: 'Guest Workstation 1',
    room: 'Engineering Core',
    deskGx: 6,
    deskGy: 10,
    chairGx: 7,
    chairGy: 10,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'guest-2',
    agentId: 'guest_2',
    name: 'Guest Workstation 2',
    room: 'Engineering Core',
    deskGx: 6,
    deskGy: 11,
    chairGx: 7,
    chairGy: 11,
    facing: 'NW',
    monitors: 2,
    floor: 1,
  },
  {
    id: 'guest-3',
    agentId: 'guest_3',
    name: 'Guest Workstation 3',
    room: 'Growth Lab',
    deskGx: 13,
    deskGy: 8,
    chairGx: 14,
    chairGy: 8,
    facing: 'NW',
    monitors: 2,
    floor: 2,
  },
  {
    id: 'guest-4',
    agentId: 'guest_4',
    name: 'Guest Workstation 4',
    room: 'Growth Lab',
    deskGx: 15,
    deskGy: 8,
    chairGx: 16,
    chairGy: 8,
    facing: 'NW',
    monitors: 2,
    floor: 2,
  },
]

export function getAgentAssignedFloor(agentId: string): FloorNumber {
  const desk = ASSIGNED_DESKS.find((d) => d.agentId === agentId)
  if (desk && desk.floor !== undefined) return desk.floor
  const guest = GUEST_DESKS.find((d) => d.agentId === agentId)
  if (guest && guest.floor !== undefined) return guest.floor
  return 1
}

export function getFloorDesks(floor: FloorNumber): DeskSlot[] {
  return [
    ...ASSIGNED_DESKS.filter((d) => d.floor === floor),
    ...GUEST_DESKS.filter((d) => d.floor === floor),
  ]
}
