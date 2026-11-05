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
import { CameraController } from './CameraController'

export interface OfficeSceneProps {
  agents: Agent[]
  mode: DepartmentMode
  agentRouteOverrides?: Record<string, DepartmentMode>
  selectedAgentId?: string | null
  onSelectAgent: (agent: Agent) => void
}

export function OfficeScene({
  agents,
  mode,
  agentRouteOverrides = {},
  selectedAgentId,
  onSelectAgent,
}: OfficeSceneProps) {
  // Compute real Philippine Standard Time (PHT, Asia/Manila, UTC+8) for lighting
  const lighting = useMemo(() => {
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const phtDate = new Date(utc + 3600000 * 8)
    const phtHour = phtDate.getHours() + phtDate.getMinutes() / 60

    // Daytime (06:00 - 17:30)
    if (phtHour >= 6 && phtHour < 17.5) {
      return {
        sunColor: '#fff8e7',
        sunIntensity: 1.8,
        ambientColor: '#cbd5e1',
        ambientIntensity: 0.75,
        sunPosition: [40, 60, 30] as [number, number, number],
      }
    }
    // Sunset / Golden Hour (17:30 - 19:00)
    if (phtHour >= 17.5 && phtHour < 19.0) {
      return {
        sunColor: '#fb923c',
        sunIntensity: 1.5,
        ambientColor: '#fdba74',
        ambientIntensity: 0.55,
        sunPosition: [30, 40, 45] as [number, number, number],
      }
    }
    // Night Mode (19:00 - 06:00)
    return {
      sunColor: '#60a5fa',
      sunIntensity: 0.65,
      ambientColor: '#334155',
      ambientIntensity: 0.55,
      sunPosition: [30, 50, 40] as [number, number, number],
    }
  }, [])

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
      return { agent, workstation: ws }
    })
  }, [agents])

  return (
    <group name="Office3DWorld">
      {/* 1. Real PHT Dynamic Environmental Lighting */}
      <ambientLight color={lighting.ambientColor} intensity={lighting.ambientIntensity} />
      <directionalLight
        position={lighting.sunPosition}
        intensity={lighting.sunIntensity}
        color={lighting.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={160}
        shadow-camera-left={-44}
        shadow-camera-right={44}
        shadow-camera-top={44}
        shadow-camera-bottom={-44}
        shadow-bias={-0.0005}
      />
      <hemisphereLight
        color="#38bdf8"
        groundColor="#0f172a"
        intensity={0.38}
      />

      {/* 2. Interactive Camera Controller with Mode Lerping */}
      <CameraController mode={mode} />

      {/* 3. Procedural 3x3 Architectural Building + Outdoor Highway & Parking */}
      <BuildingArchitecture />

      {/* 4. Central Command Center ("The Brain") Holographic Core */}
      <BrainCore />

      {/* 5. Departmental Props & Furniture */}
      <OfficeFurniture />

      {/* 6. All Registered Database Agents with A* Walking & Distinct Styles */}
      <group name="AgentFleet">
        {renderedAgents.map(({ agent, workstation }) => (
          <ProceduralAgent3D
            key={agent.id}
            agent={agent}
            workstation={workstation}
            mode={mode}
            routeOverride={agentRouteOverrides[agent.id]}
            isSelected={selectedAgentId === agent.id}
            onSelect={onSelectAgent}
          />
        ))}
      </group>
    </group>
  )
}
