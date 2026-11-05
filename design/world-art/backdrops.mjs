/**
 * BACKDROP KIT FOR EACH SLICE'S AREA — VARIANTS FOR THE OWNER TO PICK FROM. NOT IN THE GAME.
 *
 * Drawn by Claude at the owner's request, 2026-11-05: "6 wildly different backdrop variants per
 * slice since the player has to look at it constantly. on a few backdrops, consider a layered
 * parallax effect."
 *
 * Painters for skies, ridges, skylines, forests, beams, rain and the like, all on whole pixels and
 * all built from the coming boss's own colours (`tone`: his primary, darkened). Every painter that
 * takes `ox` draws the world shifted by that many pixels, so a backdrop made of layers can scroll
 * each layer at its own speed: the layered, parallax look. A backdrop stays dark near the floor so
 * the ground, its lit edge and every pit read as well as they do now.
 */

import { hex, pick, hash, noise1, noise2, snap5 } from '../../src/systems/arena-art/pixels.js';
import { W, H, FLOOR } from './variants.mjs';

export const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
/** The boss's primary (or secondary) darkened by k, the way the area backdrop is today. */
export const tn = (b, k, which = 'primary') => hex(b[which]).map((v) => Math.round(6 + v * k));
export const c = hex;

/** A row-by-row gradient between colour stops, each row one colour, as SNES backdrops did. */
export function grad(r, y0, y1, stops, x0 = 0, x1 = W) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [ta, ca] = stops[k], [tb, cb] = stops[k + 1];
    const col = snap5(mix(ca, cb, Math.min(1, Math.max(0, (t - ta) / Math.max(1e-6, tb - ta)))));
    for (let x = x0; x < x1; x++) r.set(x, y, col);
  }
}
export const fillRect = (r, x, y, w, h, col, a = 255) => {
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) r.set(i, j, col, a);
};

export function stars(r, seed, n, yMax, dim, bright, ox = 0) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(((hash(i, 0, seed) * 1440) - ox * 1) % 1440);
    const sx = ((x % W) + W) % W, y = Math.floor(hash(i, 1, seed) * yMax);
    const big = hash(i, 2, seed) > 0.85;
    r.set(sx, y, big ? bright : dim);
    if (big && hash(i, 3, seed) > 0.5) { r.set(sx - 1, y, dim); r.set(sx + 1, y, dim); r.set(sx, y - 1, dim); r.set(sx, y + 1, dim); }
  }
}

/** A round body (moon, sun, planet, lamp glow) shaded from the upper left with ordered dither. */
export function disc(r, cx, cy, rad, cols, craters = 0) {
  for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    if (dx * dx + dy * dy > rad * rad) continue;
    let v = 0.75 - (dx + dy) / (rad * 3.2);
    if (craters && noise2(x * 0.35, y * 0.35, craters) > 0.7) v -= 0.3;
    r.set(x, y, pick(cols, Math.max(0, Math.min(1, v)), x, y));
  }
}
/** A soft halo: rings of dithered colour fading out. */
export function halo(r, cx, cy, rad, col, strength = 0.5) {
  for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / rad;
    if (d > 1) continue;
    if ((1 - d) * strength > ((((x * 7) ^ (y * 13)) & 15) + 0.5) / 16) r.set(x, y, col);
  }
}

/** A ridge of hills or mountains: noise along the world's x, filled down to the floor. */
export function ridge(r, ox, { y, amp, f = 0.02, seed = 1, col, top, sharp = 0, to = H }) {
  for (let x = 0; x < W; x++) {
    const wx = x + ox;
    let n = noise1(wx * f, seed) * 0.7 + noise1(wx * f * 3.1, seed + 1) * 0.3;
    if (sharp) n = 1 - Math.abs(n * 2 - 1) * sharp - (1 - sharp) * (1 - n);
    const hy = Math.round(y - amp * n);
    for (let yy = Math.max(0, hy); yy < to; yy++) r.set(x, yy, yy === hy && top ? top : col);
  }
}

/** Tower blocks of the given heights, with a few lit windows. */
export function skyline(r, ox, { y = FLOOR, minH, maxH, col, lit, seed = 3, cw = 9, gap = 0.25, rate = 0.12 }) {
  for (let x = 0; x < W; x++) {
    const wx = x + ox, cell = Math.floor(wx / cw), inCell = ((wx % cw) + cw) % cw;
    if (hash(cell, 0, seed) < gap) continue;
    const h = minH + Math.floor(hash(cell, 1, seed) * (maxH - minH));
    const roof = hash(cell, 2, seed);
    for (let yy = y - h; yy < y; yy++) {
      if (inCell === 0 && hash(cell, 3, seed) < 0.5) continue;                       // a sliver of sky between some blocks
      const win = lit && (inCell % 3 === 1) && ((yy - (y - h)) % 4 === 2) && hash(wx, yy, seed) < rate && yy < y - 4;
      r.set(x, yy, win ? lit : col);
    }
    if (roof > 0.8 && inCell === Math.floor(cw / 2)) for (let yy = y - h - 5; yy < y - h; yy++) r.set(x, yy, col);   // an antenna
  }
}

