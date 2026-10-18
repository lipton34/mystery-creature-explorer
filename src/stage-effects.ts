export const IMPACT_DURATION = 420;

export function impactOffset(elapsed: number | undefined, reduceMotion: boolean): { x: number; y: number } {
  if (reduceMotion || elapsed === undefined || elapsed < 0 || elapsed >= IMPACT_DURATION) return { x: 0, y: 0 };
  const strength = (1 - elapsed / IMPACT_DURATION) * 2;
  return { x: Math.sin(elapsed * 0.08) * strength, y: Math.cos(elapsed * 0.1) * strength };
}
