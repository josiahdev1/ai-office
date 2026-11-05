'use client'

import React, { useEffect, useRef } from 'react'
import { Agent } from '@/components/office/types'
import {
  ROOMS_3D,
  AGENT_WORKSTATIONS_3D,
  CAMERA_PRESETS,
  DepartmentMode,
  getAgentTargetPosition,
  projectIso3DTo2D,
} from '@/config/officeLayout'

export interface OfficeCanvas2DProps {
  agents: Agent[]
  mode: DepartmentMode
  selectedAgentId?: string | null
  onSelectAgent: (agent: Agent) => void
  onResetCamera?: () => void
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
  selectedAgentId,
  onSelectAgent,
  onResetCamera,
  className = '',
}: OfficeCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tagsContainerRef = useRef<HTMLDivElement>(null)

  // Live refs for animation loop without re-binding
  const agentsRef = useRef<Agent[]>(agents)
  const modeRef = useRef<DepartmentMode>(mode)
  const selectedIdRef = useRef<string | null | undefined>(selectedAgentId)
  const onSelectRef = useRef(onSelectAgent)

  useEffect(() => {
    agentsRef.current = agents
  }, [agents])

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    selectedIdRef.current = selectedAgentId
  }, [selectedAgentId])

  useEffect(() => {
    onSelectRef.current = onSelectAgent
  }, [onSelectAgent])

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

  // Interpolated agent world positions: agentId -> [x, y, z]
  const agentPosMapRef = useRef<Record<string, [number, number, number]>>({})
  // Screen hitboxes for canvas click detection
  const agentScreenBoxesRef = useRef<
    Record<string, { px: number; py: number; radius: number; agent: Agent }>
  >({})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animationFrameId: number
    let lastTime = performance.now()

    // Pointer pan & wheel zoom handlers
    let isDragging = false
    let dragStartX = 0
    let dragStartY = 0
    let clickMoved = false

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true
      clickMoved = false
      dragStartX = e.clientX
      dragStartY = e.clientY
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return
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
      // Inverse isometric mapping
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
        const boxes = Object.values(agentScreenBoxesRef.current)
        for (let i = boxes.length - 1; i >= 0; i--) {
          const b = boxes[i]
          const dist = Math.hypot(clickX - b.px, clickY - b.py)
          if (dist <= b.radius) {
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
        Math.max(0.55, camStateRef.current.zoomMultiplier * factor)
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

      // Resize canvas to physical DPR
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth || 960
      const height = canvas.clientHeight || 640
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.save()
      ctx.scale(dpr, dpr)

      // Reset pan/zoom offsets when mode changes
      const currentMode = modeRef.current
      const cam = camStateRef.current
      if (cam.lastMode !== currentMode) {
        cam.lastMode = currentMode
        cam.panOffsetX = 0
        cam.panOffsetZ = 0
        cam.zoomMultiplier = 1
      }

      const preset = CAMERA_PRESETS[currentMode] || CAMERA_PRESETS.OVERVIEW
      const lerpFactor = 1 - Math.exp(-5 * dt)
      cam.targetX += (preset.target[0] + cam.panOffsetX - cam.targetX) * lerpFactor
      cam.targetZ += (preset.target[2] + cam.panOffsetZ - cam.targetZ) * lerpFactor
      cam.zoom += (preset.zoom * cam.zoomMultiplier - cam.zoom) * lerpFactor

      const targetX = cam.targetX
      const targetZ = cam.targetZ
      const zoom = cam.zoom

      const project = (x: number, y: number, z: number) =>
        projectIso3DTo2D(x, y, z, targetX, targetZ, zoom, width, height)

      // Helper: Draw a 3D box with rotation around Y axis in 2D Isometric Canvas
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

        // 4 top corners (y = +hh) and 4 bottom corners (y = -hh)
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

        // 4 side faces with local normals:
        // Front (+Z): t3 -> t2 -> b2 -> b3, local normal (0, 1) -> world (sinA, cosA)
        // Right (+X): t2 -> t1 -> b1 -> b2, local normal (1, 0) -> world (cosA, -sinA)
        // Back  (-Z): t1 -> t0 -> b0 -> b1, local normal (0, -1) -> world (-sinA, -cosA)
        // Left  (-X): t0 -> t3 -> b3 -> b0, local normal (-1, 0) -> world (-cosA, sinA)
        const sides = [
          { pts: [t3, t2, b2, b3], nx: sinA, nz: cosA },
          { pts: [t2, t1, b1, b2], nx: cosA, nz: -sinA },
          { pts: [t1, t0, b0, b1], nx: -sinA, nz: -cosA },
          { pts: [t0, t3, b3, b0], nx: -cosA, nz: sinA },
        ]

        for (const side of sides) {
          // Camera ray from (+1, +1) -> visible if nx + nz > -0.05
          if (side.nx + side.nz > -0.01) {
            const shade = 0.62 + 0.24 * ((side.nx * 0.35 + side.nz * 0.65) * 0.5 + 0.5)
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

        // Top face (always visible from elevated camera)
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

      // Helper: Draw a 3D vertical cylinder in 2D Isometric Canvas
      const drawCylinder = (
        cx: number,
        cy: number,
        cz: number,
        radiusTop: number,
        radiusBottom: number,
        height: number,
        color: string,
        segments = 20,
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
          botPts.push(project(cx + cos * radiusBottom, cy - hh, cz + sin * radiusBottom))
        }

        ctx.save()
        ctx.globalAlpha = alpha

        // Draw front-facing cylinder quads
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

        // Top cap
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

      // Helper: Draw a flat horizontal ring on the ground plane
      const drawGroundRing = (
        cx: number,
        cy: number,
        cz: number,
        innerR: number,
        outerR: number,
        color: string,
        alpha = 1
      ) => {
        const segments = 36
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1.5, ((outerR - innerR) * zoom) * 0.75)
        const midR = (innerR + outerR) * 0.5
        ctx.beginPath()
        for (let i = 0; i <= segments; i++) {
          const ang = (i / segments) * Math.PI * 2
          const p = project(cx + Math.cos(ang) * midR, cy, cz + Math.sin(ang) * midR)
          if (i === 0) ctx.moveTo(p.px, p.py)
          else ctx.lineTo(p.px, p.py)
        }
        ctx.stroke()
        ctx.restore()
      }

      // =========================================================================
      // LAYER 0: Clear Background (#080b12)
      // =========================================================================
      ctx.fillStyle = '#080b12'
      ctx.fillRect(0, 0, width, height)

      // =========================================================================
      // LAYER 1: Exterior Lawn & Main Foundation Slab
      // =========================================================================
      drawBox(0, -0.7, 0, 70, 0.8, 70, '#14532d', 0, 1, '#166534')
      drawBox(0, -0.6, 0, 56, 1.2, 56, '#0f172a', 0, 1, '#1e293b')

      // =========================================================================
      // LAYER 2: Checkered Corridors & 9 Room Floor Slabs
      // =========================================================================
      drawBox(0, 0.02, -8, 46, 0.04, 2.4, '#cbd5e1')
      drawBox(0, 0.02, 8, 46, 0.04, 2.4, '#cbd5e1')
      drawBox(-8, 0.02, 0, 2.4, 0.04, 46, '#e2e8f0')
      drawBox(8, 0.02, 0, 2.4, 0.04, 46, '#e2e8f0')

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
      // LAYER 3: Exterior Full Back Walls (North & West) + Outdoor Trees
      // =========================================================================
      // Outdoor Trees (North & West edges)
      for (const tx of [-28, -14, 14, 28]) {
        drawCylinder(tx, 0.6, -28, 0.22, 0.3, 1.2, '#78350f', 10)
        drawCylinder(tx, 1.8, -28, 0.9, 1.15, 1.5, '#15803d', 12)
      }
      for (const tz of [-28, -14, 14, 28]) {
        drawCylinder(-28, 0.6, tz, 0.22, 0.3, 1.2, '#78350f', 10)
        drawCylinder(-28, 1.8, tz, 0.9, 1.15, 1.5, '#16a34a', 12)
      }

      // North Back Wall & Windows
      drawBox(0, 1.4, -23.2, 46.8, 2.8, 0.4, '#1e293b', 0, 1, '#334155')
      for (const wx of [-16, 0, 16]) {
        drawBox(wx, 1.6, -22.98, 8, 1.6, 0.06, '#38bdf8', 0, 0.55, '#7dd3fc')
      }
      // EasyUp HQ Exterior Banner on North Wall
      drawBox(0, 2.25, -22.92, 18, 0.85, 0.08, '#0f172a', 0, 1, '#00e5ff')

      // West Back Wall & Windows
      drawBox(-23.2, 1.4, 0, 0.4, 2.8, 46.8, '#1e293b', 0, 1, '#334155')
      for (const wz of [-16, 0, 16]) {
        drawBox(-22.98, 1.6, wz, 0.06, 1.6, 8, '#38bdf8', 0, 0.55, '#7dd3fc')
      }

      // =========================================================================
      // LAYER 4: Depth-Sorted 3D Interior Scene Queue (Painter's Algorithm: x + z)
      // =========================================================================
      const renderQueue: { depth: number; draw: () => void }[] = []
      const enqueue = (x: number, z: number, yBias: number, draw: () => void) => {
        renderQueue.push({ depth: x + z + yBias * 0.05, draw })
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
      ]
      for (const [px, py, pz, pw, ph, pd] of partitions) {
        enqueue(px, pz, py, () => {
          drawBox(px, py, pz, pw, ph, pd, '#334155', 0, 1, '#475569')
        })
      }

      // 4B. Central Command Center ("The Brain") Core & Consoles
      enqueue(0, 0, 1.5, () => {
        // Pedestal
        drawCylinder(0, 0.35, 0, 1.5, 1.9, 0.7, '#090d16', 24, 1, '#00e5ff')
        drawGroundRing(0, 0.72, 0, 1.2, 1.45, '#00e5ff', 0.95)

        // Pulsing Holographic Core Sphere + Gyroscopic Orbital Rings
        const centerProj = project(0, 1.8, 0)
        const pulse = 1 + Math.sin(elapsed * 2.5) * 0.1
        const coreR = Math.max(8, 0.85 * zoom * pulse)

        ctx.save()
        // Outer cyan glow halo
        const grad = ctx.createRadialGradient(
          centerProj.px,
          centerProj.py,
          coreR * 0.15,
          centerProj.px,
          centerProj.py,
          coreR * 2.4
        )
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.95)')
        grad.addColorStop(0.45, 'rgba(56, 189, 248, 0.45)')
        grad.addColorStop(1, 'rgba(0, 229, 255, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(centerProj.px, centerProj.py, coreR * 2.4, 0, Math.PI * 2)
        ctx.fill()

        // Inner solid core
        ctx.fillStyle = '#38bdf8'
        ctx.strokeStyle = '#00e5ff'
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.arc(centerProj.px, centerProj.py, coreR * 0.62, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // 3 Rotating Gyroscopic Orbital Ellipses
        const rings = [
          { r: 1.35 * zoom, rot: elapsed * 0.7, color: '#00e5ff' },
          { r: 1.7 * zoom, rot: -elapsed * 0.55 + 1.0, color: '#38bdf8' },
          { r: 2.05 * zoom, rot: elapsed * 0.4 + 2.1, color: '#67e8f9' },
        ]
        for (const rg of rings) {
          ctx.strokeStyle = rg.color
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.ellipse(
            centerProj.px,
            centerProj.py,
            rg.r,
            rg.r * 0.48,
            rg.rot,
            0,
            Math.PI * 2
          )
          ctx.stroke()
        }
        ctx.restore()
      })

      // 4 Curved Operator Consoles around The Brain
      for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
        const cx = Math.sin(angle) * 3.6
        const cz = Math.cos(angle) * 3.6
        enqueue(cx, cz, 0.6, () => {
          drawBox(cx, 0.45, cz, 2.8, 0.8, 0.7, '#1e293b', angle, 1, '#334155')
          drawBox(cx, 0.98, cz, 2.4, 0.32, 0.08, '#00e5ff', angle, 0.95)
        })
      }

      // 4 Glass Half-Walls around The Brain
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

      // 4C. Departmental Props & Furniture (Matching OfficeFurniture.tsx)
      // 1. Engineering Core (NW: [-16, 0, -16])
      for (const offset of [-4, -2, 0]) {
        const sx = -16 + offset
        const sz = -16 - 6.2
        enqueue(sx, sz, 1.2, () => {
          drawBox(sx, 1.2, sz, 1.4, 2.4, 0.7, '#090d16', 0, 1, '#334155')
          const ledColor = Math.sin(elapsed * 8 + offset) > 0 ? '#22c55e' : '#38bdf8'
          drawBox(sx - 0.35, 1.9, sz + 0.36, 0.25, 0.08, 0.04, ledColor)
        })
      }
      // Engineering Code Whiteboard & Plant
      enqueue(-12.5, -22.3, 1.5, () => {
        drawBox(-12.5, 1.5, -22.3, 3.2, 1.6, 0.08, '#f8fafc', 0, 1, '#64748b')
        drawBox(-12.5, 1.7, -22.24, 2.6, 0.12, 0.04, '#0284c7')
        drawBox(-12.5, 1.4, -22.24, 2.3, 0.1, 0.04, '#10b981')
      })
      enqueue(-22, -21.8, 0.6, () => {
        drawCylinder(-22, 0.3, -21.8, 0.35, 0.25, 0.6, '#92400e', 10)
        drawCylinder(-22, 0.9, -21.8, 0.1, 0.55, 1.0, '#15803d', 10)
      })

      // 2. Operations Hub (N: [0, 0, -16])
      enqueue(-5, -22.2, 0.7, () => {
        drawBox(-5, 0.7, -22.2, 1.2, 1.4, 0.6, '#475569', 0, 1, '#64748b')
        drawBox(-5, 1.6, -22.2, 0.6, 0.4, 0.5, '#b45309')
      })
      enqueue(5, -22.2, 0.7, () => {
        drawBox(5, 0.7, -22.2, 1.2, 1.4, 0.6, '#475569', 0, 1, '#64748b')
      })

      // 3. Growth Lab (NE: [16, 0, -16])
      enqueue(16, -22.3, 1.6, () => {
        drawBox(16, 1.6, -22.3, 4.2, 1.8, 0.1, '#0f172a')
        drawBox(16, 1.6, -22.23, 3.9, 1.5, 0.05, '#3b82f6')
      })

      // 4. Executive Lounge (W: [-16, 0, 0])
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

      // 5. QA & SecOps NOC (E: [16, 0, 0])
      enqueue(16, -6.3, 1.6, () => {
        drawBox(16, 1.6, -6.3, 4.8, 1.8, 0.1, '#0f172a')
        drawBox(16, 1.6, -6.23, 4.5, 1.5, 0.05, '#d946ef')
      })

      // 6. Pantry & Canteen (SW: [-16, 0, 16])
      enqueue(-18, 12, 0.6, () => {
        // Espresso bar counter
        drawBox(-18, 0.5, 12, 4.8, 1.0, 1.2, '#78350f')
        drawBox(-18, 1.02, 12, 5.0, 0.06, 1.3, '#f8fafc')
        // Espresso Machine
        drawBox(-19.4, 1.3, 12, 0.7, 0.5, 0.5, '#334155')
        // Pastry Tray
        drawBox(-17.2, 1.1, 12, 0.7, 0.1, 0.45, '#fde047')
      })
      enqueue(-18, 17, 0.45, () => {
        // Café Dining Table & 4 Orange Stools
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
        // Water Dispenser
        drawBox(-11.5, 0.55, 12, 0.5, 1.1, 0.5, '#f1f5f9')
        drawCylinder(-11.5, 1.35, 12, 0.22, 0.22, 0.5, '#0284c7', 14, 0.8)
      })

      // 7. Rec & Gym (S: [0, 0, 16])
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

      // 8. Intelligence Lab (SE: [16, 0, 16])
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

      // 4D. All 24 Permanent Workstations (Desks, Chairs, Monitors) & Interpolated Agents
      const currentAgents = agentsRef.current
      const isAtDesk = currentMode === 'OVERVIEW' || currentMode === 'FOCUS_WORK'
      const newScreenBoxes: Record<
        string,
        { px: number; py: number; radius: number; agent: Agent }
      > = {}

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

        const deskRot = getFacingAngle(ws.facing)
        const [dx, dy, dz] = ws.deskPos
        const cosD = Math.cos(deskRot)
        const sinD = Math.sin(deskRot)

        const toDeskWorld = (lx: number, ly: number, lz: number): [number, number, number] => [
          dx + lx * cosD + lz * sinD,
          dy + ly,
          dz - lx * sinD + lz * cosD,
        ]

        // Enqueue Permanent Ergonomic Chair at Home Workstation
        enqueue(dx, dz, 0.4, () => {
          drawCylinder(dx, 0.08, dz, 0.3, 0.35, 0.08, '#0f172a', 10)
          drawBox(dx, 0.42, dz, 0.55, 0.08, 0.55, '#1e293b', deskRot)
          const [bx, by, bz] = toDeskWorld(0, 0.78, -0.24)
          drawBox(bx, by, bz, 0.52, 0.65, 0.06, '#0f172a', deskRot)
        })

        // Enqueue Permanent Desk & Dual Glowing Monitors at Home Workstation
        const [deskWX, deskWY, deskWZ] = toDeskWorld(0, 0.7, 0.8)
        enqueue(deskWX, deskWZ, 0.75, () => {
          // Legs
          const [l1x, l1y, l1z] = toDeskWorld(-0.8, 0.35, 0.8)
          const [l2x, l2y, l2z] = toDeskWorld(0.8, 0.35, 0.8)
          drawBox(l1x, l1y, l1z, 0.06, 0.7, 0.8, '#475569', deskRot)
          drawBox(l2x, l2y, l2z, 0.06, 0.7, 0.8, '#475569', deskRot)
          // White Desk Surface
          drawBox(deskWX, deskWY, deskWZ, 1.8, 0.06, 0.9, '#f8fafc', deskRot, 1, '#cbd5e1')
          // Keyboard & Mouse
          const [kx, ky, kz] = toDeskWorld(0, 0.75, 0.7)
          drawBox(kx, ky, kz, 0.6, 0.02, 0.22, '#334155', deskRot)
          // Primary Curved Cyan Monitor
          const [m1x, m1y, m1z] = toDeskWorld(0, 1.05, 1.05)
          drawBox(m1x, m1y, m1z, 1.1, 0.6, 0.05, '#0f172a', deskRot, 1, '#00e5ff')
          const [m1sx, m1sy, m1sz] = toDeskWorld(0, 1.05, 1.02)
          drawBox(m1sx, m1sy, m1sz, 1.02, 0.52, 0.02, '#00e5ff', deskRot)
          // Secondary Emerald Monitor
          const [m2x, m2y, m2z] = toDeskWorld(0.7, 1.05, 1.0)
          drawBox(m2x, m2y, m2z, 0.65, 0.6, 0.05, '#0f172a', deskRot - 0.35, 1, '#10b981')
          // Blue-accent Coffee Mug
          const [mugX, mugY, mugZ] = toDeskWorld(-0.6, 0.78, 0.65)
          drawCylinder(mugX, mugY, mugZ, 0.06, 0.05, 0.12, '#f1f5f9', 8)
        })

        // Smoothly interpolate agent's active 3D coordinate
        const target = getAgentTargetPosition(ws, currentMode)
        if (!agentPosMapRef.current[agent.id]) {
          agentPosMapRef.current[agent.id] = [target[0], target[1], target[2]]
        }
        const cur = agentPosMapRef.current[agent.id]
        const posLerp = 1 - Math.exp(-6 * dt)
        cur[0] += (target[0] - cur[0]) * posLerp
        cur[1] += (target[1] - cur[1]) * posLerp
        cur[2] += (target[2] - cur[2]) * posLerp

        const ax = cur[0]
        const ay = cur[1]
        const az = cur[2]

        // Agent facing rotation
        let agentRot = deskRot
        if (currentMode === 'ALL_HANDS') {
          agentRot = Math.atan2(0 - ax, 0 - az)
        } else if (currentMode === 'PANTRY') {
          agentRot = Math.atan2(-16 - ax, 16 - az)
        } else if (currentMode === 'GYM') {
          agentRot = Math.atan2(0 - ax, 16 - az)
        }

        const cosA = Math.cos(agentRot)
        const sinA = Math.sin(agentRot)
        const toAgentWorld = (lx: number, ly: number, lz: number): [number, number, number] => [
          ax + lx * cosA + lz * sinA,
          ay + ly,
          az - lx * sinA + lz * cosA,
        ]

        // Record screen hitbox for click selection
        const bodyProj = project(ax, ay + 0.9, az)
        newScreenBoxes[agent.id] = {
          px: bodyProj.px,
          py: bodyProj.py,
          radius: Math.max(18, 0.95 * zoom),
          agent,
        }

        // Update floating DOM tag position above head
        const headTagProj = project(ax, ay + 1.85, az)
        const tagContainer = tagsContainerRef.current
        if (tagContainer) {
          const el = tagContainer.querySelector<HTMLElement>(`[data-agent-tag="${agent.id}"]`)
          if (el) {
            if (
              headTagProj.px >= -80 &&
              headTagProj.px <= width + 80 &&
              headTagProj.py >= -80 &&
              headTagProj.py <= height + 80
            ) {
              el.style.display = 'flex'
              el.style.transform = `translate3d(${Math.round(headTagProj.px)}px, ${Math.round(headTagProj.py)}px, 0px) translate(-50%, -100%)`
            } else {
              el.style.display = 'none'
            }
          }
        }

        // Enqueue Articulated Character Avatar
        const isSelected = selectedIdRef.current === agent.id
        enqueue(ax, az, 0.65, () => {
          if (isSelected) {
            drawGroundRing(ax, ay + 0.05, az, 0.9, 1.1, '#00e5ff', 0.95)
          }

          // Legs
          const [lg1x, lg1y, lg1z] = toAgentWorld(-0.14, 0.35, isAtDesk ? 0.2 : 0.02)
          const [lg2x, lg2y, lg2z] = toAgentWorld(0.14, 0.35, isAtDesk ? 0.2 : 0.02)
          drawBox(lg1x, lg1y, lg1z, 0.16, 0.36, 0.22, '#1e293b', agentRot)
          drawBox(lg2x, lg2y, lg2z, 0.16, 0.36, 0.22, '#1e293b', agentRot)

          // Royal Blue Shirt Torso
          const [tx, ty, tz] = toAgentWorld(0, 0.76, 0.02)
          drawBox(tx, ty, tz, 0.48, 0.48, 0.28, '#2563eb', agentRot)

          // Arms & Animated Typing Hands
          const isTyping =
            (agent.status === 'working' || agent.status === 'active' || !agent.status) &&
            isAtDesk
          const lHandBob = isTyping ? Math.sin(elapsed * 12 + idx) * 0.025 : 0
          const rHandBob = isTyping ? Math.cos(elapsed * 12 + idx) * 0.025 : 0

          const [ar1x, ar1y, ar1z] = toAgentWorld(-0.28, 0.74, 0.14)
          const [ar2x, ar2y, ar2z] = toAgentWorld(0.28, 0.74, 0.14)
          drawBox(ar1x, ar1y, ar1z, 0.12, 0.32, 0.16, '#1d4ed8', agentRot)
          drawBox(ar2x, ar2y, ar2z, 0.12, 0.32, 0.16, '#1d4ed8', agentRot)

          const [h1x, h1y, h1z] = toAgentWorld(-0.16, 0.74 + lHandBob, 0.38)
          const [h2x, h2y, h2z] = toAgentWorld(0.16, 0.74 + rHandBob, 0.38)
          drawBox(h1x, h1y, h1z, 0.1, 0.07, 0.12, '#fed7aa', agentRot)
          drawBox(h2x, h2y, h2z, 0.1, 0.07, 0.12, '#fed7aa', agentRot)

          // Head & Dark Hair
          const [hx, hy, hz] = toAgentWorld(0, 1.14, 0.02)
          drawBox(hx, hy, hz, 0.34, 0.34, 0.32, '#fed7aa', agentRot)
          const [hrx, hry, hrz] = toAgentWorld(0, 1.17, -0.06)
          drawBox(hrx, hry, hrz, 0.36, 0.26, 0.24, '#1e293b', agentRot)

          // Signature EasyUp Blue Baseball Cap + Visor
          const [capX, capY, capZ] = toAgentWorld(0, 1.32, 0.02)
          drawCylinder(capX, capY, capZ, 0.2, 0.22, 0.12, '#1d4ed8', 12)
          const [visX, visY, visZ] = toAgentWorld(0, 1.28, 0.2)
          drawBox(visX, visY, visZ, 0.3, 0.04, 0.18, '#1e40af', agentRot)
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
      // South Wall (Front Cutaway) + Glass Railing
      drawBox(0, 0.35, 23.2, 46.8, 0.7, 0.4, '#334155', 0, 1, '#475569')
      drawBox(0, 0.85, 23.2, 46.8, 0.3, 0.1, '#38bdf8', 0, 0.4)

      // East Wall (Right Cutaway) + Glass Railing
      drawBox(23.2, 0.35, 0, 0.4, 0.7, 46.8, '#334155', 0, 1, '#475569')
      drawBox(23.2, 0.85, 0, 0.1, 0.3, 46.8, '#38bdf8', 0, 0.4)

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
      {/* 2D Isometric Canvas Twin */}
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating 2D Screen-Space Name Pills (Name ONLY + Live Status Dot — 100% Parity with 3D) */}
      <div
        ref={tagsContainerRef}
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      >
        {agents.map((agent) => {
          const isSelected = selectedAgentId === agent.id
          const dotColor =
            agent.status === 'awaiting_approval'
              ? 'bg-orange-500 animate-pulse'
              : agent.status === 'working' || agent.status === 'active' || !agent.status
              ? 'bg-emerald-500'
              : mode === 'PANTRY'
              ? 'bg-amber-500'
              : mode === 'GYM'
              ? 'bg-cyan-500'
              : 'bg-slate-400'

          return (
            <button
              key={agent.id}
              data-agent-tag={agent.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelectAgent(agent)
              }}
              style={{ display: 'none', position: 'absolute', left: 0, top: 0 }}
              className={`pointer-events-auto flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-tight shadow-xl transition-all cursor-pointer select-none whitespace-nowrap will-change-transform ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-300 font-bold scale-105 z-30 shadow-cyan-500/30'
                  : 'bg-slate-900/90 text-slate-100 hover:bg-slate-800 border border-slate-700/80 backdrop-blur-sm'
              }`}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
              <span>{agent.name}</span>
            </button>
          )
        })}
      </div>

      {/* Floating Viewport HUD Controls */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-950/85 px-3 py-1.5 font-mono text-[11px] text-slate-300 shadow-xl backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="tracking-wide text-slate-400">VIEWPORT (2D ISO):</span>
          <span className="font-bold text-cyan-300">{mode.replace('_', ' ')}</span>
        </div>

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
        <span>Click Agent to Inspect</span>
        <span>•</span>
        <span>Drag to Pan</span>
        <span>•</span>
        <span>Scroll to Zoom</span>
      </div>
    </div>
  )
}
