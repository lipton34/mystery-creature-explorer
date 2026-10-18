import { inspectionTarget, type ExplorationAction, type PerspectiveState } from "./perspective-world";

export const EXPLORATION_MESSAGES = {
  start: "木漏れ日の道が、奥へ続いている。",
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
  crossed: "向こう岸に着いた！ 森の奥へ道が続いている。",
  farBank: "向こう岸だ。振り返ると、渡ってきた幹が見える。",
  logApproach: "倒木が道をふさいでいる。幹は川のほうへ伸びている。",
  onLog: "太い幹が、川の向こうへ続いている。",
  impact: "……奥で、大きな音がした。",
  call: "木々の奥から、低い鳴き声が響いた。",
  discovery: "巨大なモリルを見つけた！",
} as const;

export function travelHint(state: PerspectiveState): string {
  const target = inspectionTarget(state);
  if (target === "footprint") return "道に、大きな足跡がある。";
  if (target === "log") return "太い幹が、川のほうへ伸びている。";
  if (state.discoveredGiant) return "木々の奥で、大きなモリルに出会った。";
  if (state.crossedStream) return "しっぽの主は、森の奥へ向かったようだ。";
  if (state.witnessedTail) return EXPLORATION_MESSAGES.afterTail;
  if (state.heardCall) return "木々の先から、水の音がする。";
  if (state.heardImpact) return "音のしたほうへ、道が続いている。";
  return EXPLORATION_MESSAGES.start;
}

export function messageAfterAction(current: string, state: PerspectiveState, action: ExplorationAction, arrivalMessage?: string): string {
  if (action === "left" || action === "right") return current;
  return arrivalMessage ?? travelHint(state);
}
