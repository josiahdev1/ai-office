import { NextRequest } from 'next/server'
import { getOfficeState } from '@/lib/storage'
import { executeAgentTask } from '@/lib/llm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId') || 'josiah'
  const task = searchParams.get('task') || 'Real-time telemetry heartbeat'

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        // Send initial connection event
        sendEvent('connected', {
          timestamp: new Date().toISOString(),
          agentId,
          task,
        })

        // Step 1: Initializing
        sendEvent('progress', {
          step: 1,
          label: 'Parsing operational directive...',
          pct: 20,
          terminal: `$ agy orchestrate --agent=${agentId}\n[INIT] Context graph loaded.`,
        })

        // Step 2: Running task via LLM / Provider
        const state = await getOfficeState()
        const agent =
          state.agents.find((a) => a.id === agentId) || state.agents[0]

        sendEvent('progress', {
          step: 2,
          label: `Synthesizing with ${agent.role}...`,
          pct: 60,
          terminal: `$ node --loader ts-node src/lib/${agentId}/runtime.ts\n[EXEC] Running unit specs & type validation...`,
        })

        const result = await executeAgentTask(
          agent.id,
          agent.name,
          agent.role,
          task
        )

        // Step 3: Complete
        sendEvent('complete', {
          step: 3,
          label: 'Completed',
          pct: 100,
          result,
        })
      } catch (err: unknown) {
        sendEvent('error', {
          error: (err as Error).message,
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
