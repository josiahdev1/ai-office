'use client'

import React from 'react'
import * as THREE from 'three'
import { CharacterStyleConfig } from '@/config/characterStyles'
import { DepartmentMode } from '@/config/officeLayout'

export interface VoxelAgentMeshProps {
  style: CharacterStyleConfig
  effectiveMode: DepartmentMode
  agentId: string
  leftLegRef: React.RefObject<THREE.Group | null>
  rightLegRef: React.RefObject<THREE.Group | null>
  leftArmRef: React.RefObject<THREE.Mesh | null>
  rightArmRef: React.RefObject<THREE.Mesh | null>
  leftHandRef: React.RefObject<THREE.Mesh | null>
  rightHandRef: React.RefObject<THREE.Mesh | null>
}

export function VoxelAgentMesh({
  style,
  effectiveMode,
  agentId,
  leftLegRef,
  rightLegRef,
  leftArmRef,
  rightArmRef,
  leftHandRef,
  rightHandRef,
}: VoxelAgentMeshProps) {
  const isPickleball = effectiveMode === 'PICKLEBALL'
  const isGym = effectiveMode === 'GYM'
  const isPantry = effectiveMode === 'PANTRY'

  return (
    <group position={[0, 0.42, 0]}>
      {/* Optional Female Skirt / Lower Tunic */}
      {style.isSkirt && (
        <mesh position={[0, 0.08, 0.06]} castShadow receiveShadow>
          <cylinderGeometry args={[0.23, 0.29, 0.22, 12]} />
          <meshStandardMaterial color={style.bottomColor} roughness={0.7} />
        </mesh>
      )}

      {/* Left Leg Assembly */}
      <group ref={leftLegRef} position={[-0.14, 0.06, 0.08]}>
        <mesh position={[0, -0.14, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.36, 0.18]} />
          <meshStandardMaterial color={style.isSkirt ? style.skinColor : style.bottomColor} />
        </mesh>
        <mesh position={[0, -0.36, 0.12]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.08, 0.22]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
      </group>

      {/* Right Leg Assembly */}
      <group ref={rightLegRef} position={[0.14, 0.06, 0.08]}>
        <mesh position={[0, -0.14, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.36, 0.18]} />
          <meshStandardMaterial color={style.isSkirt ? style.skinColor : style.bottomColor} />
        </mesh>
        <mesh position={[0, -0.36, 0.12]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.08, 0.22]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
      </group>

      {/* Distinct Styled Torso / Outfit + Collar Detail */}
      <mesh position={[0, 0.34, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[style.gender === 'female' ? 0.44 : 0.48, 0.48, 0.27]} />
        <meshStandardMaterial color={style.outfitColor} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.56, 0.09]} castShadow>
        <boxGeometry args={[0.22, 0.05, 0.16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>
      {agentId === 'boss' && (
        <mesh position={[0, 0.4, 0.16]} castShadow>
          <boxGeometry args={[0.07, 0.24, 0.02]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.3} />
        </mesh>
      )}

      {/* Left & Right Arms */}
      <mesh
        ref={leftArmRef}
        position={[-0.27, 0.32, 0.12]}
        rotation={[0.5, 0.1, -0.1]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.12, 0.35, 0.12]} />
        <meshStandardMaterial color={style.sleeveColor} />
      </mesh>
      <mesh
        ref={rightArmRef}
        position={[0.27, 0.32, 0.12]}
        rotation={[0.5, -0.1, 0.1]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.12, 0.35, 0.12]} />
        <meshStandardMaterial color={style.sleeveColor} />
      </mesh>

      {/* Hands + Context Props (Pickleball Paddle, Dumbbell, Coffee Mug) */}
      <mesh ref={leftHandRef} position={[-0.16, 0.32, 0.38]} castShadow>
        <boxGeometry args={[0.1, 0.06, 0.12]} />
        <meshStandardMaterial color={style.skinColor} />
      </mesh>
      <mesh ref={rightHandRef} position={[0.16, 0.32, 0.38]} castShadow>
        <boxGeometry args={[0.1, 0.06, 0.12]} />
        <meshStandardMaterial color={style.skinColor} />
      </mesh>

      {isPickleball && (
        <group position={[0.24, 0.38, 0.48]} rotation={[0.45, 0.15, -0.25]}>
          {/* Paddle Handle */}
          <mesh position={[0, -0.1, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 0.16, 8]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
          {/* Paddle Blade */}
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.22, 0.28, 0.028]} />
            <meshStandardMaterial color="#14b8a6" roughness={0.35} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.1, 0.016]}>
            <boxGeometry args={[0.18, 0.24, 0.008]} />
            <meshStandardMaterial color="#0284c7" roughness={0.4} />
          </mesh>
        </group>
      )}

      {isGym && (
        <group position={[0.2, 0.32, 0.42]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.24, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          <mesh position={[-0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.06, 0.12, 0.12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.06, 0.12, 0.12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      )}

      {isPantry && (
        <mesh position={[0.18, 0.36, 0.4]} castShadow>
          <cylinderGeometry args={[0.045, 0.04, 0.09, 10]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
      )}

      {/* Expressive Voxel Head + Pixel Eyes */}
      <mesh position={[0, 0.72, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.34, 0.32]} />
        <meshStandardMaterial color={style.skinColor} roughness={0.7} />
      </mesh>
      <mesh position={[-0.075, 0.74, 0.185]}>
        <boxGeometry args={[0.045, 0.055, 0.015]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} />
      </mesh>
      <mesh position={[0.075, 0.74, 0.185]}>
        <boxGeometry args={[0.045, 0.055, 0.015]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} />
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
          <mesh position={[0, 0.08, 0.03]}>
            <torusGeometry args={[0.06, 0.02, 8, 12]} />
            <meshBasicMaterial color={style.outfitColor} />
          </mesh>
        </group>
      )}

      {style.hairStyle === 'long' && (
        <group>
          <mesh position={[0, 0.62, -0.14]} castShadow>
            <boxGeometry args={[0.36, 0.38, 0.12]} />
            <meshStandardMaterial color={style.hairColor} />
          </mesh>
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

      {/* Distinct Character Accessories */}
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
  )
}
