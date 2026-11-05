import { NextResponse } from 'next/server'
import { z } from 'zod'
import { executeAgentTask } from '@/lib/llm'
import { getOfficeState, saveOfficeState } from '@/lib/storage'

const RunRequestSchema = z.object({
  agentId: z.string().min(1),
  task: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const rawBody = await req.json()
    const parsed = RunRequestSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Validation failed',
          details: parsed.error.format(),
        },
        { status: 400 }
      )
    }

    const { agentId, task } = parsed.data
    const state = await getOfficeState()
    const agent = state.agents.find((a) => a.id === agentId)

    if (!agent) {
      return NextResponse.json(
        { ok: false, error: `Agent ${agentId} not found` },
        { status: 404 }
      )
    }

    // Execute through LLM hierarchy
    const result = await executeAgentTask(
      agent.id,
      agent.name,
      agent.role,
      task
    )

    // Update agent state
    agent.current_task = task
    agent.terminal_preview = result.terminalSnippet
    agent.current_file = result.filesModified[0] || agent.current_file
    agent.last_action = `[${result.provider}] ${task}`
    agent.progress_pct = result.requiresGoSignal ? 50 : 100
    agent.status = result.requiresGoSignal ? 'awaiting_approval' : 'done'
    agent.sub_state = result.requiresGoSignal ? 'reading_logs' : 'seated'
    agent.updated_at = new Date().toISOString()

    // Stage approval if needed
    if (result.requiresGoSignal) {
      const approvalId = `appr-${Date.now()}`
      state.approvals.unshift({
        id: approvalId,
        agent_id: agent.id,
        agent_name: agent.name,
        room: agent.room,
        type: 'Production Directive',
        title: `Authorize ${task}`,
        summary:
          result.approvalSummary ||
          `Awaiting Josiah's Go-Signal to proceed with ${task}.`,
        created_at: new Date().toISOString(),
      })
    }

    // Add activity log
    const timestamp = new Date().toLocaleTimeString()
    state.logs = [
      `[${timestamp}] [${result.provider}] ${agent.name} executed: "${task}".`,
      ...(state.logs || []),
    ].slice(0, 25)

    await saveOfficeState(state)

    return NextResponse.json({
      ok: true,
      result,
      data: state,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    )
  }
}
