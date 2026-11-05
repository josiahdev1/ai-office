---
name: tilemap-walkability
description: Walkability, collision grid, pathfinding, and map validation system.
---

# Tilemap Walkability & Pathfinding System

## 1. Unified Floor Grid
- Grid Dimensions: 28x28 tiles (or 30x30) in a single contiguous floor slab.
- Tile Coordinate System:
  - Screen X: `(gridX - gridY) * (tileWidth / 2)`
  - Screen Y: `(gridX + gridY) * (tileHeight / 2)`
  - Standard tile metrics: `tileWidth = 64`, `tileHeight = 32`.

## 2. A* Pathfinding Rules
1. **Never Teleport**:
   - Whenever an office mode is activated (`ALL HANDS`, `FOCUS WORK`, `PANTRY`), agents must calculate an A* path from their current grid position to their target position.
   - Smooth interpolation along waypoints with walking animation frames.
2. **Clear Aisles**:
   - Main corridors and walkways must remain at least 2 tiles wide.
   - Furniture and non-walkable fixtures (desks, monitors, server racks, walls) must mark their grid cells as blocked.
   - Walkability check: `walkable(x, y) = inBounds(x, y) && !isSolid(x, y)`.

## 3. Dedicated Activity Spots
- **The Brain Meeting Table**:
  - Must have at least 30 valid perimeter walking/seating target spots around the central round table.
  - When `ALL HANDS` is triggered, every agent receives a unique reservation index so they do not stack on top of each other.
- **Pantry & Break Zone**:
  - Must have at least 30 activity spots (coffee counter queue, bar stools, lounge chairs, vending machine stands).
  - When `PANTRY & BREAK` is clicked, agents walk to their assigned break spot.
- **Assigned Desks**:
  - Each of the 23 agents has a dedicated desk chair coordinate.
  - When `FOCUS WORK` is triggered, agents navigate back to their assigned desk chair.

## 4. Map Validation (`validateMap.ts`)
The map must pass strict automated validation in Vitest:
1. No overlapping zones.
2. All furniture within grid boundaries.
3. No furniture overlapping another furniture item.
4. All desks and activity spots have at least one adjacent walkable cell.
5. All aisles are at least 2 tiles wide.
6. A* path must exist between any two departmental desks.
