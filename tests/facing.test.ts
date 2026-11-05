import { describe, it, expect } from 'vitest'
import {
  calculateWalkingFacing,
  getFacingToward,
  calculateFacingBetweenPoints,
  ASSIGNED_DESKS,
  gridToScreen,
} from '../src/lib/office/map'
import { FacingDirection } from '../src/components/office/types'
import { validateChairFacings } from '../src/lib/office/validateMap'

describe('Agent Facing Direction Model (Phase 14)', () => {
  describe('Walking facing derived from movement vector', () => {
    it('should derive SE when moving down-right (+x isometric screen)', () => {
      // Vector (+32, +16) is along +gx axis
      const facing = calculateWalkingFacing(32, 16)
      expect(facing).toBe('SE')
    })

    it('should derive SW when moving down-left (-x, +y isometric screen)', () => {
      // Vector (-32, +16) is along +gy axis
      const facing = calculateWalkingFacing(-32, 16)
      expect(facing).toBe('SW')
    })

    it('should derive NE when moving up-right (+x, -y isometric screen)', () => {
      // Vector (+32, -16) is along -gy axis
      const facing = calculateWalkingFacing(32, -16)
      expect(facing).toBe('NE')
    })

    it('should derive NW when moving up-left (-x, -y isometric screen)', () => {
      // Vector (-32, -16) is along -gx axis
      const facing = calculateWalkingFacing(-32, -16)
      expect(facing).toBe('NW')
    })

    it('should maintain current facing when movement delta is negligible (< 0.5px)', () => {
      const currentFacing: FacingDirection = 'NE'
      const facing = calculateWalkingFacing(0.2, 0.1, currentFacing)
      expect(facing).toBe('NE')
    })

    it('should apply hysteresis threshold to avoid jitter when moving along diagonals', () => {
      // When walking near a 45-degree angle in screen space, it shouldn't randomly flip
      const facing1 = calculateWalkingFacing(10, 0, 'SE')
      expect(facing1).toBe('SE')

      const facing2 = calculateWalkingFacing(10, 0, 'NE')
      expect(facing2).toBe('NE')
    })
  })

  describe('Seated at desk facing derived from chair data', () => {
    it('should enforce that every seated agent facing matches chair data and points at monitor', () => {
      const errors = validateChairFacings(ASSIGNED_DESKS)
      expect(errors).toEqual([])
    })

    it('should calculate correct facing toward monitor for all 4 orientations', () => {
      // NW: chair at (3, 10), desk at (2, 10)
      expect(getFacingToward(3, 10, 2, 10)).toBe('NW')

      // NE: chair at (2, 15), desk at (2, 14)
      expect(getFacingToward(2, 15, 2, 14)).toBe('NE')

      // SE: chair at (13, 12), desk at (14, 12)
      expect(getFacingToward(13, 12, 14, 12)).toBe('SE')

      // SW: chair at (5, 5), desk at (5, 6)
      expect(getFacingToward(5, 5, 5, 6)).toBe('SW')
    })
  })

  describe('Conversation facing: participants face each other', () => {
    it('should orient two talking agents toward each other based on screen positions', () => {
      const agentA = { x: 500, y: 300 }
      const agentB = { x: 600, y: 350 } // Down-right (+dx, +dy) relative to A

      const facingA = calculateFacingBetweenPoints(agentA.x, agentA.y, agentB.x, agentB.y)
      const facingB = calculateFacingBetweenPoints(agentB.x, agentB.y, agentA.x, agentA.y)

      expect(facingA).toBe('SE')
      expect(facingB).toBe('NW')
    })

    it('should orient talking agents when one is up-right of the other', () => {
      const agentA = { x: 500, y: 400 }
      const agentB = { x: 600, y: 350 } // Up-right (+dx, -dy) relative to A

      const facingA = calculateFacingBetweenPoints(agentA.x, agentA.y, agentB.x, agentB.y)
      const facingB = calculateFacingBetweenPoints(agentB.x, agentB.y, agentA.x, agentA.y)

      expect(facingA).toBe('NE')
      expect(facingB).toBe('SW')
    })
  })

  describe('Regression: FOCUS_WORK facing verification', () => {
    it('in FOCUS_WORK, every seated agent must face its monitor', () => {
      ASSIGNED_DESKS.forEach((desk) => {
        const chairPos = gridToScreen(desk.chairGx, desk.chairGy)
        const deskPos = gridToScreen(desk.deskGx, desk.deskGy)

        const calculatedFacing = getFacingToward(
          desk.chairGx,
          desk.chairGy,
          desk.deskGx,
          desk.deskGy
        )

        // Chair's defined facing must match the geometric vector toward the desk
        expect(desk.facing).toBe(calculatedFacing)

        // Screen coordinate vector must also align with the facing direction
        const screenFacing = calculateFacingBetweenPoints(
          chairPos.x,
          chairPos.y,
          deskPos.x,
          deskPos.y
        )
        expect(desk.facing).toBe(screenFacing)
      })
    })

    it('should have 0 agents facing away from their desk when seated in FOCUS_WORK', () => {
      const invalidAgents = ASSIGNED_DESKS.filter((desk) => {
        const expected = getFacingToward(
          desk.chairGx,
          desk.chairGy,
          desk.deskGx,
          desk.deskGy
        )
        return desk.facing !== expected
      })
      expect(invalidAgents).toEqual([])
    })
  })
})
