import { findWalkPath } from "./navigation";
import { isSameTile, type Point, type World } from "./world";

export type ForestTreasure = { position: Point; collected: boolean };

export function createForestTreasure(world: World, random: () => number = Math.random): ForestTreasure | undefined {
  const candidates: Point[] = [];
  for (const [rowIndex, row] of world.tiles.entries()) {
    for (const [columnIndex, tile] of row.entries()) {
      const point = { x: columnIndex, y: rowIndex };
      if (tile !== 0 || Math.abs(point.x - world.player.x) + Math.abs(point.y - world.player.y) < 2) continue;
      if (world.encounters.some((encounter) => isSameTile(encounter.position, point))) continue;
      if (findWalkPath(world, point).length) candidates.push(point);
    }
  }
  if (!candidates.length) return undefined;
  return { position: candidates[Math.floor(random() * candidates.length)], collected: false };
}

export function treasureNear(treasure: ForestTreasure | undefined, player: Point): boolean {
  return Boolean(treasure && !treasure.collected &&
    Math.abs(treasure.position.x - player.x) + Math.abs(treasure.position.y - player.y) <= 1);
}

export function collectTreasure(treasure: ForestTreasure | undefined, player: Point): boolean {
  if (!treasure || !treasureNear(treasure, player)) return false;
  treasure.collected = true;
  return true;
}
