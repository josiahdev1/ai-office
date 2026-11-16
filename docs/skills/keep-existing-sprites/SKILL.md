---
name: keep-existing-sprites
description: Preservation rules and extension guidelines for the video-style low-poly block agent characters (updated 2026-11-16 per TICKET-35).
---

# Keep Video-Style Block Character Design (TICKET-35 Revision)

> Updated on **2026-11-16** per Josiah's character revision request in `TICKET-35`.

## Core Rules
1. **Preserve the Video-Style Voxel/Block Character Architecture** in `src/components/office/AgentModel3D.tsx` and `src/components/office/three/VoxelAgentMesh.tsx`:
   - Cube-ish head with hair block variants (`short`, `bald`, `curly`, `long`, `ponytail`, `white_gray`), simple pixel eyes, bold outfit torso (`#f97316`, `#eab308`, `#ef4444`, `#38bdf8`, `#1e293b`, `#14b8a6`), separate swinging arm blocks, small hand cubes, two leg blocks, and dark shoes.
   - Contextual held props: Pickleball paddle (`court` players only), coffee cup (`PANTRY`), dumbbell (`GYM`), clipboard (`boss`).
2. **Deterministic Appearance Data**:
   - Store appearance in `office_agents.appearance` jsonb; when missing, generate once via `generateAgentAppearance(agentId)` (seeded PRNG) and persist idempotently.
3. **2D Parity**:
   - Mirror the exact same character silhouettes, outfits, and props in `OfficeCanvas2D.tsx` via `src/lib/office/sceneModel.ts` and `src/lib/office/spriteBaker.ts`.
4. **Nameplates & Foot Rings**:
   - Keep nameplates concise (`Name` + status dot/badge) with anti-overlap and orange foot ring (`#f97316`) for queued bench waiters.
