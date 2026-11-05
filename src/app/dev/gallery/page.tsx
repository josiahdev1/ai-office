'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  V3_PIXEL_SPRITES,
  compilePixelGridToSvgPaths,
  PixelSpriteDef,
} from '@/lib/office/pixelGridEngine'
import { PixelSprite } from '@/components/office/pixel-sprites'
import { FacingDirection } from '@/components/office/types'

function PixelSpriteSvgView({
  def,
  scale = 3,
  className = '',
}: {
  def: PixelSpriteDef
  scale?: number
  className?: string
}) {
  const paths = useMemo(() => compilePixelGridToSvgPaths(def), [def])

  return (
    <svg
      viewBox={`0 0 ${def.width} ${def.height}`}
      width={def.width * scale}
      height={def.height * scale}
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {paths.map((p, idx) => (
        <path key={idx} d={p.d} fill={p.color} />
      ))}
    </svg>
  )
}

export default function DevGalleryPage() {
  const [scale, setScale] = useState<number>(3)
  const [activeFacing, setActiveFacing] = useState<FacingDirection>('NW')

  const roomColors = [
    { name: 'Intelligence Lab', code: '#0f766e', desc: 'Teal Linoleum' },
    { name: 'Operations Hub', code: '#15803d', desc: 'Green Mat' },
    { name: 'QA & SecOps NOC', code: '#a21caf', desc: 'Magenta Circuit' },
    { name: 'Executive Lounge', code: '#6b21a8', desc: 'Purple Velvet Carpet' },
    { name: 'Pantry & Canteen', code: '#d97706', desc: 'Warm Cream Ceramic' },
    { name: 'Rec & Gym / Game', code: '#be185d', desc: 'Pink Hardwood / Arcade' },
    { name: 'Growth Lab', code: '#1d4ed8', desc: 'Cobalt Blue Tile' },
    { name: 'Engineering Core', code: '#4338ca', desc: 'Indigo Dev Wood' },
    { name: 'Command Center (The Brain)', code: '#0f172a', desc: 'Midnight Obsidian Ring' },
    { name: 'Corridor', code: '#1e293b', desc: 'Checkered Hallway (2-tile)' },
  ]

  const facings: FacingDirection[] = ['SE', 'SW', 'NE', 'NW']

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 p-8 font-sans">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#1e283d] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
            <h1 className="font-mono text-xl font-bold tracking-wider text-slate-100 uppercase">
              EasyUp HQ — Pixel Art Dev Gallery (Phase 1)
            </h1>
            <span className="rounded bg-cyan-950 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-300">
              OFFICE V3 ASSET SUITE
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Interactive sprite inspection grid with nearest-neighbor integer scaling, 3-shade palettes & soft shadows.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg border border-[#1e283d] bg-[#0c101a] p-1">
            <span className="px-2 font-mono text-xs text-slate-400">Scale:</span>
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`rounded px-2.5 py-1 font-mono text-xs font-bold transition ${
                  scale === s
                    ? 'bg-cyan-500 text-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <Link
            href="/"
            prefetch={false}
            className="rounded border border-[#1e283d] bg-[#111625] px-3 py-1.5 font-mono text-xs text-slate-300 hover:bg-slate-800 transition"
          >
            ← Back to Office
          </Link>
        </div>
      </header>

      {/* 1. ROOM COLOR PALETTES & FLOOR TILES */}
      <section className="mb-10">
        <h2 className="mb-4 font-mono text-sm font-bold tracking-wider text-cyan-300 uppercase">
          1. 3×3 Room Floor Materials & Color System
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {roomColors.map((r) => (
            <div
              key={r.name}
              className="rounded-lg border border-[#1e283d] bg-[#0c101a] p-3 shadow-lg flex flex-col justify-between"
            >
              <div
                className="h-12 w-full rounded border border-white/10 mb-2 flex items-center justify-center font-mono text-xs font-bold text-white shadow-inner"
                style={{ backgroundColor: r.code }}
              >
                {r.code}
              </div>
              <div>
                <div className="font-mono text-xs font-bold text-slate-200">{r.name}</div>
                <div className="font-mono text-[10px] text-slate-400">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. COMPILED PIXEL GRID PROPS & FURNITURE */}
      <section className="mb-10">
        <h2 className="mb-4 font-mono text-sm font-bold tracking-wider text-cyan-300 uppercase">
          2. Procedural Pixel Grid Props ({V3_PIXEL_SPRITES.length} Registered Items)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {V3_PIXEL_SPRITES.map((def: PixelSpriteDef) => (
            <div
              key={def.id}
              className="rounded-lg border border-[#1e283d] bg-[#0c101a] p-4 shadow-xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-[#1e283d]/60 pb-2 mb-3">
                <span className="font-mono text-xs font-bold text-amber-300">
                  {def.name}
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {def.width}×{def.height}px
                </span>
              </div>

              <div className="flex h-56 items-center justify-center rounded border border-[#182030] bg-[#090d16] p-2 overflow-hidden">
                <PixelSpriteSvgView def={def} scale={scale} className="max-h-full max-w-full drop-shadow-md" />
              </div>

              <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span>ID: {def.id}</span>
                <span>Palettes: {Object.keys(def.palette).length} keys</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. CHARACTER SPRITE POSES & REAL PC FACING */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-sm font-bold tracking-wider text-cyan-300 uppercase">
            3. Character Poses & 4-Directional Facing Engine
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-slate-400 mr-2">Facing:</span>
            {facings.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFacing(f)}
                className={`rounded px-2.5 py-1 font-mono text-xs font-bold transition ${
                  activeFacing === f
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {[
            { label: 'Seated Typing (PC Use)', isSeated: true, isTyping: true, isWalking: false, facing: 'NW' as FacingDirection },
            { label: 'Seated Back View', isSeated: true, isTyping: false, isWalking: false, facing: 'NE' as FacingDirection },
            { label: 'Seated Side Profile', isSeated: true, isTyping: true, isWalking: false, facing: 'SE' as FacingDirection },
            { label: 'Walking Frame 1', isSeated: false, isTyping: false, isWalking: true, walkFrame: 0, facing: activeFacing },
            { label: 'Walking Frame 2', isSeated: false, isTyping: false, isWalking: true, walkFrame: 1, facing: activeFacing },
            { label: 'Standing Idle', isSeated: false, isTyping: false, isWalking: false, facing: activeFacing },
          ].map((pose, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[#1e283d] bg-[#0c101a] p-3 shadow-lg flex flex-col items-center"
            >
              <div className="h-28 w-full rounded border border-[#182030] bg-[#090d16] flex items-center justify-center mb-2">
                <PixelSprite
                  id={`gallery-pose-${idx}`}
                  name="Employee"
                  color="#3b82f6"
                  hair="#1e293b"
                  skin="#fcd34d"
                  size={46}
                  isWalking={pose.isWalking}
                  walkFrame={pose.walkFrame || 0}
                  isTyping={pose.isTyping}
                  typeFrame={1}
                  facing={pose.facing}
                  isSeated={pose.isSeated}
                  activity={pose.isTyping ? 'typing' : 'idle'}
                />
              </div>
              <span className="font-mono text-[11px] font-bold text-slate-300 text-center">
                {pose.label}
              </span>
              <span className="font-mono text-[9px] text-slate-500">
                Facing: {pose.facing}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
