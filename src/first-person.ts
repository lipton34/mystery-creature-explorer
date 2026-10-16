import Phaser from "phaser";
import "./style.css";
import "./first-person.css";
import { renderEncyclopedia } from "./encyclopedia";
import { applyExplorationAction, canWitnessTail, createPerspectiveState, explorationDestination, FAR_BANK, HEADINGS, inspectionTarget, inspectFootprint, knownMapCells, LOG_APPROACH, PROTOTYPE_MAP, TAIL_HEADING, TAIL_LOOKOUT, terrainAt, type ExplorationAction, type ViewPose } from "./perspective-world";
import { drawPerspective, VIEW_HEIGHT, VIEW_WIDTH } from "./perspective-renderer";
import { EXPLORATION_MESSAGES, messageAfterAction } from "./perspective-messages";
import { SIGHTING_DURATION } from "./moriru-sighting";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app is missing");
app.className = "perspective-app";
app.innerHTML = `
  <header>
    <div><h1>木漏れ日の小川</h1><p class="prototype-label">ステージ1・導線の確認版／仮の描画</p></div>
    <div class="header-actions"><button id="prototype-book" type="button" aria-expanded="false" aria-controls="encyclopedia">ずかんをみる</button><button id="prototype-reset" type="button">最初から</button><a href="./">おうちへ</a></div>
  </header>
  <main class="perspective-layout">
    <div class="perspective-view">
      <div id="perspective-game" aria-label="主観視点の探索画面"></div>
      <section id="encyclopedia" aria-label="モリルの図鑑" hidden><div class="book-heading"><h2>モリルのずかん</h2><span id="collection-count"></span></div><div id="encyclopedia-grid"></div></section>
    </div>
    <aside class="map-panel" aria-label="自動マップと探索のヒント">
      <canvas id="auto-map" role="img" aria-label="自動マップ"></canvas>
      <div class="exploration-hints">
        <p id="prototype-message" class="prototype-message" role="status" aria-live="polite" aria-atomic="true">${EXPLORATION_MESSAGES.start}</p>
      </div>
    </aside>
  </main>
  <div class="perspective-tools">
    <div class="perspective-actions" role="group" aria-label="主観視点の移動"><button type="button" data-action="left">↶ 左を向く</button><button type="button" data-action="forward">↑ 前へ</button><button type="button" data-action="right">右を向く ↷</button><button type="button" data-action="strafe-left">← 左へ移動</button><button type="button" data-action="backward">↓ 後ろへ</button><button type="button" data-action="strafe-right">右へ移動 →</button></div>
    <button id="prototype-inspect" type="button">調べる</button>
    <button id="tail-replay" type="button" hidden>目撃地点から再生</button>
  </div>
  <footer>上下キー・W/S：前進／後退、左右キー・A/D：方向転換、Q/E：視点を変えずに左右へ移動、Space：調べる。ボタンでも操作できます。地図は移動先の指定には使いません。<br>今回は川辺の目撃から、渡れる場所を見つけて対岸へ進むまで。大型モリルの全身・発見イベントは未制作です。探索記録は再読み込みでリセットされ、図鑑・お気に入りは変更しません。</footer>
`;

function element<ElementType extends HTMLElement>(selector: string): ElementType {
  const found = document.querySelector<ElementType>(selector);
  if (!found) throw new Error(`${selector} is missing`);
  return found;
}
const message = element("#prototype-message");
const mapCanvas = element<HTMLCanvasElement>("#auto-map");
mapCanvas.width = PROTOTYPE_MAP[0].length * 16;
mapCanvas.height = PROTOTYPE_MAP.length * 16;
const book = element("#encyclopedia");
const bookButton = element<HTMLButtonElement>("#prototype-book");
const inspectButton = element<HTMLButtonElement>("#prototype-inspect");
const replayButton = element<HTMLButtonElement>("#tail-replay");
const actionButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-action]"));

class PerspectiveScene extends Phaser.Scene {
  private state = createPerspectiveState();
  private graphics!: Phaser.GameObjects.Graphics;
  private transition?: { from: ViewPose; to: ViewPose; startedAt: number; action: ExplorationAction; arrivalMessage?: string };
  private tailStartedAt?: number;
  private bookOpen = false;
  private bookOpenedAt = 0;
  private reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor() { super("PerspectivePrototype"); }