/** Trees: pines (triangles) or broadleaf (rounds), seeded along the world's x. */
export function trees(r, ox, { y = FLOOR, minH, maxH, col, edge, seed = 5, every = 14, kind = 'pine' }) {
  for (let slot = Math.floor((ox - 40) / every); slot <= Math.floor((ox + W + 40) / every); slot++) {
    if (hash(slot, 0, seed) < 0.15) continue;
    const cx = slot * every + Math.floor(hash(slot, 1, seed) * every) - ox;
    const h = minH + Math.floor(hash(slot, 2, seed) * (maxH - minH));
    if (kind === 'pine') {
      for (let j = 0; j < h; j++) {
        const half = Math.floor((j / h) * h * 0.32) + 1 - (j % 5 === 4 ? 1 : 0);
        for (let i = -half; i <= half; i++) r.set(cx + i, y - h + j, edge && i === -half ? edge : col);
      }
    } else {
      const rad = Math.floor(h * 0.42);
      for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) {
        if (i * i + j * j > rad * rad + noise2((cx + i + ox) * 0.4, j * 0.4, seed) * 10) continue;
        r.set(cx + i, y - h + rad + j, edge && (i + j < -rad * 0.9) ? edge : col);
      }
      for (let j = y - h + rad * 2; j < y; j++) r.set(cx, j, col);
    }
  }
}

/** A beam of light from a point, as a dithered wedge. */
export function beam(r, x0, y0, angle, spread, len, col, strength = 0.45) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - x0, dy = y - y0, d = Math.hypot(dx, dy);
    if (d > len || d < 1) continue;
    const a = Math.atan2(dy, dx), off = Math.abs(((a - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (off > spread) continue;
    const v = (1 - off / spread) * (1 - d / len) * strength * 2;
    if (v > ((((x * 7) ^ (y * 13)) & 15) + 0.5) / 16) r.set(x, y, col);
  }
}

export function rain(r, seed, n, col, len = 6, ox = 0) {
  for (let i = 0; i < n; i++) {
    const x0 = Math.floor(hash(i, 0, seed) * (W + 60) - ox) , y0 = Math.floor(hash(i, 1, seed) * H);
    for (let k = 0; k < len; k++) { const x = ((x0 - k) % W + W) % W; if (y0 + k < FLOOR) r.set(x, y0 + k, col); }
  }
}

/** A band of cloud: noise above a threshold, with a lit top edge. */
export function clouds(r, ox, { y, h, col, lit, seed = 7, f = 0.04, cut = 0.5 }) {
  for (let yy = y; yy < y + h; yy++) for (let x = 0; x < W; x++) {
    const t = (yy - y) / h, v = noise2((x + ox) * f, yy * f * 2.2, seed) - Math.abs(t - 0.5) * 0.6;
    if (v > cut) r.set(x, yy, lit && v < cut + 0.05 && t < 0.5 ? lit : col);
  }
}

export function embers(r, seed, n, cols, yMax = FLOOR, ox = 0) {
  for (let i = 0; i < n; i++) {
    const x = ((Math.floor(hash(i, 0, seed) * 1440 - ox) % W) + W) % W, y = Math.floor(hash(i, 1, seed) * yMax);
    const col = cols[Math.floor(hash(i, 2, seed) * cols.length)];
    r.set(x, y, col);
    if (hash(i, 3, seed) > 0.7) r.set(x + 1, y - 1, col);
  }
}

/** A lightning bolt from the sky down to a point, a frozen moment of it. */
export function bolt(r, x0, y0, y1, seed, core, glow) {
  let x = x0;
  for (let y = y0; y < y1; y++) {
    if (hash(y, 0, seed) > 0.7) x += hash(y, 1, seed) > 0.5 ? 1 : -1;
    r.set(x - 1, y, glow); r.set(x + 1, y, glow); r.set(x, y, core);
    if (hash(y, 2, seed) > 0.96) for (let k = 1; k < 10; k++) r.set(x + k, y + k, glow);   // a fork
  }
}

/** A wall of repeating panels for an interior: seams, a lit edge and a shadow. */
export function panels(r, ox, { y0 = 0, y1 = FLOOR, pw = 32, ph = 48, base, light, dark }) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const px = (((x + ox) % pw) + pw) % pw, py = (y - y0) % ph;
    r.set(x, y, px === 0 || py === 0 ? dark : px === 1 || py === 1 ? light : base);
  }
}
