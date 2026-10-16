import { inspectionTarget, type ExplorationAction, type PerspectiveState } from "./perspective-world";

export const EXPLORATION_MESSAGES = {
  start: "木々の先から、水の音がする。",
  footprint: "靴ふたつ分の足跡。丸い指のあとが三つある。",
  log: "太い幹が向こう岸まで続いている。上を歩いて渡れそうだ。",
  water: "流れが速く、跳び越せそうにない。",
  waterAfterCrossing: "水の向こうに、歩いてきた岸が見える。",
  noTarget: "近くに調べられるものはない。",
  blockedWater: "流れが速い。川沿いに渡れる場所はないだろうか。",
  blockedWaterAfterCrossing: "ここからは渡れない。倒木へ戻ろう。",
  blockedTrees: "木々が道をふさいでいる。",
  tail: "……！",
  afterTail: "向こう岸へ、渡れる場所を探そう。",
  crossed: "向こう岸に着いた！ しっぽを見た川辺は、この先だ。",
  farBank: "あのしっぽを見た川辺だ。振り返ると、元の岸が見える。",
  logApproach: "倒木が道をふさいでいる。幹は川のほうへ伸びている。",
  onLog: "太い幹が、川の向こうへ続いている。",
} as const;

export function travelHint(state: PerspectiveState): string {
  const target = inspectionTarget(state);
  if (target === "footprint") return "道に、大きな足跡がある。";
  if (target === "log") return "太い幹が、川のほうへ伸びている。";
  if (state.crossedStream) return EXPLORATION_MESSAGES.waterAfterCrossing;
  if (state.witnessedTail) return EXPLORATION_MESSAGES.afterTail;
  return EXPLORATION_MESSAGES.start;
}

export function messageAfterAction(current: string, state: PerspectiveState, action: ExplorationAction, arrivalMessage?: string): string {
  if (action === "left" || action === "right") return current;
  return arrivalMessage ?? travelHint(state);
}
