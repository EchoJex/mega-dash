/**
 * BATCH 3'S PICKED WORLD PIECES, IN THE GAME — Rock's and Dark's, with everything they are painted
 * with. design/world-art/batch3.mjs, the review canvas, imports this so the canvas and the game paint
 * from one copy; the owner's words for each pick are there and in design/world-art/README.md.
 *
 * Drawn by Claude at the owner's request, 2026-11-06 to 2026-11-08.
 */
import { BOSSES } from '../../data/bosses.js';
import { material } from './materials.js';
import { grad, fillRect, stars, disc, halo, ridge, beam, drift, tn, mix, c, scrolling, line, vert, mod, seamless } from './paint.js';
import { Raster, hash, noise1, noise2, pick } from '../arena-art/pixels.js';
import { W, H, FLOOR } from './kit.js';

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
// the focus, and make the spikes glisteny violet crystals". So material B is picked and its spikes are
// violet crystals that glisten (SPIKES.crystals in materials.js). Then, the same day: "i like 5b but
// with the arched doorways from a. improve backdrop 5 with 6 new variants inspired by the aesthetics
// found in Waterfall level in Undertale, other than the actual waterfalls as that would be a water
// type feaature". So the doors are material A's stone arches, and the six backdrops are now variants
// of the glowworm grotto: a dark cave lit by living light, each with one more thing that glows. There
// are no waterfalls and no water at all, since water belongs to the Water slice. They take the mood
// (blue dark, glowing plants, a roof that glitters like stars) and copy nothing from that game.

const granite = B('granite');
const R = (k) => tn(granite, k), RS = (k) => tn(granite, k, 'secondary');
const AMETHYST = [c('#2e1458'), c('#6a34b8'), c('#a878f0'), c('#f4ecff')];   // dark, mid, lit, glint
const AMETHYST_FAR = AMETHYST.map((col) => mix(col, R(0.08), 0.5));
const VIOLET_GLOW = c('#8a4ae0');
const NIGHT = [c('#070a1c'), c('#0b1230'), c('#111b42'), c('#1a2856'), c('#26386a')];   // the blue dark of a glowing cave, deepest first
const LUMEN = [c('#1c5e7e'), c('#38b0d8'), c('#90e8ff'), c('#effdff')];   // living light: dim, body, bright, heart
const CYAN_GLOW = c('#2a9ac8');
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
/** Where each glowworm hangs in a layer `period` wide: [world x, y, thread length]. */
const wormSpots = (seed, n, period, y0, dy) => Array.from({ length: n }, (_, i) => [Math.floor(hash(i, 0, seed) * period), y0 + Math.floor(hash(i, 1, seed) * dy), 6 + Math.floor(hash(i, 3, seed) * 24)]);
/** Lights twinkling, each on its own beat of 120 steps: dim, lit, and now and then a flare. `cols` are dim, lit and the flare's arms. */
function glowworms(spots, period, cols, seed = 380, cycle = 120) {   // cycle: steps between one spot's twinkles
  return {
    pieces: () => pics([['d', 1, 1, (p) => p.set(0, 0, cols[0])], ['b', 1, 1, (p) => p.set(0, 0, cols[1])], ['s', 3, 3, (p) => { p.set(1, 0, cols[2]); p.set(0, 1, cols[2]); p.set(1, 1, WHITE); p.set(2, 1, cols[2]); p.set(1, 2, cols[2]); }]]),
    at(ox, t) {
      const out = [];
      spots.forEach(([wx, y], i) => {
        const x = mod(wx - ox, period) - 20;
        if (x < -3 || x > W + 3) return;
        const ph = mod(t + Math.floor(hash(i, 2, seed) * cycle), cycle), k = cycle / 120;
        out.push(ph < 8 * k ? ['s', x - 1, y - 1] : ph < 70 * k ? ['b', x, y] : ['d', x, y]);
      });
      return out;
    },
  };
}
/** The silk thread hanging under each glowworm, every other pixel. */
function threads(r, ox, spots, period, col, a = 150) {
  for (const [wx, y, len] of spots) { const x = mod(wx - ox, period) - 20; if (x < 0 || x >= W) continue; for (let j = 1; j < len; j += 2) r.set(x, y + j, col, a); }
}
/** The grotto's roof: lumpy rock 8 to 26 pixels deep with a lit lip, stalactites hanging from it. */
function ceiling(r, ox, cols, seed, period) {
  for (let x = 0; x < W; x++) { const bottom = 8 + Math.floor(seamless((w) => noise1(w * 0.03, seed), x + ox, period) * 18); for (let y = 0; y < bottom; y++) r.set(x, y, y === bottom - 1 ? cols[1] : cols[0]); }
  dripstones(r, ox, { every: 22, maxLen: 30, cols, seed: seed + 1, period });
}
/** Violet crystals along the floor of a 960 world, one cluster in each slot `every` wide, in its own glow; and the glints that twinkle on them. */
function crystalRow(seed, every, size, y = 182) {
  const off = (k) => 20 + Math.floor(hash(k, 0, seed) * (every - 40));   // where in its slot the cluster stands
  return {
    paint(r, ox) {
      for (let wx = Math.floor(ox / every) * every - every; wx < ox + W + every; wx += every) {
        const k = mod(wx, 960), x = wx - ox + off(k), sz = size + Math.floor(hash(k, 1, seed) * 16);
        glow(r, x, y - 22, 46, VIOLET_GLOW, 0.4);
        cluster(r, x, y, sz, k + seed, AMETHYST);
      }
    },
    glints: glints(seed + 1, (960 / every) * 4, (i) => { const k = (i % (960 / every)) * every; return [k + off(k) + 20 + Math.floor((hash(i, 1, seed) - 0.5) * size * 0.7), y - 12 - Math.floor(hash(i, 2, seed) * size * 0.8)]; }),
  };
}
/** Specks of light rising from the floor and fading. */
const motes = (seed, n, cols) => drift(seed, n, cols, 172, -0.14);

