/**
 * THE PICKED WORLD PIECES — what the game draws each slice's area with, one copy shared with the
 * review canvas (design/world-art/batch1.mjs shows these beside the variants that were not picked).
 *
 * Drawn by Claude at the owner's request, 2026-11-05, and picked by the owner on the review canvas
 * the same day, slice by slice, in the words kept beside each pick below. A pick names a backdrop
 * (1 to 6) and a material (A, B or C: a floor, platform, spikes, boss door and exit door), and may
 * take its ground from a second material (`ground`).
 */
import { BOSSES } from '../../data/bosses.js';
import { material } from './materials.js';
import { grad, fillRect, halo, ridge, beam, panels, tn, mix, c, scrolling, drift, seamless, vert, pylon, wire, mod } from './paint.js';
import { Raster, hash, noise1, noise2, pick } from '../arena-art/pixels.js';
import { W, H, FLOOR } from './kit.js';

const B = (id) => BOSSES.find((b) => b.id === id);

// ── TYPELESS: Proto Mk0's proving ground ─────────────────────────────

const proto = B('proto');
const PROTO_A = ['A', 'BUNKER CONCRETE', 'Poured slabs with expansion joints, a yellow-and-black hazard band under the lip, rusty rebar spikes and a blast hatch for a door.',
      material('concrete', { deep: '#2a2e33', dark: '#4a5058', base: '#5e656e', light: '#7a828c', hi: '#b8c0c8', cap0: '#d4dadf', cap1: '#a9b1b9', stripeA: '#e8c020', stripeB: '#2a2a2a', rust: '#8a4a2a', thi: '#e0d0c0', tlight: '#b07850', tdark: '#6a4028' }, { hazard: true, door: 'hatch', spikes: 'spears' })];
const HANGAR = scrolling('HANGAR', 'Inside a test hangar: wall panels far off, girders nearer, lamps hanging closest. Scrolls in three layers.', 240,
  { rate: 0.12, period: 480, fixed: (r, ox) => { panels(r, ox, { pw: 40, ph: 60, base: tn(proto, 0.16), light: tn(proto, 0.23), dark: tn(proto, 0.09) }); fillRect(r, 0, 172, W, 52, tn(proto, 0.06)); } },
  { rate: 0.35, period: 480, fixed: (r, ox) => {
    for (let x = 0; x < W; x++) { const wx = x + ox; r.set(x, 22, tn(proto, 0.05)); r.set(x, 23, tn(proto, 0.05)); r.set(x, 52, tn(proto, 0.05)); r.set(x, 53, tn(proto, 0.05));
      const k = ((wx % 30) + 30) % 30; r.set(x, 24 + k, tn(proto, 0.05)); r.set(x, 52 - k, tn(proto, 0.05)); }
  } },
  { rate: 0.6, period: 480, fixed: (r, ox) => {
    for (let lx = Math.floor(ox / 160) * 160; lx < ox + W + 160; lx += 160) {
      const x = lx - ox + 60;
      vert(r, x, 0, 70, tn(proto, 0.04)); fillRect(r, x - 5, 70, 11, 4, tn(proto, 0.04)); fillRect(r, x - 3, 74, 7, 1, c('#f0e0a0'));
      beam(r, x, 75, Math.PI / 2, 0.3, 70, c('#6a6450'), 0.2);
    }
  } });

// ── FIRE: Blaze Man's volcanic approach ──────────────────────────────

const blaze = B('blaze');
export const LAVA = [c('#801808'), c('#e85a1a'), c('#ffb030'), c('#ffe080')];
const FIRE_C = ['C', 'GRATE OVER COALS', 'An iron grate with coals glowing underneath, shiny jet-black obsidian glass for spikes, and an arch of obsidian glass blocks with terracotta mortar.',
      material('grating', { deep: '#1a1414', dark: '#33292a', base: '#57494a', light: '#786566', hi: '#b09090', cap0: '#d8c0b8', cap1: '#a89088', void: '#120808', glow: '#e85a1a', glow2: '#ffb030',
        obs0: '#0b0a10', obs1: '#2c2a3a', obs2: '#8a8ca8', obs3: '#f4f6ff', mortar: '#cc6a44' }, { under: 'coals', spikes: 'glass', door: 'arch' })];
