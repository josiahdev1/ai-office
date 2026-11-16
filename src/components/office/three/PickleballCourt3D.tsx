'use client'

import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createInitialRallyState,
  stepPickleballRally,
} from '@/lib/office/pickleballSimulation'

function createCourtLabelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.font = 'bold 34px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('PICKLEBALL COURT', canvas.width / 2, canvas.height / 2)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

export function PickleballCourt3D({
  activePlayerIds = [],
}: {
  activePlayerIds?: string[]
}) {
  const ballRef = useRef<THREE.Mesh>(null)
  const ballShadowRef = useRef<THREE.Mesh>(null)
  const rallyRef = useRef(createInitialRallyState([]))
  const labelTex = useMemo(() => createCourtLabelTexture(), [])

  useFrame((_, delta) => {
    rallyRef.current.activePlayers = activePlayerIds.slice(0, 4)
    const state = stepPickleballRally(rallyRef.current, delta)
    if (ballRef.current) {
      ballRef.current.visible = state.ballVisible
      ballRef.current.position.set(
        state.ballPos[0],
        state.ballPos[1],
        state.ballPos[2]
      )
    }
    if (ballShadowRef.current) {
      ballShadowRef.current.visible = state.ballVisible
      ballShadowRef.current.position.set(state.ballPos[0], 0.055, state.ballPos[2])
      const scale = Math.max(0.45, 1.15 - state.ballPos[1] * 0.25)
      ballShadowRef.current.scale.set(scale, scale, 1)
    }
  })

  return (
    <group name="PickleballCourtComplex">
      {/* Concrete Walkway connecting North Garden Gate (0, -23.2) to Pickleball Court (-16, -27) */}
      <mesh position={[-8, 0.01, -25.2]} receiveShadow>
        <boxGeometry args={[20, 0.04, 3.2]} />
        <meshStandardMaterial color="#475569" roughness={0.85} />
      </mesh>

      {/* Court Complex Centered at [-16, 0, -33] */}
      <group position={[-16, 0, -33]}>
        {/* Teal Outer Apron (16m x 12m) */}
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <boxGeometry args={[16, 0.04, 12]} />
          <meshStandardMaterial color="#0d9488" roughness={0.75} />
        </mesh>

        {/* Blue Inner Playing Court (13.4m x 6.1m) */}
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <boxGeometry args={[13.4, 0.02, 6.1]} />
          <meshStandardMaterial color="#2563eb" roughness={0.65} />
        </mesh>

      {/* Green Non-Volley ("Kitchen") Strips beside the Net (p02, p05 reference) */}
        <mesh position={[0, 0.072, 0]} receiveShadow>
          <boxGeometry args={[4.26, 0.008, 6.06]} />
          <meshStandardMaterial
            color="#22c55e"
            roughness={0.65}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>

        {/* Crisp White Court Lines */}
        {/* North & South Sidelines */}
        <mesh position={[0, 0.078, -3.02]}>
          <boxGeometry args={[13.4, 0.01, 0.08]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, 0.078, 3.02]}>
          <boxGeometry args={[13.4, 0.01, 0.08]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        {/* West & East Baselines */}
        <mesh position={[-6.67, 0.078, 0]}>
          <boxGeometry args={[0.08, 0.01, 6.1]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[6.67, 0.078, 0]}>
          <boxGeometry args={[0.08, 0.01, 6.1]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        {/* Non-Volley ("Kitchen") Lines (±2.13m from net) */}
        <mesh position={[-2.13, 0.078, 0]}>
          <boxGeometry args={[0.07, 0.01, 6.06]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[2.13, 0.078, 0]}>
          <boxGeometry args={[0.07, 0.01, 6.06]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        {/* Center Service Lines */}
        <mesh position={[-4.4, 0.078, 0]}>
          <boxGeometry args={[4.54, 0.01, 0.07]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[4.4, 0.078, 0]}>
          <boxGeometry args={[4.54, 0.01, 0.07]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>

        {/* PICKLEBALL COURT Ground Label */}
        <mesh position={[0, 0.082, 4.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6.4, 1.2]} />
          <meshBasicMaterial map={labelTex} transparent />
        </mesh>

        {/* Center Net & Steel Posts */}
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.48, -3.25]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.96, 10]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.48, 3.25]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.96, 10]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
          {/* Net Mesh */}
          <mesh position={[0, 0.46, 0]} castShadow>
            <boxGeometry args={[0.04, 0.84, 6.45]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={0.78} roughness={0.9} />
          </mesh>
          {/* White Top Net Tape */}
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.06, 0.07, 6.5]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
        </group>

        {/* Spectator Wooden Benches (North & South Sidelines) */}
        {[-5.1, 5.1].map((bz, idx) => (
          <group key={`pb-bench-${idx}`} position={[0, 0, bz]}>
            <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
              <boxGeometry args={[5.4, 0.08, 0.55]} />
              <meshStandardMaterial color="#b45309" roughness={0.7} />
            </mesh>
            {[-2.2, 2.2].map((lx, lidx) => (
              <mesh key={`pb-leg-${lidx}`} position={[lx, 0.21, 0]} castShadow>
                <boxGeometry args={[0.14, 0.42, 0.45]} />
                <meshStandardMaterial color="#1e293b" metalness={0.7} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Glowing Green Corner Lamps (p02, p05 reference) */}
        {[
          [-7.5, -5.5],
          [7.5, -5.5],
          [-7.5, 5.5],
          [7.5, 5.5],
        ].map(([lx, lz], idx) => (
          <group key={`pb-lamp-${idx}`} position={[lx, 0, lz]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.35, 0.7, 0.35]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.78, 0]}>
              <boxGeometry args={[0.28, 0.22, 0.28]} />
              <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={1.4} />
            </mesh>
          </group>
        ))}

        {/* Ball Basket beside South Sideline Bench */}
        <group position={[-5.5, 0, 5.4]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.2, 0.42, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.44, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#bef264" />
          </mesh>
        </group>

        {/* Low White Perimeter Railing with 2.4m South Entrance Passage Gap */}
        <mesh position={[0, 0.55, -5.95]} castShadow>
          <boxGeometry args={[15.8, 0.12, 0.1]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[-7.95, 0.55, 0]} castShadow>
          <boxGeometry args={[0.1, 0.12, 11.9]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[7.95, 0.55, 0]} castShadow>
          <boxGeometry args={[0.1, 0.12, 11.9]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {[-4.75, 4.75].map((sx, idx) => (
          <mesh key={`pb-south-rail-${idx}`} position={[sx, 0.55, 5.95]} castShadow>
            <boxGeometry args={[6.3, 0.12, 0.1]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Live Animated Pickleball & Soft Ground Shadow */}
      <mesh ref={ballRef} position={[-20, 0.9, -34.8]} castShadow>
        <sphereGeometry args={[0.09, 14, 14]} />
        <meshStandardMaterial
          color="#bef264"
          emissive="#a3e635"
          emissiveIntensity={0.45}
          roughness={0.35}
        />
      </mesh>
      <mesh ref={ballShadowRef} position={[-20, 0.055, -34.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 16]} />
        <meshBasicMaterial color="#090d16" transparent opacity={0.35} />
      </mesh>
    </group>
  )
}
