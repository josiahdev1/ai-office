'use client'

import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

export type JarvisCoreState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'executing'
  | 'speaking'
  | 'error'

export type ArcReactorSizeVariant = 'office' | 'interior'

export const JARVIS_CORE_STATES: JarvisCoreState[] = [
  'idle',
  'listening',
  'thinking',
  'executing',
  'speaking',
  'error',
]

export interface ArcReactorStateSpec {
  state: JarvisCoreState
  label: string
  subtitle: string
  coreColor: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  orangeAccentColor: string
  ringSpeedMultiplier: number
  radiusScale: number
  /** Strictly < 3.0 Hz across all states to satisfy WCAG flash-rate safety */
  pulseHz: number
  pulseAmp: number
  particleInwardSpeed: number
}

export const ARC_REACTOR_STATE_CONFIG: Record<JarvisCoreState, ArcReactorStateSpec> = {
  idle: {
    state: 'idle',
    label: 'IDLE',
    subtitle: 'Slow Cyan Breathing • Nominal Standby',
    coreColor: '#f0fdff',
    primaryColor: '#00e5ff',
    secondaryColor: '#38bdf8',
    accentColor: '#0284c7',
    orangeAccentColor: '#f97316',
    ringSpeedMultiplier: 1.0,
    radiusScale: 1.0,
    pulseHz: 0.45,
    pulseAmp: 0.08,
    particleInwardSpeed: 0.0,
  },
  listening: {
    state: 'listening',
    label: 'LISTENING',
    subtitle: 'Rings Tighten • Live Mic Sonar Ripple',
    coreColor: '#ecfeff',
    primaryColor: '#22d3ee',
    secondaryColor: '#34d399',
    accentColor: '#00e5ff',
    orangeAccentColor: '#fb923c',
    ringSpeedMultiplier: 1.35,
    radiusScale: 0.86,
    pulseHz: 1.1,
    pulseAmp: 0.12,
    particleInwardSpeed: 0.35,
  },
  thinking: {
    state: 'thinking',
    label: 'THINKING',
    subtitle: 'Orange Sweep • Streamed Token Pulse • Inward Swirl',
    coreColor: '#fffbeb',
    primaryColor: '#f59e0b',
    secondaryColor: '#fb923c',
    accentColor: '#00e5ff',
    orangeAccentColor: '#ea580c',
    ringSpeedMultiplier: 2.45,
    radiusScale: 0.96,
    pulseHz: 1.6,
    pulseAmp: 0.15,
    particleInwardSpeed: 1.65,
  },
  executing: {
    state: 'executing',
    label: 'EXECUTING',
    subtitle: 'Task Progress Heartbeat • Ring Segment Fill',
    coreColor: '#f0f9ff',
    primaryColor: '#00e5ff',
    secondaryColor: '#818cf8',
    accentColor: '#34d399',
    orangeAccentColor: '#f97316',
    ringSpeedMultiplier: 1.85,
    radiusScale: 1.04,
    pulseHz: 1.4,
    pulseAmp: 0.14,
    particleInwardSpeed: -0.55,
  },
  speaking: {
    state: 'speaking',
    label: 'SPEAKING',
    subtitle: 'Word-Boundary Audio Pulse • Waveform Modulation',
    coreColor: '#ffffff',
    primaryColor: '#38bdf8',
    secondaryColor: '#00e5ff',
    accentColor: '#a5f3fc',
    orangeAccentColor: '#fb923c',
    ringSpeedMultiplier: 1.3,
    radiusScale: 1.02,
    pulseHz: 1.8,
    pulseAmp: 0.16,
    particleInwardSpeed: 0.2,
  },
  error: {
    state: 'error',
    label: 'ERROR',
    subtitle: 'Diagnostic Alert • WCAG-Safe < 2.2 Hz Flicker',
    coreColor: '#fef2f2',
    primaryColor: '#ef4444',
    secondaryColor: '#f97316',
    accentColor: '#fca5a5',
    orangeAccentColor: '#dc2626',
    ringSpeedMultiplier: 0.45,
    radiusScale: 0.94,
    pulseHz: 2.0,
    pulseAmp: 0.15,
    particleInwardSpeed: 0.0,
  },
}

export interface RingLayerDefinition {
  index: number
  baseRadius: number
  tubeRadius: number
  depthZ: number
  segments: number
  arcCoverage: number
  baseSpeed: number
  tiltX: number
  tiltY: number
  colorRole: 'cyan' | 'orange_sweep' | 'accent' | 'dashed'
}

/**
 * 3 concentric rings for exterior office Brain core (compact low-overhead)
 */
export const OFFICE_RING_LAYERS: RingLayerDefinition[] = [
  {
    index: 0,
    baseRadius: 1.15,
    tubeRadius: 0.032,
    depthZ: 0.06,
    segments: 3,
    arcCoverage: 0.72,
    baseSpeed: 0.75,
    tiltX: 0.35,
    tiltY: 0.2,
    colorRole: 'cyan',
  },
  {
    index: 1,
    baseRadius: 1.54,
    tubeRadius: 0.026,
    depthZ: 0.02,
    segments: 4,
    arcCoverage: 0.65,
    baseSpeed: -0.58,
    tiltX: -0.42,
    tiltY: 0.38,
    colorRole: 'orange_sweep',
  },
  {
    index: 2,
    baseRadius: 1.92,
    tubeRadius: 0.022,
    depthZ: -0.04,
    segments: 6,
    arcCoverage: 0.58,
    baseSpeed: 0.42,
    tiltX: 0.22,
    tiltY: -0.45,
    colorRole: 'cyan',
  },
]

