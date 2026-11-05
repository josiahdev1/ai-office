import { describe, it, expect } from 'vitest'
import {
  V3_PIXEL_SPRITES,
  compilePixelGridToDataUrl,
  compilePixelGridToSvgPaths,
  COMMON_PALETTE,
} from '../src/lib/office/pixelGridEngine'

describe('Office V3 Palette-Indexed Pixel Grid Engine (Phase 1)', () => {
  it('has valid dimension and row lengths for all registered sprites', () => {
    expect(V3_PIXEL_SPRITES.length).toBeGreaterThanOrEqual(9)

    V3_PIXEL_SPRITES.forEach((sprite) => {
      expect(sprite.id).toBeDefined()
      expect(sprite.name).toBeDefined()
      expect(sprite.width).toBeGreaterThan(0)
      expect(sprite.height).toBeGreaterThan(0)
      expect(sprite.grid.length).toBe(sprite.height)

      sprite.grid.forEach((row, rowIndex) => {
        expect(
          row.length,
          `Sprite ${sprite.id} row ${rowIndex} length must equal width ${sprite.width}`
        ).toBe(sprite.width)
      })
    })
  })

  it('contains valid palette mapping for every character in every sprite grid', () => {
    V3_PIXEL_SPRITES.forEach((sprite) => {
      const allowedChars = new Set([
        ...Object.keys(sprite.palette),
        ...Object.keys(COMMON_PALETTE),
        '.',
        ' ',
      ])

      sprite.grid.forEach((row, rIdx) => {
        for (let cIdx = 0; cIdx < row.length; cIdx++) {
          const char = row[cIdx]
          expect(
            allowedChars.has(char),
            `Sprite ${sprite.id} at [${rIdx}, ${cIdx}] character '${char}' must be in palette`
          ).toBe(true)
        }
      })
    })
  })

  it('compiles sprite grids to data URLs gracefully without throwing', () => {
    // In node environment without canvas document, returns fallback string or data URL
    V3_PIXEL_SPRITES.forEach((sprite) => {
      const res = compilePixelGridToDataUrl(sprite, 2)
      expect(typeof res).toBe('string')
    })
  })

  it('compiles sprite grids to SVG paths for crisp SSR rendering', () => {
    V3_PIXEL_SPRITES.forEach((sprite) => {
      const paths = compilePixelGridToSvgPaths(sprite)
      expect(Array.isArray(paths)).toBe(true)
      expect(paths.length).toBeGreaterThan(0)
      paths.forEach((p) => {
        expect(p.color).toBeDefined()
        expect(p.d).toMatch(/^M\d+ \d+/)
      })
    })
  })
})
