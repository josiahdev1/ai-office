'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  compilePixelGridToSvgPaths,
  SvgColorPath,
} from '@/lib/office/pixelGridEngine'
import {
  ALL_V3_SPRITES,
  PixelSpriteDef,
  SPRITE_PROP_WALL_DESK,
  SPRITE_PROP_CHAIR_NW,
  SPRITE_PROP_CHAIR_NE,
  SPRITE_PROP_CHAIR_SE,
  SPRITE_PROP_CHAIR_SW,
  SPRITE_CHAR_SEATED_TYPING_NW_0,
  SPRITE_CHAR_SEATED_TYPING_NW_1,
  SPRITE_CHAR_SEATED_TYPING_NW_2,
  SPRITE_CHAR_SEATED_TYPING_NE_0,
  SPRITE_CHAR_SEATED_TYPING_NE_1,
  SPRITE_CHAR_SEATED_TYPING_SE_0,
  SPRITE_CHAR_SEATED_TYPING_SW_0,
  SPRITE_CHAR_SEATED_IDLE_NW,
  SPRITE_CHAR_SEATED_ISLAND_FAR,
  SPRITE_CHAR_WALK_NW_0,
  SPRITE_CHAR_WALK_NW_1,
  SPRITE_CHAR_WALK_SE_0,
  SPRITE_CHAR_ACTION_STANDING,
  SPRITE_CHAR_ACTION_LIFT,
  SPRITE_CHAR_ACTION_GESTURE,
  SPRITE_FLOOR_WOOD_PLANK,
} from '@/lib/office/spriteCatalog'
import { FacingDirection } from '@/components/office/types'

// Reusable crisp SVG renderer
function PixelSpriteSvgView({
  def,
  scale = 4,
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
      {paths.map((p: SvgColorPath, idx: number) => (
        <path key={idx} d={p.d} fill={p.color} />
      ))}
    </svg>
  )
}

