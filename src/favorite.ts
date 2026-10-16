import { loadCollection } from "./collection";
import { findCreature, type CreatureId } from "./creatures";

const KEY = "mystery-creature-explorer:favorite:v1";
let sessionFavorite: CreatureId | null | undefined;

export function loadFavorite(): CreatureId | null {
  let stored: unknown = sessionFavorite;
  if (stored === undefined) {
    try {
      stored = JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      return null;
    }
  }
  if (typeof stored !== "string" || !loadCollection().includes(stored)) return null;
  return findCreature(stored)?.id ?? null;
}

export function selectFavorite(id: string): "saved" | "session-only" | "unavailable" {
  const creature = findCreature(id);
  if (!creature || !loadCollection().includes(id)) return "unavailable";
  sessionFavorite = creature.id;
  try {
    localStorage.setItem(KEY, JSON.stringify(creature.id));
    return "saved";
  } catch {
    return "session-only";
  }
}

export function clearFavorite(): "saved" | "session-only" {
  sessionFavorite = null;
  try {
    localStorage.setItem(KEY, "null");
    return "saved";
  } catch {
    return "session-only";
  }
}