/** Tall grass swaying in a slow wave: a blade every 2 pixels, each one of three pictures (leaning left, upright, leaning right), a few with a glowing seed head. */
function grass(seed, period, base) {
  const HTS = [18, 27, 36], COLS = [NIGHT[2], NIGHT[3], c('#2e5a84')], blades = [];
  for (let wx = 0; wx < period; wx += 2) blades.push([wx + Math.floor(hash(wx, 0, seed) * 3), Math.floor(hash(wx, 1, seed) * 3), hash(wx, 2, seed) > 0.88]);
  const name = (h, pose, head) => `g${h}${pose}${head ? 'h' : ''}`;
  return {
    pieces: () => pics(HTS.flatMap((ht, h) => [0, 1, 2].flatMap((pose) => [false, true].map((head) => [name(h, pose, head), 11, ht + 3, (p) => {
      for (let j = 0; j < ht; j++) {
        const f = j / ht, x = Math.round(5 + (pose - 1) * 4 * f * f), y = ht + 2 - j;
        p.set(x, y, f > 0.7 ? COLS[2] : f > 0.35 ? COLS[1] : COLS[0]);
        if (f < 0.4) p.set(x + 1, y, COLS[0]);   // thicker at the root
      }
      if (head) { const x = 5 + (pose - 1) * 4; p.set(x, 0, LUMEN[2]); p.set(x - 1, 1, LUMEN[1]); p.set(x, 1, LUMEN[3]); p.set(x + 1, 1, LUMEN[1]); p.set(x, 2, LUMEN[1]); }
    }])))),
    at(ox, t) {
      const out = [], ph = (TAU * mod(t, 240)) / 240;
      for (const [wx, h, head] of blades) {
        const x = mod(wx - ox, period) - 20;
        if (x < -11 || x > W) continue;
        const sw = Math.sin(ph - wx * 0.035);
        out.push([name(h, sw < -0.45 ? 0 : sw > 0.45 ? 2 : 1, head), x - 5, base - HTS[h] - 2]);
      }
      return out;
    },
  };
}
/** Where each glowing bell flower stands in a 960 world: [world x, stem height, which way its stem arches (-1 or 1)]. */
const BLOOMS = [];
for (let wx = 0; wx < 960; wx += 13) if (hash(wx, 9, 430) > 0.15) BLOOMS.push([wx + Math.floor(hash(wx, 0, 430) * 6), 10 + Math.floor(hash(wx, 1, 430) * 22), hash(wx, 2, 430) > 0.5 ? 1 : -1]);
/** Where a flower's bell hangs: the top left of its picture, from the stem's foot at x. */
const bellAt = (x, h, lean) => [x + lean * 5 - 3, 184 - h + 2];
/** A flower's stem, rising from the floor and arching over at the top so its bell hangs down. */
function stem(r, x, h, lean, col) {
  for (let j = 0; j < h; j++) { const f = j / h; r.set(x + Math.round(lean * 2 * f * f), 183 - j, col); }
  const tx = x + lean * 2, ty = 184 - h;
  for (const [dx, dy] of [[1, -1], [2, -1], [3, 0], [3, 1]]) r.set(tx + lean * dx, ty + dy, col);
}
/**
 * The flowers' bells: dim, waking, full. They glow as the player comes near (owner, 9 Nov 2026: "have
 * the glowing flowers ebb into glowing based on the players proximity to them"), full within 24 pixels
 * of him, waking within 56; with no player given (a still picture), he is where the canvas stands him.
 */
