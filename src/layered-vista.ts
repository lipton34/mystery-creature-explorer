import type Phaser from "phaser";
import backgroundUrl from "./art/stream-vista/background.png?url&no-inline";
import foregroundUrl from "./art/stream-vista/foreground.png?url&no-inline";
import tailUrl from "./art/stream-vista/tail.png?url&no-inline";
import type { ViewPose } from "./perspective-world";
import { vistaColumn, vistaOpacity, vistaTailRect, VISTA_HEIGHT, VISTA_LAYERS, VISTA_WIDTH } from "./vista-projection";

const ASSETS = { "vista-background": backgroundUrl, "vista-tail": tailUrl, "vista-foreground": foregroundUrl };

export function preloadVista(scene: Phaser.Scene): void {
  for (const [key, url] of Object.entries(ASSETS)) scene.load.image(key, url);
}

function surface(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export class LayeredVista {
  private texture: Phaser.Textures.CanvasTexture;
  private image: Phaser.GameObjects.Image;
  private background = surface(VISTA_WIDTH, VISTA_HEIGHT);
  private foreground = surface(VISTA_WIDTH, VISTA_HEIGHT);
  private tail = surface(VISTA_WIDTH, VISTA_HEIGHT);
  private tailArt: CanvasImageSource;
  private previousFrame = "";
  private ready: boolean;

  constructor(scene: Phaser.Scene) {
    this.ready = Object.keys(ASSETS).every((key) => scene.textures.exists(key));
    this.texture = scene.textures.createCanvas("stream-vista-frame", 640, 400)!;
    this.image = scene.add.image(0, 0, "stream-vista-frame").setOrigin(0).setDepth(1).setVisible(false);
    this.tailArt = this.tail;
    if (this.ready) {
      this.background.getContext("2d")!.drawImage(scene.textures.get("vista-background").getSourceImage() as CanvasImageSource, 0, 0, VISTA_WIDTH, VISTA_HEIGHT);
      this.foreground.getContext("2d")!.drawImage(scene.textures.get("vista-foreground").getSourceImage() as CanvasImageSource, 0, 0, VISTA_WIDTH, VISTA_HEIGHT * 0.82);
      this.tailArt = scene.textures.get("vista-tail").getSourceImage() as CanvasImageSource;
    }
    scene.events.once("shutdown", () => this.texture.destroy());
  }

  draw(pose: ViewPose, progress: number | undefined, reduceMotion: boolean): number {
    const opacity = this.ready ? vistaOpacity(pose) : 0;
    this.image.setVisible(opacity > 0).setAlpha(opacity);
    if (opacity === 0) return 0;
    const frame = `${pose.x},${pose.y},${pose.angle},${progress === undefined ? "none" : Math.floor(progress * 156)},${reduceMotion}`;
    if (frame === this.previousFrame) return opacity;
    this.previousFrame = frame;
    const context = this.texture.context;
    context.clearRect(0, 0, 640, 400);
    this.paintLayer(context, this.background, pose, VISTA_LAYERS.background);
    const tailContext = this.tail.getContext("2d")!;
    tailContext.clearRect(0, 0, VISTA_WIDTH, VISTA_HEIGHT);
    const tailRect = progress === undefined ? undefined : vistaTailRect(progress, reduceMotion);
    if (tailRect) tailContext.drawImage(this.tailArt, tailRect.x, tailRect.y, tailRect.width, tailRect.height);
    this.paintLayer(context, this.tail, pose, VISTA_LAYERS.tail);
    this.paintLayer(context, this.foreground, pose, VISTA_LAYERS.foreground);
    this.texture.refresh();
    return opacity;
  }

  private paintLayer(context: CanvasRenderingContext2D, source: HTMLCanvasElement, pose: ViewPose, planeX: number): void {
    for (let column = 0; column < 640; column += 2) {
      const start = vistaColumn(pose, planeX, column);
      const end = vistaColumn(pose, planeX, column + 2);
      if (!start || !end || start.source < 0 || end.source > VISTA_WIDTH) continue;
      const top = planeX === VISTA_LAYERS.tail ? start.top : Math.min(0, start.top);
      const bottom = start.top + VISTA_HEIGHT * start.scale;
      const height = planeX === VISTA_LAYERS.background ? Math.max(VISTA_HEIGHT, bottom) - top : bottom - top;
      context.drawImage(source, start.source, 0, Math.max(0.1, end.source - start.source), VISTA_HEIGHT, column, top, 2, height);
    }
  }
}
