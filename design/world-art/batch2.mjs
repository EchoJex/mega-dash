/**
 * BATCH 2 OF THE PER-SLICE WORLD PIECES — Ice, Poison, Ground, Flying, Psychic, Bug.
 * VARIANTS FOR THE OWNER TO PICK FROM. Ice's and Ground's picks are in the game and live in
 * src/systems/area-art/slices.js, which this file shows beside the variants that were not picked;
 * Poison, Flying, Psychic and Bug are paused by the owner (6 Nov 2026) until their direction is settled.
 *
 * Drawn by Claude at the owner's request, 2026-11-05 ("now lets do it all again for batch 2"),
 * exactly as batch 1 was: each slice gets six backdrops, two of them scrolling in layers, and
 * three materials, each a floor, platform, spike bed, boss door and exit door. Ground keeps the
 * bedrock the owner picked in the first round, so its board offers only backdrops. Colours come
 * from the boss's own primary and secondary, so an area still tells you whose door is coming;
 * every floor keeps the game's contrast floors against every backdrop of its slice.
 *
 * The backdrops are written the way the game draws them (paint.js `scrolling`): what never moves
 * is painted once into a strip that repeats, and what moves by itself is small pictures placed
 * every step, all coming back to where they started every loop.
 */

import { BOSSES } from '../../src/data/bosses.js';
import { material } from '../../src/systems/area-art/materials.js';
import { grad, fillRect, stars, disc, halo, ridge, skyline, trees, beam, rain, clouds, drift, panels, tn, mix, c, still, scrolling, line, vert, mod, seamless } from '../../src/systems/area-art/paint.js';
import { Raster, hash, noise1, noise2, pick } from '../../src/systems/arena-art/pixels.js';
import { W, H, FLOOR } from '../../src/systems/area-art/kit.js';
import { PICKED } from '../../src/systems/area-art/slices.js';

const B = (id) => BOSSES.find((b) => b.id === id);
const TAU = Math.PI * 2;
const dark = (r, y, col) => fillRect(r, 0, y, W, H - y, col);   // the band under the floor line: what a pit shows

// ── ICE: Frost Man's frozen approach ─────────────────────────────────

const frost = B('frost');
const I = (k) => tn(frost, k), SNOW = c('#ffffff'), PALE = c('#d8f8fa');
function icicles(r, x0, x1, y, maxLen, col, seed) {
  for (let x = x0; x < x1; x++) {
    const len = Math.floor(noise1(x * 0.4, seed) * maxLen) - Math.floor(maxLen * 0.3);
    for (let j = 0; j < len; j++) if (j < len - Math.floor(Math.abs(((x % 5) - 2)) * 0.8)) r.set(x, y + j, col);
  }
}
const ICE = {
  id: 'frost', type: 'Ice',
  pick: PICKED.frost.pick,
  materials: [
    PICKED.frost.materials.A,
    ['B', 'GLACIER ICE', 'Thick blue ice in great blocks with cracks running through, ice cones and a frosted shutter.',
      material('tiles', { deep: '#123c50', dark: '#1e5a74', base: '#2a6c88', light: '#3e86a2', hi: '#e8ffff', cap0: '#f0ffff', cap1: '#b8ecf4', void: '#081820', thi: '#ffffff', tlight: '#d8f8fc', tdark: '#5aa8c0' }, { size: 12, wave: true, spikes: 'cones', door: 'shutter' })],
    ['C', 'FROSTED STEEL', 'Diamond-plate steel furred with frost, frozen iron spears and a hatch iced shut.',
      material('plates', { deep: '#18262e', dark: '#2e4450', base: '#46606e', light: '#5e7a88', hi: '#e8ffff', cap0: '#f4ffff', cap1: '#b0d8e0', thi: '#f4ffff', tlight: '#a8c8d4', tdark: '#4a6470' }, { diamond: true, spikes: 'spears', door: 'hatch' })],
  ],
  backdrops: [
    PICKED.frost.backdrop,
    still('GLACIER WALL', 'A towering glacier face, blue in its depths, cracked into crevasses, over a dark meltwater lake.', (r) => {
      grad(r, 0, H, [[0, c('#a8d8f0')], [0.3, c('#e0f4fc')], [1, I(0.1)]]);
      for (let x = 0; x < W; x++) {
        const top = 30 + Math.floor(noise1(x * 0.03, 206) * 40);
        for (let y = top; y < 170; y++) {
          const v = 0.25 + 0.6 * ((y - top) / 140) + 0.15 * (noise2(x * 0.08, y * 0.02, 207) - 0.5);
          r.set(x, y, pick([c('#e8fcff'), c('#a8e0f0'), c('#5cb0d0'), c('#2a7aa0'), c('#14506e')], v, x, y));
        }
        if (hash(Math.floor(x / 23), 0, 208) > 0.5 && x % 23 === 11) for (let y = top + 8; y < 168; y++) { r.set(x, y, c('#0e3a56')); if (y % 3) r.set(x + 1, y, c('#2a6a8e')); }
        r.set(x, top, SNOW);
      }
      dark(r, 170, I(0.05));
      for (let x = 0; x < W; x += 3) r.set(x + (x % 2), 172 + (x % 4), I(0.2));
    }),
    still('FROZEN LAKE', 'A frozen lake at dusk, a pale moon on the ice, cracks spreading, ice-fishing huts on the far shore.', (r) => {
      grad(r, 0, 132, [[0, c('#1a1a3a')], [0.7, c('#6a6aa0')], [1, c('#e8c8d8')]]);
      disc(r, 360, 52, 14, [c('#fff8f0'), c('#e8e0f0'), c('#b8b0d0')]);
      ridge(r, 0, { y: 132, amp: 12, f: 0.02, seed: 209, col: I(0.12), to: 136 });
      grad(r, 136, 178, [[0, I(0.42)], [1, I(0.2)]]);
      for (let y = 138; y < 176; y++) if (y % 3 === 0) for (let x = 340; x < 380; x++) if (hash(x, y, 210) > 0.5) r.set(x, y, c('#f0f0ff'));
      for (let k = 0; k < 7; k++) { let x = 40 + k * 64, y = 150 + (k % 3) * 8; for (let i = 0; i < 30; i++) { x += hash(i, k, 211) > 0.5 ? 1 : -1 + 2 * (i % 2); y += hash(k, i, 212) > 0.6 ? 1 : 0; r.set(x, y, I(0.7)); } }
      for (const x of [70, 120, 420]) { fillRect(r, x, 124, 12, 10, I(0.06)); for (let i = 0; i < 8; i++) r.set(x + 2 + i, 123 - Math.floor(i / 2 % 2), I(0.06)); r.set(x + 4, 128, c('#ffd880')); }
      dark(r, 178, I(0.05));
    }),
    still('ICE CAVE', 'Inside an ice cave: crystal walls, icicles hanging from the roof, daylight falling through a hole above.', (r) => {
      fillRect(r, 0, 0, W, H, I(0.12));
      for (let y = 0; y < 178; y++) for (let x = 0; x < W; x++) {
        const v = noise2(x * 0.05, y * 0.05, 213), f = Math.floor(v * 7) / 7;
        r.set(x, y, pick([I(0.1), I(0.14), I(0.19), I(0.25)], f + 0.15 * (noise2(x * 0.3, y * 0.3, 214) - 0.5), x, y));
      }
      beam(r, 250, -10, Math.PI / 2 + 0.08, 0.14, 210, c('#e8fcff'), 0.32);
      halo(r, 250, 4, 24, c('#ffffff'), 0.6);
      icicles(r, 0, W, 0, 34, c('#c8f4fc'), 215);
      for (let x = 0; x < W; x += 2) if (hash(x, 0, 216) > 0.7) r.set(x, Math.floor(noise1(x * 0.4, 215) * 20), SNOW);
      dark(r, 176, I(0.06));
    }),
    scrolling('BLIZZARD PEAKS', 'Three ranges of jagged peaks, nearer ones darker, a blizzard blowing through. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => { grad(r, 0, H, [[0, I(0.3)], [0.6, I(0.5)], [1, I(0.12)]]); clouds(r, 0, { y: 10, h: 60, col: I(0.42), lit: I(0.6), seed: 217, cut: 0.48 }); } },
      { rate: 0.08, period: 960, fixed: (r, ox) => ridge(r, ox, { y: 120, amp: 50, f: 0.015, seed: 218, col: I(0.34), top: c('#f0ffff'), sharp: 0.9, period: 960 }),
        parts: [drift(219, 90, [c('#f4ffff'), I(0.7)], 176, 0.4)] },
      { rate: 0.2, period: 960, fixed: (r, ox) => ridge(r, ox, { y: 150, amp: 44, f: 0.02, seed: 220, col: I(0.2), top: SNOW, sharp: 0.9, period: 960 }) },
      { rate: 0.45, period: 960, fixed: (r, ox) => { ridge(r, ox, { y: 184, amp: 30, f: 0.03, seed: 221, col: I(0.07), top: PALE, sharp: 0.8, period: 960 }); dark(r, 182, I(0.05)); },
        parts: [drift(222, 60, [SNOW, SNOW, PALE], 176, 0.7)] }),
    still('FROZEN WORKS', 'A works frozen solid: tanks and pipes hung with icicles, cold blue lights in its windows, frost haze.', (r) => {
      grad(r, 0, H, [[0, I(0.08)], [0.65, I(0.3)], [1, I(0.08)]]);
      skyline(r, 0, { y: 176, minH: 30, maxH: 80, col: I(0.1), lit: c('#8af0ff'), cw: 18, gap: 0.12, rate: 0.12, seed: 223 });
      for (const [x, w, h] of [[40, 34, 60], [190, 46, 80], [330, 38, 56]]) {
        for (let y = 176 - h; y < 176; y++) for (let i = 0; i < w; i++) r.set(x + i, y, i < 3 ? I(0.22) : i > w - 4 ? I(0.06) : I(0.12));
        icicles(r, x, x + w, 176 - h, 10, c('#d8faff'), x);
        fillRect(r, x - 6, 176 - h + 14, w + 12, 3, I(0.16)); icicles(r, x - 6, x + w + 6, 176 - h + 17, 8, c('#b8f0fa'), x + 1);
      }
      for (let y = 120; y < 176; y++) for (let x = 0; x < W; x++) if (hash(x, y, 224) < (y - 120) / 400) r.set(x, y, I(0.5));
      dark(r, 176, I(0.05));
    }),
  ],
};

