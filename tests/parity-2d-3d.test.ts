import { describe, it, expect } from 'vitest'
import {
  ROOMS_3D,
  AGENT_WORKSTATIONS_3D,
  CAMERA_PRESETS,
  PARKED_VEHICLES,
  HIGHWAY_CARS,
  STREETLIGHT_POSITIONS,
  getAgentTargetPosition,
  projectIso3DTo2D,
} from '@/config/officeLayout'
import {
  getCharacterStyle,
  getAgentStatusBadge,
} from '@/config/characterStyles'
import {
  computeAStarWaypoints,
  stepAgentNavigation,
  AgentNavState,
} from '@/config/walkwayGrid'
import {
  formatPHTTime,
  mapDbStatusToAgentStatus,
  mapAgentStatusToDbStatus,
} from '@/lib/office/db-map'

describe('2D == 3D Architectural, Pathfinding & Character Parity', () => {
  it('defines architectural rooms in the 3x3 layout with The Brain at [0, 0, 0] plus wellness wing', () => {
    const roomKeys = Object.keys(ROOMS_3D)
    expect(roomKeys.length).toBeGreaterThanOrEqual(9)
    expect(ROOMS_3D.COMMAND.center).toEqual([0, 0, 0])
    expect(ROOMS_3D.ENGINEERING.center).toEqual([-16, 0, -16])
    expect(ROOMS_3D.PANTRY.center).toEqual([-16, 0, 16])
    expect(ROOMS_3D.GYM.center).toEqual([0, 0, 16])
    expect(ROOMS_3D.INTELLIGENCE.center).toEqual([16, 0, 16])
  })

  it('preserves database agents (including Boss & Cleaners) with complete mode coordinates and individual route overrides', () => {
    const agents = Object.values(AGENT_WORKSTATIONS_3D)
    expect(agents.length).toBeGreaterThanOrEqual(24)

    for (const ag of agents) {
      expect(ag.deskPos).toHaveLength(3)
      expect(ag.allHandsPos).toHaveLength(3)
      expect(ag.pantryPos).toHaveLength(3)
      expect(ag.gymPos).toHaveLength(3)
      expect(['SE', 'SW', 'NE', 'NW']).toContain(ag.facing)

      expect(getAgentTargetPosition(ag, 'OVERVIEW')).toEqual(ag.deskPos)
      expect(getAgentTargetPosition(ag, 'OVERVIEW', 'PANTRY')).toEqual(ag.pantryPos)
      expect(getAgentTargetPosition(ag, 'OVERVIEW', 'GYM')).toEqual(ag.gymPos)
      expect(getAgentTargetPosition(ag, 'OVERVIEW', 'ALL_HANDS')).toEqual(ag.allHandsPos)
    }
  })

  it('provides outdoor campus highway cars, parked vehicles, and streetlights', () => {
    expect(PARKED_VEHICLES.length).toBeGreaterThanOrEqual(6)
    expect(HIGHWAY_CARS.length).toBeGreaterThanOrEqual(6)
    expect(STREETLIGHT_POSITIONS.length).toBeGreaterThanOrEqual(8)
    expect(CAMERA_PRESETS.OVERVIEW.zoom).toBe(13.5)

    const centerProj = projectIso3DTo2D(-6.5, 0, 0, -6.5, 0, 13.5, 1000, 800)
    expect(centerProj.px).toBeCloseTo(500, 3)
    expect(centerProj.py).toBeCloseTo(400, 3)
  })

  it('executes 3-phase A* navigation (standing_up -> walking -> arrival) without teleporting', () => {
    // Path from Josiah's Engineering desk (-19, -19) to Pantry (-20, 13.2)
    const waypoints = computeAStarWaypoints(-19, -19, -20, 13.2)
    expect(waypoints.length).toBeGreaterThan(1)
    const lastWp = waypoints[waypoints.length - 1]
    expect(lastWp[0]).toBeCloseTo(-20, 1)
    expect(lastWp[2]).toBeCloseTo(13.2, 1)

    const nav: AgentNavState = {
      currentPos: [-19, 0, -19],
      targetPos: [-19, 0, -19],
      waypoints: [],
      pathQueue: [],
      waypointIndex: 0,
      rotationY: 0,
      subState: 'seated',
      walkPhase: 0,
    }

    // Phase 1: Trigger walk from seated -> enters 'standing_up' for 250ms
    stepAgentNavigation(nav, [-20, 0, 13.2], 0, false, 0.1, 3.6, 0, undefined, 0)
    expect(nav.subState).toBe('standing_up')
    expect(nav.pathQueue.length).toBeGreaterThan(5)

    // Phase 2: After 250ms stand-up completes -> enters 'walking' and moves smoothly along pathQueue
    stepAgentNavigation(nav, [-20, 0, 13.2], 0, false, 0.2, 3.6, 0, undefined, 0)
    stepAgentNavigation(nav, [-20, 0, 13.2], 0, false, 0.1, 3.6, 0, undefined, 0)
    expect(nav.subState).toBe('walking')
    expect(nav.isWalking).toBe(true)

    // Step multiple times to pop the first waypoint and verify it NEVER snaps to final targetPos (13.2)
    for (let i = 0; i < 6; i++) {
      stepAgentNavigation(nav, [-20, 0, 13.2], 0, false, 0.1, 3.6, 0, undefined, 0)
    }
    expect(nav.subState).toBe('walking')
    const distFromStart = Math.hypot(nav.currentPos[0] - -19, nav.currentPos[2] - -19)
    expect(distFromStart).toBeGreaterThan(0.5)
    expect(distFromStart).toBeLessThan(8.0)
    expect(nav.currentPos[2]).toBeLessThan(0) // Still in north half of building, NOT snapped to z=13.2!
  })

  it('formats PHT timestamps accurately and preserves routing statuses in db-map', () => {
    const pht = formatPHTTime(new Date())
    expect(pht).toMatch(/PHT$/)
    expect(mapDbStatusToAgentStatus('at_gym')).toBe('at_gym')
    expect(mapDbStatusToAgentStatus('on_break')).toBe('on_break')
    expect(mapDbStatusToAgentStatus('in_meeting')).toBe('in_meeting')
    expect(mapAgentStatusToDbStatus('at_gym')).toBe('at_gym')
    expect(mapAgentStatusToDbStatus('on_break')).toBe('on_break')
  })

  it('assigns distinct gender, hair, outfit, and status dot colors across the roster', () => {
    const josiah = getCharacterStyle('josiah', 'Josiah')
    const maryGrace = getCharacterStyle('mary_grace', 'Mary Grace')
    const gloria = getCharacterStyle('gloria', 'Gloria')
    const judith = getCharacterStyle('judith', 'Judith')

    expect(josiah.gender).toBe('male')
    expect(josiah.accessory).toBe('cap')
    expect(maryGrace.gender).toBe('female')
    expect(maryGrace.hairStyle).toBe('long')
    expect(gloria.gender).toBe('female')
    expect(gloria.hairStyle).toBe('ponytail')
    expect(judith.gender).toBe('female')

    expect(getAgentStatusBadge('working', 'OVERVIEW').dotHex).toBe('#22c55e')
    expect(getAgentStatusBadge('awaiting_approval', 'OVERVIEW').dotHex).toBe('#f97316')
    expect(getAgentStatusBadge('working', 'ALL_HANDS').dotHex).toBe('#3b82f6')
    expect(getAgentStatusBadge('on_break', 'PANTRY').dotHex).toBe('#eab308')
    expect(getAgentStatusBadge('on_break', 'GYM').dotHex).toBe('#ec4899')
  })
})
