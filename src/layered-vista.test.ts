import { afterEach, describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import { LayeredVista, preloadVista } from "./layered-vista";

const LOOKOUT = { x: 5.5, y: 7.5, angle: Math.PI / 2 };

function setup(ready = true) {
  const drawImage = vi.fn();
  const context = { drawImage, clearRect: vi.fn() };
  const surfaces: object[] = [];
  vi.stubGlobal("document", { createElement: () => {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn(), clearRect: vi.fn() }) };
    surfaces.push(canvas);
    return canvas;
  } });
  const texture = { context, refresh: vi.fn(), destroy: vi.fn() };
  const image = { setOrigin: vi.fn(), setDepth: vi.fn(), setVisible: vi.fn(), setAlpha: vi.fn() };
  for (const method of Object.values(image)) method.mockReturnValue(image);
  const scene = {
    load: { image: vi.fn() },
    textures: { exists: () => ready, createCanvas: () => texture, get: () => ({ getSourceImage: () => ({}) }) },
    add: { image: () => image },
    events: { once: vi.fn() },
  };
  return { scene: scene as unknown as Phaser.Scene, texture, image, surfaces, drawImage };
}

afterEach(() => vi.unstubAllGlobals());

describe("layered vista composition", () => {
  it("loads three local file assets, including separate transparent layers", () => {
    const { scene } = setup();
    preloadVista(scene);
    const calls = vi.mocked(scene.load.image).mock.calls;
    expect(calls).toHaveLength(3);
    for (const [key, url] of calls) {
      expect(key).toMatch(/^vista-/);
      expect(url).toContain(".png");
      expect(url).not.toMatch(/^data:|^https?:/);
    }
  });

  it("composes background, moving tail and foreground in that order and caches unchanged frames", () => {
    const { scene, texture, surfaces, drawImage } = setup();
    const vista = new LayeredVista(scene);
    expect(vista.draw(LOOKOUT, 0.4, false)).toBe(1);
    const renderedSurfaces = drawImage.mock.calls.map((call) => call[0]);
    expect(renderedSurfaces[0]).toBe(surfaces[0]);
    expect(renderedSurfaces.lastIndexOf(surfaces[0])).toBeLessThan(renderedSurfaces.indexOf(surfaces[2]));
    expect(renderedSurfaces.lastIndexOf(surfaces[2])).toBeLessThan(renderedSurfaces.indexOf(surfaces[1]));
    expect(texture.refresh).toHaveBeenCalledTimes(1);
    vista.draw(LOOKOUT, 0.4, false);
    expect(texture.refresh).toHaveBeenCalledTimes(1);
    vista.draw(LOOKOUT, 0.5, false);
    expect(texture.refresh).toHaveBeenCalledTimes(2);
    vista.draw(LOOKOUT, undefined, false);
    expect(texture.refresh).toHaveBeenCalledTimes(3);
  });

  it("leaves the geometry fallback visible outside the vista or when assets fail to load", () => {
    const { scene, texture, image } = setup(false);
    const vista = new LayeredVista(scene);
    expect(vista.draw(LOOKOUT, 0.4, false)).toBe(0);
    expect(image.setVisible).toHaveBeenLastCalledWith(false);
    expect(texture.refresh).not.toHaveBeenCalled();
    const loaded = setup();
    expect(new LayeredVista(loaded.scene).draw({ ...LOOKOUT, angle: 0 }, 0.4, false)).toBe(0);
    expect(loaded.texture.refresh).not.toHaveBeenCalled();
  });
});
