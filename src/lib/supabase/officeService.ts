/**
 * Supabase Office Service for EasyUp Software Solution HQ
 * Real-time synchronization layer for agents, tasks, approvals, messages, and office settings.
 * Supports live Supabase cloud database with graceful local fallback.
 */

import { createClient as createBrowserSupabase } from '@/utils/supabase/client'
import { Agent, Approval } from '@/components/office/types'

export interface OfficeMessageRecord {
  id: string
  sender_id: string
  sender_name: string
  receiver_id?: string
  receiver_name?: string
  recipient_id?: string
  recipient_name?: string
  channel: string
  content: string
  created_at: string
}

export interface OfficeLogRecord {
  id: string
  agent_id?: string
  agent_name?: string
  action?: string
  category?: string
  details?: string | Record<string, unknown>
  message?: string
  department?: string
  level?: string
  timestamp?: string
  created_at?: string
}

export interface OfficeSettingsRecord {
  id: string
  mode: string
  sound_enabled: boolean
  speed: string
  company_name: string
  updated_at: string
}

interface DbAgentRow {
  id: string
  name: string
  role: string
  department: string
  status: Agent['status']
  sub_state?: Agent['sub_state']
  current_task?: string
  current_file?: string
  terminal_preview?: string
  progress_pct?: number
  updated_at: string
  desk_id?: string
  desk_x?: number | string
  desk_y?: number | string
  color?: string
  hair?: string
  skin?: string
  last_action?: string
}

interface DbApprovalRow {
  id: string
  agent_id?: string
  requested_by?: string
  agent_name?: string
  room?: string
  type?: string
  title: string
  summary?: string
  details?: string
  created_at: string
  status?: 'pending' | 'approved' | 'rejected'
}

class SupabaseOfficeService {
  private client = createBrowserSupabase()
  private isSupabaseReady: boolean | null = null

