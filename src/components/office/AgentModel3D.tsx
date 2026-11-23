'use client'

import { VoxelAgentMesh } from '@/components/office/three/VoxelAgentMesh'
import { seededPrng } from '@/lib/office/pickleballSimulation'

export interface AgentAppearance {
  hairStyle: 'short' | 'bald' | 'curly' | 'long' | 'ponytail' | 'white_gray'
  hairColor: string
  outfitColor: string
  accessory: 'none' | 'glasses' | 'headset' | 'cap' | 'lanyard'
}

const HAIR_VARIANTS: AgentAppearance['hairStyle'][] = [
  'short',
  'bald',
  'curly',
  'long',
  'ponytail',
  'white_gray',
]
const HAIR_COLORS = ['#111827', '#451a03', '#78350f', '#cbd5e1', '#1e293b']
const OUTFIT_COLORS = [
  '#f97316',
  '#eab308',
  '#ef4444',
  '#38bdf8',
  '#1e293b',
  '#14b8a6',
]
const ACCESSORIES: AgentAppearance['accessory'][] = [
  'none',
  'glasses',
  'headset',
  'cap',
  'lanyard',
]

/**
 * Generates a deterministic video-style appearance once from agentId using a seeded PRNG.
 */
export function generateAgentAppearance(agentId: string): AgentAppearance {
  let hash = 2166136261
  for (let i = 0; i < agentId.length; i++) {
    hash ^= agentId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const rng = seededPrng(hash >>> 0)
  return {
    hairStyle: HAIR_VARIANTS[Math.floor(rng() * HAIR_VARIANTS.length)],
    hairColor: HAIR_COLORS[Math.floor(rng() * HAIR_COLORS.length)],
    outfitColor: OUTFIT_COLORS[Math.floor(rng() * OUTFIT_COLORS.length)],
    accessory: ACCESSORIES[Math.floor(rng() * ACCESSORIES.length)],
  }
}

export { VoxelAgentMesh as AgentModel3D }
