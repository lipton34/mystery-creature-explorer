import type Phaser from "phaser";
import { FOOTPRINT, terrainAt, wallHit, type ViewPose } from "./perspective-world";

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

export function drawPerspective(g: Phaser.GameObjects.Graphics, pose: ViewPose, tailProgress?: number, time = 0): void {
  g.clear();
  g.fillStyle(0xb7dfe0);
  g.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  g.fillStyle(0xd5e6b9);
  g.fillRect(0, 64, VIEW_WIDTH, 110);
  g.fillStyle(0xffe9a5, 0.9);
  g.fillCircle(440, 67, 25);
  for (let row = HORIZON; row < VIEW_HEIGHT; row += 4) {
    const distance = 0.45 * FOCAL / Math.max(1, row - HORIZON);
    let runStart = 0;
    let runColor = -1;
    for (let column = 0; column <= VIEW_WIDTH; column += 4) {
      const lateral = (column - VIEW_WIDTH / 2) * distance / FOCAL;
      const worldX = pose.x + Math.sin(pose.angle) * distance + Math.cos(pose.angle) * lateral;
      const worldY = pose.y - Math.cos(pose.angle) * distance + Math.sin(pose.angle) * lateral;
      const terrain = terrainAt({ x: Math.floor(worldX), y: Math.floor(worldY) });
      const ripple = Math.sin(worldX * 18 + worldY * 14 - time / 900) > 0.97;
      const grain = Math.sin(worldY * 42) > 0.7;
      const base = terrain === "water" ? ripple ? 0xa9d9cb : 0x75bcb5 : terrain === "log" ? grain ? 0x866039 : 0xbe9255 : 0xcdcb93;
      const color = mixColor(base, 0xd5e6b9, Math.min(0.65, distance / 25));
      if (color !== runColor || column === VIEW_WIDTH) {
        if (runColor !== -1) { g.fillStyle(runColor); g.fillRect(runStart, row, column - runStart, 4); }
        runColor = color;
        runStart = column;
      }
    }
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
    const base = seam ? 0x547744 : hit.side === "vertical" ? 0x6c9d57 : 0x80ad65;
    const fog = Math.min(0.78, depth / 13);
    g.fillStyle(mixColor(base, 0xd5e6b9, fog));
    g.fillRect(column, top, 4, bottom - top);
    g.fillStyle(mixColor(trunk ? 0x8a704a : 0x648b51, 0xd5e6b9, fog));
    g.fillRect(column, HORIZON - height * 0.12, 4, height * 0.57);
    g.fillStyle(mixColor(0xafd27f, 0xd5e6b9, fog));
    g.fillRect(column, top, 4, Math.max(2, height * 0.025));
    if (hit.offset > 0.14 && hit.offset < 0.4) {
      g.fillStyle(mixColor(0x9cc977, 0xd5e6b9, fog));
      g.fillRect(column, top + height * 0.17, 4, height * 0.12);
    }
  }
  const logEnd = projectPoint(pose, { x: 5.5, y: 3.8 });
  if (logEnd && logEnd.scale < 1200) {
    g.fillStyle(0x765434);
    g.fillEllipse(logEnd.x, logEnd.floor - logEnd.scale * 0.1, logEnd.scale * 0.48, logEnd.scale * 0.28);
    g.fillStyle(0xd2ac72);
    g.fillEllipse(logEnd.x, logEnd.floor - logEnd.scale * 0.11, logEnd.scale * 0.4, logEnd.scale * 0.22);
    g.lineStyle(Math.max(1, logEnd.scale * 0.008), 0x967044);
    g.strokeEllipse(logEnd.x, logEnd.floor - logEnd.scale * 0.11, logEnd.scale * 0.25, logEnd.scale * 0.13);
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
      const projected = projectPoint(pose, { x: 8.5 + travel * 1.5, y: 7.5 - travel * 0.8 + lateral });
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
