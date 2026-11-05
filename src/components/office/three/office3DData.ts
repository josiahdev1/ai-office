/**
 * 3D Isometric Office Coordinates, Room Topology, and Workstation Layouts
 * EasyUp Software Solution HQ (Iloilo City)
 * Preserves all 24 registered database agents.
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
  pantryPos?: [number, number, number]
  gymPos?: [number, number, number]
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
}

// Generate circular all-hands coordinates around The Brain at (0, 0, 0)
function computeCirclePositions(count: number, radius = 5.2): [number, number, number][] {
  const result: [number, number, number][] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const x = Math.sin(angle) * radius
    const z = Math.cos(angle) * radius
    result.push([Number(x.toFixed(2)), 0, Number(z.toFixed(2))])
  }
  return result
}

const allHandsSlots = computeCirclePositions(24, 5.2)

/**
 * 24 Database Agents Assigned to Specific 3D Workstations
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
    pantryPos: [-18, 0, 14],
    gymPos: [-2, 0, 15],
  },
  arwin: {
    agentId: 'arwin',
    name: 'Arwin',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-14, 0, -19],
    facing: 'SE',
    allHandsPos: allHandsSlots[1],
    pantryPos: [-14, 0, 14],
  },
  neil_mar: {
    agentId: 'neil_mar',
    name: 'Neil Mar',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-19, 0, -15],
    facing: 'SE',
    allHandsPos: allHandsSlots[2],
    pantryPos: [-18, 0, 17],
  },
  nelmar: {
    agentId: 'nelmar',
    name: 'Nelmar',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-14, 0, -15],
    facing: 'SE',
    allHandsPos: allHandsSlots[3],
    pantryPos: [-14, 0, 17],
  },
  christian: {
    agentId: 'christian',
    name: 'Christian',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-19, 0, -11],
    facing: 'SE',
    allHandsPos: allHandsSlots[4],
    gymPos: [2, 0, 15],
  },
  bonnie: {
    agentId: 'bonnie',
    name: 'Bonnie',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-14, 0, -11],
    facing: 'SE',
    allHandsPos: allHandsSlots[5],
    gymPos: [-3, 0, 17],
  },
  john_lloyd: {
    agentId: 'john_lloyd',
    name: 'John Lloyd',
    department: 'ENGINEERING',
    room: 'Engineering Core',
    deskPos: [-10, 0, -15],
    facing: 'SW',
    allHandsPos: allHandsSlots[6],
    pantryPos: [-16, 0, 15],
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
    pantryPos: [-13, 0, 18],
  },
  anthony: {
    agentId: 'anthony',
    name: 'Anthony',
    department: 'OPERATIONS',
    room: 'Operations Hub',
    deskPos: [3, 0, -18],
    facing: 'SW',
    allHandsPos: allHandsSlots[8],
    gymPos: [0, 0, 18],
  },
  blaze: {
    agentId: 'blaze',
    name: 'Blaze',
    department: 'OPERATIONS',
    room: 'Operations Hub',
    deskPos: [-3, 0, -13],
    facing: 'SE',
    allHandsPos: allHandsSlots[9],
    pantryPos: [-17, 0, 18],
  },
  ferwin: {
    agentId: 'ferwin',
    name: 'Ferwin',
    department: 'OPERATIONS',
    room: 'Operations Hub',
    deskPos: [3, 0, -13],
    facing: 'SW',
    allHandsPos: allHandsSlots[10],
    gymPos: [3, 0, 17],
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
    pantryPos: [-15, 0, 14],
  },
  jesmond: {
    agentId: 'jesmond',
    name: 'Jesmond',
    department: 'GROWTH',
    room: 'Growth Lab',
    deskPos: [18, 0, -18],
    facing: 'SW',
    allHandsPos: allHandsSlots[12],
    pantryPos: [-15, 0, 17],
  },
  kin: {
    agentId: 'kin',
    name: 'Kin',
    department: 'GROWTH',
    room: 'Growth Lab',
    deskPos: [15, 0, -13],
    facing: 'SW',
    allHandsPos: allHandsSlots[13],
    gymPos: [-1, 0, 14],
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
    pantryPos: [-14, 0, 15],
  },
  gloria: {
    agentId: 'gloria',
    name: 'Gloria',
    department: 'COMMAND',
    room: 'Executive Lounge',
    deskPos: [-14, 0, -2],
    facing: 'SE',
    allHandsPos: allHandsSlots[15],
    pantryPos: [-18, 0, 15],
  },
  jb: {
    agentId: 'jb',
    name: 'JB',
    department: 'COMMAND',
    room: 'Executive Lounge',
    deskPos: [-16, 0, 3],
    facing: 'NE',
    allHandsPos: allHandsSlots[16],
    gymPos: [1, 0, 14],
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
    gymPos: [-3, 0, 15],
  },
  gian: {
    agentId: 'gian',
    name: 'Gian',
    department: 'QA & SECOPS',
    room: 'QA & SecOps NOC',
    deskPos: [18, 0, -2],
    facing: 'SW',
    allHandsPos: allHandsSlots[18],
    pantryPos: [-16, 0, 18],
  },
  john_arvy: {
    agentId: 'john_arvy',
    name: 'John Arvy',
    department: 'QA & SECOPS',
    room: 'QA & SecOps NOC',
    deskPos: [16, 0, 3],
    facing: 'NW',
    allHandsPos: allHandsSlots[19],
    gymPos: [2, 0, 18],
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
    pantryPos: [-13, 0, 15],
  },
  ryan: {
    agentId: 'ryan',
    name: 'Ryan',
    department: 'INTELLIGENCE',
    room: 'Intelligence Lab',
    deskPos: [18, 0, 14],
    facing: 'NW',
    allHandsPos: allHandsSlots[21],
    gymPos: [3, 0, 15],
  },
  keiru: {
    agentId: 'keiru',
    name: 'Keiru',
    department: 'INTELLIGENCE',
    room: 'Intelligence Lab',
    deskPos: [13, 0, 18],
    facing: 'NW',
    allHandsPos: allHandsSlots[22],
    pantryPos: [-17, 0, 14],
  },
  gabriel: {
    agentId: 'gabriel',
    name: 'Gabriel',
    department: 'INTELLIGENCE',
    room: 'Intelligence Lab',
    deskPos: [18, 0, 18],
    facing: 'NW',
    allHandsPos: allHandsSlots[23],
    gymPos: [-1, 0, 17],
  },
}

export type DepartmentMode =
  | 'OVERVIEW'
  | 'FOCUS_WORK'
  | 'ALL_HANDS'
  | 'PANTRY'
  | 'GYM'

export interface CameraPreset {
  target: [number, number, number]
  zoom: number
}

export const CAMERA_PRESETS: Record<DepartmentMode, CameraPreset> = {
  OVERVIEW: {
    target: [0, 0, 0],
    zoom: 20,
  },
  FOCUS_WORK: {
    target: [-8, 0, -14],
    zoom: 34,
  },
  ALL_HANDS: {
    target: [0, 0, 0],
    zoom: 38,
  },
  PANTRY: {
    target: [-16, 0, 16],
    zoom: 34,
  },
  GYM: {
    target: [0, 0, 16],
    zoom: 34,
  },
}