// ── POISON: Venom Man's toxic approach ───────────────────────────────

const venom = B('venom');
const V = (k) => tn(venom, k), G = (k) => tn(venom, k, 'secondary'), LIME = c('#84cc16'), SLIME = c('#c8f060');
function bareTree(r, x, base, h, col, seed) {
  for (let j = 0; j < h; j++) { const w = j < h * 0.3 ? 3 : 2; for (let i = 0; i < w; i++) r.set(x + i, base - j, col); }
  for (let k = 0; k < 5; k++) {
    const y0 = base - Math.floor(h * (0.4 + k * 0.12)), dir = k % 2 ? 1 : -1, len = 8 + Math.floor(hash(k, x, seed) * 12);
    for (let i = 0; i < len; i++) r.set(x + 1 + dir * i, y0 - Math.floor(i * 0.6), col);
  }
}
function mushroom(r, cx, base, h, capW, cap, spot, stem) {
  for (let y = base - h; y < base; y++) for (let i = -2; i <= 2; i++) r.set(cx + i, y, i === -2 ? mix(stem, c('#ffffff'), 0.2) : stem);
  const ch = Math.floor(capW * 0.45);
  for (let j = 0; j < ch; j++) {
    const half = Math.floor(capW / 2 * Math.sqrt(1 - ((ch - j) / ch) ** 2));
    for (let i = -half; i <= half; i++) r.set(cx + i, base - h - ch + j, (hash(cx + i, j, 225) > 0.93 || (Math.abs(i) % 7 === 3 && j % 5 === 2)) ? spot : cap);
  }
  for (let i = -Math.floor(capW / 2); i <= capW / 2; i++) r.set(cx + i, base - h, mix(cap, c('#000000'), 0.4));
}
const POISON = {
  id: 'venom', type: 'Poison',
  materials: [
    ['A', 'TOXIC GRATE', 'A grate over glowing green sludge, prongs with poison-green tips and a biohazard hatch.',
      material('grating', { deep: '#1a1622', dark: '#2e2838', base: '#4a4258', light: '#6a6080', hi: '#a8a0c0', cap0: '#d0c8e8', cap1: '#9a90b8', void: '#0c0812', glow: '#84cc16', glow2: '#c8f060', thi: '#ffffff', tlight: '#8a809a', tdark: '#4a4258' }, { under: 'glow', spikes: 'prongs', door: 'hatch' })],
    ['B', 'SEWER BRICK', 'Sewer bricks with green slime creeping over the top, rusty spears and a sewer grate for a door.',
      material('bricks', { deep: '#1e1626', dark: '#3a2e46', base: '#5a4a68', alt: '#4e405c', light: '#7a6888', hi: '#c8b8d8', cap0: '#c8b8d8', cap1: '#9a88ac', moss: '#84cc16', mossDark: '#4a7a10', void: '#0c0812', thi: '#d8c8a0', tlight: '#9a7a5a', tdark: '#5a4030' }, { moss: true, spikes: 'spears', door: 'gate' })],
    ['C', 'CORRODED PLATE', 'Steel plate eaten by acid under a hazard stripe, broken vials of glowing green glass and a shutter.',
      material('plates', { deep: '#1e2418', dark: '#3a4232', base: '#545c48', light: '#727a62', hi: '#c8e890', cap0: '#d8e8b8', cap1: '#a8b890', stripeA: '#c8e020', stripeB: '#1e2418', obs0: '#0e1a08', obs1: '#2a4a14', obs2: '#84cc16', obs3: '#e8ffc0' }, { stripe: true, spikes: 'glass', door: 'shutter' })],
  ],
  backdrops: [
    scrolling('TOXIC SWAMP', 'A swamp under a sickly moon: dead trees, fog, and bubbles of swamp gas rising. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => { grad(r, 0, H, [[0, V(0.08)], [0.55, mix(V(0.2), G(0.3), 0.4)], [1, V(0.06)]]); disc(r, 380, 50, 16, [c('#f0ffb0'), c('#c8e080'), c('#90a850')]); halo(r, 380, 50, 30, c('#c8e080'), 0.3); } },
      { rate: 0.12, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 120) * 120; wx < ox + W + 120; wx += 120) { const k = mod(wx / 120, 8); bareTree(r, wx - ox + Math.floor(hash(k, 0, 226) * 60), 168, 60 + Math.floor(hash(k, 1, 226) * 50), V(0.1), k); }
        for (let y = 140; y < 170; y++) for (let x = 0; x < W; x++) if (hash(x, y, 227) < 0.25 * Math.sin(((x + ox) * TAU) / 240 + y * 0.1) + 0.1) r.set(x, y, mix(G(0.2), V(0.2), 0.5));
      } },
      { rate: 0.3, period: 960, fixed: (r, ox) => { grad(r, 166, 184, [[0, mix(G(0.24), V(0.1), 0.5)], [1, V(0.06)]]); for (let x = 0; x < W; x++) if (seamless((w) => noise1(w * 0.2, 228), x + ox, 960) > 0.7) r.set(x, 167, mix(G(0.5), V(0.2), 0.4)); dark(r, 182, V(0.05)); },
        parts: [drift(229, 50, [LIME, SLIME], 172, -0.18)] }),
    still('CHEMICAL PLANT', 'A chemical plant at night: tanks, pipes and chimneys venting green smoke, warning lights blinking.', (r) => {
      grad(r, 0, H, [[0, V(0.05)], [0.6, V(0.18)], [1, V(0.06)]]);
      for (const [x, w, h] of [[20, 50, 50], [200, 70, 64], [380, 56, 44]]) {
        for (let y = 176 - h; y < 176; y++) for (let i = 0; i < w; i++) { const d = Math.abs(i - w / 2) / (w / 2); r.set(x + i, y, d > 0.8 ? V(0.05) : d < 0.2 ? V(0.16) : V(0.1)); }
        for (let i = 2; i < w - 2; i++) r.set(x + i, 176 - h, V(0.18));
        fillRect(r, x + w / 2 - 2, 176 - h - 6, 4, 6, V(0.08));
      }
      for (const [x, h] of [[120, 120], [300, 100], [450, 110]]) {
        fillRect(r, x, 176 - h, 8, h, V(0.06)); r.set(x + 3, 176 - h + 4, c('#ff3030'));
        for (let k = 0; k < 9; k++) { const rad = 5 + k * 1.6; disc(r, x + 4 + Math.round(Math.sin(k * 0.9) * 4 + k * 2), 176 - h - 6 - k * 9, rad, [G(0.5), mix(G(0.4), V(0.2), 0.4), mix(G(0.3), V(0.14), 0.6)]); }
      }
      for (let x = 0; x < W; x++) { r.set(x, 140, V(0.04)); r.set(x, 141, V(0.12)); }
      dark(r, 176, V(0.05));
    }),
    still('ACID RAIN', 'A city in acid rain: green streaks falling past dark towers, puddles glowing in the street.', (r) => {
      grad(r, 0, H, [[0, mix(V(0.06), G(0.1), 0.5)], [0.7, mix(V(0.14), G(0.22), 0.5)], [1, V(0.06)]]);
      skyline(r, 0, { y: 176, minH: 40, maxH: 110, col: V(0.07), lit: SLIME, cw: 14, gap: 0.08, rate: 0.1, seed: 231 });
      rain(r, 232, 220, mix(LIME, V(0.3), 0.3), 7);
      for (let i = 0; i < 12; i++) { const x = Math.floor(hash(i, 0, 233) * W); for (let k = 0; k < 10; k++) r.set(x + k, 174 + (k % 2), mix(LIME, V(0.2), 0.5)); }
      dark(r, 176, V(0.05));
    }),
    still('MUSHROOM GROVE', 'Giant toadstools with violet caps and poison-green spots, spores drifting in the gloom.', (r) => {
      grad(r, 0, H, [[0, V(0.05)], [0.6, V(0.16)], [1, V(0.06)]]);
      for (const [x, h, w] of [[70, 90, 60], [190, 60, 40], [300, 110, 80], [430, 70, 50], [250, 40, 26]]) mushroom(r, x, 178, h, w, V(0.3), G(0.7), mix(V(0.4), c('#ffffff'), 0.3));
      for (let i = 0; i < 80; i++) r.set(Math.floor(hash(i, 0, 234) * W), Math.floor(hash(i, 1, 234) * 170), hash(i, 2, 234) > 0.5 ? SLIME : G(0.5));
      dark(r, 178, V(0.05));
    }),
    scrolling('SEWER TUNNEL', 'Deep in the sewers: brick arches one behind another, green sludge in the channel, slime dripping. Scrolls in three layers.', 240,
      { rate: 0.05, period: 480, fixed: (r, ox) => { panels(r, ox, { pw: 12, ph: 6, base: V(0.1), light: V(0.14), dark: V(0.06) }); } },
      { rate: 0.2, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 160) * 160; wx < ox + W + 160; wx += 160) {
          const cx = wx - ox + 80;
          for (let y = 20; y < 178; y++) for (let x = cx - 80; x < cx + 80; x++) {
            const dx = x - cx, inside = y > 40 + 60 - Math.sqrt(Math.max(0, 60 * 60 - dx * dx)) && Math.abs(dx) < 60;
            if (!inside && Math.abs(dx) < 70) r.set(x, y, ((x + y) % 7) ? V(0.16) : V(0.1));
          }
        }
      } },
      { rate: 0.4, period: 960, fixed: (r, ox) => {
        for (let x = 0; x < W; x++) { for (let y = 166; y < 178; y++) r.set(x, y, pick([G(0.3), LIME, SLIME], 0.3 + 0.4 * seamless((w) => noise2(w * 0.1, y * 0.3, 235), x + ox, 960), x, y)); r.set(x, 20, V(0.05)); r.set(x, 21, V(0.2)); }
        dark(r, 178, V(0.05));
      }, parts: [drift(236, 30, [SLIME, LIME], 166, 0.5)] }),
    still('WASTE DUMP', 'A dump of leaking drums piled into hills under a violet sky, green ooze pooling between them.', (r) => {
      grad(r, 0, H, [[0, V(0.1)], [0.6, mix(V(0.26), G(0.2), 0.3)], [1, V(0.06)]]);
      clouds(r, 0, { y: 10, h: 50, col: V(0.16), lit: V(0.26), seed: 237, cut: 0.5 });
      for (const [cx, base, rows] of [[90, 178, 5], [250, 178, 7], [400, 178, 4]]) for (let row = 0; row < rows; row++) for (let k = 0; k <= rows - row - 1; k++) {
        const x = cx - (rows - row - 1) * 9 + k * 18, y = base - 14 - row * 14;
        for (let j = 0; j < 14; j++) for (let i = 0; i < 16; i++) r.set(x + i, y + j, i < 2 ? V(0.3) : i > 13 ? V(0.1) : j === 3 || j === 10 ? V(0.08) : V(0.18));
        if (hash(row, k, cx) > 0.6) { r.set(x + 7, y + 6, G(0.9)); r.set(x + 8, y + 6, G(0.9)); for (let j = 0; j < 5; j++) r.set(x + 16, y + 8 + j, LIME); }
      }
      for (let i = 0; i < 8; i++) { const x = Math.floor(hash(i, 0, 241) * W); for (let k = -8; k < 8; k++) r.set(x + k, 176 + (k & 1), k % 3 ? LIME : SLIME); }
      dark(r, 178, V(0.05));
    }),
  ],
};

