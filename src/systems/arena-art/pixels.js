/**
 * PIXEL HELPERS FOR THE 16-BIT ROOMS — used while a room is being BUILT, never
 * while it is being played.
 *
 * These are the design project's own helpers (`lib2/px.js` and `lib2/kit.js`
 * in the Claude Design handoff of 4 Oct 2026), kept as they were so the rooms
 * come out exactly as the owner approved them. They paint into plain canvases
 * at 1x virtual resolution on whole pixels; `index.js` then hands each finished
 * canvas to Phaser once, as a texture.
 *
 * Nothing in here runs per frame. A room's moving parts are drawn ahead of time
 * into numbered frames (`frames` below), so playing the room only ever picks a
 * frame and a position — which is how an SNES game worked, and what keeps a
 * phone from repainting thousands of single pixels sixty times a second.
 */
import { VIEW_H } from '../../config/display.js';

export const H = VIEW_H, TAU = Math.PI * 2;
export const OL = '#0A0A12';

export const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const OLc = hex(OL);
export const css = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// SNES colour is 15-bit: 32 levels per channel.
export const snap5 = (c) => c.map((v) => Math.round(Math.round((Math.max(0, Math.min(255, v)) / 255) * 31) * (255 / 31)));
export const ramp = (list) => list.map(hex);

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** The 4x4 ordered-dither threshold at a pixel, 0..1. */
export const bayer = (x, y) => (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;

export function hash(x, y = 0, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
/** Smooth 1D value noise. */
export function noise1(x, s = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i, 0, s) * (1 - u) + hash(i + 1, 0, s) * u;
}
export function noise2(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  return c;
}

/** Ordered-dither a 0..1 value onto a colour ramp. */
export function pick(rp, v, x, y) {
  const n = rp.length - 1;
  const f = Math.max(0, Math.min(n, v * n));
  let i = Math.floor(f);
  if (f - i > bayer(x, y)) i++;
  return rp[Math.min(n, i)];
}

/** RGBA pixel buffer with its own canvas, flushed once per use. */
export class Raster {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cv = canvas(w, h);
    this.cx = this.cv.getContext('2d');
    this.img = this.cx.createImageData(this.cv.width, this.cv.height);
    this.d = this.img.data;
  }
  set(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, d = this.d;
    if (a >= 255 || d[i + 3] === 0) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; return; }
    const k = a / 255;
    d[i] += (c[0] - d[i]) * k; d[i + 1] += (c[1] - d[i + 1]) * k; d[i + 2] += (c[2] - d[i + 2]) * k;
    d[i + 3] = Math.max(d[i + 3], a);
  }
  a(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[((y | 0) * this.w + (x | 0)) * 4 + 3];
  }
  /** 1px outline round every opaque pixel. */
  outline(c, x0 = 0, y0 = 0, x1 = this.w, y1 = this.h) {
    const mark = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (this.a(x, y)) continue;
      if (this.a(x - 1, y) === 255 || this.a(x + 1, y) === 255 || this.a(x, y - 1) === 255 || this.a(x, y + 1) === 255) mark.push(x, y);
    }
    for (let i = 0; i < mark.length; i += 2) this.set(mark[i], mark[i + 1], c);
  }
  flush() { this.cx.putImageData(this.img, 0, 0); return this.cv; }
}

/** Per-scanline gradient between stops, snapped to 15-bit — an HDMA band. */
export function hdma(n, stops) {
  const s = stops.map(([t, h]) => [t, hex(h)]);
  const out = [];
  for (let y = 0; y < n; y++) {
    const t = y / Math.max(1, n - 1);
    let k = 0;
    while (k < s.length - 2 && t > s[k + 1][0]) k++;
    const [ta, ca] = s[k], [tb, cb] = s[k + 1];
    out.push(snap5(lerp(ca, cb, Math.min(1, Math.max(0, (t - ta) / Math.max(1e-6, tb - ta))))));
  }
  return out;
}

export function R(ctx, x, y, w, h, color, a = 1) {
  if (w <= 0 || h <= 0) return;
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (a !== 1) ctx.globalAlpha = 1;
}
export const dot = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
export const box = R;

/** Visit every pixel of a Bresenham line. */
export function walk(x0, y0, x1, y1, fn) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy, n = 0;
  for (;;) {
    fn(x0, y0, n++);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
export function line(ctx, x0, y0, x1, y1, color, a = 1) {
  ctx.globalAlpha = a; ctx.fillStyle = color;
  walk(x0, y0, x1, y1, (x, y) => ctx.fillRect(x, y, 1, 1));
  ctx.globalAlpha = 1;
}

/** Tiny pixel map to canvas. rows: strings; pal: { char: '#hex' }; '.' is a hole. */
export function sprite(rowsIn, pal) {
  const h = rowsIn.length, w = Math.max(...rowsIn.map((r) => r.length));
  const r = new Raster(w, h);
  rowsIn.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) r.set(x, y, hex(pal[ch])); }));
  return r.flush();
}
export function flipX(src) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
  return c;
}
/** Every other pixel of a sprite, for "about to leave" ghosts. */
export function checker(src) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height);
  for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) if ((i + j) & 1) img.data[(j * c.width + i) * 4 + 3] = 0;
  x.putImageData(img, 0, 0);
  return c;
}
export function rot90(src, k) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.translate(src.width / 2, src.height / 2); x.rotate((k * Math.PI) / 2); x.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}
/** The dotted outline a phased-out platform leaves behind. */
export function dotted(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  for (let i = 0; i < w; i += 2) { ctx.fillRect(x + i, y, 1, 1); ctx.fillRect(x + i, y + h - 1, 1, 1); }
  for (let j = 2; j < h - 1; j += 2) { ctx.fillRect(x, y + j, 1, 1); ctx.fillRect(x + w - 1, y + j, 1, 1); }
}

