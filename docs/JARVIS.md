# JARVIS — Autonomous AI Orchestrator Inside The Brain Core

## 1. Overview & Goals
**J.A.R.V.I.S.** (*Just A Rather Very Intelligent System*) is the central AI orchestrator embedded inside **The Brain** (`[0, 0, 0]`) of **EasyUp Software Solution HQ**. Users can click The Brain core in either the 3D WebGL view (`/`) or the 2D Isometric view (`/?v=2`), press `J`, or click the `JARVIS` HUD button to fly inside the holographic Arc Reactor chamber, converse with Jarvis via text or Web Speech API voice, query live Supabase operational telemetry, and dispatch multi-agent task plans across all 24 EasyUp HQ agents.

---

## 2. Design Inspiration & Original Implementation Notes
All geometry, shaders/materials, Canvas 2D projections, and state machines in this repository are **100% original code** written for EasyUp Software Solution HQ. The following open-source and design experiments were studied for visual and structural inspiration only (zero code or assets copied):

1. **`AbyssalCoder/Open-Jarvis`** (`https://github.com/AbyssalCoder/Open-Jarvis`):
   - *Inspiration*: 3D Arc Reactor breathing cadence, multi-axis gyroscopic orbital rings, and soft cyan bloom halo around the central plasma core.
2. **`cam-hm/jarvis`** (`https://github.com/cam-hm/jarvis`):
   - *Inspiration*: Procedural concentric ring geometry and audio-reactive perimeter waveform modulation during the `speaking` state.
3. **`KofTwentyTwo/Jarvis`** (`https://github.com/KofTwentyTwo/Jarvis`):
   - *Inspiration*: React Three Fiber orbital particle field paired with curved glass holographic HUD panels for conversation and live agent status.
4. **Contra — *Arc Reactor: A 3D UI Experiment*** (`https://contra.com/p/Rv7L2RFE-arc-reactor-a-3-d-ui-experiment`):
   - *Inspiration*: Harmonic heartbeat pulse curve, segmented mechanical arc rings with radial tick marks rotating at distinct angular velocities, and high-contrast cyan (`#00e5ff`) + warm amber (`#f59e0b`) + alert coral (`#ef4444`) state color transitions.

---

## 3. Shared `ArcReactor` Component (`src/components/jarvis/ArcReactor.tsx`)
Both the exterior office Brain core and the interior Jarvis chamber render the **exact same `ArcReactor` component** at two detail tiers:

- **`size="office"` (Exterior Brain Core)**:
  - Compact scale (`1.0x`), 3 segmented concentric rings, 12 radial tick marks, 28 orbital energy particles, low-overhead WebGL primitives + matching `drawArcReactor2D` Canvas 2D projection for `/?v=2`.
  - Hovering displays a pulsing pedestal ring and floating `JARVIS` callout pill.
- **`size="interior"` (Jarvis Chamber Core)**:
  - High-detail chamber scale (`2.2x`), 5 segmented concentric rings with counter-rotating arc gaps, 36 radial precision tick marks, 32-bar audio-reactive waveform ring, 96 orbital vortex particles, and inner icosahedral plasma lattice.

### Core States (`JarvisCoreState`)
| State | Primary Color | Accent Color | Visual Behavior |
|-------|---------------|--------------|-----------------|
| `idle` | `#00e5ff` (Cyan) | `#38bdf8` (Sky) | Slow 0.4 Hz breathing pulse, steady counter-rotating rings, calm orbital drift |
| `listening` | `#22d3ee` (Bright Cyan) | `#34d399` (Emerald) | Rings tighten inward (`0.88x` radius), expanding sonar ripple rings on input |
| `thinking` | `#f59e0b` (Amber) | `#00e5ff` (Cyan) | `2.4x` ring angular velocity, particles swirl inward toward core vortex |
| `executing` | `#00e5ff` (Electric Cyan) | `#818cf8` (Indigo) | Harmonic heartbeat pulse synchronized with real task progress (`0–100%`) |
| `speaking` | `#e0f2fe` (White-Cyan) | `#00e5ff` (Cyan) | Outer 32-segment waveform ring modulates radially with speech cadence |
| `error` | `#ef4444` (Crimson) | `#f97316` (Orange) | Safe `< 2.2 Hz` diagnostic warning pulse (WCAG compliant, never flashes `> 3 Hz`) |

---

## 4. Phased Implementation Roadmap (Phases J1 to J6)
- **Phase J1**: Shared `ArcReactor` (3D WebGL + 2D Canvas), `/dev/jarvis` laboratory page showcasing all 6 states at `office` and `interior` sizes, and integration into the 3D (`BrainCore.tsx`) and 2D (`OfficeCanvas2D.tsx`) office Brain core.
- **Phase J2**: Entry points (click Brain core in 3D/2D, top/bottom `JARVIS` buttons, keyboard shortcut `J`, `#jarvis` URL hash), 1.5s cinematic fly-in/fly-out camera transition (`prefers-reduced-motion` aware), and spherical interior chamber with live Supabase readouts.
- **Phase J3**: Streaming `POST /api/jarvis` SSE route with Zod validation, rate limiting, server-side LLM provider adapter (`GEMINI_API_KEY` -> `ANTHROPIC_API_KEY` -> `OPENAI_API_KEY` -> honest `SIM MODE`), intent classifier (`QUESTION`, `STATUS`, `TASK`, `OFFICE_COMMAND`), and Supabase conversation persistence.
- **Phase J4**: `TASK` orchestration flow with Zod-validated structured plans, real agent load mapping across the 24 agents, subtask/token caps, Confirm/Edit card, Autonomy setting, live agent desk execution, approval staging (`office_approvals`), prompt-injection defense, and final report synthesis.
- **Phase J5**: `OFFICE_COMMAND` execution from Jarvis, optional Web Speech API voice STT/TTS (off by default, mute toggle), audio-reactive `speaking` ring, and real-time state coupling.
- **Phase J6**: End-to-end Playwright browser QA, self-review against references, mobile responsiveness verification, full test suite, and PR ready.
