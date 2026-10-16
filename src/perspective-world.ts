import type { Point } from "./world";

export const PROTOTYPE_MAP = [
  "###########",
  "####.....##",
  "####.###.##",
  "##...###.##",
  "##.#####.##",
  "##.......##",
  "##.########",
  "##.########",
  "###########",
] as const;
export const FOOTPRINT: Readonly<Point> = { x: 2, y: 5 };
export const TAIL_LOOKOUT: Readonly<Point> = { x: 2, y: 4 };
export const HEADINGS = ["北", "東", "南", "西"] as const;
export const FACING_VECTORS: readonly Point[] = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
];
export type ExplorationAction = "forward" | "backward" | "left" | "right";
export type PerspectiveState = {
  player: Point;
  heading: number;
  visited: Set<string>;
  inspectedFootprint: boolean;
  witnessedTail: boolean;
};

export function tileKey(point: Point): string { return `${point.x},${point.y}`; }

export function isPrototypeFloor(point: Point): boolean {
  return PROTOTYPE_MAP[point.y]?.[point.x] === ".";
}

export function createPerspectiveState(): PerspectiveState {
  const player = { x: 2, y: 7 };
  return { player, heading: 0, visited: new Set([tileKey(player)]), inspectedFootprint: false, witnessedTail: false };
}

export function applyExplorationAction(state: PerspectiveState, action: ExplorationAction): boolean {
  if (action === "left" || action === "right") {
    state.heading = (state.heading + (action === "right" ? 1 : 3)) % 4;
    return true;
  }
  const vector = FACING_VECTORS[state.heading];
  const sign = action === "forward" ? 1 : -1;
  const next = { x: state.player.x + vector.x * sign, y: state.player.y + vector.y * sign };
  if (!isPrototypeFloor(next)) return false;
  state.player = next;
  state.visited.add(tileKey(next));
  return true;
}

export function footprintInReach(state: PerspectiveState): boolean {
  const vector = FACING_VECTORS[state.heading];
  return (state.player.x === FOOTPRINT.x && state.player.y === FOOTPRINT.y) ||
    (state.player.x + vector.x === FOOTPRINT.x && state.player.y + vector.y === FOOTPRINT.y);
}

export function inspectFootprint(state: PerspectiveState): boolean {
  if (!footprintInReach(state)) return false;
  state.inspectedFootprint = true;
  return true;
}

export function canWitnessTail(state: PerspectiveState): boolean {
  return !state.witnessedTail && state.heading === 0 &&
    state.player.x === TAIL_LOOKOUT.x && state.player.y === TAIL_LOOKOUT.y;
}

export function knownMapCells(state: PerspectiveState): { position: Point; floor: boolean }[] {
  const known = new Map<string, { position: Point; floor: boolean }>();
  for (const key of state.visited) {
    const [horizontal, vertical] = key.split(",").map(Number);
    const position = { x: horizontal, y: vertical };
    known.set(key, { position, floor: true });
    for (const vector of FACING_VECTORS) {
      const neighbor = { x: horizontal + vector.x, y: vertical + vector.y };
      if (!isPrototypeFloor(neighbor)) known.set(tileKey(neighbor), { position: neighbor, floor: false });
    }
  }
  return [...known.values()];
}

export type ViewPose = { x: number; y: number; angle: number };
export type WallHit = { distance: number; side: "vertical" | "horizontal"; offset: number };

export function wallHit(pose: ViewPose, angle: number): WallHit {
  const directionX = Math.sin(angle);
  const directionY = -Math.cos(angle);
  let tileX = Math.floor(pose.x);
  let tileY = Math.floor(pose.y);
  const deltaX = directionX === 0 ? Infinity : Math.abs(1 / directionX);
  const deltaY = directionY === 0 ? Infinity : Math.abs(1 / directionY);
  const stepX = directionX < 0 ? -1 : 1;
  const stepY = directionY < 0 ? -1 : 1;
  let nextX = (directionX < 0 ? pose.x - tileX : tileX + 1 - pose.x) * deltaX;
  let nextY = (directionY < 0 ? pose.y - tileY : tileY + 1 - pose.y) * deltaY;
  for (let index = 0; index < 64; index++) {
    const vertical = nextX < nextY;
    const distance = vertical ? nextX : nextY;
    if (vertical) { tileX += stepX; nextX += deltaX; }
    else { tileY += stepY; nextY += deltaY; }
    if (!isPrototypeFloor({ x: tileX, y: tileY })) {
      const along = vertical ? pose.y + directionY * distance : pose.x + directionX * distance;
      return { distance, side: vertical ? "vertical" : "horizontal", offset: along - Math.floor(along) };
    }
  }
  return { distance: 64, side: "horizontal", offset: 0 };
}
