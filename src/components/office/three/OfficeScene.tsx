'use client'

import React, { useMemo } from 'react'
import { Agent } from '@/components/office/types'
import {
  DepartmentMode,
  AGENT_WORKSTATIONS_3D,
} from './office3DData'
import { BuildingArchitecture } from './BuildingArchitecture'
import { BrainCore } from './BrainCore'
import { OfficeFurniture } from './OfficeFurniture'
import { ProceduralAgent3D } from './ProceduralAgent3D'
import { CameraController, CameraViewMode } from './CameraController'
import { JarvisCoreState } from '@/components/jarvis/ArcReactor'
import { computeSolarLighting } from '@/lib/office/clock'
import { DoorDefinition } from '@/lib/office/walkCollision'

export type OfficeLightingTheme = 'auto' | 'day' | 'night'

export interface OfficeSceneProps {
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
  coreState?: JarvisCoreState
  onClickCore?: () => void
  isDivingToJarvis?: boolean
  cameraViewMode?: CameraViewMode
  lightingTheme?: OfficeLightingTheme
  zoomStep?: { delta: number; nonce: number }
  openDoors?: ReadonlySet<string>
  onToggleDoor?: (doorId: string) => void
  onNearbyDoorChange?: (door: DoorDefinition | null) => void
}

export function OfficeScene({
  agents,
  mode,
  agentRouteOverrides = {},
  selectedAgentId,
  onSelectAgent,
  onArriveAgent,
  coreState = 'idle',
  onClickCore,
  isDivingToJarvis = false,
  cameraViewMode = 'isometric',
  lightingTheme = 'auto',
  zoomStep,
  openDoors,
  onToggleDoor,
  onNearbyDoorChange,
}: OfficeSceneProps) {
  // Compute astronomical solar lighting for Iloilo City (or override via Day/Night switcher)
  const lighting = useMemo(() => {
    if (lightingTheme === 'day') {
      return {
        phase: 'day' as const,
        sunPosition: [28, 46, 26] as [number, number, number],
        sunColor: '#fffbeb',
        sunIntensity: 1.85,
        ambientColor: '#e0f2fe',
        ambientIntensity: 0.95,
        skyColor: '#bae6fd',
        windowGlowColor: '#e0f2fe',
        windowGlowIntensity: 0.45,
        interiorLampsOn: false,
      }
    }
    if (lightingTheme === 'night') {
      return {
        phase: 'night' as const,
        sunPosition: [-22, 32, -18] as [number, number, number],
        sunColor: '#38bdf8',
        sunIntensity: 0.65,
        ambientColor: '#1e293b',
        ambientIntensity: 0.48,
        skyColor: '#080b12',
        windowGlowColor: '#0284c7',
        windowGlowIntensity: 0.25,
        interiorLampsOn: true,
      }
    }
    return computeSolarLighting(new Date())
  }, [lightingTheme])

  const isWalkMode = cameraViewMode === 'walk'

  const renderedAgents = useMemo(() => {
    return agents.map((agent, idx) => {
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
      return { agent, workstation: ws, idx }
    })
  }, [agents])

  return (
    <group name="Office3DWorld">
      {/* 1. Dynamic Environmental Lighting (Auto PHT Solar / Day / Night) */}
      <ambientLight
        color={lighting.ambientColor}
        intensity={isWalkMode ? Math.max(1.15, lighting.ambientIntensity) : lighting.ambientIntensity}
      />
      <directionalLight
        position={lighting.sunPosition}
        intensity={lighting.sunIntensity}
        color={lighting.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={160}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-bias={-0.0005}
      />
      <hemisphereLight
        color={lightingTheme === 'day' ? '#f0f9ff' : '#38bdf8'}
        groundColor={lightingTheme === 'day' ? '#334155' : '#0f172a'}
        intensity={lightingTheme === 'day' ? 0.65 : isWalkMode ? 0.6 : 0.42}
      />
      {isWalkMode && (
        <>
          <pointLight position={[0, 2.8, 0]} intensity={1.8} distance={38} color="#f8fafc" />
          <pointLight position={[-16, 2.8, -16]} intensity={1.4} distance={26} color="#e0f2fe" />
          <pointLight position={[16, 2.8, -16]} intensity={1.4} distance={26} color="#e0f2fe" />
          <pointLight position={[-16, 2.8, 16]} intensity={1.4} distance={26} color="#e0f2fe" />
          <pointLight position={[16, 2.8, 16]} intensity={1.4} distance={26} color="#e0f2fe" />
          <pointLight position={[-36, 2.8, 4]} intensity={1.5} distance={28} color="#e0f2fe" />
        </>
      )}

      {/* 2. Interactive Camera Controller (Isometric Orbit + Walk-Inside Perspective + Jarvis Dive) */}
      <CameraController
        mode={mode}
        isDivingToJarvis={isDivingToJarvis}
        cameraViewMode={cameraViewMode}
        zoomStep={zoomStep}
        openDoors={openDoors}
        onToggleDoor={onToggleDoor}
        onNearbyDoorChange={onNearbyDoorChange}
      />

      {/* 3. Procedural Architectural Building + Walk-Mode Drop Ceiling Grid */}
      <BuildingArchitecture
        isWalkMode={isWalkMode}
        openDoors={openDoors}
        isNight={lighting.phase === 'night'}
      />

      {/* 4. Central Command Center ("The Brain") Holographic Core */}
      <BrainCore state={coreState} onClickCore={onClickCore} />

      {/* 5. Departmental Props & Furniture */}
      <OfficeFurniture />

      {/* 6. All Registered Database Agents with A* Walking & Distinct Styles */}
      <group name="AgentFleet">
        {renderedAgents.map(({ agent, workstation, idx }) => (
          <ProceduralAgent3D
            key={agent.id}
            agent={agent}
            agentIndex={idx}
            workstation={workstation}
            mode={mode}
            routeOverride={agentRouteOverrides[agent.id]}
            isSelected={selectedAgentId === agent.id}
            isWalkMode={isWalkMode}
            onSelect={onSelectAgent}
            onArrive={onArriveAgent}
          />
        ))}
      </group>
    </group>
  )
}
