'use client'

import React from 'react'
import { FloorNumber, OFFICE_FLOORS } from '@/lib/office/map'

export interface FloorSwitcherProps {
  activeFloor: FloorNumber
  onFloorChange: (floor: FloorNumber) => void
  floorCounts: Record<FloorNumber, number>
}

export function FloorSwitcher({
  activeFloor,
  onFloorChange,
  floorCounts,
}: FloorSwitcherProps) {
  const handlePrev = () => {
    onFloorChange(Math.max(0, activeFloor - 1) as FloorNumber)
  }

  const handleNext = () => {
    onFloorChange(Math.min(3, activeFloor + 1) as FloorNumber)
  }

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-[#1e283d] bg-[#0c101a]/95 p-1 shadow-xl backdrop-blur-md">
      {/* Down button (PageDown / j) */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          handlePrev()
        }}
        disabled={activeFloor === 0}
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded font-mono text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        title="Lower Floor (PageDown / j)"
      >
        ▼
      </button>

      {/* Floor Pills */}
      <div className="flex items-center gap-1">
        {OFFICE_FLOORS.map((floor) => {
          const isActive = activeFloor === floor.id
          const count = floorCounts[floor.id] || 0

          return (
            <button
              key={floor.code}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onFloorChange(floor.id)
              }}
              className={`flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] whitespace-nowrap transition active:scale-95 ${
                isActive
                  ? 'border border-cyan-400/80 bg-cyan-950/80 font-bold text-cyan-200 shadow-md shadow-cyan-950/50'
                  : 'border border-transparent bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title={`${floor.name}: ${floor.subtitle}`}
            >
              <span>{floor.code}</span>
              <span
                className={`rounded-full px-1 text-[9px] font-semibold ${
                  isActive
                    ? 'bg-cyan-500/30 text-cyan-200'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Up button (PageUp / k) */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          handleNext()
        }}
        disabled={activeFloor === 3}
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded font-mono text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        title="Higher Floor (PageUp / k)"
      >
        ▲
      </button>
    </div>
  )
}
