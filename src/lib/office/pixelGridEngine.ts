/**
 * Palette-Indexed Pixel Grid Engine for EasyUp Software Solution HQ (Office V3)
 *
 * Provides crisp pixel-art sprite compilation from compact character grids:
 * - 1px dark hue outline
 * - 3 distinct shades per material (highlight, base, shadow)
 * - Baked contact soft shadow
 * - In-memory caching to OffscreenCanvas / Canvas Data URLs
 * - Integer scaling with nearest-neighbor interpolation
 */

export interface PixelPalette {
  [char: string]: string
}

export interface PixelSpriteDef {
  id: string
  name: string
  width: number
  height: number
  palette: PixelPalette
  grid: string[]
  description?: string
  hasVisibleFace?: boolean
  category?: string
}

// In-memory sprite cache to avoid re-rendering static grids
const spriteCanvasCache: Map<string, string> = new Map()

export interface SvgColorPath {
  color: string
  d: string
}

/**
 * Compiles a sprite grid into optimized SVG path data grouped by color.
 * Safe for SSR and client rendering with crispEdges.
 */
export function compilePixelGridToSvgPaths(
  def: PixelSpriteDef
): SvgColorPath[] {
  const colorMap = new Map<string, string[]>()

  for (let y = 0; y < def.grid.length; y++) {
    const row = def.grid[y]
    for (let x = 0; x < row.length; x++) {
      const char = row[x]
      if (char === ' ' || char === '.') continue
      const color = def.palette[char]
      if (!color) continue

      let paths = colorMap.get(color)
      if (!paths) {
        paths = []
        colorMap.set(color, paths)
      }
      paths.push(`M${x} ${y}h1v1h-1z`)
    }
  }

  const result: SvgColorPath[] = []
  for (const [color, paths] of colorMap.entries()) {
    result.push({
      color,
      d: paths.join(''),
    })
  }
  return result
}

/**
 * Directly draws a pixel sprite onto a 2D canvas context at an integer position.
 */
export function drawPixelSpriteToCanvas(
  ctx: CanvasRenderingContext2D,
  def: PixelSpriteDef,
  dx: number,
  dy: number,
  scale: number = 1
): void {
  for (let y = 0; y < def.grid.length; y++) {
    const row = def.grid[y]
    for (let x = 0; x < row.length; x++) {
      const char = row[x]
      if (char === ' ' || char === '.') continue
      const color = def.palette[char]
      if (color) {
        ctx.fillStyle = color
        ctx.fillRect(
          Math.round(dx + x * scale),
          Math.round(dy + y * scale),
          scale,
          scale
        )
      }
    }
  }
}

/**
 * Compiles a character grid into a crisp data URL via Canvas
 */