  /**
   * Probes whether Supabase tables exist in the user's remote project.
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('agents')
        .select('id', { head: true, count: 'exact' })

      if (error && (error.message.includes('not find the table') || error.code === '42P01')) {
        this.isSupabaseReady = false
        return false
      }

      this.isSupabaseReady = true
      return true
    } catch {
      this.isSupabaseReady = false
      return false
    }
  }

  public get readyStatus(): boolean | null {
    return this.isSupabaseReady
  }

  /**
   * Fetch all agents from Supabase.
   */
  public async getAgents(): Promise<Agent[] | null> {
    try {
      const { data, error } = await this.client
        .from('agents')
        .select('*')
        .order('id', { ascending: true })

      if (error || !data || data.length === 0) return null

      return (data as DbAgentRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role,
        room: row.department,
        status: row.status,
        sub_state: row.sub_state,
        current_task: row.current_task,
        current_file: row.current_file,
        terminal_preview: row.terminal_preview,
        progress_pct: row.progress_pct,
        updated_at: row.updated_at,
        desk_id: row.desk_id,
        desk_coord: { x: Number(row.desk_x) || 200, y: Number(row.desk_y) || 340 },
        color: row.color,
        hair: row.hair,
        skin: row.skin,
        last_action: row.last_action,
      }))
    } catch {
      return null
    }
  }

  /**
   * Update an agent's status or current task in Supabase.
   */
  public async updateAgent(agentId: string, updates: Partial<Agent>): Promise<boolean> {
    try {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (updates.status) payload.status = updates.status
      if (updates.sub_state) payload.sub_state = updates.sub_state
      if (updates.current_task !== undefined) payload.current_task = updates.current_task
      if (updates.current_file !== undefined) payload.current_file = updates.current_file
      if (updates.terminal_preview !== undefined) payload.terminal_preview = updates.terminal_preview
      if (updates.progress_pct !== undefined) payload.progress_pct = updates.progress_pct
      if (updates.last_action !== undefined) payload.last_action = updates.last_action

      const { error } = await this.client
        .from('agents')
        .update(payload)
        .eq('id', agentId)

      return !error
    } catch {
      return false
    }
  }

  /**
   * Fetch recent messages from Supabase or fallback.
   */
  public async getMessages(limit = 35): Promise<OfficeMessageRecord[]> {
    try {
      const { data, error } = await this.client
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error || !data) return []
      return data as OfficeMessageRecord[]
    } catch {
      return []
    }
  }

  /**
   * Post a new inter-agent message to Supabase.
   */
  public async postMessage(message: {
    sender_id: string
    sender_name: string
    receiver_id?: string
    receiver_name?: string
    channel?: string
    content: string
  }): Promise<OfficeMessageRecord | null> {
    try {
      const record = {
        sender_id: message.sender_id,
        sender_name: message.sender_name,
        receiver_id: message.receiver_id || 'josiah',
        receiver_name: message.receiver_name || 'Josiah',
        channel: message.channel || 'engineering',
        content: message.content,
      }

      const { data, error } = await this.client
        .from('messages')
        .insert(record)
        .select()
        .single()

      if (error || !data) return null
      return data as OfficeMessageRecord
    } catch {
      return null
    }
  }

  /**
   * Log an office event/telemetry to Supabase activity_log.
   */
  public async logActivity(
    action: string,
    details: string,
    agent?: { id: string; name: string },
    level = 'info',
    department = 'Engineering Core'
  ): Promise<void> {
    try {
      await this.client.from('activity_log').insert({
        agent_id: agent?.id || null,
        agent_name: agent?.name || 'System',
        action,
        details,
        department,
        level,
        timestamp: new Date().toISOString(),
      })
    } catch {
      // Gracefully ignore if offline
    }
  }

  /**
   * Fetch pending approvals from Supabase.
   */
  public async getApprovals(): Promise<Approval[]> {
    try {
      const { data, error } = await this.client
        .from('approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error || !data) return []
      return (data as DbApprovalRow[]).map((row) => ({
        id: row.id,
        agent_id: row.agent_id || row.requested_by || 'system',
        agent_name: row.agent_name || 'Agent',
        room: row.room || 'Engineering Core',
        type: row.type || 'DEPLOYMENT',
        title: row.title,
        summary: row.summary || row.details || '',
        created_at: row.created_at,
        status: row.status,
      }))
    } catch {
      return []
    }
  }

  /**
   * Update Go-Signal Approval status in Supabase.
   */
  public async resolveApproval(
    approvalId: string,
    action: 'approve' | 'reject',
    resolvedBy = 'Josiah'
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('approvals')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', approvalId)

      return !error
    } catch {
      return false
    }
  }

  /**
   * Update office mode in office_settings table.
   */
  public async setOfficeMode(mode: string): Promise<void> {
    try {
      await this.client
        .from('office_settings')
        .upsert({
          id: 'default_hq',
          mode,
          updated_at: new Date().toISOString(),
        })
    } catch {}
  }

  /**
   * Subscribe to live Supabase Realtime channel for instant multi-user synchronization.
   */
  public subscribeToRealtime(callbacks: {
    onMessage?: (msg: OfficeMessageRecord) => void
    onLog?: (log: OfficeLogRecord) => void
    onAgentUpdate?: (agent: Partial<Agent>) => void
    onApprovalUpdate?: (approval: Partial<Approval>) => void
    onModeChange?: (mode: string) => void
  }): () => void {
    try {
      const channel = this.client
        .channel('easyup-hq-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            if (payload.new && callbacks.onMessage) {
              callbacks.onMessage(payload.new as OfficeMessageRecord)
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'activity_log' },
          (payload) => {
            if (payload.new && callbacks.onLog) {
              callbacks.onLog(payload.new as OfficeLogRecord)
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'agents' },
          (payload) => {
            if (payload.new && callbacks.onAgentUpdate) {
              callbacks.onAgentUpdate(payload.new as Partial<Agent>)
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'approvals' },
          (payload) => {
            if (payload.new && callbacks.onApprovalUpdate) {
              callbacks.onApprovalUpdate(payload.new as Partial<Approval>)
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'office_settings' },
          (payload) => {
            if (payload.new?.mode && callbacks.onModeChange) {
              callbacks.onModeChange(payload.new.mode)
            }
          }
        )
        .subscribe()

      return () => {
        void this.client.removeChannel(channel)
      }
    } catch {
      return () => {}
    }
  }
}

export const officeSupabase = new SupabaseOfficeService()