/** Rows of an HDMA gradient. */
export function rows(r, x0, y0, w, h, stops) {
  const cs = hdma(h, stops);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) r.set(x0 + i, y0 + j, cs[j]);
}
/** Dithered fill: f returns 0..1 (or null to skip). */
export function fill(r, x0, y0, w, h, rp, f) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = x0 + i, y = y0 + j, v = f(x, y, i, j);
    if (v == null) continue;
    r.set(x, y, pick(rp, v, x, y));
  }
}
const shade = (nx, ny, nz) => Math.max(0, -0.5 * nx - 0.35 * ny + 0.79 * nz);
/** Vertical cylinder (pipe, tank, column, bag), lit from the upper left. */
export function vcyl(r, x0, y0, w, h, rp, tone = 0) {
  fill(r, x0, y0, w, h, rp, (x, y, i) => {
    const u = ((i + 0.5) / w) * 2 - 1, nz = Math.sqrt(Math.max(0, 1 - u * u));
    return 0.08 + 0.9 * shade(u, 0, nz) + tone + (Math.abs(u + 0.45) < 0.12 ? 0.18 : 0);
  });
}

/** A canvas of one flat colour. */
export function solid(w, h, c) {
  const cv = canvas(w, h), x = cv.getContext('2d');
  x.fillStyle = c; x.fillRect(0, 0, w, h);
  return cv;
}

/**
 * NAMED SMALL PICTURES ON ONE CANVAS, for a pool of sparks, drops and the like.
 *
 * `list` is `[name, canvas]` pairs, or a bare `'#RRGGBB'` meaning a 1x1 dot of
 * that colour (named by the colour, so a `dot(ctx, x, y, c)` in the design
 * becomes `put(x, y, c)`). Packed in rows; a 1px gap keeps neighbours apart.
 */
export function pieces(list) {
  // Tallest first, so each row is filled with pictures of about its own height.
  const items = list.map((e) => (typeof e === 'string' ? [e, solid(1, 1, e)] : e)).sort((p, q) => q[1].height - p[1].height);
  const cells = [], names = [];
  let x = 0, y = 0, rowH = 0, W = 0;
  for (const [name, cv] of items) {
    if (names.includes(name)) continue;
    if (x + cv.width > 1024) { x = 0; y += rowH + 1; rowH = 0; }
    cells.push([x, y, cv.width, cv.height]);
    names.push(name);
    x += cv.width + 1;
    rowH = Math.max(rowH, cv.height);
    W = Math.max(W, x);
  }
  const cv = canvas(W, y + rowH), ctx = cv.getContext('2d');
  cells.forEach(([cx, cy], i) => ctx.drawImage(items.find((e) => e[0] === names[i])[1], cx, cy));
  const set = new Set(names);
  return { cv, cells, names, has: (n) => set.has(n) };
}

/**
 * A finished canvas plus extra NAMED rectangles cut from it — so a pool can
 * draw single rows of a big picture, which is how the heat shimmer moves a row
 * without repainting it. `list` is `[name, x, y, w, h]`; the whole canvas is
 * the first frame, named `all`.
 */
export function named(cv, list) {
  const names = ['all', ...list.map((e) => e[0])];
  const cells = [[0, 0, cv.width, cv.height], ...list.map((e) => e.slice(1))];
  const set = new Set(names);
  return { cv, cells, names, has: (n) => set.has(n) };
}

/**
 * NUMBERED FRAMES ON ONE CANVAS — the whole trick that replaces per-frame
 * drawing.
 *
 * `draw(ctx, k)` paints frame `k` in the ROOM's own coordinates, exactly as the
 * design's per-frame code did; this moves the pen so the result lands in frame
 * k's cell, and clips so a frame can never bleed into its neighbour. `x0`/`y0`
 * is the room position of each frame's top-left corner, which is where the
 * game later puts the picture back.
 *
 * Cells wrap at 2048px so no sheet asks a phone for a texture it cannot hold.
 */
export function frames(n, x0, y0, w, h, draw) {
  const cols = Math.max(1, Math.min(n, Math.floor(2048 / w)));
  const cv = canvas(cols * w, Math.ceil(n / cols) * h), ctx = cv.getContext('2d');
  const cells = [];
  for (let k = 0; k < n; k++) {
    const cx = (k % cols) * w, cy = Math.floor(k / cols) * h;
    cells.push([cx, cy, w, h]);
    ctx.save();
    ctx.beginPath(); ctx.rect(cx, cy, w, h); ctx.clip();
    ctx.translate(cx - x0, cy - y0);
    draw(ctx, k);
    ctx.restore();
  }
  return { cv, cells, x0, y0, w, h, n };
}
