import { FOOTPRINT } from "./perspective-world";

const PRINT_CENTERS = [{ x: 0.32, y: 0.28 }, { x: 0.68, y: 0.68 }] as const;

export function footprintContains(horizontal: number, vertical: number): boolean {
  const localX = horizontal - FOOTPRINT.x;
  const localY = vertical - FOOTPRINT.y;
  if (localX < 0 || localX >= 1 || localY < 0 || localY >= 1) return false;
  for (const center of PRINT_CENTERS) {
    const offsetX = localX - center.x;
    const offsetY = localY - center.y;
    if ((offsetX / 0.12) ** 2 + (offsetY / 0.15) ** 2 <= 1) return true;
    for (const toe of [-0.085, 0, 0.085]) {
      if (((offsetX - toe) / 0.04) ** 2 + ((offsetY + 0.18) / 0.055) ** 2 <= 1) return true;
    }
  }
  return false;
}
