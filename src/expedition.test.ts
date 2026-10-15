import { describe, expect, it } from "vitest";
import { expeditionProgress, isExpeditionComplete } from "./expedition";
import type { Encounter } from "./world";

const make = (states: boolean[]): Encounter[] => states.map((discovered, index) => ({
  id: (["mossling", "pufflet", "glimmer"] as const)[index % 3],
  position: { x: index + 1, y: 2 },
  discovered,
}));

describe("expedition completion", () => {
  it("starts without discoveries", () => {
    expect(expeditionProgress(make([false, false, false]))).toEqual({ found: 0, total: 3 });
    expect(isExpeditionComplete(make([false, false, false]))).toBe(false);
  });
  it("does not finish after only some creatures are found", () => {
    expect(expeditionProgress(make([true, false, true]))).toEqual({ found: 2, total: 3 });
    expect(isExpeditionComplete(make([true, false, true]))).toBe(false);
  });
  it("completes after every encounter even if saved encyclopedia was already full", () => {
    expect(isExpeditionComplete(make([true, true, true]))).toBe(true);
  });
  it("never declares an empty expedition complete", () => {
    expect(isExpeditionComplete([])).toBe(false);
  });
});
