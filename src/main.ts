import Phaser from "phaser";
import "./style.css";
import { createWorld, encounterAt, hiddenEncounterNear, nearbySearchSpot, isWalkable, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, type Point, type World } from "./world";
import { loadCollection, recordDiscovery } from "./collection";
import { CREATURES, findCreature } from "./creatures";
import { renderEncyclopedia } from "./encyclopedia";
import { drawAnimatedCreature, drawDiscoverySparkles } from "./visuals";
import { expeditionProgress, isExpeditionComplete } from "./expedition";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app is missing");
app.innerHTML = `
  <header>
    <h1>🌿 ふしぎな迷宮図鑑 <small class="version-label">v1.0</small></h1>
    <div class="header-actions">
      <button id="toggle-book" type="button" aria-expanded="false" aria-controls="encyclopedia">📖 ずかんをみる</button>
      <button id="go-home" type="button">🏠 おうちへ</button>
      <button id="reset" type="button">別の森へ ↻</button>
    </div>
  </header>
  <main id="stage">
  <div id="game" aria-label="探索ゲーム"></div>
  <aside id="expedition-hud" aria-label="探索のヒント">
    <p id="expedition-status" aria-live="polite"></p>
    <p id="explore-tip" aria-live="polite">森をたんけんしてみよう！</p>
  </aside>
  <section id="encyclopedia" aria-label="生き物図鑑" hidden>
    <div class="book-heading"><h2>📖 いきものずかん</h2><span id="collection-count"></span></div>
    <div id="encyclopedia-grid"></div>
  </section>
  <section id="home" class="overlay-panel" aria-label="生き物のおうち">
    <div class="home-hero">🏡</div>
    <h2>いきもののおうち</h2>
    <p>みつけた なかまたちが まっているよ！</p>
    <div id="home-creatures" class="home-creatures"></div>
    <p id="home-reaction" role="status" aria-live="polite">なかまを タップしてみよう！</p>
    <button id="start-expedition" type="button">🌲 あたらしい森へ！</button>
  </section>
  </main>
  <div id="announcement" class="announcement" role="dialog" aria-modal="true" aria-labelledby="announcement-heading" hidden>
    <div class="announcement-card">
      <span id="announcement-icon" class="announcement-icon" aria-hidden="true">✨</span>
      <h2 id="announcement-heading"></h2>
      <p id="announcement-detail"></p>
      <button id="announcement-close" type="button">つづける ▶</button>
    </div>
  </div>
  <button id="inspect" type="button" aria-label="まわりをしらべる">🔎 しらべる</button>
  <p id="message" role="status" aria-live="polite">森を歩いて、ふしぎな生き物を見つけよう！</p>
  <div id="controls" aria-label="移動操作">
    <button data-direction="up" aria-label="上へ">▲</button>
    <button data-direction="left" aria-label="左へ">◀</button>
    <button data-direction="down" aria-label="下へ">▼</button>
    <button data-direction="right" aria-label="右へ">▶</button>
  </div>
  <footer>パソコン：矢印キー・WASDで移動 / スペースで調べる。スマホ：画面のボタンで操作。はっけんは自動で記録されます。</footer>
`;

