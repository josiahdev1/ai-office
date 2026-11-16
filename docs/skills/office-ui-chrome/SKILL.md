---
name: office-ui-chrome
description: UI/UX Chrome, Header HUD, Bottom Toolbar, and Agent Roster Panel Guidelines.
---

# Office UI Chrome & Cockpit Design

## 1. Dark Studio Architecture

- **Theme Foundation**: Executive dark engineering cockpit (`bg-[#0a0d14]` / `bg-[#0e131f]`).
- **Tailwind v4 Compliance**:
  - Always convert decimal opacities to percentage integers: `/8`, `/12`, `/15`, `/20`, `/50`, `/80`.
  - Always use multiples of 4px: `w-40`, `h-10`, `p-3`, `gap-2`, `gap-4`.
  - Always enforce `whitespace-nowrap` on action pills and buttons containing icons.

## 2. Top Navigation HUD

1. **Brand & Title Capsule**:
   - Compact top-left or centered header: `EASYUP HEADQUARTERS` with live status indicator (🟢 `23 ACTIVE AGENTS`).
2. **Scrolling Agent Strip**:
   - Horizontal scrolling strip of agent chips in the top bar.
   - Each chip displays: pixel avatar badge, agent name/callsign, and status dot.
   - Clicking an agent chip smoothly pans the camera directly to that agent and selects them.
3. **Zoom Controls**:
   - Clean top-left or top-right zoom in (`+`) and zoom out (`-`) floating buttons with zoom percentage read-out.

## 3. Bottom Action Toolbar

- Floating bottom bar containing:
  - `+ Agent`: Highlighted action with subtle emerald accent to spawn/hire new agent.
  - `Layout`: View and toggle floor plan layers.
  - `AGENTS (23)`: Toggles slide-over roster drawer.
  - `Settings`: Office preferences, sound toggle, and live feed switches.
  - Mode switches: `FOCUS WORK`, `ALL HANDS`, `PANTRY & BREAK`, `REC & GYM`.

## 4. Slide-Over AGENTS Panel

- Slide-over drawer on the right side of the screen.
- Real-time search filter by agent name, department, or status.
- Department groups: Executive/Arch, Engineering Core, QA & SecOps NOC, Intelligence Lab, Operations Hub, Growth Lab.
- Quick actions per agent: "Go To Desk", "Summon to Meeting", "Assign Task".
