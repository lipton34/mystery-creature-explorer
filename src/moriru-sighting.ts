export const SIGHTING_DURATION = 5200;
export const TAIL_SEGMENTS = 72;

export type TailSection = { x: number; y: number; height: number; radius: number };

export function tailSection(progress: number, along: number, reduceMotion = false): TailSection {
  const phase = Math.max(0, Math.min(1, progress));
  const length = Math.max(0, Math.min(1, along));
  const weightShift = reduceMotion ? 0 : Math.sin(phase * Math.PI * 4) * 0.025;
  const sway = reduceMotion ? 0 : Math.sin(phase * Math.PI * 2 - length * 1.4) * 0.04 * length;
  return {
    x: 8.65,
    y: 9.1 - phase * 6.5 + length * 2.35,
    height: 0.8 - length * 0.14 + Math.sin(length * Math.PI) * 0.08 + weightShift + sway,
    radius: 0.28 * (1 - length) ** 0.95 + 0.006,
  };
}