const BLOOM_CUPS = {
  pieces: () => pics([...[1, 2].map((lv) => [`g${lv}`, 29, 29, (p) => glow(p, 14, 14, 14, CYAN_GLOW, [0, 0.2, 0.45][lv])]), ...[0, 1, 2].map((lv) => [`c${lv}`, 7, 6, (p) => {
    const dim = [NIGHT[4], LUMEN[0], LUMEN[1]][lv], body = [LUMEN[0], LUMEN[1], LUMEN[2]][lv], heart = [LUMEN[1], LUMEN[2], LUMEN[3]][lv];
    ['..ddd..', '.dbbbd.', '.bbhbb.', 'bbhhhbb', 'b.b.b.b', '...h...'].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') p.set(x, y, ch === 'd' ? dim : ch === 'b' ? body : heart); }));
  }])]),
  at(ox, t, px = 64) {
    const out = [];
    for (const [wx, h, lean] of BLOOMS) {
      const x = mod(wx - ox, 960) - 20;
      if (x < -12 || x > W + 6) continue;
      const [bx, by] = bellAt(x, h, lean), d = Math.abs(bx + 3 - px), lv = d < 24 ? 2 : d < 56 ? 1 : 0;
      if (lv) out.push([`g${lv}`, bx + 3 - 14, by + 4 - 14]);   // its light on the meadow, only when it glows
      out.push([`c${lv}`, bx, by]);
    }
    return out;
  },
};
/** A giant mushroom: a pale stem `h` tall from `base`, a domed cap `w` wide in colours C (dark, body, lit, spot), its gills glowing. */
function mushroom(r, x, base, h, w, C, seed) {
  const STEM = [c('#2a3460'), c('#4a5a90'), c('#7a8ac0')], top = base - h, capH = Math.round(w * 0.38);
  glow(r, x, top - 4, Math.round(w * 0.9), C[1], 0.3);
  for (let j = 0; j < h; j++) {
    const cx = x + Math.round(Math.sin((j / h) * 2 + seed) * 2), half = Math.max(2, Math.round(w * 0.07 + (j < 6 ? (6 - j) * 0.5 : 0)));
    for (let i = -half; i <= half; i++) r.set(cx + i, base - j, i < -half / 3 ? STEM[2] : i > half / 3 ? STEM[0] : STEM[1]);
  }
  for (let i = -w / 2 + 2; i < w / 2 - 2; i++) for (let g = 0; g < 3; g++) r.set(Math.round(x + i), top + g, g === 0 ? C[2] : mod(i, 3) === 0 ? C[1] : C[0]);   // the gills, lit from within
  for (let j = 0; j < capH; j++) {
    const half = Math.round((w / 2) * Math.sqrt(1 - (j / capH) ** 2));
    for (let i = -half; i <= half; i++) { const f = (i + half) / Math.max(1, 2 * half); r.set(x + i, top - 1 - j, j === 0 ? C[1] : f < 0.3 && j > capH * 0.3 ? C[2] : f > 0.8 ? C[0] : C[1]); }
  }
  for (let k = 0; k < Math.round(w / 6); k++) {   // its spots
    const a = (hash(k, 0, seed) - 0.5) * 2.6, rr = 0.35 + 0.5 * hash(k, 1, seed), sx = Math.round(x + Math.sin(a) * (w / 2) * rr), sy = Math.round(top - 1 - Math.cos(a) * capH * rr);
    r.set(sx, sy, C[3]); r.set(sx + 1, sy, C[3]); if (hash(k, 2, seed) > 0.5) { r.set(sx, sy - 1, C[3]); r.set(sx + 1, sy - 1, WHITE); }
  }
}
const CAP_CYAN = [c('#1a5a7a'), c('#2e98c0'), c('#7ae0f8'), c('#e8fdff')], CAP_VIOLET = [c('#3a1a6a'), c('#6a34b8'), c('#a878f0'), c('#f4ecff')];
/** Lanterns on the boardwalk's posts, one every 160 pixels of a 960 world: a violet crystal in an iron cage that flickers. */
const LANTERNS = {
  pieces: () => pics([0, 1].map((lit) => [`l${lit}`, 7, 10, (p) => {
    for (let j = 0; j < 10; j++) { p.set(0, j, c('#1a1420')); p.set(6, j, c('#1a1420')); }
    for (let i = 0; i < 7; i++) { p.set(i, 0, c('#2a2030')); p.set(i, 9, c('#2a2030')); }
    for (let j = 2; j < 8; j++) for (let i = 2; i < 5; i++) p.set(i, j, lit ? (i === 2 ? AMETHYST[3] : AMETHYST[2]) : (i === 2 ? AMETHYST[2] : AMETHYST[1]));
    p.set(3, 1, lit ? WHITE : AMETHYST[2]);
  }])),
  at(ox, t) {
    const out = [];
    for (let k = 0; k < 6; k++) {
      const x = mod(k * 160 + 70 - ox, 960) - 20;
      if (x < -8 || x > W) continue;
      out.push([hash(Math.floor(mod(t, 240) / 6), k, 440) > 0.22 ? 'l1' : 'l0', x - 3, 113]);
    }
    return out;
  },
};
/** Mist drifting along under the boardwalk, a pixel a step, its banks every 240 pixels so it comes back exactly. */
const MIST = {
  pieces: () => pics([0, 1].map((v) => [`m${v}`, 64, 12, (p) => {
    for (let j = 0; j < 12; j++) for (let i = 0; i < 64; i++) {
      const d = Math.hypot((i - 32) / 32, (j - 6) / 6);
      if (d < 1 && BAYER4[j % 4][i % 4] < (1 - d) * (v ? 9 : 6)) p.set(i, j, v ? c('#3a4a7c') : c('#2a3866'));
    }
  }])),
  at(ox, t) {
    const out = [];
    for (const [base, y, v] of [[0, 150, 0], [90, 162, 1], [170, 146, 0]]) for (let n = 0; n < 3; n++) out.push([`m${v}`, mod(base + mod(t, 240) - Math.floor(ox), 240) + n * 240 - 64, y]);
    return out;
  },
};

