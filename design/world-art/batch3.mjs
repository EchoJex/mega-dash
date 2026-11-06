/**
 * BATCH 3 OF THE PER-SLICE WORLD PIECES — Rock, Ghost, Dragon, Dark, Steel.
 * VARIANTS FOR THE OWNER TO PICK FROM; NONE OF THIS IS IN THE GAME YET.
 *
 * Drawn by Claude at the owner's request, 2026-11-06 (they picked "All of batch 3"), exactly as
 * batches 1 and 2 were: each slice gets six backdrops, two of them scrolling in layers, and three
 * materials, each a floor, platform, spike bed, boss door and exit door. Two slices were partly
 * picked in the first round (5 Nov 2026, "i really like the castle one for dragon ... and the Steel
 * plates for Steel (i want a couple variants for the steel door though)", and for which door:
 * "both"): Dragon keeps the castle bricks, so its board offers only backdrops; Steel keeps the steel
 * plates, and its three "materials" are those plates with three new pairs of doors, a boss door and
 * an exit door each. Colours come from the boss's own primary and secondary, so an area still tells
 * you whose door is coming; every floor keeps the game's contrast floors against every backdrop.
 *
 * The backdrops are written the way the game draws them (paint.js `scrolling`): what never moves
 * is painted once into a strip that repeats, and what moves by itself is small pictures placed
 * every step, all coming back to where they started every loop.
 */

import { BOSSES } from '../../src/data/bosses.js';
import { material } from '../../src/systems/area-art/materials.js';
import { grad, fillRect, stars, disc, halo, ridge, skyline, trees, beam, clouds, drift, panels, tn, mix, c, still, scrolling, line, vert, mod, seamless } from '../../src/systems/area-art/paint.js';
import { Raster, hash, noise1, noise2, pick } from '../../src/systems/arena-art/pixels.js';
import { W, H, FLOOR, paintDoor } from '../../src/systems/area-art/kit.js';
import { STYLES } from './variants.mjs';

const B = (id) => BOSSES.find((b) => b.id === id);
const TAU = Math.PI * 2;
const dark = (r, y, col) => fillRect(r, 0, y, W, H - y, col);   // the band under the floor line: what a pit shows
const WHITE = c('#ffffff'), BLACK = c('#000000');
const lit = (col, k) => mix(col, WHITE, k), shade = (col, k) => mix(col, BLACK, k);
const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
/** A soft glow: rings of light, each a little fainter, dithered between (gentler than halo's dots). */
function glow(r, cx, cy, rad, col, strength) {
  for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / rad;
    if (d > 1) continue;
    const q = Math.floor((1 - d) ** 2 * 4 + BAYER4[mod(y, 4)][mod(x, 4)] / 16);
    if (q > 0) r.set(x, y, col, Math.round((strength * 255 * q) / 4));
  }
}
/** Small pictures for a moving part, from a list of [name, w, h, paint(r)]. */
const pics = (list) => list.map(([n, w, h, paint]) => { const r = new Raster(w, h); paint(r); return [n, r]; });
function ellipse(r, cx, cy, rx, ry, col, a = 255) {
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i / rx) ** 2 + (j / ry) ** 2 <= 1) r.set(cx + i, cy + j, col, a);
}
/** A flame, `h` tall, at (x, base): white at the heart, then the given colours outwards. */
function flame(r, x, base, h, cols) {
  for (let j = 0; j < h; j++) {
    const half = Math.round((1 - j / h) * 1.6);
    for (let i = -half; i <= half; i++) r.set(x + i, base - j, j < h * 0.4 && i === 0 ? WHITE : Math.abs(i) === half && half ? cols[1] : cols[0]);
  }
}

// ── ROCK: Granite Man's caves ────────────────────────────────────────
//
// The owner, 6 Nov 2026, on the Rock board: "B, but redo Rock backdrops using caves and crystals as
// the focus, and make the spikes glisteny violet crystals". So material B is picked, its spikes are
// violet crystals that glisten (SPIKES.crystals in materials.js), and all six backdrops are new:
// caves, with crystals at the heart of each.

