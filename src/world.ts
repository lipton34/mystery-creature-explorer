export const MAP_WIDTH = 16;
export const MAP_HEIGHT = 11;
export const TILE_SIZE = 40;
export type Point = { x: number; y: number };
export type World = { tiles: number[][]; player: Point; creature: Point };

export function createWorld(): World {
  const tiles = Array.from({ length: MAP_HEIGHT }, (_, y) =>
    Array.from({ length: MAP_WIDTH }, (_, x) =>
      x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1 ? 1 : 0,
    ),
  );
  // 通路が成立するよう、まずは障害物なしのシンプルな部屋。
  // 装飾だけをランダムに変えて、移動不能なマップを生成しない。
  const player = { x: 2, y: 2 };
  const creature = { x: 5 + Math.floor(Math.random() * 9), y: 2 + Math.floor(Math.random() * 7) };
  return { tiles, player, creature };
}

export function isWalkable(world: World, position: Point): boolean {
  return world.tiles[position.y]?.[position.x] === 0;
}

export function isNear(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 1;
}
