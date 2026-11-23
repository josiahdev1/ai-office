/**
 * Campus Map & Outdoor Grounds System for EasyUp Software Solution HQ
 *
 * Defines the outdoor campus surrounding the 18x18 office building:
 * - Green lawn slab with perimeter fence, stone pillars, and security gate
 * - Trees (oak, pine, maple) with sway, bushes, flower beds, garden pond, benches, bike rack, lamp posts, flag
 * - Entrance canopy walkway and pedestrian zebra crosswalk
 * - Two-way asphalt roadway network with lane markings, curbs, bus shelter, and directed traffic graph
 * - 22 marked parking bays with wheel stops, 2 accessible bays, and reserved "JOSIAH (FOUNDER)" spot
 */

import { FacingDirection } from '@/components/office/types'

export interface Point2D {
  x: number
  y: number
}

export interface ParkingBay {
  id: string
  bayNumber: number
  x: number
  y: number
  facing: FacingDirection
  type: 'accessible' | 'founder' | 'standard'
  assignedAgentId?: string
  label: string
}

export interface RoadNode {
  id: string
  x: number
  y: number
  type:
    | 'spawn'
    | 'despawn'
    | 'waypoint'
    | 'crosswalk_stop'
    | 'lot_entry'
    | 'lot_exit'
    | 'bay_entry'
  facing: FacingDirection
  speedLimit?: number
}

export interface RoadEdge {
  from: string
  to: string
  length: number
}

export interface OutdoorProp {
  id: string
  type:
    | 'tree_oak'
    | 'tree_pine'
    | 'tree_maple'
    | 'bush'
    | 'flower_bed'
    | 'pond'
    | 'bench'
    | 'bike_rack'
    | 'lamp_post'
    | 'flagpole'
    | 'bus_shelter'
  x: number
  y: number
  w: number
  h: number
  solid: boolean
  label?: string
}

// ==================== 1. CAMPUS BOUNDARIES & GEOMETRY ====================

export const CAMPUS_CONFIG = {
  viewBox: { width: 1600, height: 1160 },
  // Building interior bounding polygon in screen pixels
  buildingScreenPolygon: [
    { x: 700, y: 120 }, // Top
    { x: 1276, y: 408 }, // Right
    { x: 700, y: 696 }, // Bottom (Front Entrance)
    { x: 124, y: 408 }, // Left
  ],
  // Green lawn slab outer boundary
  lawnPolygon: [
    { x: 700, y: 30 },
    { x: 1530, y: 430 },
    { x: 1250, y: 1100 },
    { x: 700, y: 1140 },
    { x: 150, y: 1100 },
    { x: -130, y: 430 },
  ],
  // Front entrance canopy & walkway
  entranceDoor: { x: 700, y: 686 },
  canopyPillars: [
    { x: 650, y: 720 },
    { x: 750, y: 720 },
  ],
  walkwayPath: [
    { x: 700, y: 696 },
    { x: 700, y: 760 },
    { x: 700, y: 825 }, // Crosswalk North edge
  ],
  // Zebra crosswalk across roadway
  crosswalk: {
    northEdge: { x: 700, y: 825 },
    southEdge: { x: 700, y: 915 },
    width: 60,
  },
  busStop: {
    shelter: { x: 930, y: 830 },
    bench: { x: 930, y: 840 },
    sign: { x: 965, y: 835 },
  },
}

// ==================== 2. PARKING LOT (22 BAYS) ====================
// Minimum 20 required. Bay 01 & 02 are Accessible. Bay 03 is Founder Josiah.

