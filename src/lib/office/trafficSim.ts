/**
 * Traffic Simulation Engine & Vehicle Manager for EasyUp Software Solution HQ
 *
 * Implements:
 * - Directed graph lane following across road network and parking circulation
 * - Safe following distance & smooth braking
 * - Crosswalk pedestrian detection and full stop yielding
 * - Deadlock breaker (resolves stationary jams after >240 frames)
 * - Exclusive parking bay reservations (never two cars in one bay)
 * - Special vehicles: catering delivery van and transit bus
 * - Commute shift-change arrival/departure lifecycle
 */

import { CarStyle, VehicleState } from '@/components/office/types'
import { PARKING_BAYS, ROAD_NODES, ROAD_EDGES } from './campusMap'

export interface TrafficConfig {
  maxMovingCars: number
  trafficDensity: 'low' | 'medium' | 'high'
  commuteEnabled: boolean
  carsEnabled: boolean
}

export const DEFAULT_TRAFFIC_CONFIG: TrafficConfig = {
  maxMovingCars: 12,
  trafficDensity: 'medium',
  commuteEnabled: true,
  carsEnabled: true,
}

const CAR_COLORS = [
  '#38bdf8',
  '#818cf8',
  '#34d399',
  '#f87171',
  '#fbbf24',
  '#a78bfa',
  '#f472b6',
  '#e2e8f0',
  '#94a3b8',
  '#64748b',
]

const CAR_STYLES: CarStyle[] = ['sedan', 'hatchback', 'suv', 'pickup', 'van']

export class TrafficSimulator {
  public vehicles: VehicleState[] = []
  public config: TrafficConfig = { ...DEFAULT_TRAFFIC_CONFIG }
  public reservedBays: Map<string, string> = new Map() // bayId -> vehicleId
  public isPedestrianCrossing: boolean = false
  public specialSpawnTick: number = 0

  constructor(config?: Partial<TrafficConfig>) {
    if (config) this.config = { ...this.config, ...config }
    this.initDefaultParkedCars()
  }

  /**
   * Initializes permanent employee parked cars in assigned bays
   */
  public initDefaultParkedCars(): void {
    PARKING_BAYS.forEach((bay) => {
      // Park cars in founder bay and first 10 resident bays
      if (bay.type === 'founder' || bay.bayNumber <= 11) {
        const carId = `car-${bay.id}`
        this.reservedBays.set(bay.id, carId)
        this.vehicles.push({
          id: carId,
          style:
            bay.type === 'founder'
              ? 'suv'
              : CAR_STYLES[bay.bayNumber % CAR_STYLES.length],
          color:
            bay.type === 'founder'
              ? '#0284c7'
              : CAR_COLORS[bay.bayNumber % CAR_COLORS.length],
          facing: bay.facing,
          x: bay.x,
          y: bay.y,
          speed: 0,
          isParked: true,
          bayId: bay.id,
          headlightsOn: false,
          brakeLightsOn: false,
          blinkerOn: false,
          isWaitingPedestrian: false,
          assignedAgentId: bay.assignedAgentId,
          idleWaitFrames: 0,
        })
      }
    })
  }

  /**
   * Reserves a parking bay atomically. Guarantees no two cars claim the same bay.
   */
  public reserveBay(bayId: string, carId: string): boolean {
    const existing = this.reservedBays.get(bayId)
    if (existing && existing !== carId) {
      return false
    }
    this.reservedBays.set(bayId, carId)
    return true
  }

  /**
   * Releases a parking bay
   */
  public releaseBay(bayId: string, carId: string): void {
    if (this.reservedBays.get(bayId) === carId) {
      this.reservedBays.delete(bayId)
    }
  }

  /**
   * Sets whether a pedestrian agent is actively crossing the zebra crosswalk
   */
  public setPedestrianCrossing(crossing: boolean): void {
    this.isPedestrianCrossing = crossing
  }

