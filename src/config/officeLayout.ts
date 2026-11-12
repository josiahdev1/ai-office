/**
 * Unified Single Source of Truth for 2D & 3D Isometric Office Layout
 * EasyUp Software Solution HQ (Iloilo City)
 *
 * Used identically by:
 * - @/components/office/OfficeCanvas3D.tsx (Three.js / R3F procedural engine)
 * - @/components/office/OfficeCanvas2D.tsx (2.5D Isometric Canvas renderer)
 *
 * Preserves all 24 registered database agents with 1:1 coordinate & mode parity.
 */

export interface Room3DConfig {
  id: string
  name: string
  center: [number, number, number]
  size: [number, number] // [width, depth]
  floorColor: string
  wallColor: string
  accentColor: string
  description: string
}

export interface AgentWorkstation3D {
  agentId: string
  name: string
  department: string
  room: string
  deskPos: [number, number, number]
  facing: 'SE' | 'SW' | 'NE' | 'NW'
  allHandsPos: [number, number, number]
  pantryPos: [number, number, number]
  gymPos: [number, number, number]
  cafeteriaPos?: [number, number, number]
  napBedPos?: [number, number, number]
}

export const ROOMS_3D: Record<string, Room3DConfig> = {
  ENGINEERING: {
    id: 'ENGINEERING',
    name: 'Engineering Core',
    center: [-16, 0, -16],
    size: [14, 14],
    floorColor: '#3730a3', // Indigo-800
    wallColor: '#1e1b4b',
    accentColor: '#6366f1',
    description: 'Core microservices, Next.js frontend, and distributed cloud systems',
  },
  OPERATIONS: {
    id: 'OPERATIONS',
    name: 'Operations Hub',
    center: [0, 0, -16],
    size: [14, 14],
    floorColor: '#166534', // Green-800
    wallColor: '#052e16',
    accentColor: '#22c55e',
    description: 'Logistics, client communications, incident coordination, and process automation',
  },
  GROWTH: {
    id: 'GROWTH',
    name: 'Growth Lab',
    center: [16, 0, -16],
    size: [14, 14],
    floorColor: '#1e40af', // Blue-800
    wallColor: '#172554',
    accentColor: '#3b82f6',
    description: 'Marketing funnels, SEO intelligence, and client onboarding acquisition',
  },
  EXECUTIVE: {
    id: 'EXECUTIVE',
    name: 'Executive Lounge',
    center: [-16, 0, 0],
    size: [14, 14],
    floorColor: '#581c87', // Purple-900
    wallColor: '#3b0764',
    accentColor: '#a855f7',
    description: 'Strategic planning, financial modeling, and executive program roadmaps',
  },
  COMMAND: {
    id: 'COMMAND',
    name: 'Command Center ("The Brain")',
    center: [0, 0, 0],
    size: [14, 14],
    floorColor: '#090d16', // Dark Cybernetic Slab
    wallColor: '#020617',
    accentColor: '#00e5ff',
    description: 'Holographic core, inter-agent orchestration, and Go-Signal gateway',
  },
  SECOPS: {
    id: 'SECOPS',
    name: 'QA & SecOps NOC',
    center: [16, 0, 0],
    size: [14, 14],
    floorColor: '#86198f', // Magenta-800
    wallColor: '#4a044e',
    accentColor: '#ec4899',
    description: '24/7 Security operations, pen-testing, automated vitest CI, and vulnerability radar',
  },
  PANTRY: {
    id: 'PANTRY',
    name: 'Pantry & Canteen',
    center: [-16, 0, 16],
    size: [14, 14],
    floorColor: '#b45309', // Warm amber / wood
    wallColor: '#451a03',
    accentColor: '#f59e0b',
    description: 'Espresso bar, dining tables, fresh refreshments, and casual banter',
  },
  GYM: {
    id: 'GYM',
    name: 'Rec & Gym',
    center: [0, 0, 16],
    size: [14, 14],
    floorColor: '#9d174d', // Pink-800
    wallColor: '#500724',
    accentColor: '#f43f5e',
    description: 'Treadmills, weight benches, wellness mats, and off-duty fitness sessions',
  },
  INTELLIGENCE: {
    id: 'INTELLIGENCE',
    name: 'Intelligence & Research Lab',
    center: [16, 0, 16],
    size: [14, 14],
    floorColor: '#115e59', // Teal-800
    wallColor: '#042f2e',
    accentColor: '#14b8a6',
    description: 'LLM fine-tuning, computer vision pipelines, and prompt governance',
  },
  NAP_ROOM: {
    id: 'NAP_ROOM',
    name: 'Nap Room & Sleep Pods',
    center: [-35, 0, -16],
    size: [12, 12],
    floorColor: '#1e1b4b', // Deep night indigo
    wallColor: '#0f172a',
    accentColor: '#818cf8',
    description: 'Quiet dark rest pods, bunk beds, dim ambient reading lamps, and Do Not Disturb lights',
  },
  MENS_CR: {
    id: 'MENS_CR',
    name: "Men's Comfort Room (CR)",
    center: [-35, 0, -8],
    size: [12, 5],
    floorColor: '#0369a1', // Sky blue sanitary
    wallColor: '#082f49',
    accentColor: '#38bdf8',
    description: "Men's comfort room with privacy stalls, urinals, sinks, mirrors, and high-speed hand dryers",
  },
  WOMENS_CR: {
    id: 'WOMENS_CR',
    name: "Women's Comfort Room (CR)",
    center: [-35, 0, -2],
    size: [12, 5],
    floorColor: '#9d174d', // Rose sanitary
    wallColor: '#500724',
    accentColor: '#f472b6',
    description: "Women's comfort room with private stalls, vanity mirrors, wash basins, and hand dryers",
  },
  COMFORT_ROOM: {
    id: 'COMFORT_ROOM',
    name: 'Comfort Room (CR)',
    center: [-35, 0, -5],
    size: [12, 11],
    floorColor: '#0f766e', // Sanitary teal
    wallColor: '#042f2e',
    accentColor: '#2dd4bf',
    description: "Dual Men's and Women's executive comfort rooms with occupancy indicators and vanities",
  },
  SERVER_ROOM: {
    id: 'SERVER_ROOM',
    name: 'Server & Infrastructure NOC',
    center: [-35, 0, 3.5],
    size: [12, 5],
    floorColor: '#0f172a', // Deep slate NOC floor
    wallColor: '#020617',
    accentColor: '#0ea5e9', // Cyber cyan/blue
    description: 'Server racks with blinking status LEDs, cooling units, overhead cable trays, and terminal PC desk',
  },
  FACILITIES: {
    id: 'FACILITIES',
    name: 'Facilities & Janitorial',
    center: [-35, 0, 8.5],
    size: [12, 4.5],
    floorColor: '#334155', // Slate utilitarian
    wallColor: '#1e293b',
    accentColor: '#94a3b8',
    description: 'Sanitation carts, high-capacity water jugs, mops, laundry bins, and janitorial supplies',
  },
  CAFETERIA: {
    id: 'CAFETERIA',
    name: 'Grand Cafeteria',
    center: [-35, 0, 16],
    size: [12, 10],
    floorColor: '#9a3412', // Warm terracotta
    wallColor: '#431407',
    accentColor: '#f97316',
    description: 'Full-service cafeteria, hot meal trays, microwaves, 24 dining seats, and recycling hub',
  },
}

