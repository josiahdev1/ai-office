/**
 * Supabase Office Service for EasyUp Software Solution HQ
 * Real-time synchronization layer for agents, tasks, approvals, messages, and office settings.
 * Directly synchronized with live Supabase tables:
 * - public.office_agents
 * - public.office_approvals
 * - public.office_logs
 * - public.office_messages
 * - public.office_settings
 * - public.office_tasks
 */

import { createClient as createBrowserSupabase } from '@/utils/supabase/client'
import { createClient as createSupabaseJsClient, SupabaseClient } from '@supabase/supabase-js'
import { Agent, Approval } from '@/components/office/types'
import {
  dbRowToAgent,
  agentToDbRow,
  dbRowToApproval,
  OfficeAgentRow,
  OfficeApprovalRow,
  OfficeMessageRow,
} from '@/lib/office/db-map'

export interface OfficeMessageRecord {
  id: string
  sender_id: string
  sender_name: string
  sender_department?: string
  receiver_id?: string
  receiver_name?: string
  recipient_id?: string
  recipient_name?: string
  channel: string
  content: string
  message_type?: string
  created_at: string
}

export interface OfficeLogRecord {
  id: string
  agent_id?: string
  agent_name?: string
  action?: string
  category: string
  details?: Record<string, unknown>
  message: string
  level?: string
  created_at: string
}

export interface OfficeSettingsRecord {
  id: string
  mode: string
  sound_enabled: boolean
  speed: number
  theme: string
  layout: string
  updated_at: string
}

class SupabaseOfficeService {
  private _client: SupabaseClient | null = null
  private isSupabaseReady: boolean | null = null

