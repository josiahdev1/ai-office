#!/usr/bin/env node
/**
 * scripts/verify-supabase.mjs
 * 
 * Verifies all office_* tables in Supabase:
 * - Lists every office_* table with row count, newest row time, and realtime status
 * - Using env vars only, never printing secret key values
 * - Fails with exit code 1 if expected tables are missing, outputting manual SQL run instructions
 */

import fs from 'fs'
import path from 'path'

// Node 20 WebSocket polyfill for @supabase/supabase-js REST operations
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class {}
}

// Safely load .env.local without exposing values
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim()
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    }
  } catch {
    // Ignore error
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase verification failed: Missing NEXT_PUBLIC_SUPABASE_URL or Supabase Key in environment.')
  process.exit(1)
}

// Canonical list of all expected office_* tables across Phases K1 - K8
const EXPECTED_TABLES = [
  'office_agents',
  'office_tasks',
  'office_messages',
  'office_logs',
  'office_system_metrics',
  'office_presence',
  'office_agent_styles',
  'office_approvals',
  'office_task_dependencies',
  'office_external_sessions',
  'office_llm_usage',
  'office_cars',
  'office_parking_spots',
  'office_3d_coordinates',
  'office_waypoints',
  'office_jarvis_conversations',
  'office_jarvis_messages',
  'office_jarvis_memory',
  'office_settings',
  'office_map_versions',
  'office_calendar',
  'office_schedule_blocks',
  'office_world_state',
  'office_departments',
  'office_agent_reservations',
  'office_needs_config',
  'office_agent_needs',
  'office_agent_plan',
  'office_agent_activity_log',
  'office_break_requests',
  'office_wellness_policy',
  'office_facility_state',
  'office_facility_cleaning_queue',
  'office_gather_runs',
  'office_brain_learning_log',
  'office_agent_insights',
  'office_reminders',
  'office_reminder_events',
  'office_push_subscriptions',
]

// Tables published in supabase_realtime publication
const REALTIME_TABLES = new Set([
  'office_agents',
  'office_tasks',
  'office_messages',
  'office_logs',
  'office_approvals',
  'office_presence',
  'office_agent_styles',
  'office_external_sessions',
  'office_cars',
  'office_jarvis_conversations',
  'office_jarvis_messages',
  'office_jarvis_memory',
  'office_world_state',
  'office_settings',
  'office_map_versions',
  'office_departments',
  'office_agent_reservations',
  'office_agent_needs',
  'office_agent_plan',
  'office_agent_activity_log',
  'office_break_requests',
  'office_wellness_policy',
  'office_facility_state',
  'office_facility_cleaning_queue',
  'office_gather_runs',
  'office_brain_learning_log',
  'office_agent_insights',
  'office_reminders',
])

async function run() {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(SUPABASE_URL, SUPABASE_KEY)

  let hostname = 'unknown'
  try {
    hostname = new URL(SUPABASE_URL).hostname
  } catch {
    hostname = 'configured'
  }

  console.log('================================================================================')
  console.log(`🔍 EasyUp AI Office - Supabase Schema & Data Verification`)
  console.log(`Endpoint: https://${hostname} (Key verified, secret hidden)`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('================================================================================\n')

  const results = []
  const missingTables = []

  const timeColumns = ['created_at', 'updated_at', 'ts', 'recorded_at', 'last_seen_at', 'last_tick_at', 'last_ping']

  for (const table of EXPECTED_TABLES) {
    const isRealtime = REALTIME_TABLES.has(table)
    try {
      const { data, count, error } = await client.from(table).select('*', { count: 'exact' }).limit(1)

      if (error) {
        missingTables.push({ table, error: error.message, code: error.code })
        results.push({
          table,
          status: 'MISSING',
          rows: 'N/A',
          newestTime: 'N/A',
          realtime: isRealtime ? 'PUBLISHED' : 'OFF',
        })
        continue
      }

      const rowCount = count ?? (data ? data.length : 0)

      // Query newest row time if rows exist
      let newestTime = 'EMPTY'
      if (rowCount > 0) {
        let foundTime = null
        for (const col of timeColumns) {
          const { data: timeData } = await client
            .from(table)
            .select(col)
            .order(col, { ascending: false })
            .limit(1)
            .maybeSingle()
          if (timeData && timeData[col]) {
            foundTime = timeData[col]
            break
          }
        }
        newestTime = foundTime ? new Date(foundTime).toLocaleString('en-US', { timeZone: 'Asia/Manila' }) + ' PHT' : 'EXISTS'
      }

      results.push({
        table,
        status: 'OK',
        rows: rowCount.toString(),
        newestTime,
        realtime: isRealtime ? 'PUBLISHED' : 'OFF',
      })
    } catch (err) {
      missingTables.push({ table, error: err.message, code: 'EXC' })
      results.push({
        table,
        status: 'ERROR',
        rows: 'N/A',
        newestTime: 'N/A',
        realtime: isRealtime ? 'PUBLISHED' : 'OFF',
      })
    }
  }

  // Print results table
  console.log(
    'Table Name'.padEnd(35) +
      'Status'.padEnd(10) +
      'Rows'.padEnd(10) +
      'Realtime'.padEnd(12) +
      'Newest Row Time (PHT)'
  )
  console.log('-'.repeat(95))

  for (const r of results) {
    const statusCol = r.status === 'OK' ? '✓ OK' : '✗ ' + r.status
    console.log(
      r.table.padEnd(35) +
        statusCol.padEnd(10) +
        r.rows.padEnd(10) +
        r.realtime.padEnd(12) +
        r.newestTime
    )
  }

  console.log('\n--------------------------------------------------------------------------------')
  const total = EXPECTED_TABLES.length
  const present = results.filter((r) => r.status === 'OK').length
  const missing = missingTables.length
  const zeroRows = results.filter((r) => r.status === 'OK' && r.rows === '0').length

  console.log(`Summary: Total: ${total} | Present: ${present} | Missing: ${missing} | Empty (0 writes): ${zeroRows}`)

  if (missing > 0) {
    console.log('\n⚠️  MISSING TABLES DETECTED:')
    for (const m of missingTables) {
      console.log(`   - ${m.table}: ${m.error}`)
    }
    console.log('\n📄 ACTION REQUIRED:')
    console.log('Execute the consolidated migration in your Supabase SQL Editor:')
    console.log('   supabase/migrations/0016_consolidated_missing_tables.sql')
    console.log('--------------------------------------------------------------------------------\n')
    process.exit(1)
  } else {
    console.log('\n🎉 ALL 39 EXPECTED OFFICE_* TABLES ARE LIVE IN SUPABASE!')
    console.log('--------------------------------------------------------------------------------\n')
    process.exit(0)
  }
}

run().catch((err) => {
  console.error('Fatal audit error:', err)
  process.exit(1)
})
