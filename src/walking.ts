import type { Point } from "./world";

export const WALK_DURATION_MS = 160;
export type WalkingStep = { from: Point; to: Point; startedAt: number };

export function walkingPosition(step: WalkingStep, time: number): Point & { progress: number } {
  const progress = Math.max(0, Math.min(1, (time - step.startedAt) / WALK_DURATION_MS));
  return {
    x: step.from.x + (step.to.x - step.from.x) * progress,
    y: step.from.y + (step.to.y - step.from.y) * progress,
    progress,
  };
}
