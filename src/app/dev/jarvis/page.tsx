'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ARC_REACTOR_STATE_CONFIG,
  ArcReactorPreviewCanvas,
  ArcReactorSizeVariant,
  JARVIS_CORE_STATES,
  JarvisCoreState,
} from '@/components/jarvis/ArcReactor'

export default function JarvisDevLabPage() {
  const [selectedState, setSelectedState] = useState<JarvisCoreState>('idle')
  const [renderMode, setRenderMode] = useState<'3d' | '2d'>('3d')
  const [matrixSize, setMatrixSize] = useState<ArcReactorSizeVariant>('interior')
  const [progress, setProgress] = useState(65)
  const [audioLevel, setAudioLevel] = useState(0.55)
  const [forceHoverLabel, setForceHoverLabel] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

  const activeConfig = ARC_REACTOR_STATE_CONFIG[selectedState]

  return (
    <div className="min-h-screen bg-[#040812] text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Top Dev Header HUD */}
      <header className="relative z-30 border-b border-cyan-500/20 bg-[#050b16]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00e5ff] animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm font-bold tracking-widest text-cyan-300 uppercase">
                  JARVIS // ARC REACTOR HOLOGRAPHIC LAB (PHASE J1)
                </h1>
                <span className="rounded border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300 whitespace-nowrap">
                  SHARED 3D + 2D ENGINE
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-400">
                Single shared component powering both the Office Brain Core (
                <code className="text-cyan-300">size=&quot;office&quot;</code>) and the
                Jarvis Chamber Interior (
                <code className="text-cyan-300">size=&quot;interior&quot;</code>) across
                all 6 states.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* 3D / 2D Renderer Toggle */}
            <div
              role="group"
              aria-label="Renderer mode"
              className="flex items-center rounded-lg border border-slate-800 bg-slate-950/90 p-1"
            >
              <button
                type="button"
                onClick={() => setRenderMode('3d')}
                className={`cursor-pointer rounded-md px-3 py-1 font-mono text-xs font-bold transition-all whitespace-nowrap ${
                  renderMode === '3d'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.5)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3D WebGL (R3F)
              </button>
              <button
                type="button"
                onClick={() => setRenderMode('2d')}
                className={`cursor-pointer rounded-md px-3 py-1 font-mono text-xs font-bold transition-all whitespace-nowrap ${
                  renderMode === '2d'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.5)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2D Canvas (?v=2)
              </button>
            </div>

            <Link
              href="/"
              className="rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 font-mono text-xs font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:text-cyan-300 whitespace-nowrap"
            >
              ← Back to HQ (3D)
            </Link>
            <Link
              href="/?v=2"
              className="rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 font-mono text-xs font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:text-cyan-300 whitespace-nowrap"
            >
              HQ (2D ?v=2)
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-6">
        {/* Control Strip */}
        <section className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="font-mono text-xs font-bold tracking-wider text-cyan-400 uppercase">
                ACTIVE CORE STATE SELECTOR
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                Select any of the 6 states to inspect live breathing, ring counter-rotation,
                particle vortex, and waveform response.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {JARVIS_CORE_STATES.map((st) => {
                const cfg = ARC_REACTOR_STATE_CONFIG[st]
                const isSelected = selectedState === st
                return (
                  <button
                    key={st}
                    type="button"
                    data-testid={`state-btn-${st}`}
                    onClick={() => setSelectedState(st)}
                    className={`cursor-pointer flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold transition-all whitespace-nowrap ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/80 text-white shadow-[0_0_15px_rgba(0,229,255,0.28)]'
                        : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: cfg.primaryColor,
                        boxShadow: `0 0 8px ${cfg.primaryColor}`,
                      }}
                    />
                    <span className="uppercase">{st}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Interactive Telemetry Sliders & Toggles */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-400">EXECUTION PROGRESS</span>
                <span className="font-bold text-cyan-300">
                  {Math.round(progress)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(parseFloat(e.target.value))}
                className="mt-2 w-full accent-cyan-400"
                aria-label="Execution progress"
              />
            </div>

            <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-400">AUDIO WAVEFORM LEVEL</span>
                <span className="font-bold text-cyan-300">
                  {Math.round(audioLevel * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={audioLevel}
                onChange={(e) => setAudioLevel(parseFloat(e.target.value))}
                className="mt-2 w-full accent-cyan-400"
                aria-label="Audio waveform level"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
              <div>
                <div className="font-mono text-[11px] font-bold text-slate-200">
                  HOVER &quot;JARVIS&quot; LABEL
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  Preview core hover badge
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForceHoverLabel((v) => !v)}
                className={`cursor-pointer rounded-md border px-2.5 py-1 font-mono text-xs font-bold transition whitespace-nowrap ${
                  forceHoverLabel
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                {forceHoverLabel ? 'ON' : 'HOVER ONLY'}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
              <div>
                <div className="font-mono text-[11px] font-bold text-slate-200">
                  REDUCED MOTION
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  WCAG static color mode
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReducedMotion((v) => !v)}
                className={`cursor-pointer rounded-md border px-2.5 py-1 font-mono text-xs font-bold transition whitespace-nowrap ${
                  reducedMotion
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                {reducedMotion ? 'ENABLED' : 'STANDARD'}
              </button>
            </div>
          </div>
        </section>

        {/* Dual Size Comparison Stage: Office Size vs Interior Size */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold tracking-widest text-cyan-400 uppercase">
              1. DUAL SIZE COMPARISON STAGE — OFFICE BRAIN CORE vs INTERIOR CHAMBER
            </h2>
            <span className="font-mono text-[11px] text-slate-400">
              Active State:{' '}
              <strong className="text-cyan-300 uppercase">{selectedState}</strong> (
              {activeConfig.subtitle})
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Card: Office Size */}
            <div
              data-testid="compare-office-card"
              className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#050b16] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    OFFICE BRAIN CORE VARIANT (size=&quot;office&quot;)
                  </span>
                  <p className="font-mono text-[11px] text-slate-400">
                    3 concentric segmented rings • 28 orbital particles • Compact footprint
                  </p>
                </div>
                <span className="rounded border border-cyan-500/30 bg-cyan-950/50 px-2 py-0.5 font-mono text-[10px] text-cyan-300 whitespace-nowrap">
                  3 RINGS / LOW DETAIL
                </span>
              </div>

              <div className="h-72 w-full">
                <ArcReactorPreviewCanvas
                  state={selectedState}
                  size="office"
                  renderMode={renderMode}
                  progress={progress}
                  audioLevel={audioLevel}
                  showLabel={forceHoverLabel}
                  reducedMotion={reducedMotion}
                />
              </div>
            </div>

            {/* Right Card: Interior Size */}
            <div
              data-testid="compare-interior-card"
              className="overflow-hidden rounded-xl border border-cyan-500/30 bg-[#050b16] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
                <div>
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    JARVIS INTERIOR CHAMBER VARIANT (size=&quot;interior&quot;)
                  </span>
                  <p className="font-mono text-[11px] text-slate-400">
                    5 counter-rotating gyroscopic rings • 84 particles • 32-bar radial
                    waveform
                  </p>
                </div>
                <span className="rounded border border-cyan-400/50 bg-cyan-950/70 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-200 whitespace-nowrap">
                  5 RINGS / HIGH DETAIL
                </span>
              </div>

              <div className="h-72 w-full">
                <ArcReactorPreviewCanvas
                  state={selectedState}
                  size="interior"
                  renderMode={renderMode}
                  progress={progress}
                  audioLevel={audioLevel}
                  showLabel={forceHoverLabel}
                  reducedMotion={reducedMotion}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Full 6-State Matrix Grid */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-mono text-xs font-bold tracking-widest text-cyan-400 uppercase">
                2. SIMULTANEOUS 6-STATE HOLOGRAPHIC MATRIX
              </h2>
              <p className="font-mono text-[11px] text-slate-400">
                All 6 required states (idle, listening, thinking, executing, speaking,
                error) rendered side-by-side. All pulse frequencies strictly &lt; 2.5 Hz for
                WCAG seizure safety.
              </p>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setMatrixSize('office')}
                className={`cursor-pointer rounded px-2.5 py-1 font-mono text-[11px] font-bold transition whitespace-nowrap ${
                  matrixSize === 'office'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Matrix: Office Size
              </button>
              <button
                type="button"
                onClick={() => setMatrixSize('interior')}
                className={`cursor-pointer rounded px-2.5 py-1 font-mono text-[11px] font-bold transition whitespace-nowrap ${
                  matrixSize === 'interior'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Matrix: Interior Size
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {JARVIS_CORE_STATES.map((st) => {
              const cfg = ARC_REACTOR_STATE_CONFIG[st]
              return (
                <div
                  key={st}
                  data-testid={`matrix-card-${st}`}
                  onClick={() => setSelectedState(st)}
                  className={`cursor-pointer overflow-hidden rounded-xl border transition-all ${
                    selectedState === st
                      ? 'border-cyan-400/80 bg-[#071122] shadow-[0_0_24px_rgba(0,229,255,0.18)]'
                      : 'border-slate-800/90 bg-[#050b16] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: cfg.primaryColor,
                          boxShadow: `0 0 8px ${cfg.primaryColor}`,
                        }}
                      />
                      <span className="font-mono text-xs font-bold uppercase text-white">
                        {st}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      {cfg.pulseHz.toFixed(2)} Hz • {cfg.ringSpeedMultiplier}x RPM
                    </span>
                  </div>

                  <div className="h-56 w-full">
                    <ArcReactorPreviewCanvas
                      state={st}
                      size={matrixSize}
                      renderMode={renderMode}
                      progress={progress}
                      audioLevel={audioLevel}
                      showLabel={forceHoverLabel}
                      reducedMotion={reducedMotion}
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/70 px-4 py-2 font-mono text-[10px] text-slate-400">
                    <span>{cfg.subtitle}</span>
                    <span style={{ color: cfg.primaryColor }}>{cfg.primaryColor}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