// Generate circular all-hands coordinates around The Brain at (0, 0, 0)
function computeCirclePositions(
  count: number,
  radius = 5.2,
  centerX = 0,
  centerZ = 0
): [number, number, number][] {
  const result: [number, number, number][] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const x = centerX + Math.sin(angle) * radius
    const z = centerZ + Math.cos(angle) * radius
    result.push([Number(x.toFixed(2)), 0, Number(z.toFixed(2))])
  }
  return result
}

const allHandsSlots = computeCirclePositions(48, 5.4, 0, 0)

// Generate structured Pantry & Canteen gathering slots around (-16, 0, 16)
const pantrySlots: [number, number, number][] = [
  // Espresso counter stools
  [-20, 0, 13.2],
  [-18.5, 0, 13.2],
  [-17, 0, 13.2],
  [-15.5, 0, 13.2],
  [-14, 0, 13.2],
  // Cafe table 1 ring
  [-19.5, 0, 16.5],
  [-18, 0, 15.2],
  [-16.5, 0, 16.5],
  [-18, 0, 17.8],
  // Cafe table 2 ring
  [-14.5, 0, 16.5],
  [-13, 0, 15.2],
  [-11.5, 0, 16.5],
  [-13, 0, 17.8],
  // Water cooler & lounge perimeter
  [-11.5, 0, 13.5],
  [-12.5, 0, 19.5],
  [-14.5, 0, 19.8],
  [-16.5, 0, 19.8],
  [-18.5, 0, 19.8],
  [-20.5, 0, 19.2],
  [-20.8, 0, 17.2],
  [-20.8, 0, 15.0],
  [-15.5, 0, 18.4],
  [-17.2, 0, 14.6],
  [-12.2, 0, 14.8],
  // Grand Cafeteria seating slots (24..47)
  [-38.9, 0, 12],
  [-37.1, 0, 12],
  [-38, 0, 11.1],
  [-38, 0, 12.9],
  [-34.9, 0, 12],
  [-33.1, 0, 12],
  [-34, 0, 11.1],
  [-34, 0, 12.9],
  [-30.9, 0, 12],
  [-29.1, 0, 12],
  [-30, 0, 11.1],
  [-30, 0, 12.9],
  [-38.9, 0, 16],
  [-37.1, 0, 16],
  [-38, 0, 15.1],
  [-38, 0, 16.9],
  [-34.9, 0, 16],
  [-33.1, 0, 16],
  [-34, 0, 15.1],
  [-34, 0, 16.9],
  [-30.9, 0, 16],
  [-29.1, 0, 16],
  [-30, 0, 15.1],
  [-30, 0, 16.9],
]

