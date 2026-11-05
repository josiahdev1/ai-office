'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function BrainCore() {
  const coreRef = useRef<THREE.Mesh>(null)
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const ring3Ref = useRef<THREE.Mesh>(null)
  const pulseLightRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()

    // Smooth pulsation
    const pulse = 1 + Math.sin(t * 2.5) * 0.12
    if (coreRef.current) {
      coreRef.current.scale.set(pulse, pulse, pulse)
      coreRef.current.rotation.y = t * 0.4
    }

    // Dynamic point light pulse
    if (pulseLightRef.current) {
      pulseLightRef.current.intensity = 2.5 + Math.sin(t * 3.0) * 1.0
    }

    // Multi-axis orbital gyroscopic ring rotations
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.6
      ring1Ref.current.rotation.y = t * 0.8
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.7
      ring2Ref.current.rotation.z = t * 0.5
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = -t * 0.4
      ring3Ref.current.rotation.z = -t * 0.6
    }
  })

  return (
    <group position={[0, 0, 0]} name="CommandCenterTheBrain">
      {/* 1. Central Pedestal & Data Pillar */}
      <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.5, 1.9, 0.7, 32]} />
        <meshStandardMaterial color="#090d16" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Pedestal Top Glowing Ring */}
      <mesh position={[0, 0.71, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.45, 32]} />
        <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Holographic Core (Glowing Cyan Sphere) */}
      <mesh ref={coreRef} position={[0, 1.8, 0]}>
        <icosahedronGeometry args={[0.85, 2]} />
        <meshStandardMaterial
          color="#00e5ff"
          emissive="#00e5ff"
          emissiveIntensity={2.0}
          wireframe={true}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Solid Inner Core */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#00e5ff"
          emissiveIntensity={2.5}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Point light casting cyan illumination on surrounding room */}
      <pointLight
        ref={pulseLightRef}
        position={[0, 2.0, 0]}
        color="#00e5ff"
        intensity={3.0}
        distance={12}
        decay={2}
      />

      {/* 3. Concentric Orbital Rings */}
      <mesh ref={ring1Ref} position={[0, 1.8, 0]}>
        <torusGeometry args={[1.35, 0.03, 16, 64]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
      <mesh ref={ring2Ref} position={[0, 1.8, 0]}>
        <torusGeometry args={[1.7, 0.025, 16, 64]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <mesh ref={ring3Ref} position={[0, 1.8, 0]}>
        <torusGeometry args={[2.05, 0.02, 16, 64]} />
        <meshBasicMaterial color="#67e8f9" />
      </mesh>

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
