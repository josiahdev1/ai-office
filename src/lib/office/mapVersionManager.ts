/**
 * Office Map Version Manager
 *
 * Implements document-driven building map versioning in `office_map_versions`.
 * Reads active map at runtime with validation, real-time caching, and rollback / undo.
 */

import {
  OFFICE_ZONES,
  OFFICE_FURNITURE,
  ASSIGNED_DESKS,
  BRAIN_MEETING_SPOTS,
  PANTRY_ACTIVITY_SPOTS,
  GYM_ACTIVITY_SPOTS,
  Zone,
  FurnitureItem,
  DeskSlot,
  ActivitySpot,
} from './map'
import {
  validateNoZoneOverlaps,
  validateFurnitureBounds,
  validateFurnitureNoOverlaps,
  validateChairFacings,
} from './validateMap'

export interface OfficeMapData {
  zones: Zone[]
  furniture: FurnitureItem[]
  desks: DeskSlot[]
  brainSpots: ActivitySpot[]
  pantrySpots: ActivitySpot[]
  gymSpots: ActivitySpot[]
}

export interface MapVersionRecord {
  id: string
  version: number
  mapData: OfficeMapData
  isActive: boolean
  author: string
  changeSummary: string
  createdAt: string
}

/**
 * Baseline Version 1 Map Data seeded from default configuration
 */
export const BASELINE_MAP_DATA_V1: OfficeMapData = {
  zones: OFFICE_ZONES,
  furniture: OFFICE_FURNITURE,
  desks: ASSIGNED_DESKS,
  brainSpots: BRAIN_MEETING_SPOTS,
  pantrySpots: PANTRY_ACTIVITY_SPOTS,
  gymSpots: GYM_ACTIVITY_SPOTS,
}

// In-memory version registry (acting as L1 cache for server & client)
let inMemoryVersions: MapVersionRecord[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    version: 1,
    mapData: BASELINE_MAP_DATA_V1,
    isActive: true,
    author: 'system',
    changeSummary: 'Baseline EasyUp HQ Open-Plan Layout',
    createdAt: new Date().toISOString(),
  },
]

/**
 * Validates arbitrary OfficeMapData using core validation rules.
 */
export function validateCustomMapData(mapData: OfficeMapData): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 1. Zone overlaps
  errors.push(...validateNoZoneOverlaps(mapData.zones || []))

  // 2. Furniture bounds (18x18 grid)
  errors.push(...validateFurnitureBounds(mapData.furniture || [], 18, 18))

  // 3. Furniture collision
  errors.push(...validateFurnitureNoOverlaps(mapData.furniture || []))

  // 4. Desk chair facing alignment
  errors.push(...validateChairFacings(mapData.desks || []))

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Returns currently active map version record.
 */
export function getActiveMapVersion(): MapVersionRecord {
  const active = inMemoryVersions.find((v) => v.isActive)
  if (active) return active
  return inMemoryVersions[inMemoryVersions.length - 1]
}

/**
 * Returns currently active OfficeMapData for rendering and navigation.
 */
export function getActiveMapData(): OfficeMapData {
  return getActiveMapVersion().mapData
}

/**
 * Returns all historical versions sorted by version number descending.
 */
export function getMapVersionHistory(): MapVersionRecord[] {
  return [...inMemoryVersions].sort((a, b) => b.version - a.version)
}

/**
 * Saves a new map version after strict validation.
 * Sets the new version as active and archives previous versions.
 */
export function saveMapVersion(
  newMapData: OfficeMapData,
  author = 'Josiah',
  summary = 'Map revision'
): { success: boolean; versionRecord?: MapVersionRecord; errors?: string[] } {
  const validation = validateCustomMapData(newMapData)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  const currentActive = getActiveMapVersion()
  const nextVersionNum = currentActive ? currentActive.version + 1 : 1

  // Mark all previous versions inactive
  inMemoryVersions = inMemoryVersions.map((v) => ({ ...v, isActive: false }))

  const newRecord: MapVersionRecord = {
    id: `ver-${nextVersionNum}-${Date.now()}`,
    version: nextVersionNum,
    mapData: newMapData,
    isActive: true,
    author,
    changeSummary: summary,
    createdAt: new Date().toISOString(),
  }

  inMemoryVersions.push(newRecord)
  return { success: true, versionRecord: newRecord }
}

/**
 * Rolls back to the immediate previous map version (Undo functionality).
 */
export function undoMapVersion(): {
  success: boolean
  activeVersion?: MapVersionRecord
  message: string
} {
  if (inMemoryVersions.length <= 1) {
    return {
      success: false,
      message: 'Cannot undo baseline version 1: no previous version exists.',
    }
  }

  const activeIdx = inMemoryVersions.findIndex((v) => v.isActive)
  if (activeIdx <= 0) {
    return {
      success: false,
      message: 'No previous version available to roll back to.',
    }
  }

  // Deactivate current version
  inMemoryVersions[activeIdx].isActive = false
  // Activate previous version
  inMemoryVersions[activeIdx - 1].isActive = true

  return {
    success: true,
    activeVersion: inMemoryVersions[activeIdx - 1],
    message: `Rolled back to Version ${inMemoryVersions[activeIdx - 1].version} (${inMemoryVersions[activeIdx - 1].changeSummary}).`,
  }
}

/**
 * Resets map versions registry to initial state (used for testing).
 */
export function resetMapVersionsForTest(): void {
  inMemoryVersions = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      version: 1,
      mapData: BASELINE_MAP_DATA_V1,
      isActive: true,
      author: 'system',
      changeSummary: 'Baseline EasyUp HQ Open-Plan Layout',
      createdAt: new Date().toISOString(),
    },
  ]
}