const WORMS = [wormSpots(380, 200, 960, 6, 74), wormSpots(420, 170, 960, 6, 64), wormSpots(430, 170, 960, 6, 64), wormSpots(440, 150, 960, 6, 56), wormSpots(450, 160, 960, 6, 60)];
const ROWS = [crystalRow(403, 160, 30), crystalRow(415, 240, 26), crystalRow(423, 320, 24), crystalRow(433, 480, 22), crystalRow(457, 480, 20)];
const VAULT = Array.from({ length: 420 }, (_, i) => [Math.floor(hash(i, 0, 410) * 960), 2 + Math.floor(hash(i, 1, 410) ** 1.3 * 126)]);
const BLUE = [NIGHT[0], NIGHT[1], NIGHT[2]], ROOF = [NIGHT[1], NIGHT[3], NIGHT[2]], WORM_COLS = [LUMEN[0], LUMEN[2], LUMEN[1]];
const WARM = [R(0.05), R(0.08), R(0.11)].map((col) => mix(col, NIGHT[2], 0.25));
const WOOD = [c('#24180f'), c('#3e2a1a'), c('#5a3e28'), c('#76583a')];
/** The grotto's roof with its glowworms and their threads, in a layer 960 wide. */
const roofLayer = (n, seed, extra = () => {}, cols = ROOF) => ({ rate: 0.15, period: 960, fixed: (r, ox) => { extra(r, ox); ceiling(r, ox, cols, seed, 960); threads(r, ox, WORMS[n], 960, LUMEN[0]); }, parts: [glowworms(WORMS[n], 960, WORM_COLS, seed + 3)] });
/** Rock's three materials, as the canvas offers them: [letter, name, words, the material]. */
export const ROCK_MATERIALS = [
    ['A', 'GRANITE BLOCKS', 'Rough-cut granite blocks under a pale stone lip, stone shards and an arch of fitted stones.',
      material('bricks', { deep: '#1e1814', dark: '#3a302a', base: '#5c5048', alt: '#544840', light: '#786a60', hi: '#c8c0b4', cap0: '#d8d0c4', cap1: '#a8a096', thi: '#e8e4dc', tlight: '#a8a296', tdark: '#5a544c' }, { spikes: 'shards', door: 'arch' })],
    ['B', 'QUARRY STRATA', 'Layered quarry rock in browns and greys, glistening violet crystals for spikes and an iron quarry gate.',
      material('strata', { deep: '#1e1410', dark: '#46342a', base: '#664e40', mid: '#705848', light: '#7c6252', hi: '#e0c8b0', cap0: '#d8c0a8', cap1: '#b09480', void: '#100a08', thi: '#f0e0d0', tlight: '#a08070', tdark: '#5a4030', cry0: '#2e1458', cry1: '#6a34b8', cry2: '#a878f0', cry3: '#f4ecff' }, { spikes: 'crystals', door: 'gate' })],
    ['C', 'CUT SLABS', 'Smooth quarry slabs with saw-cut joints and a band of drill holes, iron rods and a steel hatch.',
      material('concrete', { deep: '#24201c', dark: '#423a34', base: '#605850', light: '#7c7268', hi: '#b8aea2', cap0: '#d8d0c4', cap1: '#aaa094', tape: '#3a342e', rust: '#6a4a2a', thi: '#e0d8cc', tlight: '#a89e92', tdark: '#5e554c' }, { tape: true, joint: 40, spikes: 'spears', door: 'hatch' })],
];
// The owner, 8 Nov 2026, on "2 and 4": "A", one backdrop joining them: the blooms under the star vault.
export const STAR_MEADOW = scrolling('STAR MEADOW', 'Backdrops 2 and 4 joined: the star vault\'s glittering roof, its band of crystal light and hanging crystals over far spires, and the meadow of glowing bell flowers in front, their light rippling across them, pollen drifting up. Scrolls in three layers.', 240,
  { rate: 0.03, period: 960, fixed: (r, ox) => {
    grad(r, 0, H, [[0, NIGHT[0]], [0.42, NIGHT[1]], [0.66, NIGHT[3]], [0.78, NIGHT[2]], [1, NIGHT[1]]]);
    for (let y = 0; y < 140; y++) for (let x = 0; x < W; x++) {   // a band of faint crystal light across the vault, like a galaxy
      const wx = mod(x + ox, 960), d = Math.abs(y - (30 + 60 * Math.sin((TAU * wx) / 960))) / 26;
      if (d < 1 && BAYER4[mod(y, 4)][mod(wx, 4)] < (1 - d) ** 2 * 7 * (0.6 + 0.4 * seamless((w) => noise1(w * 0.04, 416), wx, 960))) r.set(x, y, d < 0.35 ? LUMEN[0] : NIGHT[3]);
    }
    for (const [wx, sz, sd] of [[60, 34, 1], [300, 44, 2], [540, 30, 3], [770, 40, 4]]) { const x = mod(wx - ox, 960) - 20; if (x < -60 || x > W + 60) continue; glow(r, x, 14, 50, VIOLET_GLOW, 0.3); cluster(r, x, -2, sz, sd, AMETHYST, Math.PI); }
  }, parts: [glowworms(VAULT.filter((_, i) => hash(i, 2, 410) > 0.25), 960, [NIGHT[4], LUMEN[2], LUMEN[1]], 411, 240), glowworms(VAULT.filter((_, i) => hash(i, 2, 410) <= 0.25), 960, [AMETHYST[0], AMETHYST[2], AMETHYST[1]], 412, 240)] },
  { rate: 0.12, period: 960, fixed: (r, ox) => {
    ridge(r, ox, { y: 146, amp: 30, f: 0.02, seed: 413, col: NIGHT[1], top: LUMEN[0], period: 960, sharp: 0.7 });
    ridge(r, ox, { y: 164, amp: 14, f: 0.035, seed: 414, col: NIGHT[0], top: NIGHT[3], period: 960, sharp: 0.4 });
  } },
  { rate: 0.35, period: 960, fixed: (r, ox) => {
    ROWS[3].paint(r, ox);
    for (const [wx, h, lean] of BLOOMS) {   // each flower's glow and its stem; the bell is a moving part
      const x = mod(wx - ox, 960) - 20;
      if (x < -30 || x > W + 30) continue;
      const [bx, by] = bellAt(x, h, lean);
      stem(r, x, h, lean, NIGHT[4]);
    }
    dark(r, 178, NIGHT[0]);
  }, parts: [ROWS[3].glints, BLOOM_CUPS, motes(437, 30, [LUMEN[2], LUMEN[3]])] });
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
/** Dark's three materials, as the canvas offers them. */
export const DARK_MATERIALS = [
    ['A', 'OBSIDIAN TILES', 'Dark violet glass tiles, red-glinting black glass shards and energy doors: cyan light for a boss, gold for the way out.',
      material('tiles', { deep: '#141020', dark: '#2a2440', base: '#4a4466', light: '#625c84', hi: '#e8e0ff', cap0: '#d8d0f0', cap1: '#9a90c0', void: '#08060e', thi: '#ffffff', tlight: '#ff6a6a', tdark: '#8a1a1a', obs0: '#0a0810', obs1: '#2a1a2a', obs2: '#dc2626', obs3: '#ffd0d0' }, { size: 10, spikes: 'glass', door: 'energy' })],
    ['B', 'SHADOW BRICK', 'Dark indigo bricks under a pale lip, blood-red crystal shards and an iron gate.',
      material('bricks', { deep: '#100e18', dark: '#28243a', base: '#48425e', alt: '#403a56', light: '#605a7a', hi: '#a8a0c8', cap0: '#c0b8e0', cap1: '#8a82ac', void: '#08060e', thi: '#ffd0d0', tlight: '#dc2626', tdark: '#6a1010' }, { spikes: 'shards', door: 'gate' })],
    ['C', 'CRACKED STONE', 'Dark stone with red light glowing in its cracks, iron spears and a stone arch.',
      material('strata', { deep: '#120e18', dark: '#2e2840', base: '#4c4664', mid: '#56506e', light: '#625c7a', hi: '#ffd0d0', cap0: '#c8c0e0', cap1: '#9890b8', glow: '#dc2626', glow2: '#ff8a6a', void: '#08060e', thi: '#ffffff', tlight: '#b0a8c8', tdark: '#4c4664' }, { cracks: true, spikes: 'spears', door: 'arch' })],
];
/** Dark's backdrop 1, picked: the total eclipse. */
export const TOTAL_ECLIPSE = scrolling('TOTAL ECLIPSE', 'A black sun ringed by a burning red corona over a dark plain, red motes drifting up. Scrolls in three layers.', 240,
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
  }, parts: [drift(608, 40, [BLOOD, c('#ff8a6a')], 176, -0.12)] });
