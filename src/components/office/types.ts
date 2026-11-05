export type FacingDirection = 'SE' | 'SW' | 'NE' | 'NW'

export type AgentPose =
  | 'stand'
  | 'walk'
  | 'sit'
  | 'type'
  | 'drink_coffee'
  | 'eat'
  | 'gym'
  | 'gesture'

export type AgentStatus =
  | 'active'
  | 'working'
  | 'idle'
  | 'awaiting_approval'
  | 'done'
  | 'on_break'
  | 'in_meeting'
  | 'gym'
  | 'at_gym'


export type AgentSubState =
  | 'typing'
  | 'reading_logs'
  | 'seated'
  | 'standing_up'
  | 'standing'
  | 'documenting'
  | 'analyzing'
  | 'hologram_review'
  | 'coffee_break'
  | 'walking'

export interface Agent {
  id: string
  name: string
  avatar?: string
  role: string
  room: string
  department?: string
  tag?: string
  status: AgentStatus
  sub_state?: AgentSubState
  current_task?: string
  current_file?: string
  terminal_preview?: string
  progress_pct?: number
  last_action?: string
  updated_at: string
  color?: string
  hair?: string
  skin?: string
  desk_id?: string
  desk_coord?: { x: number; y: number }
  current_coord?: { x: number; y: number }
  target_coord?: { x: number; y: number }
  kind?: 'resident' | 'external'
  cli?: 'claude-code' | 'antigravity' | 'codex' | 'opencode' | 'cursor' | 'other'
  session_id?: string
  cwd_hash?: string
  current_tool?: string
  tokens_used?: number
  tool_call_count?: number
  session_started_at?: string
  car_style?: CarStyle
  car_color?: string
  bay?: number
  accessories?: string[]
}

export type CarStyle = 'sedan' | 'hatchback' | 'suv' | 'pickup' | 'van' | 'truck' | 'bus'

export interface VehicleState {
  id: string
  style: CarStyle
  color: string
  facing: FacingDirection
  x: number
  y: number
  speed: number
  targetNodeId?: string
  isParked: boolean
  bayId?: string
  headlightsOn: boolean
  brakeLightsOn: boolean
  blinkerOn: boolean
  isWaitingPedestrian: boolean
  assignedAgentId?: string
  idleWaitFrames: number
}

export interface ActivityCounterStats {
  working: number
  eating: number
  gym: number
  meeting: number
  break: number
  arriving: number
  waiting_on_you: number
  open_tasks: number
  accessories: number
}

export interface OfficeTask {
  id: string
  title: string
  description?: string
  assigned_to?: string
  department: string
  status: 'queued' | 'working' | 'needs_approval' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  progress?: number
  created_at?: string
  updated_at?: string
}

export interface Approval {
  id: string
  agent_id: string
  agent_name: string
  room?: string
  type: string
  title: string
  summary: string
  created_at: string
  status?: 'pending' | 'approved' | 'rejected'
}

export interface OfficeData {
  company_name: string
  playback_speed: string
  agents: Agent[]
  approvals: Approval[]
  logs: string[]
  dbConnected?: boolean
  dbError?: string | null
  tableCounts?: Record<string, number>
}