// ── GROUND: Quake Man's quarry country ───────────────────────────────

const quake = B('quake');
const Q = (k) => tn(quake, k), S = (k) => tn(quake, k, 'secondary');

const GROUND = {
  id: 'quake', type: 'Ground',
  pick: PICKED.quake.pick,
  materials: [PICKED.quake.materials.B],
  backdrops: [
    PICKED.quake.backdrop,
    still('RED CANYON', 'Between towering canyon walls banded with rock strata, a far mesa glowing in the gap.', (r) => {
      grad(r, 0, H, [[0, c('#3a6ab0')], [0.5, c('#f0b070')], [1, Q(0.2)]]);
      fillRect(r, 200, 70, 90, 60, Q(0.5)); for (let x = 200; x < 290; x++) r.set(x, 70, S(0.8));
      for (const [x0, x1, side] of [[0, 200, 1], [290, W, -1]]) for (let x = x0; x < x1; x++) {
        const edge = side > 0 ? x1 - x : x - x0, top = 10 + Math.floor(noise1(x * 0.05, 245) * 20);
        for (let y = top; y < 178; y++) {
          const band = Math.floor((y + noise1(x * 0.02, 246) * 8) / 9) % 4;
          let col = [Q(0.3), Q(0.42), Q(0.24), S(0.42)][band];
          if (edge < 4) col = side > 0 ? Q(0.12) : Q(0.55);
          r.set(x, y, col);
        }
      }
      dark(r, 178, Q(0.06));
    }),
    still('QUARRY', 'A stepped quarry cut into the hillside, a crane and a conveyor belt against the sky.', (r) => {
      grad(r, 0, H, [[0, c('#8ab8d8')], [0.6, c('#f0d8b0')], [1, Q(0.2)]]);
      for (let k = 0; k < 6; k++) { const y = 60 + k * 18, x0 = 40 + k * 26; fillRect(r, x0, y, W - x0 * 0.6, 18, [Q(0.5), Q(0.42), Q(0.36), Q(0.3), Q(0.24), Q(0.18)][k]); for (let x = x0; x < W; x++) r.set(x, y, S(0.8)); }
      for (let j = 0; j < 90; j++) { r.set(360, 30 + j, Q(0.08)); if (j % 6 === 0) line(r, 356, 30 + j, 364, 36 + j, Q(0.08)); r.set(364, 30 + j, Q(0.08)); }
      line(r, 300, 30, 440, 30, Q(0.08)); line(r, 300, 32, 440, 32, Q(0.08)); vert(r, 310, 32, 60, Q(0.08)); fillRect(r, 305, 60, 10, 8, Q(0.08));
      line(r, 40, 150, 200, 100, Q(0.08)); line(r, 40, 152, 200, 102, Q(0.08)); for (let x = 50; x < 200; x += 16) fillRect(r, x, 147 - Math.floor((x - 40) * 0.31), 6, 3, S(0.5));
      dark(r, 176, Q(0.07));
    }),
    still('MESA SUNSET', 'Flat-topped mesas against a huge setting sun, saguaro cactus standing in the foreground.', (r) => {
      grad(r, 0, H, [[0, c('#2a1a40')], [0.45, c('#c0405a')], [0.7, c('#f0a050')], [1, Q(0.2)]]);
      disc(r, 240, 120, 44, [c('#fff0a0'), c('#ffc060'), c('#ff8040')]);
      for (const [x, w, h] of [[20, 120, 70], [300, 160, 54], [180, 60, 40]]) { for (let y = 176 - h; y < 176; y++) { const t = (y - (176 - h)) / h; for (let i = -Math.floor(t * 8); i < w + Math.floor(t * 8); i++) r.set(x + i, y, Q(0.08)); } }
      for (const [x, h] of [[80, 50], [400, 64], [250, 36]]) { fillRect(r, x, 178 - h, 5, h, Q(0.05)); fillRect(r, x - 8, 178 - h + 18, 8, 4, Q(0.05)); fillRect(r, x - 8, 178 - h + 6, 4, 14, Q(0.05)); fillRect(r, x + 5, 178 - h + 24, 7, 4, Q(0.05)); fillRect(r, x + 9, 178 - h + 12, 4, 14, Q(0.05)); }
      dark(r, 178, Q(0.05));
    }),
    scrolling('MINE SHAFT', 'Down a mine: timber props and beams one after another, lanterns glowing, dust sifting from the roof. Scrolls in three layers.', 240,
      { rate: 0.06, period: 480, fixed: (r, ox) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) r.set(x, y, pick([Q(0.06), Q(0.1), Q(0.15)], seamless((w) => noise2(w * 0.06, y * 0.06, 247), x + ox, 480), x, y)); } },
      { rate: 0.25, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 120) * 120; wx < ox + W + 120; wx += 120) {
          const x = wx - ox + 40;
          fillRect(r, x, 30, 8, 148, Q(0.24)); vert(r, x, 30, 178, Q(0.34)); fillRect(r, x + 60, 30, 8, 148, Q(0.24)); vert(r, x + 60, 30, 178, Q(0.34));
          fillRect(r, x - 6, 24, 80, 8, Q(0.28)); for (let i = -6; i < 74; i++) r.set(x + i, 24, Q(0.4));
          vert(r, x + 34, 32, 52, Q(0.06)); fillRect(r, x + 31, 52, 7, 8, Q(0.12)); halo(r, x + 34, 56, 16, c('#ffd070'), 0.5); fillRect(r, x + 33, 54, 3, 4, c('#ffe8a0'));
        }
      }, parts: [drift(248, 50, [S(0.5), Q(0.4)], 176, 0.2)] },
      { rate: 0.6, period: 960, fixed: (r, ox) => { for (let x = 0; x < W; x++) { r.set(x, 172, Q(0.3)); r.set(x, 173, Q(0.2)); if (mod(x + ox, 16) < 3) { r.set(x, 175, Q(0.16)); r.set(x, 176, Q(0.16)); } } dark(r, 177, Q(0.05)); } }),
    still('FOSSIL CLIFF', 'A cliff of layered rock with giant fossils in it: spiral shells and the bones of something huge.', (r) => {
      grad(r, 0, 40, [[0, c('#90c0e0')], [1, c('#e0e8e8')]]);
      for (let y = 30; y < 178; y++) for (let x = 0; x < W; x++) { const band = Math.floor((y + noise1(x * 0.03, 249) * 6) / 14) % 3; r.set(x, y, pick([Q(0.32), Q(0.4), S(0.4)], band / 2 + 0.2 * (noise2(x * 0.2, y * 0.2, 250) - 0.5), x, y)); }
      for (const [cx, cy, rad] of [[90, 90, 22], [380, 120, 16]]) for (let a = 0; a < 14; a += 0.05) { const rr = rad * a / 14; r.set(Math.round(cx + Math.cos(a * 1.8) * rr), Math.round(cy + Math.sin(a * 1.8) * rr), S(0.85)); }
      for (let i = 0; i < 9; i++) { const x = 190 + i * 14; for (let j = 0; j < 22 - Math.abs(i - 4) * 2; j++) r.set(x, 60 + j, S(0.9)); r.set(x - 1, 60, S(0.9)); r.set(x + 1, 60, S(0.9)); }
      for (let x = 185; x < 320; x++) r.set(x, 58 + Math.floor(Math.sin(x * 0.04) * 3), S(0.95));
      dark(r, 178, Q(0.06));
    }),
  ],
};