const EMBER_STORM = scrolling('EMBER STORM', 'A dark sky with embers drifting slowly down and going out, smaller and slower far off. Scrolls in three layers.', 240,
  { rate: 0.08, period: 960, fixed: (r, ox) => {
    grad(r, 0, H, [[0, tn(blaze, 0.04)], [0.8, tn(blaze, 0.15)], [1, tn(blaze, 0.07)]]);
    for (let y = 30; y < 170; y += 9) for (let x = 0; x < W; x++) if (seamless((w) => noise1(w * 0.05 + y, 61), x + ox, 960) > 0.62) r.set(x, y, tn(blaze, 0.19));
  }, parts: [drift(62, 140, [c('#6a1808'), c('#8a2a10')], 176, 0.1)] },
  { rate: 0.3, parts: [drift(63, 90, [LAVA[1], LAVA[2]], 176, 0.2)] },
  { rate: 0.6, period: 960, fixed: (r, ox) => ridge(r, ox, { y: 184, amp: 10, f: 0.05, seed: 65, col: c('#120606'), period: 960 }) });

// ── WATER: Tempest Man's stormy coast ────────────────────────────────

const tempest = B('tempest');
export const GOLDL = c('#f5c518');

// The subsea lab (the owner, 5 Nov 2026): "2a but to prevent the player from thinking the physics for
// the level are different than normal, make the underwater appear to be behind algae covered, lightly
// cracked thick underwater habitat glass, like a subsea laboratory. kelp and the silhouette of deep sea
// creatures should be animated in". Everything that moves by itself comes back to where it started
// every LAB_LOOP steps, so the picture loops without a jump.
const LAB_LOOP = 480, TAU = Math.PI * 2;
/** A pixel at `a` of full strength, faded by ordered dither the way an SNES game faded a sprite. */
const put = (r, x, y, col, a) => r.set(x, y, pick([null, col], a, x, y));
function ell(r, cx, cy, rx, ry, col, a) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) put(r, x, y, col, a);
  }
}
function tri(r, p, q, s, col, a) {
  const [x0, x1] = [Math.min(p[0], q[0], s[0]), Math.max(p[0], q[0], s[0])], [y0, y1] = [Math.min(p[1], q[1], s[1]), Math.max(p[1], q[1], s[1])];
  const side = (a1, b1, x, y) => (b1[0] - a1[0]) * (y - a1[1]) - (b1[1] - a1[1]) * (x - a1[0]);
  for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) {
    const d1 = side(p, q, x + 0.5, y + 0.5), d2 = side(q, s, x + 0.5, y + 0.5), d3 = side(s, p, x + 0.5, y + 0.5);
    if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) put(r, x, y, col, a);
  }
}
// The deep-sea creatures, as silhouettes: (r, x, y, dir, t, col, a), dir 1 facing right.
const CREATURES = {
  shark(r, x, y, d, t, col, a) {
    const beat = Math.round(Math.sin((TAU * t) / 48) * 2);
    ell(r, x, y, 17, 5, col, a); ell(r, x + d * 13, y + 1, 7, 3.5, col, a);
    tri(r, [x - d * 13, y - 3], [x - d * 13, y + 3], [x - d * 24, y + beat], col, a);
    tri(r, [x - d * 21, y + beat], [x - d * 28, y - 8 + beat], [x - d * 25, y + beat], col, a);
    tri(r, [x - d * 21, y + beat], [x - d * 27, y + 5 + beat], [x - d * 25, y + beat], col, a);
    tri(r, [x, y - 4], [x - d * 8, y - 4], [x - d * 6, y - 12], col, a);
    tri(r, [x + d * 5, y + 3], [x - d * 2, y + 3], [x - d * 4, y + 10], col, a);
  },
  angler(r, x, y, d, t, col, a, glow) {
    ell(r, x, y, 7, 6, col, a); ell(r, x + d * 4, y + 3, 5, 3, col, a);
    const flick = Math.round(Math.sin((TAU * t) / 60) * 2);
    tri(r, [x - d * 6, y], [x - d * 13, y - 5 + flick], [x - d * 13, y + 5 + flick], col, a);
    for (const [i, j] of [[1, -6], [2, -7], [3, -8], [4, -9], [5, -10], [6, -10], [7, -10], [8, -9], [9, -8]]) put(r, x + d * i, y + j, col, a);
    const pulse = 0.5 + 0.5 * Math.sin((TAU * t) / 120);
    halo(r, x + d * 9, y - 7, 5, glow, 0.25 * pulse * a);
    put(r, x + d * 9, y - 7, glow, a);
  },
  squid(r, x, y, d, t, col, a) {
    tri(r, [x + d * 18, y], [x, y - 4], [x, y + 4], col, a);
    tri(r, [x + d * 13, y], [x + d * 19, y - 4], [x + d * 19, y + 4], col, a);
    ell(r, x - d * 1, y, 4, 4, col, a);
    for (let k = 0; k < 6; k++) {
      const len = 14 + (k % 3) * 4, j0 = -2.5 + k;
      for (let i = 0; i < len; i++) {
        const s = i / len, wave = Math.sin((TAU * t) / 60 + k * 0.9 + i * 0.45) * 2.2 * s;
        put(r, x - d * (4 + i), Math.round(y + j0 * (1 + s * 0.8) + wave), col, a);
      }
    }
  },
  jelly(r, x, y, d, t, col, a, glow) {
    const p = Math.sin((TAU * t) / 80), rx = 6 + p, ry = 4 - p * 0.6;
    for (let yy = Math.floor(y - ry); yy <= y; yy++) for (let xx = Math.floor(x - rx); xx <= x + rx; xx++) {
      if (((xx + 0.5 - x) / rx) ** 2 + ((yy + 0.5 - y) / ry) ** 2 <= 1) put(r, xx, yy, col, a);
    }
    for (let k = -2; k <= 2; k++) for (let i = 1; i < 12 + (k & 1) * 4; i++) {
      put(r, Math.round(x + k * 2 + Math.sin((TAU * t) / 80 + k + i * 0.35) * (i / 8)), y + i, col, a);
    }
    for (const k of [-4, 0, 4]) put(r, Math.round(x + k * (rx / 6)), y, glow, a);   // glowing dots along the rim
  },
};
const SWIMMERS = [   // kind, x, y, dir, speed (pixels a step), when in the loop it appears
  ['shark', 60, 50, 1, 0.12, 0], ['angler', 330, 100, -1, 0.06, 0.35], ['squid', 420, 34, -1, 0.14, 0.6],
  ['jelly', 200, 124, 0, 0, 0.15], ['shark', 520, 82, -1, 0.09, 0.78],
];
const GLOW = { angler: c('#e0ff8a'), jelly: c('#8af0ff') };
/** Each kind's motion repeats every [steps], and is drawn as that many pictures. */
const SWIM_FRAMES = { shark: [48, 8], angler: [120, 12], squid: [60, 12], jelly: [80, 16] };
/** The creatures: each kind drawn ahead of time at every point of its motion and four strengths of fade. */
const SWIM = {
  pieces() {
    const col = tn(tempest, 0.045), out = new Map();
    for (const [kind, , , d] of SWIMMERS) {
      const [period, n] = SWIM_FRAMES[kind];
      for (let f = 0; f < n; f++) for (let q = 1; q <= 4; q++) {
        const name = `${kind}${d}:${f}:${q}`;
        if (out.has(name)) continue;
        const r = new Raster(64, 32);
        CREATURES[kind](r, 32, 16, d || 1, (f * period) / n, col, q / 4, GLOW[kind]);
        out.set(name, r);
      }
    }
    return [...out];
  },
  at(ox, t) {
    const out = [];
    for (const [kind, x0, y0, d, v, ph] of SWIMMERS) {
      const u = (ph + t / LAB_LOOP) % 1, q = Math.round(Math.min(1, Math.min(u, 1 - u) / 0.2) * 4);   // fades in from the dark and back out
      if (!q) continue;
      const [period, n] = SWIM_FRAMES[kind], f = Math.floor((mod(t, period) / period) * n);
      const x = mod(x0 + d * v * u * LAB_LOOP - ox, 600) - 60, y = kind === 'jelly' ? y0 - Math.round(u * 24) : y0;
      out.push([`${kind}${d}:${f}:${q}`, Math.round(x) - 32, y - 16]);
    }
    return out;
  },
};
/** Kelp swaying from the seabed: a stalk two pixels wide, a leaf every six rows, placed fresh every step. */
const KELP_C = [c('#1a3022'), c('#28482e'), c('#3c6838')];
const KELP = {
  pieces() {
    const [K0, K1, K2] = KELP_C, k = new Raster(2, 1), lr = new Raster(3, 2), ll = new Raster(3, 2);
    k.set(0, 0, K0); k.set(1, 0, K1);
    lr.set(0, 1, K1); lr.set(1, 0, K1); lr.set(2, 0, K2);
    ll.set(2, 1, K1); ll.set(1, 0, K1); ll.set(0, 0, K2);
    return [['k', k], ['lr', lr], ['ll', ll]];
  },
  at(ox, t) {
    const out = [];
    for (let k = 0; k < 12; k++) {
      const sx = mod(k * 52 + Math.floor(hash(k, 0, 88) * 30) - ox, 624) - 60, base = 168, h = 60 + Math.floor(hash(k, 1, 88) * 64);
      if (sx < -24 || sx > W + 24) continue;
      for (let y = base; y > base - h; y--) {
        const f = (base - y) / h, x = sx + Math.round(Math.sin((TAU * 2 * t) / LAB_LOOP + k * 1.7 + y * 0.05) * 5 * f + Math.sin(y * 0.15 + k) * 1.2);
        out.push(['k', x, y]);
        if ((base - y) % 6 === 3) out.push(((base - y) / 6) & 1 ? ['lr', x + 2, y - 1] : ['ll', x - 3, y - 1]);
      }
    }
    return out;
  },
};
/** The lab's wall: thick glass panes in a riveted frame, algae on the glass and a few light cracks. */
function habitat(r, ox) {
  const P = 168, SW = 16, TOP = 12, SILL = 168, R = 7, pw = P - SW, ph = SILL - TOP;
  const M = { deep: c('#0e141c'), dark: c('#18212c'), base: c('#26323f'), light: c('#3c4c5e'), hi: c('#6a809a'), rivet: c('#8ea4b8') };
  const AL = [c('#1c2a16'), c('#2c4220'), c('#44602c')], GL = c('#bfe6ff');
  const corner = (px, py) => {
    const cx = px < R ? R : px >= pw - R ? pw - 1 - R : null, cy = py < R ? R : py >= ph - R ? ph - 1 - R : null;
    return cx === null || cy === null || (px - cx) ** 2 + (py - cy) ** 2 <= R * R;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x + ox, pos = mod(wx, P), px = pos - SW, py = y - TOP;
    if (px >= 0 && py >= 0 && py < ph && corner(px, py)) {
      // The glass: its thick edge, two streaks of reflection, then algae growing in from the frame.
      if (px === 0 || py === 0 || !corner(px - 1, py) || !corner(px, py - 1)) r.set(x, y, GL, 90);
      else if (px === pw - 1 || py === ph - 1 || !corner(px + 1, py) || !corner(px, py + 1)) r.set(x, y, M.deep, 150);
      const dg = px + Math.floor(py * 0.7);
      if (py < ph * 0.75 && (mod(dg - 22, P) < 5 || mod(dg - 34, P) < 2)) r.set(x, y, GL, 34);
      const edge = Math.min(px, pw - 1 - px, py, (ph - 1 - py) * 0.45), grow = noise2(wx * 0.11, y * 0.11, 89) * 0.7 + noise2(wx * 0.37, y * 0.37, 90) * 0.3;
      if (grow + Math.max(0, 1 - edge / 12) * 0.42 > 0.84) r.set(x, y, pick(AL, (grow - 0.35) * 1.6, x, y), 230);
      continue;
    }
    let col;
    if (y >= SILL + 8) col = (y - SILL) % 12 === 0 ? M.dark : M.deep;                  // the wall under the sill, dark so a pit reads
    else if (y >= SILL) col = y === SILL ? M.hi : y === SILL + 1 ? M.light : y === SILL + 7 ? M.deep : M.base;
    else if (y < TOP) col = y === TOP - 1 ? M.light : y === 5 && mod(wx, 10) === 4 ? M.rivet : M.base;
    else if (pos < SW) col = pos === 0 ? M.light : pos === 1 ? M.hi : pos === SW - 1 ? M.deep : pos === 8 && mod(y, 12) === 6 ? M.rivet : M.base;
    else col = M.base;                                                                  // the frame in a pane's rounded corner
    r.set(x, y, col);
  }
  // A lamp on each strut, and on some panes a light crack, a few rays from where something struck it.
  for (let pane = Math.floor(ox / P) - 1; pane * P - ox < W + P; pane++) {
    const sx = pane * P - ox;
    fillRect(r, sx + 7, 84, 2, 3, GOLDL); r.set(sx + 7, 84, c('#fff3b0')); halo(r, sx + 8, 85, 5, GOLDL, 0.45);
    if (hash(pane, 0, 91) < 0.65) continue;
    const cx = sx + SW + 24 + Math.floor(hash(pane, 1, 91) * 100), cy = TOP + 24 + Math.floor(hash(pane, 2, 91) * 80);
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * TAU + hash(pane, 3 + k, 91), len = 6 + Math.floor(hash(pane, 9 + k, 91) * 14);
      let x = cx, y = cy;
      for (let i = 0; i < len; i++) { x += Math.cos(ang) + (hash(i, k, pane) - 0.5) * 0.9; y += Math.sin(ang) + (hash(k, i, pane) - 0.5) * 0.9; r.set(Math.round(x), Math.round(y), c('#d8f0ff'), 130); }
    }
    r.set(cx, cy, c('#ffffff'));
  }
}

