'use client'

import React, { useState, useEffect } from 'react'
import { Agent, Approval } from '@/components/office/types'
import { IsometricOffice } from '@/components/office/IsometricOffice'
import { sfx } from '@/components/office/audio'
import { officeBus } from '@/lib/office/bus'
import {
  officeSupabase,
  OfficeMessageRecord,
  OfficeLogRecord,
} from '@/lib/supabase/officeService'

export default function EasyUpOfficeHQ() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [supabaseActive, setSupabaseActive] = useState<boolean>(false)

  // Completed items list for "DONE TODAY"
  const [doneToday, setDoneToday] = useState([
    {
      id: 'done-1',
      title: '2.5D Isometric Engine Deployed (23 Agents)',
      agent: 'Josiah',
      time: '08:15 AM',
    },
    {
      id: 'done-2',
      title: 'Vitest Unit Suite Passing (26/26)',
      agent: 'Gian',
      time: '08:10 AM',
    },
    {
      id: 'done-3',
      title: 'OWASP Top 10 Security Audit Verified',
      agent: 'Khent',
      time: '07:55 AM',
    },
    {
      id: 'done-4',
      title: 'Gemini 2.5 Flash Benchmarking Complete',
      agent: 'Roy Jhan',
      time: '07:42 AM',
    },
  ])

  // Connect to Supabase Realtime channel for live messages, logs & approvals
  useEffect(() => {
    let isSubscribed = true

    async function initSupabase() {
      const isHealthy = await officeSupabase.checkHealth()
      if (isSubscribed) setSupabaseActive(isHealthy)

      if (isHealthy) {
        // Load initial messages from Supabase
        const remoteMsgs = await officeSupabase.getMessages(25)
        if (isSubscribed && remoteMsgs.length > 0) {
          const formatted = remoteMsgs.map(
            (m) =>
              `[COMM] ${m.sender_name} -> ${m.receiver_name || 'All'}: "${m.content}"`
          )
          setLogs((prev) =>
            Array.from(new Set([...formatted, ...prev])).slice(0, 40)
          )
        }
      }
    }

    void initSupabase()

    const unsubscribe = officeSupabase.subscribeToRealtime({
      onMessage: (msg: OfficeMessageRecord) => {
        const line = `[COMM] ${msg.sender_name} -> ${msg.receiver_name || 'All'}: "${msg.content}"`
        setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 40))
      },
      onLog: (log: OfficeLogRecord) => {
        const line = `[${log.category}] ${log.agent_name ? `${log.agent_name}: ` : ''}${log.message}`
        setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 40))
      },
      onApprovalUpdate: (approval) => {
        if (approval.status === 'approved' || approval.status === 'rejected') {
          setApprovals((prev) => prev.filter((a) => a.id !== approval.id))
        }
      },
    })

    return () => {
      isSubscribed = false
      unsubscribe()
    }
  }, [])

  // Subscribe to live inter-agent message bus for dynamic activity logs
  useEffect(() => {
    const unsubscribe = officeBus.subscribe((msg) => {
      const logLine = `[COMM] ${msg.fromName} -> ${msg.toName}: "${msg.text}"`
      setLogs((prev) => [logLine, ...prev.filter((p) => p !== logLine)].slice(0, 40))
    })
    return () => unsubscribe()
  }, [])

  // 3s polling synchronization with brain/live_status.json
  useEffect(() => {
    let isMounted = true

    async function syncOfficeState() {
      try {
        const res = await fetch('/api/office/status')
        const json = await res.json()
        if (isMounted && json.ok && json.data) {
          const fleet: Agent[] = json.data.agents || []
          setAgents(fleet)
          setApprovals(json.data.approvals || [])

          // Only initialize logs if logs state is currently empty
          setLogs((prev) => {
            if (prev.length === 0 && json.data.logs && json.data.logs.length > 0) {
              return json.data.logs.slice(0, 30)
            }
            return prev
          })

          setSelectedAgent((prev) => {
            if (!prev) return null
            const updated = fleet.find((a) => a.id === prev.id)
            return updated || prev
          })
        }
      } catch (err) {
        console.error('Failed to sync office state:', err)
      }
    }

    void syncOfficeState()
    const pollInterval = setInterval(() => {
      void syncOfficeState()
    }, 3000)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
    }
  }, [])

  // Handle Josiah's Go-Signal authorization (Audited & Synced to Supabase)
  const handleGoSignal = async (
    approvalId: string,
    action: 'approve' | 'reject'
  ) => {
    try {
      if (action === 'approve') {
        sfx?.playApproval?.()
      } else {
        sfx?.playReject?.()
      }
    } catch {}

    const item = approvals.find((a) => a.id === approvalId)
    if (action === 'approve' && item) {
      setDoneToday((prev) => [
        {
          id: `done-${Date.now()}`,
          title: item.title,
          agent: item.agent_name,
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
        ...prev,
      ])
    }

    setApprovals((prev) => prev.filter((a) => a.id !== approvalId))

    // Update Supabase approval record and audit log asynchronously
    void officeSupabase.resolveApproval(approvalId, action, 'Josiah')
    void officeSupabase.logActivity(
      'HUMAN_GO',
      `Go-Signal ${action === 'approve' ? 'AUTHORIZED' : 'REJECTED'} by Josiah for ${item?.title || approvalId}`,
      { id: 'josiah', name: 'Josiah' },
      action === 'approve' ? 'success' : 'warn'
    )

    try {
      const res = await fetch('/api/office/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, action }),
      })
      const data = await res.json()
      if (data.ok) {
        setApprovals(data.remaining || [])
      }
    } catch (err) {
      console.error('Error submitting go-signal:', err)
    }
  }

  // Dispatch directive to selected agent using real LLM execution route
  const handleDispatchDirective = async (agentId: string, directive: string) => {
    if (!directive.trim()) return
    sfx?.playTrigger?.()

    const targetAgent = agents.find((a) => a.id === agentId)

    try {
      const res = await fetch('/api/office/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          task: directive.trim(),
        }),
      })
      const data = await res.json()

      if (data.ok && data.data) {
        setAgents(data.data.agents || [])
        setApprovals(data.data.approvals || [])

        // If completed without requiring approval, add to Done Today
        if (data.result && !data.result.requiresGoSignal && targetAgent) {
          setDoneToday((prev) => [
            {
              id: `done-${Date.now()}`,
              title: directive.trim(),
              agent: targetAgent.name,
              time: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
            ...prev,
          ])
        }
      }
    } catch (err) {
      console.error('Error dispatching directive:', err)
    }
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#080b12]">
      <IsometricOffice
        agents={agents}
        approvals={approvals}
        onSelectAgent={(agent) => setSelectedAgent(agent)}
        selectedAgentId={selectedAgent?.id}
        onGoSignal={handleGoSignal}
        onDispatchDirective={handleDispatchDirective}
        logs={logs}
        doneToday={doneToday}
        supabaseActive={supabaseActive}
      />
    </main>
  )
}