function bareTree(r, x, base, h, col, seed) {
  for (let j = 0; j < h; j++) { const w = j < h * 0.3 ? 3 : 2; for (let i = 0; i < w; i++) r.set(x + i, base - j, col); }
  for (let k = 0; k < 5; k++) {
    const y0 = base - Math.floor(h * (0.4 + k * 0.12)), dir = k % 2 ? 1 : -1, len = 8 + Math.floor(hash(k, x, seed) * 12);
    for (let i = 0; i < len; i++) r.set(x + 1 + dir * i, y0 - Math.floor(i * 0.6), col);
  }
}

export { AMETHYST, AMETHYST_FAR, B, BAYER4, BLACK, BLOOD, BLOOMS, BLOOM_CUPS, BLUE, CAP_CYAN, CAP_VIOLET, CYAN_GLOW, DEBRIS, K, KR, LANTERNS, LUMEN, MIST, NIGHT, R, ROOF, ROWS, RS, TAU, VAULT, VIOLET_GLOW, WARM, WHITE, WOOD, WORMS, WORM_COLS, bareTree, bellAt, caveWall, ceiling, cluster, crystal, crystalRow, dark, dripstones, eclipse, ellipse, flame, glints, glow, glowworms, granite, grass, lit, motes, mushroom, oneEye, pale, pics, roofLayer, shade, stem, threads, wormSpots };