const WATER_A = ['A', 'WET SLATE', 'Blue-grey slate shining wet along its edge, pale shards and a sea-stone arch.',
      material('strata', { deep: '#141c26', dark: '#2e3a48', base: '#4a5d74', mid: '#56697f', light: '#6a7e94', hi: '#e0f4ff', cap0: '#c8dce8', cap1: '#93aec4', void: '#06101c', thi: '#d8ecf4', tlight: '#8aa2b4', tdark: '#4a5e70' }, { wet: true })];
const UNDERWATER_LAB = scrolling('UNDERWATER LAB', 'Looking out of a subsea laboratory through thick glass, algae on it and a few light cracks: kelp swaying, bubbles rising and deep-sea creatures gliding by outside. Scrolls in three layers behind a still sea.', LAB_LOOP,
  { rate: 0, fixed: (r) => { grad(r, 0, H, [[0, tn(tempest, 0.32)], [0.75, tn(tempest, 0.13)], [1, tn(tempest, 0.06)]]); for (const [x, a] of [[80, 1.75], [200, 1.6], [330, 1.45], [440, 1.65]]) beam(r, x, -10, a, 0.05, 220, tn(tempest, 0.42), 0.32); } },
  { rate: 0.1, parts: [SWIM] },
  { rate: 0.25, period: 960, fixed: (r, ox) => ridge(r, ox, { y: 164, amp: 10, f: 0.04, seed: 86, col: tn(tempest, 0.06), top: tn(tempest, 0.1), period: 960 }),
    parts: [KELP, drift(87, 40, [c('#8ac8f0'), c('#bfe6ff')], 168, -0.35)] },
  { rate: 0.6, period: 1008, fixed: (r, ox) => habitat(r, ox) });

