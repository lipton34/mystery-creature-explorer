import Phaser from "phaser";
import "./style.css";
import "./first-person.css";
import { renderEncyclopedia } from "./encyclopedia";
import { applyExplorationAction, canWitnessTail, createPerspectiveState, footprintInReach, HEADINGS, inspectFootprint, knownMapCells, type ExplorationAction, type ViewPose } from "./perspective-world";
import { drawPerspective, VIEW_HEIGHT, VIEW_WIDTH } from "./perspective-renderer";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app is missing");
app.className = "perspective-app";
app.innerHTML = `
  <header>
    <div><h1>曲がり道のむこう</h1><p class="prototype-label">主観視点・自動マップの体験試作／仮の描画</p></div>
    <div class="header-actions"><button id="prototype-book" type="button" aria-expanded="false" aria-controls="encyclopedia">ずかんをみる</button><button id="prototype-reset" type="button">最初から</button><a href="./">おうちへ</a></div>
  </header>
  <main class="perspective-layout">
    <div class="perspective-view">
      <div id="perspective-game" aria-label="主観視点の探索画面"></div>
      <section id="encyclopedia" aria-label="モリルの図鑑" hidden><div class="book-heading"><h2>モリルのずかん</h2><span id="collection-count"></span></div><div id="encyclopedia-grid"></div></section>
    </div>
    <aside class="map-panel" aria-label="自動で埋まる地図"><h2>歩いた道の記録</h2><canvas id="auto-map" width="176" height="144" role="img" aria-label="自動マップ"></canvas><p>明るいマス：歩いた道<br>暗いマス：まだ知らない場所<br>▲：現在地と向き<br><span id="map-count"></span></p></aside>
  </main>
  <div class="perspective-tools">
    <p id="view-status" role="status" aria-live="polite"></p>
    <div class="perspective-actions" role="group" aria-label="主観視点の移動"><button type="button" data-action="left">↶ 左を向く</button><button type="button" data-action="forward">↑ 前へ</button><button type="button" data-action="backward">↓ 後ろへ</button><button type="button" data-action="right">右を向く ↷</button></div>
    <button id="prototype-inspect" type="button">調べる</button>
    <button id="tail-replay" type="button" hidden>目撃地点から再生</button>
  </div>
  <p id="prototype-message" class="prototype-message" role="status" aria-live="polite">この先は、まだ知らない道。足元や曲がり角に目を向けながら、進んでみよう。</p>
  <footer>矢印キー・W/S：前進／後退、左右キー・A/D：方向転換、Space：調べる。ボタンでも操作できます。地図は移動先の指定には使いません。<br>今回は足跡としっぽの目撃まで。ステージ1の完成版ではありません。探索記録は再読み込みでリセットされ、図鑑・お気に入りは変更しません。</footer>
`;

function element<ElementType extends HTMLElement>(selector: string): ElementType {
  const found = document.querySelector<ElementType>(selector);
  if (!found) throw new Error(`${selector} is missing`);
  return found;
}
const status = element("#view-status");
const message = element("#prototype-message");
const mapCanvas = element<HTMLCanvasElement>("#auto-map");
const book = element("#encyclopedia");
const bookButton = element<HTMLButtonElement>("#prototype-book");
const inspectButton = element<HTMLButtonElement>("#prototype-inspect");
const replayButton = element<HTMLButtonElement>("#tail-replay");
const actionButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-action]"));

class PerspectiveScene extends Phaser.Scene {
  private state = createPerspectiveState();
  private graphics!: Phaser.GameObjects.Graphics;
  private transition?: { from: ViewPose; to: ViewPose; startedAt: number };
  private tailStartedAt?: number;
  private bookOpen = false;
  private bookOpenedAt = 0;
  private reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor() { super("PerspectivePrototype"); }