/**
 * 5 primary concentric ring layers for interior Jarvis Chamber at distinct Z-depths,
 * complemented by the micro-text data ring, tick reticle ring, and radial axis lines
 * to deliver 7 to 8 concentric rings matching design-ref/jarvis-core.png.
 */
export const INTERIOR_RING_LAYERS: RingLayerDefinition[] = [
  // Ring 0: Inner lens bezel
  {
    index: 0,
    baseRadius: 0.98,
    tubeRadius: 0.034,
    depthZ: 0.1,
    segments: 3,
    arcCoverage: 0.78,
    baseSpeed: 0.88,
    tiltX: 0.08,
    tiltY: 0.06,
    colorRole: 'cyan',
  },
  // Ring 1: Precision tick reticle ring
  {
    index: 1,
    baseRadius: 1.36,
    tubeRadius: 0.028,
    depthZ: 0.06,
    segments: 4,
    arcCoverage: 0.72,
    baseSpeed: -0.65,
    tiltX: -0.1,
    tiltY: 0.12,
    colorRole: 'dashed',
  },
  // Ring 2: Primary Segmented Arc with Vibrant Orange Sweep
  {
    index: 2,
    baseRadius: 1.74,
    tubeRadius: 0.032,
    depthZ: 0.02,
    segments: 4,
    arcCoverage: 0.64,
    baseSpeed: 0.54,
    tiltX: 0.06,
    tiltY: -0.14,
    colorRole: 'orange_sweep',
  },
  // Ring 3: Telemetry data strip boundary
  {
    index: 3,
    baseRadius: 2.12,
    tubeRadius: 0.024,
    depthZ: -0.04,
    segments: 6,
    arcCoverage: 0.6,
    baseSpeed: -0.42,
    tiltX: -0.08,
    tiltY: -0.08,
    colorRole: 'cyan',
  },
  // Ring 4: Outer precision segmented ring with orange accents
  {
    index: 4,
    baseRadius: 2.56,
    tubeRadius: 0.02,
    depthZ: -0.08,
    segments: 8,
    arcCoverage: 0.55,
    baseSpeed: 0.32,
    tiltX: 0.05,
    tiltY: 0.08,
    colorRole: 'orange_sweep',
  },
]

export function getRingLayersForSize(size: ArcReactorSizeVariant): RingLayerDefinition[] {
  return size === 'interior' ? INTERIOR_RING_LAYERS : OFFICE_RING_LAYERS
}

export interface ArcReactorFrameMetrics {
  spec: ArcReactorStateSpec
  coreScale: number
  bloomScale: number
  radiusMultiplier: number
  lightIntensity: number
  waveformAmplitudes: number[]
  rippleProgress: number
  beatEnvelope: number
}

/**
 * Pure deterministic frame calculator shared by both 3D WebGL (`ArcReactor`) and
 * 2D Canvas (`drawArcReactor2D`). Guarantees 100% parity across views.
 */
export function computeArcReactorFrame(
  state: JarvisCoreState,
  elapsedSec: number,
  options?: {
    progress?: number
    audioLevel?: number
    beatPulse?: number
    hovered?: boolean
    reducedMotion?: boolean
  }
): ArcReactorFrameMetrics {
  const spec = ARC_REACTOR_STATE_CONFIG[state] || ARC_REACTOR_STATE_CONFIG.idle
  const reduced = options?.reducedMotion ?? false
  const t = reduced ? 0 : elapsedSec
  const progress = Math.max(0, Math.min(100, options?.progress ?? 68))
  const audioLevel = Math.max(0, Math.min(1, options?.audioLevel ?? 0.72))
  const beatPulse = Math.max(0, Math.min(1, options?.beatPulse ?? 0))
  const hoverBoost = options?.hovered ? 1.12 : 1.0

  // Harmonic breathing wave
  const omega = spec.pulseHz * Math.PI * 2
  let harmonic = reduced ? 0 : Math.sin(t * omega)
  if (!reduced && state === 'executing') {
    // Double-beat systolic heartbeat synchronized with real task progress
    const beat1 = Math.max(0, Math.sin(t * omega))
    const beat2 = Math.max(0, Math.sin(t * omega * 2 - 0.8)) * 0.55
    const progressFactor = 0.75 + (progress / 100) * 0.5
    harmonic = (beat1 + beat2 - 0.35) * progressFactor
  } else if (!reduced && state === 'error') {
    // Controlled diagnostic pulse at 2.0 Hz (< 3.0 Hz WCAG safe)
    harmonic = Math.sin(t * Math.PI * 2 * 2.0) * 0.85
  }

  // Combined pulse with real beat events (token arrival, word boundary, mic burst)
  const beatEnvelope = beatPulse * 0.35
  const combinedPulse = reduced ? 0 : harmonic * spec.pulseAmp + beatEnvelope

  const coreScale = (1 + combinedPulse) * hoverBoost
  const bloomScale = (1.2 + combinedPulse * 1.5) * hoverBoost
  const radiusMultiplier = reduced
    ? spec.radiusScale * (options?.hovered ? 1.05 : 1.0)
    : spec.radiusScale *
      (1 + combinedPulse * 0.4 + (state === 'listening' ? audioLevel * 0.14 : 0)) *
      (options?.hovered ? 1.05 : 1.0)
  const lightIntensity = reduced
    ? 2.8 * (options?.hovered ? 1.35 : 1.0)
    : (2.8 + combinedPulse * 2.2 + (state === 'speaking' ? audioLevel * 1.5 : 0)) *
      (options?.hovered ? 1.35 : 1.0)

  // 32-bar radial waveform amplitudes
  const waveformAmplitudes: number[] = []
  for (let i = 0; i < 32; i++) {
    if (reduced) {
      waveformAmplitudes.push(state === 'speaking' ? 0.45 : 0.12)
      continue
    }
    if (state === 'speaking') {
      const waveA = Math.sin(t * 9.5 + i * 0.55) * 0.5 + 0.5
      const waveB = Math.cos(t * 6.2 - i * 0.35) * 0.5 + 0.5
      const dynamicLevel = Math.max(audioLevel, beatPulse * 0.8)
      waveformAmplitudes.push(0.18 + (waveA * 0.6 + waveB * 0.4) * 0.85 * dynamicLevel)
    } else if (state === 'listening') {
      const ripple = Math.sin(t * 5.0 + i * 0.4) * 0.5 + 0.5
      waveformAmplitudes.push(0.1 + ripple * 0.3 * Math.max(0.3, audioLevel))
    } else if (state === 'executing') {
      const activeBar = (i / 32) * 100 <= progress ? 0.65 : 0.12
      waveformAmplitudes.push(activeBar)
    } else if (state === 'thinking') {
      const swirlBar = Math.sin(t * 12.0 - i * 0.6) * 0.5 + 0.5
      waveformAmplitudes.push(0.15 + swirlBar * 0.45)
    } else {
      waveformAmplitudes.push(0.1)
    }
  }

  const rippleProgress = reduced ? 0.5 : (t * 0.85) % 1

  return {
    spec,
    coreScale,
    bloomScale,
    radiusMultiplier,
    lightIntensity,
    waveformAmplitudes,
    rippleProgress,
    beatEnvelope,
  }
}

