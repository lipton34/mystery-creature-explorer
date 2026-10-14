import type { Encounter } from "./world";

export function expeditionProgress(encounters: readonly Encounter[]): { found: number; total: number } {
  return {
    found: encounters.filter((encounter) => encounter.discovered).length,
    total: encounters.length,
  };
}

export function isExpeditionComplete(encounters: readonly Encounter[]): boolean {
  return encounters.length > 0 && encounters.every((encounter) => encounter.discovered);
}
