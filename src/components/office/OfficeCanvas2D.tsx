'use client'

import React, { useEffect, useRef } from 'react'
import { Agent } from '@/components/office/types'
import {
  ROOMS_3D,
  AGENT_WORKSTATIONS_3D,
  CAMERA_PRESETS,
  PARKED_VEHICLES,
  HIGHWAY_CARS,
  STREETLIGHT_POSITIONS,
  DepartmentMode,
  getAgentTargetPosition,
  projectIso3DTo2D,
  BOSS_PATROL_ROUTE,
  CLEANER_1_PATROL_ROUTE,
  CLEANER_2_PATROL_ROUTE,
  SERVER_ADMIN_PATROL_ROUTE,
} from '@/config/officeLayout'
import {
  WELLNESS_BEDS,
  MENS_CR_STALLS,
  WOMENS_CR_STALLS,
  SERVER_RACKS,
} from '@/lib/office/wellnessWing'
import {
  getCharacterStyle,
  getAgentStatusBadge,
} from '@/config/characterStyles'
import {
  AgentNavState,
  stepAgentNavigation,
} from '@/config/walkwayGrid'
import {
  drawArcReactor2D,
  JarvisCoreState,
} from '@/components/jarvis/ArcReactor'

export interface OfficeCanvas2DProps {
  agents: Agent[]
  mode: DepartmentMode
  agentRouteOverrides?: Record<string, DepartmentMode>
  selectedAgentId?: string | null
  onSelectAgent: (agent: Agent) => void
  onArriveAgent?: (
    agentId: string,
    finalPos: [number, number, number],
    effectiveMode: DepartmentMode
  ) => void
  onResetCamera?: () => void
  coreState?: JarvisCoreState
  onClickCore?: () => void
  isDivingToJarvis?: boolean
  className?: string
}

function shadeHex(hex: string, factor: number): string {
  const cleaned = hex.replace('#', '')
  const num = parseInt(cleaned, 16)
  const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 255) * factor)))
  const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 255) * factor)))
  const b = Math.min(255, Math.max(0, Math.round((num & 255) * factor)))
  return `rgb(${r}, ${g}, ${b})`
}

function getFacingAngle(facing: 'SE' | 'SW' | 'NE' | 'NW'): number {
  switch (facing) {
    case 'SE':
      return 0
    case 'SW':
      return Math.PI / 2
    case 'NW':
      return Math.PI
    case 'NE':
      return -Math.PI / 2
    default:
      return 0
  }
}

