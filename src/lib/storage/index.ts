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
    .enum([
      'active',
      'working',
      'idle',
      'awaiting_approval',
      'done',
      'on_break',
      'in_meeting',
      'gym',
      'at_gym',
    ])
    .optional(),
  sub_state: z.string().optional(),
  current_task: z.string().optional(),
  current_file: z.string().optional(),
  terminal_preview: z.string().optional(),
  progress_pct: z.number().min(0).max(100).optional(),
  last_action: z.string().optional(),
  room: z.string().optional(),
  color: z.string().optional(),
  current_coord: z
    .object({ x: z.number(), y: z.number() })
    .optional(),
  target_coord: z
    .object({ x: z.number(), y: z.number() })
    .optional(),
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

export function getSupabase(): SupabaseClient | null {
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
    { id: 'eng-7', room: 'Engineering Core', x: 4, y: 13 },
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

let cachedOfficeDataTimestamp = 0

/**
 * Fast cache-first read of live Supabase OfficeData (returns in <5ms when cache is fresh,
 * and triggers a non-blocking background refresh).
 */
export async function getFastOfficeState(maxAgeMs = 8000): Promise<OfficeData> {
  const now = Date.now()
  if (cachedOfficeData && now - cachedOfficeDataTimestamp < maxAgeMs) {
    return cachedOfficeData
  }
  if (cachedOfficeData) {
    // Refresh in background and return cached state immediately for zero latency
    void getOfficeState()
    return cachedOfficeData
  }
  return getOfficeState()
}

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
    // Fetch all 4 Supabase tables in parallel for minimal latency
    const [agentsRes, approvalsRes, logsRes, msgCountRes] = await Promise.all([
      supabase.from('office_agents').select('*').order('name', { ascending: true }),
      supabase
        .from('office_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('office_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30),
      supabase.from('office_messages').select('*', { count: 'exact', head: true }),
    ])

    const { data: rawAgents, error: agentsError } = agentsRes
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

    const { data: rawApprovals, error: approvalsError } = approvalsRes
    if (approvalsError) {
      console.warn('[Storage] Error reading office_approvals:', approvalsError.message)
    }

    const approvals: Approval[] = ((rawApprovals as OfficeApprovalRow[]) || []).map(
      dbRowToApproval
    )

    const { data: rawLogs, error: logsError } = logsRes
    if (logsError) {
      console.warn('[Storage] Error reading office_logs:', logsError.message)
    }

    const logs: string[] = ((rawLogs as OfficeLogRow[]) || []).map(dbRowToLogString)
    const messageCount = msgCountRes.count

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
    cachedOfficeDataTimestamp = Date.now()
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

export interface JarvisConversationRecord {
  id: string
  sender_id: string
  sender_name: string
  sender_department: string
  recipient_id?: string | null
  recipient_name?: string | null
  channel: string
  content: string
  message_type: string
  created_at: string
}

const inMemoryJarvisMessages: JarvisConversationRecord[] = []

/**
 * Fetches recent Jarvis conversation messages from public.office_messages (channel = 'jarvis')
 */
export async function getJarvisMessages(limit = 30): Promise<JarvisConversationRecord[]> {
  const supabase = getSupabase()
  if (!supabase) {
    return inMemoryJarvisMessages.slice(-limit)
  }

  try {
    const { data, error } = await supabase
      .from('office_messages')
      .select('*')
      .eq('channel', 'jarvis')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) {
      return inMemoryJarvisMessages.slice(-limit)
    }

    return (data as JarvisConversationRecord[]).reverse()
  } catch {
    return inMemoryJarvisMessages.slice(-limit)
  }
}

/**
 * Saves a Jarvis conversation message into public.office_messages (and office_logs)
 */
