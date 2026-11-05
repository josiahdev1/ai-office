import { describe, it, expect } from 'vitest'
import { resolveNameTagPositions, AgentTagInput } from '../src/lib/office/antiOverlap'

describe('Office V3 Agent Name Tag Anti-Overlap Solver (Phase 5 & Quick Fix)', () => {
  const sampleAgents: AgentTagInput[] = [
    { id: 'eng-1', name: 'Arwin', x: 700, y: 380, priority: 5 },
    { id: 'eng-2', name: 'Nelmar', x: 710, y: 385, priority: 1 },
    { id: 'eng-3', name: 'Neil Mar', x: 695, y: 382, priority: 1 },
    { id: 'eng-4', name: 'John Lloyd', x: 720, y: 390, priority: 1 },
    { id: 'exec-1', name: 'Josiah', x: 650, y: 350, priority: 10 },
    { id: 'exec-2', name: 'Mary Grace', x: 680, y: 410, priority: 3 },
    { id: 'qa-1', name: 'Gian', x: 670, y: 400, priority: 2 },
    { id: 'qa-2', name: 'John Arvy', x: 665, y: 405, priority: 1 },
  ]

  it('computes valid tag offsets for all provided agents', () => {
    const result = resolveNameTagPositions(sampleAgents, { zoom: 1.0 })
    expect(result.size).toBe(sampleAgents.length)

    sampleAgents.forEach((ag) => {
      const offset = result.get(ag.id)
      expect(offset).toBeDefined()
      expect(typeof offset?.offsetX).toBe('number')
      expect(typeof offset?.offsetY).toBe('number')
      expect(offset?.isCollapsed).toBe(false)
    })
  })

  it('separates closely clustered adjacent agents so bounding boxes do not overlap', () => {
    // eng-1 (700, 380) and eng-3 (695, 382) are only 5px apart
    const result = resolveNameTagPositions(sampleAgents, { zoom: 1.0 })
    const box1 = result.get('eng-1')?.box
    const box3 = result.get('eng-3')?.box

    expect(box1).toBeDefined()
    expect(box3).toBeDefined()

    // Bounding boxes must not collide
    const overlaps = !(
      box1!.right <= box3!.left ||
      box1!.left >= box3!.right ||
      box1!.bottom <= box3!.top ||
      box1!.top >= box3!.bottom
    )
    expect(overlaps).toBe(false)
  })

  it('collapses to compact dot representation when zoomed out below threshold', () => {
    const result = resolveNameTagPositions(sampleAgents, { zoom: 0.35, collapseZoomThreshold: 0.45 })
    sampleAgents.forEach((ag) => {
      const offset = result.get(ag.id)
      expect(offset?.isCollapsed).toBe(true)
    })
  })

  it('preserves priority tags near default position', () => {
    const result = resolveNameTagPositions(sampleAgents, { zoom: 1.0 })
    const josiahOffset = result.get('exec-1')
    // Highest priority tag gets top candidate dy = -22
    expect(josiahOffset?.offsetY).toBe(-22)
    expect(josiahOffset?.offsetX).toBe(0)
  })
})
