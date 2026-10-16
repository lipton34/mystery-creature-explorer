import { describe, expect, it } from "vitest";
import { applyExplorationAction, createPerspectiveState, FAR_BANK, FACING_VECTORS, inspectionTarget, isPrototypeFloor, knownMapCells, LOG_APPROACH, PROTOTYPE_MAP, TAIL_HEADING, TAIL_LOOKOUT, terrainAt, tileKey, wallHit, type PerspectiveState } from "./perspective-world";
import { projectPoint } from "./perspective-renderer";
import type { Point } from "./world";

function authoredPath(): Point[] {
  const start = createPerspectiveState().player;
  const queue = [[start]];
  const reached = new Set([tileKey(start)]);
  for (let index = 0; index < queue.length; index++) {
    const path = queue[index];
    const current = path.at(-1)!;
    if (tileKey(current) === tileKey(FAR_BANK)) return path;
    for (const vector of FACING_VECTORS) {
      const next = { x: current.x + vector.x, y: current.y + vector.y };
      if (!isPrototypeFloor(next) || reached.has(tileKey(next))) continue;
      reached.add(tileKey(next));
      queue.push([...path, next]);
    }
  }
  throw new Error("The far bank must be reachable");
}

function walkTo(state: PerspectiveState, destination: Point): void {
  const heading = FACING_VECTORS.findIndex((vector) => state.player.x + vector.x === destination.x && state.player.y + vector.y === destination.y);
  expect(heading).toBeGreaterThanOrEqual(0);
  while (state.heading !== heading) applyExplorationAction(state, "right");
  expect(applyExplorationAction(state, "forward")).toBe(true);
}

describe("stream and fallen-log route", () => {
  it("lets the player see across water but never step into it", () => {
    const state = createPerspectiveState();
    state.player = { ...TAIL_LOOKOUT };
    state.heading = TAIL_HEADING;
    expect(inspectionTarget(state)).toBe("water");
    const before = structuredClone(state);
    expect(applyExplorationAction(state, "forward")).toBe(false);
    expect(state).toEqual(before);
    applyExplorationAction(state, "right");
    applyExplorationAction(state, "right");
    expect(applyExplorationAction(state, "backward")).toBe(false);
    expect(state.player).toEqual(TAIL_LOOKOUT);
    const pose = { x: 5.5, y: 7.5, angle: Math.PI / 2 };
    expect(wallHit(pose, pose.angle).distance).toBeCloseTo(3.5);
    expect(projectPoint(pose, { x: 8.5, y: 7.5 })?.x).toBeCloseTo(320);
    expect(projectPoint(pose, { x: 10.5, y: 7.5 })).toBeUndefined();
  });

  it("does not reveal the opposite bank or the log on the map from the lookout", () => {
    const state = createPerspectiveState();
    for (const point of authoredPath().slice(1)) {
      walkTo(state, point);
      if (tileKey(point) === tileKey(TAIL_LOOKOUT)) break;
    }
    const known = knownMapCells(state);
    expect(known.filter(({ floor }) => floor).map(({ position }) => tileKey(position)).sort()).toEqual([...state.visited].sort());
    expect(known.some(({ terrain }) => terrain === "water")).toBe(true);
    expect(known.some(({ terrain }) => terrain === "log")).toBe(false);
    expect(known.some(({ position }) => position.x >= 8)).toBe(false);
  });

  it("makes the log observable from the approach and lets a turn reveal its crossing direction", () => {
    const state = createPerspectiveState();
    state.player = { ...LOG_APPROACH };
    expect(inspectionTarget(state)).toBe("log");
    expect(applyExplorationAction(state, "forward")).toBe(true);
    expect(terrainAt(state.player)).toBe("log");
    expect(applyExplorationAction(state, "forward")).toBe(false);
    applyExplorationAction(state, "right");
    expect(applyExplorationAction(state, "forward")).toBe(true);
    expect(terrainAt(state.player)).toBe("log");
    expect(state.inspectedLog).toBe(false);
  });

  it("crosses without any investigation, item, or sighting flag", () => {
    const state = createPerspectiveState();
    for (const point of authoredPath().slice(1)) walkTo(state, point);
    expect(state.player).toEqual(FAR_BANK);
    expect(state.crossedStream).toBe(true);
    expect(state.inspectedFootprint || state.inspectedLog || state.witnessedTail).toBe(false);
  });

  it("has a single continuous route with no branch and no water crossing except the log", () => {
    const path = authoredPath();
    const floorCount = PROTOTYPE_MAP.join("").split("").filter((tile) => tile === "." || tile === "L").length;
    expect(path).toHaveLength(floorCount);
    expect(PROTOTYPE_MAP.every((row) => row.length === PROTOTYPE_MAP[0].length)).toBe(true);
    for (const [index, point] of path.entries()) {
      const neighbors = FACING_VECTORS.filter((vector) => isPrototypeFloor({ x: point.x + vector.x, y: point.y + vector.y }));
      expect(neighbors).toHaveLength(index === 0 || index === path.length - 1 ? 1 : 2);
    }
    expect(path.findIndex((point) => tileKey(point) === tileKey(TAIL_LOOKOUT))).toBeLessThan(path.findIndex((point) => terrainAt(point) === "log"));
    expect(path.filter(({ x: horizontal }) => horizontal === 6 || horizontal === 7).every((point) => terrainAt(point) === "log")).toBe(true);
  });

  it("allows the whole return route without erasing the map", () => {
    const state = createPerspectiveState();
    const path = authoredPath();
    for (const point of path.slice(1)) walkTo(state, point);
    const visited = [...state.visited];
    for (const point of path.slice(0, -1).reverse()) walkTo(state, point);
    expect(state.player).toEqual(path[0]);
    expect([...state.visited]).toEqual(visited);
    expect(state.crossedStream).toBe(true);
  });

  it("clears crossing and observation state only for a fresh expedition", () => {
    const state = createPerspectiveState();
    state.crossedStream = true;
    state.inspectedLog = true;
    state.witnessedTail = true;
    const fresh = createPerspectiveState();
    expect(fresh.crossedStream || fresh.inspectedLog || fresh.witnessedTail).toBe(false);
    expect(fresh.visited.size).toBe(1);
  });
});
