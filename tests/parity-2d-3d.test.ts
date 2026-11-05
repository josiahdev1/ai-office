import { describe, it, expect } from 'vitest'
import {
  ROOMS_3D,
  AGENT_WORKSTATIONS_3D,
  CAMERA_PRESETS,
  getAgentTargetPosition,
  projectIso3DTo2D,
} from '@/config/officeLayout'

describe('2D == 3D Architectural & Behavioral Parity (officeLayout.ts)', () => {
  it('defines all 9 architectural rooms in the 3x3 layout with The Brain at [0, 0, 0]', () => {
    const roomKeys = Object.keys(ROOMS_3D)
    expect(roomKeys).toHaveLength(9)
    expect(ROOMS_3D.COMMAND.center).toEqual([0, 0, 0])
    expect(ROOMS_3D.ENGINEERING.center).toEqual([-16, 0, -16])
    expect(ROOMS_3D.PANTRY.center).toEqual([-16, 0, 16])
    expect(ROOMS_3D.GYM.center).toEqual([0, 0, 16])
    expect(ROOMS_3D.INTELLIGENCE.center).toEqual([16, 0, 16])
  })

  it('preserves all 24 database agents with complete mode coordinates (desk, allHands, pantry, gym)', () => {
    const agents = Object.values(AGENT_WORKSTATIONS_3D)
    expect(agents).toHaveLength(24)

    for (const ag of agents) {
      expect(ag.deskPos).toHaveLength(3)
      expect(ag.allHandsPos).toHaveLength(3)
      expect(ag.pantryPos).toHaveLength(3)
      expect(ag.gymPos).toHaveLength(3)
      expect(['SE', 'SW', 'NE', 'NW']).toContain(ag.facing)

      expect(getAgentTargetPosition(ag, 'OVERVIEW')).toEqual(ag.deskPos)
      expect(getAgentTargetPosition(ag, 'FOCUS_WORK')).toEqual(ag.deskPos)
      expect(getAgentTargetPosition(ag, 'ALL_HANDS')).toEqual(ag.allHandsPos)
      expect(getAgentTargetPosition(ag, 'PANTRY')).toEqual(ag.pantryPos)
      expect(getAgentTargetPosition(ag, 'GYM')).toEqual(ag.gymPos)
    }
  })

  it('provides synchronized camera presets for all 5 modes and accurate isometric projection', () => {
    expect(CAMERA_PRESETS.OVERVIEW.zoom).toBe(20)
    expect(CAMERA_PRESETS.FOCUS_WORK.target).toEqual([-8, 0, -14])
    expect(CAMERA_PRESETS.ALL_HANDS.target).toEqual([0, 0, 0])
    expect(CAMERA_PRESETS.PANTRY.target).toEqual([-16, 0, 16])
    expect(CAMERA_PRESETS.GYM.target).toEqual([0, 0, 16])

    const centerProj = projectIso3DTo2D(0, 0, 0, 0, 0, 20, 1000, 800)
    expect(centerProj.px).toBeCloseTo(500, 3)
    expect(centerProj.py).toBeCloseTo(400, 3)
  })
})
