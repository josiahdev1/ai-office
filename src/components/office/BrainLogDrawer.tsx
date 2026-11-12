'use client'

import React, { useState, useMemo } from 'react'
import {
  brainLearningManager,
  LearningKind,
} from '@/lib/office/brainLearningEngine'

interface BrainLogDrawerProps {
  isOpen: boolean
  onClose: () => void
  onGatherTriggered?: (createdCount: number) => void
}

const KIND_BADGES: Record<LearningKind, { bg: string; text: string; label: string }> = {
  learned: { bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', text: 'text-emerald-400', label: 'LEARNED' },
  updated: { bg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300', text: 'text-cyan-400', label: 'UPDATED' },
  duplicate: { bg: 'bg-slate-800 border-slate-700 text-slate-400', text: 'text-slate-400', label: 'DUPLICATE' },
  rejected: { bg: 'bg-rose-500/20 border-rose-500/40 text-rose-300', text: 'text-rose-400', label: 'REJECTED' },
  forgotten: { bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300', text: 'text-amber-400', label: 'FORGOTTEN' },
}

export function BrainLogDrawer({ isOpen, onClose, onGatherTriggered }: BrainLogDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedKind, setSelectedKind] = useState<string>('ALL')
  const [isGatheringOn, setIsGatheringOn] = useState<boolean>(brainLearningManager.isGatheringEnabled())
  const [tick, setTick] = useState(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const runs = useMemo(() => {
    void tick
    return brainLearningManager.getGatherRuns()
  }, [tick])
  const logs = useMemo(() => {
    void tick
    return brainLearningManager.getLearningLogs()
  }, [tick])
  const insights = useMemo(() => {
    void tick
    return brainLearningManager.getAllInsights()
  }, [tick])

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false
      if (selectedKind !== 'ALL' && item.kind !== selectedKind) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchesText = item.text.toLowerCase().includes(q)
        const matchesAgent = (item.agentId || '').toLowerCase().includes(q)
        const matchesCategory = item.category.toLowerCase().includes(q)
        if (!matchesText && !matchesAgent && !matchesCategory) return false
      }
      return true
    })
  }, [logs, selectedCategory, selectedKind, searchTerm])

  const handleToggleGathering = () => {
    const next = !isGatheringOn
    brainLearningManager.setGatheringEnabled(next)
    setIsGatheringOn(next)
    setTick((t) => t + 1)
  }

  const handleRunGather = () => {
    const res = brainLearningManager.runBossGather('manual')
    setTick((t) => t + 1)
    onGatherTriggered?.(res.insightsCreated)

    setToastMessage(`Boss delivered ${res.insightsCreated} new insights to THE BRAIN (${res.duplicatesSkipped} duplicates skipped).`)
    setTimeout(() => {
      setToastMessage(null)
    }, 4500)
  }

  const handlePinInsight = (id: string) => {
    brainLearningManager.pinInsight(id)
    setTick((t) => t + 1)
  }

  const handleUnpinInsight = (id: string) => {
    brainLearningManager.unpinInsight(id)
    setTick((t) => t + 1)
  }

  const handleDeleteInsight = (id: string) => {
    brainLearningManager.deleteInsight(id)
    setTick((t) => t + 1)
  }

  const handleForgetInsight = (idOrText: string) => {
    brainLearningManager.forgetInsight(idOrText)
    setTick((t) => t + 1)
  }

  const handleDownloadCSV = () => {
    const csvContent = brainLearningManager.exportBrainLogCSV()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `brain-learning-log-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-60 flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-slate-950/95 px-4 py-2.5 font-mono text-xs font-bold text-cyan-300 shadow-xl shadow-cyan-950/50 animate-bounce">
          <span className="text-base">🧠</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="relative flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-950/95 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-400/50" />
            <span className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
              THE BRAIN // LEARNING LOG
            </span>
            <span className="rounded bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
              {insights.filter((i) => !i.deleted).length} ACTIVE INSIGHTS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              aria-label="Close Brain Log"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Global Controls Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 bg-slate-900/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunGather}
              className="cursor-pointer flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/60 px-3 py-1 font-mono text-xs font-bold text-cyan-200 hover:bg-cyan-900/80 transition-colors whitespace-nowrap shadow-sm"
            >
              <span>🧠</span>
              <span>Run Boss Gather Now</span>
            </button>

            <button
              type="button"
              onClick={handleToggleGathering}
              className={`cursor-pointer rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition-colors whitespace-nowrap ${
                isGatheringOn
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Boss Gathering: {isGatheringOn ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-slate-400">
              Tokens: {brainLearningManager.getDailyTokensUsed().toLocaleString()} / {brainLearningManager.getDailyTokenCap().toLocaleString()}
            </span>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-300 hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Export CSV ⬇
            </button>
          </div>
        </div>

        {/* Recent Runs Horizontal Carousel */}
        {runs.length > 0 && (
          <div className="border-b border-slate-800/70 bg-slate-950/60 px-4 py-2">
            <span className="block font-mono text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-1.5">
              RECENT GATHER RUNS ({runs.length})
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {runs.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 font-mono text-[10px] text-slate-300 shrink-0 flex items-center gap-2"
                >
                  <span className="font-bold text-cyan-400">{r.id.replace('run_', 'RUN #')}</span>
                  <span className="text-slate-400">({r.trigger})</span>
                  <span className="text-emerald-400">+{r.insightsCreated} learned</span>
                  <span className="text-slate-500">{r.duplicatesSkipped} dupes</span>
                  <span className="text-slate-400">{r.tokensIn + r.tokensOut} tok</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/70 bg-slate-900/30 p-3">
          <input
            type="text"
            placeholder="Search learning entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[140px] rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />

          <select
            aria-label="Filter category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="agent_strength">Agent Strengths</option>
            <option value="team_pattern">Team Patterns</option>
            <option value="operator_preference">Operator Preferences</option>
            <option value="security_violation">Security Filter</option>
          </select>

          <select
            aria-label="Filter kind"
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Outcomes</option>
            <option value="learned">Learned</option>
            <option value="updated">Updated</option>
            <option value="duplicate">Duplicate</option>
            <option value="rejected">Rejected</option>
            <option value="forgotten">Forgotten</option>
          </select>
        </div>

        {/* Entries Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-slate-800 p-6 text-center">
              <span className="text-2xl mb-1.5">🧠</span>
              <span className="font-mono text-xs text-slate-400">
                No learning log entries matching filter criteria.
              </span>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const badge = KIND_BADGES[entry.kind] || KIND_BADGES.learned
              const linkedInsight = insights.find((i) => i.text === entry.text)

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 space-y-1.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400">{entry.tsPht}</span>
                      <span className={`rounded border px-1.5 py-0.2 font-bold ${badge.bg}`}>
                        {badge.label}
                      </span>
                      {entry.agentId && (
                        <span className="rounded bg-indigo-950/60 border border-indigo-500/30 px-1.5 py-0.2 text-indigo-300 font-bold uppercase">
                          {entry.agentId}
                        </span>
                      )}
                      <span className="rounded bg-slate-800 px-1.5 py-0.2 text-slate-400">
                        {entry.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold">
                        {Math.round(entry.confidence * 100)}% conf
                      </span>
                      {linkedInsight && (
                        <div className="flex items-center gap-1">
                          {linkedInsight.pinned ? (
                            <button
                              type="button"
                              onClick={() => handleUnpinInsight(linkedInsight.id)}
                              className="cursor-pointer text-amber-400 hover:text-amber-300"
                              title="Unpin insight"
                            >
                              📌
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePinInsight(linkedInsight.id)}
                              className="cursor-pointer text-slate-500 hover:text-amber-400"
                              title="Pin insight"
                            >
                              📌
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleForgetInsight(linkedInsight.id)}
                            className="cursor-pointer text-[10px] text-amber-500 hover:underline"
                            title="Forget insight"
                          >
                            Forget
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInsight(linkedInsight.id)}
                            className="cursor-pointer text-slate-500 hover:text-rose-400"
                            title="Delete insight"
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Insight Text */}
                  <p className="font-sans text-xs text-slate-200 leading-relaxed">
                    {entry.text}
                  </p>

                  {/* Source IDs */}
                  {entry.sourceIds && entry.sourceIds.length > 0 && (
                    <div className="flex items-center gap-1 overflow-x-auto pt-0.5 text-[9px] font-mono text-slate-500">
                      <span>Sources:</span>
                      {entry.sourceIds.map((src) => (
                        <span key={src} className="rounded bg-slate-800/80 px-1 py-0.2 text-slate-400">
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
