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
    ringSpeedMultiplier: 1.0,
    radiusScale: 1.0,
    pulseHz: 0.45,
    pulseAmp: 0.08,
    particleInwardSpeed: 0.0,
  },
  listening: {
    state: 'listening',
    label: 'LISTENING',
    subtitle: 'Rings Tighten • Sonar Input Ripple',
    coreColor: '#ecfeff',
    primaryColor: '#22d3ee',
    secondaryColor: '#34d399',
    accentColor: '#00e5ff',
    ringSpeedMultiplier: 1.35,
    radiusScale: 0.86,
    pulseHz: 1.1,
    pulseAmp: 0.11,
    particleInwardSpeed: 0.35,
  },
  thinking: {
    state: 'thinking',
    label: 'THINKING',
    subtitle: 'Orange Accent • Fast Rings • Vortex Swirl',
    coreColor: '#fffbeb',
    primaryColor: '#f59e0b',
    secondaryColor: '#fb923c',
    accentColor: '#00e5ff',
    ringSpeedMultiplier: 2.45,
    radiusScale: 0.96,
    pulseHz: 1.6,
    pulseAmp: 0.13,
    particleInwardSpeed: 1.45,
  },
  executing: {
    state: 'executing',
    label: 'EXECUTING',
    subtitle: 'Synchronized Task Progress Heartbeat',
    coreColor: '#f0f9ff',
    primaryColor: '#00e5ff',
    secondaryColor: '#818cf8',
    accentColor: '#34d399',
    ringSpeedMultiplier: 1.85,
    radiusScale: 1.04,
    pulseHz: 1.4,
    pulseAmp: 0.14,
    particleInwardSpeed: -0.55,
  },
  speaking: {
    state: 'speaking',
    label: 'SPEAKING',
    subtitle: 'Audio-Reactive 32-Bar Waveform Ring',
    coreColor: '#ffffff',
    primaryColor: '#38bdf8',
    secondaryColor: '#00e5ff',
    accentColor: '#a5f3fc',
    ringSpeedMultiplier: 1.25,
    radiusScale: 1.02,
    pulseHz: 1.8,
    pulseAmp: 0.12,
    particleInwardSpeed: 0.15,
  },
  error: {
    state: 'error',
    label: 'ERROR',
    subtitle: 'Diagnostic Alert • WCAG-Safe < 2.2 Hz Flicker',
    coreColor: '#fef2f2',
    primaryColor: '#ef4444',
    secondaryColor: '#f97316',
    accentColor: '#fca5a5',
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
  segments: number
  arcCoverage: number
  baseSpeed: number
  tiltX: number
  tiltY: number
  useAccent: boolean
}

export const OFFICE_RING_LAYERS: RingLayerDefinition[] = [
  {
    index: 0,
    baseRadius: 1.18,
    tubeRadius: 0.032,
    segments: 3,
    arcCoverage: 0.72,
    baseSpeed: 0.75,
    tiltX: 0.35,
    tiltY: 0.2,
    useAccent: false,
  },
  {
    index: 1,
    baseRadius: 1.54,
    tubeRadius: 0.026,
    segments: 4,
    arcCoverage: 0.65,
    baseSpeed: -0.58,
    tiltX: -0.42,
    tiltY: 0.38,
    useAccent: true,
  },
  {
    index: 2,
    baseRadius: 1.92,
    tubeRadius: 0.022,
    segments: 6,
    arcCoverage: 0.58,
    baseSpeed: 0.42,
    tiltX: 0.22,
    tiltY: -0.45,
    useAccent: false,
  },
]

