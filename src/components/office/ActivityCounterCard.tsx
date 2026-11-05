'use client'

import React from 'react'
import { ActivityCounterStats } from './types'
import { AgentDirectedActivity } from '@/lib/office/activityDirector'

export interface ActivityCounterCardProps {
  stats: ActivityCounterStats
  activeFilter: AgentDirectedActivity | null
  onSelectFilter: (activity: AgentDirectedActivity | null) => void
  className?: string
}

export function ActivityCounterCard({
  stats,
  activeFilter,
  onSelectFilter,
  className = '',
}: ActivityCounterCardProps) {
  const items: {
    key: AgentDirectedActivity | 'open_tasks' | 'accessories'
    label: string
    count: number
    color: string
    dotColor: string
    isClickable: boolean
  }[] = [
    {
      key: 'working',
      label: 'WORKING',
      count: stats.working,
      color: 'text-emerald-700',
      dotColor: 'bg-emerald-500',
      isClickable: true,
    },
    {
      key: 'eating',
      label: 'EATING',
      count: stats.eating,
      color: 'text-amber-700',
      dotColor: 'bg-amber-500',
      isClickable: true,
    },
    {
      key: 'gym',
      label: 'IN THE GYM',
      count: stats.gym,
      color: 'text-cyan-700',
      dotColor: 'bg-cyan-500',
      isClickable: true,
    },
    {
      key: 'meeting',
      label: 'IN MEETING',
      count: stats.meeting,
      color: 'text-purple-700',
      dotColor: 'bg-purple-500',
      isClickable: true,
    },
    {
      key: 'break',
      label: 'ON BREAK',
      count: stats.break,
      color: 'text-yellow-700',
      dotColor: 'bg-yellow-500',
      isClickable: true,
    },
    {
      key: 'arriving',
      label: 'ARRIVING',
      count: stats.arriving,
      color: 'text-sky-700',
      dotColor: 'bg-sky-500',
      isClickable: true,
    },
    {
      key: 'waiting_on_you',
      label: 'WAITING ON YOU',
      count: stats.waiting_on_you,
      color: 'text-orange-700 font-bold',
      dotColor: 'bg-orange-500 animate-pulse',
      isClickable: true,
    },
  ]

  return (
    <div
      className={`pointer-events-auto select-none rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-md transition-all sm:min-w-56 ${className}`}
    >
      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5">
        <span className="font-mono text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          CAMPUS LIVE COUNTER
        </span>
        {activeFilter && (
          <button
            type="button"
            onClick={() => onSelectFilter(null)}
            className="cursor-pointer font-mono text-[9px] font-semibold text-sky-600 hover:text-sky-800"
          >
            Clear Filter ✕
          </button>
        )}
      </div>

      {/* Main Agent Activities List */}
      <div className="space-y-1">
        {items.map((it) => {
          const isSelected = activeFilter === it.key
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => {
                if (it.isClickable) {
                  onSelectFilter(isSelected ? null : (it.key as AgentDirectedActivity))
                }
              }}
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-left font-mono transition-all ${
                isSelected
                  ? 'bg-sky-100 ring-1 ring-sky-400 font-bold'
                  : 'hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${it.dotColor}`} />
                <span className="text-[11px] font-medium tracking-tight text-slate-700">
                  {it.label}
                </span>
              </div>
              <span className={`text-[11px] font-bold ${it.color}`}>
                {it.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div className="my-2 h-px bg-slate-200/60" />

      {/* Auxiliary Counters: OPEN TASKS & ACCESSORIES */}
      <div className="space-y-1 font-mono text-[10px]">
        <div className="flex items-center justify-between px-2 py-0.5 text-slate-600">
          <span className="tracking-tight text-slate-500">OPEN TASKS</span>
          <span className="font-bold text-slate-900">{stats.open_tasks}</span>
        </div>
        <div className="flex items-center justify-between px-2 py-0.5 text-slate-600">
          <span className="tracking-tight text-slate-500">ACCESSORIES</span>
          <span className="font-bold text-emerald-700">{stats.accessories}</span>
        </div>
      </div>
    </div>
  )
}
