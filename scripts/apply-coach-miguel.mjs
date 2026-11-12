import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class {}
}

const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
let url = '', key = ''
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    url = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '')
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=') && !key) {
    key = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '')
  }
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !key) {
    key = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '')
  }
}

if (!url || !key) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  console.log('Connecting to Supabase at:', url)

  // 1. Upsert Coach Miguel into public.agents
  const agentPayload = {
    id: 'coach_miguel',
    name: 'Coach Miguel',
    role: 'Head Athletic Trainer & Ergonomics Coach',
    department: 'Facilities & Wellness',
    avatar: '/avatars/coach_miguel.png',
    status: 'working',
    sub_state: 'working',
    current_task: 'Leading functional conditioning circuits, treadmill runs, and desk ergonomics',
    current_file: 'wellness/gym_schedule.ts',
    terminal_preview: 'Active circuits: Treadmill Intervals, Prone Core Plank, Dumbbell Hypertrophy',
    progress_pct: 92,
    desk_id: 'gym-coach-1',
    desk_x: 20,
    desk_y: 28,
    color: '#ef4444',
    hair: '#1e293b',
    skin: '#fed7aa',
    last_action: 'Coaching treadmill form and floor conditioning in Rec & Gym'
  }

  const { error: err1 } = await supabase
    .from('agents')
    .upsert(agentPayload, { onConflict: 'id' })

  if (err1) {
    console.warn('agents upsert error (table may not exist or have RLS):', err1.message)
  } else {
    console.log('✓ Upserted Coach Miguel into public.agents')
  }

  // 2. Upsert Coach Miguel into public.office_agents
  const officeAgentPayload = {
    id: 'coach_miguel',
    name: 'Coach Miguel',
    role: 'Head Athletic Trainer & Ergonomics Coach',
    department: 'FACILITIES_WELLNESS',
    current_room: 'Rec & Gym',
    status: 'active',
    sub_state: 'working',
    color: '#ef4444',
    desk_x: 20,
    desk_y: 28,
    current_x: 20,
    current_y: 28,
    kind: 'resident',
    model: 'gemini-2.0-flash'
  }

  const { error: err2 } = await supabase
    .from('office_agents')
    .upsert(officeAgentPayload, { onConflict: 'id' })

  if (err2) {
    console.error('office_agents upsert error:', err2.message)
  } else {
    console.log('✓ Upserted Coach Miguel into public.office_agents')
  }

  // 3. Upsert Coach Miguel into public.office_agent_needs
  const needsPayload = {
    agent_id: 'coach_miguel',
    energy: 95.0,
    hunger: 85.0,
    thirst: 90.0,
    bladder: 90.0,
    health: 99.0,
    morale: 95.0,
    caffeine: 0.0,
    sleep_debt: 0.0,
    state: 'working',
  }

  const { error: err3 } = await supabase
    .from('office_agent_needs')
    .upsert(needsPayload, { onConflict: 'agent_id' })

  if (err3) {
    console.warn('office_agent_needs upsert warning:', err3.message)
  } else {
    console.log('✓ Upserted Coach Miguel into public.office_agent_needs')
  }

  // 4. Verify counts
  const { data: allOfficeAgents, error: countErr } = await supabase
    .from('office_agents')
    .select('id, name, department, current_room')

  if (countErr) {
    console.error('Count query error:', countErr.message)
  } else {
    console.log(`✓ Total agents in public.office_agents: ${allOfficeAgents.length}`)
  }
}

main().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