// ── ELECTRIC: Volt Man's power country ───────────────────────────────

const volt = B('volt');
export const P2 = (k) => tn(volt, k, 'secondary');
export const SPARK = [c('#fffbe0'), c('#f5d328')];
const ELECTRIC_B = ['B', 'HAZARD GRATING', 'Grating over a live glow, a yellow-and-black hazard band, a row of AA batteries for spikes and a slatted shutter.',
      material('grating', { deep: '#20202a', dark: '#3a3a48', base: '#5a5a6a', light: '#7c7c90', hi: '#c8c8d8', cap0: '#e8e8f0', cap1: '#b0b0c4', void: '#0c0a14', glow: '#f5d328', glow2: '#fff7b0', stripeA: '#f5d328', stripeB: '#1e1a24' }, { under: 'glow', stripe: true, spikes: 'batteries' })];
const PYLON_LINES = scrolling('PYLON LINES', 'Power lines marching over the hills at dusk, small pylons far off, big ones near. Scrolls in three layers.', 240,
  { rate: 0.05, period: 480, fixed: (r) => grad(r, 0, H, [[0, P2(0.08)], [0.68, P2(0.36)], [1, P2(0.1)]]) },
  { rate: 0.15, period: 980, fixed: (r, ox) => { ridge(r, ox, { y: 170, amp: 16, f: 0.02, seed: 91, col: P2(0.17), period: 980 }); for (let wx = Math.floor(ox / 140) * 140; wx < ox + W + 140; wx += 140) { const x = wx - ox; pylon(r, x, 162, 34, P2(0.17)); wire(r, x, x + 140, 128, 10, P2(0.18)); } } },
  { rate: 0.4, period: 1040, fixed: (r, ox) => { ridge(r, ox, { y: 186, amp: 12, f: 0.03, seed: 92, col: c('#120c20'), period: 1040 }); for (let wx = Math.floor(ox / 260) * 260; wx < ox + W + 260; wx += 260) { const x = wx - ox + 40; pylon(r, x, 184, 80, c('#120c20'), SPARK[1]); wire(r, x - 12, x + 248, 105, 22, c('#120c20')); wire(r, x + 12, x + 272, 111, 22, c('#120c20')); } } });

