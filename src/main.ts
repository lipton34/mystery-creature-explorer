import Phaser from "phaser";
import "./style.css";
import { createWorld, encounterAt, hiddenEncounterNear, nearbySearchSpot, isWalkable, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, type Point, type World } from "./world";
import { loadCollection, recordDiscovery } from "./collection";
import { loadFavorite, selectFavorite } from "./favorite";
import { CREATURES, findCreature } from "./creatures";
import { renderEncyclopedia } from "./encyclopedia";
import { drawDiscoverySparkles, drawForestTile } from "./visuals";
import { CREATURE_ART, createCreaturePortrait } from "./creature-art";
import explorerArt from "./art/explorer.svg?url&no-inline";
import cottageArt from "./art/cottage.svg?url";
import { expeditionProgress, isExpeditionComplete } from "./expedition";
import { explorationGuidance, SPOT_LABELS } from "./exploration-guidance";
import { findWalkPath, mapPointAt } from "./navigation";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app is missing");
app.innerHTML = `
  <header>
    <h1>🌿 モリルのふしぎ図鑑 <small class="version-label">v1.1</small></h1>
    <div class="header-actions">
      <button id="toggle-book" type="button" aria-expanded="false" aria-controls="encyclopedia">📖 ずかんをみる</button>
      <button id="go-home" type="button">🏠 おうちへ</button>
      <button id="reset" type="button">別の森へ ↻</button>
    </div>
  </header>
  <main id="stage">
  <div id="game" aria-label="探索ゲーム"></div>
  <section id="encyclopedia" aria-label="モリルの図鑑" hidden>
    <div class="book-emblem" aria-hidden="true">📚</div>
    <div class="book-heading"><h2>📖 モリルのずかん</h2><span id="collection-count"></span></div>
    <div id="encyclopedia-grid"></div>
  </section>
  <section id="home" class="overlay-panel" aria-label="モリルのおうち">
    <div class="home-hero" aria-hidden="true"><img src="${cottageArt}" width="240" height="130" alt=""></div>
    <h2>モリルのおうち</h2>
    <p>モリルは 森にくらす ふしぎな なかまたち。</p>
    <p>みつけた なかまたちが まっているよ！</p>
    <div id="home-creatures" class="home-creatures"></div>
    <button id="start-expedition" type="button">🌲 あたらしい森へ！</button>
  </section>
  </main>
  <div id="exploration-toolbar">
  <aside id="expedition-hud" aria-label="探索のヒント">
    <p id="expedition-status" aria-live="polite"></p>
    <div id="exploration-guidance" aria-live="polite" aria-atomic="true">
      <span id="companion-portrait" aria-hidden="true" hidden></span>
      <div class="guidance-text">
        <strong id="companion-name" hidden></strong>
        <p id="explore-tip">森をたんけんしてみよう！</p>
      </div>
    </div>
  </aside>
  <button id="inspect" type="button" aria-label="まわりをしらべる" aria-describedby="explore-tip">🔎 しらべる</button>
  </div>
  <div id="home-feedback">
    <aside id="favorite-summary" aria-label="お気に入りのモリル" role="status" aria-live="polite" aria-atomic="true"></aside>
    <p id="home-reaction" role="status" aria-live="polite" aria-atomic="true">モリルを タップしてみよう！</p>
  </div>
  <div id="announcement" class="announcement" role="dialog" aria-modal="true" aria-labelledby="announcement-heading" hidden>
    <div class="announcement-card">
      <span id="announcement-icon" class="announcement-icon" aria-hidden="true">✨</span>
      <h2 id="announcement-heading"></h2>
      <p id="announcement-detail"></p>
      <button id="announcement-close" type="button">つづける ▶</button>
    </div>
  </div>
  <p id="message" role="status" aria-live="polite">森を歩いて、モリルを見つけよう！</p>
  <details id="movement-help">
  <summary>移動ボタンをつかう</summary>
  <div id="controls" aria-label="移動操作">
    <button data-direction="up" aria-label="上へ">▲</button>
    <button data-direction="left" aria-label="左へ">◀</button>
    <button data-direction="down" aria-label="下へ">▼</button>
    <button data-direction="right" aria-label="右へ">▶</button>
  </div>
  </details>
  <footer>地図の いきたい ばしょを クリック・タップ。じぶんを タップすると とまります。<br>パソコン：矢印キー・WASDでも移動 / スペースで調べる / Escで停止。はっけんは自動で記録されます。</footer>
`;