  create(): void {
    this.graphics = this.add.graphics();
    this.game.canvas.tabIndex = 0;
    this.game.canvas.setAttribute("aria-label", "主観視点。矢印キーで前進・後退・方向転換、スペースで調査。");
    for (const button of actionButtons) button.addEventListener("click", () => this.act(button.dataset.action as ExplorationAction));
    inspectButton.addEventListener("click", () => this.inspect());
    replayButton.addEventListener("click", () => {
      if (this.bookOpen || this.transition || this.tailStartedAt !== undefined) return;
      this.state.player = { x: 2, y: 4 };
      this.state.heading = 0;
      this.tailStartedAt = this.time.now;
      message.textContent = "曲がり角の向こうを、何かのしっぽが横切った……！";
      this.refresh();
      this.game.canvas.focus({ preventScroll: true });
    });
    element("#prototype-reset").addEventListener("click", () => {
      this.state = createPerspectiveState();
      this.transition = undefined;
      this.tailStartedAt = undefined;
      this.bookOpen = false;
      book.hidden = true;
      bookButton.textContent = "ずかんをみる";
      bookButton.setAttribute("aria-expanded", "false");
      message.textContent = "この先は、まだ知らない道。足元や曲がり角に目を向けながら、進んでみよう。";
      this.refresh();
      this.game.canvas.focus({ preventScroll: true });
    });
    bookButton.addEventListener("click", () => {
      this.bookOpen = !this.bookOpen;
      book.hidden = !this.bookOpen;
      bookButton.textContent = this.bookOpen ? "探索にもどる" : "ずかんをみる";
      bookButton.setAttribute("aria-expanded", String(this.bookOpen));
      if (this.bookOpen) {
        this.bookOpenedAt = this.time.now;
        renderEncyclopedia();
      } else {
        const pause = this.time.now - this.bookOpenedAt;
        if (this.transition) this.transition.startedAt += pause;
        if (this.tailStartedAt !== undefined) this.tailStartedAt += pause;
        this.game.canvas.focus({ preventScroll: true });
      }
      this.refresh();
    });
    const keyHandler = (event: KeyboardEvent) => {
      if (this.bookOpen) return;
      if (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, select")) return;
      const actions: Record<string, ExplorationAction> = { ArrowUp: "forward", w: "forward", ArrowDown: "backward", s: "backward", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
      if (event.repeat && (actions[event.key] || event.key === " ")) { event.preventDefault(); return; }
      if (event.key === " ") { event.preventDefault(); this.inspect(); }
      else if (actions[event.key]) { event.preventDefault(); this.act(actions[event.key]); }
    };
    window.addEventListener("keydown", keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener("keydown", keyHandler));
    this.refresh();
  }

  private pose(): ViewPose {
    return { x: this.state.player.x + 0.5, y: this.state.player.y + 0.5, angle: this.state.heading * Math.PI / 2 };
  }

  private act(action: ExplorationAction): void {
    if (this.bookOpen || this.transition || this.tailStartedAt !== undefined) return;
    this.game.canvas.focus({ preventScroll: true });
    const from = this.pose();
    if (!applyExplorationAction(this.state, action)) {
      message.textContent = "こちらは木々にふさがれている。向きを変えてみよう。";
      return;
    }
    const to = this.pose();
    if (action === "left") to.angle = from.angle - Math.PI / 2;
    if (action === "right") to.angle = from.angle + Math.PI / 2;
    this.transition = { from, to, startedAt: this.time.now };
    this.refresh();
  }

  private inspect(): void {
    if (this.bookOpen || this.transition || this.tailStartedAt !== undefined) return;
    if (inspectFootprint(this.state)) message.textContent = "靴がふたつ入りそうな、大きな足跡。丸い指のあとが三つ。次の足跡までも、ずいぶん離れている。どんなモリルが歩いたのだろう？";
    else message.textContent = "今いる場所からは、調べられるものは見当たらない。";
    this.refresh();
    this.game.canvas.focus({ preventScroll: true });
  }

  private refresh(): void {
    const busy = this.bookOpen || Boolean(this.transition) || this.tailStartedAt !== undefined;
    for (const button of actionButtons) button.disabled = busy;
    inspectButton.disabled = busy || !footprintInReach(this.state);
    inspectButton.setAttribute("aria-label", "足跡を調べる");
    replayButton.hidden = !this.state.witnessedTail;
    replayButton.disabled = busy;
    const text = `${HEADINGS[this.state.heading]}を向いている · ${this.state.inspectedFootprint ? "足跡を調査済み" : footprintInReach(this.state) ? "足元か正面に大きな足跡。調べてみよう。" : "足元と曲がり角を見てみよう。"}`;
    if (status.textContent !== text) status.textContent = text;
    this.drawMap();
  }

  private drawMap(): void {
    const context = mapCanvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#132725";
    context.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    for (const { position, floor } of knownMapCells(this.state)) {
      context.fillStyle = floor ? "#b4b89b" : "#42594e";
      context.fillRect(position.x * 16 + 1, position.y * 16 + 1, 14, 14);
    }
    context.save();
    context.translate(this.state.player.x * 16 + 8, this.state.player.y * 16 + 8);
    context.rotate(this.state.heading * Math.PI / 2);
    context.fillStyle = "#ffe2a0";
    context.strokeStyle = "#203d38";
    context.beginPath();
    context.moveTo(0, -7); context.lineTo(6, 6); context.lineTo(0, 3); context.lineTo(-6, 6); context.closePath();
    context.fill(); context.stroke(); context.restore();
    mapCanvas.setAttribute("aria-label", `探索済み${this.state.visited.size}マス。現在地は東西${this.state.player.x}、南北${this.state.player.y}、${HEADINGS[this.state.heading]}向き。未探索の道は非表示。`);
    element("#map-count").textContent = `${this.state.visited.size}マスを記録`;
  }

  update(time: number): void {
    if (this.bookOpen) return;
    let pose = this.pose();
    if (this.transition) {
      const progress = Math.min(1, (time - this.transition.startedAt) / (this.reduceMotion ? 80 : 240));
      const eased = progress * progress * (3 - 2 * progress);
      const { from, to } = this.transition;
      pose = { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased, angle: from.angle + (to.angle - from.angle) * eased };
      if (progress === 1) {
        this.transition = undefined;
        if (canWitnessTail(this.state)) {
          this.state.witnessedTail = true;
          this.tailStartedAt = time;
          message.textContent = "曲がり角の向こうを、何かのしっぽが横切った……！ 全身は木々の向こうに隠れている。";
        }
        this.refresh();
      }
    }
    const tailProgress = this.tailStartedAt === undefined ? undefined : (time - this.tailStartedAt) / 3200;
    drawPerspective(this.graphics, pose, tailProgress);
    if (tailProgress !== undefined && tailProgress >= 1) {
      this.tailStartedAt = undefined;
      message.textContent = "しっぽは曲がり角の奥へ消えた。大きな足跡の主だろうか？ この先に何がいるか、想像してみよう。今回はここまでが体験試作です。道の探索は続けられます。";
      this.refresh();
    }
  }
}

new Phaser.Game({ type: Phaser.AUTO, parent: "perspective-game", width: VIEW_WIDTH, height: VIEW_HEIGHT, backgroundColor: "#334c46", input: { touch: { capture: false } }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [PerspectiveScene] });
