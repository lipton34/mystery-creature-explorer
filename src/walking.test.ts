import { describe, expect, it } from "vitest";
import { walkingPosition, WALK_DURATION_MS, type WalkingStep } from "./walking";

describe("walking between tiles", () => {
  it.each([{ x: 4, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 4 }])("interpolates toward $x,$y instead of jumping", (to) => {
    const step: WalkingStep = { from: { x: 3, y: 3 }, to, startedAt: 1000 };
    const before = structuredClone(step);
    expect(walkingPosition(step, 1000)).toEqual({ x: 3, y: 3, progress: 0 });
    expect(walkingPosition(step, 1000 + WALK_DURATION_MS / 2)).toEqual({
      x: (3 + to.x) / 2, y: (3 + to.y) / 2, progress: 0.5,
    });
    expect(walkingPosition(step, 1000 + WALK_DURATION_MS)).toEqual({ ...to, progress: 1 });
    expect(step).toEqual(before);
  });

  it("clamps time to the endpoints even after a paused or slow frame", () => {
    const step: WalkingStep = { from: { x: 1, y: 1 }, to: { x: 2, y: 1 }, startedAt: 500 };
    expect(walkingPosition(step, 0)).toEqual({ x: 1, y: 1, progress: 0 });
    expect(walkingPosition(step, 100000)).toEqual({ x: 2, y: 1, progress: 1 });
  });

  it("joins consecutive steps at the same point without a visual snap", () => {
    const first: WalkingStep = { from: { x: 1, y: 1 }, to: { x: 2, y: 1 }, startedAt: 0 };
    const next: WalkingStep = { from: first.to, to: { x: 2, y: 2 }, startedAt: WALK_DURATION_MS };
    const end = walkingPosition(first, WALK_DURATION_MS);
    const start = walkingPosition(next, WALK_DURATION_MS);
    expect({ x: start.x, y: start.y }).toEqual({ x: end.x, y: end.y });
  });
});
