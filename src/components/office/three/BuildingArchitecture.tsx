'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ROOMS_3D,
  PARKED_VEHICLES,
  HIGHWAY_CARS,
  STREETLIGHT_POSITIONS,
} from '@/config/officeLayout'

function LowPolyVehicle({
  color,
  type = 'sedan',
}: {
  color: string
  type?: 'sedan' | 'suv' | 'scooter'
}) {
  if (type === 'scooter') {
    return (
      <group>
        {/* Scooter Frame */}
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[0.45, 0.32, 1.25]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Handlebars */}
        <mesh position={[0, 0.58, 0.42]} castShadow>
          <boxGeometry args={[0.6, 0.08, 0.08]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
        </mesh>
        {/* Seat */}
        <mesh position={[0, 0.46, -0.15]}>
          <boxGeometry args={[0.38, 0.1, 0.5]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Headlight */}
        <mesh position={[0, 0.52, 0.62]}>
          <boxGeometry args={[0.16, 0.12, 0.04]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>
    )
  }

  const isSuv = type === 'suv'
  return (
    <group>
      {/* Lower Chassis */}
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.45, 0.42, 2.9]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.45} />
      </mesh>
      {/* Cabin / Roof */}
      <mesh position={[0, 0.68, isSuv ? -0.1 : -0.15]} castShadow>
        <boxGeometry args={[1.28, 0.36, isSuv ? 1.85 : 1.5]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.4} />
      </mesh>
      {/* Tinted Windshield & Windows */}
      <mesh position={[0, 0.68, isSuv ? -0.1 : -0.15]}>
        <boxGeometry args={[1.3, 0.28, isSuv ? 1.65 : 1.35]} />
        <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.85} />
      </mesh>
      {/* 4 Wheels */}
      {[
        [-0.72, 0.18, 0.88],
        [0.72, 0.18, 0.88],
        [-0.72, 0.18, -0.88],
        [0.72, 0.18, -0.88],
      ].map(([wx, wy, wz], idx) => (
        <mesh key={`whl-${idx}`} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.14, 12]} />
          <meshStandardMaterial color="#090d16" roughness={0.9} />
        </mesh>
      ))}
      {/* Glowing Headlights (+Z front) */}
      <mesh position={[-0.48, 0.36, 1.46]}>
        <boxGeometry args={[0.24, 0.12, 0.04]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      <mesh position={[0.48, 0.36, 1.46]}>
        <boxGeometry args={[0.24, 0.12, 0.04]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      {/* Glowing Taillights (-Z rear) */}
      <mesh position={[-0.48, 0.38, -1.46]}>
        <boxGeometry args={[0.26, 0.1, 0.04]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0.48, 0.38, -1.46]}>
        <boxGeometry args={[0.26, 0.1, 0.04]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
    </group>
  )
}