// Generate structured Rec & Gym workout slots around (0, 0, 16)
const gymSlots: [number, number, number][] = [
  // Treadmills
  [-3, 0, 14.2],
  [0, 0, 14.2],
  [3, 0, 14.2],
  // Yoga mats & stretching zone
  [3, 0, 18.5],
  [4.5, 0, 18.5],
  [1.5, 0, 18.5],
  // Dumbbell rack & weight zone
  [-5, 0, 17.5],
  [-3.5, 0, 17.5],
  [-2, 0, 17.5],
  // Workout circle / spotters
  [-4.5, 0, 15.5],
  [-1.5, 0, 15.8],
  [1.5, 0, 15.8],
  [4.5, 0, 15.8],
  [-4.5, 0, 19.8],
  [-2.5, 0, 19.8],
  [-0.5, 0, 19.8],
  [1.5, 0, 20.2],
  [3.5, 0, 20.2],
  [5.2, 0, 17.2],
  [-5.2, 0, 13.5],
  [-1.5, 0, 12.8],
  [1.5, 0, 12.8],
  [4.5, 0, 13.5],
  [0, 0, 17.2],
  // Extra fitness & warm-up positions (24..47)
  [-3.5, 0, 12.5],
  [-2.0, 0, 12.5],
  [-0.5, 0, 12.5],
  [2.0, 0, 12.5],
  [3.5, 0, 12.5],
  [-5.5, 0, 15.0],
  [-5.5, 0, 16.5],
  [-5.5, 0, 18.0],
  [5.5, 0, 14.5],
  [5.5, 0, 16.0],
  [5.5, 0, 18.5],
  [5.5, 0, 20.0],
  [-3.5, 0, 21.0],
  [-2.0, 0, 21.0],
  [-0.5, 0, 21.0],
  [1.0, 0, 21.0],
  [2.5, 0, 21.0],
  [-1.0, 0, 14.5],
  [1.0, 0, 14.5],
  [-2.0, 0, 17.0],
  [2.0, 0, 17.0],
  [-1.0, 0, 18.5],
  [1.0, 0, 18.5],
  [0, 0, 19.0],
]

// 32 Dedicated Cafeteria Dining Seats across 8 four-person tables in Grand Cafeteria
export const cafeteriaSlots: [number, number, number][] = [
  // Table 1 ([-39.5, 0, 14.2])
  [-40.35, 0, 14.2],
  [-38.65, 0, 14.2],
  [-39.5, 0, 13.35],
  [-39.5, 0, 15.05],
  // Table 2 ([-36.5, 0, 14.2])
  [-37.35, 0, 14.2],
  [-35.65, 0, 14.2],
  [-36.5, 0, 13.35],
  [-36.5, 0, 15.05],
  // Table 3 ([-33.5, 0, 14.2])
  [-34.35, 0, 14.2],
  [-32.65, 0, 14.2],
  [-33.5, 0, 13.35],
  [-33.5, 0, 15.05],
  // Table 4 ([-30.5, 0, 14.2])
  [-31.35, 0, 14.2],
  [-29.65, 0, 14.2],
  [-30.5, 0, 13.35],
  [-30.5, 0, 15.05],
  // Table 5 ([-39.5, 0, 18.6])
  [-40.35, 0, 18.6],
  [-38.65, 0, 18.6],
  [-39.5, 0, 17.75],
  [-39.5, 0, 19.45],
  // Table 6 ([-36.5, 0, 18.6])
  [-37.35, 0, 18.6],
  [-35.65, 0, 18.6],
  [-36.5, 0, 17.75],
  [-36.5, 0, 19.45],
  // Table 7 ([-33.5, 0, 18.6])
  [-34.35, 0, 18.6],
  [-32.65, 0, 18.6],
  [-33.5, 0, 17.75],
  [-33.5, 0, 19.45],
  // Table 8 ([-30.5, 0, 18.6])
  [-31.35, 0, 18.6],
  [-29.65, 0, 18.6],
  [-30.5, 0, 17.75],
  [-30.5, 0, 19.45],
]

