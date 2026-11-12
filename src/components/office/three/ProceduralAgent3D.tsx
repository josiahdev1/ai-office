'use client'

import React, { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Agent } from '@/components/office/types'
import {
  AgentWorkstation3D,
  DepartmentMode,
  getAgentTargetPosition,
  BOSS_PATROL_ROUTE,
  CLEANER_1_PATROL_ROUTE,
  CLEANER_2_PATROL_ROUTE,
  SERVER_ADMIN_PATROL_ROUTE,
  COACH_MIGUEL_PATROL_ROUTE,
} from '@/config/officeLayout'
import {
  getCharacterStyle,
  getAgentStatusBadge,
} from '@/config/characterStyles'
import {
  AgentNavState,
  stepAgentNavigation,
} from '@/config/walkwayGrid'

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
  isSelected: boolean,
  statusIcon?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 340
  canvas.height = 72
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 24px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    const displayText = statusIcon ? `${statusIcon} ${name}` : name
    const textMetrics = ctx.measureText(displayText)
    const pillW = Math.min(328, Math.max(124, textMetrics.width + 66))
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
    const dotX = pillX + 22
    const dotY = canvas.height * 0.5
    ctx.beginPath()
    ctx.arc(dotX, dotY, 7, 0, Math.PI * 2)
    ctx.fillStyle = isSelected ? '#0f172a' : dotHex
    ctx.fill()

    // Name Text (Name ONLY + small status icon)
    ctx.fillStyle = isSelected ? '#020617' : '#f8fafc'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(displayText, pillX + 38, dotY + 1)
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

  const statusIcon = useMemo(() => {
    if (effectiveMode === 'NAP_ROOM') return '💤'
    if (effectiveMode === 'CAFETERIA') return '🍽️'
    if (effectiveMode === 'PANTRY') return '☕'
    if (effectiveMode === 'GYM') return '🏋️'
    if (effectiveMode === 'COMFORT_ROOM') return '🚻'
    if (agent.status === 'working' || (agent.current_task && agent.current_task.trim())) return '💻'
    if (agent.id.startsWith('cleaner_')) return '🧹'
    return '🟢'
  }, [effectiveMode, agent.status, agent.current_task, agent.id])

  // Native WebGL Sprite Nameplate Texture (Zero Lag on Pan/Zoom)
  const nameplateTexture = useMemo(() => {
    if (typeof document === 'undefined') return null
    return createNameplateTexture(agent.name, badge.dotHex, isSelected, statusIcon)
  }, [agent.name, badge.dotHex, isSelected, statusIcon])

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

  const roamRoute = useMemo(() => {
    if (agent.id === 'boss') return BOSS_PATROL_ROUTE
    if (agent.id === 'cleaner_1') return CLEANER_1_PATROL_ROUTE
    if (agent.id === 'cleaner_2') return CLEANER_2_PATROL_ROUTE
    if (agent.id === 'server_admin') return SERVER_ADMIN_PATROL_ROUTE
    if (agent.id === 'coach_miguel') return COACH_MIGUEL_PATROL_ROUTE
    return null
  }, [agent.id])

  const roamStateRef = useRef<{ index: number; elapsed: number }>({
    index: 0,
    elapsed: 0,
  })

  const isDeskMode = effectiveMode === 'OVERVIEW' || effectiveMode === 'FOCUS_WORK'

  // Determine initial spawn position on mount from props
  const initialSpawn = useMemo(() => {
    const initMode = mode
    const initOverride = routeOverride
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

    // Autonomous Roaming Patrol Loop for Boss, Cleaners, Server Admin, and Coach Miguel
    if (roamRoute && (effectiveMode === 'OVERVIEW' || effectiveMode === 'FOCUS_WORK')) {
      roamStateRef.current.elapsed += dt
      // Rex spends 25s at PC desk, 12s inspecting racks. Boss spends 18s at each dept. Cleaners spend 15s cleaning each room. Coach Miguel spends 12s per gym station.
      const intervalSec =
        agent.id === 'server_admin'
          ? (roamStateRef.current.index === 0 ? 25 : 12)
          : agent.id === 'boss'
            ? 18
            : agent.id === 'coach_miguel'
              ? 12
              : 15

      if (roamStateRef.current.elapsed >= intervalSec) {
        roamStateRef.current.elapsed = 0
        roamStateRef.current.index = (roamStateRef.current.index + 1) % roamRoute.length
      }
    }

    const currentRoamTarget =
      roamRoute && (effectiveMode === 'OVERVIEW' || effectiveMode === 'FOCUS_WORK')
        ? roamRoute[roamStateRef.current.index]
        : null

    const effectiveTargetPos = currentRoamTarget || targetPos
    // Boss, Cleaners, and Coach Miguel never sit desk-bound in an idle loop! Server admin only sits when at PC desk (roam index 0).
    const effectiveIsDeskMode =
      isDeskMode && (!roamRoute || (agent.id === 'server_admin' && roamStateRef.current.index === 0))

    stepAgentNavigation(
      nav,
      effectiveTargetPos,
      finalStationRotationY,
      effectiveIsDeskMode,
      dt,
      3.6,
      agentIndex,
      onArrive
        ? (finalPos) => onArrive(agent.id, finalPos, effectiveMode)
        : undefined,
      staggerIdx
    )

    const isWalking = nav.subState === 'walking'
    const isSeated = nav.subState === 'seated'
    const isSleeping = !isWalking && effectiveMode === 'NAP_ROOM'
    const isPushups =
      !isWalking &&
      effectiveMode === 'GYM' &&
      agentIndex % 3 === 1 &&
      agent.id !== 'coach_miguel'
    const isTreadmill =
      !isWalking &&
      effectiveMode === 'GYM' &&
      (agentIndex % 3 === 0 || nav.currentPos[2] <= 14.8) &&
      agent.id !== 'coach_miguel'
    const isDumbbells =
      !isWalking &&
      effectiveMode === 'GYM' &&
      agentIndex % 3 === 2 &&
      agent.id !== 'coach_miguel'

    if (groupRef.current) {
      if (isSleeping) {
        groupRef.current.position.set(
          nav.currentPos[0],
          0.42,
          nav.currentPos[2]
        )
        groupRef.current.rotation.x = -Math.PI / 2
        groupRef.current.rotation.y = nav.rotationY
      } else if (isPushups) {
        const pushupBob = Math.abs(Math.sin(t * 3.5)) * 0.12
        groupRef.current.position.set(
          nav.currentPos[0],
          0.22 + pushupBob,
          nav.currentPos[2]
        )
        groupRef.current.rotation.x = -Math.PI / 3
        groupRef.current.rotation.y = nav.rotationY
      } else {
        groupRef.current.position.set(
          nav.currentPos[0],
          nav.currentPos[1],
          nav.currentPos[2]
        )
        groupRef.current.rotation.x = 0
        groupRef.current.rotation.y = nav.rotationY
      }
    }

    // Leg & Arm Walk Cycle vs Seated / Standing Pose
    if (leftLegRef.current && rightLegRef.current) {
      if (isWalking) {
        leftLegRef.current.rotation.x = Math.sin(nav.walkPhase) * 0.55
        rightLegRef.current.rotation.x = -Math.sin(nav.walkPhase) * 0.55
      } else if (isTreadmill) {
        // High-knee running stride on treadmill
        leftLegRef.current.rotation.x = Math.sin(t * 12) * 0.7
        rightLegRef.current.rotation.x = -Math.sin(t * 12) * 0.7
      } else {
        leftLegRef.current.rotation.x = 0
        rightLegRef.current.rotation.x = 0
      }
    }

    if (leftArmRef.current && rightArmRef.current) {
      if (isWalking) {
        leftArmRef.current.rotation.x = -Math.sin(nav.walkPhase) * 0.45
        rightArmRef.current.rotation.x = Math.sin(nav.walkPhase) * 0.45
      } else if (agent.id === 'coach_miguel') {
        // Coach Miguel: pacing trainer, coaching gestures & whistle cues
        leftArmRef.current.rotation.x = 0.5 + Math.sin(t * 2) * 0.15
        rightArmRef.current.rotation.x = 0.85 + Math.cos(t * 2.8) * 0.25
      } else if (isTreadmill) {
        // Running arm swing
        leftArmRef.current.rotation.x = -Math.sin(t * 12) * 0.6
        rightArmRef.current.rotation.x = Math.sin(t * 12) * 0.6
      } else if (isPushups) {
        // Prone push-up arm press
        leftArmRef.current.rotation.x = 1.05 + Math.sin(t * 3.5) * 0.25
        rightArmRef.current.rotation.x = 1.05 + Math.sin(t * 3.5) * 0.25
      } else if (isDumbbells) {
        // Dumbbell bicep curls
        leftArmRef.current.rotation.x = 0.75 + Math.sin(t * 3.8) * 0.45
        rightArmRef.current.rotation.x = 0.75 + Math.cos(t * 3.8) * 0.45
      } else if (agent.id === 'cleaner_1' || agent.id === 'cleaner_2') {
        // Continuous cleaning & sanitizing arm animation
        leftArmRef.current.rotation.x = 0.55 + Math.sin(t * 5) * 0.2
        rightArmRef.current.rotation.x = 0.55 + Math.cos(t * 5) * 0.2
      } else if (agent.id === 'boss') {
        // Boss patrol: holding clipboard with left arm, gesturing with right
        leftArmRef.current.rotation.x = 0.7
        rightArmRef.current.rotation.x = 0.2 + Math.sin(t * 2) * 0.15
      } else if (agent.id === 'server_admin' && roamStateRef.current.index > 0) {
        // Server rack inspection animation: reaching to check telemetry and patch cables
        leftArmRef.current.rotation.x = 0.85 + Math.sin(t * 4) * 0.15
        rightArmRef.current.rotation.x = 0.5 + Math.cos(t * 4) * 0.12
      } else if (agent.id === 'chef_maria') {
        // Chef Maria: active buffet food prep and serving stirring gestures
        leftArmRef.current.rotation.x = 0.6 + Math.sin(t * 3) * 0.15
        rightArmRef.current.rotation.x = 0.8 + Math.cos(t * 4) * 0.2
      } else if (agent.id === 'barista_ken') {
        // Barista Ken: espresso machine lever pull & milk steaming gestures
        leftArmRef.current.rotation.x = 0.7 + Math.sin(t * 3.5) * 0.15
        rightArmRef.current.rotation.x = 0.65 + Math.cos(t * 3.5) * 0.15
      } else if (effectiveMode === 'CAFETERIA' && !isWalking) {
        // Dining at Cafeteria Table: holding fork/spoon to eat
        leftArmRef.current.rotation.x = 0.5
        rightArmRef.current.rotation.x = 0.65 + Math.sin(t * 3) * 0.2
      } else if (effectiveMode === 'PANTRY' && !isWalking) {
        // Drinking coffee at Pantry: lifting cup to mouth
        leftArmRef.current.rotation.x = 0.2
        rightArmRef.current.rotation.x = 0.75 + Math.sin(t * 1.5) * 0.15
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

  const hasDedicatedFurniture =
    agent.id === 'boss' ||
    agent.id === 'cleaner_1' ||
    agent.id === 'cleaner_2' ||
    agent.id === 'server_admin' ||
    agent.id === 'chef_maria' ||
    agent.id === 'barista_ken' ||
    agent.id === 'coach_miguel'

  return (
    <group>
      {/* ========================================================================= */}
      {/* A. PERMANENT WORKSTATION DESK, CHAIR & MULTI-MONITORS AT HOME ROOM        */}
      {/* ========================================================================= */}
      {!hasDedicatedFurniture && (
        <group position={workstation.deskPos} rotation={[0, deskRotationY, 0]}>
        {/* Ergonomic Chair */}
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 0.08, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
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
    )}

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
            <mesh position={[0, 0.91, 0.02]} rotation={[0.15, 0.4, 0]} castShadow>
              <boxGeometry args={[0.28, 0.12, 0.28]} />
              <meshStandardMaterial color={style.hairColor} />
            </mesh>
          )}

          {/* Distinct Character Accessories (Cap, Beanie, Headphones, Glasses) */}
          {style.accessory === 'cap' && (
            <group>
              <mesh position={[0, 0.9, 0.02]} castShadow>
                <cylinderGeometry args={[0.2, 0.22, 0.12, 16]} />
                <meshStandardMaterial color={style.accessoryColor} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.86, 0.2]} rotation={[0.1, 0, 0]} castShadow>
                <boxGeometry args={[0.3, 0.03, 0.18]} />
                <meshStandardMaterial color={style.accessoryColor} roughness={0.5} />
              </mesh>
            </group>
          )}

          {style.accessory === 'beanie' && (
            <mesh position={[0, 0.9, 0.01]} castShadow>
              <sphereGeometry args={[0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
              <meshStandardMaterial color={style.accessoryColor} roughness={0.85} />
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
                <meshStandardMaterial color={style.accessoryColor} metalness={0.8} />
              </mesh>
              <mesh position={[0.08, 0, 0]}>
                <boxGeometry args={[0.1, 0.06, 0.02]} />
                <meshStandardMaterial color={style.accessoryColor} metalness={0.8} />
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

        {/* Floating Z Particles during Nap/Sleep */}
        {effectiveMode === 'NAP_ROOM' && (
          <group position={[0, 1.3, 0]}>
            <mesh position={[0.15, 0.4, 0]}>
              <boxGeometry args={[0.08, 0.08, 0.02]} />
              <meshBasicMaterial color="#c084fc" />
            </mesh>
            <mesh position={[0.28, 0.65, 0]}>
              <boxGeometry args={[0.12, 0.12, 0.02]} />
              <meshBasicMaterial color="#a855f7" />
            </mesh>
          </group>
        )}

        {/* Cafeteria Meal Tray Prop */}
        {effectiveMode === 'CAFETERIA' && (
          <group position={[0, 0.46, 0.38]}>
            <mesh castShadow>
              <boxGeometry args={[0.34, 0.02, 0.24]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[-0.07, 0.02, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.02, 8]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
            <mesh position={[0.07, 0.02, 0]}>
              <boxGeometry args={[0.08, 0.03, 0.06]} />
              <meshStandardMaterial color="#eab308" />
            </mesh>
            <mesh position={[0.1, 0.03, -0.05]}>
              <cylinderGeometry args={[0.022, 0.02, 0.05, 8]} />
              <meshStandardMaterial color="#06b6d4" />
            </mesh>
          </group>
        )}

        {/* Coffee / Drink Cup in Hand */}
        {(effectiveMode === 'PANTRY' || agent.status === 'on_break') && (
          <group position={[0.24, 0.38, 0.32]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.03, 0.024, 0.07, 8]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
            <mesh position={[0, 0.025, 0]}>
              <cylinderGeometry args={[0.028, 0.028, 0.01, 8]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
          </group>
        )}

        {/* Cleaner Yellow Sanitation Prop */}
        {agent.id.startsWith('cleaner_') && (
          <group position={[0.36, 0.22, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.22, 0.32, 0.2]} />
              <meshStandardMaterial color="#eab308" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.28, -0.06]} rotation={[0.25, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>
          </group>
        )}

        {/* Gym Dumbbell Props */}
        {effectiveMode === 'GYM' && agentIndex % 3 === 2 && agent.id !== 'coach_miguel' && (
          <group position={[0, 0.36, 0.24]}>
            <mesh position={[-0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} />
            </mesh>
            <mesh position={[-0.24, 0, -0.09]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, 0.04, 10]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[-0.24, 0, 0.09]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, 0.04, 10]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} />
            </mesh>
            <mesh position={[0.24, 0, -0.09]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, 0.04, 10]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.24, 0, 0.09]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, 0.04, 10]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          </group>
        )}

        {/* Coach Whistle & Lanyard Prop */}
        {agent.id === 'coach_miguel' && (
          <group position={[0, 0.44, 0.16]}>
            <mesh castShadow>
              <boxGeometry args={[0.04, 0.03, 0.06]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  )
}
