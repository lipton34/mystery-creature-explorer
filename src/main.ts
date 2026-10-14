import Phaser from "phaser";
import "./style.css";
import { createWorld, isNear, isWalkable, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, type Point, type World } from "./world";
import { loadCollection, recordDiscovery } from "./collection";
import { CREATURES, findCreature, type CreatureDefinition } from "./creatures";
import { renderEncyclopedia } from "./encyclopedia";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app is missing");
app.innerHTML = `
  <header>
    <h1>🌿 ふしぎな迷宮図鑑</h1>
    <div class="header-actions">
      <button id="toggle-book" type="button" aria-expanded="false" aria-controls="encyclopedia">📖 ずかんをみる</button>
      <button id="reset" type="button">別の森へ ↻</button>
    </div>
  </header>
  <main id="stage">
  <div id="game" aria-label="探索ゲーム"></div>
  <section id="encyclopedia" aria-label="生き物図鑑" hidden>
    <div class="book-heading"><h2>📖 いきものずかん</h2><span id="collection-count"></span></div>
    <div id="encyclopedia-grid"></div>
  </section>
  </main>
  <p id="message" role="status" aria-live="polite">森を歩いて、ふしぎな生き物を見つけよう！</p>
  <div id="controls" aria-label="移動操作">
    <button data-direction="up" aria-label="上へ">▲</button>
    <button data-direction="left" aria-label="左へ">◀</button>
    <button data-direction="down" aria-label="下へ">▼</button>
    <button data-direction="right" aria-label="右へ">▶</button>
  </div>
  <footer>矢印キー / WASD / 画面のボタンで移動 · 発見した生き物はこのブラウザに記録されます</footer>
`;

const message = document.querySelector<HTMLElement>("#message");
const book = document.querySelector<HTMLElement>("#encyclopedia");
const controls = document.querySelector<HTMLElement>("#controls");
const toggleBook = document.querySelector<HTMLButtonElement>("#toggle-book");
let bookOpen = false;

function say(text: string): void { if (message) message.textContent = text; }
function showBook(open: boolean): void {
  bookOpen = open;
  if (book) book.hidden = !open;
  if (controls) controls.hidden = open;
  if (toggleBook) {
    toggleBook.textContent = open ? "🌲 もりにもどる" : "📖 ずかんをみる";
    toggleBook.setAttribute("aria-expanded", String(open));
  }
  // Keep Phaser's canvas mounted and its parent measurable at all times.
  // The encyclopedia covers it as an overlay instead of collapsing its layout.
  if (open) renderEncyclopedia();
}
toggleBook?.addEventListener("click", () => showBook(!bookOpen));
renderEncyclopedia();

type Direction = "up" | "down" | "left" | "right";
const MOVES: Record<Direction, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

class ForestScene extends Phaser.Scene {
  private world!: World;
  private graphics!: Phaser.GameObjects.Graphics;
  private keyHandler?: (event: KeyboardEvent) => void;
  private heldDirection: Direction | null = null;
  private lastMoveAt = 0;

  constructor() { super("Forest"); }

