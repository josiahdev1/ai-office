import { NextResponse } from 'next/server'
import { ApprovalRequestSchema, resolveApproval } from '@/lib/storage'

export async function POST(req: Request) {
  try {
    const rawBody = await req.json()
    const parseResult = ApprovalRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Validation failed',
          details: parseResult.error.format(),
        },
        { status: 400 }
      )
    }

    const { approvalId, action, resolvedBy, instruction } = parseResult.data
    const { remaining, logs, resolvedItem } = await resolveApproval(
      approvalId,
      action,
      resolvedBy,
      instruction
    )

    return NextResponse.json({
      ok: true,
      remaining,
      logs,
      resolvedItem,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    )
  }
}
