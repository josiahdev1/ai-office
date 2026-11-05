'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Agent } from '@/components/office/types'
import {
  AgentWorkstation3D,
  DepartmentMode,
  getAgentTargetPosition,
} from '@/config/officeLayout'

export interface ProceduralAgent3DProps {
  agent: Agent
  workstation: AgentWorkstation3D
  mode: DepartmentMode
  isSelected: boolean
  onSelect: (agent: Agent) => void
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

export function ProceduralAgent3D({
  agent,
  workstation,
  mode,
  isSelected,
  onSelect,
}: ProceduralAgent3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const leftHandRef = useRef<THREE.Mesh>(null)
  const rightHandRef = useRef<THREE.Mesh>(null)

  // Target world position based on active mode
  const targetPos = useMemo<[number, number, number]>(
    () => getAgentTargetPosition(workstation, mode),
    [workstation, mode]
  )

  const targetVec = useMemo(
    () => new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]),
    [targetPos]
  )

  // Desk fixed rotation
  const deskRotationY = useMemo(
    () => getFacingAngle(workstation.facing),
    [workstation.facing]
  )

  // Agent rotation based on mode & facing direction
  const agentRotationY = useMemo(() => {
    if (mode === 'ALL_HANDS') {
      const dx = 0 - targetPos[0]
      const dz = 0 - targetPos[2]
      return Math.atan2(dx, dz)
    }
    if (mode === 'PANTRY') {
      const dx = -16 - targetPos[0]
      const dz = 16 - targetPos[2]
      return Math.atan2(dx, dz)
    }
    if (mode === 'GYM') {
      const dx = 0 - targetPos[0]
      const dz = 16 - targetPos[2]
      return Math.atan2(dx, dz)
    }
    return deskRotationY
  }, [mode, targetPos, deskRotationY])

  const isAtDesk = mode === 'OVERVIEW' || mode === 'FOCUS_WORK'

  // Smooth position interpolation & procedural typing/activity animation
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()
    if (groupRef.current) {
      const factor = 1 - Math.exp(-6 * delta)
      groupRef.current.position.lerp(targetVec, factor)
    }

    const isTyping =
      agent.status === 'working' || agent.status === 'active' || !agent.status
    if (isTyping && isAtDesk) {
      const typeSpeed = 12
      if (leftHandRef.current) {
        leftHandRef.current.position.y = 0.32 + Math.sin(t * typeSpeed) * 0.02
      }
      if (rightHandRef.current) {
        rightHandRef.current.position.y = 0.32 + Math.cos(t * typeSpeed) * 0.02
      }
    }
  })

  return (
    <group>
      {/* ========================================================================= */}
      {/* A. PERMANENT WORKSTATION DESK, CHAIR & MULTI-MONITORS AT HOME ROOM        */}
      {/* ========================================================================= */}
      <group position={workstation.deskPos} rotation={[0, deskRotationY, 0]}>
        {/* Ergonomic Chair at Desk */}
        <group position={[0, 0, 0]}>
          {/* Castor Base */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 0.08, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} />
          </mesh>
          {/* Chrome Pneumatic Pole */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Seat Cushion */}
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.55, 0.08, 0.55]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
          {/* Mesh Backrest */}
          <mesh position={[0, 0.78, -0.24]} rotation={[0.05, 0, 0]} castShadow>
            <boxGeometry args={[0.52, 0.65, 0.06]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
        </group>

        {/* Desk & Monitors */}
        <group position={[0, 0, 0.8]}>
          {/* Desk Surface */}
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.06, 0.9]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
          {/* Metal Desk Frame & Legs */}
          <mesh position={[-0.8, 0.35, 0]} castShadow>
            <boxGeometry args={[0.06, 0.7, 0.8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          <mesh position={[0.8, 0.35, 0]} castShadow>
            <boxGeometry args={[0.06, 0.7, 0.8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>

          {/* Keyboard on Desk */}
          <mesh position={[0, 0.74, -0.1]}>
            <boxGeometry args={[0.6, 0.02, 0.22]} />
            <meshStandardMaterial color="#334155" roughness={0.6} />
          </mesh>

          {/* Ergonomic Mouse */}
          <mesh position={[0.42, 0.74, -0.1]}>
            <boxGeometry args={[0.08, 0.025, 0.12]} />
            <meshStandardMaterial color="#475569" />
          </mesh>

          {/* Primary Center Curved Monitor */}
          <group position={[0, 1.05, 0.25]}>
            {/* Monitor Stand */}
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.03, 0.08, 0.28, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} />
            </mesh>
            {/* Monitor Bezel */}
            <mesh castShadow>
              <boxGeometry args={[1.1, 0.6, 0.04]} />
              <meshStandardMaterial color="#0f172a" roughness={0.5} />
            </mesh>
            {/* Emissive Screen (Facing seated agent towards -Z) */}
            <mesh position={[0, 0, -0.025]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[1.05, 0.55]} />
              <meshStandardMaterial
                color="#0284c7"
                emissive="#00e5ff"
                emissiveIntensity={0.9}
              />
            </mesh>
          </group>

          {/* Secondary Angled Monitor */}
          <group position={[0.7, 1.05, 0.2]} rotation={[0, -0.35, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.65, 0.6, 0.04]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, 0, -0.025]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.6, 0.55]} />
              <meshStandardMaterial
                color="#059669"
                emissive="#10b981"
                emissiveIntensity={0.8}
              />
            </mesh>
          </group>

          {/* Coffee Mug with Blue EasyUp Accent */}
          <group position={[-0.6, 0.77, -0.15]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.06, 0.05, 0.12, 12]} />
              <meshStandardMaterial color="#f1f5f9" />
            </mesh>
            <mesh position={[0, 0.01, 0.06]}>
              <boxGeometry args={[0.02, 0.06, 0.04]} />
              <meshStandardMaterial color="#2563eb" />
            </mesh>
          </group>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* B. ARTICULATED CHARACTER AVATAR (Smoothly Interpolates Across Modes)     */}
      {/* ========================================================================= */}
      <group
        ref={groupRef}
        position={workstation.deskPos}
        rotation={[0, agentRotationY, 0]}
        name={`Agent-${agent.id}`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(agent)
        }}
      >
        <group position={[0, 0.42, 0]}>
          {/* Seated Thighs or Standing Legs */}
          <mesh position={[-0.14, 0.06, isAtDesk ? 0.16 : 0.02]} castShadow>
            <boxGeometry args={[0.16, 0.12, isAtDesk ? 0.35 : 0.18]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.14, 0.06, isAtDesk ? 0.16 : 0.02]} castShadow>
            <boxGeometry args={[0.16, 0.12, isAtDesk ? 0.35 : 0.18]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* Lower Legs */}
          <mesh position={[-0.14, -0.16, isAtDesk ? 0.32 : 0.02]} castShadow>
            <boxGeometry args={[0.14, 0.32, 0.14]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.14, -0.16, isAtDesk ? 0.32 : 0.02]} castShadow>
            <boxGeometry args={[0.14, 0.32, 0.14]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* Dark Shoes */}
          <mesh position={[-0.14, -0.34, isAtDesk ? 0.38 : 0.06]} castShadow>
            <boxGeometry args={[0.15, 0.08, 0.22]} />
            <meshStandardMaterial color="#020617" />
          </mesh>
          <mesh position={[0.14, -0.34, isAtDesk ? 0.38 : 0.06]} castShadow>
            <boxGeometry args={[0.15, 0.08, 0.22]} />
            <meshStandardMaterial color="#020617" />
          </mesh>

          {/* Torso with Signature Royal Blue Shirt */}
          <mesh position={[0, 0.34, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[0.48, 0.48, 0.28]} />
            <meshStandardMaterial color="#2563eb" roughness={0.6} />
          </mesh>

          {/* Arms & Hands (Angled Forward on Keyboard) */}
          <mesh position={[-0.28, 0.32, 0.14]} rotation={[0.5, 0.1, -0.1]} castShadow>
            <boxGeometry args={[0.12, 0.35, 0.12]} />
            <meshStandardMaterial color="#1d4ed8" />
          </mesh>
          <mesh position={[0.28, 0.32, 0.14]} rotation={[0.5, -0.1, 0.1]} castShadow>
            <boxGeometry args={[0.12, 0.35, 0.12]} />
            <meshStandardMaterial color="#1d4ed8" />
          </mesh>

          {/* Left & Right Typing Hands */}
          <mesh ref={leftHandRef} position={[-0.16, 0.32, 0.38]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.12]} />
            <meshStandardMaterial color="#fed7aa" />
          </mesh>
          <mesh ref={rightHandRef} position={[0.16, 0.32, 0.38]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.12]} />
            <meshStandardMaterial color="#fed7aa" />
          </mesh>

          {/* Head */}
          <mesh position={[0, 0.72, 0.02]} castShadow>
            <boxGeometry args={[0.34, 0.34, 0.32]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.7} />
          </mesh>

          {/* Dark Hair under Cap */}
          <mesh position={[0, 0.75, -0.06]} castShadow>
            <boxGeometry args={[0.36, 0.26, 0.24]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>

          {/* Signature EasyUp Blue Baseball Cap (Crown) */}
          <mesh position={[0, 0.9, 0.02]} castShadow>
            <cylinderGeometry args={[0.2, 0.22, 0.12, 16]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.5} />
          </mesh>

          {/* Cap Visor / Brim (Extending forward in facing direction) */}
          <mesh position={[0, 0.86, 0.2]} rotation={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[0.3, 0.03, 0.18]} />
            <meshStandardMaterial color="#1e40af" roughness={0.5} />
          </mesh>
        </group>

        {/* Selection Highlight Disc */}
        {isSelected && (
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.9, 1.1, 32]} />
            <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    </group>
  )
}
