'use client'

import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { DepartmentMode, CAMERA_PRESETS } from './office3DData'

export type CameraViewMode = 'isometric' | 'walk'

export interface CameraControllerProps {
  mode: DepartmentMode
  isDivingToJarvis?: boolean
  cameraViewMode?: CameraViewMode
  zoomStep?: { delta: number; nonce: number }
}

export function CameraController({
  mode,
  isDivingToJarvis = false,
  cameraViewMode = 'isometric',
  zoomStep,
}: CameraControllerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { gl } = useThree()

  // Desired target & zoom for Isometric Orthographic mode
  const targetVec = useRef(new THREE.Vector3(-7.5, 0, 0))
  const targetZoom = useRef(11.5)
  const userZoomOffsetRef = useRef(0)

  // Saved exact camera state prior to Jarvis dive so Exit/Esc restores the exact spot
  const savedCameraRef = useRef<{
    target: THREE.Vector3
    position: THREE.Vector3
    zoom: number
  } | null>(null)
  const wasDivingRef = useRef(false)

  // First-person Walk-Inside state (Eye-level y = 1.65m)
  const walkKeysRef = useRef<Record<string, boolean>>({})
  const walkAnglesRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: -0.04 })
  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    if (isDivingToJarvis) return
    const preset = CAMERA_PRESETS[mode] || CAMERA_PRESETS.OVERVIEW
    targetVec.current.set(preset.target[0], preset.target[1], preset.target[2])
    targetZoom.current = preset.zoom
    userZoomOffsetRef.current = 0
  }, [mode, isDivingToJarvis])

  useEffect(() => {
    if (!zoomStep || zoomStep.nonce === 0) return
    userZoomOffsetRef.current = Math.max(
      -6,
      Math.min(45, userZoomOffsetRef.current + zoomStep.delta)
    )
  }, [zoomStep])

  // Keyboard & mouse-look bindings for Walk-Inside 3D mode
  useEffect(() => {
    if (cameraViewMode !== 'walk') {
      walkKeysRef.current = {}
      isDraggingRef.current = false
      return
    }

    // Reset yaw/pitch facing North (-Z) toward THE BRAIN when entering Walk Mode
    walkAnglesRef.current = { yaw: 0, pitch: -0.04 }

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      walkKeysRef.current[e.code] = true
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      walkKeysRef.current[e.code] = false
    }

    const dom = gl.domElement
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
    }
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - lastPointerRef.current.x
      const dy = e.clientY - lastPointerRef.current.y
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      walkAnglesRef.current.yaw -= dx * 0.0035
      walkAnglesRef.current.pitch = Math.max(
        -0.65,
        Math.min(0.55, walkAnglesRef.current.pitch - dy * 0.003)
      )
    }
    const handlePointerUp = () => {
      isDraggingRef.current = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    dom.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      dom.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [cameraViewMode, gl.domElement])

  useFrame((state, delta) => {
    // Walk-Inside Eye-Level Perspective Mode
    if (cameraViewMode === 'walk') {
      const cam = state.camera as THREE.PerspectiveCamera
      const keys = walkKeysRef.current
      const { yaw, pitch } = walkAnglesRef.current

      const forwardX = -Math.sin(yaw)
      const forwardZ = -Math.cos(yaw)
      const rightX = Math.cos(yaw)
      const rightZ = -Math.sin(yaw)

      let moveX = 0
      let moveZ = 0
      if (keys.KeyW || keys.ArrowUp) {
        moveX += forwardX
        moveZ += forwardZ
      }
      if (keys.KeyS || keys.ArrowDown) {
        moveX -= forwardX
        moveZ -= forwardZ
      }
      if (keys.KeyD || keys.ArrowRight) {
        moveX += rightX
        moveZ += rightZ
      }
      if (keys.KeyA || keys.ArrowLeft) {
        moveX -= rightX
        moveZ -= rightZ
      }

      const len = Math.hypot(moveX, moveZ)
      if (len > 0.001) {
        const speed = 5.5 * Math.min(delta, 0.05)
        const nextX = Math.max(-45, Math.min(22, cam.position.x + (moveX / len) * speed))
        const nextZ = Math.max(-22, Math.min(22, cam.position.z + (moveZ / len) * speed))
        cam.position.set(nextX, 1.65, nextZ)
      } else {
        cam.position.y = 1.65
      }

      const lookTarget = new THREE.Vector3(
        cam.position.x + forwardX * 5,
        cam.position.y + Math.sin(pitch) * 5,
        cam.position.z + forwardZ * 5
      )
      cam.lookAt(lookTarget)
      return
    }

    // Standard Isometric Orthographic Mode
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

    // For OVERVIEW mode, calculate dynamic responsive auto-fit zoom based on viewport size
    if (!isDivingToJarvis && (mode === 'OVERVIEW' || !CAMERA_PRESETS[mode])) {
      const w = state.size.width
      const h = state.size.height
      const fitZoom = Math.min(12.5, Math.max(8.0, Math.min(w / 140, h / 72)))
      targetZoom.current = Math.max(7.5, Math.min(60, fitZoom + userZoomOffsetRef.current))
      targetVec.current.set(-7.5, 0, 0)
    } else if (!isDivingToJarvis) {
      const preset = CAMERA_PRESETS[mode] || CAMERA_PRESETS.OVERVIEW
      targetZoom.current = Math.max(8, Math.min(80, preset.zoom + userZoomOffsetRef.current))
    }

    const speed = isDivingToJarvis ? 6.5 : 4.5
    const factor = Math.min(delta * speed, 1.0)

    controls.target.lerp(targetVec.current, factor)

    if (orthoCam && typeof orthoCam.zoom === 'number') {
      orthoCam.zoom += (targetZoom.current - orthoCam.zoom) * factor
      orthoCam.updateProjectionMatrix()
    }

    controls.update()
  })

  if (cameraViewMode === 'walk') {
    return null
  }

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minZoom={7}
      maxZoom={95}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.15}
    />
  )
}