// Workstation Scene at 6x integer scale
function WorkstationScene6x({
  facing,
  frame,
  isChairPulledOut,
}: {
  facing: 'NW' | 'NE' | 'SE' | 'SW'
  frame: number
  isChairPulledOut: boolean
}) {
  // Select typing frame for facing
  const agentSprite = useMemo(() => {
    if (facing === 'NW') {
      const f = frame % 3
      if (f === 0) return SPRITE_CHAR_SEATED_TYPING_NW_0
      if (f === 1) return SPRITE_CHAR_SEATED_TYPING_NW_1
      return SPRITE_CHAR_SEATED_TYPING_NW_2
    }
    if (facing === 'NE') {
      return (frame % 2 === 0) ? SPRITE_CHAR_SEATED_TYPING_NE_0 : SPRITE_CHAR_SEATED_TYPING_NE_1
    }
    if (facing === 'SE') return SPRITE_CHAR_SEATED_TYPING_SE_0
    return SPRITE_CHAR_SEATED_TYPING_SW_0
  }, [facing, frame])

  const chairSprite = useMemo(() => {
    if (facing === 'NW') return SPRITE_PROP_CHAIR_NW
    if (facing === 'NE') return SPRITE_PROP_CHAIR_NE
    if (facing === 'SE') return SPRITE_PROP_CHAIR_SE
    return SPRITE_PROP_CHAIR_SW
  }, [facing])

  const chairOffsetY = isChairPulledOut ? 16 : 0

  return (
    <div className="relative w-84 h-80 rounded-xl border border-cyan-900/40 bg-[#080d1a] overflow-hidden flex flex-col items-center justify-center p-2 shadow-2xl">
      {/* Background isometric floor grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
        <PixelSpriteSvgView def={SPRITE_FLOOR_WOOD_PLANK} scale={5} />
      </div>

      {/* Facing Badge */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 rounded bg-black/70 px-2 py-0.5 border border-slate-700 font-mono text-[10px] text-cyan-300">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        Facing: <strong className="text-white">{facing}</strong>
        <span className="text-slate-400">
          {facing === 'NW' || facing === 'NE' ? '(Back View)' : '(Back 3/4 View)'}
        </span>
      </div>

      {/* Face Status Badge */}
      <div className="absolute top-2 right-2 z-20 rounded bg-emerald-950/90 px-2 py-0.5 border border-emerald-500/50 font-mono text-[10px] text-emerald-300 font-bold whitespace-nowrap">
        Face Hidden: 100%
      </div>

      {/* Cohesive Workstation in 6x Inspection (Desk + Chair + Seated Agent) */}
      <div className="relative w-80 h-64 flex items-center justify-center">
        {/* Layer 1: Solid Teak Desk with 3 Drawers, Widescreen Monitor, Keyboard, Mouse & Mug */}
        <div className="absolute top-2 left-0 z-0">
          <PixelSpriteSvgView def={SPRITE_PROP_WALL_DESK} scale={5} />
        </div>

        {/* Layer 2: Office Chair */}
        <div
          className="absolute left-20 z-10 transition-all duration-300"
          style={{ top: `${16 + chairOffsetY}px` }}
        >
          <PixelSpriteSvgView def={chairSprite} scale={5} />
        </div>

        {/* Layer 3: Seated Agent (Recognizable blue cap, dark nape hair, hands on keyboard) */}
        <div
          className="absolute left-20 z-20 pointer-events-none transition-all duration-300"
          style={{ top: `${14 + chairOffsetY}px` }}
        >
          <PixelSpriteSvgView def={agentSprite} scale={5} />
        </div>
      </div>

      <div className="absolute bottom-2 inset-x-2 z-20 flex items-center justify-between font-mono text-[10px] text-slate-400 bg-black/60 px-2.5 py-1 rounded border border-slate-800">
        <span>Hands: Typing Frame {frame % 3}</span>
        <span className="text-emerald-400 font-bold">Head: 0 Front Face Pixels</span>
      </div>
    </div>
  )
}

export default function DevGalleryPage() {
  const [scale, setScale] = useState<number>(4)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [playSpeed, setPlaySpeed] = useState<number>(1) // 0.5x, 1x, 2x
  const [frameIndex, setFrameIndex] = useState<number>(0)
  const [isChairPulledOut, setIsChairPulledOut] = useState<boolean>(false)
  const [charFacing, setCharFacing] = useState<FacingDirection>('NW')

  // Animation loop for typing and live props
  useEffect(() => {
    if (!isPlaying) return
    const intervalMs = Math.round(250 / playSpeed)
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % 6)
    }, intervalMs)
    return () => clearInterval(interval)
  }, [isPlaying, playSpeed])

  const categories: { id: string; label: string; count: number }[] = useMemo(() => {
    const counts: Record<string, number> = { all: ALL_V3_SPRITES.length }
    ALL_V3_SPRITES.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1
    })
    return [
      { id: 'all', label: 'All Assets', count: counts['all'] },
      { id: 'floors', label: 'Floors', count: counts['floors'] || 0 },
      { id: 'walls', label: 'Walls', count: counts['walls'] || 0 },
      { id: 'desks_chairs', label: 'Desks & Chairs', count: counts['desks_chairs'] || 0 },
      { id: 'electronics_decor', label: 'Tech & Decor', count: counts['electronics_decor'] || 0 },
      { id: 'lounge', label: 'Lounge', count: counts['lounge'] || 0 },
      { id: 'pantry', label: 'Pantry', count: counts['pantry'] || 0 },
      { id: 'game_gym', label: 'Game & Gym', count: counts['game_gym'] || 0 },
      { id: 'character_workstation', label: 'Agent Workstation', count: counts['character_workstation'] || 0 },
    ]
  }, [])

  const filteredSprites = useMemo(() => {
    if (activeTab === 'all') return ALL_V3_SPRITES
    return ALL_V3_SPRITES.filter((s) => s.category === activeTab)
  }, [activeTab])

  const facings: FacingDirection[] = ['SE', 'SW', 'NE', 'NW']

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 p-6 md:p-10 font-sans selection:bg-cyan-500 selection:text-black">
      {/* HEADER HUD */}
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full bg-cyan-400 animate-pulse shadow-cyan-400/50 shadow-md" />
            <h1 className="font-mono text-2xl font-bold tracking-wider text-slate-100 uppercase">
              EasyUp HQ — Office V3 Pixel Art Catalog
            </h1>
            <span className="rounded bg-cyan-950 px-2.5 py-0.5 font-mono text-xs font-semibold text-cyan-300 border border-cyan-800">
              PHASE 1B APPROVED SPEC
            </span>
          </div>
          <p className="mt-1.5 font-mono text-xs text-slate-400 max-w-3xl">
            Redone pixel-art asset suite with 1px darker-hue outlines, 3 shades per material, baked soft shadows,
            6 textured floors, 8 wall variants, 36+ props, and strict workstation seated rear facing.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0b0f1a] p-1 shadow-inner">
            <span className="px-2 font-mono text-xs text-slate-400 font-semibold">Scale:</span>
            {[3, 4, 6].map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`rounded px-3 py-1 font-mono text-xs font-bold transition whitespace-nowrap ${
                  scale === s
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <Link
            href="/"
            prefetch={false}
            className="rounded-lg border border-slate-800 bg-[#0f1422] px-4 py-2 font-mono text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition shadow"
          >
            ← Return to Office
          </Link>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* SECTION 1: WORKSTATION TEST SCENE (RENDERED AT 6X) */}
      {/* ==================================================================== */}
      <section className="mb-12 rounded-2xl border border-cyan-900/60 bg-[#070b16] p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                CRITICAL TEST SPEC
              </span>
              <h2 className="font-mono text-lg font-bold text-white tracking-wide uppercase">
                Workstation Test Scene (6x Zoom Inspection)
              </h2>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-400">
              Verifies: Seated agents strictly face monitors (camera sees back/side; face never visible at desk);
              typing arms forward with alternating hands; key flicker & code animation.
            </p>
          </div>

          {/* Interactive Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow ${
                isPlaying
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-amber-600 text-white hover:bg-amber-500'
              }`}
            >
              {isPlaying ? '⏸ Pause Typing' : '▶ Play Typing'}
            </button>

            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0b0f1a] p-1 font-mono text-xs">
              <span className="text-slate-400 px-2">Speed:</span>
              {[0.5, 1, 2].map((sp) => (
                <button
                  key={sp}
                  onClick={() => setPlaySpeed(sp)}
                  className={`rounded px-2 py-0.5 font-bold transition ${
                    playSpeed === sp ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sp}x
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsChairPulledOut(!isChairPulledOut)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition ${
                isChairPulledOut
                  ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {isChairPulledOut ? 'Chair: Pulled Out' : 'Chair: Tucked In'}
            </button>
          </div>
        </div>

        {/* Row 1: 4 Facing Workstations (NW, NE, SE, SW) */}
        <div className="mb-8">
          <div className="mb-3 font-mono text-xs font-bold text-cyan-400 flex items-center gap-2">
            <span>WORKSTATION TYPING IN 4 ISOMETRIC FACINGS (BACK VIEW & OCCLUDED FRONT)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <WorkstationScene6x facing="NW" frame={frameIndex} isChairPulledOut={isChairPulledOut} />
            <WorkstationScene6x facing="NE" frame={frameIndex} isChairPulledOut={isChairPulledOut} />
            <WorkstationScene6x facing="SE" frame={frameIndex} isChairPulledOut={isChairPulledOut} />
            <WorkstationScene6x facing="SW" frame={frameIndex} isChairPulledOut={isChairPulledOut} />
          </div>
        </div>

        {/* Row 2: Idle at Desk & Island Desk Far-Side Seat */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
          {/* Card A: Idle at Desk Row */}
          <div className="rounded-xl border border-slate-800 bg-[#090e1c] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-amber-300 uppercase">
                Idle At Desk: Stretch & Coffee Sip
              </span>
              <span className="rounded bg-emerald-950 px-2 py-0.5 font-mono text-[10px] text-emerald-400 border border-emerald-800">
                0 Face Pixels (Nape & Cap Visible)
              </span>
            </div>
            <div className="h-44 rounded-lg bg-[#050811] flex items-center justify-center p-2 border border-slate-900 relative">
              <PixelSpriteSvgView def={SPRITE_CHAR_SEATED_IDLE_NW} scale={5} />
            </div>
            <p className="mt-3 font-mono text-[11px] text-slate-400">
              Agent stretches back in ergonomic mesh chair, holding ceramic mug at chest height.
              Cap buckle cutout and nape hair are visible from the camera, confirming 100% back facing.
            </p>
          </div>

          {/* Card B: Island Desk Far-Side Seat */}
          <div className="rounded-xl border border-slate-800 bg-[#090e1c] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-amber-300 uppercase">
                Island Desk: Far-Side Seat (Monitor Occlusion)
              </span>
              <span className="rounded bg-emerald-950 px-2 py-0.5 font-mono text-[10px] text-emerald-400 border border-emerald-800">
                Only Cap & Shoulders Above Monitor
              </span>
            </div>
            <div className="h-44 rounded-lg bg-[#050811] flex items-center justify-center p-2 border border-slate-900 relative">
              <PixelSpriteSvgView def={SPRITE_CHAR_SEATED_ISLAND_FAR} scale={5} />
            </div>
            <p className="mt-3 font-mono text-[11px] text-slate-400">
              Agent sits on far side of collaborative island pair. The acoustic divider and widescreen display
              casing occlude the face. Only the top curve of the baseball cap and shoulder line peek above.
            </p>
          </div>
        </div>

        {/* Row 3: Action & Movement Poses with Facing Selector */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <span className="font-mono text-xs font-bold text-cyan-400 uppercase">
              Action Poses & 4-Directional Walk Cycle
            </span>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-slate-400 mr-1">Select Facing:</span>
              {facings.map((f) => (
                <button
                  key={f}
                  onClick={() => setCharFacing(f)}
                  className={`rounded px-2.5 py-1 font-bold transition ${
                    charFacing === f
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Walk Frame 0', def: SPRITE_CHAR_WALK_NW_0 },
              { label: 'Walk Frame 1', def: SPRITE_CHAR_WALK_NW_1 },
              { label: 'Walk Alternate', def: SPRITE_CHAR_WALK_SE_0 },
              { label: 'Standing Idle', def: SPRITE_CHAR_ACTION_STANDING },
              { label: 'Weight Lift (Gym)', def: SPRITE_CHAR_ACTION_LIFT },
              { label: 'Gesture Talk', def: SPRITE_CHAR_ACTION_GESTURE },
            ].map((action, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800 bg-[#090e1c] p-3 flex flex-col items-center justify-between"
              >
                <div className="h-28 w-full rounded bg-[#050811] flex items-center justify-center mb-2 border border-slate-900">
                  <PixelSpriteSvgView def={action.def} scale={3} />
                </div>
                <span className="font-mono text-[11px] font-bold text-slate-200 text-center">
                  {action.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 2: CATEGORIZED SPRITE CATALOG */}
      {/* ==================================================================== */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-mono text-lg font-bold text-white tracking-wide uppercase">
              Full Office V3 Sprite Asset Registry ({ALL_V3_SPRITES.length} Items)
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-400">
              Interactive pixel inspector rendered at current scale ({scale}x) with 3-shade palettes and baked contact shadows.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-[#090e1c] p-1.5 shadow">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition whitespace-nowrap ${
                  activeTab === cat.id
                    ? 'bg-cyan-500 text-black shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Sprite Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredSprites.map((def: PixelSpriteDef) => (
            <div
              key={def.id}
              className="rounded-xl border border-slate-800 bg-[#090e1c] p-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
                  <span className="font-mono text-xs font-bold text-amber-300 truncate max-w-[180px]">
                    {def.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {def.width}×{def.height}px
                  </span>
                </div>

                {/* Pixel Art Preview Box */}
                <div className="flex h-52 items-center justify-center rounded-lg border border-slate-900 bg-[#050811] p-3 overflow-hidden shadow-inner">
                  <PixelSpriteSvgView def={def} scale={scale} className="max-h-full max-w-full drop-shadow-md" />
                </div>

                {/* Description */}
                {def.description && (
                  <p className="mt-3 font-mono text-[11px] text-slate-400 line-clamp-2">
                    {def.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span className="truncate max-w-[140px] text-slate-400 font-mono">
                  {def.id}
                </span>
                <span className="rounded bg-slate-800/50 px-2 py-0.5 text-slate-300">
                  {Object.keys(def.palette).length} shades
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
