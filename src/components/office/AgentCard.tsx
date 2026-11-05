'use client'

import React from 'react'
import { Agent } from './types'
import { PixelSprite } from './pixel-sprites'

interface AgentCardProps {
  agent: Agent
  onClick?: () => void
  isSelected?: boolean
}

export function AgentCard({
  agent,
  onClick,
  isSelected = false,
}: AgentCardProps) {
  const isWorking = agent.status === 'working'

  const getStatusBadge = () => {
    switch (agent.status) {
      case 'working':
        return (
          <span className="font-pixel animate-pulse rounded border border-sky-600 bg-sky-950/90 px-2 py-0.5 text-[9px] tracking-wider text-sky-300">
            WORKING{' '}
            {agent.progress_pct !== undefined ? `(${agent.progress_pct}%)` : ''}
          </span>
        )
      case 'active':
        return (
          <span className="font-pixel rounded border border-blue-600 bg-blue-950/80 px-2 py-0.5 text-[9px] tracking-wider text-blue-300">
            ACTIVE
          </span>
        )
      case 'done':
        return (
          <span className="font-pixel rounded border border-emerald-600 bg-emerald-950/80 px-2 py-0.5 text-[9px] tracking-wider text-emerald-300">
            DONE (100%)
          </span>
        )
      case 'awaiting_approval':
        return (
          <span className="font-pixel rounded border border-amber-600 bg-amber-950/80 px-2 py-0.5 text-[9px] tracking-wider text-amber-300">
            APPROVAL
          </span>
        )
      case 'idle':
      default:
        return (
          <span className="font-pixel rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[9px] tracking-wider text-slate-400">
            SEATED
          </span>
        )
    }
  }

  return (
    <div
      onClick={onClick}
      className={`group relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 transition-all duration-150 ${
        isSelected
          ? 'border-amber-500 bg-[#222135] shadow-lg shadow-amber-500/10'
          : 'border-[#2c2b3d] bg-[#181724]/90 hover:border-slate-600 hover:bg-[#201e30]'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Pixel Avatar Box */}
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#35334c] bg-[#232136] shadow-inner transition-transform group-hover:scale-105">
            <PixelSprite
              id={agent.id}
              color={agent.color}
              hair={agent.hair}
              skin={agent.skin}
              size={36}
              isTyping={isWorking}
            />
          </div>

          {/* Info */}
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="font-pixel truncate text-xs tracking-wider text-slate-100 uppercase">
                {agent.name}
              </h3>
            </div>
            <p className="truncate font-sans text-[11px] text-slate-400">
              {agent.role} ·{' '}
              <span className="text-slate-500 uppercase">{agent.room}</span>
            </p>
            <div className="pt-0.5">{getStatusBadge()}</div>
          </div>
        </div>

        {/* Right Tag */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded border border-[#6b3519] bg-[#3b2319] px-2.5 py-0.5 font-sans text-[11px] font-semibold whitespace-nowrap text-[#fb923c]">
            {agent.tag || agent.room}
          </span>
          <span className="hidden font-mono text-[10px] text-slate-500 sm:inline">
            {new Date(agent.updated_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Task Summary Banner */}
      {agent.current_task && (
        <div className="mt-1 truncate border-t border-[#25223a] pt-2 font-mono text-[11px] text-slate-300">
          <span className="text-emerald-400">&gt; </span>
          {agent.current_task}
        </div>
      )}
    </div>
  )
}
