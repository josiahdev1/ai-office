import { NextRequest, NextResponse } from 'next/server'
import { executeWorldTick, verifyCronSecret } from '@/lib/office/scheduler'

export async function POST(req: NextRequest) {
  return handleTick(req)
}

export async function GET(req: NextRequest) {
  return handleTick(req)
}

async function handleTick(req: NextRequest) {
  // 1. Extract secret from Authorization header or ?secret= param
  const authHeader = req.headers.get('authorization')
  let token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) {
    const url = new URL(req.url)
    token = url.searchParams.get('secret') || undefined
  }

  // 2. Validate timing-safe secret
  const isAuthorized = verifyCronSecret(token)
  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized: invalid or missing CRON_SECRET' },
      { status: 401 }
    )
  }

  // 3. Determine source
  const source = req.headers.get('x-vercel-cron')
    ? 'cron'
    : req.headers.get('x-source') === 'edge_function'
      ? 'edge_function'
      : req.headers.get('x-source') === 'leader_tab'
        ? 'leader_tab'
        : 'manual'

  // 4. Execute tick
  const result = executeWorldTick(source)

  return NextResponse.json({
    status: 'ok',
    tick: result,
  })
}
