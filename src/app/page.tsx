'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { Agent, Approval } from '@/components/office/types'
import {
  DepartmentMode,
  AGENT_WORKSTATIONS_3D,
  getAgentTargetPosition,
} from '@/config/officeLayout'
import {
  getCharacterStyle,
  getAgentStatusBadge,
} from '@/config/characterStyles'
import OfficeCanvas2D from '@/components/office/OfficeCanvas2D'
import { sfx } from '@/components/office/audio'
import { officeBus } from '@/lib/office/bus'
import {
  officeSupabase,
  OfficeMessageRecord,
  OfficeLogRecord,
} from '@/lib/supabase/officeService'

// Default baseline of all registered database agents for instant zero-latency mount
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

// Contextual non-looping engineering & operational milestones
const CONTEXTUAL_EVENTS: {
  senderId: string
  senderName: string
  receiverId: string
  receiverName: string
  category: string
  text: string
}[] = [
  {
    senderId: 'arwin',
    senderName: 'Arwin',
    receiverId: 'josiah',
    receiverName: 'Josiah',
    category: 'API_SYNC',
    text: 'Completed DugtongOJT API schema migration and verified zero-downtime Postgres connection pooling.',
  },
  {
    senderId: 'mary_grace',
    senderName: 'Mary Grace',
    receiverId: 'gloria',
    receiverName: 'Gloria',
    category: 'OPS_DELIVERY',
    text: 'Reconciled PayBridge escrow batch disbursements and cleared Q4 partner onboarding checklist.',
  },
  {
    senderId: 'khent',
    senderName: 'Khent',
    receiverId: 'gian',
    receiverName: 'Gian',
    category: 'SECOPS_AUDIT',
    text: 'Passed automated Vitest & RLS policy verification across office_agents, office_logs, and office_approvals.',
  },
  {
    senderId: 'neil_mar',
    senderName: 'Neil Mar',
    receiverId: 'christian',
    receiverName: 'Christian',
    category: 'WEBGL_UI',
    text: 'Synchronized 3D WebGL sprite nameplates and 2D Canvas tags at 60fps with zero pan/zoom latency.',
  },
  {
    senderId: 'roy_jhan',
    senderName: 'Roy Jhan',
    receiverId: 'keiru',
    receiverName: 'Keiru',
    category: 'AI_PIPELINE',
    text: 'Benchmarked multimodal embeddings and reduced inference p95 latency by 24% in Intelligence Lab.',
  },
  {
    senderId: 'bonnie',
    senderName: 'Bonnie',
    receiverId: 'john_lloyd',
    receiverName: 'John Lloyd',
    category: 'CLOUD_OPS',
    text: 'Scaled FlexSpace Iloilo edge workers and verified replica read latency under 12ms.',
  },
]

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
  const router = useRouter()
  const is2DView = searchParams.get('v') === '2'

  // Office state
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(DEFAULT_AGENTS[0])
  const [, setSupabaseActive] = useState<boolean>(false)
  const [currentMode, setCurrentMode] = useState<DepartmentMode>('OVERVIEW')
  const [agentRouteOverrides, setAgentRouteOverrides] = useState<
    Record<string, DepartmentMode>
  >({})
  const [directiveInput, setDirectiveInput] = useState<string>('')
  const [isDispatching, setIsDispatching] = useState<boolean>(false)

  // Real-time PHT Clock (Asia/Manila, UTC+8)
  const [phtTime, setPhtTime] = useState<string>('')
  const eventCursorRef = useRef<number>(0)

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

          setSelectedAgent((prev) => {
            if (!prev && fleet.length > 0) {
              return fleet.find((a) => a.id === 'josiah') || fleet[0]
            }
            if (prev) {
              const updated = fleet.find((a) => a.id === prev.id)
              if (updated) return { ...prev, ...updated }
            }
            return prev
          })

          if (json.data.logs && json.data.logs.length > 0) {
            setLogs((prev) =>
              prev.length === 0 ? json.data.logs.slice(0, 40) : prev
            )
          }
        }
      } catch (err) {
        console.error('Failed to load initial office state:', err)
      }
    }

    void loadInitialData()

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
        const remoteMsgs = await officeSupabase.getMessages(25)
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
              return prev.map((a) =>
                a.id === approval.id ? ({ ...a, ...approval } as Approval) : a
              )
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
          setAgentRouteOverrides({})
        }
      },
    })

    return () => {
      isSubscribed = false
      unsubscribe()
    }
  }, [])

  // 3. In-memory Office Event Bus + Non-Looping Contextual Telemetry
  useEffect(() => {
    const unsub = officeBus.subscribe((msg) => {
      const line = `[EVENT] ${msg.fromName}: "${msg.text}"`
      setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 50))
    })

    // Non-looping contextual milestone emitter (fires up to CONTEXTUAL_EVENTS.length times)
    const contextualTimer = setInterval(() => {
      const idx = eventCursorRef.current
      if (idx >= CONTEXTUAL_EVENTS.length) return
      eventCursorRef.current = idx + 1
      const ev = CONTEXTUAL_EVENTS[idx]
      const line = `[${ev.category}] ${ev.senderName} -> ${ev.receiverName}: "${ev.text}"`
      setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 50))
      void officeSupabase.postMessage({
        sender_id: ev.senderId,
        sender_name: ev.senderName,
        recipient_id: ev.receiverId,
        recipient_name: ev.receiverName,
        content: ev.text,
        message_type: 'chat',
      })
    }, 22000)

    return () => {
      unsub()
      clearInterval(contextualTimer)
    }
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

  // Step 6: Individual Agent Direct Routing ("Send to Work Desk", "Pantry", "Gym", "Brain")
  const handleRouteIndividualAgent = (
    agent: Agent,
    targetMode: DepartmentMode,
    newStatus: Agent['status'],
    taskDescription: string
  ) => {
    sfx?.playTrigger?.()
    setAgentRouteOverrides((prev) => ({
      ...prev,
      [agent.id]: targetMode,
    }))

    setAgents((prev) =>
      prev.map((a) =>
        a.id === agent.id
          ? { ...a, status: newStatus, current_task: taskDescription }
          : a
      )
    )
    setSelectedAgent((prev) =>
      prev && prev.id === agent.id
        ? { ...prev, status: newStatus, current_task: taskDescription }
        : prev
    )

    const ws = AGENT_WORKSTATIONS_3D[agent.id]
    const coords = ws ? getAgentTargetPosition(ws, currentMode, targetMode) : [0, 0, 0]
    const logLine = `[ROUTE] ${agent.name} walking via A* pathfinding to ${targetMode.replace('_', ' ')} (${coords[0]}, ${coords[2]}): ${taskDescription}`
    setLogs((prev) => [logLine, ...prev.filter((p) => p !== logLine)].slice(0, 50))

    void officeSupabase.updateAgent(agent.id, {
      status: newStatus || 'working',
      current_task: taskDescription,
    })
    void officeSupabase.logActivity(
      'AGENT_ROUTE',
      `${agent.name} routed to ${targetMode}: ${taskDescription}`,
      { id: agent.id, name: agent.name },
      'info'
    )
  }

  // Handle Dispatching Directives to Selected Agent
  const handleDispatchDirective = async () => {
    if (!selectedAgent || !directiveInput.trim() || isDispatching) return
    setIsDispatching(true)
    sfx?.playTrigger?.()

    const promptText = directiveInput.trim()
    setDirectiveInput('')

    // Route agent to their work desk and set status to working immediately
    setAgentRouteOverrides((prev) => ({
      ...prev,
      [selectedAgent.id]: 'FOCUS_WORK',
    }))
    setAgents((prev) =>
      prev.map((a) =>
        a.id === selectedAgent.id
          ? { ...a, status: 'working', current_task: promptText }
          : a
      )
    )
    setSelectedAgent((prev) =>
      prev ? { ...prev, status: 'working', current_task: promptText } : prev
    )

    const directiveLine = `[DIRECTIVE] Josiah -> ${selectedAgent.name}: "${promptText}"`
    setLogs((prev) => [directiveLine, ...prev].slice(0, 50))
    void officeSupabase.updateAgent(selectedAgent.id, {
      status: 'working',
      current_task: promptText,
    })

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

  const selectedEffectiveMode = selectedAgent
    ? agentRouteOverrides[selectedAgent.id] || currentMode
    : currentMode
  const selectedStyle = selectedAgent
    ? getCharacterStyle(selectedAgent.id, selectedAgent.name)
    : null
  const selectedBadge = selectedAgent
    ? getAgentStatusBadge(selectedAgent.status, selectedEffectiveMode)
    : null

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

        {/* Center: Department Mode Pills (Shared Across Both 3D & 2D Views) */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-slate-800/80 bg-slate-950/80 p-1 backdrop-blur-md">
          {modeButtons.map((btn) => {
            const isActive = currentMode === btn.mode
            return (
              <button
                key={btn.mode}
                type="button"
                onClick={() => {
                  setCurrentMode(btn.mode)
                  setAgentRouteOverrides({})
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

        {/* Right: Real-time PHT Clock, Live Badge & Instant 3D / 2D Viewport Switcher */}
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

          {/* Segmented 3D / 2D Parity Viewport Switcher */}
          <div className="flex items-center rounded-lg border border-slate-700/80 bg-slate-950/90 p-0.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => router.push('/')}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-bold transition-all whitespace-nowrap ${
                !is2DView
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3D View
            </button>
            <button
              type="button"
              onClick={() => router.push('/?v=2')}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-bold transition-all whitespace-nowrap ${
                is2DView
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2D View
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN COCKPIT BODY (70% 3D/2D Viewport + 30% Sidebar Console)          */}
      {/* ========================================================================= */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left / Center: Synchronized 3D or 2D Isometric Viewport */}
        <section className="relative flex-1 h-full overflow-hidden">
          {is2DView ? (
            <OfficeCanvas2D
              agents={agents}
              mode={currentMode}
              agentRouteOverrides={agentRouteOverrides}
              selectedAgentId={selectedAgent?.id}
              onSelectAgent={(ag) => setSelectedAgent(ag)}
              onResetCamera={() => {
                setCurrentMode('OVERVIEW')
                setAgentRouteOverrides({})
              }}
            />
          ) : (
            <OfficeCanvas3D
              agents={agents}
              mode={currentMode}
              agentRouteOverrides={agentRouteOverrides}
              selectedAgentId={selectedAgent?.id}
              onSelectAgent={(ag) => setSelectedAgent(ag)}
              onResetCamera={() => {
                setCurrentMode('OVERVIEW')
                setAgentRouteOverrides({})
              }}
            />
          )}
        </section>

        {/* Right: 30% Width Sidebar Console */}
        <aside className="w-full md:w-[390px] lg:w-[430px] shrink-0 border-l border-slate-800/80 bg-[#0d111c] flex flex-col overflow-hidden shadow-2xl z-20">
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

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {approvals.length === 0 ? (
                <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-2.5 text-center">
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

          {/* Section B: Interactive Individual Agent Dispatch Drawer */}
          <div className="border-b border-slate-800/80 p-3 shrink-0 bg-slate-900/30">
            <div className="flex items-center justify-between pb-2">
              <span className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
                AGENT INSPECTOR & ROUTING
              </span>
              {selectedAgent && (
                <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase">
                  {selectedAgent.department || selectedAgent.room}
                </span>
              )}
            </div>

            {selectedAgent && selectedStyle && selectedBadge ? (
              <div className="space-y-2.5">
                {/* Profile Card with Distinct Gender/Outfit Avatar Preview */}
                <div className="flex items-center justify-between rounded-lg bg-slate-950/70 p-2.5 border border-slate-800/70">
                  <div className="flex items-center gap-2.5">
                    {/* Distinct Styled Pixel-Agent Avatar Swatch */}
                    <div
                      className="relative flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-700/80 shadow-inner overflow-hidden"
                      style={{ backgroundColor: '#0f172a' }}
                    >
                      {/* Hair */}
                      <div
                        className="h-2 w-5 rounded-t-sm"
                        style={{ backgroundColor: selectedStyle.hairColor }}
                      />
                      {/* Face */}
                      <div
                        className="h-2.5 w-4"
                        style={{ backgroundColor: selectedStyle.skinColor }}
                      />
                      {/* Outfit */}
                      <div
                        className="h-3 w-6 rounded-t-sm"
                        style={{ backgroundColor: selectedStyle.outfitColor }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-100">
                          {selectedAgent.name}
                        </span>
                        <span className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[9px] text-slate-400 uppercase">
                          {selectedStyle.gender === 'female' ? '♀' : '♂'}{' '}
                          {selectedStyle.hairStyle}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {selectedAgent.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 border border-slate-800">
                    <span className={`h-2 w-2 rounded-full ${selectedBadge.dotTailwind}`} />
                    <span className="font-mono text-[10px] font-semibold text-slate-200 whitespace-nowrap">
                      {selectedBadge.label}
                    </span>
                  </div>
                </div>

                {/* Individual Action Buttons (Direct A* Pathfinding Routing) */}
                <div>
                  <div className="font-mono text-[9px] font-bold tracking-wider text-slate-400 uppercase pb-1">
                    DIRECT INDIVIDUAL ROUTING (A* WALKING):
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleRouteIndividualAgent(
                          selectedAgent,
                          'FOCUS_WORK',
                          'working',
                          `Executing sprint tasks at ${selectedAgent.room || 'Workstation'}`
                        )
                      }
                      className={`cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 font-mono text-[10px] font-bold transition-all whitespace-nowrap ${
                        selectedEffectiveMode === 'FOCUS_WORK' ||
                        selectedEffectiveMode === 'OVERVIEW'
                          ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>Send to Work Desk</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRouteIndividualAgent(
                          selectedAgent,
                          'PANTRY',
                          'on_break',
                          'Recharging at Espresso Bar & Pantry Lounge'
                        )
                      }
                      className={`cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 font-mono text-[10px] font-bold transition-all whitespace-nowrap ${
                        selectedEffectiveMode === 'PANTRY'
                          ? 'border-yellow-500/60 bg-yellow-950/50 text-yellow-300'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-yellow-400" />
                      <span>Send to Pantry / Coffee</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRouteIndividualAgent(
                          selectedAgent,
                          'GYM',
                          'on_break',
                          'Active recovery workout in Rec & Gym'
                        )
                      }
                      className={`cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 font-mono text-[10px] font-bold transition-all whitespace-nowrap ${
                        selectedEffectiveMode === 'GYM'
                          ? 'border-pink-500/60 bg-pink-950/50 text-pink-300'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-pink-400" />
                      <span>Send to Gym / Rec</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRouteIndividualAgent(
                          selectedAgent,
                          'ALL_HANDS',
                          'working',
                          'Joining Architecture Standup at The Brain'
                        )
                      }
                      className={`cursor-pointer flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 font-mono text-[10px] font-bold transition-all whitespace-nowrap ${
                        selectedEffectiveMode === 'ALL_HANDS'
                          ? 'border-blue-500/60 bg-blue-950/50 text-blue-300'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      <span>Call to Brain (Scrum)</span>
                    </button>
                  </div>
                </div>

                {/* Live Task & File */}
                <div className="rounded-lg bg-slate-950/40 p-2 border border-slate-800/40 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>CURRENT TASK:</span>
                    <span className="text-slate-200 truncate max-w-[210px]">
                      {selectedAgent.current_task || 'Architecting High-Throughput Pipelines'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>ACTIVE FILE:</span>
                    <span className="text-cyan-400 font-mono truncate max-w-[210px]">
                      {selectedAgent.current_file || 'src/components/office/OfficeCanvas3D.tsx'}
                    </span>
                  </div>
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

                {/* Custom Directive Dispatch Input */}
                <div className="flex gap-1.5 pt-0.5">
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
                    {isDispatching ? '...' : 'Dispatch Directive'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-center font-mono text-xs text-slate-500">
                Click any agent in the office to inspect live runtime telemetry and route them.
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
                  const isComm = line.startsWith('[COMM]') || line.startsWith('[DIRECTIVE]')
                  const isRoute = line.startsWith('[ROUTE]')
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
                          : isRoute
                          ? 'text-emerald-300 font-medium'
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
