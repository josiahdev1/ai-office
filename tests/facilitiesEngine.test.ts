import { describe, it, expect, beforeEach } from 'vitest'
import {
  FacilitiesManager,
  runCleanersMaintenanceTick,
  INITIAL_FACILITY_RECORDS,
} from '@/lib/office/facilitiesEngine'
import { needsManager } from '@/lib/office/needsEngine'
import { executeJarvisTool } from '@/lib/jarvis/orchestrator'

describe('Facilities & Cleaners Engine (Phase K6)', () => {
  let fm: FacilitiesManager

  beforeEach(() => {
    // Clone initial records to ensure test isolation
    const cloned = INITIAL_FACILITY_RECORDS.map((r) => ({ ...r }))
    fm = new FacilitiesManager(cloned)
  })

  describe('Real-Use Event Dirt Accumulation', () => {
    it('accumulates dirt and fills trash bins in cafeteria after eating', () => {
      const initialCafe = fm.getRecord('fac_cafeteria')!
      const initialDirt = initialCafe.dirtLevel
      const initialBins = initialCafe.fillLevel

      fm.recordActivityImpression('christian', 'eat', 'CAFETERIA')

      const updated = fm.getRecord('fac_cafeteria')!
      expect(updated.dirtLevel).toBeGreaterThan(initialDirt)
      expect(updated.fillLevel).toBeGreaterThan(initialBins)
    })

    it('depletes water dispenser jug by 4% per drink event and enqueues replacement when depleted', () => {
      const jug = fm.getRecord('fac_dispenser_corridor_north_jug')!
      expect(jug.suppliesLevel).toBe(100)

      // 21 drinks = 84% depletion -> 16% remaining (<= 20% threshold)
      for (let i = 0; i < 21; i++) {
        fm.recordActivityImpression('gian', 'drink', 'CORRIDORS', 'dispenser_corridor_north')
      }

      const updatedJug = fm.getRecord('fac_dispenser_corridor_north_jug')!
      expect(updatedJug.suppliesLevel).toBeLessThanOrEqual(20)
      expect(updatedJug.status).toBe('needs_attention')

      const pending = fm.getPendingTasks()
      const jugTask = pending.find((t) => t.kind === 'replace_water_jug')
      expect(jugTask).toBeDefined()
      expect(jugTask?.priority).toBe('high')
    })

    it('accumulates dirt and depletes supplies in Comfort Room from visits', () => {
      const initialCr = fm.getRecord('fac_comfort_room')!
      const initialDirt = initialCr.dirtLevel
      const initialSupplies = initialCr.suppliesLevel

      fm.recordActivityImpression('neil_mar', 'cr', 'COMFORT_ROOM')

      const updated = fm.getRecord('fac_comfort_room')!
      expect(updated.dirtLevel).toBeGreaterThan(initialDirt)
      expect(updated.suppliesLevel).toBeLessThan(initialSupplies)
    })

    it('accumulates workout sweat/dirt in Rec & Gym', () => {
      const initialGym = fm.getRecord('fac_gym')!
      const initialDirt = initialGym.dirtLevel

      fm.recordActivityImpression('julian', 'gym', 'GYM')

      const updated = fm.getRecord('fac_gym')!
      expect(updated.dirtLevel).toBeGreaterThan(initialDirt)
    })

    it('depletes pantry coffee and snack supplies during coffee breaks', () => {
      const initialPantry = fm.getRecord('fac_pantry')!
      const initialSupplies = initialPantry.suppliesLevel

      fm.recordActivityImpression('gloria', 'coffee', 'PANTRY')

      const updated = fm.getRecord('fac_pantry')!
      expect(updated.suppliesLevel).toBeLessThan(initialSupplies)
    })
  })

  describe('Cleanliness Scoring Formula & HQ Average', () => {
    it('computes room cleanliness score between 0 and 100', () => {
      const report = fm.computeRoomCleanliness('CAFETERIA')
      expect(report.score).toBeGreaterThanOrEqual(0)
      expect(report.score).toBeLessThanOrEqual(100)
      expect(report.roomName).toContain('Cafeteria')
    })

    it('derives HQ average cleanliness from all tracked room reports', () => {
      const avg = fm.getHQCleanlinessAverage()
      expect(avg).toBeGreaterThanOrEqual(70)
      expect(avg).toBeLessThanOrEqual(100)
    })

    it('downgrades room status to needs_attention or dirty when dirt accumulates', () => {
      // Simulate heavy cafeteria lunch wave
      for (let i = 0; i < 10; i++) {
        fm.recordActivityImpression(`agent_${i}`, 'eat', 'CAFETERIA')
      }

      const report = fm.computeRoomCleanliness('CAFETERIA')
      expect(report.dirtLevel).toBeGreaterThan(50)
      expect(report.score).toBeLessThan(75)
    })
  })

  describe('Cleaners Priority Queue & Water Jug Replacement', () => {
    it('orders cleaning tasks by priority: urgent > high > normal > low', () => {
      fm.ensureCleaningTask('CORRIDORS', 'mop', 'low', 'Routine corridor dusting')
      fm.ensureCleaningTask('CAFETERIA', 'wipe_tables', 'normal', 'Lunch crumbs')
      fm.ensureCleaningTask('COMFORT_ROOM', 'clean_cr', 'urgent', 'Spill in stall 2')
      fm.ensureCleaningTask('GYM', 'mop', 'high', 'Sweat sanitization')

      const pending = fm.getPendingTasks()
      expect(pending[0].priority).toBe('urgent')
      expect(pending[0].roomId).toBe('COMFORT_ROOM')
      expect(pending[1].priority).toBe('high')
      expect(pending[2].priority).toBe('normal')
      expect(pending[3].priority).toBe('low')
    })

    it('posts wet floor sign while mopping and removes it after task completion', async () => {
      fm.ensureCleaningTask('CAFETERIA', 'mop', 'high', 'Mopping after spilled drinks')
      expect(fm.isWetFloor('CAFETERIA')).toBe(false)

      const task = fm.getNextCleaningTask('cleaner_1')
      expect(task).not.toBeNull()
      expect(task?.kind).toBe('mop')
      expect(fm.isWetFloor('CAFETERIA')).toBe(true)

      // Complete the task
      await fm.completeCleaningTask(task!.id, 'cleaner_1', 'Cleaner 1')
      expect(fm.isWetFloor('CAFETERIA')).toBe(false)
      expect(task!.status).toBe('completed')
    })

    it('resets water dispenser supplies to 100% when jug replacement completes', async () => {
      const jug = fm.getRecord('fac_dispenser_engineering_jug')!
      jug.suppliesLevel = 5.0
      jug.status = 'critical'

      const task = fm.ensureCleaningTask(
        'ENGINEERING',
        'replace_water_jug',
        'urgent',
        'Engineering water dispenser empty',
        'dispenser_engineering'
      )

      await fm.completeCleaningTask(task.id, 'cleaner_2', 'Cleaner 2')

      const updatedJug = fm.getRecord('fac_dispenser_engineering_jug')!
      expect(updatedJug.suppliesLevel).toBe(100.0)
      expect(updatedJug.status).toBe('clean')
    })
  })

  describe('Cleaners Maintenance Loop & Break Protection', () => {
    it('assigns tasks to active cleaners when energy is adequate', () => {
      fm.ensureCleaningTask('COMFORT_ROOM', 'clean_cr', 'high', 'Restocking soap')

      // Ensure cleaner_1 has high energy
      const rec = needsManager.getNeedsRecord('cleaner_1')
      rec.energy = 90

      const results = runCleanersMaintenanceTick(['cleaner_1'])
      expect(results[0].task).toBeDefined()
      expect(results[0].cleanerId).toBe('cleaner_1')
    })

    it('prevents exhausted cleaners from taking tasks and protects their break', () => {
      fm.ensureCleaningTask('GYM', 'mop', 'high', 'Gym clean')

      // Set cleaner_1 energy below exhaustion threshold
      const rec = needsManager.getNeedsRecord('cleaner_1')
      rec.energy = 10

      const results = runCleanersMaintenanceTick(['cleaner_1'])
      expect(results[0].task).toBeNull()
      expect(results[0].action).toContain('Resting/taking break')
    })
  })

  describe('JARVIS Function Calling Tools for Facilities', () => {
    it('executes get_facility_status and returns structured facility health and scores', () => {
      const res = executeJarvisTool('get_facility_status', { roomId: 'CAFETERIA' })
      expect(res.output).toBeDefined()
      expect(res.output.hqAverageCleanliness).toBeGreaterThan(0)
      expect(res.output.roomReport).toBeDefined()
    })

    it('executes request_cleaning to queue manual cleaning directive via JARVIS', () => {
      const res = executeJarvisTool('request_cleaning', {
        roomId: 'CAFETERIA',
        kind: 'wipe_tables',
        priority: 'high',
        reason: 'Operator requested cafeteria sanitization',
      })
      expect(res.output).toBeDefined()
      expect(res.output.success).toBe(true)
      const task = res.output.task as { roomId: string; kind: string }
      expect(task.roomId).toBe('CAFETERIA')
      expect(task.kind).toBe('wipe_tables')
    })
  })
})
