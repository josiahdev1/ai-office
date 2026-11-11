import { describe, expect, it, vi } from 'vitest'
import {
  ARC_REACTOR_STATE_CONFIG,
  computeArcReactorFrame,
  drawArcReactor2D,
  getRingLayersForSize,
  JARVIS_CORE_STATES,
} from '@/components/jarvis/ArcReactor'

describe('Phase J1: Shared ArcReactor (3D + 2D) State & Geometry Spec', () => {
  it('defines all 6 required Jarvis core states', () => {
    expect(JARVIS_CORE_STATES).toEqual([
      'idle',
      'listening',
      'thinking',
      'executing',
      'speaking',
      'error',
    ])
  })

  it('enforces WCAG seizure safety (< 3 Hz pulse frequency) across all 6 states', () => {
    for (const state of JARVIS_CORE_STATES) {
      const cfg = ARC_REACTOR_STATE_CONFIG[state]
      expect(cfg).toBeDefined()
      expect(cfg.pulseHz).toBeGreaterThan(0)
      expect(cfg.pulseHz).toBeLessThan(2.5)
      expect(cfg.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(cfg.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('returns compact 3-ring geometry for office size and detailed 5-ring geometry for interior size', () => {
    const officeRings = getRingLayersForSize('office')
    const interiorRings = getRingLayersForSize('interior')

    expect(officeRings).toHaveLength(3)
    expect(interiorRings).toHaveLength(5)

    // Verify counter-rotating directions exist in both variants
    expect(officeRings.some((r) => r.baseSpeed > 0)).toBe(true)
    expect(officeRings.some((r) => r.baseSpeed < 0)).toBe(true)
    expect(interiorRings.some((r) => r.baseSpeed > 0)).toBe(true)
    expect(interiorRings.some((r) => r.baseSpeed < 0)).toBe(true)
  })

  it('computes deterministic frame animation values for all 6 states and respects reducedMotion', () => {
    for (const state of JARVIS_CORE_STATES) {
      const normalFrame = computeArcReactorFrame(state, 1.75, {
        progress: 65,
        audioLevel: 0.7,
        hovered: false,
        reducedMotion: false,
      })

      expect(normalFrame.coreScale).toBeGreaterThan(0.5)
      expect(normalFrame.waveformAmplitudes).toHaveLength(32)
      expect(normalFrame.radiusMultiplier).toBeGreaterThan(0.5)

      const reducedFrame = computeArcReactorFrame(state, 1.75, {
        progress: 65,
        audioLevel: 0.7,
        hovered: false,
        reducedMotion: true,
      })

      // In reduced motion mode, rippleProgress freezes at 0.5 and radiusMultiplier stays at static radiusScale
      expect(reducedFrame.rippleProgress).toBe(0.5)
      expect(reducedFrame.radiusMultiplier).toBeCloseTo(
        ARC_REACTOR_STATE_CONFIG[state].radiusScale,
        4
      )
    }
  })

  it('renders 2D ArcReactor onto a CanvasRenderingContext2D for both office and interior sizes without errors', () => {
    const mockGrad = { addColorStop: vi.fn() }
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      roundRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 42 })),
      createRadialGradient: vi.fn(() => mockGrad),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      globalAlpha: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'middle',
    } as unknown as CanvasRenderingContext2D

    for (const state of JARVIS_CORE_STATES) {
      drawArcReactor2D(mockCtx, 200, 150, 24, 2.4, {
        state,
        size: 'office',
        hovered: true,
        isometricTilt: true,
      })
      drawArcReactor2D(mockCtx, 300, 200, 80, 2.4, {
        state,
        size: 'interior',
        hovered: false,
        showLabel: true,
        progress: 75,
        audioLevel: 0.8,
      })
    }

    expect(mockCtx.save).toHaveBeenCalled()
    expect(mockCtx.restore).toHaveBeenCalled()
    expect(mockCtx.arc).toHaveBeenCalled()
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      'JARVIS',
      expect.any(Number),
      expect.any(Number)
    )
  })
})