export const PARKING_BAYS: ParkingBay[] = [
  // North row of bays (Bays 1-11) along y = 945
  {
    id: 'bay-01',
    bayNumber: 1,
    x: 380,
    y: 945,
    facing: 'SE',
    type: 'accessible',
    label: 'ACCESSIBLE',
  },
  {
    id: 'bay-02',
    bayNumber: 2,
    x: 440,
    y: 945,
    facing: 'SE',
    type: 'accessible',
    label: 'ACCESSIBLE',
  },
  {
    id: 'bay-03',
    bayNumber: 3,
    x: 500,
    y: 945,
    facing: 'SE',
    type: 'founder',
    assignedAgentId: 'eng-1',
    label: 'JOSIAH (FOUNDER)',
  },
  {
    id: 'bay-04',
    bayNumber: 4,
    x: 560,
    y: 945,
    facing: 'SE',
    type: 'standard',
    assignedAgentId: 'eng-2',
    label: '04',
  },
  {
    id: 'bay-05',
    bayNumber: 5,
    x: 620,
    y: 945,
    facing: 'SE',
    type: 'standard',
    assignedAgentId: 'eng-3',
    label: '05',
  },
  {
    id: 'bay-06',
    bayNumber: 6,
    x: 680,
    y: 945,
    facing: 'SE',
    type: 'standard',
    assignedAgentId: 'eng-4',
    label: '06',
  },
  {
    id: 'bay-07',
    bayNumber: 7,
    x: 740,
    y: 945,
    facing: 'SE',
    type: 'standard',
    assignedAgentId: 'eng-5',
    label: '07',
  },
  {
    id: 'bay-08',
    bayNumber: 8,
    x: 800,
    y: 945,
    facing: 'SE',
    type: 'standard',
    assignedAgentId: 'eng-6',
    label: '08',
  },
  {
    id: 'bay-09',
    bayNumber: 9,
    x: 860,
    y: 945,
    facing: 'SE',
    type: 'standard',
    assignedAgentId: 'sec-1',
    label: '09',
  },
  {
    id: 'bay-10',
    bayNumber: 10,
    x: 920,
    y: 945,
    facing: 'SE',
    type: 'standard',
    assignedAgentId: 'sec-2',
    label: '10',
  },
  {
    id: 'bay-11',
    bayNumber: 11,
    x: 980,
    y: 945,
    facing: 'SE',
    type: 'standard',
    assignedAgentId: 'sec-3',
    label: '11',
  },

  // South row of bays (Bays 12-22) along y = 1055
  {
    id: 'bay-12',
    bayNumber: 12,
    x: 380,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'int-1',
    label: '12',
  },
  {
    id: 'bay-13',
    bayNumber: 13,
    x: 440,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'int-2',
    label: '13',
  },
  {
    id: 'bay-14',
    bayNumber: 14,
    x: 500,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'int-3',
    label: '14',
  },
  {
    id: 'bay-15',
    bayNumber: 15,
    x: 560,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'int-4',
    label: '15',
  },
  {
    id: 'bay-16',
    bayNumber: 16,
    x: 620,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'ops-1',
    label: '16',
  },
  {
    id: 'bay-17',
    bayNumber: 17,
    x: 680,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'ops-2',
    label: '17',
  },
  {
    id: 'bay-18',
    bayNumber: 18,
    x: 740,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'ops-3',
    label: '18',
  },
  {
    id: 'bay-19',
    bayNumber: 19,
    x: 800,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'ops-4',
    label: '19',
  },
  {
    id: 'bay-20',
    bayNumber: 20,
    x: 860,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'gro-1',
    label: '20',
  },
  {
    id: 'bay-21',
    bayNumber: 21,
    x: 920,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'gro-2',
    label: '21',
  },
  {
    id: 'bay-22',
    bayNumber: 22,
    x: 980,
    y: 1055,
    facing: 'NW',
    type: 'standard',
    assignedAgentId: 'cmd-1',
    label: '22',
  },
]

// ==================== 3. ROAD NETWORK & DIRECTED TRAFFIC GRAPH ====================
// Two-way street with parking lot loop. All paths lie strictly outside the building footprint.

