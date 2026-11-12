/**
 * Single Adapter File: Database <-> Application Type Mapper
 * 
 * All mappings between live Supabase tables (`office_agents`, `office_approvals`,
 * `office_logs`, `office_messages`, `office_tasks`, `office_goals`, `office_settings`)
 * and application domain models pass strictly through this file.
 */

import { Agent, AgentStatus, AgentSubState, Approval } from '@/components/office/types'

// =============================================================================
// 1. Database Row Schemas (reflecting exact live Supabase tables)
// =============================================================================

export interface OfficeAgentRow {
  id: string
  name: string
  role: string
  department: string
  desk_x: number
  desk_y: number
  current_x: number
  current_y: number
  target_x?: number | null
  target_y?: number | null
  status: string
  current_task: string | null
  current_room: string | null
  model: string | null
  color: string | null
  sub_state?: string | null
  progress?: number | null
  seat_id?: string | null
  facing?: string | null
  avatar?: string | null
  appearance?: Record<string, unknown> | null
  last_active_at?: string | null
  updated_at?: string | null
  kind?: 'resident' | 'external' | null
  cli?: string | null
  session_id?: string | null
  cwd_hash?: string | null
  current_tool?: string | null
  tokens_used?: number | null
  tool_call_count?: number | null
  car_style?: string | null
  car_color?: string | null
  bay?: number | null
  accessories?: string[] | null
}

export interface OfficeSessionRow {
  id: string
  kind: 'resident' | 'external'
  cli: 'claude-code' | 'antigravity' | 'codex' | 'opencode' | 'cursor' | 'other'
  session_id: string
  cwd_hash: string | null
  status: string
  current_tool: string | null
  tokens_used: number
  tool_call_count: number
  started_at: string
  last_seen_at: string
  ended_at: string | null
  created_at?: string
}

