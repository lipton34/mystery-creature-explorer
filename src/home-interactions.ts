import type { CreatureId } from "./creatures";

/** Each known creature has its own friendly reaction in the home. */
const REACTIONS: Record<CreatureId, string> = {
  mossling: "🌱 こけまるは うれしそうに ぴょん！",
  pufflet: "🌸 ふわりんは ふわふわ おどっている！",
  glimmer: "✨ きらぽんは キラキラ ひかっている！",
};

export function interactionMessage(id: CreatureId): string {
  return REACTIONS[id];
}
