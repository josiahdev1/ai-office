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
import { formatPHTTime } from '@/lib/office/db-map'

const STORAGE_MODE_KEY = 'easyup_hq_mode_v3'
const STORAGE_OVERRIDES_KEY = 'easyup_hq_overrides_v3'

function modeToRoomName(mode: DepartmentMode, defaultRoom: string): string {
  switch (mode) {
    case 'GYM':
      return 'Rec & Gym'
    case 'PANTRY':
      return 'Pantry & Canteen'
    case 'ALL_HANDS':
      return 'Command Center ("The Brain")'
    case 'FOCUS_WORK':
    case 'OVERVIEW':
    default:
      return defaultRoom
  }
}

function deriveRouteOverrideFromAgent(agent: Agent): DepartmentMode | undefined {
  const room = (agent.room || '').toLowerCase()
  const status = (agent.status || '').toLowerCase()
  if (status === 'at_gym' || status === 'gym' || room.includes('gym') || room.includes('rec')) {
    return 'GYM'
  }
  if (status === 'on_break' || room.includes('pantry') || room.includes('canteen')) {
    return 'PANTRY'
  }
  if (status === 'in_meeting' || room.includes('brain')) {
    return 'ALL_HANDS'
  }
  return undefined
}

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

  // Office state (SSR-safe initializers to guarantee zero React hydration mismatch)
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
  const [isRosterOpen, setIsRosterOpen] = useState<boolean>(false)
  const [rosterSearch, setRosterSearch] = useState<string>('')
  const [rosterDeptFilter, setRosterDeptFilter] = useState<string>('ALL')

  // Real-time PHT Clock (Asia/Manila, UTC+8)
  const [phtTime, setPhtTime] = useState<string>('')
  const eventCursorRef = useRef<number>(0)

  useEffect(() => {
    function updateClock() {
      setPhtTime(formatPHTTime())
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // 1. Initial State Fetch, Hydration from localStorage + Persisted DB Rooms/Statuses, and Supabase Health Check
  useEffect(() => {
    let isMounted = true

    async function loadInitialData(isFirstLoad = false) {
      if (isFirstLoad && typeof window !== 'undefined') {
        await Promise.resolve()
        if (!isMounted) return
        try {
          const savedMode = window.localStorage.getItem(STORAGE_MODE_KEY)
          if (
            savedMode === 'OVERVIEW' ||
            savedMode === 'FOCUS_WORK' ||
            savedMode === 'ALL_HANDS' ||
            savedMode === 'PANTRY' ||
            savedMode === 'GYM'
          ) {
            setCurrentMode(savedMode)
          }
          const savedOverridesRaw = window.localStorage.getItem(STORAGE_OVERRIDES_KEY)
          if (savedOverridesRaw) {
            const parsed = JSON.parse(savedOverridesRaw) as Record<string, DepartmentMode>
            setAgentRouteOverrides((prev) => ({ ...parsed, ...prev }))
          }
        } catch {
          // Ignore storage read error
        }
      }

      try {
        const res = await fetch('/api/office/status')
        const json = await res.json()
        if (isMounted && json.ok && json.data) {
          const fleet: Agent[] = json.data.agents || []
          setApprovals(json.data.approvals || [])
          if (json.data.dbConnected !== undefined) {
            setSupabaseActive(json.data.dbConnected)
          }

          if (isFirstLoad && fleet.length > 0) {
            setAgents(fleet)
            const savedOverridesRaw =
              typeof window !== 'undefined'
                ? window.localStorage.getItem(STORAGE_OVERRIDES_KEY)
                : null

            // Only derive route overrides from DB if localStorage does not already have an explicit override map
            if (savedOverridesRaw === null) {
              const dbOverrides: Record<string, DepartmentMode> = {}
              for (const ag of fleet) {
                const derived = deriveRouteOverrideFromAgent(ag)
                if (derived) {
                  dbOverrides[ag.id] = derived
                }
              }
              if (Object.keys(dbOverrides).length > 0) {
                setAgentRouteOverrides(dbOverrides)
              }
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

            const bootLog = `${formatPHTTime()} [INFO] [SYSTEM] Synchronized ${fleet.length || 24} agents & 3-phase A* navigation from Supabase.`
            const remoteLogs: string[] = Array.isArray(json.data.logs)
              ? json.data.logs
              : []
            setLogs((prev) =>
              Array.from(new Set([bootLog, ...prev, ...remoteLogs])).slice(0, 45)
            )
          }
        }
      } catch (err) {
        console.error('Failed to load initial office state:', err)
      }
    }

    void loadInitialData(true)

    const pollInterval = setInterval(() => {
      void loadInitialData(false)
    }, 6000)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
    }
  }, [])

  // 2. Real-Time Supabase Subscription (`office-realtime` channel) + Live Session Startup Log
  useEffect(() => {
    let isSubscribed = true

    async function setupRealtime() {
      const isHealthy = await officeSupabase.checkHealth()
      if (isSubscribed) setSupabaseActive(isHealthy)

      if (isHealthy) {
        // Insert a fresh real-time PHT startup log so office_logs reflects current PHT session time
        void officeSupabase.logActivity(
          'SYSTEM',
          'Live PHT telemetry & 3-phase A* pathfinding active on office-v3.',
          { id: 'josiah', name: 'Josiah' },
          'info'
        )

        const remoteMsgs = await officeSupabase.getMessages(15)
        if (isSubscribed && remoteMsgs.length > 0) {
          const formatted = remoteMsgs.map((m) => {
            const ts = m.created_at ? formatPHTTime(new Date(m.created_at)) : formatPHTTime()
            return `${ts} [COMM] ${m.sender_name} -> ${m.receiver_name || 'All'}: "${m.content}"`
          })
          setLogs((prev) => Array.from(new Set([...prev, ...formatted])).slice(0, 50))
        }
      }
    }

    void setupRealtime()

    const unsubscribe = officeSupabase.subscribeToRealtime({
      onMessage: (msg: OfficeMessageRecord) => {
        const ts = msg.created_at ? formatPHTTime(new Date(msg.created_at)) : formatPHTTime()
        const line = `${ts} [COMM] ${msg.sender_name} -> ${msg.receiver_name || 'All'}: "${msg.content}"`
        setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 50))
      },
      onLog: (log: OfficeLogRecord) => {
        const ts = log.created_at ? formatPHTTime(new Date(log.created_at)) : formatPHTTime()
        const line = `${ts} [${(log.category || 'INFO').toUpperCase()}] ${log.agent_name ? `${log.agent_name}: ` : ''}${log.message}`
        setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 50))
      },
      onAgentUpdate: (updatedAgent) => {
        // Never overwrite current_coord or sub_state from realtime while agent is walking in-memory
        setAgents((prev) =>
          prev.map((a) => {
            if (a.id !== updatedAgent.id) return a
            if (a.sub_state === 'walking' || a.sub_state === 'standing_up') {
              return a
            }
            return {
              ...a,
              current_task: updatedAgent.current_task ?? a.current_task,
              progress_pct: updatedAgent.progress_pct ?? a.progress_pct,
            }
          })
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

  // 3. In-memory Office Event Bus + Non-Looping Contextual Telemetry (PHT-aligned)
  useEffect(() => {
    const unsub = officeBus.subscribe((msg) => {
      const line = `${formatPHTTime()} [EVENT] ${msg.fromName}: "${msg.text}"`
      setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 50))
    })

    // Non-looping contextual milestone emitter (fires up to CONTEXTUAL_EVENTS.length times)
    const contextualTimer = setInterval(() => {
      const idx = eventCursorRef.current
      if (idx >= CONTEXTUAL_EVENTS.length) return
      eventCursorRef.current = idx + 1
      const ev = CONTEXTUAL_EVENTS[idx]
      const line = `${formatPHTTime()} [${ev.category}] ${ev.senderName} -> ${ev.receiverName}: "${ev.text}"`
      setLogs((prev) => [line, ...prev.filter((p) => p !== line)].slice(0, 50))
      void officeSupabase.postMessage({
        sender_id: ev.senderId,
        sender_name: ev.senderName,
        recipient_id: ev.receiverId,
        recipient_name: ev.receiverName,
        content: ev.text,
        message_type: 'chat',
      })
      void officeSupabase.logActivity(
        ev.category,
        `${ev.senderName} -> ${ev.receiverName}: ${ev.text}`,
        { id: ev.senderId, name: ev.senderName },
        'info'
      )
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

    const goLog = `${formatPHTTime()} [HUMAN_GO] Go-Signal ${action === 'approve' ? 'AUTHORIZED' : 'REJECTED'} by Josiah for ${item?.title || approvalId}`
    setLogs((prev) => [goLog, ...prev].slice(0, 50))

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

  // Persist agent arrival coordinates and final seated/standing sub_state to Supabase ONLY upon arrival
  const handleAgentArrive = (
    agentId: string,
    finalPos: [number, number, number],
    effectiveMode: DepartmentMode
  ) => {
    const ws = AGENT_WORKSTATIONS_3D[agentId]
    const targetRoom = modeToRoomName(effectiveMode, ws?.room || 'Engineering Core')
    const finalSubState =
      effectiveMode === 'OVERVIEW' || effectiveMode === 'FOCUS_WORK'
        ? 'seated'
        : 'standing'
    const finalStatus: Agent['status'] =
      effectiveMode === 'GYM'
        ? 'at_gym'
        : effectiveMode === 'PANTRY'
        ? 'on_break'
        : effectiveMode === 'ALL_HANDS'
        ? 'in_meeting'
        : 'working'

    setAgents((prev) =>
      prev.map((ag) =>
        ag.id === agentId
          ? {
              ...ag,
              status: finalStatus,
              room: targetRoom,
              current_coord: { x: finalPos[0], y: finalPos[2] },
              sub_state: finalSubState,
            }
          : ag
      )
    )

    void officeSupabase.updateAgent(agentId, {
      status: finalStatus,
      room: targetRoom,
      current_coord: { x: finalPos[0], y: finalPos[2] },
      sub_state: finalSubState,
    })
  }

  // Global Mode Switcher (ALL_HANDS, PANTRY, GYM, FOCUS_WORK, OVERVIEW)
  // Does NOT modify current_coord directly — agents unseat and walk via pathQueue!
  const handleGlobalModeChange = (newMode: DepartmentMode) => {
    setCurrentMode(newMode)
    setAgentRouteOverrides({})
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_MODE_KEY, newMode)
        window.localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify({}))
      } catch {}
    }

    const modeStatus: Agent['status'] =
      newMode === 'GYM'
        ? 'at_gym'
        : newMode === 'PANTRY'
        ? 'on_break'
        : newMode === 'ALL_HANDS'
        ? 'in_meeting'
        : 'working'

    setAgents((prev) =>
      prev.map((ag) => {
        const ws = AGENT_WORKSTATIONS_3D[ag.id]
        const targetCoords = ws ? getAgentTargetPosition(ws, newMode) : [0, 0, 0]
        return {
          ...ag,
          status: modeStatus,
          sub_state: 'standing_up',
          room: modeToRoomName(newMode, ws?.room || ag.room),
          target_coord: { x: targetCoords[0], y: targetCoords[2] },
        }
      })
    )

    const logLine = `${formatPHTTime()} [ROUTE] Global mode switched to ${newMode.replace('_', ' ')} — 24 agents unseating & walking via A* pathQueue.`
    setLogs((prev) => [logLine, ...prev.filter((p) => p !== logLine)].slice(0, 50))

    void officeSupabase.setOfficeMode(newMode)
    void officeSupabase.logActivity(
      'MODE_CHANGE',
      `Global mode switched to ${newMode} — 24 agents walking via staggered A* pathQueue.`,
      { id: 'josiah', name: 'Josiah' },
      'info'
    )
  }

  // Individual Agent Direct Routing ("Send to Work Desk", "Pantry", "Gym", "Brain")
  // Does NOT modify current_coord directly — only sets target_coord and triggers A* pathQueue!
  const handleRouteIndividualAgent = (
    agent: Agent,
    targetMode: DepartmentMode,
    newStatus: Agent['status'],
    taskDescription: string
  ) => {
    sfx?.playTrigger?.()
    const ws = AGENT_WORKSTATIONS_3D[agent.id]
    const targetRoom = modeToRoomName(targetMode, ws?.room || agent.room)
    const coords = ws ? getAgentTargetPosition(ws, currentMode, targetMode) : [0, 0, 0]

    setAgentRouteOverrides((prev) => {
      const next = {
        ...prev,
        [agent.id]: targetMode,
      }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(next))
        } catch {}
      }
      return next
    })

    // IMPORTANT: Do NOT set current_coord here! current_coord is persisted only upon arrival.
    const updates: Partial<Agent> = {
      status: newStatus,
      room: targetRoom,
      current_task: taskDescription,
      target_coord: { x: coords[0], y: coords[2] },
      sub_state: 'standing_up',
    }

    setAgents((prev) =>
      prev.map((a) => (a.id === agent.id ? { ...a, ...updates } : a))
    )
    setSelectedAgent((prev) =>
      prev && prev.id === agent.id ? { ...prev, ...updates } : prev
    )

    const logLine = `${formatPHTTime()} [ROUTE] ${agent.name} standing up & walking via A* pathQueue to ${targetRoom} (${coords[0]}, ${coords[2]}): ${taskDescription}`
    setLogs((prev) => [logLine, ...prev.filter((p) => p !== logLine)].slice(0, 50))

    void officeSupabase.logActivity(
      'AGENT_ROUTE',
      `${agent.name} routed to ${targetRoom} (${targetMode}): ${taskDescription}`,
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
    const ws = AGENT_WORKSTATIONS_3D[selectedAgent.id]
    const homeRoom = ws?.room || selectedAgent.room

    // Route agent to their work desk and set status to working immediately
    setAgentRouteOverrides((prev) => {
      const next = {
        ...prev,
        [selectedAgent.id]: 'FOCUS_WORK' as DepartmentMode,
      }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(next))
        } catch {}
      }
      return next
    })

    setAgents((prev) =>
      prev.map((a) =>
        a.id === selectedAgent.id
          ? { ...a, status: 'working', room: homeRoom, current_task: promptText }
          : a
      )
    )
    setSelectedAgent((prev) =>
      prev
        ? { ...prev, status: 'working', room: homeRoom, current_task: promptText }
        : prev
    )

    const directiveLine = `${formatPHTTime()} [DIRECTIVE] Josiah -> ${selectedAgent.name}: "${promptText}"`
    setLogs((prev) => [directiveLine, ...prev].slice(0, 50))
    void officeSupabase.updateAgent(selectedAgent.id, {
      status: 'working',
      room: homeRoom,
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

  // Real-time Campus Live Counter metrics (Working, Eating, In The Gym, In Meeting, On Break, Arriving, Waiting On You, Open Tasks, Accessories)
  const campusCounters = React.useMemo(() => {
    let working = 0
    let eating = 0
    let inGym = 0
    let inMeeting = 0
    let onBreak = 0
    let arriving = 0
    let waitingOnYou = approvals.length
    let accessories = 0

    agents.forEach((ag, idx) => {
      const style = getCharacterStyle(ag.id, ag.name)
      if (
        style.accessory === 'cap' ||
        style.accessory === 'beanie' ||
        style.accessory === 'headphones'
      ) {
        accessories++
      }

      if (ag.status === 'awaiting_approval') {
        waitingOnYou++
      }

      if (ag.sub_state === 'walking' || ag.sub_state === 'standing_up') {
        arriving++
      }

      const effMode = agentRouteOverrides[ag.id] || currentMode
      const taskLower = (ag.current_task || '').toLowerCase()

      if (effMode === 'GYM' || ag.status === 'at_gym' || ag.status === 'gym') {
        inGym++
      } else if (effMode === 'ALL_HANDS' || ag.status === 'in_meeting') {
        inMeeting++
      } else if (effMode === 'PANTRY' || ag.status === 'on_break') {
        if (
          taskLower.includes('eat') ||
          taskLower.includes('canteen') ||
          taskLower.includes('meal') ||
          taskLower.includes('lunch') ||
          (currentMode === 'PANTRY' && idx % 2 === 0)
        ) {
          eating++
        } else {
          onBreak++
        }
      } else {
        working++
      }
    })

    const openTasks = Math.max(8, Math.round(working * 0.35) + approvals.length)

    return {
      working,
      eating,
      inGym,
      inMeeting,
      onBreak,
      arriving,
      waitingOnYou,
      openTasks,
      accessories,
    }
  }, [agents, agentRouteOverrides, currentMode, approvals.length])

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
                onClick={() => handleGlobalModeChange(btn.mode)}
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

          {/* Clickable Live Roster Button (24 Agents Online) */}
          <button
            type="button"
            onClick={() => setIsRosterOpen((prev) => !prev)}
            className={`cursor-pointer flex items-center gap-2 rounded-lg border px-3 py-1 font-mono text-xs font-bold transition-all whitespace-nowrap ${
              isRosterOpen
                ? 'border-cyan-400 bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'border-emerald-500/40 bg-emerald-950/50 text-emerald-400 hover:bg-emerald-900/60 hover:border-emerald-400'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isRosterOpen ? 'bg-slate-950' : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span className="whitespace-nowrap">
              {agents.length > 0 ? `${agents.length} AGENTS ROSTER` : '24 AGENTS ROSTER'} ▾
            </span>
          </button>

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
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left / Center: Synchronized 3D or 2D Isometric Viewport */}
        <section className="relative flex-1 h-full overflow-hidden">
          {is2DView ? (
            <OfficeCanvas2D
              agents={agents}
              mode={currentMode}
              agentRouteOverrides={agentRouteOverrides}
              selectedAgentId={selectedAgent?.id}
              onSelectAgent={(ag) => setSelectedAgent(ag)}
              onArriveAgent={handleAgentArrive}
              onResetCamera={() => handleGlobalModeChange('OVERVIEW')}
            />
          ) : (
            <OfficeCanvas3D
              agents={agents}
              mode={currentMode}
              agentRouteOverrides={agentRouteOverrides}
              selectedAgentId={selectedAgent?.id}
              onSelectAgent={(ag) => setSelectedAgent(ag)}
              onArriveAgent={handleAgentArrive}
              onResetCamera={() => handleGlobalModeChange('OVERVIEW')}
            />
          )}
        </section>

        {/* ===================================================================== */}
        {/* SLIDE-OVER FULL AI AGENT ROSTER DRAWER (Search, Filter & Quick Route) */}
        {/* ===================================================================== */}
        {isRosterOpen && (
          <div className="absolute inset-y-0 right-0 md:right-[390px] lg:right-[430px] w-full max-w-md bg-[#0a0e17]/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-40 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs font-black tracking-wider text-slate-100 uppercase">
                  AI AGENT ROSTER ({agents.length} ONLINE)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsRosterOpen(false)}
                className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white whitespace-nowrap"
              >
                Close ✕
              </button>
            </div>

            {/* Search & Department Filter Bar */}
            <div className="border-b border-slate-800/80 p-3 space-y-2 bg-slate-950/60">
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search agent by name, role, or room..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {['ALL', 'ENGINEERING', 'QA', 'GROWTH', 'INTELLIGENCE', 'OPERATIONS', 'COMMAND'].map(
                  (dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setRosterDeptFilter(dept)}
                      className={`cursor-pointer rounded-md px-2 py-0.5 font-mono text-[10px] font-bold transition-colors whitespace-nowrap ${
                        rosterDeptFilter === dept
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {dept}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Scrollable List of All 24 Agents */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {agents
                .filter((ag) => {
                  const q = rosterSearch.trim().toLowerCase()
                  const matchesSearch =
                    !q ||
                    ag.name.toLowerCase().includes(q) ||
                    (ag.role || '').toLowerCase().includes(q) ||
                    (ag.room || '').toLowerCase().includes(q) ||
                    (ag.department || '').toLowerCase().includes(q)
                  const deptStr = `${ag.department || ''} ${ag.room || ''} ${ag.role || ''}`.toUpperCase()
                  const matchesDept =
                    rosterDeptFilter === 'ALL' || deptStr.includes(rosterDeptFilter)
                  return matchesSearch && matchesDept
                })
                .map((ag) => {
                  const effMode = agentRouteOverrides[ag.id] || currentMode
                  const stStyle = getCharacterStyle(ag.id, ag.name)
                  const stBadge = getAgentStatusBadge(ag.status, effMode)
                  const isSel = selectedAgent?.id === ag.id
                  return (
                    <div
                      key={ag.id}
                      onClick={() => setSelectedAgent(ag)}
                      className={`cursor-pointer rounded-xl border p-2.5 transition-all ${
                        isSel
                          ? 'border-cyan-500/80 bg-cyan-950/30 shadow-md'
                          : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="relative flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-700/80 overflow-hidden"
                            style={{ backgroundColor: '#0f172a' }}
                          >
                            <div
                              className="h-1.5 w-4 rounded-t-sm"
                              style={{ backgroundColor: stStyle.hairColor }}
                            />
                            <div
                              className="h-2 w-3.5"
                              style={{ backgroundColor: stStyle.skinColor }}
                            />
                            <div
                              className="h-2.5 w-5 rounded-t-sm"
                              style={{ backgroundColor: stStyle.outfitColor }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-slate-100 truncate">
                                {ag.name}
                              </span>
                              <span className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] text-slate-400 uppercase whitespace-nowrap">
                                {stStyle.gender === 'female' ? '♀' : '♂'}
                              </span>
                            </div>
                            <div className="font-mono text-[10px] text-slate-400 truncate">
                              {ag.role} • <span className="text-cyan-400">{ag.room}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-full bg-slate-950 px-2 py-0.5 border border-slate-800 shrink-0">
                          <span className={`h-2 w-2 rounded-full ${stBadge.dotTailwind}`} />
                          <span className="font-mono text-[9px] font-semibold text-slate-200 whitespace-nowrap">
                            {stBadge.label}
                          </span>
                        </div>
                      </div>

                      {/* Quick 1-Click Route Buttons inside Roster Card */}
                      <div
                        className="mt-2 grid grid-cols-4 gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAgent(ag)
                            handleRouteIndividualAgent(
                              ag,
                              'FOCUS_WORK',
                              'working',
                              `Executing sprint tasks at ${ag.room || 'Workstation'}`
                            )
                          }}
                          className={`cursor-pointer rounded border px-1.5 py-1 font-mono text-[9px] font-bold transition-colors whitespace-nowrap ${
                            effMode === 'FOCUS_WORK' || effMode === 'OVERVIEW'
                              ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300'
                              : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          💻 Desk
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAgent(ag)
                            handleRouteIndividualAgent(
                              ag,
                              'PANTRY',
                              'on_break',
                              'Recharging at Espresso Bar & Pantry Lounge'
                            )
                          }}
                          className={`cursor-pointer rounded border px-1.5 py-1 font-mono text-[9px] font-bold transition-colors whitespace-nowrap ${
                            effMode === 'PANTRY'
                              ? 'border-yellow-500/60 bg-yellow-950/60 text-yellow-300'
                              : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          ☕ Pantry
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAgent(ag)
                            handleRouteIndividualAgent(
                              ag,
                              'GYM',
                              'at_gym',
                              'Active recovery workout in Rec & Gym'
                            )
                          }}
                          className={`cursor-pointer rounded border px-1.5 py-1 font-mono text-[9px] font-bold transition-colors whitespace-nowrap ${
                            effMode === 'GYM'
                              ? 'border-pink-500/60 bg-pink-950/60 text-pink-300'
                              : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          🏋️ Gym
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAgent(ag)
                            handleRouteIndividualAgent(
                              ag,
                              'ALL_HANDS',
                              'in_meeting',
                              'Joining Architecture Standup at The Brain'
                            )
                          }}
                          className={`cursor-pointer rounded border px-1.5 py-1 font-mono text-[9px] font-bold transition-colors whitespace-nowrap ${
                            effMode === 'ALL_HANDS'
                              ? 'border-blue-500/60 bg-blue-950/60 text-blue-300'
                              : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          🧠 Brain
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Right: 30% Width Sidebar Console */}
        <aside className="w-full md:w-[390px] lg:w-[430px] shrink-0 border-l border-slate-800/80 bg-[#0d111c] flex flex-col overflow-y-auto shadow-2xl z-20">
          {/* Section 0: CAMPUS LIVE COUNTER (Real-Time Activity & Telemetry Breakdown) */}
          <div className="border-b border-slate-800/80 p-3.5 shrink-0 bg-slate-950/50">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/70">
              <span className="font-mono text-[11px] font-black tracking-widest text-slate-300 uppercase">
                CAMPUS LIVE COUNTER
              </span>
              <span className="font-mono text-[10px] font-bold text-emerald-400">
                {agents.length} ONLINE
              </span>
            </div>

            <div className="mt-2.5 flex flex-col gap-1.5 font-mono text-xs">
              <button
                type="button"
                onClick={() => handleGlobalModeChange('FOCUS_WORK')}
                className="cursor-pointer flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-slate-800/60 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-slate-200 font-bold tracking-wide whitespace-nowrap">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }}
                  />
                  WORKING
                </span>
                <span className="font-black" style={{ color: '#10b981' }}>
                  {campusCounters.working}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleGlobalModeChange('PANTRY')}
                className="cursor-pointer flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-slate-800/60 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-slate-200 font-bold tracking-wide whitespace-nowrap">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#f97316', boxShadow: '0 0 8px #f97316' }}
                  />
                  EATING
                </span>
                <span className="font-black" style={{ color: '#f97316' }}>
                  {campusCounters.eating}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleGlobalModeChange('GYM')}
                className="cursor-pointer flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-slate-800/60 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-slate-200 font-bold tracking-wide whitespace-nowrap">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }}
                  />
                  IN THE GYM
                </span>
                <span className="font-black" style={{ color: '#06b6d4' }}>
                  {campusCounters.inGym}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleGlobalModeChange('ALL_HANDS')}
                className="cursor-pointer flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-slate-800/60 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-slate-200 font-bold tracking-wide whitespace-nowrap">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#d946ef', boxShadow: '0 0 8px #d946ef' }}
                  />
                  IN MEETING
                </span>
                <span className="font-black" style={{ color: '#d946ef' }}>
                  {campusCounters.inMeeting}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleGlobalModeChange('PANTRY')}
                className="cursor-pointer flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-slate-800/60 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-slate-200 font-bold tracking-wide whitespace-nowrap">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#eab308', boxShadow: '0 0 8px #eab308' }}
                  />
                  ON BREAK
                </span>
                <span className="font-black" style={{ color: '#eab308' }}>
                  {campusCounters.onBreak}
                </span>
              </button>

              <div className="flex w-full items-center justify-between rounded-md px-2 py-1">
                <span className="flex items-center gap-2.5 text-slate-200 font-bold tracking-wide whitespace-nowrap">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#0ea5e9', boxShadow: '0 0 8px #0ea5e9' }}
                  />
                  ARRIVING
                </span>
                <span className="font-black" style={{ color: '#0ea5e9' }}>
                  {campusCounters.arriving}
                </span>
              </div>

              <div className="flex w-full items-center justify-between rounded-md px-2 py-1">
                <span className="flex items-center gap-2.5 text-slate-200 font-bold tracking-wide whitespace-nowrap">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#ef4444', boxShadow: '0 0 8px #ef4444' }}
                  />
                  WAITING ON YOU
                </span>
                <span className="font-black" style={{ color: '#ef4444' }}>
                  {campusCounters.waitingOnYou}
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-slate-800/70 flex flex-col gap-1.5 font-mono text-xs">
              <div className="flex items-center justify-between px-2">
                <span className="text-slate-400 font-semibold tracking-wide whitespace-nowrap">
                  OPEN TASKS
                </span>
                <span className="font-black text-slate-100">{campusCounters.openTasks}</span>
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-slate-400 font-semibold tracking-wide whitespace-nowrap">
                  ACCESSORIES
                </span>
                <span className="font-black" style={{ color: '#10b981' }}>
                  {campusCounters.accessories}
                </span>
              </div>
            </div>
          </div>

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
              <button
                type="button"
                onClick={() => setIsRosterOpen((prev) => !prev)}
                className="cursor-pointer rounded-md border border-cyan-500/40 bg-cyan-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 hover:bg-cyan-900/60 transition-colors whitespace-nowrap"
              >
                {isRosterOpen ? 'Hide Roster ✕' : `All Agents (${agents.length}) ☰`}
              </button>
            </div>

            {/* Quick Horizontal Agent Switcher Strip */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 border-b border-slate-800/60">
              {agents.map((ag) => {
                const eff = agentRouteOverrides[ag.id] || currentMode
                const bdg = getAgentStatusBadge(ag.status, eff)
                const active = selectedAgent?.id === ag.id
                return (
                  <button
                    key={ag.id}
                    type="button"
                    onClick={() => setSelectedAgent(ag)}
                    className={`cursor-pointer flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold transition-all whitespace-nowrap shrink-0 ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                        : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${bdg.dotTailwind}`} />
                    <span>{ag.name}</span>
                  </button>
                )
              })}
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
                          'at_gym',
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
                          'in_meeting',
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
                  const isComm = line.includes('[COMM]') || line.includes('[DIRECTIVE]')
                  const isRoute = line.includes('[ROUTE]') || line.includes('AGENT_ROUTE')
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
