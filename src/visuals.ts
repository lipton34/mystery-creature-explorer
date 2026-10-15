import Phaser from "phaser";
import { TILE_SIZE, type Point } from "./world";
import type { CreatureDefinition } from "./creatures";

/** Temporary vector art. No external assets needed while gameplay is evolving. */
export function drawAnimatedCreature(
  g: Phaser.GameObjects.Graphics,
  creature: CreatureDefinition,
  point: Point,
  seconds: number,
): void {
  const cx = point.x * TILE_SIZE + TILE_SIZE / 2;
  const bottom = point.y * TILE_SIZE + TILE_SIZE - 7;
  const phase = seconds * (creature.id === "pufflet" ? 2.9 : 3.6) + point.x;
  const bob = Math.sin(phase) * (creature.id === "pufflet" ? 4 : 2);
  const cy = bottom - 11 + bob;

  g.fillStyle(0x193a30, 0.46);
  g.fillEllipse(cx, bottom + 3, 27 - bob, 6);
  if (creature.id === "mossling") {
    g.fillStyle(0x5d9852);
    g.fillEllipse(cx - 8, cy - 8, 9, 16);
    g.fillEllipse(cx + 8, cy - 9, 9, 16);
    g.fillStyle(creature.color);
    g.fillEllipse(cx, cy + 1, 29, 24);
    g.fillStyle(0x4d8846);
    g.fillEllipse(cx, cy - 11, 18, 8);
  } else if (creature.id === "pufflet") {
    g.fillStyle(creature.accent, 0.85);
    g.fillCircle(cx - 12, cy - 2, 9);
    g.fillCircle(cx + 12, cy - 2, 9);
    g.fillStyle(creature.color);
    g.fillCircle(cx, cy, 14);
    g.fillCircle(cx - 7, cy - 7, 8);
    g.fillCircle(cx + 7, cy - 7, 8);
    g.fillStyle(0xfff4f3);
    g.fillCircle(cx - 5, cy - 8, 3);
  } else if (creature.id === "droplet") {
    g.fillStyle(creature.accent, 0.8);
    g.fillTriangle(cx, cy - 17, cx - 12, cy + 2, cx + 12, cy + 2);
    g.fillStyle(creature.color);
    g.fillEllipse(cx, cy + 4, 26, 24);
    g.fillStyle(0xe8fbff, 0.8);
    g.fillCircle(cx - 7, cy - 1, 3);
  } else if (creature.id === "acorn") {
    g.fillStyle(creature.color);
    g.fillEllipse(cx, cy + 4, 24, 27);
    g.fillStyle(creature.accent);
    g.fillEllipse(cx, cy - 9, 30, 13);
    g.fillRect(cx - 2, cy - 18, 4, 7);
    g.fillStyle(0xf1d5ac, 0.75);
    g.fillEllipse(cx - 6, cy + 4, 5, 9);
  } else {
    const pulse = (Math.sin(seconds * 4 + point.y) + 1) / 2;
    g.fillStyle(0xffee9c, 0.08 + pulse * 0.13);
    g.fillCircle(cx, cy, 19);
    g.fillStyle(creature.color);
    g.fillEllipse(cx, cy + 1, 26, 27);
    g.fillStyle(creature.accent);
    g.fillTriangle(cx, cy - 18, cx - 8, cy - 6, cx + 8, cy - 6);
    g.fillStyle(0xffffff, 0.6 + pulse * 0.3);
    g.fillCircle(cx + 9, cy - 10, 2);
  }

  g.fillStyle(0x27332c);
  g.fillCircle(cx - 5, cy + 2, 2);
  g.fillCircle(cx + 5, cy + 2, 2);
  g.lineStyle(1.5, 0x7a5253, 0.9);
  g.beginPath();
  g.arc(cx, cy + 5, 3, 0.1, Math.PI - 0.1);
  g.strokePath();
}

/** Short, cheerful sparkles drawn over the discovered creature. */
export function drawDiscoverySparkles(
  g: Phaser.GameObjects.Graphics,
  point: Point,
  elapsedMs: number,
): void {
  const progress = Math.min(elapsedMs / 1050, 1);
  const cx = point.x * TILE_SIZE + 20;
  const cy = point.y * TILE_SIZE + 19;
  const opacity = Math.max(0, 1 - progress);
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const radius = 8 + 25 * progress;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius - 8 * progress;
    const size = (i % 3 === 0 ? 4 : 2.5) * (1 - 0.5 * progress);
    g.fillStyle(i % 2 === 0 ? 0xffe38a : 0xffffff, opacity);
    g.fillCircle(x, y, size);
  }
}
