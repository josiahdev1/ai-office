'use client'

import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { DepartmentMode, CAMERA_PRESETS } from './office3DData'

export interface CameraControllerProps {
  mode: DepartmentMode
  isDivingToJarvis?: boolean
}

export function CameraController({
  mode,
  isDivingToJarvis = false,
}: CameraControllerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  // Desired target & zoom
  const targetVec = useRef(new THREE.Vector3(0, 0, 0))
  const targetZoom = useRef(28)

  // Saved exact camera state prior to Jarvis dive so Exit/Esc restores the exact spot
  const savedCameraRef = useRef<{
    target: THREE.Vector3
    position: THREE.Vector3
    zoom: number
  } | null>(null)
  const wasDivingRef = useRef(false)

  useEffect(() => {
    if (isDivingToJarvis) return
    const preset = CAMERA_PRESETS[mode] || CAMERA_PRESETS.OVERVIEW
    targetVec.current.set(preset.target[0], preset.target[1], preset.target[2])
    targetZoom.current = preset.zoom
  }, [mode, isDivingToJarvis])

  useFrame((state, delta) => {
    const controls = controlsRef.current
    if (!controls) return
    const orthoCam = state.camera as THREE.OrthographicCamera

    if (isDivingToJarvis && !wasDivingRef.current) {
      wasDivingRef.current = true
      savedCameraRef.current = {
        target: controls.target.clone(),
        position: state.camera.position.clone(),
        zoom: orthoCam && typeof orthoCam.zoom === 'number' ? orthoCam.zoom : 20,
      }
      targetVec.current.set(0, 1.9, 0)
      targetZoom.current = 82
    } else if (!isDivingToJarvis && wasDivingRef.current) {
      wasDivingRef.current = false
      if (savedCameraRef.current) {
        targetVec.current.copy(savedCameraRef.current.target)
        state.camera.position.copy(savedCameraRef.current.position)
        targetZoom.current = savedCameraRef.current.zoom
      } else {
        const preset = CAMERA_PRESETS[mode] || CAMERA_PRESETS.OVERVIEW
        targetVec.current.set(preset.target[0], preset.target[1], preset.target[2])
        targetZoom.current = preset.zoom
      }
    }

    // Faster lerp during cinematic fly-in/out (~1.5s)
    const speed = isDivingToJarvis ? 6.5 : 4.5
    const factor = Math.min(delta * speed, 1.0)

    controls.target.lerp(targetVec.current, factor)

    if (orthoCam && typeof orthoCam.zoom === 'number') {
      orthoCam.zoom += (targetZoom.current - orthoCam.zoom) * factor
      orthoCam.updateProjectionMatrix()
    }

    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minZoom={18}
      maxZoom={95}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.15}
    />
  )
}
