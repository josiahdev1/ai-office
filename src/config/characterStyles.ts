/**
 * Distinct Pixel-Agents Inspired Character Roster & Gender/Style Mapping
 * EasyUp Software Solution HQ (Iloilo City)
 *
 * Differentiates every agent by gender, hairstyle, outfit palette, and accessory
 * across both the 3D (ProceduralAgent3D.tsx) and 2D (OfficeCanvas2D.tsx) engines.
 */

import { DepartmentMode } from './officeLayout'

export type CharacterGender = 'male' | 'female'
export type HairStyle = 'short' | 'spiky' | 'parted' | 'ponytail' | 'long' | 'bob'
export type CharacterAccessory = 'cap' | 'glasses' | 'headphones' | 'beanie' | 'none'

export interface CharacterStyleConfig {
  agentId: string
  gender: CharacterGender
  spriteKey: string
  hairStyle: HairStyle
  hairColor: string
  outfitColor: string
  sleeveColor: string
  bottomColor: string
  skinColor: string
  accessory: CharacterAccessory
  accessoryColor: string
  isSkirt?: boolean
}

export const CHARACTER_STYLES: Record<string, CharacterStyleConfig> = {
  // ============================================================================
  // 1. ENGINEERING CORE
  // ============================================================================
  josiah: {
    agentId: 'josiah',
    gender: 'male',
    spriteKey: 'founder_male_cap',
    hairStyle: 'short',
    hairColor: '#0f172a',
    outfitColor: '#2563eb', // Signature EasyUp Royal Blue
    sleeveColor: '#1d4ed8',
    bottomColor: '#0f172a',
    skinColor: '#fed7aa',
    accessory: 'cap',
    accessoryColor: '#1d4ed8',
  },
  arwin: {
    agentId: 'arwin',
    gender: 'male',
    spriteKey: 'lead_backend_glasses',
    hairStyle: 'parted',
    hairColor: '#1e293b',
    outfitColor: '#0284c7', // Sky-600
    sleeveColor: '#0369a1',
    bottomColor: '#1e293b',
    skinColor: '#fed7aa',
    accessory: 'glasses',
    accessoryColor: '#38bdf8',
  },
  neil_mar: {
    agentId: 'neil_mar',
    gender: 'male',
    spriteKey: 'ui_architect_headphones',
    hairStyle: 'spiky',
    hairColor: '#27272a',
    outfitColor: '#6366f1', // Indigo-500
    sleeveColor: '#4f46e5',
    bottomColor: '#18181b',
    skinColor: '#fde68a',
    accessory: 'headphones',
    accessoryColor: '#00e5ff',
  },
  nelmar: {
    agentId: 'nelmar',
    gender: 'male',
    spriteKey: 'systems_eng_hoodie',
    hairStyle: 'short',
    hairColor: '#451a03',
    outfitColor: '#0d9488', // Teal-600
    sleeveColor: '#0f766e',
    bottomColor: '#1e293b',
    skinColor: '#fdba74',
    accessory: 'cap',
    accessoryColor: '#0f766e',
  },
  christian: {
    agentId: 'christian',
    gender: 'male',
    spriteKey: 'fullstack_dev_headphones',
    hairStyle: 'spiky',
    hairColor: '#090d16',
    outfitColor: '#3b82f6', // Blue-500
    sleeveColor: '#2563eb',
    bottomColor: '#0f172a',
    skinColor: '#fed7aa',
    accessory: 'headphones',
    accessoryColor: '#38bdf8',
  },
  bonnie: {
    agentId: 'bonnie',
    gender: 'female',
    spriteKey: 'devops_female_ponytail',
    hairStyle: 'ponytail',
    hairColor: '#7c2d12', // Chestnut auburn ponytail
    outfitColor: '#ec4899', // Rose Pink top
    sleeveColor: '#db2777',
    bottomColor: '#1e1b4b',
    skinColor: '#fed7aa',
    accessory: 'glasses',
    accessoryColor: '#f472b6',
    isSkirt: false,
  },
  john_lloyd: {
    agentId: 'john_lloyd',
    gender: 'male',
    spriteKey: 'dba_male_beanie',
    hairStyle: 'short',
    hairColor: '#1e293b',
    outfitColor: '#4f46e5', // Indigo-600
    sleeveColor: '#4338ca',
    bottomColor: '#0f172a',
    skinColor: '#fdba74',
    accessory: 'beanie',
    accessoryColor: '#312e81',
  },

  // ============================================================================
  // 2. OPERATIONS HUB
  // ============================================================================
  mary_grace: {
    agentId: 'mary_grace',
    gender: 'female',
    spriteKey: 'ops_head_female_long',
    hairStyle: 'long',
    hairColor: '#2e1065', // Deep espresso/plum long hair
    outfitColor: '#10b981', // Emerald-500 tailored blouse
    sleeveColor: '#059669',
    bottomColor: '#064e3b',
    skinColor: '#fed7aa',
    accessory: 'none',
    accessoryColor: '#10b981',
    isSkirt: true,
  },
  anthony: {
    agentId: 'anthony',
    gender: 'male',
    spriteKey: 'logistics_male_cap',
    hairStyle: 'parted',
    hairColor: '#451a03',
    outfitColor: '#16a34a', // Green-600
    sleeveColor: '#15803d',
    bottomColor: '#1e293b',
    skinColor: '#fde68a',
    accessory: 'cap',
    accessoryColor: '#15803d',
  },
  blaze: {
    agentId: 'blaze',
    gender: 'male',
    spriteKey: 'incident_male_spiky',
    hairStyle: 'spiky',
    hairColor: '#991b1b', // Crimson-tinted spiky hair
    outfitColor: '#ea580c', // Orange-600 jacket
    sleeveColor: '#c2410c',
    bottomColor: '#18181b',
    skinColor: '#fed7aa',
    accessory: 'headphones',
    accessoryColor: '#f97316',
  },
  ferwin: {
    agentId: 'ferwin',
    gender: 'male',
    spriteKey: 'automation_male_glasses',
    hairStyle: 'parted',
    hairColor: '#1e293b',
    outfitColor: '#059669', // Emerald-600
    sleeveColor: '#047857',
    bottomColor: '#0f172a',
    skinColor: '#fdba74',
    accessory: 'glasses',
    accessoryColor: '#34d399',
  },

  // ============================================================================
  // 3. GROWTH LAB
  // ============================================================================
  jo_vincent: {
    agentId: 'jo_vincent',
    gender: 'male',
    spriteKey: 'growth_lead_blazer',
    hairStyle: 'parted',
    hairColor: '#1e293b',
    outfitColor: '#0ea5e9', // Sky-500 blazer
    sleeveColor: '#0284c7',
    bottomColor: '#0f172a',
    skinColor: '#fed7aa',
    accessory: 'glasses',
    accessoryColor: '#e0f2fe',
  },
  jesmond: {
    agentId: 'jesmond',
    gender: 'male',
    spriteKey: 'seo_lead_beanie',
    hairStyle: 'short',
    hairColor: '#3f3f46',
    outfitColor: '#8b5cf6', // Violet-500
    sleeveColor: '#7c3aed',
    bottomColor: '#1e1b4b',
    skinColor: '#fde68a',
    accessory: 'beanie',
    accessoryColor: '#6d28d9',
  },
  kin: {
    agentId: 'kin',
    gender: 'female',
    spriteKey: 'growth_female_bob',
    hairStyle: 'bob',
    hairColor: '#451a03',
    outfitColor: '#f43f5e', // Rose-500 stylish top
    sleeveColor: '#e11d48',
    bottomColor: '#1e293b',
    skinColor: '#fed7aa',
    accessory: 'none',
    accessoryColor: '#fb7185',
    isSkirt: true,
  },

  // ============================================================================
  // 4. EXECUTIVE LOUNGE & COMMAND
  // ============================================================================
  julian: {
    agentId: 'julian',
    gender: 'male',
    spriteKey: 'finance_director_suit',
    hairStyle: 'parted',
    hairColor: '#334155',
    outfitColor: '#7c3aed', // Royal Violet executive blazer
    sleeveColor: '#6d28d9',
    bottomColor: '#0f172a',
    skinColor: '#fed7aa',
    accessory: 'glasses',
    accessoryColor: '#fbbf24',
  },
  gloria: {
    agentId: 'gloria',
    gender: 'female',
    spriteKey: 'exec_ops_female_ponytail',
    hairStyle: 'ponytail',
    hairColor: '#1e1b4b',
    outfitColor: '#a855f7', // Purple-500 executive dress top
    sleeveColor: '#9333ea',
    bottomColor: '#2e1065',
    skinColor: '#fed7aa',
    accessory: 'none',
    accessoryColor: '#e879f9',
    isSkirt: true,
  },
  jb: {
    agentId: 'jb',
    gender: 'male',
    spriteKey: 'tpm_male_cap',
    hairStyle: 'short',
    hairColor: '#18181b',
    outfitColor: '#f59e0b', // Amber-500
    sleeveColor: '#d97706',
    bottomColor: '#1e293b',
    skinColor: '#fdba74',
    accessory: 'cap',
    accessoryColor: '#b45309',
  },

  // ============================================================================
  // 5. QA & SECOPS NOC
  // ============================================================================
  khent: {
    agentId: 'khent',
    gender: 'male',
    spriteKey: 'secops_lead_hoodie',
    hairStyle: 'spiky',
    hairColor: '#090d16',
    outfitColor: '#d946ef', // Fuchsia-500 cybernetic hoodie
    sleeveColor: '#c026d3',
    bottomColor: '#090d16',
    skinColor: '#fed7aa',
    accessory: 'headphones',
    accessoryColor: '#f0abfc',
  },
  gian: {
    agentId: 'gian',
    gender: 'male',
    spriteKey: 'qa_auto_glasses',
    hairStyle: 'parted',
    hairColor: '#451a03',
    outfitColor: '#ec4899', // Pink-500
    sleeveColor: '#db2777',
    bottomColor: '#1e293b',
    skinColor: '#fde68a',
    accessory: 'glasses',
    accessoryColor: '#f472b6',
  },
  john_arvy: {
    agentId: 'john_arvy',
    gender: 'male',
    spriteKey: 'pentest_male_beanie',
    hairStyle: 'short',
    hairColor: '#0f172a',
    outfitColor: '#be185d', // Pink-700
    sleeveColor: '#9d174d',
    bottomColor: '#090d16',
    skinColor: '#fdba74',
    accessory: 'beanie',
    accessoryColor: '#831843',
  },

  // ============================================================================
  // 6. INTELLIGENCE & RESEARCH LAB
  // ============================================================================
  roy_jhan: {
    agentId: 'roy_jhan',
    gender: 'male',
    spriteKey: 'chief_ai_glasses',
    hairStyle: 'parted',
    hairColor: '#1e293b',
    outfitColor: '#14b8a6', // Teal-500 lab coat / top
    sleeveColor: '#0d9488',
    bottomColor: '#0f172a',
    skinColor: '#fed7aa',
    accessory: 'glasses',
    accessoryColor: '#2dd4bf',
  },
  ryan: {
    agentId: 'ryan',
    gender: 'male',
    spriteKey: 'mlops_male_headphones',
    hairStyle: 'spiky',
    hairColor: '#451a03',
    outfitColor: '#06b6d4', // Cyan-500
    sleeveColor: '#0891b2',
    bottomColor: '#1e293b',
    skinColor: '#fde68a',
    accessory: 'headphones',
    accessoryColor: '#22d3ee',
  },
  keiru: {
    agentId: 'keiru',
    gender: 'female',
    spriteKey: 'vision_female_long',
    hairStyle: 'long',
    hairColor: '#3b0764',
    outfitColor: '#2dd4bf', // Teal-400
    sleeveColor: '#14b8a6',
    bottomColor: '#134e4a',
    skinColor: '#fed7aa',
    accessory: 'glasses',
    accessoryColor: '#99f6e4',
    isSkirt: true,
  },
  gabriel: {
    agentId: 'gabriel',
    gender: 'male',
    spriteKey: 'nlp_male_cap',
    hairStyle: 'short',
    hairColor: '#1e293b',
    outfitColor: '#38bdf8', // Sky-400
    sleeveColor: '#0284c7',
    bottomColor: '#0f172a',
    skinColor: '#fed7aa',
    accessory: 'cap',
    accessoryColor: '#0369a1',
  },

  // ============================================================================
  // 7. EXTENDED PIXEL-AGENTS ALIASES (Judith, Leila, Maya, Brad Pete, Sherlock)
  // ============================================================================
  judith: {
    agentId: 'judith',
    gender: 'female',
    spriteKey: 'fin_female_ponytail',
    hairStyle: 'ponytail',
    hairColor: '#7c2d12',
    outfitColor: '#f43f5e',
    sleeveColor: '#e11d48',
    bottomColor: '#1e1b4b',
    skinColor: '#fed7aa',
    accessory: 'glasses',
    accessoryColor: '#fda4af',
    isSkirt: true,
  },
  leila: {
    agentId: 'leila',
    gender: 'female',
    spriteKey: 'design_female_bob',
    hairStyle: 'bob',
    hairColor: '#581c87',
    outfitColor: '#c084fc',
    sleeveColor: '#a855f7',
    bottomColor: '#3b0764',
    skinColor: '#fde68a',
    accessory: 'headphones',
    accessoryColor: '#e879f9',
    isSkirt: true,
  },
  maya: {
    agentId: 'maya',
    gender: 'female',
    spriteKey: 'ai_female_long',
    hairStyle: 'long',
    hairColor: '#451a03',
    outfitColor: '#34d399',
    sleeveColor: '#10b981',
    bottomColor: '#064e3b',
    skinColor: '#fed7aa',
    accessory: 'none',
    accessoryColor: '#6ee7b7',
    isSkirt: true,
  },
  brad_pete: {
    agentId: 'brad_pete',
    gender: 'male',
    spriteKey: 'growth_male_glasses',
    hairStyle: 'parted',
    hairColor: '#ca8a04',
    outfitColor: '#3b82f6',
    sleeveColor: '#2563eb',
    bottomColor: '#1e293b',
    skinColor: '#fed7aa',
    accessory: 'glasses',
    accessoryColor: '#60a5fa',
  },
  sherlock: {
    agentId: 'sherlock',
    gender: 'male',
    spriteKey: 'qa_detective_cap',
    hairStyle: 'parted',
    hairColor: '#451a03',
    outfitColor: '#b45309',
    sleeveColor: '#92400e',
    bottomColor: '#1c1917',
    skinColor: '#fed7aa',
    accessory: 'cap',
    accessoryColor: '#78350f',
  },
}

