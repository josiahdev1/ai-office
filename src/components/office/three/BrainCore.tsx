'use client'

import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ArcReactor,
  ARC_REACTOR_STATE_CONFIG,
  JarvisCoreState,
} from '@/components/jarvis/ArcReactor'

export interface BrainCoreProps {
  state?: JarvisCoreState
  onClickCore?: () => void
}

export function BrainCore({ state = 'idle', onClickCore }: BrainCoreProps) {
  const pedestalRingMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((clockState) => {
    const t = clockState.clock.getElapsedTime()
    if (pedestalRingMatRef.current) {
      const cfg = ARC_REACTOR_STATE_CONFIG[state] || ARC_REACTOR_STATE_CONFIG.idle
      pedestalRingMatRef.current.color.set(hovered ? '#ffffff' : cfg.primaryColor)
      pedestalRingMatRef.current.opacity = hovered
        ? 0.98
        : 0.72 + Math.sin(t * 2.5) * 0.18
    }
  })

  return (
    <group position={[0, 0, 0]} name="CommandCenterTheBrain">
      {/* 1. Central Pedestal & Data Pillar (Clickable to enter Jarvis) */}
      <mesh
        position={[0, 0.35, 0]}
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          onClickCore?.()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          if (typeof document !== 'undefined') document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto'
        }}
      >
        <cylinderGeometry args={[1.5, 1.9, 0.7, 32]} />
        <meshStandardMaterial color="#090d16" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Pedestal Top Glowing Ring */}
      <mesh
        position={[0, 0.71, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onClickCore?.()
        }}
      >
        <ringGeometry args={[1.2, 1.45, 32]} />
        <meshBasicMaterial
          ref={pedestalRingMatRef}
          color="#00e5ff"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2 & 3. Shared Holographic ArcReactor Core (Office Compact Variant) */}
      <group position={[0, 1.9, 0]}>
        <ArcReactor
          state={state}
          size="office"
          scale={0.95}
          hovered={hovered}
          showLabel={true}
          onClick={onClickCore}
          onHoverChange={setHovered}
        />
      </group>

      {/* 4. Curved Ring Consoles / Operator Desks */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => {
        const radius = 3.6
        const x = Math.sin(angle) * radius
        const z = Math.cos(angle) * radius
        return (
          <group key={`console-${i}`} position={[x, 0.45, z]} rotation={[0, angle, 0]}>
            {/* Curved Desk Segment */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[2.8, 0.8, 0.7]} />
              <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
            </mesh>
            {/* Holographic Monitor Strip */}
            <mesh position={[0, 0.55, -0.1]} rotation={[-0.15, 0, 0]}>
              <boxGeometry args={[2.4, 0.35, 0.05]} />
              <meshStandardMaterial
                color="#0284c7"
                emissive="#00e5ff"
                emissiveIntensity={1.4}
              />
            </mesh>
          </group>
        )
      })}

      {/* 5. Glass Half-Wall Surrounding The Brain with Doorway Openings */}
      {/* 4 curved glass segments with gaps for North, South, East, West entryways */}
      {[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map(
        (rot, idx) => (
          <group key={`glass-wall-${idx}`} rotation={[0, rot, 0]}>
            <mesh position={[0, 0.5, 6.2]}>
              <boxGeometry args={[5.5, 0.9, 0.1]} />
              <meshStandardMaterial
                color="#0284c7"
                emissive="#00e5ff"
                emissiveIntensity={0.2}
                transparent
                opacity={0.35}
                roughness={0.1}
              />
            </mesh>
            {/* Glowing top rim */}
            <mesh position={[0, 0.97, 6.2]}>
              <boxGeometry args={[5.5, 0.04, 0.12]} />
              <meshBasicMaterial color="#00e5ff" />
            </mesh>
          </group>
        )
      )}
    </group>
  )
}