export const ROAD_NODES: Record<string, RoadNode> = {
  // Inbound Eastbound Lane (y = 850)
  spawn_west: { id: 'spawn_west', x: -60, y: 850, type: 'spawn', facing: 'SE' },
  road_w1: { id: 'road_w1', x: 220, y: 850, type: 'waypoint', facing: 'SE' },
  road_w2: { id: 'road_w2', x: 480, y: 850, type: 'waypoint', facing: 'SE' },
  crosswalk_stop_w: {
    id: 'crosswalk_stop_w',
    x: 640,
    y: 850,
    type: 'crosswalk_stop',
    facing: 'SE',
  },
  crosswalk_mid_w: {
    id: 'crosswalk_mid_w',
    x: 700,
    y: 850,
    type: 'waypoint',
    facing: 'SE',
  },
  road_e1: { id: 'road_e1', x: 860, y: 850, type: 'waypoint', facing: 'SE' },
  bus_stop_node: {
    id: 'bus_stop_node',
    x: 940,
    y: 850,
    type: 'waypoint',
    facing: 'SE',
  },
  road_e2: { id: 'road_e2', x: 1180, y: 850, type: 'waypoint', facing: 'SE' },
  despawn_east: {
    id: 'despawn_east',
    x: 1520,
    y: 850,
    type: 'despawn',
    facing: 'SE',
  },

  // Outbound Westbound Lane (y = 890)
  spawn_east: {
    id: 'spawn_east',
    x: 1520,
    y: 890,
    type: 'spawn',
    facing: 'NW',
  },
  road_ret_e2: {
    id: 'road_ret_e2',
    x: 1180,
    y: 890,
    type: 'waypoint',
    facing: 'NW',
  },
  road_ret_e1: {
    id: 'road_ret_e1',
    x: 860,
    y: 890,
    type: 'waypoint',
    facing: 'NW',
  },
  crosswalk_stop_e: {
    id: 'crosswalk_stop_e',
    x: 760,
    y: 890,
    type: 'crosswalk_stop',
    facing: 'NW',
  },
  crosswalk_mid_e: {
    id: 'crosswalk_mid_e',
    x: 700,
    y: 890,
    type: 'waypoint',
    facing: 'NW',
  },
  road_ret_w2: {
    id: 'road_ret_w2',
    x: 480,
    y: 890,
    type: 'waypoint',
    facing: 'NW',
  },
  road_ret_w1: {
    id: 'road_ret_w1',
    x: 220,
    y: 890,
    type: 'waypoint',
    facing: 'NW',
  },
  despawn_west: {
    id: 'despawn_west',
    x: -60,
    y: 890,
    type: 'despawn',
    facing: 'NW',
  },

  // Parking Lot Circulation Aisle (y = 1000, width = 70px, > 2 tiles wide)
  lot_entry: {
    id: 'lot_entry',
    x: 300,
    y: 890,
    type: 'lot_entry',
    facing: 'SW',
  },
  lot_aisle_start: {
    id: 'lot_aisle_start',
    x: 300,
    y: 1000,
    type: 'waypoint',
    facing: 'SE',
  },
  lot_aisle_mid1: {
    id: 'lot_aisle_mid1',
    x: 500,
    y: 1000,
    type: 'waypoint',
    facing: 'SE',
  },
  lot_aisle_crosswalk: {
    id: 'lot_aisle_crosswalk',
    x: 700,
    y: 1000,
    type: 'waypoint',
    facing: 'SE',
  },
  lot_aisle_mid2: {
    id: 'lot_aisle_mid2',
    x: 850,
    y: 1000,
    type: 'waypoint',
    facing: 'SE',
  },
  lot_aisle_end: {
    id: 'lot_aisle_end',
    x: 1080,
    y: 1000,
    type: 'waypoint',
    facing: 'NE',
  },
  lot_exit: { id: 'lot_exit', x: 1080, y: 890, type: 'lot_exit', facing: 'NW' },
}

export const ROAD_EDGES: RoadEdge[] = [
  // Eastbound street
  { from: 'spawn_west', to: 'road_w1', length: 280 },
  { from: 'road_w1', to: 'road_w2', length: 260 },
  { from: 'road_w2', to: 'crosswalk_stop_w', length: 160 },
  { from: 'crosswalk_stop_w', to: 'crosswalk_mid_w', length: 60 },
  { from: 'crosswalk_mid_w', to: 'road_e1', length: 160 },
  { from: 'road_e1', to: 'bus_stop_node', length: 80 },
  { from: 'bus_stop_node', to: 'road_e2', length: 240 },
  { from: 'road_e2', to: 'despawn_east', length: 340 },

  // Westbound street
  { from: 'spawn_east', to: 'road_ret_e2', length: 340 },
  { from: 'road_ret_e2', to: 'road_ret_e1', length: 320 },
  { from: 'road_ret_e1', to: 'crosswalk_stop_e', length: 100 },
  { from: 'crosswalk_stop_e', to: 'crosswalk_mid_e', length: 60 },
  { from: 'crosswalk_mid_e', to: 'road_ret_w2', length: 220 },
  { from: 'road_ret_w2', to: 'road_ret_w1', length: 260 },
  { from: 'road_ret_w1', to: 'despawn_west', length: 280 },

  // Parking lot entry turn & circulation
  { from: 'road_ret_w1', to: 'lot_entry', length: 80 },
  { from: 'lot_entry', to: 'lot_aisle_start', length: 110 },
  { from: 'lot_aisle_start', to: 'lot_aisle_mid1', length: 200 },
  { from: 'lot_aisle_mid1', to: 'lot_aisle_crosswalk', length: 200 },
  { from: 'lot_aisle_crosswalk', to: 'lot_aisle_mid2', length: 150 },
  { from: 'lot_aisle_mid2', to: 'lot_aisle_end', length: 230 },
  { from: 'lot_aisle_end', to: 'lot_exit', length: 110 },
  { from: 'lot_exit', to: 'road_ret_e1', length: 220 },
]

// ==================== 4. OUTDOOR PROPS (TREES, POND, BENCHES, LAMPS) ====================

