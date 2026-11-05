import { describe, it, expect, beforeEach } from 'vitest'
import { TrafficSimulator } from '../src/lib/office/trafficSim'
import {
  validateCampusMap,
  validateOfficeMap,
} from '../src/lib/office/validateMap'
import {
  PARKING_BAYS,
  ROAD_NODES,
  isPointInsideBuilding,
} from '../src/lib/office/campusMap'

describe('Campus Traffic & Vehicle Simulation Engine (Phase 15)', () => {
  let sim: TrafficSimulator

  beforeEach(() => {
    sim = new TrafficSimulator({ maxMovingCars: 12, trafficDensity: 'medium' })
  })

  describe('Campus Map Geometry & Spatial Integrity', () => {
    it('should validate all campus map rules cleanly with zero errors', () => {
      const errors = validateCampusMap()
      expect(errors).toHaveLength(0)
    })

    it('should pass full master office map validation including outdoor campus', () => {
      const report = validateOfficeMap()
      expect(report.valid).toBe(true)
      expect(report.errors).toHaveLength(0)
    })

    it('should confirm no road nodes lie inside the building interior', () => {
      Object.values(ROAD_NODES).forEach((node) => {
        expect(isPointInsideBuilding(node)).toBe(false)
      })
    })

    it('should have at least 20 parking bays, with 2 accessible and 1 founder spot', () => {
      expect(PARKING_BAYS.length).toBeGreaterThanOrEqual(20)
      const accessibleBays = PARKING_BAYS.filter((b) => b.type === 'accessible')
      expect(accessibleBays.length).toBeGreaterThanOrEqual(2)
      const founderBay = PARKING_BAYS.find((b) => b.type === 'founder')
      expect(founderBay).toBeDefined()
      expect(founderBay?.label).toContain('JOSIAH (FOUNDER)')
    })
  })

  describe('Vehicle State & Safe Following Distance', () => {
    it('should orient car facing in the direction of travel', () => {
      const car = sim.spawnVehicle('eastbound')
      expect(car).toBeDefined()
      if (car) {
        expect(['SE', 'SW', 'NE', 'NW']).toContain(car.facing)
      }
    })

    it('should enforce safe following distance between two cars on same lane', () => {
      const car1 = sim.spawnVehicle('eastbound')
      expect(car1).toBeDefined()
      if (!car1) return

      // Position car 1 ahead
      car1.x = 200
      car1.y = 850
      car1.speed = 0 // stopped

      // Position car 2 trailing closely
      const car2 = sim.spawnVehicle('eastbound')
      if (!car2) return
      car2.x = 180 // 20px behind
      car2.y = 850
      car2.targetNodeId = 'road_w1'

      // Tick simulation: car2 should detect car1 and brake
      sim.tick()
      expect(car2.brakeLightsOn).toBe(true)
    })
  })

  describe('Crosswalk Pedestrian Yielding', () => {
    it('should come to a full stop at crosswalk stop line when pedestrian is crossing', () => {
      sim.setPedestrianCrossing(true)
      const car = sim.spawnVehicle('eastbound')
      expect(car).toBeDefined()
      if (!car) return

      // Place car near crosswalk stop line
      car.x = 620
      car.y = 850
      car.targetNodeId = 'crosswalk_stop_w'

      sim.tick()
      expect(car.brakeLightsOn).toBe(true)
      expect(car.isWaitingPedestrian).toBe(true)
    })

    it('should resume movement once pedestrian leaves the crosswalk', () => {
      sim.setPedestrianCrossing(true)
      const car = sim.spawnVehicle('eastbound')
      if (!car) return

      car.x = 620
      car.y = 850
      car.targetNodeId = 'crosswalk_stop_w'
      sim.tick()
      expect(car.isWaitingPedestrian).toBe(true)

      // Pedestrian finishes crossing
      sim.setPedestrianCrossing(false)
      sim.tick()
      expect(car.isWaitingPedestrian).toBe(false)
      expect(car.brakeLightsOn).toBe(false)
    })
  })

  describe('Exclusive Bay Reservation', () => {
    it('should prevent two cars from reserving the same bay', () => {
      const bayId = 'bay-21' // Vacant bay
      const reserved1 = sim.reserveBay(bayId, 'car-agent-1')
      expect(reserved1).toBe(true)

      const reserved2 = sim.reserveBay(bayId, 'car-agent-2')
      expect(reserved2).toBe(false)
    })

    it('should allow reservation after bay is released', () => {
      const bayId = 'bay-22' // Vacant bay
      sim.reserveBay(bayId, 'car-agent-1')
      sim.releaseBay(bayId, 'car-agent-1')

      const reserved2 = sim.reserveBay(bayId, 'car-agent-2')
      expect(reserved2).toBe(true)
    })
  })

  describe('Deadlock Breaker', () => {
    it('should resolve vehicle deadlock after 240 idle frames', () => {
      sim.setPedestrianCrossing(true)
      const car = sim.spawnVehicle('eastbound')
      if (!car) return

      car.x = 635
      car.y = 850
      car.targetNodeId = 'crosswalk_stop_w'

      // Force high idle wait frames
      car.idleWaitFrames = 241
      sim.tick()

      // Deadlock breaker should trigger and advance or despawn
      expect(car.idleWaitFrames).toBe(0)
    })
  })
})
