import { findCreature } from "./creatures";

const KEY = "mystery-creature-explorer:collection:v1";
const sessionDiscoveries = new Set<string>();

export function loadCollection(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const stored = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
    return [...new Set([...stored, ...sessionDiscoveries])].filter((id) => Boolean(findCreature(id)));
  } catch {
    return [...sessionDiscoveries];
  }
}

export function recordDiscovery(id: string): boolean {
  if (!findCreature(id)) return false;
  const collection = loadCollection();
  if (collection.includes(id)) return false;
  sessionDiscoveries.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...collection, id]));
  } catch {
    // If storage is blocked, discoveries still survive for this page session.
  }
  return true;
}
