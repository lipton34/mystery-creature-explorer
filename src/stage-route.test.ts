import { describe, expect, it } from "vitest";
import { applyExplorationAction, CALL_POINT, createPerspectiveState, DISCOVERY_POINT, FAR_BANK, FACING_VECTORS, FOOTPRINT, giantInView, IMPACT_POINT, inspectFootprint, isPrototypeFloor, PROTOTYPE_MAP, RIVER_GLIMPSE, takeStageEvent, TAIL_LOOKOUT, tileKey, type PerspectiveState, type StageEvent } from "./perspective-world";
import { impactOffset } from "./stage-effects";
import type { Point } from "./world";
import { drawGiantPreview } from "./giant-preview";
import type Phaser from "phaser";

const WAYPOINTS = [IMPACT_POINT, { x: 5, y: 12 }, { x: 5, y: 9 }, CALL_POINT, RIVER_GLIMPSE, TAIL_LOOKOUT, { x: 8, y: 2 }, FAR_BANK, { x: 13, y: 2 }, { x: 13, y: 6 }, { x: 15, y: 6 }, DISCOVERY_POINT];

function traverse(state: PerspectiveState, waypoints = WAYPOINTS, events = true): { steps: number; events: { step: number; event: StageEvent }[] } {
  let steps = 0;
  const emitted: { step: number; event: StageEvent }[] = [];
  const observe = () => { const event = events ? takeStageEvent(state) : undefined; if (event) emitted.push({ step: steps, event }); };
  for (const destination of waypoints) {
    const vector = { x: Math.sign(destination.x - state.player.x), y: Math.sign(destination.y - state.player.y) };
    expect(vector.x === 0 || vector.y === 0).toBe(true);
    const heading = FACING_VECTORS.findIndex((facing) => facing.x === vector.x && facing.y === vector.y);
    while (state.heading !== heading) { applyExplorationAction(state, "right"); observe(); }
    while (tileKey(state.player) !== tileKey(destination)) { expect(applyExplorationAction(state, "forward")).toBe(true); steps++; observe(); }
  }
  return { steps, events: emitted };
}

