import { describe, expect, it } from "vitest";
import { applyExplorationAction, createPerspectiveState, explorationDestination, FACING_VECTORS, FOOTPRINT, terrainAt, TAIL_LOOKOUT, type ExplorationAction, type ViewPose } from "./perspective-world";
import { footprintContains } from "./footprint-texture";
import { drawPerspective, floorPointAt, VIEW_WIDTH } from "./perspective-renderer";
import type Phaser from "phaser";

function renderedMarks(pose: ViewPose): string[] {
  const calls: string[] = [];
  let ink = 0;
  const graphics = new Proxy({}, { get: (_target, property) => (...args: number[]) => {
    if (property === "fillStyle") ink = args[0];
    if (property === "fillEllipse") calls.push("ellipse");
    if (property !== "fillRect" || args[3] !== 4 || args[1] <= 154) return;
    const blend = Math.min(0.65, (0.45 * 490 / (args[1] - 154)) / 25);
    const channel = (shift: number) => Math.round(((0x4c5947 >> shift) & 255) * (1 - blend) + ((0xd5e6b9 >> shift) & 255) * blend);
    const footprintInk = (channel(16) << 16) | (channel(8) << 8) | channel(0);
    if (ink === footprintInk) calls.push("footprint");
  } }) as Phaser.GameObjects.Graphics;
  drawPerspective(graphics, pose);
  return calls;
}

describe("view-preserving sideways movement", () => {
  it.each([0, 1, 2, 3])("moves sideways relative to heading %s without turning", (heading) => {
    const state = createPerspectiveState();
    const strafe: ExplorationAction = heading % 2 === 0 ? "strafe-right" : "strafe-left";
    state.player = heading % 2 === 0 ? { x: 4, y: 7 } : { x: 2, y: 8 };
    state.heading = heading;
    const before = { ...state.player };
    const relativeHeading = (heading + (strafe === "strafe-right" ? 1 : 3)) % 4;
    const expected = { x: before.x + FACING_VECTORS[relativeHeading].x, y: before.y + FACING_VECTORS[relativeHeading].y };
    expect(explorationDestination(state, strafe)).toEqual(expected);
    expect(applyExplorationAction(state, strafe)).toBe(true);
    expect(state.player).toEqual(expected);
    expect(state.heading).toBe(heading);
    const reverse = strafe === "strafe-right" ? "strafe-left" : "strafe-right";
    expect(applyExplorationAction(state, reverse)).toBe(true);
    expect(state.player).toEqual(before);
    expect(state.heading).toBe(heading);
    expect(state.visited.has(`${expected.x},${expected.y}`)).toBe(true);
  });

  it("cannot strafe into water or trees and leaves state untouched", () => {
    const state = createPerspectiveState();
    state.player = { ...TAIL_LOOKOUT };
    const before = structuredClone(state);
    const destination = explorationDestination(state, "strafe-right")!;
    expect(terrainAt(destination)).toBe("water");
    expect(applyExplorationAction(state, "strafe-right")).toBe(false);
    expect(state).toEqual(before);
    const start = createPerspectiveState();
    const initial = structuredClone(start);
    expect(applyExplorationAction(start, "strafe-left")).toBe(false);
    expect(start).toEqual(initial);
  });

  it("can cross a log sideways without requiring investigation or changing direction", () => {
    const state = createPerspectiveState();
    state.player = { x: 5, y: 3 };
    for (let step = 0; step < 3; step++) expect(applyExplorationAction(state, "strafe-right")).toBe(true);
    expect(state.player).toEqual({ x: 8, y: 3 });
    expect(state.heading).toBe(0);
    expect(state.crossedStream).toBe(true);
    expect(state.inspectedLog).toBe(false);
    expect(explorationDestination(state, "left")).toBeUndefined();
  });
});

describe("footprints fixed to the ground", () => {
  it("places pads and toes only inside their authored tile", () => {
    expect(footprintContains(FOOTPRINT.x + 0.32, FOOTPRINT.y + 0.28)).toBe(true);
    expect(footprintContains(FOOTPRINT.x + 0.68, FOOTPRINT.y + 0.68)).toBe(true);
    expect(footprintContains(FOOTPRINT.x + 0.32, FOOTPRINT.y + 0.1)).toBe(true);
    expect(footprintContains(FOOTPRINT.x + 0.05, FOOTPRINT.y + 0.9)).toBe(false);
    expect(footprintContains(FOOTPRINT.x + 1.32, FOOTPRINT.y + 0.28)).toBe(false);
    expect(footprintContains(FOOTPRINT.x + 0.32, FOOTPRINT.y - 0.72)).toBe(false);
  });

  it("projects a floor sample back to the same world position when moving or turning", () => {
    const point = { x: FOOTPRINT.x + 0.32, y: FOOTPRINT.y + 0.28 };
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const pose = { x: point.x - Math.sin(angle) * 1.5, y: point.y + Math.cos(angle) * 1.5, angle };
      const sample = floorPointAt(pose, VIEW_WIDTH / 2, 154 + 0.45 * 490 / 1.5)!;
      expect(sample.x).toBeCloseTo(point.x);
      expect(sample.y).toBeCloseTo(point.y);
      expect(footprintContains(sample.x, sample.y)).toBe(true);
    }
    expect(floorPointAt({ x: 2.5, y: 8.5, angle: 0 }, 320, 154)).toBeUndefined();
  });

  it.each([0, Math.PI / 2, Math.PI, Math.PI * 1.5])("does not pin footprints to the screen while standing on them at angle %s", (angle) => {
    const calls = renderedMarks({ x: FOOTPRINT.x + 0.5, y: FOOTPRINT.y + 0.5, angle });
    expect(calls).not.toContain("footprint");
    expect(calls).not.toContain("ellipse");
  });

  it("renders distant footprints as floor marks rather than upright portraits", () => {
    const calls = renderedMarks({ x: FOOTPRINT.x + 0.5, y: FOOTPRINT.y + 1.5, angle: 0 });
    expect(calls).toContain("footprint");
    expect(calls).not.toContain("ellipse");
    expect(renderedMarks({ x: FOOTPRINT.x + 1.5, y: FOOTPRINT.y + 0.5, angle: Math.PI / 2 })).not.toContain("footprint");
  });
});
