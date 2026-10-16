import { describe, expect, it } from "vitest";
import { createWorld, type World } from "./world";
import { findWalkPath } from "./navigation";
import { expeditionProgress, isExpeditionComplete } from "./expedition";
import { collectTreasure, createForestTreasure, treasureNear } from "./treasure";

describe("optional forest treasure", () => {
  it("places a reachable treasure away from the player and creatures without changing the forest", () => {
    for (let seed = 1; seed <= 100; seed++) {
      let state = seed;
      const random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
      };
      const world = createWorld(random);
      const before = structuredClone(world);
      const treasure = createForestTreasure(world, random);
      expect(treasure).toBeDefined();
      if (!treasure) continue;
      expect(findWalkPath(world, treasure.position).length).toBeGreaterThan(0);
      expect(treasureNear(treasure, world.player)).toBe(false);
      expect(world.encounters.some(({ position }) => position.x === treasure.position.x && position.y === treasure.position.y)).toBe(false);
      expect(world).toEqual(before);
    }
  });

  it("does not place treasure on an isolated floor or occupied tile", () => {
    const world: World = {
      tiles: [[1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1], [1, 0, 1, 1, 1]],
      player: { x: 1, y: 1 },
      encounters: [{ id: "mossling", position: { x: 3, y: 1 }, discovered: false }],
    };
    expect(createForestTreasure(world)).toBeUndefined();
  });

  it.each([{ x: 4, y: 4 }, { x: 3, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 5 }])("collects once on the same or an adjacent tile $x,$y", (player) => {
    const treasure = { position: { x: 4, y: 4 }, collected: false };
    expect(treasureNear(treasure, player)).toBe(true);
    expect(collectTreasure(treasure, player)).toBe(true);
    expect(treasureNear(treasure, player)).toBe(false);
    expect(collectTreasure(treasure, player)).toBe(false);
  });

  it("rejects distant and diagonal inspection or an absent treasure", () => {
    const treasure = { position: { x: 4, y: 4 }, collected: false };
    expect(collectTreasure(treasure, { x: 3, y: 3 })).toBe(false);
    expect(collectTreasure(treasure, { x: 2, y: 4 })).toBe(false);
    expect(collectTreasure(undefined, { x: 4, y: 4 })).toBe(false);
    expect(treasure.collected).toBe(false);
  });

  it("resets on a new expedition without affecting creature progress or completion", () => {
    const world = createWorld(() => 0.5);
    const treasure = createForestTreasure(world, () => 0);
    const before = expeditionProgress(world.encounters);
    expect(treasure).toBeDefined();
    if (!treasure) return;
    expect(collectTreasure(treasure, treasure.position)).toBe(true);
    expect(expeditionProgress(world.encounters)).toEqual(before);
    expect(isExpeditionComplete(world.encounters)).toBe(false);
    world.encounters.forEach((encounter) => { encounter.discovered = true; });
    expect(isExpeditionComplete(world.encounters)).toBe(true);
    expect(createForestTreasure(world, () => 0)?.collected).toBe(false);
  });
});
