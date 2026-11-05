'use client'

import React, { useState, useEffect } from 'react'
import { Agent, Approval } from '@/components/office/types'
import { IsometricOffice } from '@/components/office/IsometricOffice'
import { PixelSprite } from '@/components/office/pixel-sprites'
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
  const [roomFilter, setRoomFilter] = useState<string>('ALL')
  const [agentSearch, setAgentSearch] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [directiveInput, setDirectiveInput] = useState('')
  const [timeString, setTimeString] = useState('2026.11.05  08:20:00 GMT+0800')
  const [supabaseActive, setSupabaseActive] = useState<boolean>(false)

  // Completed items list for "DONE TODAY" card
  const [doneToday, setDoneToday] = useState([
    {
      id: 'done-1',
      title: '2.5D Isometric Engine Deployed (23 Agents)',
      agent: 'Josiah',
      time: '08:15 AM',
    },
    {
      id: 'done-2',
      title: 'Vitest Unit Suite Passing (12/12)',
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

  // Real-time Clock ticker (Philippine Standard Time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const time = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      setTimeString(`${year}.${month}.${day}  ${time} PHT (GMT+0800)`)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Connect to Supabase Realtime channel for live messages, logs & approvals
  useEffect(() => {
    let isSubscribed = true

    async function initSupabase() {
      const isHealthy = await officeSupabase.checkHealth()
      if (isSubscribed) setSupabaseActive(isHealthy)

      if (isHealthy) {
        // Load initial messages from Supabase
        const remoteMsgs = await officeSupabase.getMessages(15)
        if (isSubscribed && remoteMsgs.length > 0) {
          const formatted = remoteMsgs.map(
            (m) =>
              `[COMM] ${m.sender_name} -> ${m.recipient_name || 'All'}: "${m.content}"`
          )
          setLogs((prev) =>
            Array.from(new Set([...formatted, ...prev])).slice(0, 35)
          )
        }
      }
    }

    void initSupabase()

    const unsubscribe = officeSupabase.subscribeToRealtime({
      onMessage: (msg: OfficeMessageRecord) => {
        const line = `[COMM] ${msg.sender_name} -> ${msg.recipient_name || 'All'}: "${msg.content}"`
        setLogs((prev) => [line, ...prev].slice(0, 35))
      },
      onLog: (log: OfficeLogRecord) => {
        const line = `[${log.category}] ${log.agent_name ? `${log.agent_name}: ` : ''}${log.message}`
        setLogs((prev) => [line, ...prev].slice(0, 35))
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
      setLogs((prev) => [logLine, ...prev].slice(0, 35))
    })
    return () => unsubscribe()
  }, [])

  // Real-time 3s polling synchronization with brain/live_status.json
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
          if (json.data.logs && json.data.logs.length > 0) {
            setLogs((prev) => {
              const combined = [...json.data.logs, ...prev]
              return Array.from(new Set(combined)).slice(0, 30)
            })
          }

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
        if (data.logs) {
          setLogs((prev) => [...data.logs, ...prev].slice(0, 35))
        }
      }
    } catch (err) {
      console.error('Error submitting go-signal:', err)
    }
  }

  // Dispatch directive to selected agent using real LLM execution route
  const handleDispatchDirective = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!directiveInput.trim() || !selectedAgent) return
    setIsSubmitting(true)
    sfx?.playTrigger?.()

    const taskText = directiveInput.trim()
    setDirectiveInput('')

    try {
      const res = await fetch('/api/office/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          task: taskText,
        }),
      })
      const data = await res.json()

      if (data.ok && data.data) {
        setAgents(data.data.agents || [])
        setApprovals(data.data.approvals || [])
        if (data.data.logs) {
          setLogs(data.data.logs)
        }
        const updated = (data.data.agents as Agent[]).find(
          (a) => a.id === selectedAgent.id
        )
        if (updated) setSelectedAgent(updated)

        // If completed without requiring approval, add to Done Today
        if (data.result && !data.result.requiresGoSignal) {
          setDoneToday((prev) => [
            {
              id: `done-${Date.now()}`,
              title: taskText,
              agent: selectedAgent.name,
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const workingAgents = agents.filter((a) => a.status === 'working')

  // Filter agents by department room and search query
  const filteredAgents = agents.filter((a) => {
    const matchesRoom =
      roomFilter === 'ALL'
        ? true
        : a.room.toLowerCase().includes(roomFilter.toLowerCase())

    const matchesSearch =
      agentSearch.trim() === ''
        ? true
        : a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
          a.role.toLowerCase().includes(agentSearch.toLowerCase())

    return matchesRoom && matchesSearch
  })

  const departmentFilters = [
    { label: 'ALL', count: agents.length },
    {
      label: 'Engineering Core',
      count: agents.filter((a) => a.room === 'Engineering Core').length,
    },
    {
      label: 'QA & SecOps NOC',
      count: agents.filter((a) => a.room === 'QA & SecOps NOC').length,
    },
    {
      label: 'Operations Hub',
      count: agents.filter((a) => a.room === 'Operations Hub').length,
    },
    {
      label: 'Growth Lab',
      count: agents.filter((a) => a.room === 'Growth Lab').length,
    },
    {
      label: 'Intelligence Lab',
      count: agents.filter((a) => a.room === 'Intelligence Lab').length,
    },
    {
      label: 'Command Center',
      count: agents.filter((a) => a.room === 'Command Center').length,
    },
  ]

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#0a0815] font-sans text-slate-100 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP WINDOW TITLEBAR (Exact match to Image 5) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between border-b border-[#231b40] bg-[#120e24] px-4 py-2">
        {/* macOS Traffic Light Dots */}
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
          <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
          <span className="h-3 w-3 rounded-full bg-[#10b981]" />
        </div>

        {/* Center Search / App Title Capsule */}
        <div className="flex items-center gap-2 rounded-full border border-[#30255c] bg-[#1a1433] px-8 py-1 shadow-inner">
          <span className="font-mono text-xs font-bold tracking-wider whitespace-nowrap text-amber-400">
            EASYUP SOFTWARE SOLUTION // HQ COMMAND
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="hidden whitespace-nowrap sm:inline">
            {supabaseActive ? '⚡ SUPABASE REALTIME' : '⚡ LOCAL BUS ACTIVE'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-HEADER METADATA BAR (Exact match to Image 5) */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#211a3b] bg-[#0f0c1e] px-5 py-2.5">
        {/* Left: Brand & Manila Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-wider whitespace-nowrap text-amber-400">
              EASYUP
            </span>
            <span className="rounded bg-amber-500 px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap text-black">
              HQ
            </span>
          </div>
          <span className="font-mono text-xs font-semibold tracking-tight whitespace-nowrap text-slate-400">
            {timeString}
          </span>
        </div>

        {/* Right: Telemetry Stat Chips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-[#30255a] bg-[#181330] px-3 py-1 font-mono text-xs whitespace-nowrap text-cyan-300">
            <span>FLEET:</span>
            <span className="font-bold text-white">
              {agents.length}/{agents.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-emerald-600/70 bg-[#181330] px-3 py-1 font-mono text-xs whitespace-nowrap text-emerald-300">
            <span>DONE TODAY:</span>
            <span className="font-bold text-white">{doneToday.length}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-amber-500/80 bg-[#241712] px-3 py-1 font-mono text-xs whitespace-nowrap text-amber-300">
            <span>IN PROG:</span>
            <span className="font-bold text-white">{workingAgents.length}</span>
          </div>

          <div
            className={`hidden items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs whitespace-nowrap sm:flex ${
              supabaseActive
                ? 'border-emerald-600/60 bg-emerald-950/60 text-emerald-300'
                : 'border-[#30255a] bg-[#181330] text-slate-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${supabaseActive ? 'animate-pulse bg-emerald-400' : 'bg-slate-500'}`}
            />
            <span>
              {supabaseActive ? 'SUPABASE: SYNCED' : 'SUPABASE: HYBRID'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE (UPPER SECTION: 68% 2.5D CANVAS + 32% RIGHT CARDS) */}
      {/* ========================================================================= */}
      <div className="flex flex-1 flex-col gap-3 p-3 lg:flex-row">
        {/* UPPER-LEFT 68%: ISOMETRIC 2.5D OFFICE ENGINE (Full Viewport Auto-Fit) */}
        <div className="flex h-[580px] min-h-[500px] flex-col overflow-hidden rounded-xl shadow-2xl lg:min-h-[580px] lg:w-[68%]">
          <IsometricOffice
            agents={agents}
            approvals={approvals}
            onSelectAgent={(agent) => setSelectedAgent(agent)}
            selectedAgentId={selectedAgent?.id}
          />
        </div>

        {/* UPPER-RIGHT 32%: 3 STACKED COCKPIT CARDS (Exact match to Image 5) */}
        <div className="flex min-w-[320px] flex-col gap-3 lg:w-[32%]">
          {/* CARD 1: IN PROGRESS (N) */}
          <div className="flex max-h-[220px] flex-1 flex-col overflow-hidden rounded-xl border border-[#261e47] bg-[#120e24] p-3.5 shadow-lg">
            <div className="flex shrink-0 items-center justify-between border-b border-[#211a3b] pb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                <h3 className="font-mono text-xs font-bold tracking-wide whitespace-nowrap text-cyan-300 uppercase">
                  IN PROGRESS ({workingAgents.length})
                </h3>
              </div>
              <span className="font-mono text-[10px] whitespace-nowrap text-slate-500">
                LIVE SPRINT
              </span>
            </div>

            <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
              {workingAgents.map((ag) => (
                <div
                  key={ag.id}
                  onClick={() => setSelectedAgent(ag)}
                  className={`cursor-pointer rounded-lg border p-2 transition ${
                    selectedAgent?.id === ag.id
                      ? 'border-cyan-500 bg-[#1e173b]'
                      : 'border-[#291f4a] bg-[#181330]/80 hover:bg-[#1f183d]'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-white uppercase">
                      {ag.name}
                    </span>
                    <span className="font-bold text-cyan-400">
                      {ag.progress_pct ?? 75}%
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-slate-300">
                    {ag.current_task || 'Active development task'}
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#0a0714]">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${ag.progress_pct ?? 75}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CARD 2: WAITING FOR YOU (N) — JOSIAH'S GO-SIGNAL GATEWAY */}
          <div className="flex max-h-[240px] flex-1 flex-col overflow-hidden rounded-xl border border-amber-500/40 bg-[#161026] p-3.5 shadow-lg">
            <div className="flex shrink-0 items-center justify-between border-b border-[#2b2045] pb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
                <h3 className="font-mono text-xs font-bold tracking-wide whitespace-nowrap text-amber-300 uppercase">
                  WAITING FOR YOU ({approvals.length})
                </h3>
              </div>
              <span className="font-mono text-[10px] font-bold whitespace-nowrap text-amber-400">
                GO-SIGNAL
              </span>
            </div>

            <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
              {approvals.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-3 text-center">
                  <span className="mb-1 text-2xl">✨</span>
                  <p className="font-mono text-xs font-bold text-slate-300">
                    ALL GO-SIGNALS CLEARED
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                    All client emails, releases & database migrations signed
                    off.
                  </p>
                </div>
              ) : (
                approvals.map((app) => (
                  <div
                    key={app.id}
                    className="flex flex-col gap-1.5 rounded-lg border border-[#3b2b63] bg-[#1f1638] p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded border border-amber-600 bg-amber-950 px-1.5 py-0.5 font-mono text-[9px] font-semibold whitespace-nowrap text-amber-300 uppercase">
                        {app.type}
                      </span>
                      <span className="font-mono text-[10px] whitespace-nowrap text-slate-400">
                        by {app.agent_name}
                      </span>
                    </div>

                    <h4 className="font-mono text-xs leading-snug font-bold text-white">
                      {app.title}
                    </h4>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleGoSignal(app.id, 'reject')}
                        className="rounded border border-rose-500/40 bg-rose-500/20 px-2 py-1 font-mono text-[10px] whitespace-nowrap text-rose-300 transition hover:bg-rose-500/30"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleGoSignal(app.id, 'approve')}
                        className="rounded bg-emerald-500 px-2.5 py-1 font-mono text-[10px] font-bold whitespace-nowrap text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
                      >
                        Grant Go-Signal
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CARD 3: DONE TODAY (N) */}
          <div className="flex max-h-[140px] flex-col overflow-hidden rounded-xl border border-[#261e47] bg-[#120e24] p-3 shadow-lg">
            <div className="flex shrink-0 items-center justify-between border-b border-[#211a3b] pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <h3 className="font-mono text-xs font-bold tracking-wide whitespace-nowrap text-emerald-300 uppercase">
                  DONE TODAY ({doneToday.length})
                </h3>
              </div>
              <span className="font-mono text-[10px] whitespace-nowrap text-slate-500">
                VERIFIED
              </span>
            </div>

            <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {doneToday.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded bg-[#181330] p-1 font-mono text-xs"
                >
                  <span className="max-w-[200px] truncate text-slate-300">
                    ✓ {item.title}
                  </span>
                  <span className="font-mono text-[10px] whitespace-nowrap text-slate-500">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. HORIZONTAL ROOM / DEPARTMENT FILTER BAR */}
      {/* ========================================================================= */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-[#261e47] bg-[#120e24] px-3 py-2 shadow-lg">
          {departmentFilters.map((dep) => {
            const isActive = roomFilter === dep.label
            return (
              <button
                key={dep.label}
                onClick={() => {
                  setRoomFilter(dep.label)
                  sfx?.playBlip?.(540)
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs font-bold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'border border-[#30255a] bg-[#1a1433] text-slate-300 hover:text-white'
                }`}
              >
                <span>{dep.label}</span>
                <span className="text-[10px] opacity-80">({dep.count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. THREE BOTTOM DATA COLUMNS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-3 px-3 pb-4 md:grid-cols-3">
        {/* COLUMN 1: TEAM TODAY */}
        <div className="flex max-h-[320px] flex-col rounded-xl border border-[#261e47] bg-[#120e24] p-3.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#211a3b] pb-2">
            <h3 className="font-mono text-xs font-bold tracking-wide whitespace-nowrap text-white uppercase">
              TEAM TODAY ({filteredAgents.length})
            </h3>
            {/* Quick Filter Search */}
            <input
              type="text"
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              placeholder="Search agent..."
              className="w-28 rounded border border-[#291f4a] bg-[#0a0714] px-2 py-0.5 font-mono text-[10px] text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredAgents.map((ag) => (
              <div
                key={ag.id}
                onClick={() => setSelectedAgent(ag)}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-2 transition ${
                  selectedAgent?.id === ag.id
                    ? 'border-amber-500 bg-[#1f173b] shadow'
                    : 'border-[#291f4a] bg-[#181330] hover:bg-[#1e173b]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <PixelSprite
                    id={ag.id}
                    color={ag.color}
                    hair={ag.hair}
                    skin={ag.skin}
                    size={28}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-bold text-white">
                      {ag.name}
                    </p>
                    <p className="truncate font-mono text-[10px] text-slate-400">
                      {ag.role}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] whitespace-nowrap uppercase ${
                      ag.status === 'working'
                        ? 'border border-cyan-700 bg-cyan-950 text-cyan-300'
                        : 'border border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    {ag.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: RUNNING GOAL LIST */}
        <div className="flex max-h-[320px] flex-col rounded-xl border border-[#261e47] bg-[#120e24] p-3.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#211a3b] pb-2">
            <h3 className="font-mono text-xs font-bold tracking-wide whitespace-nowrap text-amber-300 uppercase">
              RUNNING GOAL LIST
            </h3>
            <span className="font-mono text-[10px] whitespace-nowrap text-slate-500">
              Q4 SPRINT
            </span>
          </div>

          <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
            <div className="flex flex-col gap-1 rounded-lg border border-[#291f4a] bg-[#181330] p-2.5">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold whitespace-nowrap text-amber-400">
                  1. 2.5D ISOMETRIC ENGINE
                </span>
                <span className="font-bold whitespace-nowrap text-emerald-400">
                  ✓ COMPLETED
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-300">
                Extruded 3D floating slab, 10 color-coded rooms, and A* corridor
                navigation for 23 agents.
              </p>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-[#291f4a] bg-[#181330] p-2.5">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold whitespace-nowrap text-cyan-400">
                  2. MULTI-PROVIDER LLM RUNTIME
                </span>
                <span className="font-bold whitespace-nowrap text-emerald-400">
                  ✓ ACTIVE
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-300">
                Gemini, Claude 3.5 Sonnet, and OpenAI hierarchy with resilient
                fallback and SSE streaming.
              </p>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-[#291f4a] bg-[#181330] p-2.5">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold whitespace-nowrap text-purple-400">
                  3. HUMAN-IN-THE-LOOP GO-SIGNAL
                </span>
                <span className="font-bold whitespace-nowrap text-amber-400">
                  ACTIVE RAILS
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-300">
                Mandatory Go-Signal gating on production deployments, emails,
                and database schema mutations.
              </p>
            </div>
          </div>
        </div>

        {/* COLUMN 3: RAW ACTIVITY LOG */}
        <div className="flex max-h-[320px] flex-col rounded-xl border border-[#261e47] bg-[#120e24] p-3.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#211a3b] pb-2">
            <h3 className="font-mono text-xs font-bold tracking-wide whitespace-nowrap text-white uppercase">
              ACTIVITY LOG
            </h3>
            <span className="font-mono text-[10px] whitespace-nowrap text-emerald-400">
              REAL-TIME
            </span>
          </div>

          <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto pr-1 font-mono text-[11px] text-slate-300">
            {logs.length === 0 ? (
              <p className="py-4 text-center text-slate-500">
                Waiting for studio telemetry...
              </p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className="border-b border-[#1b1536] pb-1 leading-snug last:border-b-0"
                >
                  <span className="font-bold text-amber-400">&gt;</span>{' '}
                  <span>{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. SLIDE-OUT AGENT INSPECTOR (When an agent is selected) */}
      {/* ========================================================================= */}
      {selectedAgent && (
        <div className="animate-in slide-in-from-bottom fixed right-4 bottom-4 z-50 flex w-96 flex-col gap-3 rounded-xl border-2 border-[#382b63] bg-[#140f29] p-4 shadow-2xl backdrop-blur-md duration-200">
          <div className="flex items-center justify-between border-b border-[#291f4a] pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-mono text-xs font-bold whitespace-nowrap text-amber-400">
                {`${selectedAgent.name.toUpperCase()} // WORKSTATION`}
              </span>
            </div>
            <button
              onClick={() => setSelectedAgent(null)}
              className="font-mono text-xs font-bold whitespace-nowrap text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3">
            <PixelSprite
              id={selectedAgent.id}
              color={selectedAgent.color}
              hair={selectedAgent.hair}
              skin={selectedAgent.skin}
              size={36}
            />
            <div className="min-w-0">
              <h4 className="truncate font-mono text-sm font-bold text-white">
                {selectedAgent.name}
              </h4>
              <p className="truncate font-mono text-xs text-slate-400">
                {selectedAgent.role}
              </p>
              <p className="font-mono text-[10px] whitespace-nowrap text-cyan-300">
                {selectedAgent.room}
              </p>
            </div>
          </div>

          {/* Terminal / Active File Preview */}
          <div className="space-y-1 rounded border border-[#261e47] bg-[#0a0714] p-2.5 font-mono text-xs">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>ACTIVE WORK:</span>
              <span className="font-bold text-emerald-400">
                {selectedAgent.progress_pct ?? 100}%
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-300">
              {selectedAgent.current_task || 'Idle at desk'}
            </p>
            {selectedAgent.terminal_preview && (
              <pre className="mt-1 overflow-x-auto rounded border border-emerald-950 bg-black/60 p-2 font-mono text-[10px] whitespace-pre-wrap text-emerald-400">
                {selectedAgent.terminal_preview}
              </pre>
            )}
          </div>

          {/* Directive Dispatch Form */}
          <form onSubmit={handleDispatchDirective} className="flex gap-2">
            <input
              type="text"
              value={directiveInput}
              onChange={(e) => setDirectiveInput(e.target.value)}
              placeholder={`Assign task to ${selectedAgent.name}...`}
              className="flex-1 rounded border border-[#2b224d] bg-[#0a0714] px-2.5 py-1.5 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting || !directiveInput.trim()}
              className="rounded bg-cyan-500 px-3 py-1.5 font-mono text-xs font-bold whitespace-nowrap text-black transition hover:bg-cyan-400 disabled:opacity-50"
            >
              Dispatch
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
