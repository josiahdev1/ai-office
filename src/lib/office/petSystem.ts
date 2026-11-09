/**
 * Office Pet System for EasyUp Headquarters
 * Simulates one pet per floor roaming the cutaway slab.
 * Pets are interactive: clicking pets them and spawns floating hearts.
 * Pets never block doorways or the elevator.
 */

import { FloorNumber, GridCoord, gridToScreen } from './map'
import { stepAgentTowardsTarget } from './pathfinding'

export interface OfficePet {
  id: string
  name: string
  kind: 'cat' | 'dog'
  breed: string
  floor: FloorNumber
  gx: number
  gy: number
  x: number
  y: number
  targetX: number
  targetY: number
  isWalking: boolean
  isSleeping: boolean
  facing: 'left' | 'right'
  hearts: Array<{ id: number; x: number; y: number; opacity: number }>
  walkTimer: number
}

// Dedicated roamable tiles per floor that never obstruct doorways or elevator (gx:8, gy:1..2)
const PET_ROAM_POINTS: Record<FloorNumber, GridCoord[]> = {
  0: [
    { gx: 2, gy: 6 },
    { gx: 3, gy: 7 },
    { gx: 14, gy: 3 },
    { gx: 15, gy: 4 },
    { gx: 8, gy: 15 },
    { gx: 9, gy: 14 },
    { gx: 4, gy: 10 },
  ],
  1: [
    { gx: 3, gy: 9 },
    { gx: 5, gy: 9 },
    { gx: 3, gy: 13 },
    { gx: 14, gy: 11 },
    { gx: 16, gy: 11 },
    { gx: 2, gy: 3 },
  ],
  2: [
    { gx: 14, gy: 7 },
    { gx: 16, gy: 7 },
    { gx: 14, gy: 11 },
    { gx: 2, gy: 6 },
    { gx: 3, gy: 7 },
    { gx: 4, gy: 8 },
  ],
  3: [
    { gx: 6, gy: 7 },
    { gx: 12, gy: 7 },
    { gx: 7, gy: 12 },
    { gx: 11, gy: 12 },
    { gx: 2, gy: 7 },
    { gx: 3, gy: 8 },
  ],
}

export function createInitialPets(): Record<FloorNumber, OfficePet> {
  const getScreen = (gx: number, gy: number) => gridToScreen(gx, gy)

  const gfScreen = getScreen(3, 7)
  const f1Screen = getScreen(3, 9)
  const f2Screen = getScreen(14, 7)
  const f3Screen = getScreen(7, 12)

  return {
    0: {
      id: 'pet-pixel',
      name: 'Pixel',
      kind: 'dog',
      breed: 'Golden Retriever',
      floor: 0,
      gx: 3,
      gy: 7,
      x: gfScreen.x,
      y: gfScreen.y,
      targetX: gfScreen.x,
      targetY: gfScreen.y,
      isWalking: false,
      isSleeping: false,
      facing: 'right',
      hearts: [],
      walkTimer: 8,
    },
    1: {
      id: 'pet-git',
      name: 'Git',
      kind: 'cat',
      breed: 'Tuxedo Cat',
      floor: 1,
      gx: 3,
      gy: 9,
      x: f1Screen.x,
      y: f1Screen.y,
      targetX: f1Screen.x,
      targetY: f1Screen.y,
      isWalking: false,
      isSleeping: true,
      facing: 'left',
      hearts: [],
      walkTimer: 12,
    },
    2: {
      id: 'pet-rust',
      name: 'Rust',
      kind: 'dog',
      breed: 'Corgi',
      floor: 2,
      gx: 14,
      gy: 7,
      x: f2Screen.x,
      y: f2Screen.y,
      targetX: f2Screen.x,
      targetY: f2Screen.y,
      isWalking: false,
      isSleeping: false,
      facing: 'right',
      hearts: [],
      walkTimer: 7,
    },
    3: {
      id: 'pet-byte',
      name: 'Byte',
      kind: 'cat',
      breed: 'Calico Cat',
      floor: 3,
      gx: 7,
      gy: 12,
      x: f3Screen.x,
      y: f3Screen.y,
      targetX: f3Screen.x,
      targetY: f3Screen.y,
      isWalking: false,
      isSleeping: true,
      facing: 'right',
      hearts: [],
      walkTimer: 14,
    },
  }
}

export function updatePetPhysics(pet: OfficePet, dt: number, speed = 42): void {
  // Update floating hearts
  if (pet.hearts.length > 0) {
    pet.hearts = pet.hearts
      .map((h) => ({
        ...h,
        y: h.y - 35 * dt,
        opacity: h.opacity - 0.7 * dt,
      }))
      .filter((h) => h.opacity > 0)
  }

  // Walk timer countdown
  pet.walkTimer -= dt
  if (pet.walkTimer <= 0) {
    pet.walkTimer = 6 + Math.random() * 8
    const points = PET_ROAM_POINTS[pet.floor]
    const nextSpot = points[Math.floor(Math.random() * points.length)]
    pet.gx = nextSpot.gx
    pet.gy = nextSpot.gy
    const screen = gridToScreen(nextSpot.gx, nextSpot.gy)
    pet.targetX = screen.x
    pet.targetY = screen.y
    pet.isWalking = true
    pet.isSleeping = false
  }

  if (pet.isWalking) {
    const step = stepAgentTowardsTarget(
      { x: pet.x, y: pet.y },
      { x: pet.targetX, y: pet.targetY },
      speed,
      dt,
      3.0
    )
    pet.x = step.next.x
    pet.y = step.next.y
    if (step.dx !== 0) pet.facing = step.dx > 0 ? 'right' : 'left'

    if (step.arrived) {
      pet.isWalking = false
      // 40% chance to sleep after walk
      pet.isSleeping = Math.random() < 0.4
    }
  }
}
