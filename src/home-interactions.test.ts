import { describe, expect, it } from "vitest";
import { CREATURES } from "./creatures";
import { interactionMessage } from "./home-interactions";

describe("home creature reactions", () => {
  it("has a nonempty, unique response for every creature", () => {
    const reactions = CREATURES.map((creature) => interactionMessage(creature.id));
    expect(reactions.every((reaction) => reaction.length > 0)).toBe(true);
    expect(new Set(reactions).size).toBe(CREATURES.length);
  });
});
