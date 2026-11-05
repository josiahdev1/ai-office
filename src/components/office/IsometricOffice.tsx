'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { Agent, Approval } from './types'
import { PixelSprite } from './pixel-sprites'
import { sfx } from './audio'
import {
  calculateCorridorPath,
  stepAgentTowardsTarget,
  getModeTargets,
  OfficeMode,
  Point2D,
} from '@/lib/office/pathfinding'
import {
  ASSIGNED_DESKS,
  OFFICE_ZONES,
  gridToScreen,
  DeskSlot,
} from '@/lib/office/map'
import { officeBus } from '@/lib/office/bus'
import { dialogueEngine } from '@/lib/office/dialogueEngine'
import { officeSupabase } from '@/lib/supabase/officeService'

export interface IsometricOfficeProps {
  agents: Agent[]
  approvals?: Approval[]
  onSelectAgent: (agent: Agent | null) => void
  selectedAgentId?: string | null
  speedMode?: '1x' | '2x' | '5x'
  onSpeedChange?: (speed: '1x' | '2x' | '5x') => void
  onGoSignal?: (approvalId: string, action: 'approve' | 'reject') => void
  onDispatchDirective?: (agentId: string, directive: string) => Promise<void>
  logs?: string[]
  doneToday?: Array<{ id: string; title: string; agent: string; time: string }>
  supabaseActive?: boolean
}

interface AgentSimState {
  x: number
  y: number
  waypoints: Point2D[]
  targetX: number
  targetY: number
  isWalking: boolean
  walkFrame: number
  facing: 'left' | 'right'
  hasCoffee: boolean
  isSeated: boolean
  activity: string
  breakTimer: number
}

// Convert ASSIGNED_DESKS to quick lookup
export const DESK_CONFIGS: Record<string, DeskSlot & { x: number; y: number; facingDirection: 'left' | 'right' }> = {}
ASSIGNED_DESKS.forEach((d) => {
  const screenPos = gridToScreen(d.chairGx, d.chairGy)
  DESK_CONFIGS[d.agentId] = {
    ...d,
    x: screenPos.x,
    y: screenPos.y,
    facingDirection: d.facing === 'SW' || d.facing === 'NW' ? 'left' : 'right',
  }
})

