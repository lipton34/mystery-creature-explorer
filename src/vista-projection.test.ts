import { describe, expect, it } from "vitest";
import { vistaColumn, vistaOpacity, vistaTailRect, VISTA_LAYERS, VISTA_WIDTH } from "./vista-projection";

const LOOKOUT = { x: 5.5, y: 7.5, angle: Math.PI / 2 };

describe("localized layered river vista", () => {
  it("aligns all layers at the lookout", () => {
    expect(vistaOpacity(LOOKOUT)).toBe(1);
    for (const depth of Object.values(VISTA_LAYERS)) {
      for (const column of [0, 320, 640]) {
        const sample = vistaColumn(LOOKOUT, depth, column)!;
        expect(sample.source).toBeCloseTo(column + (VISTA_WIDTH - 640) / 2);
        expect(sample.scale).toBeCloseTo(1);
        expect(sample.top).toBeCloseTo(0);
      }
    }
  });

  it("fades in on approach and stays absent in other rooms and headings", () => {
    expect(vistaOpacity({ ...LOOKOUT, x: 3.5 })).toBe(0);
    expect(vistaOpacity({ ...LOOKOUT, x: 4 })).toBeGreaterThan(0);
    expect(vistaOpacity({ ...LOOKOUT, x: 4 })).toBeLessThan(1);
    expect(vistaOpacity({ ...LOOKOUT, x: 4.5 })).toBe(1);
    for (const pose of [{ ...LOOKOUT, angle: 0 }, { ...LOOKOUT, angle: Math.PI }, { ...LOOKOUT, angle: Math.PI * 1.5 }, { ...LOOKOUT, y: 6.5 }, { ...LOOKOUT, x: 8.5 }, { x: 2.5, y: 9.5, angle: 0 }]) expect(vistaOpacity(pose)).toBe(0);
  });

  it("projects the foreground more strongly than the distant forest during movement", () => {
    const approach = { ...LOOKOUT, x: 4.5 };
    expect(vistaColumn(approach, VISTA_LAYERS.foreground, 320)!.scale).toBeLessThan(vistaColumn(approach, VISTA_LAYERS.background, 320)!.scale);
    const sideways = { ...LOOKOUT, y: 7.7 };
    expect(vistaColumn(sideways, VISTA_LAYERS.foreground, 320)!.source).toBeGreaterThan(vistaColumn(sideways, VISTA_LAYERS.background, 320)!.source);
  });

  it("pans layers when turning and rejects planes behind the camera", () => {
    const turned = { ...LOOKOUT, angle: LOOKOUT.angle + 0.3 };
    expect(vistaColumn(turned, VISTA_LAYERS.background, 320)!.source).toBeGreaterThan(vistaColumn(LOOKOUT, VISTA_LAYERS.background, 320)!.source);
    expect(vistaOpacity(turned)).toBeGreaterThan(0);
    expect(vistaOpacity(turned)).toBeLessThan(1);
    expect(vistaColumn({ ...LOOKOUT, angle: -Math.PI / 2 }, 12, 320)).toBeUndefined();
    expect(vistaColumn({ ...LOOKOUT, x: 13 }, 12, 320)).toBeUndefined();
  });

  it("keeps tail size constant while crossing left to right, without automatic looping", () => {
    const early = vistaTailRect(0.25, false)!;
    const late = vistaTailRect(0.75, false)!;
    expect(late.x).toBeGreaterThan(early.x);
    expect(late.width).toBe(early.width);
    expect(late.height).toBe(early.height);
    expect(vistaTailRect(0, true)!.x + early.width).toBeLessThan(0);
    expect(vistaTailRect(0.99, true)!.x).toBeGreaterThan(VISTA_WIDTH);
    expect(vistaTailRect(-0.1, false)).toBeUndefined();
    expect(vistaTailRect(1, false)).toBeUndefined();
    expect(vistaTailRect(0.3, true)!.y).toBe(vistaTailRect(0.6, true)!.y);
  });
});
