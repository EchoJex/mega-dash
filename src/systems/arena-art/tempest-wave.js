/**
 * THE TSUNAMI'S PICTURES — arena furniture 1, wave 6 on the "Tempest Man Art"
 * canvas, still being dialled in by the owner (16 Nov 2026: "keep the curl, but
 * lower the height of the wave ... to 2.5x boss height", and a longer spawn-in
 * with more pictures). Drawn by Claude at the owner's request, 2026-11-16.
 *
 * Its rounded body (the front falls like -0.5x², the back like -x², the owner's
 * rough guide) with a short low tail running ahead and a very long one tapering
 * behind into the floor water; the curl rolling forward over a dark hollow;
 * foam along the lip and down the back, outlined the Japanese-print way.
 *
 * Painted once when the room is built, never per step: 18 growing pictures for
 * the spawn-in (also played backwards as it sinks into the wall) and 4 grown
 * ones whose foam flickers, each way. The room places and crops them.
 */
import { canvas } from './pixels.js';

export const WAVE = {
  HC: 90,          // 2.5x his 36-tall box; the fight's TEMPEST.wave.h
  STAGES: 18,      // the fight's TEMPEST.wave.stages
  GW: 9,           // the floor water's depth (`a.liquid.h`)
  BACK: 36, FRONT: 51,
  W: 252,          // from 170 behind the crest to 81 ahead of it
  H: 122,
};
const D0 = -170, D1 = WAVE.FRONT + 30;
const KB = WAVE.HC / (WAVE.BACK * WAVE.BACK), KF = WAVE.HC / (WAVE.FRONT * WAVE.FRONT);
const WC = { O: '#0A2659', F: '#FFFFFF', f: '#DDF6FF', L: '#145DBD', a: '#5CCBF5', b: '#2F86E0', c: '#1E6FD0', d: '#145DBD', h: '#0E3F8C' };

function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) % 1000 / 1000;
}
export function waveH(d, scale) {
  const dome = Math.max(0, WAVE.HC - (d < 0 ? KB : KF) * d * d);
  const tail = d >= 0 ? 10 * Math.exp(-d / 12) : 16 * Math.exp(d / 70);
  const h = Math.pow(Math.pow(dome, 4) + Math.pow(tail, 4), 0.25);
  return d > D1 ? 0 : h * scale;
}

/** Where the crest sits across a picture facing `dir` (1 right, -1 left). */
export const crestX = (dir) => (dir > 0 ? -D0 : D1);

/** One picture: the wave facing `dir`, grown to `scale`, its foam at flicker `fl`. */
function paint(dir, scale, fl) {
  const FLOOR = WAVE.H, GW = WAVE.GW, cx = crestX(dir), g = new Map();
  const set = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (y < 0 || y >= FLOOR || x < 0 || x >= WAVE.W) return; g.set(y * 1000 + x, k); };
  const blob = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1) set(x + i * dir, y + j, j < -r / 3 ? 'F' : 'f'); };
  for (let d = D0; d <= D1; d++) {
    const hh = waveH(d, scale); if (hh < 1) continue;
    const x = cx + d * dir, t = FLOOR - GW - hh;
    for (let y = Math.ceil(t); y < FLOOR; y++) {
      const u = (y - t) / (FLOOR - t);
      if (u > 0.2 && ((x + y) & 1)) continue;
      set(x, y, u < 0.12 ? 'a' : u < 0.35 ? 'b' : u < 0.65 ? 'c' : 'd');
    }
    set(x, Math.ceil(t), hh > 6 ? 'O' : 'a');
    [0.25, 0.5, 0.75].forEach((b, i) => { if (hh > 14 && ((Math.round(x) + i) % 5)) set(x, t + (FLOOR - t) * b + 2 * Math.sin((d + i * 7) * 0.25), 'L'); });
    if (d < -20 && hh < 20 && hash(d, fl, 1) < 0.25) set(x, t, 'f');
  }
  const R = 14 * Math.max(0.3, scale), H0 = FLOOR - GW - waveH(0, scale), px = cx + 0.87 * R * dir, py = H0 + 0.5 * R;
  for (let yy = Math.round(py - R); yy < py + R; yy++) for (let xx = -R; xx < R; xx++) {
    if (Math.hypot(xx, yy - py) < R * 0.72 && xx * dir > -0.87 * R - 2) set(px + xx, yy, ((Math.round(px + xx) + yy) & 1) ? 'h' : 'd');
  }
  let end = null;
  for (let i = 0; i <= 40; i++) {
    const a = -Math.PI * 5 / 6 + (Math.PI * 0.42 + Math.PI * 5 / 6) * i / 40;
    const bx = px + R * Math.cos(a) * dir, by = py + R * Math.sin(a);
    blob(bx, by, Math.max(1, Math.round(R * 0.34 * (1 - i / 40) + 1))); end = { x: bx, y: by };
  }
  for (let f = 0; f < 3; f++) for (let j = 0; j < 4; j++) set(end.x - (f * 3 + j * 0.6) * dir, end.y + j + f, 'F');
  for (let k = 0; k < 4; k++) { const bd = -(5 + k * 5); blob(cx + bd * dir, FLOOR - GW - waveH(bd, scale) + 1, 3 - (k > 1 ? 1 : 0)); }
  for (let s = 0; s < 9; s++) set(cx + (18 + hash(s, fl, 1) * 22) * dir, H0 + 6 + hash(fl, s, 2) * 26, 'F');
  for (let e = 0; e < 20; e++) {
    const dd = -40 + hash(e, 3, 0) * 50, ex = cx + dd * dir, ey = FLOOR - hash(e, 4, 0) * waveH(dd, scale) * 0.8;
    if (g.has(Math.round(ey) * 1000 + Math.round(ex))) set(ex, ey, 'F');
  }
  const foam = (k) => k === 'F' || k === 'f', out = [];
  for (const [key, k] of g) {
    if (!foam(k)) continue;
    const y0 = Math.floor(key / 1000), x0 = key - y0 * 1000;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (y0 + oy) * 1000 + x0 + ox; if (!foam(g.get(n)) && y0 + oy < FLOOR) out.push(n); }
  }
  for (const n of out) g.set(n, 'O');
  const cv = canvas(WAVE.W, WAVE.H), c = cv.getContext('2d');
  for (const [key, k] of g) { const y = Math.floor(key / 1000); c.fillStyle = WC[k]; c.fillRect(key - y * 1000, y, 1, 1); }
  return cv;
}

/** Every picture, as `[name, canvas]` for `pieces`: `wave:<dir>:<stage 1-18>` and `wave:<dir>:full<0-3>`. */
export function wavePictures() {
  const list = [];
  for (const dir of [1, -1]) {
    for (let k = 1; k <= WAVE.STAGES; k++) list.push([`wave:${dir}:${k}`, paint(dir, k / WAVE.STAGES, k)]);
    for (let f = 0; f < 4; f++) list.push([`wave:${dir}:full${f}`, paint(dir, 1, 100 + f)]);
  }
  return list;
}

/** Which picture a wave of the fight's shows now: by how tall it is, and the step. */
export function waveFrame(w, t) {
  const k = Math.max(1, Math.min(WAVE.STAGES, Math.round((w.h / WAVE.HC) * WAVE.STAGES)));
  return k >= WAVE.STAGES && !(w.crash > 0) ? `wave:${w.dir}:full${(t >> 2) & 3}` : `wave:${w.dir}:${k}`;
}