const granite = B('granite');
const R = (k) => tn(granite, k), RS = (k) => tn(granite, k, 'secondary');
const AMETHYST = [c('#2e1458'), c('#6a34b8'), c('#a878f0'), c('#f4ecff')];   // dark, mid, lit, glint
const AMETHYST_FAR = AMETHYST.map((col) => mix(col, R(0.08), 0.5));
const MILKY = [c('#5a4a7a'), c('#9a8abc'), c('#dcd2f0'), c('#ffffff')];
const VIOLET_GLOW = c('#8a4ae0');
/** One crystal: a prism from (x0, y0) pointing along `ang` (0 is straight up), `len` long and `w` wide, lit down its left face. */
function crystal(r, x0, y0, len, w, ang, C) {
  const ax = Math.sin(ang), ay = -Math.cos(ang), nx = Math.cos(ang), ny = Math.sin(ang);
  for (let s = 0; s < len; s += 0.5) {
    const t = s / len, half = t > 0.72 ? (w / 2) * (1 - (t - 0.72) / 0.28) : w / 2;
    for (let q = -half; q <= half; q += 0.5) {
      const f = (q + half) / Math.max(1, 2 * half);
      r.set(Math.round(x0 + ax * s + nx * q), Math.round(y0 + ay * s + ny * q), t > 0.92 ? C[3] : f < 0.34 ? C[2] : f < 0.68 ? C[1] : C[0]);
    }
  }
}
/** A cluster of crystals fanning out from one point, around the direction `dir` (0 is up). */
function cluster(r, x, y, size, seed, C, dir = 0) {
  const n = 3 + Math.floor(hash(seed, 0, 330) * 4), list = [];
  for (let k = 0; k < n; k++) list.push([dir + (hash(seed, k + 1, 331) - 0.5) * 1.5, size * (0.45 + 0.55 * hash(seed, k + 9, 332)), (hash(seed, k + 20, 333) - 0.5) * size * 0.5]);
  list.sort((a, b) => b[1] - a[1]);   // the long ones behind
  for (const [ang, len, dx] of list) crystal(r, x + Math.round(dx), y, len, Math.max(3, Math.round(size * 0.26)), ang, C);
}
/** Cave rock filling the layer: lumpy noise in three shades. */
function caveWall(r, ox, cols, f, seed, period) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) r.set(x, y, pick(cols, seamless((w) => noise2(w * f, y * f * 1.3, seed), x + ox, period) + 0.08 * (noise2((x + ox) * 0.4, y * 0.4, seed + 1) - 0.5), x, y));
}
/** Stalactites hanging from the top of the layer, or stalagmites rising from `base`, every `every` pixels of the world. */
function dripstones(r, ox, { every, maxLen, cols, seed, period, base = null }) {
  for (let wx = Math.floor(ox / every) * every; wx < ox + W + every; wx += every) {
    const k = mod(wx, period), len = Math.floor(maxLen * (0.25 + 0.75 * hash(k, 0, seed))), half = 2 + Math.floor(hash(k, 1, seed) * 4), x = wx - ox + Math.floor(hash(k, 2, seed) * (every - half));
    for (let j = 0; j < len; j++) {
      const hw = Math.round(half * (1 - j / len));
      for (let i = -hw; i <= hw; i++) r.set(x + i, base === null ? j : base - j, i < 0 ? cols[2] : i === 0 ? cols[1] : cols[0]);
    }
  }
}
/** Glints twinkling on crystals: each spot flares for 8 steps of every 60. `spot(i)` gives its place in the layer's world. */
const glints = (seed, n, spot, period = 960) => ({
  pieces: () => pics([
    ['g', 1, 1, (p) => p.set(0, 0, WHITE)],
    ['star', 3, 3, (p) => { p.set(1, 0, AMETHYST[3]); p.set(0, 1, AMETHYST[3]); p.set(1, 1, WHITE); p.set(2, 1, AMETHYST[3]); p.set(1, 2, AMETHYST[3]); }],
  ]),
  at(ox, t) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const ph = mod(t + Math.floor(hash(i, 0, seed) * 240), 60);
      if (ph >= 8) continue;
      const [wx, y] = spot(i), x = mod(wx - ox, period) - 20;
      if (x < -4 || x > W + 4) continue;
      out.push(ph >= 2 && ph < 6 ? ['star', x - 1, y - 1] : ['g', x, y]);
    }
    return out;
  },
});
/** Glowworms on the grotto's ceiling, each twinkling on its own beat. */
const GLOWWORMS = {
  pieces: () => pics([['d', 1, 1, (p) => p.set(0, 0, c('#2a7a78'))], ['b', 1, 1, (p) => p.set(0, 0, c('#a8fff0'))], ['s', 3, 3, (p) => { p.set(1, 0, c('#5ae0d0')); p.set(0, 1, c('#5ae0d0')); p.set(1, 1, WHITE); p.set(2, 1, c('#5ae0d0')); p.set(1, 2, c('#5ae0d0')); }]]),
  at(ox, t) {
    const out = [];
    for (let i = 0; i < 180; i++) {
      const x = mod(Math.floor(hash(i, 0, 380) * 960) - ox, 960) - 20, y = 6 + Math.floor(hash(i, 1, 380) * 70);
      if (x < -3 || x > W + 3) continue;
      const ph = mod(t + Math.floor(hash(i, 2, 380) * 120), 120);
      out.push(ph < 8 ? ['s', x - 1, y - 1] : ph < 70 ? ['b', x, y] : ['d', x, y]);
    }
    return out;
  },
};
/** The scene `paint` draws, mirrored below `line` as a still lake reflects it: darker, rippling. */
function reflected(r, paint, line, depth, tint) {
  const scene = new Raster(W, H);
  paint(scene);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (scene.d[i + 3] && y < line) r.set(x, y, [scene.d[i], scene.d[i + 1], scene.d[i + 2]]); }
  for (let y = line; y < line + depth; y++) {
    const sy = 2 * line - y - 1, off = Math.round(Math.sin(y * 0.9) * (1 + (y - line) / 14));
    for (let x = 0; x < W; x++) {
      const sx = Math.min(W - 1, Math.max(0, x + off)), i = (sy * W + sx) * 4;
      const col = scene.d[i + 3] ? mix([scene.d[i], scene.d[i + 1], scene.d[i + 2]], tint, 0.45 + (y - line) / (depth * 2.5)) : tint;
      r.set(x, y, (y - line) % 5 === 2 && hash(x >> 3, y, 390) > 0.6 ? lit(col, 0.12) : col);
    }
  }
}
const ROCK = {
  id: 'granite', type: 'Rock',
  // The owner, 6 Nov 2026: "B, but redo Rock backdrops using caves and crystals as the focus, and
  // make the spikes glisteny violet crystals". The backdrop is still to pick, from the six below.
  pick: { material: 'B' },
  materials: [
    ['A', 'GRANITE BLOCKS', 'Rough-cut granite blocks under a pale stone lip, stone shards and an arch of fitted stones.',
      material('bricks', { deep: '#1e1814', dark: '#3a302a', base: '#5c5048', alt: '#544840', light: '#786a60', hi: '#c8c0b4', cap0: '#d8d0c4', cap1: '#a8a096', thi: '#e8e4dc', tlight: '#a8a296', tdark: '#5a544c' }, { spikes: 'shards', door: 'arch' })],
    ['B', 'QUARRY STRATA', 'Layered quarry rock in browns and greys, glistening violet crystals for spikes and an iron quarry gate.',
      material('strata', { deep: '#1e1410', dark: '#46342a', base: '#664e40', mid: '#705848', light: '#7c6252', hi: '#e0c8b0', cap0: '#d8c0a8', cap1: '#b09480', void: '#100a08', thi: '#f0e0d0', tlight: '#a08070', tdark: '#5a4030', cry0: '#2e1458', cry1: '#6a34b8', cry2: '#a878f0', cry3: '#f4ecff' }, { spikes: 'crystals', door: 'gate' })],
    ['C', 'CUT SLABS', 'Smooth quarry slabs with saw-cut joints and a band of drill holes, iron rods and a steel hatch.',
      material('concrete', { deep: '#24201c', dark: '#423a34', base: '#605850', light: '#7c7268', hi: '#b8aea2', cap0: '#d8d0c4', cap1: '#aaa094', tape: '#3a342e', rust: '#6a4a2a', thi: '#e0d8cc', tlight: '#a89e92', tdark: '#5e554c' }, { tape: true, joint: 40, spikes: 'spears', door: 'hatch' })],
  ],
  backdrops: [
    scrolling('CRYSTAL CAVERN', 'Deep in a cavern: clusters of violet crystal glowing on its ledges, stalactites overhead, glints twinkling. Scrolls in three layers.', 240,
      { rate: 0.05, period: 480, fixed: (r, ox) => {
        caveWall(r, ox, [R(0.05), R(0.08), R(0.11)], 0.03, 340, 480);
        for (let wx = Math.floor(ox / 96) * 96; wx < ox + W + 96; wx += 96) glow(r, wx - ox + 48, 70 + Math.floor(hash(mod(wx, 480), 0, 341) * 70), 34, VIOLET_GLOW, 0.22);
      } },
      { rate: 0.15, period: 960, fixed: (r, ox) => {
        dripstones(r, ox, { every: 16, maxLen: 46, cols: [R(0.12), R(0.18), RS(0.3)], seed: 342, period: 960 });
        for (let wx = Math.floor(ox / 120) * 120; wx < ox + W + 120; wx += 120) { const k = mod(wx, 960), x = wx - ox + 60; glow(r, x, 132, 48, VIOLET_GLOW, 0.4); cluster(r, x, 160, 28 + Math.floor(hash(k, 0, 343) * 18), k, AMETHYST); }
        ridge(r, ox, { y: 156, amp: 6, f: 0.03, seed: 344, col: R(0.13), top: RS(0.38), period: 960 });
      }, parts: [glints(345, 32, (i) => [Math.floor(i % 8) * 120 + 60 + Math.floor((hash(i, 1, 345) - 0.5) * 34), 118 + Math.floor(hash(i, 2, 345) * 34)])] },
      { rate: 0.35, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 240) * 240; wx < ox + W + 240; wx += 240) { const k = mod(wx, 960), x = wx - ox + 40 + Math.floor(hash(k, 0, 346) * 120); glow(r, x, 160, 44, VIOLET_GLOW, 0.35); cluster(r, x, 182, 44 + Math.floor(hash(k, 1, 346) * 20), k + 7, AMETHYST); }
        dripstones(r, ox, { every: 30, maxLen: 26, cols: [R(0.1), R(0.16), RS(0.28)], seed: 347, period: 960, base: 180 });
        dark(r, 178, R(0.05));
      } }),
    still('GEODE CAVERN', 'A cave hung with stalactites, a giant geode split open in its wall and full of glittering violet crystals.', (r) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) r.set(x, y, pick([R(0.06), R(0.1), R(0.15)], noise2(x * 0.04, y * 0.05, 308) * 0.9 + 0.1 * (noise2(x * 0.3, y * 0.3, 309) - 0.5), x, y));
      glow(r, 300, 96, 90, VIOLET_GLOW, 0.28);
      const gx = 300, gy = 96, rx = 56, ry = 46;
      for (let j = -ry - 8; j <= ry + 8; j++) for (let i = -rx - 8; i <= rx + 8; i++) {
        const d = (i / rx) ** 2 + (j / ry) ** 2;
        if (d > 1.3) continue;
        if (d > 1) { r.set(gx + i, gy + j, hash(i, j, 316) > 0.7 ? RS(0.3) : RS(0.42)); continue; }   // the rough rind
        if (d > 0.84) { r.set(gx + i, gy + j, Math.floor(d * 40) % 2 ? RS(0.75) : c('#b8b0c8')); continue; }   // the banded agate
        const a = Math.atan2(j, i) + Math.PI, n = 34, seg = Math.floor(a / (TAU / n)), f = (a / (TAU / n)) % 1;
        const tip = 0.1 + 0.36 * hash(seg, 0, 310), along = (0.84 - d) / (0.84 - tip);   // 0 at the rim, 1 at the crystal's point
        if (d < tip || Math.abs(f - 0.5) > (1 - along) * 0.5) { r.set(gx + i, gy + j, d < tip ? c('#140e1e') : c('#2e2244')); continue; }
        const col = f < 0.5 ? (along > 0.75 ? AMETHYST[3] : AMETHYST[2]) : along > 0.75 ? c('#a890d0') : AMETHYST[1];
        r.set(gx + i, gy + j, hash(seg, Math.floor(along * 6), 316) > 0.95 ? WHITE : col);
      }
      for (let x = 0; x < W; x += 9) { const len = 6 + Math.floor(noise1(x * 0.07, 311) * 40); for (let j = 0; j < len; j++) { const half = Math.round((1 - j / len) * 4); for (let i = -half; i <= half; i++) r.set(x + i, j, i < 0 ? RS(0.4) : i === 0 ? RS(0.3) : R(0.3)); } }
      for (const [x, s, seed] of [[60, 22, 1], [150, 16, 2], [440, 20, 3]]) cluster(r, x, 182, s, seed, AMETHYST_FAR);
      dark(r, 176, R(0.05));
    }),
    still('UNDERGROUND LAKE', 'A still lake deep underground, glowing violet crystals along its far shore mirrored in the dark water.', (r) => {
      reflected(r, (s) => {
        caveWall(s, 0, [R(0.05), R(0.08), R(0.12)], 0.035, 350);
        for (const [x, y] of [[60, 96], [150, 90], [250, 96], [336, 88], [424, 98]]) glow(s, x, y, 56, VIOLET_GLOW, 0.36);
        dripstones(s, 0, { every: 14, maxLen: 44, cols: [R(0.12), R(0.18), RS(0.3)], seed: 351, period: 980 });
        for (const [x, sz] of [[60, 28], [150, 38], [250, 30], [336, 44], [424, 26]]) cluster(s, x, 118, sz, x, AMETHYST);
        for (let x = 0; x < W; x++) { const top = 112 + Math.round(noise1(x * 0.04, 352) * 6); for (let y = top; y < 120; y++) s.set(x, y, y === top ? RS(0.42) : R(0.14)); }
      }, 120, 58, c('#0c0a1a'));
      dark(r, 178, R(0.05));
    }),
    still('CAVE MOUTH', 'Looking out of a cave mouth at a green valley under a bright sky, violet crystals growing round the opening.', (r) => {
      grad(r, 0, H, [[0, c('#4a88cc')], [0.55, c('#c4dcee')], [1, c('#a8c890')]]);
      ridge(r, 0, { y: 120, amp: 30, f: 0.01, seed: 360, col: c('#8a9cb8'), top: c('#eef2f8'), sharp: 0.6 });
      ridge(r, 0, { y: 152, amp: 14, f: 0.02, seed: 361, col: c('#5a8a4a'), top: c('#8ac070') });
      const cx = 244, cy = 104, rx = 150, ry = 92, rim = (a) => 0.84 + 0.16 * noise1(a * 2.2 + 10, 362);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const a = Math.atan2(y - cy, x - cx) + Math.PI, d = Math.hypot((x - cx) / rx, (y - cy) / ry), n = rim(a);
        if (d > n) r.set(x, y, d < n + 0.035 ? RS(0.55) : pick([R(0.06), R(0.1), R(0.15)], noise2(x * 0.05, y * 0.05, 363), x, y));
      }
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU + 0.2, n = rim(a + Math.PI), x = Math.round(cx + Math.cos(a) * rx * (n + 0.02)), y = Math.round(cy + Math.sin(a) * ry * (n + 0.02));
        if (y > 168) continue;
        cluster(r, x, y, 12 + Math.floor(hash(k, 0, 364) * 12), k + 40, AMETHYST, a - Math.PI / 2 + Math.PI);   // pointing in towards the light
      }
      dark(r, 176, R(0.05));
    }),
    scrolling('GLOWWORM GROTTO', 'A grotto ceiling strung with glowworms twinkling like stars, their silk threads hanging, violet crystals glowing on the floor. Scrolls in three layers.', 240,
      { rate: 0.05, period: 480, fixed: (r, ox) => caveWall(r, ox, [R(0.03), R(0.05), R(0.07)], 0.03, 370, 480) },
      { rate: 0.15, period: 960, fixed: (r, ox) => {
        for (let x = 0; x < W; x++) { const wx = x + ox, bottom = 8 + Math.floor(seamless((w) => noise1(w * 0.03, 371), wx, 960) * 18); for (let y = 0; y < bottom; y++) r.set(x, y, R(0.09)); }   // the ceiling
        for (let i = 0; i < 180; i++) { const x = mod(Math.floor(hash(i, 0, 380) * 960) - ox, 960) - 20, y = 6 + Math.floor(hash(i, 1, 380) * 70), len = 6 + Math.floor(hash(i, 3, 380) * 24); if (x < 0 || x >= W) continue; for (let j = 1; j < len; j++) if (j % 2) r.set(x, y + j, c('#2a5a58'), 160); }   // silk threads under each glowworm
      }, parts: [GLOWWORMS] },
      { rate: 0.35, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 160) * 160; wx < ox + W + 160; wx += 160) { const k = mod(wx, 960), x = wx - ox + 40 + Math.floor(hash(k, 0, 372) * 80); glow(r, x, 160, 46, VIOLET_GLOW, 0.4); cluster(r, x, 182, 30 + Math.floor(hash(k, 1, 372) * 18), k + 3, AMETHYST); }
        dark(r, 178, R(0.04));
      }, parts: [glints(373, 24, (i) => [Math.floor(i % 6) * 160 + 70 + Math.floor((hash(i, 1, 373) - 0.5) * 30), 146 + Math.floor(hash(i, 2, 373) * 26)])] }),
    still('GIANT CRYSTALS', 'A cavern crossed by crystal beams as thick as tree trunks, milky violet and white, a rope ladder hanging for scale.', (r) => {
      caveWall(r, 0, [R(0.07), R(0.1), R(0.14)], 0.03, 375);
      glow(r, 240, 90, 170, VIOLET_GLOW, 0.2);
      for (const [x0, y0, len, w, ang] of [[30, 196, 270, 24, 0.95], [470, 206, 300, 30, -1.02], [190, 214, 190, 18, 0.32], [340, -6, 230, 22, 2.55], [90, -6, 160, 16, 2.25], [420, 120, 120, 12, -0.6]]) crystal(r, x0, y0, len, w, ang, MILKY);
      for (const x of [296, 306]) vert(r, x, 0, 150, c('#8a7050'));
      for (let y = 6; y < 150; y += 8) line(r, 296, y, 306, y + 1, c('#a88a60'));   // a rope ladder, for scale
      dark(r, 176, R(0.05));
    }),
  ],
};