export function IsometricOffice({
  agents,
  approvals = [],
  onSelectAgent,
  selectedAgentId,
  onGoSignal,
  onDispatchDirective,
  logs = [],
  doneToday = [],
  supabaseActive = false,
}: IsometricOfficeProps) {
  // Navigation & Viewport State
  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Office Modes & Audio
  const [currentMode, setCurrentMode] = useState<OfficeMode>('FOCUS_WORK')
  const currentModeRef = useRef<OfficeMode>('FOCUS_WORK')
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Philippine Standard Time (PHT - UTC+8) Real-Time Clock
  const [phtTimeString, setPhtTimeString] = useState('')

  useEffect(() => {
    const updatePHT = () => {
      const now = new Date()
      const utc = now.getTime() + now.getTimezoneOffset() * 60000
      const pht = new Date(utc + 3600000 * 8)
      setPhtTimeString(
        pht.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      )
    }
    updatePHT()
    const timer = setInterval(updatePHT, 10000)
    return () => clearInterval(timer)
  }, [])

  // UI Panels & Modals
  const [showAgentsDrawer, setShowAgentsDrawer] = useState(false)
  const [showLayoutOverlay, setShowLayoutOverlay] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showGoSignalModal, setShowGoSignalModal] = useState(false)
  const [showTelemetryModal, setShowTelemetryModal] = useState(false)
  const [directiveInput, setDirectiveInput] = useState('')
  const [isSubmittingDirective, setIsSubmittingDirective] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL')
  const [spawnToast, setSpawnToast] = useState<string | null>(null)

  // Dialogue & Inter-Agent Laser Links
  const [activeSpeech, setActiveSpeech] = useState<Record<string, string>>({})
  const [activeLaserLink, setActiveLaserLink] = useState<{
    from: Point2D
    to: Point2D
  } | null>(null)

  // Simulation positions state
  const [renderPositions, setRenderPositions] = useState<
    Record<string, { x: number; y: number; isWalking: boolean; walkFrame: number; facing: 'left' | 'right'; hasCoffee: boolean; isSeated: boolean; activity: string }>
  >({})

  // Physics simulation state ref
  const simStateRef = useRef<Record<string, AgentSimState>>({})

  // Initialize simulation positions for all agents
  useEffect(() => {
    agents.forEach((agent) => {
      if (!simStateRef.current[agent.id]) {
        const desk = DESK_CONFIGS[agent.id]
        const fallback = desk ? { x: desk.x, y: desk.y } : { x: 540, y: 340 }
        simStateRef.current[agent.id] = {
          x: fallback.x,
          y: fallback.y,
          waypoints: [],
          targetX: fallback.x,
          targetY: fallback.y,
          isWalking: false,
          walkFrame: 0,
          facing: desk?.facingDirection || 'right',
          hasCoffee: false,
          isSeated: true,
          activity: 'typing',
          breakTimer: 0,
        }
      }
    })
  }, [agents])

  const agentsRef = useRef(agents)
  useEffect(() => {
    agentsRef.current = agents
  }, [agents])

  // Responsive Auto-Fit Camera to Screen
  const fitOverviewCamera = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const scaleX = (rect.width - 40) / 1400
    const scaleY = (rect.height - 40) / 800
    const fitScale = Math.max(0.6, Math.min(scaleX, scaleY, 1.05))
    setZoom(fitScale)
    setPan({ x: 0, y: -20 })
  }, [])

  useEffect(() => {
    fitOverviewCamera()
    const t = setTimeout(fitOverviewCamera, 150)
    window.addEventListener('resize', fitOverviewCamera)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', fitOverviewCamera)
    }
  }, [fitOverviewCamera])

  // Non-passive wheel zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheelNonPassive = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92
      setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.45), 2.2))
    }
    el.addEventListener('wheel', handleWheelNonPassive, { passive: false })
    return () => el.removeEventListener('wheel', handleWheelNonPassive)
  }, [])

  // Authentic inter-agent dialogue cycle
  useEffect(() => {
    const chatInterval = setInterval(() => {
      const dialogue = dialogueEngine.getNextDialogue()
      if (!dialogue) return

      const sim = simStateRef.current
      const senderSim = sim[dialogue.from]
      const recipientSim = sim[dialogue.to]

      try {
        if (soundEnabled) sfx?.playBlip?.(720)
      } catch {}

      setActiveSpeech((prev) => ({ ...prev, [dialogue.from]: dialogue.text }))
      if (senderSim && recipientSim) {
        setActiveLaserLink({
          from: { x: senderSim.x, y: senderSim.y },
          to: { x: recipientSim.x, y: recipientSim.y },
        })
      }

      officeBus.publish({
        from: dialogue.from,
        fromName: dialogue.fromName,
        to: dialogue.to,
        toName: dialogue.toName,
        text: dialogue.text,
      })

      // Send to Supabase asynchronously
      void officeSupabase.postMessage({
        sender_id: dialogue.from,
        sender_name: dialogue.fromName,
        receiver_id: dialogue.to,
        receiver_name: dialogue.toName,
        content: dialogue.text,
      })

      // Reply after short delay
      setTimeout(() => {
        try {
          if (soundEnabled) sfx?.playBlip?.(840)
        } catch {}
        setActiveSpeech((prev) => ({ ...prev, [dialogue.to]: dialogue.replyText }))
        officeBus.publish({
          from: dialogue.to,
          fromName: dialogue.toName,
          to: dialogue.from,
          toName: dialogue.fromName,
          text: dialogue.replyText,
        })
      }, 2400)

      // Fade speech bubbles and laser
      setTimeout(() => {
        setActiveLaserLink(null)
      }, 4200)

      setTimeout(() => {
        setActiveSpeech((prev) => {
          const next = { ...prev }
          delete next[dialogue.from]
          delete next[dialogue.to]
          return next
        })
      }, 6500)
    }, 11000)

    return () => clearInterval(chatInterval)
  }, [soundEnabled])

  // Switch Office Mode (Smooth A* Pathfinding without Teleportation)
  const switchOfficeMode = useCallback(
    (newMode: OfficeMode) => {
      setCurrentMode(newMode)
      try {
        if (soundEnabled) sfx?.playModeSwitch?.()
      } catch {}

      // Update in Supabase
      void officeSupabase.setOfficeMode(newMode)

      // Smoothly pan camera to the active zone
      if (newMode === 'FOCUS_WORK') {
        setPan({ x: 0, y: -20 })
        setZoom(0.85)
      } else if (newMode === 'ALL_HANDS') {
        setPan({ x: 0, y: 40 })
        setZoom(1.05)
      } else if (newMode === 'COFFEE_BREAK') {
        setPan({ x: -220, y: -100 })
        setZoom(1.0)
      } else if (newMode === 'RECREATION') {
        setPan({ x: 0, y: -200 })
        setZoom(1.0)
      }

      const sim = simStateRef.current
      agentsRef.current.forEach((agent, idx) => {
        const currentSim = sim[agent.id]
        if (!currentSim) return

        const desk = DESK_CONFIGS[agent.id]
        const fallback = desk ? { x: desk.x, y: desk.y } : { x: 540, y: 340 }
        const finalTarget = getModeTargets(newMode, agent.id, idx, fallback)

        // Calculate smooth A* path avoiding furniture
        const waypoints = calculateCorridorPath(
          { x: currentSim.x, y: currentSim.y },
          finalTarget
        )

        currentSim.waypoints = waypoints
        currentSim.isWalking = true
        currentSim.isSeated = false
        currentSim.hasCoffee = newMode === 'COFFEE_BREAK'
        currentSim.activity = 'walking'
        currentSim.breakTimer = 0

        if (waypoints.length > 0) {
          currentSim.targetX = waypoints[0].x
          currentSim.targetY = waypoints[0].y
        }
      })
    },
    [soundEnabled]
  )

  useEffect(() => {
    currentModeRef.current = currentMode
  }, [currentMode])

  // 60 FPS Physics Movement Loop
  useEffect(() => {
    let animId: number
    let lastTime = performance.now()
    let frameTick = 0

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000
      lastTime = now
      const dt = Math.min(Math.max(rawDt, 0.005), 0.05)
      frameTick++

      const walkSpeed = 72 // Pixels per second at 1x real time
      const sim = simStateRef.current
      const activeMode = currentModeRef.current
      let hasStateChanged = false

      Object.keys(sim).forEach((agentId) => {
        const state = sim[agentId]
        if (!state) return

        if (!Number.isFinite(state.x) || !Number.isFinite(state.y)) {
          const cfg = DESK_CONFIGS[agentId] || { x: 540, y: 340 }
          state.x = cfg.x
          state.y = cfg.y
        }

        // 1. Waypoint movement
        if (state.isWalking) {
          const stepResult = stepAgentTowardsTarget(
            { x: state.x, y: state.y },
            { x: state.targetX, y: state.targetY },
            walkSpeed,
            dt,
            3.0
          )

          state.x = stepResult.next.x
          state.y = stepResult.next.y

          if (stepResult.dx !== 0) {
            state.facing = stepResult.dx > 0 ? 'right' : 'left'
          }

          if (frameTick % 6 === 0) {
            state.walkFrame = (state.walkFrame + 1) % 4
          }

          if (stepResult.arrived) {
            state.waypoints.shift()
            if (state.waypoints.length > 0) {
              state.targetX = state.waypoints[0].x
              state.targetY = state.waypoints[0].y
            } else {
              // Reached final destination
              state.isWalking = false

              if (activeMode === 'FOCUS_WORK') {
                state.isSeated = true
                state.hasCoffee = false
                state.activity = 'typing'
              } else if (activeMode === 'ALL_HANDS') {
                state.isSeated = true
                state.hasCoffee = false
                state.activity = 'seated_meeting'
              } else if (activeMode === 'COFFEE_BREAK') {
                state.isSeated = true
                state.hasCoffee = true
                state.activity = 'eating_canteen'
              } else if (activeMode === 'RECREATION') {
                state.isSeated = false
                state.activity = 'working_out'
              }
            }
          }
          hasStateChanged = true
        }
      })

      if (hasStateChanged || frameTick % 3 === 0) {
        const nextRender: Record<
          string,
          {
            x: number
            y: number
            isWalking: boolean
            walkFrame: number
            facing: 'left' | 'right'
            hasCoffee: boolean
            isSeated: boolean
            activity: string
          }
        > = {}
        Object.keys(sim).forEach((k) => {
          const s = sim[k]
          nextRender[k] = {
            x: s.x,
            y: s.y,
            isWalking: s.isWalking,
            walkFrame: s.walkFrame,
            facing: s.facing,
            hasCoffee: s.hasCoffee,
            isSeated: s.isSeated,
            activity: s.activity,
          }
        })
        setRenderPositions(nextRender)
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [])

  // Center on agent when selected from external UI
  const handleSelectAgentAndFollow = useCallback((agent: Agent) => {
    onSelectAgent(agent)
    try {
      if (soundEnabled) sfx?.playSelect?.()
    } catch {}

    const sim = simStateRef.current[agent.id]
    if (sim) {
      setPan({
        x: -(sim.x - 700) * zoom,
        y: -(sim.y - 420) * zoom,
      })
    }
  }, [onSelectAgent, soundEnabled, zoom])

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.15, 2.2))
  const handleZoomOut = () => setZoom((z) => Math.max(z * 0.85, 0.45))

  // Filtered agents for AGENTS drawer
  const filteredAgents = useMemo(() => {
    return agents.filter((ag) => {
      const matchesSearch =
        ag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ag.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ag.room.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDept =
        selectedDeptFilter === 'ALL' || ag.room === selectedDeptFilter
      return matchesSearch && matchesDept
    })
  }, [agents, searchQuery, selectedDeptFilter])

  // Dynamic depth-sorted list of agents
  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      const posA = renderPositions[a.id]?.y || 340
      const posB = renderPositions[b.id]?.y || 340
      return posA - posB
    })
  }, [agents, renderPositions])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#080b12] select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'default' }}
    >
      {/* ==================== 1. TOP HEADER HUD ==================== */}
      <header className="pointer-events-none absolute top-3 right-3 left-3 z-40 flex items-center justify-between gap-3">
        {/* Left: Brand Capsule */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-[#1e283d] bg-[#0c101a]/95 px-3 py-1.5 shadow-xl backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="font-mono text-xs font-bold tracking-wider text-slate-100 whitespace-nowrap uppercase">
              EasyUp Headquarters
            </span>
            <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 whitespace-nowrap">
              {agents.length} AGENTS
            </span>
            {supabaseActive && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded bg-blue-950/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-300 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                SYNCED
              </span>
            )}
          </div>
        </div>

        {/* Center: Horizontal Scrolling Agent Status Chips & Go-Signal Trigger */}
        <div className="pointer-events-auto flex max-w-[50vw] items-center gap-2">
          {approvals && approvals.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setShowGoSignalModal(true)
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/80 bg-amber-950/90 px-2.5 py-1.5 font-mono text-xs font-bold text-amber-300 shadow-xl shadow-amber-950/50 transition hover:bg-amber-900 active:scale-95 animate-pulse whitespace-nowrap"
              title="Pending Go-Signals Require Approval"
            >
              <span>⚠️</span>
              <span>WAITING FOR YOU ({approvals.length})</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-[#1e283d]/80 bg-[#0c101a]/90 p-1 shadow-lg backdrop-blur-md scrollbar-none">
            {agents.map((ag) => {
              const isSelected = selectedAgentId === ag.id
              return (
                <button
                  key={ag.id}
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectAgentAndFollow(ag)
                  }}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] whitespace-nowrap transition active:scale-95 ${
                    isSelected
                      ? 'border border-amber-400/80 bg-amber-950/60 text-amber-200'
                      : 'border border-transparent bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                  title={`Click to focus on ${ag.name} (${ag.role})`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      ag.status === 'working'
                        ? 'bg-emerald-400'
                        : ag.status === 'awaiting_approval'
                          ? 'animate-ping bg-amber-400'
                          : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-semibold">{ag.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Manila Time, Sound Toggle, Reset Overview */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Philippine Standard Time Badge */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#1e283d] bg-[#0c101a]/95 px-2.5 py-1.5 font-mono text-xs text-slate-300 shadow-xl backdrop-blur-md whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-bold text-slate-100">{phtTimeString || '09:00 AM'}</span>
            <span className="text-[10px] text-slate-400">PHT (UTC+8)</span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              const next = !soundEnabled
              setSoundEnabled(next)
              if (sfx) {
                sfx.enabled = next
                if (next) sfx.playBlip(700)
              }
            }}
            className={`cursor-pointer rounded-lg border px-2.5 py-1.5 font-mono text-xs whitespace-nowrap shadow-xl backdrop-blur-md transition ${
              soundEnabled
                ? 'border-emerald-600/80 bg-emerald-950/80 text-emerald-300'
                : 'border-[#1e283d] bg-[#0c101a]/90 text-slate-400 hover:text-slate-200'
            }`}
          >
            {soundEnabled ? '🔊 SFX' : '🔇 MUTED'}
          </button>
        </div>
      </header>

      {/* ==================== 2. TOP-LEFT FLOATING ZOOM CONTROLS ==================== */}
      <div className="pointer-events-auto absolute top-16 left-3 z-30 flex flex-col rounded-lg border border-[#1e283d] bg-[#0c101a]/95 p-1 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            handleZoomIn()
          }}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded font-mono text-sm font-bold text-slate-200 transition hover:bg-slate-800 active:scale-95"
          title="Zoom In"
        >
          +
        </button>
        <div className="my-0.5 h-px bg-[#1e283d]" />
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            handleZoomOut()
          }}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded font-mono text-sm font-bold text-slate-200 transition hover:bg-slate-800 active:scale-95"
          title="Zoom Out"
        >
          -
        </button>
        <div className="my-0.5 h-px bg-[#1e283d]" />
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            fitOverviewCamera()
          }}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded font-mono text-[10px] text-cyan-400 transition hover:bg-slate-800 active:scale-95"
          title="Reset to Fit Overview"
        >
          ⛶
        </button>
      </div>

      {/* ==================== 3. 2.5D ISOMETRIC VIEWPORT ==================== */}
      <main className="relative flex h-full w-full flex-1 items-center justify-center overflow-hidden">
        <div
          className="relative origin-center transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: '1400px',
            height: '860px',
            flexShrink: 0,
          }}
        >
          {/* SVG Floor, Cutaway Charcoal Walls & Architecture */}
          <svg
            viewBox="0 0 1400 860"
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ imageRendering: 'pixelated' }}
          >
            <defs>
              {/* Warm cream/beige floor tile pattern */}
              <pattern
                id="warmFloorTile"
                width="64"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <polygon
                  points="32,0 64,16 32,32 0,16"
                  fill="#e5dec9"
                  stroke="#cfc6b0"
                  strokeWidth="0.8"
                />
              </pattern>

              {/* The Brain pulsing cyan holographic core */}
              <radialGradient id="brainHoloGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.45" />
                <stop offset="70%" stopColor="#0284c7" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
              </radialGradient>

              {/* Server rack LED glow */}
              <radialGradient id="serverLedGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ==================== 3D FLOATING SLAB EXTRUSION (BEVEL EDGES) ==================== */}
            {/* Left Slab Thickness Face */}
            <polygon
              points="124,408 124,438 700,726 700,696"
              fill="#121620"
              stroke="#1c2333"
              strokeWidth="1.2"
            />
            {/* Right Slab Thickness Face */}
            <polygon
              points="700,696 700,726 1276,438 1276,408"
              fill="#181e2b"
              stroke="#242c3d"
              strokeWidth="1.2"
            />

            {/* ==================== ONE CONTINUOUS WARM BEIGE FLOOR SLAB ==================== */}
            {/* Diamond Slab: Top (700, 120), Right (1276, 408), Bottom (700, 696), Left (124, 408) */}
            <polygon
              points="700,120 1276,408 700,696 124,408"
              fill="#e2d9c4"
              stroke="#b5aa92"
              strokeWidth="2"
            />

            {/* Subtle Grout Lines Across Floor Slab */}
            <g stroke="#cfc5ae" strokeWidth="0.6" strokeOpacity="0.45">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((i) => {
                const x1 = 700 - i * 32
                const y1 = 120 + i * 16
                const x2 = 1276 - i * 32
                const y2 = 408 + i * 16

                const x3 = 700 + i * 32
                const y3 = 120 + i * 16
                const x4 = 124 + i * 32
                const y4 = 408 + i * 16
                return (
                  <React.Fragment key={`grid-${i}`}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} />
                    <line x1={x3} y1={y3} x2={x4} y2={y4} />
                  </React.Fragment>
                )
              })}
            </g>

            {/* ==================== LAYOUT PLAN OVERLAY (WHEN TOGGLED) ==================== */}
            {showLayoutOverlay && (
              <g className="transition-opacity duration-300">
                {OFFICE_ZONES.map((zone) => {
                  const p1 = gridToScreen(zone.rect.x, zone.rect.y)
                  const p2 = gridToScreen(zone.rect.x + zone.rect.w, zone.rect.y)
                  const p3 = gridToScreen(
                    zone.rect.x + zone.rect.w,
                    zone.rect.y + zone.rect.h
                  )
                  const p4 = gridToScreen(zone.rect.x, zone.rect.y + zone.rect.h)
                  const center = gridToScreen(
                    zone.rect.x + zone.rect.w / 2,
                    zone.rect.y + zone.rect.h / 2
                  )
                  return (
                    <g key={zone.id}>
                      <polygon
                        points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                        fill={zone.color}
                        fillOpacity="0.16"
                        stroke={zone.color}
                        strokeWidth="1.8"
                        strokeDasharray="4 2"
                      />
                      <text
                        x={center.x}
                        y={center.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="monospace"
                        className="select-none"
                        style={{
                          paintOrder: 'stroke',
                          stroke: '#080b12',
                          strokeWidth: 3,
                          strokeLinejoin: 'round',
                        }}
                      >
                        {zone.label || zone.name}
                      </text>
                    </g>
                  )
                })}
              </g>
            )}

            {/* ==================== TWO TALL CHARCOAL CUTAWAY BACK WALLS ==================== */}
            {/* Top-Left Back Wall (From Left (124, 408) to Top (700, 120)) */}
            <polygon
              points="124,408 124,338 700,50 700,120"
              fill="#181c26"
              stroke="#222735"
              strokeWidth="1.5"
            />
            {/* Top-Left Wall Cap */}
            <polygon
              points="124,338 138,331 714,43 700,50"
              fill="#2e3546"
              stroke="#3b4459"
              strokeWidth="1"
            />

            {/* Top-Right Back Wall (From Top (700, 120) to Right (1276, 408)) */}
            <polygon
              points="700,120 700,50 1276,338 1276,408"
              fill="#1e222d"
              stroke="#2a303e"
              strokeWidth="1.5"
            />
            {/* Top-Right Wall Cap */}
            <polygon
              points="700,50 714,43 1290,331 1276,338"
              fill="#333b4e"
              stroke="#404a60"
              strokeWidth="1"
            />

            {/* Wall Monitor / Code Screen on Top-Right Back Wall */}
            <g transform="translate(940, 200)">
              <polygon
                points="-50, -10 50, -35 50, 20 -50, 45"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <line x1="-35" y1="5" x2="35" y2="-12" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 2" />
              <line x1="-35" y1="18" x2="20" y2="4" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
            </g>

            {/* Round Wall Clock on Top-Right Wall */}
            <g transform="translate(1080, 270)">
              <ellipse cx="0" cy="0" rx="14" ry="18" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="0" y1="0" x2="0" y2="-10" stroke="#f8fafc" strokeWidth="1.5" />
              <line x1="0" y1="0" x2="7" y2="3" stroke="#ef4444" strokeWidth="1" />
            </g>

            {/* Wall Bookshelf on Top-Left Wall */}
            <g transform="translate(240, 310)">
              <polygon
                points="0,0 60,-30 60,30 0,60"
                fill="#2b1810"
                stroke="#452718"
                strokeWidth="1.5"
              />
              <line x1="10" y1="5" x2="10" y2="45" stroke="#ef4444" strokeWidth="3" />
              <line x1="18" y1="1" x2="18" y2="41" stroke="#3b82f6" strokeWidth="3" />
              <line x1="26" y1="-3" x2="26" y2="37" stroke="#10b981" strokeWidth="3" />
              <line x1="34" y1="-7" x2="34" y2="33" stroke="#f59e0b" strokeWidth="3" />
              <line x1="42" y1="-11" x2="42" y2="29" stroke="#8b5cf6" strokeWidth="3" />
            </g>

            {/* Server Room Low Glass Partition (Top Center NOC) */}
            <polygon
              points="660,180 740,220 740,200 660,160"
              fill="rgba(56, 189, 248, 0.15)"
              stroke="#0284c7"
              strokeWidth="1.2"
            />

            {/* ==================== THE BRAIN: CENTRAL ROUND CONFERENCE TABLE ==================== */}
            {/* Glowing Floor Hologram Ring under The Brain table (Center: 700, 408) */}
            <g transform="translate(700, 408)">
              <ellipse
                cx="0"
                cy="0"
                rx="140"
                ry="70"
                fill="url(#brainHoloGlow)"
              />
              <ellipse
                cx="0"
                cy="0"
                rx="125"
                ry="62"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                className="animate-spin"
                style={{ animationDuration: '40s' }}
              />
            </g>

            {/* Round Conference Table (Center: 700, 408) */}
            <g transform="translate(700, 408)">
              {/* Table shadow */}
              <ellipse cx="0" cy="14" rx="72" ry="36" fill="rgba(0,0,0,0.3)" />
              {/* Table pedestal base */}
              <polygon points="-12,0 12,0 12,20 -12,20" fill="#1e293b" />
              {/* Round table dark wood surface */}
              <ellipse cx="0" cy="0" rx="70" ry="35" fill="#181c26" stroke="#38bdf8" strokeWidth="2" />
              {/* Outer oak wooden rim */}
              <ellipse cx="0" cy="0" rx="64" ry="32" fill="#121620" stroke="#524330" strokeWidth="1.5" />
              {/* Central pulsing core light */}
              <circle cx="0" cy="0" r="8" fill="#38bdf8" className="animate-pulse" />
            </g>

            {/* ==================== PANTRY & RECEPTION COUNTER (RIGHT WING) ==================== */}
            {/* L-Shaped Wooden Bar Counter */}
            <g transform="translate(1120, 360)">
              <polygon
                points="-90, -25 20, 30 0, 40 -110, -15"
                fill="#4a2e1b"
                stroke="#694025"
                strokeWidth="1.5"
              />
              <rect x="-70" y="-30" width="22" height="18" rx="2" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
              <circle cx="-42" cy="-12" r="3" fill="#f8fafc" />
              <circle cx="-34" cy="-8" r="3" fill="#f8fafc" />
            </g>

            {/* Vending Machine, Fridge & Water Cooler */}
            <g transform="translate(1210, 395)">
              <polygon
                points="-35,-45 -10,-58 -10,-5 -35,8"
                fill="#1e293b"
                stroke="#64748b"
                strokeWidth="1"
              />
              <rect x="-31" y="-40" width="18" height="30" fill="#090d16" stroke="#38bdf8" strokeWidth="0.8" />
              <ellipse cx="8" cy="-16" rx="5" ry="8" fill="#38bdf8" fillOpacity="0.8" stroke="#0284c7" />
              <rect x="4" y="-8" width="8" height="16" fill="#f8fafc" stroke="#94a3b8" />
              <polygon
                points="20,-50 45,-62 45,-8 20,4"
                fill="#cbd5e1"
                stroke="#64748b"
                strokeWidth="1"
              />
            </g>

            {/* ==================== PURPLE VELVET LOUNGE SOFAS (LEFT WING) ==================== */}
            <g transform="translate(300, 330)">
              <polygon
                points="-45,-10 0,-32 35,-14 -10,8"
                fill="#581c87"
                stroke="#7e22ce"
                strokeWidth="1.5"
              />
              <polygon
                points="-45,-10 -45,-26 0,-48 0,-32"
                fill="#6b21a8"
                stroke="#9333ea"
                strokeWidth="1.5"
              />
              <polygon
                points="10,0 30,-10 42,-4 22,6"
                fill="#3e2415"
                stroke="#5c3820"
                strokeWidth="1"
              />
            </g>

            {/* ==================== SERVER RACKS (TOP CENTER NOC) ==================== */}
            <g transform="translate(700, 160)">
              <polygon
                points="-25,-35 0,-48 0,12 -25,25"
                fill="#0a0f1d"
                stroke="#1e293b"
                strokeWidth="1.2"
              />
              <circle cx="-12" cy="-20" r="2" fill="#22c55e" className="animate-ping" />
              <circle cx="-12" cy="-10" r="2" fill="#38bdf8" />
              <circle cx="-12" cy="0" r="2" fill="#22c55e" />
              <circle cx="-12" cy="10" r="2" fill="#38bdf8" className="animate-pulse" />
            </g>

            {/* ==================== FITNESS & WELLNESS CORNER (BOTTOM) ==================== */}
            <g transform="translate(540, 600)">
              <polygon
                points="-50,-12 0,-37 50,-12 0,13"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1.5"
              />
              <polygon
                points="-35,-8 -18,-16 -10,-12 -27,-4"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1"
              />
              <line x1="16" y1="-8" x2="38" y2="2" stroke="#cbd5e1" strokeWidth="2.5" />
              <circle cx="16" cy="-8" r="3" fill="#ef4444" />
              <circle cx="38" cy="2" r="3" fill="#ef4444" />
            </g>

            {/* ==================== POTTED MONSTERA & FIDDLE-LEAF PLANTS ==================== */}
            <g transform="translate(760, 170)">
              <polygon points="-7,3 7,3 4,12 -4,12" fill="#b45309" stroke="#78350f" />
              <circle cx="-3" cy="-2" r="6" fill="#15803d" />
              <circle cx="4" cy="-5" r="5" fill="#16a34a" />
              <circle cx="0" cy="-8" r="7" fill="#22c55e" />
            </g>
            <g transform="translate(1040, 290)">
              <polygon points="-7,3 7,3 4,12 -4,12" fill="#b45309" stroke="#78350f" />
              <circle cx="-4" cy="-3" r="7" fill="#15803d" />
              <circle cx="3" cy="-7" r="6" fill="#16a34a" />
              <circle cx="0" cy="-12" r="7" fill="#22c55e" />
            </g>
            <g transform="translate(260, 380)">
              <polygon points="-7,3 7,3 4,12 -4,12" fill="#b45309" stroke="#78350f" />
              <circle cx="0" cy="-5" r="7" fill="#15803d" />
              <circle cx="-5" cy="-2" r="5" fill="#16a34a" />
            </g>

            {/* ==================== INTER-AGENT LASER LINK ==================== */}
            {activeLaserLink && (
              <g>
                <line
                  x1={activeLaserLink.from.x}
                  y1={activeLaserLink.from.y - 14}
                  x2={activeLaserLink.to.x}
                  y2={activeLaserLink.to.y - 14}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  className="animate-pulse"
                />
                <circle cx={activeLaserLink.from.x} cy={activeLaserLink.from.y - 14} r="3.5" fill="#38bdf8" />
                <circle cx={activeLaserLink.to.x} cy={activeLaserLink.to.y - 14} r="3.5" fill="#22c55e" />
              </g>
            )}
          </svg>

          {/* ==================== FURNITURE RIGS LAYER (23 DESKS & DUAL/TRIPLE MONITORS) ==================== */}
          {ASSIGNED_DESKS.map((d) => {
            const deskScreen = gridToScreen(d.deskGx, d.deskGy)
            const isFounder = d.agentId === 'josiah'

            return (
              <div
                key={`desk-rig-${d.id}`}
                className="pointer-events-none absolute"
                style={{
                  left: `${deskScreen.x - (isFounder ? 32 : 24)}px`,
                  top: `${deskScreen.y - 16}px`,
                  zIndex: Math.max(1, Math.round(deskScreen.y)),
                }}
              >
                <svg
                  width={isFounder ? 64 : 48}
                  height={38}
                  viewBox={`0 0 ${isFounder ? 64 : 48} 38`}
                  className="overflow-visible"
                >
                  {/* Wooden Desk Surface */}
                  {isFounder ? (
                    // Josiah's Executive Triple-Monitor Rig
                    <>
                      <polygon
                        points="0,14 32,0 64,14 32,28"
                        fill="#3a271d"
                        stroke="#63412f"
                        strokeWidth="1.2"
                      />
                      <polygon points="0,14 32,28 32,35 0,21" fill="#241710" />
                      <polygon points="32,28 64,14 64,21 32,35" fill="#4d3326" />
                      {/* Left Angled Screen */}
                      <polygon points="8,4 18,0 18,10 8,14" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
                      {/* Center Main Screen */}
                      <polygon points="22,2 42,2 42,12 22,12" fill="#2563eb" stroke="#60a5fa" strokeWidth="0.8" />
                      {/* Right Angled Screen */}
                      <polygon points="46,0 56,4 56,14 46,10" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
                    </>
                  ) : (
                    // Standard Studio Workstation (Dual Monitors)
                    <>
                      <polygon
                        points="0,12 24,0 48,12 24,24"
                        fill="#3e291e"
                        stroke="#60402e"
                        strokeWidth="1"
                      />
                      <polygon points="0,12 24,24 24,30 0,18" fill="#241710" />
                      <polygon points="24,24 48,12 48,18 24,30" fill="#4d3326" />
                      {/* Left Monitor */}
                      <polygon points="8,4 18,0 18,8 8,12" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />
                      {/* Right Monitor */}
                      <polygon points="26,0 36,5 36,13 26,8" fill="#0f172a" stroke="#22c55e" strokeWidth="0.8" />
                    </>
                  )}
                </svg>
              </div>
            )
          })}

          {/* ==================== DYNAMIC AGENTS LAYER (DEPTH SORTED) ==================== */}
          {sortedAgents.map((agent) => {
            const sim = renderPositions[agent.id] || {
              x: DESK_CONFIGS[agent.id]?.x || 540,
              y: DESK_CONFIGS[agent.id]?.y || 340,
              isWalking: false,
              walkFrame: 0,
              facing: DESK_CONFIGS[agent.id]?.facingDirection || 'right',
              hasCoffee: false,
              isSeated: true,
              activity: 'typing',
            }

            const isSelected = selectedAgentId === agent.id
            const speechText = activeSpeech[agent.id]
            const safeX = Number.isFinite(sim.x) ? sim.x : 540
            const safeY = Number.isFinite(sim.y) ? sim.y : 340
            const zIndexVal = Math.max(10, Math.round(safeY) + 30)

            return (
              <div
                key={agent.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectAgentAndFollow(agent)
                }}
                className="absolute cursor-pointer transition-transform duration-75 hover:scale-110"
                style={{
                  left: `${safeX - 19}px`,
                  top: `${safeY - 32}px`,
                  zIndex: zIndexVal,
                }}
              >
                {/* Selection Highlight Reticle */}
                {isSelected && (
                  <div className="pointer-events-none absolute -inset-2 animate-pulse rounded-full border-2 border-amber-400 bg-amber-400/20" />
                )}

                {/* Floating Clean Name Tag with Status Dot */}
                <div className="pointer-events-none absolute -top-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded border border-slate-700/80 bg-[#090d16]/95 px-1.5 py-0.5 whitespace-nowrap shadow-lg">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      agent.status === 'working'
                        ? 'animate-pulse bg-emerald-400'
                        : agent.status === 'awaiting_approval'
                          ? 'animate-ping bg-amber-400'
                          : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-mono text-[9px] font-bold tracking-tight text-slate-100">
                    {agent.name}
                  </span>
                </div>

                {/* Typewriter Speech Bubble */}
                {speechText && (
                  <div className="animate-in fade-in zoom-in-95 pointer-events-none absolute -top-16 left-1/2 z-50 max-w-[220px] -translate-x-1/2 rounded-lg border border-cyan-400/80 bg-[#0c1322] px-2.5 py-1.5 font-mono text-[10px] text-cyan-200 shadow-2xl duration-150">
                    <p className="leading-tight">{speechText}</p>
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-cyan-400/80 bg-[#0c1322]" />
                  </div>
                )}

                {/* Preserved Pixel Sprite from pixel-sprites.tsx */}
                <PixelSprite
                  id={agent.id}
                  name={agent.name}
                  color={agent.color || '#3b82f6'}
                  hair={agent.hair || '#1e293b'}
                  skin={agent.skin || '#fcd34d'}
                  size={38}
                  isWalking={sim.isWalking}
                  walkFrame={sim.walkFrame}
                  isTyping={sim.activity === 'typing' && !sim.isWalking}
                  facing={sim.facing}
                  hasCoffee={sim.hasCoffee}
                  isSeated={sim.isSeated}
                />
              </div>
            )
          })}
        </div>
      </main>

      {/* ==================== 4. BOTTOM ACTION TOOLBAR ==================== */}
      <footer className="pointer-events-none absolute right-3 bottom-3 left-3 z-40 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Toolbar Actions (+ Agent, Layout, AGENTS, Telemetry, Settings) */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[#1e283d] bg-[#0c101a]/95 p-1.5 shadow-2xl backdrop-blur-md">
          {/* + Agent Button */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setSpawnToast('Agent roster capacity active (23/23 deployed)')
              setTimeout(() => setSpawnToast(null), 3000)
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-emerald-500/80 bg-emerald-950/60 px-3 py-1.5 font-mono text-xs font-bold whitespace-nowrap text-emerald-300 shadow transition hover:bg-emerald-900 active:scale-95"
            title="Spawn / Add Agent"
          >
            <span>+</span>
            <span>Agent</span>
          </button>

          {/* Layout Overlay Toggle */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setShowLayoutOverlay((prev) => !prev)
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs whitespace-nowrap transition active:scale-95 ${
              showLayoutOverlay
                ? 'bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle Floor Plan Layout"
          >
            <span>📐</span>
            <span>Layout</span>
          </button>

          {/* AGENTS Slide-Over Toggle */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setShowAgentsDrawer((prev) => !prev)
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-bold whitespace-nowrap transition active:scale-95 ${
              showAgentsDrawer
                ? 'bg-purple-600 text-white shadow-purple-500/20 shadow-md'
                : 'bg-slate-900/80 text-purple-300 hover:bg-slate-800'
            }`}
            title="Open Agent Roster Panel"
          >
            <span>👥</span>
            <span>AGENTS</span>
            <span className="rounded-full bg-purple-900/90 px-1.5 py-0.2 font-mono text-[10px] text-purple-200">
              {agents.length}
            </span>
          </button>

          {/* Telemetry & Activity Stream Toggle */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setShowTelemetryModal(true)
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-900/80 px-3 py-1.5 font-mono text-xs whitespace-nowrap text-slate-300 transition hover:bg-slate-800 active:scale-95"
            title="Activity Stream, Goals & Telemetry"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            <span>Activity Log</span>
          </button>

          {/* Settings Modal Toggle */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setShowSettingsModal(true)
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-900/80 px-3 py-1.5 font-mono text-xs whitespace-nowrap text-slate-300 transition hover:bg-slate-800 active:scale-95"
            title="Office Settings"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </button>
        </div>

        {/* Center/Right: Interactive Office Modes (Focus Work, All Hands, Pantry, Gym) */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-[#1e283d] bg-[#0c101a]/95 p-1.5 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              switchOfficeMode('FOCUS_WORK')
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs whitespace-nowrap transition active:scale-95 ${
              currentMode === 'FOCUS_WORK'
                ? 'bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Focus Work: Return all agents to department desks"
          >
            <span>🖥️</span>
            <span>Focus Work</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              switchOfficeMode('ALL_HANDS')
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs whitespace-nowrap transition active:scale-95 ${
              currentMode === 'ALL_HANDS'
                ? 'bg-purple-600 font-bold text-white shadow-md shadow-purple-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="All Hands Assembly: Gather at The Brain meeting table"
          >
            <span>📢</span>
            <span>All Hands</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              switchOfficeMode('COFFEE_BREAK')
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs whitespace-nowrap transition active:scale-95 ${
              currentMode === 'COFFEE_BREAK'
                ? 'bg-amber-600 font-bold text-white shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Pantry & Canteen: Head to espresso bar & lounge"
          >
            <span>☕</span>
            <span>Pantry & Canteen</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              switchOfficeMode('RECREATION')
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs whitespace-nowrap transition active:scale-95 ${
              currentMode === 'RECREATION'
                ? 'bg-teal-600 font-bold text-white shadow-md shadow-teal-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Rec & Gym: Head to fitness & wellness area"
          >
            <span>🎾</span>
            <span>Rec & Gym</span>
          </button>
        </div>
      </footer>

      {/* ==================== 5. TOAST NOTIFICATION ==================== */}
      {spawnToast && (
        <div className="pointer-events-none absolute top-16 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-emerald-500/80 bg-[#0c101a] px-4 py-2 font-mono text-xs text-emerald-300 shadow-2xl">
          {spawnToast}
        </div>
      )}

      {/* ==================== 6. SLIDE-OVER AGENTS ROSTER DRAWER ==================== */}
      {showAgentsDrawer && (
        <div className="pointer-events-auto absolute top-0 right-0 z-50 flex h-full w-96 flex-col border-l border-[#1e283d] bg-[#0c101a]/98 shadow-2xl backdrop-blur-xl">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-[#1e283d] p-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-100">
                AGENTS ROSTER
              </span>
              <span className="rounded bg-purple-950/80 px-2 py-0.5 font-mono text-xs text-purple-300">
                {filteredAgents.length}
              </span>
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowAgentsDrawer(false)}
              className="cursor-pointer font-mono text-sm text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Search & Department Filters */}
          <div className="space-y-2.5 border-b border-[#1e283d] p-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agent by name or role..."
              className="w-full rounded-md border border-[#1e283d] bg-[#111625] px-3 py-1.5 font-mono text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
            />
            <div className="flex flex-wrap gap-1">
              {[
                'ALL',
                'Engineering Core',
                'QA & SecOps NOC',
                'Intelligence Lab',
                'Growth Lab',
                'Operations Hub',
                'Command Center',
              ].map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] whitespace-nowrap transition ${
                    selectedDeptFilter === dept
                      ? 'bg-cyan-600 font-bold text-white'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {dept === 'ALL' ? 'ALL' : dept.replace(' Lab', '').replace(' Core', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Cards List */}
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {filteredAgents.map((ag) => (
              <div
                key={ag.id}
                onClick={() => handleSelectAgentAndFollow(ag)}
                className={`cursor-pointer rounded-lg border p-2.5 transition ${
                  selectedAgentId === ag.id
                    ? 'border-cyan-400/80 bg-cyan-950/40'
                    : 'border-[#1e283d] bg-[#111625]/80 hover:border-slate-600 hover:bg-[#151c2e]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        ag.status === 'working'
                          ? 'bg-emerald-400'
                          : ag.status === 'awaiting_approval'
                            ? 'bg-amber-400'
                            : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-mono text-xs font-bold text-slate-100">
                      {ag.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    {ag.room}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-cyan-300">
                  {ag.role}
                </p>
                {ag.current_task && (
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-400">
                    Task: {ag.current_task}
                  </p>
                )}
                {ag.progress_pct !== undefined && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${ag.progress_pct}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== 7. JOSIAH'S GO-SIGNAL MODAL ==================== */}
      {showGoSignalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-amber-500/50 bg-[#0c101a] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e283d] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-ping rounded-full bg-amber-400" />
                <h3 className="font-mono text-sm font-bold text-amber-300">
                  JOSIAH&apos;S GO-SIGNAL GATEWAY ({approvals?.length || 0})
                </h3>
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setShowGoSignalModal(false)}
                className="cursor-pointer font-mono text-sm text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
              {!approvals || approvals.length === 0 ? (
                <div className="py-8 text-center font-mono text-xs text-slate-400">
                  ✨ All Go-Signals cleared. Autonomous studio operating normally.
                </div>
              ) : (
                approvals.map((app) => (
                  <div
                    key={app.id}
                    className="flex flex-col gap-2 rounded-lg border border-[#2b2045] bg-[#141026] p-3.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 uppercase">
                        {app.type || 'GATE'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        by {app.agent_name}
                      </span>
                    </div>
                    <h4 className="font-mono text-xs font-bold text-slate-100">
                      {app.title}
                    </h4>
                    <p className="font-mono text-[11px] leading-relaxed text-slate-300">
                      {app.summary}
                    </p>
                    <div className="flex items-center justify-end gap-2 border-t border-[#261d3d] pt-2">
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => onGoSignal?.(app.id, 'reject')}
                        className="cursor-pointer rounded border border-rose-500/50 bg-rose-950/40 px-3 py-1 font-mono text-xs font-semibold text-rose-300 transition hover:bg-rose-900/60 active:scale-95"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => onGoSignal?.(app.id, 'approve')}
                        className="cursor-pointer rounded bg-emerald-500 px-3 py-1 font-mono text-xs font-bold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-95"
                      >
                        Grant Go-Signal
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 8. TELEMETRY & ACTIVITY LOG MODAL ==================== */}
      {showTelemetryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-[#1e283d] bg-[#0c101a] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e283d] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                <h3 className="font-mono text-sm font-bold text-slate-100">
                  STUDIO TELEMETRY & ACTIVITY LOGS
                </h3>
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setShowTelemetryModal(false)}
                className="cursor-pointer font-mono text-sm text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 overflow-y-auto md:grid-cols-3">
              {/* Column 1: Live Communication Stream */}
              <div className="flex flex-col rounded-lg border border-[#1e283d] bg-[#111625] p-3">
                <div className="flex items-center justify-between border-b border-[#1e283d] pb-2">
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    INTER-AGENT COMMS
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400">
                    LIVE
                  </span>
                </div>
                <div className="mt-2 max-h-80 space-y-2 overflow-y-auto font-mono text-[11px] text-slate-300">
                  {logs.length === 0 ? (
                    <p className="py-6 text-center text-slate-500">
                      Listening for telemetry...
                    </p>
                  ) : (
                    logs.map((line, i) => (
                      <div
                        key={i}
                        className="border-b border-slate-800/80 pb-1.5 leading-snug last:border-b-0"
                      >
                        <span className="font-bold text-amber-400">&gt;</span>{' '}
                        <span>{line}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Running Sprint Goals */}
              <div className="flex flex-col rounded-lg border border-[#1e283d] bg-[#111625] p-3">
                <div className="flex items-center justify-between border-b border-[#1e283d] pb-2">
                  <span className="font-mono text-xs font-bold text-amber-300">
                    SPRINT GOALS
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    Q4 MILESTONE
                  </span>
                </div>
                <div className="mt-2 space-y-2.5 font-mono text-xs">
                  <div className="rounded border border-[#1e283d] bg-[#0c101a] p-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-amber-400">1. ISOMETRIC 2.5D</span>
                      <span className="text-emerald-400">✓ VERIFIED</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      Open-plan solid warm beige diamond slab with A* corridor routing.
                    </p>
                  </div>
                  <div className="rounded border border-[#1e283d] bg-[#0c101a] p-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-cyan-400">2. SUPABASE REALTIME</span>
                      <span className="text-emerald-400">✓ SYNCED</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      Remote tables, RLS security rails, and live broadcast channels.
                    </p>
                  </div>
                  <div className="rounded border border-[#1e283d] bg-[#0c101a] p-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-purple-400">3. GO-SIGNAL GATEWAY</span>
                      <span className="text-emerald-400">✓ ACTIVE</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      Mandatory human-in-the-loop signoff on releases and migrations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Column 3: Done Today */}
              <div className="flex flex-col rounded-lg border border-[#1e283d] bg-[#111625] p-3">
                <div className="flex items-center justify-between border-b border-[#1e283d] pb-2">
                  <span className="font-mono text-xs font-bold text-emerald-300">
                    DONE TODAY ({doneToday.length})
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    AUDITED
                  </span>
                </div>
                <div className="mt-2 max-h-80 space-y-2 overflow-y-auto font-mono text-xs">
                  {doneToday.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded bg-[#0c101a] p-2"
                    >
                      <span className="truncate pr-2 text-slate-300">
                        ✓ {item.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-500">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 9. FLOATING WORKSTATION INSPECTOR ==================== */}
      {selectedAgentId && (() => {
        const ag = agents.find((a) => a.id === selectedAgentId)
        if (!ag) return null
        return (
          <div className="animate-in slide-in-from-bottom pointer-events-auto fixed right-4 bottom-16 z-50 flex w-96 flex-col gap-2.5 rounded-xl border border-[#1e283d] bg-[#0c101a]/95 p-3.5 shadow-2xl backdrop-blur-xl duration-200">
            <div className="flex items-center justify-between border-b border-[#1e283d] pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    ag.status === 'working'
                      ? 'animate-pulse bg-emerald-400'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="font-mono text-xs font-bold text-amber-300 uppercase">
                  {`${ag.name} // WORKSTATION`}
                </span>
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onSelectAgent(null)}
                className="cursor-pointer font-mono text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3">
              <PixelSprite
                id={ag.id}
                name={ag.name}
                color={ag.color || '#3b82f6'}
                hair={ag.hair || '#1e293b'}
                skin={ag.skin || '#fcd34d'}
                size={36}
              />
              <div className="min-w-0">
                <h4 className="truncate font-mono text-sm font-bold text-white">
                  {ag.name}
                </h4>
                <p className="truncate font-mono text-xs text-slate-400">
                  {ag.role}
                </p>
                <p className="font-mono text-[10px] text-cyan-300">
                  {ag.room}
                </p>
              </div>
            </div>

            {/* Current Task & Progress */}
            <div className="space-y-1 rounded border border-[#1e283d] bg-[#111625] p-2.5 font-mono text-xs">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>ACTIVE WORK:</span>
                <span className="font-bold text-emerald-400">
                  {ag.progress_pct ?? 100}%
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-200">
                {ag.current_task || 'Active at workstation'}
              </p>
              {ag.terminal_preview && (
                <pre className="mt-1 max-h-24 overflow-x-auto rounded border border-emerald-950/60 bg-black/60 p-2 font-mono text-[10px] whitespace-pre-wrap text-emerald-400">
                  {ag.terminal_preview}
                </pre>
              )}
            </div>

            {/* Directive Dispatch Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!directiveInput.trim() || !onDispatchDirective) return
                setIsSubmittingDirective(true)
                const text = directiveInput.trim()
                setDirectiveInput('')
                try {
                  await onDispatchDirective(ag.id, text)
                } finally {
                  setIsSubmittingDirective(false)
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={directiveInput}
                onChange={(e) => setDirectiveInput(e.target.value)}
                placeholder={`Assign directive to ${ag.name}...`}
                className="flex-1 rounded border border-[#1e283d] bg-[#111625] px-2.5 py-1.5 font-mono text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isSubmittingDirective || !directiveInput.trim()}
                className="cursor-pointer rounded bg-cyan-600 px-3 py-1.5 font-mono text-xs font-bold text-white transition hover:bg-cyan-500 disabled:opacity-50"
              >
                {isSubmittingDirective ? '...' : 'Dispatch'}
              </button>
            </form>
          </div>
        )
      })()}

      {/* ==================== 10. SETTINGS MODAL ==================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#1e283d] bg-[#0c101a] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e283d] pb-3">
              <h3 className="font-mono text-sm font-bold text-slate-100">
                HQ OFFICE PREFERENCES
              </h3>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setShowSettingsModal(false)}
                className="cursor-pointer font-mono text-sm text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Audio Synthesizer</span>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setSoundEnabled((prev) => !prev)}
                  className={`cursor-pointer rounded px-2.5 py-1 ${
                    soundEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {soundEnabled ? 'ENABLED' : 'MUTED'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Active Timezone</span>
                <span className="text-cyan-400">PHT (UTC+8 Manila)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Simulation Speed</span>
                <span className="font-bold text-emerald-400">1x (Real-Time Studio)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Supabase Realtime Sync</span>
                <span className={supabaseActive ? 'text-emerald-400' : 'text-slate-400'}>
                  {supabaseActive ? 'ONLINE & SYNCED' : 'HYBRID MODE'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowSettingsModal(false)}
              className="mt-6 w-full cursor-pointer rounded-lg bg-cyan-600 py-2 font-mono text-xs font-bold text-white transition hover:bg-cyan-500"
            >
              SAVE & CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
