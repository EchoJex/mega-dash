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
//
// The owner, 6 Nov 2026, on the Ghost board: "redo the 6 backdrops, with a wider interpretation of
// 'Ghost' using what other video games have established as precedent". So the six backdrops are new,
// each from a kind of haunting games keep coming back to (drawn fresh, copying no one game): the
// haunted manor with its floating furniture and watching portraits, the spirit shrine of lanterns
// and blue spirit flames, the tower full of graves, the haunted fairground and its ghost train, the
// river of souls with its ferryman, and the ghost town of the old west. The materials are as before.

const wraith = B('wraith');
const Wv = (k) => tn(wraith, k), Wd = (k) => tn(wraith, k, 'secondary'), WISP = [c('#e4fff6'), c('#8af0d0')];
const MOONPALE = [c('#fbf8ff'), c('#e4dcf8'), c('#b8a8e0')];
const SPIRIT = [c('#e0f8ff'), c('#7ad8ff'), c('#3a7ac8')];   // blue spirit flame: heart, body, edge
const night = (r, k = 1) => grad(r, 0, H, [[0, Wd(0.3)], [0.65, mix(Wd(1), Wv(0.45), 0.4 * k)], [1, Wd(0.4)]]);
function headstone(r, x, base, kind, col, edge) {
  if (kind === 0) { for (let j = 0; j < 16; j++) for (let i = 0; i < 9; i++) { if (j < 3 && ((i - 4) / 4.5) ** 2 + ((j - 3) / 3) ** 2 > 1) continue; r.set(x + i, base - 16 + j, i === 0 ? edge : col); } }
  else if (kind === 1) { fillRect(r, x + 3, base - 20, 3, 20, col); fillRect(r, x, base - 15, 9, 3, col); vert(r, x + 3, base - 20, base, edge); }
  else { for (let j = 0; j < 24; j++) { const half = j < 4 ? Math.floor(j / 2) : 2; for (let i = -half; i <= half; i++) r.set(x + 4 + i, base - 24 + j, i === -half ? edge : col); } }
}
/** A blue spirit flame: a teardrop, its tip flicking up. */
function spiritFlame(r, x, y, s) {
  glow(r, x, y, s * 3, SPIRIT[1], 0.35);
  for (let j = -s * 2; j <= s; j++) for (let i = -s; i <= s; i++) {
    const t = j < 0 ? 1 + j / (s * 2) : 1 - (j / s) ** 2, half = s * Math.sqrt(Math.max(0, t)) * (j < 0 ? 0.8 : 1);
    if (Math.abs(i) > half) continue;
    r.set(x + i, y + j, Math.abs(i) < half * 0.4 && j > -s ? SPIRIT[0] : Math.abs(i) < half * 0.8 ? SPIRIT[1] : SPIRIT[2]);
  }
}
/** Portraits' eyes in the haunted hall: they look left, then ahead, then right, then ahead, following you. */
const PORTRAIT_X = [36, 196, 356];
const EYES = {
  pieces: () => pics([['p', 1, 1, (p) => p.set(0, 0, BLACK)]]),
  at(ox, t) {
    const ph = mod(t, 240), look = ph < 80 ? -1 : ph < 120 ? 0 : ph < 200 ? 1 : 0, out = [];
    for (let wx = Math.floor(ox / 480) * 480; wx < ox + W + 480; wx += 480) for (const px of PORTRAIT_X) {
      const x = wx + px - ox;
      if (x < -50 || x > W + 10) continue;
      out.push(['p', x + 15 + look, 86], ['p', x + 23 + look, 86]);
    }
    return out;
  },
};
/** Furniture floating in the haunted hall, each piece bobbing on its own beat. */
const FLOATERS = {
  pieces: () => pics([
    ['chair', 12, 18, (p) => { const C = [c('#5a3a2a'), c('#7a5238'), c('#3a2418')]; fillRect(p, 1, 0, 2, 18, C[1]); fillRect(p, 1, 0, 10, 2, C[1]); for (let y = 2; y < 9; y += 3) fillRect(p, 3, y, 6, 1, C[2]); fillRect(p, 0, 9, 12, 3, C[0]); for (let i = 0; i < 12; i++) p.set(i, 9, C[1]); fillRect(p, 9, 12, 2, 6, C[2]); fillRect(p, 1, 12, 2, 6, C[2]); }],
    ['book', 10, 6, (p) => { for (let i = 0; i < 10; i++) { const y = Math.abs(i - 4.5) < 1 ? 2 : 0; for (let j = y; j < 6; j++) p.set(i, j, j === y ? c('#f0e8d8') : i === 0 || i === 9 ? c('#6a2a2a') : c('#d8ccb8')); } }],
    ['candles', 11, 13, (p) => { const G = [c('#c9a21e'), c('#8a6d10')]; fillRect(p, 5, 6, 1, 7, G[0]); fillRect(p, 1, 6, 9, 1, G[0]); fillRect(p, 3, 12, 5, 1, G[1]); for (const x of [1, 5, 9]) { fillRect(p, x, 3, 1, 3, c('#f0e8d8')); p.set(x, 1, c('#ffd070')); p.set(x, 2, c('#fff4c0')); } }],
    ['vase', 7, 10, (p) => { for (let j = 0; j < 10; j++) { const half = j < 2 ? 1 : j < 7 ? 3 : 2; for (let i = -half; i <= half; i++) p.set(3 + i, j, i === -half ? Wv(0.8) : j % 4 === 2 ? c('#3a6aa0') : Wv(0.55)); } }],
  ]),
  at(ox, t) {
    const out = [], a = (TAU * mod(t, 240)) / 240;
    for (let i = 0; i < 8; i++) {
      const x = mod(Math.floor(hash(i, 0, 420) * 960) - ox, 960) - 30, y = 70 + Math.floor(hash(i, 1, 420) * 60) + Math.round(5 * Math.sin(a + i * 1.7));
      if (x > -20 && x < W) out.push([['chair', 'book', 'candles', 'vase'][i % 4], x, y]);
    }
    return out;
  },
};
/** Souls drifting down the underworld river: pale wisps with tails, flowing in two bands. */
const SOULS = {
  pieces: () => pics([0, 1].map((k) => [`s${k}`, 14, 5, (p) => { for (let i = 0; i < 14; i++) { const h = Math.round((1 - i / 14) * (k ? 2 : 1.5)); for (let j = -h; j <= h; j++) p.set(i, 2 + j, i < 3 ? WISP[0] : WISP[1], Math.round(255 * (1 - i / 16))); } }])),
  at(ox, t) {
    const out = [];
    for (const [y, P, offs, k] of [[156, 120, [0, 54], 0], [168, 160, [0, 70, 118], 1]]) {
      const shift = Math.floor((mod(t, 240) / 240) * P);
      for (let wx = Math.floor((ox - P) / P) * P; wx < ox + W + P; wx += P) for (const o of offs) {
        const x = wx + o - shift - ox + Math.round(2 * Math.sin((TAU * mod(t, 120)) / 120 + o));
        if (x > -14 && x < W) out.push([`s${k}`, x, y + (o % 3)]);
      }
    }
    return out;
  },
};
/** The ferryman's boat on the river, rocking gently, his lantern lit. */
const FERRY = {
  pieces: () => pics([['boat', 44, 26, (p) => {
    const D = Wd(0.12);
    for (let i = 0; i < 44; i++) { const top = 20 - Math.round(3 * Math.abs(i - 22) / 22 * 2), bottom = 24 - Math.round(Math.abs(i - 22) / 11); for (let j = top; j < bottom; j++) p.set(i, j, j === top ? Wv(0.4) : D); }
    fillRect(p, 18, 6, 6, 14, D); ellipse(p, 21, 5, 3, 3, D); line(p, 26, 2, 40, 22, D);   // the hooded ferryman and his pole
    vert(p, 30, 2, 8, D); fillRect(p, 28, 8, 5, 5, c('#ffd070')); p.set(30, 10, WHITE);   // the lantern
  }]]),
  at(ox, t) {
    const x = mod(380 - ox, 960) - 100;
    return x > -50 && x < W ? [['boat', x, 134 + Math.round(Math.sin((TAU * mod(t, 120)) / 120))]] : [];
  },
};
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
    scrolling('HAUNTED HALL', 'A manor\'s hall where the furniture floats: chairs, books and candlesticks bobbing in the air, portraits whose eyes follow you. Scrolls in two layers.', 240,
      { rate: 0.12, period: 480, fixed: (r, ox) => {
        for (let y = 0; y < 178; y++) for (let x = 0; x < W; x++) { const wx = x + ox, stripe = mod(wx, 16) < 2, dam = Math.abs(mod(wx, 16) - 9) + Math.abs(mod(y, 20) - 10) === 5; r.set(x, y, y < 128 ? (stripe ? Wd(0.7) : dam ? mix(Wd(1), Wv(0.35), 0.5) : mix(Wd(1), Wv(0.2), 0.3)) : y === 128 || y === 129 ? c('#7a5238') : mod(wx, 40) === 0 || y === 140 ? c('#2e1a12') : c('#4a2c1e')); }
        for (let x = 0; x < W; x++) { r.set(x, 56, c('#7a5238')); r.set(x, 57, c('#3a2418')); }   // the picture rail
        for (let wx = Math.floor(ox / 480) * 480; wx < ox + W + 480; wx += 480) for (const px of PORTRAIT_X) {
          const x = wx + px - ox;
          if (x < -50 || x > W + 10) continue;
          for (let j = 0; j < 54; j++) for (let i = 0; i < 40; i++) r.set(x + i, 64 + j, i < 3 || i > 36 || j < 3 || j > 50 ? (i + j) % 3 ? c('#c9a21e') : c('#8a6d10') : Wd(0.5));   // the gilt frame
          ellipse(r, x + 20, 92, 11, 15, mix(Wd(1), Wv(0.6), 0.4)); ellipse(r, x + 20, 112, 16, 8, Wd(0.3));   // a pale face over dark shoulders
          for (const ex of [15, 23]) { r.set(x + ex - 1, 86, WHITE); r.set(x + ex, 86, WHITE); r.set(x + ex + 1, 86, WHITE); }   // the whites of its eyes
          vert(r, x + 60, 70, 84, c('#8a6d10')); glow(r, x + 60, 66, 14, c('#ffd070'), 0.35); flame(r, x + 60, 70, 4, [c('#ffd070'), c('#e87830')]);   // a sconce
        }
      }, parts: [EYES] },
      { rate: 0.3, period: 960, fixed: (r) => dark(r, 178, Wd(0.2)), parts: [FLOATERS] }),
    still('LANTERN SHRINE', 'A shrine path at night through gate after gate, paper lanterns glowing along it and blue spirit flames floating between.', (r) => {
      night(r);
      glow(r, 240, 60, 60, Wv(0.8), 0.25); disc(r, 240, 60, 26, MOONPALE);
      for (const x0 of [0, 420]) for (let x = x0; x < x0 + 60; x += 7) { vert(r, x, 0, 178, Wd(0.15)); vert(r, x + 1, 0, 178, Wd(0.22)); for (let y = 10; y < 178; y += 18) r.set(x + 2, y, Wd(0.3)); }   // bamboo at each side
      for (let y = 120; y < 178; y++) { const half = Math.round(10 + (y - 120) * 2.2); for (let x = 240 - half; x <= 240 + half; x++) r.set(x, y, (y + Math.floor(Math.abs(x - 240) / 8)) % 6 === 0 ? Wd(0.45) : Wd(0.6)); }   // the stone path
      const RED = [c('#c83c2a'), c('#8a2418'), c('#e8704a')];
      for (const s of [0.35, 0.5, 0.7, 1]) {   // gates receding up the path
        const cx = 240, h = Math.round(80 * s), w = Math.round(110 * s), base = 120 + Math.round(58 * s), th = Math.max(2, Math.round(5 * s));
        for (const side of [-1, 1]) fillRect(r, cx + side * Math.round(w / 2) - Math.floor(th / 2), base - h, th, h, mix(RED[1], Wd(0.3), 1 - s));
        for (let i = -Math.round(w / 2) - 8 * s; i <= w / 2 + 8 * s; i++) { const lift = Math.round(Math.max(0, Math.abs(i) - w / 2 + 6 * s) * 0.4); for (let j = 0; j < th; j++) r.set(cx + Math.round(i), base - h - lift + j, j === 0 ? mix(RED[2], Wd(0.3), 1 - s) : mix(RED[0], Wd(0.3), 1 - s)); }
        fillRect(r, cx - Math.round(w / 2), base - h + Math.round(12 * s), w, Math.max(1, th - 1), mix(RED[1], Wd(0.3), 1 - s));
      }
      for (const [x, y] of [[150, 128], [330, 128], [116, 150], [364, 150], [80, 166], [400, 166]]) { vert(r, x, y - 18, y - 4, Wd(0.2)); glow(r, x, y, 16, c('#ff9a50'), 0.4); ellipse(r, x, y, 4, 5, c('#f07a3a')); ellipse(r, x - 1, y - 1, 2, 3, c('#ffd090')); r.set(x - 4, y, c('#8a2418')); r.set(x + 4, y, c('#8a2418')); }   // paper lanterns
      for (const [x, y, s] of [[190, 96, 3], [300, 84, 4], [100, 100, 3], [384, 108, 3], [262, 130, 2]]) spiritFlame(r, x, y, s);
      dark(r, 178, Wd(0.15));
    }),
    still('GRAVE TOWER', 'Inside a tall tower given over to the dead: tier on tier of gravestones, mist on every floor, ghost lights drifting up the stair.', (r) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const row = Math.floor(y / 12), bx = mod(x + (row % 2) * 16, 32); r.set(x, y, y % 12 === 0 || bx === 0 ? Wd(0.35) : pick([Wd(0.6), mix(Wd(1), Wv(0.25), 0.3)], noise2(x * 0.08, y * 0.08, 430), x, y)); }
      for (const x of [60, 400]) { for (let j = 0; j < 50; j++) for (let i = 0; i < 20; i++) { const dx = i - 10; if (j < 10 && dx * dx + (j - 10) ** 2 > 100) continue; r.set(x + i, 14 + j, Wd(0.15)); } beam(r, x + 10, 40, Math.PI / 2 + 0.35, 0.1, 150, Wv(0.85), 0.25); }   // arched windows, moonlight falling
      for (const [y, x0, x1] of [[70, 120, 470], [112, 0, 360], [150, 100, 480]]) {
        for (let x = x0; x < x1; x++) { r.set(x, y, Wv(0.45)); r.set(x, y + 1, Wd(0.25)); for (let j = 2; j < 6; j++) r.set(x, y + j, Wd(0.3)); }   // a floor of the tower
        for (let x = x0 + 8; x < x1 - 10; x += 18) headstone(r, x, y, Math.floor(hash(x, y, 431) * 3), mix(Wd(1), Wv(0.45), 0.5), Wv(0.7));
        for (let x = x0; x < x1; x++) for (let j = 1; j < 9; j++) if (hash(x, y - j, 432) < 0.5 - j * 0.05) r.set(x, y - j, Wv(0.7), 70);   // mist along each floor
      }
      for (let k = 0; k < 40; k++) { const x = 360 + k * 3, y = 150 - k; fillRect(r, x, y, 6, 2, Wv(0.4)); }   // the stair
      for (const [x, y] of [[380, 132], [404, 116], [430, 96], [200, 54]]) { glow(r, x, y, 10, WISP[1], 0.45); r.set(x, y, WISP[0]); r.set(x + 1, y, WISP[0]); }
      dark(r, 178, Wd(0.18));
    }),
    still('HAUNTED CARNIVAL', 'A fairground shut for good: a crooked wheel against the moon, a faded big top, and a ghost train whose entrance is one great staring eye.', (r) => {
      night(r, 0.8);
      glow(r, 120, 50, 40, Wv(0.8), 0.25); disc(r, 120, 50, 18, MOONPALE);
      const D = Wd(0.2);
      const wc = [110, 96], wr = 58;
      for (let a = 0; a < TAU; a += 0.004) { r.set(Math.round(wc[0] + Math.cos(a) * wr), Math.round(wc[1] + Math.sin(a) * wr), D); r.set(Math.round(wc[0] + Math.cos(a) * (wr - 2)), Math.round(wc[1] + Math.sin(a) * (wr - 2)), D); }
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU + 0.1, x = Math.round(wc[0] + Math.cos(a) * wr), y = Math.round(wc[1] + Math.sin(a) * wr); line(r, wc[0], wc[1], x, y, D); fillRect(r, x - 3, y + 1, 7, 6, D); if (k % 4 === 1) fillRect(r, x - 2, y + 2, 5, 3, c('#ffd070')); }   // the wheel, a couple of cabins still lit
      line(r, wc[0], wc[1], wc[0] - 40, 178, D); line(r, wc[0], wc[1], wc[0] + 40, 178, D);
      for (let j = 0; j < 70; j++) { const half = Math.round(10 + j * 1.2); for (let i = -half; i <= half; i++) r.set(270 + i, 108 + j, mod(i + 200, 16) < 8 ? mix(c('#a03a3a'), Wd(0.5), 0.45) : mix(c('#e8dcc8'), Wd(0.5), 0.45)); }   // the big top
      vert(r, 270, 92, 108, D); for (let j = 0; j < 5; j++) fillRect(r, 271, 92 + j, 7 - j, 1, c('#a03a3a'));
      fillRect(r, 370, 96, 100, 82, Wd(0.28)); for (let i = 370; i < 470; i++) r.set(i, 96, Wv(0.45));   // the ghost train's front
      ellipse(r, 420, 120, 22, 14, c('#f0ece0')); ellipse(r, 420, 120, 9, 9, c('#3a8a6a')); ellipse(r, 420, 120, 4, 4, BLACK); r.set(416, 116, WHITE); r.set(417, 116, WHITE);   // its one great eye
      for (let i = 0; i < 44; i++) { const top = 150 - Math.round(Math.sqrt(Math.max(0, 22 * 22 - (i - 22) ** 2)) * 0.6); for (let y = top; y < 178; y++) r.set(398 + i, y, BLACK); }   // the tunnel mouth
      for (let i = 0; i < 44; i += 6) { r.set(400 + i, 146, c('#f0ece0')); r.set(401 + i, 147, c('#f0ece0')); }   // teeth
      for (let x = 160; x < 380; x++) { const y = 70 + Math.round(10 * Math.sin(((x - 160) / 220) * Math.PI)); r.set(x, y, D); if (mod(x, 12) < 5) { const h = 5 - mod(x, 12); for (let j = 1; j <= h; j++) r.set(x, y + j, [c('#a03a3a'), c('#e8c020'), c('#4a8ab0')][Math.floor(x / 12) % 3]); } }   // bunting
      dark(r, 178, Wd(0.16));
    }),
    scrolling('SOUL RIVER', 'The river of the dead: souls drifting downstream like pale fish, a ferryman poling his boat with a lantern, dead trees on the banks. Scrolls in three layers.', 240,
      { rate: 0.05, period: 480, fixed: (r, ox) => {
        grad(r, 0, H, [[0, c('#0c0818')], [0.6, mix(Wd(1), c('#2a5a6a'), 0.4)], [1, Wd(0.3)]]);
        for (let x = 0; x < W; x++) { const len = Math.floor(seamless((w) => noise1(w * 0.08, 440), x + ox, 480) * 30); for (let j = 0; j < len; j++) r.set(x, j, Wd(0.18)); }   // the cavern roof
        for (const gx of [200, 440]) { const x = mod(gx - ox, 480) - 20; glow(r, x + 12, 100, 30, WISP[1], 0.25); fillRect(r, x, 70, 6, 60, Wd(0.2)); fillRect(r, x + 18, 70, 6, 60, Wd(0.2)); fillRect(r, x - 4, 66, 32, 5, Wd(0.2)); }   // far gates
      } },
      { rate: 0.15, period: 960, fixed: (r, ox) => {
        ridge(r, ox, { y: 146, amp: 10, f: 0.02, seed: 441, col: Wd(0.22), top: Wv(0.35), period: 960 });
        for (let wx = Math.floor(ox / 120) * 120; wx < ox + W + 120; wx += 120) { const k = mod(wx, 960); bareTree(r, wx - ox + Math.floor(hash(k, 0, 442) * 60), 142, 30 + Math.floor(hash(k, 1, 442) * 30), Wd(0.16), k); }
      }, parts: [FERRY] },
      { rate: 0.3, period: 960, fixed: (r, ox) => {
        for (let y = 150; y < 178; y++) for (let x = 0; x < W; x++) r.set(x, y, (y + Math.round(Math.sin((x + ox) * 0.08 + y) * 2)) % 5 === 0 ? mix(Wd(1), c('#3a8a8a'), 0.4) : mix(Wd(0.6), c('#0a2a30'), 0.4));
        dark(r, 178, Wd(0.12));
      }, parts: [SOULS] }),
    still('GHOST TOWN', 'An old western town left to the dead: false-fronted saloon and stores under the moon, a water tower, a tumbleweed, and a see-through cowboy in the street.', (r) => {
      grad(r, 0, H, [[0, Wd(0.35)], [0.7, mix(Wd(1), Wv(0.5), 0.35)], [1, Wd(0.4)]]);
      stars(r, 450, 70, 100, Wv(0.4), WHITE);
      glow(r, 400, 40, 40, Wv(0.8), 0.25); disc(r, 400, 40, 20, MOONPALE);
      const WOOD = [Wd(0.25), mix(c('#5a3a2a'), Wd(0.5), 0.5), mix(c('#7a5a40'), Wv(0.4), 0.4)];
      for (const [x, w, h, front] of [[20, 70, 60, 80], [96, 60, 50, 64], [166, 90, 70, 96], [262, 64, 54, 70]]) {
        fillRect(r, x, 178 - h, w, h, WOOD[1]); fillRect(r, x, 178 - front, w, front - h + 1, WOOD[1]);   // the building and its false front
        for (let i = x; i < x + w; i++) { r.set(i, 178 - front, WOOD[2]); if (mod(i - x, 6) === 0) vert(r, i, 178 - front, 178, WOOD[0]); }
        for (let k = 0; k < Math.floor(w / 22); k++) { const wx2 = x + 6 + k * 22; fillRect(r, wx2, 178 - h + 10, 10, 12, Wd(0.12)); if (hash(wx2, 0, 451) > 0.6) { line(r, wx2, 178 - h + 10, wx2 + 9, 178 - h + 21, WOOD[2]); } else if (hash(wx2, 1, 451) > 0.7) fillRect(r, wx2 + 1, 178 - h + 11, 8, 10, c('#8ad0a8')); }
        fillRect(r, x - 2, 178 - h + 26, w + 4, 2, WOOD[0]);   // the porch roof
      }
      fillRect(r, 196, 150, 14, 28, Wd(0.12)); for (let j = 0; j < 12; j++) { r.set(197 + (j % 2), 154 + j, WOOD[2]); r.set(208 - (j % 2), 154 + j, WOOD[2]); }   // the saloon's swinging doors
      for (const x of [370, 410]) line(r, x, 178, x + 10, 104, WOOD[0]); line(r, 450, 178, 440, 104, WOOD[0]); fillRect(r, 368, 74, 84, 34, WOOD[1]); for (let i = 368; i < 452; i += 8) vert(r, i, 74, 108, WOOD[0]); for (let i = 364; i < 456; i++) r.set(i, 72 - Math.floor(Math.abs(i - 410) / 12), WOOD[2]);   // the water tower
      for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) if (Math.abs(Math.hypot(i - 4, j - 4) - 3.5) < 1 && hash(i, j, 452) > 0.3) r.set(330 + i, 168 + j, WOOD[2]);   // a tumbleweed
      for (let j = 0; j < 30; j++) { const half = j < 6 ? 3 : j < 8 ? 9 : j < 18 ? 4 : 3; for (let i = -half; i <= half; i++) r.set(242 + i + (j > 18 && i > 0 ? 1 : 0), 148 + j, mix(Wv(1), c('#c8f0e8'), 0.5), Math.round(150 - j * 3)); }   // the ghost of a cowboy, hat and all
      dark(r, 178, Wd(0.15));
    }),
  ],
};

