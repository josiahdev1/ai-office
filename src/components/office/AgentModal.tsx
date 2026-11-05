'use client';

import React, { useState } from 'react';
import { Agent } from './types';
import { PixelSprite } from './pixel-sprites';
import { sfx } from './audio';

interface AgentModalProps {
  agent: Agent | null;
  onClose: () => void;
  onTriggerTask: (agentId: string, actionName: string) => Promise<void>;
  onCommandMove?: (agentId: string, destination: 'brain' | 'pantry' | 'desk') => void;
}

export function AgentModal({ agent, onClose, onTriggerTask, onCommandMove }: AgentModalProps) {
  const [taskInput, setTaskInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!agent) return null;

  const handleQuickDispatch = async (task: string) => {
    setIsSubmitting(true);
    sfx?.playTrigger?.();
    await onTriggerTask(agent.id, task);
    setIsSubmitting(false);
  };

  const handleCustomDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    setIsSubmitting(true);
    sfx?.playTrigger?.();
    await onTriggerTask(agent.id, taskInput.trim());
    setTaskInput('');
    setIsSubmitting(false);
  };

  const isWorking = agent.status === 'working';
  const progress = agent.progress_pct ?? 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#13121f] border-2 border-[#3b3a53] shadow-2xl p-6 text-slate-100 flex flex-col gap-5">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#2b2940] pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isWorking ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
            <span className="font-pixel text-[10px] text-amber-400 tracking-wider">
              EASYUP HQ // {agent.id.toUpperCase()} WORKSTATION
            </span>
          </div>
          <button
            onClick={() => {
              sfx?.playBlip?.(300);
              onClose();
            }}
            className="w-7 h-7 rounded-lg bg-[#212033] hover:bg-[#32304d] text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Profile Details */}
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-[#1d1b2d] border-2 border-[#43415f] shadow-inner p-2 shrink-0">
            <PixelSprite
              id={agent.id}
              color={agent.color}
              hair={agent.hair}
              skin={agent.skin}
              size={64}
              isTyping={isWorking}
            />
          </div>

          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-pixel text-base text-white tracking-wider truncate">{agent.name}</h2>
              <span className="font-sans text-xs px-2.5 py-0.5 rounded bg-[#3b2319] text-[#fb923c] border border-[#6b3519] font-medium shrink-0">
                {agent.room}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans truncate">
              {agent.role}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">STATE:</span>
                <span className="font-pixel text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 uppercase">
                  {agent.sub_state || (isWorking ? 'typing' : 'seated')}
                </span>
              </div>
              {isWorking && (
                <span className="text-[10px] font-pixel text-amber-300">
                  {progress}% DONE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar (if working) */}
        {isWorking && (
          <div className="w-full bg-[#1e1c30] rounded-full h-2 overflow-hidden border border-[#3b3857]">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Current Active Task Box */}
        <div className="rounded-xl bg-[#0b0a12] border border-[#232136] p-3.5 flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>CURRENT PRODUCTION TASK</span>
            <span>{new Date(agent.updated_at).toLocaleTimeString()}</span>
          </span>
          <p className="text-xs font-mono text-emerald-400 bg-black/40 p-2.5 rounded border border-emerald-950/60 break-words">
            &gt; {agent.current_task || agent.last_action || 'Executing standard department workflow'}
          </p>
        </div>

        {/* Office Navigation Commands */}
        {onCommandMove && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-pixel text-slate-400 tracking-wider">
              REAL WORKFLOW CONTROLS
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  sfx?.playBlip?.(520);
                  onCommandMove(agent.id, 'brain');
                }}
                className="py-2 px-2.5 rounded-lg bg-[#1b192e] hover:bg-[#282544] border border-[#3b3857] text-[11px] font-mono text-cyan-300 transition text-center hover:border-cyan-500"
              >
                🧠 Sync at Brain
              </button>
              <button
                onClick={() => {
                  sfx?.playBlip?.(480);
                  onCommandMove(agent.id, 'pantry');
                }}
                className="py-2 px-2.5 rounded-lg bg-[#1b192e] hover:bg-[#282544] border border-[#3b3857] text-[11px] font-mono text-amber-300 transition text-center hover:border-amber-500"
              >
                ☕ Coffee Break
              </button>
              <button
                onClick={() => {
                  sfx?.playBlip?.(440);
                  onCommandMove(agent.id, 'desk');
                }}
                className="py-2 px-2.5 rounded-lg bg-[#1b192e] hover:bg-[#282544] border border-[#3b3857] text-[11px] font-mono text-emerald-300 transition text-center hover:border-emerald-500"
              >
                🖥️ Return to Desk
              </button>
            </div>
          </div>
        )}

        {/* Custom Task Dispatch */}
        <form onSubmit={handleCustomDispatch} className="flex flex-col gap-2">
          <span className="text-[10px] font-pixel text-slate-400 tracking-wider">
            ASSIGN NEW REAL-TIME TASK
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="e.g. Audit database query latency..."
              className="flex-1 bg-[#0b0a12] border border-[#2e2c44] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isSubmitting || !taskInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
            >
              Assign
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {['Verify Vitest', 'Review Staging PR', 'Update API Docs'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleQuickDispatch(preset)}
                className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#1e1c2e] hover:bg-[#2a2842] text-slate-300 border border-[#373551] transition"
              >
                + {preset}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
