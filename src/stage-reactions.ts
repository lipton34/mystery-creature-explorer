import type Phaser from "phaser";
import { projectPoint } from "./perspective-renderer";
import { CALL_POINT, IMPACT_POINT, type ViewPose } from "./perspective-world";

export const FALLING_LEAF_DURATION = 1800;
export const RUSTLE_DURATION = 1600;

export function fallingLeaves(elapsed: number | undefined, reduceMotion: boolean): { x: number; y: number; height: number; size: number; tilt: number }[] {
  if (elapsed === undefined || elapsed < 0 || elapsed >= FALLING_LEAF_DURATION) return [];
  return Array.from({ length: 12 }, (_unused, index) => {
    const progress = Math.max(0, (elapsed - index * 18) / (FALLING_LEAF_DURATION - index * 18));
    const drift = reduceMotion ? 0 : Math.sin(progress * Math.PI * 2 + index) * 0.025;
    return {
      x: IMPACT_POINT.x + 0.3 + (index % 5) * 0.09 + drift,
      y: IMPACT_POINT.y + 0.16 + (index % 3) * 0.05,
      height: reduceMotion ? 0.52 + (index % 3) * 0.025 : 0.68 + (index % 3) * 0.025 - progress * 0.7,
      size: 0.005 + (index % 3) * 0.0015,
      tilt: reduceMotion ? index : index + progress * Math.PI,
    };
  });
}

export function branchReaction(elapsed: number | undefined, reduceMotion: boolean): { sway: number; active: boolean } {
  const active = elapsed !== undefined && elapsed >= 0 && elapsed < RUSTLE_DURATION;
  if (!active || reduceMotion) return { sway: 0, active };
  const progress = elapsed! / RUSTLE_DURATION;
  return { sway: Math.sin(progress * Math.PI * 5) * Math.sin(progress * Math.PI) * 0.018, active };
}

function leaf(graphics: Phaser.GameObjects.Graphics, horizontal: number, vertical: number, size: number, tilt: number, color: number): void {
  const axisX = Math.cos(tilt) * size;
  const axisY = Math.sin(tilt) * size;
  graphics.fillStyle(color);
  graphics.fillPoints([
    { x: horizontal - axisX, y: vertical - axisY },
    { x: horizontal - axisY * 0.5, y: vertical + axisX * 0.5 },
    { x: horizontal + axisX, y: vertical + axisY },
    { x: horizontal + axisY * 0.5, y: vertical - axisX * 0.5 },
  ], true);
}

export function drawStageReactions(graphics: Phaser.GameObjects.Graphics, pose: ViewPose, impactElapsed: number | undefined, callElapsed: number | undefined, reduceMotion: boolean): void {
  for (const particle of fallingLeaves(impactElapsed, reduceMotion)) {
    const projected = projectPoint(pose, particle);
    if (projected) leaf(graphics, projected.x, projected.floor - projected.scale * particle.height, projected.scale * particle.size, particle.tilt, 0x9dab52);
  }
  const reaction = branchReaction(callElapsed, reduceMotion);
  const branch = projectPoint(pose, { x: CALL_POINT.x + 0.86, y: CALL_POINT.y + 0.5 });
  if (!branch || branch.scale > 1800) return;
  const center = branch.floor - branch.scale * 0.51;
  const swing = reaction.sway * branch.scale;
  graphics.lineStyle(Math.max(1, branch.scale * 0.0025), 0x6c7141);
  graphics.lineBetween(branch.x - branch.scale * 0.11, center - branch.scale * 0.035, branch.x + branch.scale * 0.13, center + swing);
  for (let index = 0; index < 9; index++) {
    const horizontal = branch.x + (index - 4) * branch.scale * 0.028;
    const vertical = center + (index % 2 ? -1 : 1) * branch.scale * 0.013 + swing * (index / 8);
    leaf(graphics, horizontal, vertical, branch.scale * 0.012, index % 2 ? -0.7 : 0.8, reaction.active ? 0xc5cb72 : 0x829653);
  }
}
