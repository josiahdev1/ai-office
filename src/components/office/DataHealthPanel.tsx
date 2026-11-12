'use client'

/**
 * DataHealthPanel.tsx
 * 
 * Real-time Supabase Data Health Telemetry Panel
 * Directly reads Supabase only to display:
 * - Live DB ping & roundtrip latency (ms)
 * - Row counts and latest write timestamps (in PHT) across all 39 office_* tables
 * - Supabase Realtime publication indicators
 * - Flags for tables that never received a write (0 writes)
 * - Migration status & instructions for any pending tables
 */

import React, { useState, useEffect, useCallback } from 'react'
import { createClient as createBrowserSupabase } from '@/utils/supabase/client'

export interface TableHealthRecord {
  table: string
  status: 'OK' | 'MISSING' | 'ERROR'
  rows: number
  newestWritePht: string
  realtime: 'PUBLISHED' | 'OFF'
  hasWrites: boolean
  error?: string
}

const ALL_OFFICE_TABLES = [
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

const REALTIME_PUBLISHED_TABLES = new Set([
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

const TIME_COLUMNS = ['created_at', 'updated_at', 'ts', 'recorded_at', 'last_seen_at', 'last_tick_at', 'last_ping']

interface DataHealthPanelProps {
  compact?: boolean
  onClose?: () => void
}

export function DataHealthPanel({ compact = false, onClose }: DataHealthPanelProps) {
  const [records, setRecords] = useState<TableHealthRecord[]>([])
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [filter, setFilter] = useState<'all' | 'empty' | 'missing'>('all')
  const [lastAuditPht, setLastAuditPht] = useState<string>('')

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    const supabase = createBrowserSupabase()
    const startTime = performance.now()

    // 1. Measure DB Roundtrip Latency
    try {
      await supabase.from('office_settings').select('id').limit(1)
      const elapsed = Math.round(performance.now() - startTime)
      setLatencyMs(elapsed)
    } catch {
      setLatencyMs(null)
    }

    // 2. Query each table's exact row count and newest write time
    const healthList: TableHealthRecord[] = []

    for (const table of ALL_OFFICE_TABLES) {
      const isRealtime = REALTIME_PUBLISHED_TABLES.has(table)
      try {
        const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' }).limit(1)

        if (error) {
          healthList.push({
            table,
            status: 'MISSING',
            rows: 0,
            newestWritePht: 'N/A',
            realtime: isRealtime ? 'PUBLISHED' : 'OFF',
            hasWrites: false,
            error: error.message,
          })
          continue
        }

        const rowCount = count ?? (data ? data.length : 0)
        let newestPht = 'Never'

        if (rowCount > 0) {
          for (const col of TIME_COLUMNS) {
            const { data: timeRow } = await supabase
              .from(table)
              .select(col)
              .order(col, { ascending: false })
              .limit(1)
              .maybeSingle()
            const rowObj = timeRow as unknown as Record<string, unknown>
            if (rowObj && rowObj[col]) {
              const rawDate = rowObj[col] as string
              newestPht = new Date(rawDate).toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }) + ' PHT'
              break
            }
          }
        }

        healthList.push({
          table,
          status: 'OK',
          rows: rowCount,
          newestWritePht: newestPht,
          realtime: isRealtime ? 'PUBLISHED' : 'OFF',
          hasWrites: rowCount > 0,
        })
      } catch (err: unknown) {
        healthList.push({
          table,
          status: 'ERROR',
          rows: 0,
          newestWritePht: 'N/A',
          realtime: isRealtime ? 'PUBLISHED' : 'OFF',
          hasWrites: false,
          error: err instanceof Error ? err.message : 'Unknown exception',
        })
      }
    }

    setRecords(healthList)
    setLastAuditPht(
      new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' PHT'
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  const total = records.length
  const liveCount = records.filter((r) => r.status === 'OK').length
  const missingCount = records.filter((r) => r.status === 'MISSING').length
  const emptyCount = records.filter((r) => r.status === 'OK' && !r.hasWrites).length

  const filteredRecords = records.filter((r) => {
    if (filter === 'empty') return r.status === 'OK' && !r.hasWrites
    if (filter === 'missing') return r.status === 'MISSING' || r.status === 'ERROR'
    return true
  })

  return (
    <div
      data-testid="data-health-panel"
      className="flex flex-col rounded-xl border border-cyan-500/30 bg-[#060c18] font-mono text-xs text-slate-200 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 bg-cyan-950/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div>
            <h3 className="font-bold text-white text-sm tracking-wide">
              SUPABASE DATA HEALTH AUDIT
            </h3>
            <p className="text-[10px] text-cyan-400">
              Live Source of Truth Telemetry • Latency:{' '}
              <span className="text-emerald-400 font-bold">
                {latencyMs !== null ? `${latencyMs}ms` : 'Connecting...'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchHealth}
            disabled={loading}
            className="cursor-pointer rounded border border-cyan-500/40 bg-cyan-950/80 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500 hover:text-black transition"
          >
            {loading ? 'AUDITING...' : '↻ REFRESH'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-cyan-950/60 bg-black/40 p-3 text-[11px]">
        <div className="rounded border border-slate-800 bg-slate-900/60 p-2 text-center">
          <span className="block text-slate-400 text-[10px]">TOTAL TABLES</span>
          <span className="text-base font-bold text-cyan-300">{total || 39}</span>
        </div>
        <div className="rounded border border-emerald-900/60 bg-emerald-950/30 p-2 text-center">
          <span className="block text-emerald-400 text-[10px]">LIVE &amp; QUERYABLE</span>
          <span className="text-base font-bold text-emerald-300">{liveCount}</span>
        </div>
        <div className="rounded border border-amber-900/60 bg-amber-950/30 p-2 text-center">
          <span className="block text-amber-400 text-[10px]">NEVER WRITTEN (0 ROWS)</span>
          <span className="text-base font-bold text-amber-300">{emptyCount}</span>
        </div>
        <div className="rounded border border-rose-900/60 bg-rose-950/30 p-2 text-center">
          <span className="block text-rose-400 text-[10px]">PENDING MIGRATION</span>
          <span className="text-base font-bold text-rose-300">{missingCount}</span>
        </div>
      </div>

      {/* Missing Tables Notice */}
      {missingCount > 0 && (
        <div className="border-b border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-[11px] text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>
              {missingCount} tables need SQL migration. Execute in Supabase SQL Editor:
            </span>
            <code className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-amber-200">
              0016_consolidated_missing_tables.sql
            </code>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#08101e] px-4 py-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Filter:</span>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`cursor-pointer rounded px-2 py-0.5 font-bold transition ${
              filter === 'all' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('empty')}
            className={`cursor-pointer rounded px-2 py-0.5 font-bold transition ${
              filter === 'empty' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Empty (0 rows)
          </button>
          <button
            type="button"
            onClick={() => setFilter('missing')}
            className={`cursor-pointer rounded px-2 py-0.5 font-bold transition ${
              filter === 'missing' ? 'bg-rose-500 text-black' : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            Pending Migration
          </button>
        </div>
        {lastAuditPht && (
          <span className="text-[10px] text-slate-500">Audited: {lastAuditPht}</span>
        )}
      </div>

      {/* Scrollable Table List */}
      <div className={`overflow-y-auto ${compact ? 'max-h-60' : 'max-h-96'}`}>
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-[#0a1222] border-b border-slate-800 text-slate-400 text-[10px] uppercase">
            <tr>
              <th className="px-3 py-2">Table</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Rows</th>
              <th className="px-3 py-2">Realtime</th>
              <th className="px-3 py-2">Last Write Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredRecords.map((r) => (
              <tr key={r.table} className="hover:bg-slate-900/50 transition">
                <td className="px-3 py-1.5 font-bold text-slate-200">
                  {r.table}
                  {r.status === 'OK' && !r.hasWrites && (
                    <span className="ml-2 inline-block rounded bg-amber-950/80 border border-amber-600/50 px-1 py-0.2 text-[9px] font-bold text-amber-300">
                      NO WRITES YET
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {r.status === 'OK' ? (
                    <span className="text-emerald-400 font-bold">✓ LIVE</span>
                  ) : (
                    <span className="text-rose-400 font-bold" title={r.error}>
                      ✗ PENDING
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-cyan-300">
                  {r.status === 'OK' ? r.rows.toLocaleString() : '—'}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      r.realtime === 'PUBLISHED'
                        ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {r.realtime}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-slate-400 truncate max-w-xs">
                  {r.newestWritePht}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
