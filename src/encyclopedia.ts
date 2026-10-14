import { loadCollection } from "./collection";
import { CREATURES } from "./creatures";

export function renderEncyclopedia(): void {
  const grid = document.querySelector<HTMLElement>("#encyclopedia-grid");
  const count = document.querySelector<HTMLElement>("#collection-count");
  if (!grid) return;
  const discovered = new Set(loadCollection());
  if (count) count.textContent = `${CREATURES.filter((creature) => discovered.has(creature.id)).length} / ${CREATURES.length} はっけん`;
  grid.replaceChildren();
  CREATURES.forEach((creature) => {
    const found = discovered.has(creature.id);
    const card = document.createElement("article");
    card.className = "creature-card" + (found ? "" : " unknown");
    const icon = document.createElement("div");
    icon.className = "creature-icon";
    icon.textContent = found ? creature.icon : "？";
    const name = document.createElement("h3");
    name.textContent = found ? creature.name : "？？？";
    const detail = document.createElement("p");
    detail.textContent = found ? creature.description : "まだ あっていない いきもの";
    card.append(icon, name, detail);
    grid.append(card);
  });
}
