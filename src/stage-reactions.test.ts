import { describe, expect, it } from "vitest";
import type Phaser from "phaser";
import { branchReaction, drawStageReactions, fallingLeaves, FALLING_LEAF_DURATION, RUSTLE_DURATION } from "./stage-reactions";
import { CALL_POINT, IMPACT_POINT } from "./perspective-world";

describe("non-text stage reactions", () => {
  it("drops a finite group of leaves after the impact, without creating a looping effect", () => {
    expect(fallingLeaves(undefined, false)).toEqual([]);
    expect(fallingLeaves(-1, false)).toEqual([]);
    const first = fallingLeaves(0, false);
    const later = fallingLeaves(900, false);
    expect(first).toHaveLength(12);
    expect(later).toHaveLength(12);
    expect(later[0].height).toBeLessThan(first[0].height);
    expect(later[0].tilt).not.toBe(first[0].tilt);
    expect(fallingLeaves(FALLING_LEAF_DURATION, false)).toEqual([]);
    expect(fallingLeaves(10000, false)).toEqual([]);
  });

  it("keeps leaves anchored to the impact location rather than the current camera", () => {
    for (const particle of fallingLeaves(700, false)) {
      expect(particle.x).toBeGreaterThan(IMPACT_POINT.x);
      expect(particle.x).toBeLessThan(IMPACT_POINT.x + 1);
      expect(particle.y).toBeGreaterThan(IMPACT_POINT.y);
      expect(particle.y).toBeLessThan(IMPACT_POINT.y + 1);
    }
  });

  it("rustles an existing branch and returns it to rest without moving the camera", () => {
    expect(branchReaction(undefined, false)).toEqual({ sway: 0, active: false });
    expect(branchReaction(0, false).sway).toBe(0);
    expect(branchReaction(450, false).sway).not.toBe(0);
    expect(Math.abs(branchReaction(450, false).sway)).toBeLessThanOrEqual(0.018);
    expect(branchReaction(RUSTLE_DURATION, false)).toEqual({ sway: 0, active: false });
  });

  it("uses static leaves and a steady branch highlight for reduced motion", () => {
    expect(fallingLeaves(200, true)).toEqual(fallingLeaves(900, true));
    expect(branchReaction(200, true)).toEqual({ sway: 0, active: true });
    expect(branchReaction(900, true)).toEqual({ sway: 0, active: true });
    expect(branchReaction(RUSTLE_DURATION, true)).toEqual({ sway: 0, active: false });
  });

  it("renders different marks for impact and call and respects walls and facing", () => {
    const marks = (pose: { x: number; y: number; angle: number }, impact?: number, call?: number) => {
      const colors: number[] = [];
      const graphics = new Proxy({}, { get: (_target, method) => (...args: unknown[]) => { if (method === "fillStyle") colors.push(args[0] as number); return graphics; } }) as Phaser.GameObjects.Graphics;
      drawStageReactions(graphics, pose, impact, call, false);
      return colors;
    };
    const impactPose = { x: IMPACT_POINT.x + 0.5, y: IMPACT_POINT.y + 0.5, angle: 0 };
    expect(marks(impactPose, 700)).toContain(0x9dab52);
    expect(marks({ ...impactPose, angle: Math.PI }, 700)).not.toContain(0x9dab52);
    const callPose = { x: CALL_POINT.x + 0.5, y: CALL_POINT.y + 0.5, angle: Math.PI / 2 };
    expect(marks(callPose)).toContain(0x829653);
    expect(marks(callPose, undefined, 400)).toContain(0xc5cb72);
    expect(marks(callPose, undefined, 2000)).toContain(0x829653);
    expect(marks(impactPose, undefined, 400)).not.toContain(0xc5cb72);
  });
});
