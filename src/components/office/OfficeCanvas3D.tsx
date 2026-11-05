'use client'

import React, { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import { Agent } from '@/components/office/types'
import { DepartmentMode, AGENT_WORKSTATIONS_3D } from './three/office3DData'
import { OfficeScene } from './three/OfficeScene'

export interface OfficeCanvas3DProps {
  agents: Agent[]
  mode: DepartmentMode
  selectedAgentId?: string | null
  onSelectAgent: (agent: Agent) => void
  onResetCamera?: () => void
  className?: string
}

/**
 * High-performance 3D-to-2D Screen Projector.
 * Projects 3D agent coordinates to 2D screen positions at 60fps
 * without creating nested React roots or causing cascading renders.
 */
function ScreenProjector({
  agents,
  mode,
  containerRef,
}: {
  agents: Agent[]
  mode: DepartmentMode
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const tempVec = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera, size }) => {
    const container = containerRef.current
    if (!container) return

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i]
      const ws = AGENT_WORKSTATIONS_3D[agent.id]
      if (!ws) continue

      let pos = ws.deskPos
      if (mode === 'ALL_HANDS') pos = ws.allHandsPos
      else if (mode === 'PANTRY' && ws.pantryPos) pos = ws.pantryPos
      else if (mode === 'GYM' && ws.gymPos) pos = ws.gymPos

      // Point above character's head
      tempVec.set(pos[0], pos[1] + 1.85, pos[2])
      tempVec.project(camera)

      const screenX = (tempVec.x * 0.5 + 0.5) * size.width
      const screenY = (-tempVec.y * 0.5 + 0.5) * size.height

      const el = container.querySelector<HTMLElement>(`[data-agent-tag="${agent.id}"]`)
      if (el) {
        if (
          tempVec.z < 1.0 &&
          screenX >= -80 &&
          screenX <= size.width + 80 &&
          screenY >= -80 &&
          screenY <= size.height + 80
        ) {
          el.style.display = 'flex'
          el.style.transform = `translate3d(${Math.round(screenX)}px, ${Math.round(screenY)}px, 0px) translate(-50%, -100%)`
        } else {
          el.style.display = 'none'
        }
      }
    }
  })

  return null
}

export default function OfficeCanvas3D({
  agents,
  mode,
  selectedAgentId,
  onSelectAgent,
  onResetCamera,
  className = '',
}: OfficeCanvas3DProps) {
  const tagsContainerRef = useRef<HTMLDivElement>(null)

  return (
    <div className={`relative h-full w-full select-none overflow-hidden bg-[#080b12] ${className}`}>
      {/* Three.js 3D Isometric Viewport */}
      <Canvas
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        className="h-full w-full"
      >
        <color attach="background" args={['#080b12']} />

        {/* Isometric Orthographic Camera */}
        <OrthographicCamera
          makeDefault
          position={[50, 42, 50]}
          zoom={20}
          near={0.1}
          far={1000}
        />

        <Suspense fallback={null}>
          <OfficeScene
            agents={agents}
            mode={mode}
            selectedAgentId={selectedAgentId}
            onSelectAgent={onSelectAgent}
          />
          <ScreenProjector
            agents={agents}
            mode={mode}
            containerRef={tagsContainerRef}
          />
        </Suspense>
      </Canvas>

      {/* Floating 2D Screen-Space Name Pills (Name ONLY + Live Status Dot) */}
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
          <span className="tracking-wide text-slate-400">VIEWPORT:</span>
          <span className="font-bold text-cyan-300">{mode.replace('_', ' ')}</span>
        </div>

        {onResetCamera && (
          <button
            type="button"
            onClick={onResetCamera}
            className="pointer-events-auto cursor-pointer rounded-lg border border-slate-800/80 bg-slate-900/90 px-3 py-1.5 font-mono text-[11px] font-medium text-slate-300 shadow-xl backdrop-blur-md transition-all hover:bg-slate-800 hover:text-white"
          >
            Reset Camera ⟲
          </button>
        )}
      </div>

      {/* Help tooltip */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-30 hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/85 px-3 py-1.5 font-mono text-[10px] text-slate-400 shadow-xl backdrop-blur-md">
        <span>Click Agent to Inspect</span>
        <span>•</span>
        <span>Drag to Pan / Orbit</span>
        <span>•</span>
        <span>Scroll to Zoom</span>
      </div>
    </div>
  )
}
