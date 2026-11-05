import { describe, it, expect } from 'vitest'
import { executeAgentTask, getActiveLLMProviders } from '../src/lib/llm'
import { autoAssignDesks } from '../src/lib/storage'
import { Agent } from '../src/components/office/types'

describe('LLM Task Dispatch and Execution Lifecycle', () => {
  it('detects provider availability safely without exposing secrets', () => {
    const providers = getActiveLLMProviders()
    expect(providers).toHaveProperty('activeProvider')
    expect(['GEMINI', 'ANTHROPIC', 'OPENAI', 'SIM_MODE']).toContain(
      providers.activeProvider
    )
  })

  it('executes task through fallback with realistic output and files', async () => {
    const result = await executeAgentTask(
      'khent',
      'Khent',
      'Lead Security & QA Engineer',
      'Run regression test suite on auth endpoints'
    )

    expect(result).toBeDefined()
    expect(result.agentId).toBe('khent')
    expect(result.output).toBeDefined()
    expect(result.terminalSnippet).toContain('$ agy execute')
    expect(result.filesModified.length).toBeGreaterThan(0)
    expect(result.suggestedStatus).toBe('done')
  })

  it('stages Go-Signal requirement for production deployment directives', async () => {
    const result = await executeAgentTask(
      'bonnie',
      'Bonnie',
      'Cloud & DevOps Specialist',
      'Deploy v2.5D engine to production edge cluster'
    )

    expect(result.requiresGoSignal).toBe(true)
    expect(result.suggestedStatus).toBe('awaiting_approval')
    expect(result.approvalSummary).toContain('Go-Signal')
  })

  it('dynamically auto-assigns desks to agents without pre-existing coordinates', () => {
    const mockAgents: Agent[] = [
      {
        id: 'new_engineer_1',
        name: 'New Dev 1',
        role: 'Systems Engineer',
        room: 'Engineering Core',
        status: 'working',
        updated_at: new Date().toISOString(),
      },
      {
        id: 'new_engineer_2',
        name: 'New Dev 2',
        role: 'Systems Engineer',
        room: 'Engineering Core',
        status: 'working',
        updated_at: new Date().toISOString(),
      },
    ]

    const allocated = autoAssignDesks(mockAgents)
    expect(allocated[0].desk_coord).toBeDefined()
    expect(allocated[0].desk_coord?.x).toBeGreaterThan(0)
    expect(allocated[0].desk_coord?.y).toBeGreaterThan(0)

    expect(allocated[1].desk_coord).toBeDefined()
    // They should receive different desk slots
    expect(allocated[0].desk_id).not.toEqual(allocated[1].desk_id)
  })
})
