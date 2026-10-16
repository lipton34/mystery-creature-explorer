import type { CreatureId } from "./creatures";
import type { SearchSpotKind } from "./world";

export const SPOT_LABELS: Record<SearchSpotKind, string> = { bush: "くさむら", stump: "きりかぶ", rock: "いし" };

const DEFAULT_COMMENTS = [
  "どんな モリルが いるかな？",
  "あわてず ゆっくり たんけんしよう！",
  "くさむらや いしも みてみよう！",
  "まだ みぬ なかまが いるかも！",
  "つぎは どこへ いってみよう？",
] as const;

const CHEERS: Record<CreatureId, readonly string[]> = {
  mossling: ["いっしょに ゆっくり あるこう。", "ふかふかの こけが あるかな？", "ひとやすみしても だいじょうぶ。"],
  pufflet: ["ふわふわ かぜと おさんぽ！", "どんな なかまに あえるかな？", "きみと いっしょで うれしいな！"],
  glimmer: ["きらっと ひかるもの あるかな？", "きみの はっけんを おうえんするよ！", "つぎの なかまも みつかるよ！"],
  droplet: ["ぷるぷる！ げんきに いこう！", "みずたまりも みてみたいな！", "あせらず いっぽずつ いこう！"],
  acorn: ["ぼうしを かぶって しゅっぱつ！", "どんぐり ころころ あるかな？", "つぎの みちも たのしみだね！"],
};

export function explorationGuidance(favorite: CreatureId | null, steps: number, spot?: SearchSpotKind): string {
  if (spot) return `🔎 ${SPOT_LABELS[spot]}を しらべてみよう！`;
  const comments = favorite ? CHEERS[favorite] : DEFAULT_COMMENTS;
  return comments[Math.floor(steps / 7) % comments.length];
}