describe("stage one exploration flow", () => {
  it("reaches the giant in 35 steps with the approved event order", () => {
    const state = createPerspectiveState();
    const result = traverse(state);
    expect(result.steps).toBe(35);
    expect(result.events).toEqual([{ step: 6, event: "impact" }, { step: 14, event: "call" }, { step: 18, event: "tail" }, { step: 35, event: "discovery" }]);
    expect(state.player).toEqual(DISCOVERY_POINT);
    expect(state.crossedStream && state.discoveredGiant).toBe(true);
    expect(state.inspectedFootprint || state.inspectedLog).toBe(false);
  });

  it("leaves the first five steps quiet", () => {
    const state = createPerspectiveState();
    for (let step = 0; step < 5; step++) { applyExplorationAction(state, "forward"); expect(takeStageEvent(state)).toBeUndefined(); }
    expect(state.heardImpact || state.heardCall).toBe(false);
  });

  it("keeps the footprint branch optional and makes its round trip four steps", () => {
    const state = createPerspectiveState();
    const waypoints = [...WAYPOINTS.slice(0, 3), FOOTPRINT, { x: 5, y: 9 }, ...WAYPOINTS.slice(3)];
    expect(traverse(state, waypoints).steps).toBe(39);
    expect(state.inspectedFootprint).toBe(false);
    const observation = createPerspectiveState();
    observation.player = { x: 4, y: 9 };
    observation.heading = 3;
    expect(inspectFootprint(observation)).toBe(true);
    expect(observation.player).toEqual({ x: 4, y: 9 });
  });

  it("does not start the tail at the first river view or when facing away", () => {
    const state = createPerspectiveState();
    state.player = { ...RIVER_GLIMPSE };
    state.heading = 1;
    expect(takeStageEvent(state)).toBeUndefined();
    state.player = { ...TAIL_LOOKOUT };
    state.heading = 0;
    expect(takeStageEvent(state)).toBeUndefined();
    applyExplorationAction(state, "right");
    expect(takeStageEvent(state)).toBe("tail");
  });

  it("never requires observations or earlier events to cross and discover", () => {
    const state = createPerspectiveState();
    expect(traverse(state, WAYPOINTS, false).steps).toBe(35);
    expect(state.crossedStream).toBe(true);
    expect(state.heardImpact || state.heardCall || state.witnessedTail || state.inspectedLog).toBe(false);
    expect(takeStageEvent(state)).toBe("discovery");
  });

  it("plays each event once per expedition, including return trips and turns", () => {
    const state = createPerspectiveState();
    traverse(state);
    for (const point of [IMPACT_POINT, CALL_POINT, TAIL_LOOKOUT, DISCOVERY_POINT]) {
      state.player = { ...point };
      for (let turns = 0; turns < 4; turns++) { applyExplorationAction(state, "right"); expect(takeStageEvent(state)).toBeUndefined(); }
    }
    const fresh = createPerspectiveState();
    expect(fresh.heardImpact || fresh.heardCall || fresh.witnessedTail || fresh.discoveredGiant).toBe(false);
  });

  it("shows the full-body preview only at the final viewpoint facing south", () => {
    const pose = { x: DISCOVERY_POINT.x + 0.5, y: DISCOVERY_POINT.y + 0.5, angle: Math.PI };
    expect(giantInView(pose)).toBe(true);
    expect(giantInView({ ...pose, angle: 0 })).toBe(false);
    expect(giantInView({ ...pose, y: pose.y - 1 })).toBe(false);
    expect(giantInView({ x: TAIL_LOOKOUT.x + 0.5, y: TAIL_LOOKOUT.y + 0.5, angle: Math.PI })).toBe(false);
    const state = createPerspectiveState();
    state.player = { ...DISCOVERY_POINT };
    expect(takeStageEvent(state)).toBeUndefined();
    state.heading = 2;
    expect(takeStageEvent(state)).toBe("discovery");
  });

  it("has no shortcut to the final discovery and only one observation branch", () => {
    const state = createPerspectiveState();
    const queue: { point: Point; distance: number }[] = [{ point: state.player, distance: 0 }];
    const seen = new Set([tileKey(state.player)]);
    let goalDistance = -1;
    let junctions = 0;
    for (let index = 0; index < queue.length; index++) {
      const { point, distance } = queue[index];
      if (tileKey(point) === tileKey(DISCOVERY_POINT)) goalDistance = distance;
      const neighbors = FACING_VECTORS.map((direction) => ({ x: point.x + direction.x, y: point.y + direction.y })).filter(isPrototypeFloor);
      if (neighbors.length > 2) junctions++;
      for (const next of neighbors) if (!seen.has(tileKey(next))) { seen.add(tileKey(next)); queue.push({ point: next, distance: distance + 1 }); }
    }
    expect(goalDistance).toBe(35);
    expect(junctions).toBe(1);
    expect(seen.size).toBe(PROTOTYPE_MAP.join("").split("").filter((cell) => cell === "." || cell === "L").length);
  });

  it("ends the brief shake and completely disables it for reduced motion", () => {
    expect(impactOffset(undefined, false)).toEqual({ x: 0, y: 0 });
    expect(impactOffset(420, false)).toEqual({ x: 0, y: 0 });
    expect(impactOffset(2000, false)).toEqual({ x: 0, y: 0 });
    for (const elapsed of [0, 50, 150, 300]) {
      expect(impactOffset(elapsed, true)).toEqual({ x: 0, y: 0 });
      const offset = impactOffset(elapsed, false);
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(offset.y)).toBeLessThanOrEqual(2);
    }
  });

  it("draws a complete placeholder with a head, body, tail and two hind legs", () => {
    const shapes: string[] = [];
    const graphics = new Proxy({}, { get: (_target, method) => (..._args: unknown[]) => { shapes.push(String(method)); return graphics; } }) as Phaser.GameObjects.Graphics;
    drawGiantPreview(graphics, 0);
    expect(shapes.filter((method) => method === "fillPoints").length).toBeGreaterThanOrEqual(6);
    expect(shapes).toContain("fillEllipse");
    expect(shapes).toContain("fillTriangle");
  });
});