// ── GRASS: Thorn Man's wilds ─────────────────────────────────────────

const thorn = B('thorn');
const GRASS_A = ['A', 'MEADOW TURF', 'Grass over dark soil with roots and flowers, a turf ledge, bramble thorns and a hedge arch with a lantern.',
      material('turf', { deep: '#2a1c12', dark: '#5a4028', base: '#765638', mid: '#846244', light: '#9c7a54', hi: '#c0a070', cap0: '#8ee05a', cap1: '#5cb83a', grassDark: '#3a8028', root: '#4a3020', flower: '#f0e060', leafDark: '#2a6a1c', leaf: '#3c8a28', leafLight: '#64b040', void: '#0a120a', thi: '#b8d070', tlight: '#6a8a30', tdark: '#3a5018' }, { flowers: true })];
const GRASS_B = ['B', 'BAMBOO', 'Bamboo poles lashed together, sharpened bamboo stakes and a paper sliding door.',
      material('planks', { deep: '#2a3a10', dark: '#455a18', base: '#607a24', light: '#6e8c2e', hi: '#76962f', cap0: '#c8e080', cap1: '#98b850', rope: '#c8a060', paper: '#e8e0c8', paperLight: '#fff8e8', thi: '#d8e890', tlight: '#8aa840', tdark: '#4a6020' }, { bamboo: true, door: 'shoji' })];
