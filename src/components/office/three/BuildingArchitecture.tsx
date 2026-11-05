'use client'

import React from 'react'
import * as THREE from 'three'
import { ROOMS_3D } from './office3DData'

export function BuildingArchitecture() {
  return (
    <group name="BuildingArchitecture">
      {/* 1. Main Foundation Slab */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <boxGeometry args={[56, 1.2, 56]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* Exterior Lawn & Paving Apron */}
      <mesh position={[0, -0.7, 0]} receiveShadow>
        <boxGeometry args={[70, 0.8, 70]} />
        <meshStandardMaterial color="#14532d" roughness={0.95} />
      </mesh>

      {/* 2. Checkered Corridors (Connecting 3x3 Rooms) */}
      <group name="Corridors">
        {/* Horizontal corridor strip 1 (between Z: -16 and 0) */}
        <mesh position={[0, 0.02, -8]} receiveShadow>
          <boxGeometry args={[46, 0.02, 2.4]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        {/* Horizontal corridor strip 2 (between Z: 0 and 16) */}
        <mesh position={[0, 0.02, 8]} receiveShadow>
          <boxGeometry args={[46, 0.02, 2.4]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        {/* Vertical corridor strip 1 (between X: -16 and 0) */}
        <mesh position={[-8, 0.02, 0]} receiveShadow>
          <boxGeometry args={[2.4, 0.02, 46]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
        </mesh>
        {/* Vertical corridor strip 2 (between X: 0 and 16) */}
        <mesh position={[8, 0.02, 0]} receiveShadow>
          <boxGeometry args={[2.4, 0.02, 46]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
        </mesh>
      </group>

      {/* 3. 9 Room Floor Slabs */}
      {Object.values(ROOMS_3D).map((room) => {
        const isBrain = room.id === 'COMMAND'
        return (
          <group key={room.id} position={room.center}>
            {isBrain ? (
              // Central "The Brain" circular floor platform
              <group position={[0, 0.04, 0]}>
                <mesh receiveShadow>
                  <cylinderGeometry args={[6.8, 6.8, 0.08, 48]} />
                  <meshStandardMaterial color="#090d16" roughness={0.4} metalness={0.8} />
                </mesh>
                {/* Glowing cyan concentric perimeter ring */}
                <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[6.7, 6.9, 48]} />
                  <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[4.2, 4.3, 48]} />
                  <meshBasicMaterial color="#00e5ff" transparent opacity={0.4} side={THREE.DoubleSide} />
                </mesh>
              </group>
            ) : (
              // Standard Department Room Floor with Border Trim
              <group position={[0, 0.03, 0]}>
                <mesh receiveShadow>
                  <boxGeometry args={[room.size[0], 0.06, room.size[1]]} />
                  <meshStandardMaterial color={room.floorColor} roughness={0.7} />
                </mesh>
                {/* Thin Department Glow Border */}
                <mesh position={[0, 0.05, 0]}>
                  <boxGeometry args={[room.size[0] + 0.1, 0.02, room.size[1] + 0.1]} />
                  <meshStandardMaterial color={room.accentColor} roughness={0.5} transparent opacity={0.25} />
                </mesh>
              </group>
            )}
          </group>
        )
      })}

      {/* 4. Exterior Full Back Walls (North & West - never block camera) */}
      <group name="BackWalls">
        {/* North Wall (Back) */}
        <mesh position={[0, 1.4, -23.2]} castShadow receiveShadow>
          <boxGeometry args={[46.8, 2.8, 0.4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* North Wall Large Windows */}
        {[-16, 0, 16].map((x) => (
          <mesh key={`n-win-${x}`} position={[x, 1.6, -23.15]}>
            <planeGeometry args={[8, 1.6]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.2}
              transparent
              opacity={0.4}
              roughness={0.1}
            />
          </mesh>
        ))}

        {/* West Wall (Left) */}
        <mesh position={[-23.2, 1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 46.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* West Wall Windows */}
        {[-16, 0, 16].map((z) => (
          <mesh key={`w-win-${z}`} position={[-23.15, 1.6, z]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[8, 1.6]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.2}
              transparent
              opacity={0.4}
              roughness={0.1}
            />
          </mesh>
        ))}

        {/* EasyUp Software Solution HQ Exterior Banner */}
        <mesh position={[0, 2.2, -22.95]}>
          <planeGeometry args={[18, 0.9]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
      </group>

      {/* 5. Exterior Camera-Facing Cutaway Walls (South & East) */}
      {/* Lowered to 0.7m half-walls so isometric camera has 100% unobstructed view! */}
      <group name="CutawayFrontWalls">
        {/* South Wall (Front Cutaway) */}
        <mesh position={[0, 0.35, 23.2]} castShadow receiveShadow>
          <boxGeometry args={[46.8, 0.7, 0.4]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        {/* Glass railing on top of South half-wall */}
        <mesh position={[0, 0.85, 23.2]}>
          <boxGeometry args={[46.8, 0.3, 0.1]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.4}
            roughness={0.1}
          />
        </mesh>

        {/* East Wall (Right Cutaway) */}
        <mesh position={[23.2, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.7, 46.8]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        {/* Glass railing on top of East half-wall */}
        <mesh position={[23.2, 0.85, 0]}>
          <boxGeometry args={[0.1, 0.3, 46.8]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.4}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* 6. Low Interior Partition Half-Walls with Doorway Openings */}
      <group name="InteriorPartitions">
        {/* Partition between Engineering and Executive (X: -16, Z: -8) */}
        <mesh position={[-20, 0.5, -8]}>
          <boxGeometry args={[6, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[-12, 0.5, -8]}>
          <boxGeometry args={[6, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>

        {/* Partition between Executive and Pantry (X: -16, Z: 8) */}
        <mesh position={[-20, 0.5, 8]}>
          <boxGeometry args={[6, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[-12, 0.5, 8]}>
          <boxGeometry args={[6, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>

        {/* Partition between Growth and SecOps (X: 16, Z: -8) */}
        <mesh position={[20, 0.5, -8]}>
          <boxGeometry args={[6, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[12, 0.5, -8]}>
          <boxGeometry args={[6, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>

        {/* Partition between SecOps and Intelligence (X: 16, Z: 8) */}
        <mesh position={[20, 0.5, 8]}>
          <boxGeometry args={[6, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[12, 0.5, 8]}>
          <boxGeometry args={[6, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
      </group>

      {/* 7. Outdoor Low-Poly Landscaping (Bushes, Planters, Trees) */}
      <group name="ExteriorDecor">
        {[-28, -14, 14, 28].map((x) => (
          <group key={`tree-n-${x}`} position={[x, 0, -28]}>
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.3, 1.2, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.8, 0]} castShadow>
              <dodecahedronGeometry args={[1.1, 1]} />
              <meshStandardMaterial color="#15803d" roughness={0.8} />
            </mesh>
          </group>
        ))}
        {[-28, -14, 14, 28].map((z) => (
          <group key={`tree-w-${z}`} position={[-28, 0, z]}>
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.3, 1.2, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.8, 0]} castShadow>
              <dodecahedronGeometry args={[1.1, 1]} />
              <meshStandardMaterial color="#16a34a" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
