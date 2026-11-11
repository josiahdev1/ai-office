import { NextRequest, NextResponse } from 'next/server'
import { getOfficeKnowledge, saveOfficeKnowledge } from '@/lib/storage'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''

    const items = await getOfficeKnowledge(query, category)
    return NextResponse.json({
      ok: true,
      count: items.length,
      knowledge: items,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || 'Failed to fetch knowledge' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body || typeof body.title !== 'string' || typeof body.content !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'title and content strings are required' },
        { status: 400 }
      )
    }

    const saved = await saveOfficeKnowledge({
      title: body.title.trim(),
      content: body.content.trim(),
      category: body.category || 'learning',
      agent_id: body.agent_id || 'jarvis',
      agent_name: body.agent_name || 'J.A.R.V.I.S.',
      tags: Array.isArray(body.tags) ? body.tags : [],
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    })

    return NextResponse.json({
      ok: true,
      item: saved,
      message: 'Knowledge stored successfully in collective agent brain memory',
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message || 'Failed to save knowledge' },
      { status: 500 }
    )
  }
}