export async function saveJarvisMessage(params: {
  senderId: string
  senderName: string
  senderDepartment?: string
  recipientId?: string
  recipientName?: string
  content: string
  messageType?: string
}): Promise<void> {
  const record: JarvisConversationRecord = {
    id: `jarvis-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender_id: params.senderId,
    sender_name: params.senderName,
    sender_department: params.senderDepartment || 'COMMAND',
    recipient_id: params.recipientId || 'jarvis',
    recipient_name: params.recipientName || 'J.A.R.V.I.S.',
    channel: 'jarvis',
    content: params.content,
    message_type: params.messageType || 'chat',
    created_at: new Date().toISOString(),
  }

  inMemoryJarvisMessages.push(record)
  if (inMemoryJarvisMessages.length > 60) {
    inMemoryJarvisMessages.shift()
  }

  const supabase = getSupabase()
  if (!supabase) return

  try {
    await supabase.from('office_messages').insert({
      sender_id: record.sender_id,
      sender_name: record.sender_name,
      sender_department: record.sender_department,
      recipient_id: record.recipient_id,
      recipient_name: record.recipient_name,
      channel: 'jarvis',
      content: record.content,
      message_type: record.message_type,
    })
  } catch (err) {
    console.warn('[Storage] Failed to insert into office_messages:', (err as Error).message)
  }
}

export interface JarvisRollingMemory {
  operatorName: string
  preferences: string
  rollingSummary: string
  totalTurnsSummarized: number
  updatedAt: string
}

let inMemoryRollingMemory: JarvisRollingMemory = {
  operatorName: 'Josiah',
  preferences: 'Prefers concise, witty British JARVIS replies; speaks English and Taglish/Filipino.',
  rollingSummary: '',
  totalTurnsSummarized: 0,
  updatedAt: new Date().toISOString(),
}

/**
 * Builds a deterministic rolling summary of older conversation turns (> 20 turns ago)
 * and persists it in Supabase (`office_messages` with message_type = 'jarvis_memory').
 */
export function summarizeOlderTurns(
  turns: Array<{ role: 'user' | 'assistant'; content: string }>,
  existingSummary = ''
): string {
  if (!turns || turns.length === 0) return existingSummary
  const snippets = turns.slice(-12).map((t) => {
    const clean = t.content.replace(/\s+/g, ' ').trim().slice(0, 90)
    return `${t.role === 'user' ? 'Operator' : 'JARVIS'}: ${clean}`
  })
  const combined = [existingSummary, ...snippets].filter(Boolean).join(' | ')
  return combined.slice(-800)
}

export async function getJarvisRollingMemory(): Promise<JarvisRollingMemory> {
  const supabase = getSupabase()
  if (!supabase) return inMemoryRollingMemory

  try {
    const { data, error } = await supabase
      .from('office_messages')
      .select('*')
      .eq('channel', 'jarvis_memory')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error && data && data.length > 0) {
      const row = data[0] as JarvisConversationRecord
      const parsed = JSON.parse(row.content) as Partial<JarvisRollingMemory>
      inMemoryRollingMemory = {
        operatorName: parsed.operatorName || inMemoryRollingMemory.operatorName,
        preferences: parsed.preferences || inMemoryRollingMemory.preferences,
        rollingSummary: parsed.rollingSummary || '',
        totalTurnsSummarized: parsed.totalTurnsSummarized || 0,
        updatedAt: row.created_at || new Date().toISOString(),
      }
    }
  } catch {
    // Fallback to in-memory rolling summary
  }

  return inMemoryRollingMemory
}

export async function saveJarvisRollingMemory(
  update: Partial<JarvisRollingMemory>
): Promise<JarvisRollingMemory> {
  inMemoryRollingMemory = {
    ...inMemoryRollingMemory,
    ...update,
    updatedAt: new Date().toISOString(),
  }

  const supabase = getSupabase()
  if (supabase) {
    try {
      await supabase.from('office_messages').insert({
        sender_id: 'jarvis',
        sender_name: 'J.A.R.V.I.S.',
        sender_department: 'THE BRAIN',
        recipient_id: inMemoryRollingMemory.operatorName.toLowerCase().replace(/\s+/g, '_'),
        recipient_name: inMemoryRollingMemory.operatorName,
        channel: 'jarvis_memory',
        content: JSON.stringify(inMemoryRollingMemory),
        message_type: 'jarvis_memory',
      })
    } catch {
      // Ignore DB error if offline
    }
  }

  return inMemoryRollingMemory
}

// =============================================================================
// 9. Collective Knowledge Brain Storage (Self-Learning Memory)
// =============================================================================

export interface OfficeKnowledgeItem {
  id: string
  category: 'learning' | 'architecture' | 'code_pattern' | 'agent_memory' | 'rule' | 'decision'
  title: string
  content: string
  agent_id?: string
  agent_name?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

const inMemoryKnowledge: OfficeKnowledgeItem[] = [
  {
    id: 'know-1',
    category: 'architecture',
    title: 'EasyUp HQ Core Architecture & Tech Stack',
    content:
      'EasyUp Software Solution HQ is powered by Next.js 16 (App Router), React 19, Tailwind CSS v4, Three.js/Fiber 3D & HTML5 Canvas 2D viewports, and Supabase Realtime for state synchronization. All telemetry streams across office_agents, office_tasks, office_approvals, and office_logs.',
    agent_id: 'arwin',
    agent_name: 'Arwin',
    tags: ['architecture', 'tech-stack', 'nextjs', 'react19', 'supabase'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'know-2',
    category: 'agent_memory',
    title: '24 Autonomous Agent Fleet & AI Model Distribution',
    content:
      'EasyUp HQ operates a 24-agent autonomous AI workforce across 6 functional departments (Engineering, Product & Design, QA & Security, Operations & DevOps, Marketing & Growth, HR & Culture). Agents use live Gemini models (gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-pro) and Hugging Face in-project Neural Local SLMs (jarvis-local-slm-v1, hf-smollm2-135m, hf-smollm2-360m, hf-qwen2.5-0.5b).',
    agent_id: 'jarvis',
    agent_name: 'J.A.R.V.I.S.',
    tags: ['agents', 'fleet', 'ai-models', 'gemini', 'local-slm'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'know-3',
    category: 'code_pattern',
    title: 'Go-Signal Human-in-the-Loop Governance Pattern',
    content:
      'High-risk operations (production deployments, database migrations, security modifications) require human operator Go-Signal approval via office_approvals. Tasks are staged and await operator confirmation before dispatching.',
    agent_id: 'blaise',
    agent_name: 'Blaise',
    tags: ['security', 'governance', 'approvals', 'go-signal'],
    created_at: new Date().toISOString(),
  },
]

export async function getOfficeKnowledge(
  query = '',
  category = ''
): Promise<OfficeKnowledgeItem[]> {
  const supabase = getSupabase()
  if (supabase) {
    try {
      let req = supabase
        .from('office_knowledge')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (category && category !== 'ALL') {
        req = req.eq('category', category)
      }

      const { data, error } = await req
      if (!error && Array.isArray(data) && data.length > 0) {
        let results = data as OfficeKnowledgeItem[]
        if (query.trim()) {
          const q = query.toLowerCase()
          results = results.filter(
            (k) =>
              k.title.toLowerCase().includes(q) ||
              k.content.toLowerCase().includes(q) ||
              (k.tags || []).some((t) => t.toLowerCase().includes(q))
          )
        }
        return results
      }
    } catch {
      // Fallback to in-memory knowledge store
    }
  }

  // Filter in-memory knowledge fallback
  return inMemoryKnowledge.filter((k) => {
    const matchesCat = !category || category === 'ALL' || k.category === category
    const q = query.trim().toLowerCase()
    const matchesQ =
      !q ||
      k.title.toLowerCase().includes(q) ||
      k.content.toLowerCase().includes(q) ||
      (k.tags || []).some((t) => t.toLowerCase().includes(q))
    return matchesCat && matchesQ
  })
}

export async function saveOfficeKnowledge(
  item: Omit<OfficeKnowledgeItem, 'id' | 'created_at' | 'updated_at'>
): Promise<OfficeKnowledgeItem> {
  const newItem: OfficeKnowledgeItem = {
    ...item,
    id: `know-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  inMemoryKnowledge.unshift(newItem)

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data } = await supabase
        .from('office_knowledge')
        .insert({
          category: newItem.category,
          title: newItem.title,
          content: newItem.content,
          agent_id: newItem.agent_id,
          agent_name: newItem.agent_name,
          tags: newItem.tags || [],
          metadata: newItem.metadata || {},
        })
        .select()
        .single()

      if (data) {
        return data as OfficeKnowledgeItem
      }
    } catch {
      // Keep in-memory item on error
    }
  }

  return newItem
}



