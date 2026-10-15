import { describe, expect, it } from "vitest";
import { CREATURES } from "./creatures";
import { createWorld, encounterAt, hiddenEncounterNear, ENCOUNTERS_PER_EXPEDITION, isSameTile, isWalkable, MAP_HEIGHT, MAP_WIDTH, type Point } from "./world";

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
  it("discovers only when standing on the same tile", () => {
    expect(isSameTile({ x: 5, y: 4 }, { x: 5, y: 4 })).toBe(true);
    expect(isSameTile({ x: 5, y: 4 }, { x: 5, y: 5 })).toBe(false);
    expect(isSameTile({ x: 5, y: 4 }, { x: 4, y: 4 })).toBe(false);
  });

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
      expect(world.encounters).toHaveLength(ENCOUNTERS_PER_EXPEDITION);
      expect(world.encounters.filter((encounter) => encounter.hidden)).toHaveLength(1);
      const positions = new Set(world.encounters.map(({ position }) => `${position.x},${position.y}`));
      expect(positions.size).toBe(ENCOUNTERS_PER_EXPEDITION);
      expect(new Set(world.encounters.map(({ id }) => id)).size).toBe(ENCOUNTERS_PER_EXPEDITION);
      expect(world.encounters.every(({ id }) => CREATURES.some((creature) => creature.id === id))).toBe(true);
      for (const encounter of world.encounters) {
        expect(connected.has(`${encounter.position.x},${encounter.position.y}`)).toBe(true);
        expect(Math.abs(encounter.position.x - world.player.x) + Math.abs(encounter.position.y - world.player.y)).toBeGreaterThan(1);
      }
    }
  });

  it("requires inspection for the hidden creature, and contact for visible ones", () => {
    for (let seed = 0; seed < 50; seed++) {
      const world = createWorld(seededRandom(seed));
      const hidden = world.encounters.find((encounter) => encounter.hidden);
      const visible = world.encounters.find((encounter) => !encounter.hidden);
      expect(hidden).toBeDefined();
      expect(visible).toBeDefined();
      if (!hidden || !visible) continue;
      expect(encounterAt(world, hidden.position)).toBeUndefined();
      expect(hiddenEncounterNear(world, hidden.position)).toBe(hidden);
      expect(encounterAt(world, visible.position)).toBe(visible);
      expect(hiddenEncounterNear(world, visible.position)).toBeUndefined();
      const neighbor = [
        { x: hidden.position.x + 1, y: hidden.position.y },
        { x: hidden.position.x - 1, y: hidden.position.y },
        { x: hidden.position.x, y: hidden.position.y + 1 },
        { x: hidden.position.x, y: hidden.position.y - 1 },
      ].find((point) => isWalkable(world, point));
      expect(neighbor).toBeDefined();
      if (neighbor) expect(hiddenEncounterNear(world, neighbor)).toBe(hidden);
      hidden.discovered = true;
      expect(hiddenEncounterNear(world, hidden.position)).toBeUndefined();
    }
  });

  it("varies the creature lineup between expeditions", () => {
    const lineups = new Set(Array.from({ length: 60 }, (_, seed) =>
      createWorld(seededRandom(seed + 1200)).encounters.map((encounter) => encounter.id).sort().join(","),
    ));
    expect(lineups.size).toBeGreaterThan(1);
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
