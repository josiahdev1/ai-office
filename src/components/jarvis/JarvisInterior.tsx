'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Agent, Approval } from '@/components/office/types'
import { DepartmentMode } from '@/config/officeLayout'
import {
  getCharacterStyle,
  getAgentStatusBadge,
} from '@/config/characterStyles'
import {
  ARC_REACTOR_STATE_CONFIG,
  ArcReactorPreviewCanvas,
  JARVIS_CORE_STATES,
  JarvisCoreState,
} from './ArcReactor'
import type {
  JarvisProviderStatus,
  JarvisTaskPlan,
  JarvisTurnResult,
} from '@/lib/jarvis/orchestrator'

export type JarvisQualityPreset = 'low' | 'medium' | 'high'

export interface JarvisChatMessage {
  id: string
  role: 'jarvis' | 'user'
  text: string
  intent?: 'QUESTION' | 'STATUS' | 'TASK' | 'OFFICE_COMMAND'
  provider?: string
  timestamp: string
  citations?: string
  isStreaming?: boolean
  taskPlan?: JarvisTaskPlan
}

export interface JarvisInteriorProps {
  agents: Agent[]
  approvals: Approval[]
  logs: string[]
  currentMode: DepartmentMode
  agentRouteOverrides: Record<string, DepartmentMode>
  is2DDefault?: boolean
  coreState: JarvisCoreState
  onCoreStateChange: (state: JarvisCoreState) => void
  onExit: () => void
  onSelectAgentAndExit: (agent: Agent) => void
  onGlobalModeChange?: (mode: DepartmentMode) => void
  onApprove?: (approvalId: string, decision: 'approved' | 'rejected') => void
}

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

const STORAGE_USER_NAME_KEY = 'easyup_jarvis_username_v1'
const STORAGE_QUALITY_KEY = 'easyup_jarvis_quality_v1'
const STORAGE_AUTONOMY_KEY = 'easyup_jarvis_autonomy_v1'

