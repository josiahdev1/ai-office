/**
 * Unified Server-Side Storage & Supabase Sync Layer
 * 
 * Master persistence layer for EasyUp Software Solution HQ.
 * Directly reads & writes to live Supabase tables (`office_agents`, `office_approvals`,
 * `office_logs`, `office_messages`, `office_tasks`, `office_settings`) through db-map.ts.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { Agent, Approval, OfficeData } from '@/components/office/types'
import {
  dbRowToAgent,
  agentToDbRow,
  dbRowToApproval,
  dbRowToLogString,
  logToDbRow,
  OfficeAgentRow,
  OfficeApprovalRow,
  OfficeLogRow,
} from '@/lib/office/db-map'

// =============================================================================
// 1. Zod Validation Schemas
// =============================================================================

export const ApprovalRequestSchema = z.object({
  approvalId: z.string().min(1, 'approvalId is required'),
  action: z.enum(['approve', 'reject', 'hold', 'send_back', 'instruct']),
  resolvedBy: z.string().optional(),
  instruction: z.string().optional(),
})

export const TriggerRequestSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  taskDescription: z.string().optional(),
  actionName: z.string().optional(),
})

export const AgentUpdateSchema = z.object({
  status: z
    .enum(['active', 'working', 'idle', 'awaiting_approval', 'done'])
    .optional(),
  sub_state: z.string().optional(),
  current_task: z.string().optional(),
  current_file: z.string().optional(),
  terminal_preview: z.string().optional(),
  progress_pct: z.number().min(0).max(100).optional(),
  last_action: z.string().optional(),
  room: z.string().optional(),
  color: z.string().optional(),
})

// =============================================================================
// 2. Sliding Window Rate Limiter
// =============================================================================

const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key = 'global'): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 }
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count }
}

// =============================================================================
// 3. Supabase Client Initialization
// =============================================================================

let serverSupabaseClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (serverSupabaseClient) return serverSupabaseClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''

  if (!url || !key) {
    return null
  }

  serverSupabaseClient = createClient(url, key, {
    auth: { persistSession: false },
  })
  return serverSupabaseClient
}

// =============================================================================
// 4. In-Memory Fallback Cache (for offline dev or network drop)
// =============================================================================

let cachedOfficeData: OfficeData | null = null

// Desk Coordinate Map for Dynamic Agents
export const ROOM_DESK_SLOTS: Record<string, { id: string; room: string; x: number; y: number }[]> = {
  'Engineering Core': [
    { id: 'eng-1', room: 'Engineering Core', x: 2, y: 10 },
    { id: 'eng-2', room: 'Engineering Core', x: 2, y: 11 },
    { id: 'eng-3', room: 'Engineering Core', x: 2, y: 12 },
    { id: 'eng-4', room: 'Engineering Core', x: 4, y: 10 },
    { id: 'eng-5', room: 'Engineering Core', x: 4, y: 11 },
    { id: 'eng-6', room: 'Engineering Core', x: 4, y: 12 },
  ],
  'QA & SecOps NOC': [
    { id: 'qa-1', room: 'QA & SecOps NOC', x: 2, y: 14 },
    { id: 'qa-2', room: 'QA & SecOps NOC', x: 2, y: 15 },
    { id: 'qa-3', room: 'QA & SecOps NOC', x: 4, y: 14 },
  ],
  'Growth Lab': [
    { id: 'growth-1', room: 'Growth Lab', x: 13, y: 9 },
    { id: 'growth-2', room: 'Growth Lab', x: 13, y: 10 },
    { id: 'growth-3', room: 'Growth Lab', x: 15, y: 9 },
  ],
  'Intelligence Lab': [
    { id: 'intel-1', room: 'Intelligence Lab', x: 13, y: 5 },
    { id: 'intel-2', room: 'Intelligence Lab', x: 13, y: 6 },
    { id: 'intel-3', room: 'Intelligence Lab', x: 15, y: 5 },
    { id: 'intel-4', room: 'Intelligence Lab', x: 15, y: 6 },
  ],
  'Operations Hub': [
    { id: 'ops-1', room: 'Operations Hub', x: 13, y: 12 },
    { id: 'ops-2', room: 'Operations Hub', x: 13, y: 13 },
    { id: 'ops-3', room: 'Operations Hub', x: 15, y: 12 },
    { id: 'ops-4', room: 'Operations Hub', x: 15, y: 13 },
  ],
  'Command Center': [
    { id: 'cmd-1', room: 'Command Center', x: 13, y: 15 },
    { id: 'cmd-2', room: 'Command Center', x: 15, y: 15 },
    { id: 'cmd-3', room: 'Command Center', x: 14, y: 16 },
  ],
}

export function autoAssignDesks(agents: Agent[]): Agent[] {
  const occupiedSlots = new Set<string>()
  agents.forEach((ag) => {
    if (ag.desk_id) occupiedSlots.add(ag.desk_id)
  })

  return agents.map((agent) => {
    if (agent.desk_coord && agent.desk_id) return agent

    const roomSlots = ROOM_DESK_SLOTS[agent.room] || ROOM_DESK_SLOTS['Engineering Core']
    const availableSlot = roomSlots.find((slot) => !occupiedSlots.has(slot.id))

    if (availableSlot) {
      occupiedSlots.add(availableSlot.id)
      return {
        ...agent,
        desk_id: availableSlot.id,
        desk_coord: { x: availableSlot.x, y: availableSlot.y },
      }
    }

    return {
      ...agent,
      desk_coord: { x: 3, y: 10 },
    }
  })
}

// =============================================================================
// 5. Database Read Operations
// =============================================================================

/**
 * Reads live office state directly from Supabase tables:
 * - office_agents
 * - office_approvals
 * - office_logs
 * - office_messages
 */