// ── DRAGON: Drake Man's castle ───────────────────────────────────────
//
// The owner, 6 Nov 2026, on the Dragon board: "6c but do another 6 variants based on 6c, i like the
// interior halls of a castle, and i like some stained glass windows". Backdrop 6 (the throne hall)
// with the castle bricks was the starting point; these six are halls inside the castle, each with
// stained glass, in Drake Man's crimson and the indigo, violet and teal his weapon's notes ask for.

const drake = B('drake');
const Dr = (k) => tn(drake, k), Dd = (k) => tn(drake, k, 'secondary'), INDIGO = c('#3a2a6a'), VIOLET = c('#6a3a9a'), TEAL = c('#2a8a8a');
const GILT = [c('#8a6d10'), c('#c9a21e'), c('#f5d328')];
const GLASS = {   // the colours of each window's panes
  ember: [c('#c3225d'), c('#e8503a'), c('#f5b030'), c('#7a1a3a'), c('#ff8a60')],
  dusk: [c('#6a3a9a'), c('#c3225d'), c('#2a8a8a'), c('#3a2a6a'), c('#e8a020')],
  sea: [c('#2a8a8a'), c('#3a6ab0'), c('#6a3a9a'), c('#1a4a6a'), c('#8ad0c8')],
  moon: [c('#3a4aa0'), c('#6a7ad0'), c('#2a2a6a'), c('#9a8ae0'), c('#c8d0f0')],
};
const STONE = [c('#2e2a36'), c('#3e3a48'), c('#4e4a58'), c('#6e6a76')];   // the castle bricks' stone, indoors
/** The castle's inside wall: stone blocks, lit a little where `lit` says. */
function stoneWall(r, ox, y0, y1, light = 0) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const wx = x + ox, row = Math.floor(y / 10), bx = mod(wx + (row % 2) * 12, 24);
    r.set(x, y, y % 10 === 0 || bx === 0 ? STONE[0] : hash(Math.floor((wx + (row % 2) * 12) / 24), row, 520) > 0.8 - light * 0.2 ? STONE[2] : STONE[1]);
  }
}
/** The dragon rampant, for the windows: a pixel mask, # filled. */
const DRAGON_MASK = ['......##........', '.....####.......', '....##.###......', '....#...###.....', '........####....', '.##....######...', '####..#######...', '#####.########..', '.#############..', '..####.#######..', '...##..##..###..', '......##....##..', '.....##......#..', '....##..........', '...##...........', '..#.............'];
/**
 * A stained-glass window `w` wide and `h` tall: a pointed or a round top, diamond panes of `cols`
 * brighter towards the middle, leaded in black, in a stone surround; with `motif`, a red dragon or a
 * rose of panes at its heart.
 */