export default function OfficeCanvas2D({
  agents,
  mode,
  agentRouteOverrides = {},
  selectedAgentId,
  onSelectAgent,
  onArriveAgent,
  onResetCamera,
  coreState = 'idle',
  onClickCore,
  isDivingToJarvis = false,
  className = '',
}: OfficeCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Live refs for 60fps animation loop without re-binding listeners
  const agentsRef = useRef<Agent[]>(agents)
  const modeRef = useRef<DepartmentMode>(mode)
  const overridesRef = useRef<Record<string, DepartmentMode>>(agentRouteOverrides)
  const selectedIdRef = useRef<string | null | undefined>(selectedAgentId)
  const onSelectRef = useRef(onSelectAgent)
  const onArriveRef = useRef(onArriveAgent)
  const coreStateRef = useRef<JarvisCoreState>(coreState)
  const onClickCoreRef = useRef(onClickCore)
  const isDivingRef = useRef(isDivingToJarvis)
  const coreHoveredRef = useRef(false)
  const coreScreenBoxRef = useRef<{
    px: number
    py: number
    radius: number
    pillRect: [number, number, number, number]
  }>({
    px: 0,
    py: 0,
    radius: 36,
    pillRect: [0, 0, 0, 0],
  })

  useEffect(() => {
    agentsRef.current = agents
  }, [agents])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    overridesRef.current = agentRouteOverrides
  }, [agentRouteOverrides])

  useEffect(() => {
    selectedIdRef.current = selectedAgentId
  }, [selectedAgentId])

  useEffect(() => {
    onSelectRef.current = onSelectAgent
  }, [onSelectAgent])

  useEffect(() => {
    onArriveRef.current = onArriveAgent
  }, [onArriveAgent])

  useEffect(() => {
    coreStateRef.current = coreState
  }, [coreState])

  useEffect(() => {
    onClickCoreRef.current = onClickCore
  }, [onClickCore])

  useEffect(() => {
    isDivingRef.current = isDivingToJarvis
  }, [isDivingToJarvis])

  // Camera state (targetX, targetZ, zoom) + user pan/zoom offsets
  const camStateRef = useRef({
    targetX: CAMERA_PRESETS[mode].target[0],
    targetZ: CAMERA_PRESETS[mode].target[2],
    zoom: CAMERA_PRESETS[mode].zoom,
    panOffsetX: 0,
    panOffsetZ: 0,
    zoomMultiplier: 1,
    lastMode: mode,
  })
  const savedCamBeforeDiveRef = useRef<{
    targetX: number
    targetZ: number
    zoom: number
    panOffsetX: number
    panOffsetZ: number
    zoomMultiplier: number
  } | null>(null)
  const wasDiving2DRef = useRef(false)

  // Persistent A* navigation state per agent
  const agentNavMapRef = useRef<Record<string, AgentNavState>>({})
  // Autonomous patrol state per agent (Boss, Cleaners, Server Admin)
  const agentRoamMapRef = useRef<Record<string, { index: number; elapsed: number }>>({})

  // Screen hitboxes for canvas click detection (body + canvas nameplate)
  const agentScreenBoxesRef = useRef<
    Record<
      string,
      {
        px: number
        py: number
        radius: number
        tagRect: [number, number, number, number]
        agent: Agent
      }
    >
  >({})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animationFrameId: number
    let lastTime = performance.now()

    let isDragging = false
    let dragStartX = 0
    let dragStartY = 0
    let clickMoved = false

    const isPointInCore = (x: number, y: number) => {
      const coreBox = coreScreenBoxRef.current
      const [rx, ry, rw, rh] = coreBox.pillRect
      const inPill = x >= rx && x <= rx + rw && y >= ry && y <= ry + rh
      const inCircle = Math.hypot(x - coreBox.px, y - coreBox.py) <= coreBox.radius
      return inPill || inCircle
    }

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true
      clickMoved = false
      dragStartX = e.clientX
      dragStartY = e.clientY
    }

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const isOverCore = isPointInCore(mx, my)
      coreHoveredRef.current = isOverCore
      if (!isDragging) {
        canvas.style.cursor = isOverCore ? 'pointer' : 'grab'
        return
      }
      const dx = e.clientX - dragStartX
      const dy = e.clientY - dragStartY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        clickMoved = true
      }
      dragStartX = e.clientX
      dragStartY = e.clientY

      const z = camStateRef.current.zoom * camStateRef.current.zoomMultiplier
      const isoX = dx / z
      const isoY = dy / z
      const worldDX = isoX * 0.70710678 + isoY * 1.22474487
      const worldDZ = -isoX * 0.70710678 + isoY * 1.22474487
      camStateRef.current.panOffsetX -= worldDX
      camStateRef.current.panOffsetZ -= worldDZ
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return
      isDragging = false
      if (!clickMoved) {
        const rect = canvas.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const clickY = e.clientY - rect.top
        if (isPointInCore(clickX, clickY)) {
          onClickCoreRef.current?.()
          return
        }
        const boxes = Object.values(agentScreenBoxesRef.current)
        for (let i = boxes.length - 1; i >= 0; i--) {
          const b = boxes[i]
          const [rx, ry, rw, rh] = b.tagRect
          const inTag =
            clickX >= rx && clickX <= rx + rw && clickY >= ry && clickY <= ry + rh
          const inBody = Math.hypot(clickX - b.px, clickY - b.py) <= b.radius
          if (inTag || inBody) {
            onSelectRef.current(b.agent)
            break
          }
        }
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.08 : 0.92
      camStateRef.current.zoomMultiplier = Math.min(
        2.5,
        Math.max(0.4, camStateRef.current.zoomMultiplier * factor)
      )
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    const render = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000)
      lastTime = now
      const elapsed = now / 1000

      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth || 960
      const height = canvas.clientHeight || 640
      if (
        canvas.width !== Math.round(width * dpr) ||
        canvas.height !== Math.round(height * dpr)
      ) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.save()
      ctx.scale(dpr, dpr)

      const currentMode = modeRef.current
      const cam = camStateRef.current
      if (cam.lastMode !== currentMode) {
        cam.lastMode = currentMode
        cam.panOffsetX = 0
        cam.panOffsetZ = 0
        cam.zoomMultiplier = 1
      }

      const diving = isDivingRef.current
      if (diving && !wasDiving2DRef.current) {
        wasDiving2DRef.current = true
        savedCamBeforeDiveRef.current = {
          targetX: cam.targetX,
          targetZ: cam.targetZ,
          zoom: cam.zoom,
          panOffsetX: cam.panOffsetX,
          panOffsetZ: cam.panOffsetZ,
          zoomMultiplier: cam.zoomMultiplier,
        }
      } else if (!diving && wasDiving2DRef.current) {
        wasDiving2DRef.current = false
        if (savedCamBeforeDiveRef.current) {
          cam.targetX = savedCamBeforeDiveRef.current.targetX
          cam.targetZ = savedCamBeforeDiveRef.current.targetZ
          cam.zoom = savedCamBeforeDiveRef.current.zoom
          cam.panOffsetX = savedCamBeforeDiveRef.current.panOffsetX
          cam.panOffsetZ = savedCamBeforeDiveRef.current.panOffsetZ
          cam.zoomMultiplier = savedCamBeforeDiveRef.current.zoomMultiplier
        }
      }

      const preset = CAMERA_PRESETS[currentMode] || CAMERA_PRESETS.OVERVIEW
      let targetPresetZoom = preset.zoom
      if (currentMode === 'OVERVIEW') {
        targetPresetZoom = Math.min(12.5, Math.max(8.0, Math.min(width / 140, height / 72)))
      }
      const lerpFactor = 1 - Math.exp(-(diving ? 6.5 : 5.0) * dt)
      if (diving) {
        cam.targetX += (0 - cam.targetX) * lerpFactor
        cam.targetZ += (0 - cam.targetZ) * lerpFactor
        cam.zoom += (68 - cam.zoom) * lerpFactor
      } else {
        cam.targetX += (preset.target[0] + cam.panOffsetX - cam.targetX) * lerpFactor
        cam.targetZ += (preset.target[2] + cam.panOffsetZ - cam.targetZ) * lerpFactor
        cam.zoom += (targetPresetZoom * cam.zoomMultiplier - cam.zoom) * lerpFactor
      }

      const targetX = cam.targetX
      const targetZ = cam.targetZ
      const zoom = cam.zoom

      const project = (x: number, y: number, z: number) =>
        projectIso3DTo2D(x, y, z, targetX, targetZ, zoom, width, height)

      // Helper: Draw a 3D box in 2D Isometric Canvas
      const drawBox = (
        cx: number,
        cy: number,
        cz: number,
        w: number,
        h: number,
        d: number,
        color: string,
        rotY = 0,
        alpha = 1,
        strokeColor?: string
      ) => {
        const hw = w * 0.5
        const hh = h * 0.5
        const hd = d * 0.5
        const cosA = Math.cos(rotY)
        const sinA = Math.sin(rotY)

        const toWorld = (lx: number, ly: number, lz: number) => {
          const wx = cx + lx * cosA + lz * sinA
          const wy = cy + ly
          const wz = cz - lx * sinA + lz * cosA
          return project(wx, wy, wz)
        }

        const t0 = toWorld(-hw, hh, -hd)
        const t1 = toWorld(hw, hh, -hd)
        const t2 = toWorld(hw, hh, hd)
        const t3 = toWorld(-hw, hh, hd)

        const b0 = toWorld(-hw, -hh, -hd)
        const b1 = toWorld(hw, -hh, -hd)
        const b2 = toWorld(hw, -hh, hd)
        const b3 = toWorld(-hw, -hh, hd)

        ctx.save()
        ctx.globalAlpha = alpha

        const sides = [
          { pts: [t3, t2, b2, b3], nx: sinA, nz: cosA },
          { pts: [t2, t1, b1, b2], nx: cosA, nz: -sinA },
          { pts: [t1, t0, b0, b1], nx: -sinA, nz: -cosA },
          { pts: [t0, t3, b3, b0], nx: -cosA, nz: sinA },
        ]

        for (const side of sides) {
          if (side.nx + side.nz > -0.01) {
            const shade =
              0.62 + 0.24 * ((side.nx * 0.35 + side.nz * 0.65) * 0.5 + 0.5)
            ctx.fillStyle = shadeHex(color, shade)
            ctx.beginPath()
            ctx.moveTo(side.pts[0].px, side.pts[0].py)
            ctx.lineTo(side.pts[1].px, side.pts[1].py)
            ctx.lineTo(side.pts[2].px, side.pts[2].py)
            ctx.lineTo(side.pts[3].px, side.pts[3].py)
            ctx.closePath()
            ctx.fill()
            if (strokeColor) {
              ctx.strokeStyle = strokeColor
              ctx.lineWidth = 0.75
              ctx.stroke()
            }
          }
        }

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(t0.px, t0.py)
        ctx.lineTo(t1.px, t1.py)
        ctx.lineTo(t2.px, t2.py)
        ctx.lineTo(t3.px, t3.py)
        ctx.closePath()
        ctx.fill()
        if (strokeColor) {
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = 0.85
          ctx.stroke()
        }

        ctx.restore()
      }

      // Helper: Draw a 3D vertical cylinder
      const drawCylinder = (
        cx: number,
        cy: number,
        cz: number,
        radiusTop: number,
        radiusBottom: number,
        height: number,
        color: string,
        segments = 18,
        alpha = 1,
        strokeColor?: string
      ) => {
        const hh = height * 0.5
        const topPts: { px: number; py: number }[] = []
        const botPts: { px: number; py: number }[] = []
        for (let i = 0; i < segments; i++) {
          const ang = (i / segments) * Math.PI * 2
          const cos = Math.cos(ang)
          const sin = Math.sin(ang)
          topPts.push(project(cx + cos * radiusTop, cy + hh, cz + sin * radiusTop))
          botPts.push(
            project(cx + cos * radiusBottom, cy - hh, cz + sin * radiusBottom)
          )
        }

        ctx.save()
        ctx.globalAlpha = alpha

        for (let i = 0; i < segments; i++) {
          const next = (i + 1) % segments
          const midAng = ((i + 0.5) / segments) * Math.PI * 2
          const nx = Math.cos(midAng)
          const nz = Math.sin(midAng)
          if (nx + nz > -0.15) {
            const shade = 0.64 + 0.25 * ((nx + nz) / 1.414)
            ctx.fillStyle = shadeHex(color, shade)
            ctx.beginPath()
            ctx.moveTo(topPts[i].px, topPts[i].py)
            ctx.lineTo(topPts[next].px, topPts[next].py)
            ctx.lineTo(botPts[next].px, botPts[next].py)
            ctx.lineTo(botPts[i].px, botPts[i].py)
            ctx.closePath()
            ctx.fill()
          }
        }

        ctx.fillStyle = color
        ctx.beginPath()
        for (let i = 0; i < segments; i++) {
          if (i === 0) ctx.moveTo(topPts[i].px, topPts[i].py)
          else ctx.lineTo(topPts[i].px, topPts[i].py)
        }
        ctx.closePath()
        ctx.fill()
        if (strokeColor) {
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = 1.2
          ctx.stroke()
        }

        ctx.restore()
      }

      // Helper: Draw a flat ground ring
      const drawGroundRing = (
        cx: number,
        cy: number,
        cz: number,
        innerR: number,
        outerR: number,
        color: string,
        alpha = 1
      ) => {
        const segments = 32
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1.5, (outerR - innerR) * zoom * 0.75)
        const midR = (innerR + outerR) * 0.5
        ctx.beginPath()
        for (let i = 0; i <= segments; i++) {
          const ang = (i / segments) * Math.PI * 2
          const p = project(
            cx + Math.cos(ang) * midR,
            cy,
            cz + Math.sin(ang) * midR
          )
          if (i === 0) ctx.moveTo(p.px, p.py)
          else ctx.lineTo(p.px, p.py)
        }
        ctx.stroke()
        ctx.restore()
      }

      // Helper: Draw a Low-Poly Vehicle (Sedan, SUV, Scooter) in 2D Isometric Canvas
      const drawVehicle2D = (
        vx: number,
        vy: number,
        vz: number,
        rotY: number,
        color: string,
        type: 'sedan' | 'suv' | 'scooter' = 'sedan'
      ) => {
        const cosV = Math.cos(rotY)
        const sinV = Math.sin(rotY)
        const toV = (lx: number, ly: number, lz: number): [number, number, number] => [
          vx + lx * cosV + lz * sinV,
          vy + ly,
          vz - lx * sinV + lz * cosV,
        ]

        if (type === 'scooter') {
          drawBox(vx, vy + 0.28, vz, 0.45, 0.32, 1.25, color, rotY)
          const [hbx, hby, hbz] = toV(0, 0.55, 0.42)
          drawBox(hbx, hby, hbz, 0.6, 0.08, 0.08, '#cbd5e1', rotY)
          return
        }

        const isSuv = type === 'suv'
        drawBox(vx, vy + 0.34, vz, 1.45, 0.42, 2.9, color, rotY, 1, '#0f172a')
        const [cabX, cabY, cabZ] = toV(0, 0.68, isSuv ? -0.1 : -0.15)
        drawBox(
          cabX,
          cabY,
          cabZ,
          1.28,
          0.34,
          isSuv ? 1.85 : 1.5,
          '#0f172a',
          rotY,
          0.9,
          color
        )
        // Headlights
        const [hl1x, hl1y, hl1z] = toV(-0.48, 0.36, 1.46)
        const [hl2x, hl2y, hl2z] = toV(0.48, 0.36, 1.46)
        drawBox(hl1x, hl1y, hl1z, 0.24, 0.12, 0.05, '#fef08a', rotY)
        drawBox(hl2x, hl2y, hl2z, 0.24, 0.12, 0.05, '#fef08a', rotY)
        // Taillights
        const [tl1x, tl1y, tl1z] = toV(-0.48, 0.38, -1.46)
        const [tl2x, tl2y, tl2z] = toV(0.48, 0.38, -1.46)
        drawBox(tl1x, tl1y, tl1z, 0.26, 0.1, 0.05, '#ef4444', rotY)
        drawBox(tl2x, tl2y, tl2z, 0.26, 0.1, 0.05, '#ef4444', rotY)
      }

      // =========================================================================
      // LAYER 0: Clear Background (#080b12)
      // =========================================================================
      ctx.fillStyle = '#080b12'
      ctx.fillRect(0, 0, width, height)

      // =========================================================================
      // LAYER 1: Exterior Lawn, Sidewalk, Highway, Parking Bays & Foundation
      // =========================================================================
      drawBox(-8, -0.7, 0, 102, 0.8, 86, '#14532d', 0, 1, '#166534')
      drawBox(0, -0.62, 0, 51.5, 1.15, 51.5, '#334155', 0, 1, '#475569')
      drawBox(-34, -0.62, 0, 22, 1.15, 51.5, '#334155', 0, 1, '#475569')
      drawBox(0, -0.58, 0, 47.6, 1.2, 47.6, '#0f172a', 0, 1, '#1e293b')
      drawBox(-34, -0.58, 0, 20, 1.2, 47.6, '#0f172a', 0, 1, '#1e293b')

      // South Dual-Lane Asphalt Highway (Z = 29.8)
      drawBox(0, -0.25, 29.8, 80, 0.12, 6.8, '#1e293b', 0, 1, '#334155')
      for (const dx of [-32, -24, -16, -8, 0, 8, 16, 24, 32]) {
        drawBox(dx, -0.18, 29.8, 3.2, 0.02, 0.18, '#facc15')
      }
      // South Zebra Crosswalk
      for (const cx of [-1.5, -0.75, 0, 0.75, 1.5]) {
        drawBox(cx, -0.17, 26.8, 0.42, 0.02, 2.2, '#f8fafc')
      }

      // East Avenue & Employee Parking Lot (X = 30.8)
      drawBox(30.8, -0.25, -1, 12.4, 0.12, 62, '#1e293b', 0, 1, '#334155')
      for (const dz of [-26, -18, -10, -2, 6, 14, 22]) {
        drawBox(33.8, -0.18, dz, 0.18, 0.02, 3.2, '#facc15')
      }
      // Painted Parking Stall Lines
      for (const pz of [-19.5, -14.5, -9.5, -4.5, 0.5, 5.5, 10.5]) {
        drawBox(26.8, -0.17, pz, 3.6, 0.02, 0.14, '#e2e8f0')
      }
      // East Zebra Crosswalk
      for (const cz of [-1.2, -0.4, 0.4, 1.2]) {
        drawBox(24.6, -0.17, cz, 1.8, 0.02, 0.38, '#f8fafc')
      }

      // =========================================================================
      // LAYER 2: Checkered Corridors & 9 Room Floor Slabs
      // =========================================================================
      drawBox(0, 0.02, -8, 46, 0.04, 2.4, '#cbd5e1')
      drawBox(0, 0.02, 8, 46, 0.04, 2.4, '#cbd5e1')
      drawBox(-8, 0.02, 0, 2.4, 0.04, 46, '#e2e8f0')
      drawBox(8, 0.02, 0, 2.4, 0.04, 46, '#e2e8f0')

      // West Wing Corridors connecting to Server Room, Wellness Wing & Comfort Rooms
      drawBox(-25.5, 0.02, -8, 5.0, 0.04, 2.4, '#cbd5e1')
      drawBox(-25.5, 0.02, 8, 5.0, 0.04, 2.4, '#cbd5e1')
      drawBox(-27.5, 0.02, 0, 2.4, 0.04, 44, '#e2e8f0')
      // Glowing Doorway Thresholds at Main Office <-> West Wing Portals (z = -8, z = 8)
      drawBox(-23.2, 0.045, -8, 0.5, 0.02, 2.4, '#38bdf8', 0, 0.65, '#7dd3fc')
      drawBox(-23.2, 0.045, 8, 0.5, 0.02, 2.4, '#38bdf8', 0, 0.65, '#7dd3fc')

      for (const room of Object.values(ROOMS_3D)) {
        const [rx, ry, rz] = room.center
        if (room.id === 'COMMAND') {
          drawCylinder(rx, ry + 0.04, rz, 6.8, 6.8, 0.08, '#090d16', 36, 1, '#00e5ff')
          drawGroundRing(rx, ry + 0.09, rz, 6.65, 6.9, '#00e5ff', 0.9)
          drawGroundRing(rx, ry + 0.09, rz, 4.15, 4.3, '#00e5ff', 0.45)
        } else {
          drawBox(
            rx,
            ry + 0.03,
            rz,
            room.size[0],
            0.06,
            room.size[1],
            room.floorColor,
            0,
            1,
            room.accentColor
          )
        }
      }

      // =========================================================================
      // LAYER 3: Exterior Full Back Walls (North & West) + Swaying Trees
      // =========================================================================
      const treeCoords: [number, number][] = [
        [-48, -26],
        [-14, -28],
        [14, -28],
        [28, -28],
        [-48, 0],
        [-48, 14],
        [-48, 25],
        [-14, 25.2],
        [14, 25.2],
      ]
      treeCoords.forEach(([tx, tz], idx) => {
        const sway = Math.sin(elapsed * 1.6 + idx) * 0.08
        drawCylinder(tx, 0.6, tz, 0.22, 0.3, 1.2, '#78350f', 10)
        drawCylinder(
          tx + sway,
          1.8,
          tz,
          0.9,
          1.15,
          1.5,
          idx % 2 === 0 ? '#15803d' : '#16a34a',
          12
        )
      })

      // Main Building & Wellness Wing North Walls (z = -23.2)
      drawBox(0, 1.4, -23.2, 46.8, 2.8, 0.4, '#1e293b', 0, 1, '#334155')
      drawBox(-33, 1.4, -23.2, 19.2, 2.8, 0.4, '#1e293b', 0, 1, '#334155')
      for (const wx of [-35, -16, 0, 16]) {
        drawBox(wx, 1.6, -22.98, 8, 1.6, 0.06, '#38bdf8', 0, 0.55, '#7dd3fc')
      }
      drawBox(0, 2.25, -22.92, 18, 0.85, 0.08, '#0f172a', 0, 1, '#00e5ff')

      // Wellness Wing West Exterior Wall (x = -41.2)
      drawBox(-41.2, 1.4, 0, 0.4, 2.8, 46.8, '#1e293b', 0, 1, '#334155')
      for (const wz of [-16, -2, 6, 16]) {
        drawBox(-40.98, 1.6, wz, 0.06, 1.6, 6, '#38bdf8', 0, 0.55, '#7dd3fc')
      }

      // =========================================================================
      // LAYER 4: Depth-Sorted 3D Scene Queue (Interior + Vehicles + Streetlights)
      // =========================================================================
      const renderQueue: { depth: number; draw: () => void }[] = []
      const enqueue = (x: number, z: number, yBias: number, draw: () => void) => {
        renderQueue.push({ depth: x + z + yBias * 0.05, draw })
      }

      // Main Building West Wall (Divided into 3 segments with 2.4m doorway openings at z = -8 and z = 8)
      const westWallSegments: [number, number, number][] = [
        [-16.3, 14.2, -16], // North segment (-23.4 to -9.2)
        [0, 13.6, 0],       // Middle segment (-6.8 to +6.8)
        [16.3, 14.2, 16],   // South segment (+9.2 to +23.4)
      ]
      for (const [segZ, segLen, winZ] of westWallSegments) {
        enqueue(-23.2, segZ, 1.4, () => {
          drawBox(-23.2, 1.4, segZ, 0.4, 2.8, segLen, '#1e293b', 0, 1, '#334155')
          drawBox(-22.98, 1.6, winZ, 0.06, 1.6, 8, '#38bdf8', 0, 0.55, '#7dd3fc')
        })
      }

      // 4.0 Parked Vehicles, Moving Highway Cars & Streetlights
      for (const pv of PARKED_VEHICLES) {
        enqueue(pv.pos[0], pv.pos[2], 0.5, () => {
          drawVehicle2D(pv.pos[0], -0.18, pv.pos[2], pv.rotY, pv.color, pv.type)
        })
      }

      HIGHWAY_CARS.forEach((cfg, idx) => {
        const span = cfg.range[1] - cfg.range[0]
        const raw = cfg.initialOffset + elapsed * cfg.speed * cfg.dir - cfg.range[0]
        const wrapped = (((raw % span) + span) % span) + cfg.range[0]
        const carX = cfg.axis === 'x' ? wrapped : cfg.laneCoord
        const carZ = cfg.axis === 'x' ? cfg.laneCoord : wrapped
        const carRot =
          cfg.axis === 'x'
            ? cfg.dir > 0
              ? Math.PI / 2
              : -Math.PI / 2
            : cfg.dir > 0
            ? 0
            : Math.PI
        enqueue(carX, carZ, 0.5, () => {
          drawVehicle2D(
            carX,
            -0.18,
            carZ,
            carRot,
            cfg.color,
            idx % 2 === 0 ? 'sedan' : 'suv'
          )
        })
      })

      for (const [lx, ly, lz] of STREETLIGHT_POSITIONS) {
        enqueue(lx, lz, 1.4, () => {
          drawCylinder(lx, ly + 1.3, lz, 0.06, 0.09, 2.6, '#475569', 8)
          drawBox(lx, ly + 2.65, lz, 0.38, 0.12, 0.38, '#fef08a', 0, 1, '#facc15')
        })
      }

      // 4A. Interior Partition Half-Walls with Doorways
      const partitions: [number, number, number, number, number, number][] = [
        [-20, 0.5, -8, 6, 1.0, 0.3],
        [-12, 0.5, -8, 6, 1.0, 0.3],
        [-20, 0.5, 8, 6, 1.0, 0.3],
        [-12, 0.5, 8, 6, 1.0, 0.3],
        [20, 0.5, -8, 6, 1.0, 0.3],
        [12, 0.5, -8, 6, 1.0, 0.3],
        [20, 0.5, 8, 6, 1.0, 0.3],
        [12, 0.5, 8, 6, 1.0, 0.3],
        // West Wing Dividing Walls (Nap Room, Men's CR, Women's CR, Server Room, Facilities, Cafeteria)
        [-35, 1.0, -11, 12, 2.0, 0.3],
        [-35, 1.0, -5, 12, 2.0, 0.3],
        [-35, 1.0, 1, 12, 2.0, 0.3],
        [-35, 1.0, 6, 12, 2.0, 0.3],
        [-35, 1.0, 11, 12, 2.0, 0.3],
        // West Wing East Corridor Wall with 6 Doorways
        [-28.9, 1.0, -19.5, 0.3, 2.0, 5.0],
        [-28.9, 1.0, -12, 0.3, 2.0, 6.0],
        [-28.9, 1.0, -5, 0.3, 2.0, 4.0],
        [-28.9, 1.0, 0.75, 0.3, 2.0, 3.5],
        [-28.9, 1.0, 6, 0.3, 2.0, 3.0],
        [-28.9, 1.0, 12.25, 0.3, 2.0, 5.5],
        [-28.9, 1.0, 19.5, 0.3, 2.0, 5.0],
      ]
      for (const [px, py, pz, pw, ph, pd] of partitions) {
        enqueue(px, pz, py, () => {
          drawBox(px, py, pz, pw, ph, pd, '#334155', 0, 1, '#475569')
        })
      }

      // 4B. Central Command Center ("The Brain") Core & Consoles
      enqueue(0, 0, 1.5, () => {
        const isCoreHovered = coreHoveredRef.current
        drawCylinder(
          0,
          0.35,
          0,
          1.5,
          1.9,
          0.7,
          '#090d16',
          24,
          1,
          isCoreHovered ? '#ffffff' : '#00e5ff'
        )
        drawGroundRing(
          0,
          0.72,
          0,
          1.2,
          1.45,
          isCoreHovered ? '#ffffff' : '#00e5ff',
          0.95
        )

        const centerProj = project(0, 1.9, 0)
        const baseRadiusPx = Math.max(9, 0.92 * zoom)
        const pillW = isCoreHovered ? 190 : 88
        const pillH = 26
        const pillX = centerProj.px - pillW * 0.5
        const pillY = centerProj.py - baseRadiusPx * 1.55 - pillH

        coreScreenBoxRef.current = {
          px: centerProj.px,
          py: centerProj.py,
          radius: Math.max(48, baseRadiusPx * 3.4),
          pillRect: [pillX - 10, pillY - 10, pillW + 20, pillH + 20],
        }

        drawArcReactor2D(
          ctx,
          centerProj.px,
          centerProj.py,
          baseRadiusPx,
          elapsed,
          {
            state: coreStateRef.current,
            size: 'office',
            hovered: isCoreHovered,
            showLabel: true,
            isometricTilt: true,
          }
        )
      })

      for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
        const cx = Math.sin(angle) * 3.6
        const cz = Math.cos(angle) * 3.6
        enqueue(cx, cz, 0.6, () => {
          drawBox(cx, 0.45, cz, 2.8, 0.8, 0.7, '#1e293b', angle, 1, '#334155')
          drawBox(cx, 0.98, cz, 2.4, 0.32, 0.08, '#00e5ff', angle, 0.95)
        })
      }

      for (const rot of [
        Math.PI / 4,
        (3 * Math.PI) / 4,
        (5 * Math.PI) / 4,
        (7 * Math.PI) / 4,
      ]) {
        const gx = Math.sin(rot) * 6.2
        const gz = Math.cos(rot) * 6.2
        enqueue(gx, gz, 0.5, () => {
          drawBox(gx, 0.5, gz, 5.5, 0.9, 0.12, '#0284c7', rot, 0.35, '#00e5ff')
          drawBox(gx, 0.97, gz, 5.5, 0.05, 0.14, '#00e5ff', rot, 0.95)
        })
      }

      // 4C. Departmental Props & Furniture
      for (const offset of [-4, -2, 0]) {
        const sx = -16 + offset
        const sz = -16 - 6.2
        enqueue(sx, sz, 1.2, () => {
          drawBox(sx, 1.2, sz, 1.4, 2.4, 0.7, '#090d16', 0, 1, '#334155')
          const ledColor = Math.sin(elapsed * 8 + offset) > 0 ? '#22c55e' : '#38bdf8'
          drawBox(sx - 0.35, 1.9, sz + 0.36, 0.25, 0.08, 0.04, ledColor)
        })
      }
      enqueue(-12.5, -22.3, 1.5, () => {
        drawBox(-12.5, 1.5, -22.3, 3.2, 1.6, 0.08, '#f8fafc', 0, 1, '#64748b')
        drawBox(-12.5, 1.7, -22.24, 2.6, 0.12, 0.04, '#0284c7')
        drawBox(-12.5, 1.4, -22.24, 2.3, 0.1, 0.04, '#10b981')
      })
      enqueue(-22, -21.8, 0.6, () => {
        drawCylinder(-22, 0.3, -21.8, 0.35, 0.25, 0.6, '#92400e', 10)
        drawCylinder(-22, 0.9, -21.8, 0.1, 0.55, 1.0, '#15803d', 10)
      })

      enqueue(-5, -22.2, 0.7, () => {
        drawBox(-5, 0.7, -22.2, 1.2, 1.4, 0.6, '#475569', 0, 1, '#64748b')
        drawBox(-5, 1.6, -22.2, 0.6, 0.4, 0.5, '#b45309')
      })
      enqueue(5, -22.2, 0.7, () => {
        drawBox(5, 0.7, -22.2, 1.2, 1.4, 0.6, '#475569', 0, 1, '#64748b')
      })

      enqueue(16, -22.3, 1.6, () => {
        drawBox(16, 1.6, -22.3, 4.2, 1.8, 0.1, '#0f172a')
        drawBox(16, 1.6, -22.23, 3.9, 1.5, 0.05, '#3b82f6')
      })

      enqueue(-18, -4, 0.4, () => {
        drawBox(-18, 0.35, -4, 3.2, 0.4, 1.2, '#4c1d95')
        drawBox(-18, 0.75, -4.45, 3.2, 0.7, 0.3, '#3b0764')
      })
      enqueue(-18, -2, 0.3, () => {
        drawCylinder(-18, 0.3, -2, 1.0, 1.0, 0.06, '#38bdf8', 20, 0.65)
      })
      enqueue(-22.2, 0, 1.5, () => {
        drawBox(-22.2, 1.5, 0, 0.5, 2.6, 3.5, '#1e1b4b', 0, 1, '#475569')
      })

      enqueue(16, -6.3, 1.6, () => {
        drawBox(16, 1.6, -6.3, 4.8, 1.8, 0.1, '#0f172a')
        drawBox(16, 1.6, -6.23, 4.5, 1.5, 0.05, '#d946ef')
      })

      enqueue(-18, 12, 0.6, () => {
        drawBox(-18, 0.5, 12, 4.8, 1.0, 1.2, '#78350f')
        drawBox(-18, 1.02, 12, 5.0, 0.06, 1.3, '#f8fafc')
        drawBox(-19.4, 1.3, 12, 0.7, 0.5, 0.5, '#334155')
        drawBox(-17.2, 1.1, 12, 0.7, 0.1, 0.45, '#fde047')
      })
      enqueue(-18, 17, 0.45, () => {
        drawCylinder(-18, 0.45, 17, 1.2, 1.2, 0.06, '#f8fafc', 20)
        for (const ang of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
          drawCylinder(
            -18 + Math.sin(ang) * 1.6,
            0.3,
            17 + Math.cos(ang) * 1.6,
            0.25,
            0.25,
            0.35,
            '#ea580c',
            12
          )
        }
      })
      enqueue(-11.5, 12, 0.7, () => {
        drawBox(-11.5, 0.55, 12, 0.5, 1.1, 0.5, '#f1f5f9')
        drawCylinder(-11.5, 1.35, 12, 0.22, 0.22, 0.5, '#0284c7', 14, 0.8)
      })

      for (const tx of [-3, 0, 3]) {
        enqueue(tx, 14, 0.6, () => {
          drawBox(tx, 0.2, 14, 1.0, 0.18, 2.2, '#0f172a', 0, 1, '#334155')
          drawBox(tx, 1.15, 13.2, 0.7, 0.3, 0.08, '#38bdf8')
        })
      }
      enqueue(-5, 19, 0.5, () => {
        drawBox(-5, 0.4, 19, 2.4, 0.8, 0.6, '#1e293b', 0, 1, '#475569')
      })
      enqueue(3, 19, 0.05, () => {
        drawBox(3, 0.03, 19, 1.2, 0.03, 2.4, '#ec4899', 0.2)
      })
      enqueue(4.5, 18.8, 0.05, () => {
        drawBox(4.5, 0.03, 18.8, 1.2, 0.03, 2.4, '#06b6d4', 0.2)
      })

      for (const offset of [-3, -1]) {
        const gx = 16 + offset
        const gz = 16 - 5.8
        enqueue(gx, gz, 1.1, () => {
          drawBox(gx, 1.1, gz, 1.5, 2.2, 0.8, '#042f2e', 0, 1, '#14b8a6')
          drawBox(gx, 1.1, gz + 0.42, 1.25, 1.85, 0.04, '#14b8a6')
        })
      }
      enqueue(19.5, 9.7, 1.6, () => {
        drawBox(19.5, 1.6, 9.7, 3.6, 1.8, 0.08, '#0f172a')
        drawBox(19.5, 1.6, 9.76, 3.4, 1.55, 0.04, '#2dd4bf')
      })

      // =========================================================================
      // 4C-2. WEST WING PROPS (Server Room, Men's CR, Women's CR, Nap Room, Facilities, Cafeteria)
      // =========================================================================

      // A. SERVER ROOM & INFRASTRUCTURE NOC ([-35, 0, 3.5])
      // Door Sign: RESTRICTED ACCESS SERVER ROOM
      enqueue(-29.2, 3.5, 2.1, () => {
        drawBox(-29.2, 2.1, 3.5, 0.08, 0.35, 1.2, '#451a03', 0, 1, '#f59e0b')
        drawBox(-29.25, 2.1, 3.5, 0.02, 0.22, 1.0, '#f59e0b')
      })

      // 3 Server Racks with Live Status LEDs
      for (const rack of SERVER_RACKS) {
        const rx = rack.position[0]
        const rz = rack.position[2]
        enqueue(rx, rz, 1.25, () => {
          // Chassis
          drawBox(rx, 1.25, rz, 1.2, 2.5, 0.8, '#090d16', 0, 1, '#334155')
          // Glass front door frame
          drawBox(rx, 1.25, rz + 0.41, 1.05, 2.3, 0.04, '#1e293b', 0, 0.85, '#0ea5e9')
          // Draw horizontal blade slots with blinking LEDs
          for (let sidx = 0; sidx < 5; sidx++) {
            const slotY = 0.45 + sidx * 0.4
            drawBox(rx, slotY, rz + 0.42, 0.95, 0.16, 0.02, '#334155')
            const blink1 = Math.sin(elapsed * 12 + rz * 2 + sidx) > 0
            const blink2 = Math.cos(elapsed * 10 + rx * 2 + sidx) > 0
            const led1 = sidx % 3 === 0 ? (blink1 ? '#22c55e' : '#14532d') : (blink2 ? '#0ea5e9' : '#0369a1')
            const led2 = sidx % 2 === 0 ? (blink2 ? '#0ea5e9' : '#082f49') : (blink1 ? '#22c55e' : '#14532d')
            drawBox(rx - 0.35, slotY, rz + 0.43, 0.08, 0.04, 0.02, led1)
            drawBox(rx - 0.2, slotY, rz + 0.43, 0.08, 0.04, 0.02, led2)
          }
        })
      }

      // CRAC Chiller Unit
      enqueue(-33, 5, 1.1, () => {
        drawBox(-33, 1.1, 5, 1.4, 2.2, 1.0, '#334155', 0, 1, '#475569')
        drawBox(-33, 1.9, 5.51, 0.6, 0.25, 0.02, '#0284c7')
        drawBox(-33, 1.1, 5.51, 0.9, 1.0, 0.02, '#0f172a')
      })

      // Overhead Cable Trays
      enqueue(-35, 3.5, 2.45, () => {
        drawBox(-35, 2.45, 3.5, 5.0, 0.06, 0.4, '#475569')
        drawBox(-35, 2.5, 3.4, 4.8, 0.03, 0.03, '#f97316')
        drawBox(-35, 2.5, 3.5, 4.8, 0.03, 0.03, '#0ea5e9')
        drawBox(-35, 2.5, 3.6, 4.8, 0.03, 0.03, '#eab308')
      })

      // Server Admin Terminal Workstation (Rex's Permanent NOC Station)
      enqueue(-33, 2.5, 0.75, () => {
        // Table
        drawBox(-33, 0.38, 2.5, 1.6, 0.76, 0.85, '#1e293b', 0, 1, '#334155')
        // Matrix Green Terminal Monitor
        drawBox(-33.1, 0.95, 2.25, 0.7, 0.42, 0.04, '#090d16', 0.15, 1, '#10b981')
        drawBox(-33.1, 0.95, 2.27, 0.66, 0.38, 0.02, '#052e16')
        // Cyber Blue Metrics Monitor
        drawBox(-33.1, 0.95, 2.75, 0.7, 0.42, 0.04, '#090d16', -0.15, 1, '#0ea5e9')
        drawBox(-33.1, 0.95, 2.73, 0.66, 0.38, 0.02, '#082f49')
        // Keyboard & Mouse
        drawBox(-32.8, 0.77, 2.5, 0.18, 0.02, 0.45, '#0f172a')
        drawBox(-32.8, 0.77, 2.8, 0.1, 0.02, 0.06, '#38bdf8')
        // Ergonomic task chair
        drawBox(-32, 0.45, 2.5, 0.45, 0.08, 0.45, '#0f172a')
        drawBox(-31.8, 0.85, 2.5, 0.06, 0.7, 0.45, '#1e293b')
      })

      // B. MEN'S COMFORT ROOM ([-35, 0, -8])
      // Door Sign: MEN'S CR
      enqueue(-29.2, -8, 2.1, () => {
        drawBox(-29.2, 2.1, -8, 0.08, 0.35, 1.0, '#1e3a8a', 0, 1, '#60a5fa')
        drawBox(-29.25, 2.1, -8, 0.02, 0.2, 0.8, '#60a5fa')
      })
      // 3 Toilet Stalls
      for (const stall of MENS_CR_STALLS) {
        const sx = stall.position[0]
        const sz = stall.position[2]
        enqueue(sx, sz, 1.0, () => {
          drawBox(sx, 1.0, sz, 1.3, 2.0, 1.2, '#0369a1', 0, 1, '#0284c7')
          drawBox(sx + 0.66, 0.95, sz, 0.04, 1.9, 0.9, '#0284c7')
          drawBox(sx + 0.69, 1.25, sz, 0.04, 0.08, 0.16, stall.isOccupied ? '#ef4444' : '#22c55e')
        })
      }
      // Vanity counter, mirror, hand dryer
      enqueue(-30.5, -8.5, 0.6, () => {
        drawBox(-30.5, 0.45, -8.5, 0.7, 0.9, 2.8, '#e2e8f0', 0, 1, '#cbd5e1')
        drawBox(-30.8, 1.5, -8.5, 0.04, 1.1, 2.4, '#f8fafc', 0, 1, '#38bdf8')
        drawBox(-30.7, 1.2, -6.9, 0.2, 0.35, 0.22, '#94a3b8')
      })

      // C. WOMEN'S COMFORT ROOM ([-35, 0, -2])
      // Door Sign: WOMEN'S CR
      enqueue(-29.2, -2, 2.1, () => {
        drawBox(-29.2, 2.1, -2, 0.08, 0.35, 1.0, '#831843', 0, 1, '#f472b6')
        drawBox(-29.25, 2.1, -2, 0.02, 0.2, 0.8, '#f472b6')
      })
      // 3 Toilet Stalls
      for (const stall of WOMENS_CR_STALLS) {
        const sx = stall.position[0]
        const sz = stall.position[2]
        enqueue(sx, sz, 1.0, () => {
          drawBox(sx, 1.0, sz, 1.3, 2.0, 1.2, '#be185d', 0, 1, '#9d174d')
          drawBox(sx + 0.66, 0.95, sz, 0.04, 1.9, 0.9, '#9d174d')
          drawBox(sx + 0.69, 1.25, sz, 0.04, 0.08, 0.16, stall.isOccupied ? '#ef4444' : '#22c55e')
        })
      }
      // Vanity counter, mirror, hand dryer
      enqueue(-30.5, -2.5, 0.6, () => {
        drawBox(-30.5, 0.45, -2.5, 0.7, 0.9, 2.8, '#fce7f3', 0, 1, '#f472b6')
        drawBox(-30.8, 1.5, -2.5, 0.04, 1.1, 2.4, '#f8fafc', 0, 1, '#f472b6')
        drawBox(-30.7, 1.2, -0.9, 0.2, 0.35, 0.22, '#94a3b8')
      })

      // D. NAP ROOM / WELLNESS SUITE ([-35, 0, -16])
      for (const bed of WELLNESS_BEDS) {
        const bx = bed.position[0]
        const bz = bed.position[2]
        enqueue(bx, bz, 0.4, () => {
          drawBox(bx, 0.16, bz, 1.15, 0.32, 1.95, '#334155', 0, 1, '#1e293b')
          drawBox(bx, 0.34, bz, 1.05, 0.18, 1.85, '#f8fafc')
          drawBox(bx, 0.42, bz + 0.2, 1.02, 0.12, 1.25, '#1e1b4b')
          drawBox(bx, 0.44, bz - 0.65, 0.7, 0.12, 0.38, '#f1f5f9')
          drawBox(bx + 0.75, 0.22, bz - 0.65, 0.35, 0.45, 0.35, '#1e293b')
          drawBox(bx + 0.75, 0.52, bz - 0.65, 0.14, 0.18, 0.14, '#fef08a')
          drawBox(bx - 0.6, 0.5, bz - 0.65, 0.06, 0.06, 0.12, bed.occupiedBy ? '#ef4444' : '#22c55e')
        })
      }

      // E. FACILITIES & JANITORIAL ROOM ([-35, 0, 8.5])
      // Door Sign: FACILITIES
      enqueue(-29.2, 8.5, 2.1, () => {
        drawBox(-29.2, 2.1, 8.5, 0.08, 0.35, 1.2, '#713f12', 0, 1, '#eab308')
        drawBox(-29.25, 2.1, 8.5, 0.02, 0.22, 1.0, '#eab308')
      })
      // Commercial Yellow Janitorial Cleaning Cart
      enqueue(-34.5, 8.0, 0.5, () => {
        drawBox(-34.5, 0.42, 8.0, 0.65, 0.8, 1.1, '#eab308', 0, 1, '#ca8a04')
        drawBox(-34.5, 0.7, 7.8, 0.42, 0.35, 0.4, '#ca8a04')
        drawBox(-34.5, 0.72, 8.35, 0.5, 0.6, 0.32, '#854d0e')
      })
      // 5-Gallon Water Bottle Multi-Tier Storage Rack
      enqueue(-32.5, 9.5, 0.7, () => {
        drawBox(-32.5, 0.7, 9.5, 1.4, 1.4, 0.6, '#334155', 0, 1, '#475569')
        drawCylinder(-32.8, 0.45, 9.5, 0.14, 0.14, 0.42, '#0284c7', 8, 0.75)
        drawCylinder(-32.2, 0.45, 9.5, 0.14, 0.14, 0.42, '#0284c7', 8, 0.75)
        drawCylinder(-32.5, 0.95, 9.5, 0.14, 0.14, 0.42, '#0284c7', 8, 0.75)
      })
      // Wall Tool Bracket & Mops
      enqueue(-37, 8.5, 1.2, () => {
        drawBox(-37, 1.2, 8.5, 0.08, 0.08, 2.0, '#475569')
        drawBox(-36.9, 0.9, 8.1, 0.04, 1.4, 0.04, '#059669')
        drawBox(-36.9, 0.9, 8.9, 0.04, 1.4, 0.04, '#059669')
      })

      // F. GRAND CAFETERIA ([-35, 0, 16])
      // Hot Meal Buffet Serving Counter (8.4m)
      enqueue(-35, 12, 0.6, () => {
        drawBox(-35, 0.5, 12, 8.4, 0.92, 1.2, '#94a3b8', 0, 1, '#cbd5e1')
        drawBox(-35, 0.95, 12.4, 8.2, 0.45, 0.04, '#38bdf8', 0, 0.4, '#7dd3fc')
        // 5 Steam Trays (Rice, Adobo, Sinigang, Veggies, Fruits)
        const trayColors = ['#f8fafc', '#78350f', '#ca8a04', '#15803d', '#f59e0b']
        const trayOffsets = [-3.0, -1.5, 0, 1.5, 3.0]
        trayOffsets.forEach((tx, tidx) => {
          drawBox(-35 + tx, 0.98, 12, 1.1, 0.06, 0.65, '#cbd5e1')
          drawBox(-35 + tx, 1.02, 12, 0.95, 0.04, 0.55, trayColors[tidx])
        })
      })
      // 8 Dining Tables with 32 Molded Dining Chairs (Matching 3D CAFETERIA_SEATS)
      const cafeTableCoords: [number, number][] = [
        [-39.5, 14.2], [-36.5, 14.2], [-33.5, 14.2], [-30.5, 14.2],
        [-39.5, 18.6], [-36.5, 18.6], [-33.5, 18.6], [-30.5, 18.6],
      ]
      for (const [tx, tz] of cafeTableCoords) {
        enqueue(tx, tz, 0.72, () => {
          // Table
          drawBox(tx, 0.72, tz, 1.8, 0.06, 1.8, '#f8fafc', 0, 1, '#e2e8f0')
          drawCylinder(tx, 0.36, tz, 0.1, 0.12, 0.72, '#1e293b', 8)
          // 4 Chairs around table
          drawBox(tx - 1.1, 0.42, tz, 0.45, 0.06, 0.45, '#ea580c', 0, 1, '#c2410c')
          drawBox(tx - 1.3, 0.75, tz, 0.06, 0.6, 0.45, '#c2410c')
          drawBox(tx + 1.1, 0.42, tz, 0.45, 0.06, 0.45, '#ea580c', 0, 1, '#c2410c')
          drawBox(tx + 1.3, 0.75, tz, 0.06, 0.6, 0.45, '#c2410c')
          drawBox(tx, 0.42, tz - 1.1, 0.45, 0.06, 0.45, '#ea580c', 0, 1, '#c2410c')
          drawBox(tx, 0.75, tz - 1.3, 0.45, 0.6, 0.06, '#c2410c')
          drawBox(tx, 0.42, tz + 1.1, 0.45, 0.06, 0.45, '#ea580c', 0, 1, '#c2410c')
          drawBox(tx, 0.75, tz + 1.3, 0.45, 0.6, 0.06, '#c2410c')
        })
      }

      // 4D. Workstations + A* Walking Characters + Canvas-Rendered Nameplates
      const currentAgents = agentsRef.current
      const overrides = overridesRef.current
      const newScreenBoxes: Record<
        string,
        {
          px: number
          py: number
          radius: number
          tagRect: [number, number, number, number]
          agent: Agent
        }
      > = {}

      const nameplateQueue: (() => void)[] = []

      currentAgents.forEach((agent, idx) => {
        let ws = AGENT_WORKSTATIONS_3D[agent.id]
        if (!ws) {
          const keys = Object.keys(AGENT_WORKSTATIONS_3D)
          const fallbackKey = keys[idx % keys.length]
          ws = {
            ...AGENT_WORKSTATIONS_3D[fallbackKey],
            agentId: agent.id,
            name: agent.name,
          }
        }

        const routeOverride = overrides[agent.id]
        const effectiveMode = routeOverride || currentMode
        const style = getCharacterStyle(agent.id, agent.name)
        const badge = getAgentStatusBadge(agent.status, effectiveMode)

        const deskRot = getFacingAngle(ws.facing)
        const [dx, dy, dz] = ws.deskPos
        const cosD = Math.cos(deskRot)
        const sinD = Math.sin(deskRot)
        const toDeskWorld = (
          lx: number,
          ly: number,
          lz: number
        ): [number, number, number] => [
          dx + lx * cosD + lz * sinD,
          dy + ly,
          dz - lx * sinD + lz * cosD,
        ]

        // Only draw generic white workstation desks for standard agents.
        // Boss patrols, Cleaners roam, and Server Admin Rex has his dedicated NOC station in Server Room.
        const hasDedicatedFurniture =
          agent.id === 'boss' ||
          agent.id === 'cleaner_1' ||
          agent.id === 'cleaner_2' ||
          agent.id === 'server_admin' ||
          agent.id === 'chef_maria' ||
          agent.id === 'barista_ken' ||
          agent.id === 'coach_miguel'

        if (!hasDedicatedFurniture) {
          // Permanent Chair at Home Desk
          enqueue(dx, dz, 0.4, () => {
            drawCylinder(dx, 0.08, dz, 0.3, 0.35, 0.08, '#0f172a', 10)
            drawBox(dx, 0.42, dz, 0.55, 0.08, 0.55, '#1e293b', deskRot)
            const [bx, by, bz] = toDeskWorld(0, 0.78, -0.24)
            drawBox(bx, by, bz, 0.52, 0.65, 0.06, '#0f172a', deskRot)
          })

          // Permanent Desk & Dual Monitors at Home Desk
          const [deskWX, deskWY, deskWZ] = toDeskWorld(0, 0.7, 0.8)
          enqueue(deskWX, deskWZ, 0.75, () => {
            const [l1x, l1y, l1z] = toDeskWorld(-0.8, 0.35, 0.8)
            const [l2x, l2y, l2z] = toDeskWorld(0.8, 0.35, 0.8)
            drawBox(l1x, l1y, l1z, 0.06, 0.7, 0.8, '#475569', deskRot)
            drawBox(l2x, l2y, l2z, 0.06, 0.7, 0.8, '#475569', deskRot)
            drawBox(
              deskWX,
              deskWY,
              deskWZ,
              1.8,
              0.06,
              0.9,
              '#f8fafc',
              deskRot,
              1,
              '#cbd5e1'
            )
            const [kx, ky, kz] = toDeskWorld(0, 0.75, 0.7)
            drawBox(kx, ky, kz, 0.6, 0.02, 0.22, '#334155', deskRot)
            const [m1x, m1y, m1z] = toDeskWorld(0, 1.05, 1.05)
            drawBox(m1x, m1y, m1z, 1.1, 0.6, 0.05, '#0f172a', deskRot, 1, '#00e5ff')
            const [m1sx, m1sy, m1sz] = toDeskWorld(0, 1.05, 1.02)
            drawBox(m1sx, m1sy, m1sz, 1.02, 0.52, 0.02, '#00e5ff', deskRot)
            const [m2x, m2y, m2z] = toDeskWorld(0.7, 1.05, 1.0)
            drawBox(
              m2x,
              m2y,
              m2z,
              0.65,
              0.6,
              0.05,
              '#0f172a',
              deskRot - 0.35,
              1,
              '#10b981'
            )
            const [mugX, mugY, mugZ] = toDeskWorld(-0.6, 0.78, 0.65)
            drawCylinder(mugX, mugY, mugZ, 0.06, 0.05, 0.12, '#f1f5f9', 8)
          })
        }

        // Autonomous Roaming Patrol Route (Boss, Cleaners, Server Admin)
        const isDeskMode =
          effectiveMode === 'OVERVIEW' || effectiveMode === 'FOCUS_WORK'

        let roamRoute: [number, number, number][] | null = null
        if (agent.id === 'boss') roamRoute = BOSS_PATROL_ROUTE
        else if (agent.id === 'cleaner_1') roamRoute = CLEANER_1_PATROL_ROUTE
        else if (agent.id === 'cleaner_2') roamRoute = CLEANER_2_PATROL_ROUTE
        else if (agent.id === 'server_admin') roamRoute = SERVER_ADMIN_PATROL_ROUTE

        if (roamRoute && isDeskMode) {
          if (!agentRoamMapRef.current[agent.id]) {
            agentRoamMapRef.current[agent.id] = { index: 0, elapsed: 0 }
          }
          const rState = agentRoamMapRef.current[agent.id]
          rState.elapsed += dt
          const intervalSec =
            agent.id === 'server_admin'
              ? (rState.index === 0 ? 25 : 12)
              : agent.id === 'boss'
                ? 18
                : 15
          if (rState.elapsed >= intervalSec) {
            rState.elapsed = 0
            rState.index = (rState.index + 1) % roamRoute.length
          }
        }

        // A* Waypoint Navigation Update
        const desiredTarget = getAgentTargetPosition(ws, currentMode, routeOverride)
        const currentRoamTarget =
          roamRoute && isDeskMode
            ? roamRoute[agentRoamMapRef.current[agent.id]?.index || 0]
            : null

        const effectiveTarget = currentRoamTarget || desiredTarget
        const effectiveIsDeskMode =
          isDeskMode && (!roamRoute || (agent.id === 'server_admin' && (agentRoamMapRef.current[agent.id]?.index || 0) === 0))

        let finalRot = deskRot
        if (effectiveMode === 'ALL_HANDS') {
          finalRot = Math.atan2(0 - effectiveTarget[0], 0 - effectiveTarget[2])
        } else if (effectiveMode === 'PANTRY') {
          finalRot = Math.atan2(-16 - effectiveTarget[0], 16 - effectiveTarget[2])
        } else if (effectiveMode === 'GYM') {
          finalRot = Math.atan2(0 - effectiveTarget[0], 16 - effectiveTarget[2])
        }

        if (!agentNavMapRef.current[agent.id]) {
          const initMode = currentMode
          const initOverride = routeOverride
          const spawnPos = getAgentTargetPosition(ws, initMode, initOverride)
          const eff = initOverride || initMode
          const spawnAtDesk = eff === 'OVERVIEW' || eff === 'FOCUS_WORK'
          agentNavMapRef.current[agent.id] = {
            currentPos: [spawnPos[0], spawnPos[1], spawnPos[2]],
            targetPos: [spawnPos[0], spawnPos[1], spawnPos[2]],
            waypoints: [],
            pathQueue: [],
            waypointIndex: 0,
            isWalking: false,
            facingAngle: finalRot,
            rotationY: finalRot,
            subState: spawnAtDesk ? 'seated' : 'standing',
            walkPhase: 0,
            walkCycle: 0,
            staggerRemainingSec: 0,
            standingUpRemainingSec: 0,
            sittingDownRemainingSec: 0,
            hasNotifiedArrival: true,
          }
        }
        const nav = agentNavMapRef.current[agent.id]
        const staggerIdx = routeOverride ? 0 : idx
        stepAgentNavigation(
          nav,
          effectiveTarget,
          finalRot,
          effectiveIsDeskMode,
          dt,
          3.6,
          idx,
          onArriveRef.current
            ? (finalPos) => onArriveRef.current?.(agent.id, finalPos, effectiveMode)
            : undefined,
          staggerIdx
        )

        const ax = nav.currentPos[0]
        const ay = nav.currentPos[1]
        const az = nav.currentPos[2]
        const agentRot = nav.rotationY
        const isWalking = nav.subState === 'walking'
        const isSeated = nav.subState === 'seated'

        const cosA = Math.cos(agentRot)
        const sinA = Math.sin(agentRot)
        const toAgentWorld = (
          lx: number,
          ly: number,
          lz: number
        ): [number, number, number] => [
          ax + lx * cosA + lz * sinA,
          ay + ly,
          az - lx * sinA + lz * cosA,
        ]

        const isSelected = selectedIdRef.current === agent.id

        // Enqueue Distinct Character Avatar in Depth-Sorted Render Queue
        enqueue(ax, az, 0.65, () => {
          if (isSelected) {
            drawGroundRing(ax, ay + 0.05, az, 0.9, 1.1, '#00e5ff', 0.95)
          }

          const isGymRunner =
            !isWalking &&
            mode === 'GYM' &&
            (idx % 3 === 0 || az <= 14.8) &&
            agent.id !== 'coach_miguel'
          const legStride = isWalking
            ? Math.sin(nav.walkPhase) * 0.22
            : isGymRunner
              ? Math.sin(elapsed * 12) * 0.28
              : 0
          const [lg1x, lg1y, lg1z] = toAgentWorld(
            -0.14,
            0.35,
            (isSeated ? 0.18 : 0.02) + legStride
          )
          const [lg2x, lg2y, lg2z] = toAgentWorld(
            0.14,
            0.35,
            (isSeated ? 0.18 : 0.02) - legStride
          )
          drawBox(lg1x, lg1y, lg1z, 0.16, 0.36, 0.2, style.bottomColor, agentRot)
          drawBox(lg2x, lg2y, lg2z, 0.16, 0.36, 0.2, style.bottomColor, agentRot)

          if (style.isSkirt) {
            const [skx, sky, skz] = toAgentWorld(0, 0.5, 0.04)
            drawCylinder(skx, sky, skz, 0.23, 0.29, 0.22, style.bottomColor, 10)
          }

          // Torso
          const [tx, ty, tz] = toAgentWorld(0, 0.76, 0.02)
          drawBox(
            tx,
            ty,
            tz,
            style.gender === 'female' ? 0.44 : 0.48,
            0.48,
            0.28,
            style.outfitColor,
            agentRot
          )

          // Arms & Animated Typing Hands
          const isTyping =
            isSeated &&
            (agent.status === 'working' || agent.status === 'active' || !agent.status)
          const lHandBob = isTyping ? Math.sin(elapsed * 12 + idx) * 0.025 : 0
          const rHandBob = isTyping ? Math.cos(elapsed * 12 + idx) * 0.025 : 0

          const [ar1x, ar1y, ar1z] = toAgentWorld(
            -0.27,
            0.74,
            0.12 - legStride * 0.5
          )
          const [ar2x, ar2y, ar2z] = toAgentWorld(
            0.27,
            0.74,
            0.12 + legStride * 0.5
          )
          drawBox(ar1x, ar1y, ar1z, 0.12, 0.32, 0.16, style.sleeveColor, agentRot)
          drawBox(ar2x, ar2y, ar2z, 0.12, 0.32, 0.16, style.sleeveColor, agentRot)

          const [h1x, h1y, h1z] = toAgentWorld(
            -0.16,
            0.74 + lHandBob,
            isSeated ? 0.38 : 0.22
          )
          const [h2x, h2y, h2z] = toAgentWorld(
            0.16,
            0.74 + rHandBob,
            isSeated ? 0.38 : 0.22
          )
          drawBox(h1x, h1y, h1z, 0.1, 0.07, 0.12, style.skinColor, agentRot)
          drawBox(h2x, h2y, h2z, 0.1, 0.07, 0.12, style.skinColor, agentRot)

          // Head & Base Hair
          const [hx, hy, hz] = toAgentWorld(0, 1.14, 0.02)
          drawBox(hx, hy, hz, 0.34, 0.34, 0.32, style.skinColor, agentRot)
          const [hrx, hry, hrz] = toAgentWorld(0, 1.19, -0.04)
          drawBox(hrx, hry, hrz, 0.36, 0.26, 0.28, style.hairColor, agentRot)

          // Distinct Hair Silhouettes
          if (style.hairStyle === 'ponytail') {
            const [ptx, pty, ptz] = toAgentWorld(0, 1.16, -0.22)
            drawCylinder(ptx, pty, ptz, 0.07, 0.1, 0.26, style.hairColor, 8)
          } else if (style.hairStyle === 'long') {
            const [lhx, lhy, lhz] = toAgentWorld(0, 1.04, -0.14)
            drawBox(lhx, lhy, lhz, 0.36, 0.38, 0.12, style.hairColor, agentRot)
          } else if (style.hairStyle === 'bob') {
            const [b1x, b1y, b1z] = toAgentWorld(-0.18, 1.14, 0.02)
            const [b2x, b2y, b2z] = toAgentWorld(0.18, 1.14, 0.02)
            drawBox(b1x, b1y, b1z, 0.06, 0.26, 0.28, style.hairColor, agentRot)
            drawBox(b2x, b2y, b2z, 0.06, 0.26, 0.28, style.hairColor, agentRot)
          }

          // Distinct Accessories
          if (style.accessory === 'cap') {
            const [capX, capY, capZ] = toAgentWorld(0, 1.32, 0.02)
            drawCylinder(
              capX,
              capY,
              capZ,
              0.2,
              0.22,
              0.12,
              style.accessoryColor,
              12
            )
            const [visX, visY, visZ] = toAgentWorld(0, 1.28, 0.2)
            drawBox(
              visX,
              visY,
              visZ,
              0.3,
              0.04,
              0.18,
              style.accessoryColor,
              agentRot
            )
          } else if (style.accessory === 'beanie') {
            const [bnX, bnY, bnZ] = toAgentWorld(0, 1.32, 0.01)
            drawCylinder(bnX, bnY, bnZ, 0.18, 0.22, 0.15, style.accessoryColor, 12)
          } else if (style.accessory === 'headphones') {
            const [hp1x, hp1y, hp1z] = toAgentWorld(-0.2, 1.16, 0.02)
            const [hp2x, hp2y, hp2z] = toAgentWorld(0.2, 1.16, 0.02)
            drawBox(hp1x, hp1y, hp1z, 0.06, 0.16, 0.14, style.accessoryColor, agentRot)
            drawBox(hp2x, hp2y, hp2z, 0.06, 0.16, 0.14, style.accessoryColor, agentRot)
          } else if (style.accessory === 'glasses') {
            const [glX, glY, glZ] = toAgentWorld(0, 1.16, 0.19)
            drawBox(glX, glY, glZ, 0.26, 0.06, 0.03, style.accessoryColor, agentRot)
          }
        })

        // Enqueue Direct Canvas Nameplate Draw (Zero DOM Lag on Pan/Zoom!)
        const bodyProj = project(ax, ay + 0.9, az)
        const headTagProj = project(ax, ay + 1.9, az)

        ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
        const textWidth = ctx.measureText(agent.name).width
        const pillW = Math.round(textWidth + 28)
        const pillH = 22
        const pillX = Math.round(headTagProj.px - pillW * 0.5)
        const pillY = Math.round(headTagProj.py - pillH)

        newScreenBoxes[agent.id] = {
          px: bodyProj.px,
          py: bodyProj.py,
          radius: Math.max(18, 0.95 * zoom),
          tagRect: [pillX, pillY, pillW, pillH],
          agent,
        }

        nameplateQueue.push(() => {
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(pillX, pillY, pillW, pillH, 11)
          ctx.fillStyle = isSelected ? '#06b6d4' : 'rgba(15, 23, 42, 0.92)'
          ctx.fill()
          ctx.lineWidth = isSelected ? 1.8 : 1
          ctx.strokeStyle = isSelected ? '#67e8f9' : 'rgba(71, 85, 105, 0.85)'
          ctx.stroke()

          // Status Dot
          const dotX = pillX + 11
          const dotY = pillY + pillH * 0.5
          ctx.beginPath()
          ctx.arc(dotX, dotY, 3.8, 0, Math.PI * 2)
          ctx.fillStyle = isSelected ? '#0f172a' : badge.dotHex
          ctx.fill()

          // Name Text (Name ONLY)
          ctx.font =
            'bold 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
          ctx.fillStyle = isSelected ? '#020617' : '#f1f5f9'
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'left'
          ctx.fillText(agent.name, pillX + 19, dotY + 0.5)
          ctx.restore()
        })
      })

      agentScreenBoxesRef.current = newScreenBoxes

      // Sort queue back-to-front by isometric depth (`x + z`) and draw
      renderQueue.sort((a, b) => a.depth - b.depth)
      for (const item of renderQueue) {
        item.draw()
      }

      // =========================================================================
      // LAYER 5: Exterior Camera-Facing Cutaway Half-Walls (South & East)
      // =========================================================================
      drawBox(-12.5, 0.35, 23.2, 21.8, 0.7, 0.4, '#334155', 0, 1, '#475569')
      drawBox(12.5, 0.35, 23.2, 21.8, 0.7, 0.4, '#334155', 0, 1, '#475569')
      drawBox(-35, 0.35, 23.2, 12.4, 0.7, 0.4, '#334155', 0, 1, '#475569')
      drawBox(-12.5, 0.85, 23.2, 21.8, 0.3, 0.1, '#38bdf8', 0, 0.4)
      drawBox(12.5, 0.85, 23.2, 21.8, 0.3, 0.1, '#38bdf8', 0, 0.4)
      drawBox(-35, 0.85, 23.2, 12.4, 0.3, 0.1, '#38bdf8', 0, 0.4)

      drawBox(23.2, 0.35, -12.5, 0.4, 0.7, 21.8, '#334155', 0, 1, '#475569')
      drawBox(23.2, 0.35, 12.5, 0.4, 0.7, 21.8, '#334155', 0, 1, '#475569')
      drawBox(23.2, 0.85, -12.5, 0.1, 0.3, 21.8, '#38bdf8', 0, 0.4)
      drawBox(23.2, 0.85, 12.5, 0.1, 0.3, 21.8, '#38bdf8', 0, 0.4)

      // =========================================================================
      // LAYER 6: Direct Canvas Nameplates (Drawn in same pass = 0ms Lag!)
      // =========================================================================
      for (const drawTag of nameplateQueue) {
        drawTag()
      }

      ctx.restore()
      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [])

  return (
    <div className={`relative h-full w-full select-none overflow-hidden bg-[#080b12] ${className}`}>
      {/* 2D Isometric Canvas Twin (Nameplates rendered directly in Canvas = 0ms Lag) */}
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating Bottom Viewport HUD Controls */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-950/85 px-3 py-1.5 font-mono text-[11px] text-slate-300 shadow-xl backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="tracking-wide text-slate-400">VIEWPORT (2D ISO):</span>
          <span className="font-bold text-cyan-300">{mode.replace('_', ' ')}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/75 px-3 py-1.5 font-mono text-[11px] text-amber-200 shadow-xl backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span>⚡ 2D Canvas (Legacy Renderer) — 3D WebGL is primary. Live Supabase agents synchronized.</span>
        </div>

        {onClickCore && (
          <button
            type="button"
            data-testid="bottom-toolbar-jarvis-btn-2d"
            onClick={onClickCore}
            className="pointer-events-auto cursor-pointer flex items-center gap-1.5 rounded-lg border border-cyan-400/70 bg-cyan-950/90 px-3 py-1.5 font-mono text-[11px] font-bold text-cyan-200 shadow-[0_0_16px_rgba(0,229,255,0.28)] backdrop-blur-md transition-all hover:bg-cyan-500 hover:text-slate-950 whitespace-nowrap"
          >
            <span className="h-2 w-2 rounded-full bg-cyan-300 animate-ping" />
            <span>JARVIS CORE [J]</span>
          </button>
        )}

        {onResetCamera && (
          <button
            type="button"
            onClick={() => {
              camStateRef.current.panOffsetX = 0
              camStateRef.current.panOffsetZ = 0
              camStateRef.current.zoomMultiplier = 1
              onResetCamera()
            }}
            className="pointer-events-auto cursor-pointer rounded-lg border border-slate-800/80 bg-slate-900/90 px-3 py-1.5 font-mono text-[11px] font-medium text-slate-300 shadow-xl backdrop-blur-md transition-all hover:bg-slate-800 hover:text-white whitespace-nowrap"
          >
            Reset Camera ⟲
          </button>
        )}
      </div>

      {/* Help tooltip */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-30 hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/85 px-3 py-1.5 font-mono text-[10px] text-slate-400 shadow-xl backdrop-blur-md">
        <span>Click Brain Core or Press J for JARVIS</span>
        <span>•</span>
        <span>Click Agent to Route</span>
        <span>•</span>
        <span>Drag / Scroll</span>
      </div>
    </div>
  )
}
