import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  WELLNESS_BEDS,
  MENS_CR_STALLS,
  WOMENS_CR_STALLS,
  SERVER_RACKS,
  WATER_DISPENSERS,
} from '@/lib/office/wellnessWing'

export function OfficeFurniture() {
  const ledRef1 = useRef<THREE.MeshBasicMaterial>(null)
  const ledRef2 = useRef<THREE.MeshBasicMaterial>(null)
  const serverLedGreenRef = useRef<THREE.MeshBasicMaterial>(null)
  const serverLedBlueRef = useRef<THREE.MeshBasicMaterial>(null)
  const serverLedAmberRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    // Blinking server LEDs in Engineering
    if (ledRef1.current) {
      ledRef1.current.color.set(Math.sin(t * 8) > 0 ? '#22c55e' : '#14532d')
    }
    if (ledRef2.current) {
      ledRef2.current.color.set(Math.cos(t * 6) > 0 ? '#38bdf8' : '#0369a1')
    }
    // High-frequency blinking LED strips in Server Room
    if (serverLedGreenRef.current) {
      serverLedGreenRef.current.color.set(Math.sin(t * 10) > 0 ? '#22c55e' : '#064e3b')
    }
    if (serverLedBlueRef.current) {
      serverLedBlueRef.current.color.set(Math.cos(t * 7) > 0 ? '#0ea5e9' : '#0c4a6e')
    }
    if (serverLedAmberRef.current) {
      serverLedAmberRef.current.color.set(Math.sin(t * 12 + 1) > 0 ? '#f59e0b' : '#78350f')
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

      {/* ========================================================================= */}
      {/* 9. BOSS (CHIEF OF STAFF) WORKSTATION (Beside THE BRAIN: [3.5, 0, 2.5])   */}
      {/* ========================================================================= */}
      <group position={[3.5, 0, 2.5]} name="BossWorkstation">
        {/* Modern Executive Desk */}
        <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.72, 0.8]} />
          <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Polished Glass Desktop Surface */}
        <mesh position={[0, 0.73, 0]}>
          <boxGeometry args={[1.65, 0.02, 0.85]} />
          <meshStandardMaterial color="#00e5ff" transparent opacity={0.3} roughness={0.1} />
        </mesh>
        {/* Dual Curved Holographic Monitors */}
        <group position={[0, 1.05, -0.15]}>
          <mesh castShadow>
            <boxGeometry args={[1.3, 0.45, 0.05]} />
            <meshStandardMaterial color="#020617" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[1.25, 0.4]} />
            <meshStandardMaterial color="#0891b2" emissive="#00e5ff" emissiveIntensity={0.8} />
          </mesh>
        </group>
        {/* Executive Leather Swivel Chair */}
        <group position={[0, 0.42, 0.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.1, 0.5]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.35, 0.22]} castShadow>
            <boxGeometry args={[0.5, 0.65, 0.08]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
        </group>
        {/* Gold & Leather Clipboard Prop (Boss Data Gathering Symbol) */}
        <group position={[-0.45, 0.75, 0.05]} rotation={[-Math.PI / 2, 0, 0.2]}>
          {/* Wooden/Leather Board */}
          <mesh castShadow>
            <boxGeometry args={[0.26, 0.38, 0.015]} />
            <meshStandardMaterial color="#78350f" roughness={0.6} />
          </mesh>
          {/* Gold Metallic Clip at top */}
          <mesh position={[0, 0.17, 0.012]}>
            <boxGeometry args={[0.1, 0.04, 0.02]} />
            <meshStandardMaterial color="#facc15" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* White Paper Report Sheet */}
          <mesh position={[0, -0.01, 0.01]}>
            <planeGeometry args={[0.22, 0.32]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 10. 6 WATER DISPENSERS WITH VISIBLE JUG LEVEL                            */}
      {/* ========================================================================= */}
      <group name="WaterDispensers">
        {WATER_DISPENSERS.map((disp) => {
          const jugFillHeight = Math.max(0.05, 0.36 * (disp.jugLevelPct / 100))
          return (
            <group key={disp.id} position={disp.position}>
              {/* Dispenser Floor Base Cabinet */}
              <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.42, 0.9, 0.42]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.2} />
              </mesh>
              {/* Recessed Dispensing Alcove & Drip Tray */}
              <mesh position={[0, 0.58, 0.16]}>
                <boxGeometry args={[0.3, 0.26, 0.14]} />
                <meshStandardMaterial color="#0f172a" roughness={0.7} />
              </mesh>
              {/* Red (Hot) & Blue (Cold) Push Levers */}
              <mesh position={[-0.06, 0.65, 0.18]}>
                <boxGeometry args={[0.03, 0.05, 0.04]} />
                <meshStandardMaterial color="#ef4444" />
              </mesh>
              <mesh position={[0.06, 0.65, 0.18]}>
                <boxGeometry args={[0.03, 0.05, 0.04]} />
                <meshStandardMaterial color="#0284c7" />
              </mesh>
              {/* Inverted 5-Gallon Water Bottle Glass Collar */}
              <mesh position={[0, 0.94, 0]}>
                <cylinderGeometry args={[0.12, 0.16, 0.08, 16]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.6} />
              </mesh>
              {/* Translucent Blue Inverted Water Jug */}
              <mesh position={[0, 1.16, 0]}>
                <cylinderGeometry args={[0.18, 0.18, 0.38, 16]} />
                <meshStandardMaterial
                  color="#38bdf8"
                  transparent
                  opacity={0.45}
                  roughness={0.1}
                  metalness={0.1}
                />
              </mesh>
              {/* Inner Water Liquid Level reflecting live jugLevelPct */}
              <mesh position={[0, 0.98 + jugFillHeight * 0.5, 0]}>
                <cylinderGeometry args={[0.16, 0.16, jugFillHeight, 16]} />
                <meshStandardMaterial
                  color="#0284c7"
                  emissive="#0369a1"
                  emissiveIntensity={0.2}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            </group>
          )
        })}
      </group>

      {/* ========================================================================= */}
      {/* 11. NAP ROOM & SLEEP PODS PROPS (NW Wing: [-35, 0, -16])                 */}
      {/* ========================================================================= */}
      <group position={[-35, 0, -16]} name="NapRoomProps">
        {/* Ambient Dark Pod Mood Lighting */}
        <pointLight color="#818cf8" intensity={0.4} distance={8} position={[0, 2.2, 0]} />

        {/* 8 Wellness Beds (4 Single + 2 Bunk Beds = 8 Sleep Slots) */}
        {WELLNESS_BEDS.map((bed) => {
          // Relativize position to Nap Room center [-35, 0, -16]
          const rx = bed.position[0] - (-35)
          const ry = bed.position[1]
          const rz = bed.position[2] - (-16)
          const isBunkUpper = bed.type === 'bunk_upper'
          const isBunkLower = bed.type === 'bunk_lower'

          if (isBunkUpper) {
            // Upper bunk rendering is handled inside bunk unit
            return null
          }

          if (isBunkLower) {
            // Full 2-Tier Bunk Bed Unit
            return (
              <group key={bed.id} position={[rx, 0, rz]}>
                {/* 4 Corner Timber Upright Posts */}
                {[
                  [-0.55, -0.95],
                  [0.55, -0.95],
                  [-0.55, 0.95],
                  [0.55, 0.95],
                ].map(([px, pz], pidx) => (
                  <mesh key={`post-${pidx}`} position={[px, 1.1, pz]} castShadow>
                    <boxGeometry args={[0.08, 2.2, 0.08]} />
                    <meshStandardMaterial color="#451a03" roughness={0.8} />
                  </mesh>
                ))}
                {/* Lower Bed Deck & Mattress */}
                <mesh position={[0, 0.35, 0]} castShadow>
                  <boxGeometry args={[1.05, 0.15, 1.85]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.42, 0.2]}>
                  <boxGeometry args={[1.0, 0.1, 1.2]} />
                  <meshStandardMaterial color="#312e81" roughness={0.7} />
                </mesh>
                <mesh position={[0, 0.45, -0.65]}>
                  <boxGeometry args={[0.65, 0.1, 0.35]} />
                  <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
                </mesh>
                {/* Upper Bed Deck & Mattress */}
                <mesh position={[0, 1.35, 0]} castShadow>
                  <boxGeometry args={[1.05, 0.15, 1.85]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.5} />
                </mesh>
                <mesh position={[0, 1.42, 0.2]}>
                  <boxGeometry args={[1.0, 0.1, 1.2]} />
                  <meshStandardMaterial color="#0e7490" roughness={0.7} />
                </mesh>
                <mesh position={[0, 1.45, -0.65]}>
                  <boxGeometry args={[0.65, 0.1, 0.35]} />
                  <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
                </mesh>
                {/* Upper Safety Guard Rail */}
                <mesh position={[0.55, 1.55, 0]}>
                  <boxGeometry args={[0.04, 0.25, 1.8]} />
                  <meshStandardMaterial color="#451a03" />
                </mesh>
                {/* Climbing Ladder */}
                <group position={[0.58, 0.8, 0.6]}>
                  <mesh position={[0, 0, -0.15]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.6, 8]} />
                    <meshStandardMaterial color="#78350f" />
                  </mesh>
                  <mesh position={[0, 0, 0.15]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.6, 8]} />
                    <meshStandardMaterial color="#78350f" />
                  </mesh>
                  {[-0.5, -0.2, 0.1, 0.4, 0.7].map((ly, lidx) => (
                    <mesh key={`rung-${lidx}`} position={[0, ly, 0]}>
                      <boxGeometry args={[0.04, 0.03, 0.3]} />
                      <meshStandardMaterial color="#78350f" />
                    </mesh>
                  ))}
                </group>
              </group>
            )
          }

          // Single Rest Bed
          return (
            <group key={bed.id} position={[rx, ry, rz]}>
              {/* Wooden Bed Frame */}
              <mesh position={[0, -0.18, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.15, 0.32, 1.95]} />
                <meshStandardMaterial color="#334155" roughness={0.8} />
              </mesh>
              {/* Mattress */}
              <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[1.05, 0.18, 1.85]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.5} />
              </mesh>
              {/* Duvet / Blanket (Navy Indigo) */}
              <mesh position={[0, 0.08, 0.2]}>
                <boxGeometry args={[1.02, 0.12, 1.25]} />
                <meshStandardMaterial color="#1e1b4b" roughness={0.7} />
              </mesh>
              {/* Soft Pillow */}
              <mesh position={[0, 0.12, -0.65]}>
                <boxGeometry args={[0.7, 0.12, 0.38]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
              </mesh>
              {/* Nightstand Table */}
              <mesh position={[0.75, -0.1, -0.65]} castShadow>
                <boxGeometry args={[0.35, 0.45, 0.35]} />
                <meshStandardMaterial color="#1e293b" roughness={0.7} />
              </mesh>
              {/* Warm Ambient Bedside Lamp */}
              <mesh position={[0.75, 0.22, -0.65]}>
                <cylinderGeometry args={[0.08, 0.12, 0.18, 12]} />
                <meshStandardMaterial
                  color="#fef08a"
                  emissive="#facc15"
                  emissiveIntensity={0.8}
                />
              </mesh>
              {/* "Do Not Disturb" Status Light */}
              {bed.dndLight && (
                <mesh position={[-0.6, 0.5, -0.65]}>
                  <boxGeometry args={[0.06, 0.06, 0.12]} />
                  <meshStandardMaterial
                    color="#ef4444"
                    emissive="#ef4444"
                    emissiveIntensity={bed.occupiedBy ? 1.5 : 0.2}
                  />
                </mesh>
              )}
            </group>
          )
        })}

        {/* Blackout Curtains along window wall */}
        <mesh position={[0, 1.5, -5.9]}>
          <boxGeometry args={[11, 2.2, 0.08]} />
          <meshStandardMaterial color="#0f172a" roughness={0.95} />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 12A. MEN'S COMFORT ROOM PROPS ([-35, 0, -8])                              */}
      {/* ========================================================================= */}
      <group position={[-35, 0, -8]} name="MensCRProps">
        {/* Door Sign: MEN'S CR */}
        <group position={[5.8, 2.1, 0]}>
          <mesh>
            <boxGeometry args={[0.08, 0.35, 1.0]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[-0.05, 0, 0]}>
            <boxGeometry args={[0.02, 0.2, 0.8]} />
            <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.6} />
          </mesh>
        </group>

        {/* 3 Individual Toilet Stalls */}
        {MENS_CR_STALLS.map((stall) => {
          const rx = stall.position[0] - (-35)
          const rz = stall.position[2] - (-8)
          return (
            <group key={stall.id} position={[rx, 0, rz]}>
              {/* Stall Partition Enclosure */}
              <mesh position={[0, 1.0, 0]} castShadow>
                <boxGeometry args={[1.3, 2.0, 1.2]} />
                <meshStandardMaterial color="#0369a1" roughness={0.7} />
              </mesh>
              {/* Stall Door with Chrome Handle */}
              <mesh position={[0.66, 0.95, 0]}>
                <boxGeometry args={[0.04, 1.9, 0.9]} />
                <meshStandardMaterial color="#0284c7" roughness={0.6} metalness={0.2} />
              </mesh>
              {/* Occupied / Vacant Indicator Plate */}
              <mesh position={[0.69, 1.25, 0]}>
                <boxGeometry args={[0.02, 0.08, 0.16]} />
                <meshStandardMaterial
                  color={stall.isOccupied ? '#ef4444' : '#22c55e'}
                  emissive={stall.isOccupied ? '#ef4444' : '#22c55e'}
                  emissiveIntensity={1.2}
                />
              </mesh>
            </group>
          )
        })}

        {/* Ceramic Wash Basin Counter & Mirrors */}
        <group position={[4.5, 0.45, -0.5]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.9, 2.8]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
          </mesh>
          {[-0.8, 0.8].map((sz, sidx) => (
            <group key={`m-sink-${sidx}`} position={[0, 0.46, sz]}>
              <mesh>
                <boxGeometry args={[0.45, 0.02, 0.7]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.6} />
              </mesh>
              <mesh position={[-0.15, 0.12, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.24, 8]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
              </mesh>
            </group>
          ))}
          {/* Vanity Mirror */}
          <mesh position={[-0.32, 1.05, 0]}>
            <planeGeometry args={[0.05, 1.1]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.1} metalness={0.9} />
          </mesh>
          {/* Commercial Hand Dryer */}
          <mesh position={[-0.25, 0.8, 1.6]}>
            <boxGeometry args={[0.2, 0.35, 0.22]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 12B. WOMEN'S COMFORT ROOM PROPS ([-35, 0, -2])                            */}
      {/* ========================================================================= */}
      <group position={[-35, 0, -2]} name="WomensCRProps">
        {/* Door Sign: WOMEN'S CR */}
        <group position={[5.8, 2.1, 0]}>
          <mesh>
            <boxGeometry args={[0.08, 0.35, 1.0]} />
            <meshStandardMaterial color="#831843" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[-0.05, 0, 0]}>
            <boxGeometry args={[0.02, 0.2, 0.8]} />
            <meshStandardMaterial color="#f472b6" emissive="#db2777" emissiveIntensity={0.6} />
          </mesh>
        </group>

        {/* 3 Individual Toilet Stalls */}
        {WOMENS_CR_STALLS.map((stall) => {
          const rx = stall.position[0] - (-35)
          const rz = stall.position[2] - (-2)
          return (
            <group key={stall.id} position={[rx, 0, rz]}>
              {/* Stall Partition Enclosure */}
              <mesh position={[0, 1.0, 0]} castShadow>
                <boxGeometry args={[1.3, 2.0, 1.2]} />
                <meshStandardMaterial color="#be185d" roughness={0.7} />
              </mesh>
              {/* Stall Door with Chrome Handle */}
              <mesh position={[0.66, 0.95, 0]}>
                <boxGeometry args={[0.04, 1.9, 0.9]} />
                <meshStandardMaterial color="#9d174d" roughness={0.6} metalness={0.2} />
              </mesh>
              {/* Occupied / Vacant Indicator Plate */}
              <mesh position={[0.69, 1.25, 0]}>
                <boxGeometry args={[0.02, 0.08, 0.16]} />
                <meshStandardMaterial
                  color={stall.isOccupied ? '#ef4444' : '#22c55e'}
                  emissive={stall.isOccupied ? '#ef4444' : '#22c55e'}
                  emissiveIntensity={1.2}
                />
              </mesh>
            </group>
          )
        })}

        {/* Ceramic Wash Basin Counter & Large Mirror */}
        <group position={[4.5, 0.45, -0.5]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.9, 2.8]} />
            <meshStandardMaterial color="#fce7f3" roughness={0.3} />
          </mesh>
          {[-0.8, 0.8].map((sz, sidx) => (
            <group key={`w-sink-${sidx}`} position={[0, 0.46, sz]}>
              <mesh>
                <boxGeometry args={[0.45, 0.02, 0.7]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.6} />
              </mesh>
              <mesh position={[-0.15, 0.12, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.24, 8]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
              </mesh>
            </group>
          ))}
          {/* Large Vanity Mirror */}
          <mesh position={[-0.32, 1.05, 0]}>
            <planeGeometry args={[0.05, 1.1]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.1} metalness={0.9} />
          </mesh>
          {/* Commercial Hand Dryer */}
          <mesh position={[-0.25, 0.8, 1.6]}>
            <boxGeometry args={[0.2, 0.35, 0.22]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 12C. EXPANDED SERVER ROOM & DATA CENTER PROPS ([-37.5, 0, 4.25])          */}
      {/* ========================================================================= */}
      <group position={[-37.5, 0, 4.25]} name="ServerRoomProps">
        {/* Door Sign: RESTRICTED ACCESS SERVER ROOM */}
        <group position={[8.3, 2.1, -0.75]}>
          <mesh>
            <boxGeometry args={[0.08, 0.35, 1.2]} />
            <meshStandardMaterial color="#451a03" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[-0.05, 0, 0]}>
            <boxGeometry args={[0.02, 0.22, 1.0]} />
            <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.8} />
          </mesh>
        </group>

        {/* 6 Dual-Aisle Server Racks with Blinking Activity LEDs */}
        {SERVER_RACKS.map((rack) => {
          const rx = rack.position[0] - (-37.5)
          const rz = rack.position[2] - 4.25
          return (
            <group key={rack.id} position={[rx, 1.25, rz]}>
              {/* Heavy Metal Rack Chassis */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[1.2, 2.5, 0.8]} />
                <meshStandardMaterial color="#090d16" metalness={0.85} roughness={0.25} />
              </mesh>
              {/* Glass Perforated Front Panel */}
              <mesh position={[0, 0, 0.41]}>
                <planeGeometry args={[1.05, 2.3]} />
                <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} />
              </mesh>
              {/* Internal Blade Server Drawers */}
              {[-0.8, -0.4, 0, 0.4, 0.8].map((slotY, sidx) => (
                <group key={`blade-${sidx}`} position={[0, slotY, 0.42]}>
                  <mesh>
                    <boxGeometry args={[0.95, 0.18, 0.02]} />
                    <meshStandardMaterial color="#334155" metalness={0.7} />
                  </mesh>
                  <mesh position={[-0.35, 0, 0.015]}>
                    <boxGeometry args={[0.08, 0.04, 0.02]} />
                    <meshBasicMaterial
                      ref={sidx % 3 === 0 ? serverLedGreenRef : sidx % 3 === 1 ? serverLedBlueRef : serverLedAmberRef}
                      color="#22c55e"
                    />
                  </mesh>
                  <mesh position={[-0.2, 0, 0.015]}>
                    <boxGeometry args={[0.08, 0.04, 0.02]} />
                    <meshBasicMaterial
                      ref={sidx % 2 === 0 ? serverLedBlueRef : serverLedGreenRef}
                      color="#0ea5e9"
                    />
                  </mesh>
                </group>
              ))}
            </group>
          )
        })}

        {/* Dual Industrial CRAC Chiller Cooling Units */}
        {[
          [-7.5, 1.1, 0],
          [2.0, 1.1, 2.1],
        ].map(([cx, cy, cz], idx) => (
          <group key={`crac-${idx}`} position={[cx, cy, cz]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.4, 2.2, 1.0]} />
              <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[-0.71, 0, 0]}>
              <planeGeometry args={[0.8, 1.8]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.8, 0.51]}>
              <planeGeometry args={[0.6, 0.25]} />
              <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.8} />
            </mesh>
          </group>
        ))}

        {/* NOC Telemetry Wall Display (North Acoustic Wall) */}
        <group position={[1.5, 1.45, -3.05]}>
          <mesh>
            <boxGeometry args={[3.4, 1.4, 0.08]} />
            <meshStandardMaterial color="#090d16" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.045]}>
            <planeGeometry args={[3.2, 1.22]} />
            <meshStandardMaterial color="#082f49" emissive="#0284c7" emissiveIntensity={0.55} />
          </mesh>
        </group>

        {/* Dual Suspended Overhead Cable Trays */}
        {[-2.15, 2.05].map((tz, idx) => (
          <group key={`cable-tray-${idx}`} position={[-2.0, 2.45, tz]}>
            <mesh>
              <boxGeometry args={[10.5, 0.06, 0.4]} />
              <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.05, -0.1]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 10.2, 8]} />
              <meshStandardMaterial color="#f97316" />
            </mesh>
            <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 10.2, 8]} />
              <meshStandardMaterial color="#0ea5e9" />
            </mesh>
            <mesh position={[0, 0.05, 0.1]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 10.2, 8]} />
              <meshStandardMaterial color="#eab308" />
            </mesh>
          </group>
        ))}

        {/* Server Admin Terminal Workstation Desk (Rex) */}
        {/* World deskPos: [-32.5, 0, 3.8] -> rx = 5.0, rz = -0.45 */}
        <group position={[5.0, 0, -0.45]}>
          <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.76, 0.85]} />
            <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
          </mesh>
          <group position={[-0.1, 0.95, -0.2]} rotation={[0, 0.15, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.42, 0.04]} />
              <meshStandardMaterial color="#090d16" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0.025]}>
              <planeGeometry args={[0.66, 0.38]} />
              <meshStandardMaterial color="#052e16" emissive="#10b981" emissiveIntensity={0.6} />
            </mesh>
          </group>
          <group position={[-0.1, 0.95, 0.2]} rotation={[0, -0.15, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.42, 0.04]} />
              <meshStandardMaterial color="#090d16" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0.025]}>
              <planeGeometry args={[0.66, 0.38]} />
              <meshStandardMaterial color="#082f49" emissive="#0ea5e9" emissiveIntensity={0.6} />
            </mesh>
          </group>
          <mesh position={[0.2, 0.77, 0]}>
            <boxGeometry args={[0.18, 0.02, 0.45]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.2, 0.77, 0.3]}>
            <boxGeometry args={[0.1, 0.02, 0.06]} />
            <meshStandardMaterial color="#38bdf8" />
          </mesh>
          {/* Ergonomic Mesh Task Chair at world [-32, 0, 2.5] -> rx = 3.0, rz = -1.0 */}
          <group position={[1.0, 0, 0]}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.45, 0.08, 0.45]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
            <mesh position={[0.2, 0.85, 0]}>
              <boxGeometry args={[0.06, 0.7, 0.45]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 13. FACILITIES & JANITORIAL ROOM (SW-Central: [-35, 0, 8.5])              */}
      {/* ========================================================================= */}
      <group position={[-35, 0, 8.5]} name="FacilitiesRoomProps">
        {/* Door Sign: FACILITIES */}
        <group position={[5.8, 2.1, -0.5]}>
          <mesh>
            <boxGeometry args={[0.08, 0.35, 1.2]} />
            <meshStandardMaterial color="#713f12" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[-0.05, 0, 0]}>
            <boxGeometry args={[0.02, 0.22, 1.0]} />
            <meshStandardMaterial color="#eab308" emissive="#ca8a04" emissiveIntensity={0.7} />
          </mesh>
        </group>

        {/* Yellow Commercial Janitorial Cleaning Carts */}
        <group position={[0.5, 0.42, -0.5]}>
          {/* Yellow Chassis */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.65, 0.8, 1.1]} />
            <meshStandardMaterial color="#eab308" roughness={0.4} />
          </mesh>
          {/* 4 Wheels */}
          {[
            [-0.32, -0.38, -0.45],
            [0.32, -0.38, -0.45],
            [-0.32, -0.38, 0.45],
            [0.32, -0.38, 0.45],
          ].map(([wx, wy, wz], widx) => (
            <mesh key={`cw-${widx}`} position={[wx, wy, wz]}>
              <cylinderGeometry args={[0.06, 0.06, 0.05, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          ))}
          {/* Mop Bucket with Down-Press Wringer */}
          <mesh position={[0, 0.28, -0.2]}>
            <boxGeometry args={[0.42, 0.35, 0.4]} />
            <meshStandardMaterial color="#ca8a04" />
          </mesh>
          {/* Heavy-Duty Vinyl Refuse Bag */}
          <mesh position={[0, 0.3, 0.35]}>
            <boxGeometry args={[0.5, 0.6, 0.32]} />
            <meshStandardMaterial color="#854d0e" />
          </mesh>
        </group>

        {/* Mop & Broom Wall Tool Bracket */}
        <group position={[-5, 1.2, 0]}>
          <mesh>
            <boxGeometry args={[0.08, 0.08, 2.0]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          {[-0.6, 0, 0.6].map((mz, midx) => (
            <group key={`mop-${midx}`} position={[0.08, -0.3, mz]}>
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 1.4, 8]} />
                <meshStandardMaterial color="#059669" />
              </mesh>
              <mesh position={[0, -0.4, 0]}>
                <coneGeometry args={[0.12, 0.25, 8]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
              </mesh>
            </group>
          ))}
        </group>

        {/* 5-Gallon Water Bottle Multi-Tier Storage Rack */}
        <group position={[2.5, 0.7, 1.0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.4, 1.4, 0.6]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
          {/* 6 Blue Water Jugs in Rack */}
          {[-0.4, 0.4].map((jx, col) =>
            [-0.35, 0.05, 0.45].map((jy, row) => (
              <mesh
                key={`jug-${col}-${row}`}
                position={[jx, jy, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.14, 0.14, 0.42, 12]} />
                <meshStandardMaterial color="#0284c7" transparent opacity={0.7} />
              </mesh>
            ))
          )}
        </group>

        {/* Utility Shelving Unit with Chemical Supplies & Towels */}
        <group position={[-2.5, 1.0, 1.2]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.0, 2.0, 0.55]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.4} />
          </mesh>
          {/* Detergent Spray Bottles */}
          {[-0.6, -0.2, 0.2, 0.6].map((bx, bidx) => (
            <mesh key={`bot-${bidx}`} position={[bx, 0.3, 0.1]}>
              <cylinderGeometry args={[0.05, 0.06, 0.28, 8]} />
              <meshStandardMaterial color={bidx % 2 === 0 ? '#10b981' : '#3b82f6'} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 14. GRAND CAFETERIA PROPS (SW Wing: [-35, 0, 16])                         */}
      {/* ========================================================================= */}
      <group position={[-35, 0, 16]} name="GrandCafeteriaProps">
        {/* Hot Meal Food Buffet Serving Line along North wall */}
        <group position={[0, 0.5, -4.0]}>
          {/* Stainless Counter Base */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[8.4, 0.92, 1.2]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Angled Glass Sneeze Guard */}
          <mesh position={[0, 0.72, 0.4]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[8.2, 0.45, 0.04]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.4} roughness={0.1} />
          </mesh>
          {/* Gastronorm Hot Steam Trays (Time-Based Food Props) */}
          {[-3.0, -1.5, 0, 1.5, 3.0].map((tx, tidx) => (
            <group key={`tray-${tidx}`} position={[tx, 0.47, -0.05]}>
              <mesh>
                <boxGeometry args={[1.1, 0.06, 0.65]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
              </mesh>
              {/* Warm Food Filling (Rice, Chicken Adobo, Pork Sinigang, Veggies) */}
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.95, 0.04, 0.55]} />
                <meshStandardMaterial
                  color={
                    tidx === 0
                      ? '#f8fafc' // Garlic Jasmine Rice
                      : tidx === 1
                      ? '#78350f' // Chicken Adobo
                      : tidx === 2
                      ? '#ca8a04' // Sinigang Soup Broth
                      : tidx === 3
                      ? '#15803d' // Sautéed Kangkong & Veggies
                      : '#f59e0b' // Fresh Tropical Fruits
                  }
                  roughness={0.8}
                />
              </mesh>
            </group>
          ))}
        </group>

        {/* 8 Dining Tables with 32 Dining Chairs (Matching CAFETERIA_SEATS) */}
        {[
          { x: -4.5, z: -1.8 },
          { x: -1.5, z: -1.8 },
          { x: 1.5, z: -1.8 },
          { x: 4.5, z: -1.8 },
          { x: -4.5, z: 2.6 },
          { x: -1.5, z: 2.6 },
          { x: 1.5, z: 2.6 },
          { x: 4.5, z: 2.6 },
        ].map((tbl, tidx) => (
          <group key={`cafe-table-${tidx}`} position={[tbl.x, 0, tbl.z]}>
            {/* Table Surface */}
            <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.8, 0.06, 1.8]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.3} />
            </mesh>
            {/* Center Pedestal Leg */}
            <mesh position={[0, 0.36, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 0.72, 12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} />
            </mesh>
            {/* 4 Ergonomic Molded Dining Chairs */}
            {[
              [-0.9, 0],
              [0.9, 0],
              [0, -0.9],
              [0, 0.9],
            ].map(([cx, cz], cidx) => (
              <group key={`chair-${cidx}`} position={[cx, 0, cz]}>
                <mesh position={[0, 0.42, 0]} castShadow>
                  <boxGeometry args={[0.42, 0.06, 0.42]} />
                  <meshStandardMaterial color="#f97316" roughness={0.5} />
                </mesh>
                <mesh
                  position={[
                    cx !== 0 ? cx * 0.2 : 0,
                    0.68,
                    cz !== 0 ? cz * 0.2 : 0,
                  ]}
                  castShadow
                >
                  <boxGeometry args={[cx !== 0 ? 0.05 : 0.4, 0.45, cz !== 0 ? 0.05 : 0.4]} />
                  <meshStandardMaterial color="#f97316" roughness={0.5} />
                </mesh>
              </group>
            ))}
          </group>
        ))}

        {/* Kitchenette Station (Commercial Fridge + 2 Microwave Units) */}
        <group position={[5.2, 0, 4.0]}>
          {/* Double-Door Commercial Stainless Refrigerator */}
          <group position={[0, 1.1, -1.5]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.9, 2.2, 1.2]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Handles */}
            <mesh position={[-0.46, 0, 0.1]}>
              <cylinderGeometry args={[0.015, 0.015, 0.8, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[-0.46, 0, -0.1]}>
              <cylinderGeometry args={[0.015, 0.015, 0.8, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          </group>

          {/* Microwave Counter Station */}
          <group position={[0, 0.5, 1.2]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.8, 1.0, 1.5]} />
              <meshStandardMaterial color="#475569" roughness={0.5} />
            </mesh>
            {/* 2 Commercial Microwaves */}
            {[-0.35, 0.35].map((my, midx) => (
              <group key={`micro-${midx}`} position={[-0.1, 0.65, my]}>
                <mesh castShadow>
                  <boxGeometry args={[0.5, 0.32, 0.55]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.7} />
                </mesh>
                {/* Glowing LED Timer Window */}
                <mesh position={[-0.26, 0.05, 0]}>
                  <planeGeometry args={[0.02, 0.18]} />
                  <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.8} />
                </mesh>
              </group>
            ))}
          </group>
        </group>

        {/* 3-Stream Recycling & Waste Disposal Station */}
        <group position={[-5.0, 0.45, 5.0]}>
          {[
            { label: 'TRASH', color: '#334155' },
            { label: 'COMPOST', color: '#16a34a' },
            { label: 'RECYCLE', color: '#0284c7' },
          ].map((bin, bidx) => (
            <mesh key={`bin-${bidx}`} position={[0, 0, (bidx - 1) * 0.7]} castShadow>
              <boxGeometry args={[0.5, 0.9, 0.55]} />
              <meshStandardMaterial color={bin.color} roughness={0.6} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}
