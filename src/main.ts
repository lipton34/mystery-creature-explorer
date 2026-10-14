import Phaser from "phaser";
import "./style.css";
import { createWorld, isNear, isWalkable, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, type Point, type World } from "./world";
import { FIRST_CREATURE_ID, loadCollection, recordDiscovery } from "./collection";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app is missing");
app.innerHTML = `
  <header><h1>🌿 ふしぎな迷宮図鑑</h1><button id="reset" type="button">別の森へ ↻</button></header>
  <div id="game" aria-label="探索ゲーム"></div>
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
function say(text: string): void { if (message) message.textContent = text; }
type Direction = "up" | "down" | "left" | "right";
const MOVES: Record<Direction, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

class ForestScene extends Phaser.Scene {
  private world!: World;
  private graphics!: Phaser.GameObjects.Graphics;
  private discovered = false;
  private keyHandler?: (event: KeyboardEvent) => void;
  private heldDirection: Direction | null = null;
  private lastMoveAt = 0;

  constructor() { super("Forest"); }

  create(): void {
    this.graphics = this.add.graphics();
    this.newForest();
    this.keyHandler = (event: KeyboardEvent) => {
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
        event.preventDefault();
        this.heldDirection = dir;
        this.lastMoveAt = performance.now();
        this.move(dir);
      };
      button.addEventListener("pointerdown", start);
      button.addEventListener("pointerup", () => { this.heldDirection = null; });
      button.addEventListener("pointercancel", () => { this.heldDirection = null; });
      button.addEventListener("lostpointercapture", () => { this.heldDirection = null; });
    });
  }

  update(time: number): void {
    if (this.heldDirection && time - this.lastMoveAt >= 160) {
      this.lastMoveAt = time;
      this.move(this.heldDirection);
    }
  }

  private newForest(): void {
    this.world = createWorld();
    this.discovered = false;
    say(loadCollection().includes(FIRST_CREATURE_ID)
      ? "新しい森に到着！ 図鑑：こけまる 発見済み 🌱"
      : "ふしぎな森へようこそ！ 緑の生き物を探そう。");
    this.renderWorld();
  }

  private move(direction: Direction): void {
    const vector = MOVES[direction];
    const next = { x: this.world.player.x + vector.x, y: this.world.player.y + vector.y };
    if (!isWalkable(this.world, next)) return;
    this.world.player = next;
    if (!this.discovered && isNear(next, this.world.creature)) {
      this.discovered = true;
      const isNew = recordDiscovery(FIRST_CREATURE_ID);
      say(isNew ? "✨ はじめまして、こけまる！ 図鑑に登録したよ！" : "🌱 こけまるに会えた！ （図鑑登録済み）");
    }
    this.renderWorld();
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
    const c = this.world.creature;
    g.fillStyle(0x294c3b);
    g.fillEllipse(c.x * TILE_SIZE + 20, c.y * TILE_SIZE + 33, 27, 8);
    g.fillStyle(this.discovered ? 0xa6e5a0 : 0x9ddc75);
    g.fillEllipse(c.x * TILE_SIZE + 20, c.y * TILE_SIZE + 22, 27, 25);
    g.fillStyle(0x26352d);
    g.fillCircle(c.x * TILE_SIZE + 14, c.y * TILE_SIZE + 20, 2);
    g.fillCircle(c.x * TILE_SIZE + 26, c.y * TILE_SIZE + 20, 2);
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