  create(): void {
    this.graphics = this.add.graphics();
    this.game.canvas.tabIndex = 0;
    this.game.canvas.setAttribute("aria-label", "主観視点。矢印キーで前進・後退・方向転換、QとEで横移動、スペースで調査。");
    for (const button of actionButtons) button.addEventListener("click", () => this.act(button.dataset.action as ExplorationAction));
    inspectButton.addEventListener("click", () => this.inspect());
    replayButton.addEventListener("click", () => {
      if (this.bookOpen || this.transition || this.tailStartedAt !== undefined) return;
      this.state.player = { ...TAIL_LOOKOUT };
      this.state.heading = TAIL_HEADING;
      this.tailStartedAt = this.time.now;
      this.showMessage(EXPLORATION_MESSAGES.tail);
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
      this.showMessage(EXPLORATION_MESSAGES.start);
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
      const actions: Record<string, ExplorationAction> = { ArrowUp: "forward", w: "forward", ArrowDown: "backward", s: "backward", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", q: "strafe-left", e: "strafe-right" };
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

  private showMessage(text: string): void {
    if (message.textContent !== text) message.textContent = text;
  }

  private act(action: ExplorationAction): void {
    if (this.bookOpen || this.transition || this.tailStartedAt !== undefined) return;
    this.game.canvas.focus({ preventScroll: true });
    const from = this.pose();
    const hadCrossedStream = this.state.crossedStream;
    if (!applyExplorationAction(this.state, action)) {
      const destination = explorationDestination(this.state, action);
      this.showMessage(destination && terrainAt(destination) === "water"
        ? this.state.crossedStream ? EXPLORATION_MESSAGES.blockedWaterAfterCrossing : EXPLORATION_MESSAGES.blockedWater
        : EXPLORATION_MESSAGES.blockedTrees);
      return;
    }
    const to = this.pose();
    if (action === "left") to.angle = from.angle - Math.PI / 2;
    if (action === "right") to.angle = from.angle + Math.PI / 2;
    let arrivalMessage: string | undefined;
    if (!hadCrossedStream && this.state.crossedStream) arrivalMessage = EXPLORATION_MESSAGES.crossed;
    else if (this.state.player.x === FAR_BANK.x && this.state.player.y === FAR_BANK.y) arrivalMessage = EXPLORATION_MESSAGES.farBank;
    else if (this.state.player.x === LOG_APPROACH.x && this.state.player.y === LOG_APPROACH.y && this.state.heading === 0) arrivalMessage = EXPLORATION_MESSAGES.logApproach;
    else if (terrainAt(this.state.player) === "log") arrivalMessage = EXPLORATION_MESSAGES.onLog;
    this.transition = { from, to, startedAt: this.time.now, action, arrivalMessage };
    this.refresh();
  }

  private inspect(): void {
    if (this.bookOpen || this.transition || this.tailStartedAt !== undefined) return;
    const target = inspectionTarget(this.state);
    if (target === "footprint" && inspectFootprint(this.state)) this.showMessage(EXPLORATION_MESSAGES.footprint);
    else if (target === "log") {
      this.state.inspectedLog = true;
      this.showMessage(EXPLORATION_MESSAGES.log);
    }
    else if (target === "water") this.showMessage(this.state.crossedStream ? EXPLORATION_MESSAGES.waterAfterCrossing : EXPLORATION_MESSAGES.water);
    else this.showMessage(EXPLORATION_MESSAGES.noTarget);
    this.refresh();
    this.game.canvas.focus({ preventScroll: true });
  }

  private refresh(): void {
    const busy = this.bookOpen || Boolean(this.transition) || this.tailStartedAt !== undefined;
    for (const button of actionButtons) button.disabled = busy;
    const target = inspectionTarget(this.state);
    const targetName = target === "footprint" ? "足跡" : target === "log" ? "倒木" : target === "water" ? "小川" : undefined;
    inspectButton.disabled = busy || !target;
    inspectButton.setAttribute("aria-label", targetName ? `${targetName}を調べる` : "まわりを調べる");
    replayButton.hidden = !this.state.witnessedTail;
    replayButton.disabled = busy;
    this.drawMap();
  }

  private drawMap(): void {
    const context = mapCanvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#132725";
    context.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    for (const { position, terrain } of knownMapCells(this.state)) {
      context.fillStyle = terrain === "water" ? "#55aaa9" : terrain === "log" ? "#be9255" : terrain === "path" ? "#b4b89b" : "#42594e";
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
  }

  update(time: number): void {
    if (this.bookOpen) return;
    let pose = this.pose();
    if (this.transition) {
      const progress = Math.min(1, (time - this.transition.startedAt) / (this.reduceMotion ? 80 : 240));
      const eased = progress * progress * (3 - 2 * progress);
      const { from, to, action, arrivalMessage } = this.transition;
      pose = { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased, angle: from.angle + (to.angle - from.angle) * eased };
      if (progress === 1) {
        this.transition = undefined;
        if (canWitnessTail(this.state)) {
          this.state.witnessedTail = true;
          this.tailStartedAt = time;
          this.showMessage(EXPLORATION_MESSAGES.tail);
        }
        else this.showMessage(messageAfterAction(message.textContent ?? "", this.state, action, arrivalMessage));
        this.refresh();
      }
    }
    const tailProgress = this.tailStartedAt === undefined ? undefined : (time - this.tailStartedAt) / SIGHTING_DURATION;
    drawPerspective(this.graphics, pose, tailProgress, this.reduceMotion ? 0 : time, this.reduceMotion);
    if (tailProgress !== undefined && tailProgress >= 1) {
      this.tailStartedAt = undefined;
      this.showMessage(EXPLORATION_MESSAGES.afterTail);
      this.refresh();
    }
  }
}

new Phaser.Game({ type: Phaser.AUTO, parent: "perspective-game", width: VIEW_WIDTH, height: VIEW_HEIGHT, backgroundColor: "#334c46", input: { touch: { capture: false } }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [PerspectiveScene] });
