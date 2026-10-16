import mossling from "./art/mossling.svg?url&no-inline";
import pufflet from "./art/pufflet.svg?url&no-inline";
import glimmer from "./art/glimmer.svg?url&no-inline";
import droplet from "./art/droplet.svg?url&no-inline";
import acorn from "./art/acorn.svg?url&no-inline";
import type { CreatureId } from "./creatures";

export const CREATURE_ART: Record<CreatureId, string> = { mossling, pufflet, glimmer, droplet, acorn };

export function createCreaturePortrait(id: CreatureId): HTMLImageElement {
  const image = document.createElement("img");
  image.src = CREATURE_ART[id];
  image.alt = "";
  image.width = 80;
  image.height = 80;
  image.draggable = false;
  image.className = "creature-portrait";
  return image;
}
