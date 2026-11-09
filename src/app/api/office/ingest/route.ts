import { NextRequest, NextResponse } from 'next/server'
import { officeSupabase } from '@/lib/supabase/officeService'
import { officeBus } from '@/lib/office/bus'
import {
  constantTimeCompare,
  IngestEventSchema,
} from '@/lib/office/ingestSchema'

// =============================================================================
// Rate Limiter (Sliding Window per IP / Client)
// =============================================================================
const rateLimitWindowMs = 60 * 1000 // 1 minute
const maxRequestsPerWindow = 120
const requestLog = new Map<string, number[]>()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const timestamps = (requestLog.get(key) || []).filter(
    (t) => now - t < rateLimitWindowMs
  )
  if (timestamps.length >= maxRequestsPerWindow) {
    return false
  }
  timestamps.push(now)
  requestLog.set(key, timestamps)
  return true
}

// =============================================================================
// POST Handler
// =============================================================================
export async function POST(req: NextRequest) {
  try {
    // 1. Authorization check
    const authHeader = req.headers.get('authorization') || ''
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (!match) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Unauthorized: Missing or invalid Authorization header',
        },
        { status: 401 }
      )
    }

    const providedToken = match[1]
    const serverToken =
      process.env.OFFICE_INGEST_TOKEN || 'easyup_bridge_dev_secret_2026'

    if (!constantTimeCompare(providedToken, serverToken)) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: Invalid bearer token' },
        { status: 403 }
      )
    }

    // 2. Rate limiting check
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Too Many Requests: Rate limit exceeded (max 120/min)',
        },
        { status: 429 }
      )
    }

    // 3. Parse and validate payload
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Bad Request: Malformed JSON body' },
        { status: 400 }
      )
    }

    const parseResult = IngestEventSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Validation Error: Event schema invalid',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    const event = parseResult.data

    // 4. Map event to Supabase updates & activity logs
    let status = 'working'
    let currentTool: string | null = null
    let logMessage = ''

    switch (event.event) {
      case 'session_start':
        status = 'working'
        logMessage = `[BRIDGE] Session started: ${event.cli} (ID: ${event.session_id.slice(0, 8)})`
        break
      case 'tool_start':
        status = 'working'
        currentTool = event.tool
        logMessage = `[BRIDGE] ${event.cli} tool start: ${event.tool}`
        break
      case 'tool_end':
        status = 'working'
        currentTool = null
        logMessage = `[BRIDGE] ${event.cli} tool end: ${event.tool}`
        break
      case 'waiting_approval':
        status = 'awaiting_approval'
        logMessage = `[BRIDGE] ${event.cli} waiting for user approval`
        break
      case 'token_usage':
        logMessage = `[BRIDGE] ${event.cli} token usage: +${event.tokens} tokens`
        break
      case 'session_end':
        status = 'done'
        logMessage = `[BRIDGE] Session ended: ${event.cli} (ID: ${event.session_id.slice(0, 8)})`
        break
    }

    // Publish to local in-memory event bus
    officeBus.publish({
      from: `bridge_${event.cli}`,
      fromName: `${event.cli.toUpperCase()}`,
      to: 'all',
      toName: 'Bridge Ingest',
      text: logMessage,
    })

    // Upsert into public.office_sessions
    try {
      const sessionPayload: Record<string, unknown> = {
        cli: event.cli,
        session_id: event.session_id,
        cwd_hash: event.cwd_hash || null,
        status,
        current_tool: currentTool,
        last_seen_at: new Date().toISOString(),
      }

      if (event.event === 'token_usage') {
        sessionPayload.tokens_used = event.total_tokens ?? event.tokens
      }
      if (event.event === 'session_end') {
        sessionPayload.ended_at = new Date().toISOString()
      }

      const client = officeSupabase.getClient()
      await client.from('office_sessions').upsert(sessionPayload, {
        onConflict: 'session_id',
      })

      // Log to office_logs
      await officeSupabase.logActivity('bridge', logMessage, {
        id: `guest_${event.session_id.slice(0, 8)}`,
        name: `${event.cli} Guest`,
      })
    } catch {
      // Graceful offline fallback
    }

    return NextResponse.json({
      ok: true,
      event: event.event,
      session_id: event.session_id,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Internal Server Error: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}