// 32 Dedicated Individual Rest Beds & Pods in Nap Room ([-35, 0, -16])
export const napBedSlots: [number, number, number][] = [
  [-38.5, 0, -18.0], // Bed 1 approach
  [-35.5, 0, -18.0], // Bed 2 approach
  [-32.5, 0, -18.0], // Bed 3 approach
  [-30.2, 0, -18.0], // Bed 4 approach
  [-38.5, 0, -14.5], // Bunk 1 (Bed 5/6) approach
  [-35.5, 0, -14.5], // Bunk 2 (Bed 7/8) approach
  [-32.5, 0, -14.5], // Bunk 3 (Bed 9/10) approach
  [-38.5, 0, -14.0], // Bunk 4 (Bed 11/12) approach
  [-36.2, 0, -14.0], // Sleep Pod 13
  [-34.5, 0, -14.0], // Sleep Pod 14
  [-32.8, 0, -14.0], // Sleep Pod 15
  [-31.0, 0, -14.0], // Sleep Pod 16
  [-38.5, 0, -17.0], // Resting aisle slot 17
  [-35.5, 0, -17.0], // Resting aisle slot 18
  [-32.5, 0, -17.0], // Resting aisle slot 19
  [-30.2, 0, -17.0], // Resting aisle slot 20
  [-38.5, 0, -13.5], // Resting aisle slot 21
  [-35.5, 0, -13.5], // Resting aisle slot 22
  [-32.8, 0, -13.5], // Resting aisle slot 23
  [-31.0, 0, -13.5], // Resting aisle slot 24
  [-38.5, 0, -19.0],
  [-35.5, 0, -19.0],
  [-32.5, 0, -19.0],
  [-30.2, 0, -19.0],
  [-37.0, 0, -15.0],
  [-34.0, 0, -15.0],
  [-32.0, 0, -15.0],
  [-30.0, 0, -15.0],
  [-36.0, 0, -13.0],
  [-34.0, 0, -13.0],
  [-32.0, 0, -13.0],
  [-30.5, 0, -13.0],
]

export const CANTEEN_BUFFET_QUEUE_WAYPOINTS: [number, number, number][] = [
  [-31, 0, 13], // 1. Tray & utensil station
  [-33, 0, 13], // 2. Buffet queue line
  [-35, 0, 13], // 3. Hot meal serving counter (staffed by Chef Maria)
]

/**
 * 30 Database Agents Assigned to Specific 3D & 2D Workstations
 */