export function compilePixelGridToDataUrl(
  def: PixelSpriteDef,
  scale: number = 2
): string {
  const cacheKey = `${def.id}_s${scale}`
  if (spriteCanvasCache.has(cacheKey)) {
    return spriteCanvasCache.get(cacheKey)!
  }

  // Handle SSR gracefully
  if (typeof document === 'undefined') {
    return ''
  }

  const canvas = document.createElement('canvas')
  canvas.width = def.width * scale
  canvas.height = def.height * scale
  const ctx = canvas.getContext('2d')

  if (!ctx) return ''

  ctx.imageSmoothingEnabled = false

  for (let y = 0; y < def.grid.length; y++) {
    const row = def.grid[y]
    for (let x = 0; x < row.length; x++) {
      const char = row[x]
      if (char === ' ' || char === '.') continue // transparent

      const color = def.palette[char]
      if (color) {
        ctx.fillStyle = color
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }

  const dataUrl = canvas.toDataURL('image/png')
  spriteCanvasCache.set(cacheKey, dataUrl)
  return dataUrl
}

// ============================================================================
// PALETTES & COLOR SYSTEMS
// ============================================================================

export const COMMON_PALETTE: PixelPalette = {
  '.': 'transparent',
  ' ': 'transparent',
  X: '#090d16', // Deep outline
  S: 'rgba(0, 0, 0, 0.35)', // Soft contact shadow
  W: '#ffffff', // Crisp white
  G: '#94a3b8', // Slate gray
  K: '#475569', // Dark slate
  D: '#1e293b', // Deep charcoal
}

// ============================================================================
// SPRITE DEFINITIONS CATALOG (PHASE 1)
// ============================================================================

/**
 * 1. Potted Monstera Plant (32x40)
 */
export const SPRITE_PLANT_MONSTERA: PixelSpriteDef = {
  id: 'prop_plant_monstera',
  name: 'Potted Monstera Plant',
  width: 32,
  height: 40,
  palette: {
    ...COMMON_PALETTE,
    p: '#78350f', // Pot rim shadow
    P: '#b45309', // Pot body
    l: '#d97706', // Pot highlight
    d: '#064e3b', // Leaf shadow
    m: '#059669', // Leaf midtone
    h: '#34d399', // Leaf highlight
    s: '#15803d', // Stem
  },
  grid: [
    '.............hhhh...............',
    '...........hhmmmmh..............',
    '..........hmmmmddmhh............',
    '.........hmmmmddddddh...........',
    '.........hmhsmddddddh...........',
    '........hmmmshh..hddh...........',
    '.......hmmddds...hhhh...........',
    '.......hmdddshh.hmmmh...........',
    '.......hdddssmhhmmmddh..........',
    '........hds..smmdddddh..........',
    '........ss...sdddhhhh...........',
    '.......hh....sddd...............',
    '.....hhmmh...s..hhhhh...........',
    '....hmmddmh..s.hhmmmh...........',
    '....hmddddmh.s.hmddddh..........',
    '.....hddddmh.s.hdddddh..........',
    '......hhhhms.s..hhhhh...........',
    '.........hms.s..................',
    '..........ss.s..................',
    '...........s.s..................',
    '...........sss..................',
    '...........sss..................',
    '.........XXXXXXX................',
    '........XlllllllX...............',
    '.......XlllllllllX..............',
    '.......XPPPPPPPPPX..............',
    '.......XPPPPPPPPPX..............',
    '.......XPPPPPPPPPX..............',
    '........XpppppppX...............',
    '........XpppppppX...............',
    '.........XpppppX................',
    '..........XXXXX.................',
    '........SSSSSSSSS...............',
    '.......SSSSSSSSSSS..............',
    '........SSSSSSSSS...............',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
}

/**
 * 2. Retro Arcade Cabinet (32x44)
 */
export const SPRITE_ARCADE_CABINET: PixelSpriteDef = {
  id: 'prop_arcade_cabinet',
  name: 'Retro Arcade Cabinet',
  width: 32,
  height: 44,
  palette: {
    ...COMMON_PALETTE,
    m: '#831843', // Marquee magenta dark
    M: '#ec4899', // Marquee bright magenta
    w: '#fbcfe8', // Marquee glow white
    s: '#0284c7', // Screen border blue
    S: '#38bdf8', // Screen cyan
    g: '#22c55e', // Game character green
    c: '#4c1d95', // Cabinet purple dark
    C: '#6d28d9', // Cabinet purple mid
    j: '#f59e0b', // Joystick gold
    r: '#ef4444', // Action buttons red
    y: '#eab308', // Action buttons yellow
  },
  grid: [
    '........XXXXXXXXXXXXXX..........',
    '.......XmmmmmmmmmmmmmmX.........',
    '.......XmMwwwwwwwwwwMmX.........',
    '.......XmMwMMMMMMMMwMmX.........',
    '.......XmMwwwwwwwwwwMmX.........',
    '.......XmmmmmmmmmmmmmmX.........',
    '......XCCCCCCCCCCCCCCCCX........',
    '.....XCCcssssssssssssCCX........',
    '.....XCCsSSSSSSSSSSSSsCX........',
    '.....XCCsSSgSSSSSSSSsCCX........',
    '.....XCCsSgggSSSSSSSsCCX........',
    '.....XCCsSSgSSSSSSSSsCCX........',
    '.....XCCsSSSSSSSSSSSSsCX........',
    '.....XCCcssssssssssssCCX........',
    '....XCCCCCCCCCCCCCCCCCCX........',
    '...XCCCjjrrrrrryyyCCCXX.........',
    '..XCCCCj.rrrrrryyyCCCCX.........',
    '..XCCCCCCCCCCCCCCCCCCCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCcccc.XXXXXX.ccccCX.........',
    '..XCCcccc.XrrrrX.ccccCX.........',
    '..XCCcccc.XrrrrX.ccccCX.........',
    '..XCCcccc.XXXXXX.ccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCccccccccccccccccCX.........',
    '..XCCCCCCCCCCCCCCCCCCCX.........',
    '..XXXXXXXXXXXXXXXXXXXXX.........',
    '.SSSSSSSSSSSSSSSSSSSSSSS........',
    'SSSSSSSSSSSSSSSSSSSSSSSSS.......',
    '.SSSSSSSSSSSSSSSSSSSSSSS........',
  ],
}

/**
 * 3. Executive Pool Table (48x32)
 */
export const SPRITE_POOL_TABLE: PixelSpriteDef = {
  id: 'prop_pool_table',
  name: 'Executive Pool Table',
  width: 64,
  height: 32,
  palette: {
    ...COMMON_PALETTE,
    w: '#78350f', // Wood frame shadow
    W: '#b45309', // Wood frame mid
    h: '#d97706', // Wood frame highlight
    f: '#064e3b', // Felt shadow (green)
    F: '#059669', // Felt midtone
    l: '#10b981', // Felt highlight
    b: '#ffffff', // Cue ball white
    r: '#ef4444', // Red ball
    y: '#eab308', // Yellow ball
    p: '#0f172a', // Pocket black
  },
  grid: [
    '............XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..................',
    '...........XhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhX.................',
    '..........XhWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwX................',
    '.........XhWppFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFppWwX...............',
    '........XhWpFFllllllllllllllllllllllllllllllFFpWwX..............',
    '.......XhWpFFllllllllllllllllllllllllllllllllFFpWwX.............',
    '......XhWpFFlllllllllllllrllllllllllllllllllllFFpWwX............',
    '.....XhWppFFllllllllllllryrllllllllllllllllllllFFppWwX..........',
    '....XhWpFFlllllllllllllryryrllllllllllblllllllllFFpWwX..........',
    '...XhWpFFllllllllllllllllllllllllllllllllllllllllFFpWwX.........',
    '..XhWppFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFppWwX..........',
    '..XwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwX..........',
    '..XWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWX..........',
    '..XWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWX..........',
    '..XwXXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXXwX..........',
    '..XwXXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXXwX..........',
    '..XwXX............................................XXwX..........',
    '..XwXX............................................XXwX..........',
    '..XwXX............................................XXwX..........',
    '..XwXX............................................XXwX..........',
    '..XwXX............................................XXwX..........',
    '..XwXX............................................XXwX..........',
    '..XwXX............................................XXwX..........',
    '..XwXX............................................XXwX..........',
    '..XwXX............................................XXwX..........',
    '..XXXX............................................XXXX..........',
    '..SSSS............................................SSSS..........',
    '.SSSSSS..........................................SSSSSS.........',
    '..SSSS............................................SSSS..........',
    '................................................................',
    '................................................................',
    '................................................................',
  ],
}

/**
 * 4. Water Cooler / Dispenser (24x36)
 */
export const SPRITE_WATER_COOLER: PixelSpriteDef = {
  id: 'prop_water_cooler',
  name: 'Office Water Cooler',
  width: 24,
  height: 36,
  palette: {
    ...COMMON_PALETTE,
    b: '#38bdf8', // Water cyan bright
    B: '#0284c7', // Water blue
    t: '#bae6fd', // Transparent water bottle highlight
    w: '#f1f5f9', // Cooler body white
    g: '#cbd5e1', // Cooler body shadow
    r: '#ef4444', // Hot lever
    c: '#3b82f6', // Cold lever
  },
  grid: [
    '........XXXXXX..........',
    '.......XttttttX.........',
    '......XttbbbbttX........',
    '......XttbbbbttX........',
    '......XttbbbbttX........',
    '......XttBBBBttX........',
    '......XttBBBBttX........',
    '......XttBBBBttX........',
    '.......XttBBttX.........',
    '........XXXXXX..........',
    '.......XwwwwwwX.........',
    '......XwwwwwwwwX........',
    '......XwwwwwwwwX........',
    '......Xwwr..cwwX........',
    '......Xwwg..gwwX........',
    '......XwwwwwwwwX........',
    '......XwwwwwwwwX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XggggggggX........',
    '......XXXXXXXXXX........',
    '.....SSSSSSSSSSSS.......',
    '....SSSSSSSSSSSSSS......',
    '.....SSSSSSSSSSSS.......',
    '........................',
    '........................',
    '........................',
  ],
}

/**
 * 5. Modern Wall Clock (24x24)
 */
export const SPRITE_WALL_CLOCK: PixelSpriteDef = {
  id: 'prop_wall_clock',
  name: 'Modern Wall Clock',
  width: 24,
  height: 24,
  palette: {
    ...COMMON_PALETTE,
    f: '#0f172a', // Rim dark
    F: '#334155', // Rim slate
    w: '#ffffff', // Dial face white
    m: '#e2e8f0', // Dial face soft shade
    h: '#0f172a', // Hour hand
    r: '#ef4444', // Second hand red
  },
  grid: [
    '........XXXXXXXX........',
    '......XXFFFFFFFFXX......',
    '.....XFFFFFFFFFFFFX.....',
    '....XFFwwwwwwwwwwFFX....',
    '...XFFwwwwwwwwwwwwFFX...',
    '..XFFwwwwwwrhwwwwwwFFX..',
    '..XFFwwwwwrrhhwwwwwFFX..',
    '.XFFwwwwwrr..hhwwwwwFFX.',
    '.XFFwwwwwr....hhwwwwFFX.',
    '.XFFwwwwr......hwwwwFFX.',
    '.XFFwwwwr...........FFX.',
    '.XFFwwwwr...........FFX.',
    '.XFFwwwwr...........FFX.',
    '.XFFwwwwr...........FFX.',
    '.XFFwwwwwr.........mFFX.',
    '.XFFwwwwwr........mmFFX.',
    '.XFFwwwwwwr......mmmFFX.',
    '..XFFwwwwwwwwwwmmffFFX..',
    '..XFFwwwwwwwwwmmfffFFX..',
    '...XFFmmmmmmmmfffffFX...',
    '....XFFffffffffffFFX....',
    '.....XFFFFFFFFFFFFX.....',
    '......XXFFFFFFFFXX......',
    '........XXXXXXXX........',
  ],
}

/**
 * 6. City View Window with Skyline (40x36)
 */
export const SPRITE_CITY_WINDOW: PixelSpriteDef = {
  id: 'prop_city_window',
  name: 'Panoramic City View Window',
  width: 40,
  height: 36,
  palette: {
    ...COMMON_PALETTE,
    f: '#cbd5e1', // Frame white/silver
    F: '#94a3b8', // Frame shadow
    s: '#38bdf8', // Sky daylight
    S: '#0284c7', // Sky depth blue
    b: '#1e293b', // Skyscraper silhouette
    B: '#334155', // Building midtone
    l: '#fef08a', // City office window lights
  },
  grid: [
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'XffffffffffffffffffffffffffffffffffffffX',
    'XfssssssssssssssssssssssssssssssssssssfX',
    'XfssssssssssssssssssssssssssssssssssssfX',
    'XfssssssssssssssssssssssssssssssssssssfX',
    'XfssssssssssssssssssssssssssssssssssssfX',
    'XfssssssbbsssssssssssssssssssssbssssssfX',
    'XfssssssbbssssssssssbssssssssssbssssssfX',
    'XfssssssbbssbbssssssbssssbbssssbssssssfX',
    'XfssbbssbbssbbssssssbssssbbssssbbsssssfX',
    'XfssbbssbbssbbssbbssbssssbbssssbbsssssfX',
    'XfssblssbbssbbssbbssbsssblbssssbbsssssfX',
    'XfssblssblssbbssbbssbsssblbssssblsssssfX',
    'XfssblssblssblssbbssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XffffffffffffffffffffffffffffffffffffffX',
    'XFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFX',
    'XfssssssssssssssssssssssssssssssssssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XfssblssblssblssblssbsssblbsssblbsssssfX',
    'XffffffffffffffffffffffffffffffffffffffX',
    'XFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFX',
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  ],
}

/**
 * 7. Long Collaborative Coworking Table (64x36)
 */
export const SPRITE_LONG_TABLE: PixelSpriteDef = {
  id: 'prop_long_coworking_table',
  name: 'Engineering Collaborative Table',
  width: 64,
  height: 36,
  palette: {
    ...COMMON_PALETTE,
    w: '#78350f', // Warm wood shadow
    W: '#b45309', // Warm wood top
    l: '#d97706', // Wood highlight
    m: '#0f172a', // Monitor bezel
    s: '#38bdf8', // Monitor screen cyan
    g: '#22c55e', // Code syntax green
    p: '#475569', // Keyboard
    c: '#f8fafc', // Coffee mug white
    e: '#94a3b8', // Steel legs
  },
  grid: [
    '................XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX................',
    '...............XllllllllllllllllllllllllllllllllX...............',
    '..............XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWlX..............',
    '.............XlWWmmmmWWWWmmmmWWWWWWWWmmmmWWWWmmmmWlX............',
    '............XlWWmsggsmWWmsggsmWWWWWWmsggsmWWmsggsmWlX...........',
    '...........XlWWWWmmmmWWWWmmmmWWWWWWWWmmmmWWWWmmmmWWlX...........',
    '..........XlWWWWWWppWWWWWWppWWWWWWWWWWppWWWWWWppWWWWlX..........',
    '.........XlWWWWcWWWWWWcWWWWWWWWWWWWWWWWWWcWWWWWWcWWWWlX.........',
    '........XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWlX........',
    '.......XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWlX.......',
    '......XlWWWWWWppWWWWWWppWWWWWWWWWWWWWWppWWWWWWppWWWWWWWWlX......',
    '.....XlWWWWmmmmWWWWmmmmWWWWWWWWWWWWWWmmmmWWWWmmmmWWWWWWWWlX.....',
    '....XlWWWWmsggsmWWmsggsmWWWWWWWWWWWWmsggsmWWmsggsmWWWWWWWWlX....',
    '...XlWWWWWWmmmmWWWWmmmmWWWWWWWWWWWWWWmmmmWWWWmmmmWWWWWWWWWWlX...',
    '..XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWlX..',
    '.XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWlX.',
    'XwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwX',
    'XWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWX',
    'XWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWX',
    'XweeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeX',
    'XwXeeee..................................................eeeeXwX',
    'XwXeeee..................................................eeeeXwX',
    'XwXeeee..................................................eeeeXwX',
    'XwXeeee..................................................eeeeXwX',
    'XwXeeee..................................................eeeeXwX',
    'XwXeeee..................................................eeeeXwX',
    'XwXeeee..................................................eeeeXwX',
    'XwXeeee..................................................eeeeXwX',
    'XwXeeee..................................................eeeeXwX',
    'XwXeeee..................................................eeeeXwX',
    '..XXXXX..................................................XXXXX..',
    '.SSSSSSS................................................SSSSSSS.',
    'SSSSSSSSS..............................................SSSSSSSSS',
    '.SSSSSSS................................................SSSSSSS.',
    '................................................................',
    '................................................................',
  ],
}

/**
 * 8. Josiah's Executive L-Shaped Triple-Monitor Rig (56x38)
 */
export const SPRITE_JOSIAH_RIG: PixelSpriteDef = {
  id: 'prop_josiah_triple_monitor_rig',
  name: "Josiah's Executive L-Rig",
  width: 56,
  height: 38,
  palette: {
    ...COMMON_PALETTE,
    w: '#451a03', // Walnut wood shadow
    W: '#78350f', // Walnut wood mid
    l: '#b45309', // Walnut wood highlight
    m: '#0f172a', // Monitor bezel
    s: '#38bdf8', // Center monitor cyan
    g: '#22c55e', // Left monitor green
    p: '#ec4899', // Right monitor magenta
    k: '#334155', // Keyboard slate
    c: '#f59e0b', // Gold Founder Mug
  },
  grid: [
    '............XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..........',
    '...........XllllllllllllllllllllllllllllllllllX.........',
    '..........XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWlX........',
    '.........XlWWWWmmWWWWWWmmmmWWWWWWmmWWWWWWWWWWWWlX.......',
    '........XlWWWWmggmWWWWmsggsmWWWWmppmWWWWWWWWWWWWlX......',
    '.......XlWWWWWWmmWWWWWWmmmmWWWWWWmmWWWWWWWWWWWWWWlX.....',
    '......XlWWWWWWWWWWWWWWkkkkkkWWWWWWWWWWWWWWWWWWWWWWlX....',
    '.....XlWWWWWWWWcWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWlX...',
    '....XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWlX..',
    '...XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWlX.',
    '..XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWlX',
    '..XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwX',
    '..XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwX',
    '..XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwX',
    '..XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwX',
    '..XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwX',
    '..XlWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWwX',
    '..XwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwX',
    '..XWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWX',
    '..XWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWX',
    '..XwXXwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwXXwX',
    '..XwXX..............................................XXwX',
    '..XwXX..............................................XXwX',
    '..XwXX..............................................XXwX',
    '..XwXX..............................................XXwX',
    '..XwXX..............................................XXwX',
    '..XwXX..............................................XXwX',
    '..XwXX..............................................XXwX',
    '..XwXX..............................................XXwX',
    '..XwXX..............................................XXwX',
    '..XXXX..............................................XXXX',
    '..SSSS..............................................SSSS',
    '.SSSSSS............................................SSSSS',
    '..SSSS..............................................SSSS',
    '........................................................',
    '........................................................',
    '........................................................',
    '........................................................',
  ],
}

/**
 * 9. The Brain Holographic Core (64x64)
 */
export const SPRITE_THE_BRAIN_CORE: PixelSpriteDef = {
  id: 'prop_the_brain_core',
  name: 'The Brain Holographic Core',
  width: 64,
  height: 64,
  palette: {
    ...COMMON_PALETTE,
    c: '#0891b2', // Core deep cyan
    C: '#06b6d4', // Core mid cyan
    b: '#38bdf8', // Core bright cyan
    h: '#67e8f9', // Core glow highlight
    w: '#ffffff', // Pure white spark
    r: '#f59e0b', // Outer ring amber
    R: '#fbbf24', // Outer ring bright amber
    p: '#0f172a', // Platform dark base
    P: '#1e293b', // Platform slate
    l: '#334155', // Platform edge light
  },
  grid: [
    '................................................................',
    '..........................wwwwwwww..............................',
    '......................wwwwwhhhhhhhwwww..........................',
    '...................wwwhhhbbbbbbbbbhhhwww........................',
    '.................wwhhbbbbbbbbbbbbbbbbhhww.......................',
    '................whhbbbbbbCCCCCCCCCCbbbbhhw......................',
    '...............whbbbbbCCCCCCCCCCCCCCCbbbbhw.....................',
    '..............whbbbbCCCCCCCCCCCCCCCCCCCbbbhw....................',
    '.............whbbbCCCCCCCCCCccccCCCCCCCCbbbhw...................',
    '............whbbbCCCCCCCCccccccccCCCCCCCCbbbhw..................',
    '............whbbCCCCCCCCccccccccccccCCCCCCbbhw..................',
    '...........whbbCCCCCCCCccccccccccccccCCCCCCbbhw.................',
    '...........whbCCCCCCCCccccccccccccccccCCCCCCbhw.................',
    '...........whbCCCCCCCccccccccccccccccccCCCCCbhw.................',
    '...........whbCCCCCCCccccccccccccccccccCCCCCbhw.................',
    '...........whbCCCCCCCCccccccccccccccccCCCCCCbhw.................',
    '...........whbbCCCCCCCCccccccccccccccCCCCCCbbhw.................',
    '............whbbCCCCCCCCccccccccccccCCCCCCbbhw..................',
    '............whbbbCCCCCCCCccccccccCCCCCCCCbbbhw..................',
    '.............whbbbCCCCCCCCCCccccCCCCCCCCbbbhw...................',
    '..............whbbbbCCCCCCCCCCCCCCCCCCCbbbhw....................',
    '...............whbbbbbCCCCCCCCCCCCCCCbbbbhw.....................',
    '................whhbbbbbbCCCCCCCCCCbbbbhhw......................',
    '.................wwhhbbbbbbbbbbbbbbbbhhww.......................',
    '...................wwwhhhbbbbbbbbbhhhwww........................',
    '......................wwwwwhhhhhhhwwww..........................',
    '..........................wwwwwwww..............................',
    '................................................................',
    '..............RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR................',
    '............RRrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrRR..............',
    '..........RRrr..................................rrRR............',
    '........RRrr......................................rrRR..........',
    '.......Rrr..........................................rrR.........',
    '......Rrr............................................rrR........',
    '.....Rrr..............................................rrR.......',
    '.....Rrr..............................................rrR.......',
    '.....Rrr..............................................rrR.......',
    '......Rrr............................................rrR........',
    '.......Rrr..........................................rrR.........',
    '........RRrr......................................rrRR..........',
    '..........RRrr..................................rrRR............',
    '............RRrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrRR..............',
    '..............RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR................',
    '................................................................',
    '........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX........',
    '.......XllllllllllllllllllllllllllllllllllllllllllllllllX.......',
    '......XlPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPwX......',
    '.....XlPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPwX.....',
    '....XlPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPwX....',
    '...XlPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPwX...',
    '..XlPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPwX..',
    '.XlPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPwX.',
    'XwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwX',
    'XppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppX',
    'XppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppX',
    'XppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppX',
    '.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.',
    '..SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS..',
    '...SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS...',
    '....SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS....',
    '.....SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS.....',
    '................................................................',
    '................................................................',
    '................................................................',
  ],
}

/**
 * All Phase 1 Sprite Definitions for quick registry
 */
export const V3_PIXEL_SPRITES: PixelSpriteDef[] = [
  SPRITE_PLANT_MONSTERA,
  SPRITE_ARCADE_CABINET,
  SPRITE_POOL_TABLE,
  SPRITE_WATER_COOLER,
  SPRITE_WALL_CLOCK,
  SPRITE_CITY_WINDOW,
  SPRITE_LONG_TABLE,
  SPRITE_JOSIAH_RIG,
  SPRITE_THE_BRAIN_CORE,
]

export { ALL_V3_SPRITES, type SpriteCategory } from './spriteCatalog'
