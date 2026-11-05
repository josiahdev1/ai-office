---
name: iso-office-art
description: Isometric Open-Plan Office Art System for EasyUp Software Solution HQ.
---

# Isometric Open-Plan Office Art System

## 1. Aesthetic Direction
This skill governs the visual rendering and aesthetic guidelines for the EasyUp Software Solution HQ isometric office canvas, adhering to the clean open-plan design shown in `design-ref/ref-hq.png`.

- **Viewpoint**: True 2:1 isometric projection (`tileWidth = 64`, `tileHeight = 32`).
- **Floor Foundation**: A single contiguous floating isometric slab. Warm cream/beige floor tiles (`#e5dec9`, `#d8cfb8`, `#ede6d4`) with subtle grid grout lines (`#c8bfa6`).
- **Wall System**: Thick dark charcoal back walls (`#181c26`, `#222735`) with highlighted top edges (`#32394c`) displaying 3D depth and thickness. Front walls are cut away completely so every desk, aisle, and zone is clearly visible.
- **Backdrop**: Deep obsidian navy (`#06080f` to `#0a0d16`) providing high-contrast visual framing for the warm office slab.
- **Lighting & Ambiance**: Soft directional overhead lighting, ambient occlusions under desks and furniture, subtle monitor glow, pulsing ring under The Brain round table, and blinking server LEDs.

## 2. Zone & Furniture Design (Procedural in Code)
All environmental assets must be procedural Canvas/SVG primitives—never external pixel assets or rip-offs:
1. **The Brain Meeting Core (Center)**:
   - Large round dark wooden conference table with seating for up to 30 people.
   - Soft pulsing cyan/emerald holographic ring beneath the table.
   - Ambient floating holographic particles and pulsing core indicator.
2. **Workstation Rows**:
   - Clean rows of wooden desks with rounded edges, brushed metal frames, and dark swivel office chairs.
   - Dual-monitor rigs (and triple-monitor rig at Josiah's Lead Architect desk) with screen glows.
3. **Pantry & Coffee Bar (Corner)**:
   - Wooden L-shaped reception and coffee counter, espresso machine with steam wisps, water dispenser, snack vending machine, and refrigerator.
4. **Purple Lounge & Break Area**:
   - Plush modular purple/violet velvet sofas, low wooden coffee tables, potted fiddle-leaf figs and snake plants in terracotta pots.
5. **Server Rack & NOC**:
   - High-density server cabinets with animated blinking activity LEDs and fiber cabling.
6. **Fitness & Wellness Zone**:
   - Wooden floor inlay with treadmills, yoga mats, and dumbbells.

## 3. Offscreen Canvas Performance
- Static geometry (floor slab, walls, rugs, base furniture) must be rendered to an offscreen cache canvas when camera scale or dimensions change.
- The active rendering loop only draws the cached background, dynamic agents (depth-sorted by `gridX + gridY`), speech bubbles, particle effects, and dynamic LEDs at stable 60 FPS.
