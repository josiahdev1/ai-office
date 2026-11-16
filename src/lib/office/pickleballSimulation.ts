import { PICKLEBALL_COURT_CENTER, PICKLEBALL_COURT_SLOTS } from '@/config/officeLayout'

export interface PickleballRallyState {
  activePlayers: [string, string, string, string]
  benchQueue: string[]
  hitterIndex: number
  receiverIndex: number
  fromPos: [number, number]
  toPos: [number, number]
  flightProgress: number
  flightDuration: number
  arcHeight: number
  ballPos: [number, number, number]
  playerOffsets: [[number, number], [number, number], [number, number], [number, number]]
  swingTimers: [number, number, number, number]
  rallyHits: number
  lastSubbedOut: string | null
  lastSubbedIn: string | null
}

const DEFAULT_PLAYERS: [string, string, string, string] = ['boss', 'josiah', 'khent', 'blaze']
const DEFAULT_BENCH: string[] = ['ferwin', 'jo_vincent', 'ian', 'john_arvy']

export function createInitialRallyState(
  players: [string, string, string, string] = DEFAULT_PLAYERS,
  bench: string[] = DEFAULT_BENCH
): PickleballRallyState {
  const start = PICKLEBALL_COURT_SLOTS[0]
  const end = PICKLEBALL_COURT_SLOTS[2]
  return {
    activePlayers: [...players] as [string, string, string, string],
    benchQueue: [...bench],
    hitterIndex: 0,
    receiverIndex: 2,
    fromPos: [start[0] + 0.45, start[2]],
    toPos: [end[0] - 0.45, end[2]],
    flightProgress: 0,
    flightDuration: 1.05,
    arcHeight: 1.35,
    ballPos: [start[0] + 0.45, 0.9, start[2]],
    playerOffsets: [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    swingTimers: [0, 0, 0, 0],
    rallyHits: 0,
    lastSubbedOut: null,
    lastSubbedIn: null,
  }
}

export function rotateSidelinePlayer(state: PickleballRallyState): void {
  if (state.benchQueue.length === 0) return
  const slotToRotate = state.rallyHits % 4
  const outgoing = state.activePlayers[slotToRotate]
  const incoming = state.benchQueue.shift()!
  state.activePlayers[slotToRotate] = incoming
  state.benchQueue.push(outgoing)
  state.lastSubbedOut = outgoing
  state.lastSubbedIn = incoming
}

/**
 * Advances the 2v2 pickleball rally by `dt` seconds.
 * Computes smooth parabolic ball flight over the center net, lateral footwork,
 * paddle swing timers, and automatic sideline sub-in/sub-out rotation.
 */
export function stepPickleballRally(
  state: PickleballRallyState,
  dt: number
): PickleballRallyState {
  const safeDt = Math.max(0, Math.min(0.1, dt))
  state.flightProgress += safeDt / state.flightDuration

  // Decay paddle swing timers
  for (let i = 0; i < 4; i++) {
    if (state.swingTimers[i] > 0) {
      state.swingTimers[i] = Math.max(0, state.swingTimers[i] - safeDt * 2.8)
    }
  }

  // Trigger receiver anticipation swing right before ball arrives
  if (state.flightProgress >= 0.78 && state.swingTimers[state.receiverIndex] <= 0.1) {
    state.swingTimers[state.receiverIndex] = 1.0
  }

  // Smooth lateral footwork toward target ball Z for the active receiver
  const baseSlot = PICKLEBALL_COURT_SLOTS[state.receiverIndex]
  const targetOffsetZ = Math.max(-1.4, Math.min(1.4, state.toPos[1] - baseSlot[2]))
  const footLerp = 1 - Math.exp(-5 * safeDt)
  state.playerOffsets[state.receiverIndex][1] +=
    (targetOffsetZ - state.playerOffsets[state.receiverIndex][1]) * footLerp

  // Return non-receiving players gently toward ready stance
  for (let i = 0; i < 4; i++) {
    if (i !== state.receiverIndex) {
      state.playerOffsets[i][0] *= 1 - footLerp * 0.5
      state.playerOffsets[i][1] *= 1 - footLerp * 0.5
    }
  }

  // Handle ball arrival & return shot
  if (state.flightProgress >= 1) {
    state.flightProgress = 0
    state.rallyHits += 1
    state.hitterIndex = state.receiverIndex

    const isWestTeam = state.hitterIndex < 2
    const nextSideBase = isWestTeam ? 2 : 0
    const nextSlotOffset = (state.rallyHits + (isWestTeam ? 1 : 0)) % 2
    state.receiverIndex = nextSideBase + nextSlotOffset

    const nextTargetSlot = PICKLEBALL_COURT_SLOTS[state.receiverIndex]
    const zJitter = ((state.rallyHits * 37) % 10 - 5) * 0.18
    state.fromPos = [state.toPos[0], state.toPos[1]]
    state.toPos = [
      nextTargetSlot[0] + (state.receiverIndex < 2 ? 0.45 : -0.45),
      Math.max(-36.4, Math.min(-29.6, nextTargetSlot[2] + zJitter)),
    ]
    state.flightDuration = 0.92 + (state.rallyHits % 3) * 0.12
    state.arcHeight = 1.15 + (state.rallyHits % 2) * 0.25

    // Rotate a sideline bench player in every 10 rally hits
    if (state.rallyHits % 10 === 0) {
      rotateSidelinePlayer(state)
    }
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