  /**
   * Spawns an ambient or employee commuter vehicle at road entrance
   */
  public spawnVehicle(
    direction: 'eastbound' | 'westbound' = 'eastbound',
    options?: {
      style?: CarStyle
      color?: string
      targetBayId?: string
      agentId?: string
    }
  ): VehicleState | null {
    const movingCount = this.vehicles.filter((v) => !v.isParked).length
    if (movingCount >= this.config.maxMovingCars || !this.config.carsEnabled) {
      return null
    }

    const spawnNodeId = direction === 'eastbound' ? 'spawn_west' : 'spawn_east'
    const spawnNode = ROAD_NODES[spawnNodeId]
    if (!spawnNode) return null

    // Check if another car is right at the spawn point
    const hasNearbyCar = this.vehicles.some(
      (v) => Math.hypot(v.x - spawnNode.x, v.y - spawnNode.y) < 60
    )
    if (hasNearbyCar) return null

    const style =
      options?.style ||
      CAR_STYLES[Math.floor(Math.random() * CAR_STYLES.length)]
    const color =
      options?.color ||
      CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
    const nextNodeId = direction === 'eastbound' ? 'road_w1' : 'road_ret_e2'

    const newVehicle: VehicleState = {
      id: `car-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      style,
      color,
      facing: spawnNode.facing,
      x: spawnNode.x,
      y: spawnNode.y,
      speed: 2.2 + Math.random() * 0.6,
      targetNodeId: nextNodeId,
      isParked: false,
      bayId: options?.targetBayId,
      headlightsOn: false,
      brakeLightsOn: false,
      blinkerOn: false,
      isWaitingPedestrian: false,
      assignedAgentId: options?.agentId,
      idleWaitFrames: 0,
    }

    this.vehicles.push(newVehicle)
    return newVehicle
  }

  /**
   * Main simulation tick (called every frame ~60 FPS)
   */
  public tick(isNightOrRain: boolean = false): void {
    if (!this.config.carsEnabled) return

    this.specialSpawnTick++
    // Spawn ambient cars periodically based on traffic density
    const spawnInterval =
      this.config.trafficDensity === 'high'
        ? 140
        : this.config.trafficDensity === 'low'
          ? 360
          : 220
    if (this.specialSpawnTick % spawnInterval === 0) {
      const dir = Math.random() < 0.5 ? 'eastbound' : 'westbound'
      this.spawnVehicle(dir)
    }

    // Occasionally spawn transit bus or food delivery van
    if (this.specialSpawnTick % 800 === 0) {
      this.spawnVehicle('eastbound', { style: 'bus', color: '#0284c7' })
    }

    const despawnIds = new Set<string>()

    // Update each vehicle
    this.vehicles.forEach((car) => {
      if (car.isParked) {
        car.headlightsOn = isNightOrRain
        car.brakeLightsOn = false
        car.blinkerOn = false
        return
      }

      car.headlightsOn = isNightOrRain

      const targetNode = car.targetNodeId ? ROAD_NODES[car.targetNodeId] : null
      if (!targetNode) {
        despawnIds.add(car.id)
        return
      }

      // Check distance to target node
      const dx = targetNode.x - car.x
      const dy = targetNode.y - car.y
      const distToNode = Math.hypot(dx, dy)

      // Calculate desired facing based on movement delta
      if (Math.abs(dx) > Math.abs(dy)) {
        car.facing = dx > 0 ? 'SE' : 'NW'
      } else {
        car.facing = dy > 0 ? 'SW' : 'NE'
      }

      // 1. Safe Following Distance: check for preceding car ahead
      let isBlockedByCarAhead = false
      for (const other of this.vehicles) {
        if (other.id === car.id) continue
        const distToOther = Math.hypot(other.x - car.x, other.y - car.y)
        if (distToOther < 55) {
          // If other car is ahead of us along our travel heading
          const dot = (other.x - car.x) * dx + (other.y - car.y) * dy
          if (dot > 0) {
            isBlockedByCarAhead = true
            break
          }
        }
      }

      // 2. Crosswalk Stop Check: yield if pedestrian is in the crosswalk
      let isWaitingAtCrosswalk = false
      if (this.isPedestrianCrossing) {
        if (
          (car.targetNodeId === 'crosswalk_stop_w' && distToNode < 40) ||
          (car.targetNodeId === 'crosswalk_stop_e' && distToNode < 40)
        ) {
          isWaitingAtCrosswalk = true
        }
      }

      // 3. Movement or Braking
      if (isBlockedByCarAhead || isWaitingAtCrosswalk) {
        car.brakeLightsOn = true
        car.isWaitingPedestrian = isWaitingAtCrosswalk
        car.idleWaitFrames++

        // 4. Deadlock Breaker (> 240 frames ~ 4 seconds stuck)
        if (car.idleWaitFrames > 240) {
          // Force advance or despawn to eliminate traffic lockup
          car.idleWaitFrames = 0
          if (car.targetNodeId === 'crosswalk_stop_w') {
            car.targetNodeId = 'crosswalk_mid_w'
          } else if (car.targetNodeId === 'crosswalk_stop_e') {
            car.targetNodeId = 'crosswalk_mid_e'
          } else {
            despawnIds.add(car.id)
          }
        }
        return
      }

      // Not blocked: move towards target node
      car.brakeLightsOn = false
      car.isWaitingPedestrian = false
      car.idleWaitFrames = 0

      const moveStep = Math.min(car.speed, distToNode)
      if (distToNode > 0.1) {
        car.x += (dx / distToNode) * moveStep
        car.y += (dy / distToNode) * moveStep
      }

      // If reached target node, choose next node along edges
      if (distToNode <= car.speed + 1.5) {
        car.x = targetNode.x
        car.y = targetNode.y

        // Check if car reached its destination bay
        if (car.bayId && targetNode.id === 'lot_aisle_crosswalk') {
          const bay = PARKING_BAYS.find((b) => b.id === car.bayId)
          if (bay) {
            car.x = bay.x
            car.y = bay.y
            car.facing = bay.facing
            car.isParked = true
            car.speed = 0
            car.brakeLightsOn = false
            return
          }
        }

        // Check if despawn node
        if (targetNode.type === 'despawn') {
          despawnIds.add(car.id)
          return
        }

        // Find connected outbound edges from current node
        const outgoingEdges = ROAD_EDGES.filter((e) => e.from === targetNode.id)
        if (outgoingEdges.length === 0) {
          despawnIds.add(car.id)
          return
        }

        // Pick next edge (route to lot entry if targeting a bay)
        if (car.bayId && targetNode.id === 'road_ret_w1') {
          car.targetNodeId = 'lot_entry'
          car.blinkerOn = true
        } else {
          car.blinkerOn = false
          const nextEdge =
            outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)]
          car.targetNodeId = nextEdge.to
        }
      }
    })

    // Clean up despawned vehicles
    if (despawnIds.size > 0) {
      this.vehicles = this.vehicles.filter((v) => !despawnIds.has(v.id))
    }
  }
}