// ── DRAGON: Drake Man's castle, the great hall (picked 9 Nov 2026) ──────────
// The owner's words for each step are in design/world-art/batch3.mjs, beside the halls not picked.

export const drake = B('drake');
export const Dr = (k) => tn(drake, k), Dd = (k) => tn(drake, k, 'secondary'), INDIGO = c('#3a2a6a'), VIOLET = c('#6a3a9a'), TEAL = c('#2a8a8a');
export const GILT = [c('#8a6d10'), c('#c9a21e'), c('#f5d328')];
export const GLASS = {   // the colours of each window's panes
  ember: [c('#c3225d'), c('#e8503a'), c('#f5b030'), c('#7a1a3a'), c('#ff8a60')],
  dusk: [c('#6a3a9a'), c('#c3225d'), c('#2a8a8a'), c('#3a2a6a'), c('#e8a020')],
  sea: [c('#2a8a8a'), c('#3a6ab0'), c('#6a3a9a'), c('#1a4a6a'), c('#8ad0c8')],
  moon: [c('#3a4aa0'), c('#6a7ad0'), c('#2a2a6a'), c('#9a8ae0'), c('#c8d0f0')],
};
// THE GREAT HALL'S FIVE WINDOWS. The owner, 9 Nov 2026, after trying their six colour sets, went back
// to the first five-window hall with nothing in the middle and asked for: "use the yellow one for
// reference and color swap light yellow for light red, and yellow for red, then generate a Green one
// and blue one (avoid colors associated with the draco-blaster weapon). in total one Red, one Blue,
// one Green, One Yellow, and one 'dragon' (which currently uses colors from draco-blaster)".
// Each list is [the second glass, the main glass, the third glass, the darkest, the lightest].
export const HALL_WINDOWS = [
  { name: 'yellow', cols: [c('#6a3a9a'), c('#e8b030'), c('#2a8a8a'), c('#3a2a6a'), c('#f5d878')] },   // the reference
  { name: 'red', cols: [c('#6a3a9a'), c('#d0383a'), c('#2a8a8a'), c('#3a2a6a'), c('#f08a8a')] },   // the yellow one, yellows swapped for reds
  { name: 'green', cols: [c('#2e6a3a'), c('#4ab84a'), c('#c8b060'), c('#1a3a22'), c('#a8e890')] },   // no teal, violet or indigo
  { name: 'blue', cols: [c('#2a4a8a'), c('#3a7ae0'), c('#d0d8e8'), c('#1a2a50'), c('#9ac0f8')] },   // no teal, violet or indigo
  { name: 'dragon', cols: GLASS.sea },   // the Draco-Blaster's teal, blue and violet
];
// The order down the hall: shuffled once, never the same window twice in a row, first and last
// differing too so the strip repeats without a seam. 24 windows before it comes round again.
export const HALL_ORDER = (() => {
  for (let seed = 0; ; seed++) {
    const o = [];
    for (let n = 0; n < 24; n++) o.push(n ? (o[n - 1] + 1 + Math.floor(hash(n, seed, 590) * (HALL_WINDOWS.length - 1))) % HALL_WINDOWS.length : Math.floor(hash(0, seed, 590) * HALL_WINDOWS.length));
    if (o[23] !== o[0] && new Set(o).size === HALL_WINDOWS.length) return o;
  }
})();
export const STONE = [c('#2e2a36'), c('#3e3a48'), c('#4e4a58'), c('#6e6a76')];   // the castle bricks' stone, indoors
/** The castle's inside wall: stone blocks, lit a little where `lit` says. */
export function stoneWall(r, ox, y0, y1, light = 0) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const wx = x + ox, row = Math.floor(y / 10), bx = mod(wx + (row % 2) * 12, 24);
    r.set(x, y, y % 10 === 0 || bx === 0 ? STONE[0] : hash(Math.floor((wx + (row % 2) * 12) / 24), row, 520) > 0.8 - light * 0.2 ? STONE[2] : STONE[1]);
  }
}
/** The dragon rampant, for the windows: a pixel mask, # filled. */
export const DRAGON_MASK = ['......##........', '.....####.......', '....##.###......', '....#...###.....', '........####....', '.##....######...', '####..#######...', '#####.########..', '.#############..', '..####.#######..', '...##..##..###..', '......##....##..', '.....##......#..', '....##..........', '...##...........', '..#.............'];
/**
 * The ways a window's panes can be leaded: each says, for a pixel, whether it is lead and which pane it
 * belongs to. 0 is the first round's diamonds, which every great hall window uses (owner, 9 Nov 2026).
 */