/** One depth of the grove: `n` stalks `w` wide, wrapping round so the grove repeats every screen. */
function bamboo(r, ox, depth, n, w, col) {
  for (let k = 0; k < n; k++) {
    const x0 = mod(Math.floor(hash(k, depth, 114) * W) - ox, W);
    for (const x of [x0, x0 - W]) {
      for (let y = 0; y < FLOOR; y++) for (let i = 0; i < w; i++) r.set(x + i, y, (y + k * 7) % 22 === 0 ? mix(col, c('#c8e080'), 0.2) : col);
      for (let y = 20 + k * 3; y < 150; y += 40) for (let i = 1; i < 9; i++) r.set(x + w + i, y - Math.floor(i / 2), col);
    }
  }
}
// Drawn as a still picture; the owner asked for it to scroll slowly in the game (5 Nov 2026), so
// each depth of stalks is its own layer, the far ones slowest.
const BAMBOO_GROVE = scrolling('BAMBOO GROVE', 'Bamboo stalks in the mist, near ones dark, far ones fading. Scrolls slowly in three layers.', 240,
  { rate: 0, fixed: (r) => grad(r, 0, H, [[0, tn(thorn, 0.1)], [0.5, tn(thorn, 0.3)], [1, tn(thorn, 0.08)]]) },
  { rate: 0.05, period: 480, fixed: (r, ox) => bamboo(r, ox, 0, 30, 3, tn(thorn, 0.21)) },
  { rate: 0.1, period: 480, fixed: (r, ox) => bamboo(r, ox, 1, 18, 4, tn(thorn, 0.12)) },
  { rate: 0.18, period: 480, fixed: (r, ox) => { bamboo(r, ox, 2, 9, 6, tn(thorn, 0.05)); fillRect(r, 0, 178, W, 46, tn(thorn, 0.05)); } });

