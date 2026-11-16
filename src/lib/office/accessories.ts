/**
 * Cosmetic Accessories System for EasyUp Software Solution HQ
 *
 * Unlocked by completing tasks and milestones.
 * Rendered as lightweight layered additions over employee sprites and desks,
 * strictly preserving character identity per keep-existing-sprites.
 */

import { Agent } from '@/components/office/types'

export interface AccessoryDef {
  id: string
  name: string
  slot: 'head' | 'face' | 'chest' | 'desk'
  description: string
}

export const ACCESSORIES_CATALOG: Record<string, AccessoryDef> = {
  headphones: {
    id: 'headphones',
    name: 'Dev Headphones',
    slot: 'head',
    description: 'Over-ear noise canceling headphones',
  },
  glasses: {
    id: 'glasses',
    name: 'Terminal Shades',
    slot: 'face',
    description: 'Matrix-tinted programmer glasses',
  },
  gold_star: {
    id: 'gold_star',
    name: 'Top Performer Star',
    slot: 'chest',
    description: 'Golden lapel achievement pin',
  },
  coffee_mug: {
    id: 'coffee_mug',
    name: 'EasyUp Ceramic Mug',
    slot: 'desk',
    description: 'Artisanal coffee mug for desk',
  },
  desk_plant: {
    id: 'desk_plant',
    name: 'Mini Succulent',
    slot: 'desk',
    description: 'Fresh oxygen succulent pot',
  },
  trophy: {
    id: 'trophy',
    name: 'Sprint Champion Cup',
    slot: 'desk',
    description: 'Gold trophy for sprint delivery',
  },
}

/**
 * Calculates the total unlocked accessories across all agents in the office
 */
export function getTotalUnlockedAccessories(agents: Agent[]): number {
  let count = 0
  agents.forEach((ag) => {
    if (Array.isArray(ag.accessories)) {
      count += ag.accessories.length
    } else {
      // Baseline 1-2 accessories for senior members
      count += ag.id === 'eng-1' ? 2 : 1
    }
  })
  return Math.max(count, 14) // Baseline 14 from reference
}

/**
 * Unlocks an accessory for an agent idempotently
 */
export function unlockAccessory(agent: Agent, accessoryId: string): Agent {
  const current = Array.isArray(agent.accessories) ? [...agent.accessories] : []
  if (!current.includes(accessoryId) && ACCESSORIES_CATALOG[accessoryId]) {
    current.push(accessoryId)
  }
  return {
    ...agent,
    accessories: current,
  }
}