// ── FLYING: Gale Man's skies ─────────────────────────────────────────

const gale = B('gale');
const F = (k) => tn(gale, k), CLOUD = c('#ffffff'), CLOUD2 = c('#d8ecf8');
/** Gulls wheeling in slow circles, wings beating: they come back round every loop. */
const BIRDS = {
  pieces() {
    const up = new Raster(7, 3), down = new Raster(7, 3), col = c('#2a3848');
    for (const [x, y] of [[0, 0], [1, 1], [2, 2], [3, 2], [4, 2], [5, 1], [6, 0]]) up.set(x, y, col);
    for (const [x, y] of [[0, 2], [1, 1], [2, 1], [3, 2], [4, 1], [5, 1], [6, 2]]) down.set(x, y, col);
    return [['up', up], ['down', down]];
  },
  at(ox, t) {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = TAU * (t / 240 + i / 6), cx = 60 + i * 80, cy = 40 + (i % 3) * 22;
      out.push([Math.floor(t / 8 + i) & 1 ? 'up' : 'down', mod(cx + Math.round(Math.cos(a) * 26) - ox, 560) - 40, cy + Math.round(Math.sin(a) * 8)]);
    }
    return out;
  },
};
function island(r, cx, cy, w, rock, grass, falls) {
  for (let j = 0; j < w * 0.6; j++) { const half = Math.floor((w / 2) * (1 - j / (w * 0.6)) ** 0.8); for (let i = -half; i <= half; i++) r.set(cx + i, cy + j, j < 3 ? grass : i < -half * 0.4 ? mix(rock, c('#ffffff'), 0.15) : i > half * 0.4 ? mix(rock, c('#000000'), 0.35) : (hash(i, j, cx) > 0.85 ? mix(rock, c('#000000'), 0.2) : rock)); }
  if (falls) for (let y = cy + 2; y < 178; y++) for (let i = 0; i < 3; i++) if (hash(i, y, cx) > 0.3) r.set(cx + w / 4 + i, y, i === 1 ? CLOUD : CLOUD2);
}
const FLYING = {
  id: 'gale', type: 'Flying',
  materials: [
    ['A', 'AIRSHIP DECK', 'Varnished airship planks bound with rope, rope-bound stakes and a banded cabin door.',
      material('planks', { deep: '#2e1e10', dark: '#5a3e24', base: '#7a5a3a', light: '#9a7650', hi: '#c8a070', cap0: '#e8d0a0', cap1: '#b8945c', rope: '#d8c8a0', iron: '#3a3a44', ironLight: '#6a6a78', thi: '#e8d0a0', tlight: '#a07850', tdark: '#5a3e24' }, { spikes: 'stakes', door: 'wood' })],
    ['B', 'SKY TEMPLE', 'Slate-blue marble tiles under a gold lip, gold spears and a marble arch.',
      material('tiles', { deep: '#1a2438', dark: '#2e4060', base: '#42587a', light: '#5a76a0', hi: '#e8f0ff', cap0: '#f0d878', cap1: '#c8a840', void: '#0a1020', thi: '#fff3b0', tlight: '#f5c518', tdark: '#a07c10' }, { size: 10, spikes: 'spears', door: 'arch' })],
    ['C', 'TURBINE WALKWAY', 'An open steel walkway over thin air, steel cones and a slatted shutter.',
      material('grating', { deep: '#1a222a', dark: '#2e3a46', base: '#4a5a6a', light: '#6a7a8a', hi: '#c0d0e0', cap0: '#e0ecf4', cap1: '#a0b4c4', void: '#081018', thi: '#f4f8fa', tlight: '#c0ccd6', tdark: '#6a7a88' }, { spikes: 'cones', door: 'shutter' })],
  ],
  backdrops: [
    scrolling('ABOVE THE CLOUDS', 'High above a sea of clouds in the sun, gulls wheeling. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => { grad(r, 0, H, [[0, c('#2a6ac0')], [0.6, c('#8ac8f0')], [1, F(0.5)]]); disc(r, 400, 40, 16, [c('#ffffff'), c('#fff8d0'), c('#ffe8a0')]); halo(r, 400, 40, 34, c('#ffffff'), 0.35); } },
      { rate: 0.06, period: 960, fixed: (r, ox) => clouds(r, ox, { y: 90, h: 60, col: CLOUD2, lit: CLOUD, seed: 251, f: 0.02, cut: 0.42, period: 960 }), parts: [BIRDS] },
      { rate: 0.2, period: 960, fixed: (r, ox) => { clouds(r, ox, { y: 130, h: 60, col: c('#b8d8f0'), lit: CLOUD, seed: 252, f: 0.025, cut: 0.36, period: 960 }); grad(r, 176, H, [[0, F(0.12)], [1, F(0.05)]]); } }),
    still('FLOATING ISLANDS', 'Islands of rock and grass floating in the sky, waterfalls pouring off their edges into the clouds.', (r) => {
      grad(r, 0, H, [[0, c('#3a80d0')], [0.7, c('#b0dcf8')], [1, F(0.4)]]);
      clouds(r, 0, { y: 150, h: 40, col: CLOUD2, lit: CLOUD, seed: 253, cut: 0.4 });
      for (const [cx, cy, w, falls] of [[90, 70, 70, true], [260, 40, 40, false], [380, 100, 90, true], [200, 130, 30, false]]) island(r, cx, cy, w, c('#8a7058'), c('#5cc048'), falls);
      grad(r, 176, H, [[0, F(0.12)], [1, F(0.05)]]);
    }),
    still('WIND FARM', 'White wind turbines along green rolling hills under a clear sky.', (r) => {
      grad(r, 0, H, [[0, c('#3a88d8')], [1, c('#c8e8f8')]]);
      ridge(r, 0, { y: 140, amp: 20, f: 0.012, seed: 254, col: c('#5a9a50') });
      ridge(r, 0, { y: 168, amp: 18, f: 0.018, seed: 255, col: c('#3a7a38') });
      for (const [x, base, h] of [[60, 130, 70], [170, 124, 80], [300, 134, 64], [420, 128, 74]]) {
        vert(r, x, base - h, base, c('#f0f4f8')); vert(r, x + 1, base - h, base, c('#c8d0d8'));
        for (const a of [0.3, 0.3 + TAU / 3, 0.3 + 2 * TAU / 3]) line(r, x, base - h, x + Math.round(Math.cos(a) * h * 0.4), base - h + Math.round(Math.sin(a) * h * 0.4), c('#ffffff'));
        fillRect(r, x - 1, base - h - 1, 3, 3, c('#d8e0e8'));
      }
      grad(r, 176, H, [[0, c('#0e1e0c')], [1, c('#060e06')]]);
    }),
    still('BALLOON FESTIVAL', 'A sunset sky full of hot-air balloons in stripes, near ones big, far ones small.', (r) => {
      grad(r, 0, H, [[0, c('#4a3a90')], [0.5, c('#f08070')], [0.8, c('#ffc080')], [1, F(0.3)]]);
      for (const [cx, cy, rad, a, b] of [[80, 70, 22, c('#ff5a4a'), c('#ffd84a')], [210, 40, 12, c('#4ab0ff'), c('#ffffff')], [330, 90, 28, c('#6ad04a'), c('#ffe0a0')], [440, 50, 14, c('#c060f0'), c('#ffd84a')], [150, 130, 9, c('#ff9a3a'), c('#ffffff')]]) {
        for (let j = -rad; j <= rad * 1.1; j++) for (let i = -rad; i <= rad; i++) { const t = j / rad, half = rad * Math.sqrt(Math.max(0, 1 - Math.max(0, -t) ** 2)) * (t > 0 ? 1 - t * 0.6 : 1); if (Math.abs(i) <= half) r.set(cx + i, cy + j, Math.floor((i + rad) / (rad / 2.5)) % 2 ? a : b); }
        fillRect(r, cx - 3, cy + Math.round(rad * 1.3), 6, 4, c('#6a4020')); line(r, cx - 3, cy + Math.round(rad * 1.1), cx - 3, cy + Math.round(rad * 1.3), c('#3a2410')); line(r, cx + 2, cy + Math.round(rad * 1.1), cx + 2, cy + Math.round(rad * 1.3), c('#3a2410'));
      }
      grad(r, 176, H, [[0, F(0.12)], [1, F(0.05)]]);
    }),
    scrolling('AIRSHIP DOCKS', 'A harbour in the sky: airships moored at mooring towers, flags snapping in the wind. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => { grad(r, 0, H, [[0, c('#1a3060')], [0.6, c('#7aa8d8')], [1, F(0.3)]]); clouds(r, 0, { y: 120, h: 50, col: c('#a8c8e8'), lit: CLOUD2, seed: 256, cut: 0.45 }); } },
      { rate: 0.12, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 240) * 240; wx < ox + W + 240; wx += 240) { const x = wx - ox + 60, y = 50 + mod(wx / 240, 3) * 14; for (let j = -9; j <= 9; j++) { const half = Math.floor(44 * Math.sqrt(1 - (j / 10) ** 2)); for (let i = -half; i <= half; i++) r.set(x + i, y + j, j < -5 ? F(0.32) : F(0.2)); } fillRect(r, x - 10, y + 10, 20, 5, F(0.14)); }
      } },
      { rate: 0.4, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 160) * 160; wx < ox + W + 160; wx += 160) {
          const x = wx - ox + 30;
          for (let y = 60; y < 182; y++) { r.set(x - 3 + Math.floor((y - 60) / 40), y, F(0.06)); r.set(x + 3 - Math.floor((y - 60) / 40), y, F(0.06)); if (y % 10 === 0) for (let i = -3; i <= 3; i++) r.set(x + i, y, F(0.06)); }
          fillRect(r, x - 4, 54, 9, 6, F(0.06)); line(r, x, 54, x, 40, F(0.06));
          for (let i = 0; i < 12; i++) for (let j = 0; j < 6 - Math.floor(i / 2); j++) r.set(x + 1 + i, 40 + j + Math.round(Math.sin(i * 0.8) * 1), i % 4 < 2 ? c('#ff5a4a') : c('#ffffff'));
          line(r, x, 70, x + 80, 110, F(0.06));
        }
        dark(r, 180, F(0.08));
      } }),
    still('CLIFF NESTS', 'Sheer sea cliffs where the birds nest, feathers drifting down past the ledges.', (r) => {
      grad(r, 0, H, [[0, c('#4a90d0')], [1, c('#d0e8f8')]]);
      for (const [x0, x1] of [[0, 150], [330, W]]) for (let x = x0; x < x1; x++) { const edge = x0 === 0 ? x1 - x : x - x0, top = 10 + Math.floor(noise1(x * 0.06, 257) * 16); for (let y = top; y < 178; y++) r.set(x, y, edge < 3 ? c('#3a3430') : pick([c('#6a625a'), c('#7e766c'), c('#544c46')], noise2(x * 0.1, y * 0.05, 258), x, y)); }
      for (const [x, y] of [[100, 60], [60, 110], [360, 80], [420, 130], [130, 150]]) { for (let i = -7; i <= 7; i++) r.set(x + i, y + Math.floor(Math.abs(i) / 3), c('#8a6a40')); for (let i = -5; i <= 5; i++) r.set(x + i, y - 1, c('#6a4a28')); r.set(x - 2, y - 2, CLOUD); r.set(x + 1, y - 2, CLOUD); }
      for (let i = 0; i < 14; i++) { const x = 160 + Math.floor(hash(i, 0, 259) * 160), y = Math.floor(hash(i, 1, 259) * 170); r.set(x, y, CLOUD); r.set(x + 1, y + 1, CLOUD2); }
      grad(r, 176, H, [[0, F(0.12)], [1, F(0.05)]]);
    }),
  ],
};

