import { CREATURES, type CreatureId } from "./creatures";

export const MAP_WIDTH = 16;
export const MAP_HEIGHT = 11;
export const TILE_SIZE = 40;
export type Point = { x: number; y: number };
export type Encounter = { id: CreatureId; position: Point; discovered: boolean };
export type World = { tiles: number[][]; player: Point; encounters: Encounter[] };
type Room = { x: number; y: number; width: number; height: number; center: Point };
const DIRECTIONS: readonly Point[] = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
];

function randomInt(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function distance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** All floor tiles are carved from one connected starting room. */
export function createWorld(random: () => number = Math.random): World {
  const tiles = Array.from({ length: MAP_HEIGHT }, () => Array<number>(MAP_WIDTH).fill(1));
  const carve = (x: number, y: number): void => {
    // Keep the outer ring solid, so the player cannot leave the screen.
    if (x > 0 && x < MAP_WIDTH - 1 && y > 0 && y < MAP_HEIGHT - 1) tiles[y][x] = 0;
  };
  const rooms: Room[] = [];
  const addRoom = (x: number, y: number, width: number, height: number): Room => {
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) carve(col, row);
    }
    const room: Room = { x, y, width, height, center: {
      x: x + Math.floor(width / 2), y: y + Math.floor(height / 2),
    } };
    rooms.push(room);
    return room;
  };
  // A predictable, open starting area keeps the first few steps easy for children.
  addRoom(1, 1, 5, 4);
  const player = { ...rooms[0].center };

  const connect = (a: Point, b: Point): void => {
    let { x, y } = a;
    // Vary corridor shape while guaranteeing both end points are connected.
    if (random() < 0.5) {
      while (x !== b.x) { x += Math.sign(b.x - x); carve(x, y); }
      while (y !== b.y) { y += Math.sign(b.y - y); carve(x, y); }
    } else {
      while (y !== b.y) { y += Math.sign(b.y - y); carve(x, y); }
      while (x !== b.x) { x += Math.sign(b.x - x); carve(x, y); }
    }
  };

  const roomCount = randomInt(4, 6, random);
  for (let i = 1; i < roomCount; i++) {
    const width = randomInt(3, 5, random);
    const height = randomInt(3, 4, random);
    const x = randomInt(1, MAP_WIDTH - width - 1, random);
    const y = randomInt(1, MAP_HEIGHT - height - 1, random);
    const room = addRoom(x, y, width, height);
    connect(rooms[i - 1].center, room.center);
  }

  // BFS distances ensure encounters are reachable and away from the start.
  const distances = Array.from({ length: MAP_HEIGHT }, () => Array<number>(MAP_WIDTH).fill(-1));
  const queue: Point[] = [player];
  distances[player.y][player.x] = 0;
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    for (const step of DIRECTIONS) {
      const nx = at.x + step.x;
      const ny = at.y + step.y;
      if (tiles[ny]?.[nx] !== 0 || distances[ny][nx] !== -1) continue;
      distances[ny][nx] = distances[at.y][at.x] + 1;
      queue.push({ x: nx, y: ny });
    }
  }

  // Pick different positions without blocking paths. Prefer spaced-out creatures.
  const candidates = queue.filter((point) => distances[point.y][point.x] >= 4);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = randomInt(0, i, random);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  candidates.sort((a, b) => distances[b.y][b.x] - distances[a.y][a.x]);
  const selected: Point[] = [];
  for (const point of candidates) {
    if (selected.every((other) => distance(other, point) >= 3)) selected.push(point);
    if (selected.length === CREATURES.length) break;
  }
  // A rare compact layout may lack three well-separated spots.
  for (const point of queue) {
    if (selected.length === CREATURES.length) break;
    if (distances[point.y][point.x] >= 2 && !selected.some((other) => distance(other, point) === 0)) {
      selected.push(point);
    }
  }
  const encounters: Encounter[] = CREATURES.map((creature, index) => ({
    id: creature.id,
    position: selected[index] ?? player,
    discovered: false,
  }));
  return { tiles, player, encounters };
}

export function isWalkable(world: World, position: Point): boolean {
  return world.tiles[position.y]?.[position.x] === 0;
}

export function isNear(a: Point, b: Point): boolean {
  return distance(a, b) <= 1;
}