const message = document.querySelector<HTMLElement>("#message");
const book = document.querySelector<HTMLElement>("#encyclopedia");
const controls = document.querySelector<HTMLElement>("#controls");
const toggleBook = document.querySelector<HTMLButtonElement>("#toggle-book");
let bookOpen = false;
let homeOpen = true;
let resumeHomeAfterBook = false;
let startNewExpedition: (() => void) | undefined;
const home = document.querySelector<HTMLElement>("#home");
const homeButton = document.querySelector<HTMLButtonElement>("#go-home");
const resetButton = document.querySelector<HTMLButtonElement>("#reset");
const progressLabel = document.querySelector<HTMLElement>("#expedition-status");
const expeditionHud = document.querySelector<HTMLElement>("#expedition-hud");
const exploreTip = document.querySelector<HTMLElement>("#explore-tip");
const announcement = document.querySelector<HTMLElement>("#announcement");
const announcementIcon = document.querySelector<HTMLElement>("#announcement-icon");
const announcementHeading = document.querySelector<HTMLElement>("#announcement-heading");
const announcementDetail = document.querySelector<HTMLElement>("#announcement-detail");
const announcementClose = document.querySelector<HTMLButtonElement>("#announcement-close");
let announcementOpen = false;
let nextAnnouncement: (() => void) | undefined;
function showAnnouncement(icon: string, heading: string, detail: string, afterClose?: () => void): void {
  announcementOpen = true;
  nextAnnouncement = afterClose;
  if (announcementIcon) announcementIcon.textContent = icon;
  if (announcementHeading) announcementHeading.textContent = heading;
  if (announcementDetail) announcementDetail.textContent = detail;
  if (announcement) announcement.hidden = false;
  announcementClose?.focus();
}
function closeAnnouncement(): void {
  if (!announcementOpen) return;
  announcementOpen = false;
  if (announcement) announcement.hidden = true;
  const next = nextAnnouncement;
  nextAnnouncement = undefined;
  if (next) next();
  else {
    inspectButton?.focus({ preventScroll: true });
  }
}
announcementClose?.addEventListener("click", closeAnnouncement);
const inspectButton = document.querySelector<HTMLButtonElement>("#inspect");