// ── PSYCHIC: Psi Man's dreaming mind ─────────────────────────────────

const psi = B('psi');
const P = (k) => tn(psi, k), P2 = (k) => tn(psi, k, 'secondary'), PINK = c('#f9a8d4'), HOT = c('#ea43bd');
/** Wireframe shapes turning slowly in the void: each drawn ahead of time at twelve turns. */
const SHAPES = {
  pieces() {
    const out = [], cube = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    const octa = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const oedges = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];
    for (const [name, pts, ed, size, col] of [['cube', cube, edges, 9, PINK], ['octa', octa, oedges, 13, c('#ffffff')]]) for (let k = 0; k < 12; k++) {
      const a = (k / 12) * (TAU / 4) * (name === 'cube' ? 1 : 2), r = new Raster(32, 32);
      const pr = ([x, y, z]) => { const X = x * Math.cos(a) - z * Math.sin(a), Z = x * Math.sin(a) + z * Math.cos(a), Y = y * Math.cos(0.5) - Z * Math.sin(0.5); return [Math.round(16 + X * size), Math.round(16 + Y * size)]; };
      for (const [i, j] of ed) { const [x0, y0] = pr(pts[i]), [x1, y1] = pr(pts[j]); line(r, x0, y0, x1, y1, col); }
      out.push([`${name}${k}`, r]);
    }
    return out;
  },
  at(ox, t) {
    return [['cube', 90, 50], ['octa', 260, 90], ['cube', 410, 40], ['octa', 520, 120]].map(([name, x, y], i) => [
      `${name}${Math.floor(mod(t, 240) / 20)}`, mod(x - ox, 560) - 56, y - 16 + Math.round(Math.sin(TAU * (t / 240 + i / 4)) * 4)]);
  },
};
function eye(r, cx, cy, w, h) {
  for (let j = -h; j <= h; j++) for (let i = -w; i <= w; i++) {
    if ((i / w) ** 2 + (j / h) ** 2 > 1 || Math.abs(j) > h * (1 - (i / w) ** 2) ** 0.6) continue;
    const d = Math.hypot(i, j);
    r.set(cx + i, cy + j, d < h * 0.32 ? c('#1a0a20') : d < h * 0.7 ? pick([HOT, PINK], d / (h * 0.7), cx + i, cy + j) : c('#fff4fa'));
  }
  r.set(cx - 3, cy - 4, c('#ffffff')); r.set(cx - 2, cy - 4, c('#ffffff')); r.set(cx - 3, cy - 3, c('#ffffff'));
}
const PSYCHIC = {
  id: 'psi', type: 'Psychic',
  materials: [
    ['A', 'CRYSTAL TILES', 'Magenta crystal tiles with a pink sheen, pink crystal shards and a door of psychic light.',
      material('tiles', { deep: '#2a1028', dark: '#58305a', base: '#7a427a', light: '#9a5c9a', hi: '#ffd0f0', cap0: '#ffe0f4', cap1: '#e890c8', void: '#14060f', thi: '#ffffff', tlight: '#f9a8d4', tdark: '#b03890' }, { size: 8, spikes: 'shards', door: 'energy' })],
    ['B', 'OBSERVATION FLOOR', 'Clean lilac lab panels with a white edge, prongs glowing pink at the tips and a lab hatch.',
      material('plates', { deep: '#1e1a26', dark: '#3a3448', base: '#544e64', light: '#746e86', hi: '#e8e0f4', cap0: '#f4f0fa', cap1: '#c0b8d0', glow: '#ea43bd', glow2: '#f9a8d4', thi: '#ffffff', tlight: '#c0b8d0', tdark: '#544e64' }, { spikes: 'prongs', door: 'hatch' })],
    ['C', 'DREAMSTONE', 'Violet stone with pink light glowing in its cracks, glowing pink glass shards and an arch of pink glass.',
      material('strata', { deep: '#1e1024', dark: '#4a3254', base: '#6a4674', mid: '#76507e', light: '#8a5c94', hi: '#ffd8f8', cap0: '#f8d0f0', cap1: '#d090c0', glow: '#ea43bd', glow2: '#ffc0e8', void: '#100818', obs0: '#1a0a1a', obs1: '#4a2048', obs2: '#ea43bd', obs3: '#ffe0f8', mortar: '#f9a8d4' }, { cracks: true, spikes: 'glass', door: 'arch' })],
  ],
  backdrops: [
    scrolling('COSMIC VOID', 'The deep void of the mind: a nebula, far stars, and shapes turning slowly as they float. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => { grad(r, 0, H, [[0, c('#06020e')], [0.5, P(0.14)], [1, c('#06020e')]]); for (let y = 0; y < 176; y++) for (let x = 0; x < W; x++) { const v = noise2(x * 0.012, y * 0.02, 260) * noise2(x * 0.06, y * 0.12, 261) * noise2(x * 0.15, y * 0.3, 272); if (v > 0.12) r.set(x, y, pick([P(0.14), P(0.24), P2(0.4)], (v - 0.12) * 4, x, y)); } } },
      { rate: 0.05, period: 480, fixed: (r, ox) => stars(r, 262, 120, 176, P2(0.6), c('#ffffff'), ox) },
      { rate: 0.15, parts: [SHAPES], fixed: (r) => dark(r, 180, c('#06020e')), period: 480 }),
    still('CRYSTAL TEMPLE', 'A temple of white pillars with pink crystals growing from them, light glowing up from the floor.', (r) => {
      grad(r, 0, H, [[0, P(0.08)], [0.7, P(0.24)], [1, P(0.08)]]);
      for (const x of [40, 150, 260, 370]) {
        fillRect(r, x, 30, 26, 148, c('#d8d0e0')); vert(r, x, 30, 178, c('#ffffff')); vert(r, x + 25, 30, 178, c('#9a90b0')); fillRect(r, x - 6, 24, 38, 8, c('#e8e0f0')); fillRect(r, x - 4, 170, 34, 8, c('#c8c0d8'));
        for (let k = 0; k < 4; k++) { const cx = x + 4 + k * 6, h = 12 + Math.floor(hash(k, x, 263) * 18), y0 = 90 + Math.floor(hash(x, k, 264) * 50); for (let j = 0; j < h; j++) for (let i = -Math.floor((h - j) / 5); i <= Math.floor((h - j) / 5); i++) r.set(cx + i, y0 - j, i < 0 ? c('#ffd0f0') : i > 0 ? HOT : PINK); }
      }
      halo(r, 240, 178, 120, PINK, 0.4);
      dark(r, 178, P(0.06));
    }),
    still('THE WATCHING EYE', 'Soft dream clouds parting around one enormous eye, watching.', (r) => {
      grad(r, 0, H, [[0, c('#ffd8f0')], [0.5, c('#e8b0e8')], [1, P(0.2)]]);
      eye(r, 240, 76, 70, 40);
      for (const [y, seed, col, lit] of [[0, 265, c('#fff0fa'), c('#ffffff')], [96, 266, c('#f0c8ec'), c('#fff0fa')], [130, 267, c('#d8a0d8'), c('#f0c8ec')]]) clouds(r, 0, { y, h: 56, col, lit, seed, cut: 0.44 });
      grad(r, 172, H, [[0, P(0.1)], [1, P(0.04)]]);
    }),
    still('MIRROR HALL', 'A hall of mirrors: arch after arch shrinking into the distance, each a little more pink.', (r) => {
      fillRect(r, 0, 0, W, H, P(0.06));
      for (let k = 7; k >= 0; k--) {
        const s = 1 - k * 0.11, w = Math.round(220 * s), h = Math.round(170 * s), x0 = 240 - w / 2, y0 = 178 - h, col = mix(P(0.12 + k * 0.04), PINK, k * 0.06);
        for (let y = y0; y < 178; y++) for (let x = x0; x < x0 + w; x++) { const dx = x - 240, top = y0 + w / 2 - Math.sqrt(Math.max(0, (w / 2) ** 2 - dx * dx)); if (y >= top && y < top + 3) r.set(x, y, col); if ((x - x0 < 3 || x0 + w - x <= 3) && y > y0 + w / 2) r.set(x, y, col); }
      }
      for (let y = 150; y < 178; y++) for (let x = 0; x < W; x++) if ((x + y) % 9 === 0) r.set(x, y, P(0.2));
      dark(r, 178, P(0.05));
    }),
    scrolling('MIND WAVES', 'Rings and bands of psychic light pulsing out across the dark, layer behind layer. Scrolls in three layers.', 240,
      { rate: 0, fixed: (r) => { fillRect(r, 0, 0, W, H, P(0.05)); for (let y = 0; y < 180; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - 240, y - 80); if (Math.floor(d / 6) % 4 === 0) r.set(x, y, P(0.14)); } } },
      { rate: 0.1, period: 480, fixed: (r, ox) => { for (let y = 20; y < 160; y++) for (let x = 0; x < W; x++) { const v = Math.sin((x + ox) * TAU / 96 + y * 0.08); if (v > 0.92 && y % 2 === 0) r.set(x, y, P2(0.6)); } } },
      { rate: 0.3, period: 480, fixed: (r, ox) => { for (let x = 0; x < W; x++) { const yc = 140 + Math.round(Math.sin((x + ox) * TAU / 240) * 16); for (let j = 0; j < 4; j++) r.set(x, yc + j * 6, j % 2 ? HOT : PINK); } dark(r, 178, P(0.05)); } }),
    still('OBSERVATION LAB', 'A sterile lab: white panelled walls, one-way glass with someone watching, a shape turning on a plinth.', (r) => {
      panels(r, 0, { pw: 40, ph: 44, base: c('#d8d4e0'), light: c('#f0eef4'), dark: c('#b0aabc') });
      fillRect(r, 120, 40, 240, 90, c('#2a2438')); for (let x = 120; x < 360; x++) { r.set(x, 40, c('#9a90a8')); r.set(x, 129, c('#9a90a8')); }
      for (let y = 40; y < 130; y++) for (let x = 120; x < 360; x++) if ((x - y) % 40 < 3 && y < 90) r.set(x, y, c('#4a4060'));
      for (const x of [180, 290]) { fillRect(r, x, 70, 18, 60, c('#1a1424')); disc(r, x + 9, 66, 9, [c('#1a1424'), c('#1a1424'), c('#1a1424')]); }
      fillRect(r, 410, 150, 30, 28, c('#b8b0c8')); for (const [x0, y0, x1, y1] of [[425, 120, 440, 135], [440, 135, 425, 150], [425, 150, 410, 135], [410, 135, 425, 120], [425, 120, 425, 150], [410, 135, 440, 135]]) line(r, x0, y0, x1, y1, HOT);
      fillRect(r, 0, 160, W, 18, c('#a8a2b4'));
      dark(r, 178, P(0.06));
    }),
  ],
};

