import { NextRequest, NextResponse } from 'next/server'
import {
  addOfficeLog,
  checkRateLimit,
  getJarvisMessages,
  getOfficeState,
  saveJarvisMessage,
} from '@/lib/storage'
import {
  buildJarvisTelemetrySnapshot,
  detectJarvisProviderStatus,
  JarvisRequestSchema,
  runJarvisTurn,
} from '@/lib/jarvis/orchestrator'

export async function GET() {
  try {
    const providerStatus = detectJarvisProviderStatus()
    const [officeData, messages] = await Promise.all([
      getOfficeState(),
      getJarvisMessages(30),
    ])
    const telemetrySnapshot = buildJarvisTelemetrySnapshot(officeData)

    return NextResponse.json(
      {
        ok: true,
        providerStatus,
        messages,
        telemetrySnapshot,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: (err as Error).message || 'Failed to load Jarvis state',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const rate = checkRateLimit('jarvis-post')
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded. Please wait a moment.' },
      { status: 429 }
    )
  }

  let parsedBody: unknown
  try {
    parsedBody = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON request body' },
      { status: 400 }
    )
  }

  const validation = JarvisRequestSchema.safeParse(parsedBody)
  if (!validation.success) {
    return NextResponse.json(
      {
        ok: false,
        error: validation.error.issues[0]?.message || 'Validation failed',
        issues: validation.error.issues,
      },
      { status: 400 }
    )
  }

  const { prompt, operatorName, autonomyMode, history } = validation.data
  const wantsJson = req.headers.get('accept')?.includes('application/json')

  try {
    const officeData = await getOfficeState()

    // Persist operator message to Supabase office_messages & office_logs
    await Promise.allSettled([
      saveJarvisMessage({
        senderId: operatorName.toLowerCase().replace(/\s+/g, '_'),
        senderName: operatorName,
        senderDepartment: 'COMMAND',
        recipientId: 'jarvis',
        recipientName: 'J.A.R.V.I.S.',
        content: prompt,
        messageType: 'jarvis_user',
      }),
      addOfficeLog(
        `[JARVIS // DIRECTIVE] ${operatorName}: "${prompt.slice(0, 90)}"`,
        'system',
        'jarvis',
        operatorName,
        'info'
      ),
    ])

    if (wantsJson) {
      const turn = await runJarvisTurn({
        prompt,
        operatorName,
        autonomyMode,
        history,
        officeData,
      })

      await Promise.allSettled([
        saveJarvisMessage({
          senderId: 'jarvis',
          senderName: 'J.A.R.V.I.S.',
          senderDepartment: 'THE BRAIN',
          recipientId: operatorName.toLowerCase().replace(/\s+/g, '_'),
          recipientName: operatorName,
          content: turn.reply,
          messageType: 'jarvis_assistant',
        }),
        addOfficeLog(
          `[JARVIS // ${turn.intent}] (${turn.provider}): "${turn.reply.slice(0, 110)}"`,
          'system',
          'jarvis',
          'J.A.R.V.I.S.',
          'info'
        ),
      ])

      return NextResponse.json({ ok: true, data: turn })
    }

    // Stream Server-Sent Events (SSE)
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, payload: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
          )
        }

        try {
          const providerStatus = detectJarvisProviderStatus()
          sendEvent('status', {
            state: 'thinking',
            provider: providerStatus.provider,
            modelLabel: providerStatus.modelLabel,
            isLiveAI: providerStatus.isLiveAI,
          })

          const turn = await runJarvisTurn({
            prompt,
            operatorName,
            autonomyMode,
            history,
            officeData,
          })

          // Stream words in smooth high-cadence chunks so the UI and ArcReactor speaking ring animate naturally
          const words = turn.reply.split(/(\s+)/)
          let accumulated = ''
          const chunkSize = 4
          for (let i = 0; i < words.length; i += chunkSize) {
            const slice = words.slice(i, i + chunkSize).join('')
            accumulated += slice
            sendEvent('delta', {
              delta: slice,
              accumulated,
              state: 'speaking',
            })
            await new Promise((r) => setTimeout(r, 18))
          }

          await Promise.allSettled([
            saveJarvisMessage({
              senderId: 'jarvis',
              senderName: 'J.A.R.V.I.S.',
              senderDepartment: 'THE BRAIN',
              recipientId: operatorName.toLowerCase().replace(/\s+/g, '_'),
              recipientName: operatorName,
              content: turn.reply,
              messageType: 'jarvis_assistant',
            }),
            addOfficeLog(
              `[JARVIS // ${turn.intent}] (${turn.provider}): "${turn.reply.slice(0, 110)}"`,
              'system',
              'jarvis',
              'J.A.R.V.I.S.',
              'info'
            ),
          ])

          sendEvent('complete', turn)
        } catch (err: unknown) {
          sendEvent('error', {
            error: (err as Error).message || 'Jarvis stream interrupted',
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
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    )
  }
}
