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
import { DOOR_DEFINITIONS, DoorDefinition } from '@/lib/office/walkCollision'

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

function InteractiveDoorMesh({
  door,
  isOpen,
  height = 2.45,
}: {
  door: DoorDefinition
  isOpen: boolean
  height?: number
}) {
  const pivotRef = useRef<THREE.Group>(null)
  const targetRot = isOpen ? (Math.PI / 2) * door.openDirection : 0

  useFrame((_, delta) => {
    if (!pivotRef.current) return
    const step = 1 - Math.exp(-10 * Math.min(delta, 0.05))
    pivotRef.current.rotation.y += (targetRot - pivotRef.current.rotation.y) * step
  })

  const halfW = door.width / 2
  const hingeOffset =
    door.axis === 'z'
      ? ([0, 0, door.hingeSide * halfW] as [number, number, number])
      : ([door.hingeSide * halfW, 0, 0] as [number, number, number])
  const leafOffset =
    door.axis === 'z'
      ? ([0, height / 2, -door.hingeSide * halfW] as [number, number, number])
      : ([-door.hingeSide * halfW, height / 2, 0] as [number, number, number])
  const leafSize: [number, number, number] =
    door.axis === 'z'
      ? [door.thickness, height, door.width - 0.08]
      : [door.width - 0.08, height, door.thickness]
  const glassSize: [number, number, number] =
    door.axis === 'z'
      ? [door.thickness + 0.02, height * 0.45, door.width * 0.55]
      : [door.width * 0.55, height * 0.45, door.thickness + 0.02]

  return (
    <group position={[door.x, 0, door.z]} name={`Door-${door.id}`}>
      {/* Overhead Frame Lintel */}
      <mesh position={[0, height + 0.08, 0]} castShadow>
        <boxGeometry
          args={
            door.axis === 'z'
              ? [door.thickness + 0.16, 0.14, door.width + 0.16]
              : [door.width + 0.16, 0.14, door.thickness + 0.16]
          }
        />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Hinged Pivot */}
      <group ref={pivotRef} position={hingeOffset}>
        <mesh position={leafOffset} castShadow receiveShadow>
          <boxGeometry args={leafSize} />
          <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.25} />
        </mesh>
        {/* Frosted Vision Glass Window */}
        <mesh position={[leafOffset[0], height * 0.6, leafOffset[2]]}>
          <boxGeometry args={glassSize} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.35} roughness={0.1} />
        </mesh>
        {/* Brushed Steel Lever Handle */}
        <mesh
          position={[
            door.axis === 'z' ? 0.08 : -door.hingeSide * (door.width * 0.8),
            1.02,
            door.axis === 'z' ? -door.hingeSide * (door.width * 0.8) : 0.08,
          ]}
        >
          <boxGeometry args={[0.16, 0.04, 0.16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  )
}

const CLOUD_CLUSTERS: [number, number, number, number][] = [
  [-65, 42, -75, 1.3],
  [-22, 48, -90, 1.6],
  [25, 40, -82, 1.2],
  [70, 52, -70, 1.5],
  [-80, 46, 20, 1.4],
  [75, 44, 35, 1.3],
  [10, 50, 85, 1.7],
  [-45, 43, 80, 1.2],
]

const STAR_POSITIONS: [number, number, number][] = Array.from({ length: 36 }, (_, i) => {
  const angle = (i / 36) * Math.PI * 2
  const radius = 95 + (i % 4) * 14
  const y = 38 + (i % 6) * 8
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius]
})