// ── GHOST: Wraith Man's haunted country ──────────────────────────────

const wraith = B('wraith');
const Wv = (k) => tn(wraith, k), Wd = (k) => tn(wraith, k, 'secondary'), WISP = [c('#e4fff6'), c('#8af0d0')];
const MOONPALE = [c('#fbf8ff'), c('#e4dcf8'), c('#b8a8e0')];
/** Will-o'-wisps bobbing in the dark: a bright heart and a soft glow round it. */
const wisps = (seed, n, y0, yr) => ({
  pieces: () => pics([
    ['w', 2, 2, (p) => { p.set(0, 0, WISP[0]); p.set(1, 0, WISP[0]); p.set(0, 1, WISP[0]); p.set(1, 1, WISP[1]); }],
    ['g', 6, 6, (p) => { for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const d = Math.hypot(i - 2.5, j - 2.5); if (d < 3) p.set(i, j, WISP[1], Math.round(150 * (1 - d / 3))); } }],
  ]),
  at(ox, t) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (TAU * t) / 240 + hash(i, 2, seed) * TAU;
      const x = mod(Math.floor(hash(i, 0, seed) * 960) - ox, 960) - 40 + Math.round(12 * Math.sin(a)), y = y0 + Math.floor(hash(i, 1, seed) * yr) + Math.round(5 * Math.sin(2 * a));
      if (x < -8 || x > W + 8) continue;
      out.push(['g', x - 2, y - 2], ['w', x, y]);
    }
    return out;
  },
});
/** Banks of fog swaying back and forth along the ground. */
const FOG = {
  pieces: () => pics([0, 1, 2].map((k) => [`f${k}`, 70, 10, (p) => { for (let j = 0; j < 10; j++) for (let i = 0; i < 70; i++) { const d = ((i - 35) / 35) ** 2 + ((j - 5) / 5) ** 2; if (d < 1 && hash(i, j, k + 40) < 0.6 - d * 0.5) p.set(i, j, lit(Wv(0.45), 0.2), 90); } }])),
  at(ox, t) {
    const out = [];
    for (let i = 0; i < 14; i++) {
      const x = mod(i * 70 + Math.round(18 * Math.sin((TAU * t) / 240 + i * 1.3)) - ox, 980) - 70;
      if (x < -70 || x > W) continue;
      out.push([`f${i % 3}`, x, 168 + (i % 3) * 3]);
    }
    return out;
  },
};
function headstone(r, x, base, kind, col, edge) {
  if (kind === 0) { for (let j = 0; j < 16; j++) for (let i = 0; i < 9; i++) { if (j < 3 && ((i - 4) / 4.5) ** 2 + ((j - 3) / 3) ** 2 > 1) continue; r.set(x + i, base - 16 + j, i === 0 ? edge : col); } }
  else if (kind === 1) { fillRect(r, x + 3, base - 20, 3, 20, col); fillRect(r, x, base - 15, 9, 3, col); vert(r, x + 3, base - 20, base, edge); }
  else { for (let j = 0; j < 24; j++) { const half = j < 4 ? Math.floor(j / 2) : 2; for (let i = -half; i <= half; i++) r.set(x + 4 + i, base - 24 + j, i === -half ? edge : col); } }
}
const GHOST = {
  id: 'wraith', type: 'Ghost',
  materials: [
    ['A', 'ROTTEN FLOORBOARDS', 'Warped grey-violet boards with iron nails, an iron railing for spikes and a heavy door bound in iron.',
      material('planks', { deep: '#140e1c', dark: '#2e2640', base: '#5e5072', light: '#726486', hi: '#9a8cb4', cap0: '#c4b8dc', cap1: '#9486b4', rope: '#6a5a80', iron: '#2a2430', ironLight: '#5a5068', thi: '#d8d0e8', tlight: '#8a80a0', tdark: '#4a4058' }, { spikes: 'spears', door: 'wood' })],
    ['B', 'CRYPT STONE', 'Lavender-grey crypt bricks with ghostly green moss over the top, iron railings and a crypt gate.',
      material('bricks', { deep: '#16121e', dark: '#2e2a3a', base: '#565070', alt: '#4e4866', light: '#6e6888', hi: '#b8b0d0', cap0: '#c8c0e0', cap1: '#9a92b8', moss: '#7ad0a8', mossDark: '#3a7a60', void: '#0a0810', thi: '#d8d4e8', tlight: '#8a86a0', tdark: '#4a4660' }, { moss: true, spikes: 'spears', door: 'gate' })],
    ['C', 'CHAPEL TILES', 'Worn violet chapel tiles, shards of broken stained glass for spikes and an old chapel door.',
      material('tiles', { deep: '#1a1428', dark: '#2e2646', base: '#544a78', light: '#6c6094', hi: '#d8d0f0', cap0: '#e0d8f4', cap1: '#a898d0', void: '#0c0816', thi: '#f0e8ff', tlight: '#c0a8f0', tdark: '#6a4ab0', obs0: '#1a1030', obs1: '#4a3080', obs2: '#a68dd8', obs3: '#f0e8ff', iron: '#2a2236', ironLight: '#6a5a8a' }, { size: 8, spikes: 'glass', door: 'wood' })],
  ],
  backdrops: [
    scrolling('GRAVEYARD FOG', 'Tombstones and crosses in rolling fog under a full moon, a chapel on the hill, will-o\'-wisps bobbing. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => { grad(r, 0, H, [[0, Wd(0.4)], [0.6, mix(Wd(1), Wv(0.4), 0.4)], [1, Wd(0.5)]]); stars(r, 401, 60, 110, Wv(0.4), WHITE); glow(r, 372, 46, 40, Wv(0.7), 0.3); disc(r, 372, 46, 18, MOONPALE); } },
      { rate: 0.1, period: 960, fixed: (r, ox) => {
        ridge(r, ox, { y: 152, amp: 10, f: 0.012, seed: 402, col: Wd(0.7), top: Wv(0.3), period: 960 });
        for (let wx = Math.floor(ox / 120) * 120; wx < ox + W + 120; wx += 120) {
          const k = mod(wx / 120, 8), x = wx - ox + Math.floor(hash(k, 0, 403) * 60);
          if (k === 3) { fillRect(r, x, 118, 30, 30, Wd(0.55)); for (let j = 0; j < 14; j++) fillRect(r, x + 15 - Math.floor(j * 1.1), 104 + j, Math.floor(j * 2.2) + 1, 1, Wd(0.55)); fillRect(r, x + 22, 92, 6, 26, Wd(0.55)); fillRect(r, x + 24, 86, 2, 6, Wd(0.55)); fillRect(r, x + 22, 88, 6, 2, Wd(0.55)); fillRect(r, x + 6, 128, 4, 6, c('#c8f0a0')); }
          else bareTree(r, x, 150, 30 + Math.floor(hash(k, 1, 403) * 30), Wd(0.55), k);
        }
      } },
      { rate: 0.3, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 40) * 40; wx < ox + W + 40; wx += 40) { const h = hash(mod(wx, 960), 0, 404); if (h < 0.75) headstone(r, wx - ox + Math.floor(h * 14), 180, Math.floor(hash(mod(wx, 960), 1, 404) * 3), mix(Wd(1), Wv(0.4), 0.45), Wv(0.6)); }
        dark(r, 180, Wd(0.22));
      }, parts: [FOG, wisps(405, 7, 120, 40)] }),
    still('HAUNTED MANSION', 'A crooked mansion on a hill under the moon, one window lit a sickly green, bats around its towers.', (r) => {
      grad(r, 0, H, [[0, Wd(0.3)], [0.7, mix(Wd(1), Wv(0.5), 0.35)], [1, Wd(0.4)]]);
      glow(r, 110, 50, 46, Wv(0.7), 0.3); disc(r, 110, 50, 22, MOONPALE);
      clouds(r, 0, { y: 30, h: 30, col: mix(Wd(1), Wv(0.6), 0.3), lit: Wv(0.6), seed: 406, cut: 0.6 });
      ridge(r, 0, { y: 150, amp: 18, f: 0.008, seed: 407, col: Wd(0.45), top: Wv(0.3) });
      const M = Wd(0.25);
      fillRect(r, 250, 82, 120, 70, M);
      for (const [x, w, top] of [[240, 26, 46], [350, 30, 36], [290, 34, 64]]) { fillRect(r, x, top, w, 152 - top, M); for (let j = 0; j < w * 0.7; j++) fillRect(r, x + w / 2 - Math.floor(j * 0.72), top - Math.floor(w * 0.7) + j, Math.floor(j * 1.44) + 1, 1, M); }
      for (let i = 0; i < 6; i++) fillRect(r, 262 + i * 18, 100, 6, 8, Wd(0.12));
      glow(r, 302, 83, 16, c('#a8e080'), 0.4); fillRect(r, 298, 78, 8, 10, c('#c8f0a0'));
      for (const x of [60, 170, 420]) bareTree(r, x, 150, 50, Wd(0.2), x);
      for (const [x, y] of [[270, 40], [300, 30], [340, 44], [380, 30]]) { r.set(x, y, M); r.set(x - 1, y - 1, M); r.set(x - 2, y - 1, M); r.set(x + 1, y - 1, M); r.set(x + 2, y - 1, M); r.set(x - 3, y, M); r.set(x + 3, y, M); }
      dark(r, 176, Wd(0.2));
    }),
    still('CANDLELIT CRYPT', 'Inside a crypt: skulls resting in stone niches, candles burning low, cobwebs in the corners.', (r) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const row = Math.floor(y / 10), bx = mod(x + (row % 2) * 14, 28), mortar = y % 10 === 0 || bx === 0;
        r.set(x, y, mortar ? Wd(0.25) : pick([Wd(0.45), mix(Wd(1), Wv(0.25), 0.3)], noise2(x * 0.1, y * 0.1, 408), x, y));
      }
      for (let k = 0; k < 5; k++) {
        const nx = 30 + k * 96, ny = 60;
        for (let j = 0; j < 40; j++) for (let i = 0; i < 36; i++) { const dx = i - 18, dy = j - 14; if (j < 14 && dx * dx + dy * dy > 18 * 18) continue; r.set(nx + i, ny + j, j > 34 ? Wd(0.6) : Wd(0.12)); }
        const sx = nx + 12, sy = ny + 22;   // a skull in the niche
        ellipse(r, sx + 6, sy + 4, 6, 5, c('#d8d0c0')); fillRect(r, sx + 3, sy + 8, 7, 4, c('#c8c0b0'));
        r.set(sx + 3, sy + 4, BLACK); r.set(sx + 4, sy + 4, BLACK); r.set(sx + 8, sy + 4, BLACK); r.set(sx + 9, sy + 4, BLACK); r.set(sx + 6, sy + 7, Wd(0.3));
        const cx = nx + (k % 2 ? 4 : 30);
        fillRect(r, cx, 112, 3, 8, c('#e8e0c8')); halo(r, cx + 1, 106, 14, c('#ffd080'), 0.35); flame(r, cx + 1, 111, 5, [c('#ffd070'), c('#e87830')]);
      }
      web(r, 0, 0, 40, Wv(0.6)); web(r, W - 1, 0, 34, Wv(0.6));
      dark(r, 176, Wd(0.12));
    }),
    still('GHOST SHIP', 'A wrecked galleon drifting on a black sea under a green moon, its tattered sails glowing faintly.', (r) => {
      grad(r, 0, 130, [[0, Wd(0.3)], [1, mix(Wd(1), c('#3a6a5a'), 0.4)]]);
      glow(r, 360, 44, 36, c('#c8f0d0'), 0.3); disc(r, 360, 44, 16, [c('#f0fff0'), c('#c8f0d0'), c('#8ac0a0')]);
      for (let y = 130; y < H; y++) for (let x = 0; x < W; x++) r.set(x, y, (y + Math.round(2 * Math.sin(x * 0.08 + y))) % 5 === 0 && hash(x >> 2, y, 409) > 0.5 ? mix(Wd(1), c('#8ac0a0'), 0.35) : Wd(0.35));
      for (let x = 130; x < 330; x++) { const t = (x - 130) / 200, top = 112 + Math.round(10 * (t - 0.5) ** 2 * 4), bottom = 132 - Math.round(6 * Math.sin(t * Math.PI)); for (let y = top; y < bottom; y++) r.set(x, y, Wd(0.18)); }
      for (const [mx, top] of [[180, 40], [232, 26], [284, 50]]) {
        vert(r, mx, top, 114, Wd(0.18)); line(r, mx - 18, top + 14, mx + 18, top + 14, Wd(0.18));
        for (let j = 0; j < 40; j++) for (let i = -16; i <= 16; i++) if (hash(i, j, mx) > 0.25 + j * 0.012 && !(j > 30 && hash(i >> 2, 0, mx) > 0.5)) r.set(mx + i + Math.round(Math.sin(j * 0.2) * 2), top + 16 + j, mix(Wv(0.5), c('#c8f0d0'), 0.3), 120);
      }
      line(r, 330, 112, 370, 90, Wd(0.18));   // the bowsprit
      dark(r, 178, Wd(0.2));
    }),
    scrolling('SPIRIT FOREST', 'Pale dead trees in a deep mist, dark trunks close by, spirit lights drifting between them. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => grad(r, 0, H, [[0, Wd(0.35)], [0.6, mix(Wd(1), Wv(0.6), 0.45)], [1, Wd(0.4)]]) },
      { rate: 0.12, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 48) * 48; wx < ox + W + 48; wx += 48) { const k = mod(wx, 960); bareTree(r, wx - ox + Math.floor(hash(k, 0, 410) * 30), 172, 60 + Math.floor(hash(k, 1, 410) * 60), mix(Wv(0.5), Wd(1), 0.3), k); }
        for (let y = 140; y < 178; y++) for (let x = 0; x < W; x++) if (hash(x, y, 411) < (y - 140) / 60) r.set(x, y, mix(Wv(0.6), Wd(1), 0.3));
      } },
      { rate: 0.3, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 96) * 96; wx < ox + W + 96; wx += 96) { const k = mod(wx, 960), x = wx - ox + Math.floor(hash(k, 0, 412) * 50), w = 8 + Math.floor(hash(k, 1, 412) * 6); for (let y = 0; y < 180; y++) for (let i = 0; i < w; i++) r.set(x + i + Math.round(Math.sin(y * 0.05 + k) * 2), y, i === 0 ? Wd(0.4) : Wd(0.18)); }
        dark(r, 178, Wd(0.18));
      }, parts: [wisps(413, 10, 60, 100)] }),
    still('CHAPEL RUINS', 'Inside the ruined chapel: its broken rose window, pale light falling through dust onto the old pews.', (r) => {
      fillRect(r, 0, 0, W, H, Wd(0.3));
      for (let y = 0; y < 178; y++) for (let x = 0; x < W; x++) if (hash(x, y, 414) > 0.985) r.set(x, y, Wd(0.5));
      const cx = 240, cy = 68, rad = 46;
      for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) {
        const d = Math.hypot(i, j); if (d > rad) continue;
        const a = (Math.atan2(j, i) + Math.PI) / TAU, fa = (a * 12) % 1, petal = Math.abs(d - rad * (0.62 + 0.3 * Math.sin(fa * Math.PI))) < 1.1;
        const spoke = Math.abs(fa - 0.5) > (d < rad * 0.62 ? 0.42 : 0.46), ring = Math.abs(d - rad * 0.28) < 1.4 || d > rad - 3 || (d < rad * 0.12);
        const rosette = Math.abs(Math.hypot(i - Math.cos((Math.floor(a * 12) + 0.5) * TAU / 12 - Math.PI) * rad * 0.82, j - Math.sin((Math.floor(a * 12) + 0.5) * TAU / 12 - Math.PI) * rad * 0.82) - 3.5) < 0.9;
        if (ring || spoke || petal || rosette) { r.set(cx + i, cy + j, d > rad - 3 ? Wd(0.7) : Wd(0.55)); continue; }
        const pane = Math.floor(a * 12) + (d > rad * 0.62 ? 24 : d > rad * 0.28 ? 12 : 0), broken = hash(pane, 0, 415) > 0.72;
        r.set(cx + i, cy + j, broken ? (hash(i, j, 416) > 0.97 ? WHITE : c('#0e0a1e')) : [Wv(0.7), mix(Wv(1), c('#ffffff'), 0.3), c('#6a4ab0'), c('#c8f0d0')][pane % 4]);
      }
      beam(r, cx - 10, cy + 20, Math.PI / 2 + 0.25, 0.12, 140, Wv(0.9), 0.3); beam(r, cx + 16, cy + 20, Math.PI / 2 + 0.25, 0.08, 140, Wv(0.9), 0.22);
      for (let k = 0; k < 4; k++) for (let x = 20; x < 460; x++) if (mod(x - 20, 110) < 90) { const y = 150 + k * 7; r.set(x, y, Wd(0.12)); r.set(x, y + 1, Wd(0.12)); if (mod(x - 20, 110) === 0 || mod(x - 20, 110) === 89) vert(r, x, y - 6, y + 2, Wd(0.12)); }
      for (const x of [60, 420]) { vert(r, x, 120, 150, Wd(0.12)); line(r, x - 10, 124, x + 10, 124, Wd(0.12)); for (const dx of [-10, 0, 10]) { halo(r, x + dx, 116, 8, c('#ffd080'), 0.3); flame(r, x + dx, 122, 4, [c('#ffd070'), c('#e87830')]); } }
      dark(r, 178, Wd(0.14));
    }),
  ],
};

