const KEY = "mystery-creature-explorer:collection:v1";
export const FIRST_CREATURE_ID = "mossling";

export function loadCollection(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function recordDiscovery(id: string): boolean {
  const collection = loadCollection();
  if (collection.includes(id)) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify([...collection, id]));
  } catch {
    // ストレージが無効でも探索は続行できる。
  }
  return true;
}
