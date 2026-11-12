'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  AgentActivityLogRecord,
  ActivityKind,
  needsManager,
  exportActivityLogToCSV,
} from '@/lib/office/needsEngine'
import { officeSupabase } from '@/lib/supabase/officeService'

interface AgentLogDrawerProps {
  isOpen: boolean
  onClose: () => void
  initialAgentId?: string | null
  agentList: Array<{ id: string; name: string }>
}

const ACTIVITY_COLORS: Record<ActivityKind, string> = {
  work: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  eat: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  drink: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  coffee: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  cr: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  nap: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  sleep: 'bg-violet-950/40 text-violet-300 border-violet-500/40',
  gym: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  lounge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  social: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  clean: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  walk_break: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  request: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  decision: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
  wake: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
}

const TIMELINE_BLOCK_COLORS: Record<ActivityKind, string> = {
  work: '#6366f1',
  eat: '#f59e0b',
  drink: '#06b6d4',
  coffee: '#10b981',
  cr: '#f43f5e',
  nap: '#a855f7',
  sleep: '#6d28d9',
  gym: '#0284c7',
  lounge: '#14b8a6',
  social: '#ec4899',
  clean: '#eab308',
  walk_break: '#3b82f6',
  request: '#ea580c',
  decision: '#84cc16',
  wake: '#d946ef',
}

