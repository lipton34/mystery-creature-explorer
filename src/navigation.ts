import { isWalkable, MAP_HEIGHT, MAP_WIDTH, type Point, type World } from "./world";

export function mapPointAt(client: Point, bounds: { left: number; top: number; width: number; height: number }): Point | null {
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const horizontal = (client.x - bounds.left) / bounds.width;
  const vertical = (client.y - bounds.top) / bounds.height;
  if (horizontal < 0 || horizontal >= 1 || vertical < 0 || vertical >= 1) return null;
  return { x: Math.floor(horizontal * MAP_WIDTH), y: Math.floor(vertical * MAP_HEIGHT) };
}

export function findWalkPath(world: World, destination: Point): Point[] {
  if (!Number.isInteger(destination.x) || !Number.isInteger(destination.y) || !isWalkable(world, destination)) return [];
  const key = (point: Point): string => `${point.x},${point.y}`;
  const origin = key(world.player);
  const parents = new Map<string, Point | null>([[origin, null]]);
  const queue: Point[] = [world.player];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (key(current) === key(destination)) {
      const path: Point[] = [];
      let cursor = current;
      while (key(cursor) !== origin) {
        path.push(cursor);
        cursor = parents.get(key(cursor))!;
      }
      return path.reverse();
    }
    for (const offset of [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }]) {
      const next = { x: current.x + offset.x, y: current.y + offset.y };
      if (!isWalkable(world, next) || parents.has(key(next))) continue;
      parents.set(key(next), current);
      queue.push(next);
    }
  }
  return [];
}
