'use client'

import React, { Suspense, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { Agent } from '@/components/office/types'
import { DepartmentMode } from '@/config/officeLayout'
import { OfficeScene, OfficeLightingTheme } from './three/OfficeScene'
import { CameraViewMode } from './three/CameraController'
import { JarvisCoreState } from '@/components/jarvis/ArcReactor'
import { DoorDefinition } from '@/lib/office/walkCollision'

export interface OfficeCanvas3DProps {
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
  cameraViewMode?: CameraViewMode
  onToggleWalkMode?: () => void
  lightingTheme?: OfficeLightingTheme
  zoomStep?: { delta: number; nonce: number }
  className?: string
}

export default function OfficeCanvas3D({
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
  cameraViewMode = 'isometric',
  onToggleWalkMode,
  lightingTheme = 'auto',
  zoomStep,
  className = '',
}: OfficeCanvas3DProps) {
  const isWalkMode = cameraViewMode === 'walk'
  const bgColor = lightingTheme === 'day' ? '#dbeafe' : '#080b12'
  const [openDoors, setOpenDoors] = useState<Set<string>>(() => new Set())
  const [nearbyDoor, setNearbyDoor] = useState<DoorDefinition | null>(null)

  const handleToggleDoor = useCallback((doorId: string) => {
    setOpenDoors((prev) => {
      const next = new Set(prev)
      if (next.has(doorId)) next.delete(doorId)
      else next.add(doorId)
      return next
    })
  }, [])

  return (
    <div
      className={`relative h-full w-full select-none overflow-hidden ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Three.js 3D Viewport (Isometric Orthographic or Eye-Level Walk-Inside Perspective) */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        }}
        className="h-full w-full"
      >
        <color attach="background" args={[bgColor]} />

        {isWalkMode ? (
          <PerspectiveCamera
            makeDefault
            position={[0, 1.65, 11.5]}
            fov={58}
            near={0.15}
            far={350}
          />
        ) : (
          <OrthographicCamera
            makeDefault
            position={[43.5, 42, 50]}
            zoom={11.5}
            near={0.1}
            far={1000}
          />
        )}

        <Suspense fallback={null}>
          <OfficeScene
            agents={agents}
            mode={mode}
            agentRouteOverrides={agentRouteOverrides}
            selectedAgentId={selectedAgentId}
            onSelectAgent={onSelectAgent}
            onArriveAgent={onArriveAgent}
            coreState={coreState}
            onClickCore={onClickCore}
            isDivingToJarvis={isDivingToJarvis}
            cameraViewMode={cameraViewMode}
            lightingTheme={lightingTheme}
            zoomStep={zoomStep}
            openDoors={openDoors}
            onToggleDoor={handleToggleDoor}
            onNearbyDoorChange={setNearbyDoor}
          />
        </Suspense>
      </Canvas>

      {/* Floating Bottom-Left Viewport HUD Controls */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-950/85 px-3 py-1.5 font-mono text-[11px] text-slate-300 shadow-xl backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="tracking-wide text-slate-400">
            {isWalkMode ? 'WALK-INSIDE 3D:' : 'VIEWPORT (3D):'}
          </span>
          <span className="font-bold text-cyan-300">{mode.replace('_', ' ')}</span>
        </div>

        {onToggleWalkMode && (
          <button
            type="button"
            data-testid="walk-inside-toggle-btn"
            onClick={onToggleWalkMode}
            className={`pointer-events-auto cursor-pointer flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-bold shadow-xl backdrop-blur-md transition-all whitespace-nowrap ${
              isWalkMode
                ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                : 'border-slate-700/80 bg-slate-900/90 text-slate-200 hover:border-cyan-400 hover:text-cyan-300'
            }`}
          >
            <span>{isWalkMode ? 'Exit Walk [V]' : 'Walk Inside [V]'}</span>
          </button>
        )}

        {onClickCore && (
          <button
            type="button"
            data-testid="bottom-toolbar-jarvis-btn"
            onClick={onClickCore}
            className="pointer-events-auto cursor-pointer flex items-center gap-1.5 rounded-lg border border-cyan-400/70 bg-cyan-950/90 px-3 py-1.5 font-mono text-[11px] font-bold text-cyan-200 shadow-[0_0_16px_rgba(0,229,255,0.28)] backdrop-blur-md transition-all hover:bg-cyan-500 hover:text-slate-950 whitespace-nowrap"
          >
            <span className="h-2 w-2 rounded-full bg-cyan-300 animate-ping" />
            <span>JARVIS [J]</span>
          </button>
        )}

        {onResetCamera && !isWalkMode && (
          <button
            type="button"
            onClick={onResetCamera}
            className="pointer-events-auto cursor-pointer rounded-lg border border-slate-800/80 bg-slate-900/90 px-3 py-1.5 font-mono text-[11px] font-medium text-slate-300 shadow-xl backdrop-blur-md transition-all hover:bg-slate-800 hover:text-white whitespace-nowrap"
          >
            Reset ⟲
          </button>
        )}
      </div>

      {/* Subtle Walk-3D Crosshair & Interactive [E] Door Prompt */}
      {isWalkMode && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-white/80 ring-2 ring-slate-950/60" />
          </div>
          {nearbyDoor && (
            <div
              data-testid="walk-door-prompt"
              className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2 transition-all duration-200 ease-out"
            >
              <div className="flex items-center gap-2 rounded-full border border-sky-400/40 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md">
                <kbd className="rounded bg-sky-400 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-950">
                  E
                </kbd>
                <span className="whitespace-nowrap">
                  {openDoors.has(nearbyDoor.id) ? 'Close' : 'Open'} {nearbyDoor.label}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Help tooltip */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-20 hidden 2xl:flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/85 px-3 py-1.5 font-mono text-xs text-slate-400 shadow-xl backdrop-blur-md">
        {isWalkMode ? (
          <span>WASD / Arrows to Walk • Drag to Look • E for Doors • V to Exit Walk</span>
        ) : (
          <span>J for JARVIS • V to Walk Inside • F for Fullscreen</span>
        )}
      </div>
    </div>
  )
}
