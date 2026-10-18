import type Phaser from "phaser";
import { LOG_APPROACH, TAIL_LOOKOUT, terrainAt, wallHit, type ViewPose } from "./perspective-world";
import { footprintContains } from "./footprint-texture";
import { tailSection, TAIL_SEGMENTS } from "./moriru-sighting";
import { drawGiantPreview } from "./giant-preview";

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

export function floorPointAt(pose: ViewPose, column: number, row: number): { x: number; y: number } | undefined {
  if (row <= HORIZON) return undefined;
  const distance = 0.45 * FOCAL / (row - HORIZON);
  const lateral = (column - VIEW_WIDTH / 2) * distance / FOCAL;
  return {
    x: pose.x + Math.sin(pose.angle) * distance + Math.cos(pose.angle) * lateral,
    y: pose.y - Math.cos(pose.angle) * distance + Math.sin(pose.angle) * lateral,
  };
}

export function drawPerspective(g: Phaser.GameObjects.Graphics, pose: ViewPose, tailProgress?: number, time = 0, reduceMotion = false, giant = false): void {
  g.clear();
  if (giant) { drawGiantPreview(g, reduceMotion ? 0 : time); return; }
  g.fillStyle(0xb7dfe0);
  g.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  g.fillStyle(0xd5e6b9);
  g.fillRect(0, 64, VIEW_WIDTH, 110);
  g.fillStyle(0xffe9a5, 0.9);
  g.fillCircle(440, 67, 25);
  for (let row = HORIZON + 4; row < VIEW_HEIGHT; row += 4) {
    const distance = 0.45 * FOCAL / Math.max(1, row - HORIZON);
    let runStart = 0;
    let runColor = -1;
    for (let column = 0; column <= VIEW_WIDTH; column += 4) {
      const { x: worldX, y: worldY } = floorPointAt(pose, column, row)!;
      const terrain = terrainAt({ x: Math.floor(worldX), y: Math.floor(worldY) });
      const ripple = Math.sin(worldX * 18 + worldY * 14 - time / 900) > 0.97;
      const grain = Math.sin(worldY * 42) > 0.7;
      const base = terrain === "path" && footprintContains(worldX, worldY) ? 0x4c5947 : terrain === "water" ? ripple ? 0xa9d9cb : 0x75bcb5 : terrain === "log" ? grain ? 0x866039 : 0xbe9255 : 0xcdcb93;
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
  const logEnd = projectPoint(pose, { x: LOG_APPROACH.x + 0.5, y: LOG_APPROACH.y - 0.2 });
  if (logEnd && logEnd.scale < 1200) {
    g.fillStyle(0x765434);
    g.fillEllipse(logEnd.x, logEnd.floor - logEnd.scale * 0.1, logEnd.scale * 0.48, logEnd.scale * 0.28);
    g.fillStyle(0xd2ac72);
    g.fillEllipse(logEnd.x, logEnd.floor - logEnd.scale * 0.11, logEnd.scale * 0.4, logEnd.scale * 0.22);
    g.lineStyle(Math.max(1, logEnd.scale * 0.008), 0x967044);
    g.strokeEllipse(logEnd.x, logEnd.floor - logEnd.scale * 0.11, logEnd.scale * 0.25, logEnd.scale * 0.13);
  }
  if (tailProgress !== undefined && tailProgress >= 0 && tailProgress < 1) drawTail(g, pose, tailProgress, reduceMotion);
  drawShoreTrees(g, pose);
}

function drawTail(g: Phaser.GameObjects.Graphics, pose: ViewPose, progress: number, reduceMotion: boolean): void {
  const root = tailSection(progress, 0, reduceMotion);
  const attachment = projectPoint(pose, root);
  if (attachment) {
    const center = attachment.floor - attachment.scale * (root.height + 0.35);
    g.fillStyle(0x304f49);
    g.fillEllipse(attachment.x + attachment.scale * 0.23, center, attachment.scale, attachment.scale * 1.5);
    g.fillStyle(0x496b57);
    g.fillEllipse(attachment.x + attachment.scale * 0.26, center - attachment.scale * 0.08, attachment.scale * 0.85, attachment.scale * 1.28);
  }
  type Edge = { x: number; top: number; bottom: number; radius: number };
  let previous: Edge | undefined;
  for (let segment = 0; segment <= TAIL_SEGMENTS; segment++) {
    const along = segment / TAIL_SEGMENTS;
    const section = tailSection(progress, along, reduceMotion);
    const projected = projectPoint(pose, section);
    if (!projected) { previous = undefined; continue; }
    const center = projected.floor - projected.scale * section.height;
    const radius = projected.scale * section.radius;
    const current = { x: projected.x, top: center - radius, bottom: center + radius, radius };
    if (previous) {
      const band = (upper: number, lower: number, color: number) => {
        g.fillStyle(mixColor(0x304f49, color, Math.min(1, along / 0.18)));
        g.fillPoints([
          { x: previous!.x, y: previous!.top + previous!.radius * 2 * upper },
          { x: current.x, y: current.top + radius * 2 * upper },
          { x: current.x, y: current.top + radius * 2 * lower },
          { x: previous!.x, y: previous!.top + previous!.radius * 2 * lower },
        ], true);
      };
      band(0, 1, 0x304f49);
      band(0.03, 0.23, 0x78865c);
      band(0.23, 0.55, 0x496b57);
      band(0.78, 0.96, 0xa1a075);
      if (segment % 12 < 3 && along < 0.85) band(0.23, 0.68, 0x3b594c);
      if (segment % 9 === 0 && along < 0.78) {
        g.fillStyle(0x617454);
        g.fillPoints([{ x: previous.x, y: previous.top + 1 }, { x: current.x, y: current.top + 1 }, { x: previous.x + (current.x - previous.x) * 0.5, y: current.top - radius * 0.22 }], true);
      }
    }
    previous = current;
  }
}

function drawShoreTrees(g: Phaser.GameObjects.Graphics, pose: ViewPose): void {
  for (const tree of [{ x: TAIL_LOOKOUT.x + 2.55, y: TAIL_LOOKOUT.y + 0.86, width: 0.17 }, { x: TAIL_LOOKOUT.x + 2.58, y: TAIL_LOOKOUT.y - 0.87, width: 0.21 }]) {
    const projected = projectPoint(pose, tree);
    if (!projected || projected.scale > 270) continue;
    const trunkWidth = projected.scale * tree.width;
    const base = projected.floor;
    const top = base - projected.scale * 1.8;
    const left = projected.x - trunkWidth / 2;
    g.fillStyle(0x665a3d);
    g.fillPoints([{ x: left + 4, y: top }, { x: left + trunkWidth - 3, y: top }, { x: left + trunkWidth + 6, y: base }, { x: left - 7, y: base }], true);
    g.fillStyle(0x9b8657);
    g.fillPoints([{ x: left + 5, y: top }, { x: left + trunkWidth * 0.5, y: top }, { x: left + trunkWidth * 0.6, y: base - 5 }, { x: left, y: base - 2 }], true);
    g.lineStyle(Math.max(1, trunkWidth * 0.07), 0x514e36, 0.5);
    g.lineBetween(left + trunkWidth * 0.72, top, left + trunkWidth * 0.8, base - 15);
    g.lineBetween(left + trunkWidth * 0.3, base - projected.scale * 0.8, left + trunkWidth * 0.15, base - 6);
    for (let leaf = 0; leaf < 5; leaf++) {
      g.fillStyle(leaf % 2 ? 0x68884c : 0x8da763);
      g.fillCircle(left - trunkWidth * 0.5 + leaf * trunkWidth * 0.5, base - 3 - Math.sin(leaf * 1.5) * 3, trunkWidth * 0.4);
    }
    for (let crown = 0; crown < 4; crown++) {
      g.fillStyle(crown % 2 ? 0x6f9856 : 0x9abe71);
      g.fillCircle(left + (crown - 1) * trunkWidth * 1.3, top + projected.scale * 0.25 + (crown % 2) * 8, trunkWidth * 1.8);
    }
  }
  for (let cluster = 0; cluster < 6; cluster++) {
    const branch = projectPoint(pose, { x: TAIL_LOOKOUT.x + 2.55, y: TAIL_LOOKOUT.y - 0.9 + cluster * 0.3 });
    if (!branch || branch.scale > 270) continue;
    g.fillStyle(cluster % 2 ? 0x7e9f5c : 0x9abe71);
    g.fillCircle(branch.x, branch.floor - branch.scale * (1.25 + Math.sin(cluster * 2) * 0.05), branch.scale * 0.28);
  }
}