const homeReaction = document.querySelector<HTMLElement>("#home-reaction");
const reactionIndex = new Map<string, number>();
const reactions: Record<string, readonly string[]> = {
  mossling: ["こけまるは にっこり わらった！", "こけまるは うれしそうに はねた！"],
  pufflet: ["ふわりんは ふわっと うかんだ！", "ふわりんは くるくる まわった！"],
  glimmer: ["きらぽんは きらきら ひかった！", "きらぽんは うれしそうに またたいた！"],
  droplet: ["しずくんは ぷるぷる ゆれた！", "しずくんは ぴょんと はねた！"],
  acorn: ["どんぐりんは くるんと まわった！", "どんぐりんは ぼうしを ふった！"],
};
function renderHome(): void {
  const grid = document.querySelector<HTMLElement>("#home-creatures");
  if (!grid) return;
  grid.replaceChildren();
  const found = new Set(loadCollection());
  for (const creature of CREATURES) {
    const unlocked = found.has(creature.id);
    const tile = document.createElement(unlocked ? "button" : "div");
    tile.className = "home-creature" + (unlocked ? " home-friend" : " home-unknown");
    if (unlocked) {
      const button = tile as HTMLButtonElement;
      button.type = "button";
      button.setAttribute("aria-label", creature.name + "と あそぶ");
      button.addEventListener("click", () => {
        const options = reactions[creature.id] ?? [creature.name + "は うれしそう！"];
        const index = reactionIndex.get(creature.id) ?? 0;
        if (homeReaction) homeReaction.textContent = options[index % options.length];
        reactionIndex.set(creature.id, index + 1);
        // Restart the brief bounce animation after every interaction.
        button.classList.remove("is-reacting");
        void button.offsetWidth;
        button.classList.add("is-reacting");
      });
      button.addEventListener("animationend", () => button.classList.remove("is-reacting"));
    }
    const icon = document.createElement("span");
    icon.textContent = unlocked ? creature.icon : "？";
    icon.className = "home-creature-icon";
    const label = document.createElement("span");
    label.textContent = unlocked ? creature.name : "まだ いないよ";
    tile.append(icon, label);
    grid.append(tile);
  }
}
function showHome(open: boolean): void {
  // The home button is also available from the encyclopedia.
  if (open && bookOpen) {
    bookOpen = false;
    resumeHomeAfterBook = false;
    if (book) book.hidden = true;
    if (toggleBook) {
      toggleBook.textContent = "📖 ずかんをみる";
      toggleBook.setAttribute("aria-expanded", "false");
    }
  }
  homeOpen = open;
  if (home) home.hidden = !open;
  if (controls) controls.hidden = open || bookOpen;
  if (homeButton) homeButton.hidden = open;
  if (resetButton) resetButton.hidden = open;
  if (expeditionHud) expeditionHud.hidden = open;
  if (progressLabel) progressLabel.hidden = open;

  if (inspectButton) inspectButton.hidden = open;

  if (open) {
    renderHome();
    if (homeReaction) homeReaction.textContent = "なかまを タップしてみよう！";
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
  // While viewing the book, keep "おうちへ" available as a direct destination.
  if (homeButton) homeButton.hidden = homeOpen;
  if (resetButton) resetButton.hidden = open || homeOpen;
  if (expeditionHud) expeditionHud.hidden = open || homeOpen;
  if (progressLabel) progressLabel.hidden = open || homeOpen;

  if (inspectButton) inspectButton.hidden = open || homeOpen;

  if (toggleBook) {
    toggleBook.textContent = open ? "↩ もどる" : "📖 ずかんをみる";
    toggleBook.setAttribute("aria-expanded", String(open));
  }
  // Keep Phaser's canvas mounted and its parent measurable at all times.
  // The encyclopedia covers it as an overlay instead of collapsing its layout.
  if (open) renderEncyclopedia();
}
toggleBook?.addEventListener("click", () => showBook(!bookOpen));
renderEncyclopedia();
// Start at home instead of requiring the player to enter a forest first.
showHome(true);

type Direction = "up" | "down" | "left" | "right";
const SPOT_LABELS = { bush: "くさむら", stump: "きりかぶ", rock: "いし" } as const;
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
  private stepsWithoutDiscovery = 0;

  constructor() { super("Forest"); }

  create(): void {
    this.graphics = this.add.graphics();
    this.newForest();
    inspectButton?.addEventListener("click", () => this.inspect());
    startNewExpedition = () => this.newForest();
    this.keyHandler = (event: KeyboardEvent) => {
      if (bookOpen || homeOpen || announcementOpen) return;
      if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select")) return;
      if (event.key === " ") {
        event.preventDefault();
        if (!event.repeat) this.inspect();
        return;
      }
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
    window.addEventListener("blur", () => { this.heldDirection = null; });

    document.querySelector("#reset")?.addEventListener("click", () => this.newForest());
    document.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach((button) => {
      const dir = button.dataset.direction as Direction;
      const start = (event: PointerEvent) => {
        if (bookOpen || homeOpen || announcementOpen) return;
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
    if (time - this.lastFrameAt >= 50 && !bookOpen && !homeOpen && !announcementOpen) {
      this.lastFrameAt = time;
      this.renderWorld();
    }
    if (this.heldDirection && !bookOpen && !homeOpen && !announcementOpen && time - this.lastMoveAt >= 160) {
      this.lastMoveAt = time;
      this.move(this.heldDirection);
    }
  }

  private newForest(): void {
    this.world = createWorld();
    this.heldDirection = null;
    this.sparkle = undefined;
    this.stepsWithoutDiscovery = 0;
    announcementOpen = false;
    nextAnnouncement = undefined;
    if (announcement) announcement.hidden = true;
    this.updateExpeditionProgress();
    const found = loadCollection().length;
    say(found ? `新しい森に到着！ 図鑑は ${found}/${CREATURES.length} しゅるい はっけんずみ。きになる ばしょを しらべてみよう！` : "ふしぎな森へようこそ！ きになる ばしょを しらべてみよう！");
    this.renderWorld();
    if (bookOpen) renderEncyclopedia();
  }

  private move(direction: Direction): void {
    const vector = MOVES[direction];
    const next = { x: this.world.player.x + vector.x, y: this.world.player.y + vector.y };
    if (!isWalkable(this.world, next)) return;
    this.world.player = next;
    this.stepsWithoutDiscovery += 1;
    this.updateExpeditionProgress();
    const encounter = encounterAt(this.world, next);
    if (encounter) this.discover(encounter);
    this.renderWorld();
  }

  private inspect(): void {
    if (bookOpen || homeOpen || announcementOpen) return;
    const encounter = hiddenEncounterNear(this.world, this.world.player);
    if (!encounter) {
      say("このあたりには なにも ないみたい。🌿 きになる ばしょを さがしてみよう！");
      return;
    }
    this.discover(encounter);
    this.renderWorld();
  }

  private discover(encounter: World["encounters"][number]): void {
    encounter.discovered = true;
    const creature = findCreature(encounter.id);
    if (!creature) return;
    const isNew = recordDiscovery(creature.id);
    this.sparkle = { position: { ...encounter.position }, startMs: this.time.now };
    this.updateExpeditionProgress();
    const completed = isExpeditionComplete(this.world.encounters);
    showAnnouncement(
      creature.icon,
      isNew ? `はじめまして！ ${creature.name}` : `${creature.name}に またあえた！`,
      isNew ? "ずかんに あたらしく とうろくしたよ！" : "こんかいの森でも はっけん！",
      completed ? () => showAnnouncement("🎉", "この森の いきものを ぜんぶ みつけた！", "おめでとう！ おうちへ かえってもいいし、森を あるいてもいいよ！") : undefined,
    );
    this.heldDirection = null;
    this.stepsWithoutDiscovery = 0;
    say(isNew ? `✨ ${creature.name}を はっけん！ ずかんに とうろくしたよ！` : `🌟 ${creature.name}を はっけん！ （ずかん とうろくずみ）`);
  }

  private updateExpeditionProgress(): void {
    const { found, total } = expeditionProgress(this.world.encounters);
    const spot = nearbySearchSpot(this.world, this.world.player);
    if (progressLabel) progressLabel.textContent = `🌿 この森で ${found} / ${total} しゅるい はっけん`;
    const comments = [
      "どんな いきものが いるかな？",
      "あわてず ゆっくり たんけんしよう！",
      "くさむらや いしも みてみよう！",
      "まだ みぬ なかまが いるかも！",
      "つぎは どこへ いってみよう？",
    ];
    if (exploreTip) exploreTip.textContent = spot
      ? `🔎 ${SPOT_LABELS[spot]}を しらべてみよう！`
      : comments[Math.floor(this.stepsWithoutDiscovery / 7) % comments.length];
    if (inspectButton) {
      inspectButton.disabled = !spot || announcementOpen;
      inspectButton.classList.toggle("inspect-ready", Boolean(spot));
      inspectButton.textContent = spot ? `🔎 ${SPOT_LABELS[spot]}を しらべる！` : "🔎 しらべる";
    }
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
      if (encounter.hidden && !encounter.discovered) {
        const bx = encounter.position.x * TILE_SIZE + 20;
        const by = encounter.position.y * TILE_SIZE + 23;
        if (encounter.spot === "rock") {
          g.fillStyle(0x586c76);
          g.fillEllipse(bx, by + 6, 31, 22);
          g.fillStyle(0xa9b6b8);
          g.fillTriangle(bx - 14, by + 5, bx - 3, by - 12, bx + 14, by + 5);
          g.fillStyle(0xe2e8dc);
          g.fillCircle(bx + 7, by - 7, 3);
        } else if (encounter.spot === "stump") {
          g.fillStyle(0x705139);
          g.fillRect(bx - 11, by - 3, 22, 19);
          g.fillStyle(0xbe925e);
          g.fillEllipse(bx, by - 4, 32, 14);
          g.lineStyle(2, 0x876343);
          g.strokeEllipse(bx, by - 4, 20, 8);
        } else {
          g.fillStyle(0x275c38);
          g.fillCircle(bx - 8, by + 3, 11);
          g.fillCircle(bx + 8, by + 3, 11);
          g.fillStyle(0x81b663);
          g.fillCircle(bx, by - 6, 11);
          g.fillStyle(0xf9e6a0);
          g.fillCircle(bx + 11, by - 9, 3);
        }
      } else if (creature) drawAnimatedCreature(g, creature, encounter.position, this.time.now / 1000);
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
