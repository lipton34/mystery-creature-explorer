import { describe, expect, it } from "vitest";
import { CREATURES } from "./creatures";
import { createWorld, isWalkable, MAP_HEIGHT, MAP_WIDTH, type Point } from "./world";

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function reachable(world: ReturnType<typeof createWorld>): Set<string> {
  const visited = new Set<string>();
  const queue: Point[] = [world.player];
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    const key = `${at.x},${at.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const next = { x: at.x + dx, y: at.y + dy };
      if (isWalkable(world, next) && !visited.has(`${next.x},${next.y}`)) queue.push(next);
    }
  }
  return visited;
}

describe("random forest layout", () => {
  it("keeps all floors connected, creatures reachable, and the border closed", () => {
    for (let seed = 0; seed < 300; seed++) {
      const world = createWorld(seededRandom(seed));
      const connected = reachable(world);
      expect(connected.has(`${world.player.x},${world.player.y}`)).toBe(true);
      const allFloors = world.tiles.flat().filter((tile) => tile === 0).length;
      expect(connected.size).toBe(allFloors);
      expect(world.tiles.length).toBe(MAP_HEIGHT);
      expect(world.tiles.every((row) => row.length === MAP_WIDTH)).toBe(true);
      for (let x = 0; x < MAP_WIDTH; x++) {
        expect(world.tiles[0][x]).toBe(1);
        expect(world.tiles[MAP_HEIGHT - 1][x]).toBe(1);
      }
      for (let y = 0; y < MAP_HEIGHT; y++) {
        expect(world.tiles[y][0]).toBe(1);
        expect(world.tiles[y][MAP_WIDTH - 1]).toBe(1);
      }
      expect(world.encounters).toHaveLength(CREATURES.length);
      const positions = new Set(world.encounters.map(({ position }) => `${position.x},${position.y}`));
      expect(positions.size).toBe(CREATURES.length);
      for (const encounter of world.encounters) {
        expect(connected.has(`${encounter.position.x},${encounter.position.y}`)).toBe(true);
        expect(Math.abs(encounter.position.x - world.player.x) + Math.abs(encounter.position.y - world.player.y)).toBeGreaterThan(1);
      }
    }
  });

  it("changes layout across different seeds and reproduces the same seed", () => {
    const first = createWorld(seededRandom(42));
    expect(createWorld(seededRandom(42))).toEqual(first);
    const shapes = new Set(Array.from({ length: 15 }, (_, seed) =>
      createWorld(seededRandom(seed)).tiles.map((row) => row.join("")).join("|"),
    ));
    expect(shapes.size).toBeGreaterThan(1);
  });
});
