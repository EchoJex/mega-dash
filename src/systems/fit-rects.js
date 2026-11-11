/**
 * FIT RECTANGLES INSIDE A PICTURE — the art-collision trial (branch test/art-collision).
 *
 * The owner's rule (10 Nov 2026): collision follows the visible art, as "up to 5 rectangles
 * for best fit", and "each best fit set of up to 5 rectangles shall not extend beyond any
 * visible pixel". So every rectangle here lies wholly on visible pixels: nothing see-through
 * is ever inside one.
 *
 * `solid(x, y)` says whether a pixel is visible. Each pass takes the biggest rectangle of
 * visible pixels not yet covered, up to `max` of them. Pure arithmetic, no Phaser, so the
 * sprite build and the game share this one copy.
 */
export function fitRects(w, h, solid, max = 5) {
  const free = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) free.push(solid(x, y) ? 1 : 0);
  const out = [];
  for (let n = 0; n < max; n++) {
    // The largest all-free rectangle, row by row: `up[x]` is how many free pixels stand above.
    const up = new Array(w).fill(0);
    let best = null;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) up[x] = free[y * w + x] ? up[x] + 1 : 0;
      for (let x = 0; x < w; x++) {
        let low = up[x];
        for (let x2 = x; x2 < w && low > 0; x2++) {
          low = Math.min(low, up[x2]);
          const area = low * (x2 - x + 1);
          if (area > 0 && (!best || area > best.a)) best = { a: area, x, y: y - low + 1, w: x2 - x + 1, h: low };
        }
      }
    }
    if (!best) break;
    out.push([best.x, best.y, best.w, best.h]);
    for (let y = best.y; y < best.y + best.h; y++) for (let x = best.x; x < best.x + best.w; x++) free[y * w + x] = 0;
  }
  return out;
}