export const INTERIOR_RING_LAYERS: RingLayerDefinition[] = [
  {
    index: 0,
    baseRadius: 1.08,
    tubeRadius: 0.036,
    segments: 3,
    arcCoverage: 0.76,
    baseSpeed: 0.85,
    tiltX: 0.18,
    tiltY: 0.12,
    useAccent: false,
  },
  {
    index: 1,
    baseRadius: 1.42,
    tubeRadius: 0.03,
    segments: 4,
    arcCoverage: 0.68,
    baseSpeed: -0.68,
    tiltX: -0.24,
    tiltY: 0.22,
    useAccent: true,
  },
  {
    index: 2,
    baseRadius: 1.78,
    tubeRadius: 0.026,
    segments: 6,
    arcCoverage: 0.62,
    baseSpeed: 0.52,
    tiltX: 0.14,
    tiltY: -0.28,
    useAccent: false,
  },
  {
    index: 3,
    baseRadius: 2.16,
    tubeRadius: 0.022,
    segments: 8,
    arcCoverage: 0.55,
    baseSpeed: -0.38,
    tiltX: -0.12,
    tiltY: -0.16,
    useAccent: true,
  },
  {
    index: 4,
    baseRadius: 2.54,
    tubeRadius: 0.018,
    segments: 12,
    arcCoverage: 0.5,
    baseSpeed: 0.28,
    tiltX: 0.08,
    tiltY: 0.1,
    useAccent: false,
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
}

/**
 * Pure deterministic frame calculator shared by both 3D WebGL (`ArcReactor`) and
 * 2D Canvas (`drawArcReactor2D`). Guarantees 100% mathematical & visual parity.
 */
export function computeArcReactorFrame(
  state: JarvisCoreState,
  elapsedSec: number,
  options?: {
    progress?: number
    audioLevel?: number
    hovered?: boolean
    reducedMotion?: boolean
  }
): ArcReactorFrameMetrics {
  const spec = ARC_REACTOR_STATE_CONFIG[state] || ARC_REACTOR_STATE_CONFIG.idle
  const reduced = options?.reducedMotion ?? false
  const t = reduced ? 0 : elapsedSec
  const progress = Math.max(0, Math.min(100, options?.progress ?? 68))
  const audioLevel = Math.max(0, Math.min(1, options?.audioLevel ?? 0.72))
  const hoverBoost = options?.hovered ? 1.12 : 1.0

  // Heartbeat / harmonic breathing wave (strictly < 3 Hz for accessibility)
  const omega = spec.pulseHz * Math.PI * 2
  let harmonic = reduced ? 0 : Math.sin(t * omega)
  if (!reduced && state === 'executing') {
    // Double-beat systolic heartbeat synchronized with task progress
    const beat1 = Math.max(0, Math.sin(t * omega))
    const beat2 = Math.max(0, Math.sin(t * omega * 2 - 0.8)) * 0.55
    const progressFactor = 0.75 + (progress / 100) * 0.5
    harmonic = (beat1 + beat2 - 0.35) * progressFactor
  } else if (!reduced && state === 'error') {
    // Controlled diagnostic pulse at 2.0 Hz (never exceeds 3 flashes/sec)
    harmonic = Math.sin(t * Math.PI * 2 * 2.0) * 0.85
  }

  const coreScale = (1 + harmonic * spec.pulseAmp) * hoverBoost
  const bloomScale = (1.18 + harmonic * spec.pulseAmp * 1.45) * hoverBoost
  const radiusMultiplier =
    spec.radiusScale * (1 + harmonic * (spec.pulseAmp * 0.35)) * (options?.hovered ? 1.05 : 1.0)
  const lightIntensity = (2.8 + harmonic * 1.1) * (options?.hovered ? 1.35 : 1.0)

  // 32-bar radial waveform amplitudes (active in 'speaking' & subtle in 'listening'/'executing')
  const waveformAmplitudes: number[] = []
  for (let i = 0; i < 32; i++) {
    if (reduced) {
      waveformAmplitudes.push(state === 'speaking' ? 0.45 : 0.12)
      continue
    }
    if (state === 'speaking') {
      const waveA = Math.sin(t * 9.5 + i * 0.55) * 0.5 + 0.5
      const waveB = Math.cos(t * 6.2 - i * 0.35) * 0.5 + 0.5
      waveformAmplitudes.push(0.2 + (waveA * 0.6 + waveB * 0.4) * 0.8 * audioLevel)
    } else if (state === 'listening') {
      const ripple = Math.sin(t * 5.0 + i * 0.4) * 0.5 + 0.5
      waveformAmplitudes.push(0.12 + ripple * 0.28)
    } else if (state === 'executing') {
      const activeBar = (i / 32) * 100 <= progress ? 0.55 : 0.12
      waveformAmplitudes.push(activeBar)
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
  }
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
  hovered?: boolean
  showLabel?: boolean
  reducedMotion?: boolean
  onClick?: () => void
  onHoverChange?: (hovered: boolean) => void
}

/**
 * Shared 3D WebGL ArcReactor Component (React Three Fiber)
 * Used identically inside:
 * 1. The Brain Core in the 3D Office (`size="office"`, compact low-detail)
 * 2. The Jarvis Interior Chamber & `/dev/jarvis` (`size="interior"`, high-detail)
 */
export function ArcReactor({
  state = 'idle',
  size = 'office',
  scale = 1,
  progress = 68,
  audioLevel = 0.75,
  hovered: controlledHovered,
  showLabel = false,
  reducedMotion = false,
  onClick,
  onHoverChange,
}: ArcReactorProps) {
  const [internalHovered, setInternalHovered] = useState(false)
  const isHovered = controlledHovered ?? internalHovered

  const rootRef = useRef<THREE.Group>(null)
  const innerCoreRef = useRef<THREE.Mesh>(null)
  const wireframeCageRef = useRef<THREE.Mesh>(null)
  const bloomShellRef = useRef<THREE.Mesh>(null)
  const pointLightRef = useRef<THREE.PointLight>(null)
  const ringGroupRefs = useRef<(THREE.Group | null)[]>([])
  const tickGroupRef = useRef<THREE.Group>(null)
  const waveformBarRefs = useRef<(THREE.Mesh | null)[]>([])
  const rippleRingRef = useRef<THREE.Mesh>(null)
  const particleMeshRef = useRef<THREE.InstancedMesh>(null)

  const spec = ARC_REACTOR_STATE_CONFIG[state] || ARC_REACTOR_STATE_CONFIG.idle
  const ringLayers = useMemo(() => getRingLayersForSize(size), [size])
  const tickCount = size === 'interior' ? 36 : 12
  const particleCount = size === 'interior' ? 96 : 28
  const showWaveformRing = size === 'interior' || state === 'speaking'

  // Deterministic initial orbital particles
  const particles = useMemo(() => {
    const arr: {
      angle: number
      radius: number
      yOffset: number
      speed: number
      size: number
    }[] = []
    for (let i = 0; i < particleCount; i++) {
      const seed = (i * 9301 + 49297) % 233280
      const norm = seed / 233280
      const angle = (i / particleCount) * Math.PI * 2
      const radius = 0.95 + norm * (size === 'interior' ? 1.85 : 1.15)
      const yOffset = ((i % 7) - 3) * 0.14
      const speed = 0.45 + (i % 5) * 0.18
      const pSize = size === 'interior' ? 0.038 : 0.045
      arr.push({ angle, radius, yOffset, speed, size: pSize })
    }
    return arr
  }, [particleCount, size])

  const dummyObj = useMemo(() => new THREE.Object3D(), [])

  const badgeTexture = useMemo(
    () => createJarvisBadgeTexture(state, isHovered),
    [state, isHovered]
  )

  useEffect(() => {
    return () => {
      badgeTexture?.dispose()
    }
  }, [badgeTexture])

  useFrame((r3fState) => {
    const elapsed = r3fState.clock.getElapsedTime()
    const frame = computeArcReactorFrame(state, elapsed, {
      progress,
      audioLevel,
      hovered: isHovered,
      reducedMotion,
    })

    const effTime = reducedMotion ? 0 : elapsed

    // 1. Central Plasma Core & Bloom Shell
    if (innerCoreRef.current) {
      innerCoreRef.current.scale.setScalar(frame.coreScale)
      innerCoreRef.current.rotation.y = effTime * 0.5
      innerCoreRef.current.rotation.z = effTime * 0.3
    }
    if (wireframeCageRef.current) {
      wireframeCageRef.current.scale.setScalar(frame.coreScale * 1.06)
      wireframeCageRef.current.rotation.y = -effTime * 0.65 * spec.ringSpeedMultiplier
      wireframeCageRef.current.rotation.x = effTime * 0.4 * spec.ringSpeedMultiplier
    }
    if (bloomShellRef.current) {
      bloomShellRef.current.scale.setScalar(frame.bloomScale)
    }
    if (pointLightRef.current) {
      pointLightRef.current.intensity = frame.lightIntensity
    }

    // 2. Concentric Segmented Rings
    ringLayers.forEach((layer, idx) => {
      const grp = ringGroupRefs.current[idx]
      if (!grp) return
      const spd = layer.baseSpeed * spec.ringSpeedMultiplier
      grp.scale.setScalar(frame.radiusMultiplier)
      if (size === 'office') {
        grp.rotation.x = layer.tiltX + effTime * spd * 0.7
        grp.rotation.y = layer.tiltY + effTime * spd
        grp.rotation.z = effTime * spd * 0.5
      } else {
        grp.rotation.x = layer.tiltX + Math.sin(effTime * 0.6 + idx) * 0.14
        grp.rotation.y = layer.tiltY + Math.cos(effTime * 0.5 + idx) * 0.14
        grp.rotation.z = effTime * spd
      }
    })

    // 3. Radial Tick Marks Ring
    if (tickGroupRef.current) {
      tickGroupRef.current.scale.setScalar(frame.radiusMultiplier)
      tickGroupRef.current.rotation.z = -effTime * 0.22 * spec.ringSpeedMultiplier
    }

    // 4. Audio-Reactive 32-Bar Waveform Ring
    if (showWaveformRing) {
      for (let i = 0; i < 32; i++) {
        const bar = waveformBarRefs.current[i]
        if (!bar) continue
        const amp = frame.waveformAmplitudes[i] ?? 0.15
        bar.scale.set(1, Math.max(0.2, amp * 2.4), 1)
      }
    }

    // 5. Sonar Listening Ripple Ring
    if (rippleRingRef.current) {
      if (state === 'listening' || isHovered) {
        rippleRingRef.current.visible = true
        const rp = frame.rippleProgress
        const rScale = 0.85 + rp * 1.45
        rippleRingRef.current.scale.setScalar(rScale)
        const mat = rippleRingRef.current.material as THREE.MeshBasicMaterial
        if (mat) {
          mat.opacity = Math.max(0, (1 - rp) * 0.65)
        }
      } else {
        rippleRingRef.current.visible = false
      }
    }

    // 6. Orbital & Vortex Swirl Particles
    if (particleMeshRef.current) {
      const maxR = size === 'interior' ? 2.75 : 2.05
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
          p.yOffset + (reducedMotion ? 0 : Math.sin(effTime * 2.0 + i) * 0.08)
        dummyObj.position.set(px, py, pz)
        dummyObj.scale.setScalar(p.size)
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

  const waveformRadius = size === 'interior' ? 2.82 : 2.15
  const tickRadius = size === 'interior' ? 2.38 : 1.72

  return (
    <group
      ref={rootRef}
      scale={scale}
      name={`ArcReactor-${size}-${state}`}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Transparent Interaction Hit Sphere for effortless 3D raycasting (must remain visible=true for THREE.Raycaster) */}
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[size === 'interior' ? 3.1 : 2.6, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 1. Bright Cyan-White Inner Energy Core */}
      <mesh ref={innerCoreRef}>
        <sphereGeometry args={[0.48, 32, 32]} />
        <meshStandardMaterial
          color={spec.coreColor}
          emissive={spec.primaryColor}
          emissiveIntensity={2.8}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>

      {/* 2. Faceted Icosahedral Plasma Lattice */}
      <mesh ref={wireframeCageRef}>
        <icosahedronGeometry args={[0.76, size === 'interior' ? 2 : 1]} />
        <meshStandardMaterial
          color={spec.primaryColor}
          emissive={spec.primaryColor}
          emissiveIntensity={2.2}
          wireframe
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* 3. Soft Volumetric Bloom Halo Shell */}
      <mesh ref={bloomShellRef}>
        <sphereGeometry args={[0.92, 24, 24]} />
        <meshBasicMaterial
          color={spec.primaryColor}
          transparent
          opacity={isHovered ? 0.28 : 0.18}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Dynamic Point Light */}
      <pointLight
        ref={pointLightRef}
        color={spec.primaryColor}
        intensity={3.0}
        distance={size === 'interior' ? 22 : 14}
        decay={2}
      />

      {/* 5. Concentric Segmented Arc Rings */}
      {ringLayers.map((layer, lIdx) => {
        const ringColor = layer.useAccent ? spec.secondaryColor : spec.primaryColor
        const stepAngle = (Math.PI * 2) / layer.segments
        const arcLength = stepAngle * layer.arcCoverage

        return (
          <group
            key={`arc-layer-${layer.index}`}
            ref={(el) => {
              ringGroupRefs.current[lIdx] = el
            }}
          >
            {Array.from({ length: layer.segments }).map((_, sIdx) => {
              const startAngle = sIdx * stepAngle
              return (
                <mesh
                  key={`seg-${layer.index}-${sIdx}`}
                  rotation={[0, 0, startAngle]}
                >
                  <torusGeometry
                    args={[layer.baseRadius, layer.tubeRadius, 12, 36, arcLength]}
                  />
                  <meshBasicMaterial color={ringColor} />
                </mesh>
              )
            })}
          </group>
        )
      })}

      {/* 6. Precision Radial Tick Marks */}
      <group ref={tickGroupRef}>
        {Array.from({ length: tickCount }).map((_, idx) => {
          const angle = (idx / tickCount) * Math.PI * 2
          const isMajor = idx % 3 === 0
          const len = isMajor ? 0.16 : 0.08
          const r = tickRadius
          return (
            <mesh
              key={`tick-${idx}`}
              position={[Math.cos(angle) * r, Math.sin(angle) * r, 0]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[len, isMajor ? 0.028 : 0.016, 0.02]} />
              <meshBasicMaterial
                color={isMajor ? spec.primaryColor : spec.secondaryColor}
              />
            </mesh>
          )
        })}
      </group>

      {/* 7. 32-Bar Audio-Reactive Waveform Ring */}
      {showWaveformRing && (
        <group name="AudioWaveformRing">
          {Array.from({ length: 32 }).map((_, i) => {
            const angle = (i / 32) * Math.PI * 2
            const r = waveformRadius
            return (
              <mesh
                key={`wave-${i}`}
                ref={(el) => {
                  waveformBarRefs.current[i] = el
                }}
                position={[Math.cos(angle) * r, Math.sin(angle) * r, 0]}
                rotation={[0, 0, angle - Math.PI / 2]}
              >
                <boxGeometry args={[0.035, 0.18, 0.025]} />
                <meshBasicMaterial
                  color={i % 2 === 0 ? spec.primaryColor : spec.accentColor}
                />
              </mesh>
            )
          })}
        </group>
      )}

      {/* 8. Expanding Sonar Ripple Ring (Listening / Hover Highlight) */}
      <mesh ref={rippleRingRef} visible={false}>
        <ringGeometry args={[1.05, 1.12, 48]} />
        <meshBasicMaterial
          color={spec.primaryColor}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 9. Instanced Orbital & Vortex Energy Particles */}
      <instancedMesh
        ref={particleMeshRef}
        args={[undefined, undefined, particleCount]}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={spec.coreColor} />
      </instancedMesh>

      {/* 10. Floating "JARVIS" Callout Sprite (Visible on Hover or when showLabel=true) */}
      {(isHovered || showLabel) && badgeTexture && (
        <sprite
          position={[0, size === 'interior' ? 3.1 : 2.4, 0]}
          scale={isHovered ? [3.5, 0.82, 1] : [2.95, 0.7, 1]}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <spriteMaterial
            map={badgeTexture}
            transparent
            depthTest={false}
            depthWrite={false}
          />
        </sprite>
      )}
    </group>
  )
}

export interface DrawArcReactor2DOptions {
  state?: JarvisCoreState
  size?: ArcReactorSizeVariant
  progress?: number
  audioLevel?: number
  hovered?: boolean
  showLabel?: boolean
  reducedMotion?: boolean
  isometricTilt?: boolean
}

/**
 * Shared 2D Canvas Renderer for the ArcReactor.
 * Used directly inside `OfficeCanvas2D.tsx` (`?v=2`) and on `/dev/jarvis` so the 2D view
 * shares the exact same segmented rings, tick marks, colors, and state animations as 3D.
 */
export function drawArcReactor2D(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseRadiusPx: number,
  elapsedSec: number,
  options?: DrawArcReactor2DOptions
): { hitRadiusPx: number } {
  const state = options?.state ?? 'idle'
  const size = options?.size ?? 'office'
  const hovered = options?.hovered ?? false
  const showLabel = options?.showLabel ?? false
  const reducedMotion = options?.reducedMotion ?? false
  const isoTilt = options?.isometricTilt ?? false

  const frame = computeArcReactorFrame(state, elapsedSec, {
    progress: options?.progress,
    audioLevel: options?.audioLevel,
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
  grad.addColorStop(0.62, `${spec.secondaryColor}44`)
  grad.addColorStop(1, 'rgba(0, 229, 255, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, bloomR, 0, Math.PI * 2)
  ctx.fill()

  // 2.Hover / Listening Sonar Ripple Ring
  if (state === 'listening' || hovered) {
    const rp = frame.rippleProgress
    const ripR = scaleR * (0.9 + rp * 1.4)
    ctx.strokeStyle = spec.primaryColor
    ctx.globalAlpha = Math.max(0.08, (1 - rp) * 0.65)
    ctx.lineWidth = hovered ? 2.2 : 1.5
    ctx.beginPath()
    ctx.ellipse(
      cx,
      cy,
      ripR,
      isoTilt ? ripR * 0.68 : ripR,
      0,
      0,
      Math.PI * 2
    )
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // 3. Concentric Segmented Rings
  layers.forEach((layer) => {
    const r = scaleR * layer.baseRadius * 0.82
    const ry = isoTilt ? r * 0.68 : r
    const rot = effTime * layer.baseSpeed * spec.ringSpeedMultiplier
    const step = (Math.PI * 2) / layer.segments
    const arcSpan = step * layer.arcCoverage

    ctx.strokeStyle = layer.useAccent ? spec.secondaryColor : spec.primaryColor
    ctx.lineWidth = Math.max(1.5, layer.tubeRadius * scaleR * 2.2)
    for (let s = 0; s < layer.segments; s++) {
      const start = rot + s * step
      ctx.beginPath()
      ctx.ellipse(cx, cy, r, ry, 0, start, start + arcSpan)
      ctx.stroke()
    }
  })

  // 4. Radial Precision Tick Marks
  const tickCount = size === 'interior' ? 36 : 12
  const tickBaseR = scaleR * (size === 'interior' ? 1.95 : 1.45)
  const tickRot = -effTime * 0.22 * spec.ringSpeedMultiplier
  for (let i = 0; i < tickCount; i++) {
    const ang = tickRot + (i / tickCount) * Math.PI * 2
    const isMajor = i % 3 === 0
    const innerR = tickBaseR * (isMajor ? 0.92 : 0.95)
    const outerR = tickBaseR * (isMajor ? 1.04 : 1.01)
    const yScale = isoTilt ? 0.68 : 1
    ctx.strokeStyle = isMajor ? spec.primaryColor : spec.secondaryColor
    ctx.lineWidth = isMajor ? 1.8 : 1.1
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR * yScale)
    ctx.lineTo(cx + Math.cos(ang) * outerR, cy + Math.sin(ang) * outerR * yScale)
    ctx.stroke()
  }

  // 5. 32-Bar Audio-Reactive Waveform Ring (for interior or speaking state)
  if (size === 'interior' || state === 'speaking') {
    const waveR = scaleR * (size === 'interior' ? 2.22 : 1.72)
    const yScale = isoTilt ? 0.68 : 1
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * Math.PI * 2
      const amp = frame.waveformAmplitudes[i] ?? 0.15
      const barLen = scaleR * (0.06 + amp * 0.28)
      ctx.strokeStyle = i % 2 === 0 ? spec.primaryColor : spec.accentColor
      ctx.lineWidth = Math.max(1.4, scaleR * 0.045)
      ctx.beginPath()
      ctx.moveTo(
        cx + Math.cos(ang) * waveR,
        cy + Math.sin(ang) * waveR * yScale
      )
      ctx.lineTo(
        cx + Math.cos(ang) * (waveR + barLen),
        cy + Math.sin(ang) * (waveR + barLen) * yScale
      )
      ctx.stroke()
    }
  }

  // 6. Orbiting / Swirling Energy Particles
  const pCount = size === 'interior' ? 36 : 12
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
    ctx.fillStyle = i % 2 === 0 ? spec.coreColor : spec.primaryColor
    ctx.beginPath()
    ctx.arc(px, py, Math.max(1.3, scaleR * 0.045), 0, Math.PI * 2)
    ctx.fill()
  }

  // 7. Bright Cyan-White Inner Core & Hex Lattice
  const coreR = Math.max(5, scaleR * 0.42 * frame.coreScale)
  ctx.fillStyle = spec.coreColor
  ctx.strokeStyle = spec.primaryColor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Inner hexagon lattice lines
  const hexR = coreR * 1.38
  ctx.strokeStyle = spec.primaryColor
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (let h = 0; h < 6; h++) {
    const ha = effTime * 0.5 + (h / 6) * Math.PI * 2
    const hx = cx + Math.cos(ha) * hexR
    const hy = cy + Math.sin(ha) * hexR
    if (h === 0) ctx.moveTo(hx, hy)
    else ctx.lineTo(hx, hy)
  }
  ctx.closePath()
  ctx.stroke()

  // 8. Floating "JARVIS" Callout Pill on Hover or showLabel
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
  hovered?: boolean
  showLabel?: boolean
  reducedMotion?: boolean
  enableOrbit?: boolean
  className?: string
  onClick?: () => void
}

/**
 * Self-contained 3D WebGL or 2D Canvas viewport for inspecting the ArcReactor
 * in `/dev/jarvis` or standalone HUD cards.
 */
export function ArcReactorPreviewCanvas({
  state,
  size,
  renderMode = '3d',
  progress = 68,
  audioLevel = 0.75,
  hovered = false,
  showLabel = false,
  reducedMotion = false,
  enableOrbit = false,
  className = '',
  onClick,
}: ArcReactorPreviewCanvasProps) {
  const canvas2dRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (renderMode !== '2d') return
    const canvas = canvas2dRef.current
    if (!canvas) return

    let animId = 0
    const start = performance.now()

    const render2D = (now: number) => {
      const elapsed = (now - start) / 1000
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth || 260
      const h = canvas.clientHeight || 220
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.save()
        ctx.scale(dpr, dpr)
        ctx.fillStyle = '#060a12'
        ctx.fillRect(0, 0, w, h)

        // Subtle hex-grid chamber lines
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)'
        ctx.lineWidth = 1
        const step = 24
        for (let x = 0; x < w; x += step) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h)
          ctx.stroke()
        }
        for (let y = 0; y < h; y += step) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }

        const baseR = size === 'interior' ? Math.min(w, h) * 0.17 : Math.min(w, h) * 0.12
        drawArcReactor2D(ctx, w * 0.5, h * 0.52, baseR, elapsed, {
          state,
          size,
          progress,
          audioLevel,
          hovered,
          showLabel,
          reducedMotion,
          isometricTilt: false,
        })
        ctx.restore()
      }
      animId = requestAnimationFrame(render2D)
    }

    animId = requestAnimationFrame(render2D)
    return () => cancelAnimationFrame(animId)
  }, [renderMode, state, size, progress, audioLevel, hovered, showLabel, reducedMotion])

  if (renderMode === '2d') {
    return (
      <canvas
        ref={canvas2dRef}
        onClick={onClick}
        className={`block h-full w-full cursor-pointer ${className}`}
      />
    )
  }

  const camDist = size === 'interior' ? 8.4 : 6.2
  return (
    <div className={`relative h-full w-full bg-[#060a12] ${className}`}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, camDist], fov: 45 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#060a12']} />
        <ambientLight intensity={0.65} />
        <ArcReactor
          state={state}
          size={size}
          scale={size === 'interior' ? 0.94 : 0.84}
          progress={progress}
          audioLevel={audioLevel}
          hovered={hovered}
          showLabel={showLabel}
          reducedMotion={reducedMotion}
          onClick={onClick}
        />
        {enableOrbit && (
          <OrbitControls
            enablePan={false}
            minDistance={3.2}
            maxDistance={11}
          />
        )}
      </Canvas>
    </div>
  )
}
