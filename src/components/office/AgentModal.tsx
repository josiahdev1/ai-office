'use client'

import React, { useState } from 'react'
import { Agent } from './types'
import { PixelSprite } from './pixel-sprites'
import { sfx } from './audio'

interface AgentModalProps {
  agent: Agent | null
  onClose: () => void
  onTriggerTask: (agentId: string, actionName: string) => Promise<void>
  onCommandMove?: (
    agentId: string,
    destination: 'brain' | 'pantry' | 'desk'
  ) => void
}

export function AgentModal({
  agent,
  onClose,
  onTriggerTask,
  onCommandMove,
}: AgentModalProps) {
  const [taskInput, setTaskInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!agent) return null

  const handleQuickDispatch = async (task: string) => {
    setIsSubmitting(true)
    sfx?.playTrigger?.()
    await onTriggerTask(agent.id, task)
    setIsSubmitting(false)
  }

  const handleCustomDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskInput.trim()) return
    setIsSubmitting(true)
    sfx?.playTrigger?.()
    await onTriggerTask(agent.id, taskInput.trim())
    setTaskInput('')
    setIsSubmitting(false)
  }

  const isWorking = agent.status === 'working'
  const progress = agent.progress_pct ?? 100

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-150">
      <div className="relative flex w-full max-w-lg flex-col gap-5 rounded-2xl border-2 border-[#3b3a53] bg-[#13121f] p-6 text-slate-100 shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#2b2940] pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isWorking ? 'animate-ping bg-emerald-400' : 'bg-slate-400'}`}
            />
            <span className="font-pixel text-[10px] tracking-wider text-amber-400">
              EASYUP HQ // {agent.id.toUpperCase()} WORKSTATION
            </span>
          </div>
          <button
            onClick={() => {
              sfx?.playBlip?.(300)
              onClose()
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#212033] text-sm font-bold text-slate-400 transition hover:bg-[#32304d] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Profile Details */}
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-[#43415f] bg-[#1d1b2d] p-2 shadow-inner">
            <PixelSprite
              id={agent.id}
              color={agent.color}
              hair={agent.hair}
              skin={agent.skin}
              size={64}
              isTyping={isWorking}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-pixel truncate text-base tracking-wider text-white">
                {agent.name}
              </h2>
              <span className="shrink-0 rounded border border-[#6b3519] bg-[#3b2319] px-2.5 py-0.5 font-sans text-xs font-medium text-[#fb923c]">
                {agent.room}
              </span>
            </div>
            <p className="truncate font-sans text-xs text-slate-400">
              {agent.role}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-slate-500 uppercase">
                  STATE:
                </span>
                <span className="font-pixel rounded border border-emerald-700 bg-emerald-950 px-2 py-0.5 text-[9px] text-emerald-300 uppercase">
                  {agent.sub_state || (isWorking ? 'typing' : 'seated')}
                </span>
              </div>
              {isWorking && (
                <span className="font-pixel text-[10px] text-amber-300">
                  {progress}% DONE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar (if working) */}
        {isWorking && (
          <div className="h-2 w-full overflow-hidden rounded-full border border-[#3b3857] bg-[#1e1c30]">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Current Active Task Box */}
        <div className="flex flex-col gap-1.5 rounded-xl border border-[#232136] bg-[#0b0a12] p-3.5">
          <span className="flex items-center justify-between font-mono text-[10px] tracking-wider text-slate-500 uppercase">
            <span>CURRENT PRODUCTION TASK</span>
            <span>{new Date(agent.updated_at).toLocaleTimeString()}</span>
          </span>
          <p className="rounded border border-emerald-950/60 bg-black/40 p-2.5 font-mono text-xs break-words text-emerald-400">
            &gt;{' '}
            {agent.current_task ||
              agent.last_action ||
              'Executing standard department workflow'}
          </p>
        </div>

        {/* Office Navigation Commands */}
        {onCommandMove && (
          <div className="flex flex-col gap-2">
            <span className="font-pixel text-[10px] tracking-wider text-slate-400">
              REAL WORKFLOW CONTROLS
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  sfx?.playBlip?.(520)
                  onCommandMove(agent.id, 'brain')
                }}
                className="rounded-lg border border-[#3b3857] bg-[#1b192e] px-2.5 py-2 text-center font-mono text-[11px] text-cyan-300 transition hover:border-cyan-500 hover:bg-[#282544]"
              >
                🧠 Sync at Brain
              </button>
              <button
                onClick={() => {
                  sfx?.playBlip?.(480)
                  onCommandMove(agent.id, 'pantry')
                }}
                className="rounded-lg border border-[#3b3857] bg-[#1b192e] px-2.5 py-2 text-center font-mono text-[11px] text-amber-300 transition hover:border-amber-500 hover:bg-[#282544]"
              >
                ☕ Coffee Break
              </button>
              <button
                onClick={() => {
                  sfx?.playBlip?.(440)
                  onCommandMove(agent.id, 'desk')
                }}
                className="rounded-lg border border-[#3b3857] bg-[#1b192e] px-2.5 py-2 text-center font-mono text-[11px] text-emerald-300 transition hover:border-emerald-500 hover:bg-[#282544]"
              >
                🖥️ Return to Desk
              </button>
            </div>
          </div>
        )}

        {/* Custom Task Dispatch */}
        <form onSubmit={handleCustomDispatch} className="flex flex-col gap-2">
          <span className="font-pixel text-[10px] tracking-wider text-slate-400">
            ASSIGN NEW REAL-TIME TASK
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="e.g. Audit database query latency..."
              className="flex-1 rounded-lg border border-[#2e2c44] bg-[#0b0a12] px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting || !taskInput.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              Assign
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {['Verify Vitest', 'Review Staging PR', 'Update API Docs'].map(
              (preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickDispatch(preset)}
                  className="rounded border border-[#373551] bg-[#1e1c2e] px-2.5 py-1 font-mono text-[10px] text-slate-300 transition hover:bg-[#2a2842]"
                >
                  + {preset}
                </button>
              )
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
