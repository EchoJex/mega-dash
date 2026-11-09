/**
 * BACKDROP KIT FOR EACH SLICE'S AREA — what every backdrop variant on the review canvas was painted
 * with, and the picked ones (slices.js) in the game (index.js).
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

import { Raster, hex, pick, hash, noise1, noise2, snap5 } from '../arena-art/pixels.js';
import { W, H, FLOOR, blit } from './kit.js';

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

/**
 * A value that repeats every `period` pixels of the world without a seam: across the last `blend`
 * pixels it eases into what the start of the next repeat will be. Without a period it is `fn(wx)`.
 */
export function seamless(fn, wx, period, blend = 64) {
  if (!period) return fn(wx);
  const m = ((wx % period) + period) % period;
  if (m < period - blend) return fn(m);
  const s = (m - (period - blend)) / blend;
  return fn(m) * (1 - s) + fn(m - period) * s;
}

/** A ridge of hills or mountains: noise along the world's x, filled down to the floor. */
export function ridge(r, ox, { y, amp, f = 0.02, seed = 1, col, top, sharp = 0, to = H, period }) {
  for (let x = 0; x < W; x++) {
    const wx = x + ox;
    let n = seamless((w) => noise1(w * f, seed) * 0.7 + noise1(w * f * 3.1, seed + 1) * 0.3, wx, period);
    if (sharp) n = 1 - Math.abs(n * 2 - 1) * sharp - (1 - sharp) * (1 - n);
    const hy = Math.round(y - amp * n);
    for (let yy = Math.max(0, hy); yy < to; yy++) r.set(x, yy, yy === hy && top ? top : col);
  }
}

