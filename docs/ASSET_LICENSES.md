# EasyUp Software Solution HQ — Asset Licenses & Attributions

This document logs all assets, tilesets, icons, and audio resources used in EasyUp Software Solution HQ (Office V3), ensuring complete compliance with software licenses and public redistribution terms.

---

## 1. Procedural Pixel Engine (Primary Asset Pipeline)

- **Author**: EasyUp Software Solution Engineering Team / In-Code Procedural Engine
- **License**: MIT (Internal Codebase)
- **Scope**:
  - Palette-indexed pixel grid generators (`src/lib/office/pixelGridEngine.ts`).
  - Isometric cutaway wall tiles, beveled headers, baseboards, and door cutaways.
  - Floor materials: wood parquet, blue tile, green linoleum, magenta circuit tile, purple carpet, warm cream ceramic tile, pink game tile, indigo dev floor, and checkered corridors.
  - Workstations: Wall desks, island desks, long coworking table, Josiah's L-shaped triple-monitor rig, ergonomic swivel chairs.
  - Office decor: City view windows, wall clocks, whiteboards, corkboards, framed certificates, bookshelves, water coolers, vending machines, pool table, arcade cabinets, potted monstera/ficus plants.
  - Employee sprites: 4-directional facing, seated typing animation, hands on keyboard, and action poses (`src/components/office/pixel-sprites.tsx`).
  - Procedural vehicles: 6 vehicle styles with headlights, brake lights, blinkers (`src/components/office/VehicleSprite.tsx`).
- **Redistribution**: Fully permitted without royalty or attribution restrictions.

---

## 2. Audio Effects (Web Audio API Synthesizer)

- **Engine**: Procedural Web Audio API Sound Synthesizer (`src/components/office/audio.ts`)
- **Author**: EasyUp Software Solution Engineering
- **License**: MIT
- **Redistribution**: Pure client-side synthetic oscillators (zero external audio binary dependencies).

---

## 3. External Tilesets / CC0 Packs Policy

- **Policy**: Per user instructions, paid or non-redistributable tilesets (such as Donarg's Office Interior Tileset) are **strictly excluded** from git tracking and public builds to ensure 100% license cleanliness.
- Any imported CC0 tilesets from public repositories (e.g. OpenGameArt / Itch.io CC0) must have their exact source and license registered here prior to inclusion. Currently, 100% of the asset pipeline is procedurally generated in TypeScript/SVG/Canvas.
