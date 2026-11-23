import { describe, it, expect } from 'vitest'
import { computeAgentActivities } from '../src/lib/office/activityDirector'
import { Agent, Approval, OfficeTask } from '../src/components/office/types'

const MOCK_AGENTS: Agent[] = Array.from({ length: 23 }, (_, i) => ({
  id: `agent-${i + 1}`,
  name: `Agent ${i + 1}`,
  role: i === 0 ? 'Founder & Architect' : 'Engineer',
  room: 'Engineering Core',
  status: 'working',
  updated_at: new Date().toISOString(),
}))

const MOCK_APPROVALS: Approval[] = [
  {
    id: 'app-1',
    agent_id: 'agent-3',
    agent_name: 'Agent 3',
    type: 'deployment',
    title: 'Deploy to Production',
    summary: 'Release gate verification',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
]

const MOCK_TASKS: OfficeTask[] = [
  {
    id: 'task-1',
    title: 'Task 1',
    department: 'Engineering Core',
    status: 'working',
  },
  {
    id: 'task-2',
    title: 'Task 2',
    department: 'Engineering Core',
    status: 'queued',
  },
  {
    id: 'task-3',
    title: 'Task 3',
    department: 'Operations',
    status: 'needs_approval',
  },
  { id: 'task-4', title: 'Task 4', department: 'QA', status: 'done' },
]

describe('Activity Director & Counter Parity Suite (Phase 16)', () => {
  it('guarantees 100% mathematical parity: sum of visible activities equals total agents', () => {
    const { stats } = computeAgentActivities(
      MOCK_AGENTS,
      'FOCUS_WORK',
      MOCK_APPROVALS,
      MOCK_TASKS
    )
    const sum =
      stats.working +
      stats.eating +
      stats.gym +
      stats.meeting +
      stats.break +
      stats.arriving +
      stats.waiting_on_you

    expect(sum).toBe(MOCK_AGENTS.length)
  })

  it('marks agents with pending approvals as waiting_on_you', () => {
    const { activities, stats } = computeAgentActivities(
      MOCK_AGENTS,
      'FOCUS_WORK',
      MOCK_APPROVALS,
      MOCK_TASKS
    )

    expect(activities['agent-3']?.activity).toBe('waiting_on_you')
    expect(stats.waiting_on_you).toBe(1)
  })

  it('enforces sane leisure limits: no more than 30% of team in gym or canteen during focus work', () => {
    const { stats } = computeAgentActivities(
      MOCK_AGENTS,
      'FOCUS_WORK',
      [],
      MOCK_TASKS
    )
    const maxAllowed = Math.floor(MOCK_AGENTS.length * 0.3)

    expect(stats.gym).toBeLessThanOrEqual(maxAllowed)
    expect(stats.eating).toBeLessThanOrEqual(maxAllowed)
  })

  it('switches all agents to meeting when in ALL_HANDS mode', () => {
    const { stats } = computeAgentActivities(
      MOCK_AGENTS,
      'ALL_HANDS',
      [],
      MOCK_TASKS
    )

    expect(stats.meeting).toBe(MOCK_AGENTS.length)
    expect(stats.working).toBe(0)
    expect(stats.gym).toBe(0)
    expect(stats.eating).toBe(0)
  })

  it('switches all agents to eating when in COFFEE_BREAK mode', () => {
    const { stats } = computeAgentActivities(
      MOCK_AGENTS,
      'COFFEE_BREAK',
      [],
      MOCK_TASKS
    )

    expect(stats.eating).toBe(MOCK_AGENTS.length)
    expect(stats.working).toBe(0)
    expect(stats.meeting).toBe(0)
  })

  it('tracks arriving agents during commute rush', () => {
    const arrivingSet = new Set(['agent-1', 'agent-2'])
    const { stats, activities } = computeAgentActivities(
      MOCK_AGENTS,
      'FOCUS_WORK',
      [],
      MOCK_TASKS,
      arrivingSet
    )

    expect(stats.arriving).toBe(2)
    expect(activities['agent-1']?.activity).toBe('arriving')
    expect(activities['agent-2']?.activity).toBe('arriving')
  })
})