/** Tower blocks of the given heights, with a few lit windows. */
export function skyline(r, ox, { y = FLOOR, minH, maxH, col, lit, seed = 3, cw = 9, gap = 0.25, rate = 0.12, period }) {
  for (let x = 0; x < W; x++) {
    const wx = x + ox, raw = Math.floor(wx / cw), cell = period ? ((raw % (period / cw)) + period / cw) % (period / cw) : raw, inCell = ((wx % cw) + cw) % cw;
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
export function trees(r, ox, { y = FLOOR, minH, maxH, col, edge, seed = 5, every = 14, kind = 'pine', period }) {
  for (let at = Math.floor((ox - 40) / every); at <= Math.floor((ox + W + 40) / every); at++) {
    const slot = period ? ((at % (period / every)) + period / every) % (period / every) : at;   // with a period, the trees repeat
    if (hash(slot, 0, seed) < 0.15) continue;
    const cx = at * every + Math.floor(hash(slot, 1, seed) * every) - ox;
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
export function clouds(r, ox, { y, h, col, lit, seed = 7, f = 0.04, cut = 0.5, period }) {
  for (let yy = y; yy < y + h; yy++) for (let x = 0; x < W; x++) {
    const t = (yy - y) / h, v = seamless((w) => noise2(w * f, yy * f * 2.2, seed), x + ox, period) - Math.abs(t - 0.5) * 0.6;
    if (v > cut) r.set(x, yy, lit && v < cut + 0.05 && t < 0.5 ? lit : col);
  }
}

/**
 * EMBERS, ASH OR BUBBLES — `n` specks in `cols`, scattered over the screen. Still unless they have a
 * `speed`: then each one appears, drifts that many pixels a step (down; up if negative) swaying a
 * pixel either way, and goes out, on its own clock, coming back to where it started every LIFE steps.
 * A moving part (see `scrolling`), so the game places them every step instead of painting them.
 */
export function drift(seed, n, cols, yMax = FLOOR, speed = 0) {
  const LIFE = 240;
  return {
    pieces: () => cols.flatMap((col, k) => {
      const dot = new Raster(1, 1), two = new Raster(2, 2);
      dot.set(0, 0, col); two.set(0, 1, col); two.set(1, 0, col);
      return [[`d${k}`, dot], [`d${k}+`, two]];
    }),
    at(ox, t) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const u = (hash(i, 4, seed) + t / LIFE) % 1;
        if (speed && (u < 0.1 || u > 0.9)) continue;
        const f = speed * u * LIFE * (0.7 + 0.6 * hash(i, 5, seed)), sway = speed ? Math.round(Math.sin(f * 0.15 + i)) : 0;
        const x = (((Math.floor(hash(i, 0, seed) * 1440 - ox) + sway) % W) + W) % W, y = ((Math.floor(hash(i, 1, seed) * yMax + f) % yMax) + yMax) % yMax;
        const k = Math.floor(hash(i, 2, seed) * cols.length);
        out.push(hash(i, 3, seed) > 0.7 ? [`d${k}+`, x, y - 1] : [`d${k}`, x, y]);
      }
      return out;
    },
  };
}
export function embers(r, seed, n, cols, yMax = FLOOR, ox = 0, t = 0, speed = 0) {
  drawPart(r, drift(seed, n, cols, yMax, speed), ox, t);
}

/** Paint a moving part at one moment: each of its small pictures where `at` puts it. */
export function drawPart(r, part, ox, t, px) {
  const atlas = part.atlas ??= new Map(part.pieces());
  for (const [name, x, y] of part.at(ox, t, px)) blit(r, atlas.get(name), x, y);
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

// ── Building blocks the slices share ─────────────────────────────────

export const still = (name, desc, paint) => ({ name, desc, moving: false, layers: [{ rate: 0, paint }] });
/**
 * A BACKDROP THE GAME CAN DRAW. Each layer scrolls at its `rate` (0 stands still, 1 keeps up with
 * the ground) and is two things: `fixed(r, ox)`, what never moves by itself, which the game paints
 * once into a strip `period` pixels wide that repeats without a seam; and `parts`, the things that
 * do move by themselves (embers, a crowd, a swimming shark), which name their small pictures once
 * (`pieces()`) and say where each one is for a scroll and a moment (`at(ox, t)`), so the game only
 * places them. `paint(r, b, ox, t)` is the same layer painted whole, for the review canvas.
 * Everything that moves by itself comes back to where it started every `loop` steps.
 */
export const scrolling = (name, desc, loop, ...layers) => ({
  name, desc, moving: true, loop,
  layers: layers.map((L) => ({
    ...L,
    parts: L.parts || [],
    paint: (r, b, ox, t = 0, px) => { L.fixed?.(r, ox); for (const part of L.parts || []) drawPart(r, part, ox, t, px); },
  })),
});
export const moving = (name, desc, ...layers) => ({ name, desc, moving: true, layers: layers.map(([rate, paint]) => ({ rate, paint })) });
export const line = (r, x0, y0, x1, y1, col) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) r.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), col);
};
export const vert = (r, x, y0, y1, col) => { for (let y = y0; y < y1; y++) r.set(x, y, col); };
export const wrapX = (wx, ox, period) => ((((wx - ox) % period) + period) % period);

export function pylon(r, x, base, h, col, lamp) {
  for (let j = 0; j < h; j++) {
    const half = Math.round(2 + (j / h) * 8);
    r.set(x - half, base - j, col); r.set(x + half, base - j, col);
    if (j % 8 === 0) for (let i = -half; i <= half; i++) r.set(x + i, base - j, col);
    if (j % 8 < 4) { r.set(x - half + (j % 8), base - j, col); r.set(x + half - (j % 8), base - j, col); }
  }
  for (let i = -12; i <= 12; i++) { r.set(x + i, base - h, col); r.set(x + i, base - h + 6, col); }
  if (lamp) { r.set(x - 12, base - h + 1, lamp); r.set(x + 12, base - h + 1, lamp); r.set(x - 12, base - h + 7, lamp); r.set(x + 12, base - h + 7, lamp); }
}
export function wire(r, x0, x1, y, sag, col) {
  for (let x = x0; x <= x1; x++) { const t = (x - x0) / Math.max(1, x1 - x0); r.set(x, Math.round(y + sag * 4 * t * (1 - t)), col); }
}
export const mod = (a, n) => ((a % n) + n) % n;