export const AGENT_WORKSTATIONS_3D: Record<string, AgentWorkstation3D> = {
  // 1. Engineering Core (NW Room: [-16, 0, -16])
  josiah: {
    agentId: 'josiah',
    name: 'Josiah',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-19, 0, -19],
    facing: 'SE',
    allHandsPos: allHandsSlots[0],
    pantryPos: pantrySlots[0],
    gymPos: gymSlots[0],
  },
  arwin: {
    agentId: 'arwin',
    name: 'Arwin',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-14, 0, -19],
    facing: 'SE',
    allHandsPos: allHandsSlots[1],
    pantryPos: pantrySlots[1],
    gymPos: gymSlots[1],
  },
  neil_mar: {
    agentId: 'neil_mar',
    name: 'Neil Mar',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-19, 0, -15],
    facing: 'SE',
    allHandsPos: allHandsSlots[2],
    pantryPos: pantrySlots[2],
    gymPos: gymSlots[2],
  },
  nelmar: {
    agentId: 'nelmar',
    name: 'Nelmar',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-14, 0, -15],
    facing: 'SE',
    allHandsPos: allHandsSlots[3],
    pantryPos: pantrySlots[3],
    gymPos: gymSlots[3],
  },
  christian: {
    agentId: 'christian',
    name: 'Christian',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-19, 0, -11],
    facing: 'SE',
    allHandsPos: allHandsSlots[4],
    pantryPos: pantrySlots[4],
    gymPos: gymSlots[4],
  },
  bonnie: {
    agentId: 'bonnie',
    name: 'Bonnie',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-14, 0, -11],
    facing: 'SE',
    allHandsPos: allHandsSlots[5],
    pantryPos: pantrySlots[5],
    gymPos: gymSlots[5],
  },
  john_lloyd: {
    agentId: 'john_lloyd',
    name: 'John Lloyd',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-10, 0, -15],
    facing: 'SW',
    allHandsPos: allHandsSlots[6],
    pantryPos: pantrySlots[6],
    gymPos: gymSlots[6],
  },

  // 2. Operations Hub (N Room: [0, 0, -16])
  mary_grace: {
    agentId: 'mary_grace',
    name: 'Mary Grace',
    department: 'OPERATIONS',
    room: 'Operations Hub',
    deskPos: [-3, 0, -18],
    facing: 'SE',
    allHandsPos: allHandsSlots[7],
    pantryPos: pantrySlots[7],
    gymPos: gymSlots[7],
  },
  anthony: {
    agentId: 'anthony',
    name: 'Anthony',
    department: 'OPERATIONS',
    room: 'Operations Hub',
    deskPos: [3, 0, -18],
    facing: 'SW',
    allHandsPos: allHandsSlots[8],
    pantryPos: pantrySlots[8],
    gymPos: gymSlots[8],
  },
  blaze: {
    agentId: 'blaze',
    name: 'Blaze',
    department: 'OPERATIONS',
    room: 'Operations Hub',
    deskPos: [-3, 0, -13],
    facing: 'SE',
    allHandsPos: allHandsSlots[9],
    pantryPos: pantrySlots[9],
    gymPos: gymSlots[9],
  },
  ferwin: {
    agentId: 'ferwin',
    name: 'Ferwin',
    department: 'OPERATIONS',
    room: 'Operations Hub',
    deskPos: [3, 0, -13],
    facing: 'SW',
    allHandsPos: allHandsSlots[10],
    pantryPos: pantrySlots[10],
    gymPos: gymSlots[10],
  },

  // 3. Growth Lab (NE Room: [16, 0, -16])
  jo_vincent: {
    agentId: 'jo_vincent',
    name: 'Jo Vincent',
    department: 'GROWTH',
    room: 'Growth Lab',
    deskPos: [13, 0, -18],
    facing: 'SW',
    allHandsPos: allHandsSlots[11],
    pantryPos: pantrySlots[11],
    gymPos: gymSlots[11],
  },
  jesmond: {
    agentId: 'jesmond',
    name: 'Jesmond',
    department: 'GROWTH',
    room: 'Growth Lab',
    deskPos: [18, 0, -18],
    facing: 'SW',
    allHandsPos: allHandsSlots[12],
    pantryPos: pantrySlots[12],
    gymPos: gymSlots[12],
  },
  kin: {
    agentId: 'kin',
    name: 'Kin',
    department: 'GROWTH',
    room: 'Growth Lab',
    deskPos: [15, 0, -13],
    facing: 'SW',
    allHandsPos: allHandsSlots[13],
    pantryPos: pantrySlots[13],
    gymPos: gymSlots[13],
  },

  // 4. Executive Lounge / Command Center (W Room: [-16, 0, 0] & [0, 0, 0])
  julian: {
    agentId: 'julian',
    name: 'Julian',
    department: 'COMMAND',
    room: 'Executive Lounge',
    deskPos: [-18, 0, -2],
    facing: 'SE',
    allHandsPos: allHandsSlots[14],
    pantryPos: pantrySlots[14],
    gymPos: gymSlots[14],
  },
  gloria: {
    agentId: 'gloria',
    name: 'Gloria',
    department: 'COMMAND',
    room: 'Executive Lounge',
    deskPos: [-14, 0, -2],
    facing: 'SE',
    allHandsPos: allHandsSlots[15],
    pantryPos: pantrySlots[15],
    gymPos: gymSlots[15],
  },
  jb: {
    agentId: 'jb',
    name: 'JB',
    department: 'COMMAND',
    room: 'Executive Lounge',
    deskPos: [-16, 0, 3],
    facing: 'NE',
    allHandsPos: allHandsSlots[16],
    pantryPos: pantrySlots[16],
    gymPos: gymSlots[16],
  },

  // 5. QA & SecOps NOC (E Room: [16, 0, 0])
  khent: {
    agentId: 'khent',
    name: 'Khent',
    department: 'QA & SECOPS',
    room: 'QA & SecOps NOC',
    deskPos: [14, 0, -2],
    facing: 'SW',
    allHandsPos: allHandsSlots[17],
    pantryPos: pantrySlots[17],
    gymPos: gymSlots[17],
  },
  gian: {
    agentId: 'gian',
    name: 'Gian',
    department: 'QA & SECOPS',
    room: 'QA & SecOps NOC',
    deskPos: [18, 0, -2],
    facing: 'SW',
    allHandsPos: allHandsSlots[18],
    pantryPos: pantrySlots[18],
    gymPos: gymSlots[18],
  },
  john_arvy: {
    agentId: 'john_arvy',
    name: 'John Arvy',
    department: 'QA & SECOPS',
    room: 'QA & SecOps NOC',
    deskPos: [16, 0, 3],
    facing: 'NW',
    allHandsPos: allHandsSlots[19],
    pantryPos: pantrySlots[19],
    gymPos: gymSlots[19],
  },

  // 6. Intelligence & Research Lab (SE Room: [16, 0, 16])
  roy_jhan: {
    agentId: 'roy_jhan',
    name: 'Roy Jhan',
    department: 'INTELLIGENCE',
    room: 'Intelligence Lab',
    deskPos: [13, 0, 14],
    facing: 'NW',
    allHandsPos: allHandsSlots[20],
    pantryPos: pantrySlots[20],
    gymPos: gymSlots[20],
  },
  ryan: {
    agentId: 'ryan',
    name: 'Ryan',
    department: 'INTELLIGENCE',
    room: 'Intelligence Lab',
    deskPos: [18, 0, 14],
    facing: 'NW',
    allHandsPos: allHandsSlots[21],
    pantryPos: pantrySlots[21],
    gymPos: gymSlots[21],
  },
  keiru: {
    agentId: 'keiru',
    name: 'Keiru',
    department: 'INTELLIGENCE',
    room: 'Intelligence Lab',
    deskPos: [13, 0, 18],
    facing: 'NW',
    allHandsPos: allHandsSlots[22],
    pantryPos: pantrySlots[22],
    gymPos: gymSlots[22],
  },
  gabriel: {
    agentId: 'gabriel',
    name: 'Gabriel',
    department: 'INTELLIGENCE',
    room: 'Intelligence Lab',
    deskPos: [18, 0, 18],
    facing: 'NW',
    allHandsPos: allHandsSlots[23],
    pantryPos: pantrySlots[23],
    gymPos: gymSlots[23],
  },

  // 7. Command Center ("The Brain") & Facilities (New Residents)
  boss: {
    agentId: 'boss',
    name: 'Boss',
    department: 'COMMAND',
    room: 'Command Center ("The Brain")',
    deskPos: [3.5, 0, 2.5],
    facing: 'NW',
    allHandsPos: allHandsSlots[24],
    pantryPos: pantrySlots[24],
    gymPos: gymSlots[24],
  },
  cleaner_1: {
    agentId: 'cleaner_1',
    name: 'Cleaner 1',
    department: 'FACILITIES_WELLNESS',
    room: 'Facilities & Janitorial',
    deskPos: [-33, 0, 9.0],
    facing: 'SW',
    allHandsPos: allHandsSlots[25],
    pantryPos: pantrySlots[25],
    gymPos: gymSlots[25],
  },
  cleaner_2: {
    agentId: 'cleaner_2',
    name: 'Cleaner 2',
    department: 'FACILITIES_WELLNESS',
    room: 'Facilities & Janitorial',
    deskPos: [-37, 0, 9.0],
    facing: 'SE',
    allHandsPos: allHandsSlots[26],
    pantryPos: pantrySlots[26],
    gymPos: gymSlots[26],
  },
  server_admin: {
    agentId: 'server_admin',
    name: 'Rex',
    department: 'ENGINEERING',
    room: 'Server Room',
    deskPos: [-32.5, 0, 3.8],
    facing: 'NW',
    allHandsPos: allHandsSlots[27],
    pantryPos: pantrySlots[27],
    gymPos: gymSlots[27],
  },
  chef_maria: {
    agentId: 'chef_maria',
    name: 'Chef Maria',
    department: 'FACILITIES_WELLNESS',
    room: 'Grand Cafeteria',
    deskPos: [-35, 0, 12.2],
    facing: 'SE',
    allHandsPos: allHandsSlots[28],
    pantryPos: [-35, 0, 12.2],
    gymPos: gymSlots[28],
    cafeteriaPos: [-35, 0, 12.2],
    napBedPos: napBedSlots[28],
  },
  barista_ken: {
    agentId: 'barista_ken',
    name: 'Barista Ken',
    department: 'FACILITIES_WELLNESS',
    room: 'Pantry & Canteen',
    deskPos: [-16, 0, 13.5],
    facing: 'SE',
    allHandsPos: allHandsSlots[29],
    pantryPos: [-16, 0, 13.5],
    gymPos: gymSlots[29],
    cafeteriaPos: cafeteriaSlots[29],
    napBedPos: napBedSlots[29],
  },
  coach_miguel: {
    agentId: 'coach_miguel',
    name: 'Coach Miguel',
    department: 'FACILITIES_WELLNESS',
    room: 'Rec & Gym',
    deskPos: [0, 0, 16.5],
    facing: 'SW',
    allHandsPos: allHandsSlots[30],
    pantryPos: pantrySlots[30],
    gymPos: [0, 0, 16.5],
    cafeteriaPos: cafeteriaSlots[30],
    napBedPos: napBedSlots[30],
  },
}

