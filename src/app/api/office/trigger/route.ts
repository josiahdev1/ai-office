import { NextResponse } from 'next/server';
import { TriggerRequestSchema, triggerTask } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parseResult = TriggerRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { agentId, taskDescription, actionName } = parseResult.data;
    const task = taskDescription || actionName || 'Execute operational directive';

    const updatedState = await triggerTask(agentId, task);

    return NextResponse.json({
      ok: true,
      data: updatedState,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
