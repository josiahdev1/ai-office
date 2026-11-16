import { Agent } from '@/components/office/types'
import {
  AGENT_WORKSTATIONS_3D,
  DepartmentMode,
  getAgentTargetPosition,
  PICKLEBALL_COURT_CENTER,
  PICKLEBALL_COURT_SLOTS,
} from '@/config/officeLayout'
import {
  getPickleballSlotForAgent,
  PICKLEBALL_8_BENCH_SEATS,
  PICKLEBALL_BASKET_POS,
  PickleballRallyState,
} from '@/lib/office/pickleballSimulation'

export type ScenePose =
  | 'idle'
  | 'walk'
  | 'sit'
  | 'type'
  | 'pickleball_ready'
  | 'pickleball_swing'
  | 'bench_wait'

export type SceneProp = 'none' | 'paddle' | 'coffee' | 'dumbbell' | 'clipboard'

export interface SceneEntity {
  id: string
  kind: 'agent' | 'ball' | 'basket'
  name: string
  x: number
  y: number
  z: number
  facing: number
  pose: ScenePose
  frame: number
  prop: SceneProp
  queueBadge?: string
  footRingColor?: string
  visible: boolean
}

export interface SceneModelOutput {
  entities: SceneEntity[]
  courtCenter: [number, number, number]
  scoreboard: {
    scoreA: number
    scoreB: number
    status: PickleballRallyState['status']
    rallyHits: number
    simulated: true
  }
}

/**
 * Pure single-source-of-truth scene builder consumed identically by 2D and 3D renderers.
 * Guarantees 1:1 entity IDs, tile positions, facings, poses, and props across ?v=2 and 3D.
 */
export function buildSceneModel(
  agents: Agent[],
  globalMode: DepartmentMode,
  overrides: Record<string, DepartmentMode>,
  rallyState: PickleballRallyState,
  selectedAgentId?: string | null
): SceneModelOutput {
  const entities: SceneEntity[] = []

  agents.forEach((agent, idx) => {
    const ws = AGENT_WORKSTATIONS_3D[agent.id]
    const pbSlot = getPickleballSlotForAgent(
      agent.id,
      rallyState.activePlayers,
      rallyState.benchQueue
    )
    const isRealPickleball =
      overrides[agent.id] === 'PICKLEBALL' ||
      agent.room === 'Pickleball Court'
    const effectiveMode =
      overrides[agent.id] ??
      (isRealPickleball
        ? 'PICKLEBALL'
        : globalMode === 'PICKLEBALL'
          ? 'OVERVIEW'
          : globalMode)

    let x = ws ? ws.deskPos[0] : 0
    let y = 0
    let z = ws ? ws.deskPos[2] : 0
    let facing = 0
    let pose: ScenePose = 'idle'
    let prop: SceneProp = agent.id === 'boss' ? 'clipboard' : 'none'
    let queueBadge: string | undefined
    let footRingColor: string | undefined =
      selectedAgentId === agent.id ? '#00e5ff' : undefined

    if (effectiveMode === 'PICKLEBALL' && pbSlot) {
      if (pbSlot.role === 'court') {
        const slot = PICKLEBALL_COURT_SLOTS[pbSlot.index]
        const offset = rallyState.playerOffsets[pbSlot.index] ?? [0, 0]
        x = slot[0] + offset[0]
        z = slot[2] + offset[1]
        facing = pbSlot.index < 2 ? Math.PI / 2 : -Math.PI / 2
        pose =
          (rallyState.swingTimers[pbSlot.index] ?? 0) > 0.1
            ? 'pickleball_swing'
            : 'pickleball_ready'
        prop = 'paddle'
      } else {
        const seat = PICKLEBALL_8_BENCH_SEATS[pbSlot.index] ?? PICKLEBALL_8_BENCH_SEATS[0]
        x = seat[0]
        z = seat[2]
        facing = seat[2] > -33 ? Math.PI : 0
        pose = 'bench_wait'
        prop = 'none'
        queueBadge = pbSlot.badge
        footRingColor = '#f97316' // Orange ring at feet for queued bench waiter (p03 reference)
      }
    } else if (ws) {
      const target = getAgentTargetPosition(ws, globalMode, overrides[agent.id])
      x = target[0]
      y = target[1]
      z = target[2]
      pose =
        effectiveMode === 'OVERVIEW' || effectiveMode === 'FOCUS_WORK'
          ? 'type'
          : 'idle'
      if (effectiveMode === 'PANTRY') prop = 'coffee'
      else if (effectiveMode === 'GYM') prop = 'dumbbell'
    }

    entities.push({
      id: agent.id,
      kind: 'agent',
      name: agent.name,
      x: Number(x.toFixed(3)),
      y,
      z: Number(z.toFixed(3)),
      facing,
      pose,
      frame: idx,
      prop,
      queueBadge,
      footRingColor,
      visible: true,
    })
  })

  // Ball Basket beside sideline bench
  entities.push({
    id: 'pickleball-basket',
    kind: 'basket',
    name: 'Ball Basket',
    x: PICKLEBALL_BASKET_POS[0],
    y: PICKLEBALL_BASKET_POS[1],
    z: PICKLEBALL_BASKET_POS[2],
    facing: 0,
    pose: 'idle',
    frame: 0,
    prop: 'none',
    visible: true,
  })

  // Ball only visible/active during serve/rally with 4 players
  entities.push({
    id: 'pickleball-ball',
    kind: 'ball',
    name: 'Pickleball',
    x: rallyState.ballPos[0],
    y: rallyState.ballPos[1],
    z: rallyState.ballPos[2],
    facing: 0,
    pose: 'idle',
    frame: rallyState.rallyHits,
    prop: 'none',
    visible: rallyState.ballVisible,
  })

  return {
    entities,
    courtCenter: PICKLEBALL_COURT_CENTER,
    scoreboard: {
      scoreA: rallyState.scoreA,
      scoreB: rallyState.scoreB,
      status: rallyState.status,
      rallyHits: rallyState.rallyHits,
      simulated: true,
    },
  }
}