/**
 * Procedural monospace micro-text canvas texture for rotating data strips
 */
function createMicroTextTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = 'rgba(2, 6, 18, 0.95)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const lines = [
    'EASYUP HQ // J.A.R.V.I.S. MK-VII // SYS_CORE: 0x8F4A // VOLTAGE: 1.24V // MEM_SYNC: OK',
    'AUTONOMOUS MULTI-AGENT ORCHESTRATOR // HEURISTIC MATRIX: 100% // RETICLE_LOCK: ACTIVE',
    'STREAM_TELEMETRY: PHT_TIME_SERVER // STATUS: OPTIMAL // ENCRYPTION: SHA-256',
    'VECTOR_RADIAL: 0.9842 // THREADS: 24 ACTIVE // BUS_LOAD: 12.4% // INGEST_ID: LIVE',
  ]

  ctx.font = 'bold 15px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
  lines.forEach((line, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#00e5ff' : '#fb923c'
    ctx.fillText(line, 18, 28 + i * 26)
  })

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
}

/**
 * Creates a crisp WebGL Sprite texture for the floating "JARVIS" callout pill
 */
function createJarvisBadgeTexture(
  state: JarvisCoreState,
  hovered: boolean
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const spec = ARC_REACTOR_STATE_CONFIG[state] || ARC_REACTOR_STATE_CONFIG.idle
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 84
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const pillW = hovered ? 336 : 220
    const pillH = 52
    const pillX = (canvas.width - pillW) * 0.5
    const pillY = (canvas.height - pillH) * 0.5

    // Pill background
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, 26)
    ctx.fillStyle = hovered ? 'rgba(8, 15, 30, 0.96)' : 'rgba(9, 13, 22, 0.88)'
    ctx.fill()
    ctx.lineWidth = hovered ? 3.5 : 2
    ctx.strokeStyle = hovered ? spec.primaryColor : 'rgba(0, 229, 255, 0.65)'
    ctx.stroke()

    // Glowing indicator dot
    const dotX = pillX + 26
    const dotY = canvas.height * 0.5
    ctx.beginPath()
    ctx.arc(dotX, dotY, 7, 0, Math.PI * 2)
    ctx.fillStyle = spec.primaryColor
    ctx.fill()

    // Label text
    ctx.font = 'bold 21px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    ctx.fillStyle = '#f8fafc'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(hovered ? 'JARVIS // CLICK TO ENTER' : 'JARVIS', pillX + 42, dotY + 1)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export interface ArcReactorProps {
  state?: JarvisCoreState
  size?: ArcReactorSizeVariant
  scale?: number
  progress?: number
  audioLevel?: number
  beatPulse?: number
  hovered?: boolean
  showLabel?: boolean
  reducedMotion?: boolean
  pointerParallax?: boolean
  onClick?: () => void
  onHoverChange?: (hovered: boolean) => void
}

/**
 * Shared 3D WebGL ArcReactor Component (React Three Fiber)
 * Matched to design-ref/jarvis-core.png:
 * - 5 to 8 concentric rings at slightly different depths
 * - Segmented arcs, dashed rings, tick marks, fine radial lines
 * - Dark inner lens with faint wireframe nucleus
 * - Cyan-to-orange gradient split (cyan dominant, orange sweep on one side)
 * - Small orbiting sparks
 * - Scrolling micro text data strips
 * - Smooth pointer parallax tilt
 */