// ── FIGHTING: Strike Man's training grounds ──────────────────────────

const strike = B('strike');
export const S2 = (k) => tn(strike, k, 'secondary');
/** The arena's crowd in three rows, each person jumping on their own beat, some with their arms up. */
const CROWD_COLS = [tn(strike, 0.07), tn(strike, 0.055), tn(strike, 0.04)], CROWD_RIMS = [tn(strike, 0.3), tn(strike, 0.22), tn(strike, 0.16)];   // dark against the haze, lit on top by the spotlights
function person(row, bob, arms) {
  const r = new Raster(13, 18), col = CROWD_COLS[row], rim = CROWD_RIMS[row], x = 6, y = 5 - bob;   // (x, y): the head's centre
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 9) r.set(x + i, y + j, j === -3 || (j === -2 && Math.abs(i) === 2) ? rim : col);
  fillRect(r, x - 4, y + 3, 9, 10 + bob, col); r.set(x - 4, y + 3, rim); r.set(x + 4, y + 3, rim);
  if (arms) for (let j = 0; j < 4; j++) { r.set(x - 5, y + 2 - j - bob, col); r.set(x + 5, y + 2 - j - bob, col); }
  return r;
}
const CROWD = {
  pieces() {
    const out = [];
    for (let row = 0; row < 3; row++) for (let bob = 0; bob <= 2; bob++) for (const arms of bob ? [0, 1] : [0]) out.push([`p${row}${bob}${arms}`, person(row, bob, arms)]);
    return out;
  },
  at(ox, t) {
    const out = [], base = Math.floor(ox / 8), frac = ox - base * 8;
    for (let row = 0; row < 3; row++) for (let s = -1; s < 62; s++) {
      const ph = hash(base + s, row, 132), bob = Math.round(Math.max(0, Math.sin(TAU * (t / 30 + ph))) * 2);
      out.push([`p${row}${bob}${ph > 0.55 && bob ? 1 : 0}`, s * 8 + (row % 2) * 4 - frac - 6, 146 + row * 12 - 5]);
    }
    return out;
  },
};
/** Camera flashes going off in the crowd: a burst, then smaller, then gone, each on its own time. */
const FLASHES = {
  pieces() {
    const Wt = c('#ffffff'), G = c('#c8c8c8'), make = (near, far) => {
      const r = new Raster(5, 5);
      r.set(2, 2, Wt);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) r.set(2 + dx, 2 + dy, near);
      if (far) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) r.set(2 + dx, 2 + dy, far);
      return r;
    };
    return [['fb', make(Wt, G)], ['fm', make(Wt)], ['fs', make(G)]];
  },
  at(ox, t) {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const age = mod(t - Math.floor(hash(i, 2, 133) * 240), 240);
      if (age > 5) continue;
      const x = mod(Math.floor(hash(i, 0, 133) * W) - ox, W), y = 140 + Math.floor(hash(i, 1, 133) * 32);
      out.push([age < 2 ? 'fb' : age < 3 ? 'fm' : 'fs', x - 2, y - 2]);
    }
    return out;
  },
};
/** The spotlights, sweeping: each beam drawn ahead of time at every step of its swing, as a list of its pixels. */
const BEAM_AT = [[100, 1.2], [240, 1.57], [380, 1.94]], BEAM_STEP = 0.03, beamLists = new Map();
function beamPixels(i, q) {
  const key = `${i}:${q}`;
  if (!beamLists.has(key)) {
    const [x0, a] = BEAM_AT[i], pts = [];
    beam({ set: (x, y) => pts.push([x - x0, y]) }, x0, -5, a + q * BEAM_STEP, 0.09, 200, null, 0.22);
    beamLists.set(key, pts);
  }
  return beamLists.get(key);
}
const BEAMS = {
  pieces: () => { const r = new Raster(1, 1); r.set(0, 0, c('#f0e0c0')); return [['b', r]]; },
  at(ox, t) {
    const out = [];
    BEAM_AT.forEach(([x0], i) => {
      const q = Math.round((0.18 * Math.sin(TAU * (t / 240 + i / 3))) / BEAM_STEP), bx = x0 - ox;
      for (const [dx, y] of beamPixels(i, q)) out.push(['b', mod(bx + dx, W), y]);
    });
    return out;
  },
};
const FIGHTING_B = ['B', 'RING CANVAS', 'Blue-grey ring canvas with an orange line, thumbtack spikes and a gym shutter.',
      material('concrete', { deep: '#22262e', dark: '#3e4656', base: '#56607a', light: '#6e7894', hi: '#c0c8e0', cap0: '#e8ecf4', cap1: '#b4bccc', tape: '#ea6a34', rust: '#7c2d12', thi: '#ffffff', tlight: '#c0c0d0', tdark: '#6a6a80' }, { tape: true, joint: 48, door: 'shutter', spikes: 'spears' })];
