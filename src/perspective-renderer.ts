import type Phaser from "phaser";
import { FOOTPRINT, wallHit, type ViewPose } from "./perspective-world";

export const VIEW_WIDTH = 640;
export const VIEW_HEIGHT = 400;
const HORIZON = 154;
const FOCAL = 490;

function mixColor(near: number, far: number, amount: number): number {
  const blend = Math.max(0, Math.min(1, amount));
  const channel = (shift: number) => Math.round(((near >> shift) & 255) * (1 - blend) + ((far >> shift) & 255) * blend);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export function projectPoint(pose: ViewPose, point: { x: number; y: number }): { x: number; floor: number; scale: number } | undefined {
  const offsetX = point.x - pose.x;
  const offsetY = point.y - pose.y;
  const forward = offsetX * Math.sin(pose.angle) - offsetY * Math.cos(pose.angle);
  const lateral = offsetX * Math.cos(pose.angle) + offsetY * Math.sin(pose.angle);
  if (forward <= 0.12) return undefined;
  const rayAngle = pose.angle + Math.atan2(lateral, forward);
  if (wallHit(pose, rayAngle).distance + 0.02 < Math.hypot(offsetX, offsetY)) return undefined;
  return { x: VIEW_WIDTH / 2 + lateral * FOCAL / forward, floor: HORIZON + 0.45 * FOCAL / forward, scale: FOCAL / forward };
}

function drawPrint(g: Phaser.GameObjects.Graphics, left: number, top: number, scale: number): void {
  g.fillStyle(0x4c5947, 0.85);
  g.fillEllipse(left, top, scale * 0.22, scale * 0.105);
  for (const offset of [-0.08, 0, 0.08]) g.fillEllipse(left + offset * scale, top - scale * 0.075, scale * 0.06, scale * 0.045);
}

export function drawPerspective(g: Phaser.GameObjects.Graphics, pose: ViewPose, tailProgress?: number): void {
  g.clear();
  g.fillStyle(0x9bada4);
  g.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  g.fillStyle(0xc2c6ae);
  g.fillRect(0, 64, VIEW_WIDTH, 110);
  g.fillStyle(0xe3d5a7, 0.6);
  g.fillCircle(440, 67, 25);
  for (let row = HORIZON; row < VIEW_HEIGHT; row += 3) {
    const distance = 0.45 * FOCAL / Math.max(1, row - HORIZON);
    g.fillStyle(mixColor(0x969078, 0xb4bbaa, Math.min(1, distance / 10)));
    g.fillRect(0, row, VIEW_WIDTH, 3);
  }
  for (let column = 0; column < VIEW_WIDTH; column += 4) {
    const rayOffset = Math.atan((column + 2 - VIEW_WIDTH / 2) / FOCAL);
    const hit = wallHit(pose, pose.angle + rayOffset);
    const depth = Math.max(0.08, hit.distance * Math.cos(rayOffset));
    const height = FOCAL / depth;
    const top = HORIZON - height * 0.65;
    const bottom = HORIZON + height * 0.45;
    const seam = hit.offset < 0.025 || hit.offset > 0.975;
    const trunk = Math.abs(hit.offset - 0.5) < 0.055;
    const base = seam ? 0x394f46 : hit.side === "vertical" ? 0x4d6655 : 0x64775b;
    const fog = Math.min(0.78, depth / 13);
    g.fillStyle(mixColor(base, 0xb4bbaa, fog));
    g.fillRect(column, top, 4, bottom - top);
    g.fillStyle(mixColor(trunk ? 0x695d46 : 0x3b584a, 0xb4bbaa, fog));
    g.fillRect(column, HORIZON - height * 0.12, 4, height * 0.57);
    g.fillStyle(mixColor(0x87916b, 0xb4bbaa, fog));
    g.fillRect(column, top, 4, Math.max(2, height * 0.025));
    if (hit.offset > 0.14 && hit.offset < 0.4) {
      g.fillStyle(mixColor(0x728366, 0xb4bbaa, fog));
      g.fillRect(column, top + height * 0.17, 4, height * 0.12);
    }
  }
  for (const footprint of [{ x: FOOTPRINT.x + 0.32, y: FOOTPRINT.y + 0.25 }, { x: FOOTPRINT.x + 0.68, y: FOOTPRINT.y + 0.65 }]) {
    const projected = projectPoint(pose, footprint);
    if (projected && projected.floor < VIEW_HEIGHT + 35) drawPrint(g, projected.x, projected.floor, projected.scale);
  }
  if (Math.floor(pose.x) === FOOTPRINT.x && Math.floor(pose.y) === FOOTPRINT.y) {
    drawPrint(g, 270, 360, 230);
    drawPrint(g, 390, 385, 230);
  }
  if (tailProgress !== undefined && tailProgress < 1) {
    const travel = Math.max(0, (tailProgress - 0.2) / 0.8);
    const sway = Math.sin(tailProgress * Math.PI * 2) * 0.035;
    let previous: { x: number; y: number } | undefined;
    for (let segment = 0; segment <= 28; segment++) {
      const along = segment / 28;
      const inverse = 1 - along;
      const lateral = inverse ** 3 * 0.55 + 3 * inverse ** 2 * along * 0.2 - 3 * inverse * along ** 2 * 0.28 - along ** 3 * 0.28;
      const height = inverse ** 3 * 0.55 + 3 * inverse ** 2 * along * 0.12 + 3 * inverse * along ** 2 * 0.13 + along ** 3 * 0.4 + sway * along;
      const projected = projectPoint(pose, { x: 2.5 + travel * 1.7 + lateral, y: 3.5 });
      if (!projected) { previous = undefined; continue; }
      const current = { x: projected.x, y: projected.floor - projected.scale * height };
      const radius = projected.scale * (0.075 - along * 0.035);
      g.lineStyle(radius * 2, 0x304b48);
      if (previous) g.lineBetween(previous.x, previous.y, current.x, current.y);
      g.fillStyle(segment > 23 ? 0x8c9c78 : 0x304b48);
      g.fillCircle(current.x, current.y, radius);
      previous = current;
    }
  }
}