const message = document.querySelector<HTMLElement>("#message");
const book = document.querySelector<HTMLElement>("#encyclopedia");
const controls = document.querySelector<HTMLDetailsElement>("#movement-help");
const toggleBook = document.querySelector<HTMLButtonElement>("#toggle-book");
let bookOpen = false;
let homeOpen = true;
let resumeHomeAfterBook = false;
let startNewExpedition: (() => void) | undefined;
let stopExplorationMovement: (() => void) | undefined;
const home = document.querySelector<HTMLElement>("#home");
const homeButton = document.querySelector<HTMLButtonElement>("#go-home");
const resetButton = document.querySelector<HTMLButtonElement>("#reset");
const progressLabel = document.querySelector<HTMLElement>("#expedition-status");
const expeditionHud = document.querySelector<HTMLElement>("#expedition-hud");
const exploreTip = document.querySelector<HTMLElement>("#explore-tip");
const companionPortrait = document.querySelector<HTMLElement>("#companion-portrait");
const companionName = document.querySelector<HTMLElement>("#companion-name");
const announcement = document.querySelector<HTMLElement>("#announcement");
const announcementIcon = document.querySelector<HTMLElement>("#announcement-icon");
const announcementHeading = document.querySelector<HTMLElement>("#announcement-heading");
const announcementDetail = document.querySelector<HTMLElement>("#announcement-detail");
const announcementClose = document.querySelector<HTMLButtonElement>("#announcement-close");
let announcementOpen = false;
let nextAnnouncement: (() => void) | undefined;
function showAnnouncement(icon: string, heading: string, detail: string, afterClose?: () => void): void {
  stopExplorationMovement?.();
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
function updateScreenTheme(): void {
  if (!app) return;
  app.dataset.screen = bookOpen ? "book" : homeOpen ? "home" : "forest";
}
function renderFavorite(notice?: string): void {
  const favorite = findCreature(loadFavorite() ?? "");
  const summary = document.querySelector<HTMLElement>("#favorite-summary");
  if (summary) {
    const heading = document.createElement("strong");
    heading.textContent = favorite ? `⭐ おきにいり：${favorite.name}` : "⭐ おきにいりは まだ えらんでいないよ";
    const note = document.createElement("p");
    note.textContent = notice ?? (favorite ? "ほかの モリルにも かえられるよ！" : "みつけた モリルの「☆ えらぶ」を おしてね。");
    const text = document.createElement("div");
    text.append(heading, note);
    summary.replaceChildren();
    if (favorite) summary.append(createCreaturePortrait(favorite.id));
    summary.append(text);
  }
  document.querySelectorAll<HTMLButtonElement>("[data-favorite-id]").forEach((button) => {
    const selected = button.dataset.favoriteId === favorite?.id;
    button.setAttribute("aria-pressed", String(selected));
    button.textContent = selected ? "⭐ おきにいり" : "☆ えらぶ";
  });
}
function renderHome(): void {
  const grid = document.querySelector<HTMLElement>("#home-creatures");
  if (!grid) return;
  grid.replaceChildren();
  if (homeReaction) {
    homeReaction.textContent = "モリルを タップしてみよう！";
    homeReaction.classList.remove("is-updated");
  }
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
        grid.querySelector(".is-selected")?.classList.remove("is-selected");
        button.classList.add("is-selected");
        if (homeReaction) {
          const text = document.createElement("span");
          text.textContent = options[index % options.length];
          homeReaction.replaceChildren(createCreaturePortrait(creature.id), text);
          homeReaction.classList.remove("is-updated");
        }
        reactionIndex.set(creature.id, index + 1);
        // Restart the brief bounce animation after every interaction.
        button.classList.remove("is-reacting");
        void button.offsetWidth;
        button.classList.add("is-reacting");
        homeReaction?.classList.add("is-updated");
      });
      button.addEventListener("animationend", () => button.classList.remove("is-reacting"));
    }
    const icon = document.createElement("span");
    if (unlocked) icon.append(createCreaturePortrait(creature.id));
    else icon.textContent = "？";
    icon.className = "home-creature-icon";
    const label = document.createElement("span");
    label.textContent = unlocked ? creature.name : "まだ いないよ";
    tile.append(icon, label);
    if (unlocked) {
      const choice = document.createElement("div");
      choice.className = "home-creature-choice";
      const favoriteButton = document.createElement("button");
      favoriteButton.type = "button";
      favoriteButton.className = "favorite-button";
      favoriteButton.dataset.favoriteId = creature.id;
      favoriteButton.setAttribute("aria-label", creature.name + "を おきにいりにする");
      favoriteButton.addEventListener("click", () => {
        const result = selectFavorite(creature.id);
        if (result === "unavailable") return;
        renderFavorite(result === "session-only"
          ? "この画面を とじると、おきにいりを わすれてしまうかも。"
          : `${creature.name}に きめた！`);
      });
      choice.append(tile, favoriteButton);
      grid.append(choice);
    } else grid.append(tile);
  }
  renderFavorite();
}
function showHome(open: boolean): void {
  if (open) stopExplorationMovement?.();
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
  updateScreenTheme();
  if (home) home.hidden = !open;
  if (controls) controls.hidden = open || bookOpen;
  if (homeButton) homeButton.hidden = open;
  if (resetButton) resetButton.hidden = open;
  if (expeditionHud) expeditionHud.hidden = open;
  if (progressLabel) progressLabel.hidden = open;

  if (inspectButton) inspectButton.hidden = open;

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
  if (open) stopExplorationMovement?.();
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
  updateScreenTheme();
  if (book) book.hidden = !open;
  if (controls) controls.hidden = open || homeOpen;
  // From home, the book's destination button already goes home; avoid duplicates.
  if (homeButton) homeButton.hidden = homeOpen || (open && resumeHomeAfterBook);
  if (resetButton) resetButton.hidden = open || homeOpen;
  if (expeditionHud) expeditionHud.hidden = open || homeOpen;
  if (progressLabel) progressLabel.hidden = open || homeOpen;

  if (inspectButton) inspectButton.hidden = open || homeOpen;

  if (toggleBook) {
    toggleBook.textContent = open ? (resumeHomeAfterBook ? "🏠 おうちへ" : "🌲 森にもどる") : "📖 ずかんをみる";
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
  private creatureSprites: Phaser.GameObjects.Image[] = [];
  private playerSprite!: Phaser.GameObjects.Image;
  private companion: ReturnType<typeof loadFavorite> = null;
  private walkPath: Point[] = [];
  private lastPathMoveAt = 0;
  private pointerStart?: { id: number; x: number; y: number };

  constructor() { super("Forest"); }

  preload(): void {
    for (const creature of CREATURES) this.load.svg(creature.id, CREATURE_ART[creature.id], { width: 80, height: 80 });
    this.load.svg("explorer", explorerArt, { width: 80, height: 80 });
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.playerSprite = this.add.image(0, 0, "explorer").setDisplaySize(38, 38).setDepth(2);
    this.newForest();
    inspectButton?.addEventListener("click", () => this.inspect());
    startNewExpedition = () => this.newForest();
    stopExplorationMovement = () => {
      if (this.walkPath.length) say("ここで とまるよ。");
      this.stopMovement();
    };
    const canvas = this.game.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "いきたい ばしょを タップして移動。キーボードでも操作できます。");
    const pointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || bookOpen || homeOpen || announcementOpen) return;
      const point = mapPointAt({ x: event.clientX, y: event.clientY }, canvas.getBoundingClientRect());
      if (point?.x === this.world.player.x && point.y === this.world.player.y) {
        this.stopMovement();
        say("ここで とまるよ。");
        return;
      }
      this.pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const pointerUp = (event: PointerEvent) => {
      const start = this.pointerStart;
      this.pointerStart = undefined;
      if (!start || event.button !== 0 || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
      if (bookOpen || homeOpen || announcementOpen) return;
      const destination = mapPointAt({ x: event.clientX, y: event.clientY }, canvas.getBoundingClientRect());
      if (!destination) return;
      canvas.focus({ preventScroll: true });
      this.stopMovement();
      this.walkPath = findWalkPath(this.world, destination);
      this.lastPathMoveAt = this.time.now - 160;
      say(this.walkPath.length ? "しるしの ばしょへ あるくよ！ じぶんを タップすると とまるよ。"
        : destination.x === this.world.player.x && destination.y === this.world.player.y ? "ここで とまるよ。" : "そこへは いけないみたい。みちを タップしてね。");
      this.renderWorld();
    };
    const cancelPointer = () => { this.pointerStart = undefined; };
    const pointerMove = (event: PointerEvent) => {
      const start = this.pointerStart;
      if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancelPointer();
    };
    const stop = () => stopExplorationMovement?.();
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointercancel", cancelPointer);
    canvas.addEventListener("pointerleave", cancelPointer);
    window.addEventListener("blur", stop);
    controls?.addEventListener("toggle", stop);
    this.keyHandler = (event: KeyboardEvent) => {
      if (bookOpen || homeOpen || announcementOpen) return;
      if (event.key === "Escape") {
        stopExplorationMovement?.();
        return;
      }
      if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select, summary, a")) return;
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
        if (!event.repeat) {
          this.stopMovement();
          this.move(direction);
        }
      }
    };
    window.addEventListener("keydown", this.keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointercancel", cancelPointer);
      canvas.removeEventListener("pointerleave", cancelPointer);
      window.removeEventListener("blur", stop);
      controls?.removeEventListener("toggle", stop);
      stopExplorationMovement = undefined;
    });

    document.querySelector("#reset")?.addEventListener("click", () => this.newForest());
    document.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach((button) => {
      const dir = button.dataset.direction as Direction;
      const start = (event: PointerEvent) => {
        if (bookOpen || homeOpen || announcementOpen) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.stopMovement();
        this.heldDirection = dir;
        this.lastMoveAt = this.time.now;
        this.move(dir);
      };
      button.addEventListener("pointerdown", start);
      button.addEventListener("click", (event) => {
        if (event.detail !== 0 || bookOpen || homeOpen || announcementOpen) return;
        this.stopMovement();
        this.move(dir);
      });
      const stop = () => { if (this.heldDirection === dir) this.heldDirection = null; };
      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("lostpointercapture", stop);
    });
  }

  update(time: number): void {
    if (bookOpen || homeOpen || announcementOpen) {
      this.stopMovement();
      return;
    }
    if (time - this.lastFrameAt >= 50) {
      this.lastFrameAt = time;
      this.renderWorld();
    }
    if (this.heldDirection && time - this.lastMoveAt >= 160) {
      this.lastMoveAt = time;
      this.move(this.heldDirection);
    }
    if (this.walkPath.length && time - this.lastPathMoveAt >= 160) {
      const next = this.walkPath.shift()!;
      const direction = (Object.keys(MOVES) as Direction[]).find((key) =>
        this.world.player.x + MOVES[key].x === next.x && this.world.player.y + MOVES[key].y === next.y,
      );
      if (!direction || !isWalkable(this.world, next)) this.stopMovement();
      else {
        this.lastPathMoveAt = time;
        this.move(direction);
        if (!this.walkPath.length && !announcementOpen) say("とうちゃく！ まわりを みてみよう。");
      }
    }
  }

  private stopMovement(): void {
    this.heldDirection = null;
    this.walkPath = [];
    this.pointerStart = undefined;
  }

  private newForest(): void {
    this.stopMovement();
    this.world = createWorld();
    this.companion = loadFavorite();
    const companion = findCreature(this.companion ?? "");
    if (companionPortrait) {
      companionPortrait.replaceChildren();
      companionPortrait.hidden = !companion;
      if (companion) companionPortrait.append(createCreaturePortrait(companion.id));
    }
    if (companionName) {
      companionName.textContent = companion?.name ?? "";
      companionName.hidden = !companion;
    }
    for (const sprite of this.creatureSprites) sprite.destroy();
    this.creatureSprites = this.world.encounters.map((encounter) =>
      this.add.image(0, 0, encounter.id).setDisplaySize(38, 38).setDepth(1),
    );
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
    if (bookOpen || homeOpen || announcementOpen) return;
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
    this.stopMovement();
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
      completed ? () => showAnnouncement("🎉", "この森の モリルを ぜんぶ みつけた！", "おめでとう！ おうちへ かえってもいいし、森を あるいてもいいよ！") : undefined,
    );
    announcementIcon?.replaceChildren(createCreaturePortrait(creature.id));
    this.heldDirection = null;
    this.stepsWithoutDiscovery = 0;
    say(isNew ? `✨ ${creature.name}を はっけん！ ずかんに とうろくしたよ！` : `🌟 ${creature.name}を はっけん！ （ずかん とうろくずみ）`);
  }

  private updateExpeditionProgress(): void {
    const { found, total } = expeditionProgress(this.world.encounters);
    const spot = nearbySearchSpot(this.world, this.world.player);
    if (progressLabel) progressLabel.textContent = `🌿 この森で ${found} / ${total} しゅるい はっけん`;
    if (exploreTip) {
      const tip = explorationGuidance(this.companion, this.stepsWithoutDiscovery, spot);
      if (exploreTip.textContent !== tip) exploreTip.textContent = tip;
    }
    if (inspectButton) {
      inspectButton.disabled = !spot || announcementOpen;
      inspectButton.classList.toggle("inspect-ready", Boolean(spot));
      inspectButton.setAttribute("aria-label", spot ? `${SPOT_LABELS[spot]}を しらべる` : "まわりをしらべる");
    }
  }

  private renderWorld(): void {
    const g = this.graphics;
    g.clear();
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        drawForestTile(g, { x, y }, this.world.tiles[y][x] === 1);
      }
    }
    const destination = this.walkPath.at(-1);
    if (destination) {
      g.lineStyle(2, 0xffe5a2);
      g.strokeRoundedRect(destination.x * TILE_SIZE + 3, destination.y * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6, 8);
    }
    for (const [index, encounter] of this.world.encounters.entries()) {
      const creature = findCreature(encounter.id);
      const sprite = this.creatureSprites[index];
      const bob = Math.sin(this.time.now / 1000 * (encounter.id === "pufflet" ? 2.9 : 3.6) + encounter.position.x) * 2;
      sprite.setPosition(encounter.position.x * TILE_SIZE + 20, encounter.position.y * TILE_SIZE + 19 + bob);
      sprite.setVisible(!encounter.hidden || encounter.discovered);
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
      } else if (creature) {
        g.fillStyle(0x365848, 0.25);
        g.fillEllipse(encounter.position.x * TILE_SIZE + 20, encounter.position.y * TILE_SIZE + 36, 26, 5);
      }
    }
    const p = this.world.player;
    g.fillStyle(0x213c3f);
    g.fillEllipse(p.x * TILE_SIZE + 20, p.y * TILE_SIZE + 33, 23, 8);
    this.playerSprite.setPosition(p.x * TILE_SIZE + 20, p.y * TILE_SIZE + 20);
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
  input: { touch: { capture: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [ForestScene],
});