export interface OfficeApprovalRow {
  id: string
  title: string
  description: string
  category: string
  requested_by: string
  status: string | null
  impact_level: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export interface OfficeLogRow {
  id: string
  agent_id: string | null
  agent_name: string | null
  level: string | null
  category: string
  message: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface OfficeMessageRow {
  id: string
  sender_id: string
  sender_name: string
  sender_department: string
  recipient_id: string | null
  recipient_name: string | null
  channel: string | null
  content: string
  message_type: string | null
  created_at: string
}

export interface OfficeTaskRow {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  department: string
  status: string
  priority: string | null
  progress: number | null
  created_at: string
  updated_at: string
}

export interface OfficeGoalRow {
  id: string
  department: string
  title: string
  target_kpi: string | null
  progress: number | null
  status: string | null
  created_at: string
  updated_at: string
}

export interface OfficeSettingsRow {
  id: string
  mode: string
  sound_enabled: boolean | null
  speed: number | null
  theme: string | null
  layout: string | null
  updated_at: string
}

// =============================================================================
// 2. Department & Room Name Converters
// =============================================================================

export function departmentToRoom(dept: string): string {
  const normalized = (dept || '').toUpperCase().trim()
  switch (normalized) {
    case 'ENGINEERING':
      return 'Engineering Core'
    case 'QA & SECOPS':
    case 'QA':
    case 'SECOPS':
      return 'QA & SecOps NOC'
    case 'GROWTH':
      return 'Growth Lab'
    case 'INTELLIGENCE':
    case 'AI':
      return 'Intelligence Lab'
    case 'OPERATIONS':
      return 'Operations Hub'
    case 'COMMAND':
    case 'EXECUTIVE':
      return 'Command Center'
    case 'FACILITIES':
    case 'FACILITIES_WELLNESS':
      return 'Facilities & Janitorial'
    case 'SERVER':
    case 'INFRASTRUCTURE':
      return 'Server Room'
    default:
      return 'Engineering Core'
  }
}

export function roomToDepartment(room: string): string {
  const normalized = (room || '').toLowerCase().trim()
  if (normalized.includes('facil') || normalized.includes('janitor')) return 'FACILITIES_WELLNESS'
  if (normalized.includes('server') || normalized.includes('infrastructure')) return 'ENGINEERING'
  if (normalized.includes('eng')) return 'ENGINEERING'
  if (normalized.includes('qa') || normalized.includes('secops') || normalized.includes('noc')) return 'QA & SECOPS'
  if (normalized.includes('growth')) return 'GROWTH'
  if (normalized.includes('intel') || normalized.includes('ai')) return 'INTELLIGENCE'
  if (normalized.includes('ops') || normalized.includes('operat')) return 'OPERATIONS'
  if (normalized.includes('command') || normalized.includes('exec')) return 'COMMAND'
  return 'ENGINEERING'
}

export const DEFAULT_SERVER_ADMIN_AGENT: OfficeAgentRow = {
  id: 'server_admin',
  name: 'Rex',
  role: 'Systems & Infrastructure Admin',
  department: 'ENGINEERING',
  desk_x: 1,
  desk_y: 3,
  current_x: 1,
  current_y: 3,
  status: 'active',
  current_task: 'Monitoring rack telemetry, cooling loops, and cluster health',
  current_room: 'Server Room',
  model: 'gemini-2.0-flash',
  color: '#4f46e5',
  kind: 'resident',
  sub_state: 'typing',
  progress: 95,
}

export const DEFAULT_CHEF_MARIA_AGENT: OfficeAgentRow = {
  id: 'chef_maria',
  name: 'Chef Maria',
  role: 'Executive Head Chef & Culinary Lead',
  department: 'FACILITIES_WELLNESS',
  desk_x: 2,
  desk_y: 28,
  current_x: 2,
  current_y: 28,
  status: 'active',
  current_task: 'Preparing farm-to-table organic hot buffet and supervising serving lines',
  current_room: 'Grand Cafeteria',
  model: 'gemini-2.0-flash',
  color: '#f59e0b',
  kind: 'resident',
  sub_state: 'working',
  progress: 90,
}

export const DEFAULT_BARISTA_KEN_AGENT: OfficeAgentRow = {
  id: 'barista_ken',
  name: 'Barista Ken',
  role: 'Master Barista & Beverage Specialist',
  department: 'FACILITIES_WELLNESS',
  desk_x: 12,
  desk_y: 28,
  current_x: 12,
  current_y: 28,
  status: 'active',
  current_task: 'Crafting artisan espresso beverages and cold brew for engineering teams',
  current_room: 'Pantry & Canteen',
  model: 'gemini-2.0-flash',
  color: '#d97706',
  kind: 'resident',
  sub_state: 'working',
  progress: 88,
}

export const DEFAULT_COACH_MIGUEL_AGENT: OfficeAgentRow = {
  id: 'coach_miguel',
  name: 'Coach Miguel',
  role: 'Head Athletic Trainer & Ergonomics Coach',
  department: 'FACILITIES_WELLNESS',
  desk_x: 20,
  desk_y: 28,
  current_x: 20,
  current_y: 28,
  status: 'active',
  current_task: 'Leading functional conditioning circuits, treadmill runs, and desk ergonomics',
  current_room: 'Rec & Gym',
  model: 'gemini-2.0-flash',
  color: '#ef4444',
  kind: 'resident',
  sub_state: 'working',
  progress: 92,
}

// =============================================================================
// 3. Status Converters
// =============================================================================

export function mapDbStatusToAgentStatus(dbStatus: string): AgentStatus {
  const s = (dbStatus || '').toLowerCase()
  if (s === 'coding' || s === 'working' || s === 'busy') return 'working'
  if (s === 'in_meeting' || s === 'meeting') return 'in_meeting'
  if (s === 'on_break' || s === 'break' || s === 'pantry') return 'on_break'
  if (s === 'at_gym' || s === 'gym' || s === 'rec') return 'at_gym'
  if (s === 'active') return 'active'
  if (s === 'awaiting_approval' || s === 'blocked') return 'awaiting_approval'
  if (s === 'done' || s === 'completed') return 'done'
  return 'idle'
}

export function mapAgentStatusToDbStatus(status: AgentStatus): string {
  switch (status) {
    case 'working':
      return 'coding'
    case 'in_meeting':
      return 'in_meeting'
    case 'on_break':
      return 'on_break'
    case 'gym':
    case 'at_gym':
      return 'at_gym'
    case 'active':
      return 'active'
    case 'awaiting_approval':
      return 'awaiting_approval'
    case 'done':
      return 'done'
    case 'idle':
    default:
      return 'idle'
  }
}

// =============================================================================
// 4. Mappers: Database Rows <-> Application Domain Models
// =============================================================================

/**
 * Transforms an office_agents database row into an application Agent object
 */
export function dbRowToAgent(row: OfficeAgentRow): Agent {
  const room = row.current_room || departmentToRoom(row.department)
  const status = mapDbStatusToAgentStatus(row.status)
  
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar || undefined,
    role: row.role,
    room,
    department: row.department,
    tag: row.department,
    status,
    sub_state: (row.sub_state as AgentSubState) || (status === 'working' ? 'typing' : 'seated'),
    current_task: row.current_task || undefined,
    progress_pct: row.progress ?? (status === 'working' ? 65 : 0),
    desk_id: row.seat_id || `desk-${row.id}`,
    desk_coord: { x: row.desk_x, y: row.desk_y },
    current_coord:
      typeof row.current_x === 'number' && typeof row.current_y === 'number'
        ? { x: row.current_x, y: row.current_y }
        : undefined,
    target_coord:
      typeof row.target_x === 'number' && typeof row.target_y === 'number'
        ? { x: row.target_x, y: row.target_y }
        : undefined,
    color: row.color || '#3b82f6',
    updated_at: row.updated_at || new Date().toISOString(),
    kind: (row.kind as 'resident' | 'external') || 'resident',
    cli: (row.cli as Agent['cli']) || undefined,
    session_id: row.session_id || undefined,
    cwd_hash: row.cwd_hash || undefined,
    current_tool: row.current_tool || undefined,
    tokens_used: row.tokens_used ?? 0,
    tool_call_count: row.tool_call_count ?? 0,
    car_style: (row.car_style as Agent['car_style']) || undefined,
    car_color: row.car_color || undefined,
    bay: row.bay ?? undefined,
    accessories: Array.isArray(row.accessories) ? row.accessories : undefined,
    model:
      row.model && !row.model.startsWith('claude') && row.model !== 'gpt-4o'
        ? row.model
        : 'gemini-2.0-flash',
  }
}

/**
 * Maps an office_sessions database row into an application guest Agent object
 */
export function sessionRowToGuestAgent(
  session: OfficeSessionRow,
  assignedGuestDesk?: { deskGx: number; deskGy: number; chairGx: number; chairGy: number; id: string }
): Agent {
  const cliName =
    session.cli === 'claude-code'
      ? 'Claude Code'
      : session.cli === 'antigravity'
        ? 'Antigravity CLI'
        : session.cli === 'codex'
          ? 'Codex CLI'
          : session.cli

  const cliBadge =
    session.cli === 'claude-code'
      ? 'cc'
      : session.cli === 'antigravity'
        ? 'ag'
        : session.cli === 'codex'
          ? 'cx'
          : 'guest'

  const desk = assignedGuestDesk || {
    id: `guest-${session.session_id.slice(0, 6)}`,
    deskGx: 6,
    deskGy: 10,
    chairGx: 7,
    chairGy: 10,
  }

  const status = mapDbStatusToAgentStatus(session.status)
  let subState: AgentSubState = 'seated'
  if (session.status === 'working' || session.status === 'coding') {
    subState = 'typing'
  } else if (session.status === 'waiting_approval' || session.status === 'awaiting_approval') {
    subState = 'reading_logs'
  }

  return {
    id: `ext_${session.cli}_${session.session_id}`,
    name: `${cliName} (${session.session_id.slice(0, 6)})`,
    role: `Live ${cliName} Session`,
    room: 'Guest Workstations',
    tag: cliBadge.toUpperCase(),
    status,
    sub_state: subState,
    current_task: session.current_tool ? `Executing ${session.current_tool}` : 'Connected via Bridge',
    desk_id: desk.id,
    desk_coord: { x: desk.deskGx, y: desk.deskGy },
    color: session.cli === 'claude-code' ? '#f97316' : session.cli === 'antigravity' ? '#38bdf8' : '#10b981',
    updated_at: session.last_seen_at || session.started_at,
    kind: 'external',
    cli: session.cli,
    session_id: session.session_id,
    cwd_hash: session.cwd_hash || undefined,
    current_tool: session.current_tool || undefined,
    tokens_used: session.tokens_used,
    tool_call_count: session.tool_call_count,
    session_started_at: session.started_at,
  }
}

/**
 * Transforms an application Agent (or partial) into an office_agents database row
 */
export function agentToDbRow(agent: Partial<Agent>): Partial<OfficeAgentRow> {
  const row: Partial<OfficeAgentRow> = {}

  if (agent.id !== undefined) row.id = agent.id
  if (agent.name !== undefined) row.name = agent.name
  if (agent.role !== undefined) row.role = agent.role
  if (agent.room !== undefined) {
    row.current_room = agent.room
    const r = agent.room.toLowerCase()
    if (!r.includes('gym') && !r.includes('pantry') && !r.includes('canteen') && !r.includes('brain')) {
      row.department = roomToDepartment(agent.room)
    }
  }
  if (agent.tag !== undefined) row.department = agent.tag
  if (agent.desk_coord !== undefined) {
    row.desk_x = Math.round(agent.desk_coord.x)
    row.desk_y = Math.round(agent.desk_coord.y)
  }
  if (agent.current_coord !== undefined) {
    row.current_x = Math.round(agent.current_coord.x)
    row.current_y = Math.round(agent.current_coord.y)
  }
  if (agent.target_coord !== undefined) {
    row.target_x = agent.target_coord.x
    row.target_y = agent.target_coord.y
  }
  if (agent.status !== undefined) {
    row.status = mapAgentStatusToDbStatus(agent.status)
  }
  if (agent.current_task !== undefined) row.current_task = agent.current_task
  if (agent.color !== undefined) row.color = agent.color
  if (agent.sub_state !== undefined) row.sub_state = agent.sub_state
  if (agent.progress_pct !== undefined) row.progress = agent.progress_pct
  if (agent.desk_id !== undefined) row.seat_id = agent.desk_id
  if (agent.avatar !== undefined) row.avatar = agent.avatar
  if (agent.kind !== undefined) row.kind = agent.kind
  if (agent.cli !== undefined) row.cli = agent.cli
  if (agent.session_id !== undefined) row.session_id = agent.session_id
  if (agent.cwd_hash !== undefined) row.cwd_hash = agent.cwd_hash
  if (agent.current_tool !== undefined) row.current_tool = agent.current_tool
  if (agent.tokens_used !== undefined) row.tokens_used = agent.tokens_used
  if (agent.tool_call_count !== undefined) row.tool_call_count = agent.tool_call_count
  if (agent.car_style !== undefined) row.car_style = agent.car_style
  if (agent.car_color !== undefined) row.car_color = agent.car_color
  if (agent.bay !== undefined) row.bay = agent.bay
  if (agent.accessories !== undefined) row.accessories = agent.accessories
  if (agent.model !== undefined) row.model = agent.model
  
  row.updated_at = new Date().toISOString()
  return row
}

/**
 * Transforms an office_approvals database row into an application Approval object
 */
export function dbRowToApproval(row: OfficeApprovalRow): Approval {
  return {
    id: row.id,
    agent_id: row.requested_by.toLowerCase().replace(/\s+/g, '_'),
    agent_name: row.requested_by,
    room: 'Engineering Core',
    type: row.category,
    title: row.title,
    summary: row.description,
    status: (row.status as 'pending' | 'approved' | 'rejected') || 'pending',
    created_at: row.created_at,
  }
}

/**
 * Transforms an application Approval into an office_approvals database row
 */
export function approvalToDbRow(approval: Partial<Approval> & { impact_level?: string }): Partial<OfficeApprovalRow> {
  const row: Partial<OfficeApprovalRow> = {}

  if (approval.id !== undefined) row.id = approval.id
  if (approval.title !== undefined) row.title = approval.title
  if (approval.summary !== undefined) row.description = approval.summary
  if (approval.type !== undefined) row.category = approval.type
  if (approval.agent_name !== undefined) row.requested_by = approval.agent_name
  if (approval.status !== undefined) row.status = approval.status
  if (approval.impact_level !== undefined) row.impact_level = approval.impact_level
  
  return row
}

/**
 * Formats a Date into Philippine Standard Time (`09:xx:xx PM PHT`)
 */
export function formatPHTTime(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)
  return `${formatted} PHT`
}

/**
 * Transforms an office_logs database row into a formatted string log line
 */
export function dbRowToLogString(row: OfficeLogRow): string {
  const parsed = row.created_at ? new Date(row.created_at) : new Date()
  const timestamp = Number.isNaN(parsed.getTime()) ? formatPHTTime() : formatPHTTime(parsed)
  const levelTag = row.level ? `[${row.level.toUpperCase()}]` : '[INFO]'
  const catTag = `[${row.category.toUpperCase()}]`
  const actor = row.agent_name ? `${row.agent_name}: ` : ''
  return `${timestamp} ${levelTag} ${catTag} ${actor}${row.message}`
}

/**
 * Creates an office_logs database insert row
 */
export function logToDbRow(input: {
  category: string
  message: string
  agentId?: string | null
  agentName?: string | null
  level?: string
  details?: Record<string, unknown>
}): Omit<OfficeLogRow, 'id' | 'created_at'> {
  return {
    category: input.category,
    message: input.message,
    agent_id: input.agentId || null,
    agent_name: input.agentName || null,
    level: input.level || 'info',
    details: input.details || {},
  }
}
