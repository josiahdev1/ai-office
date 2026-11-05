'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { Agent, Approval, FacingDirection, OfficeTask, VehicleState } from './types'
import { PixelSprite } from './pixel-sprites'
import { VehicleSprite } from './VehicleSprite'
import { ActivityCounterCard } from './ActivityCounterCard'
import { DecisionCardsPanel } from './DecisionCardsPanel'
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
  calculateWalkingFacing,
  calculateFacingBetweenPoints,
  DeskSlot,
} from '@/lib/office/map'
import {
  PARKING_BAYS,
  OUTDOOR_PROPS,
} from '@/lib/office/campusMap'
import { TrafficSimulator } from '@/lib/office/trafficSim'
import { computeAgentActivities, AgentDirectedActivity } from '@/lib/office/activityDirector'
import { officeBus } from '@/lib/office/bus'
import { dialogueEngine, generateAllHandsScript } from '@/lib/office/dialogueEngine'
import { officeSupabase } from '@/lib/supabase/officeService'
import { resolveNameTagPositions, AgentTagInput } from '@/lib/office/antiOverlap'

export interface IsometricOfficeProps {
  agents: Agent[]
  approvals?: Approval[]
  tasks?: OfficeTask[]
  onSelectAgent: (agent: Agent | null) => void
  selectedAgentId?: string | null
  speedMode?: '1x' | '2x' | '5x'
  onSpeedChange?: (speed: '1x' | '2x' | '5x') => void
  onGoSignal?: (approvalId: string, action: 'approve' | 'reject') => void
  onApproveAction?: (
    approvalId: string,
    action: 'approve' | 'reject' | 'hold' | 'send_back' | 'instruct',
    instruction?: string
  ) => Promise<void>
  onCreateTask?: (task: { title: string; assignedTo: string; department: string }) => Promise<void>
  onDispatchDirective?: (agentId: string, directive: string) => Promise<void>
  logs?: string[]
  doneToday?: Array<{ id: string; title: string; agent: string; time: string }>
  supabaseActive?: boolean
  tableCounts?: {
    office_agents?: number
    office_approvals?: number
    office_logs?: number
    office_messages?: number
  }
  onRefreshAgents?: () => Promise<void>
}

interface AgentSimState {
  x: number
  y: number
  waypoints: Point2D[]
  targetX: number
  targetY: number
  isWalking: boolean
  walkFrame: number
  typeFrame: number
  facing: FacingDirection
  hasCoffee: boolean
  isSeated: boolean
  activity: string
  breakTimer: number
}

// Convert ASSIGNED_DESKS to quick lookup
export const DESK_CONFIGS: Record<
  string,
  DeskSlot & { x: number; y: number; facingDirection: FacingDirection }
> = {}
ASSIGNED_DESKS.forEach((d) => {
  const screenPos = gridToScreen(d.chairGx, d.chairGy)
  DESK_CONFIGS[d.agentId] = {
    ...d,
    x: screenPos.x,
    y: screenPos.y,
    facingDirection: d.facing,
  }
})

