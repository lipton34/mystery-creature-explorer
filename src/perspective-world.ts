import type { Point } from "./world";

export const PROTOTYPE_MAP = [
  "##################",
  "#########~~#######",
  "########LLLL..####",
  "########.~~##.####",
  "########.~~##.####",
  "########.~~##.####",
  "#######..~~##...##",
  "#######.#~~####.##",
  "#######.#~~####.##",
  "###.....#~~#######",
  "#####.###~~#######",
  "#####.############",
  "##....############",
  "##.###############",
  "##.###############",
  "##.###############",
  "##.###############",
  "##.###############",
  "##.###############",
  "##################",
] as const;
export const STAGE_START: Readonly<Point> = { x: 2, y: 18 };
export const IMPACT_POINT: Readonly<Point> = { x: 2, y: 12 };
export const CALL_POINT: Readonly<Point> = { x: 7, y: 9 };
export const RIVER_GLIMPSE: Readonly<Point> = { x: 7, y: 6 };
export const FOOTPRINT: Readonly<Point> = { x: 3, y: 9 };
export const TAIL_LOOKOUT: Readonly<Point> = { x: 8, y: 6 };
export const TAIL_HEADING = 1;
export const LOG_APPROACH: Readonly<Point> = { x: 8, y: 3 };
export const FAR_BANK: Readonly<Point> = { x: 11, y: 2 };
export const DISCOVERY_POINT: Readonly<Point> = { x: 15, y: 8 };
export const HEADINGS = ["北", "東", "南", "西"] as const;
export const FACING_VECTORS: readonly Point[] = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
];
export type ExplorationAction = "forward" | "backward" | "left" | "right" | "strafe-left" | "strafe-right";
export type PerspectiveState = {
  player: Point;
  heading: number;
  visited: Set<string>;
  inspectedFootprint: boolean;
  witnessedTail: boolean;
  inspectedLog: boolean;
  crossedStream: boolean;
  heardImpact: boolean;
  heardCall: boolean;
  discoveredGiant: boolean;
};

export function tileKey(point: Point): string { return `${point.x},${point.y}`; }

export function isPrototypeFloor(point: Point): boolean {
  return [".", "L"].includes(PROTOTYPE_MAP[point.y]?.[point.x] ?? "#");
}

export function terrainAt(point: Point): "path" | "trees" | "water" | "log" {
  const tile = PROTOTYPE_MAP[point.y]?.[point.x];
  return tile === "." ? "path" : tile === "~" ? "water" : tile === "L" ? "log" : "trees";
}

export function createPerspectiveState(): PerspectiveState {
  const player = { ...STAGE_START };
  return { player, heading: 0, visited: new Set([tileKey(player)]), inspectedFootprint: false, witnessedTail: false, inspectedLog: false, crossedStream: false, heardImpact: false, heardCall: false, discoveredGiant: false };
}

export function explorationDestination(state: PerspectiveState, action: ExplorationAction): Point | undefined {
  if (action === "left" || action === "right") return undefined;
  const heading = action === "strafe-left" ? (state.heading + 3) % 4 : action === "strafe-right" ? (state.heading + 1) % 4 : state.heading;
  const vector = FACING_VECTORS[heading];
  const sign = action === "backward" ? -1 : 1;
  return { x: state.player.x + vector.x * sign, y: state.player.y + vector.y * sign };
}

export function applyExplorationAction(state: PerspectiveState, action: ExplorationAction): boolean {
  if (action === "left" || action === "right") {
    state.heading = (state.heading + (action === "right" ? 1 : 3)) % 4;
    return true;
  }
  const next = explorationDestination(state, action);
  if (!next || !isPrototypeFloor(next)) return false;
  state.player = next;
  state.visited.add(tileKey(next));
  if (next.x >= FAR_BANK.x) state.crossedStream = true;
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
  return !state.witnessedTail && state.heading === TAIL_HEADING &&
    state.player.x === TAIL_LOOKOUT.x && state.player.y === TAIL_LOOKOUT.y;
}

export type StageEvent = "impact" | "call" | "tail" | "discovery";

export function takeStageEvent(state: PerspectiveState): StageEvent | undefined {
  const at = (point: Readonly<Point>) => state.player.x === point.x && state.player.y === point.y;
  if (at(IMPACT_POINT) && !state.heardImpact) { state.heardImpact = true; return "impact"; }
  if (at(CALL_POINT) && !state.heardCall) { state.heardCall = true; return "call"; }
  if (canWitnessTail(state)) { state.witnessedTail = true; return "tail"; }
  if (at(DISCOVERY_POINT) && state.heading === 2 && !state.discoveredGiant) { state.discoveredGiant = true; return "discovery"; }
  return undefined;
}

export function giantInView(pose: ViewPose): boolean {
  const angle = Math.atan2(Math.sin(pose.angle - Math.PI), Math.cos(pose.angle - Math.PI));
  return Math.abs(pose.x - DISCOVERY_POINT.x - 0.5) < 0.1 && Math.abs(pose.y - DISCOVERY_POINT.y - 0.5) < 0.1 && Math.abs(angle) < 0.5;
}

export function inspectionTarget(state: PerspectiveState): "footprint" | "log" | "water" | undefined {
  if (footprintInReach(state)) return "footprint";
  const vector = FACING_VECTORS[state.heading];
  const ahead = { x: state.player.x + vector.x, y: state.player.y + vector.y };
  if (terrainAt(state.player) === "log" || terrainAt(ahead) === "log") return "log";
  if (terrainAt(ahead) === "water") return "water";
  return undefined;
}

export function knownMapCells(state: PerspectiveState): { position: Point; floor: boolean; terrain: ReturnType<typeof terrainAt> }[] {
  const known = new Map<string, { position: Point; floor: boolean; terrain: ReturnType<typeof terrainAt> }>();
  for (const key of state.visited) {
    const [horizontal, vertical] = key.split(",").map(Number);
    const position = { x: horizontal, y: vertical };
    known.set(key, { position, floor: true, terrain: terrainAt(position) });
    for (const vector of FACING_VECTORS) {
      const neighbor = { x: horizontal + vector.x, y: vertical + vector.y };
      if (!isPrototypeFloor(neighbor)) known.set(tileKey(neighbor), { position: neighbor, floor: false, terrain: terrainAt(neighbor) });
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
    if (terrainAt({ x: tileX, y: tileY }) === "trees") {
      const along = vertical ? pose.y + directionY * distance : pose.x + directionX * distance;
      return { distance, side: vertical ? "vertical" : "horizontal", offset: along - Math.floor(along) };
    }
  }
  return { distance: 64, side: "horizontal", offset: 0 };
}
