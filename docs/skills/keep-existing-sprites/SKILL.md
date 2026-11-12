---
name: keep-existing-sprites
description: Preservation rules and extension guidelines for existing employee pixel sprites.
---

# Keep Existing Sprites Rule

## 1. Source of Truth
The employee visual identity is strictly anchored in `src/components/office/pixel-sprites.tsx`.
- **Character Design**: Chunky pixel-art human worker wearing a blue baseball cap, dark face silhouette, vivid blue shirt/hoodie, and dark work trousers/shoes.
- **Strict Prohibition**: NEVER replace this pixel sprite with 3D models, smooth vector illustrations, generic emoji blobs, or unapproved sprite sheets.

## 2. Permitted Sprite Extensions
The sprite rendering engine may only modify or augment the character through the following dimensions:
1. **Isometric Orientations & Walk Cycles**:
   - 4-direction facing: South-East (SE), South-West (SW), North-East (NE), North-West (NW).
   - 2-frame walking cycle (leg sway and subtle head bob).
   - Sitting and keyboard typing animation frames (hands resting or moving over keyboard).
2. **Dynamic Name Tags & HUD Badges**:
   - Dark pill badge floating 28px above the agent's head.
   - Status dot indicator:
     - 🟢 Green (`#22c55e`): Working / Active / Focused.
     - 🟡 Yellow (`#eab308`): In discussion / Meeting at The Brain.
     - 🔵 Cyan/Blue (`#38bdf8`): Moving / Traveling to target.
     - 🟣 Purple (`#a855f7`): On break / Pantry / Lounge.
     - 🔴 Red (`#ef4444`): Blocked / Alert / Approval requested.
   - Monospace font for agent role/name for clean readability.
3. **Interactive Speech Bubbles**:
   - Crisp high-contrast speech bubble rendered above the name tag during live dialogue or agent notifications.
   - Auto-fades after 4-6 seconds with soft bounce-in animation.