export async function getOfficeState(): Promise<OfficeData> {
  const supabase = getSupabase()

  if (!supabase) {
    if (cachedOfficeData) return cachedOfficeData
    return {
      company_name: 'EasyUp Software Solution',
      playback_speed: '1x',
      agents: [],
      approvals: [],
      logs: ['[OFFLINE] Supabase environment variables not configured.'],
      dbConnected: false,
      dbError: 'Supabase credentials missing',
    }
  }

  try {
    // 1. Fetch office_agents
    const { data: rawAgents, error: agentsError } = await supabase
      .from('office_agents')
      .select('*')
      .order('name', { ascending: true })

    if (agentsError) {
      console.warn('[Storage] Error reading office_agents:', agentsError.message)
      if (cachedOfficeData) {
        return {
          ...cachedOfficeData,
          dbConnected: false,
          dbError: agentsError.message,
        }
      }
      throw agentsError
    }

    const agents: Agent[] = autoAssignDesks(
      ((rawAgents as OfficeAgentRow[]) || []).map(dbRowToAgent)
    )

    // 2. Fetch office_approvals (pending)
    const { data: rawApprovals, error: approvalsError } = await supabase
      .from('office_approvals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (approvalsError) {
      console.warn('[Storage] Error reading office_approvals:', approvalsError.message)
    }

    const approvals: Approval[] = ((rawApprovals as OfficeApprovalRow[]) || []).map(
      dbRowToApproval
    )

    // 3. Fetch office_logs (recent telemetry)
    const { data: rawLogs, error: logsError } = await supabase
      .from('office_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (logsError) {
      console.warn('[Storage] Error reading office_logs:', logsError.message)
    }

    const logs: string[] = ((rawLogs as OfficeLogRow[]) || []).map(dbRowToLogString)

    // 4. Count messages in office_messages
    const { count: messageCount } = await supabase
      .from('office_messages')
      .select('*', { count: 'exact', head: true })

    const state: OfficeData = {
      company_name: 'EasyUp Software Solution',
      playback_speed: '1x',
      agents,
      approvals,
      logs: logs.length > 0 ? logs : ['[BOOT] Live Supabase connection established.'],
      dbConnected: true,
      dbError: null,
      tableCounts: {
        office_agents: agents.length,
        office_approvals: approvals.length,
        office_logs: logs.length,
        office_messages: messageCount || 0,
      },
    }

    cachedOfficeData = state
    return state
  } catch (err: unknown) {
    const errorMsg = (err as Error).message || 'Database connection error'
    console.error('[Storage] getOfficeState error:', errorMsg)
    
    if (cachedOfficeData) {
      return {
        ...cachedOfficeData,
        dbConnected: false,
        dbError: errorMsg,
      }
    }

    return {
      company_name: 'EasyUp Software Solution',
      playback_speed: '1x',
      agents: [],
      approvals: [],
      logs: [`[DB ERROR] Failed to connect: ${errorMsg}`],
      dbConnected: false,
      dbError: errorMsg,
    }
  }
}

/**
 * Saves full state to in-memory cache and syncs modified agents to office_agents
 */
export async function saveOfficeState(state: OfficeData): Promise<void> {
  cachedOfficeData = state
  const supabase = getSupabase()
  if (!supabase) return

  try {
    const rows = state.agents.map(agentToDbRow)
    await supabase.from('office_agents').upsert(rows, { onConflict: 'id' })
  } catch (err) {
    console.warn('[Storage] Background saveOfficeState skipped:', err)
  }
}

// =============================================================================
// 6. Database Write Operations
// =============================================================================

/**
 * Updates a single agent in office_agents
 */
