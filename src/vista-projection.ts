import type { ViewPose } from "./perspective-world";

export const VISTA_WIDTH = 960;
export const VISTA_HEIGHT = 400;
export const VISTA_HORIZON = 154;
export const VISTA_LAYERS = { background: 12, tail: 8.65, foreground: 8.2 } as const;

function smooth(amount: number): number {
  const clamped = Math.max(0, Math.min(1, amount));
  return clamped * clamped * (3 - 2 * clamped);
}

export function vistaOpacity(pose: ViewPose): number {
  const angle = Math.abs(Math.atan2(Math.sin(pose.angle - Math.PI / 2), Math.cos(pose.angle - Math.PI / 2)));
  return smooth(pose.x - 3.5) * smooth((6.3 - pose.x) / 0.6) * smooth((0.85 - Math.abs(pose.y - 7.5)) / 0.65) * smooth((0.85 - angle) / 0.65);
}

export function vistaColumn(pose: ViewPose, planeX: number, column: number): { source: number; scale: number; top: number } | undefined {
  const lateral = (column - 320) / 490;
  const rayX = Math.sin(pose.angle) + Math.cos(pose.angle) * lateral;
  const rayY = -Math.cos(pose.angle) + Math.sin(pose.angle) * lateral;
  if (rayX <= 0.05 || planeX <= pose.x) return undefined;
  const depth = (planeX - pose.x) / rayX;
  const referenceDepth = planeX - 5.5;
  const source = VISTA_WIDTH / 2 + (pose.y + rayY * depth - 7.5) * 490 / referenceDepth;
  const scale = referenceDepth / depth;
  return { source, scale, top: VISTA_HORIZON * (1 - scale) };
}

export function vistaTailRect(progress: number, reduceMotion: boolean): { x: number; y: number; width: number; height: number } | undefined {
  if (progress < 0 || progress >= 1) return undefined;
  return { x: -1100 + progress * 2200, y: -58 + (reduceMotion ? 0 : Math.sin(progress * Math.PI * 4) * 3), width: 1060, height: 353 };
}