// ── BUG: Swarm Man's hive country ────────────────────────────────────

const swarm = B('swarm');
const Z = (k) => tn(swarm, k), Z2 = (k) => tn(swarm, k, 'secondary'), AMBER = c('#e8a820'), HONEY = c('#ffd860');
/** Bees buzzing about in loops that close every loop of the picture. */
const BEES = {
  pieces() {
    const make = (wings) => { const r = new Raster(7, 6); for (const [x, y, k] of [[2, 3, 0], [3, 3, 1], [4, 3, 0], [5, 3, 1], [2, 4, 0], [3, 4, 1], [4, 4, 0], [5, 4, 1], [6, 3, 2]]) r.set(x, y, [c('#1a1404'), HONEY, c('#1a1404')][k]); for (const [x, y] of wings ? [[3, 1], [4, 1], [3, 2], [4, 2]] : [[2, 2], [3, 2], [4, 2], [5, 2]]) r.set(x, y, c('#e8f8ff')); return r; };
    return [['bee0', make(true)], ['bee1', make(false)]];
  },
  at(ox, t) {
    const out = [];
    for (let i = 0; i < 9; i++) {
      const cx = 40 + i * 58, cy = 50 + (i % 4) * 26, a = TAU * (t / 240);
      out.push([`bee${Math.floor(t / 2 + i) & 1}`, mod(cx + Math.round(Math.sin(a * 2 + i) * 22) - ox, 560) - 40, cy + Math.round(Math.sin(a * 3 + i * 1.3) * 9)]);
    }
    return out;
  },
};
/** Ants marching nose to tail along the tunnels, legs going: evenly spaced, so the march loops. */
const ANTS = {
  pieces() {
    const make = (step) => { const r = new Raster(7, 4); for (const [x, y] of [[0, 1], [1, 1], [2, 1], [3, 1], [4, 0], [5, 0], [5, 1], [6, 1]]) r.set(x, y, c('#120e04')); for (const x of step ? [1, 3, 5] : [0, 2, 4]) r.set(x, 2 + (x % 2), c('#120e04')); return r; };
    return [['ant0', make(0)], ['ant1', make(1)]];
  },
  at(ox, t) {
    const out = [], legs = `ant${Math.floor(t / 6) & 1}`;
    for (const [y, dir] of [[78, 1], [128, -1], [160, 1]]) {
      const lead = mod(Math.floor(dir * t * 0.25) - ox, 12);   // every ant alike, 12 apart: the line looks the same every 48 steps
      for (let x = lead - 12; x < W + 12; x += 12) out.push([legs, x, y]);
    }
    return out;
  },
};
function web(r, cx, cy, rad, col) {
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; line(r, cx, cy, cx + Math.round(Math.cos(a) * rad), cy + Math.round(Math.sin(a) * rad), col); }
  for (let rr = 6; rr < rad; rr += 6) for (let a = 0; a < TAU; a += 0.04) if (hash(Math.round(a * 50), rr, cx) > 0.1) r.set(cx + Math.round(Math.cos(a) * rr), cy + Math.round(Math.sin(a) * rr), col);
  for (let i = 0; i < 10; i++) { const a = hash(i, 0, cx) * TAU, rr = hash(i, 1, cx) * rad; r.set(cx + Math.round(Math.cos(a) * rr), cy + Math.round(Math.sin(a) * rr), c('#ffffff')); }
}
const BUG = {
  id: 'swarm', type: 'Bug',
  materials: [
    ['A', 'HONEYCOMB', 'Wax comb in offset rows, some cells full of honey, under a waxy rim; stinger spikes and a wax arch.',
      material('comb', { deep: '#2a1e06', dark: '#4a3608', base: '#7a5a18', light: '#a07a28', hi: '#f0d060', cap0: '#f8e070', cap1: '#d0a838', glow: '#b87a10', glow2: '#e0a830', void: '#160e02', thi: '#f8f0d0', tlight: '#c8b060', tdark: '#6a5020' }, { spikes: 'cones', door: 'arch' })],
    ['B', 'CHITIN PLATES', 'Dark green shell plates with a lime sheen, chitin spikes and a segmented shell door.',
      material('plates', { deep: '#121806', dark: '#2e3c12', base: '#465a20', light: '#5e7430', hi: '#b8dc28', cap0: '#d8f070', cap1: '#a8c838', thi: '#e8ffa0', tlight: '#8aa030', tdark: '#3a4a14' }, { spikes: 'shards', door: 'shutter' })],
    ['C', 'ROTTING LOG', 'A fallen log, bark furred with moss along the top, bramble thorns and a leafy opening.',
      material('planks', { deep: '#160e06', dark: '#3e2a16', base: '#5e4428', light: '#7a5a38', hi: '#9a7a50', cap0: '#a8d848', cap1: '#6a9a28', rope: '#9ad040', leafDark: '#2a4a14', leaf: '#3e6a1e', leafLight: '#6a9a30', void: '#0a0804', thi: '#c8e070', tlight: '#6a8a30', tdark: '#3a5018' }, { spikes: 'thorns', door: 'hedge' })],
  ],
  backdrops: [
    scrolling('GIANT HIVE', 'Inside a giant hive: comb walls far off, larva sacs hanging nearer, bees buzzing everywhere. Scrolls in three layers.', 240,
      { rate: 0.05, period: 480, fixed: (r, ox) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const wx = x + ox, row = Math.floor(y / 8), lx = mod(wx + (row & 1) * 6, 12), ly = y % 8; r.set(x, y, ly === 0 || lx === 0 ? Z2(0.34) : pick([Z2(0.26), mix(Z2(0.28), AMBER, 0.2)], hash(mod(Math.floor((wx + (row & 1) * 6) / 12), 40), row, 268), x, y)); } } },
      { rate: 0.2, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 80) * 80; wx < ox + W + 80; wx += 80) {
          const k = mod(wx / 80, 12), x = wx - ox + Math.floor(hash(k, 0, 269) * 40), len = 30 + Math.floor(hash(k, 1, 269) * 60);
          vert(r, x, 0, len, Z2(0.2));
          for (let j = 0; j < 22; j++) { const half = Math.round(8 * Math.sin((j / 22) * Math.PI)); for (let i = -half; i <= half; i++) r.set(x + i, len + j, i < -half / 2 ? c('#fff0c0') : c('#e8d8a0')); }
        }
      }, parts: [BEES] },
      { rate: 0.4, period: 960, fixed: (r, ox) => { for (let x = 0; x < W; x++) { const top = 168 - Math.round(seamless((w) => noise1(w * 0.05, 270), x + ox, 960) * 10); for (let y = top; y < 184; y++) r.set(x, y, y === top ? AMBER : Z2(0.16)); } dark(r, 182, Z2(0.08)); } }),
    still('LEAF CANOPY', 'Looking up from the forest floor into enormous leaves, beetles crawling on them, green light leaking through.', (r) => {
      grad(r, 0, H, [[0, c('#c8f0a0')], [0.6, Z(0.4)], [1, Z(0.1)]]);
      for (const [cx, cy, w, h, a] of [[100, 30, 120, 50, 0.3], [330, 50, 150, 60, -0.25], [220, 110, 110, 40, 0.15], [440, 120, 90, 36, -0.4]]) {
        for (let j = -h; j <= h; j++) for (let i = -w; i <= w; i++) { const u = i * Math.cos(a) + j * Math.sin(a), v = -i * Math.sin(a) + j * Math.cos(a); if (Math.abs(u) >= w || (u / w) ** 2 + (v / (h * (1 - (u / w) ** 2) ** 0.5 + 1)) ** 2 > 1) continue; r.set(cx + i, cy + j, Math.abs(v) < 1 || (Math.abs(Math.round(u) % 14) < 1 && Math.abs(v) < h * 0.8) ? Z(0.6) : pick([Z(0.28), Z(0.36)], 0.5 + v / h * 0.5, cx + i, cy + j)); }
        fillRect(r, cx + 10, cy - 4, 8, 6, c('#1a2408')); r.set(cx + 18, cy - 2, c('#1a2408'));
      }
      dark(r, 178, Z(0.06));
    }),
    scrolling('ANT TUNNELS', 'A cut through the soil: tunnels and chambers, ants marching along them in lines. Scrolls in two layers.', 240,
      { rate: 0.1, period: 960, fixed: (r, ox) => {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) r.set(x, y, y < 24 ? c('#a8d8f0') : y < 30 ? Z(0.4) : pick([Z2(0.24), Z2(0.32), Z2(0.18)], seamless((w) => noise2(w * 0.08, y * 0.08, 271), x + ox, 960), x, y));
        for (const [ty, h] of [[74, 8], [124, 8], [156, 8]]) for (let x = 0; x < W; x++) { const wy = ty + Math.round(Math.sin((x + ox) * TAU / 240) * 2); for (let j = 0; j < h; j++) r.set(x, wy + j, j === 0 ? Z2(0.1) : mix(Z2(0.5), AMBER, 0.25)); }
        for (let wx = Math.floor(ox / 240) * 240; wx < ox + W + 240; wx += 240) { const cx = wx - ox + 120; for (let j = -14; j <= 14; j++) for (let i = -26; i <= 26; i++) if ((i / 26) ** 2 + (j / 14) ** 2 <= 1) r.set(cx + i, 100 + j, mix(Z2(0.5), AMBER, 0.25)); for (let i = -6; i <= 6; i++) for (let j = 0; j < 4; j++) if (i * i / 36 + j * j / 16 <= 1) r.set(cx + i, 110 - j, c('#f8f0d8')); }
      }, parts: [ANTS] },
      { rate: 0.1, period: 960, fixed: (r) => dark(r, 178, Z2(0.06)) }),
    still('WEB FOREST', 'Dark trunks strung with giant spider webs, dew beading on every thread.', (r) => {
      grad(r, 0, H, [[0, Z(0.12)], [0.6, Z(0.24)], [1, Z(0.06)]]);
      for (const x of [30, 150, 300, 430]) fillRect(r, x, 0, 18, 178, Z2(0.1));
      web(r, 95, 70, 50, c('#d8e8d0')); web(r, 230, 110, 60, c('#c8d8c0')); web(r, 370, 60, 44, c('#d8e8d0'));
      dark(r, 178, Z(0.05));
    }),
    still('TERMITE MOUNDS', 'Savanna at dusk: tall termite mounds standing like towers, a lone acacia tree.', (r) => {
      grad(r, 0, H, [[0, c('#3a2a5a')], [0.5, c('#e08050')], [0.8, c('#f0c070')], [1, Z(0.1)]]);
      disc(r, 380, 100, 20, [c('#fff0b0'), c('#ffd080'), c('#ff9a50')]);
      for (const [x, h, w] of [[60, 90, 26], [140, 60, 18], [250, 110, 30], [330, 50, 16]]) for (let j = 0; j < h; j++) { const half = Math.round(w / 2 * (0.4 + 0.6 * (j / h)) + Math.sin(j * 0.4) * 1.5); for (let i = -half; i <= half; i++) r.set(x + i, 178 - h + j, Z2(0.1)); }
      vert(r, 430, 120, 178, Z2(0.06)); vert(r, 431, 120, 178, Z2(0.06)); for (let i = -30; i <= 30; i++) for (let j = 0; j < 6 - Math.abs(i) / 8; j++) r.set(430 + i, 116 + j, Z2(0.06));
      dark(r, 178, Z(0.05));
    }),
    still('SHELL CAVERN', 'A cavern walled with huge beetle shells, their curved plates shining green and violet.', (r) => {
      fillRect(r, 0, 0, W, H, Z(0.05));
      for (let k = 0; k < 9; k++) {
        const cx = 30 + k * 56, cy = 40 + (k % 3) * 40, rx = 34, ry = 46;
        for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
          if ((i / rx) ** 2 + (j / ry) ** 2 > 1) continue;
          const sheen = 0.5 + 0.5 * Math.sin((i + j) * 0.12 + k);
          r.set(cx + i, cy + j, i === 0 ? Z(0.02) : pick([Z(0.12), Z(0.24), mix(Z(0.3), c('#a060d0'), 0.5)], sheen, cx + i, cy + j));
        }
      }
      dark(r, 176, Z(0.04));
    }),
  ],
};

export const BATCH2 = [ICE, POISON, GROUND, FLYING, PSYCHIC, BUG];