  /**
   * Lazily initializes the Supabase client so module evaluation during `next build` on Vercel
   * never throws when build-time env vars are absent.
   */
  private get client(): SupabaseClient {
    if (this._client) return this._client

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://spacfnutrnhzxxbkjrji.supabase.co'
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_dkDalV5egnrWSKymMPEjvg_E81nLzdi'

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && publishableKey) {
        this._client = createBrowserSupabase() as unknown as SupabaseClient
        return this._client
      }
    } catch {
      // Fall back to direct @supabase/supabase-js client
    }

    this._client = createSupabaseJsClient(url, publishableKey || anonKey, {
      auth: { persistSession: false },
    })
    return this._client
  }

  /**
   * Probes whether office_agents table exists and is accessible.
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('office_agents')
        .select('id', { head: true, count: 'exact' })

      if (error && (error.message.includes('not find the table') || error.code === '42P01')) {
        this.isSupabaseReady = false
        return false
      }

      this.isSupabaseReady = !error
      return !error
    } catch {
      this.isSupabaseReady = false
      return false
    }
  }

  public get readyStatus(): boolean | null {
    return this.isSupabaseReady
  }

  public getClient() {
    return this.client
  }

  public async upsertSession(sessionPayload: Record<string, unknown>): Promise<boolean> {
    try {
      const { error } = await this.client.from('office_sessions').upsert(sessionPayload, {
        onConflict: 'session_id',
      })
      return !error
    } catch {
      return false
    }
  }

  /**
   * Fetch table row counts for DB CONNECTED status reporting.
   */
  public async getTableCounts(): Promise<{
    office_agents: number
    office_approvals: number
    office_logs: number
    office_messages: number
  } | null> {
    try {
      const [agentsRes, apprRes, logsRes, msgRes] = await Promise.all([
        this.client.from('office_agents').select('*', { count: 'exact', head: true }),
        this.client.from('office_approvals').select('*', { count: 'exact', head: true }),
        this.client.from('office_logs').select('*', { count: 'exact', head: true }),
        this.client.from('office_messages').select('*', { count: 'exact', head: true }),
      ])

      return {
        office_agents: agentsRes.count || 0,
        office_approvals: apprRes.count || 0,
        office_logs: logsRes.count || 0,
        office_messages: msgRes.count || 0,
      }
    } catch {
      return null
    }
  }

  /**
   * Fetch all agents from office_agents table.
   */
  public async getAgents(): Promise<Agent[] | null> {
    try {
      const { data, error } = await this.client
        .from('office_agents')
        .select('*')
        .order('name', { ascending: true })

      if (error || !data || data.length === 0) return null

      return (data as OfficeAgentRow[]).map(dbRowToAgent)
    } catch {
      return null
    }
  }

  /**
   * Update an agent's status or current task in office_agents.
   */
  public async updateAgent(agentId: string, updates: Partial<Agent>): Promise<boolean> {
    try {
      const row = agentToDbRow({ ...updates, id: agentId })
      const { error } = await this.client
        .from('office_agents')
        .update(row)
        .eq('id', agentId)

      return !error
    } catch {
      return false
    }
  }

  /**
   * Fetch recent messages from office_messages table.
   */
  public async getMessages(limit = 45): Promise<OfficeMessageRecord[]> {
    try {
      const { data, error } = await this.client
        .from('office_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error || !data) return []
      return (data as OfficeMessageRow[]).map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_name: m.sender_name,
        sender_department: m.sender_department,
        receiver_id: m.recipient_id || undefined,
        receiver_name: m.recipient_name || undefined,
        recipient_id: m.recipient_id || undefined,
        recipient_name: m.recipient_name || undefined,
        channel: m.channel || 'general',
        content: m.content,
        message_type: m.message_type || 'chat',
        created_at: m.created_at,
      }))
    } catch {
      return []
    }
  }

  /**
   * Post a new inter-agent message to office_messages.
   */
  public async postMessage(message: {
    sender_id: string
    sender_name: string
    sender_department?: string
    recipient_id?: string
    recipient_name?: string
    channel?: string
    content: string
    message_type?: string
  }): Promise<OfficeMessageRecord | null> {
    try {
      const record = {
        sender_id: message.sender_id,
        sender_name: message.sender_name,
        sender_department: message.sender_department || 'ENGINEERING',
        recipient_id: message.recipient_id || null,
        recipient_name: message.recipient_name || null,
        channel: message.channel || 'general',
        content: message.content,
        message_type: message.message_type || 'chat',
      }

      const { data, error } = await this.client
        .from('office_messages')
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
   * Log an office event/telemetry to office_logs.
   */
  public async logActivity(
    category: string,
    message: string,
    agent?: { id: string; name: string },
    level = 'info',
    details: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await this.client.from('office_logs').insert({
        agent_id: agent?.id || null,
        agent_name: agent?.name || 'System',
        category,
        message,
        level,
        details,
      })
    } catch {
      // Gracefully ignore if offline
    }
  }

  /**
   * Fetch pending approvals from office_approvals.
   */
  public async getApprovals(): Promise<Approval[]> {
    try {
      const { data, error } = await this.client
        .from('office_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error || !data) return []
      return (data as OfficeApprovalRow[]).map(dbRowToApproval)
    } catch {
      return []
    }
  }

  /**
   * Update Go-Signal Approval status in office_approvals.
   */
  public async resolveApproval(
    approvalId: string,
    action: 'approve' | 'reject',
    resolvedBy = 'Josiah'
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('office_approvals')
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
          id: 'default',
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
          { event: 'INSERT', schema: 'public', table: 'office_messages' },
          (payload) => {
            if (payload.new && callbacks.onMessage) {
              callbacks.onMessage(payload.new as OfficeMessageRecord)
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'office_logs' },
          (payload) => {
            if (payload.new && callbacks.onLog) {
              callbacks.onLog(payload.new as OfficeLogRecord)
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'office_agents' },
          (payload) => {
            if (payload.new && callbacks.onAgentUpdate) {
              callbacks.onAgentUpdate(dbRowToAgent(payload.new as OfficeAgentRow))
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'office_approvals' },
          (payload) => {
            if (payload.new && callbacks.onApprovalUpdate) {
              callbacks.onApprovalUpdate(dbRowToApproval(payload.new as OfficeApprovalRow))
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
