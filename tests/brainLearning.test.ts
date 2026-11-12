import { describe, it, expect, beforeEach } from 'vitest'
import {
  BrainLearningManager,
  containsSecret,
  sanitizeSecretText,
  BrainInsightSchema,
  type RawEventItem,
} from '@/lib/office/brainLearningEngine'
import { mapTaskToBestAgent, DEFAULT_WELLNESS_POLICY } from '@/lib/office/jarvisWellness'
import { executeJarvisTool } from '@/lib/jarvis/orchestrator'
import { Agent } from '@/components/office/types'
import { needsManager } from '@/lib/office/needsEngine'

describe('Boss Gathering & Brain Learning Log Engine (Phase K7)', () => {
  let blm: BrainLearningManager

  beforeEach(() => {
    blm = new BrainLearningManager([])
  })

  describe('Secret Filter & Security Boundary', () => {
    it('detects sensitive API keys, tokens, and passwords', () => {
      expect(containsSecret('Normal office work note')).toBe(false)
      expect(containsSecret('Found OpenAI key sk-1234567890abcdef1234567890 in log')).toBe(true)
      expect(containsSecret('GitHub token ghp_1234567890abcdef1234567890')).toBe(true)
      expect(containsSecret('Database password="SuperSecretPassword123!"')).toBe(true)
    })

    it('sanitizes secrets and replaces them with [REDACTED_SECRET]', () => {
      const dirty = 'Using key sk-1234567890abcdef1234567890 to authenticate'
      const sanitized = sanitizeSecretText(dirty)
      expect(sanitized).not.toContain('sk-1234567890abcdef1234567890')
      expect(sanitized).toContain('[REDACTED_SECRET]')
    })

    it('rejects events containing secrets during Boss gathering and logs rejection', () => {
      const dirtyEvents: RawEventItem[] = [
        {
          id: 'ev_secret_1',
          type: 'task_completed',
          agentId: 'christian',
          content: 'Configured deployment with secret api_key="sk-1234567890abcdef1234567890"',
          timestamp: new Date().toISOString(),
        },
      ]

      const res = blm.runBossGather('manual', dirtyEvents)
      expect(res.rejected).toBe(1)
      expect(res.insightsCreated).toBe(0)

      const logs = blm.getLearningLogs()
      const rejectionLog = logs.find((l) => l.kind === 'rejected')
      expect(rejectionLog).toBeDefined()
      expect(rejectionLog?.text).toContain('rejected: contains sensitive API key')
    })
  })

  describe('Deterministic Statistics & Zod Validation', () => {
    it('calculates deterministic agent success rates and categories', () => {
      const events: RawEventItem[] = [
        { id: '1', type: 'task_completed', agentId: 'gian', category: 'test_automation', content: 'passed', timestamp: '2026-11-12' },
        { id: '2', type: 'task_completed', agentId: 'gian', category: 'test_automation', content: 'passed', timestamp: '2026-11-12' },
        { id: '3', type: 'task_failed', agentId: 'gian', category: 'test_automation', content: 'failed', timestamp: '2026-11-12' },
        { id: '4', type: 'task_completed', agentId: 'christian', category: 'architecture', content: 'passed', timestamp: '2026-11-12' },
      ]

      const stats = blm.computeDeterministicStats(events)
      const gianStats = stats.get('gian')!
      expect(gianStats.totalTasks).toBe(3)
      expect(gianStats.completedTasks).toBe(2)
      expect(gianStats.failedTasks).toBe(1)
      expect(gianStats.successRate).toBe(67)
      expect(gianStats.topCategories).toContain('test_automation')

      const christianStats = stats.get('christian')!
      expect(christianStats.totalTasks).toBe(1)
      expect(christianStats.successRate).toBe(100)
    })

    it('validates insight schema with Zod', () => {
      const valid = BrainInsightSchema.safeParse({
        id: 'ins_1',
        agentId: 'gian',
        kind: 'strength',
        category: 'agent_strength',
        text: 'Gian excels at test automation and verification.',
        confidence: 0.95,
        sourceIds: ['task_1'],
        pinned: true,
        deleted: false,
      })
      expect(valid.success).toBe(true)

      const invalid = BrainInsightSchema.safeParse({
        id: 'ins_invalid',
        kind: 'invalid_kind',
        text: 'Too short',
        confidence: 2.5, // Out of range
      })
      expect(invalid.success).toBe(false)
    })
  })

  describe('Incremental & Idempotent Runs (No Duplicates)', () => {
    it('creates insights on first run, and skips duplicates on subsequent runs', () => {
      const events: RawEventItem[] = [
        { id: 't1', type: 'task_completed', agentId: 'gian', agentName: 'Gian', category: 'test_automation', content: 'passed', timestamp: '2026-11-12' },
        { id: 't2', type: 'task_completed', agentId: 'gian', agentName: 'Gian', category: 'test_automation', content: 'passed', timestamp: '2026-11-12' },
      ]

      // First run: should create insight
      const firstRun = blm.runBossGather('manual', events)
      expect(firstRun.insightsCreated).toBe(1)
      expect(firstRun.duplicatesSkipped).toBe(0)

      // Second run with same events: should skip duplicate
      const secondRun = blm.runBossGather('manual', events)
      expect(secondRun.insightsCreated).toBe(0)
      expect(secondRun.duplicatesSkipped).toBe(1)

      const dupLog = blm.getLearningLogs().find((l) => l.kind === 'duplicate')
      expect(dupLog).toBeDefined()
      expect(dupLog?.text).toContain('Duplicate insight skipped')
    })
  })

  describe('Daily Token Cap & On/Off Toggle', () => {
    it('respects On/Off switch', () => {
      blm.setGatheringEnabled(false)
      const res = blm.runBossGather('manual', [
        { id: 't1', type: 'task_completed', agentId: 'gian', content: 'passed', timestamp: '2026-11-12' },
      ])
      expect(res.insightsCreated).toBe(0)
      expect(res.run.error).toContain('disabled')
    })

    it('enforces daily token cap and prevents run when cap is exhausted', () => {
      blm.setDailyTokenCap(100)
      // Artificially simulate token consumption exceeding cap
      blm['dailyTokensUsed'] = 150

      const res = blm.runBossGather('manual', [
        { id: 't1', type: 'task_completed', agentId: 'gian', content: 'passed', timestamp: '2026-11-12' },
      ])
      expect(res.run.status).toBe('failed')
      expect(res.run.error).toContain('Daily token cap reached')
    })
  })

  describe('Insight Pinning, Deletion, and Forgetting', () => {
    it('pins and unpins an insight', () => {
      blm.runBossGather('manual')
      const insight = blm.getAllInsights()[0]
      expect(insight).toBeDefined()

      blm.pinInsight(insight.id)
      expect(blm.getAllInsights().find((i) => i.id === insight.id)?.pinned).toBe(true)

      blm.unpinInsight(insight.id)
      expect(blm.getAllInsights().find((i) => i.id === insight.id)?.pinned).toBe(false)
    })

    it('forgets an insight and records forgotten log entry', () => {
      blm.runBossGather('manual')
      const insight = blm.getAllInsights()[0]
      expect(insight).toBeDefined()

      const success = blm.forgetInsight(insight.id)
      expect(success).toBe(true)

      // Marked deleted
      expect(blm.getAgentInsights().find((i) => i.id === insight.id)).toBeUndefined()

      // Log entry recorded
      const forgetLog = blm.getLearningLogs().find((l) => l.kind === 'forgotten')
      expect(forgetLog).toBeDefined()
      expect(forgetLog?.by).toBe('me')
    })

    it('exports clean RFC-4180 CSV with headers', () => {
      blm.runBossGather('manual')
      const csv = blm.exportBrainLogCSV()
      expect(csv).toContain('Timestamp (PHT)')
      expect(csv).toContain('Category')
      expect(csv).toContain('Confidence')
      expect(csv).toContain('Text')
    })
  })

  describe('Task Mapping Changes With Insights (Same Input, Different Winner)', () => {
    it('picks agent with highest energy when no insights exist, but picks agent with matching insight when insight is learned', () => {
      const christian: Agent = {
        id: 'christian',
        name: 'Christian',
        role: 'Systems Architect',
        room: 'Engineering Core',
        department: 'ENGINEERING',
        status: 'idle',
        current_task: '',
        updated_at: new Date().toISOString(),
      }

      const gian: Agent = {
        id: 'gian',
        name: 'Gian',
        role: 'QA Automation Lead',
        room: 'Engineering Core',
        department: 'ENGINEERING',
        status: 'idle',
        current_task: '',
        updated_at: new Date().toISOString(),
      }

      const agents = [christian, gian]

      // Set Christian's energy to 95, Gian's energy to 88
      const christianNeeds = needsManager.getNeedsRecord('christian')
      christianNeeds.energy = 95
      christianNeeds.health = 100
      christianNeeds.state = 'work'

      const gianNeeds = needsManager.getNeedsRecord('gian')
      gianNeeds.energy = 88
      gianNeeds.health = 100
      gianNeeds.state = 'work'

      // Case A: Generic Task ("Refactor database indices")
      // Christian wins based on higher raw energy (95 vs 88)
      const genericTask = { title: 'Refactor database indices', requiredDepartment: 'ENGINEERING' }
      const resA = mapTaskToBestAgent(genericTask, agents, DEFAULT_WELLNESS_POLICY)
      expect(resA.chosenAgent?.id).toBe('christian')
      expect(resA.reason).toContain('Christian')

      // Case B: Test Automation Task ("Run test automation regression verification")
      // Gian has the learned strength insight: "Gian is fastest on test automation..."
      // Gian's score is boosted (+45), winning over Christian (88 + 45 = 133 vs 95)!
      const testTask = { title: 'Run test automation regression verification', requiredDepartment: 'ENGINEERING' }
      const resB = mapTaskToBestAgent(testTask, agents, DEFAULT_WELLNESS_POLICY)
      expect(resB.chosenAgent?.id).toBe('gian')
      expect(resB.reason).toContain('fastest on test automation')
    })
  })

  describe('JARVIS Function Calling Tools for Brain Learning Log', () => {
    it('executes trigger_boss_gather via JARVIS', () => {
      const res = executeJarvisTool('trigger_boss_gather', { reason: 'Test gather' })
      expect(res.output).toBeDefined()
      expect(res.output.ok).toBe(true)
      expect(res.output.runId).toBeDefined()
      expect(res.output.status).toBe('completed')
    })

    it('executes get_brain_learning_log to answer "what did you learn today?"', () => {
      const res = executeJarvisTool('get_brain_learning_log', { limit: 5 })
      expect(res.output).toBeDefined()
      const output = res.output as { totalLearnedInsights: number; insights: unknown[] }
      expect(output.totalLearnedInsights).toBeGreaterThanOrEqual(1)
      expect(output.insights).toBeDefined()
    })

    it('executes manage_brain_insight to pin and forget insights', () => {
      const pinRes = executeJarvisTool('manage_brain_insight', {
        action: 'pin',
        insight_id: 'insight_gian_tests',
      })
      expect(pinRes.output.ok).toBe(true)

      const forgetRes = executeJarvisTool('manage_brain_insight', {
        action: 'forget',
        insight_id: 'insight_gian_tests',
      })
      expect(forgetRes.output.ok).toBe(true)
    })
  })
})
