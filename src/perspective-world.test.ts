import { describe, expect, it } from "vitest";
import { applyExplorationAction, canWitnessTail, createPerspectiveState, FOOTPRINT, footprintInReach, inspectFootprint, isPrototypeFloor, knownMapCells, PROTOTYPE_MAP, tileKey, wallHit } from "./perspective-world";
import { projectPoint } from "./perspective-renderer";

describe("first-person exploration prototype", () => {
  it("starts looking north with only the starting floor recorded", () => {
    const state = createPerspectiveState();
    expect(state.player).toEqual({ x: 2, y: 7 });
    expect(state.heading).toBe(0);
    expect(state.visited).toEqual(new Set(["2,7"]));
    expect(state.inspectedFootprint).toBe(false);
    expect(state.witnessedTail).toBe(false);
  });

  it("turns in place, wraps around, and does not reveal more floor", () => {
    const state = createPerspectiveState();
    applyExplorationAction(state, "left");
    expect(state.heading).toBe(3);
    applyExplorationAction(state, "right");
    expect(state.heading).toBe(0);
    for (let turns = 0; turns < 4; turns++) applyExplorationAction(state, "right");
    expect(state.heading).toBe(0);
    expect(state.visited.size).toBe(1);
    expect(state.player).toEqual({ x: 2, y: 7 });
  });

  it("moves forward and backward relative to each heading", () => {
    for (const [heading, expected] of [[0, { x: 2, y: 4 }], [1, { x: 3, y: 5 }], [2, { x: 2, y: 6 }]] as const) {
      const state = createPerspectiveState();
      state.player = { x: 2, y: 5 };
      state.heading = heading;
      expect(applyExplorationAction(state, "forward")).toBe(true);
      expect(state.player).toEqual(expected);
      expect(applyExplorationAction(state, "backward")).toBe(true);
      expect(state.player).toEqual({ x: 2, y: 5 });
    }
    const west = createPerspectiveState();
    west.player = { x: 3, y: 5 };
    west.heading = 3;
    expect(applyExplorationAction(west, "forward")).toBe(true);
    expect(west.player).toEqual({ x: 2, y: 5 });
  });

  it("rejects walls and map boundaries without recording a step", () => {
    const state = createPerspectiveState();
    const before = structuredClone(state);
    expect(applyExplorationAction(state, "backward")).toBe(false);
    expect(state).toEqual(before);
    expect(isPrototypeFloor({ x: -1, y: 7 })).toBe(false);
    expect(isPrototypeFloor({ x: 200, y: 200 })).toBe(false);
    applyExplorationAction(state, "left");
    expect(applyExplorationAction(state, "forward")).toBe(false);
    expect(state.visited.size).toBe(1);
  });

  it("records only travelled floors, not the whole map or unseen creatures", () => {
    const state = createPerspectiveState();
    applyExplorationAction(state, "forward");
    applyExplorationAction(state, "forward");
    expect(state.visited).toEqual(new Set(["2,7", "2,6", "2,5"]));
    const known = knownMapCells(state);
    expect(known.filter(({ floor }) => floor).map(({ position }) => tileKey(position)).sort()).toEqual([...state.visited].sort());
    expect(known.some(({ position }) => tileKey(position) === "3,5")).toBe(false);
    expect(known.filter(({ floor }) => !floor).every(({ position }) => !isPrototypeFloor(position))).toBe(true);
    applyExplorationAction(state, "backward");
    expect(state.visited.size).toBe(3);
  });

  it("inspects footprints only underfoot or directly ahead without moving or revealing the map", () => {
    const state = createPerspectiveState();
    expect(inspectFootprint(state)).toBe(false);
    applyExplorationAction(state, "forward");
    const before = [...state.visited];
    expect(footprintInReach(state)).toBe(true);
    expect(inspectFootprint(state)).toBe(true);
    expect(state.inspectedFootprint).toBe(true);
    expect([...state.visited]).toEqual(before);
    applyExplorationAction(state, "right");
    expect(footprintInReach(state)).toBe(false);
    state.player = { ...FOOTPRINT };
    expect(footprintInReach(state)).toBe(true);
  });

  it("offers the tail only at the lookout facing the corner, regardless of inspection", () => {
    const state = createPerspectiveState();
    expect(canWitnessTail(state)).toBe(false);
    for (let steps = 0; steps < 3; steps++) applyExplorationAction(state, "forward");
    expect(canWitnessTail(state)).toBe(true);
    applyExplorationAction(state, "right");
    expect(canWitnessTail(state)).toBe(false);
    applyExplorationAction(state, "left");
    state.witnessedTail = true;
    expect(canWitnessTail(state)).toBe(false);
    expect(createPerspectiveState().witnessedTail).toBe(false);
  });

  it("keeps every authored floor reachable including both approaches to the bend", () => {
    const state = createPerspectiveState();
    const queue = [state.player];
    const reached = new Set([tileKey(state.player)]);
    for (let index = 0; index < queue.length; index++) {
      for (const vector of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
        const next = { x: queue[index].x + vector.x, y: queue[index].y + vector.y };
        if (!isPrototypeFloor(next) || reached.has(tileKey(next))) continue;
        reached.add(tileKey(next));
        queue.push(next);
      }
    }
    expect(reached.size).toBe(PROTOTYPE_MAP.join("").split(".").length - 1);
  });

  it("casts cardinal rays to the first wall and projects only visible points in front", () => {
    const pose = { x: 2.5, y: 7.5, angle: 0 };
    expect(wallHit(pose, 0).distance).toBeCloseTo(4.5);
    expect(wallHit(pose, Math.PI / 2).distance).toBeCloseTo(0.5);
    expect(wallHit(pose, Math.PI).distance).toBeCloseTo(0.5);
    expect(wallHit(pose, -Math.PI / 2).distance).toBeCloseTo(0.5);
    expect(projectPoint(pose, { x: 2.5, y: 5.5 })?.x).toBe(320);
    expect(projectPoint(pose, { x: 2.5, y: 8.5 })).toBeUndefined();
    expect(projectPoint(pose, { x: 4.5, y: 5.5 })).toBeUndefined();
    expect(projectPoint(pose, { x: 2.5, y: 2.5 })).toBeUndefined();
  });
});
