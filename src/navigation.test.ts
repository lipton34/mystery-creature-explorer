import { describe, expect, it } from "vitest";
import { findWalkPath, mapPointAt } from "./navigation";
import { isWalkable, MAP_WIDTH, MAP_HEIGHT, type World } from "./world";

function world(): World {
  return {
    tiles: [[1, 1, 1, 1, 1], [1, 0, 1, 0, 1], [1, 0, 1, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]],
    player: { x: 1, y: 1 },
    encounters: [{ id: "mossling", position: { x: 3, y: 1 }, discovered: false }],
  };
}

describe("destination navigation", () => {
  it("walks around walls using only adjacent floor tiles without changing game state", () => {
    const forest = world();
    const before = structuredClone(forest);
    const path = findWalkPath(forest, { x: 3, y: 1 });
    expect(path).toHaveLength(6);
    expect(path.at(-1)).toEqual({ x: 3, y: 1 });
    let previous = forest.player;
    for (const point of path) {
      expect(isWalkable(forest, point)).toBe(true);
      expect(Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)).toBe(1);
      previous = point;
    }
    expect(forest).toEqual(before);
  });

  it("chooses a shortest route in an open area", () => {
    const forest = world();
    forest.tiles[1][2] = 0;
    expect(findWalkPath(forest, { x: 3, y: 1 })).toHaveLength(2);
  });

  it.each([{ x: 0, y: 0 }, { x: -1, y: 1 }, { x: 99, y: 99 }, { x: 1.5, y: 1 }, { x: NaN, y: 1 }])("rejects non-floor or invalid destinations $x,$y", (destination) => {
    expect(findWalkPath(world(), destination)).toEqual([]);
  });

  it("does not move when the player is selected", () => {
    expect(findWalkPath(world(), { x: 1, y: 1 })).toEqual([]);
  });

  it("rejects a floor tile disconnected from the player", () => {
    const forest = world();
    forest.tiles[3][2] = 1;
    expect(findWalkPath(forest, { x: 3, y: 1 })).toEqual([]);
  });
});

describe("map pointer coordinates", () => {
  it.each([320, 640, 1024])("maps the same tile correctly at canvas width %i", (width) => {
    const height = width * MAP_HEIGHT / MAP_WIDTH;
    expect(mapPointAt({ x: 30 + width * 3.5 / MAP_WIDTH, y: 90 + height * 4.5 / MAP_HEIGHT }, { left: 30, top: 90, width, height })).toEqual({ x: 3, y: 4 });
  });

  it("includes the first pixel and excludes the right and bottom edges", () => {
    const bounds = { left: 20, top: 30, width: 640, height: 440 };
    expect(mapPointAt({ x: 20, y: 30 }, bounds)).toEqual({ x: 0, y: 0 });
    for (const point of [{ x: 19, y: 30 }, { x: 660, y: 30 }, { x: 20, y: 470 }]) {
      expect(mapPointAt(point, bounds)).toBeNull();
    }
  });

  it("ignores a canvas that has no size", () => {
    expect(mapPointAt({ x: 0, y: 0 }, { left: 0, top: 0, width: 0, height: 0 })).toBeNull();
  });
});
