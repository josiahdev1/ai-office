'use client'

import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { DepartmentMode, CAMERA_PRESETS } from './office3DData'

export interface CameraControllerProps {
  mode: DepartmentMode
}

export function CameraController({ mode }: CameraControllerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  // Desired target & zoom
  const targetVec = useRef(new THREE.Vector3(0, 0, 0))
  const targetZoom = useRef(28)

  useEffect(() => {
    const preset = CAMERA_PRESETS[mode] || CAMERA_PRESETS.OVERVIEW
    targetVec.current.set(preset.target[0], preset.target[1], preset.target[2])
    targetZoom.current = preset.zoom
  }, [mode])

  useFrame((state, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    // Smooth lerp damping factor
    const factor = Math.min(delta * 4.0, 1.0)

    // Lerp controls target
    controls.target.lerp(targetVec.current, factor)

    // Lerp orthographic zoom
    const orthoCam = state.camera as THREE.OrthographicCamera
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
      maxZoom={85}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.15}
    />
  )
}
