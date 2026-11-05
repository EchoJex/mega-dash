/**
 * THE AREA ART'S KIT — the sizes every world piece is painted at, and the few drawing helpers the
 * materials and backdrops share.
 *
 * The world pieces (an area's backdrop, ground, platforms, spikes and doors) were drawn as variants
 * for the owner on a review canvas (design/world-art/) and picked there, slice by slice. The picked
 * painters live here so the game and the review pictures paint from one copy.
 *
 * Like the boss rooms' kit (arena-art/pixels.js) these run while an area is being BUILT, never
 * while it is being played: each picture is painted once and then only placed.
 */
import { VIEW_H } from '../../config/display.js';
import { hex } from '../arena-art/pixels.js';

/** The widest screen (VIEW_W tops out at 480), the screen's height, and the ground line (GameScene's GROUND_Y). */
export const W = 480, H = VIEW_H, FLOOR = VIEW_H - 40;

/** Paint `src` (a Raster) into `dst` at x, y, opaque pixels only, optionally faded. */
export function blit(dst, src, x0, y0, a = 255) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const i = (y * src.w + x) * 4;
    if (src.d[i + 3]) dst.set(x0 + x, y0 + y, [src.d[i], src.d[i + 1], src.d[i + 2]], Math.min(a, src.d[i + 3]));
  }
}
export const rect = (r, x, y, w, h, col, a = 255) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) r.set(x + i, y + j, col, a); };
/** A spike-bed tooth: pixel-centre inside the triangle (tx, base) - (tip) - (tx + tw, base). */
export const inTooth = (px, py, tx, tw, top, h) => {
  const t = (py + 0.5 - top) / h;            // 0 at the tip row, 1 at the base
  return t >= 0 && t <= 1 && Math.abs(px + 0.5 - (tx + tw / 2)) <= (tw / 2) * t;
};

/** Every material draws its door the same way round: the game's gold pulse when it will open, a grey ghost when not yet. */
export function paintDoor(r, d, x, y, kind) {
  if (kind === 'unarmed') {
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
      const k = (j * d.w + i) * 4;
      if (!d.d[k + 3]) continue;
      const g = (d.d[k] * 0.3 + d.d[k + 1] * 0.59 + d.d[k + 2] * 0.11) * 0.6 + 30;
      d.d[k] = g; d.d[k + 1] = g; d.d[k + 2] = g * 0.95;
    }
    blit(r, d, x, y, 140);
    return;
  }
  rect(r, x - 2, y - 2, 20, 2, hex('#f5d328'), 204); rect(r, x - 2, y, 2, 28, hex('#f5d328'), 204); rect(r, x + 16, y, 2, 28, hex('#f5d328'), 204);
  blit(r, d, x, y);
}
