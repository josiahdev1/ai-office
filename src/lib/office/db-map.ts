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
    default:
      return 'Engineering Core'
  }
}

export function roomToDepartment(room: string): string {
  const normalized = (room || '').toLowerCase().trim()
  if (normalized.includes('eng')) return 'ENGINEERING'
  if (normalized.includes('qa') || normalized.includes('secops') || normalized.includes('noc')) return 'QA & SECOPS'
  if (normalized.includes('growth')) return 'GROWTH'
  if (normalized.includes('intel') || normalized.includes('ai')) return 'INTELLIGENCE'
  if (normalized.includes('ops') || normalized.includes('operat')) return 'OPERATIONS'
  if (normalized.includes('command') || normalized.includes('exec')) return 'COMMAND'
  return 'ENGINEERING'
}

// =============================================================================
// 3. Status Converters
// =============================================================================

export function mapDbStatusToAgentStatus(dbStatus: string): AgentStatus {
  const s = (dbStatus || '').toLowerCase()
  if (s === 'coding' || s === 'working' || s === 'busy') return 'working'
  if (s === 'active' || s === 'meeting' || s === 'in_meeting') return 'active'
  if (s === 'awaiting_approval' || s === 'blocked') return 'awaiting_approval'
  if (s === 'done' || s === 'completed') return 'done'
  return 'idle'
}

export function mapAgentStatusToDbStatus(status: AgentStatus): string {
  switch (status) {
    case 'working':
      return 'coding'
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
    tag: row.department,
    status,
    sub_state: (row.sub_state as AgentSubState) || (status === 'working' ? 'typing' : 'seated'),
    current_task: row.current_task || undefined,
    progress_pct: row.progress ?? (status === 'working' ? 65 : 0),
    desk_id: row.seat_id || `desk-${row.id}`,
    desk_coord: { x: row.desk_x, y: row.desk_y },
    color: row.color || '#3b82f6',
    updated_at: row.updated_at || new Date().toISOString(),
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
    row.department = roomToDepartment(agent.room)
  }
  if (agent.tag !== undefined) row.department = agent.tag
  if (agent.desk_coord !== undefined) {
    row.desk_x = agent.desk_coord.x
    row.desk_y = agent.desk_coord.y
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
 * Transforms an office_logs database row into a formatted string log line
 */
export function dbRowToLogString(row: OfficeLogRow): string {
  const timestamp = new Date(row.created_at).toLocaleTimeString()
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
