'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function OfficeFurniture() {
  const ledRef1 = useRef<THREE.MeshBasicMaterial>(null)
  const ledRef2 = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    // Blinking server LEDs
    if (ledRef1.current) {
      ledRef1.current.color.set(Math.sin(t * 8) > 0 ? '#22c55e' : '#14532d')
    }
    if (ledRef2.current) {
      ledRef2.current.color.set(Math.cos(t * 6) > 0 ? '#38bdf8' : '#0369a1')
    }
  })

  return (
    <group name="OfficeFurniture">
      {/* ========================================================================= */}
      {/* 1. ENGINEERING CORE PROPS (NW: [-16, 0, -16]) */}
      {/* ========================================================================= */}
      <group position={[-16, 0, -16]} name="EngineeringProps">
        {/* Server Racks along Back Wall */}
        {[-4, -2, 0].map((offset, i) => (
          <group key={`srv-${i}`} position={[offset, 1.2, -6.2]}>
            {/* Rack Cabinet */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.4, 2.4, 0.7]} />
              <meshStandardMaterial color="#090d16" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Rack Door Grid */}
            <mesh position={[0, 0, 0.36]}>
              <planeGeometry args={[1.2, 2.2]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
            {/* LED Status Strips */}
            <mesh position={[-0.4, 0.8, 0.37]}>
              <boxGeometry args={[0.1, 0.04, 0.02]} />
              <meshBasicMaterial ref={i === 0 ? ledRef1 : undefined} color="#22c55e" />
            </mesh>
            <mesh position={[-0.4, 0.6, 0.37]}>
              <boxGeometry args={[0.1, 0.04, 0.02]} />
              <meshBasicMaterial ref={i === 0 ? ledRef2 : undefined} color="#38bdf8" />
            </mesh>
          </group>
        ))}

        {/* Code Whiteboard */}
        <group position={[3.5, 1.5, -6.3]}>
          <mesh castShadow>
            <boxGeometry args={[3.2, 1.6, 0.08]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>
          {/* Frame */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[3.3, 1.7, 0.04]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
          {/* Architectural Code Lines */}
          <mesh position={[0, 0.2, 0.05]}>
            <planeGeometry args={[2.8, 0.1]} />
            <meshBasicMaterial color="#0284c7" />
          </mesh>
          <mesh position={[0, -0.1, 0.05]}>
            <planeGeometry args={[2.5, 0.08]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        </group>

        {/* Corner Plant */}
        <group position={[-6, 0, -5.8]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.25, 0.6, 12]} />
            <meshStandardMaterial color="#92400e" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow>
            <coneGeometry args={[0.5, 1.0, 8]} />
            <meshStandardMaterial color="#15803d" roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 2. OPERATIONS HUB PROPS (N: [0, 0, -16]) */}
      {/* ========================================================================= */}
      <group position={[0, 0, -16]} name="OperationsProps">
        {/* Logistics Whiteboard & Filing Cabinets */}
        <group position={[-5, 0.7, -6.2]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.2, 1.4, 0.6]} />
            <meshStandardMaterial color="#475569" roughness={0.5} />
          </mesh>
        </group>
        <group position={[5, 0.7, -6.2]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.2, 1.4, 0.6]} />
            <meshStandardMaterial color="#475569" roughness={0.5} />
          </mesh>
        </group>
        {/* Shipping & Supply Boxes */}
        <mesh position={[-5, 1.6, -6.2]} castShadow>
          <boxGeometry args={[0.6, 0.4, 0.5]} />
          <meshStandardMaterial color="#b45309" roughness={0.9} />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 3. GROWTH LAB PROPS (NE: [16, 0, -16]) */}
      {/* ========================================================================= */}
      <group position={[16, 0, -16]} name="GrowthProps">
        {/* Large Analytics Wall Monitor */}
        <group position={[0, 1.6, -6.3]}>
          <mesh castShadow>
            <boxGeometry args={[4.2, 1.8, 0.1]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Display Glow */}
          <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[4.0, 1.6]} />
            <meshStandardMaterial
              color="#1d4ed8"
              emissive="#3b82f6"
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 4. EXECUTIVE LOUNGE PROPS (W: [-16, 0, 0]) */}
      {/* ========================================================================= */}
      <group position={[-16, 0, 0]} name="ExecutiveProps">
        {/* Luxury Purple Leather Sofa 1 */}
        <group position={[-2, 0.35, -4]}>
          {/* Seat Cushion */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.2, 0.4, 1.2]} />
            <meshStandardMaterial color="#4c1d95" roughness={0.6} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, 0.5, -0.45]} castShadow>
            <boxGeometry args={[3.2, 0.7, 0.3]} />
            <meshStandardMaterial color="#3b0764" roughness={0.6} />
          </mesh>
          {/* Left Armrest */}
          <mesh position={[-1.6, 0.3, 0]} castShadow>
            <boxGeometry args={[0.25, 0.5, 1.2]} />
            <meshStandardMaterial color="#3b0764" roughness={0.6} />
          </mesh>
          {/* Right Armrest */}
          <mesh position={[1.6, 0.3, 0]} castShadow>
            <boxGeometry args={[0.25, 0.5, 1.2]} />
            <meshStandardMaterial color="#3b0764" roughness={0.6} />
          </mesh>
        </group>

        {/* Round Glass Coffee Table */}
        <group position={[-2, 0.3, -2]}>
          <mesh castShadow>
            <cylinderGeometry args={[1.0, 1.0, 0.05, 24]} />
            <meshStandardMaterial
              color="#38bdf8"
              transparent
              opacity={0.6}
              roughness={0.1}
            />
          </mesh>
          <mesh position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.1, 0.3, 0.3, 12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>

        {/* Bookshelf along West Wall */}
        <group position={[-6.2, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.5, 2.6, 0.5]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.8} />
          </mesh>
          {/* Shelves */}
          {[-0.8, -0.2, 0.4, 1.0].map((y, idx) => (
            <mesh key={`shelf-${idx}`} position={[0, y, 0.1]}>
              <boxGeometry args={[3.3, 0.04, 0.4]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          ))}
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 5. QA & SECOPS NOC PROPS (E: [16, 0, 0]) */}
      {/* ========================================================================= */}
      <group position={[16, 0, 0]} name="SecOpsProps">
        {/* Threat Radar Display Wall */}
        <group position={[0, 1.6, -6.3]}>
          <mesh castShadow>
            <boxGeometry args={[4.8, 1.8, 0.1]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[4.6, 1.6]} />
            <meshStandardMaterial
              color="#86198f"
              emissive="#d946ef"
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 6. PANTRY & CANTEEN PROPS (SW: [-16, 0, 16]) */}
      {/* ========================================================================= */}
      <group position={[-16, 0, 16]} name="PantryProps">
        {/* Long Espresso / Breakfast Bar Counter */}
        <group position={[-2, 0.5, -4]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.8, 1.0, 1.2]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          {/* White Marble Countertop */}
          <mesh position={[0, 0.52, 0]} receiveShadow>
            <boxGeometry args={[5.0, 0.06, 1.3]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>

          {/* Espresso Machine */}
          <group position={[-1.4, 0.8, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.5, 0.5]} />
              <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Coffee Spout & Cups */}
            <mesh position={[0.1, 0.25, 0.1]}>
              <cylinderGeometry args={[0.06, 0.05, 0.12, 12]} />
              <meshStandardMaterial color="#f1f5f9" />
            </mesh>
          </group>

          {/* Donut Box / Pastry Tray */}
          <mesh position={[0.8, 0.58, 0]} castShadow>
            <boxGeometry args={[0.7, 0.1, 0.45]} />
            <meshStandardMaterial color="#fde047" roughness={0.8} />
          </mesh>
        </group>

        {/* Café Dining Table & Chairs */}
        <group position={[-2, 0.45, 1]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[1.2, 1.2, 0.06, 24]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.1, 0.3, 0.45, 12]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
          {/* 4 Chairs */}
          {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, i) => (
            <mesh
              key={`c-chair-${i}`}
              position={[Math.sin(ang) * 1.6, -0.15, Math.cos(ang) * 1.6]}
              castShadow
            >
              <cylinderGeometry args={[0.25, 0.25, 0.35, 12]} />
              <meshStandardMaterial color="#ea580c" />
            </mesh>
          ))}
        </group>

        {/* Water Dispenser */}
        <group position={[4.5, 0.7, -4]}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 1.1, 0.5]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
          </mesh>
          {/* Blue Water Bottle on Top */}
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.5, 16]} />
            <meshStandardMaterial
              color="#0284c7"
              transparent
              opacity={0.7}
              roughness={0.1}
            />
          </mesh>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 7. REC & GYM PROPS (S: [0, 0, 16]) */}
      {/* ========================================================================= */}
      <group position={[0, 0, 16]} name="GymProps">
        {/* Treadmills */}
        {[-3, 0, 3].map((x, i) => (
          <group key={`treadmill-${i}`} position={[x, 0.3, -2]}>
            {/* Belt Deck (Slightly inclined) */}
            <mesh position={[0, 0.1, 0]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.0, 0.18, 2.2]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>
            {/* Side Handrails & Console */}
            <mesh position={[-0.45, 0.7, -0.8]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
            <mesh position={[0.45, 0.7, -0.8]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
            {/* Console Screen */}
            <mesh position={[0, 1.2, -0.8]} rotation={[-0.3, 0, 0]}>
              <boxGeometry args={[0.7, 0.3, 0.06]} />
              <meshStandardMaterial
                color="#0284c7"
                emissive="#38bdf8"
                emissiveIntensity={0.6}
              />
            </mesh>
          </group>
        ))}

        {/* Dumbbell Rack */}
        <group position={[-5, 0.5, 3]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.4, 0.8, 0.6]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} />
          </mesh>
          {/* Dumbbells on Rack */}
          {[-0.8, -0.3, 0.2, 0.7].map((dx, idx) => (
            <mesh key={`db-${idx}`} position={[dx, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.1, 0.1, 0.3, 12]} />
              <meshStandardMaterial color="#475569" metalness={0.9} />
            </mesh>
          ))}
        </group>

        {/* Yoga Mats */}
        <mesh position={[3, 0.02, 3]} rotation={[-Math.PI / 2, 0, 0.2]}>
          <planeGeometry args={[1.2, 2.4]} />
          <meshStandardMaterial color="#ec4899" roughness={0.9} />
        </mesh>
        <mesh position={[4.5, 0.02, 2.8]} rotation={[-Math.PI / 2, 0, 0.2]}>
          <planeGeometry args={[1.2, 2.4]} />
          <meshStandardMaterial color="#06b6d4" roughness={0.9} />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 8. INTELLIGENCE LAB PROPS (SE: [16, 0, 16]) */}
      {/* ========================================================================= */}
      <group position={[16, 0, 16]} name="IntelligenceProps">
        {/* GPU Compute Clusters */}
        {[-3, -1].map((offset, idx) => (
          <group key={`gpu-${idx}`} position={[offset, 1.1, -5.8]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.5, 2.2, 0.8]} />
              <meshStandardMaterial color="#042f2e" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Ventilation Grille with Glowing Cyan/Teal Underlight */}
            <mesh position={[0, 0, 0.41]}>
              <planeGeometry args={[1.3, 1.9]} />
              <meshStandardMaterial
                color="#0f766e"
                emissive="#14b8a6"
                emissiveIntensity={0.8}
              />
            </mesh>
          </group>
        ))}

        {/* Neural Network Visualization Screen */}
        <group position={[3.5, 1.6, -6.3]}>
          <mesh castShadow>
            <boxGeometry args={[3.6, 1.8, 0.08]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[3.4, 1.6]} />
            <meshStandardMaterial
              color="#0d9488"
              emissive="#2dd4bf"
              emissiveIntensity={1.0}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}