const ARENA_CROWD = scrolling('ARENA CROWD', 'A packed arena in the dark: the crowd jumping and cheering, arms up, camera flashes going off, spotlights sweeping, banners overhead. Scrolls in two layers.', 240,
  { rate: 0.08, period: 480, fixed: (r, ox) => {
    grad(r, 0, H, [[0, tn(strike, 0.04)], [0.45, tn(strike, 0.1)], [0.62, tn(strike, 0.2)], [0.75, tn(strike, 0.12)], [1, tn(strike, 0.06)]]);   // a haze of light behind the crowd
    for (const x0 of [40, 160, 280, 400]) for (const x of [mod(x0 - ox, W), mod(x0 - ox, W) - W]) { fillRect(r, x, 0, 30, 46, S2(0.6)); for (let y = 0; y < 46; y++) r.set(x + 14, y, tn(strike, 0.3)); fillRect(r, x, 46, 30, 2, S2(0.3)); }
  }, parts: [BEAMS] },
  { rate: 0.2, parts: [CROWD, FLASHES] },
  { rate: 0.2, period: 480, fixed: (r) => fillRect(r, 0, 178, W, 46, tn(strike, 0.04)) });

/** Each picked slice: the owner's pick, the materials it uses, and its backdrop. */
export const PICKED = {
  proto: {
    pick: { backdrop: 2, material: 'A' },   // the owner, 5 Nov 2026: "2+A"
    materials: { A: PROTO_A },
    backdrop: HANGAR,
  },
  blaze: {
    // The owner, 5 Nov 2026: "5c but remove the fast moving layer of embers, and have the embers slowly
    // drift downward. spikes should be a shiny jet black obsidian glass. doorway should use be a stone
    // arch made of obsidian glass with tera cotta colored mortar"
    pick: { backdrop: 5, material: 'C' },
    materials: { C: FIRE_C },
    backdrop: EMBER_STORM,
  },
  tempest: {
    pick: { backdrop: 2, material: 'A' },
    materials: { A: WATER_A },
    backdrop: UNDERWATER_LAB,
  },
  volt: {
    // The owner, 5 Nov 2026: "1b but make the spikes a series of AA style batteries with terminal nubs
    // instead of the usual spikes"
    pick: { backdrop: 1, material: 'B' },
    materials: { B: ELECTRIC_B },
    backdrop: PYLON_LINES,
  },
  thorn: {
    // The owner, 5 Nov 2026: "2b including platform as it currently is, but the ground uses the ground
    // from A meadow turf."
    pick: { backdrop: 2, material: 'B', ground: 'A' },
    materials: { A: GRASS_A, B: GRASS_B },
    backdrop: BAMBOO_GROVE,
  },
  strike: {
    // The owner, 5 Nov 2026: "1b but ensure the arena crowd is animated"
    pick: { backdrop: 1, material: 'B' },
    materials: { B: FIGHTING_B },
    backdrop: ARENA_CROWD,
  },
};

/** The pieces an area is drawn with: the picked material, on another's ground where the owner mixed them. */
export function pickedMaterial(id) {
  const P = PICKED[id];
  if (!P) return null;
  const M = P.materials[P.pick.material][3];
  if (!P.pick.ground) return M;
  const G = P.materials[P.pick.ground][3];
  return { ...M, ground: G.ground, check: G.check };
}