function stainedGlass(r, x0, y0, w, h, { cols, pointed = true, motif = null, seed = 1 }) {
  const ys = y0 + (pointed ? Math.round(w * 0.86) : Math.round(w / 2));
  const inside = (px, py) => {
    if (py >= ys) return px >= x0 && px < x0 + w && py < y0 + h;
    if (pointed) return Math.hypot(px + 0.5 - x0, py + 0.5 - ys) < w && Math.hypot(px + 0.5 - x0 - w, py + 0.5 - ys) < w && px >= x0 && px < x0 + w && py >= y0;
    return Math.hypot(px + 0.5 - x0 - w / 2, py + 0.5 - ys) < w / 2;
  };
  for (let py = y0 - 3; py < y0 + h + 3; py++) for (let px = x0 - 3; px < x0 + w + 3; px++) {
    if (inside(px, py)) {
      const i = px - x0, j = py - y0, lead = mod(i + j, 7) === 0 || mod(i - j, 7) === 0 || i === Math.floor(w / 2) && j > w;
      const cell = Math.floor((i + j) / 7) * 31 + Math.floor((i - j + 99) / 7), mid = 1 - Math.abs(i - w / 2) / (w / 2);
      const col = cols[Math.floor(hash(cell, 0, seed) * cols.length)];
      r.set(px, py, lead ? c('#120a12') : mix(col, WHITE, 0.08 + 0.22 * mid * (1 - j / h)));
    } else if (inside(px - 2, py) || inside(px + 2, py) || inside(px, py - 2) || inside(px, py + 2)) r.set(px, py, STONE[3]);   // the stone surround
  }
  if (motif === 'dragon') {
    const s = Math.max(1, Math.floor(w / 20)), mx = x0 + Math.floor((w - 16 * s) / 2), my = y0 + Math.floor(h * 0.3);
    DRAGON_MASK.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') fillRect(r, mx + i * s, my + j * s, s, s, (i + j) % 5 === 0 ? c('#ff8a60') : c('#c3225d')); }));
  } else if (motif === 'rose') {
    const cx = x0 + w / 2, cy = y0 + w * 0.55, rr = w * 0.3;
    for (let a = 0; a < TAU; a += 0.01) for (let d = 0; d < rr; d += 0.5) { const petal = Math.floor((a / TAU) * 8); r.set(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), Math.abs(((a / TAU) * 8) % 1 - 0.5) > 0.44 || Math.abs(d - rr * 0.5) < 0.6 ? c('#120a12') : [cols[0], cols[2], cols[4] || WHITE][petal % 3]); }
  }
}
/** Coloured light falling from a window to the floor, dithered so it stays pixel-crisp. */
function lightShaft(r, x0, x1, y0, y1, drift, col, a) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0), l = Math.round(x0 + drift * t), rr = Math.round(x1 + drift * t + t * 10);
    for (let x = l; x < rr; x++) if (BAYER4[mod(y, 4)][mod(x, 4)] / 16 < 0.6) r.set(x, y, col, Math.round(a * (1 - t * 0.5)));
  }
}
/** A stone pillar from the top of the hall to its floor, lit down the left, with a capital and a base. */
function pillar(r, x, w, top = 0, base = 178) {
  for (let y = top; y < base; y++) for (let i = 0; i < w; i++) r.set(x + i, y, i < 2 ? STONE[3] : i > w - 3 ? STONE[0] : (i % 5 === 2 ? STONE[1] : STONE[2]));
  for (const y of [top + 18, base - 10]) fillRect(r, x - 3, y, w + 6, 5, STONE[2]), fillRect(r, x - 3, y, w + 6, 1, STONE[3]);
}
/** The dragon's crest: a gold lozenge round one slit eye, the way his banners and shields carry it. */
function dragonEye(r, cx, cy, s) {
  for (let j = -s; j <= s; j++) for (let i = -s; i <= s; i++) {
    const d = Math.abs(i) + Math.abs(j);
    if (d > s) continue;
    r.set(cx + i, cy + j, d >= s - 1 ? GILT[1] : Math.abs(i) <= Math.max(0, Math.floor((s - Math.abs(j)) / 3)) ? c('#120a12') : d < s / 2 ? c('#f5b030') : GILT[2]);
  }
  r.set(cx - 1, cy - Math.floor(s / 3), WHITE);
}
/** A long crimson banner with the gold dragon's crest on it, hanging from a rod. */
function banner(r, x, y, w, h) {
  fillRect(r, x - 2, y, w + 4, 2, GILT[1]);
  for (let j = 2; j < h; j++) for (let i = 0; i < w; i++) { const notch = j > h - w / 2 && Math.abs(i - w / 2 + 0.5) < j - (h - w / 2); if (!notch) r.set(x + i, y + j, i === 0 ? Dr(0.95) : i === w - 1 ? Dr(0.45) : Dr(0.7)); }
  dragonEye(r, x + Math.floor(w / 2), y + 24, Math.max(4, Math.floor(w / 2) - 2));
}
/** Torches flickering in their sconces: the flame swaps between three shapes, never in step. */
const torches = (spots, period) => ({
  pieces: () => pics([0, 1, 2].map((k) => [`f${k}`, 5, 8, (p) => { const h = [7, 6, 8][k]; for (let j = 0; j < h; j++) { const half = Math.round((1 - j / h) * 2); for (let i = -half; i <= half; i++) p.set(2 + i + (k === 2 && j > 4 ? 1 : 0), 7 - j, j < h * 0.4 && i === 0 ? WHITE : Math.abs(i) === half && half ? c('#e85a1a') : c('#ffc040')); } }])),
  at(ox, t) {
    const out = [];
    for (let wx = Math.floor(ox / period) * period; wx < ox + W + period; wx += period) for (const [sx, sy] of spots) {
      const x = wx + sx - ox;
      if (x < -6 || x > W) continue;
      out.push([`f${mod(Math.floor(t / 4) + sx, 3)}`, x - 2, sy - 8]);
    }
    return out;
  },
});
/** Chandeliers swinging gently over the throne room, candles lit. */
const CHANDELIERS = {
  pieces: () => pics([['ch', 31, 40, (p) => {
    vert(p, 15, 0, 26, GILT[0]);
    for (let i = 0; i < 31; i++) { const y = 30 + Math.round(4 * Math.sin((i / 30) * Math.PI)); p.set(i, y, GILT[1]); p.set(i, y + 1, GILT[0]); }
    for (const i of [1, 8, 15, 22, 29]) { const y = 28 + Math.round(4 * Math.sin((i / 30) * Math.PI)); fillRect(p, i, y - 4, 1, 4, c('#f0e8d8')); p.set(i, y - 6, c('#ffd070')); p.set(i, y - 5, WHITE); }
  }]]),
  at(ox, t) {
    const out = [];
    for (let wx = Math.floor(ox / 240) * 240; wx < ox + W + 240; wx += 240) {
      const k = mod(wx, 960) / 240, x = wx + 120 - ox + Math.round(3 * Math.sin((TAU * mod(t, 240)) / 240 + k));
      if (x > -32 && x < W) out.push(['ch', x - 15, 8]);
    }
    return out;
  },
};
const CASTLE_C = ['C', 'CASTLE BRICKS', 'Picked in the first round: staggered castle blocks under a stone lip, iron spikes and a castle gate with a gold portcullis for the way out.', STYLES.C];
const DRAGON_SLICE = {
  id: 'drake', type: 'Dragon',
  // Dragon's material was picked in the first round: "i really like the castle one for dragon" (5 Nov
  // 2026). On 6 Nov 2026 the owner said "6c but do another 6 variants based on 6c", so the six
  // backdrops below are castle halls built on the throne hall; the backdrop is still to pick.
  pick: { material: 'C' },
  materials: [CASTLE_C],
  backdrops: [
    scrolling('GREAT HALL', 'A long great hall: tall stained-glass windows down the far wall throwing coloured light across it, pillars and dragon banners close by, torches flickering. Scrolls in two layers.', 240,
      { rate: 0.1, period: 480, fixed: (r, ox) => {
        stoneWall(r, ox, 0, 178);
        for (let wx = Math.floor(ox / 120) * 120; wx < ox + W + 120; wx += 120) {
          const k = mod(wx, 480) / 120, x = wx - ox + 38, cols = [GLASS.ember, GLASS.dusk, GLASS.sea, GLASS.dusk][k];
          stainedGlass(r, x, 22, 44, 96, { cols, seed: 500 + k });
          lightShaft(r, x + 6, x + 38, 118, 178, 18, cols[k % cols.length], 70);
        }
        for (let x = 0; x < W; x++) { r.set(x, 132, STONE[3]); r.set(x, 133, STONE[0]); }   // the gallery ledge
      } },
      { rate: 0.3, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 160) * 160; wx < ox + W + 160; wx += 160) { const x = wx - ox; pillar(r, x, 22); banner(r, x + 50, 30, 16, 70); vert(r, x + 30, 92, 104, c('#3a2a1a')); glow(r, x + 30, 88, 14, c('#ffa040'), 0.4); }
        dark(r, 178, Dd(0.08));
      }, parts: [torches([[30, 92]], 160)] }),
    still('ROSE WINDOW CHAPEL', 'The castle chapel: one great round window with a dragon at its heart, its colours falling across the pews, candles on the altar.', (r) => {
      stoneWall(r, 0, 0, 178);
      glow(r, 240, 70, 90, c('#c3225d'), 0.2);
      const cx = 240, cy = 70, rad = 54;
      for (let j = -rad - 4; j <= rad + 4; j++) for (let i = -rad - 4; i <= rad + 4; i++) {
        const d = Math.hypot(i, j);
        if (d > rad + 4) continue;
        if (d > rad) { r.set(cx + i, cy + j, STONE[3]); continue; }
        const a = (Math.atan2(j, i) + Math.PI) / TAU, ring = Math.abs(d - rad * 0.42) < 1.2 || Math.abs(d - rad * 0.74) < 1.2, spoke = Math.abs(((a * 16) % 1) - 0.5) > 0.44;
        if (ring || (spoke && d > rad * 0.42)) { r.set(cx + i, cy + j, c('#120a12')); continue; }
        const pane = Math.floor(a * 16) + (d > rad * 0.74 ? 32 : 16);
        r.set(cx + i, cy + j, d < rad * 0.42 ? c('#2a1030') : mix(GLASS.dusk[pane % 5], WHITE, 0.1 + 0.15 * (1 - d / rad)));
      }
      const s = 2, mx = cx - 16, my = cy - 16;
      DRAGON_MASK.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') fillRect(r, mx + i * s, my + j * s, s, s, (i + j) % 5 === 0 ? c('#ff8a60') : c('#c3225d')); }));   // the dragon at its heart
      lightShaft(r, 200, 280, 124, 178, 30, c('#c3225d'), 60); lightShaft(r, 220, 260, 124, 178, -20, c('#6a3a9a'), 50);
      for (let k = 0; k < 3; k++) for (let x = 20; x < 460; x++) if (mod(x - 20, 120) < 96 && Math.abs(x - 240) > 40) { const y = 154 + k * 8; r.set(x, y, c('#3a2418')); r.set(x, y + 1, c('#2a180e')); }   // pews
      fillRect(r, 210, 140, 60, 12, STONE[3]); fillRect(r, 210, 140, 60, 2, c('#e8dcc8'));   // the altar
      for (const x of [216, 228, 252, 264]) { fillRect(r, x, 132, 2, 8, c('#f0e8d8')); glow(r, x, 128, 8, c('#ffc060'), 0.4); flame(r, x, 131, 4, [c('#ffd070'), c('#e87830')]); }
      dark(r, 178, Dd(0.08));
    }),
    still('ARMOURY GALLERY', 'A gallery lined with suits of armour between tall teal and violet windows, shields bearing the dragon\'s eye and crossed spears on the walls.', (r) => {
      stoneWall(r, 0, 0, 178, 1);
      for (let k = 0; k < 4; k++) { const x = 22 + k * 120; stainedGlass(r, x, 24, 30, 92, { cols: k % 2 ? GLASS.sea : GLASS.dusk, seed: 530 + k }); lightShaft(r, x + 4, x + 26, 116, 178, 14, k % 2 ? TEAL : VIOLET, 60); }
      for (let k = 0; k < 4; k++) {
        const x = 82 + k * 120;   // a suit of armour on its plinth
        fillRect(r, x - 8, 160, 18, 18, STONE[2]); fillRect(r, x - 8, 160, 18, 1, STONE[3]);
        const ST = [c('#e8ecf0'), c('#a8b0bc'), c('#5a6270')];
        ellipse(r, x, 106, 5, 6, ST[1]); fillRect(r, x - 4, 105, 9, 2, ST[2]); r.set(x - 2, 105, c('#120a12')); r.set(x + 2, 105, c('#120a12'));   // the helm and its slit
        fillRect(r, x - 7, 113, 15, 22, ST[1]); fillRect(r, x - 7, 113, 2, 22, ST[0]); fillRect(r, x + 6, 113, 2, 22, ST[2]);   // the breastplate
        fillRect(r, x - 10, 114, 3, 20, ST[1]); fillRect(r, x + 8, 114, 3, 20, ST[2]);   // arms
        fillRect(r, x - 6, 135, 5, 25, ST[1]); fillRect(r, x + 1, 135, 5, 25, ST[2]);   // legs
        vert(r, x + 13, 92, 160, c('#5a3a2a')); for (let j = 0; j < 6; j++) fillRect(r, x + 13 - Math.floor(j / 2), 86 + j, j + 1, 1, ST[0]);   // a halberd
      }
      for (let k = 0; k < 4; k++) { const x = 140 + (k % 2) * 0 + k * 120 - 120; if (x < 20) continue; ellipse(r, x, 60, 9, 11, Dr(0.6)); ellipse(r, x - 1, 58, 6, 7, Dr(0.85)); dragonEye(r, x, 60, 5); line(r, x - 16, 40, x + 16, 80, c('#5a3a2a')); line(r, x + 16, 40, x - 16, 80, c('#5a3a2a')); }   // shields with crossed spears
      dark(r, 178, Dd(0.08));
    }),
    still('DRAGON WINDOW STAIR', 'A grand stair climbing past one huge window of a crimson dragon, torches lighting the way up.', (r) => {
      stoneWall(r, 0, 0, 178);
      glow(r, 300, 90, 110, c('#c3225d'), 0.22);
      stainedGlass(r, 250, 8, 100, 150, { cols: GLASS.ember, motif: 'dragon', seed: 540 });
      lightShaft(r, 262, 338, 158, 178, -40, c('#e8503a'), 70);
      for (let k = 0; k < 26; k++) { const x = 20 + k * 9, y = 172 - k * 5; fillRect(r, x, y, 12, 5, STONE[2]); fillRect(r, x, y, 12, 1, STONE[3]); fillRect(r, x, y + 5, 12, 178 - y - 5, STONE[1]); }   // the stair, climbing to the right
      for (let k = 0; k < 26; k += 1) { const x = 24 + k * 9, y = 160 - k * 5; vert(r, x, y, y + 10, GILT[0]); }   // its balusters
      line(r, 22, 158, 258, 28, GILT[1]); line(r, 22, 159, 258, 29, GILT[0]);   // the rail
      for (const [x, y] of [[60, 110], [170, 50], [420, 80]]) { vert(r, x, y, y + 12, c('#3a2a1a')); glow(r, x, y - 4, 14, c('#ffa040'), 0.4); flame(r, x, y, 6, [c('#ffd060'), c('#e85a1a')]); }
      dark(r, 178, Dd(0.08));
    }),
    scrolling('THRONE ROOM', 'The throne at the end of the hall: a gilded seat on its dais beneath two tall windows and the dragon banner, chandeliers swinging gently overhead. Scrolls in two layers.', 240,
      { rate: 0.08, period: 960, fixed: (r, ox) => {
        stoneWall(r, ox, 0, 178);
        for (let wx = Math.floor(ox / 240) * 240; wx < ox + W + 240; wx += 240) {
          const k = mod(wx, 960) / 240, x = wx - ox;
          if (k === 1) {   // the throne itself, once a strip
            stainedGlass(r, x + 40, 20, 50, 110, { cols: GLASS.ember, seed: 551 }); stainedGlass(r, x + 150, 20, 50, 110, { cols: GLASS.dusk, seed: 552 });
            banner(r, x + 112, 18, 16, 80);
            fillRect(r, x + 60, 160, 120, 18, STONE[3]); fillRect(r, x + 74, 150, 92, 10, STONE[3]); fillRect(r, x + 60, 160, 120, 1, c('#e8dcc8'));   // the dais
            fillRect(r, x + 104, 104, 32, 46, GILT[1]); fillRect(r, x + 108, 108, 24, 38, Dr(0.6)); fillRect(r, x + 102, 124, 4, 26, GILT[2]); fillRect(r, x + 134, 124, 4, 26, GILT[0]);
            for (let j = 0; j < 8; j++) fillRect(r, x + 112 + Math.floor(j / 2), 96 + j, 16 - j, 1, GILT[2]);   // the throne
            fillRect(r, x + 108, 160, 24, 18, Dr(0.55));   // the carpet down the steps
          } else { stainedGlass(r, x + 90, 30, 44, 96, { cols: k % 2 ? GLASS.sea : GLASS.dusk, seed: 553 + k }); lightShaft(r, x + 96, x + 128, 126, 178, 16, k % 2 ? TEAL : VIOLET, 60); }
        }
      } },
      { rate: 0.25, period: 960, fixed: (r, ox) => { for (let wx = Math.floor(ox / 240) * 240; wx < ox + W + 240; wx += 240) pillar(r, wx - ox, 18); dark(r, 178, Dd(0.08)); }, parts: [CHANDELIERS] }),
    still('MOONLIT CLOISTER', 'A cloister walk at night: pointed arches open onto the dark, their stained-glass tops lit by the moon, blue light pooling on the flagstones.', (r) => {
      grad(r, 0, H, [[0, c('#0a0a1e')], [0.7, c('#1e2a4a')], [1, Dd(0.2)]]);
      stars(r, 560, 50, 90, c('#4a5a8a'), c('#c8d0f0'));
      glow(r, 380, 30, 30, c('#c8d0f0'), 0.3); disc(r, 380, 30, 12, [c('#f8f8ff'), c('#d8dcf0'), c('#a8b0d0')]);
      for (let k = 0; k < 5; k++) {
        const x = 8 + k * 96, w = 64;
        stainedGlass(r, x + 16, 30, w, 40, { cols: GLASS.moon, seed: 560 + k });   // the arch's glass head
        for (let y = 70; y < 160; y++) for (let i = 0; i < 16; i++) r.set(x + i, y, i < 2 ? STONE[3] : STONE[1]);   // the columns between
        lightShaft(r, x + 24, x + 72, 70, 178, -30, c('#6a7ad0'), 45);
      }
      fillRect(r, 0, 0, W, 26, STONE[1]); for (let x = 0; x < W; x++) r.set(x, 26, STONE[3]);
      for (let y = 160; y < 178; y++) for (let x = 0; x < W; x++) r.set(x, y, (y - 160) % 6 === 0 || mod(x + (Math.floor((y - 160) / 6) % 2) * 10, 20) === 0 ? STONE[0] : STONE[1]);   // the flagstones
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
  // The owner, 6 Nov 2026: "1a but with the cracked glowing stone from c" — material A's platform,
  // spikes and doors on C's cracked stone ground.
  pick: { backdrop: 1, material: 'A', ground: 'C' },
  materials: [
    ['A', 'OBSIDIAN TILES', 'Dark violet glass tiles, red-glinting black glass shards and energy doors: cyan light for a boss, gold for the way out.',
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
/*
 * THE LINE, Steel's pick (the owner, 6 Nov 2026, on the Steel board): "1, 2, 5 and material B. I want
 * the backdrop to tell an assembly line story of low poly, mildly variable steel copies of the
 * player, progressing from the ladle to the billets, to a stamp, to welding arms, to the the end of
 * the conveyor belt where they are dropped into a black pit that extends below the visible area,
 * implying that they are getting dumped into a pit". So the rolling mill's hall (1), the foundry's
 * ladle (2) and the assembly line's arms and belt (5) are one line, left to right: the ladle pours,
 * billets cool along the rollers, a press stamps each into a flat cut-out of the player, two welding
 * arms raise it into a standing steel copy, and at the end of the belt each copy topples into a
 * black pit that runs on down past the bottom of the screen.
 *
 * Everything on the belt is one moving part. Items sit a slot apart and move one slot every 120
 * steps; what each looks like depends only on where it is along the line, and the copies come in
 * four slight variations by item, so the whole picture comes back to where it started every 480
 * steps (four slots).
 */
const LINE_LOOP = 480, SLOT = 40, BELT_Y = 152, PRESS_X = 190, WELD_X = [258, 300], BELT_END = 402;
const lineShift = (t) => Math.floor(mod(t, LINE_LOOP) / 3);   // a third of a pixel a step: one slot every 120 steps
const STEEL_C = [c('#dfe5ea'), c('#aab4bd'), c('#77818c'), c('#4a535d'), c('#2a3038')];   // lit, light, mid, dark, deep
const HOTS = [[c('#fffbe0'), c('#ffd060'), c('#ff9a30')], [c('#ffd060'), c('#ff8a20'), c('#c84a10')], [c('#ff7a30'), c('#c03a10'), c('#7a2a18')], [c('#8a4a3a'), c('#5a3a34'), c('#3e3438')]];
/** A copy of the player in low-poly steel: helmet and fin, a dark visor, the body in flat facets. */
const COPY_ROWS = ['......##......', '.....####.....', '....######....', '...########...', '...#vvvvvv#...', '...########...', '....######....', '..##########..', '.############.', '##.########.##', '##.########.##', '##.########.##', '#..########..#', '...########...', '...###..###...', '...###..###...', '...###..###...', '..####..####..', '..####..####..'];
function paintCopy(p, v, dim = 0) {
  const tint = (col) => mix(v === 2 ? lit(col, 0.06) : col, BLACK, dim);
  COPY_ROWS.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    if (v === 3 && j >= 9 && j <= 12 && (i <= 1 || i >= 12)) { if (j === 9) return; }   // one arm hanging a little lower
    let col;
    if (ch === 'v') col = j === 4 && i === 4 ? c('#5a7080') : c('#1a2026');   // the visor, dark: nobody home
    else if (j <= 6) col = i < 5 ? STEEL_C[0] : i < 9 ? STEEL_C[1] : STEEL_C[3];   // the helmet's three facets
    else if (j <= 13) col = i <= 1 || i >= 12 ? (i <= 1 ? STEEL_C[1] : STEEL_C[3]) : Math.abs(i - 6.5) < (13 - j) * 0.6 ? STEEL_C[1] : i < 7 ? STEEL_C[2] : STEEL_C[3];   // a V of chest plate between flat sides
    else col = i < 7 ? STEEL_C[2] : STEEL_C[3];   // legs
    p.set(i, j + (v === 2 ? 0 : 1), tint(col));
  }));
  if (v === 1) { p.set(6, 11, tint(STEEL_C[4])); p.set(7, 12, tint(STEEL_C[4])); p.set(7, 0, BLACK, 0); p.set(8, 1, tint(STEEL_C[1])); }   // a dent, and a bent fin
  if (v === 3) p.set(9, 15, tint(c('#7a4a30')));   // a fleck of rust
}
const LINE = {
  pieces: () => pics([
    ...HOTS.map((h, k) => [`billet${k}`, 18, 5, (p) => { for (let j = 0; j < 5; j++) for (let i = 0; i < 18; i++) p.set(i, j, j === 0 ? h[0] : i === 0 || i === 17 || j === 4 ? h[2] : h[1]); }]),
    ['blank', 20, 4, (p) => { const prof = [1, 2, 3, 3, 2, 2, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 2, 2, 3, 3]; prof.forEach((h, i) => { for (let j = 4 - h; j < 4; j++) p.set(i, j, j === 4 - h ? STEEL_C[0] : STEEL_C[2]); }); }],   // the player, cut out flat and lying down
    ...[0, 1, 2, 3].flatMap((v) => [[`copy${v}`, 14, 20, (p) => paintCopy(p, v)], [`fall${v}`, 14, 20, (p) => paintCopy(p, v, 0.55)], [`deep${v}`, 14, 20, (p) => paintCopy(p, v, 0.85)]]),
    ['spark', 5, 5, (p) => { for (const [x, y] of [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [2, 4]]) p.set(x, y, x === 2 && y === 2 ? WHITE : c('#a8e8ff')); }],
    ['fleck', 1, 1, (p) => p.set(0, 0, c('#ffd060'))],
  ]),
  at(ox, t) {
    const out = [], shift = lineShift(t), base = -mod(ox, 480);
    for (let n = 0; n < 480 / SLOT; n++) {
      const x = mod(n * SLOT + shift, 480), v = n % 4;
      let piece = null, px = x, py = BELT_Y;
      if (x >= 40 && x < 188) { piece = `billet${Math.min(3, Math.floor((x - 40) / 37))}`; px = x - 9; py = BELT_Y - 5; }
      else if (x >= 188 && x < 296) { piece = 'blank'; px = x - 10; py = BELT_Y - 4; }
      else if (x >= 296 && x < BELT_END + 4) { piece = `copy${v}`; px = x - 7; py = BELT_Y - 20; }
      else if (x >= BELT_END + 4 && x < 446) { const f = (x - BELT_END - 4) / 40; piece = f < 0.35 ? `fall${v}` : `deep${v}`; px = x - 7 + Math.round(f * 6); py = BELT_Y - 20 + Math.round(f * f * 90); if (py > 184) piece = null; }
      if (piece) for (const k of [0, 1]) { const sx = base + px + 480 * k; if (sx > -24 && sx < W) out.push([piece, sx, py]); }
    }
    for (const [i, wx] of WELD_X.entries()) {   // the welding arms spark while a blank is under them
      const ph = mod(shift - wx, SLOT);
      if (ph > 8 && ph < 34) continue;
      for (const k of [0, 1]) {
        const sx = base + wx + 480 * k;
        if (sx < -8 || sx > W + 8) continue;
        out.push(['spark', sx - 2, BELT_Y - 10 - (Math.floor(t / 3) + i) % 2]);
        for (let q = 0; q < 4; q++) out.push(['fleck', sx + Math.round(Math.cos(q * 1.6 + (TAU * mod(t, 24)) / 24) * (3 + q)), BELT_Y - 6 + q]);
      }
    }
    return out;
  },
};
/** The press's ram: it slams down as each billet arrives under it, then rises again. */
const PRESS = {
  pieces: () => pics([['ram', 26, 12, (p) => { for (let j = 0; j < 12; j++) for (let i = 0; i < 26; i++) p.set(i, j, j === 11 ? STEEL_C[4] : j === 0 || i === 0 ? STEEL_C[1] : i === 25 ? STEEL_C[4] : (i + j) % 6 === 0 ? STEEL_C[3] : STEEL_C[2]); }]]),
  at(ox, t) {
    const ph = mod(lineShift(t) - PRESS_X + 4, SLOT), drop = ph < 7 ? 31 : ph < 22 ? Math.round(31 * (1 - (ph - 7) / 15)) : ph > 36 ? Math.round(31 * ((ph - 36) / 4)) : 0, out = [];   // drops as a billet arrives, holds, rises
    for (const k of [0, 1]) { const sx = -mod(ox, 480) + PRESS_X - 13 + 480 * k; if (sx > -26 && sx < W) out.push(['ram', sx, 104 + drop]); }
    return out;
  },
};
/** The line itself, painted once: the ladle pouring, the rollers, the press frame, the arms, the belt and the pit. */
function steelLine(r, ox) {
  const at = (x) => x - mod(ox, 480);   // strip x to screen x for the strip starting at this screen
  for (const k of [0, 480]) {
    const X = (x) => at(x) + k;
    // the ladle, hung from the crane, tipped and pouring into the mould at the head of the belt
    for (const cx of [44, 74]) for (let y = 0; y < 36; y++) if (y % 4 < 3) { r.set(X(cx), y, STEEL_C[3]); r.set(X(cx) + 1, y, STEEL_C[4]); }
    for (let j = 0; j < 30; j++) for (let i = 0; i < 46; i++) { const dx = i - 23; if ((dx * dx) / (23 * 23) + ((j - 2) * (j - 2)) / (30 * 30) > 1) continue; r.set(X(36) + i + Math.floor(j * 0.5), 36 + j, i < 4 ? STEEL_C[1] : i > 40 ? STEEL_C[4] : STEEL_C[3]); }
    glow(r, X(70), 120, 46, c('#ff8a30'), 0.35);
    for (let y = 60; y < BELT_Y - 4; y++) { const x = X(80) - Math.floor((y - 60) * 0.32), w = 2 + Math.floor((y - 60) / 40); for (let i = -w; i <= w; i++) r.set(x + i, y, Math.abs(i) < w ? HOTS[0][0] : HOTS[0][1]); }
    fillRect(r, X(34), BELT_Y - 7, 34, 7, STEEL_C[4]); fillRect(r, X(37), BELT_Y - 5, 28, 3, HOTS[0][1]);   // the mould
    // the belt, from the mould to the pit, on its rollers and legs
    for (let x = X(30); x < X(BELT_END); x++) { r.set(x, BELT_Y, STEEL_C[1]); for (let y = BELT_Y + 1; y < BELT_Y + 6; y++) r.set(x, y, y === BELT_Y + 5 ? STEEL_C[4] : STEEL_C[3]); if (mod(x - X(30), 10) < 6) r.set(x, BELT_Y + 6, STEEL_C[2]); }
    for (let x = 40; x < BELT_END; x += 60) { fillRect(r, X(x), BELT_Y + 7, 4, 178 - BELT_Y - 7, STEEL_C[4]); fillRect(r, X(x), BELT_Y + 7, 1, 178 - BELT_Y - 7, STEEL_C[2]); }
    // the press: two columns and a crown over the belt
    for (const px of [PRESS_X - 22, PRESS_X + 16]) { fillRect(r, X(px), 74, 7, BELT_Y - 74, STEEL_C[3]); fillRect(r, X(px), 74, 2, BELT_Y - 74, STEEL_C[1]); }
    fillRect(r, X(PRESS_X - 26), 66, 52, 14, STEEL_C[3]); fillRect(r, X(PRESS_X - 26), 66, 52, 2, STEEL_C[1]); for (let i = 0; i < 52; i += 8) fillRect(r, X(PRESS_X - 26) + i, 70, 4, 4, c('#e8c020'));
    vert(r, X(PRESS_X), 80, 104, STEEL_C[1]); vert(r, X(PRESS_X) + 1, 80, 104, STEEL_C[3]);   // the ram's piston
    // the welding arms, reaching down to the belt from overhead
    for (const wx of WELD_X) {
      fillRect(r, X(wx) - 6, 40, 12, 10, STEEL_C[4]); for (let s = 0; s < 40; s++) { const x = X(wx) - 4 + Math.round(s * 0.25), y = 50 + s; for (let q = 0; q < 5; q++) r.set(x + q, y, q === 0 ? STEEL_C[1] : STEEL_C[3]); }
      ellipse(r, X(wx) + 6, 90, 4, 4, c('#e8a020')); for (let s = 0; s < 40; s++) { const x = X(wx) + 6 - Math.round(s * 0.15), y = 90 + Math.round(s * 1.1) - 0; if (y < BELT_Y - 12) for (let q = 0; q < 4; q++) r.set(x + q, y, q === 0 ? STEEL_C[1] : STEEL_C[3]); }
    }
    // the pit: black, running on down below the floor, a hazard stripe round its lip and a red lamp
    fillRect(r, X(BELT_END + 2), BELT_Y - 2, 70, H - BELT_Y + 2, c('#020204'));
    for (let x = X(BELT_END); x < X(BELT_END + 74); x++) r.set(x, BELT_Y - 3, mod(x, 8) < 4 ? c('#e8c020') : c('#1e1a14'));
    for (let y = BELT_Y - 3; y < 178; y++) r.set(X(BELT_END + 1), y, mod(y, 8) < 4 ? c('#e8c020') : c('#1e1a14'));
    vert(r, X(BELT_END + 72), 120, BELT_Y - 3, STEEL_C[3]); glow(r, X(BELT_END + 72), 118, 10, c('#ff3a2a'), 0.5); fillRect(r, X(BELT_END + 71), 116, 3, 3, c('#ff3a2a'));
  }
  // the floor in front of the line; the pit's dark carries on down through it
  for (let x = 0; x < W; x++) for (let y = 178; y < H; y++) r.set(x, y, mod(x + mod(ox, 480), 480) >= BELT_END + 2 && mod(x + mod(ox, 480), 480) < BELT_END + 72 ? c('#020204') : As(0.1));
}
const STEEL = {
  id: 'alloy', type: 'Steel',
  // The owner, 6 Nov 2026: "1, 2, 5 and material B" — backdrops 1, 2 and 5 merged into one line, its story
  // in their words above THE LINE; it takes backdrop 5's place.
  pick: { backdrop: 5, material: 'B' },
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
    scrolling('ASSEMBLY LINE', 'The line, built from 1, 2 and 5: the ladle pours, billets cool on the rollers, a press stamps each into a flat cut-out of the player, welding arms raise it into a steel copy, and at the end of the belt the copies topple into a black pit. Scrolls in two layers.', LINE_LOOP,
      { rate: 0.06, period: 480, fixed: (r, ox) => {
        panels(r, ox, { y0: 0, y1: 178, pw: 48, ph: 40, base: As(0.4), light: As(0.54), dark: As(0.26) });
        for (let x = 0; x < W; x++) { if (mod(x + ox, 48) > 6 && mod(x + ox, 48) < 42) for (let y = 8; y < 22; y++) r.set(x, y, y < 10 ? Al(0.9) : mix(Al(0.7), c('#c8d8e0'), 0.3)); r.set(x, 28, Al(0.3)); r.set(x, 29, Al(0.3)); const z = mod(x + ox, 16); r.set(x, 30 + Math.min(z, 16 - z), Al(0.3)); r.set(x, 38, Al(0.3)); }   // high windows and the crane gantry
        for (let x = 0; x < W; x++) for (let y = 120; y < 126; y++) r.set(x, y, mod(x + ox + y, 12) < 6 ? mix(c('#e8c020'), As(0.4), 0.4) : As(0.2));   // a hazard band along the far wall
      } },
      { rate: 0.2, period: 480, fixed: steelLine, parts: [PRESS, LINE] }),
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
