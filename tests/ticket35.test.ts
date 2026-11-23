import { describe, expect, it } from 'vitest'
import {
  createInitialRallyState,
  enqueueBenchPlayer,
  PICKLEBALL_MAX_COURT_PLAYERS,
  PICKLEBALL_MAX_QUEUE_CAPACITY,
  selectMatchAndQueue,
  stepPickleballRally,
} from '@/lib/office/pickleballSimulation'
import { buildSceneModel } from '@/lib/office/sceneModel'
import { validatePickleballAccess } from '@/lib/office/validateMap'
import { buildSpriteCacheKey, getOrBakeSprite } from '@/lib/office/spriteBaker'
import { generateAgentAppearance } from '@/components/office/AgentModel3D'
import { Agent } from '@/components/office/types'

describe('TICKET-35 Comprehensive Verification', () => {
  it('enforces max 4 active players and 8 bench queue when 31 agents are available', () => {
    const all31 = Array.from({ length: 31 }, (_, i) =>
      i === 0 ? 'boss' : `agent_${i}`
    )
    const res = selectMatchAndQueue(all31)
    expect(res.activePlayers).toHaveLength(PICKLEBALL_MAX_COURT_PLAYERS)
    expect(res.benchQueue).toHaveLength(PICKLEBALL_MAX_QUEUE_CAPACITY)
    expect(res.declinedCount).toBe(31 - 4 - 8)
  })

  it('declines 9th bench waiter with "Court full: queue is 8"', () => {
    const bench = Array.from({ length: 8 }, (_, i) => `waiter_${i}`)
    const state = createInitialRallyState(
      ['boss', 'josiah', 'khent', 'blaze'],
      bench
    )
    const result = enqueueBenchPlayer(state, 'extra_player')
    expect(result.ok).toBe(false)
    expect(result.message).toBe('Court full: queue is 8')
  })

  it('keeps ball hidden in basket when < 2 players and deterministic when 4 players rally', () => {
    const idleState = createInitialRallyState(['boss'], [])
    stepPickleballRally(idleState, 0.5)
    expect(idleState.status).toBe('idle')
    expect(idleState.ballVisible).toBe(false)

    const runA = createInitialRallyState(
      ['boss', 'josiah', 'khent', 'blaze'],
      ['ferwin'],
      777
    )
    const runB = createInitialRallyState(
      ['boss', 'josiah', 'khent', 'blaze'],
      ['ferwin'],
      777
    )
    for (let i = 0; i < 180; i++) {
      stepPickleballRally(runA, 1 / 60)
      stepPickleballRally(runB, 1 / 60)
    }
    expect(runA.ballPos).toEqual(runB.ballPos)
    expect(runA.rallyHits).toBe(runB.rallyHits)
  })

  it('builds a single shared sceneModel for 2D and 3D with queue badges & orange foot ring', () => {
    const mockAgents = [
      {
        id: 'boss',
        name: 'Boss',
        status: 'available',
        department: 'EXECUTIVE',
        room: 'Pickleball Court',
      },
      {
        id: 'ferwin',
        name: 'Ferwin',
        status: 'available',
        department: 'ENGINEERING',
        room: 'Pickleball Court',
      },
      {
        id: 'arwin',
        name: 'Arwin',
        status: 'working',
        department: 'ENGINEERING',
        room: 'Engineering',
      },
    ] as Agent[]
    const rally = createInitialRallyState(
      ['boss', 'josiah', 'khent', 'blaze'],
      ['ferwin']
    )
    const model = buildSceneModel(mockAgents, 'OVERVIEW', {}, rally)
    const boss = model.entities.find((e) => e.id === 'boss')
    const ferwin = model.entities.find((e) => e.id === 'ferwin')
    const arwin = model.entities.find((e) => e.id === 'arwin')
    expect(boss?.prop).toBe('paddle')
    expect(ferwin?.pose).toBe('bench_wait')
    expect(ferwin?.queueBadge).toBe('Next')
    expect(ferwin?.footRingColor).toBe('#f97316')
    expect(arwin?.pose).toBe('type')

    // Zero-mock check: when 0 players are on court, ball is hidden & idle
    const emptyRally = createInitialRallyState([], [])
    stepPickleballRally(emptyRally, 1.0)
    const workModel = buildSceneModel(mockAgents, 'OVERVIEW', {}, emptyRally)
    const ball = workModel.entities.find((e) => e.id === 'pickleball-ball')
    expect(workModel.scoreboard.status).toBe('idle')
    expect(ball?.visible).toBe(false)
  })

  it('validates >= 2-tile passageway and A* reachability to court slots, 8 bench seats & ball basket', () => {
    const check = validatePickleballAccess()
    expect(check.passageWidthTiles).toBeGreaterThanOrEqual(2)
    expect(check.valid).toBe(true)
    expect(check.errors).toEqual([])
  })

  it('generates deterministic agent appearance and caches sprite baker keys', () => {
    const a1 = generateAgentAppearance('josiah')
    const a2 = generateAgentAppearance('josiah')
    expect(a1).toEqual(a2)
    const key = buildSpriteCacheKey({
      agentId: 'josiah',
      appearanceHash: 'h1',
      pose: 'pickleball_swing',
      facing: 1.57,
      frame: 2,
    })
    const entry = getOrBakeSprite({
      agentId: 'josiah',
      appearanceHash: 'h1',
      pose: 'pickleball_swing',
      facing: 1.57,
      frame: 2,
    })
    expect(entry.key).toBe(key)
  })
})
