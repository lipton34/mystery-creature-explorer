import Phaser from "phaser";
import "./style.css";
import { createWorld, isSameTile, isWalkable, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, type Point, type World } from "./world";
import { loadCollection, recordDiscovery } from "./collection";
import { CREATURES, findCreature } from "./creatures";
import { renderEncyclopedia } from "./encyclopedia";
import { drawAnimatedCreature, drawDiscoverySparkles } from "./visuals";
import { expeditionProgress, isExpeditionComplete } from "./expedition";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app is missing");
app.innerHTML = `
  <header>
    <h1>🌿 ふしぎな迷宮図鑑</h1>
    <div class="header-actions">
      <button id="toggle-book" type="button" aria-expanded="false" aria-controls="encyclopedia">📖 ずかんをみる</button>
      <button id="go-home" type="button">🏠 おうちへ</button>
      <button id="reset" type="button">別の森へ ↻</button>
    </div>
  </header>
  <main id="stage">
  <div id="game" aria-label="探索ゲーム"></div>
  <section id="encyclopedia" aria-label="生き物図鑑" hidden>
    <div class="book-heading"><h2>📖 いきものずかん</h2><span id="collection-count"></span></div>
    <div id="encyclopedia-grid"></div>
  </section>
  <section id="home" class="overlay-panel" aria-label="生き物のおうち" hidden>
    <div class="home-hero">🏡</div>
    <h2>いきもののおうち</h2>
    <p>みつけた なかまたちが まっているよ！</p>
    <div id="home-creatures" class="home-creatures"></div>
    <button id="start-expedition" type="button">🌲 あたらしい森へ！</button>
  </section>
  </main>
  <p id="expedition-status"></p>
  <div id="clear-banner" role="status" aria-live="polite" hidden>
    <strong>🎉 この森の いきものを ぜんぶ みつけた！ 🎉</strong>
    <span>おめでとう！ いつでも おうちに かえれるよ！</span>
  </div>
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
let homeOpen = false;
let resumeHomeAfterBook = false;
let startNewExpedition: (() => void) | undefined;
const home = document.querySelector<HTMLElement>("#home");
const homeButton = document.querySelector<HTMLButtonElement>("#go-home");
const resetButton = document.querySelector<HTMLButtonElement>("#reset");
const progressLabel = document.querySelector<HTMLElement>("#expedition-status");
const clearBanner = document.querySelector<HTMLElement>("#clear-banner");
function renderHome(): void {
  const grid = document.querySelector<HTMLElement>("#home-creatures");
  if (!grid) return;
  grid.replaceChildren();
  const found = new Set(loadCollection());
  for (const creature of CREATURES) {
    const tile = document.createElement("div");
    tile.className = "home-creature" + (found.has(creature.id) ? "" : " home-unknown");
    const icon = document.createElement("span");
    icon.textContent = found.has(creature.id) ? creature.icon : "？";
    icon.className = "home-creature-icon";
    const label = document.createElement("span");
    label.textContent = found.has(creature.id) ? creature.name : "まだ いないよ";
    tile.append(icon, label);
    grid.append(tile);
  }
}
function showHome(open: boolean): void {
  homeOpen = open;
  if (home) home.hidden = !open;
  if (controls) controls.hidden = open || bookOpen;
  if (homeButton) homeButton.hidden = open;
  if (resetButton) resetButton.hidden = open;
  if (progressLabel) progressLabel.hidden = open;
  if (clearBanner) clearBanner.hidden = open || !clearBanner.dataset.completed;
  if (open) {
    renderHome();
    say("あたらしい森を たんけんするときは ボタンを おしてね！");
  }
}
homeButton?.addEventListener("click", () => showHome(true));
document.querySelector("#start-expedition")?.addEventListener("click", () => {
  startNewExpedition?.();
  showHome(false);
});

function say(text: string): void { if (message) message.textContent = text; }
function showBook(open: boolean): void {
  bookOpen = open;
  if (open) {
    resumeHomeAfterBook = homeOpen;
    if (homeOpen) { homeOpen = false; if (home) home.hidden = true; }
  } else if (resumeHomeAfterBook) {
    homeOpen = true;
    if (home) home.hidden = false;
    renderHome();
    resumeHomeAfterBook = false;
  }
  if (book) book.hidden = !open;
  if (controls) controls.hidden = open || homeOpen;
  if (homeButton) homeButton.hidden = open || homeOpen;
  if (resetButton) resetButton.hidden = open || homeOpen;
  if (progressLabel) progressLabel.hidden = open || homeOpen;
  if (clearBanner) clearBanner.hidden = open || homeOpen || !clearBanner.dataset.completed;
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
  private lastFrameAt = 0;
  private sparkle?: { position: Point; startMs: number };

  constructor() { super("Forest"); }

  create(): void {
    this.graphics = this.add.graphics();
    this.newForest();
    startNewExpedition = () => this.newForest();
    this.keyHandler = (event: KeyboardEvent) => {
      if (bookOpen || homeOpen) return;
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
    if (time - this.lastFrameAt >= 50 && !bookOpen && !homeOpen) {
      this.lastFrameAt = time;
      this.renderWorld();
    }
    if (this.heldDirection && !bookOpen && !homeOpen && time - this.lastMoveAt >= 160) {
      this.lastMoveAt = time;
      this.move(this.heldDirection);
    }
  }

  private newForest(): void {
    this.world = createWorld();
    this.heldDirection = null;
    this.sparkle = undefined;
    if (clearBanner) { delete clearBanner.dataset.completed; clearBanner.hidden = true; }
    this.updateExpeditionProgress();
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
      if (encounter.discovered || !isSameTile(next, encounter.position)) continue;
      encounter.discovered = true;
      const creature = findCreature(encounter.id);
      if (!creature) continue;
      const isNew = recordDiscovery(creature.id);
      this.sparkle = { position: { ...encounter.position }, startMs: this.time.now };
      this.updateExpeditionProgress();
      if (isExpeditionComplete(this.world.encounters) && clearBanner) {
        clearBanner.dataset.completed = "true";
        clearBanner.hidden = false;
      }
      say(isNew ? `✨ はじめまして、${creature.name}！ ずかんに とうろくしたよ！` : `🌟 ${creature.name}に あえた！ （ずかん とうろくずみ）`);
    }
    this.renderWorld();
  }

  private updateExpeditionProgress(): void {
    const { found, total } = expeditionProgress(this.world.encounters);
    if (progressLabel) progressLabel.textContent = `🌿 この森で ${found} / ${total} しゅるい はっけん`;
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
      if (creature) drawAnimatedCreature(g, creature, encounter.position, this.time.now / 1000);
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
    if (this.sparkle) {
      const elapsed = this.time.now - this.sparkle.startMs;
      if (elapsed < 1050) drawDiscoverySparkles(g, this.sparkle.position, elapsed);
      else this.sparkle = undefined;
    }
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