export async function updateAgent(
  agentId: string,
  partial: Partial<Agent>
): Promise<OfficeData> {
  const supabase = getSupabase()

  if (supabase) {
    const dbRow = agentToDbRow({ ...partial, id: agentId })
    const { error } = await supabase
      .from('office_agents')
      .update(dbRow)
      .eq('id', agentId)

    if (error) {
      console.warn(`[Storage] Failed to update agent ${agentId} in DB:`, error.message)
    }
  }

  // Update in-memory state
  if (cachedOfficeData) {
    cachedOfficeData.agents = cachedOfficeData.agents.map((ag) => {
      if (ag.id === agentId) {
        return {
          ...ag,
          ...partial,
          updated_at: new Date().toISOString(),
        }
      }
      return ag
    })
  }

  return getOfficeState()
}

/**
 * Resolves a pending Go-Signal approval in office_approvals and records audit in office_logs
 */
export async function resolveApproval(
  approvalId: string,
  action: 'approve' | 'reject' | 'hold' | 'send_back' | 'instruct',
  resolvedBy = 'Josiah',
  instruction?: string
): Promise<{ remaining: Approval[]; logs: string[]; resolvedItem?: Approval }> {
  const supabase = getSupabase()
  let resolvedItem: Approval | undefined

  if (supabase) {
    // 1. Get approval details
    const { data: existing } = await supabase
      .from('office_approvals')
      .select('*')
      .eq('id', approvalId)
      .single()

    if (existing) {
      resolvedItem = dbRowToApproval(existing as OfficeApprovalRow)
    }

    // 2. Update status in office_approvals
    const targetStatus =
      action === 'approve'
        ? 'approved'
        : action === 'reject'
          ? 'rejected'
          : action === 'hold'
            ? 'hold'
            : action === 'send_back'
              ? 'sent_back'
              : 'instructed'

    await supabase
      .from('office_approvals')
      .update({
        status: targetStatus,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', approvalId)

    // 3. Write audit log to office_logs
    const logMsg =
      action === 'instruct'
        ? `[INSTRUCT] User instruction sent to ${existing?.requested_by || 'agent'}: "${instruction || 'Proceed with updated directive'}"`
        : action === 'send_back'
          ? `[SEND_BACK] Approval returned to ${existing?.requested_by || 'agent'} for revision.`
          : action === 'hold'
            ? `[HOLD] Approval placed on hold by ${resolvedBy}.`
            : `[GO-SIGNAL] ${action.toUpperCase()} recorded for "${existing?.title || approvalId}".`

    await supabase.from('office_logs').insert(
      logToDbRow({
        category: 'approval',
        level: 'audit',
        agentName: resolvedBy,
        message: logMsg,
        details: { approvalId, action, resolvedBy, instruction },
      })
    )

    // 4. If approved or instructed, advance agent state in office_agents
    if (existing && existing.requested_by) {
      const agentId = existing.requested_by.toLowerCase().replace(/\s+/g, '_')
      if (action === 'approve') {
        await supabase
          .from('office_agents')
          .update({
            status: 'coding',
            sub_state: 'typing',
            current_task: `Executing approved Go-Signal: ${existing.title}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', agentId)
      } else if (action === 'instruct' && instruction) {
        await supabase
          .from('office_agents')
          .update({
            status: 'coding',
            sub_state: 'typing',
            current_task: `Directive: ${instruction}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', agentId)
      }
    }
  }

  const updatedState = await getOfficeState()
  return {
    remaining: updatedState.approvals,
    logs: updatedState.logs,
    resolvedItem,
  }
}

/**
 * Dispatches a task to an agent: updates office_agents and records to office_logs (and office_tasks)
 */
export async function triggerTask(
  agentId: string,
  task: string
): Promise<OfficeData> {
  const supabase = getSupabase()

  if (supabase) {
    // 1. Update agent in office_agents
    await supabase
      .from('office_agents')
      .update({
        status: 'coding',
        sub_state: 'typing',
        current_task: task,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)

    // 2. Insert telemetry into office_logs
    await supabase.from('office_logs').insert(
      logToDbRow({
        category: 'task',
        level: 'info',
        agentId,
        message: `Agent ${agentId.toUpperCase()} initiated: "${task}".`,
        details: { task, agentId },
      })
    )

    // 3. Optional insert into office_tasks if table exists
    try {
      await supabase.from('office_tasks').insert({
        title: task,
        assigned_to: agentId,
        department: 'ENGINEERING',
        status: 'in_progress',
        progress: 10,
      })
    } catch {
      // Ignored if office_tasks table has not been created yet
    }
  }

  return getOfficeState()
}

/**
 * Appends a log line to office_logs in Supabase
 */
export async function addOfficeLog(
  message: string,
  category = 'system',
  agentId?: string,
  agentName?: string,
  level = 'info'
): Promise<string[]> {
  const supabase = getSupabase()

  if (supabase) {
    await supabase.from('office_logs').insert(
      logToDbRow({
        category,
        message,
        agentId,
        agentName,
        level,
      })
    )
  }

  const updatedState = await getOfficeState()
  return updatedState.logs
}