export function IsometricOffice({
  agents,
  approvals = [],
  tasks = [],
  onSelectAgent,
  selectedAgentId,
  onGoSignal,
  onApproveAction,
  onCreateTask,
  onDispatchDirective,
  logs = [],
  doneToday = [],
  supabaseActive = false,
  tableCounts,
  onRefreshAgents,
}: IsometricOfficeProps) {
  // Navigation & Viewport State
  const [zoom, setZoom] = useState(0.7)
  const [pan, setPan] = useState({ x: 0, y: -40 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Decision Cards Panel & Live Counter Filter
  const [showDecisionPanel, setShowDecisionPanel] = useState(false)
  const [activeActivityFilter, setActiveActivityFilter] = useState<AgentDirectedActivity | null>(null)

  // Camera Tour ("Walk around")
  const [isTourActive, setIsTourActive] = useState(false)
  const isTourActiveRef = useRef(isTourActive)
  useEffect(() => {
    isTourActiveRef.current = isTourActive
  }, [isTourActive])
  const tourStepRef = useRef(0)

  // Traffic Simulation
  const trafficSimRef = useRef<TrafficSimulator>(new TrafficSimulator({ maxMovingCars: 12 }))
  const [trafficVehicles, setTrafficVehicles] = useState<VehicleState[]>([])

  // Commute arrivals/departures tracking
  const [arrivingAgentIds, setArrivingAgentIds] = useState<Set<string>>(new Set())

  // Office Modes & Audio
  const [currentMode, setCurrentMode] = useState<OfficeMode>('FOCUS_WORK')
  const currentModeRef = useRef<OfficeMode>('FOCUS_WORK')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const soundEnabledRef = useRef(soundEnabled)
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  // Computed Activities & Stats
  const { activities: directedActivities, stats: activityStats } = useMemo(() => {
    return computeAgentActivities(agents, currentMode, approvals, tasks, arrivingAgentIds)
  }, [agents, currentMode, approvals, tasks, arrivingAgentIds])

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

  // + Agent Form State
  const [showAddAgentModal, setShowAddAgentModal] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentRole, setNewAgentRole] = useState('')
  const [newAgentDept, setNewAgentDept] = useState('Engineering Core')
  const [newAgentColor, setNewAgentColor] = useState('#3b82f6')
  const [isAddingAgent, setIsAddingAgent] = useState(false)

  // Meeting Transcript State
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(false)
  const [meetingTranscript, setMeetingTranscript] = useState<
    Array<{ speaker: string; role: string; text: string; time: string }>
  >([])
  const meetingTimeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Dialogue & Inter-Agent Laser Links
  const [activeSpeech, setActiveSpeech] = useState<Record<string, string>>({})
  const [activeLaserLink, setActiveLaserLink] = useState<{
    from: Point2D
    to: Point2D
  } | null>(null)

  // Simulation positions state
  const [renderPositions, setRenderPositions] = useState<
    Record<
      string,
      {
        x: number
        y: number
        isWalking: boolean
        walkFrame: number
        typeFrame: number
        facing: FacingDirection
        hasCoffee: boolean
        isSeated: boolean
        activity: string
      }
    >
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
          typeFrame: 0,
          facing: desk?.facingDirection || 'NW',
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
    const scaleX = (rect.width - 40) / 1600
    const scaleY = (rect.height - 40) / 1160
    const fitScale = Math.max(0.55, Math.min(scaleX, scaleY, 0.95))
    setZoom(fitScale)
    setPan({ x: 0, y: -40 })
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
        // Conversation facing: both participants turn to face each other
        senderSim.facing = calculateFacingBetweenPoints(
          senderSim.x,
          senderSim.y,
          recipientSim.x,
          recipientSim.y
        )
        recipientSim.facing = calculateFacingBetweenPoints(
          recipientSim.x,
          recipientSim.y,
          senderSim.x,
          senderSim.y
        )

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
        recipient_id: dialogue.to,
        recipient_name: dialogue.toName,
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

      // Clear previous meeting timers
      meetingTimeoutsRef.current.forEach(clearTimeout)
      meetingTimeoutsRef.current = []

      if (newMode === 'ALL_HANDS') {
        const lines = generateAllHandsScript(agentsRef.current, approvals.length)
        let accumulatedDelay = 2500

        lines.forEach((line) => {
          const tid = setTimeout(() => {
            if (currentModeRef.current !== 'ALL_HANDS') return

            try {
              if (soundEnabled) sfx?.playBlip?.(680)
            } catch {}

            setActiveSpeech((prev) => ({ ...prev, [line.speakerId]: line.text }))

            // Listeners turn to face the speaker during All Hands
            const currentSims = simStateRef.current
            const speakerSim = currentSims[line.speakerId]
            if (speakerSim) {
              agentsRef.current.forEach((a) => {
                if (a.id !== line.speakerId) {
                  const listener = currentSims[a.id]
                  if (listener && !listener.isWalking) {
                    listener.facing = calculateFacingBetweenPoints(
                      listener.x,
                      listener.y,
                      speakerSim.x,
                      speakerSim.y
                    )
                  }
                }
              })
            }

            const timeStr = new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
            setMeetingTranscript((prev) => [
              ...prev,
              { speaker: line.speakerName, role: line.speakerRole, text: line.text, time: timeStr },
            ])

            officeBus.publish({
              from: line.speakerId,
              fromName: line.speakerName,
              to: 'all',
              toName: 'All Hands Assembly',
              text: line.text,
            })

            void officeSupabase.postMessage({
              sender_id: line.speakerId,
              sender_name: line.speakerName,
              channel: 'brain_meeting',
              content: line.text,
              message_type: 'meeting_line',
            })

            void officeSupabase.logActivity(
              'meeting',
              `[ALL HANDS] ${line.speakerName}: "${line.text}"`,
              { id: line.speakerId, name: line.speakerName },
              'info'
            )

            const clearTid = setTimeout(() => {
              setActiveSpeech((prev) => {
                const next = { ...prev }
                delete next[line.speakerId]
                return next
              })
              // Listeners turn back toward table center
              const simsAfter = simStateRef.current
              agentsRef.current.forEach((a) => {
                const s = simsAfter[a.id]
                if (s && !s.isWalking) {
                  s.facing = calculateFacingBetweenPoints(s.x, s.y, 700, 408)
                }
              })
            }, Math.max(2500, line.delayMs - 500))
            meetingTimeoutsRef.current.push(clearTid)
          }, accumulatedDelay)

          meetingTimeoutsRef.current.push(tid)
          accumulatedDelay += line.delayMs
        })
      } else {
        setActiveSpeech({})
      }
    },
    [soundEnabled, approvals.length]
  )

  const handleAddAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAgentName.trim() || !newAgentRole.trim()) return
    setIsAddingAgent(true)
    try {
      const res = await fetch('/api/office/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName.trim(),
          role: newAgentRole.trim(),
          department: newAgentDept,
          room: newAgentDept,
          color: newAgentColor,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setSpawnToast(`Specialist ${newAgentName} onboarded to ${newAgentDept}!`)
        setShowAddAgentModal(false)
        setNewAgentName('')
        setNewAgentRole('')
        if (onRefreshAgents) await onRefreshAgents()
      } else {
        setSpawnToast(`Error: ${data.error}`)
      }
    } catch (err: unknown) {
      setSpawnToast(`Failed: ${(err as Error).message}`)
    } finally {
      setIsAddingAgent(false)
      setTimeout(() => setSpawnToast(null), 4000)
    }
  }

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

          if (stepResult.dx !== 0 || stepResult.dy !== 0) {
            state.facing = calculateWalkingFacing(stepResult.dx, stepResult.dy, state.facing)
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
                const desk = DESK_CONFIGS[agentId]
                if (desk) {
                  state.facing = desk.facing
                }
              } else if (activeMode === 'ALL_HANDS') {
                state.isSeated = true
                state.hasCoffee = false
                state.activity = 'seated_meeting'
                state.facing = calculateFacingBetweenPoints(state.x, state.y, 700, 408)
              } else if (activeMode === 'COFFEE_BREAK') {
                state.isSeated = true
                state.hasCoffee = true
                state.activity = 'eating_canteen'
                state.facing = state.x > 700 ? 'SW' : 'SE'
              } else if (activeMode === 'RECREATION') {
                state.isSeated = false
                state.activity = 'working_out'
                state.facing = state.y > 450 ? 'SE' : 'NW'
              }
            }
          }
          hasStateChanged = true
        }

        // 2. Dynamic Typing Animation & Keyboard Sound
        if (!state.isWalking && state.isSeated && state.activity === 'typing') {
          const currentAgent = agentsRef.current.find((a) => a.id === agentId)
          const isWorking = currentAgent?.status === 'working' || currentAgent?.status === 'active'
          const typeInterval = isWorking ? 7 : 22

          if (frameTick % typeInterval === 0) {
            state.typeFrame = (state.typeFrame + 1) % 3
            if (isWorking && soundEnabledRef.current && Math.random() < 0.28) {
              sfx.playKeyboardClick()
            }
            hasStateChanged = true
          }
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
            typeFrame: number
            facing: FacingDirection
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
            typeFrame: s.typeFrame,
            facing: s.facing,
            hasCoffee: s.hasCoffee,
            isSeated: s.isSeated,
            activity: s.activity,
          }
        })
        setRenderPositions(nextRender)
      }

      // 3. Traffic Simulation Tick & Crosswalk Pedestrian Yielding
      const isPedCrossing = Object.values(sim).some(
        (s) => Math.abs(s.x - 700) < 45 && s.y >= 820 && s.y <= 920
      )
      trafficSimRef.current.setPedestrianCrossing(isPedCrossing)
      trafficSimRef.current.tick(false)
      if (frameTick % 2 === 0) {
        setTrafficVehicles([...trafficSimRef.current.vehicles])
      }

      // 4. Camera Tour ("Walk around") Interpolation
      if (isTourActiveRef.current) {
        const waypoints = [
          { x: 0, y: -40, zoom: 0.7 },
          { x: 0, y: -200, zoom: 1.05 },
          { x: -50, y: -360, zoom: 1.1 },
          { x: -260, y: 100, zoom: 1.15 },
          { x: 260, y: -60, zoom: 1.15 },
          { x: 0, y: 0, zoom: 1.25 },
          { x: 180, y: 140, zoom: 1.2 },
        ]
        if (frameTick % 280 === 0) {
          tourStepRef.current = (tourStepRef.current + 1) % waypoints.length
        }
        const targetWp = waypoints[tourStepRef.current]
        setPan((p) => ({
          x: p.x + (targetWp.x - p.x) * 0.02,
          y: p.y + (targetWp.y - p.y) * 0.02,
        }))
        setZoom((z) => z + (targetWp.zoom - z) * 0.02)
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
    setIsTourActive(false) // Stop camera tour on any click or pan
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  // Staggered commute wave (Shift change)
  const handleShiftChange = useCallback(() => {
    if (soundEnabledRef.current) sfx.playModeSwitch()
    const movingCandidates = agents.slice(0, 4)
    const arrivingSet = new Set<string>()

    movingCandidates.forEach((ag, i) => {
      setTimeout(() => {
        arrivingSet.add(ag.id)
        setArrivingAgentIds(new Set(arrivingSet))
        trafficSimRef.current.spawnVehicle('eastbound', {
          agentId: ag.id,
          style: ag.car_style || 'sedan',
          color: ag.car_color || '#38bdf8',
        })
        setTimeout(() => {
          arrivingSet.delete(ag.id)
          setArrivingAgentIds(new Set(arrivingSet))
        }, 8000)
      }, i * 2000)
    })
  }, [agents])

  const handleApproveActionInternal = useCallback(
    async (
      approvalId: string,
      action: 'approve' | 'reject' | 'hold' | 'send_back' | 'instruct',
      instruction?: string
    ) => {
      if (onApproveAction) {
        await onApproveAction(approvalId, action, instruction)
        return
      }
      try {
        const res = await fetch('/api/office/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approvalId,
            action,
            resolvedBy: 'Josiah (Founder)',
            instruction: instruction || null,
          }),
        })
        const data = await res.json()
        if (data.ok && onRefreshAgents) {
          await onRefreshAgents()
        }
      } catch (err) {
        console.error('Failed to submit approval action:', err)
      }
    },
    [onApproveAction, onRefreshAgents]
  )

  const handleCreateTaskInternal = useCallback(
    async (task: { title: string; assignedTo: string; department: string }) => {
      if (onCreateTask) {
        await onCreateTask(task)
        return
      }
      try {
        await fetch('/api/office/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: task.title,
            agentId: task.assignedTo,
          }),
        })
        if (onRefreshAgents) await onRefreshAgents()
      } catch (err) {
        console.error('Failed to create task:', err)
      }
    },
    [onCreateTask, onRefreshAgents]
  )

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

  // Anti-overlap solver for name tags (Phase 5 & Quick Fix)
  const resolvedTagOffsets = useMemo(() => {
    const tagInputs: AgentTagInput[] = agents.map((agent) => {
      const pos = renderPositions[agent.id] || {
        x: DESK_CONFIGS[agent.id]?.x || 540,
        y: DESK_CONFIGS[agent.id]?.y || 340,
      }
      const isSelected = selectedAgentId === agent.id
      const hasSpeech = Boolean(activeSpeech[agent.id])
      const isAwaiting = agent.status === 'awaiting_approval'
      const priority = isSelected ? 10 : hasSpeech ? 6 : isAwaiting ? 4 : 1
      return {
        id: agent.id,
        name: agent.name,
        x: Number.isFinite(pos.x) ? pos.x : 540,
        y: Number.isFinite(pos.y) ? pos.y : 340,
        priority,
      }
    })
    return resolveNameTagPositions(tagInputs, { zoom })
  }, [agents, renderPositions, selectedAgentId, activeSpeech, zoom])

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

          {currentMode === 'ALL_HANDS' && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setShowTranscriptDrawer((prev) => !prev)
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-500/80 bg-purple-950/90 px-2.5 py-1.5 font-mono text-xs font-bold text-purple-200 shadow-xl shadow-purple-950/50 transition hover:bg-purple-900 active:scale-95 animate-pulse whitespace-nowrap"
              title="View Live Meeting Transcript"
            >
              <span>🎙️</span>
              <span>ALL HANDS TRANSCRIPT ({meetingTranscript.length})</span>
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
            width: '1600px',
            height: '1160px',
            flexShrink: 0,
          }}
        >
          {/* SVG Floor, Cutaway Charcoal Walls & Architecture */}
          <svg
            viewBox="0 0 1600 1160"
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

              {/* Street lamp night radial light puddle */}
              <radialGradient id="lampLightPuddle" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#fef9c3" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ==================== OUTDOOR CAMPUS GROUNDS (PHASE 15) ==================== */}
            {/* 1. Green Lawn Slab with 3D Bevel Extrusion */}
            <polygon
              points="700,30 1530,430 1250,1100 700,1140 150,1100 -130,430"
              fill="#182e1c"
              stroke="#0f1d12"
              strokeWidth="2.5"
            />
            {/* Lawn Left Bevel Face */}
            <polygon
              points="-130,430 -130,446 150,1116 700,1156 700,1140 150,1100"
              fill="#0d180f"
            />
            {/* Lawn Right Bevel Face */}
            <polygon
              points="700,1140 700,1156 1250,1116 1530,446 1530,430 1250,1100"
              fill="#111f14"
            />

            {/* Perimeter Hedge & Stone Wall with Entrance Gate */}
            <polygon
              points="690,38 1520,434 1240,1094 700,1134 160,1094 -120,434"
              fill="none"
              stroke="#2f5436"
              strokeWidth="4"
              strokeDasharray="14 3"
              strokeLinejoin="round"
            />
            {/* Security Entrance Gate at Bottom (700, 1140) */}
            <rect x="670" y="1128" width="10" height="16" fill="#475569" stroke="#1e293b" />
            <rect x="720" y="1128" width="10" height="16" fill="#475569" stroke="#1e293b" />
            <line x1="680" y1="1136" x2="720" y2="1136" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2" />

            {/* 2. Zen Garden Koi Pond */}
            <g transform="translate(180, 560)">
              <ellipse cx="0" cy="0" rx="55" ry="32" fill="#1e293b" stroke="#64748b" strokeWidth="3" />
              <ellipse cx="0" cy="0" rx="50" ry="28" fill="#0891b2" fillOpacity="0.75" />
              {/* Lily Pads */}
              <circle cx="-16" cy="-8" r="5" fill="#15803d" />
              <circle cx="18" cy="6" r="6" fill="#15803d" />
              <circle cx="8" cy="-12" r="4.5" fill="#16a34a" />
              <text x="0" y="4" fill="#67e8f9" fontSize="6.5" fontFamily="monospace" textAnchor="middle" opacity="0.8">
                ZEN POND
              </text>
            </g>

            {/* 3. EasyUp Flagpole */}
            <g transform="translate(620, 750)">
              <line x1="0" y1="0" x2="0" y2="-65" stroke="#94a3b8" strokeWidth="2.5" />
              <circle cx="0" cy="-66" r="2.5" fill="#fbbf24" />
              {/* Flying Flag Banner */}
              <polygon points="0,-64 26,-56 26,-42 0,-50" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
              <text x="12" y="-52" fill="#ffffff" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                EASYUP
              </text>
            </g>

            {/* 4. Front Entrance Paved Canopy Walkway */}
            {/* Paved Walkway Path from front door (700, 696) to Crosswalk (700, 825) */}
            <polygon
              points="665,696 735,696 735,825 665,825"
              fill="#cbd5e1"
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
            {/* Walkway Paver Tiles */}
            {[720, 750, 780, 810].map((wy) => (
              <line key={`walkway-tile-${wy}`} x1="665" y1={wy} x2="735" y2={wy} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 3" />
            ))}

            {/* Glass Entrance Canopy */}
            <g transform="translate(700, 715)">
              <polygon points="-46,-12 46,-12 36,18 -36,18" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" strokeWidth="1.5" />
              {/* Brushed Steel Canopy Pillars */}
              <line x1="-36" y1="18" x2="-36" y2="35" stroke="#94a3b8" strokeWidth="3" />
              <line x1="36" y1="18" x2="36" y2="35" stroke="#94a3b8" strokeWidth="3" />
              <text x="0" y="4" fill="#38bdf8" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                MAIN ENTRANCE
              </text>
            </g>

            {/* 5. Two-Way Asphalt Roadway Loop */}
            {/* Road Surface */}
            <polygon
              points="-130,825 1530,825 1530,915 -130,915"
              fill="#1e2433"
              stroke="#0f172a"
              strokeWidth="2"
            />
            {/* Curbs with Granite Trim */}
            <line x1="-130" y1="825" x2="1530" y2="825" stroke="#cbd5e1" strokeWidth="2.5" />
            <line x1="-130" y1="915" x2="1530" y2="915" stroke="#cbd5e1" strokeWidth="2.5" />
            {/* Center Dashed Yellow Divider */}
            <line
              x1="-130"
              y1="870"
              x2="1530"
              y2="870"
              stroke="#facc15"
              strokeWidth="2"
              strokeDasharray="12 8"
            />
            {/* Solid White Edge Shoulders */}
            <line x1="-130" y1="835" x2="1530" y2="835" stroke="#f8fafc" strokeWidth="1.2" strokeOpacity="0.8" />
            <line x1="-130" y1="905" x2="1530" y2="905" stroke="#f8fafc" strokeWidth="1.2" strokeOpacity="0.8" />

            {/* Zebra Pedestrian Crosswalk */}
            <g transform="translate(700, 870)">
              {[-32, -20, -8, 4, 16, 28].map((cx) => (
                <rect
                  key={`crosswalk-bar-${cx}`}
                  x={cx}
                  y="-40"
                  width="7"
                  height="80"
                  fill="#ffffff"
                  fillOpacity="0.92"
                />
              ))}
            </g>

            {/* Transit Bus Stop with Shelter */}
            <g transform="translate(940, 810)">
              {/* Concrete Bus Pad */}
              <rect x="-35" y="10" width="70" height="24" rx="2" fill="#334155" stroke="#64748b" />
              {/* Glass Wall & Blue Canopy */}
              <polygon points="-30,-8 30,-8 25,12 -25,12" fill="rgba(14, 165, 233, 0.4)" stroke="#0284c7" strokeWidth="1.5" />
              <line x1="-25" y1="12" x2="-25" y2="24" stroke="#64748b" strokeWidth="2" />
              <line x1="25" y1="12" x2="25" y2="24" stroke="#64748b" strokeWidth="2" />
              {/* Bench */}
              <rect x="-18" y="14" width="36" height="5" rx="1" fill="#78350f" />
              {/* Sign Post */}
              <line x1="32" y1="-14" x2="32" y2="20" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="32" cy="-16" r="6" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
              <text x="32" y="-14" fill="#ffffff" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">BUS</text>
            </g>

            {/* 6. Employee & Visitor Parking Lot (22 Bays) */}
            {/* Parking Lot Asphalt Slab */}
            <polygon
              points="280,920 1140,920 1140,1095 280,1095"
              fill="#182030"
              stroke="#334155"
              strokeWidth="2"
            />
            {/* Driving Aisle Centerline at y = 1000 with Circulation Arrows */}
            <line x1="300" y1="1000" x2="1120" y2="1000" stroke="#475569" strokeWidth="1" strokeDasharray="14 10" />
            <text x="460" y="1003" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">▶ DRIVING AISLE ▶</text>
            <text x="880" y="1003" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">▶ CIRCULATION ▶</text>

            {/* Parking Bays */}
            {PARKING_BAYS.map((bay) => {
              const isFounder = bay.type === 'founder'
              const isAccessible = bay.type === 'accessible'
              const isNorthRow = bay.y < 1000

              return (
                <g key={bay.id} transform={`translate(${bay.x}, ${bay.y})`}>
                  {/* Bay Painted Boundary Lines */}
                  <line
                    x1="-26"
                    y1={isNorthRow ? -20 : -18}
                    x2="-26"
                    y2={isNorthRow ? 22 : 20}
                    stroke="#f8fafc"
                    strokeWidth="1.4"
                    strokeOpacity="0.85"
                  />
                  <line
                    x1="26"
                    y1={isNorthRow ? -20 : -18}
                    x2="26"
                    y2={isNorthRow ? 22 : 20}
                    stroke="#f8fafc"
                    strokeWidth="1.4"
                    strokeOpacity="0.85"
                  />

                  {/* Concrete Wheel Stop */}
                  <rect
                    x="-14"
                    y={isNorthRow ? -18 : 16}
                    width="28"
                    height="4"
                    rx="1"
                    fill="#94a3b8"
                    stroke="#475569"
                    strokeWidth="0.8"
                  />

                  {/* Accessible Handicap Surface Paint */}
                  {isAccessible && (
                    <g>
                      <rect x="-22" y="-12" width="44" height="24" rx="2" fill="#0284c7" fillOpacity="0.35" stroke="#38bdf8" strokeWidth="1" />
                      <text x="0" y="4" fill="#ffffff" fontSize="10" textAnchor="middle">♿</text>
                    </g>
                  )}

                  {/* Founder Josiah Dedicated Spot */}
                  {isFounder && (
                    <g>
                      <rect x="-24" y="-14" width="48" height="28" rx="2" fill="#78350f" fillOpacity="0.4" stroke="#f59e0b" strokeWidth="1.5" />
                      <text x="0" y="0" fill="#fbbf24" fontSize="6.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        ★ JOSIAH ★
                      </text>
                      <text x="0" y="8" fill="#fef08a" fontSize="5" fontFamily="monospace" textAnchor="middle">
                        FOUNDER
                      </text>
                    </g>
                  )}

                  {/* Painted Bay Number */}
                  <text
                    x="0"
                    y={isNorthRow ? -7 : 10}
                    fill={isFounder ? '#f59e0b' : '#94a3b8'}
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {bay.bayNumber.toString().padStart(2, '0')}
                  </text>
                </g>
              )
            })}

            {/* 7. Outdoor Street Lamps with Night Radial Glow */}
            {[
              { id: 'l1', x: 660, y: 780 },
              { id: 'l2', x: 740, y: 780 },
              { id: 'l3', x: 340, y: 920 },
              { id: 'l4', x: 700, y: 920 },
              { id: 'l5', x: 1040, y: 920 },
            ].map((lamp) => (
              <g key={lamp.id} transform={`translate(${lamp.x}, ${lamp.y})`}>
                {/* Radial Glow Puddle */}
                <ellipse cx="0" cy="18" rx="36" ry="18" fill="url(#lampLightPuddle)" />
                {/* Post & Fixture */}
                <line x1="0" y1="0" x2="0" y2="18" stroke="#64748b" strokeWidth="2.2" />
                <circle cx="0" cy="0" r="3.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
              </g>
            ))}

            {/* 8. Swaying Trees & Bushes */}
            {OUTDOOR_PROPS.filter((p) => p.type.startsWith('tree_')).map((tree) => {
              const isPine = tree.type === 'tree_pine'
              const isMaple = tree.type === 'tree_maple'
              const trunkColor = '#78350f'
              const foliageColor = isPine ? '#14532d' : isMaple ? '#b91c1c' : '#15803d'
              const foliageHighlight = isPine ? '#166534' : isMaple ? '#dc2626' : '#22c55e'

              return (
                <g key={tree.id} transform={`translate(${tree.x}, ${tree.y})`}>
                  {/* Drop Shadow */}
                  <ellipse cx="0" cy="8" rx={tree.w * 0.45} ry="12" fill="rgba(0, 0, 0, 0.45)" />
                  {/* Trunk */}
                  <rect x="-3" y="-12" width="6" height="20" fill={trunkColor} />
                  {/* Foliage Layers */}
                  <circle cx="-6" cy="-28" r={tree.w * 0.35} fill={foliageColor} />
                  <circle cx="6" cy="-28" r={tree.w * 0.35} fill={foliageColor} />
                  <circle cx="0" cy="-38" r={tree.w * 0.38} fill={foliageHighlight} />
                </g>
              )
            })}

            {/* 9. Procedural Isometric Vehicles (Parked & Moving on Road / Parking Lot) */}
            {trafficVehicles.map((veh) => (
              <VehicleSprite
                key={veh.id}
                id={veh.id}
                style={veh.style}
                color={veh.color}
                facing={veh.facing}
                x={veh.x}
                y={veh.y}
                isParked={veh.isParked}
                headlightsOn={veh.headlightsOn}
                brakeLightsOn={veh.brakeLightsOn}
                blinkerOn={veh.blinkerOn}
              />
            ))}

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

            {/* ==================== PERMANENT DEPARTMENT ROOM FLOORS & AMBIENT TINTS ==================== */}
            {OFFICE_ZONES.map((zone) => {
              const p1 = gridToScreen(zone.rect.x, zone.rect.y)
              const p2 = gridToScreen(zone.rect.x + zone.rect.w, zone.rect.y)
              const p3 = gridToScreen(
                zone.rect.x + zone.rect.w,
                zone.rect.y + zone.rect.h
              )
              const p4 = gridToScreen(zone.rect.x, zone.rect.y + zone.rect.h)
              return (
                <g key={`room-floor-${zone.id}`}>
                  {/* Department Floor Rug / Inlay with Color Tint */}
                  <polygon
                    points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                    fill={zone.color}
                    fillOpacity="0.14"
                    stroke={zone.color}
                    strokeWidth="1.2"
                    strokeOpacity="0.5"
                  />
                  {/* Subtle Inset Border */}
                  <polygon
                    points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                    fill="none"
                    stroke={zone.color}
                    strokeWidth="0.8"
                    strokeDasharray="8 4"
                    strokeOpacity="0.3"
                  />
                  {/* Monospace Department Name Engraved in Floor */}
                  <text
                    x={p1.x + 10}
                    y={p1.y + 16}
                    fill={zone.color}
                    fillOpacity="0.8"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    className="select-none"
                    style={{
                      paintOrder: 'stroke',
                      stroke: '#080b12',
                      strokeWidth: 2,
                      strokeLinejoin: 'round',
                    }}
                  >
                    {zone.id === 'recreation'
                      ? '// FITNESS & WELLNESS • WHOEVER IS OFF DUTY'
                      : `// ${zone.label || zone.name}`}
                  </text>
                </g>
              )
            })}

            {/* ==================== LAYOUT DIAGNOSTIC OVERLAY (WHEN TOGGLED) ==================== */}
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
                    <g key={`overlay-${zone.id}`}>
                      <polygon
                        points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                        fill={zone.color}
                        fillOpacity="0.22"
                        stroke={zone.color}
                        strokeWidth="2"
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
            {/* Top-Left Wall Cap (Visible Thickness) */}
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
            {/* Top-Right Wall Cap (Visible Thickness) */}
            <polygon
              points="700,50 714,43 1290,331 1276,338"
              fill="#333b4e"
              stroke="#404a60"
              strokeWidth="1"
            />

            {/* ==================== ARCHITECTURAL WINDOWS ON TOP-LEFT WALL ==================== */}
            {/* Window 1 (matching ref-agent-office.png daylight & green foliage) */}
            <g transform="translate(200, 275)">
              <polygon points="0,0 72,-36 72,54 0,90" fill="#0f172a" stroke="#334155" strokeWidth="2" />
              <polygon points="4,3 68,-29 68,50 4,82" fill="#7dd3fc" />
              <ellipse cx="36" cy="40" rx="26" ry="22" fill="#15803d" />
              <ellipse cx="24" cy="50" rx="20" ry="18" fill="#16a34a" />
              <ellipse cx="50" cy="35" rx="18" ry="16" fill="#22c55e" />
              <ellipse cx="34" cy="24" rx="22" ry="16" fill="#15803d" />
              <line x1="36" y1="-18" x2="36" y2="67" stroke="#475569" strokeWidth="2" />
              <line x1="0" y1="45" x2="72" y2="9" stroke="#475569" strokeWidth="1.8" />
            </g>
            {/* Window 2 */}
            <g transform="translate(340, 205)">
              <polygon points="0,0 72,-36 72,54 0,90" fill="#0f172a" stroke="#334155" strokeWidth="2" />
              <polygon points="4,3 68,-29 68,50 4,82" fill="#bae6fd" />
              <ellipse cx="36" cy="42" rx="25" ry="20" fill="#16a34a" />
              <ellipse cx="48" cy="48" rx="20" ry="18" fill="#22c55e" />
              <ellipse cx="20" cy="38" rx="18" ry="16" fill="#15803d" />
              <line x1="36" y1="-18" x2="36" y2="67" stroke="#475569" strokeWidth="2" />
              <line x1="0" y1="45" x2="72" y2="9" stroke="#475569" strokeWidth="1.8" />
            </g>

            {/* ==================== ARCHITECTURAL DOORWAY ON TOP-RIGHT WALL ==================== */}
            {/* Doorway with warm hallway glow spilling across floor (matching ref-agent-office.png) */}
            <g transform="translate(1160, 310)">
              {/* Door Frame */}
              <polygon points="-24,-52 24,-28 24,32 -24,8" fill="#1e1814" stroke="#78350f" strokeWidth="2.5" />
              {/* Warm Hallway Light inside Doorway */}
              <polygon points="-20,-48 20,-28 20,28 -20,8" fill="#fef3c7" />
              <polygon points="-20,-48 20,-28 20,28 -20,8" fill="rgba(245, 158, 11, 0.45)" />
              {/* Light Spill Polygon across Floor */}
              <polygon points="-24,8 24,32 54,46 6,22" fill="rgba(251, 191, 36, 0.28)" />
              {/* Exit Indicator Sign */}
              <rect x="-8" y="-58" width="18" height="6" rx="1" fill="#10b981" />
              <text x="1" y="-53.5" fill="#ffffff" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">EXIT</text>
            </g>

            {/* ==================== SYSTEM ARCHITECTURE WHITEBOARD ==================== */}
            {/* Large Architectural Whiteboard (matching ref-agent-office.png) */}
            <g transform="translate(870, 160)">
              <polygon points="-44,-14 44,-36 44,24 -44,46" fill="#090d16" stroke="#38bdf8" strokeWidth="1.5" />
              <rect x="-34" y="6" width="14" height="8" rx="1" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.8" />
              <rect x="-14" y="2" width="14" height="8" rx="1" fill="#1e293b" stroke="#22c55e" strokeWidth="0.8" />
              <line x1="-20" y1="10" x2="-14" y2="6" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 1" />
              <line x1="-34" y1="24" x2="30" y2="8" stroke="#38bdf8" strokeWidth="1" />
              {/* Mini Velocity Sprint Bars */}
              <line x1="5" y1="15" x2="5" y2="7" stroke="#f59e0b" strokeWidth="3" />
              <line x1="13" y1="13" x2="13" y2="3" stroke="#10b981" strokeWidth="3" />
              <line x1="21" y1="11" x2="21" y2="-2" stroke="#38bdf8" strokeWidth="3" />
              <line x1="29" y1="9" x2="29" y2="-7" stroke="#a855f7" strokeWidth="3" />
            </g>

            {/* Round Wall Clock on Top-Right Wall */}
            <g transform="translate(1060, 260)">
              <ellipse cx="0" cy="0" rx="14" ry="18" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="0" y1="0" x2="0" y2="-10" stroke="#f8fafc" strokeWidth="1.5" />
              <line x1="0" y1="0" x2="7" y2="3" stroke="#ef4444" strokeWidth="1" />
            </g>

            {/* Wall Bookshelf on Top-Left Wall */}
            <g transform="translate(140, 340)">
              <polygon
                points="0,0 50,-25 50,30 0,55"
                fill="#2b1810"
                stroke="#452718"
                strokeWidth="1.5"
              />
              <line x1="8" y1="5" x2="8" y2="45" stroke="#ef4444" strokeWidth="2.8" />
              <line x1="16" y1="1" x2="16" y2="41" stroke="#3b82f6" strokeWidth="2.8" />
              <line x1="24" y1="-3" x2="24" y2="37" stroke="#10b981" strokeWidth="2.8" />
              <line x1="32" y1="-7" x2="32" y2="33" stroke="#f59e0b" strokeWidth="2.8" />
              <line x1="40" y1="-11" x2="40" y2="29" stroke="#8b5cf6" strokeWidth="2.8" />
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

              {/* 12 Conference Chairs Ring around Meeting Table */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                const rad = (deg * Math.PI) / 180
                const cx = Math.round(Math.cos(rad) * 94)
                const cy = Math.round(Math.sin(rad) * 48)
                return (
                  <g key={`brain-chair-${deg}`} transform={`translate(${cx}, ${cy})`}>
                    <ellipse cx="0" cy="8" rx="8" ry="4" fill="rgba(0,0,0,0.3)" />
                    <polygon points="-6,2 0,-1 6,2 0,5" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
                    <polygon points="-5,-6 5,-6 6,2 -6,2" fill="#0f172a" stroke="#475569" strokeWidth="0.9" />
                  </g>
                )
              })}
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

              {/* Espresso machine animated steam wisps */}
              <path
                d="M -60,-32 Q -58,-38 -62,-44"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1.2"
                fill="none"
                className="animate-pulse"
              />
              <path
                d="M -54,-33 Q -52,-39 -56,-45"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.2"
                fill="none"
                className="animate-pulse"
                style={{ animationDelay: '0.4s' }}
              />

              {/* 4 Wooden Bar Stools along the counter */}
              {[-65, -42, -18, 6].map((sx, idx) => (
                <g key={`bar-stool-${idx}`} transform={`translate(${sx}, 28)`}>
                  <ellipse cx="0" cy="8" rx="6" ry="3" fill="rgba(0,0,0,0.3)" />
                  <line x1="0" y1="8" x2="0" y2="0" stroke="#64748b" strokeWidth="1.5" />
                  <ellipse cx="0" cy="0" rx="6" ry="3" fill="#92400e" stroke="#b45309" strokeWidth="1" />
                </g>
              ))}
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

          {/* ==================== WORKSTATION ERGONOMIC SWIVEL CHAIRS ==================== */}
          {ASSIGNED_DESKS.map((d) => {
            const chairScreen = gridToScreen(d.chairGx, d.chairGy)
            const facing = d.facing
            const isBackFacing = facing === 'NW' || facing === 'NE'

            return (
              <div
                key={`chair-${d.id}`}
                className="pointer-events-none absolute"
                style={{
                  left: `${chairScreen.x - 16}px`,
                  top: `${chairScreen.y - 20}px`,
                  zIndex: Math.max(1, Math.round(chairScreen.y) - 2),
                }}
              >
                <svg
                  width={32}
                  height={32}
                  viewBox="0 0 32 32"
                  className="overflow-visible"
                >
                  {/* Floor contact shadow under chair */}
                  <ellipse cx="16" cy="25" rx="10" ry="4.5" fill="rgba(0,0,0,0.35)" />
                  {/* 5-Star Wheel Base */}
                  <line x1="16" y1="23" x2="10" y2="25" stroke="#1e293b" strokeWidth="1.8" />
                  <line x1="16" y1="23" x2="22" y2="25" stroke="#1e293b" strokeWidth="1.8" />
                  <line x1="16" y1="23" x2="16" y2="27" stroke="#1e293b" strokeWidth="1.8" />
                  <line x1="16" y1="23" x2="11" y2="21" stroke="#1e293b" strokeWidth="1.8" />
                  <line x1="16" y1="23" x2="21" y2="21" stroke="#1e293b" strokeWidth="1.8" />
                  {/* Castor Wheels */}
                  <circle cx="10" cy="25" r="1.3" fill="#0f172a" />
                  <circle cx="22" cy="25" r="1.3" fill="#0f172a" />
                  <circle cx="16" cy="27" r="1.3" fill="#0f172a" />
                  {/* Chrome Hydraulic Post */}
                  <line x1="16" y1="23" x2="16" y2="17" stroke="#475569" strokeWidth="2.2" />

                  {isBackFacing ? (
                    // Chair facing away from camera towards NW / NE desk
                    <>
                      {/* Padded Dark Seat Cushion */}
                      <polygon
                        points="8,15 16,11 24,15 16,19"
                        fill="#181e2b"
                        stroke="#2e384d"
                        strokeWidth="1"
                      />
                      {/* High Ergonomic Mesh Backrest Behind (SE/SW side) */}
                      <polygon
                        points="9,17 23,17 24,25 8,25"
                        fill="#0f172a"
                        stroke="#3b4861"
                        strokeWidth="1.2"
                      />
                      {/* Lumbar Support Ribs */}
                      <line x1="10" y1="20" x2="22" y2="20" stroke="#1e293b" strokeWidth="1" />
                      <line x1="9.5" y1="23" x2="22.5" y2="23" stroke="#1e293b" strokeWidth="1" />
                      {/* Armrests */}
                      <path d="M 7,14 L 7,17 L 9,18" stroke="#475569" strokeWidth="1.2" fill="none" />
                      <path d="M 25,14 L 25,17 L 23,18" stroke="#475569" strokeWidth="1.2" fill="none" />
                    </>
                  ) : (
                    // Chair facing camera towards SE / SW desk
                    <>
                      {/* High Ergonomic Mesh Backrest Behind */}
                      <polygon
                        points="9,6 23,6 24,15 8,15"
                        fill="#0f172a"
                        stroke="#3b4861"
                        strokeWidth="1.2"
                      />
                      {/* Lumbar Support Ribs */}
                      <line x1="10" y1="9" x2="22" y2="9" stroke="#1e293b" strokeWidth="1" />
                      <line x1="9.5" y1="12" x2="22.5" y2="12" stroke="#1e293b" strokeWidth="1" />
                      {/* Padded Dark Seat Cushion */}
                      <polygon
                        points="8,17 16,13 24,17 16,21"
                        fill="#181e2b"
                        stroke="#2e384d"
                        strokeWidth="1"
                      />
                      {/* Armrests */}
                      <path d="M 7,13 L 7,16 L 9,17" stroke="#475569" strokeWidth="1.2" fill="none" />
                      <path d="M 25,13 L 25,16 L 23,17" stroke="#475569" strokeWidth="1.2" fill="none" />
                    </>
                  )}
                </svg>
              </div>
            )
          })}

          {/* ==================== FURNITURE RIGS LAYER (23 DESKS & DUAL/TRIPLE MONITORS) ==================== */}
          {ASSIGNED_DESKS.map((d) => {
            const deskScreen = gridToScreen(d.deskGx, d.deskGy)
            const isFounder = d.agentId === 'josiah'
            const agent = agents.find((a) => a.id === d.agentId)
            const sim = renderPositions[d.agentId]
            const isTyping = sim?.isSeated && sim?.activity === 'typing' && !sim?.isWalking
            const typeFrame = sim?.typeFrame ?? 0
            const tool = (agent?.current_tool || agent?.current_task || '').toLowerCase()

            // Syntax colors: Blue for edit, orange for shell, cyan for read, green for test pass
            const codeColor =
              tool.includes('edit') || tool.includes('code') || tool.includes('write') || tool.includes('refactor')
                ? '#38bdf8'
                : tool.includes('sh') || tool.includes('bash') || tool.includes('run') || tool.includes('test')
                ? '#f97316'
                : '#06b6d4'

            const facing = d.facing

            return (
              <div
                key={`desk-rig-${d.id}`}
                className="pointer-events-none absolute"
                style={{
                  left: `${deskScreen.x - (isFounder ? 32 : 24)}px`,
                  top: `${deskScreen.y - 16}px`,
                  zIndex: Math.max(1, Math.round(deskScreen.y) + (facing === 'SE' ? 14 : 6)),
                }}
              >
                <svg
                  width={isFounder ? 64 : 48}
                  height={38}
                  viewBox={`0 0 ${isFounder ? 64 : 48} 38`}
                  className="overflow-visible"
                >
                  {/* Floor Contact Shadow under Desk */}
                  <ellipse
                    cx={isFounder ? 32 : 24}
                    cy={27}
                    rx={isFounder ? 28 : 21}
                    ry={8}
                    fill="rgba(0,0,0,0.32)"
                  />

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

                      {/* Left Angled Screen (Cyan telemetry) */}
                      <polygon points="8,4 18,0 18,10 8,14" fill="#041226" stroke="#38bdf8" strokeWidth="0.8" />
                      <line x1="10" y1="4.5" x2="16" y2="2" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 1" strokeDashoffset={isTyping ? typeFrame * 2 : 0} />
                      <line x1="10" y1="7.5" x2="16" y2="5" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 1" />

                      {/* Center Main Ultrawide Screen (Syntax Colored Code) */}
                      <polygon points="22,2 42,2 42,12 22,12" fill="#061022" stroke="#60a5fa" strokeWidth="0.9" />
                      <line x1="24" y1="4.5" x2="40" y2="4.5" stroke={codeColor} strokeWidth="1.2" strokeDasharray="4 1.5" strokeDashoffset={isTyping ? typeFrame * 2.5 : 0} />
                      <line x1="24" y1="7" x2="38" y2="7" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 1" />
                      <line x1="24" y1="9.5" x2="36" y2="9.5" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 1" />

                      {/* Right Angled Screen (Orange shell / build log) */}
                      <polygon points="46,0 56,4 56,14 46,10" fill="#140a04" stroke="#f97316" strokeWidth="0.8" />
                      <line x1="48" y1="2" x2="54" y2="4.5" stroke="#f97316" strokeWidth="1" strokeDasharray="3 1" strokeDashoffset={isTyping ? typeFrame * 2 : 0} />
                      <line x1="48" y1="5" x2="54" y2="7.5" stroke="#fb923c" strokeWidth="1" strokeDasharray="2 1" />

                      {/* Mechanical Keyboard with dynamic flickering RGB keycaps */}
                      <rect x="25" y="16" width="14" height="6" rx="1" fill="#090d16" stroke="#334155" strokeWidth="0.7" />
                      <rect x="26" y="17" width="2" height="1.5" fill={isTyping && typeFrame === 0 ? '#38bdf8' : '#64748b'} />
                      <rect x="29" y="17" width="2" height="1.5" fill={isTyping && typeFrame === 1 ? '#38bdf8' : '#64748b'} />
                      <rect x="32" y="17" width="2" height="1.5" fill={isTyping && typeFrame === 2 ? '#38bdf8' : '#64748b'} />
                      <rect x="35" y="17" width="2" height="1.5" fill={isTyping ? '#22c55e' : '#64748b'} />
                      <rect x="27.5" y="19.5" width="9" height="1.2" fill={isTyping ? '#38bdf8' : '#475569'} />
                    </>
                  ) : facing === 'NW' ? (
                    // Workstation facing NW (Workers sit SE facing NW; monitors face SE towards viewer)
                    <>
                      <polygon
                        points="0,12 24,0 48,12 24,24"
                        fill="#3e291e"
                        stroke="#60402e"
                        strokeWidth="1"
                      />
                      <polygon points="0,12 24,24 24,30 0,18" fill="#241710" />
                      <polygon points="24,24 48,12 48,18 24,30" fill="#4d3326" />

                      {/* Left Monitor (Syntax code scrolling in sync with typing) */}
                      <polygon points="8,4 18,0 18,8 8,12" fill="#040e1e" stroke="#38bdf8" strokeWidth="0.8" />
                      <line x1="10" y1="4.5" x2="16" y2="2" stroke={codeColor} strokeWidth="1" strokeDasharray="3 1" strokeDashoffset={isTyping ? typeFrame * 2 : 0} />
                      <line x1="10" y1="7" x2="16" y2="4.5" stroke="#22c55e" strokeWidth="1" strokeDasharray="2 1" />
                      <line x1="10" y1="9.5" x2="16" y2="7" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 1" />

                      {/* Right Monitor (Terminal / Telemetry) */}
                      <polygon points="26,0 36,5 36,13 26,8" fill="#040e1e" stroke="#22c55e" strokeWidth="0.8" />
                      <line x1="28" y1="2" x2="34" y2="5" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 1" strokeDashoffset={isTyping ? typeFrame * 2 : 0} />
                      <line x1="28" y1="4.5" x2="34" y2="7.5" stroke={codeColor} strokeWidth="1" strokeDasharray="2 1" />
                      <line x1="28" y1="7" x2="34" y2="10" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 1" />

                      {/* Keyboard with keycaps flickering in sync with typing */}
                      <rect x="18" y="14" width="12" height="5" rx="0.8" fill="#090d16" stroke="#334155" strokeWidth="0.6" />
                      <rect x="19" y="15" width="2" height="1.2" fill={isTyping && typeFrame === 0 ? '#38bdf8' : '#64748b'} />
                      <rect x="22" y="15" width="2" height="1.2" fill={isTyping && typeFrame === 1 ? '#38bdf8' : '#64748b'} />
                      <rect x="25" y="15" width="2" height="1.2" fill={isTyping && typeFrame === 2 ? '#38bdf8' : '#64748b'} />
                      <rect x="20" y="17" width="8" height="1" fill={isTyping ? '#38bdf8' : '#475569'} />
                    </>
                  ) : facing === 'NE' ? (
                    // Workstation facing NE (QA / Growth rows)
                    <>
                      <polygon
                        points="0,12 24,0 48,12 24,24"
                        fill="#3e291e"
                        stroke="#60402e"
                        strokeWidth="1"
                      />
                      <polygon points="0,12 24,24 24,30 0,18" fill="#241710" />
                      <polygon points="24,24 48,12 48,18 24,30" fill="#4d3326" />

                      {/* Monitor on NE rim angled towards SW */}
                      <polygon points="18,1 36,7 36,15 18,9" fill="#061224" stroke="#10b981" strokeWidth="0.8" />
                      <line x1="21" y1="4" x2="33" y2="8" stroke={codeColor} strokeWidth="1" strokeDasharray="3 1" strokeDashoffset={isTyping ? typeFrame * 2 : 0} />
                      <line x1="21" y1="6.5" x2="33" y2="10.5" stroke="#10b981" strokeWidth="1" strokeDasharray="2 1" />
                      <line x1="21" y1="9" x2="33" y2="13" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 1" />

                      {/* Keyboard on SW rim */}
                      <rect x="10" y="11" width="11" height="5" rx="0.8" fill="#090d16" stroke="#334155" strokeWidth="0.6" />
                      <rect x="11" y="12" width="2" height="1.2" fill={isTyping && typeFrame === 0 ? '#10b981' : '#64748b'} />
                      <rect x="14" y="12" width="2" height="1.2" fill={isTyping && typeFrame === 1 ? '#10b981' : '#64748b'} />
                      <rect x="17" y="12" width="2" height="1.2" fill={isTyping && typeFrame === 2 ? '#10b981' : '#64748b'} />
                      <rect x="12" y="14" width="7" height="1" fill={isTyping ? '#10b981' : '#475569'} />
                    </>
                  ) : (
                    // Workstation facing SE (Executive / Manager desk facing camera)
                    <>
                      <polygon
                        points="0,12 24,0 48,12 24,24"
                        fill="#3e291e"
                        stroke="#60402e"
                        strokeWidth="1"
                      />
                      <polygon points="0,12 24,24 24,30 0,18" fill="#241710" />
                      <polygon points="24,24 48,12 48,18 24,30" fill="#4d3326" />

                      {/* Monitors on SE rim facing NW towards manager; we see slim dark casing back */}
                      <polygon points="10,13 20,8 20,16 10,21" fill="#0b1320" stroke="#1e293b" strokeWidth="0.8" />
                      <line x1="15" y1="17" x2="15" y2="21" stroke="#64748b" strokeWidth="1.2" />
                      <circle cx="15" cy="11.5" r="0.8" fill="#38bdf8" />

                      <polygon points="26,8 36,13 36,21 26,16" fill="#0b1320" stroke="#1e293b" strokeWidth="0.8" />
                      <line x1="31" y1="17" x2="31" y2="21" stroke="#64748b" strokeWidth="1.2" />
                      <circle cx="31" cy="11.5" r="0.8" fill="#22c55e" />

                      {/* Keyboard on NW desk surface */}
                      <rect x="18" y="5" width="12" height="5" rx="0.8" fill="#090d16" stroke="#334155" strokeWidth="0.6" />
                      <rect x="19" y="6" width="2" height="1.2" fill={isTyping && typeFrame === 0 ? '#38bdf8' : '#64748b'} />
                      <rect x="22" y="6" width="2" height="1.2" fill={isTyping && typeFrame === 1 ? '#38bdf8' : '#64748b'} />
                      <rect x="25" y="6" width="2" height="1.2" fill={isTyping && typeFrame === 2 ? '#38bdf8' : '#64748b'} />
                      <rect x="20" y="8" width="8" height="1" fill={isTyping ? '#38bdf8' : '#475569'} />
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
              typeFrame: 0,
              facing: DESK_CONFIGS[agent.id]?.facingDirection || 'NW',
              hasCoffee: false,
              isSeated: true,
              activity: 'typing',
            }

            const isSelected = selectedAgentId === agent.id
            const speechText = activeSpeech[agent.id]
            const safeX = Number.isFinite(sim.x) ? sim.x : 540
            const safeY = Number.isFinite(sim.y) ? sim.y : 340
            const zIndexVal = Math.max(10, Math.round(safeY) + (sim.isSeated ? 10 : 25))

            // Activity Director mapping & Filter Highlight
            const directedActivity: AgentDirectedActivity =
              directedActivities[agent.id]?.activity || 'working'
            const isDimmed = activeActivityFilter !== null && directedActivity !== activeActivityFilter
            const isFilterHighlighted = activeActivityFilter !== null && directedActivity === activeActivityFilter

            // Status dot color
            const dotColor =
              directedActivity === 'waiting_on_you'
                ? 'bg-amber-500 animate-ping'
                : directedActivity === 'working'
                  ? 'bg-emerald-500'
                  : directedActivity === 'eating'
                    ? 'bg-amber-400'
                    : directedActivity === 'gym'
                      ? 'bg-cyan-400'
                      : directedActivity === 'meeting'
                        ? 'bg-purple-400'
                        : directedActivity === 'arriving'
                          ? 'bg-sky-400 animate-pulse'
                          : 'bg-slate-400'

            // Anti-overlap resolved offset for this agent tag
            const tagOffset = resolvedTagOffsets.get(agent.id) || {
              offsetX: 0,
              offsetY: -22,
              isCollapsed: false,
            }

            // Cosmetic accessories for this agent
            const agentAccessories: string[] = Array.isArray(agent.accessories)
              ? agent.accessories
              : agent.id === 'eng-1'
                ? ['headphones', 'desk_plant']
                : agent.id === 'growth-1'
                  ? ['glasses', 'trophy']
                  : []

            return (
              <div
                key={agent.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectAgentAndFollow(agent)
                }}
                className={`absolute cursor-pointer transition-all duration-150 hover:scale-110 ${
                  isDimmed ? 'opacity-35 hover:opacity-100' : 'opacity-100'
                }`}
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
                {isFilterHighlighted && !isSelected && (
                  <div className="pointer-events-none absolute -inset-2 animate-pulse rounded-full border-2 border-cyan-400 bg-cyan-400/20" />
                )}

                {/* Floating Clean White Pill Name Tag with Status Dot (Name Only, Anti-Overlap) */}
                <div
                  className="pointer-events-none absolute left-1/2 flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-2 py-0.5 whitespace-nowrap shadow-md backdrop-blur-sm transition-all duration-150"
                  style={{
                    top: `${tagOffset.offsetY}px`,
                    transform: `translateX(calc(-50% + ${tagOffset.offsetX}px))`,
                  }}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
                  {!tagOffset.isCollapsed && (
                    <span className="font-mono text-[9px] font-bold tracking-tight text-slate-800">
                      {agent.name}
                    </span>
                  )}
                </div>

                {/* Typewriter Speech Bubble */}
                {speechText && (
                  <div className="animate-in fade-in zoom-in-95 pointer-events-none absolute -top-16 left-1/2 z-50 max-w-[220px] -translate-x-1/2 rounded-lg border border-cyan-400/80 bg-[#0c1322] px-2.5 py-1.5 font-mono text-[10px] text-cyan-200 shadow-2xl duration-150">
                    <p className="leading-tight">{speechText}</p>
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-cyan-400/80 bg-[#0c1322]" />
                  </div>
                )}

                {/* Cosmetic Accessories Overlay (Preserves base sprite identity) */}
                {agentAccessories.includes('headphones') && (
                  <div
                    className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 z-10"
                    title="Dev Headphones"
                  >
                    <div className="h-1.5 w-4 rounded-t-full border-t-2 border-slate-900" />
                  </div>
                )}
                {agentAccessories.includes('glasses') && (
                  <div
                    className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-10"
                    title="Terminal Shades"
                  >
                    <div className="flex gap-0.5">
                      <span className="h-1 w-1.5 bg-slate-900 rounded-xs" />
                      <span className="h-1 w-1.5 bg-slate-900 rounded-xs" />
                    </div>
                  </div>
                )}
                {agentAccessories.includes('gold_star') && (
                  <div
                    className="pointer-events-none absolute top-4 right-0 z-10"
                    title="Top Performer Pin"
                  >
                    <span className="text-[7px] leading-none">⭐</span>
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
                  typeFrame={sim.typeFrame}
                  facing={sim.facing}
                  hasCoffee={sim.hasCoffee}
                  isSeated={sim.isSeated}
                  activity={sim.activity}
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
              setShowAddAgentModal(true)
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-emerald-500/80 bg-emerald-950/60 px-3 py-1.5 font-mono text-xs font-bold whitespace-nowrap text-emerald-300 shadow transition hover:bg-emerald-900 active:scale-95"
            title="Onboard / Add Specialist Agent"
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

          {/* Walk around (Cinematic Camera Tour) */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setIsTourActive((prev) => !prev)
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs whitespace-nowrap transition active:scale-95 ${
              isTourActive
                ? 'bg-amber-600 font-bold text-white shadow-md shadow-amber-500/20 animate-pulse'
                : 'bg-slate-900/80 text-amber-300 hover:bg-slate-800'
            }`}
            title="Walk around: Autonomous campus tour"
          >
            <span>🚶</span>
            <span>{isTourActive ? 'Touring...' : 'Walk around'}</span>
          </button>

          {/* Shift change (Car commute wave) */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              handleShiftChange()
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-900/80 px-3 py-1.5 font-mono text-xs whitespace-nowrap text-sky-300 transition hover:bg-slate-800 active:scale-95"
            title="Shift change: Staggered car arrival wave"
          >
            <span>🔄</span>
            <span>Shift change</span>
          </button>

          {/* Needs You Inbox Trigger */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setShowDecisionPanel(true)
            }}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-bold whitespace-nowrap transition active:scale-95 ${
              approvals.length > 0
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
            }`}
            title="Needs You Inbox & Decision Cards"
          >
            <span>📬</span>
            <span>Needs You</span>
            {approvals.length > 0 && (
              <span className="rounded-full bg-amber-950 px-1.5 py-0.2 font-mono text-[10px] font-black text-amber-300">
                {approvals.length}
              </span>
            )}
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

      {/* ==================== 4b. LIVE ACTIVITY COUNTER CARD (BOTTOM RIGHT) ==================== */}
      <div className="pointer-events-auto absolute right-3 bottom-16 z-30">
        <ActivityCounterCard
          stats={activityStats}
          activeFilter={activeActivityFilter}
          onSelectFilter={setActiveActivityFilter}
        />
      </div>

      {/* ==================== 4c. DECISION CARDS PANEL (NEEDS YOU / TEAM / BOARD / OFFICE) ==================== */}
      <DecisionCardsPanel
        isOpen={showDecisionPanel}
        onClose={() => setShowDecisionPanel(false)}
        approvals={approvals}
        tasks={tasks}
        agents={agents}
        onApproveAction={handleApproveActionInternal}
        onCreateTask={handleCreateTaskInternal}
        onSelectAgent={(ag) => handleSelectAgentAndFollow(ag)}
      />

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
                HQ OFFICE PREFERENCES & DB STATUS
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
            <div className="mt-4 space-y-3.5 font-mono text-xs">
              {/* Database Telemetry Badge */}
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    <span className="font-bold text-emerald-300">DB CONNECTED (Postgres)</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">ONLINE</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400 truncate">
                  spacfnutrnhzxxbkjrji.supabase.co
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-emerald-900/60 pt-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">office_agents:</span>{' '}
                    <span className="font-bold text-white">{tableCounts?.office_agents ?? agents.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">office_approvals:</span>{' '}
                    <span className="font-bold text-white">{tableCounts?.office_approvals ?? approvals.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">office_logs:</span>{' '}
                    <span className="font-bold text-white">{tableCounts?.office_logs ?? logs.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">office_messages:</span>{' '}
                    <span className="font-bold text-white">{tableCounts?.office_messages ?? 47}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
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
                <span className={supabaseActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
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

      {/* ==================== 11. ONBOARD NEW SPECIALIST MODAL (+ AGENT) ==================== */}
      {showAddAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-emerald-500/50 bg-[#0c101a] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e283d] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-mono text-sm font-bold text-emerald-300">
                  ONBOARD SPECIALIST AGENT
                </h3>
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setShowAddAgentModal(false)}
                className="cursor-pointer font-mono text-sm text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddAgentSubmit} className="mt-4 space-y-3.5 font-mono text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Full Name / Callsign
                </label>
                <input
                  type="text"
                  required
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full rounded border border-[#1e283d] bg-[#111625] px-3 py-1.5 text-white placeholder-slate-500 outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Role & Specialization
                </label>
                <input
                  type="text"
                  required
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value)}
                  placeholder="e.g. AI Systems Performance Lead"
                  className="w-full rounded border border-[#1e283d] bg-[#111625] px-3 py-1.5 text-white placeholder-slate-500 outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Department / Office Room
                </label>
                <select
                  value={newAgentDept}
                  onChange={(e) => setNewAgentDept(e.target.value)}
                  className="w-full rounded border border-[#1e283d] bg-[#111625] px-3 py-1.5 text-white outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="Engineering Core">Engineering Core</option>
                  <option value="QA & SecOps NOC">QA & SecOps NOC</option>
                  <option value="Intelligence Lab">Intelligence Lab</option>
                  <option value="Growth Lab">Growth Lab</option>
                  <option value="Operations Hub">Operations Hub</option>
                  <option value="Command Center">Command Center</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Badge Color
                </label>
                <div className="flex items-center gap-2">
                  {['#3b82f6', '#10b981', '#06b6d4', '#a855f7', '#f59e0b', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewAgentColor(c)}
                      className={`h-6 w-6 rounded-full border-2 transition cursor-pointer ${
                        newAgentColor === c ? 'scale-110 border-white' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={newAgentColor}
                    onChange={(e) => setNewAgentColor(e.target.value)}
                    className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                    title="Custom color"
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="flex-1 cursor-pointer rounded border border-[#1e283d] bg-slate-900 py-2 font-bold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingAgent || !newAgentName.trim() || !newAgentRole.trim()}
                  className="flex-1 cursor-pointer rounded bg-emerald-500 py-2 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isAddingAgent ? 'Deploying...' : 'Deploy to Office'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 12. ALL HANDS MEETING TRANSCRIPT DRAWER ==================== */}
      {showTranscriptDrawer && (
        <div className="pointer-events-auto absolute top-0 right-0 z-50 flex h-full w-96 flex-col border-l border-purple-500/50 bg-[#0c101a]/98 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[#1e283d] p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="font-mono text-sm font-bold text-purple-300">
                ALL HANDS TRANSCRIPT
              </span>
              <span className="rounded bg-purple-950/80 px-2 py-0.5 font-mono text-xs text-purple-300">
                {meetingTranscript.length} lines
              </span>
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowTranscriptDrawer(false)}
              className="cursor-pointer font-mono text-sm text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="p-3 border-b border-[#1e283d] bg-[#111625]/60 flex items-center justify-between">
            <span className="font-mono text-[11px] text-slate-400">
              Session: EasyUp HQ All Hands
            </span>
            <button
              type="button"
              onClick={() => {
                const text = meetingTranscript
                  .map((t) => `[${t.time}] ${t.speaker} (${t.role}): ${t.text}`)
                  .join('\n')
                navigator.clipboard.writeText(text)
                setSpawnToast('Meeting transcript copied to clipboard!')
                setTimeout(() => setSpawnToast(null), 2500)
              }}
              className="cursor-pointer rounded border border-purple-500/50 bg-purple-950/50 px-2 py-1 font-mono text-[10px] text-purple-300 hover:bg-purple-900"
            >
              Copy Log
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 font-mono text-xs">
            {meetingTranscript.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No meeting speeches recorded yet. Start All Hands to begin deliberation.
              </div>
            ) : (
              meetingTranscript.map((t, idx) => (
                <div key={idx} className="rounded-lg border border-[#1e283d] bg-[#111625] p-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-300">{t.speaker}</span>
                    <span className="text-slate-500">{t.time}</span>
                  </div>
                  <div className="text-[10px] text-cyan-400">{t.role}</div>
                  <p className="text-slate-200 text-[11px] leading-relaxed pt-1">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
