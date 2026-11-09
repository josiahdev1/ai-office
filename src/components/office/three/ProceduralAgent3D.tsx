'use client'

import React, { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Agent } from '@/components/office/types'
import {
  AgentWorkstation3D,
  DepartmentMode,
  getAgentTargetPosition,
} from '@/config/officeLayout'
import {
  getCharacterStyle,
  getAgentStatusBadge,
} from '@/config/characterStyles'
import { AgentNavState, stepAgentNavigation } from '@/config/walkwayGrid'

export interface ProceduralAgent3DProps {
  agent: Agent
  agentIndex?: number
  workstation: AgentWorkstation3D
  mode: DepartmentMode
  routeOverride?: DepartmentMode
  isSelected: boolean
  onSelect: (agent: Agent) => void
  onArrive?: (
    agentId: string,
    finalPos: [number, number, number],
    effectiveMode: DepartmentMode
  ) => void
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

/**
 * Generates a crisp high-DPI CanvasTexture for the native 3D <sprite> nameplate.
 * Guarantees 0ms lag during fast camera pan/zoom because it is rendered inside WebGL.
 */
function createNameplateTexture(
  name: string,
  dotHex: string,
  isSelected: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 72
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font =
      'bold 26px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    const textMetrics = ctx.measureText(name)
    const pillW = Math.min(308, Math.max(120, textMetrics.width + 66))
    const pillH = 50
    const pillX = (canvas.width - pillW) * 0.5
    const pillY = (canvas.height - pillH) * 0.5

    // Pill background
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, 25)
    ctx.fillStyle = isSelected ? '#06b6d4' : 'rgba(15, 23, 42, 0.92)'
    ctx.fill()
    ctx.lineWidth = isSelected ? 4 : 2.5
    ctx.strokeStyle = isSelected ? '#a5f3fc' : 'rgba(71, 85, 105, 0.9)'
    ctx.stroke()