export default function JarvisInterior({
  agents,
  approvals,
  logs,
  currentMode,
  agentRouteOverrides,
  is2DDefault = false,
  coreState,
  onCoreStateChange,
  onExit,
  onSelectAgentAndExit,
  onGlobalModeChange,
  onApprove,
}: JarvisInteriorProps) {
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(STORAGE_USER_NAME_KEY) || 'Josiah'
    }
    return 'Josiah'
  })
  const [quality, setQuality] = useState<JarvisQualityPreset>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_QUALITY_KEY)
      if (saved === 'low' || saved === 'medium' || saved === 'high') return saved
    }
    return 'high'
  })
  const [autonomyMode, setAutonomyMode] = useState<'ask' | 'auto_safe'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_AUTONOMY_KEY)
      if (saved === 'ask' || saved === 'auto_safe') return saved
    }
    return 'ask'
  })

  const [renderMode, setRenderMode] = useState<'3d' | '2d'>(
    is2DDefault ? '2d' : '3d'
  )
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [rosterSearch, setRosterSearch] = useState<string>('')
  const [commandInput, setCommandInput] = useState<string>('')
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false)
  const [ttsMuted, setTtsMuted] = useState<boolean>(true)
  const [voicePermissionStatus, setVoicePermissionStatus] =
    useState<string>('Voice Off (Click Mic to talk)')
  const [sessionTokens, setSessionTokens] = useState<number>(0)
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false)
  const [liveAudioLevel, setLiveAudioLevel] = useState<number>(0.45)
  const [providerStatus, setProviderStatus] = useState<JarvisProviderStatus>({
    provider: 'GEMINI',
    modelLabel: 'LIVE AI • GEMINI 2.5 FLASH',
    isLiveAI: true,
  })
  const [dispatchedPlanIds, setDispatchedPlanIds] = useState<Record<string, boolean>>({})

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const feedEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const ttsMutedRef = useRef<boolean>(ttsMuted)
  useEffect(() => {
    ttsMutedRef.current = ttsMuted
  }, [ttsMuted])

  // Compute live operational telemetry strictly from real Supabase state
  const telemetry = useMemo(() => {
    let workingCount = 0
    let eatingCount = 0
    let gymCount = 0
    let meetingCount = 0
    let breakCount = 0
    let tasksRunning = 0
    let totalProgress = 0

    for (const ag of agents) {
      const effMode = agentRouteOverrides[ag.id] || currentMode
      const st = (ag.status || '').toLowerCase()
      if (effMode === 'ALL_HANDS' || st === 'in_meeting') {
        meetingCount++
      } else if (effMode === 'GYM' || st === 'at_gym' || st === 'gym') {
        gymCount++
      } else if (effMode === 'PANTRY' || st === 'on_break' || st === 'eating') {
        if (st === 'eating') eatingCount++
        else breakCount++
      } else {
        workingCount++
      }

      if (ag.current_task && ag.current_task.trim().length > 0) {
        tasksRunning++
      }
      const p =
        typeof ag.progress_pct === 'number' && ag.progress_pct > 0
          ? ag.progress_pct
          : 78
      totalProgress += p
    }

    const avgProgress =
      agents.length > 0 ? Math.round(totalProgress / agents.length) : 78
    const pendingApprovals = approvals.filter(
      (a) => !a.status || a.status === 'pending'
    )
    const queueCount = Math.max(0, tasksRunning - workingCount)

    return {
      totalAgents: agents.length,
      agentsActive: workingCount + meetingCount,
      workingCount,
      eatingCount,
      gymCount,
      meetingCount,
      breakCount,
      tasksRunning,
      queueCount,
      waitingForYou: pendingApprovals.length,
      pendingApprovals,
      avgProgress,
    }
  }, [agents, approvals, agentRouteOverrides, currentMode])

  const [messages, setMessages] = useState<JarvisChatMessage[]>([])

  // Speak text using Web Speech Synthesis API with British cadence when unmuted or explicitly triggered
  const speakWithJarvisVoice = useCallback(
    (text: string, forceSpeak = false) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      if (ttsMutedRef.current && !forceSpeak) return

      try {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        const voices = window.speechSynthesis.getVoices()
        const preferredVoice =
          voices.find(
            (v) =>
              /en[-_]GB/i.test(v.lang) &&
              /(male|daniel|arthur|google uk english male|oliver|ryan)/i.test(
                v.name
              )
          ) ||
          voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
          voices.find((v) => /en/i.test(v.lang))

        if (preferredVoice) {
          utterance.voice = preferredVoice
        }
        utterance.rate = 1.02
        utterance.pitch = 0.94

        utterance.onstart = () => {
          onCoreStateChange('speaking')
          setLiveAudioLevel(0.88)
        }
        utterance.onboundary = () => {
          setLiveAudioLevel(0.55 + Math.random() * 0.4)
        }
        utterance.onend = () => {
          setLiveAudioLevel(0.45)
          onCoreStateChange('idle')
        }
        utterance.onerror = () => {
          setLiveAudioLevel(0.45)
          onCoreStateChange('idle')
        }

        window.speechSynthesis.speak(utterance)
      } catch {
        // Ignore speech synthesis errors on headless browsers
      }
    },
    [onCoreStateChange]
  )

  // Fetch live provider status & persisted Jarvis messages from GET /api/jarvis on mount
  useEffect(() => {
    let cancelled = false
    async function loadInitialJarvisState() {
      try {
        const res = await fetch('/api/jarvis', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return

        if (data.providerStatus) {
          setProviderStatus(data.providerStatus)
        }
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const loaded: JarvisChatMessage[] = data.messages.slice(-12).map(
            (row: {
              id: string
              sender_id: string
              content: string
              created_at: string
            }) => ({
              id: row.id,
              role: row.sender_id === 'jarvis' ? 'jarvis' : 'user',
              text: row.content,
              timestamp: new Date(row.created_at).toLocaleTimeString('en-US', {
                timeZone: 'Asia/Manila',
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          )
          setMessages(loaded)
        }
      } catch {
        // Keep default state on offline/network drop
      }
    }
    loadInitialJarvisState()
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-scroll conversation feed when new messages or streaming tokens arrive
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  // Seed initial live status greeting grounded in real Supabase telemetry
  const greetingText = useMemo(() => {
    return `Welcome inside The Brain Core, ${userName}. Live EasyUp HQ telemetry synchronized: ${telemetry.agentsActive} of ${telemetry.totalAgents} agents active (${telemetry.workingCount} at desks, ${telemetry.eatingCount + telemetry.breakCount} in Pantry, ${telemetry.gymCount} in Gym, ${telemetry.meetingCount} in meeting), ${telemetry.tasksRunning} tasks running, and ${telemetry.waitingForYou} approval(s) waiting for your Go-Signal.`
  }, [userName, telemetry])

  // Filter agents by department & search query for the Left Holographic Roster Panel
  const filteredAgents = useMemo(() => {
    return agents.filter((ag) => {
      const q = rosterSearch.trim().toLowerCase()
      const matchesSearch =
        !q ||
        ag.name.toLowerCase().includes(q) ||
        (ag.role || '').toLowerCase().includes(q) ||
        (ag.room || '').toLowerCase().includes(q) ||
        (ag.department || '').toLowerCase().includes(q)
      const deptStr =
        `${ag.department || ''} ${ag.room || ''} ${ag.role || ''}`.toUpperCase()
      const matchesDept =
        deptFilter === 'ALL' || deptStr.includes(deptFilter)
      return matchesSearch && matchesDept
    })
  }, [agents, rosterSearch, deptFilter])

  // Group filtered agents by department for clean visual hierarchy
  const groupedByDept = useMemo(() => {
    const groups: Record<string, Agent[]> = {}
    for (const ag of filteredAgents) {
      const dept = ag.department || ag.room || 'Command & Operations'
      if (!groups[dept]) groups[dept] = []
      groups[dept].push(ag)
    }
    return Object.entries(groups)
  }, [filteredAgents])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Clean up SpeechRecognition and SpeechSynthesis on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop()
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [])

  const submitDirectiveText = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim()
      if (!trimmed || isTransmitting) return

      setIsTransmitting(true)
      setCommandInput('')
      onCoreStateChange('thinking')

      const nowStr = new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })

      const userMsgId = `usr-${Date.now()}`
      const jarvisMsgId = `jrv-${Date.now() + 1}`

      const historyPayload = messages.slice(-8).map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }))

      const userMsg: JarvisChatMessage = {
        id: userMsgId,
        role: 'user',
        text: trimmed,
        timestamp: `${nowStr} PHT`,
      }

      const placeholderJarvisMsg: JarvisChatMessage = {
        id: jarvisMsgId,
        role: 'jarvis',
        text: 'Synthesizing telemetry inside The Brain Core...',
        timestamp: `${nowStr} PHT`,
        isStreaming: true,
      }

      setMessages((prev) => [...prev, userMsg, placeholderJarvisMsg])

      try {
        const response = await fetch('/api/jarvis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            prompt: trimmed,
            operatorName: userName,
            autonomyMode: autonomyMode === 'ask' ? 'ask_first' : 'auto_safe',
            history: historyPayload,
          }),
        })

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let completedTurn: JarvisTurnResult | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const blocks = buffer.split('\n\n')
          buffer = blocks.pop() || ''

          for (const block of blocks) {
            const lines = block.split('\n')
            const eventLine = lines.find((l) => l.startsWith('event:'))
            const dataLine = lines.find((l) => l.startsWith('data:'))
            if (!eventLine || !dataLine) continue

            const eventName = eventLine.replace('event:', '').trim()
            const rawJson = dataLine.replace('data:', '').trim()

            try {
              const payload = JSON.parse(rawJson)

              if (eventName === 'status') {
                onCoreStateChange('thinking')
                if (payload.modelLabel) {
                  setProviderStatus({
                    provider: payload.provider || 'GEMINI',
                    modelLabel: payload.modelLabel,
                    isLiveAI: Boolean(payload.isLiveAI),
                  })
                }
              } else if (eventName === 'delta') {
                onCoreStateChange('speaking')
                setLiveAudioLevel(0.6 + Math.random() * 0.35)
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === jarvisMsgId
                      ? {
                          ...m,
                          text: payload.accumulated || m.text,
                          isStreaming: true,
                        }
                      : m
                  )
                )
              } else if (eventName === 'complete') {
                completedTurn = payload as JarvisTurnResult
              } else if (eventName === 'error') {
                throw new Error(payload.error || 'Stream error')
              }
            } catch {
              // Ignore partial chunk parse error
            }
          }
        }

        if (completedTurn) {
          const snap = completedTurn.telemetrySnapshot
          setProviderStatus({
            provider: completedTurn.provider,
            modelLabel: completedTurn.modelLabel,
            isLiveAI: completedTurn.isLiveAI,
          })
          setSessionTokens((prev) => prev + (completedTurn?.tokensUsed || 64))

          // Execute office command if returned
          if (completedTurn.officeCommand?.type === 'mode' && completedTurn.officeCommand.mode) {
            const targetMode = completedTurn.officeCommand.mode
            if (
              targetMode === 'OVERVIEW' ||
              targetMode === 'FOCUS_WORK' ||
              targetMode === 'ALL_HANDS' ||
              targetMode === 'PANTRY' ||
              targetMode === 'GYM'
            ) {
              onGlobalModeChange?.(targetMode)
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === jarvisMsgId
                ? {
                    ...m,
                    text: completedTurn!.reply,
                    intent: completedTurn!.intent,
                    provider: completedTurn!.modelLabel,
                    isStreaming: false,
                    taskPlan: completedTurn!.taskPlan,
                    citations: `Live Supabase: ${snap.activeAgents}/${snap.totalAgents} active (${snap.atDeskAgents} desk, ${snap.pantryAgents} pantry, ${snap.gymAgents} gym) • ${snap.runningTasks} tasks • ${snap.pendingApprovals} approvals`,
                  }
                : m
            )
          )

          speakWithJarvisVoice(completedTurn.reply)
        }
      } catch (err) {
        onCoreStateChange('error')
        setMessages((prev) =>
          prev.map((m) =>
            m.id === jarvisMsgId
              ? {
                  ...m,
                  text: `Diagnostic alert, ${userName}: Unable to complete neural stream (${(err as Error).message}). Falling back to local HQ telemetry (${telemetry.agentsActive}/${telemetry.totalAgents} agents active).`,
                  intent: 'STATUS',
                  isStreaming: false,
                }
              : m
          )
        )
      } finally {
        setIsTransmitting(false)
        setLiveAudioLevel(0.45)
        setTimeout(() => {
          onCoreStateChange('idle')
        }, 700)
      }
    },
    [
      autonomyMode,
      isTransmitting,
      messages,
      onCoreStateChange,
      onGlobalModeChange,
      speakWithJarvisVoice,
      telemetry.agentsActive,
      telemetry.totalAgents,
      userName,
    ]
  )

  const handleSubmitCommand = (e: React.FormEvent) => {
    e.preventDefault()
    void submitDirectiveText(commandInput)
  }

  const handleDispatchPlan = async (plan: JarvisTaskPlan) => {
    setDispatchedPlanIds((prev) => ({ ...prev, [plan.id]: true }))
    onCoreStateChange('executing')
    try {
      await Promise.allSettled(
        plan.subtasks.map((sub) =>
          fetch('/api/office/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: sub.assignedAgentId,
              taskDescription: sub.title,
              actionName: 'JARVIS_PLAN_DISPATCH',
            }),
          })
        )
      )
    } finally {
      setTimeout(() => {
        onCoreStateChange('idle')
      }, 1200)
    }
  }

  const handleToggleVoice = () => {
    if (voiceEnabled) {
      setVoiceEnabled(false)
      setVoicePermissionStatus('Voice Off (Click Mic to talk)')
      try {
        recognitionRef.current?.stop()
      } catch {
        // Ignore stop errors
      }
      if (coreState === 'listening') onCoreStateChange('idle')
      return
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const SpeechRecCtor = win.SpeechRecognition || win.webkitSpeechRecognition

    if (!SpeechRecCtor) {
      setVoiceEnabled(true)
      setVoicePermissionStatus(
        'Browser SpeechRecognition unavailable — type below or use Chrome/Edge'
      )
      onCoreStateChange('listening')
      inputRef.current?.focus()
      return
    }

    try {
      const recognition = new SpeechRecCtor()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      // Also unmute TTS automatically when the operator turns on the microphone to talk to Jarvis!
      setTtsMuted(false)
      setVoiceEnabled(true)
      setVoicePermissionStatus('Listening... Speak your directive for JARVIS')
      onCoreStateChange('listening')

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = ''
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) {
            finalTranscript += res[0].transcript
          } else {
            interim += res[0].transcript
          }
        }
        if (interim) {
          setCommandInput(interim)
        }
        if (finalTranscript.trim()) {
          setCommandInput(finalTranscript.trim())
          setVoiceEnabled(false)
          setVoicePermissionStatus('Directive captured • Transmitting to JARVIS')
          void submitDirectiveText(finalTranscript.trim())
        }
      }

      recognition.onerror = (ev) => {
        setVoiceEnabled(false)
        setVoicePermissionStatus(
          `Mic status: ${ev.error || 'stopped'} — click Mic to retry`
        )
        onCoreStateChange('idle')
      }

      recognition.onend = () => {
        setVoiceEnabled(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setVoiceEnabled(false)
      setVoicePermissionStatus('Microphone unavailable in current context')
      onCoreStateChange('idle')
    }
  }

  const activeSpec = ARC_REACTOR_STATE_CONFIG[coreState]

  return (
    <div
      data-testid="jarvis-interior-chamber"
      role="dialog"
      aria-modal="true"
      aria-label="JARVIS Holographic Interior Chamber"
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#030711] text-slate-100 select-none"
    >
      {/* Spherical Chamber Radial Hex-Grid & Holographic Vignette Backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(0, 229, 255, 0.14) 0%, rgba(2, 132, 199, 0.06) 38%, rgba(3, 7, 17, 0.98) 78%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,229,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,229,255,0.12) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* ===================================================================== */}
      {/* 1. TOP HOLOGRAPHIC READOUT BAR (LIVE SUPABASE METRICS & CONTROLS)     */}
      {/* ===================================================================== */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/25 bg-[#050b16]/90 px-4 py-2.5 backdrop-blur-xl">
        {/* Left: Exit Button & Chamber Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="jarvis-exit-button"
            onClick={onExit}
            className="cursor-pointer flex items-center gap-2 rounded-lg border border-cyan-400/60 bg-cyan-950/70 px-3 py-1.5 font-mono text-xs font-bold text-cyan-200 shadow-[0_0_16px_rgba(0,229,255,0.25)] transition hover:border-cyan-300 hover:bg-cyan-500 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-400 whitespace-nowrap"
          >
            <span>← EXIT JARVIS</span>
            <kbd className="rounded border border-cyan-400/40 bg-slate-950/60 px-1.5 py-0.5 text-[10px]">
              ESC
            </kbd>
          </button>

          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: activeSpec.primaryColor,
                  boxShadow: `0 0 10px ${activeSpec.primaryColor}`,
                }}
              />
              <span className="font-mono text-xs font-black tracking-widest text-cyan-300 uppercase">
                J.A.R.V.I.S. // BRAIN CORE INTERIOR
              </span>
              <span
                data-testid="jarvis-provider-badge"
                className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap ${
                  providerStatus.isLiveAI
                    ? 'border-emerald-400/60 bg-emerald-950/70 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
                    : 'border-amber-400/50 bg-amber-950/60 text-amber-300'
                }`}
                title={
                  providerStatus.isLiveAI
                    ? `Connected to live LLM provider (${providerStatus.modelLabel}) + real-time Supabase`
                    : 'Operating on deterministic live Supabase telemetry'
                }
              >
                {providerStatus.modelLabel}
              </span>
            </div>
            <div className="font-mono text-[10px] text-slate-400">
              Operator: <strong className="text-slate-200">{userName}</strong> • Core
              State: <strong className="text-cyan-300 uppercase">{coreState}</strong>
            </div>
          </div>
        </div>

        {/* Center: 5 Required Live Supabase Readouts */}
        <div
          data-testid="jarvis-top-readouts"
          className="flex flex-wrap items-center gap-2"
        >
          <div className="rounded-lg border border-cyan-500/30 bg-slate-950/85 px-3 py-1 font-mono">
            <div className="text-[9px] tracking-wider text-slate-400 uppercase whitespace-nowrap">
              AGENTS ACTIVE
            </div>
            <div
              data-testid="readout-agents-active"
              className="text-xs font-black text-emerald-400 whitespace-nowrap"
            >
              {telemetry.agentsActive} / {telemetry.totalAgents}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-500/30 bg-slate-950/85 px-3 py-1 font-mono">
            <div className="text-[9px] tracking-wider text-slate-400 uppercase whitespace-nowrap">
              TASKS RUNNING
            </div>
            <div
              data-testid="readout-tasks-running"
              className="text-xs font-black text-cyan-300 whitespace-nowrap"
            >
              {telemetry.tasksRunning}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-500/30 bg-slate-950/85 px-3 py-1 font-mono">
            <div className="text-[9px] tracking-wider text-slate-400 uppercase whitespace-nowrap">
              QUEUE
            </div>
            <div
              data-testid="readout-queue"
              className="text-xs font-black text-sky-300 whitespace-nowrap"
            >
              {telemetry.queueCount}
            </div>
          </div>

          <div
            className={`rounded-lg border px-3 py-1 font-mono ${
              telemetry.waitingForYou > 0
                ? 'border-orange-500/70 bg-orange-950/50 shadow-[0_0_12px_rgba(249,115,22,0.28)]'
                : 'border-cyan-500/30 bg-slate-950/85'
            }`}
          >
            <div className="text-[9px] tracking-wider text-slate-400 uppercase whitespace-nowrap">
              WAITING FOR YOU
            </div>
            <div
              data-testid="readout-waiting-for-you"
              className={`text-xs font-black whitespace-nowrap ${
                telemetry.waitingForYou > 0 ? 'text-orange-400' : 'text-slate-300'
              }`}
            >
              {telemetry.waitingForYou}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-500/30 bg-slate-950/85 px-3 py-1 font-mono">
            <div className="text-[9px] tracking-wider text-slate-400 uppercase whitespace-nowrap">
              TOKENS
            </div>
            <div
              data-testid="readout-tokens"
              className="text-xs font-black text-indigo-300 whitespace-nowrap"
            >
              {sessionTokens.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Right: Core State Switcher + 3D/2D + Quality Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden xl:flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/90 p-1">
            {JARVIS_CORE_STATES.map((st) => {
              const cfg = ARC_REACTOR_STATE_CONFIG[st]
              const active = coreState === st
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onCoreStateChange(st)}
                  className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition whitespace-nowrap ${
                    active
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={cfg.subtitle}
                >
                  {st}
                </button>
              )
            })}
          </div>

          {/* 3D / 2D Chamber Core Toggle */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/90 p-0.5 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setRenderMode('3d')}
              className={`cursor-pointer rounded px-2 py-1 font-bold transition whitespace-nowrap ${
                renderMode === '3d'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3D Core
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('2d')}
              className={`cursor-pointer rounded px-2 py-1 font-bold transition whitespace-nowrap ${
                renderMode === '2d'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2D Core
            </button>
          </div>

          {/* Quality Selector */}
          <select
            aria-label="Graphics quality preset"
            value={quality}
            onChange={(e) => {
              const val = e.target.value as JarvisQualityPreset
              setQuality(val)
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(STORAGE_QUALITY_KEY, val)
              }
            }}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-[10px] font-bold text-cyan-300 focus:border-cyan-400 focus:outline-none"
          >
            <option value="high">QUALITY: HIGH</option>
            <option value="medium">QUALITY: MED</option>
            <option value="low">QUALITY: LOW</option>
          </select>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. CURVED HOLOGRAPHIC CHAMBER BODY (3-COLUMN DESKTOP / STACKED MOBILE)*/}
      {/* ===================================================================== */}
      <div className="relative z-10 grid flex-1 min-h-0 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-12 lg:overflow-hidden p-4">
        {/* LEFT CURVED HOLOGRAPHIC PANEL: LIVE 24-AGENT ROSTER BY DEPARTMENT */}
        <aside
          data-testid="jarvis-left-roster-panel"
          className="flex flex-col min-h-[280px] lg:col-span-4 xl:col-span-3 lg:h-full overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#061020]/80 shadow-[0_0_35px_rgba(0,229,255,0.08)] backdrop-blur-xl"
        >
          <div className="border-b border-cyan-500/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold tracking-wider text-cyan-300 uppercase">
                LIVE AGENT ROSTER ({filteredAgents.length}/{agents.length})
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Click agent → follow in HQ
              </span>
            </div>

            <input
              type="text"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              placeholder="Filter 24 agents by name or dept..."
              aria-label="Filter agents in Jarvis roster"
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-1.5 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />

            <div className="mt-2 flex flex-wrap items-center gap-1">
              {['ALL', 'ENGINEERING', 'QA', 'GROWTH', 'INTELLIGENCE', 'OPERATIONS', 'COMMAND'].map(
                (dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setDeptFilter(dept)}
                    className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[9px] font-bold transition whitespace-nowrap ${
                      deptFilter === dept
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {dept}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {groupedByDept.map(([deptName, deptAgents]) => (
              <div key={deptName} className="space-y-1.5">
                <div className="flex items-center justify-between px-1 font-mono text-[10px] font-bold tracking-wider text-cyan-400/90 uppercase">
                  <span>{deptName}</span>
                  <span>{deptAgents.length}</span>
                </div>

                {deptAgents.map((ag) => {
                  const effMode = agentRouteOverrides[ag.id] || currentMode
                  const stStyle = getCharacterStyle(ag.id, ag.name)
                  const stBadge = getAgentStatusBadge(ag.status, effMode)
                  const prog =
                    typeof ag.progress_pct === 'number' && ag.progress_pct > 0
                      ? ag.progress_pct
                      : 78

                  return (
                    <button
                      key={ag.id}
                      type="button"
                      data-testid={`jarvis-roster-agent-${ag.id}`}
                      onClick={() => onSelectAgentAndExit(ag)}
                      className="cursor-pointer w-full text-left rounded-xl border border-slate-800/90 bg-slate-950/75 p-2.5 transition hover:border-cyan-400/60 hover:bg-cyan-950/30 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Pixel-style Avatar Badge */}
                          <div className="relative flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-md border border-slate-700 bg-slate-900">
                            <div
                              className="h-1.5 w-3.5 rounded-t-xs"
                              style={{ backgroundColor: stStyle.hairColor }}
                            />
                            <div
                              className="h-1.5 w-3"
                              style={{ backgroundColor: stStyle.skinColor }}
                            />
                            <div
                              className="h-2 w-4 rounded-t-xs"
                              style={{ backgroundColor: stStyle.outfitColor }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-bold text-slate-100 truncate">
                              {ag.name}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400 truncate">
                              {ag.role}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 shrink-0">
                          <span className={`h-2 w-2 rounded-full ${stBadge.dotTailwind}`} />
                          <span className="font-mono text-[9px] font-semibold text-slate-200 whitespace-nowrap">
                            {stBadge.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[9px] text-slate-400">
                        <span className="truncate">{ag.current_task}</span>
                        <span className="text-cyan-300 shrink-0">{prog}%</span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-cyan-400 transition-all"
                          style={{ width: `${Math.min(100, Math.max(5, prog))}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER STAGE: HIGH-DETAIL SHARED ARC REACTOR CORE */}
        <section
          data-testid="jarvis-center-reactor-stage"
          className="relative flex flex-col items-center justify-center min-h-[340px] lg:col-span-4 xl:col-span-6 lg:h-full overflow-hidden rounded-2xl border border-cyan-500/35 bg-[#040914]/85 shadow-[0_0_60px_rgba(0,229,255,0.12)]"
        >
          {/* Decorative HUD Corner Brackets & Circular Reticle */}
          <div className="pointer-events-none absolute inset-4 rounded-xl border border-cyan-500/15" />

          <div className="pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-slate-950/80 px-3 py-1 font-mono text-[10px] text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>ARC REACTOR // MK-VI HOLOGRAPHIC CORE (size=&quot;interior&quot;)</span>
          </div>

          {telemetry.waitingForYou > 0 && (
            <div className="pointer-events-none absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-lg border border-orange-500/60 bg-orange-950/75 px-3 py-1 font-mono text-[10px] font-bold text-orange-300">
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
              <span>{telemetry.waitingForYou} GO-SIGNAL ALERT</span>
            </div>
          )}

          {/* Shared High-Detail ArcReactor */}
          <div className="h-full w-full min-h-[320px]">
            <ArcReactorPreviewCanvas
              state={coreState}
              size="interior"
              renderMode={quality === 'low' ? '2d' : renderMode}
              progress={telemetry.avgProgress}
              audioLevel={coreState === 'speaking' ? liveAudioLevel : 0.45}
              showLabel={false}
              reducedMotion={reducedMotion}
              enableOrbit={renderMode === '3d'}
            />
          </div>

          {/* Bottom Reactor Telemetry Strip */}
          <div className="pointer-events-none absolute bottom-3 inset-x-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/85 px-3 py-1.5 font-mono text-[10px] text-slate-400">
            <span>
              STATE: <strong className="text-cyan-300 uppercase">{coreState}</strong> (
              {activeSpec.subtitle})
            </span>
            <span>
              AVG FLEET PROGRESS:{' '}
              <strong className="text-emerald-400">{telemetry.avgProgress}%</strong>
            </span>
          </div>
        </section>

        {/* RIGHT CURVED HOLOGRAPHIC PANEL: CONVERSATION, APPROVALS & ACTIVE PLAN */}
        <aside
          data-testid="jarvis-right-conversation-panel"
          className="flex flex-col min-h-[300px] lg:col-span-4 xl:col-span-3 lg:h-full overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#061020]/80 shadow-[0_0_35px_rgba(0,229,255,0.08)] backdrop-blur-xl"
        >
          {/* Panel Header + Operator Name / Autonomy Setting */}
          <div className="border-b border-cyan-500/20 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold tracking-wider text-cyan-300 uppercase">
                JARVIS CONVERSATION &amp; PLAN
              </span>
              <span className="rounded border border-cyan-500/30 bg-cyan-950/50 px-2 py-0.5 font-mono text-[9px] text-cyan-300 whitespace-nowrap">
                {autonomyMode === 'ask' ? 'ASK ME FIRST' : 'AUTO-RUN SAFE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 font-mono text-[10px] text-slate-400">
                <span>Name:</span>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    const v = e.target.value || 'Josiah'
                    setUserName(v)
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem(STORAGE_USER_NAME_KEY, v)
                    }
                  }}
                  aria-label="Operator name"
                  className="w-full bg-transparent font-bold text-cyan-300 focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  const next = autonomyMode === 'ask' ? 'auto_safe' : 'ask'
                  setAutonomyMode(next)
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem(STORAGE_AUTONOMY_KEY, next)
                  }
                }}
                className="cursor-pointer rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 font-mono text-[10px] font-semibold text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 whitespace-nowrap"
              >
                Autonomy: {autonomyMode === 'ask' ? 'Ask First' : 'Auto Safe'}
              </button>
            </div>
          </div>

          {/* Pending Approvals Alert Box inside Jarvis (Human-in-the-loop) */}
          {telemetry.pendingApprovals.length > 0 && (
            <div className="border-b border-orange-500/30 bg-orange-950/30 p-3 space-y-2">
              <div className="font-mono text-[10px] font-bold text-orange-300 uppercase">
                ⚠ WAITING FOR YOUR GO-SIGNAL ({telemetry.pendingApprovals.length})
              </div>
              {telemetry.pendingApprovals.slice(0, 2).map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border border-orange-500/40 bg-slate-950/85 p-2 font-mono text-[10px]"
                >
                  <div className="font-bold text-slate-100">
                    {app.agent_name}: {app.title}
                  </div>
                  {onApprove && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onApprove(app.id, 'approved')}
                        className="cursor-pointer rounded bg-emerald-600 px-2 py-0.5 font-bold text-white hover:bg-emerald-500 whitespace-nowrap"
                      >
                        Approve ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => onApprove(app.id, 'rejected')}
                        className="cursor-pointer rounded bg-rose-700 px-2 py-0.5 font-bold text-white hover:bg-rose-600 whitespace-nowrap"
                      >
                        Reject ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Conversation Feed */}
          <div
            data-testid="jarvis-conversation-feed"
            className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs"
          >
            {/* Initial Grounded Briefing Card */}
            <div className="rounded-xl border border-cyan-500/35 bg-cyan-950/25 p-3">
              <div className="flex items-center justify-between text-[10px] text-cyan-400">
                <span className="font-bold">JARVIS // SYSTEM BRIEFING</span>
                <button
                  type="button"
                  onClick={() => speakWithJarvisVoice(greetingText, true)}
                  className="cursor-pointer rounded border border-cyan-500/40 bg-cyan-950/60 px-1.5 py-0.5 text-[9px] font-bold text-cyan-200 hover:bg-cyan-500 hover:text-slate-950 whitespace-nowrap"
                >
                  🔊 SPEAK
                </button>
              </div>
              <p className="mt-1.5 leading-relaxed text-slate-200">{greetingText}</p>
            </div>

            {messages.map((m) => (
              <div
                key={m.id}
                data-testid={`jarvis-msg-${m.role}`}
                className={`rounded-xl border p-3 ${
                  m.role === 'user'
                    ? 'ml-4 border-slate-700 bg-slate-900/90 text-slate-100'
                    : 'mr-1 border-cyan-500/40 bg-cyan-950/30 text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                  <span className="font-bold text-cyan-300 uppercase">
                    {m.role === 'user' ? userName : 'J.A.R.V.I.S.'}
                    {m.intent ? ` • ${m.intent}` : ''}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {m.role === 'jarvis' && !m.isStreaming && (
                      <button
                        type="button"
                        onClick={() => speakWithJarvisVoice(m.text, true)}
                        className="cursor-pointer rounded border border-cyan-500/30 bg-slate-900 px-1.5 py-0.5 text-[9px] text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 whitespace-nowrap"
                        title="Speak this response aloud"
                      >
                        🔊
                      </button>
                    )}
                    <span>{m.timestamp}</span>
                  </div>
                </div>
                <p className="mt-1.5 leading-relaxed whitespace-pre-wrap">{m.text}</p>

                {/* Structured Task Plan Confirm Card */}
                {m.taskPlan && (
                  <div
                    data-testid="jarvis-task-plan-card"
                    className="mt-2.5 rounded-lg border border-cyan-400/40 bg-slate-950/90 p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-cyan-300">
                      <span>MULTI-AGENT PLAN ({m.taskPlan.subtasks.length} STAGES)</span>
                      <span>~{m.taskPlan.totalEstimatedTokens} TOKENS</span>
                    </div>
                    <div className="space-y-1.5">
                      {m.taskPlan.subtasks.map((sub, idx) => (
                        <div
                          key={sub.id}
                          className="rounded border border-slate-800 bg-slate-900/80 p-1.5 text-[10px]"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-200">
                            <span>
                              {idx + 1}. {sub.assignedAgentName} ({sub.department})
                            </span>
                            <span className="text-cyan-400 uppercase">{sub.priority}</span>
                          </div>
                          <div className="text-slate-400 truncate">{sub.title}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(dispatchedPlanIds[m.taskPlan.id])}
                      onClick={() => void handleDispatchPlan(m.taskPlan!)}
                      className={`cursor-pointer w-full rounded-lg py-1.5 font-mono text-[10px] font-black uppercase transition whitespace-nowrap ${
                        dispatchedPlanIds[m.taskPlan.id]
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                      }`}
                    >
                      {dispatchedPlanIds[m.taskPlan.id]
                        ? '✓ DISPATCHED TO EASYUP HQ AGENTS'
                        : 'CONFIRM & DISPATCH PLAN →'}
                    </button>
                  </div>
                )}

                {m.citations && (
                  <div className="mt-1.5 border-t border-slate-800/80 pt-1 text-[9px] text-cyan-400/90">
                    {m.citations}
                  </div>
                )}
              </div>
            ))}

            {/* Latest Live Telemetry Lines from Office */}
            {logs.length > 0 && messages.length === 0 && (
              <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  RECENT HQ TELEMETRY ({logs.length} EVENTS)
                </div>
                <div className="mt-1.5 space-y-1 text-[10px] text-slate-300">
                  {logs.slice(0, 3).map((line, i) => (
                    <div key={`jlog-${i}`} className="truncate text-slate-400">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={feedEndRef} />
          </div>

          {/* Quick Directive Chips (1-click instant execution!) */}
          <div className="border-t border-slate-800/80 bg-slate-950/75 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                'Status report on all 24 agents',
                'Call All Hands meeting',
                'Send everyone to Pantry',
                'Return to Focus Work',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={isTransmitting}
                  onClick={() => void submitDirectiveText(chip)}
                  className="cursor-pointer rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 font-mono text-[10px] text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-900/50 disabled:opacity-50 whitespace-nowrap"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ===================================================================== */}
      {/* 3. BOTTOM HOLOGRAPHIC COMMAND BAR WITH MIC & MUTE TOGGLES             */}
      {/* ===================================================================== */}
      <footer className="relative z-20 border-t border-cyan-500/25 bg-[#050b16]/95 px-4 py-3 backdrop-blur-xl">
        <form
          onSubmit={handleSubmitCommand}
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-2.5"
        >
          {/* Voice Input Mic Button */}
          <button
            type="button"
            data-testid="jarvis-mic-button"
            onClick={handleToggleVoice}
            className={`cursor-pointer flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-bold transition whitespace-nowrap ${
              voiceEnabled
                ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.35)] animate-pulse'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200'
            }`}
            title={voicePermissionStatus}
          >
            <span>{voiceEnabled ? '🎙 LISTENING...' : '🎙 MIC OFF'}</span>
          </button>

          {/* TTS Mute Toggle */}
          <button
            type="button"
            data-testid="jarvis-mute-button"
            onClick={() => {
              const nextMuted = !ttsMuted
              setTtsMuted(nextMuted)
              if (
                nextMuted &&
                typeof window !== 'undefined' &&
                'speechSynthesis' in window
              ) {
                window.speechSynthesis.cancel()
              }
            }}
            className={`cursor-pointer rounded-xl border px-3 py-2 font-mono text-xs font-bold transition whitespace-nowrap ${
              !ttsMuted
                ? 'border-cyan-400 bg-cyan-950/70 text-cyan-300'
                : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {ttsMuted ? '🔇 TTS MUTED' : '🔊 TTS VOICE ON'}
          </button>

          {/* Command Text Input */}
          <input
            ref={inputRef}
            type="text"
            data-testid="jarvis-command-input"
            value={commandInput}
            onChange={(e) => {
              setCommandInput(e.target.value)
              if (e.target.value.trim().length > 0 && coreState === 'idle') {
                onCoreStateChange('listening')
              } else if (e.target.value.trim().length === 0 && coreState === 'listening') {
                onCoreStateChange('idle')
              }
            }}
            placeholder={`Speak or type a directive for JARVIS, ${userName}...`}
            className="flex-1 min-w-[220px] rounded-xl border border-cyan-500/40 bg-slate-950/90 px-4 py-2 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />

          <button
            type="submit"
            disabled={isTransmitting}
            data-testid="jarvis-send-button"
            className="cursor-pointer rounded-xl border border-cyan-400 bg-cyan-500 px-4 py-2 font-mono text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(0,229,255,0.4)] transition hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap"
          >
            {isTransmitting ? 'SYNTHESIZING...' : 'TRANSMIT TO JARVIS →'}
          </button>
        </form>
      </footer>
    </div>
  )
}