export const OUTDOOR_PROPS: OutdoorProp[] = [
  // West Lawn Trees & Pond
  {
    id: 'tree-oak-1',
    type: 'tree_oak',
    x: 80,
    y: 560,
    w: 48,
    h: 64,
    solid: true,
    label: 'Heritage Oak',
  },
  {
    id: 'tree-pine-1',
    type: 'tree_pine',
    x: 140,
    y: 640,
    w: 36,
    h: 56,
    solid: true,
    label: 'Evergreen Pine',
  },
  {
    id: 'tree-maple-1',
    type: 'tree_maple',
    x: 200,
    y: 720,
    w: 44,
    h: 58,
    solid: true,
    label: 'Autumn Maple',
  },
  {
    id: 'garden-pond',
    type: 'pond',
    x: 160,
    y: 520,
    w: 90,
    h: 60,
    solid: true,
    label: 'Zen Koi Pond',
  },
  {
    id: 'bench-west',
    type: 'bench',
    x: 240,
    y: 580,
    w: 32,
    h: 16,
    solid: false,
    label: 'Garden Bench',
  },

  // East Lawn Trees & Amenities
  {
    id: 'tree-oak-2',
    type: 'tree_oak',
    x: 1280,
    y: 560,
    w: 48,
    h: 64,
    solid: true,
    label: 'Grand Oak',
  },
  {
    id: 'tree-pine-2',
    type: 'tree_pine',
    x: 1220,
    y: 640,
    w: 36,
    h: 56,
    solid: true,
    label: 'Tall Pine',
  },
  {
    id: 'tree-maple-2',
    type: 'tree_maple',
    x: 1160,
    y: 720,
    w: 44,
    h: 58,
    solid: true,
    label: 'Red Maple',
  },
  {
    id: 'flower-bed-east',
    type: 'flower_bed',
    x: 1200,
    y: 520,
    w: 80,
    h: 36,
    solid: false,
    label: 'Tulip Bed',
  },
  {
    id: 'bench-east',
    type: 'bench',
    x: 1120,
    y: 580,
    w: 32,
    h: 16,
    solid: false,
    label: 'Courtyard Bench',
  },
  {
    id: 'bike-rack',
    type: 'bike_rack',
    x: 1040,
    y: 740,
    w: 48,
    h: 20,
    solid: true,
    label: 'Employee Bike Rack',
  },
  {
    id: 'flagpole',
    type: 'flagpole',
    x: 620,
    y: 750,
    w: 16,
    h: 72,
    solid: true,
    label: 'EasyUp HQ Flag',
  },

  // Lamp Posts (Cast warm radial illumination at night)
  {
    id: 'lamp-entrance-1',
    type: 'lamp_post',
    x: 660,
    y: 780,
    w: 12,
    h: 38,
    solid: false,
    label: 'Entrance Lamp L',
  },
  {
    id: 'lamp-entrance-2',
    type: 'lamp_post',
    x: 740,
    y: 780,
    w: 12,
    h: 38,
    solid: false,
    label: 'Entrance Lamp R',
  },
  {
    id: 'lamp-lot-w',
    type: 'lamp_post',
    x: 340,
    y: 920,
    w: 12,
    h: 38,
    solid: false,
    label: 'Lot Lamp West',
  },
  {
    id: 'lamp-lot-mid',
    type: 'lamp_post',
    x: 700,
    y: 920,
    w: 12,
    h: 38,
    solid: false,
    label: 'Lot Lamp Center',
  },
  {
    id: 'lamp-lot-e',
    type: 'lamp_post',
    x: 1040,
    y: 920,
    w: 12,
    h: 38,
    solid: false,
    label: 'Lot Lamp East',
  },

  // Bus Stop Shelter
  {
    id: 'bus-shelter-1',
    type: 'bus_shelter',
    x: 940,
    y: 820,
    w: 56,
    h: 36,
    solid: true,
    label: 'EasyUp Transit Stop',
  },
]

/**
 * Checks if a point in screen coordinates lies strictly inside the building footprint polygon
 */
export function isPointInsideBuilding(p: Point2D): boolean {
  const poly = CAMPUS_CONFIG.buildingScreenPolygon
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y
    const xj = poly[j].x,
      yj = poly[j].y
    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Checks if an edge between two points intersects the building footprint
 */
export function doesEdgeIntersectBuilding(p1: Point2D, p2: Point2D): boolean {
  if (isPointInsideBuilding(p1) || isPointInsideBuilding(p2)) return true
  // Check midpoint and quarter points for convex polygon containment
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  if (isPointInsideBuilding(mid)) return true
  const q1 = { x: (p1.x * 3 + p2.x) / 4, y: (p1.y * 3 + p2.y) / 4 }
  const q2 = { x: (p1.x + p2.x * 3) / 4, y: (p1.y + p2.y * 3) / 4 }
  if (isPointInsideBuilding(q1) || isPointInsideBuilding(q2)) return true
  return false
}