export function BuildingArchitecture() {
  const carRefs = useRef<(THREE.Group | null)[]>([])
  const treeRefs = useRef<(THREE.Group | null)[]>([])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()

    // Animate Highway Cars at constant velocity along waypoints
    HIGHWAY_CARS.forEach((cfg, idx) => {
      const grp = carRefs.current[idx]
      if (!grp) return
      const span = cfg.range[1] - cfg.range[0]
      const raw = cfg.initialOffset + t * cfg.speed * cfg.dir - cfg.range[0]
      const wrapped = ((raw % span) + span) % span + cfg.range[0]

      if (cfg.axis === 'x') {
        grp.position.set(wrapped, -0.05, cfg.laneCoord)
        grp.rotation.y = cfg.dir > 0 ? Math.PI / 2 : -Math.PI / 2
      } else {
        grp.position.set(cfg.laneCoord, -0.05, wrapped)
        grp.rotation.y = cfg.dir > 0 ? 0 : Math.PI
      }
    })

    // Gentle breeze sway on campus trees
    treeRefs.current.forEach((tr, idx) => {
      if (!tr) return
      tr.rotation.z = Math.sin(t * 1.6 + idx) * 0.035
    })
  })

  return (
    <group name="BuildingArchitecture">
      {/* ===================================================================== */}
      {/* 1. EXTERIOR CAMPUS LAWN, SIDEWALK, HIGHWAY & PARKING LOT              */}
      {/* ===================================================================== */}
      {/* Exterior Green Lawn Campus */}
      <mesh position={[0, -0.7, 0]} receiveShadow>
        <boxGeometry args={[86, 0.8, 86]} />
        <meshStandardMaterial color="#14532d" roughness={0.95} />
      </mesh>

      {/* Perimeter Concrete Sidewalk Apron */}
      <mesh position={[0, -0.62, 0]} receiveShadow>
        <boxGeometry args={[51.5, 1.15, 51.5]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>
      {/* Wellness Wing Concrete Apron */}
      <mesh position={[-34, -0.62, 0]} receiveShadow>
        <boxGeometry args={[22, 1.15, 51.5]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>

      {/* Main Building Foundation Slab */}
      <mesh position={[0, -0.58, 0]} receiveShadow>
        <boxGeometry args={[47.6, 1.2, 47.6]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {/* Wellness Wing Foundation Slab */}
      <mesh position={[-34, -0.58, 0]} receiveShadow>
        <boxGeometry args={[20, 1.2, 47.6]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* South Dual-Lane Asphalt Highway (Z = 29.8) */}
      <group name="SouthHighway">
        <mesh position={[0, -0.25, 29.8]} receiveShadow>
          <boxGeometry args={[80, 0.12, 6.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
        {/* Dashed Yellow Centerline */}
        {[-32, -24, -16, -8, 0, 8, 16, 24, 32].map((dx) => (
          <mesh key={`hwy-dash-s-${dx}`} position={[dx, -0.18, 29.8]}>
            <boxGeometry args={[3.2, 0.02, 0.18]} />
            <meshBasicMaterial color="#facc15" />
          </mesh>
        ))}
        {/* Zebra Crosswalk Leading to South Entrance (X = 0, Z = 25..28) */}
        {[-1.5, -0.75, 0, 0.75, 1.5].map((cx, i) => (
          <mesh key={`xw-s-${i}`} position={[cx, -0.17, 26.8]}>
            <boxGeometry args={[0.42, 0.02, 2.2]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
        ))}
      </group>

      {/* East Avenue & Employee Parking Lot (X = 30.8) */}
      <group name="EastRoadAndParking">
        <mesh position={[30.8, -0.25, -1]} receiveShadow>
          <boxGeometry args={[12.4, 0.12, 62]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
        {/* Dashed Yellow Centerline on East Road (X = 33.8) */}
        {[-26, -18, -10, -2, 6, 14, 22].map((dz) => (
          <mesh key={`hwy-dash-e-${dz}`} position={[33.8, -0.18, dz]}>
            <boxGeometry args={[0.18, 0.02, 3.2]} />
            <meshBasicMaterial color="#facc15" />
          </mesh>
        ))}
        {/* Painted White Parking Bay Dividers (X = 26.8) */}
        {[-19.5, -14.5, -9.5, -4.5, 0.5, 5.5, 10.5].map((pz, idx) => (
          <mesh key={`bay-line-${idx}`} position={[26.8, -0.17, pz]}>
            <boxGeometry args={[3.6, 0.02, 0.14]} />
            <meshBasicMaterial color="#e2e8f0" />
          </mesh>
        ))}
        {/* Zebra Crosswalk Leading from Parking to East Entrance (Z = 0) */}
        {[-1.2, -0.4, 0.4, 1.2].map((cz, i) => (
          <mesh key={`xw-e-${i}`} position={[24.6, -0.17, cz]}>
            <boxGeometry args={[1.8, 0.02, 0.38]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
        ))}

        {/* Parked Employee Vehicles */}
        {PARKED_VEHICLES.map((v) => (
          <group
            key={v.id}
            position={[v.pos[0], -0.18, v.pos[2]]}
            rotation={[0, v.rotY, 0]}
          >
            <LowPolyVehicle color={v.color} type={v.type} />
          </group>
        ))}
      </group>

      {/* Animated Moving Highway Cars */}
      <group name="MovingHighwayCars">
        {HIGHWAY_CARS.map((cfg, idx) => (
          <group
            key={cfg.id}
            ref={(el) => {
              carRefs.current[idx] = el
            }}
          >
            <LowPolyVehicle color={cfg.color} type={idx % 2 === 0 ? 'sedan' : 'suv'} />
          </group>
        ))}
      </group>

      {/* Exterior Streetlights (Illuminated at Night/Dusk PHT) */}
      <group name="Streetlights">
        {STREETLIGHT_POSITIONS.map(([lx, ly, lz], idx) => (
          <group key={`lamp-${idx}`} position={[lx, ly, lz]}>
            {/* Pole */}
            <mesh position={[0, 1.3, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.09, 2.6, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            {/* Glowing Lamp Head */}
            <mesh position={[0, 2.65, 0]}>
              <boxGeometry args={[0.38, 0.12, 0.38]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#facc15"
                emissiveIntensity={1.6}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* ===================================================================== */}
      {/* 2. CHECKERED CORRIDORS (Connecting 3x3 Rooms & Wellness Wing)          */}
      {/* ===================================================================== */}
      <group name="Corridors">
        <mesh position={[0, 0.02, -8]} receiveShadow>
          <boxGeometry args={[46, 0.02, 2.4]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.02, 8]} receiveShadow>
          <boxGeometry args={[46, 0.02, 2.4]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        <mesh position={[-8, 0.02, 0]} receiveShadow>
          <boxGeometry args={[2.4, 0.02, 46]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
        </mesh>
        <mesh position={[8, 0.02, 0]} receiveShadow>
          <boxGeometry args={[2.4, 0.02, 46]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
        </mesh>
        {/* Wellness Wing Corridor Connectors */}
        <mesh position={[-25.5, 0.02, -8]} receiveShadow>
          <boxGeometry args={[5.0, 0.02, 2.4]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        <mesh position={[-25.5, 0.02, 8]} receiveShadow>
          <boxGeometry args={[5.0, 0.02, 2.4]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        {/* Wellness Wing Main Corridor */}
        <mesh position={[-27.5, 0.02, 0]} receiveShadow>
          <boxGeometry args={[2.4, 0.02, 44]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
        </mesh>
      </group>

      {/* ===================================================================== */}
      {/* 3. 9 ROOM FLOOR SLABS                                                 */}
      {/* ===================================================================== */}
      {Object.values(ROOMS_3D).map((room) => {
        const isBrain = room.id === 'COMMAND'
        return (
          <group key={room.id} position={room.center}>
            {isBrain ? (
              <group position={[0, 0.04, 0]}>
                <mesh receiveShadow>
                  <cylinderGeometry args={[6.8, 6.8, 0.08, 48]} />
                  <meshStandardMaterial color="#090d16" roughness={0.4} metalness={0.8} />
                </mesh>
                <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[6.7, 6.9, 48]} />
                  <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[4.2, 4.3, 48]} />
                  <meshBasicMaterial
                    color="#00e5ff"
                    transparent
                    opacity={0.4}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </group>
            ) : (
              <group position={[0, 0.03, 0]}>
                <mesh receiveShadow>
                  <boxGeometry args={[room.size[0], 0.06, room.size[1]]} />
                  <meshStandardMaterial color={room.floorColor} roughness={0.7} />
                </mesh>
                <mesh position={[0, 0.05, 0]}>
                  <boxGeometry args={[room.size[0] + 0.1, 0.02, room.size[1] + 0.1]} />
                  <meshStandardMaterial
                    color={room.accentColor}
                    roughness={0.5}
                    transparent
                    opacity={0.25}
                  />
                </mesh>
              </group>
            )}
          </group>
        )
      })}

      {/* ===================================================================== */}
      {/* 4. EXTERIOR FULL BACK WALLS (North & West)                            */}
      {/* ===================================================================== */}
      <group name="BackWalls">
        {/* Main Building North Wall */}
        <mesh position={[0, 1.4, -23.2]} castShadow receiveShadow>
          <boxGeometry args={[46.8, 2.8, 0.4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Wellness Wing North Wall */}
        <mesh position={[-33, 1.4, -23.2]} castShadow receiveShadow>
          <boxGeometry args={[19.2, 2.8, 0.4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {[-35, -16, 0, 16].map((x) => (
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

        {/* Main Building West Wall (Divided into 3 segments with doorway openings at z = -8 and z = 8) */}
        <mesh position={[-23.2, 1.4, -15.5]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 15]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[-23.2, 1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[-23.2, 1.4, 15.5]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 15]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>

        {/* Wellness Wing West Exterior Wall */}
        <mesh position={[-41.2, 1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 46.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {[-16, -2, 6, 16].map((z) => (
          <mesh key={`w-win-wellness-${z}`} position={[-41.15, 1.6, z]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[6, 1.6]} />
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

        <mesh position={[0, 2.2, -22.95]}>
          <planeGeometry args={[18, 0.9]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
      </group>

      {/* ===================================================================== */}
      {/* 5. EXTERIOR CUTAWAY FRONT HALF-WALLS (South & East with Door Gaps)    */}
      {/* ===================================================================== */}
      <group name="CutawayFrontWalls">
        <mesh position={[-12.5, 0.35, 23.2]} castShadow receiveShadow>
          <boxGeometry args={[21.8, 0.7, 0.4]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[12.5, 0.35, 23.2]} castShadow receiveShadow>
          <boxGeometry args={[21.8, 0.7, 0.4]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        {/* Wellness Wing South Cutaway Front Wall */}
        <mesh position={[-35, 0.35, 23.2]} castShadow receiveShadow>
          <boxGeometry args={[12.4, 0.7, 0.4]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[-12.5, 0.85, 23.2]}>
          <boxGeometry args={[21.8, 0.3, 0.1]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.4} roughness={0.1} />
        </mesh>
        <mesh position={[12.5, 0.85, 23.2]}>
          <boxGeometry args={[21.8, 0.3, 0.1]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.4} roughness={0.1} />
        </mesh>
        <mesh position={[-35, 0.85, 23.2]}>
          <boxGeometry args={[12.4, 0.3, 0.1]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.4} roughness={0.1} />
        </mesh>

        <mesh position={[23.2, 0.35, -12.5]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.7, 21.8]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[23.2, 0.35, 12.5]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.7, 21.8]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[23.2, 0.85, -12.5]}>
          <boxGeometry args={[0.1, 0.3, 21.8]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.4} roughness={0.1} />
        </mesh>
        <mesh position={[23.2, 0.85, 12.5]}>
          <boxGeometry args={[0.1, 0.3, 21.8]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.4} roughness={0.1} />
        </mesh>
      </group>

      {/* Floating Neon Room Signs above Wellness Wing Doors */}
      <group name="WellnessFloatingSigns">
        {[
          { label: 'NAP ROOM', pos: [-28.8, 1.8, -16], color: '#818cf8', em: '#4f46e5' },
          { label: 'COMFORT ROOM', pos: [-28.8, 1.8, -2], color: '#2dd4bf', em: '#0d9488' },
          { label: 'FACILITIES', pos: [-28.8, 1.8, 6], color: '#94a3b8', em: '#475569' },
          { label: 'GRAND CAFETERIA', pos: [-28.8, 1.8, 16], color: '#fb923c', em: '#ea580c' },
        ].map((sign, idx) => (
          <group key={`sign-${idx}`} position={sign.pos as [number, number, number]} rotation={[0, Math.PI / 2, 0]}>
            {/* Sign Plate */}
            <mesh>
              <boxGeometry args={[2.2, 0.45, 0.06]} />
              <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Glowing Accent Border */}
            <mesh position={[0, 0, 0.035]}>
              <planeGeometry args={[2.0, 0.35]} />
              <meshStandardMaterial
                color={sign.color}
                emissive={sign.em}
                emissiveIntensity={1.2}
                roughness={0.2}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* ===================================================================== */}
      {/* 6. LOW INTERIOR PARTITION HALF-WALLS WITH DOORWAY OPENINGS            */}
      {/* ===================================================================== */}
      <group name="InteriorPartitions">
        {[
          [-20, 0.5, -8],
          [-12, 0.5, -8],
          [-20, 0.5, 8],
          [-12, 0.5, 8],
          [20, 0.5, -8],
          [12, 0.5, -8],
          [20, 0.5, 8],
          [12, 0.5, 8],
        ].map(([px, py, pz], idx) => (
          <mesh key={`part-${idx}`} position={[px, py, pz]}>
            <boxGeometry args={[6, 1.0, 0.3]} />
            <meshStandardMaterial color="#334155" roughness={0.8} />
          </mesh>
        ))}

        {/* Wellness Wing Room Dividers */}
        <mesh position={[-35, 0.5, -9]}>
          <boxGeometry args={[12, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[-35, 0.5, 3]}>
          <boxGeometry args={[12, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[-35, 0.5, 9]}>
          <boxGeometry args={[12, 1.0, 0.3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>

        {/* Wellness Corridor East Partitions (with door openings at z = -16, -2, 6, 16) */}
        <mesh position={[-28.9, 0.5, -20]}>
          <boxGeometry args={[0.3, 1.0, 4]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[-28.9, 0.5, -10]}>
          <boxGeometry args={[0.3, 1.0, 7]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[-28.9, 0.5, 2]}>
          <boxGeometry args={[0.3, 1.0, 4]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[-28.9, 0.5, 11]}>
          <boxGeometry args={[0.3, 1.0, 4]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[-28.9, 0.5, 20.5]}>
          <boxGeometry args={[0.3, 1.0, 3]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
      </group>

      {/* ===================================================================== */}
      {/* 7. OUTDOOR LOW-POLY LANDSCAPING (Swaying Trees & Courtyard Bushes)    */}
      {/* ===================================================================== */}
      <group name="ExteriorDecor">
        {[
          [-45, -28],
          [-14, -28],
          [14, -28],
          [28, -28],
          [-45, -14],
          [-45, 14],
          [-45, 25],
          [-14, 25.2],
          [14, 25.2],
        ].map(([tx, tz], idx) => (
          <group
            key={`tree-${idx}`}
            position={[tx, 0, tz]}
            ref={(el) => {
              treeRefs.current[idx] = el
            }}
          >
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.3, 1.2, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.8, 0]} castShadow>
              <dodecahedronGeometry args={[1.1, 1]} />
              <meshStandardMaterial
                color={idx % 2 === 0 ? '#15803d' : '#16a34a'}
                roughness={0.8}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