export type DepartmentMode =
  | 'OVERVIEW'
  | 'FOCUS_WORK'
  | 'ALL_HANDS'
  | 'PANTRY'
  | 'GYM'
  | 'WELLNESS'
  | 'CAFETERIA'
  | 'NAP_ROOM'
  | 'COMFORT_ROOM'
  | 'MENS_CR'
  | 'WOMENS_CR'
  | 'SERVER_ROOM'

export interface CameraPreset {
  target: [number, number, number]
  zoom: number
}

export const CAMERA_PRESETS: Record<DepartmentMode, CameraPreset> = {
  OVERVIEW: {
    target: [-7.5, 0, 0],
    zoom: 11.5,
  },
  FOCUS_WORK: {
    target: [-8, 0, -14],
    zoom: 32,
  },
  ALL_HANDS: {
    target: [0, 0, 0],
    zoom: 36,
  },
  PANTRY: {
    target: [-16, 0, 16],
    zoom: 32,
  },
  GYM: {
    target: [0, 0, 16],
    zoom: 32,
  },
  WELLNESS: {
    target: [-34, 0, 0],
    zoom: 22,
  },
  CAFETERIA: {
    target: [-35, 0, 16],
    zoom: 30,
  },
  NAP_ROOM: {
    target: [-35, 0, -16],
    zoom: 30,
  },
  COMFORT_ROOM: {
    target: [-35, 0, -5],
    zoom: 32,
  },
  MENS_CR: {
    target: [-35, 0, -8],
    zoom: 32,
  },
  WOMENS_CR: {
    target: [-35, 0, -2],
    zoom: 32,
  },
  SERVER_ROOM: {
    target: [-38, 0, 4.2],
    zoom: 25,
  },
}