function DynamicSkyDome({ isNight }: { isNight: boolean }) {
  const cloudsRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!cloudsRef.current) return
    cloudsRef.current.rotation.y += delta * 0.008
  })

  return (
    <group name="DynamicSkyDome">
      {/* Sky Backdrop Dome */}
      <mesh>
        <sphereGeometry args={[210, 32, 20]} />
        <meshBasicMaterial
          color={isNight ? '#060c1f' : '#7dd3fc'}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Sun (Day) or Moon (Night) */}
      {isNight ? (
        <group position={[-75, 62, -95]}>
          <mesh>
            <sphereGeometry args={[7.5, 24, 24]} />
            <meshBasicMaterial color="#e2e8f0" />
          </mesh>
          <mesh>
            <sphereGeometry args={[10.5, 20, 20]} />
            <meshBasicMaterial color="#94a3b8" transparent opacity={0.18} />
          </mesh>
        </group>
      ) : (
        <group position={[82, 66, -92]}>
          <mesh>
            <sphereGeometry args={[8.5, 24, 24]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
          <mesh>
            <sphereGeometry args={[14, 20, 20]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.22} />
          </mesh>
        </group>
      )}

      {/* Twinkling Night Stars */}
      {isNight &&
        STAR_POSITIONS.map((pos, idx) => (
          <mesh key={`star-${idx}`} position={pos}>
            <sphereGeometry args={[0.45 + (idx % 3) * 0.15, 6, 6]} />
            <meshBasicMaterial color={idx % 2 === 0 ? '#f8fafc' : '#bae6fd'} />
          </mesh>
        ))}

      {/* Softly Drifting 3D Clouds */}
      <group ref={cloudsRef}>
        {CLOUD_CLUSTERS.map(([cx, cy, cz, scale], idx) => (
          <group key={`cloud-${idx}`} position={[cx, cy, cz]} scale={scale}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[4.2, 12, 10]} />
              <meshStandardMaterial
                color={isNight ? '#1e293b' : '#ffffff'}
                emissive={isNight ? '#0f172a' : '#e0f2fe'}
                emissiveIntensity={0.25}
                roughness={0.95}
              />
            </mesh>
            <mesh position={[3.6, -0.6, 0.4]}>
              <sphereGeometry args={[3.1, 10, 8]} />
              <meshStandardMaterial
                color={isNight ? '#1e293b' : '#f8fafc'}
                emissive={isNight ? '#0f172a' : '#e0f2fe'}
                emissiveIntensity={0.2}
                roughness={0.95}
              />
            </mesh>
            <mesh position={[-3.5, -0.5, -0.3]}>
              <sphereGeometry args={[3.3, 10, 8]} />
              <meshStandardMaterial
                color={isNight ? '#1e293b' : '#f8fafc'}
                emissive={isNight ? '#0f172a' : '#e0f2fe'}
                emissiveIntensity={0.2}
                roughness={0.95}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

const EMPTY_OPEN_DOORS: ReadonlySet<string> = new Set()

export function BuildingArchitecture({
  isWalkMode = false,
  openDoors = EMPTY_OPEN_DOORS,
  isNight = false,
}: {
  isWalkMode?: boolean
  openDoors?: ReadonlySet<string>
  isNight?: boolean
}) {
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
      <DynamicSkyDome isNight={isNight} />
      {/* ===================================================================== */}
      {/* 1. EXTERIOR CAMPUS LAWN, SIDEWALK, HIGHWAY & PARKING LOT              */}
      {/* ===================================================================== */}
      {/* Exterior Green Lawn Campus */}
      <mesh position={[-8, -0.7, 0]} receiveShadow>
        <boxGeometry args={[102, 0.8, 86]} />
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
      {/* Expanded Server Room West Bay Concrete Apron */}
      <mesh position={[-43.5, -0.62, 4.25]} receiveShadow>
        <boxGeometry args={[7.2, 1.15, 8.5]} />
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
      {/* Expanded Server Room West Bay Foundation Slab */}
      <mesh position={[-43.5, -0.58, 4.25]} receiveShadow>
        <boxGeometry args={[5.8, 1.2, 6.9]} />
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
        {/* Glowing Doorway Thresholds at Main Office <-> West Wing Portals */}
        {[-8, 8].map((tz) => (
          <mesh key={`west-threshold-${tz}`} position={[-23.2, 0.045, tz]}>
            <boxGeometry args={[0.5, 0.02, 2.4]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.6}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}
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

        {/* Main Building West Wall (Divided into 3 segments with 2.4m doorway openings at z = -8 and z = 8) */}
        <mesh position={[-23.2, 1.4, -16.3]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 14.2]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[-23.2, 1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 13.6]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[-23.2, 1.4, 16.3]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 14.2]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>

        {/* Wellness Wing West Exterior Wall (split around expanded Server Room West Bay z = 1..7.5) */}
        <mesh position={[-41.2, 1.4, -11.2]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 24.4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[-41.2, 1.4, 15.45]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 15.9]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Expanded Server Room West Bay Outer Wall (x = -46.2) & Returns */}
        <mesh position={[-46.2, 1.4, 4.25]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.8, 6.9]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[-43.7, 1.4, 1.0]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 2.8, 0.3]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[-43.7, 1.4, 7.5]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 2.8, 0.3]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Expanded Server Room Floor */}
        <mesh position={[-43.6, 0.015, 4.25]} receiveShadow>
          <boxGeometry args={[5.2, 0.03, 6.5]} />
          <meshStandardMaterial color="#0b1324" roughness={0.65} />
        </mesh>
        {[-16, -2, 16].map((z) => (
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
        <mesh position={[-46.15, 1.6, 4.25]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[4.4, 1.5]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.25}
            transparent
            opacity={0.4}
            roughness={0.1}
          />
        </mesh>

        <mesh position={[0, 2.2, -22.95]}>
          <planeGeometry args={[18, 0.9]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
      </group>

      {/* ===================================================================== */}
      {/* 5. EXTERIOR FRONT WALLS (Cutaway in Iso 3D; Full-Height + Windows in Walk-3D) */}
      {/* ===================================================================== */}
      {isWalkMode ? (
        <group name="WalkModeExteriorEnclosure">
          {/* South Exterior Wall (z = 23.2) with South Entrance Doorway Gap (x in [-1.3, 1.3]) */}
          {[-12.5, 12.5].map((sx, idx) => (
            <group key={`south-ext-${idx}`} position={[sx, 0, 23.2]}>
              {/* Lower Knee Wall (0..0.9m) */}
              <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
                <boxGeometry args={[21.8, 0.9, 0.4]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              {/* Upper Header Beam (2.6..3.0m) */}
              <mesh position={[0, 2.8, 0]} castShadow>
                <boxGeometry args={[21.8, 0.4, 0.4]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              {/* Clear Panoramic Glass Window (0.9..2.6m) */}
              <mesh position={[0, 1.75, 0]}>
                <boxGeometry args={[21.6, 1.7, 0.08]} />
                <meshStandardMaterial
                  color="#bae6fd"
                  transparent
                  opacity={0.22}
                  roughness={0.08}
                  metalness={0.1}
                />
              </mesh>
              {/* Architectural Vertical Window Mullions */}
              {[-8, -4, 0, 4, 8].map((mx) => (
                <mesh key={`s-mul-${idx}-${mx}`} position={[mx, 1.75, 0]}>
                  <boxGeometry args={[0.14, 1.7, 0.2]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} />
                </mesh>
              ))}
            </group>
          ))}
          {/* Wellness Wing South Exterior Wall (x = -35, z = 23.2) */}
          <group position={[-35, 0, 23.2]}>
            <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
              <boxGeometry args={[12.4, 0.9, 0.4]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[0, 2.8, 0]} castShadow>
              <boxGeometry args={[12.4, 0.4, 0.4]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.75, 0]}>
              <boxGeometry args={[12.2, 1.7, 0.08]} />
              <meshStandardMaterial color="#bae6fd" transparent opacity={0.22} roughness={0.08} />
            </mesh>
            {[-4, 0, 4].map((mx) => (
              <mesh key={`ws-mul-${mx}`} position={[mx, 1.75, 0]}>
                <boxGeometry args={[0.14, 1.7, 0.2]} />
                <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} />
              </mesh>
            ))}
          </group>

          {/* East Exterior Wall (x = 23.2) with East Parking Doorway Gap (z in [-1.3, 1.3]) */}
          {[-12.5, 12.5].map((ez, idx) => (
            <group key={`east-ext-${idx}`} position={[23.2, 0, ez]}>
              <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.4, 0.9, 21.8]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              <mesh position={[0, 2.8, 0]} castShadow>
                <boxGeometry args={[0.4, 0.4, 21.8]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              <mesh position={[0, 1.75, 0]}>
                <boxGeometry args={[0.08, 1.7, 21.6]} />
                <meshStandardMaterial color="#bae6fd" transparent opacity={0.22} roughness={0.08} />
              </mesh>
              {[-8, -4, 0, 4, 8].map((mz) => (
                <mesh key={`e-mul-${idx}-${mz}`} position={[0, 1.75, mz]}>
                  <boxGeometry args={[0.2, 1.7, 0.14]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ) : (
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
      )}

      {/* Floating Neon Room Signs above Wellness Wing Doors */}
      <group name="WellnessFloatingSigns">
        {[
          { label: 'NAP ROOM', pos: [-28.8, 1.8, -16], color: '#818cf8', em: '#4f46e5' },
          { label: "MEN'S CR", pos: [-28.8, 1.8, -8], color: '#38bdf8', em: '#0284c7' },
          { label: "WOMEN'S CR", pos: [-28.8, 1.8, -2], color: '#f472b6', em: '#db2777' },
          { label: 'SERVER ROOM', pos: [-28.8, 1.8, 3.5], color: '#0ea5e9', em: '#0284c7' },
          { label: 'FACILITIES', pos: [-28.8, 1.8, 8.5], color: '#eab308', em: '#ca8a04' },
          { label: 'GRAND CAFETERIA', pos: [-28.8, 1.8, 16], color: '#fb923c', em: '#ea580c' },
        ].map((sign, idx) => (
          <group key={`sign-${idx}`} position={sign.pos as [number, number, number]} rotation={[0, Math.PI / 2, 0]}>
            {/* Sign Plate */}
            <mesh>
              <boxGeometry args={[2.0, 0.38, 0.06]} />
              <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Glowing Accent Border */}
            <mesh position={[0, 0, 0.035]}>
              <planeGeometry args={[1.85, 0.28]} />
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
      {/* 6. ENCLOSED INTERIOR WALLS & PARTITIONS WITH CLEAR DOORWAYS           */}
      {/* ===================================================================== */}
      <group name="InteriorPartitions">
        {[
          [-20, -8],
          [-12, -8],
          [-20, 8],
          [-12, 8],
          [20, -8],
          [12, -8],
          [20, 8],
          [12, 8],
        ].map(([px, pz], idx) => {
          const wallH = isWalkMode ? 3.0 : 1.0
          return (
            <group key={`part-${idx}`} position={[px, wallH / 2, pz]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[6, wallH, 0.3]} />
                <meshStandardMaterial color="#334155" roughness={0.8} />
              </mesh>
              {isWalkMode && (
                <mesh position={[0, wallH / 2 - 0.12, 0]}>
                  <boxGeometry args={[6.02, 0.08, 0.34]} />
                  <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.35} />
                </mesh>
              )}
            </group>
          )
        })}

        {/* Walk-3D Full-Height North-South Interior Partitions (x = -8, x = 8) */}
        {isWalkMode &&
          [
            [-8, -16, 14.0],
            [-8, 0, 13.6],
            [-8, 16, 14.0],
            [8, -16, 14.0],
            [8, 0, 13.6],
            [8, 16, 14.0],
            [-4.8, -8, 4.4],
            [4.8, -8, 4.4],
            [-4.8, 8, 4.4],
            [4.8, 8, 4.4],
          ].map(([wx, wz, len], idx) => {
            const isEW = idx >= 6
            return (
              <group key={`walk-wall-${idx}`} position={[wx, 1.5, wz]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={isEW ? [len, 3.0, 0.3] : [0.3, 3.0, len]} />
                  <meshStandardMaterial color="#334155" roughness={0.8} />
                </mesh>
                <mesh position={[0, 1.38, 0]}>
                  <boxGeometry args={isEW ? [len + 0.02, 0.08, 0.34] : [0.34, 0.08, len + 0.02]} />
                  <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.3} />
                </mesh>
              </group>
            )
          })}

        {/* Full-Height West Wing Room Dividing Walls (2.0m isometric, 3.0m Walk-3D) */}
        {(() => {
          const westWallH = isWalkMode ? 3.0 : 2.0
          const westWallY = westWallH / 2
          return (
            <>
              {/* 1. Nap Room / Men's CR Wall */}
              <mesh position={[-35, westWallY, -11]} castShadow receiveShadow>
                <boxGeometry args={[12, westWallH, 0.3]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              {/* 2. Men's CR / Women's CR Privacy Partition Wall */}
              <mesh position={[-35, westWallY, -5]} castShadow receiveShadow>
                <boxGeometry args={[12, westWallH, 0.3]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              {/* 3. Women's CR / Server Room Fire/Acoustic Wall */}
              <mesh position={[-37.5, westWallY, 1]} castShadow receiveShadow>
                <boxGeometry args={[17.2, westWallH, 0.3]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              {/* 4. Server Room / Facilities Enclosure Wall (shifted to z = 7.5 for expanded Server Room) */}
              <mesh position={[-37.5, westWallY, 7.5]} castShadow receiveShadow>
                <boxGeometry args={[17.2, westWallH, 0.3]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              {/* 5. Facilities / Grand Cafeteria Hygiene Wall */}
              <mesh position={[-35, westWallY, 11]} castShadow receiveShadow>
                <boxGeometry args={[12, westWallH, 0.3]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>

              {/* Wellness Corridor East Enclosure Wall (x = -28.9) with 6 Dedicated Doorways */}
              <mesh position={[-28.9, westWallY, -19.5]} castShadow receiveShadow>
                <boxGeometry args={[0.3, westWallH, 5.0]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              <mesh position={[-28.9, westWallY, -12]} castShadow receiveShadow>
                <boxGeometry args={[0.3, westWallH, 6.0]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              <mesh position={[-28.9, westWallY, -5]} castShadow receiveShadow>
                <boxGeometry args={[0.3, westWallH, 4.0]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              <mesh position={[-28.9, westWallY, 0.75]} castShadow receiveShadow>
                <boxGeometry args={[0.3, westWallH, 3.5]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              <mesh position={[-28.9, westWallY, 6.75]} castShadow receiveShadow>
                <boxGeometry args={[0.3, westWallH, 2.5]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              <mesh position={[-28.9, westWallY, 12.25]} castShadow receiveShadow>
                <boxGeometry args={[0.3, westWallH, 5.5]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              <mesh position={[-28.9, westWallY, 19.5]} castShadow receiveShadow>
                <boxGeometry args={[0.3, westWallH, 5.0]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
            </>
          )
        })()}

        {/* Interactive Hinged Room Doors (Swing 90° open/closed on [E] in Walk-3D) */}
        {DOOR_DEFINITIONS.map((door) => (
          <InteractiveDoorMesh
            key={door.id}
            door={door}
            isOpen={openDoors.has(door.id)}
            height={isWalkMode ? 2.5 : 1.9}
          />
        ))}
      </group>

      {/* ===================================================================== */}
      {/* 7. OUTDOOR LOW-POLY LANDSCAPING (Swaying Trees & Courtyard Bushes)    */}
      {/* ===================================================================== */}
      <group name="ExteriorDecor">
        {[
          [-48, -26], // Safely outside NW perimeter (Zero Bedroom clipping)
          [-14, -28],
          [14, -28],
          [28, -28],
          [-51, 0],   // Safely outside expanded Server Room West Bay
          [-48, 14],  // Safely outside SW cafeteria
          [-48, 25],
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

      {/* ===================================================================== */}
      {/* 8. WALK-MODE ACOUSTIC DROP CEILING & RECESSED LED STRIP GRID          */}
      {/*    (Hidden in Isometric 3D so top-down view stays 100% unobstructed)  */}
      {/* ===================================================================== */}
      {isWalkMode && (
        <group name="WalkModeCeilingGrid">
          {/* Main Building Acoustic Ceiling Deck */}
          <mesh position={[0, 3.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[46.4, 46.4]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {/* Wellness Wing Acoustic Ceiling Deck */}
          <mesh position={[-34, 3.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[19, 46.4]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {/* Linear Recessed LED Light Troffers (Reference Image 1 aesthetic) */}
          {[-18, -10, -2, 6, 14].map((lz) =>
            [-16, -6, 4, 14].map((lx) => (
              <mesh key={`led-panel-${lx}-${lz}`} position={[lx, 2.98, lz]}>
                <boxGeometry args={[4.2, 0.04, 0.45]} />
                <meshStandardMaterial
                  color="#f8fafc"
                  emissive="#e0f2fe"
                  emissiveIntensity={1.1}
                  roughness={0.2}
                />
              </mesh>
            ))
          )}
        </group>
      )}
    </group>
  )
}