export function AgentLogDrawer({
  isOpen,
  onClose,
  initialAgentId,
  agentList,
}: AgentLogDrawerProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>(initialAgentId || 'ALL')
  const [selectedKind, setSelectedKind] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [logs, setLogs] = useState<AgentActivityLogRecord[]>([])
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  useEffect(() => {
    if (initialAgentId) {
      queueMicrotask(() => setSelectedAgent(initialAgentId))
    }
  }, [initialAgentId])

  const loadLogs = useCallback(() => {
    const records = needsManager.getActivityLogs()
    setLogs(records)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    queueMicrotask(() => loadLogs())

    // Realtime subscription to office_agent_activity_log
    try {
      const client = officeSupabase.getClient()
      const channel = client
        .channel('realtime_agent_activity_log')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'office_agent_activity_log' },
          (payload) => {
            if (payload.new) {
              const newRecord: AgentActivityLogRecord = {
                id: payload.new.id,
                ts: payload.new.ts,
                tsPht: payload.new.ts_pht,
                agentId: payload.new.agent_id,
                kind: payload.new.kind,
                phase: payload.new.phase,
                reason: payload.new.reason,
                decidedBy: payload.new.decided_by,
                durationS: payload.new.duration_s || 0,
                demo: payload.new.demo || false,
                needsBefore: payload.new.needs_before,
                needsAfter: payload.new.needs_after,
              }
              setLogs((prev) => [newRecord, ...prev].slice(0, 500))
            }
          }
        )
        .subscribe()

      return () => {
        void client.removeChannel(channel)
      }
    } catch {
      // Fallback
    }
  }, [isOpen, loadLogs])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedAgent !== 'ALL' && log.agentId !== selectedAgent) {
        return false
      }
      if (selectedKind !== 'ALL' && log.kind !== selectedKind) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const match =
          log.agentId.toLowerCase().includes(q) ||
          log.reason.toLowerCase().includes(q) ||
          log.kind.toLowerCase().includes(q) ||
          log.decidedBy.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [logs, selectedAgent, selectedKind, searchQuery])

  const handleExportCSV = () => {
    const csv = exportActivityLogToCSV(filteredLogs)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `office_agent_activity_log_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 24-hour PHT Timeline Blocks for the currently selected agent
  const timelineAgentId = selectedAgent === 'ALL' ? (agentList[0]?.id || 'boss') : selectedAgent
  const timelineAgentName = agentList.find((a) => a.id === timelineAgentId)?.name || timelineAgentId

  const timelineBlocks = useMemo(() => {
    // Generate deterministic 24-hr schedule bands
    return [
      { start: 0, end: 6, kind: 'sleep' as ActivityKind, label: 'Night Rest' },
      { start: 6, end: 7, kind: 'cr' as ActivityKind, label: 'Morning Prep' },
      { start: 7, end: 8, kind: 'eat' as ActivityKind, label: 'Breakfast' },
      { start: 8, end: 9, kind: 'drink' as ActivityKind, label: 'Arrival & Hydration' },
      { start: 9, end: 12, kind: 'work' as ActivityKind, label: 'Morning Core Work' },
      { start: 12, end: 13.5, kind: 'eat' as ActivityKind, label: 'Grand Cafeteria Lunch' },
      { start: 13.5, end: 14, kind: 'coffee' as ActivityKind, label: 'Pantry Coffee Dip Reset' },
      { start: 14, end: 17, kind: 'work' as ActivityKind, label: 'Sprint Execution' },
      { start: 17, end: 18.5, kind: 'gym' as ActivityKind, label: 'Campus Gym Workout' },
      { start: 18.5, end: 19.5, kind: 'eat' as ActivityKind, label: 'Dinner' },
      { start: 19.5, end: 22, kind: 'social' as ActivityKind, label: 'Lounge & Brain Sync' },
      { start: 22, end: 24, kind: 'sleep' as ActivityKind, label: 'Night Rest' },
    ]
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-2xl flex-col border-l border-cyan-500/30 bg-[#0a0f1d] shadow-2xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
              AGENT ACTIVITY LOG & TIMELINE
            </h2>
            <span className="rounded-md border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
              SIMULATED
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-300 hover:border-cyan-400 hover:text-cyan-300 transition-all"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 24-Hour PHT Day Timeline Section */}
        <div className="border-b border-slate-800/80 bg-slate-950/40 p-4 space-y-2">
          <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
            <span>
              24-HR PHT DAY TIMELINE · <span className="text-cyan-400 font-bold">{timelineAgentName}</span>
            </span>
            <span className="text-slate-500">Iloilo City (Asia/Manila, UTC+8)</span>
          </div>

          {/* Timeline Bar */}
          <div className="relative h-7 w-full rounded-md overflow-hidden bg-slate-900 border border-slate-800 flex">
            {timelineBlocks.map((blk, idx) => {
              const widthPct = ((blk.end - blk.start) / 24) * 100
              const bg = TIMELINE_BLOCK_COLORS[blk.kind] || '#6366f1'
              return (
                <div
                  key={idx}
                  title={`${blk.label} (${blk.start}:00 - ${blk.end}:00 PHT)`}
                  className="group relative h-full flex items-center justify-center cursor-pointer border-r border-slate-950/30 transition-opacity hover:opacity-90"
                  style={{ width: `${widthPct}%`, backgroundColor: bg }}
                >
                  <span className="truncate px-1 font-mono text-[9px] font-bold text-slate-950 uppercase hidden md:inline">
                    {blk.kind}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Hours Ruler */}
          <div className="flex justify-between font-mono text-[9px] text-slate-500 px-0.5">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 border-b border-slate-800/80 bg-slate-950/60 p-4">
          <div>
            <label className="block font-mono text-[10px] text-slate-400 mb-1">FILTER BY AGENT</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">All Agents (27)</option>
              {agentList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[10px] text-slate-400 mb-1">ACTIVITY KIND</label>
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">All Activities</option>
              <option value="work">Work (Coding/Tasks)</option>
              <option value="eat">Eat (Cafeteria)</option>
              <option value="drink">Drink (Water Dispenser)</option>
              <option value="coffee">Coffee (Pantry)</option>
              <option value="cr">CR (Comfort Room)</option>
              <option value="nap">Nap (Wellness Bed)</option>
              <option value="sleep">Sleep (Night Rest)</option>
              <option value="gym">Gym (Fitness Center)</option>
              <option value="lounge">Lounge (Game Lounge)</option>
              <option value="social">Social (Sync & Chat)</option>
              <option value="walk_break">Walk Break (Corridor)</option>
            </select>
          </div>

          <div>
            <label className="block font-mono text-[10px] text-slate-400 mb-1">SEARCH REASON / TEXT</label>
            <input
              type="text"
              placeholder="e.g. hunger, dip, Christian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Log Entries Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-slate-500">
              No matching activity log entries found for the selected filters.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const colorClass = ACTIVITY_COLORS[log.kind] || 'bg-slate-800 text-slate-300 border-slate-700'
              const isExpanded = expandedLogId === log.id

              return (
                <div
                  key={log.id}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="cursor-pointer rounded-lg bg-slate-950/40 p-3 hover:bg-slate-900/60 border border-slate-800/40 transition-all pt-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        {log.tsPht || 'PHT'}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-cyan-400">
                        {log.agentId.toUpperCase()}
                      </span>
                      <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
                        {log.kind}
                      </span>
                      <span className="font-mono text-[9px] text-slate-500 uppercase">
                        [{log.phase}]
                      </span>
                    </div>

                    <span className="font-mono text-[9px] text-slate-500">
                      via {log.decidedBy}
                    </span>
                  </div>

                  <p className="mt-1 font-sans text-xs text-slate-300 leading-relaxed">
                    {log.reason}
                  </p>

                  {/* Expanded Needs Telemetry Drawer */}
                  {isExpanded && log.needsBefore && (
                    <div className="mt-2.5 rounded-md border border-slate-800 bg-slate-950/80 p-2 font-mono text-[10px] text-slate-400 space-y-1">
                      <div className="font-bold text-cyan-400">VITALS AT DECISION TIME:</div>
                      <div className="grid grid-cols-3 gap-2 pt-0.5">
                        <span>Energy: {log.needsBefore.energy}%</span>
                        <span>Hunger: {log.needsBefore.hunger}%</span>
                        <span>Thirst: {log.needsBefore.thirst}%</span>
                        <span>Bladder: {log.needsBefore.bladder}%</span>
                        <span>Health: {log.needsBefore.health}%</span>
                        <span>Morale: {log.needsBefore.morale}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950/90 px-4 py-3 flex items-center justify-between font-mono text-[10px] text-slate-500">
          <span>Showing {filteredLogs.length} of {logs.length} logged events</span>
          <span>Realtime Feed Active</span>
        </div>
      </div>
    </div>
  )
}