export interface ParkedVehicleConfig {
  id: string
  pos: [number, number, number]
  rotY: number
  color: string
  type: 'sedan' | 'suv' | 'scooter'
}

export const PARKED_VEHICLES: ParkedVehicleConfig[] = [
  { id: 'park-1', pos: [26.8, 0, -17], rotY: Math.PI / 2, color: '#ef4444', type: 'sedan' },
  { id: 'park-2', pos: [26.8, 0, -12], rotY: Math.PI / 2, color: '#3b82f6', type: 'suv' },
  { id: 'park-3', pos: [26.8, 0, -7], rotY: Math.PI / 2, color: '#10b981', type: 'sedan' },
  { id: 'park-4', pos: [26.8, 0, -2], rotY: Math.PI / 2, color: '#f59e0b', type: 'scooter' },
  { id: 'park-5', pos: [26.8, 0, 3], rotY: Math.PI / 2, color: '#8b5cf6', type: 'sedan' },
  { id: 'park-6', pos: [26.8, 0, 8], rotY: Math.PI / 2, color: '#06b6d4', type: 'suv' },
]

export interface HighwayCarConfig {
  id: string
  axis: 'x' | 'z'
  laneCoord: number // fixed Z for 'x' axis, fixed X for 'z' axis
  dir: 1 | -1
  speed: number
  initialOffset: number
  color: string
  range: [number, number]
}

export const HIGHWAY_CARS: HighwayCarConfig[] = [
  // South Highway (Dual-lane along Z = 28.5 and Z = 31.5)
  {
    id: 'hwy-car-1',
    axis: 'x',
    laneCoord: 28.2,
    dir: 1,
    speed: 9.5,
    initialOffset: -24,
    color: '#38bdf8',
    range: [-36, 36],
  },
  {
    id: 'hwy-car-2',
    axis: 'x',
    laneCoord: 28.2,
    dir: 1,
    speed: 9.5,
    initialOffset: 10,
    color: '#f43f5e',
    range: [-36, 36],
  },
  {
    id: 'hwy-car-3',
    axis: 'x',
    laneCoord: 31.4,
    dir: -1,
    speed: 8.2,
    initialOffset: 22,
    color: '#f59e0b',
    range: [-36, 36],
  },
  {
    id: 'hwy-car-4',
    axis: 'x',
    laneCoord: 31.4,
    dir: -1,
    speed: 8.2,
    initialOffset: -12,
    color: '#a855f7',
    range: [-36, 36],
  },
  // East Avenue (Dual-lane along X = 32.5)
  {
    id: 'hwy-car-5',
    axis: 'z',
    laneCoord: 32.5,
    dir: 1,
    speed: 7.8,
    initialOffset: -20,
    color: '#10b981',
    range: [-34, 25],
  },
  {
    id: 'hwy-car-6',
    axis: 'z',
    laneCoord: 35.2,
    dir: -1,
    speed: 8.6,
    initialOffset: 15,
    color: '#e2e8f0',
    range: [-34, 25],
  },
]

export const STREETLIGHT_POSITIONS: [number, number, number][] = [
  [-20, 0, 25.4],
  [-8, 0, 25.4],
  [8, 0, 25.4],
  [20, 0, 25.4],
  [25.4, 0, -18],
  [25.4, 0, -6],
  [25.4, 0, 6],
  [25.4, 0, 18],
]

/**
 * Helper to resolve an agent's active 3D/2D world coordinate for any DepartmentMode
 * or individual agent route override.
 */
