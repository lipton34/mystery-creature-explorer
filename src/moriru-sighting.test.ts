import { describe, expect, it } from "vitest";
import type Phaser from "phaser";
import { SIGHTING_DURATION, tailSection, TAIL_SEGMENTS } from "./moriru-sighting";
import { drawPerspective, projectPoint } from "./perspective-renderer";

const LOOKOUT_POSE = { x: 5.5, y: 7.5, angle: Math.PI / 2 };

describe("sideways large Moriru sighting", () => {
  it("moves parallel to the opposite shore without receding or shrinking", () => {
    const sections = [0.4, 0.45, 0.5, 0.55].map((progress) => tailSection(progress, 0.4));
    const projected = sections.map((section) => projectPoint(LOOKOUT_POSE, section)!);
    expect(projected.every(Boolean)).toBe(true);
    for (let index = 1; index < projected.length; index++) {
      expect(projected[index].x).toBeLessThan(projected[index - 1].x);
      expect(projected[index].scale).toBeCloseTo(projected[0].scale);
      expect(projected[index].floor).toBeCloseTo(projected[0].floor);
      expect(sections[index].radius).toBe(sections[0].radius);
      expect(sections[index].x).toBe(sections[0].x);
    }
  });

  it("has a muscular base and a continuously tapering, uncurled tip", () => {
    const base = tailSection(0.4, 0);
    const tip = tailSection(0.4, 1);
    expect(base.radius).toBeGreaterThan(0.25);
    expect(base.radius / tip.radius).toBeGreaterThan(30);
    expect(tip.y - base.y).toBeCloseTo(2.35);
    let previous = base;
    for (let segment = 1; segment <= TAIL_SEGMENTS; segment++) {
      const current = tailSection(0.4, segment / TAIL_SEGMENTS);
      expect(current.y).toBeGreaterThan(previous.y);
      expect(current.radius).toBeLessThan(previous.radius);
      expect(current.height - current.radius).toBeGreaterThan(0);
      previous = current;
    }
  });

  it("lets the base pass a tree before the trailing tip", () => {
    const treeY = 6.13;
    const basePassing = (9.1 - treeY) / 6.5;
    const tipPassing = (9.1 + 2.35 - treeY) / 6.5;
    expect(basePassing).toBeGreaterThan(0);
    expect(tipPassing).toBeLessThan(1);
    expect(tipPassing - basePassing).toBeGreaterThan(0.3);
    expect(tailSection(basePassing, 0).y).toBeCloseTo(treeY);
    expect(tailSection(tipPassing, 1).y).toBeCloseTo(treeY);
    expect(SIGHTING_DURATION).toBe(5200);
  });

  it("removes secondary sway for reduced motion while preserving horizontal travel", () => {
    for (const along of [0, 0.3, 0.7, 1]) {
      const first = tailSection(0.2, along, true);
      const last = tailSection(0.7, along, true);
      expect(first.height).toBe(last.height);
      expect(first.radius).toBe(last.radius);
      expect(first.x).toBe(last.x);
      expect(first.y).toBeGreaterThan(last.y);
    }
  });

  it("draws the tail behind the shore trees and only during the sighting", () => {
    const fills = (progress?: number, pose = LOOKOUT_POSE) => {
      const colors: number[] = [];
      const graphics = new Proxy({}, { get: (_target, property) => (...args: unknown[]) => {
        if (property === "fillStyle") colors.push(args[0] as number);
      } }) as Phaser.GameObjects.Graphics;
      drawPerspective(graphics, pose, progress);
      return colors;
    };
    const colors = fills(0.45);
    expect(colors).toContain(0x304f49);
    expect(colors).toContain(0x78865c);
    expect(colors.lastIndexOf(0x304f49)).toBeLessThan(colors.indexOf(0x665a3d));
    for (const progress of [undefined, -0.1, 1, 1.1]) expect(fills(progress)).not.toContain(0x304f49);
    expect(fills(0.45, { x: 2.5, y: 8.5, angle: 0 })).not.toContain(0x304f49);
  });
});