// ── DRAGON: Drake Man's castle country ───────────────────────────────

const drake = B('drake');
const Dr = (k) => tn(drake, k), Dd = (k) => tn(drake, k, 'secondary'), INDIGO = c('#3a2a6a'), VIOLET = c('#6a3a9a'), TEAL = c('#2a8a8a');
/** A dragon circling high over the keep: three wing beats, each facing both ways. */
const DRAGON = {
  pieces() {
    const body = [[0, 4], [1, 4], [2, 4], [3, 3], [4, 3], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 5], [12, 5], [13, 5], [14, 4], [15, 3], [16, 3], [17, 3], [18, 4], [19, 5], [17, 2], [18, 2]];   // tail to head, the head at the right
    const wings = { up: [[8, 3], [7, 2], [6, 1], [6, 0], [9, 2], [9, 1], [10, 0], [11, 3], [12, 2], [12, 1]], mid: [[7, 3], [6, 3], [5, 3], [4, 2], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3]], down: [[8, 5], [7, 6], [6, 7], [10, 5], [11, 6], [12, 7], [9, 5]] };
    const out = [];
    for (const [n, pts] of Object.entries(wings)) for (const flip of [false, true]) {
      const p = new Raster(40, 16);
      for (const [x, y] of [...body, ...pts]) for (let k = 0; k < 4; k++) p.set((flip ? 19 - x : x) * 2 + (k & 1), y * 2 + (k >> 1), Dd(0.16));
      out.push([`${n}${flip ? 'L' : 'R'}`, p]);
    }
    return out;
  },
  at(ox, t) {
    const ph = mod(t, 240), a = (TAU * ph) / 240, x = 330 + Math.cos(a) * 70, y = 48 + Math.sin(a) * 12, dir = ph > 120 ? 'R' : 'L';   // heading right on the back half of the circle
    return [[['up', 'mid', 'down', 'mid'][Math.floor(t / 10) % 4] + dir, Math.round(x) - 20, Math.round(y) - 8]];
  },
};
const CASTLE_C = ['C', 'CASTLE BRICKS', 'Picked in the first round: staggered castle blocks under a stone lip, iron spikes and a castle gate with a gold portcullis for the way out.', STYLES.C];
const DRAGON_SLICE = {
  id: 'drake', type: 'Dragon',
  // Dragon's material was picked in the first round: "i really like the castle one for dragon" (5 Nov 2026).
  pick: { material: 'C' },
  materials: [CASTLE_C],
  backdrops: [
    scrolling('DRAGON\'S KEEP', 'A castle keep on a crag at sunset, a dragon circling over its towers, forests below. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => { grad(r, 0, H, [[0, c('#1a1238')], [0.45, mix(Dr(0.7), VIOLET, 0.4)], [0.75, c('#f0905a')], [1, Dd(0.3)]]); disc(r, 130, 146, 20, [c('#fff0b0'), c('#ffc060'), c('#f08040')]); for (const [y, x0, len] of [[60, 40, 120], [76, 260, 160], [90, 120, 90], [104, 300, 110]]) for (let x = x0; x < x0 + len; x++) { const k = Math.min(x - x0, x0 + len - x); r.set(x, y, mix(Dr(0.8), c('#ffc080'), 0.4)); if (k > 12) r.set(x, y + 1, mix(Dr(0.7), VIOLET, 0.3)); } }, parts: [DRAGON] },
      { rate: 0.06, period: 960, fixed: (r, ox) => {
        ridge(r, ox, { y: 142, amp: 40, f: 0.012, seed: 502, col: mix(INDIGO, Dd(0.4), 0.3), top: mix(VIOLET, Dr(1), 0.4), sharp: 0.6, period: 960 });
        const kx = mod(400 - ox, 960) - 100;   // the keep, once a strip
        if (kx > -120 && kx < W + 20) {
          const K = Dd(0.15);
          for (let j = 0; j < 50; j++) { const half = 24 + Math.floor(j * 0.6); for (let i = -half; i <= half; i++) r.set(kx + 50 + i, 112 + j, K); }   // the crag
          fillRect(r, kx + 26, 70, 48, 44, K);
          for (const [x, w, top] of [[22, 12, 50], [66, 12, 44], [42, 16, 30]]) { fillRect(r, kx + x, top, w, 70 - top + 2, K); for (let j = 0; j < w; j++) fillRect(r, kx + x + w / 2 - Math.floor(j / 2), top - w + j, j + 1, 1, K); }
          for (let i = 0; i < 48; i += 6) fillRect(r, kx + 26 + i, 66, 3, 4, K);
          for (const [x, y] of [[34, 84], [54, 80], [46, 44], [70, 60]]) { fillRect(r, kx + x, y, 2, 4, c('#ffc860')); }
          line(r, kx + 50, 14, kx + 50, 26, K); for (let j = 0; j < 4; j++) fillRect(r, kx + 51, 15 + j, 8 - j, 1, Dr(0.8));   // the banner
        }
      } },
      { rate: 0.25, period: 960, fixed: (r, ox) => { trees(r, ox, { y: 186, minH: 24, maxH: 46, col: Dd(0.12), edge: Dd(0.24), seed: 503, every: 20, period: 960 }); dark(r, 178, Dd(0.08)); } }),
    still('CASTLE RAMPARTS', 'Battlements and towers stretching away under a blood-red sky and a crescent moon, torches burning along the wall.', (r) => {
      grad(r, 0, H, [[0, c('#1a0a14')], [0.6, Dr(0.45)], [1, Dd(0.3)]]);
      disc(r, 380, 40, 14, [c('#fff4e0'), c('#f0d8c0'), c('#c8a090')]); disc(r, 386, 36, 13, [Dr(0.18), Dr(0.18), Dr(0.18)]);   // a crescent
      const S1 = [c('#4e4a56'), c('#6e6a76'), c('#3a3640')];   // the castle bricks' own stone
      for (let x = 0; x < W; x++) for (let y = 118; y < 178; y++) r.set(x, y, (y - 118) % 8 === 0 || mod(x + (Math.floor((y - 118) / 8) % 2) * 8, 16) === 0 ? S1[2] : S1[0]);
      for (let x = 0; x < W; x += 16) fillRect(r, x, 110, 9, 8, S1[0]);
      for (const [x, w] of [[40, 34], [220, 40], [400, 34]]) { fillRect(r, x, 70, w, 48, S1[0]); for (let i = 0; i < w; i += 8) fillRect(r, x + i, 62, 5, 8, S1[0]); fillRect(r, x + w / 2 - 3, 84, 6, 10, c('#1a0a10')); fillRect(r, x + w / 2 - 2, 86, 4, 8, c('#ffb850')); }
      for (let x = 100; x < W; x += 80) { vert(r, x, 124, 136, S1[2]); halo(r, x, 120, 14, c('#ffa040'), 0.4); flame(r, x, 124, 6, [c('#ffd060'), c('#e85a1a')]); }
      dark(r, 178, Dd(0.1));
    }),
    still('HOARD CAVE', 'A cave glittering with heaped gold and jewels, a dragon\'s tail curled around the hoard in the shadows.', (r) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) r.set(x, y, pick([Dd(0.08), Dd(0.14), mix(Dd(0.2), INDIGO, 0.4)], noise2(x * 0.04, y * 0.05, 504), x, y));
      glow(r, 250, 150, 100, c('#ffc840'), 0.2);
      for (let j = 0; j < 48; j++) { const half = Math.round(110 * Math.sqrt(1 - ((48 - j) / 48) ** 2)); for (let i = -half; i <= half; i++) { const x = 250 + i, y = 130 + j; r.set(x, y, hash(x, y, 505) > 0.96 ? WHITE : pick([c('#8a6010'), c('#c9a21e'), c('#f5d328')], 0.6 - (j / 48) * 0.4 + 0.2 * (noise2(x * 0.3, y * 0.3, 506) - 0.5), x, y)); } }
      for (const [x, y, col] of [[220, 136, c('#e83a5a')], [280, 142, TEAL], [250, 132, VIOLET], [300, 150, c('#e83a5a')], [196, 152, TEAL]]) { r.set(x, y, col); r.set(x + 1, y, col); r.set(x, y + 1, col); r.set(x + 1, y + 1, WHITE); }
      for (let k = 0; k < 160; k++) {   // the tail, curling round the front of the hoard
        const t = k / 160, x = 90 + t * 280, y = 166 + Math.round(10 * Math.sin(t * Math.PI * 1.5)), w = Math.round(9 * (1 - t) + 3);
        for (let j = -w; j <= w; j++) r.set(Math.round(x), y + j, j <= -w + 1 ? Dr(0.85) : (Math.abs(j) + k) % 7 === 0 ? Dr(0.35) : j > w - 2 ? Dr(0.3) : Dr(0.6));
      }
      for (let i = 0; i < 9; i++) for (let j = -Math.min(i, 8 - i); j <= Math.min(i, 8 - i); j++) r.set(370 + i, 156 + j, j === -Math.min(i, 8 - i) ? Dr(0.85) : Dr(0.6));   // its spade tip
      dark(r, 178, Dd(0.06));
    }),
    still('DRAGON BONES', 'A valley under an ash-red sky, the ribs of a giant dragon arching over the path, its skull half buried.', (r) => {
      grad(r, 0, H, [[0, c('#2a1018')], [0.6, mix(Dr(0.5), c('#a07060'), 0.3)], [1, Dd(0.3)]]);
      ridge(r, 0, { y: 160, amp: 14, f: 0.012, seed: 507, col: Dd(0.3), top: Dr(0.45) });
      const BONE = [c('#e8e0d0'), c('#b8ae9c'), c('#7a7060')];
      const spineY = (x) => 96 + Math.round(10 * Math.sin(((x - 90) / 290) * Math.PI) * -1 + ((x - 90) / 290) * 14);
      for (let k = 0; k < 9; k++) {   // ribs hanging from the spine, bowing outwards to the ground
        const x0 = 110 + k * 30, y0 = spineY(x0), len = 170 - y0;
        for (let s = 0; s <= 1; s += 0.004) { const x = Math.round(x0 + 18 * Math.sin(s * Math.PI * 0.85)), y = Math.round(y0 + s * len), w = s < 0.85 ? 3 : 2; for (let q = 0; q < w; q++) r.set(x + q, y, q === 0 ? BONE[0] : q === 1 ? BONE[1] : BONE[2]); }
      }
      for (let x = 90; x < 380; x++) { const y = spineY(x); for (let q = 0; q < 4; q++) r.set(x, y + q, q === 0 ? BONE[0] : q < 3 ? BONE[1] : BONE[2]); if (mod(x, 10) === 0) { r.set(x, y - 1, BONE[1]); r.set(x, y - 2, BONE[1]); } }   // the spine
      for (let i = 0; i < 70; i++) { const top = 118 + Math.round(i * 0.3), bottom = 150 - Math.round(i * 0.12); for (let y = top; y < bottom; y++) r.set(380 + i, y, y === top ? BONE[0] : y > bottom - 4 ? BONE[2] : BONE[1]); }   // the skull, snout to the right
      ellipse(r, 394, 130, 6, 5, BLACK); ellipse(r, 394, 130, 2, 2, c('#3a1010'));   // its one great eye socket
      for (const [hx, len] of [[384, 30], [396, 22]]) for (let i = 0; i < len; i++) { const x = hx - Math.round(i * 0.9), y = 120 - Math.round(Math.sin((i / len) * 1.8) * 16); r.set(x, y, BONE[0]); r.set(x, y + 1, BONE[1]); if (i < len * 0.6) r.set(x, y + 2, BONE[2]); }   // two horns sweeping back
      for (let i = 0; i < 60; i++) { const y = 154 + Math.round(i * 0.28); r.set(386 + i, y, BONE[1]); r.set(386 + i, y + 1, BONE[2]); if (i % 5 === 2) { r.set(386 + i, y - 1, BONE[0]); r.set(386 + i, y - 2, BONE[0]); } }   // the lower jaw, fallen open
      for (let i = 4; i < 66; i += 5) for (let j = 0; j < 4; j++) r.set(380 + i + Math.floor(j / 2), 150 - Math.round(i * 0.12) - j, BONE[0]);   // teeth
      for (let i = 0; i < 80; i++) r.set(Math.floor(hash(i, 0, 508) * W), Math.floor(hash(i, 1, 508) * 170), c('#c8b8b0'));
      dark(r, 178, Dd(0.08));
    }),
    scrolling('VOLCANIC RIDGE', 'The rim of a caldera: basalt columns cut by glowing fissures, ash cloud lit red from below, embers rising. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => { grad(r, 0, H, [[0, c('#120810')], [0.5, mix(Dd(0.4), INDIGO, 0.3)], [0.8, c('#e0502a')], [1, Dd(0.4)]]); clouds(r, 0, { y: 20, h: 70, col: mix(Dd(0.5), INDIGO, 0.3), lit: mix(Dd(0.7), c('#a04030'), 0.5), seed: 509, cut: 0.48 }); } },
      { rate: 0.1, period: 960, fixed: (r, ox) => {
        for (let x = 0; x < W; x++) {
          const wx = x + ox, col = Math.floor(mod(wx, 960) / 8), top = 100 + Math.floor(seamless((w) => noise1(w * 0.18, 510), col, 120, 12) * 60) + (col % 2) * 2, lip = mod(wx, 8);
          for (let y = top; y < H; y++) r.set(x, y, y < top + 2 ? (lip < 2 || lip > 5 ? Dr(0.45) : Dr(0.6)) : lip === 0 ? Dd(0.06) : lip < 2 ? Dd(0.26) : (y - top) % 22 === 0 ? Dd(0.08) : Dd(0.16));
          if (hash(Math.floor(col / 3), 1, 510) > 0.82 && lip === 4) for (let y = top + 6; y < H; y++) r.set(x, y, y % 3 ? c('#ff7a2a') : c('#ffd060'));
        }
      } },
      { rate: 0.3, period: 960, fixed: (r, ox) => { ridge(r, ox, { y: 186, amp: 16, f: 0.04, seed: 511, col: Dd(0.1), top: c('#e85a1a'), sharp: 0.5, period: 960 }); dark(r, 178, Dd(0.06)); },
        parts: [drift(512, 50, [c('#ffb030'), c('#ff6a20')], 176, -0.2)] }),
    still('THRONE HALL', 'A great hall of tall stained-glass windows in red, violet and teal, a dragon banner hanging between them.', (r) => {
      fillRect(r, 0, 0, W, H, Dd(0.14));
      for (const x0 of [40, 200, 360]) {
        for (let j = 0; j < 120; j++) for (let i = 0; i < 80; i++) {
          const dx = i - 40, dy = j - 40; if (j < 40 && dx * dx + dy * dy > 40 * 40) continue;
          const lead = i % 10 === 0 || j % 12 === 0 || i === 79;
          r.set(x0 + i, 20 + j, lead ? Dd(0.08) : [Dr(0.8), VIOLET, TEAL, mix(Dr(1), c('#ffc080'), 0.4)][(Math.floor(i / 10) + Math.floor(j / 12)) % 4]);
        }
        beam(r, x0 + 40, 140, Math.PI / 2 - 0.2, 0.2, 60, Dr(0.9), 0.18);
      }
      for (const x of [140, 300]) { fillRect(r, x, 0, 20, 178, Dd(0.22)); vert(r, x, 0, 178, Dd(0.32)); }
      fillRect(r, 146, 30, 8, 60, Dr(0.6)); for (let j = 0; j < 6; j++) fillRect(r, 146 + j, 90 + j, 8 - 2 * j, 1, Dr(0.6)); ellipse(r, 150, 52, 2, 3, c('#f5d328'));   // the dragon banner
      fillRect(r, 306, 30, 8, 60, Dr(0.6)); for (let j = 0; j < 6; j++) fillRect(r, 306 + j, 90 + j, 8 - 2 * j, 1, Dr(0.6)); ellipse(r, 310, 52, 2, 3, c('#f5d328'));
      dark(r, 178, Dd(0.08));
    }),
  ],
};

