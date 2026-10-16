import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const COLLECTION_KEY = "mystery-creature-explorer:collection:v1";
const FAVORITE_KEY = "mystery-creature-explorer:favorite:v1";
let stored: Map<string, string>;

beforeEach(() => {
  vi.resetModules();
  stored = new Map([[COLLECTION_KEY, JSON.stringify(["mossling", "acorn"])]]);
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => stored.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { stored.set(key, value); }),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("favorite Moriru", () => {
  it("clears a favorite across reloads without changing discoveries and allows selecting again", async () => {
    const favorite = await import("./favorite");
    const collection = stored.get(COLLECTION_KEY);
    favorite.selectFavorite("mossling");
    expect(favorite.clearFavorite()).toBe("saved");
    expect(favorite.loadFavorite()).toBeNull();
    expect(stored.get(COLLECTION_KEY)).toBe(collection);
    vi.resetModules();
    const restored = await import("./favorite");
    expect(restored.loadFavorite()).toBeNull();
    expect(restored.selectFavorite("acorn")).toBe("saved");
    expect(restored.loadFavorite()).toBe("acorn");
  });

  it("keeps a cleared choice in memory when storage still contains the previous favorite", async () => {
    const { selectFavorite, clearFavorite, loadFavorite } = await import("./favorite");
    selectFavorite("mossling");
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("blocked"); });
    expect(clearFavorite()).toBe("session-only");
    expect(stored.get(FAVORITE_KEY)).toBe(JSON.stringify("mossling"));
    expect(loadFavorite()).toBeNull();
  });

  it("starts without choosing a favorite automatically", async () => {
    const { loadFavorite } = await import("./favorite");
    expect(loadFavorite()).toBeNull();
  });

  it("restores a discovered favorite after a fresh module load", async () => {
    const { selectFavorite } = await import("./favorite");
    expect(selectFavorite("mossling")).toBe("saved");
    vi.resetModules();
    const { loadFavorite } = await import("./favorite");
    expect(loadFavorite()).toBe("mossling");
  });

  it("replaces the favorite without changing discovery records", async () => {
    const { loadFavorite, selectFavorite } = await import("./favorite");
    const collection = stored.get(COLLECTION_KEY);
    selectFavorite("mossling");
    selectFavorite("acorn");
    expect(loadFavorite()).toBe("acorn");
    expect(stored.get(FAVORITE_KEY)).toBe(JSON.stringify("acorn"));
    expect(stored.get(COLLECTION_KEY)).toBe(collection);
  });

  it.each(["pufflet", "unknown"])("rejects unavailable favorite %s without replacing the current choice", async (id) => {
    const { loadFavorite, selectFavorite } = await import("./favorite");
    selectFavorite("mossling");
    expect(selectFavorite(id)).toBe("unavailable");
    expect(loadFavorite()).toBe("mossling");
    expect(stored.get(FAVORITE_KEY)).toBe(JSON.stringify("mossling"));
  });

  it.each(["broken", '"unknown"', '"pufflet"', "42", "null", '["mossling"]'])("ignores invalid or undiscovered stored favorite %s", async (value) => {
    stored.set(FAVORITE_KEY, value);
    const { loadFavorite } = await import("./favorite");
    expect(loadFavorite()).toBeNull();
  });

  it("keeps a discovered favorite when saving is blocked", async () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("quota"); });
    const { loadFavorite, selectFavorite } = await import("./favorite");
    expect(selectFavorite("acorn")).toBe("session-only");
    expect(loadFavorite()).toBe("acorn");
    expect(stored.has(FAVORITE_KEY)).toBe(false);
  });

  it("keeps a newly discovered favorite if storage becomes unavailable", async () => {
    stored.delete(COLLECTION_KEY);
    const { recordDiscovery } = await import("./collection");
    recordDiscovery("mossling");
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error("blocked"); });
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("blocked"); });
    const { loadFavorite, selectFavorite } = await import("./favorite");
    expect(loadFavorite()).toBeNull();
    expect(selectFavorite("mossling")).toBe("session-only");
    expect(loadFavorite()).toBe("mossling");
  });
});