export function ArcReactor({
  state = 'idle',
  size = 'office',
  scale = 1,
  progress = 68,
  audioLevel = 0.75,
  beatPulse = 0,
  hovered: controlledHovered,
  showLabel = false,
  reducedMotion = false,
  pointerParallax = true,
  onClick,
  onHoverChange,
}: ArcReactorProps) {
  const [internalHovered, setInternalHovered] = useState(false)
  const isHovered = controlledHovered ?? internalHovered

  const rootRef = useRef<THREE.Group>(null)
  const tiltGroupRef = useRef<THREE.Group>(null)
  const innerCoreRef = useRef<THREE.Mesh>(null)
  const wireframeCageRef = useRef<THREE.Mesh>(null)
  const darkLensRef = useRef<THREE.Mesh>(null)
  const bloomShellRef = useRef<THREE.Mesh>(null)
  const pointLightRef = useRef<THREE.PointLight>(null)
  const orangeSweepLightRef = useRef<THREE.PointLight>(null)
  const ringGroupRefs = useRef<(THREE.Group | null)[]>([])
  const tickGroupRef = useRef<THREE.Group>(null)
  const radialLinesGroupRef = useRef<THREE.Group>(null)
  const microTextRingRef = useRef<THREE.Mesh>(null)
  const waveformBarRefs = useRef<(THREE.Mesh | null)[]>([])
  const rippleRingRef = useRef<THREE.Mesh>(null)
  const particleMeshRef = useRef<THREE.InstancedMesh>(null)

  const spec = ARC_REACTOR_STATE_CONFIG[state] || ARC_REACTOR_STATE_CONFIG.idle
  const ringLayers = useMemo(() => getRingLayersForSize(size), [size])
  const tickCount = size === 'interior' ? 48 : 16
  const particleCount = size === 'interior' ? 96 : 28
  const showWaveformRing = size === 'interior' || state === 'speaking'

  // Deterministic orbital sparks (mix of cyan and orange)
  const particles = useMemo(() => {
    const arr: {
      angle: number
      radius: number
      yOffset: number
      speed: number
      size: number
      isOrange: boolean
    }[] = []
    for (let i = 0; i < particleCount; i++) {
      const seed = (i * 9301 + 49297) % 233280
      const norm = seed / 233280
      const angle = (i / particleCount) * Math.PI * 2
      const radius = 0.85 + norm * (size === 'interior' ? 2.25 : 1.35)
      const yOffset = ((i % 9) - 4) * 0.12
      const speed = 0.45 + (i % 6) * 0.18
      const pSize = size === 'interior' ? 0.036 : 0.044
      // 30% of sparks are radiant orange matching the reference sweep
      const isOrange = i % 3 === 0 || (angle > Math.PI * 0.1 && angle < Math.PI * 0.7)
      arr.push({ angle, radius, yOffset, speed, size: pSize, isOrange })
    }
    return arr
  }, [particleCount, size])

  const dummyObj = useMemo(() => new THREE.Object3D(), [])

  const microTextTexture = useMemo(() => createMicroTextTexture(), [])
  const badgeTexture = useMemo(
    () => createJarvisBadgeTexture(state, isHovered),
    [state, isHovered]
  )

  useEffect(() => {
    return () => {
      badgeTexture?.dispose()
      microTextTexture?.dispose()
    }
  }, [badgeTexture, microTextTexture])

  useFrame((r3fState) => {
    const elapsed = r3fState.clock.getElapsedTime()
    const frame = computeArcReactorFrame(state, elapsed, {
      progress,
      audioLevel,
      beatPulse,
      hovered: isHovered,
      reducedMotion,
    })

    const effTime = reducedMotion ? 0 : elapsed

    // 0. Parallax Pointer Tilt
    if (tiltGroupRef.current && pointerParallax && !reducedMotion) {
      const targetRotX = -r3fState.pointer.y * 0.18
      const targetRotY = r3fState.pointer.x * 0.22
      tiltGroupRef.current.rotation.x += (targetRotX - tiltGroupRef.current.rotation.x) * 0.08
      tiltGroupRef.current.rotation.y += (targetRotY - tiltGroupRef.current.rotation.y) * 0.08
    }

    // 1. Central Plasma Core, Dark Lens & Wireframe Nucleus
    if (innerCoreRef.current) {
      innerCoreRef.current.scale.setScalar(frame.coreScale * 0.95)
      innerCoreRef.current.rotation.y = effTime * 0.5
      innerCoreRef.current.rotation.z = effTime * 0.3
    }
    if (wireframeCageRef.current) {
      wireframeCageRef.current.scale.setScalar(frame.coreScale * 1.08)
      wireframeCageRef.current.rotation.y = -effTime * 0.7 * spec.ringSpeedMultiplier
      wireframeCageRef.current.rotation.x = effTime * 0.45 * spec.ringSpeedMultiplier
    }
    if (darkLensRef.current) {
      darkLensRef.current.scale.setScalar(frame.coreScale)
    }
    if (bloomShellRef.current) {
      bloomShellRef.current.scale.setScalar(frame.bloomScale)
    }
    if (pointLightRef.current) {
      pointLightRef.current.intensity = frame.lightIntensity
    }
    if (orangeSweepLightRef.current) {
      orangeSweepLightRef.current.intensity =
        frame.lightIntensity * (state === 'thinking' ? 1.6 : 0.85)
    }

    // 2. Concentric Segmented Rings at Distinct Depths
    ringLayers.forEach((layer, idx) => {
      const grp = ringGroupRefs.current[idx]
      if (!grp) return
      const spd = layer.baseSpeed * spec.ringSpeedMultiplier
      grp.scale.setScalar(frame.radiusMultiplier)
      if (size === 'office') {
        grp.rotation.x = layer.tiltX + effTime * spd * 0.6
        grp.rotation.y = layer.tiltY + effTime * spd * 0.8
        grp.rotation.z = effTime * spd * 0.5
      } else {
        grp.rotation.x = layer.tiltX + Math.sin(effTime * 0.5 + idx) * 0.08
        grp.rotation.y = layer.tiltY + Math.cos(effTime * 0.4 + idx) * 0.08
        grp.rotation.z = effTime * spd
      }
    })

    // 3. Radial Tick Marks & Radial Line Reticles
    if (tickGroupRef.current) {
      tickGroupRef.current.scale.setScalar(frame.radiusMultiplier)
      tickGroupRef.current.rotation.z = -effTime * 0.22 * spec.ringSpeedMultiplier
    }
    if (radialLinesGroupRef.current) {
      radialLinesGroupRef.current.scale.setScalar(frame.radiusMultiplier)
      radialLinesGroupRef.current.rotation.z = effTime * 0.12 * spec.ringSpeedMultiplier
    }

    // 4. Scrolling Micro-Text Ring Texture (spins ring in 3D)
    if (microTextRingRef.current) {
      microTextRingRef.current.rotation.z = effTime * 0.18 * spec.ringSpeedMultiplier
    }

    // 5. Audio-Reactive 32-Bar Waveform Ring
    if (showWaveformRing) {
      for (let i = 0; i < 32; i++) {
        const bar = waveformBarRefs.current[i]
        if (!bar) continue
        const amp = frame.waveformAmplitudes[i] ?? 0.15
        bar.scale.set(1, Math.max(0.2, amp * 2.5), 1)
      }
    }

    // 6. Sonar Listening Ripple Ring
    if (rippleRingRef.current) {
      if (state === 'listening' || isHovered) {
        rippleRingRef.current.visible = true
        const rp = frame.rippleProgress
        const rScale = 0.85 + rp * 1.55
        rippleRingRef.current.scale.setScalar(rScale)
        const mat = rippleRingRef.current.material as THREE.MeshBasicMaterial
        if (mat) {
          mat.opacity = Math.max(0, (1 - rp) * 0.65)
        }
      } else {
        rippleRingRef.current.visible = false
      }
    }

    // 7. Orbital & Inward Swirl Sparks
    if (particleMeshRef.current) {
      const maxR = size === 'interior' ? 3.15 : 2.25
      const minR = 0.55
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const ang = p.angle + effTime * p.speed * spec.ringSpeedMultiplier
        let r = p.radius * frame.radiusMultiplier
        if (!reducedMotion && Math.abs(spec.particleInwardSpeed) > 0.01) {
          const span = maxR - minR
          const shift = (effTime * spec.particleInwardSpeed + i * 0.17) % span
          r =
            spec.particleInwardSpeed > 0
              ? maxR - ((shift + span) % span)
              : minR + ((shift + span) % span)
        }
        const px = Math.cos(ang) * r
        const pz = Math.sin(ang) * r
        const py =
          p.yOffset + (reducedMotion ? 0 : Math.sin(effTime * 2.2 + i) * 0.08)
        dummyObj.position.set(px, py, pz)
        dummyObj.scale.setScalar(p.size * (1 + frame.beatEnvelope * 0.8))
        dummyObj.updateMatrix()
        particleMeshRef.current.setMatrixAt(i, dummyObj.matrix)
      }
      particleMeshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setInternalHovered(true)
    onHoverChange?.(true)
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'pointer'
    }
  }

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setInternalHovered(false)
    onHoverChange?.(false)
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'auto'
    }
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick?.()
  }

  const waveformRadius = size === 'interior' ? 2.95 : 2.15
  const tickRadius = size === 'interior' ? 1.95 : 1.45

  return (
    <group
      ref={rootRef}
      scale={scale}
      name={`ArcReactor-${size}-${state}`}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <group ref={tiltGroupRef}>
        {/* Central Core Point Lights: Primary Cyan + Signature Orange Sweep Light */}
        <pointLight
          ref={pointLightRef}
          color={spec.primaryColor}
          intensity={3.2}
          distance={size === 'interior' ? 12 : 6}
          decay={2}
        />
        <pointLight
          ref={orangeSweepLightRef}
          position={[1.8, 1.2, 0.4]}
          color={spec.orangeAccentColor}
          intensity={2.2}
          distance={size === 'interior' ? 9 : 4}
          decay={2}
        />

        {/* 1. Dark Inner Lens (matches jarvis-core.png dark crystalline center) */}
        <mesh ref={darkLensRef} position={[0, 0, 0.05]}>
          <cylinderGeometry args={[0.62, 0.62, 0.06, 48]} />
          <meshStandardMaterial
            color="#040914"
            roughness={0.15}
            metalness={0.9}
            transparent
            opacity={0.88}
          />
        </mesh>

        {/* 2. Central Plasma Nucleus & Faint Wireframe Icosahedron */}
        <mesh ref={innerCoreRef} position={[0, 0, 0.08]}>
          <sphereGeometry args={[0.32, 28, 28]} />
          <meshBasicMaterial color={spec.coreColor} />
        </mesh>

        <mesh ref={wireframeCageRef} position={[0, 0, 0.08]}>
          <icosahedronGeometry args={[0.48, 1]} />
          <meshBasicMaterial
            color={spec.primaryColor}
            wireframe
            transparent
            opacity={0.55}
          />
        </mesh>

        {/* 3. Soft Radial Bloom Halo Shell */}
        <mesh ref={bloomShellRef} position={[0, 0, 0.02]}>
          <sphereGeometry args={[0.55, 20, 20]} />
          <meshBasicMaterial
            color={spec.primaryColor}
            transparent
            opacity={0.22}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>

        {/* 4. Concentric Segmented Rings at Distinct Z-Depths */}
        {ringLayers.map((layer, idx) => {
          const step = (Math.PI * 2) / layer.segments
          const arcSpan = step * layer.arcCoverage
          const ringColor =
            layer.colorRole === 'orange_sweep'
              ? spec.orangeAccentColor
              : layer.colorRole === 'accent'
                ? spec.accentColor
                : spec.primaryColor

          return (
            <group
              key={layer.index}
              ref={(el) => {
                ringGroupRefs.current[idx] = el
              }}
              position={[0, 0, layer.depthZ]}
            >
              {Array.from({ length: layer.segments }).map((_, s) => {
                const startAngle = s * step
                // In orange_sweep layers, give 1 arc segment radiant orange matching jarvis-core.png
                const isSweepArc =
                  layer.colorRole === 'orange_sweep' && (s === 0 || s === 1)
                const segColor = isSweepArc ? spec.orangeAccentColor : ringColor

                return (
                  <mesh key={s} rotation={[0, 0, startAngle]}>
                    <torusGeometry
                      args={[
                        layer.baseRadius,
                        layer.tubeRadius * (isSweepArc ? 1.25 : 1.0),
                        14,
                        32,
                        arcSpan,
                      ]}
                    />
                    <meshStandardMaterial
                      color={segColor}
                      emissive={segColor}
                      emissiveIntensity={isSweepArc ? 1.4 : 0.9}
                      roughness={0.2}
                      metalness={0.7}
                      transparent
                      opacity={0.92}
                    />
                  </mesh>
                )
              })}
            </group>
          )
        })}

        {/* 5. Radial Precision Tick Marks Ring */}
        <group ref={tickGroupRef} position={[0, 0, 0.04]}>
          {Array.from({ length: tickCount }).map((_, i) => {
            const ang = (i / tickCount) * Math.PI * 2
            const isMajor = i % 4 === 0
            const tickLen = isMajor ? 0.22 : 0.11
            const tickColor = isMajor ? spec.primaryColor : spec.secondaryColor
            const x = Math.cos(ang) * tickRadius
            const y = Math.sin(ang) * tickRadius

            return (
              <mesh
                key={i}
                position={[x, y, 0]}
                rotation={[0, 0, ang + Math.PI * 0.5]}
              >
                <boxGeometry args={[0.016, tickLen, 0.01]} />
                <meshBasicMaterial color={tickColor} />
              </mesh>
            )
          })}
        </group>

        {/* 6. Thin Radial Reticle Lines with 4 Cardinal Nodes */}
        {size === 'interior' && (
          <group ref={radialLinesGroupRef} position={[0, 0, -0.05]}>
            {[0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].map((ang, i) => (
              <group key={i} rotation={[0, 0, ang]}>
                {/* Thin radial axis line */}
                <mesh position={[1.85, 0, 0]}>
                  <boxGeometry args={[1.5, 0.012, 0.008]} />
                  <meshBasicMaterial
                    color={i === 0 ? spec.orangeAccentColor : spec.primaryColor}
                    transparent
                    opacity={0.4}
                  />
                </mesh>
                {/* Cardinal node dot */}
                <mesh position={[2.65, 0, 0]}>
                  <sphereGeometry args={[0.035, 12, 12]} />
                  <meshBasicMaterial
                    color={i === 0 ? spec.orangeAccentColor : spec.primaryColor}
                  />
                </mesh>
              </group>
            ))}
          </group>
        )}

        {/* 7. Scrolling Monospace Micro-Text Data Strip Ring */}
        {size === 'interior' && microTextTexture && (
          <mesh ref={microTextRingRef} position={[0, 0, -0.02]}>
            <ringGeometry args={[2.02, 2.18, 64]} />
            <meshBasicMaterial
              map={microTextTexture}
              transparent
              opacity={0.75}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* 8. Audio-Reactive 32-Bar Waveform Ring */}
        {showWaveformRing && (
          <group position={[0, 0, 0]}>
            {Array.from({ length: 32 }).map((_, i) => {
              const ang = (i / 32) * Math.PI * 2
              const x = Math.cos(ang) * waveformRadius
              const y = Math.sin(ang) * waveformRadius
              const barColor =
                i > 4 && i < 12 ? spec.orangeAccentColor : spec.primaryColor

              return (
                <mesh
                  key={i}
                  ref={(el) => {
                    waveformBarRefs.current[i] = el
                  }}
                  position={[x, y, 0]}
                  rotation={[0, 0, ang + Math.PI * 0.5]}
                >
                  <boxGeometry args={[0.024, 0.28, 0.012]} />
                  <meshStandardMaterial
                    color={barColor}
                    emissive={barColor}
                    emissiveIntensity={0.8}
                  />
                </mesh>
              )
            })}
          </group>
        )}

        {/* 9. Sonar Ripple Ring (active on listening or hover) */}
        <mesh ref={rippleRingRef} position={[0, 0, 0.02]} visible={false}>
          <ringGeometry args={[1.05, 1.1, 48]} />
          <meshBasicMaterial
            color={spec.primaryColor}
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 10. Orbiting Energy Sparks (InstancedMesh) */}
        <instancedMesh
          ref={particleMeshRef}
          args={[undefined, undefined, particleCount]}
        >
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color={spec.primaryColor} />
        </instancedMesh>

        {/* 11. Floating "JARVIS" Callout Badge Pill */}
        {showLabel && badgeTexture && (
          <sprite position={[0, size === 'interior' ? 3.4 : 2.5, 0.2]} scale={[2.4, 0.56, 1]}>
            <spriteMaterial map={badgeTexture} transparent depthTest={false} />
          </sprite>
        )}
      </group>
    </group>
  )
}

