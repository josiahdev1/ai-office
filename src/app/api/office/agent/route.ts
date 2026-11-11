import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getOfficeState } from '@/lib/storage'
import { createClient } from '@supabase/supabase-js'
import { roomToDepartment } from '@/lib/office/db-map'

const CreateAgentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.string().min(2, 'Role must be at least 2 characters'),
  department: z.string().min(2, 'Department is required'),
  room: z.string().optional(),
  color: z.string().optional(),
  model: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const rawBody = await req.json()
    const parsed = CreateAgentSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { name, role, department, room, color, model } = parsed.data
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const finalDept = room ? roomToDepartment(room) : department
    const finalRoom = room || 'Engineering Core'

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''

    if (url && key) {
      const supabase = createClient(url, key, { auth: { persistSession: false } })

      // Check if already exists
      const { data: existing } = await supabase
        .from('office_agents')
        .select('id')
        .eq('id', id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { ok: false, error: `Agent with id "${id}" already exists` },
          { status: 409 }
        )
      }

      // Assign position
      const deskX = 5
      const deskY = 12

      const newAgentRow = {
        id,
        name,
        role,
        department: finalDept,
        current_room: finalRoom,
        desk_x: deskX,
        desk_y: deskY,
        current_x: deskX,
        current_y: deskY,
        status: 'coding',
        current_task: 'Onboarding & Workspace Sync',
        color: color || '#3b82f6',
        model: model || 'gemini-2.0-flash',
        updated_at: new Date().toISOString(),
      }

      const { data: inserted, error: insertError } = await supabase
        .from('office_agents')
        .insert(newAgentRow)
        .select()
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      // Log to office_logs
      await supabase.from('office_logs').insert({
        agent_id: id,
        agent_name: name,
        category: 'system',
        message: `New specialist ${name} (${role}) added to ${finalDept}.`,
        level: 'info',
        details: { id, department: finalDept },
      })

      const updatedState = await getOfficeState()
      return NextResponse.json({
        ok: true,
        agent: inserted,
        data: updatedState,
      })
    }

    return NextResponse.json(
      { ok: false, error: 'Database environment variables not configured' },
      { status: 500 }
    )
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    )
  }
}
