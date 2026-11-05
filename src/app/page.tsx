'use client'

import React, { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Agent, Approval } from '@/components/office/types'
import { DepartmentMode, AGENT_WORKSTATIONS_3D } from '@/components/office/three/office3DData'
import { IsometricOffice } from '@/components/office/IsometricOffice'
import { sfx } from '@/components/office/audio'
import { officeBus } from '@/lib/office/bus'
import {
  officeSupabase,
  OfficeMessageRecord,
  OfficeLogRecord,
} from '@/lib/supabase/officeService'

// Default baseline of all 24 registered database agents for instant zero-latency mount
const DEFAULT_AGENTS: Agent[] = Object.values(AGENT_WORKSTATIONS_3D).map((ws) => ({
  id: ws.agentId,
  name: ws.name,
  role: ws.department,
  room: ws.room,
  department: ws.department,
  status: 'working',
  current_task: 'Architecting High-Throughput Pipelines',
  current_file: 'src/components/office/OfficeCanvas3D.tsx',
  progress_pct: 82,
  updated_at: new Date().toISOString(),
}))

// Dynamically import 3D engine with SSR disabled for optimal WebGL performance
const OfficeCanvas3D = dynamic(
  () => import('@/components/office/OfficeCanvas3D'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#080b12] font-mono text-cyan-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span className="text-xs font-bold tracking-widest uppercase">
            INITIALIZING 3D PROCEDURAL ENGINE...
          </span>
        </div>
      </div>
    ),
  }
)

