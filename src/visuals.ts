import type Phaser from "phaser";
import { TILE_SIZE, type Point } from "./world";

export function drawForestTile(g: Phaser.GameObjects.Graphics, point: Point, wall: boolean): void {
  const left = point.x * TILE_SIZE;
  const top = point.y * TILE_SIZE;
  const variation = (point.x * 13 + point.y * 7) % 5;
  g.fillStyle(wall ? 0x52765b : variation === 0 ? 0xc7d5a2 : 0xd4ddb1);
  g.fillRect(left, top, TILE_SIZE, TILE_SIZE);
  if (wall) {
    g.fillStyle(0x365848, 0.4);
    g.fillEllipse(left + 20, top + 34, 36, 9);
    g.fillStyle(0x81684c);
    g.fillRoundedRect(left + 17, top + 20, 7, 17, 3);
    g.lineStyle(2, 0x365848);
    g.fillStyle(0x6e976a);
    g.fillRoundedRect(left + 3, top + 6, 34, 25, 12);
    g.strokeRoundedRect(left + 3, top + 6, 34, 25, 12);
    g.fillStyle(0x94b77c);
    g.fillEllipse(left + 16, top + 12, 21, 11);
    g.fillStyle(0xc7d5a2, 0.7);
    g.fillEllipse(left + 11, top + 10, 5, 3);
  } else {
    g.lineStyle(1.5, 0xa6bb88, 0.7);
    g.beginPath();
    g.moveTo(left + 5, top + 31);
    g.lineTo(left + 7, top + 27);
    g.lineTo(left + 9, top + 31);
    g.strokePath();
    if (variation === 0) {
      g.fillStyle(0xf8f0d0);
      g.fillCircle(left + 29, top + 15, 3);
      g.fillStyle(0xd4ad69);
      g.fillCircle(left + 29, top + 15, 1.2);
    }
  }
}

export function drawForestTreasure(g: Phaser.GameObjects.Graphics, point: Point): void {
  const centerX = point.x * TILE_SIZE + 20;
  const centerY = point.y * TILE_SIZE + 22;
  g.fillStyle(0x365848, 0.2);
  g.fillEllipse(centerX, centerY + 9, 25, 6);
  g.fillStyle(0xffe38a);
  g.beginPath();
  g.moveTo(centerX - 13, centerY + 8);
  g.lineTo(centerX - 10, centerY - 3);
  g.lineTo(centerX - 3, centerY - 8);
  g.lineTo(centerX + 13, centerY - 8);
  g.lineTo(centerX + 10, centerY + 3);
  g.lineTo(centerX + 3, centerY + 8);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, 0x98703c);
  g.strokePath();
  g.lineBetween(centerX - 15, centerY + 10, centerX + 9, centerY - 5);
  g.lineBetween(centerX - 2, centerY + 2, centerX - 4, centerY - 4);
  g.lineStyle(2, 0xfff9e9);
  g.lineBetween(centerX + 12, centerY - 15, centerX + 12, centerY - 7);
  g.lineBetween(centerX + 8, centerY - 11, centerX + 16, centerY - 11);
}

export function drawDiscoverySparkles(
  g: Phaser.GameObjects.Graphics,
  point: Point,
  elapsedMs: number,
): void {
  const progress = Math.min(elapsedMs / 1050, 1);
  const cx = point.x * TILE_SIZE + 20;
  const cy = point.y * TILE_SIZE + 19;
  const opacity = Math.max(0, 1 - progress);
  for (let index = 0; index < 9; index++) {
    const angle = (index / 9) * Math.PI * 2;
    const radius = 8 + 25 * progress;
    const left = cx + Math.cos(angle) * radius;
    const top = cy + Math.sin(angle) * radius - 8 * progress;
    const size = (index % 3 === 0 ? 4 : 2.5) * (1 - 0.5 * progress);
    g.fillStyle(index % 2 === 0 ? 0xffe38a : 0xffffff, opacity);
    g.fillCircle(left, top, size);
  }
}
