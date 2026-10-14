import { CREATURES, type CreatureId } from "./creatures";

export const MAP_WIDTH = 16;
export const MAP_HEIGHT = 11;
export const TILE_SIZE = 40;
export type Point = { x: number; y: number };
export type Encounter = { id: CreatureId; position: Point; discovered: boolean };
export type World = { tiles: number[][]; player: Point; encounters: Encounter[] };

export function createWorld(): World {
  const tiles = Array.from({ length: MAP_HEIGHT }, (_, y) =>
    Array.from({ length: MAP_WIDTH }, (_, x) =>
      x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1 ? 1 : 0,
    ),
  );
  const player = { x: 2, y: 2 };
  // Every creature appears once per forest, at non-overlapping positions.
  const spaces: Point[] = [];
  for (let y = 2; y < MAP_HEIGHT - 1; y++) {
    for (let x = 4; x < MAP_WIDTH - 1; x++) spaces.push({ x, y });
  }
  for (let i = spaces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spaces[i], spaces[j]] = [spaces[j], spaces[i]];
  }
  const encounters = CREATURES.map((creature, index) => ({
    id: creature.id,
    position: spaces[index],
    discovered: false,
  }));
  return { tiles, player, encounters };
}

export function isWalkable(world: World, position: Point): boolean {
  return world.tiles[position.y]?.[position.x] === 0;
}

export function isNear(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 1;
}
