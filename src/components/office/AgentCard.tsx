'use client';

import React from 'react';
import { Agent } from './types';
import { PixelSprite } from './pixel-sprites';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
  isSelected?: boolean;
}

export function AgentCard({ agent, onClick, isSelected = false }: AgentCardProps) {
  const isWorking = agent.status === 'working';

  const getStatusBadge = () => {
    switch (agent.status) {
      case 'working':
        return (
          <span className="font-pixel text-[9px] px-2 py-0.5 rounded bg-sky-950/90 text-sky-300 border border-sky-600 animate-pulse tracking-wider">
            WORKING {agent.progress_pct !== undefined ? `(${agent.progress_pct}%)` : ''}
          </span>
        );
      case 'active':
        return (
          <span className="font-pixel text-[9px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-600 tracking-wider">
            ACTIVE
          </span>
        );
      case 'done':
        return (
          <span className="font-pixel text-[9px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600 tracking-wider">
            DONE (100%)
          </span>
        );
      case 'awaiting_approval':
        return (
          <span className="font-pixel text-[9px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600 tracking-wider">
            APPROVAL
          </span>
        );
      case 'idle':
      default:
        return (
          <span className="font-pixel text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 tracking-wider">
            SEATED
          </span>
        );
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col gap-2 p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'bg-[#222135] border-amber-500 shadow-lg shadow-amber-500/10'
          : 'bg-[#181724]/90 hover:bg-[#201e30] border-[#2c2b3d] hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Pixel Avatar Box */}
          <div className="relative flex items-center justify-center w-12 h-12 rounded-lg bg-[#232136] border border-[#35334c] shadow-inner group-hover:scale-105 transition-transform shrink-0">
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
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-pixel text-xs tracking-wider text-slate-100 uppercase truncate">
                {agent.name}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-sans truncate">
              {agent.role} · <span className="text-slate-500 uppercase">{agent.room}</span>
            </p>
            <div className="pt-0.5">{getStatusBadge()}</div>
          </div>
        </div>

        {/* Right Tag */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="font-sans text-[11px] font-semibold px-2.5 py-0.5 rounded bg-[#3b2319] text-[#fb923c] border border-[#6b3519] whitespace-nowrap">
            {agent.tag || agent.room}
          </span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            {new Date(agent.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Task Summary Banner */}
      {agent.current_task && (
        <div className="mt-1 pt-2 border-t border-[#25223a] text-[11px] font-mono text-slate-300 truncate">
          <span className="text-emerald-400">&gt; </span>
          {agent.current_task}
        </div>
      )}
    </div>
  );
}
