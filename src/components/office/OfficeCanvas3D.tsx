'use client'

import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { Agent } from '@/components/office/types'
import { DepartmentMode } from '@/config/officeLayout'
import { OfficeScene } from './three/OfficeScene'

export interface OfficeCanvas3DProps {
  agents: Agent[]
  mode: DepartmentMode
  agentRouteOverrides?: Record<string, DepartmentMode>
  selectedAgentId?: string | null
  onSelectAgent: (agent: Agent) => void
  onResetCamera?: () => void
  className?: string
}

export default function OfficeCanvas3D({
  agents,
  mode,
  agentRouteOverrides = {},
  selectedAgentId,
  onSelectAgent,
  onResetCamera,
  className = '',
}: OfficeCanvas3DProps) {
  return (
    <div className={`relative h-full w-full select-none overflow-hidden bg-[#080b12] ${className}`}>
      {/* Three.js 3D Isometric Viewport (Native WebGL Sprite Nameplates = Zero Pan/Zoom Lag) */}
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
          zoom={16.5}
          near={0.1}
          far={1000}
        />

        <Suspense fallback={null}>
          <OfficeScene
            agents={agents}
            mode={mode}
            agentRouteOverrides={agentRouteOverrides}
            selectedAgentId={selectedAgentId}
            onSelectAgent={onSelectAgent}
          />
        </Suspense>
      </Canvas>

      {/* Floating Viewport HUD Controls */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-950/85 px-3 py-1.5 font-mono text-[11px] text-slate-300 shadow-xl backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="tracking-wide text-slate-400">VIEWPORT (3D WEBGL):</span>
          <span className="font-bold text-cyan-300">{mode.replace('_', ' ')}</span>
        </div>

        {onResetCamera && (
          <button
            type="button"
            onClick={onResetCamera}
            className="pointer-events-auto cursor-pointer rounded-lg border border-slate-800/80 bg-slate-900/90 px-3 py-1.5 font-mono text-[11px] font-medium text-slate-300 shadow-xl backdrop-blur-md transition-all hover:bg-slate-800 hover:text-white whitespace-nowrap"
          >
            Reset Camera ⟲
          </button>
        )}
      </div>

      {/* Help tooltip */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-30 hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/85 px-3 py-1.5 font-mono text-[10px] text-slate-400 shadow-xl backdrop-blur-md">
        <span>Click Agent to Inspect & Route</span>
        <span>•</span>
        <span>Drag to Pan / Orbit</span>
        <span>•</span>
        <span>Scroll to Zoom</span>
      </div>
    </div>
  )
}
