import { NextResponse } from 'next/server'
import { getOfficeState } from '@/lib/storage'

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