export function getAgentTargetPosition(
  ws: AgentWorkstation3D,
  globalMode: DepartmentMode,
  overrideMode?: DepartmentMode
): [number, number, number] {
  const effectiveMode = overrideMode || globalMode
  switch (effectiveMode) {
    case 'ALL_HANDS':
      return ws.allHandsPos
    case 'PANTRY':
      return ws.pantryPos
    case 'CAFETERIA': {
      if (ws.cafeteriaPos) return ws.cafeteriaPos
      const agentKeys = Object.keys(AGENT_WORKSTATIONS_3D)
      const idx = agentKeys.indexOf(ws.agentId)
      const safeIdx = idx >= 0 ? idx : 0
      return cafeteriaSlots[safeIdx % cafeteriaSlots.length]
    }
    case 'GYM':
      return ws.gymPos
    case 'NAP_ROOM': {
      if (ws.napBedPos) return ws.napBedPos
      const agentKeys = Object.keys(AGENT_WORKSTATIONS_3D)
      const idx = agentKeys.indexOf(ws.agentId)
      const safeIdx = idx >= 0 ? idx : 0
      return napBedSlots[safeIdx % napBedSlots.length]
    }
    case 'MENS_CR':
      return [-35, 0, -8]
    case 'WOMENS_CR':
      return [-35, 0, -2]
    case 'COMFORT_ROOM': {
      const isFemale =
        ws.agentId === 'cleaner_2' ||
        ws.agentId === 'mary_grace' ||
        ws.agentId === 'gloria' ||
        ws.agentId === 'bonnie' ||
        ws.agentId === 'chef_maria'
      return isFemale ? [-35, 0, -2] : [-35, 0, -8]
    }
    case 'SERVER_ROOM':
      return [-35, 0, 3.5]
    case 'WELLNESS':
      return [-34, 0, 0]
    case 'FOCUS_WORK':
    case 'OVERVIEW':
    default:
      return ws.deskPos
  }
}

/**
 * Isometric mathematical projection matching Three.js OrthographicCamera at [50, 42, 50]
 * Maps world (x, y, z) -> 2D screen (px, py)
 */
export function projectIso3DTo2D(
  x: number,
  y: number,
  z: number,
  targetX: number,
  targetZ: number,
  zoom: number,
  canvasWidth: number,
  canvasHeight: number
): { px: number; py: number; depth: number } {
  const dx = x - targetX
  const dz = z - targetZ
  // Azimuth 45 deg: cos(45) = 0.70710678
  // Elevation ~35.264 deg: sin(35.264) = 0.57735, cos(35.264) = 0.816496
  const isoX = (dx - dz) * 0.70710678
  const isoY = (dx + dz) * 0.40824829 - y * 0.81649658
  return {
    px: canvasWidth * 0.5 + isoX * zoom,
    py: canvasHeight * 0.5 + isoY * zoom,
    depth: x + z + y * 0.5,
  }
}

export const BOSS_PATROL_ROUTE: [number, number, number][] = [
  [0, 0, 0], // The Brain (Command Center)
  [-16, 0, -16], // Engineering Core
  [16, 0, -16], // Operations Hub
  [16, 0, 16], // Growth Lab
  [-16, 0, 16], // SecOps & Intelligence
  [3.5, 0, 2.5], // Executive Stand
]

export const CLEANER_1_PATROL_ROUTE: [number, number, number][] = [
  [-35, 0, 9.0], // Facilities Room
  [-35, 0, 16], // Grand Cafeteria
  [-35, 0, -8], // Men's CR
  [-35, 0, -2], // Women's CR
  [-35, 0, -16], // Nap Room
  [-29, 0, 0], // Main Corridor Connector
]

export const CLEANER_2_PATROL_ROUTE: [number, number, number][] = [
  [-35, 0, 9.0], // Facilities Room
  [0, 0, 16], // Gym & Rec
  [-16, 0, 16], // SecOps & Intelligence
  [-36, 0, 4.2], // Expanded Server Room
  [16, 0, -16], // Operations Hub
  [0, 0, 0], // Center Concourse
]

export const SERVER_ADMIN_PATROL_ROUTE: [number, number, number][] = [
  [-32.5, 0, 3.8], // Workstation PC Desk
  [-37.5, 0, 3.5], // North Rack Aisle East
  [-43.5, 0, 3.5], // North Rack Aisle West
  [-43.5, 0, 5.0], // South Rack Aisle West
  [-37.5, 0, 5.0], // South Rack Aisle East
]

export const COACH_MIGUEL_PATROL_ROUTE: [number, number, number][] = [
  [0, 0, 16.5], // Coach station
  [-3.5, 0, 14.5], // Treadmill coaching line
  [3.5, 0, 14.5], // Free weights & dumbbell area
  [0, 0, 19.0], // Floor mat conditioning area
]


