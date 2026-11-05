import { NextRequest, NextResponse } from 'next/server'
import { getOfficeState, updateAgent } from '@/lib/storage'

export async function GET() {
  try {
    const data = await getOfficeState()
    return NextResponse.json(
      { ok: true, data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentId, updates } = body || {}
    if (!agentId || !updates) {
      return NextResponse.json(
        { ok: false, error: 'agentId and updates are required' },
        { status: 400 }
      )
    }
    const data = await updateAgent(agentId, updates)
    return NextResponse.json({ ok: true, data })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    )
  }
}

