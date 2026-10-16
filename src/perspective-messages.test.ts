import { describe, expect, it } from "vitest";
import { EXPLORATION_MESSAGES, messageAfterAction, travelHint } from "./perspective-messages";
import { createPerspectiveState, type ExplorationAction } from "./perspective-world";

describe("perspective messages", () => {
  it("keeps size and shape clues in a short footprint observation", () => {
    expect(EXPLORATION_MESSAGES.footprint).toContain("靴ふたつ分");
    expect(EXPLORATION_MESSAGES.footprint).toContain("丸い指のあとが三つ");
  });

  it("keeps each message to at most two short sentences", () => {
    for (const text of Object.values(EXPLORATION_MESSAGES)) {
      expect(text.length).toBeLessThanOrEqual(40);
      expect(text.split(/[。！]/).filter((part) => part.trim()).length).toBeLessThanOrEqual(2);
    }
  });

  it.each<ExplorationAction>(["left", "right"])("keeps an observation while turning %s, even at a landmark", (action) => {
    expect(messageAfterAction(EXPLORATION_MESSAGES.footprint, createPerspectiveState(), action, EXPLORATION_MESSAGES.logApproach)).toBe(EXPLORATION_MESSAGES.footprint);
  });

  it.each<ExplorationAction>(["forward", "backward", "strafe-left", "strafe-right"])("replaces an old observation after %s movement", (action) => {
    const state = createPerspectiveState();
    expect(messageAfterAction(EXPLORATION_MESSAGES.footprint, state, action)).toBe(EXPLORATION_MESSAGES.start);
    expect(messageAfterAction(EXPLORATION_MESSAGES.footprint, state, action, EXPLORATION_MESSAGES.crossed)).toBe(EXPLORATION_MESSAGES.crossed);
  });

  it("does not reveal the fallen log before reaching it", () => {
    const state = createPerspectiveState();
    expect(travelHint(state)).toBe(EXPLORATION_MESSAGES.start);
    state.player = { x: 2, y: 8 };
    expect(travelHint(state)).toBe("道に、大きな足跡がある。");
    state.player = { x: 5, y: 7 };
    state.heading = 1;
    state.witnessedTail = true;
    expect(travelHint(state)).toBe(EXPLORATION_MESSAGES.afterTail);
    state.player = { x: 5, y: 4 };
    state.heading = 0;
    expect(travelHint(state)).toBe("太い幹が、川のほうへ伸びている。");
    state.player = { x: 8, y: 6 };
    state.crossedStream = true;
    expect(travelHint(state)).toBe(EXPLORATION_MESSAGES.waterAfterCrossing);
  });
});
