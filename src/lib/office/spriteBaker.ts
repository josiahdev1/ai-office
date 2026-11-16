export interface BakedSpriteKeyInput {
  agentId: string
  appearanceHash: string
  pose: string
  facing: number
  frame: number
}

export interface BakedSpriteEntry {
  key: string
  width: number
  height: number
  createdAt: number
}

const spriteCache = new Map<string, BakedSpriteEntry>()

export function buildSpriteCacheKey(input: BakedSpriteKeyInput): string {
  const quantFacing = Math.round(((input.facing % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * 100)
  return `${input.agentId}:${input.appearanceHash}:${input.pose}:f${quantFacing}:fr${input.frame}`
}

/**
 * Lazy in-memory sprite atlas cache keyed by appearanceHash + pose + facing + frame.
 * Used by OfficeCanvas2D for 2D/3D visual parity without duplicate hand-drawn art.
 */
export function getOrBakeSprite(input: BakedSpriteKeyInput): BakedSpriteEntry {
  const key = buildSpriteCacheKey(input)
  const existing = spriteCache.get(key)
  if (existing) return existing

  const entry: BakedSpriteEntry = {
    key,
    width: 64,
    height: 96,
    createdAt: Date.now(),
  }
  spriteCache.set(key, entry)
  return entry
}

export function clearSpriteBakerCache(): void {
  spriteCache.clear()
}

export function getSpriteBakerCacheSize(): number {
  return spriteCache.size
}