const FALLBACK_PALETTES: Omit<CharacterStyleConfig, 'agentId'>[] = [
  {
    gender: 'male',
    spriteKey: 'dev_male_1',
    hairStyle: 'short',
    hairColor: '#1e293b',
    outfitColor: '#2563eb',
    sleeveColor: '#1d4ed8',
    bottomColor: '#0f172a',
    skinColor: '#fed7aa',
    accessory: 'cap',
    accessoryColor: '#1d4ed8',
  },
  {
    gender: 'female',
    spriteKey: 'dev_female_1',
    hairStyle: 'ponytail',
    hairColor: '#451a03',
    outfitColor: '#ec4899',
    sleeveColor: '#db2777',
    bottomColor: '#1e1b4b',
    skinColor: '#fed7aa',
    accessory: 'none',
    accessoryColor: '#f472b6',
    isSkirt: true,
  },
]

export function getCharacterStyle(agentId: string, agentName?: string): CharacterStyleConfig {
  const normalizedId = (agentId || '').toLowerCase().replace(/\s+/g, '_')
  if (CHARACTER_STYLES[normalizedId]) {
    return CHARACTER_STYLES[normalizedId]
  }
  if (agentName) {
    const normalizedName = agentName.toLowerCase().replace(/\s+/g, '_')
    if (CHARACTER_STYLES[normalizedName]) {
      return CHARACTER_STYLES[normalizedName]
    }
  }
  let hash = 0
  for (let i = 0; i < normalizedId.length; i++) {
    hash = (hash * 31 + normalizedId.charCodeAt(i)) | 0
  }
  const fb = FALLBACK_PALETTES[Math.abs(hash) % FALLBACK_PALETTES.length]
  return { ...fb, agentId }
}

