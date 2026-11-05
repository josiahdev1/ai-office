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
} from '../src/lib/office/spriteCatalog'

describe('Workstation Seated Facing & Face Visibility Rules (Phase 1B)', () => {
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

  it('guarantees 0 face/eye/mouth pixels in the upper head region (rows 3 to 13) for back-facing seated poses', () => {
    // For back facings (NW, NE) and rear island desk, camera sees the cap crown, buckle cutout, and nape hair.
    // The upper head area must not contain front face skin pixels.
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
      // Rows 3 to 12 correspond to head and cap
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

    // Check key required props from prompt
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
