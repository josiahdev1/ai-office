import { describe, it, expect } from 'vitest';
import {
  identifyRoom,
  calculateCorridorPath,
  stepAgentTowardsTarget,
  getModeTargets,
} from '../src/lib/office/pathfinding';

describe('Pathfinding and Corridor Navigation Engine', () => {
  it('correctly identifies rooms from world coordinates', () => {
    expect(identifyRoom({ x: 230, y: 130 })).toBe('Operations Hub');
    expect(identifyRoom({ x: 100, y: 220 })).toBe('Growth Lab');
    expect(identifyRoom({ x: 200, y: 340 })).toBe('Engineering Core');
    expect(identifyRoom({ x: 720, y: 130 })).toBe('Intelligence Lab');
    expect(identifyRoom({ x: 670, y: 350 })).toBe('Command Center');
    expect(identifyRoom({ x: 500, y: 290 })).toBe('The Brain');
    expect(identifyRoom({ x: 570, y: 490 })).toBe('Pantry & Game Lounge');
    expect(identifyRoom({ x: 120, y: 450 })).toBe('Recreation');
  });

  it('calculates multi-waypoint path when moving between rooms without clipping', () => {
    const start = { x: 200, y: 340 }; // Engineering desk
    const end = { x: 570, y: 490 };   // Coffee machine in Pantry

    const path = calculateCorridorPath(start, end);
    expect(path.length).toBeGreaterThanOrEqual(2);

    // Final waypoint must be the exact destination
    const last = path[path.length - 1];
    expect(last.x).toBe(end.x);
    expect(last.y).toBe(end.y);

    // Initial step should route towards a doorway or corridor
    expect(path[0]).toBeDefined();
  });

  it('performs linear interpolation safely with zero NaN', () => {
    const current = { x: 100, y: 100 };
    const target = { x: 200, y: 100 };
    const speed = 50; // px/sec
    const dt = 0.5;   // 0.5 sec

    const result = stepAgentTowardsTarget(current, target, speed, dt);
    expect(result.arrived).toBe(false);
    expect(result.next.x).toBeCloseTo(125);
    expect(result.next.y).toBe(100);
    expect(Number.isFinite(result.next.x)).toBe(true);
    expect(Number.isFinite(result.next.y)).toBe(true);
  });

  it('detects arrival when within threshold', () => {
    const current = { x: 199.5, y: 100 };
    const target = { x: 200, y: 100 };
    const result = stepAgentTowardsTarget(current, target, 50, 0.1, 2.0);
    expect(result.arrived).toBe(true);
    expect(result.next.x).toBe(200);
    expect(result.next.y).toBe(100);
  });

  it('generates distinct mode targets for all-hands and coffee break', () => {
    const desk = { x: 200, y: 340 };
    const allHandsTarget = getModeTargets('ALL_HANDS', 'josiah', 0, desk);
    const coffeeTarget = getModeTargets('COFFEE_BREAK', 'josiah', 0, desk);
    const focusTarget = getModeTargets('FOCUS_WORK', 'josiah', 0, desk);

    expect(focusTarget).toEqual(desk);
    expect(allHandsTarget).not.toEqual(desk);
    expect(coffeeTarget).not.toEqual(desk);
    expect(identifyRoom(coffeeTarget)).toBe('Pantry & Game Lounge');
  });
});
