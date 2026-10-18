import type Phaser from "phaser";

export function drawGiantPreview(graphics: Phaser.GameObjects.Graphics, time: number): void {
  graphics.fillStyle(0xb7dfe0).fillRect(0, 0, 640, 400);
  graphics.fillStyle(0x9cba78).fillRect(0, 100, 640, 170);
  graphics.fillStyle(0xcdcb93).fillRect(0, 270, 640, 130);
  for (const trunk of [24, 92, 552, 605]) {
    graphics.fillStyle(0x826c46).fillRect(trunk, 0, 14, 300);
    graphics.fillStyle(0x85ad63).fillCircle(trunk + 4, 35, 62);
  }
  graphics.fillStyle(0x74805a, 0.45).fillEllipse(330, 330, 410, 38);
  const breath = Math.sin(time / 950) * 1.3;
  graphics.fillStyle(0x304f49);
  graphics.fillPoints([{ x: 310, y: 189 + breath }, { x: 240, y: 179 }, { x: 50, y: 230 }, { x: 237, y: 213 }, { x: 299, y: 233 }], true);
  graphics.fillStyle(0x496b57).fillEllipse(339, 196 + breath, 198, 105);
  graphics.fillStyle(0x78865c).fillEllipse(357, 179 + breath, 163, 66);
  graphics.fillStyle(0x304f49);
  graphics.fillPoints([{ x: 389, y: 172 }, { x: 419, y: 95 }, { x: 481, y: 95 }, { x: 446, y: 205 }], true);
  graphics.fillStyle(0x496b57);
  graphics.fillPoints([{ x: 418, y: 86 + breath }, { x: 499, y: 80 + breath }, { x: 526, y: 104 + breath }, { x: 521, y: 137 + breath }, { x: 445, y: 143 + breath }, { x: 420, y: 125 + breath }], true);
  graphics.fillStyle(0xa1a075);
  graphics.fillPoints([{ x: 443, y: 132 + breath }, { x: 521, y: 126 + breath }, { x: 512, y: 145 + breath }, { x: 449, y: 148 + breath }], true);
  graphics.fillStyle(0x304f49);
  graphics.fillPoints([{ x: 357, y: 218 }, { x: 339, y: 265 }, { x: 363, y: 309 }, { x: 403, y: 319 }, { x: 400, y: 329 }, { x: 345, y: 329 }, { x: 308, y: 268 }, { x: 310, y: 224 }], true);
  graphics.fillStyle(0x496b57);
  graphics.fillPoints([{ x: 309, y: 220 }, { x: 284, y: 265 }, { x: 302, y: 307 }, { x: 332, y: 318 }, { x: 331, y: 328 }, { x: 285, y: 328 }, { x: 252, y: 263 }, { x: 273, y: 217 }], true);
  graphics.lineStyle(9, 0x304f49);
  graphics.lineBetween(411, 181, 428, 208).lineBetween(428, 208, 446, 204);
  graphics.fillStyle(0x617454);
  for (let ridge = 0; ridge < 7; ridge++) graphics.fillTriangle(272 + ridge * 20, 156 - ridge * 2, 281 + ridge * 20, 145 - ridge * 2, 291 + ridge * 20, 154 - ridge * 2);
  graphics.fillStyle(0xdfcb81).fillCircle(479, 102 + breath, 3);
  graphics.fillStyle(0x203c38).fillCircle(480, 102 + breath, 1.5);
  graphics.lineStyle(2, 0x203c38).lineBetween(475, 126 + breath, 518, 124 + breath);
}