function HQCommandPage() {
  const searchParams = useSearchParams()
  const is2DFallback = searchParams.get('v') === '2'

  // Office state: initialized with full 24-agent roster
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(DEFAULT_AGENTS[0])
  const [supabaseActive, setSupabaseActive] = useState<boolean>(false)
  const [currentMode, setCurrentMode] = useState<DepartmentMode>('OVERVIEW')
  const [directiveInput, setDirectiveInput] = useState<string>('')
  const [isDispatching, setIsDispatching] = useState<boolean>(false)

  // Real-time PHT Clock (Asia/Manila, UTC+8)
  const [phtTime, setPhtTime] = useState<string>('')

  useEffect(() => {
    function updateClock() {
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date())
      setPhtTime(`${timeStr} PHT`)
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // 1. Initial State Fetch and Supabase Health Check
  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      try {
        const res = await fetch('/api/office/status')
        const json = await res.json()
        if (isMounted && json.ok && json.data) {
          const fleet: Agent[] = json.data.agents || []
          setAgents(fleet)
          setApprovals(json.data.approvals || [])
          if (json.data.dbConnected !== undefined) {
            setSupabaseActive(json.data.dbConnected)
          }

          // Default selected agent to Josiah or the first available
          setSelectedAgent((prev) => {
            if (!prev && fleet.length > 0) {
              return fleet.find((a) => a.id === 'josiah') || fleet[0]
            }
            return prev
          })

          // Initial logs
          if (json.data.logs && json.data.logs.length > 0) {
            setLogs(json.data.logs.slice(0, 40))
          }
        }
      } catch (err) {
        console.error('Failed to load initial office state:', err)
      }
    }

    void loadInitialData()

    // 3s interval polling synchronization for continuous freshness
    const pollInterval = setInterval(() => {
      void loadInitialData()
    }, 3000)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
    }
  }, [])

  // 2. Real-Time Supabase Subscription (`office-realtime` channel)
  useEffect(() => {
    let isSubscribed = true

    async function setupRealtime() {
      const isHealthy = await officeSupabase.checkHealth()
      if (isSubscribed) setSupabaseActive(isHealthy)

      if (isHealthy) {
        // Initial messages
        const remoteMsgs = await officeSupabase.getMessages(30)
        if (isSubscribed && remoteMsgs.length > 0) {
          const formatted = remoteMsgs.map(
            (m) => `[COMM] ${m.sender_name} -> ${m.receiver_name || 'All'}: "${m.content}"`
          )
          setLogs((prev) => Array.from(new Set([...formatted, ...prev])).slice(0, 50))
        }
      }
    }

    void setupRealtime()

    const unsubscribe = officeSupabase.subscribeToRealtime({
      onMessage: (msg: OfficeMessageRecord) => {
        const line = `[COMM] ${msg.sender_name} -> ${msg.receiver_name || 'All'}: "${msg.content}"`
        setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 50))
      },
      onLog: (log: OfficeLogRecord) => {
        const line = `[${log.category}] ${log.agent_name ? `${log.agent_name}: ` : ''}${log.message}`
        setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 50))
      },
      onAgentUpdate: (updatedAgent) => {
        setAgents((prev) =>
          prev.map((a) => (a.id === updatedAgent.id ? { ...a, ...updatedAgent } : a))
        )
        setSelectedAgent((prev) =>
          prev && prev.id === updatedAgent.id ? ({ ...prev, ...updatedAgent } as Agent) : prev
        )
      },
      onApprovalUpdate: (approval) => {
        if (approval.status === 'approved' || approval.status === 'rejected') {
          setApprovals((prev) => prev.filter((a) => a.id !== approval.id))
        } else if (approval.id) {
          setApprovals((prev) => {
            const exists = prev.some((a) => a.id === approval.id)
            if (exists) {
              return prev.map((a) => (a.id === approval.id ? ({ ...a, ...approval } as Approval) : a))
            }
            return [approval as Approval, ...prev]
          })
        }
      },
      onModeChange: (modeStr) => {
        if (
          modeStr === 'OVERVIEW' ||
          modeStr === 'FOCUS_WORK' ||
          modeStr === 'ALL_HANDS' ||
          modeStr === 'PANTRY' ||
          modeStr === 'GYM'
        ) {
          setCurrentMode(modeStr)
        }
      },
    })

    return () => {
      isSubscribed = false
      unsubscribe()
    }
  }, [])

  // 3. In-memory Office Event Bus subscription
  useEffect(() => {
    const unsub = officeBus.subscribe((msg) => {
      const line = `[EVENT] ${msg.fromName}: "${msg.text}"`
      setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 50))
    })
    return () => unsub()
  }, [])

  // Handle Go-Signal Authorizations
  const handleGoSignal = async (approvalId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        sfx?.playApproval?.()
      } else {
        sfx?.playReject?.()
      }
    } catch {}

    const item = approvals.find((a) => a.id === approvalId)
    setApprovals((prev) => prev.filter((a) => a.id !== approvalId))

    // Audited update to Supabase
    void officeSupabase.resolveApproval(approvalId, action, 'Josiah (Lead Architect)')
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
      if (data.ok && data.remaining) {
        setApprovals(data.remaining)
      }
    } catch (err) {
      console.error('Error submitting go-signal:', err)
    }
  }

  // Handle Dispatching Directives to Selected Agent
  const handleDispatchDirective = async () => {
    if (!selectedAgent || !directiveInput.trim() || isDispatching) return
    setIsDispatching(true)
    sfx?.playTrigger?.()

    const promptText = directiveInput.trim()
    setDirectiveInput('')

    try {
      const res = await fetch('/api/office/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          task: promptText,
        }),
      })
      const data = await res.json()
      if (data.ok && data.data) {
        setAgents(data.data.agents || [])
        setApprovals(data.data.approvals || [])
      }
    } catch (err) {
      console.error('Error dispatching directive:', err)
    } finally {
      setIsDispatching(false)
    }
  }

  // Mode button pills
  const modeButtons: { mode: DepartmentMode; label: string }[] = [
    { mode: 'OVERVIEW', label: 'OVERVIEW' },
    { mode: 'FOCUS_WORK', label: 'FOCUS WORK' },
    { mode: 'ALL_HANDS', label: 'ALL HANDS' },
    { mode: 'PANTRY', label: 'PANTRY & CANTEEN' },
    { mode: 'GYM', label: 'REC & GYM' },
  ]

  // Render 2D Fallback if query parameter `?v=2` is present
  if (is2DFallback) {
    return (
      <main className="h-screen w-screen overflow-hidden bg-[#080b12]">
        <div className="absolute top-2 right-4 z-50">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/80 px-3 py-1 font-mono text-xs font-bold text-cyan-300 shadow-xl backdrop-blur-md hover:bg-cyan-900 transition-colors whitespace-nowrap"
          >
            Switch to 3D Isometric Engine ↗
          </Link>
        </div>
        <IsometricOffice
          agents={agents}
          approvals={approvals}
          onSelectAgent={(ag) => setSelectedAgent(ag)}
          selectedAgentId={selectedAgent?.id}
          onGoSignal={handleGoSignal}
          onApproveAction={async (appId, act) => {
            await handleGoSignal(appId, act === 'approve' ? 'approve' : 'reject')
          }}
          onCreateTask={async () => {}}
          onDispatchDirective={async () => {}}
          logs={logs}
          doneToday={[]}
          supabaseActive={supabaseActive}
          onRefreshAgents={async () => {}}
        />
      </main>
    )
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#080b12] text-slate-100 font-sans select-none">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE COMMAND HEADER (bg-[#0a0d14]) */}
      {/* ========================================================================= */}
      <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#0a0d14] px-4 shadow-2xl z-30">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00e5ff]" />
          </div>
          <div>
            <div className="font-mono text-xs font-black tracking-widest text-slate-100 uppercase">
              EASYUP SOFTWARE SOLUTION // HQ COMMAND
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
              <span>ILOILO CITY</span>
              <span>•</span>
              <span className="text-cyan-400 font-medium">BRANCH: office-v3</span>
            </div>
          </div>
        </div>

        {/* Center: Department Mode Pills (Smooth Camera Interpolation) */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-slate-800/80 bg-slate-950/80 p-1 backdrop-blur-md">
          {modeButtons.map((btn) => {
            const isActive = currentMode === btn.mode
            return (
              <button
                key={btn.mode}
                type="button"
                onClick={() => {
                  setCurrentMode(btn.mode)
                  void officeSupabase.setOfficeMode(btn.mode)
                }}
                className={`cursor-pointer rounded-lg px-3 py-1 font-mono text-[11px] font-bold tracking-tight transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {btn.label}
              </button>
            )
          })}
        </div>

        {/* Right: Real-time PHT Clock, Live Badge & 2D Fallback Link */}
        <div className="flex items-center gap-3">
          {/* Digital Clock (Asia/Manila) */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono text-xs font-bold text-slate-200 tracking-wider">
              {phtTime || '00:00:00 AM PHT'}
            </span>
            <span className="font-mono text-[9px] text-slate-500 font-semibold tracking-wider">
              1X REAL-TIME WORK PACE
            </span>
          </div>

          {/* Live Badge (Database Count) */}
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="whitespace-nowrap">
              {agents.length > 0 ? `${agents.length} AGENTS ONLINE` : '24 AGENTS ONLINE'}
            </span>
          </div>

          {/* Fallback to 2D view toggle */}
          <Link
            href="/?v=2"
            title="Switch to 2D Canvas Fallback"
            className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 font-mono text-[11px] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors whitespace-nowrap"
          >
            <span>2D</span>
            <span className="text-[10px] text-slate-500">v2</span>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN COCKPIT BODY (70% 3D Viewport + 30% Sidebar Console) */}
      {/* ========================================================================= */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left / Center: Three.js 3D Isometric Canvas (Pure Procedural WebGL) */}
        <section className="relative flex-1 h-full overflow-hidden">
          <OfficeCanvas3D
            agents={agents}
            mode={currentMode}
            selectedAgentId={selectedAgent?.id}
            onSelectAgent={(ag) => setSelectedAgent(ag)}
            onResetCamera={() => setCurrentMode('OVERVIEW')}
          />
        </section>

        {/* Right: 30% Width Sidebar Console */}
        <aside className="w-full md:w-[380px] lg:w-[420px] shrink-0 border-l border-slate-800/80 bg-[#0d111c] flex flex-col overflow-hidden shadow-2xl z-20">
          {/* Section A: The Boss Desk (Approvals Gate) */}
          <div className="border-b border-slate-800/80 p-3 shrink-0">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
                  THE BOSS DESK // APPROVALS
                </span>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400 border border-amber-500/20">
                {approvals.length} PENDING
              </span>
            </div>

            {/* Approvals List */}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {approvals.length === 0 ? (
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3 text-center">
                  <span className="font-mono text-[11px] text-slate-500">
                    All Go-Signals cleared. Operations running nominal.
                  </span>
                </div>
              ) : (
                approvals.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-amber-300">
                        {item.agent_name}
                      </span>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber-200 uppercase">
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs font-semibold text-slate-200 line-clamp-1">
                      {item.title}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {item.summary}
                    </p>
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleGoSignal(item.id, 'reject')}
                        className="cursor-pointer rounded bg-rose-950/60 border border-rose-600/40 px-2.5 py-1 font-mono text-[10px] font-bold text-rose-300 hover:bg-rose-900 transition-colors whitespace-nowrap"
                      >
                        Reject ✕
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGoSignal(item.id, 'approve')}
                        className="cursor-pointer rounded bg-emerald-500 px-3 py-1 font-mono text-[10px] font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm shadow-emerald-500/30 whitespace-nowrap"
                      >
                        Grant Go-Signal ✓
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section B: Agent Detail Inspector */}
          <div className="border-b border-slate-800/80 p-3 shrink-0 bg-slate-900/30">
            <div className="flex items-center justify-between pb-2">
              <span className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
                AGENT DETAIL INSPECTOR
              </span>
              {selectedAgent && (
                <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase">
                  {selectedAgent.department || selectedAgent.room}
                </span>
              )}
            </div>

            {selectedAgent ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-100">
                        {selectedAgent.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {selectedAgent.role}
                      </div>
                    </div>
                  </div>
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                    {selectedAgent.status || 'Active'}
                  </span>
                </div>

                {/* Live Task & File */}
                <div className="rounded-lg bg-slate-950/40 p-2 border border-slate-800/40 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>CURRENT TASK:</span>
                    <span className="text-slate-200 truncate max-w-[200px]">
                      {selectedAgent.current_task || 'Architecting High-Throughput Pipelines'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>ACTIVE FILE:</span>
                    <span className="text-cyan-400 font-mono truncate max-w-[200px]">
                      {selectedAgent.current_file || 'src/components/office/OfficeCanvas3D.tsx'}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="pt-1">
                    <div className="flex justify-between font-mono text-[9px] text-slate-400 pb-0.5">
                      <span>PROGRESS</span>
                      <span>{selectedAgent.progress_pct || 78}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${selectedAgent.progress_pct || 78}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Directive Dispatch Input */}
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={directiveInput}
                    onChange={(e) => setDirectiveInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleDispatchDirective()}
                    placeholder={`Directive for ${selectedAgent.name}...`}
                    disabled={isDispatching}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleDispatchDirective()}
                    disabled={isDispatching || !directiveInput.trim()}
                    className="cursor-pointer rounded-lg bg-cyan-500 px-3 py-1.5 font-mono text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                  >
                    {isDispatching ? '...' : 'Dispatch'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-center font-mono text-xs text-slate-500">
                Click any agent in the 3D office to inspect live runtime telemetry.
              </div>
            )}
          </div>

          {/* Section C: Live Telemetry Stream (Monospaced Terminal Feed) */}
          <div className="flex-1 flex flex-col min-h-0 p-3">
            <div className="flex items-center justify-between pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
                  LIVE TELEMETRY STREAM
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">
                {logs.length} EVENTS
              </span>
            </div>

            <div className="flex-1 overflow-y-auto rounded-lg border border-slate-800/80 bg-slate-950/90 p-2 font-mono text-[11px] space-y-1 shadow-inner">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-4">
                  Listening for inter-agent messages and system logs...
                </div>
              ) : (
                logs.map((line, idx) => {
                  const isComm = line.startsWith('[COMM]')
                  const isGo = line.includes('HUMAN_GO')
                  const isErr = line.includes('ERROR') || line.includes('WARN')
                  return (
                    <div
                      key={`log-${idx}`}
                      className={`break-words leading-tight ${
                        isGo
                          ? 'text-amber-400 font-semibold'
                          : isErr
                          ? 'text-rose-400 font-semibold'
                          : isComm
                          ? 'text-cyan-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {line}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default function EasyUpOfficeHQ() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#080b12] font-mono text-cyan-400">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span className="text-xs font-bold tracking-widest uppercase">
              LOADING EASYUP HQ...
            </span>
          </div>
        </div>
      }
    >
      <HQCommandPage />
    </Suspense>
  )
}
