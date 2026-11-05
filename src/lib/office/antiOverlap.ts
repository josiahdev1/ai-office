/**
 * Anti-Overlap Screen-Space Solver for Agent Name Tags (Office V3 Phase 5 & Quick Fix)
 * 
 * Guarantees zero or strictly minimized overlap across dense agent clusters
 * by computing dynamic 2D collision offsets based on screen-space bounding boxes.
 */

export interface AgentTagInput {
  id: string
  name: string
  x: number // Screen-space x coordinate
  y: number // Screen-space y coordinate
  priority?: number // Higher priority tags get preferred standard position
}

export interface ResolvedTagOffset {
  offsetX: number
  offsetY: number
  isCollapsed: boolean
  box: { left: number; top: number; right: number; bottom: number }
}

export interface AntiOverlapConfig {
  zoom?: number
  collapseZoomThreshold?: number
  padding?: number
}

const CANDIDATE_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: -22 },
  { dx: 0, dy: -38 },
  { dx: 0, dy: -10 },
  { dx: -18, dy: -22 },
  { dx: 18, dy: -22 },
  { dx: 0, dy: -52 },
  { dx: -24, dy: -38 },
  { dx: 24, dy: -38 },
  { dx: -18, dy: -10 },
  { dx: 18, dy: -10 },
  { dx: 0, dy: -66 },
  { dx: -36, dy: -22 },
  { dx: 36, dy: -22 },
  { dx: 0, dy: 6 },
  { dx: -30, dy: -52 },
  { dx: 30, dy: -52 },
]

function getBoundingBox(
  x: number,
  y: number,
  dx: number,
  dy: number,
  width: number,
  height: number,
  padding: number = 2
) {
  const cx = x + dx
  const cy = y + dy
  const halfW = width / 2 + padding
  const halfH = height / 2 + padding
  return {
    left: cx - halfW,
    right: cx + halfW,
    top: cy - halfH,
    bottom: cy + halfH,
  }
}

function boxesOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  )
}

function calculateOverlapArea(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
): number {
  const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  return overlapX * overlapY
}

/**
 * Solves 2D non-overlapping screen positions for agent name tags
 */
export function resolveNameTagPositions(
  tags: AgentTagInput[],
  config: AntiOverlapConfig = {}
): Map<string, ResolvedTagOffset> {
  const { zoom = 1, collapseZoomThreshold = 0.45, padding = 3 } = config
  const isCollapsed = zoom < collapseZoomThreshold
  const resolved = new Map<string, ResolvedTagOffset>()

  // Sort by priority descending, then by Y ascending (back-to-front rendering)
  const sorted = [...tags].sort((a, b) => {
    const prioA = a.priority ?? 0
    const prioB = b.priority ?? 0
    if (prioB !== prioA) return prioB - prioA
    return a.y - b.y
  })

  const placedBoxes: Array<{
    left: number
    top: number
    right: number
    bottom: number
  }> = []

  for (const tag of sorted) {
    const width = isCollapsed ? 12 : Math.max(48, 16 + tag.name.length * 6.8)
    const height = isCollapsed ? 12 : 18

    let bestCandidate = CANDIDATE_OFFSETS[0]
    let bestBox = getBoundingBox(
      tag.x,
      tag.y,
      bestCandidate.dx,
      bestCandidate.dy,
      width,
      height,
      padding
    )
    let minOverlapArea = Infinity

    for (const cand of CANDIDATE_OFFSETS) {
      const box = getBoundingBox(
        tag.x,
        tag.y,
        cand.dx,
        cand.dy,
        width,
        height,
        padding
      )
      let totalOverlap = 0
      let hasOverlap = false

      for (const placed of placedBoxes) {
        if (boxesOverlap(box, placed)) {
          hasOverlap = true
          totalOverlap += calculateOverlapArea(box, placed)
        }
      }

      if (!hasOverlap) {
        bestCandidate = cand
        bestBox = box
        minOverlapArea = 0
        break
      }

      if (totalOverlap < minOverlapArea) {
        minOverlapArea = totalOverlap
        bestCandidate = cand
        bestBox = box
      }
    }

    placedBoxes.push(bestBox)
    resolved.set(tag.id, {
      offsetX: bestCandidate.dx,
      offsetY: bestCandidate.dy,
      isCollapsed,
      box: bestBox,
    })
  }

  return resolved
}