/**
 * Visual Status Dot Color & Label Mapping (Step 5 Specification):
 * - Green (#22c55e)  = Actively Working / Typing
 * - Orange (#f97316) = Needs Approval (Go-Signal Required)
 * - Blue (#3b82f6)   = Inter-agent Discussion / Standup
 * - Yellow (#eab308) = Coffee / Pantry Break
 * - Pink (#ec4899)   = Gym / Rec Break
 * - Gray (#94a3b8)   = Idle at Desk
 */
export function getAgentStatusBadge(
  status: string | undefined,
  effectiveMode: DepartmentMode
): { dotHex: string; dotTailwind: string; label: string } {
  const st = (status || '').toLowerCase()
  if (st === 'awaiting_approval') {
    return {
      dotHex: '#f97316',
      dotTailwind: 'bg-orange-500 animate-pulse',
      label: 'Needs Approval',
    }
  }
  if (effectiveMode === 'ALL_HANDS' || st === 'in_meeting' || st === 'scrum') {
    return {
      dotHex: '#3b82f6',
      dotTailwind: 'bg-blue-500',
      label: 'In Standup / Scrum',
    }
  }
  if (effectiveMode === 'GYM' || st === 'gym' || st === 'rec') {
    return {
      dotHex: '#ec4899',
      dotTailwind: 'bg-pink-500',
      label: 'Gym / Rec Break',
    }
  }
  if (effectiveMode === 'PANTRY' || st === 'on_break' || st === 'pantry' || st === 'coffee') {
    return {
      dotHex: '#eab308',
      dotTailwind: 'bg-yellow-500',
      label: 'Coffee / Pantry Break',
    }
  }
  if (st === 'idle') {
    return {
      dotHex: '#94a3b8',
      dotTailwind: 'bg-slate-400',
      label: 'Idle at Desk',
    }
  }
  return {
    dotHex: '#22c55e',
    dotTailwind: 'bg-emerald-500',
    label: 'Actively Working',
  }
}
