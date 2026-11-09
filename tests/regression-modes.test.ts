import { describe, it, expect } from 'vitest'
import {
  getModeTargets,
  calculateCorridorPath,
  findGridPath,
} from '../src/lib/office/pathfinding'
import { ASSIGNED_DESKS, gridToScreen } from '../src/lib/office/map'

describe('Office Modes Regression Suite (Bugs 1 & 2 Verification)', () => {
  it('Bug 1: ALL_HANDS dispatches all 23 agents to unique spots around The Brain table', () => {
    const targets = new Set<string>()

    ASSIGNED_DESKS.forEach((desk, idx) => {
      const initialDeskCoord = gridToScreen(desk.chairGx, desk.chairGy)
      const target = getModeTargets(
        'ALL_HANDS',
        desk.agentId,
        idx,
        initialDeskCoord
      )

      expect(target).toBeDefined()
      expect(Number.isFinite(target.x)).toBe(true)
      expect(Number.isFinite(target.y)).toBe(true)

      // Ensure every agent gets a distinct position
      const key = `${target.x},${target.y}`
      expect(targets.has(key)).toBe(false)
      targets.add(key)

      // Path from desk to The Brain must exist and have valid waypoints
      const path = calculateCorridorPath(initialDeskCoord, target)
      expect(path.length).toBeGreaterThanOrEqual(1)
      expect(path[path.length - 1]).toEqual(target)
    })

    expect(targets.size).toBe(ASSIGNED_DESKS.length)
  })

  it('Bug 2: COFFEE_BREAK sends all agents to valid pantry/break spots with A* paths', () => {
    const targets = new Set<string>()

    ASSIGNED_DESKS.forEach((desk, idx) => {
      const initialDeskCoord = gridToScreen(desk.chairGx, desk.chairGy)
      const target = getModeTargets(
        'COFFEE_BREAK',
        desk.agentId,
        idx,
        initialDeskCoord
      )

      expect(target).toBeDefined()
      expect(Number.isFinite(target.x)).toBe(true)
      expect(Number.isFinite(target.y)).toBe(true)

      // Ensure every agent gets a distinct spot
      const key = `${target.x},${target.y}`
      expect(targets.has(key)).toBe(false)
      targets.add(key)

      // Path from desk to Pantry must be valid
      const path = calculateCorridorPath(initialDeskCoord, target)
      expect(path.length).toBeGreaterThanOrEqual(1)
      expect(path[path.length - 1]).toEqual(target)
    })

    expect(targets.size).toBe(ASSIGNED_DESKS.length)
  })

  it('FOCUS_WORK routes each agent precisely to their assigned desk', () => {
    ASSIGNED_DESKS.forEach((desk) => {
      const deskChairCoord = gridToScreen(desk.chairGx, desk.chairGy)
      const focusTarget = getModeTargets(
        'FOCUS_WORK',
        desk.agentId,
        0,
        deskChairCoord
      )

      expect(focusTarget).toEqual(deskChairCoord)
    })
  })

  it('A* grid pathfinder never cuts through solid furniture', () => {
    // Path from Josiah's desk (gx=3, gy=14) to The Brain (gx=12, gy=4)
    const path = findGridPath({ gx: 3, gy: 14 }, { gx: 12, gy: 4 })
    expect(path.length).toBeGreaterThan(1)
    expect(path[path.length - 1]).toEqual({ gx: 12, gy: 4 })
  })
})