// ── DARK: Eclipse Man's shadowed country ─────────────────────────────

const eclipse = B('eclipse');
const K = (k) => tn(eclipse, k), KR = (k) => tn(eclipse, k, 'secondary'), BLOOD = c('#dc2626');
const pale = (k) => mix(K(1), WHITE, k);
/** Rocks floating in the void, bobbing slowly, each lit red along one edge. */
const DEBRIS = {
  pieces: () => pics([[12, 7], [8, 5], [5, 4]].map(([w, h], k) => [`d${k}`, w, h, (p) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (j > h - 2 - Math.abs(i - w / 2) * 0.4 && j > 1) continue; p.set(i, j, j === 0 ? KR(0.7) : i < 2 ? pale(0.15) : K(0.6)); } }])),
  at(ox, t) {
    const out = [];
    for (let i = 0; i < 9; i++) {
      const x = mod(Math.floor(hash(i, 0, 601) * 960) - ox, 960) - 40, y = 40 + Math.floor(hash(i, 1, 601) * 100) + Math.round(4 * Math.sin((TAU * t) / 240 + i));
      if (x > -14 && x < W) out.push([`d${i % 3}`, x, y]);
    }
    return out;
  },
};
function oneEye(r, x, y, glow = true) {
  if (glow) halo(r, x + 2, y, 7, BLOOD, 0.4);
  for (let i = 0; i < 5; i++) r.set(x + i, y, i === 2 ? c('#ffd0c0') : BLOOD);
  r.set(x + 1, y - 1, KR(0.6)); r.set(x + 2, y - 1, KR(0.6)); r.set(x + 3, y - 1, KR(0.6));
}
const DARK = {
  id: 'eclipse', type: 'Dark',
  materials: [
    ['A', 'OBSIDIAN TILES', 'Glossy black glass tiles with a violet sheen, red-glinting black glass shards and a door of red void light.',
      material('tiles', { deep: '#141020', dark: '#2a2440', base: '#4a4466', light: '#625c84', hi: '#e8e0ff', cap0: '#d8d0f0', cap1: '#9a90c0', void: '#08060e', thi: '#ffffff', tlight: '#ff6a6a', tdark: '#8a1a1a', obs0: '#0a0810', obs1: '#2a1a2a', obs2: '#dc2626', obs3: '#ffd0d0' }, { size: 10, spikes: 'glass', door: 'energy' })],
    ['B', 'SHADOW BRICK', 'Dark indigo bricks under a pale lip, blood-red crystal shards and an iron gate.',
      material('bricks', { deep: '#100e18', dark: '#28243a', base: '#48425e', alt: '#403a56', light: '#605a7a', hi: '#a8a0c8', cap0: '#c0b8e0', cap1: '#8a82ac', void: '#08060e', thi: '#ffd0d0', tlight: '#dc2626', tdark: '#6a1010' }, { spikes: 'shards', door: 'gate' })],
    ['C', 'CRACKED STONE', 'Dark stone with red light glowing in its cracks, iron spears and a stone arch.',
      material('strata', { deep: '#120e18', dark: '#2e2840', base: '#4c4664', mid: '#56506e', light: '#625c7a', hi: '#ffd0d0', cap0: '#c8c0e0', cap1: '#9890b8', glow: '#dc2626', glow2: '#ff8a6a', void: '#08060e', thi: '#ffffff', tlight: '#b0a8c8', tdark: '#4c4664' }, { cracks: true, spikes: 'spears', door: 'arch' })],
  ],
  backdrops: [
    scrolling('TOTAL ECLIPSE', 'A black sun ringed by a burning red corona over a dark plain, red motes drifting up. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => {
        grad(r, 0, H, [[0, c('#050408')], [0.6, K(0.6)], [1, mix(KR(0.4), K(0.5), 0.5)]]);
        stars(r, 602, 70, 140, K(1), pale(0.5));
        const cx = 300, cy = 62;
        for (let k = 0; k < 64; k++) { const a = (k / 64) * TAU, len = 22 + Math.floor(hash(k, 0, 603) * 22); for (let d = 16; d < len; d++) if (hash(k, d, 604) < 1 - (d - 16) / (len - 16)) r.set(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), d < 20 ? c('#ffd0b0') : d < 26 ? c('#ff7a4a') : BLOOD); }
        glow(r, cx, cy, 34, BLOOD, 0.35);
        disc(r, cx, cy, 16, [c('#050408'), c('#050408'), c('#050408')]);
        r.set(cx - 12, cy - 10, WHITE); r.set(cx - 13, cy - 10, c('#ffd0b0')); r.set(cx - 12, cy - 11, c('#ffd0b0'));   // the last glint of the sun
      } },
      { rate: 0.1, period: 960, fixed: (r, ox) => ridge(r, ox, { y: 154, amp: 14, f: 0.012, seed: 605, col: K(0.3), top: KR(0.6), period: 960 }) },
      { rate: 0.3, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 120) * 120; wx < ox + W + 120; wx += 120) { const k = mod(wx, 960); if (hash(k, 0, 606) > 0.4) bareTree(r, wx - ox + Math.floor(hash(k, 1, 606) * 60), 178, 40 + Math.floor(hash(k, 2, 606) * 30), K(0.15), k); }
        ridge(r, ox, { y: 184, amp: 8, f: 0.03, seed: 607, col: K(0.12), period: 960 }); dark(r, 178, K(0.08));
      }, parts: [drift(608, 40, [BLOOD, c('#ff8a6a')], 176, -0.12)] }),
    still('MOONLIT RUIN', 'Toppled columns and arches overgrown with vines, moonlight falling through a single high gap onto a cracked mosaic.', (r) => {
      fillRect(r, 0, 0, W, H, mix(K(0.3), c('#0a0a18'), 0.3));
      for (const x0 of [20, 150, 280, 410]) for (let j = 0; j < 100; j++) for (let i = 0; i < 90; i++) {
        const dx = i - 45, dy = j - 45, inArch = j > 45 ? i > 12 && i < 78 : dx * dx + dy * dy < 33 * 33;
        if (!inArch) r.set(x0 + i - 20, 40 + j, (i + j) % 11 === 0 ? pale(0.14) : pale(0.08));
      }
      fillRect(r, 0, 0, W, 40, pale(0.08));
      for (let j = 0; j < 14; j++) for (let i = -10 + j; i < 10 - j; i++) r.set(300 + i, j, c('#0a0a18'));   // the single high gap
      beam(r, 300, 6, Math.PI / 2 + 0.3, 0.08, 190, pale(0.6), 0.32);
      for (let y = 160; y < 178; y++) for (let x = 0; x < W; x++) r.set(x, y, (x + y) % 6 === 0 ? K(0.3) : mod(x * 3 + y * 7, 13) < 2 ? KR(0.35) : K(0.45));   // the mosaic
      for (const [x, y] of [[100, 148], [360, 152]]) { for (let j = 0; j < 12; j++) for (let i = 0; i < 40; i++) r.set(x + i, y + j, j === 0 ? pale(0.3) : i % 8 === 0 ? pale(0.08) : pale(0.16)); ellipse(r, x + 40, y + 6, 4, 6, pale(0.32)); ellipse(r, x + 40, y + 6, 2, 3, pale(0.22)); }   // fallen drums of column, lying on their sides
      for (let k = 0; k < 9; k++) { let x = Math.floor(hash(k, 0, 609) * W); for (let y = 40; y < 40 + 60 * hash(k, 1, 609); y++) { x += hash(y, k, 610) > 0.5 ? 1 : -1; r.set(x, y, c('#2a4a2a')); if (y % 5 === 0) r.set(x + 1, y, c('#3a6a3a')); } }   // vines
      dark(r, 178, K(0.15));
    }),
    still('BLACKOUT CITY', 'A city with every light out under a huge red moon, only a few windows glowing red.', (r) => {
      grad(r, 0, H, [[0, c('#06050c')], [0.7, K(0.7)], [1, K(0.4)]]);
      glow(r, 140, 120, 80, BLOOD, 0.25); disc(r, 140, 120, 46, [c('#ff9a7a'), c('#e85a4a'), KR(0.7)]);
      skyline(r, 0, { y: 178, minH: 30, maxH: 110, col: K(0.18), lit: BLOOD, cw: 16, gap: 0.08, rate: 0.03, seed: 611 });
      for (const x of [60, 236, 400]) { vert(r, x, 40, 80, K(0.18)); r.set(x, 39, BLOOD); }   // aerials, each a red light
      dark(r, 178, K(0.1));
    }),
    still('SINGLE EYES', 'A black forest in the mist, single red eyes watching from between the trunks.', (r) => {
      grad(r, 0, H, [[0, K(0.2)], [0.7, K(0.6)], [1, K(0.3)]]);
      for (let x = 0; x < W; x++) { const wx = Math.floor(x / 22), off = x % 22, w = 6 + Math.floor(hash(wx, 0, 612) * 8); if (off < w) for (let y = 0; y < 178; y++) r.set(x, y, off === 0 ? K(0.3) : K(0.08)); }
      for (let y = 120; y < 178; y++) for (let x = 0; x < W; x++) if (hash(x, y, 613) < (y - 120) / 120) r.set(x, y, pale(0.12));
      for (const [x, y] of [[36, 90], [118, 130], [190, 70], [262, 112], [330, 84], [404, 140], [450, 60]]) oneEye(r, x, y);
      dark(r, 178, K(0.08));
    }),
    scrolling('VOID RIFT', 'A rift torn across a black-violet void, red light bleeding from it, rocks floating and bobbing. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => {
        grad(r, 0, H, [[0, c('#06030c')], [0.6, mix(K(0.7), c('#3a1050'), 0.4)], [1, K(0.3)]]);
        stars(r, 614, 80, 160, c('#6a3a9a'), c('#d8b8ff'));
        let y = 40;
        for (let x = 0; x < W; x++) { y += hash(x, 0, 615) > 0.5 ? 1 : -1; y = Math.max(20, Math.min(70, y)); for (let j = -6; j <= 6; j++) r.set(x, y + j, Math.abs(j) < 1 ? c('#ffd0c0') : Math.abs(j) < 3 ? BLOOD : KR(0.3), Math.abs(j) < 3 ? 255 : 110); }
      } },
      { rate: 0.12, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 160) * 160; wx < ox + W + 160; wx += 160) { const k = mod(wx, 960), x = wx - ox + Math.floor(hash(k, 0, 616) * 80), y = 100 + Math.floor(hash(k, 1, 616) * 40), w = 30 + Math.floor(hash(k, 2, 616) * 30); for (let j = 0; j < w * 0.5; j++) { const half = Math.floor((w / 2) * (1 - j / (w * 0.5))); for (let i = -half; i <= half; i++) r.set(x + i, y + j, j === 0 ? KR(0.6) : K(0.25)); } }
      }, parts: [DEBRIS] },
      { rate: 0.3, period: 960, fixed: (r, ox) => { ridge(r, ox, { y: 186, amp: 14, f: 0.04, seed: 617, col: K(0.1), top: KR(0.5), sharp: 0.6, period: 960 }); dark(r, 178, K(0.06)); } }),
    still('OBSIDIAN CATHEDRAL', 'A cathedral of black glass spires under the stars, red light burning in its tall windows.', (r) => {
      grad(r, 0, H, [[0, c('#040308')], [0.8, K(0.5)], [1, K(0.3)]]);
      stars(r, 618, 90, 120, K(1), pale(0.6));
      const G = K(0.12);
      for (const [cx, w, top] of [[240, 44, 20], [170, 30, 60], [310, 30, 60], [110, 22, 90], [370, 22, 90]]) {
        for (let y = top; y < 178; y++) { const half = y < top + w ? Math.floor(((y - top) / w) * (w / 2)) : w / 2; for (let i = -half; i <= half; i++) r.set(cx + i, y, (i + y) % 9 === 0 ? pale(0.15) : G); }
        const ww = Math.max(4, Math.floor(w / 5));
        glow(r, cx, top + w + 30, 22, BLOOD, 0.3);
        for (let j = 0; j < 44; j++) for (let i = -ww; i <= ww; i++) { if (j < ww && Math.abs(i) > j) continue; r.set(cx + i, top + w + 8 + j, i === 0 && j > ww ? K(0.1) : j < ww + 4 ? c('#ff8a6a') : BLOOD); }
      }
      dark(r, 178, K(0.08));
    }),
  ],
};

