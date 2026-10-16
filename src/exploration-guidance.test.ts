import { describe, expect, it } from "vitest";
import { CREATURES } from "./creatures";
import { explorationGuidance } from "./exploration-guidance";
import type { SearchSpotKind } from "./world";

describe("exploration guidance", () => {
  it("keeps the existing hints when no favorite is selected", () => {
    expect(explorationGuidance(null, 0)).toBe("どんな モリルが いるかな？");
    expect(explorationGuidance(null, 6)).toBe(explorationGuidance(null, 0));
    expect(explorationGuidance(null, 7)).toBe("あわてず ゆっくり たんけんしよう！");
    expect(explorationGuidance(null, 35)).toBe(explorationGuidance(null, 0));
  });

  it.each(CREATURES)("rotates $name's own cheers every seven steps", (creature) => {
    const first = explorationGuidance(creature.id, 0);
    expect(first).toBeTruthy();
    expect(first).not.toBe(explorationGuidance(null, 0));
    expect(explorationGuidance(creature.id, 6)).toBe(first);
    expect(new Set([0, 7, 14].map((steps) => explorationGuidance(creature.id, steps))).size).toBe(3);
    expect(explorationGuidance(creature.id, 21)).toBe(first);
  });

  it("gives each species a different greeting", () => {
    expect(new Set(CREATURES.map((creature) => explorationGuidance(creature.id, 0))).size).toBe(CREATURES.length);
  });

  it.each<[SearchSpotKind, string]>([["bush", "くさむら"], ["stump", "きりかぶ"], ["rock", "いし"]])(
    "prioritizes the nearby %s over any companion's cheer",
    (spot, label) => {
      for (const favorite of [null, ...CREATURES.map((creature) => creature.id)]) {
        for (const steps of [0, 6, 7, 14, 35]) {
          expect(explorationGuidance(favorite, steps, spot)).toBe(`🔎 ${label}を しらべてみよう！`);
        }
      }
    },
  );
});
