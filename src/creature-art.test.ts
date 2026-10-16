import { describe, expect, it } from "vitest";
import { CREATURES } from "./creatures";
import { CREATURE_ART } from "./creature-art";
import explorerArt from "./art/explorer.svg?url&no-inline";

describe("Phaser SVG asset compatibility", () => {
  it("serves every species and the explorer as files instead of URI-encoded inline SVGs", () => {
    for (const url of [...CREATURES.map((creature) => CREATURE_ART[creature.id]), explorerArt]) {
      expect(url).toBeTruthy();
      expect(url).not.toMatch(/^data:/);
      expect(url).toContain(".svg");
    }
  });
});
