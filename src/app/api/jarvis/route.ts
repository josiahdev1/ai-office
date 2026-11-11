import dns from 'dns'
import { NextRequest, NextResponse } from 'next/server'

try {
  dns.setDefaultResultOrder('ipv4first')
} catch {
  // Ignore in edge runtime
}
import {
  addOfficeLog,
  checkRateLimit,
  getFastOfficeState,
  getJarvisMessages,
  getJarvisRollingMemory,
  saveJarvisMessage,
  saveJarvisRollingMemory,
} from '@/lib/storage'
import {
  buildJarvisTelemetrySnapshot,
  detectJarvisProviderStatus,
  JarvisRequestSchema,
  runJarvisTurn,
} from '@/lib/jarvis/orchestrator'

let cachedFastOfficeState: Awaited<ReturnType<typeof getFastOfficeState>> | null =
  null
let cachedFastOfficeStateAt = 0

async function getUltraFastOfficeState() {
  const now = Date.now()
  if (cachedFastOfficeState && now - cachedFastOfficeStateAt < 8000) {
    return cachedFastOfficeState
  }
  if (cachedFastOfficeState) {
    // Return cached immediately and refresh in background
    void getFastOfficeState()
      .then((fresh) => {
        cachedFastOfficeState = fresh
        cachedFastOfficeStateAt = Date.now()
      })
      .catch(() => {})
    return cachedFastOfficeState
  }
  const fresh = await getFastOfficeState()
  cachedFastOfficeState = fresh
  cachedFastOfficeStateAt = Date.now()
  return fresh
}

export async function GET() {
  try {
    const providerStatus = detectJarvisProviderStatus()
    const [officeData, messages, memory] = await Promise.all([
      getUltraFastOfficeState(),
      getJarvisMessages(20),
      getJarvisRollingMemory(),
    ])
    const telemetrySnapshot = buildJarvisTelemetrySnapshot(officeData)

    return NextResponse.json(
      {
        ok: true,
        providerStatus,
        messages,
        memory,
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

  const {
    prompt,
    operatorName,
    autonomyMode,
    preferredModel,
    allowLocalSlmFallback,
    history,
    rollingSummary,
  } = validation.data
  const wantsJson = req.headers.get('accept')?.includes('application/json')

  try {
    const officeData = await getUltraFastOfficeState()
    const effectiveRollingSummary = rollingSummary ?? ''

    // Non-blocking background persistence of operator message
    void Promise.allSettled([
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
        preferredModel,
        allowLocalSlmFallback,
        history,
        rollingSummary: effectiveRollingSummary,
        officeData,
      })

      void Promise.allSettled([
        saveJarvisMessage({
          senderId: 'jarvis',
          senderName: 'J.A.R.V.I.S.',
          senderDepartment: 'THE BRAIN',
          recipientId: operatorName.toLowerCase().replace(/\s+/g, '_'),
          recipientName: operatorName,
          content: turn.reply,
          messageType: 'jarvis_assistant',
        }),
        saveJarvisRollingMemory({
          operatorName,
          rollingSummary: turn.rollingSummary || effectiveRollingSummary,
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
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
            )
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
            preferredModel,
            allowLocalSlmFallback,
            history,
            rollingSummary: effectiveRollingSummary,
            officeData,
          })

          // Stream progressive word chunks so the typing indicator transitions smoothly into live streaming text
          const words = turn.reply.split(' ')
          const chunkSize = Math.max(3, Math.ceil(words.length / 6))
          let accumulated = ''
          for (let i = 0; i < words.length; i += chunkSize) {
            const slice = words.slice(i, i + chunkSize).join(' ')
            accumulated = accumulated ? `${accumulated} ${slice}` : slice
            sendEvent('delta', {
              delta: slice,
              accumulated,
              state: 'speaking',
            })
          }

          sendEvent('complete', turn)

          // Persist Jarvis response and rolling memory asynchronously
          void Promise.allSettled([
            saveJarvisMessage({
              senderId: 'jarvis',
              senderName: 'J.A.R.V.I.S.',
              senderDepartment: 'THE BRAIN',
              recipientId: operatorName.toLowerCase().replace(/\s+/g, '_'),
              recipientName: operatorName,
              content: turn.reply,
              messageType: 'jarvis_assistant',
            }),
            saveJarvisRollingMemory({
              operatorName,
              rollingSummary: turn.rollingSummary || effectiveRollingSummary,
            }),
            addOfficeLog(
              `[JARVIS // ${turn.intent}] (${turn.provider}): "${turn.reply.slice(0, 110)}"`,
              'system',
              'jarvis',
              'J.A.R.V.I.S.',
              'info'
            ),
          ])
        } catch (err: unknown) {
          sendEvent('error', {
            error: (err as Error).message || 'Gemini unreachable',
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
      { ok: false, error: (err as Error).message || 'Gemini unreachable' },
      { status: 502 }
    )
  }
}