/**
 * Deterministic Canvas 2D projection function for legacy 2D view (`?v=2`)
 * Updated to match the new concentric segmented arcs, tick marks, and cyan/orange split!
 */
export interface DrawArcReactor2DOptions {
  state?: JarvisCoreState
  size?: ArcReactorSizeVariant
  progress?: number
  audioLevel?: number
  beatPulse?: number
  hovered?: boolean
  showLabel?: boolean
  reducedMotion?: boolean
  isometricTilt?: boolean
}

export function drawArcReactor2D(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseRadiusPx: number,
  arg5: number | JarvisCoreState,
  arg6?: number | DrawArcReactor2DOptions,
  arg7?: DrawArcReactor2DOptions
): { hitRadiusPx: number } {
  let state: JarvisCoreState = 'idle'
  let elapsedSec = 0
  let options: DrawArcReactor2DOptions | undefined

  if (typeof arg5 === 'number') {
    // Signature: (ctx, cx, cy, baseRadiusPx, elapsedSec, options)
    elapsedSec = arg5
    options = typeof arg6 === 'object' ? arg6 : undefined
    state = options?.state ?? 'idle'
  } else {
    // Signature: (ctx, cx, cy, baseRadiusPx, state, elapsedSec, options)
    state = arg5
    elapsedSec = typeof arg6 === 'number' ? arg6 : 0
    options = arg7
  }

  const size = options?.size ?? 'office'
  const hovered = options?.hovered ?? false
  const showLabel = options?.showLabel ?? false
  const reducedMotion = options?.reducedMotion ?? false
  const isoTilt = options?.isometricTilt ?? false

  const frame = computeArcReactorFrame(state, elapsedSec, {
    progress: options?.progress,
    audioLevel: options?.audioLevel,
    beatPulse: options?.beatPulse,
    hovered,
    reducedMotion,
  })
  const { spec } = frame
  const effTime = reducedMotion ? 0 : elapsedSec
  const layers = getRingLayersForSize(size)
  const scaleR = baseRadiusPx * frame.radiusMultiplier

  ctx.save()

  // 1. Radial Bloom Glow Halo
  const bloomR = scaleR * (size === 'interior' ? 2.9 : 2.35) * frame.bloomScale
  const grad = ctx.createRadialGradient(cx, cy, scaleR * 0.1, cx, cy, bloomR)
  grad.addColorStop(0, spec.coreColor)
  grad.addColorStop(0.28, `${spec.primaryColor}cc`)
  grad.addColorStop(0.55, `${spec.orangeAccentColor}44`)
  grad.addColorStop(1, 'rgba(0, 229, 255, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, bloomR, 0, Math.PI * 2)
  ctx.fill()

  // 2. Hover / Listening Sonar Ripple Ring
  if (state === 'listening' || hovered) {
    const rp = frame.rippleProgress
    const ripR = scaleR * (0.9 + rp * 1.4)
    ctx.strokeStyle = spec.primaryColor
    ctx.globalAlpha = Math.max(0.08, (1 - rp) * 0.65)
    ctx.lineWidth = hovered ? 2.2 : 1.5
    ctx.beginPath()
    ctx.ellipse(cx, cy, ripR, isoTilt ? ripR * 0.68 : ripR, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // 3. Concentric Segmented Rings with Cyan & Orange Sweep
  layers.forEach((layer) => {
    const r = scaleR * layer.baseRadius * 0.82
    const ry = isoTilt ? r * 0.68 : r
    const rot = effTime * layer.baseSpeed * spec.ringSpeedMultiplier
    const step = (Math.PI * 2) / layer.segments
    const arcSpan = step * layer.arcCoverage

    for (let s = 0; s < layer.segments; s++) {
      const isSweep = layer.colorRole === 'orange_sweep' && (s === 0 || s === 1)
      ctx.strokeStyle = isSweep
        ? spec.orangeAccentColor
        : layer.colorRole === 'accent'
          ? spec.secondaryColor
          : spec.primaryColor
      ctx.lineWidth = Math.max(1.5, layer.tubeRadius * scaleR * 2.2 * (isSweep ? 1.3 : 1.0))
      const start = rot + s * step
      ctx.beginPath()
      ctx.ellipse(cx, cy, r, ry, 0, start, start + arcSpan)
      ctx.stroke()
    }
  })

  // 4. Radial Precision Tick Marks
  const tickCount = size === 'interior' ? 48 : 16
  const tickBaseR = scaleR * (size === 'interior' ? 1.95 : 1.45)
  const tickRot = -effTime * 0.22 * spec.ringSpeedMultiplier
  for (let i = 0; i < tickCount; i++) {
    const ang = tickRot + (i / tickCount) * Math.PI * 2
    const isMajor = i % 4 === 0
    const innerR = tickBaseR * (isMajor ? 0.91 : 0.95)
    const outerR = tickBaseR * (isMajor ? 1.05 : 1.01)
    const yScale = isoTilt ? 0.68 : 1
    const isSweepTick = ang > Math.PI * 0.1 && ang < Math.PI * 0.6
    ctx.strokeStyle = isSweepTick
      ? spec.orangeAccentColor
      : isMajor
        ? spec.primaryColor
        : spec.secondaryColor
    ctx.lineWidth = isMajor ? 1.8 : 1.1
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR * yScale)
    ctx.lineTo(cx + Math.cos(ang) * outerR, cy + Math.sin(ang) * outerR * yScale)
    ctx.stroke()
  }

  // 5. 32-Bar Audio-Reactive Waveform Ring
  if (size === 'interior' || state === 'speaking') {
    const waveR = scaleR * (size === 'interior' ? 2.28 : 1.72)
    const yScale = isoTilt ? 0.68 : 1
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * Math.PI * 2
      const amp = frame.waveformAmplitudes[i] ?? 0.15
      const barLen = scaleR * (0.06 + amp * 0.3)
      const isOrangeBar = i > 4 && i < 12
      ctx.strokeStyle = isOrangeBar
        ? spec.orangeAccentColor
        : i % 2 === 0
          ? spec.primaryColor
          : spec.accentColor
      ctx.lineWidth = Math.max(1.4, scaleR * 0.045)
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(ang) * waveR, cy + Math.sin(ang) * waveR * yScale)
      ctx.lineTo(
        cx + Math.cos(ang) * (waveR + barLen),
        cy + Math.sin(ang) * (waveR + barLen) * yScale
      )
      ctx.stroke()
    }
  }

  // 6. Orbiting Energy Sparks (cyan + orange)
  const pCount = size === 'interior' ? 36 : 14
  for (let i = 0; i < pCount; i++) {
    const baseAng = (i / pCount) * Math.PI * 2
    const spd = (0.45 + (i % 4) * 0.2) * spec.ringSpeedMultiplier
    const ang = baseAng + effTime * spd
    let pr = scaleR * (0.75 + ((i * 7) % 11) * 0.11)
    if (!reducedMotion && spec.particleInwardSpeed > 0.5) {
      const pull = ((effTime * 0.9 + i * 0.13) % 1) * scaleR * 0.9
      pr = Math.max(scaleR * 0.35, scaleR * 1.65 - pull)
    }
    const px = cx + Math.cos(ang) * pr
    const py = cy + Math.sin(ang) * pr * (isoTilt ? 0.68 : 1)
    const isOrangeSpark = i % 3 === 0
    ctx.fillStyle = isOrangeSpark ? spec.orangeAccentColor : spec.primaryColor
    ctx.beginPath()
    ctx.arc(px, py, Math.max(1.3, scaleR * 0.045), 0, Math.PI * 2)
    ctx.fill()
  }

  // 7. Dark Inner Lens Disk & Glowing Wireframe Center
  const lensR = Math.max(6, scaleR * 0.44 * frame.coreScale)
  ctx.fillStyle = '#050b18'
  ctx.strokeStyle = spec.primaryColor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, lensR, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Inner nucleus
  const coreR = lensR * 0.55
  ctx.fillStyle = spec.coreColor
  ctx.beginPath()
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
  ctx.fill()

  // 8. Floating "JARVIS" Callout Pill on Hover
  if (hovered || showLabel) {
    const labelText = hovered ? 'JARVIS // CLICK TO ENTER' : 'JARVIS'
    ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    const textW = ctx.measureText(labelText).width
    const pillW = textW + 28
    const pillH = 22
    const pillX = cx - pillW * 0.5
    const pillY = cy - scaleR * (isoTilt ? 1.55 : 2.15) - pillH

    ctx.fillStyle = 'rgba(8, 13, 24, 0.94)'
    ctx.strokeStyle = spec.primaryColor
    ctx.lineWidth = hovered ? 1.8 : 1.2
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, 11)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = spec.primaryColor
    ctx.beginPath()
    ctx.arc(pillX + 11, pillY + pillH * 0.5, 3.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#f8fafc'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(labelText, pillX + 19, pillY + pillH * 0.5 + 0.5)
  }

  ctx.restore()
  return { hitRadiusPx: scaleR * 1.95 }
}