  create(): void {
    this.graphics = this.add.graphics();
    this.newForest();
    this.keyHandler = (event: KeyboardEvent) => {
      if (bookOpen) return;
      const map: Record<string, Direction> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", a: "left", s: "down", d: "right",
      };
      const direction = map[event.key];
      if (direction) {
        event.preventDefault();
        if (!event.repeat) this.move(direction);
      }
    };
    window.addEventListener("keydown", this.keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    });

    document.querySelector("#reset")?.addEventListener("click", () => this.newForest());
    document.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach((button) => {
      const dir = button.dataset.direction as Direction;
      const start = (event: PointerEvent) => {
        if (bookOpen) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.heldDirection = dir;
        this.lastMoveAt = performance.now();
        this.move(dir);
      };
      button.addEventListener("pointerdown", start);
      const stop = () => { if (this.heldDirection === dir) this.heldDirection = null; };
      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("lostpointercapture", stop);
    });
  }

  update(time: number): void {
    if (this.heldDirection && !bookOpen && time - this.lastMoveAt >= 160) {
      this.lastMoveAt = time;
      this.move(this.heldDirection);
    }
  }

  private newForest(): void {
    this.world = createWorld();
    this.heldDirection = null;
    const found = loadCollection().length;
    say(found ? `新しい森に到着！ 図鑑は ${found}/${CREATURES.length} しゅるい はっけんずみ。` : "ふしぎな森へようこそ！ 生き物たちを探そう。");
    this.renderWorld();
    if (bookOpen) renderEncyclopedia();
  }

  private move(direction: Direction): void {
    const vector = MOVES[direction];
    const next = { x: this.world.player.x + vector.x, y: this.world.player.y + vector.y };
    if (!isWalkable(this.world, next)) return;
    this.world.player = next;
    for (const encounter of this.world.encounters) {
      if (encounter.discovered || !isNear(next, encounter.position)) continue;
      encounter.discovered = true;
      const creature = findCreature(encounter.id);
      if (!creature) continue;
      const isNew = recordDiscovery(creature.id);
      say(isNew ? `✨ はじめまして、${creature.name}！ ずかんに とうろくしたよ！` : `🌟 ${creature.name}に あえた！ （ずかん とうろくずみ）`);
    }
    this.renderWorld();
  }

  private drawCreature(creature: CreatureDefinition, point: Point, discovered: boolean): void {
    const g = this.graphics;
    const x = point.x * TILE_SIZE;
    const y = point.y * TILE_SIZE;
    g.fillStyle(0x294c3b);
    g.fillEllipse(x + 20, y + 33, 27, 8);
    g.fillStyle(discovered ? 0xc6e4ba : creature.color);
    g.fillEllipse(x + 20, y + 22, 27, 25);
    g.fillStyle(creature.accent);
    if (creature.id === "pufflet") {
      g.fillCircle(x + 9, y + 13, 7);
      g.fillCircle(x + 31, y + 13, 7);
    } else if (creature.id === "glimmer") {
      g.fillTriangle(x + 20, y + 6, x + 13, y + 17, x + 27, y + 17);
    } else {
      g.fillEllipse(x + 20, y + 10, 13, 7);
    }
    g.fillStyle(0x26352d);
    g.fillCircle(x + 14, y + 21, 2);
    g.fillCircle(x + 26, y + 21, 2);
  }

  private renderWorld(): void {
    const g = this.graphics;
    g.clear();
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const wall = this.world.tiles[y][x] === 1;
        const shade = (x * 13 + y * 7) % 5 === 0;
        g.fillStyle(wall ? 0x32564a : shade ? 0x426b56 : 0x4b765c);
        g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
        if (wall) {
          g.fillStyle(0x214339);
          g.fillCircle(x * TILE_SIZE + 20, y * TILE_SIZE + 19, 15);
          g.fillStyle(0x5d9270);
          g.fillCircle(x * TILE_SIZE + 16, y * TILE_SIZE + 14, 10);
        } else if ((x * 11 + y * 17) % 19 === 0) {
          g.fillStyle(0x9cbd79);
          g.fillCircle(x * TILE_SIZE + 26, y * TILE_SIZE + 27, 3);
        }
      }
    }
    for (const encounter of this.world.encounters) {
      const creature = findCreature(encounter.id);
      if (creature) this.drawCreature(creature, encounter.position, encounter.discovered);
    }
    const p = this.world.player;
    g.fillStyle(0x213c3f);
    g.fillEllipse(p.x * TILE_SIZE + 20, p.y * TILE_SIZE + 33, 23, 8);
    g.fillStyle(0xf2ce9b);
    g.fillCircle(p.x * TILE_SIZE + 20, p.y * TILE_SIZE + 19, 12);
    g.fillStyle(0x577db4);
    g.fillRect(p.x * TILE_SIZE + 10, p.y * TILE_SIZE + 27, 20, 9);
    g.fillStyle(0x704c3b);
    g.fillEllipse(p.x * TILE_SIZE + 20, p.y * TILE_SIZE + 11, 25, 10);
    g.fillStyle(0x292c2b);
    g.fillCircle(p.x * TILE_SIZE + 16, p.y * TILE_SIZE + 19, 1.5);
    g.fillCircle(p.x * TILE_SIZE + 24, p.y * TILE_SIZE + 19, 1.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: MAP_WIDTH * TILE_SIZE,
  height: MAP_HEIGHT * TILE_SIZE,
  backgroundColor: "#1a3b36",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [ForestScene],
});
