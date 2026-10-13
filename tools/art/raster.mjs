/**
 * A STAND-IN FOR PHASER'S GRAPHICS THAT PAINTS INTO A `.sprite` FRAME.
 *
 * The game draws every placeholder with a handful of Graphics calls —
 * `lineStyle` + `lineBetween`, `fillStyle` + `fillTriangle`, `fillCircle`,
 * `fillRect`. Hand this object to the SAME function the game calls and it
 * paints those shapes into a grid of palette keys instead of onto the screen,
 * so a placeholder sheet is a transcription of what the game already draws
 * rather than a second drawing somebody has to keep in step with it.
 *
 * A pixel is painted when its CENTRE is inside the shape — the rule
 * `tools/geo-sprites.mjs` uses, so a 3px radius reads as the 6px ball the
 * engine draws. A colour not in the palette, or one fainter than `minAlpha`,
 * paints nothing: placeholders are flat, and a fade is the next frame's job.
 */

export class PaintGraphics {
  /**
   * @param w, h     the frame's size
   * @param palette  [{ key, hex }] — the sheet's declared colours
   */
  constructor(w, h, palette, { minAlpha = 0.15 } = {}) {
    this.w = w; this.h = h;
    this.rows = Array.from({ length: h }, () => Array(w).fill('.'));
    this.keyOf = new Map(palette.map((p) => [parseInt(p.hex.slice(1), 16), p.key]));
    this.minAlpha = minAlpha;
    this.line = { width: 1, key: null };
    this.fill = { key: null };
  }

  pick(color, alpha) {
    if (alpha < this.minAlpha) return null;
    return this.keyOf.get(color) ?? null;
  }

  lineStyle(width, color, alpha = 1) { this.line = { width, key: this.pick(color, alpha) }; return this; }
  fillStyle(color, alpha = 1) { this.fill = { key: this.pick(color, alpha) }; return this; }

  each(key, inside) {
    if (key == null) return;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) if (inside(x + 0.5, y + 0.5)) this.rows[y][x] = key;
    }
  }

  /** A line of `width`, square-ended, as Phaser draws one. */
  lineBetween(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1e-6;
    const ux = dx / len, uy = dy / len, half = this.line.width / 2;
    this.each(this.line.key, (x, y) => {
      const ax = x - x0, ay = y - y0;
      const along = ax * ux + ay * uy, across = -ax * uy + ay * ux;
      return along >= 0 && along <= len && Math.abs(across) <= half;
    });
    return this;
  }

  fillTriangle(ax, ay, bx, by, cx, cy) {
    const side = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
    this.each(this.fill.key, (x, y) => {
      const d1 = side(x, y, ax, ay, bx, by), d2 = side(x, y, bx, by, cx, cy), d3 = side(x, y, cx, cy, ax, ay);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    });
    return this;
  }

  fillCircle(cx, cy, r) {
    this.each(this.fill.key, (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);
    return this;
  }

  fillRect(rx, ry, rw, rh) {
    this.each(this.fill.key, (x, y) => x >= rx && x < rx + rw && y >= ry && y < ry + rh);
    return this;
  }

  /** The finished frame, as `.sprite` rows. */
  done() { return this.rows.map((r) => r.join('')); }
}
