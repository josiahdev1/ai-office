import {
  PICKLEBALL_COURT_CENTER,
  PICKLEBALL_COURT_SLOTS,
} from '@/config/officeLayout'

export type PickleballMatchStatus =
  'idle' | 'warmup' | 'serve' | 'rally' | 'point' | 'rotate' | 'ended'

export interface PickleballRallyState {
  matchId: string
  seed: number
  status: PickleballMatchStatus
  activePlayers: string[] // max 4: [nw, sw, ne, se]
  benchQueue: string[] // max 8 waiting players
  scoreA: number
  scoreB: number
  serverIndex: number
  hitterIndex: number
  receiverIndex: number
  fromPos: [number, number]
  toPos: [number, number]
  flightProgress: number
  flightDuration: number
  arcHeight: number
  ballPos: [number, number, number]
  ballVisible: boolean
  playerOffsets: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ]
  swingTimers: [number, number, number, number]
  rallyHits: number
  pointPauseTimer: number
  lastSubbedOut: string | null
  lastSubbedIn: string | null
}

export const PICKLEBALL_MAX_COURT_PLAYERS = 4
export const PICKLEBALL_MAX_QUEUE_CAPACITY = 8
export const PICKLEBALL_BASKET_POS: [number, number, number] = [
  -21.5, 0.35, -27.6,
]

export const PICKLEBALL_DEFAULT_PLAYERS: [string, string, string, string] = [
  'boss',
  'josiah',
  'khent',
  'blaze',
]
export const PICKLEBALL_DEFAULT_BENCH: string[] = ['ferwin', 'jo_vincent']

/** 2 benches x 4 seats = 8 bench queue slots */
export const PICKLEBALL_8_BENCH_SEATS: [number, number, number][] = [
  [-18.0, 0, -27.8],
  [-16.8, 0, -27.8],
  [-15.2, 0, -27.8],
  [-14.0, 0, -27.8],
  [-18.0, 0, -38.2],
  [-16.8, 0, -38.2],
  [-15.2, 0, -38.2],
  [-14.0, 0, -38.2],
]

/** Deterministic seeded PRNG (Mulberry32) — never Math.random() */
export function seededPrng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function getPickleballSlotForAgent(
  agentId: string,
  activePlayers: readonly string[] = PICKLEBALL_DEFAULT_PLAYERS,
  benchPlayers: readonly string[] = PICKLEBALL_DEFAULT_BENCH
):
  | { role: 'court'; index: number }
  | { role: 'bench'; index: number; badge: string }
  | null {
  const courtIdx = activePlayers
    .slice(0, PICKLEBALL_MAX_COURT_PLAYERS)
    .indexOf(agentId)
  if (courtIdx >= 0) {
    return { role: 'court', index: courtIdx }
  }
  const benchIdx = benchPlayers
    .slice(0, PICKLEBALL_MAX_QUEUE_CAPACITY)
    .indexOf(agentId)
  if (benchIdx >= 0) {
    const badge =
      benchIdx === 0
        ? 'Next'
        : benchIdx === 1
          ? '2nd'
          : benchIdx === 2
            ? '3rd'
            : `${benchIdx + 1}th`
    return { role: 'bench', index: benchIdx, badge }
  }
  return null
}

/**
 * Enforces max 4 active players on court (from AVAILABLE agents only)
 * and up to 8 waiting on sideline benches.
 */
export function selectMatchAndQueue(
  availableAgentIds: string[],
  preferredPlayers: string[] = PICKLEBALL_DEFAULT_PLAYERS
): { activePlayers: string[]; benchQueue: string[]; declinedCount: number } {
  const uniqueAvailable = Array.from(new Set(availableAgentIds))
  const ordered: string[] = []
  for (const pref of preferredPlayers) {
    if (uniqueAvailable.includes(pref)) ordered.push(pref)
  }
  for (const id of uniqueAvailable) {
    if (!ordered.includes(id)) ordered.push(id)
  }
  const activePlayers = ordered.slice(0, PICKLEBALL_MAX_COURT_PLAYERS)
  const benchQueue = ordered.slice(
    PICKLEBALL_MAX_COURT_PLAYERS,
    PICKLEBALL_MAX_COURT_PLAYERS + PICKLEBALL_MAX_QUEUE_CAPACITY
  )
  const declinedCount = Math.max(
    0,
    ordered.length -
      (PICKLEBALL_MAX_COURT_PLAYERS + PICKLEBALL_MAX_QUEUE_CAPACITY)
  )
  return { activePlayers, benchQueue, declinedCount }
}

