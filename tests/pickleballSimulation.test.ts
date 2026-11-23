import { describe, expect, it } from 'vitest'
import {
  createInitialRallyState,
  getPickleballSlotForAgent,
  PICKLEBALL_DEFAULT_PLAYERS,
  rotateSidelinePlayer,
  stepPickleballRally,
} from '@/lib/office/pickleballSimulation'
import { findPath, isWorldTileWalkable } from '@/engine/pathfinding'

describe('Pickleball 2v2 Rally Simulation & Pathfinding', () => {
  it('initializes 4 active court players and sideline bench queue', () => {
    const state = createInitialRallyState()
    expect(state.activePlayers).toHaveLength(4)
    expect(state.benchQueue.length).toBeGreaterThan(0)
    expect(state.rallyHits).toBe(0)
  })

  it('enforces max 4 court players and assigns extra players to sideline benches', () => {
    expect(PICKLEBALL_DEFAULT_PLAYERS).toHaveLength(4)
    expect(getPickleballSlotForAgent('boss')?.role).toBe('court')
    expect(getPickleballSlotForAgent('ferwin')?.role).toBe('bench')
    expect(getPickleballSlotForAgent('cleaner_1')).toBeNull()
  })

  it('keeps ball stationary (no ghost ball) when fewer than 2 players are on court', () => {
    const state = createInitialRallyState(['', '', '', ''], [])
    const before = [...state.ballPos]
    stepPickleballRally(state, 0.5)
    expect(state.rallyHits).toBe(0)
    expect(state.ballPos[0]).toBe(before[0])
    expect(state.ballPos[2]).toBe(before[2])
  })

  it('advances parabolic ball flight over the 0.92m center net and triggers paddle swing', () => {
    const state = createInitialRallyState()
    // Step to ~50% flight (mid-net crossing)
    for (let i = 0; i < 32; i++) {
      stepPickleballRally(state, 1 / 60)
    }
    expect(state.ballPos[1]).toBeGreaterThan(0.92)

    // Step to arrival (~1.05s total)
    for (let i = 0; i < 40; i++) {
      stepPickleballRally(state, 1 / 60)
    }
    expect(state.rallyHits).toBeGreaterThanOrEqual(1)
  })

  it('rotates sideline bench player in and losing-side player out while winners stay', () => {
    const state = createInitialRallyState(
      ['boss', 'josiah', 'khent', 'blaze'],
      ['ferwin']
    )
    rotateSidelinePlayer(state)
    expect(state.activePlayers[0]).toBe('boss') // Winners stay
    expect(state.activePlayers[2]).toBe('ferwin')
    expect(state.benchQueue).toContain('khent')
    expect(state.lastSubbedIn).toBe('ferwin')
    expect(state.lastSubbedOut).toBe('khent')
  })

  it('routes agents via A* from The Brain to the outdoor Pickleball Court', () => {
    expect(isWorldTileWalkable(-20, -35)).toBe(true)
    expect(isWorldTileWalkable(-12, -31)).toBe(true)
    const path = findPath(0, -4, -20, -35)
    expect(path.length).toBeGreaterThan(5)
    const last = path[path.length - 1]
    expect(last[0]).toBe(-20)
    expect(last[2]).toBe(-35)
  })
})