export interface ArcReactorPreviewCanvasProps {
  state: JarvisCoreState
  size: ArcReactorSizeVariant
  renderMode?: '3d' | '2d'
  progress?: number
  audioLevel?: number
  beatPulse?: number
  hovered?: boolean
  showLabel?: boolean
  reducedMotion?: boolean
  enableOrbit?: boolean
  className?: string
  onClick?: () => void
}

/**
 * Universal preview wrapper supporting both 3D WebGL and 2D Canvas fallback
 */
export function ArcReactorPreviewCanvas({
  state,
  size,
  renderMode = '3d',
  progress = 68,
  audioLevel = 0.75,
  beatPulse = 0,
  hovered = false,
  showLabel = false,
  reducedMotion = false,
  enableOrbit = true,
  className = 'h-full w-full',
  onClick,
}: ArcReactorPreviewCanvasProps) {
  const canvas2dRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (renderMode !== '2d') return
    const cvs = canvas2dRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    let animId = 0
    const start = performance.now()

    const render = (now: number) => {
      const elapsed = (now - start) / 1000
      const w = cvs.clientWidth || 320
      const h = cvs.clientHeight || 320
      if (cvs.width !== w || cvs.height !== h) {
        cvs.width = w
        cvs.height = h
      }
      ctx.clearRect(0, 0, w, h)
      drawArcReactor2D(ctx, w * 0.5, h * 0.5, Math.min(w, h) * 0.22, state, elapsed, {
        size,
        progress,
        audioLevel,
        beatPulse,
        hovered,
        showLabel,
        reducedMotion,
        isometricTilt: false,
      })
      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animId)
  }, [renderMode, state, size, progress, audioLevel, beatPulse, hovered, showLabel, reducedMotion])

  if (renderMode === '2d') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <canvas
          ref={canvas2dRef}
          onClick={onClick}
          className="h-full w-full cursor-pointer"
        />
      </div>
    )
  }

  const cameraFov = size === 'interior' ? 45 : 38
  const cameraZ = size === 'interior' ? 6.2 : 5.4

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, cameraZ], fov: cameraFov }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <ArcReactor
          state={state}
          size={size}
          progress={progress}
          audioLevel={audioLevel}
          beatPulse={beatPulse}
          hovered={hovered}
          showLabel={showLabel}
          reducedMotion={reducedMotion}
          onClick={onClick}
        />
        {enableOrbit && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI * 0.65}
            minPolarAngle={Math.PI * 0.35}
          />
        )}
      </Canvas>
    </div>
  )
}
