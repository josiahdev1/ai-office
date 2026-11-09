'use client'

import React, { useState } from 'react'
import { Agent, Approval, OfficeTask } from './types'

export interface DecisionCardsPanelProps {
  isOpen: boolean
  onClose: () => void
  approvals: Approval[]
  agents: Agent[]
  tasks?: OfficeTask[]
  onApproveAction: (
    approvalId: string,
    action: 'approve' | 'reject' | 'hold' | 'send_back' | 'instruct',
    instruction?: string
  ) => Promise<void>
  onCreateTask?: (task: {
    title: string
    assignedTo: string
    department: string
  }) => Promise<void>
  onSelectAgent?: (agent: Agent) => void
  className?: string
}

type TabType = 'NEEDS_YOU' | 'TEAM' | 'BOARD' | 'OFFICE'

export function DecisionCardsPanel({
  isOpen,
  onClose,
  approvals = [],
  agents = [],
  tasks = [],
  onApproveAction,
  onCreateTask,
  onSelectAgent,
  className = '',
}: DecisionCardsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('NEEDS_YOU')
  const [instructingId, setInstructingId] = useState<string | null>(null)
  const [instructionText, setInstructionText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Give an Instruction form state
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState(
    agents[0]?.id || 'eng-1'
  )
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [taskSuccessToast, setTaskSuccessToast] = useState<string | null>(null)

  // Search filter for Team tab
  const [teamSearch, setTeamSearch] = useState('')

  if (!isOpen) return null

  const pendingApprovals = approvals.filter(
    (a) => a.status === 'pending' || !a.status
  )

  const handleAction = async (
    approvalId: string,
    action: 'approve' | 'reject' | 'hold' | 'send_back' | 'instruct',
    instruction?: string
  ) => {
    setIsSubmitting(true)
    try {
      await onApproveAction(approvalId, action, instruction)
      setInstructingId(null)
      setInstructionText('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDispatchNewTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !onCreateTask) return

    setIsCreatingTask(true)
    try {
      const targetAgent = agents.find((a) => a.id === selectedAgentId)
      await onCreateTask({
        title: newTaskTitle.trim(),
        assignedTo: selectedAgentId,
        department: targetAgent?.room || 'Engineering Core',
      })
      setNewTaskTitle('')
      setTaskSuccessToast(`Task dispatched to ${targetAgent?.name || 'Agent'}!`)
      setTimeout(() => setTaskSuccessToast(null), 3000)
    } finally {
      setIsCreatingTask(false)
    }
  }

  // Filtered agents for TEAM tab
  const filteredTeam = agents.filter(
    (ag) =>
      ag.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      ag.role.toLowerCase().includes(teamSearch.toLowerCase()) ||
      ag.room.toLowerCase().includes(teamSearch.toLowerCase())
  )

  // Kanban groupings for BOARD tab
  const queuedTasks = tasks.filter((t) => t.status === 'queued')
  const workingTasks = tasks.filter((t) => t.status === 'working')
  const approvalTasks = tasks.filter((t) => t.status === 'needs_approval')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  return (
    <aside
      className={`fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md flex-col border-l border-[#1e293b] bg-[#090d16]/95 text-slate-100 shadow-2xl backdrop-blur-xl sm:w-[460px] ${className}`}
    >
      {/* 1. Header with Monospace Tabs */}
      <div className="flex flex-col border-b border-[#1e293b] bg-[#0c1220]/80 p-3">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            <h2 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
              Operations Cockpit
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Return to Office Canvas"
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-4 gap-1 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('NEEDS_YOU')}
            className={`cursor-pointer rounded-lg py-1.5 text-center font-bold whitespace-nowrap transition-all ${
              activeTab === 'NEEDS_YOU'
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            NEEDS YOU ({pendingApprovals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TEAM')}
            className={`cursor-pointer rounded-lg py-1.5 text-center font-bold whitespace-nowrap transition-all ${
              activeTab === 'TEAM'
                ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            TEAM ({agents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BOARD')}
            className={`cursor-pointer rounded-lg py-1.5 text-center font-bold whitespace-nowrap transition-all ${
              activeTab === 'BOARD'
                ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            BOARD
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg py-1.5 text-center font-bold whitespace-nowrap text-slate-400 transition-all hover:bg-slate-800 hover:text-emerald-400"
          >
            OFFICE ⛶
          </button>
        </div>
      </div>

      {/* 2. Main Tab Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 font-mono">
        {/* ==================== TAB 1: NEEDS YOU ==================== */}
        {activeTab === 'NEEDS_YOU' && (
          <div className="space-y-4">
            {/* Give an Instruction Card */}
            <form
              onSubmit={handleDispatchNewTask}
              className="space-y-2.5 rounded-xl border border-sky-500/30 bg-[#0d1627] p-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-sky-400 uppercase">
                  ⚡ Give an Instruction
                </span>
                {taskSuccessToast && (
                  <span className="text-[10px] font-semibold text-emerald-400">
                    {taskSuccessToast}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.role.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Give direct task instructions to the agent..."
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isCreatingTask || !newTaskTitle.trim()}
                className="w-full cursor-pointer rounded-lg bg-sky-600 py-1.5 text-xs font-bold text-white transition hover:bg-sky-500 disabled:opacity-40"
              >
                {isCreatingTask ? 'Dispatching...' : 'Dispatch Instruction'}
              </button>
            </form>

            {/* Pending Decision Cards List */}
            {pendingApprovals.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-400">
                <span className="text-xl">✨</span>
                <p className="mt-2 text-xs font-semibold text-slate-300">
                  Inbox Zero — All Clear!
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  No agents are currently blocked on approvals.
                </p>
              </div>
            ) : (
              pendingApprovals.map((app) => {
                const isInstructing = instructingId === app.id
                return (
                  <div
                    key={app.id}
                    className="space-y-2.5 rounded-xl border border-amber-500/40 bg-[#141b2b] p-3.5 shadow-xl transition-all hover:border-amber-400/60"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                          <span className="text-xs font-bold text-slate-100">
                            {app.agent_name || 'Autonomous Agent'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {app.type?.toUpperCase() || 'GATE'} •{' '}
                          {new Date(app.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="rounded border border-amber-800/60 bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                        WAITING
                      </span>
                    </div>

                    {/* Title & Summary */}
                    <div>
                      <h4 className="text-xs font-bold text-amber-200">
                        {app.title}
                      </h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                        {app.summary}
                      </p>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleAction(app.id, 'approve')}
                        className="cursor-pointer rounded bg-emerald-600 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                        title="Approve and execute"
                      >
                        ✓ Approve
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleAction(app.id, 'hold')}
                        className="cursor-pointer rounded bg-slate-700 py-1 text-[10px] font-bold text-slate-200 transition hover:bg-slate-600 disabled:opacity-50"
                        title="Hold on gate"
                      >
                        ⏸ Hold
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleAction(app.id, 'send_back')}
                        className="cursor-pointer rounded border border-rose-700/60 bg-rose-900/60 py-1 text-[10px] font-bold text-rose-200 transition hover:bg-rose-800/80 disabled:opacity-50"
                        title="Send back for revision"
                      >
                        ↩ Send Back
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setInstructingId(isInstructing ? null : app.id)
                          setInstructionText('')
                        }}
                        className={`cursor-pointer rounded py-1 text-[10px] font-bold transition disabled:opacity-50 ${
                          isInstructing
                            ? 'bg-amber-600 text-white'
                            : 'border border-amber-700/60 bg-amber-950/80 text-amber-300 hover:bg-amber-900'
                        }`}
                        title="Provide specific instruction"
                      >
                        💬 Instruct
                      </button>
                    </div>

                    {/* Inline Instruct Form */}
                    {isInstructing && (
                      <div className="space-y-2 border-t border-slate-800 pt-2">
                        <textarea
                          value={instructionText}
                          onChange={(e) => setInstructionText(e.target.value)}
                          placeholder="Type instruction or guidance for this approval..."
                          rows={2}
                          className="w-full rounded border border-amber-600/50 bg-slate-950 p-2 text-xs text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={isSubmitting || !instructionText.trim()}
                          onClick={() =>
                            handleAction(
                              app.id,
                              'instruct',
                              instructionText.trim()
                            )
                          }
                          className="w-full cursor-pointer rounded bg-amber-500 py-1 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
                        >
                          Send Instruction to Agent
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ==================== TAB 2: TEAM ==================== */}
        {activeTab === 'TEAM' && (
          <div className="space-y-3">
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Search agent, role, or department..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
            <div className="space-y-2">
              {filteredTeam.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 transition hover:border-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          agent.status === 'working'
                            ? '#22c55e'
                            : agent.status === 'awaiting_approval'
                              ? '#f97316'
                              : '#94a3b8',
                      }}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {agent.name}
                      </h4>
                      <p className="text-[10px] text-slate-400">{agent.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectAgent?.(agent)}
                    className="cursor-pointer rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 transition hover:bg-sky-600 hover:text-white"
                  >
                    Focus 👁
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: BOARD (KANBAN) ==================== */}
        {activeTab === 'BOARD' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Queued Column */}
              <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Queued ({queuedTasks.length})
                </span>
                {queuedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded border border-white/5 bg-slate-800/80 p-2"
                  >
                    <p className="text-[11px] font-semibold text-slate-200">
                      {t.title}
                    </p>
                    <span className="text-[9px] text-slate-400">
                      {t.department}
                    </span>
                  </div>
                ))}
              </div>

              {/* Working Column */}
              <div className="space-y-2 rounded-lg border border-sky-900/40 bg-sky-950/20 p-2.5">
                <span className="text-[10px] font-bold text-sky-400 uppercase">
                  Working ({workingTasks.length})
                </span>
                {workingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded border border-sky-500/20 bg-slate-800/80 p-2"
                  >
                    <p className="text-[11px] font-semibold text-slate-200">
                      {t.title}
                    </p>
                    <span className="text-[9px] text-sky-400">
                      {t.assigned_to || 'Assigned'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Needs Approval Column */}
              <div className="space-y-2 rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5">
                <span className="text-[10px] font-bold text-amber-400 uppercase">
                  Needs Approval ({approvalTasks.length})
                </span>
                {approvalTasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded border border-amber-500/20 bg-slate-800/80 p-2"
                  >
                    <p className="text-[11px] font-semibold text-amber-200">
                      {t.title}
                    </p>
                    <span className="text-[9px] text-amber-400">
                      Gate Required
                    </span>
                  </div>
                ))}
              </div>

              {/* Done Column */}
              <div className="space-y-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-2.5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">
                  Done ({doneTasks.length})
                </span>
                {doneTasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded border border-emerald-500/20 bg-slate-800/80 p-2"
                  >
                    <p className="text-[11px] font-semibold text-slate-300 line-through">
                      {t.title}
                    </p>
                    <span className="text-[9px] text-emerald-400">
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
