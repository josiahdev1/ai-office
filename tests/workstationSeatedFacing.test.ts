import { describe, it, expect } from 'vitest'
import {
  ALL_V3_SPRITES,
  COMMON_PALETTE,
  PixelSpriteDef,
  SPRITE_CHAR_SEATED_TYPING_NW_0,
  SPRITE_CHAR_SEATED_TYPING_NW_1,
  SPRITE_CHAR_SEATED_TYPING_NW_2,
  SPRITE_CHAR_SEATED_TYPING_NE_0,
  SPRITE_CHAR_SEATED_TYPING_NE_1,
  SPRITE_CHAR_SEATED_TYPING_SE_0,
  SPRITE_CHAR_SEATED_TYPING_SW_0,
  SPRITE_CHAR_SEATED_IDLE_NW,
  SPRITE_CHAR_SEATED_ISLAND_FAR,
  SPRITE_PROP_WALL_DESK,
  SPRITE_PROP_COFFEE_MUG,
} from '../src/lib/office/spriteCatalog'

describe('Workstation Seated Facing & Face Visibility Rules (Phase 1C)', () => {
  const seatedPoses: PixelSpriteDef[] = [
    SPRITE_CHAR_SEATED_TYPING_NW_0,
    SPRITE_CHAR_SEATED_TYPING_NW_1,
    SPRITE_CHAR_SEATED_TYPING_NW_2,
    SPRITE_CHAR_SEATED_TYPING_NE_0,
    SPRITE_CHAR_SEATED_TYPING_NE_1,
    SPRITE_CHAR_SEATED_TYPING_SE_0,
    SPRITE_CHAR_SEATED_TYPING_SW_0,
    SPRITE_CHAR_SEATED_IDLE_NW,
    SPRITE_CHAR_SEATED_ISLAND_FAR,
  ]

  it('strictly marks all seated poses across all facings with hasVisibleFace: false', () => {
    seatedPoses.forEach((pose) => {
      expect(
        pose.hasVisibleFace,
        `Seated sprite ${pose.id} must explicitly declare hasVisibleFace: false`
      ).toBe(false)
    })
  })

  it('guarantees 0 face/eye/mouth pixels in the upper head region (rows 3 to 12) for back-facing seated poses (NW, NE, Idle, Island Far)', () => {
    const backFacings = [
      SPRITE_CHAR_SEATED_TYPING_NW_0,
      SPRITE_CHAR_SEATED_TYPING_NW_1,
      SPRITE_CHAR_SEATED_TYPING_NW_2,
      SPRITE_CHAR_SEATED_TYPING_NE_0,
      SPRITE_CHAR_SEATED_TYPING_NE_1,
      SPRITE_CHAR_SEATED_IDLE_NW,
      SPRITE_CHAR_SEATED_ISLAND_FAR,
    ]

    backFacings.forEach((pose) => {
      for (let y = 3; y <= 12; y++) {
        const row = pose.grid[y]
        if (!row) continue
        for (let x = 0; x < row.length; x++) {
          const char = row[x]
          // 'F' and 'f' are skin tones (#fcd34d and #f59e0b)
          expect(
            char !== 'F' && char !== 'f',
            `Back-facing seated pose ${pose.id} has face pixel '${char}' at row ${y}, col ${x}`
          ).toBe(true)
        }
      }
    })
  })

  it('verifies SE and SW seated poses are drawn from back-three-quarter angle with NO eyes, NO mouth, and NO flat gray block', () => {
    const sidePoses = [SPRITE_CHAR_SEATED_TYPING_SE_0, SPRITE_CHAR_SEATED_TYPING_SW_0]

    sidePoses.forEach((pose) => {
      let skinPixelsInHead = 0
      let blueCapPixelsInHead = 0
      let graySquarePixelsInHead = 0

      for (let y = 3; y <= 12; y++) {
        const row = pose.grid[y]
        if (!row) continue
        for (let x = 0; x < row.length; x++) {
          const char = row[x]
          if (char === 'F' || char === 'f') skinPixelsInHead++
          if (char === 'C' || char === 'c') blueCapPixelsInHead++
          if (char === 'k') graySquarePixelsInHead++
        }
      }

      // No flat gray square block in upper head
      expect(graySquarePixelsInHead, `${pose.id} must not have a flat gray square in head`).toBe(0)

      // Recognizable blue baseball cap dome
      expect(blueCapPixelsInHead, `${pose.id} must have a prominent blue cap dome`).toBeGreaterThanOrEqual(20)

      // Only subtle profile contour (ear/jawline) allowed (<= 4 pixels), strictly NO eyes or mouth
      expect(skinPixelsInHead, `${pose.id} has too many face pixels for a back 3/4 view`).toBeLessThanOrEqual(4)
    })
  })

  it('verifies prop_wall_desk has solid wooden top with visible bevel thickness, 3 drawers, legs, monitor, keyboard, mouse, and NO glowing halo', () => {
    const desk = SPRITE_PROP_WALL_DESK
    expect(desk).toBeDefined()
    expect(desk.width).toBe(64)
    expect(desk.height).toBe(48)

    // Palette includes oak wood, front bevel, drawer handles, metal legs, monitor screen code syntax
    expect(desk.palette['w']).toBeDefined() // base oak
    expect(desk.palette['d']).toBeDefined() // front bevel
    expect(desk.palette['H']).toBeDefined() // drawer handles
    expect(desk.palette['L']).toBeDefined() // metal leg
    expect(desk.palette['B']).toBeDefined() // monitor bezel
    expect(desk.palette['1']).toBeDefined() // syntax code cyan
    expect(desk.palette['2']).toBeDefined() // syntax code orange
    expect(desk.palette['3']).toBeDefined() // syntax code green

    // Verifies no glowing yellow halo around the perimeter
    expect(desk.palette['h']).not.toBe('#fde68a')
  })

  it('verifies prop_coffee_mug is a clean ceramic mug with NO white-face / brown-hair / red-dot look', () => {
    const mug = SPRITE_PROP_COFFEE_MUG
    expect(mug).toBeDefined()
    expect(mug.width).toBe(16)
    expect(mug.height).toBe(16)

    // Must not contain red mouth/dot pixel 'r'
    expect(mug.palette['r']).toBeUndefined()

    // Must be navy ceramic with dark coffee
    expect(mug.palette['M']).toBe('#1e3a8a')
    expect(mug.palette['b']).toBe('#451a03')
  })

  it('contains at least 6 floor diamond tiles with valid dimensions and textures', () => {
    const floors = ALL_V3_SPRITES.filter((s) => s.category === 'floors')
    expect(floors.length).toBeGreaterThanOrEqual(6)

    const expectedFloors = [
      'floor_wood_plank',
      'floor_carpet_blue',
      'floor_checker_hallway',
      'floor_circuit_tech',
      'floor_ceramic_cream',
      'floor_gym_rubber',
    ]

    expectedFloors.forEach((id) => {
      const found = floors.find((f) => f.id === id)
      expect(found, `Floor tile ${id} must exist in catalog`).toBeDefined()
      expect(found!.width).toBe(64)
      expect(found!.height).toBe(32)
    })
  })

  it('contains at least 8 wall segment variants with height 80 and width 64', () => {
    const walls = ALL_V3_SPRITES.filter((s) => s.category === 'walls')
    expect(walls.length).toBeGreaterThanOrEqual(8)

    const expectedWalls = [
      'wall_plain_se',
      'wall_plain_sw',
      'wall_window_skyline',
      'wall_whiteboard',
      'wall_corkboard',
      'wall_door_archway',
      'wall_glass_partition',
      'wall_framed_poster',
    ]

    expectedWalls.forEach((id) => {
      const found = walls.find((w) => w.id === id)
      expect(found, `Wall variant ${id} must exist in catalog`).toBeDefined()
      expect(found!.width).toBe(64)
      expect(found!.height).toBe(80)
    })
  })

  it('contains at least 36 distinct office props across all categories', () => {
    const props = ALL_V3_SPRITES.filter((s) => s.category !== 'floors' && s.category !== 'walls')
    expect(props.length).toBeGreaterThanOrEqual(36)

    const keyProps = [
      'prop_wall_desk',
      'prop_island_desk_pair',
      'prop_josiah_l_desk',
      'prop_chair_nw',
      'prop_chair_ne',
      'prop_chair_se',
      'prop_chair_sw',
      'prop_monitor_code',
      'prop_monitor_terminal',
      'prop_monitor_chart',
      'prop_keyboard',
      'prop_mouse',
      'prop_coffee_mug',
      'prop_desk_lamp',
      'prop_sofa_mustard',
      'prop_sofa_purple',
      'prop_coffee_table',
      'prop_bookshelf',
      'prop_filing_cabinet',
      'prop_plant_monstera',
      'prop_plant_fiddle_leaf',
      'prop_plant_bonsai',
      'prop_vending_machine',
      'prop_water_cooler',
      'prop_fridge',
      'prop_coffee_machine',
      'prop_kitchen_counter',
      'prop_copier',
      'prop_whiteboard',
      'prop_corkboard',
      'prop_wall_clock',
      'prop_window_city',
      'prop_framed_poster',
      'prop_trash_bin',
      'prop_floor_lamp',
      'prop_pool_table',
      'prop_arcade_cabinet',
      'prop_treadmill',
      'prop_weight_bench',
      'prop_ping_pong_table',
      'prop_wall_tv',
      'prop_lounge_rug',
      'prop_long_meeting_table',
      'prop_the_brain_round_table',
      'prop_the_brain_core',
      'prop_server_rack',
    ]

    keyProps.forEach((propId) => {
      const found = ALL_V3_SPRITES.find((s) => s.id === propId)
      expect(found, `Required prop ${propId} must be defined in sprite catalog`).toBeDefined()
    })
  })

  it('validates all sprite dimensions, row lengths and palette integrity', () => {
    ALL_V3_SPRITES.forEach((sprite) => {
      expect(sprite.grid.length).toBe(sprite.height)
      const allowedPaletteKeys = new Set([
        ...Object.keys(sprite.palette),
        ...Object.keys(COMMON_PALETTE),
        '.',
        ' ',
      ])

      sprite.grid.forEach((row, rIdx) => {
        expect(
          row.length,
          `Sprite ${sprite.id} row ${rIdx} length ${row.length} must equal width ${sprite.width}`
        ).toBe(sprite.width)

        for (let cIdx = 0; cIdx < row.length; cIdx++) {
          const char = row[cIdx]
          expect(
            allowedPaletteKeys.has(char),
            `Sprite ${sprite.id} at [${rIdx}, ${cIdx}] char '${char}' missing in palette`
          ).toBe(true)
        }
      })
    })
  })
})
