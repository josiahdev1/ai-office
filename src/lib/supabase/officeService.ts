/**
 * Supabase Office Service
 * Resilient real-time synchronization layer for agents, messages, logs, and approvals.
 * Supports live Supabase cloud database with graceful local fallback.
 */

import { createClient as createBrowserSupabase } from '@/utils/supabase/client'
import { Agent, Approval } from '@/components/office/types'

export interface OfficeMessageRecord {
  id: string
  sender_id: string
  sender_name: string
  sender_department: string
  recipient_id?: string
  recipient_name?: string
  channel: string
  content: string
  message_type: string
  created_at: string
}

export interface OfficeLogRecord {
  id: string
  agent_id?: string
  agent_name?: string
  level: string
  category: string
  message: string
  details?: Record<string, unknown>
  created_at: string
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
        .from('office_agents')
        .select('id', { head: true, count: 'exact' })

      if (error && error.message.includes('not find the table')) {
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
   * Fetch recent messages from Supabase or fallback.
   */
  public async getMessages(limit = 30): Promise<OfficeMessageRecord[]> {
    try {
      const { data, error } = await this.client
        .from('office_messages')
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
        sender_department: message.sender_department || 'Engineering Core',
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
   * Log an office event/telemetry to Supabase.
   */
  public async logActivity(
    category: string,
    message: string,
    agent?: { id: string; name: string },
    level = 'info',
    details = {}
  ): Promise<void> {
    try {
      await this.client.from('office_logs').insert({
        agent_id: agent?.id || null,
        agent_name: agent?.name || null,
        level,
        category,
        message,
        details,
      })
    } catch {
      // Gracefully ignore if offline
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
   * Subscribe to live Supabase Realtime channel for instant multi-user synchronization.
   */
  public subscribeToRealtime(callbacks: {
    onMessage?: (msg: OfficeMessageRecord) => void
    onLog?: (log: OfficeLogRecord) => void
    onAgentUpdate?: (agent: Partial<Agent>) => void
    onApprovalUpdate?: (approval: Partial<Approval>) => void
  }): () => void {
    try {
      const channel = this.client
        .channel('office-realtime-hub')
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
          { event: '*', schema: 'public', table: 'office_approvals' },
          (payload) => {
            if (payload.new && callbacks.onApprovalUpdate) {
              callbacks.onApprovalUpdate(payload.new as Partial<Approval>)
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