export const PANES = [
  (i, j) => [mod(i + j, 7) === 0 || mod(i - j, 7) === 0, Math.floor((i + j) / 7) * 31 + Math.floor((i - j + 99) / 7)],   // diamonds
  (i, j) => [mod(i + j, 5) === 0 || mod(i - j, 5) === 0, Math.floor((i + j) / 5) * 31 + Math.floor((i - j + 99) / 5)],   // small diamonds
  (i, j) => [i % 6 === 0 || j % 6 === 0, Math.floor(i / 6) * 31 + Math.floor(j / 6)],   // squares
  (i, j) => { const row = Math.floor(j / 6), k = i + (row % 2) * 4; return [j % 6 === 0 || mod(k, 8) === 0, Math.floor(k / 8) * 31 + row]; },   // staggered oblongs, like bricks
];
/**
 * A stained-glass window `w` wide and `h` tall: a pointed or a round top, diamond panes of `cols`
 * brighter towards the middle, leaded in black, in a stone surround; with `motif`, a red dragon or a
 * rose of panes at its heart.
 */
export function stainedGlass(r, x0, y0, w, h, { cols, pointed = true, motif = null, seed = 1, pattern = 0 }) {
  const ys = y0 + (pointed ? Math.round(w * 0.86) : Math.round(w / 2));
  const inside = (px, py) => {
    if (py >= ys) return px >= x0 && px < x0 + w && py < y0 + h;
    if (pointed) return Math.hypot(px + 0.5 - x0, py + 0.5 - ys) < w && Math.hypot(px + 0.5 - x0 - w, py + 0.5 - ys) < w && px >= x0 && px < x0 + w && py >= y0;
    return Math.hypot(px + 0.5 - x0 - w / 2, py + 0.5 - ys) < w / 2;
  };
  for (let py = y0 - 3; py < y0 + h + 3; py++) for (let px = x0 - 3; px < x0 + w + 3; px++) {
    if (inside(px, py)) {
      const i = px - x0, j = py - y0, [lead0, cell] = PANES[pattern](i, j), lead = lead0 || i === Math.floor(w / 2) && j > w;
      const mid = 1 - Math.abs(i - w / 2) / (w / 2);
      const col = cols[Math.floor(hash(cell, 0, seed) * cols.length)];
      r.set(px, py, lead ? c('#120a12') : mix(col, WHITE, 0.08 + 0.22 * mid * (1 - j / h)));
    } else if (inside(px - 2, py) || inside(px + 2, py) || inside(px, py - 2) || inside(px, py + 2)) r.set(px, py, STONE[3]);   // the stone surround
  }
  if (motif === 'dragon') {
    const s = Math.max(1, Math.floor(w / 20)), mx = x0 + Math.floor((w - 16 * s) / 2), my = y0 + Math.floor(h * 0.3);
    DRAGON_MASK.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') fillRect(r, mx + i * s, my + j * s, s, s, (i + j) % 5 === 0 ? c('#ff8a60') : c('#c3225d')); }));
  } else if (motif === 'eye') {
    const cx = x0 + Math.floor(w / 2), cy = y0 + Math.floor(h * 0.45);
    for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) if (Math.abs(i) + Math.abs(j) <= 9) r.set(cx + i, cy + j, Math.abs(i) + Math.abs(j) >= 8 ? c('#120a12') : Math.abs(i) <= 1 && Math.abs(j) <= 5 ? c('#120a12') : cols[1]);
  } else if (motif === 'star') {
    const cx = x0 + w / 2, cy = y0 + h * 0.42;
    for (let a = 0; a < TAU; a += 0.005) { const rr = (w * 0.3) * (0.45 + 0.55 * Math.abs(Math.cos(a * 4))); for (let d = 0; d < rr; d += 0.5) r.set(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), d > rr - 1 ? c('#120a12') : d < rr * 0.35 ? cols[4] : cols[1]); }
  } else if (motif === 'rose') {
    const cx = x0 + w / 2, cy = y0 + w * 0.55, rr = w * 0.3;
    for (let a = 0; a < TAU; a += 0.01) for (let d = 0; d < rr; d += 0.5) { const petal = Math.floor((a / TAU) * 8); r.set(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), Math.abs(((a / TAU) * 8) % 1 - 0.5) > 0.44 || Math.abs(d - rr * 0.5) < 0.6 ? c('#120a12') : [cols[0], cols[2], cols[4] || WHITE][petal % 3]); }
  }
}
/** Coloured light falling from a window to the floor, dithered so it stays pixel-crisp. */
export function lightShaft(r, x0, x1, y0, y1, drift, col, a) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0), l = Math.round(x0 + drift * t), rr = Math.round(x1 + drift * t + t * 10);
    for (let x = l; x < rr; x++) if (BAYER4[mod(y, 4)][mod(x, 4)] / 16 < 0.6) r.set(x, y, col, Math.round(a * (1 - t * 0.5)));
  }
}
/** A stone pillar from the top of the hall to its floor, lit down the left, with a capital and a base. */
export function pillar(r, x, w, top = 0, base = 178) {
  for (let y = top; y < base; y++) for (let i = 0; i < w; i++) r.set(x + i, y, i < 2 ? STONE[3] : i > w - 3 ? STONE[0] : (i % 5 === 2 ? STONE[1] : STONE[2]));
  for (const y of [top + 18, base - 10]) fillRect(r, x - 3, y, w + 6, 5, STONE[2]), fillRect(r, x - 3, y, w + 6, 1, STONE[3]);
}
/** The dragon's crest: a gold lozenge round one slit eye, the way his banners and shields carry it. */
export function dragonEye(r, cx, cy, s) {
  for (let j = -s; j <= s; j++) for (let i = -s; i <= s; i++) {
    const d = Math.abs(i) + Math.abs(j);
    if (d > s) continue;
    r.set(cx + i, cy + j, d >= s - 1 ? GILT[1] : Math.abs(i) <= Math.max(0, Math.floor((s - Math.abs(j)) / 3)) ? c('#120a12') : d < s / 2 ? c('#f5b030') : GILT[2]);
  }
  r.set(cx - 1, cy - Math.floor(s / 3), WHITE);
}
/** A long crimson banner with the gold dragon's crest on it, hanging from a rod. */
export function banner(r, x, y, w, h) {
  fillRect(r, x - 2, y, w + 4, 2, GILT[1]);
  for (let j = 2; j < h; j++) for (let i = 0; i < w; i++) { const notch = j > h - w / 2 && Math.abs(i - w / 2 + 0.5) < j - (h - w / 2); if (!notch) r.set(x + i, y + j, i === 0 ? Dr(0.95) : i === w - 1 ? Dr(0.45) : Dr(0.7)); }
  dragonEye(r, x + Math.floor(w / 2), y + 24, Math.max(4, Math.floor(w / 2) - 2));
}
/** Torches flickering in their sconces: the flame swaps between three shapes, never in step. */
export const torches = (spots, period) => ({
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
export const CHANDELIERS = {
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
export const GREAT_HALL = scrolling('GREAT HALL', 'A long great hall: tall stained-glass windows down the far wall throwing coloured light across it, pillars and dragon banners close by, torches flickering. Scrolls in two layers.', 240,
      { rate: 0.1, period: 120 * HALL_ORDER.length, fixed: (r, ox) => {
        stoneWall(r, ox, 0, 178);
        for (let wx = Math.floor(ox / 120) * 120; wx < ox + W + 120; wx += 120) {
          const n = mod(wx, 120 * HALL_ORDER.length) / 120, win = HALL_WINDOWS[HALL_ORDER[n]], x = wx - ox + 38;
          stainedGlass(r, x, 22, 44, 96, { cols: win.cols, seed: 500 + n });   // one grid for every window: the first round's diamonds
          lightShaft(r, x + 6, x + 38, 118, 178, 18, win.cols[0], 70);
        }
        for (let x = 0; x < W; x++) { r.set(x, 132, STONE[3]); r.set(x, 133, STONE[0]); }   // the gallery ledge
      } },
      { rate: 0.3, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 160) * 160; wx < ox + W + 160; wx += 160) { const x = wx - ox; pillar(r, x, 22); banner(r, x + 50, 30, 16, 70); vert(r, x + 30, 92, 104, c('#3a2a1a')); glow(r, x + 30, 88, 14, c('#ffa040'), 0.4); }
        dark(r, 178, Dd(0.08));
      }, parts: [torches([[30, 92]], 160)] });