    // Status Dot
    const dotX = pillX + 24
    const dotY = canvas.height * 0.5
    ctx.beginPath()
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2)
    ctx.fillStyle = isSelected ? '#0f172a' : dotHex
    ctx.fill()

    // Name Text (Name ONLY)
    ctx.fillStyle = isSelected ? '#020617' : '#f8fafc'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(name, pillX + 42, dotY + 1)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function ProceduralAgent3D({
  agent,
  agentIndex = 0,
  workstation,
  mode,
  routeOverride,
  isSelected,
  onSelect,
  onArrive,
}: ProceduralAgent3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const leftHandRef = useRef<THREE.Mesh>(null)
  const rightHandRef = useRef<THREE.Mesh>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Mesh>(null)

  const effectiveMode = routeOverride || mode
  const style = useMemo(
    () => getCharacterStyle(agent.id, agent.name),
    [agent.id, agent.name]
  )
  const badge = useMemo(
    () => getAgentStatusBadge(agent.status, effectiveMode),
    [agent.status, effectiveMode]
  )

  // Native WebGL Sprite Nameplate Texture (Zero Lag on Pan/Zoom)
  const nameplateTexture = useMemo(() => {
    if (typeof document === 'undefined') return null
    return createNameplateTexture(agent.name, badge.dotHex, isSelected)
  }, [agent.name, badge.dotHex, isSelected])

  // Target world position based on effective mode
  const targetPos = useMemo<[number, number, number]>(
    () => getAgentTargetPosition(workstation, mode, routeOverride),
    [workstation, mode, routeOverride]
  )

  const deskRotationY = useMemo(
    () => getFacingAngle(workstation.facing),
    [workstation.facing]
  )

  const finalStationRotationY = useMemo(() => {
    if (effectiveMode === 'ALL_HANDS') {
      return Math.atan2(0 - targetPos[0], 0 - targetPos[2])
    }
    if (effectiveMode === 'PANTRY') {
      return Math.atan2(-16 - targetPos[0], 16 - targetPos[2])
    }
    if (effectiveMode === 'GYM') {
      return Math.atan2(0 - targetPos[0], 16 - targetPos[2])
    }
    return deskRotationY
  }, [effectiveMode, targetPos, deskRotationY])

  const isDeskMode =
    effectiveMode === 'OVERVIEW' || effectiveMode === 'FOCUS_WORK'

  // Determine initial spawn position on mount (accounting for persisted localStorage state on F5 reload)
  const initialSpawn = useMemo(() => {
    let initMode = mode
    let initOverride = routeOverride
    if (typeof window !== 'undefined') {
      try {
        const savedMode = window.localStorage.getItem(
          'easyup_hq_mode_v3'
        ) as DepartmentMode | null
        if (savedMode) initMode = savedMode
        const savedOverrides = window.localStorage.getItem(
          'easyup_hq_overrides_v3'
        )
        if (savedOverrides && !initOverride) {
          const parsed = JSON.parse(savedOverrides) as Record<
            string,
            DepartmentMode
          >
          if (parsed[agent.id]) initOverride = parsed[agent.id]
        }
      } catch {}
    }
    const eff = initOverride || initMode
    const pos = getAgentTargetPosition(workstation, initMode, initOverride)
    let rot = deskRotationY
    if (eff === 'ALL_HANDS') rot = Math.atan2(0 - pos[0], 0 - pos[2])
    else if (eff === 'PANTRY') rot = Math.atan2(-16 - pos[0], 16 - pos[2])
    else if (eff === 'GYM') rot = Math.atan2(0 - pos[0], 16 - pos[2])
    const atDesk = eff === 'OVERVIEW' || eff === 'FOCUS_WORK'
    return { pos, rot, atDesk }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persistent 3-phase A* navigation state with pathQueue.
  // Spawns at hydrated initialSpawn.pos on initial mount so F5 reload keeps agents at their persisted station!
  const navRef = useRef<AgentNavState>({
    currentPos: [initialSpawn.pos[0], initialSpawn.pos[1], initialSpawn.pos[2]],
    targetPos: [initialSpawn.pos[0], initialSpawn.pos[1], initialSpawn.pos[2]],
    waypoints: [],
    pathQueue: [],
    waypointIndex: 0,
    isWalking: false,
    facingAngle: initialSpawn.rot,
    rotationY: initialSpawn.rot,
    subState: initialSpawn.atDesk ? 'seated' : 'standing',
    walkPhase: 0,
    walkCycle: 0,
    staggerRemainingSec: 0,
    standingUpRemainingSec: 0,
    sittingDownRemainingSec: 0,
    hasNotifiedArrival: true,
  })

  const lastGlobalModeRef = useRef<DepartmentMode>(mode)

  // Set initial transform once on mount without passing static position props to <group>
  useLayoutEffect(() => {
    if (groupRef.current) {
      const nav = navRef.current
      groupRef.current.position.set(
        nav.currentPos[0],
        nav.currentPos[1],
        nav.currentPos[2]
      )
      groupRef.current.rotation.y = nav.rotationY
    }
  }, [])

  useFrame((state, delta) => {
    const dt = Math.min(0.1, delta)
    const t = state.clock.getElapsedTime()
    const nav = navRef.current

    // If global mode changed, stagger by agentIndex * 80ms; if individual agent override changed, start immediately (0ms stagger)
    const isGroupModeSwitch = lastGlobalModeRef.current !== mode
    if (isGroupModeSwitch) {
      lastGlobalModeRef.current = mode
    }
    const staggerIdx = isGroupModeSwitch ? agentIndex : 0

    stepAgentNavigation(
      nav,
      targetPos,
      finalStationRotationY,
      isDeskMode,
      dt,
      3.6,
      agentIndex,
      onArrive
        ? (finalPos) => onArrive(agent.id, finalPos, effectiveMode)
        : undefined,
      staggerIdx
    )

    if (groupRef.current) {
      groupRef.current.position.set(
        nav.currentPos[0],
        nav.currentPos[1],
        nav.currentPos[2]
      )
      groupRef.current.rotation.y = nav.rotationY
    }

    const isWalking = nav.subState === 'walking'
    const isSeated = nav.subState === 'seated'

    // Leg & Arm Walk Cycle vs Seated Pose
    if (leftLegRef.current && rightLegRef.current) {
      if (isWalking) {
        leftLegRef.current.rotation.x = Math.sin(nav.walkPhase) * 0.55
        rightLegRef.current.rotation.x = -Math.sin(nav.walkPhase) * 0.55
      } else {
        leftLegRef.current.rotation.x = 0
        rightLegRef.current.rotation.x = 0
      }
    }

    if (leftArmRef.current && rightArmRef.current) {
      if (isWalking) {
        leftArmRef.current.rotation.x = -Math.sin(nav.walkPhase) * 0.45
        rightArmRef.current.rotation.x = Math.sin(nav.walkPhase) * 0.45
      } else {
        leftArmRef.current.rotation.x = isSeated ? 0.5 : 0.15
        rightArmRef.current.rotation.x = isSeated ? 0.5 : 0.15
      }
    }

    // Typing Hand Animation when seated at desk
    const isTyping =
      isSeated &&
      (agent.status === 'working' || agent.status === 'active' || !agent.status)
    if (leftHandRef.current && rightHandRef.current) {
      if (isTyping) {
        leftHandRef.current.position.y = 0.32 + Math.sin(t * 13) * 0.022
        rightHandRef.current.position.y = 0.32 + Math.cos(t * 13) * 0.022
        leftHandRef.current.position.z = 0.38
        rightHandRef.current.position.z = 0.38
      } else {
        leftHandRef.current.position.y = 0.22
        rightHandRef.current.position.y = 0.22
        leftHandRef.current.position.z = 0.18
        rightHandRef.current.position.z = 0.18
      }
    }
  })

  return (
    <group>
      {/* ========================================================================= */}
      {/* A. PERMANENT WORKSTATION DESK, CHAIR & MULTI-MONITORS AT HOME ROOM        */}
      {/* ========================================================================= */}
      <group position={workstation.deskPos} rotation={[0, deskRotationY, 0]}>
        {/* Ergonomic Chair */}
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 0.08, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
            <meshStandardMaterial
              color="#cbd5e1"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.55, 0.08, 0.55]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.78, -0.24]} rotation={[0.05, 0, 0]} castShadow>
            <boxGeometry args={[0.52, 0.65, 0.06]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
        </group>

        {/* Desk & Dual Glowing Monitors */}
        <group position={[0, 0, 0.8]}>
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.06, 0.9]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
          <mesh position={[-0.8, 0.35, 0]} castShadow>
            <boxGeometry args={[0.06, 0.7, 0.8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          <mesh position={[0.8, 0.35, 0]} castShadow>
            <boxGeometry args={[0.06, 0.7, 0.8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.74, -0.1]}>
            <boxGeometry args={[0.6, 0.02, 0.22]} />
            <meshStandardMaterial color="#334155" roughness={0.6} />
          </mesh>
          <mesh position={[0.42, 0.74, -0.1]}>
            <boxGeometry args={[0.08, 0.025, 0.12]} />
            <meshStandardMaterial color="#475569" />
          </mesh>

          {/* Primary Center Monitor */}
          <group position={[0, 1.05, 0.25]}>
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.03, 0.08, 0.28, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[1.1, 0.6, 0.04]} />
              <meshStandardMaterial color="#0f172a" roughness={0.5} />
            </mesh>
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

          {/* Coffee Mug */}
          <group position={[-0.6, 0.77, -0.15]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.06, 0.05, 0.12, 12]} />
              <meshStandardMaterial color="#f1f5f9" />
            </mesh>
            <mesh position={[0, 0.01, 0.06]}>
              <boxGeometry args={[0.02, 0.06, 0.04]} />
              <meshStandardMaterial color={style.outfitColor} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* B. DISTINCT ARTICULATED CHARACTER + NATIVE WEBGL SPRITE NAMEPLATE         */}
      {/* ========================================================================= */}
      <group
        ref={groupRef}
        name={`Agent-${agent.id}`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(agent)
        }}
      >
        {/* Native WebGL Sprite Nameplate — Zero Pan/Zoom Lag */}
        {nameplateTexture && (
          <sprite position={[0, 2.05, 0]} scale={[4.2, 0.95, 1]}>
            <spriteMaterial
              map={nameplateTexture}
              transparent
              depthTest={false}
              depthWrite={false}
            />
          </sprite>
        )}

        <group position={[0, 0.42, 0]}>
          {/* Optional Female Skirt / Lower Tunic */}
          {style.isSkirt && (
            <mesh position={[0, 0.08, 0.06]} castShadow>
              <cylinderGeometry args={[0.23, 0.29, 0.22, 12]} />
              <meshStandardMaterial color={style.bottomColor} roughness={0.7} />
            </mesh>
          )}

          {/* Left Leg Assembly (Animated during A* Walking) */}
          <group ref={leftLegRef} position={[-0.14, 0.06, 0.08]}>
            <mesh position={[0, -0.14, 0.06]} castShadow>
              <boxGeometry args={[0.15, 0.36, 0.18]} />
              <meshStandardMaterial
                color={style.isSkirt ? style.skinColor : style.bottomColor}
              />
            </mesh>
            <mesh position={[0, -0.36, 0.12]} castShadow>
              <boxGeometry args={[0.15, 0.08, 0.22]} />
              <meshStandardMaterial color="#090d16" />
            </mesh>
          </group>

          {/* Right Leg Assembly (Animated during A* Walking) */}
          <group ref={rightLegRef} position={[0.14, 0.06, 0.08]}>
            <mesh position={[0, -0.14, 0.06]} castShadow>
              <boxGeometry args={[0.15, 0.36, 0.18]} />
              <meshStandardMaterial
                color={style.isSkirt ? style.skinColor : style.bottomColor}
              />
            </mesh>
            <mesh position={[0, -0.36, 0.12]} castShadow>
              <boxGeometry args={[0.15, 0.08, 0.22]} />
              <meshStandardMaterial color="#090d16" />
            </mesh>
          </group>

          {/* Distinct Styled Torso / Outfit */}
          <mesh position={[0, 0.34, 0.02]} castShadow receiveShadow>
            <boxGeometry
              args={[style.gender === 'female' ? 0.44 : 0.48, 0.48, 0.27]}
            />
            <meshStandardMaterial color={style.outfitColor} roughness={0.6} />
          </mesh>

          {/* Left & Right Arms */}
          <mesh
            ref={leftArmRef}
            position={[-0.27, 0.32, 0.12]}
            rotation={[0.5, 0.1, -0.1]}
            castShadow
          >
            <boxGeometry args={[0.12, 0.35, 0.12]} />
            <meshStandardMaterial color={style.sleeveColor} />
          </mesh>
          <mesh
            ref={rightArmRef}
            position={[0.27, 0.32, 0.12]}
            rotation={[0.5, -0.1, 0.1]}
            castShadow
          >
            <boxGeometry args={[0.12, 0.35, 0.12]} />
            <meshStandardMaterial color={style.sleeveColor} />
          </mesh>

          {/* Typing Hands */}
          <mesh ref={leftHandRef} position={[-0.16, 0.32, 0.38]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.12]} />
            <meshStandardMaterial color={style.skinColor} />
          </mesh>
          <mesh ref={rightHandRef} position={[0.16, 0.32, 0.38]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.12]} />
            <meshStandardMaterial color={style.skinColor} />
          </mesh>

          {/* Head */}
          <mesh position={[0, 0.72, 0.02]} castShadow>
            <boxGeometry args={[0.34, 0.34, 0.32]} />
            <meshStandardMaterial color={style.skinColor} roughness={0.7} />
          </mesh>

          {/* Base Hair Crown */}
          <mesh position={[0, 0.78, -0.04]} castShadow>
            <boxGeometry args={[0.36, 0.26, 0.28]} />
            <meshStandardMaterial color={style.hairColor} />
          </mesh>

          {/* Distinct Feminine / Masculine Hair Silhouettes */}
          {style.hairStyle === 'ponytail' && (
            <group position={[0, 0.76, -0.22]}>
              <mesh rotation={[-0.35, 0, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.1, 0.28, 10]} />
                <meshStandardMaterial color={style.hairColor} />
              </mesh>
              {/* Hair Tie */}
              <mesh position={[0, 0.08, 0.03]}>
                <torusGeometry args={[0.06, 0.02, 8, 12]} />
                <meshBasicMaterial color={style.outfitColor} />
              </mesh>
            </group>
          )}

          {style.hairStyle === 'long' && (
            <group>
              {/* Flowing Back Hair */}
              <mesh position={[0, 0.62, -0.14]} castShadow>
                <boxGeometry args={[0.36, 0.38, 0.12]} />
                <meshStandardMaterial color={style.hairColor} />
              </mesh>
              {/* Side Locks */}
              <mesh position={[-0.17, 0.66, 0.02]} castShadow>
                <boxGeometry args={[0.06, 0.28, 0.24]} />
                <meshStandardMaterial color={style.hairColor} />
              </mesh>
              <mesh position={[0.17, 0.66, 0.02]} castShadow>
                <boxGeometry args={[0.06, 0.28, 0.24]} />
                <meshStandardMaterial color={style.hairColor} />
              </mesh>
            </group>
          )}

          {style.hairStyle === 'bob' && (
            <group>
              <mesh position={[-0.18, 0.72, 0.02]} castShadow>
                <boxGeometry args={[0.06, 0.26, 0.28]} />
                <meshStandardMaterial color={style.hairColor} />
              </mesh>
              <mesh position={[0.18, 0.72, 0.02]} castShadow>
                <boxGeometry args={[0.06, 0.26, 0.28]} />
                <meshStandardMaterial color={style.hairColor} />
              </mesh>
            </group>
          )}

          {style.hairStyle === 'spiky' && (
            <mesh
              position={[0, 0.91, 0.02]}
              rotation={[0.15, 0.4, 0]}
              castShadow
            >
              <boxGeometry args={[0.28, 0.12, 0.28]} />
              <meshStandardMaterial color={style.hairColor} />
            </mesh>
          )}

          {/* Distinct Character Accessories (Cap, Beanie, Headphones, Glasses) */}
          {style.accessory === 'cap' && (
            <group>
              <mesh position={[0, 0.9, 0.02]} castShadow>
                <cylinderGeometry args={[0.2, 0.22, 0.12, 16]} />
                <meshStandardMaterial
                  color={style.accessoryColor}
                  roughness={0.5}
                />
              </mesh>
              <mesh position={[0, 0.86, 0.2]} rotation={[0.1, 0, 0]} castShadow>
                <boxGeometry args={[0.3, 0.03, 0.18]} />
                <meshStandardMaterial
                  color={style.accessoryColor}
                  roughness={0.5}
                />
              </mesh>
            </group>
          )}

          {style.accessory === 'beanie' && (
            <mesh position={[0, 0.9, 0.01]} castShadow>
              <sphereGeometry
                args={[0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65]}
              />
              <meshStandardMaterial
                color={style.accessoryColor}
                roughness={0.85}
              />
            </mesh>
          )}

          {style.accessory === 'headphones' && (
            <group position={[0, 0.74, 0.02]}>
              {/* Left & Right Earcups */}
              <mesh position={[-0.2, 0, 0]}>
                <boxGeometry args={[0.06, 0.16, 0.14]} />
                <meshStandardMaterial
                  color={style.accessoryColor}
                  emissive={style.accessoryColor}
                  emissiveIntensity={0.4}
                />
              </mesh>
              <mesh position={[0.2, 0, 0]}>
                <boxGeometry args={[0.06, 0.16, 0.14]} />
                <meshStandardMaterial
                  color={style.accessoryColor}
                  emissive={style.accessoryColor}
                  emissiveIntensity={0.4}
                />
              </mesh>
              {/* Headband */}
              <mesh position={[0, 0.19, 0]}>
                <boxGeometry args={[0.42, 0.04, 0.06]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
            </group>
          )}

          {style.accessory === 'glasses' && (
            <group position={[0, 0.74, 0.19]}>
              <mesh position={[-0.08, 0, 0]}>
                <boxGeometry args={[0.1, 0.06, 0.02]} />
                <meshStandardMaterial
                  color={style.accessoryColor}
                  metalness={0.8}
                />
              </mesh>
              <mesh position={[0.08, 0, 0]}>
                <boxGeometry args={[0.1, 0.06, 0.02]} />
                <meshStandardMaterial
                  color={style.accessoryColor}
                  metalness={0.8}
                />
              </mesh>
            </group>
          )}
        </group>

        {/* Selection Highlight Ring */}
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