export function enqueueBenchPlayer(
  state: PickleballRallyState,
  agentId: string
): { ok: boolean; message?: string } {
  if (
    state.activePlayers.includes(agentId) ||
    state.benchQueue.includes(agentId)
  ) {
    return { ok: true }
  }
  if (state.activePlayers.length < PICKLEBALL_MAX_COURT_PLAYERS) {
    state.activePlayers.push(agentId)
    if (
      state.activePlayers.length === PICKLEBALL_MAX_COURT_PLAYERS &&
      state.status === 'idle'
    ) {
      state.status = 'serve'
    }
    return { ok: true }
  }
  if (state.benchQueue.length >= PICKLEBALL_MAX_QUEUE_CAPACITY) {
    return { ok: false, message: 'Court full: queue is 8' }
  }
  state.benchQueue.push(agentId)
  return { ok: true }
}

export function createInitialRallyState(
  players: string[] = PICKLEBALL_DEFAULT_PLAYERS,
  bench: string[] = PICKLEBALL_DEFAULT_BENCH,
  seed = 35001,
  matchId = 'match-default'
): PickleballRallyState {
  const cappedPlayers = players
    .filter(Boolean)
    .slice(0, PICKLEBALL_MAX_COURT_PLAYERS)
  const cappedBench = bench
    .filter(Boolean)
    .slice(0, PICKLEBALL_MAX_QUEUE_CAPACITY)
  const start = PICKLEBALL_COURT_SLOTS[0]
  const end = PICKLEBALL_COURT_SLOTS[3] // Diagonal underhand serve
  const hasFullTeams = cappedPlayers.length === PICKLEBALL_MAX_COURT_PLAYERS
  return {
    matchId,
    seed,
    status: hasFullTeams ? 'serve' : 'idle',
    activePlayers: cappedPlayers,
    benchQueue: cappedBench,
    scoreA: 0,
    scoreB: 0,
    serverIndex: 0,
    hitterIndex: 0,
    receiverIndex: 3,
    fromPos: [start[0] + 0.45, start[2]],
    toPos: [end[0] - 0.45, end[2]],
    flightProgress: 0,
    flightDuration: 1.05,
    arcHeight: 1.35,
    ballPos: hasFullTeams
      ? [start[0] + 0.45, 0.9, start[2]]
      : [...PICKLEBALL_BASKET_POS],
    ballVisible: hasFullTeams,
    playerOffsets: [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    swingTimers: [0, 0, 0, 0],
    rallyHits: 0,
    pointPauseTimer: 0,
    lastSubbedOut: null,
    lastSubbedIn: null,
  }
}

export function rotateSidelinePlayer(state: PickleballRallyState): void {
  if (state.benchQueue.length === 0 || state.activePlayers.length < 4) return
  // Winners stay; rotate one losing-side slot or sequential slot
  const losingTeamBase = state.scoreA >= state.scoreB ? 2 : 0
  const slotToRotate = losingTeamBase + (state.rallyHits % 2)
  const outgoing = state.activePlayers[slotToRotate]
  const incoming = state.benchQueue.shift()!
  state.activePlayers[slotToRotate] = incoming
  state.benchQueue.push(outgoing)
  state.lastSubbedOut = outgoing
  state.lastSubbedIn = incoming
}

/**
 * Pure deterministic 60fps rally state machine.
 * Ball only exists and moves during `serve` / `rally` when 4 players (2v2) are active.
 */
export function stepPickleballRally(
  state: PickleballRallyState,
  dt: number
): PickleballRallyState {
  if (state.activePlayers.length < 2) {
    state.status = 'idle'
    state.ballVisible = false
    state.ballPos = [...PICKLEBALL_BASKET_POS]
    return state
  }

  const safeDt = Math.max(0, Math.min(0.1, dt))

  // Decay paddle swing timers
  for (let i = 0; i < 4; i++) {
    if (state.swingTimers[i] > 0) {
      state.swingTimers[i] = Math.max(0, state.swingTimers[i] - safeDt * 3.2)
    }
  }

  if (state.status === 'point' || state.status === 'rotate') {
    state.pointPauseTimer -= safeDt
    state.ballVisible = false
    state.ballPos = [...PICKLEBALL_BASKET_POS]
    if (state.pointPauseTimer <= 0) {
      if (state.scoreA >= 11 && state.scoreA - state.scoreB >= 2) {
        state.status = 'rotate'
        rotateSidelinePlayer(state)
        state.scoreA = 0
        state.scoreB = 0
      } else if (state.scoreB >= 11 && state.scoreB - state.scoreA >= 2) {
        state.status = 'rotate'
        rotateSidelinePlayer(state)
        state.scoreA = 0
        state.scoreB = 0
      }
      state.status = 'serve'
      state.hitterIndex = state.serverIndex
      state.receiverIndex = state.serverIndex < 2 ? 3 : 0
      const sSlot = PICKLEBALL_COURT_SLOTS[state.hitterIndex]
      const rSlot = PICKLEBALL_COURT_SLOTS[state.receiverIndex]
      state.fromPos = [
        sSlot[0] + (state.hitterIndex < 2 ? 0.45 : -0.45),
        sSlot[2],
      ]
      state.toPos = [
        rSlot[0] + (state.receiverIndex < 2 ? 0.45 : -0.45),
        rSlot[2],
      ]
      state.flightProgress = 0
      state.ballVisible = true
    }
    return state
  }

  state.ballVisible = true
  state.flightProgress += safeDt / state.flightDuration

  // Synchronize paddle swing so contact aligns with flightProgress === 1.0
  if (
    state.flightProgress >= 0.82 &&
    state.swingTimers[state.receiverIndex] <= 0.1
  ) {
    state.swingTimers[state.receiverIndex] = 1.0
  }

  // Lateral & forward/back footwork toward intercept tile
  const baseSlot = PICKLEBALL_COURT_SLOTS[state.receiverIndex]
  const targetOffsetZ = Math.max(
    -1.45,
    Math.min(1.45, state.toPos[1] - baseSlot[2])
  )
  const footLerp = 1 - Math.exp(-6 * safeDt)
  state.playerOffsets[state.receiverIndex][1] +=
    (targetOffsetZ - state.playerOffsets[state.receiverIndex][1]) * footLerp

  for (let i = 0; i < 4; i++) {
    if (i !== state.receiverIndex) {
      state.playerOffsets[i][0] *= 1 - footLerp * 0.5
      state.playerOffsets[i][1] *= 1 - footLerp * 0.5
    }
  }

  // Handle ball arrival & next shot or deterministic point outcome
  if (state.flightProgress >= 1) {
    state.flightProgress = 0
    state.rallyHits += 1
    const rng = seededPrng(state.seed + state.rallyHits * 131)

    // Deterministic point end every 6-10 hits
    if (state.rallyHits >= 6 && rng() < 0.28) {
      const hitterTeamA = state.hitterIndex < 2
      if (hitterTeamA) {
        state.scoreA += 1
      } else {
        state.scoreB += 1
      }
      // Rotate serving side if receiving side scored
      const serverTeamA = state.serverIndex < 2
      if (hitterTeamA !== serverTeamA) {
        state.serverIndex = (state.serverIndex + 2) % 4
      }
      state.status = 'point'
      state.pointPauseTimer = 0.75
      if (state.rallyHits % 10 === 0) {
        rotateSidelinePlayer(state)
      }
      return state
    }

    state.status = 'rally'
    state.hitterIndex = state.receiverIndex

    const isWestTeam = state.hitterIndex < 2
    const nextSideBase = isWestTeam ? 2 : 0
    const nextSlotOffset = Math.floor(rng() * 2)
    state.receiverIndex = nextSideBase + nextSlotOffset

    const nextTargetSlot = PICKLEBALL_COURT_SLOTS[state.receiverIndex]
    const zJitter = (rng() - 0.5) * 2.1
    state.fromPos = [state.toPos[0], state.toPos[1]]
    state.toPos = [
      nextTargetSlot[0] + (state.receiverIndex < 2 ? 0.45 : -0.45),
      Math.max(-36.2, Math.min(-29.8, nextTargetSlot[2] + zJitter)),
    ]
    state.flightDuration = 0.88 + rng() * 0.28
    state.arcHeight = 1.12 + rng() * 0.35
  }

  const p = Math.min(1, Math.max(0, state.flightProgress))
  const bx = state.fromPos[0] + (state.toPos[0] - state.fromPos[0]) * p
  const bz = state.fromPos[1] + (state.toPos[1] - state.fromPos[1]) * p
  // Parabolic arc clearing the 0.92m center net at p = 0.5
  const by = 0.45 + Math.sin(p * Math.PI) * state.arcHeight
  state.ballPos = [bx, by, bz]

  return state
}

export function getPickleballCourtBounds() {
  const [cx, , cz] = PICKLEBALL_COURT_CENTER
  return {
    centerX: cx,
    centerZ: cz,
    apronWidth: 16,
    apronDepth: 12,
    courtWidth: 13.4,
    courtDepth: 6.1,
    kitchenOffsetX: 2.13,
    netHeight: 0.92,
  }
}
