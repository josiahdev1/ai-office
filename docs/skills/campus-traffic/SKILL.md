---
name: campus-traffic
description: Outdoor campus, roads, parking, cars and arrivals; use for any change to outdoor map, traffic or car rendering.
---

# Campus Traffic, Outdoor Grounds, and Vehicle Simulation Guidelines

This skill governs the outdoor campus environment, roadways, parking systems, vehicle rendering, and agent commute flows for EasyUp Software Solution HQ.

## 1. Outdoor Campus Architecture & Spatial Rules

- **Non-Overlapping Footprint**: The outdoor ground slab, lawn, road loop, and parking lot surround the office building and must NEVER penetrate or overlap the building interior footprint.
- **Canopy Entrance Path**: The building front entrance connects via a paved walkway and a pedestrian crosswalk across the roadway directly to the parking lot and bus stop.
- **Perimeter & Landscaping**:
  - Soft green lawn slab with corner bevels and subtle elevation edge shading.
  - Low perimeter stone wall or manicured hedge with security entrance gate.
  - Procedural trees (small oak, tall pine, flowering dogwood) with gentle sway animation, bushes, flower beds, outdoor benches, bike rack, company flagpole, and outdoor lamp posts that cast soft radial illumination at night.
  - Small decorative fountain or garden pond with stone edge.
- **Roadway Network**:
  - Two-way paved asphalt roadway with clean lane markings: dashed center line, solid white shoulder lines, and curbs.
  - Striped pedestrian zebra crosswalk connecting the main sidewalk to the entrance canopy.
  - Bus shelter with bench, glass side panels, and timetable sign.
- **Parking Lot Layout**:
  - Minimum 20 marked parking bays with yellow/white dividing lines, concrete wheel stops, and bay numbering.
  - At least 2 marked accessible/handicap parking bays near the entrance walkway.
  - Dedicated executive bay reserved for "JOSIAH (FOUNDER)" with custom signage.
  - Main driving aisles must be at least 2 tiles wide (ensuring clear two-way or loop circulation).
  - Clear entry and exit transition zones connecting to the street.

## 2. Procedural Isometric Vehicles

- **100% Procedural Canvas / SVG**: No external images, raster assets, or 3D models. All vehicles are drawn with vector geometry, pixelated edges, and soft drop shadows (`rgba(0, 0, 0, 0.35)`).
- **Body Types (6 Variations)**:
  1. _Sedan_: Low profile, 3-box notchback styling.
  2. _Hatchback_: Compact, curved rear hatch, nimble.
  3. _SUV_: Elevated ride height, roof rails, rugged angular silhouette.
  4. _Pickup Truck_: Dual-cab with open rear bed and tailgate.
  5. _Van_: Boxy utility vehicle with side sliding-door panel lines.
  6. _Small Delivery Truck_: Box cargo container on rear chassis.
- **4 Isometric Facings (`SE`, `SW`, `NE`, `NW`)**:
  - Vehicles MUST always face the direction of their velocity vector along the road or parking aisle.
  - Windshields, windows, headlights, and tail lights reflect the facing orientation.
  - Dynamic lighting: Headlights illuminate at night and during rain; brake lights flare red when slowing down or stopping at crosswalks; subtle blinker pulses on turning maneuvers.

## 3. Roadway Traffic Simulation & Safety

- **Directed Graph Routing**: Roadways are represented as directed lane segments (`nodes` and `directed edges`).
- **Vehicle Density**: Cap at a maximum of 12 active moving vehicles simultaneously to protect frame budget.
- **Safe Following Distance & Braking**:
  - Vehicles maintain a 40px minimum safe buffer behind preceding vehicles.
  - Vehicles decelerate smoothly when approaching stopped vehicles, intersections, or the crosswalk.
- **Crosswalk Pedestrian Yielding**:
  - If any agent is actively crossing the zebra crosswalk, oncoming vehicles must come to a full stop before the yield line.
- **Deadlock Breaker**:
  - Every moving car tracks an `idleWaitFrames` counter. If a car remains stationary for $>240$ frames (4 seconds) due to congestion or circular wait, the deadlock breaker forces a priority resolution or safely reroutes/despawns the vehicle.
- **Parking Bay Reservation**:
  - A bay must be reserved before a vehicle initiates its parking maneuver.
  - Two vehicles can NEVER claim or occupy the same bay.

## 4. Commute & Shift-Change Life Cycle

- **Arrival Flow**:
  1. Vehicle spawns at road edge or arrives in lot.
  2. Vehicle navigates to assigned or vacant parking bay and parks cleanly.
  3. Driver agent disembarks from the car into the parking walkway.
  4. Agent walks along the sidewalk, pauses at crosswalk for safety, crosses to the entrance canopy, enters the building, and pathfinds (A*) to their assigned desk.
- **Departure / Off-Duty Flow**:
  1. Agent leaves desk, exits through building entrance, crosses the crosswalk to their parked car.
  2. Agent enters car; vehicle reverses out of bay into driving aisle and exits campus along the road.
- **Bus Commuters & Pedestrians**:
  - Transit bus periodically arrives at the bus stop, disembarks 1–3 arriving agents, and departs.

## 5. Performance & Layering

- **Static Offscreen Caching**:
  - Static elements (lawn slab, asphalt road, parking paint, building perimeter, fence) are rendered onto cached canvases or layers.
- **Dynamic Render Pass**:
  - Only active movers (cars, walking agents, swaying tree foliage, headlights, speech bubbles) redraw on `requestAnimationFrame`.
- **Target**: Maintain steady 60 FPS. If client has `prefers-reduced-motion` enabled, tree sway is paused and vehicle speed/density is dampened.