// ── STEEL: Alloy Man's mill country ──────────────────────────────────

const alloy = B('alloy');
const Al = (k) => tn(alloy, k), As = (k) => tn(alloy, k, 'secondary'), HOT = [c('#fff4b0'), c('#ffb030'), c('#e85a1a')];
// The first round's steel plates, picked for Steel (variants.mjs STYLES.A), and its doors' colours.
const SP = { deep: c('#262e37'), dark: c('#36414c'), base: c('#50606e'), light: c('#66788a'), hi: c('#8a9cae'), cap: c('#dce6ee') };
const CYAN = [c('#5cadd5'), c('#d8f6ff')], GOLD = [c('#5c4a0a'), c('#c9a21e'), c('#f5d328'), c('#fff3b0')];
/** A door's frame: a lit top-left edge, a dark bottom-right, two pixels thick. */
const frame = (d, i, j) => (i < 2 || i > 13 || j < 2 ? (i === 0 || j === 0 ? SP.light : i === 15 ? SP.deep : SP.dark) : null);
/** VAULT: a round vault door with bolts and a spoked wheel; for the way out it stands open, gold light behind. */
function vaultDoor(kind) {
  const d = new Raster(16, 28), exit = kind === 'exit', cy = 15;
  for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
    const f = frame(d, i, j);
    if (f) { d.set(i, j, f); continue; }
    const dx = i + 0.5 - 8, dy = j + 0.5 - cy, dd = Math.hypot(dx, dy);
    if (dd > 6.8) d.set(i, j, (i + j) % 4 === 0 ? SP.base : SP.dark);
    else if (exit) d.set(i, j, dd > 6 ? SP.deep : pick([GOLD[1], GOLD[2], GOLD[3]], 1 - dd / 6, i, j));
    else if (dd > 6) d.set(i, j, CYAN[0]);   // the seam of light round the shut door
    else if (dd > 4.9) d.set(i, j, dx + dy < 0 ? SP.hi : SP.deep);
    else d.set(i, j, SP.base);
  }
  if (exit) { for (let j = cy - 7; j <= cy + 7; j++) { d.set(14, j, SP.hi); d.set(15, j, SP.light); } }   // the door, swung open edge-on
  else {
    for (let k = 0; k < 8; k++) { const a = (k * TAU) / 8; d.set(Math.floor(8 + Math.cos(a) * 3.9), Math.floor(cy + 0.5 + Math.sin(a) * 3.9), SP.cap); }
    for (let k = -2; k <= 2; k++) { d.set(8 + k, cy, SP.hi); d.set(8, cy + k, SP.hi); }
    d.set(8, cy, CYAN[1]);
  }
  return d;
}
/** BLAST DOOR: two thick halves meeting in a zigzag seam under a hazard stripe; the way out stands parted. */
function blastDoor(kind) {
  const d = new Raster(16, 28), exit = kind === 'exit';
  for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
    if (j < 4) { d.set(i, j, j === 0 ? SP.light : ((i + j) >> 1) % 2 ? c('#e8c020') : c('#1e1a14')); continue; }
    const f = frame(d, i, j);
    if (f) { d.set(i, j, f); continue; }
    const seam = 8 + (mod(j, 4) < 2 ? 1 : 0) - (mod(j, 4) === 3 ? 1 : 0), gap = exit ? 2 : 0;
    if (Math.abs(i + 0.5 - seam) < 0.6 + gap) d.set(i, j, exit ? pick([GOLD[2], GOLD[3]], 0.5, i, j) : SP.deep);
    else d.set(i, j, (j - 4) % 6 === 0 ? SP.dark : (i === 3 || i === 12) && j % 3 === 0 ? SP.hi : i < seam ? SP.base : SP.light);
  }
  const L = exit ? [GOLD[2], GOLD[3]] : CYAN;
  d.set(7, 5, L[0]); d.set(8, 5, L[0]); d.set(7, 6, L[1]); d.set(8, 6, L[0]);   // a lamp over the seam
  return d;
}
/** BULKHEAD: a ship's hatch with rounded corners, a raised rim, latches down each side and a round porthole. */
function bulkhead(kind) {
  const d = new Raster(16, 28), exit = kind === 'exit';
  for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
    const f = frame(d, i, j);
    if (f) { d.set(i, j, f); continue; }
    const cx = Math.min(Math.max(i, 5), 10), cyy = Math.min(Math.max(j, 6), 23), corner = Math.hypot(i - cx, j - cyy) > 3;
    if (corner) { d.set(i, j, SP.deep); continue; }
    const rim = i === 2 || i === 13 || j === 3 || j === 26 || Math.abs(Math.hypot(i - cx, j - cyy) - 3) < 0.6;
    d.set(i, j, rim ? (i < 8 && j < 14 ? SP.hi : SP.light) : exit ? SP.light : SP.base);
  }
  for (const j of [8, 14, 20]) { d.set(2, j, SP.cap); d.set(13, j, SP.cap); }   // the latches
  const L = exit ? [GOLD[1], GOLD[2], GOLD[3]] : [SP.deep, CYAN[0], CYAN[1]];
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) { const dd = Math.hypot(i - 3, j - 3); if (dd < 3.5) d.set(5 + i, 6 + j, dd > 2.6 ? SP.cap : dd > 1.4 ? L[1] : L[2]); }   // the porthole
  if (exit) for (let j = 3; j < 27; j++) { d.set(13, j, GOLD[3]); d.set(12, j, GOLD[2]); d.set(14, j, GOLD[1]); }   // standing ajar, gold light down its edge
  return d;
}
const steelDoors = (paint) => ({ door: (r, x, kind) => paintDoor(r, paint(kind), x, FLOOR - 28, kind), doorPicture: paint });
/** The conveyor's crates, every 80 pixels, each moving one gap along per loop. */
const CRATES = {
  pieces: () => pics([['box', 14, 10, (p) => { for (let j = 0; j < 10; j++) for (let i = 0; i < 14; i++) p.set(i, j, i === 0 || j === 0 ? Al(0.8) : i === 13 || j === 9 ? As(0.4) : (i === j || i === 13 - j) ? As(0.6) : Al(0.6)); }]]),
  at(ox, t) {
    const out = [], shift = Math.floor((t / 240) * 80);
    for (let x = mod(shift - ox, 80) - 80; x < W; x += 80) out.push(['box', x, 152]);
    return out;
  },
};
/** Welding sparks flaring at each robot arm's tip, on and off. */
const WELD = {
  pieces: () => pics([['s', 5, 5, (p) => { for (const [x, y] of [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [2, 4]]) p.set(x, y, x === 2 && y === 2 ? WHITE : c('#a8e8ff')); }], ['f', 1, 1, (p) => p.set(0, 0, c('#ffd060'))]]),
  at(ox, t) {
    const out = [];
    for (let wx = Math.floor(ox / 160) * 160; wx < ox + W + 160; wx += 160) {
      const k = mod(wx, 960) / 160, on = mod(Math.floor(t / 4) + k * 5, 12) < 4;
      if (!on) continue;
      const x = wx - ox + 76, y = 140;
      out.push(['s', x - 2, y - 2]);
      for (let i = 0; i < 5; i++) out.push(['f', x + Math.round(Math.cos(i * 1.3 + (TAU * t) / 24) * (3 + i)), y + 2 + i]);
    }
    return out;
  },
};
const STEEL = {
  id: 'alloy', type: 'Steel',
  materials: [
    ['A', 'STEEL PLATES · VAULT DOORS', 'The steel plates picked in the first round, with round vault doors: bolted and wheeled for a boss, swung open on gold light for the way out.', { ...STYLES.A, ...steelDoors(vaultDoor) }],
    ['B', 'STEEL PLATES · BLAST DOORS', 'The steel plates picked in the first round, with blast doors: two thick halves under a hazard stripe, parted on gold light for the way out.', { ...STYLES.A, ...steelDoors(blastDoor) }],
    ['C', 'STEEL PLATES · BULKHEADS', 'The steel plates picked in the first round, with ship\'s bulkhead hatches: latched, with a cyan porthole for a boss and a gold one for the way out.', { ...STYLES.A, ...steelDoors(bulkhead) }],
  ],
  backdrops: [
    scrolling('ROLLING MILL', 'Inside a rolling mill: steel plate walls, a crane gantry overhead, glowing billets on the rollers, steam rising. Scrolls in three layers.', 240,
      { rate: 0.08, period: 480, fixed: (r, ox) => { panels(r, ox, { y0: 0, y1: 178, pw: 48, ph: 40, base: As(0.42), light: As(0.56), dark: As(0.28) }); for (let x = 0; x < W; x++) if (mod(x + ox, 48) > 6 && mod(x + ox, 48) < 42) for (let y = 14; y < 30; y++) r.set(x, y, y < 16 ? Al(0.9) : mix(Al(0.7), c('#c8d8e0'), 0.3)); } },
      { rate: 0.2, period: 960, fixed: (r, ox) => {
        for (let x = 0; x < W; x++) { const wx = x + ox; r.set(x, 40, Al(0.3)); r.set(x, 41, Al(0.3)); r.set(x, 54, Al(0.3)); r.set(x, 55, Al(0.3)); const z = mod(wx, 16); r.set(x, 42 + Math.min(z, 16 - z) * 1.6 | 0, Al(0.3)); }
        for (const hx of [300, 780]) { const x = mod(hx - ox, 960) - 100; if (x < -30 || x > W + 30) continue; fillRect(r, x - 8, 56, 16, 8, As(0.3)); vert(r, x, 64, 110, As(0.25)); for (const [i, j] of [[0, 0], [1, 1], [2, 2], [2, 3], [1, 4], [0, 4], [-1, 3]]) r.set(x + i, 110 + j, As(0.3)); }
      } },
      { rate: 0.4, period: 960, fixed: (r, ox) => {
        for (let x = 0; x < W; x++) { const wx = x + ox; for (let y = 166; y < 172; y++) r.set(x, y, y === 166 ? Al(0.7) : As(0.3)); if (mod(wx, 12) < 8) { r.set(x, 172, As(0.2)); r.set(x, 173, As(0.2)); } }
        for (let wx = Math.floor(ox / 120) * 120; wx < ox + W + 120; wx += 120) if (hash(mod(wx, 960), 0, 702) > 0.35) { const x = wx - ox + 20; for (let y = 160; y < 166; y++) for (let i = 0; i < 44; i++) r.set(x + i, y, y === 160 ? HOT[0] : i < 2 || i > 41 ? HOT[2] : HOT[1]); halo(r, x + 22, 162, 24, c('#ff8a30'), 0.3); }
        dark(r, 178, As(0.12));
      }, parts: [drift(703, 40, [Al(0.85), Al(0.7)], 150, -0.15)] }),
    still('FOUNDRY', 'A great ladle tipping molten steel into a mould, the foundry lit orange, sparks flying.', (r) => {
      fillRect(r, 0, 0, W, H, As(0.16));
      glow(r, 230, 130, 110, c('#ff8a30'), 0.28);
      for (const x of [140, 168]) for (let y = 0; y < 60; y++) if (y % 4 < 3) { r.set(x, y, As(0.4)); r.set(x + 1, y, As(0.3)); }   // the chains
      for (let j = 0; j < 40; j++) for (let i = 0; i < 70; i++) { const dx = i - 35, dy = j; if (dx * dx / (35 * 35) + dy * dy / (40 * 40) > 1) continue; r.set(120 + i + Math.floor(j * 0.6), 60 + j, i < 4 ? Al(0.6) : As(0.35)); }   // the ladle, tipped
      for (let y = 70; y < 160; y++) { const x = 196 + Math.floor((y - 70) * 0.25), w = 3 + Math.floor((y - 70) / 30); for (let i = -w; i <= w; i++) r.set(x + i, y, Math.abs(i) < w - 1 ? HOT[0] : HOT[1]); }
      fillRect(r, 170, 158, 90, 20, As(0.3)); for (let i = 172; i < 258; i++) r.set(i, 158, Al(0.7)); for (let i = 190; i < 240; i++) { r.set(i, 160, HOT[1]); r.set(i, 161, HOT[2]); }   // the mould
      for (let i = 0; i < 70; i++) { const a = hash(i, 0, 704) * Math.PI, d = 10 + hash(i, 1, 704) * 70; r.set(Math.round(220 + Math.cos(a) * d), Math.round(158 - Math.sin(a) * d * 0.7), hash(i, 2, 704) > 0.5 ? HOT[0] : HOT[1]); }
      dark(r, 178, As(0.1));
    }),
    still('SKYSCRAPER FRAME', 'The steel frame of a tower going up against a clear sky, riveted beams floor upon floor, a tower crane above.', (r) => {
      grad(r, 0, H, [[0, c('#3a78c0')], [0.7, c('#a8cce8')], [1, As(0.4)]]);
      const S = As(0.5), Hi = Al(0.8);
      for (let x = 240; x < 460; x++) for (let y = 30; y < 178; y++) {
        const col = mod(x - 240, 44) < 4, floor = mod(y - 30, 24) < 3;
        if (col || floor) r.set(x, y, (col && mod(x - 240, 44) === 0) || (floor && mod(y - 30, 24) === 0) ? Hi : (x + y) % 9 === 0 ? Al(0.95) : S);
        else if (mod(x - 240, 44) < 24 && Math.abs(mod(x - 240, 44) - mod(y - 30, 24) * 0.9) < 0.7) r.set(x, y, S);   // cross bracing
      }
      vert(r, 120, 10, 178, As(0.45)); vert(r, 126, 10, 178, As(0.45)); for (let y = 12; y < 178; y += 6) line(r, 120, y, 126, y + 6, As(0.45));   // the crane's mast
      fillRect(r, 60, 10, 300, 3, As(0.45)); for (let x = 60; x < 360; x += 8) line(r, x, 13, x + 4, 18, As(0.45)); fillRect(r, 60, 18, 300, 1, As(0.45));
      vert(r, 300, 19, 70, As(0.35)); fillRect(r, 288, 70, 24, 3, As(0.35));   // the hook and a beam on it
      dark(r, 178, As(0.12));
    }),
    still('SHIPYARD', 'A steel hull in dry dock at dusk, riveted and portholed, gantry cranes standing over it.', (r) => {
      grad(r, 0, H, [[0, c('#2a3048')], [0.6, c('#c88870')], [1, As(0.3)]]);
      for (const x of [80, 380]) { line(r, x, 178, x + 30, 20, As(0.22)); line(r, x + 60, 178, x + 30, 20, As(0.22)); fillRect(r, x, 18, 120, 4, As(0.22)); line(r, x + 10, 120, x + 50, 120, As(0.22)); }
      for (let x = 90; x < 430; x++) { const t = (x - 90) / 340, top = 70 + Math.round(30 * (1 - t) ** 3), bottom = 172; for (let y = top; y < bottom; y++) r.set(x, y, y === top ? Al(0.85) : (y - top) % 12 === 0 || mod(x, 30) === 0 ? As(0.45) : y < 110 ? As(0.6) : As(0.52)); }
      for (let x = 120; x < 420; x += 26) { ellipse(r, x, 92, 3, 3, Al(0.85)); ellipse(r, x, 92, 2, 2, c('#ffd080')); }
      for (let x = 90; x < 430; x += 4) r.set(x, 140, As(0.35));
      dark(r, 176, As(0.12));
    }),
    scrolling('ASSEMBLY LINE', 'Robot arms along a conveyor, steel crates riding past, welding sparks flaring at the arms. Scrolls in three layers.', 240,
      { rate: 0.08, period: 480, fixed: (r, ox) => { panels(r, ox, { y0: 0, y1: 178, pw: 60, ph: 44, base: As(0.36), light: As(0.5), dark: As(0.24) }); for (let x = 0; x < W; x++) for (let y = 100; y < 108; y++) r.set(x, y, mod(x + ox + y, 12) < 6 ? c('#e8c020') : c('#1e1a14')); } },
      { rate: 0.25, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 160) * 160; wx < ox + W + 160; wx += 160) {
          const x = wx - ox + 40;
          fillRect(r, x, 150, 16, 12, As(0.18)); for (let i = 0; i < 16; i++) r.set(x + i, 150, Al(0.7));
          fillRect(r, x + 4, 118, 8, 32, As(0.16)); vert(r, x + 4, 118, 150, Al(0.6));
          for (let i = 0; i < 30; i++) for (let w = 0; w < 6; w++) r.set(x + 8 + i, 118 + Math.floor(i * 0.6) + w - 3, w === 0 ? Al(0.85) : w === 5 ? As(0.1) : As(0.2));   // the arm
          ellipse(r, x + 8, 118, 6, 6, As(0.16)); ellipse(r, x + 8, 118, 3, 3, c('#e8a020')); ellipse(r, x + 38, 136, 3, 3, c('#e8a020'));
          line(r, x + 38, 136, x + 37, 140, As(0.12)); line(r, x + 39, 136, x + 40, 140, As(0.12));
        }
      }, parts: [WELD] },
      { rate: 0.4, period: 960, fixed: (r, ox) => { for (let x = 0; x < W; x++) { for (let y = 162; y < 170; y++) r.set(x, y, y === 162 ? Al(0.6) : As(0.25)); if (mod(x + ox, 10) < 6) r.set(x, 170, As(0.15)); } dark(r, 178, As(0.1)); }, parts: [CRATES] }),
    still('STEEL BRIDGE', 'A steel truss bridge across a dark river at night, its lamps reflected in the water, the city beyond.', (r) => {
      grad(r, 0, 120, [[0, c('#06080e')], [1, As(0.4)]]);
      stars(r, 705, 60, 80, As(0.6), Al(0.9));
      skyline(r, 0, { y: 120, minH: 8, maxH: 40, col: As(0.22), lit: c('#ffd880'), cw: 10, gap: 0.2, rate: 0.12, seed: 706 });
      for (let y = 120; y < H; y++) for (let x = 0; x < W; x++) r.set(x, y, (y + Math.round(Math.sin(x * 0.1 + y) * 2)) % 6 === 0 ? As(0.3) : As(0.18));
      const D = As(0.5);
      for (let x = 0; x < W; x++) { r.set(x, 70, D); r.set(x, 71, D); r.set(x, 112, D); r.set(x, 113, D); const z = mod(x, 48); r.set(x, 72 + Math.round(Math.min(z, 48 - z) * 1.66), D); if (z === 0) vert(r, x, 70, 114, D); }
      for (let x = 24; x < W; x += 48) { ellipse(r, x, 116, 1, 1, c('#ffe0a0')); for (let y = 124; y < H; y += 3) if (hash(x, y, 707) > 0.3) r.set(x + Math.round(Math.sin(y * 0.5) * 2), y, c('#c8a860')); }
      dark(r, 178, As(0.12));
    }),
  ],
};

export const BATCH3 = [ROCK, GHOST, DRAGON_SLICE, DARK, STEEL];

// Small helpers shared with batch 2's look.
function bareTree(r, x, base, h, col, seed) {
  for (let j = 0; j < h; j++) { const w = j < h * 0.3 ? 3 : 2; for (let i = 0; i < w; i++) r.set(x + i, base - j, col); }
  for (let k = 0; k < 5; k++) {
    const y0 = base - Math.floor(h * (0.4 + k * 0.12)), dir = k % 2 ? 1 : -1, len = 8 + Math.floor(hash(k, x, seed) * 12);
    for (let i = 0; i < len; i++) r.set(x + 1 + dir * i, y0 - Math.floor(i * 0.6), col);
  }
}
function web(r, cx, cy, rad, col) {
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; line(r, cx, cy, cx + Math.round(Math.cos(a) * rad), cy + Math.round(Math.sin(a) * rad), col); }
  for (let rr = 6; rr < rad; rr += 6) for (let a = 0; a < TAU; a += 0.04) if (hash(Math.round(a * 50), rr, cx) > 0.1) r.set(cx + Math.round(Math.cos(a) * rr), cy + Math.round(Math.sin(a) * rr), col);
}
