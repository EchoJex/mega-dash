/**
 * BATCH 1 OF THE PER-SLICE WORLD PIECES — Typeless, Fire, Water, Electric, Grass, Fighting.
 * VARIANTS FOR THE OWNER TO PICK FROM; NONE OF THIS IS IN THE GAME.
 *
 * Drawn by Claude at the owner's request, 2026-11-05. Each slice: six backdrops (two of them
 * scrolling in layers) and three materials, each a floor, platform, spike bed, boss door and
 * exit door. Colours come from the boss's own primary and secondary, so an area still tells you
 * whose door is coming; floors keep the game's contrast floors against every backdrop.
 */

import { BOSSES } from '../../src/data/bosses.js';
import { material } from './materials.mjs';
import { grad, fillRect, stars, disc, halo, ridge, skyline, trees, beam, rain, clouds, embers, bolt, panels, tn, mix, c } from './backdrops.mjs';
import { hash, noise1, noise2, pick } from '../../src/systems/arena-art/pixels.js';
import { W, H, FLOOR } from './variants.mjs';

const B = (id) => BOSSES.find((b) => b.id === id);
const still = (name, desc, paint) => ({ name, desc, moving: false, layers: [{ rate: 0, paint }] });
const moving = (name, desc, ...layers) => ({ name, desc, moving: true, layers: layers.map(([rate, paint]) => ({ rate, paint })) });
const line = (r, x0, y0, x1, y1, col) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) r.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), col);
};
const vert = (r, x, y0, y1, col) => { for (let y = y0; y < y1; y++) r.set(x, y, col); };
const wrapX = (wx, ox, period) => ((((wx - ox) % period) + period) % period);

// ── Shapes several backdrops share ───────────────────────────────────

function pylon(r, x, base, h, col, lamp) {
  for (let j = 0; j < h; j++) {
    const half = Math.round(2 + (j / h) * 8);
    r.set(x - half, base - j, col); r.set(x + half, base - j, col);
    if (j % 8 === 0) for (let i = -half; i <= half; i++) r.set(x + i, base - j, col);
    if (j % 8 < 4) { r.set(x - half + (j % 8), base - j, col); r.set(x + half - (j % 8), base - j, col); }
  }
  for (let i = -12; i <= 12; i++) { r.set(x + i, base - h, col); r.set(x + i, base - h + 6, col); }
  if (lamp) { r.set(x - 12, base - h + 1, lamp); r.set(x + 12, base - h + 1, lamp); r.set(x - 12, base - h + 7, lamp); r.set(x + 12, base - h + 7, lamp); }
}
function wire(r, x0, x1, y, sag, col) {
  for (let x = x0; x <= x1; x++) { const t = (x - x0) / Math.max(1, x1 - x0); r.set(x, Math.round(y + sag * 4 * t * (1 - t)), col); }
}
function column(r, x, top, w, cols) {
  for (let y = top; y < FLOOR; y++) for (let i = 0; i < w; i++) r.set(x + i, y, i === 0 ? cols[0] : i === w - 1 ? cols[2] : cols[1]);
}

// ── TYPELESS: Proto Mk0's proving ground ─────────────────────────────

const proto = B('proto');
const TYPELESS = {
  id: 'proto', type: 'Typeless',
  pick: { backdrop: 2, material: 'A' },   // the owner, 5 Nov 2026: "2+A"
  materials: [
    ['A', 'BUNKER CONCRETE', 'Poured slabs with expansion joints, a yellow-and-black hazard band under the lip, rusty rebar spikes and a blast hatch for a door.',
      material('concrete', { deep: '#2a2e33', dark: '#4a5058', base: '#5e656e', light: '#7a828c', hi: '#b8c0c8', cap0: '#d4dadf', cap1: '#a9b1b9', stripeA: '#e8c020', stripeB: '#2a2a2a', rust: '#8a4a2a', thi: '#e0d0c0', tlight: '#b07850', tdark: '#6a4028' }, { hazard: true, door: 'hatch', spikes: 'spears' })],
    ['B', 'DIAMOND PLATE', 'Studded floor plate on steel beams, polished steel cones and a slatted shutter.',
      material('plates', { deep: '#262b31', dark: '#3d444d', base: '#59626d', light: '#74808c', hi: '#c8d2dc', cap0: '#e2e8ee', cap1: '#a8b4c0', thi: '#f4f8fa', tlight: '#c9d3db', tdark: '#8d9aa6' }, { diamond: true })],
    ['C', 'STEEL GRATING', 'Open grating over darkness on heavy beams, prongs with warning-red tips and a field door.',
      material('grating', { deep: '#23272c', dark: '#3a4048', base: '#5a626c', light: '#7c8692', hi: '#c0c8d0', cap0: '#dde3e8', cap1: '#a2acb6', void: '#0d0f12', thi: '#e8eef2', tlight: '#9aa4ae', tdark: '#5a626c', glow: '#ff4a32', glow2: '#ff9a80' }, { door: 'energy' })],
  ],
  backdrops: [
    still('TEST RANGE', 'Dusk over a proving ground: low bunkers with warning lights and floodlight towers.', (r) => {
      grad(r, 0, H, [[0, tn(proto, 0.07)], [0.72, tn(proto, 0.28)], [1, tn(proto, 0.1)]]);
      skyline(r, 0, { y: 176, minH: 6, maxH: 18, col: tn(proto, 0.1), lit: c('#ff4a32'), cw: 18, gap: 0.35, rate: 0.04, seed: 11 });
      fillRect(r, 0, 176, W, 48, tn(proto, 0.07));
      for (const x of [70, 250, 410]) {
        vert(r, x, 96, 176, tn(proto, 0.06)); vert(r, x + 1, 96, 176, tn(proto, 0.08));
        fillRect(r, x - 4, 92, 10, 4, tn(proto, 0.06));
        for (let i = -3; i <= 4; i += 2) r.set(x + i, 93, c('#e8e4c8'));
        beam(r, x, 96, Math.PI / 2, 0.22, 90, tn(proto, 0.24), 0.28);
      }
    }),
    moving('HANGAR', 'Inside a test hangar: wall panels far off, girders nearer, lamps swinging closest. Scrolls in three layers.',
      [0.12, (r, b, ox) => { panels(r, ox, { pw: 40, ph: 60, base: tn(proto, 0.16), light: tn(proto, 0.23), dark: tn(proto, 0.09) }); fillRect(r, 0, 172, W, 52, tn(proto, 0.06)); }],
      [0.35, (r, b, ox) => {
        for (let x = 0; x < W; x++) { const wx = x + ox; r.set(x, 22, tn(proto, 0.05)); r.set(x, 23, tn(proto, 0.05)); r.set(x, 52, tn(proto, 0.05)); r.set(x, 53, tn(proto, 0.05));
          const k = ((wx % 30) + 30) % 30; r.set(x, 24 + k, tn(proto, 0.05)); r.set(x, 52 - k, tn(proto, 0.05)); }
      }],
      [0.6, (r, b, ox) => {
        for (let lx = Math.floor(ox / 160) * 160; lx < ox + W + 160; lx += 160) {
          const x = lx - ox + 60;
          vert(r, x, 0, 70, tn(proto, 0.04)); fillRect(r, x - 5, 70, 11, 4, tn(proto, 0.04)); fillRect(r, x - 3, 74, 7, 1, c('#f0e0a0'));
          beam(r, x, 75, Math.PI / 2, 0.3, 70, c('#6a6450'), 0.2);
        }
      }]),
    still('BLUEPRINT', 'The drone that started it all, drawn up on a design grid.', (r) => {
      fillRect(r, 0, 0, W, H, tn(proto, 0.09));
      for (let y = 0; y < 176; y++) for (let x = 0; x < W; x++) {
        if (x % 48 === 0 || y % 48 === 0) r.set(x, y, tn(proto, 0.2)); else if (x % 12 === 0 || y % 12 === 0) r.set(x, y, tn(proto, 0.13));
      }
      const ink = tn(proto, 0.32);
      const ring = (cx, cy, rad) => { for (let a = 0; a < 360; a += 1) { const t = (a * Math.PI) / 180; r.set(Math.round(cx + Math.cos(t) * rad), Math.round(cy + Math.sin(t) * rad), ink); } };
      ring(330, 86, 34); ring(330, 86, 12); ring(280, 40, 16); ring(380, 40, 16); ring(280, 132, 16); ring(380, 132, 16);
      line(r, 296, 52, 314, 70, ink); line(r, 364, 52, 346, 70, ink); line(r, 296, 120, 314, 102, ink); line(r, 364, 120, 346, 102, ink);
      line(r, 60, 150, 200, 150, ink); line(r, 60, 146, 60, 154, ink); line(r, 200, 146, 200, 154, ink);
      fillRect(r, 0, 176, W, 48, tn(proto, 0.06));
    }),
    still('SEARCHLIGHTS', 'Night over the perimeter: stars, two crossing searchlights, a sandbag wall.', (r) => {
      grad(r, 0, H, [[0, tn(proto, 0.03)], [0.8, tn(proto, 0.12)], [1, tn(proto, 0.07)]]);
      stars(r, 21, 60, 120, tn(proto, 0.3), c('#e8ecf0'));
      beam(r, 90, 184, -1.15, 0.07, 260, tn(proto, 0.45), 0.5);
      beam(r, 390, 184, -2.05, 0.07, 260, tn(proto, 0.45), 0.5);
      ridge(r, 0, { y: 182, amp: 8, f: 0.18, seed: 22, col: tn(proto, 0.05), top: tn(proto, 0.09) });
    }),
    moving('RADAR RIDGES', 'Ridges of a listening post: dishes and masts with blinking tips. Scrolls in three layers.',
      [0.06, (r) => { grad(r, 0, H, [[0, tn(proto, 0.06)], [0.66, tn(proto, 0.27)], [1, tn(proto, 0.08)]]); stars(r, 31, 40, 90, tn(proto, 0.28), c('#dde2e8')); }],
      [0.15, (r, b, ox) => ridge(r, ox, { y: 140, amp: 40, f: 0.012, seed: 32, col: tn(proto, 0.15), top: tn(proto, 0.24) })],
      [0.4, (r, b, ox) => {
        ridge(r, ox, { y: 172, amp: 22, f: 0.02, seed: 33, col: tn(proto, 0.08), top: tn(proto, 0.15) });
        for (let wx = Math.floor(ox / 200) * 200; wx < ox + W + 200; wx += 200) {
          const x = wx - ox + 80, base = 150;
          vert(r, x, base - 30, base + 20, tn(proto, 0.05));
          for (let a = -70; a <= 70; a++) { const t = (a * Math.PI) / 180; r.set(Math.round(x + Math.sin(t) * 14), Math.round(base - 34 + Math.cos(t) * 7), tn(proto, 0.05)); }
          r.set(x, base - 46, c('#ff4a32')); vert(r, x, base - 45, base - 30, tn(proto, 0.05));
        }
      }]),
    still('CONTROL ROOM', 'A wall of monitors watching the range, a console with blinking lights.', (r) => {
      fillRect(r, 0, 0, W, H, tn(proto, 0.07));
      for (let row = 0; row < 4; row++) for (let col = 0; col < 15; col++) {
        const x = 6 + col * 32, y = 24 + row * 30;
        fillRect(r, x, y, 28, 24, tn(proto, 0.04));
        fillRect(r, x + 2, y + 2, 24, 20, tn(proto, 0.14));
        const kind = hash(col, row, 41);
        for (let i = 0; i < 24; i++) {
          const yy = kind < 0.5 ? Math.round(y + 12 + Math.sin(i * 0.5 + col) * 6) : y + 4 + ((i * 7 + col * 3) % 16);
          r.set(x + 2 + i, yy, c('#8aa898'));
        }
      }
      fillRect(r, 0, 150, W, 74, tn(proto, 0.04));
      for (let i = 0; i < 40; i++) r.set(10 + Math.floor(hash(i, 0, 42) * 460), 156 + Math.floor(hash(i, 1, 42) * 14), hash(i, 2, 42) > 0.7 ? c('#ff4a32') : c('#e8c020'));
    }),
  ],
};

// ── FIRE: Blaze Man's volcanic approach ──────────────────────────────

const blaze = B('blaze');
const LAVA = [c('#801808'), c('#e85a1a'), c('#ffb030'), c('#ffe080')];
function volcano(r, x, base, h, col) {
  for (let j = 0; j < h; j++) {
    const half = Math.round(8 + j * 1.6), y = base - h + j;
    for (let i = -half; i <= half; i++) r.set(x + i, y, col);
  }
  for (let j = 0; j < h * 0.7; j++) { const y = base - h + j; if (hash(j, x, 3) > 0.35) r.set(x + Math.round(Math.sin(j * 0.3) * 3), y, LAVA[j < 6 ? 2 : 1]); }
  for (let i = -6; i <= 6; i++) r.set(x + i, base - h, LAVA[3]);
}
const FIRE = {
  id: 'blaze', type: 'Fire',
  // The owner, 5 Nov 2026: "5c but remove the fast moving layer of embers, and have the embers slowly
  // drift downward. spikes should be a shiny jet black obsidian glass. doorway should use be a stone
  // arch made of obsidian glass with tera cotta colored mortar"
  pick: { backdrop: 5, material: 'C' },
  materials: [
    ['A', 'BASALT AND LAVA', 'Dark volcanic rock with lava glowing through its cracks, obsidian shards with hot tips, a stone arch.',
      material('strata', { deep: '#1e1416', dark: '#4a3a3a', base: '#685654', mid: '#74605d', light: '#806c68', hi: '#e8d0b8', cap0: '#d8bca8', cap1: '#b09484', glow: '#e85a1a', glow2: '#ffd040', void: '#140606', thi: '#ffb070', tlight: '#8a5a50', tdark: '#4a3030' }, { cracks: true })],
    ['B', 'FIRE BRICK', 'Kiln bricks in burnt orange under a pale lip, iron spears and a portcullis.',
      material('bricks', { deep: '#2a1410', dark: '#6a2c1c', base: '#a0482c', alt: '#8c3e26', light: '#c06040', hi: '#f0c0a0', cap0: '#e8b090', cap1: '#c88468', thi: '#ffe0a0', tlight: '#c0a080', tdark: '#6a5040' })],
    ['C', 'GRATE OVER COALS', 'An iron grate with coals glowing underneath, shiny jet-black obsidian glass for spikes, and an arch of obsidian glass blocks with terracotta mortar.',
      material('grating', { deep: '#1a1414', dark: '#33292a', base: '#57494a', light: '#786566', hi: '#b09090', cap0: '#d8c0b8', cap1: '#a89088', void: '#120808', glow: '#e85a1a', glow2: '#ffb030',
        obs0: '#0b0a10', obs1: '#2c2a3a', obs2: '#8a8ca8', obs3: '#f4f6ff', mortar: '#cc6a44' }, { under: 'coals', spikes: 'glass', door: 'arch' })],
  ],
  backdrops: [
    moving('VOLCANO RANGE', 'Far volcanoes with lava running down them, a ridge nearer, black spires closest. Scrolls in three layers.',
      [0.05, (r) => { grad(r, 0, H, [[0, tn(blaze, 0.04)], [0.6, tn(blaze, 0.2)], [1, tn(blaze, 0.08)]]); clouds(r, 0, { y: 8, h: 50, col: tn(blaze, 0.08), lit: tn(blaze, 0.13), seed: 51, cut: 0.52 }); }],
      [0.12, (r, b, ox) => { for (let wx = Math.floor(ox / 220) * 220; wx < ox + W + 220; wx += 220) volcano(r, wx - ox + 100 + Math.floor(hash(wx, 0, 52) * 40), 160, 60 + Math.floor(hash(wx, 1, 52) * 30), tn(blaze, 0.09)); }],
      [0.3, (r, b, ox) => ridge(r, ox, { y: 172, amp: 22, f: 0.025, seed: 53, col: tn(blaze, 0.05), top: c('#6a1808') })],
      [0.6, (r, b, ox) => ridge(r, ox, { y: 190, amp: 26, f: 0.06, seed: 54, col: c('#120606'), sharp: 0.8 })]),
    still('LAVA SEA', 'A molten sea on the horizon under a red sky, black rock shore, embers rising.', (r) => {
      grad(r, 0, 112, [[0, tn(blaze, 0.04)], [1, tn(blaze, 0.22)]]);
      for (let y = 112; y < 140; y++) for (let x = 0; x < W; x++) {
        const v = 0.85 - (y - 112) / 34 + 0.3 * (noise2(x * 0.08, y * 0.3, 55) - 0.5);
        r.set(x, y, pick(LAVA, v, x, y));
      }
      ridge(r, 0, { y: 150, amp: 14, f: 0.03, seed: 56, col: c('#140808'), top: c('#a03010') });
      embers(r, 57, 90, [LAVA[1], LAVA[2], c('#6a1808')], 110);
    }),
    still('FORGE', 'Inside a forge: brick walls, two roaring furnace mouths, chains and an anvil.', (r) => {
      panels(r, 0, { pw: 16, ph: 8, base: tn(blaze, 0.1), light: tn(blaze, 0.14), dark: tn(blaze, 0.05) });
      for (const cx of [120, 360]) {
        for (let y = 60; y < 150; y++) for (let x = cx - 34; x <= cx + 34; x++) {
          const dx = x - cx, top = 60 + 34 - Math.sqrt(Math.max(0, 34 * 34 - dx * dx));
          if (y < top) continue;
          const v = 0.95 - (y - 60) / 110 + 0.2 * (noise2(x * 0.1, y * 0.15, 58) - 0.5);
          r.set(x, y, pick(LAVA, v, x, y));
          if ((x - cx + 40) % 8 === 0) r.set(x, y, c('#2a0c06'));
        }
      }
      for (const x of [40, 240, 440]) for (let y = 0; y < 70; y++) if (y % 4 !== 3) { r.set(x, y, tn(blaze, 0.04)); r.set(x + 1, y, tn(blaze, 0.07)); }
      fillRect(r, 0, 164, W, 60, tn(blaze, 0.05));
      fillRect(r, 216, 150, 48, 8, c('#160a08')); fillRect(r, 230, 158, 20, 18, c('#160a08')); fillRect(r, 210, 176, 60, 8, c('#160a08'));
    }),
    still('SMOKESTACKS', 'A foundry skyline under a burning sky: chimneys with flames, smoke rolling over.', (r) => {
      grad(r, 0, H, [[0, tn(blaze, 0.06)], [0.55, tn(blaze, 0.22)], [1, tn(blaze, 0.09)]]);
      clouds(r, 0, { y: 4, h: 60, col: tn(blaze, 0.08), lit: tn(blaze, 0.12), seed: 59, f: 0.035, cut: 0.48 });
      skyline(r, 0, { y: 184, minH: 22, maxH: 60, col: c('#120808'), lit: c('#ff8a30'), cw: 14, gap: 0.1, rate: 0.06, seed: 60 });
      for (const [x, h] of [[60, 120], [150, 104], [300, 128], [420, 110]]) {
        fillRect(r, x, 184 - h, 9, h, c('#120808'));
        for (let j = 0; j < 9; j++) for (let i = -4 + Math.floor(j / 2); i <= 4 - Math.floor(j / 2); i++) r.set(x + 4 + i, 184 - h - j - 1, LAVA[j < 3 ? 1 : j < 6 ? 2 : 3]);
      }
    }),
    moving('EMBER STORM', 'A dark sky with embers drifting slowly down and going out, smaller and slower far off. Scrolls in three layers.',
      [0.08, (r, b, ox, t) => { grad(r, 0, H, [[0, tn(blaze, 0.04)], [0.8, tn(blaze, 0.15)], [1, tn(blaze, 0.07)]]); for (let y = 30; y < 170; y += 9) for (let x = 0; x < W; x++) if (noise1((x + ox) * 0.05 + y, 61) > 0.62) r.set(x, y, tn(blaze, 0.19)); embers(r, 62, 140, [c('#6a1808'), c('#8a2a10')], 176, ox, t, 0.1); }],
      [0.3, (r, b, ox, t) => embers(r, 63, 90, [LAVA[1], LAVA[2]], 176, ox, t, 0.2)],
      [0.6, (r, b, ox) => ridge(r, ox, { y: 184, amp: 10, f: 0.05, seed: 65, col: c('#120606') })]),
    still('BASALT COLUMNS', 'Cliffs of six-sided basalt columns, lava light in the cracks between them.', (r) => {
      grad(r, 0, H, [[0, tn(blaze, 0.05)], [0.5, tn(blaze, 0.16)], [1, tn(blaze, 0.08)]]);
      for (let x = 0; x < W; x += 10) {
        const top = 70 + Math.floor(noise1(x * 0.05, 66) * 70);
        column(r, x, top, 10, [tn(blaze, 0.13), tn(blaze, 0.09), tn(blaze, 0.05)]);
        for (let i = 1; i < 9; i++) r.set(x + i, top, tn(blaze, 0.17));
        if (hash(x, 0, 67) > 0.6) vert(r, x, top + 10, 184, c('#a03010'));
      }
      fillRect(r, 0, 178, W, 46, tn(blaze, 0.05));
    }),
  ],
};

// ── WATER: Tempest Man's stormy coast ────────────────────────────────

const tempest = B('tempest');
const FOAM = c('#e8f4ff'), GOLDL = c('#f5c518');

// The subsea lab (the owner, 5 Nov 2026): "2a but to prevent the player from thinking the physics for
// the level are different than normal, make the underwater appear to be behind algae covered, lightly
// cracked thick underwater habitat glass, like a subsea laboratory. kelp and the silhouette of deep sea
// creatures should be animated in". Everything that moves by itself comes back to where it started
// every LAB_LOOP steps, so the picture loops without a jump.
const LAB_LOOP = 480, TAU = Math.PI * 2;
const mod = (a, n) => ((a % n) + n) % n;
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
function swimmers(r, ox, t) {
  const col = tn(tempest, 0.045), GLOW = { angler: c('#e0ff8a'), jelly: c('#8af0ff') };
  for (const [kind, x0, y0, d, v, ph] of SWIMMERS) {
    const u = (ph + t / LAB_LOOP) % 1, a = Math.min(1, Math.min(u, 1 - u) / 0.2);   // fades in from the dark and back out
    const x = mod(x0 + d * v * u * LAB_LOOP - ox, 600) - 60, y = kind === 'jelly' ? y0 - Math.round(u * 24) : y0;
    CREATURES[kind](r, Math.round(x), y, d || 1, t, col, a, GLOW[kind]);
  }
}
function kelp(r, ox, t) {
  const K = [c('#1a3022'), c('#28482e'), c('#3c6838')];
  for (let k = 0; k < 12; k++) {
    const sx = mod(k * 52 + Math.floor(hash(k, 0, 88) * 30) - ox, 624) - 60, base = 168, h = 60 + Math.floor(hash(k, 1, 88) * 64);
    if (sx < -24 || sx > W + 24) continue;
    for (let y = base; y > base - h; y--) {
      const f = (base - y) / h, x = sx + Math.round(Math.sin((TAU * 2 * t) / LAB_LOOP + k * 1.7 + y * 0.05) * 5 * f + Math.sin(y * 0.15 + k) * 1.2);
      r.set(x, y, K[0]); r.set(x + 1, y, K[1]);
      if ((base - y) % 6 === 3) { const s = ((base - y) / 6) & 1 ? 1 : -1; for (let i = 1; i <= 3; i++) r.set(x + (s > 0 ? 1 + i : -i), y - Math.floor(i / 2), K[i === 3 ? 2 : 1]); }
    }
  }
}
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

const WATER = {
  id: 'tempest', type: 'Water',
  pick: { backdrop: 2, material: 'A' },
  materials: [
    ['A', 'WET SLATE', 'Blue-grey slate shining wet along its edge, pale shards and a sea-stone arch.',
      material('strata', { deep: '#141c26', dark: '#2e3a48', base: '#4a5d74', mid: '#56697f', light: '#6a7e94', hi: '#e0f4ff', cap0: '#c8dce8', cap1: '#93aec4', void: '#06101c', thi: '#d8ecf4', tlight: '#8aa2b4', tdark: '#4a5e70' }, { wet: true })],
    ['B', 'SHIP DECK', 'Tarred deck planks with brass nails, a rope-bound stake fence and a banded wooden door.',
      material('planks', { deep: '#2a1a10', dark: '#5a3c24', base: '#7a5434', light: '#9a6e46', hi: '#c8b070', cap0: '#d8b888', cap1: '#b08a5c', rope: '#c8b080', iron: '#3a3a40', ironLight: '#6a6a74', thi: '#e8d0a0', tlight: '#a07850', tdark: '#6a4a2a' })],
    ['C', 'AQUEDUCT TILES', 'Glazed blue tiles with a wave running through them under a gold stone lip, gold tridents, a tiled arch.',
      material('tiles', { deep: '#10243a', dark: '#1e4a70', base: '#2a6090', light: '#3e7cb0', hi: '#c8e8ff', cap0: '#f0d878', cap1: '#c8a840', void: '#06101c', thi: '#fff3b0', tlight: '#f5c518', tdark: '#a07c10' }, { wave: true, door: 'arch', spikes: 'spears' })],
  ],
  backdrops: [
    moving('STORMY SEA', 'Rolling waves in three rows under storm clouds and rain. Scrolls in three layers.',
      [0.05, (r) => { grad(r, 0, H, [[0, tn(tempest, 0.05)], [0.65, tn(tempest, 0.15)], [1, tn(tempest, 0.07)]]); clouds(r, 0, { y: 0, h: 70, col: tn(tempest, 0.07), lit: tn(tempest, 0.12), seed: 71, cut: 0.45 }); }],
      [0.15, (r, b, ox) => ridge(r, ox, { y: 142, amp: 8, f: 0.08, seed: 72, col: tn(tempest, 0.12), top: tn(tempest, 0.22) })],
      [0.35, (r, b, ox) => ridge(r, ox, { y: 160, amp: 12, f: 0.06, seed: 73, col: tn(tempest, 0.09), top: c('#a8c8e0') })],
      [0.6, (r, b, ox) => { ridge(r, ox, { y: 180, amp: 14, f: 0.05, seed: 74, col: tn(tempest, 0.06), top: FOAM }); rain(r, 75, 150, c('#5a7a9a'), 6, ox * 2); }]),
    { ...moving('UNDERWATER LAB', 'Looking out of a subsea laboratory through thick glass, algae on it and a few light cracks: kelp swaying, bubbles rising and deep-sea creatures gliding by outside. Scrolls in three layers behind a still sea.',
      [0, (r) => { grad(r, 0, H, [[0, tn(tempest, 0.32)], [0.75, tn(tempest, 0.13)], [1, tn(tempest, 0.06)]]); for (const [x, a] of [[80, 1.75], [200, 1.6], [330, 1.45], [440, 1.65]]) beam(r, x, -10, a, 0.05, 220, tn(tempest, 0.42), 0.32); }],
      [0.1, (r, b, ox, t) => swimmers(r, ox, t)],
      [0.25, (r, b, ox, t) => { ridge(r, ox, { y: 164, amp: 10, f: 0.04, seed: 86, col: tn(tempest, 0.06), top: tn(tempest, 0.1) }); kelp(r, ox, t); embers(r, 87, 40, [c('#8ac8f0'), c('#bfe6ff')], 168, ox, t, -0.35); }],
      [0.6, (r, b, ox) => habitat(r, ox)]), loop: LAB_LOOP },
    still('HARBOUR', 'A harbour at dusk: cranes, a moored ship with lit portholes, gold light on the water.', (r) => {
      grad(r, 0, 150, [[0, tn(tempest, 0.06)], [1, mix(tn(tempest, 0.16), GOLDL, 0.1)]]);
      grad(r, 150, H, [[0, tn(tempest, 0.1)], [1, tn(tempest, 0.05)]]);
      for (let i = 0; i < 40; i++) { const x = Math.floor(hash(i, 0, 78) * W), y = 154 + Math.floor(hash(i, 1, 78) * 22); r.set(x, y, mix(GOLDL, tn(tempest, 0.1), 0.5)); r.set(x + 1, y, mix(GOLDL, tn(tempest, 0.1), 0.5)); }
      const sil = tn(tempest, 0.04);
      for (const x of [60, 150]) { vert(r, x, 40, 150, sil); vert(r, x + 1, 40, 150, sil); line(r, x, 44, x + 60, 44, sil); line(r, x, 44, x + 30, 30, sil); line(r, x + 30, 30, x + 60, 44, sil); vert(r, x + 52, 45, 90, sil); }
      fillRect(r, 250, 110, 190, 40, sil); fillRect(r, 300, 86, 60, 24, sil); fillRect(r, 330, 66, 12, 20, sil);
      for (let k = 0; k < 8; k++) r.set(262 + k * 22, 126, GOLDL);
    }),
    still('WATERFALL CLIFFS', 'A tall waterfall between dark cliffs, mist rising where it lands.', (r) => {
      grad(r, 0, H, [[0, tn(tempest, 0.08)], [0.7, tn(tempest, 0.16)], [1, tn(tempest, 0.06)]]);
      ridge(r, 0, { y: 60, amp: 30, f: 0.03, seed: 79, col: tn(tempest, 0.07), to: H });
      for (let y = 30; y < 176; y++) for (let x = 196; x < 268; x++) {
        const v = 0.55 + 0.45 * Math.sin(x * 0.9 + y * 0.05) * noise1(x * 0.3 + y * 0.02, 80);
        r.set(x, y, pick([tn(tempest, 0.18), c('#6aa0d0'), c('#a8d0f0')], v, x, y));
      }
      halo(r, 232, 176, 60, c('#a8d0f0'), 0.45);
      fillRect(r, 0, 180, W, 44, tn(tempest, 0.05));
    }),
    moving('RAINY CITY', 'A city in the rain, far towers dim, near towers with lit windows. Scrolls in three layers.',
      [0.08, (r, b, ox) => { grad(r, 0, H, [[0, tn(tempest, 0.06)], [0.75, tn(tempest, 0.14)], [1, tn(tempest, 0.07)]]); skyline(r, ox, { y: 184, minH: 40, maxH: 90, col: tn(tempest, 0.09), lit: mix(GOLDL, tn(tempest, 0.1), 0.4), cw: 12, gap: 0.05, rate: 0.12, seed: 81 }); }],
      [0.3, (r, b, ox) => skyline(r, ox, { y: 184, minH: 30, maxH: 70, col: tn(tempest, 0.05), lit: c('#fff0a0'), cw: 16, gap: 0.2, rate: 0.08, seed: 82 })],
      [0.6, (r, b, ox) => rain(r, 83, 180, c('#4a6a8a'), 7, ox * 2)]),
    still('LIGHTHOUSE', 'A lighthouse on a rock at night, its gold beam sweeping over a dark sea.', (r) => {
      grad(r, 0, H, [[0, tn(tempest, 0.03)], [0.7, tn(tempest, 0.13)], [1, tn(tempest, 0.06)]]);
      stars(r, 84, 50, 100, tn(tempest, 0.3), c('#e8f0ff'));
      grad(r, 158, H, [[0, tn(tempest, 0.09)], [1, tn(tempest, 0.04)]]);
      beam(r, 380, 72, Math.PI + 0.12, 0.06, 420, GOLDL, 0.4);
      halo(r, 380, 72, 16, c('#fff3b0'), 0.7);
      ridge(r, 0, { y: 168, amp: 6, f: 0.04, seed: 85, col: tn(tempest, 0.04) });
      for (let y = 76; y < 168; y++) { const half = 5 + Math.floor((y - 76) / 20); for (let i = -half; i <= half; i++) r.set(380 + i, y, Math.floor((y - 76) / 14) % 2 ? tn(tempest, 0.2) : mix(GOLDL, tn(tempest, 0.08), 0.6)); }
      fillRect(r, 374, 66, 13, 10, c('#fff3b0'));
    }),
  ],
};

// ── ELECTRIC: Volt Man's power country ───────────────────────────────

const volt = B('volt');
const P2 = (k) => tn(volt, k, 'secondary');
const SPARK = [c('#fffbe0'), c('#f5d328')];
const ELECTRIC = {
  id: 'volt', type: 'Electric',
  materials: [
    ['A', 'INSULATOR TILES', 'Purple glazed tiles under a yellow-trimmed lip, prongs crackling at the tips, a field door.',
      material('tiles', { deep: '#1e1430', dark: '#3a2860', base: '#6a4ea0', light: '#8468b8', hi: '#e0d0ff', cap0: '#fff090', cap1: '#e0c040', void: '#0c0814', thi: '#ffffff', tlight: '#9a9aa8', tdark: '#5a5a68', glow: '#fff060', glow2: '#f5d328' })],
    ['B', 'HAZARD GRATING', 'Grating over a live glow, a yellow-and-black hazard band, prongs and a slatted shutter.',
      material('grating', { deep: '#20202a', dark: '#3a3a48', base: '#5a5a6a', light: '#7c7c90', hi: '#c8c8d8', cap0: '#e8e8f0', cap1: '#b0b0c4', void: '#0c0a14', glow: '#f5d328', glow2: '#fff7b0', stripeA: '#f5d328', stripeB: '#1e1a24', thi: '#ffffff', tlight: '#9a9aa8', tdark: '#5a5a68' }, { under: 'glow', stripe: true })],
    ['C', 'CIRCUIT BOARD', 'A purple circuit board with gold traces and pads, prongs and a field door.',
      material('tiles', { deep: '#241a40', dark: '#3a2c66', base: '#644f96', alt: '#5a4688', light: '#7a64aa', hi: '#d8ccf0', cap0: '#f0e8ff', cap1: '#b8a8e0', trace: '#f5d328', pad: '#fff0a0', void: '#0c0814', thi: '#ffffff', tlight: '#c0b0e0', tdark: '#5a4a80', glow: '#f5d328', glow2: '#fff7b0' }, { traces: true })],
  ],
  backdrops: [
    moving('PYLON LINES', 'Power lines marching over the hills at dusk, small pylons far off, big ones near. Scrolls in three layers.',
      [0.05, (r) => grad(r, 0, H, [[0, P2(0.08)], [0.68, P2(0.36)], [1, P2(0.1)]])],
      [0.15, (r, b, ox) => { ridge(r, ox, { y: 170, amp: 16, f: 0.02, seed: 91, col: P2(0.17) }); for (let wx = Math.floor(ox / 140) * 140; wx < ox + W + 140; wx += 140) { const x = wx - ox; pylon(r, x, 162, 34, P2(0.17)); wire(r, x, x + 140, 128, 10, P2(0.18)); } }],
      [0.4, (r, b, ox) => { ridge(r, ox, { y: 186, amp: 12, f: 0.03, seed: 92, col: c('#120c20') }); for (let wx = Math.floor(ox / 260) * 260; wx < ox + W + 260; wx += 260) { const x = wx - ox + 40; pylon(r, x, 184, 80, c('#120c20'), SPARK[1]); wire(r, x - 12, x + 248, 105, 22, c('#120c20')); wire(r, x + 12, x + 272, 111, 22, c('#120c20')); } }]),
    still('THUNDERHEAD', 'A towering storm cloud over the plain, one bolt frozen in the air.', (r) => {
      grad(r, 0, H, [[0, P2(0.05)], [0.7, P2(0.16)], [1, P2(0.07)]]);
      clouds(r, 0, { y: 6, h: 116, col: P2(0.2), lit: P2(0.36), seed: 93, f: 0.028, cut: 0.4 });
      bolt(r, 300, 104, 178, 94, SPARK[0], SPARK[1]);
      ridge(r, 0, { y: 182, amp: 8, f: 0.05, seed: 95, col: P2(0.04) });
    }),
    still('CIRCUIT SKY', 'The sky as a circuit board: purple traces, chips, and gold nodes lit with current.', (r) => {
      fillRect(r, 0, 0, W, H, P2(0.08));
      for (let y = 0; y < 176; y++) for (let x = 0; x < W; x++) {
        const gx = x % 16, gy = y % 16, cell = hash(Math.floor(x / 16), Math.floor(y / 16), 96);
        if ((gy === 8 && cell > 0.4) || (gx === 8 && cell < 0.5)) r.set(x, y, cell > 0.88 ? c('#f5d328') : P2(0.18));
      }
      for (let k = 0; k < 9; k++) {
        const x = 20 + Math.floor(hash(k, 0, 97) * 420), y = 10 + Math.floor(hash(k, 1, 97) * 120);
        fillRect(r, x, y, 26, 14, P2(0.14)); fillRect(r, x, y, 26, 1, P2(0.22));
        for (let i = 2; i < 26; i += 4) { r.set(x + i, y - 1, c('#c8b060')); r.set(x + i, y + 14, c('#c8b060')); }
      }
      fillRect(r, 0, 176, W, 48, P2(0.05));
    }),
    still('TESLA LAB', 'Two tesla coils in a lab, an arc leaping between them.', (r) => {
      panels(r, 0, { pw: 48, ph: 64, base: P2(0.08), light: P2(0.12), dark: P2(0.05) });
      for (const x of [110, 370]) {
        for (let y = 90; y < 184; y++) for (let i = -5; i <= 5; i++) r.set(x + i, y, y % 4 === 0 ? c('#6a6080') : c('#3a3450'));
        for (let j = -6; j <= 6; j++) for (let i = -18; i <= 18; i++) if ((i * i) / 324 + (j * j) / 36 <= 1) r.set(x + i, 84 + j, j < -2 ? c('#8a80a0') : c('#4a4460'));
      }
      let y = 80;
      for (let x = 128; x < 352; x++) { if (hash(x, 0, 98) > 0.6) y += hash(x, 1, 98) > 0.5 ? 1 : -1; y = Math.max(70, Math.min(92, y)); r.set(x, y, SPARK[0]); r.set(x, y - 1, SPARK[1]); r.set(x, y + 1, SPARK[1]); }
      fillRect(r, 0, 176, W, 48, P2(0.04));
    }),
    moving('NEON CITY', 'A city at night with neon signs in yellow and violet, wires strung close. Scrolls in three layers.',
      [0.08, (r, b, ox) => { grad(r, 0, H, [[0, P2(0.05)], [0.75, P2(0.16)], [1, P2(0.07)]]); skyline(r, ox, { y: 184, minH: 50, maxH: 110, col: P2(0.1), lit: c('#c8b050'), cw: 12, gap: 0.05, rate: 0.1, seed: 99 }); }],
      [0.3, (r, b, ox) => {
        skyline(r, ox, { y: 184, minH: 40, maxH: 90, col: c('#0e0a18'), lit: c('#ffe060'), cw: 18, gap: 0.2, rate: 0.06, seed: 100 });
        for (let wx = Math.floor(ox / 90) * 90; wx < ox + W + 90; wx += 90) {
          const x = wx - ox + 20, y = 100 + Math.floor(hash(wx, 0, 101) * 40), col = hash(wx, 1, 101) > 0.5 ? c('#f5d328') : c('#b080ff');
          for (let i = 0; i < 18; i++) { r.set(x + i, y, col); r.set(x + i, y + 8, col); }
          vert(r, x, y, y + 9, col); vert(r, x + 17, y, y + 9, col);
        }
      }],
      [0.6, (r, b, ox) => { for (let wx = Math.floor(ox / 180) * 180; wx < ox + W + 180; wx += 180) wire(r, wx - ox, wx - ox + 180, 40, 18, c('#0a0612')); }]),
    still('STATIC SKY', 'A violet night crackling with ribbons of static, like an aurora made of current.', (r) => {
      grad(r, 0, H, [[0, P2(0.04)], [0.7, P2(0.14)], [1, P2(0.06)]]);
      for (let band = 0; band < 3; band++) for (let x = 0; x < W; x++) {
        const y = Math.round(50 + band * 22 + Math.sin(x * 0.03 + band * 2) * 12 + Math.sin(x * 0.11 + band) * 4);
        for (let k = -3; k <= 3; k++) if (Math.abs(k) < 2 || ((x + k) & 1)) r.set(x, y + k, Math.abs(k) < 1 ? c('#fff7b0') : Math.abs(k) < 2 ? c('#f5d328') : P2(0.3));
      }
      for (let i = 0; i < 14; i++) bolt(r, Math.floor(hash(i, 0, 102) * W), 20 + Math.floor(hash(i, 1, 102) * 60), 30 + Math.floor(hash(i, 1, 102) * 60) + 8, 103 + i, SPARK[0], P2(0.3));
      ridge(r, 0, { y: 182, amp: 10, f: 0.04, seed: 104, col: P2(0.04) });
    }),
  ],
};

// ── GRASS: Thorn Man's woods ──────────────────────────────────────────

const thorn = B('thorn');
const GRASS = {
  id: 'thorn', type: 'Grass',
  materials: [
    ['A', 'MEADOW TURF', 'Grass over dark soil with roots and flowers, a turf ledge, bramble thorns and a hedge arch with a lantern.',
      material('turf', { deep: '#2a1c12', dark: '#5a4028', base: '#765638', mid: '#846244', light: '#9c7a54', hi: '#c0a070', cap0: '#8ee05a', cap1: '#5cb83a', grassDark: '#3a8028', root: '#4a3020', flower: '#f0e060', leafDark: '#2a6a1c', leaf: '#3c8a28', leafLight: '#64b040', void: '#0a120a', thi: '#b8d070', tlight: '#6a8a30', tdark: '#3a5018' }, { flowers: true })],
    ['B', 'BAMBOO', 'Bamboo poles lashed together, sharpened bamboo stakes and a paper sliding door.',
      material('planks', { deep: '#2a3a10', dark: '#455a18', base: '#607a24', light: '#6e8c2e', hi: '#76962f', cap0: '#c8e080', cap1: '#98b850', rope: '#c8a060', paper: '#e8e0c8', paperLight: '#fff8e8', thi: '#d8e890', tlight: '#8aa840', tdark: '#4a6020' }, { bamboo: true, door: 'shoji' })],
    ['C', 'MOSSY STONE', 'Old stone blocks with moss creeping over the top, bramble thorns and a mossy arch.',
      material('bricks', { deep: '#1e2420', dark: '#3e4840', base: '#5a665c', alt: '#525e54', light: '#76847a', hi: '#c8d8c0', cap0: '#c8d8c0', cap1: '#98aa94', moss: '#4a8a30', mossDark: '#2e6020', void: '#0a120a', thi: '#b8d070', tlight: '#6a8a30', tdark: '#3a5018' }, { moss: true, door: 'arch', spikes: 'thorns' })],
  ],
  backdrops: [
    moving('DEEP FOREST', 'Rows of pines fading into the distance, broad trees close by. Scrolls in three layers.',
      [0.06, (r, b, ox) => { grad(r, 0, H, [[0, tn(thorn, 0.07)], [0.66, tn(thorn, 0.3)], [1, tn(thorn, 0.08)]]); trees(r, ox, { y: 184, minH: 50, maxH: 90, col: tn(thorn, 0.18), seed: 111, every: 12 }); }],
      [0.25, (r, b, ox) => trees(r, ox, { y: 184, minH: 60, maxH: 110, col: tn(thorn, 0.1), edge: tn(thorn, 0.16), seed: 112, every: 18 })],
      [0.55, (r, b, ox) => trees(r, ox, { y: 190, minH: 90, maxH: 140, col: c('#08120a'), seed: 113, every: 40, kind: 'round' })]),
    still('BAMBOO GROVE', 'Bamboo stalks in the mist, near ones dark, far ones fading.', (r) => {
      grad(r, 0, H, [[0, tn(thorn, 0.1)], [0.5, tn(thorn, 0.3)], [1, tn(thorn, 0.08)]]);
      for (const [depth, n, w, col] of [[0, 30, 3, tn(thorn, 0.21)], [1, 18, 4, tn(thorn, 0.12)], [2, 9, 6, tn(thorn, 0.05)]]) {
        for (let k = 0; k < n; k++) {
          const x = Math.floor(hash(k, depth, 114) * W);
          for (let y = 0; y < FLOOR; y++) for (let i = 0; i < w; i++) r.set(x + i, y, (y + k * 7) % 22 === 0 ? mix(col, c('#c8e080'), 0.2) : col);
          for (let y = 20 + k * 3; y < 150; y += 40) for (let i = 1; i < 9; i++) r.set(x + w + i, y - Math.floor(i / 2), col);
        }
      }
      fillRect(r, 0, 178, W, 46, tn(thorn, 0.05));
    }),
    still('TERRACED HILLS', 'Hills cut into terraces, water in each step catching the last light, a hut on top.', (r) => {
      grad(r, 0, H, [[0, tn(thorn, 0.07)], [0.5, tn(thorn, 0.3)], [1, tn(thorn, 0.08)]]);
      for (let k = 0; k < 5; k++) {
        const y0 = 96 + k * 18;
        for (let x = 0; x < W; x++) {
          const top = Math.round(y0 + Math.sin(x * 0.012 + k) * 8);
          for (let y = top; y < FLOOR; y++) r.set(x, y, y === top ? tn(thorn, 0.36) : k % 2 ? tn(thorn, 0.16) : tn(thorn, 0.12));
        }
      }
      const hx = 340, hy = 98;
      fillRect(r, hx, hy - 12, 20, 12, tn(thorn, 0.04));
      for (let j = 0; j < 8; j++) for (let i = -j - 3; i <= j + 3; i++) r.set(hx + 10 + i, hy - 20 + j, tn(thorn, 0.04));
      fillRect(r, 0, 178, W, 46, tn(thorn, 0.06));
    }),
    still('FIREFLY MEADOW', 'A meadow at night under a full moon, fireflies drifting over the grass.', (r) => {
      grad(r, 0, H, [[0, tn(thorn, 0.03)], [0.7, tn(thorn, 0.12)], [1, tn(thorn, 0.06)]]);
      disc(r, 90, 50, 18, [tn(thorn, 0.22), tn(thorn, 0.3), tn(thorn, 0.38)], 115);
      ridge(r, 0, { y: 160, amp: 18, f: 0.02, seed: 116, col: tn(thorn, 0.07), top: tn(thorn, 0.11) });
      for (let x = 0; x < W; x += 2) { const y = 160 - Math.round(18 * (noise1(x * 0.02, 116) * 0.7 + noise1(x * 0.062, 117) * 0.3)); if (hash(x, 0, 118) > 0.5) { r.set(x, y - 1, tn(thorn, 0.07)); r.set(x, y - 2, tn(thorn, 0.07)); } }
      for (let i = 0; i < 40; i++) { const x = Math.floor(hash(i, 0, 119) * W), y = 80 + Math.floor(hash(i, 1, 119) * 90); halo(r, x, y, 4, c('#9ac850'), 0.6); r.set(x, y, c('#f0f080')); }
    }),
    moving('OVERGROWN RUINS', 'Broken columns wrapped in vines, ruined arches nearer, vines hanging closest. Scrolls in three layers.',
      [0.08, (r, b, ox) => {
        grad(r, 0, H, [[0, tn(thorn, 0.08)], [0.66, tn(thorn, 0.28)], [1, tn(thorn, 0.08)]]);
        for (let wx = Math.floor(ox / 60) * 60; wx < ox + W + 60; wx += 60) {
          const x = wx - ox + 10, h = 60 + Math.floor(hash(wx, 0, 120) * 50);
          for (let y = 184 - h; y < 184; y++) for (let i = 0; i < 10; i++) if (y > 184 - h + (i * 3 + wx) % 6) r.set(x + i, y, tn(thorn, 0.16));
          for (let y = 184 - h; y < 184; y++) r.set(x + Math.round(4 + Math.sin(y * 0.2) * 5), y, tn(thorn, 0.3));
        }
      }],
      [0.3, (r, b, ox) => {
        for (let wx = Math.floor(ox / 150) * 150; wx < ox + W + 150; wx += 150) {
          const x = wx - ox;
          for (let i = 0; i < 70; i++) { const yTop = 120 - Math.round(Math.sqrt(Math.max(0, 35 * 35 - (i - 35) ** 2)) * 0.8); for (let y = yTop; y < yTop + 8; y++) r.set(x + i, y, tn(thorn, 0.06)); }
          fillRect(r, x, 120, 8, 64, tn(thorn, 0.06)); fillRect(r, x + 62, 120, 8, 64, tn(thorn, 0.06));
        }
      }],
      [0.6, (r, b, ox) => { for (let wx = Math.floor(ox / 37) * 37; wx < ox + W + 37; wx += 37) { const x = wx - ox, len = 20 + Math.floor(hash(wx, 0, 121) * 50); for (let y = 0; y < len; y++) { r.set(x + Math.round(Math.sin(y * 0.15) * 2), y, c('#0a160a')); if (y % 7 === 0) r.set(x + 2, y, c('#163016')); } } }]),
    still('CANOPY', 'Looking up into giant leaves, sunlight leaking between them onto the dark undergrowth.', (r) => {
      grad(r, 0, H, [[0, tn(thorn, 0.14)], [0.6, tn(thorn, 0.1)], [1, tn(thorn, 0.05)]]);
      for (let k = 0; k < 9; k++) {
        const cx = Math.floor(hash(k, 0, 122) * W), cy = 10 + Math.floor(hash(k, 1, 122) * 50), rx = 34 + Math.floor(hash(k, 2, 122) * 20), ry = 16;
        for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1) r.set(cx + i, cy + j, j === 0 || (Math.abs(i) % 9 === 0 && Math.abs(j) < 8) ? tn(thorn, 0.4) : k % 2 ? tn(thorn, 0.26) : tn(thorn, 0.2));
      }
      for (let i = 0; i < 40; i++) r.set(Math.floor(hash(i, 0, 123) * W), 60 + Math.floor(hash(i, 1, 123) * 100), c('#c8f0a0'));
      for (let k = 0; k < 6; k++) fillRect(r, 30 + k * 80, 90, 7, 94, tn(thorn, 0.05));
      fillRect(r, 0, 170, W, 54, tn(thorn, 0.04));
    }),
  ],
};

// ── FIGHTING: Strike Man's training grounds ───────────────────────────

const strike = B('strike');
const S2 = (k) => tn(strike, k, 'secondary');
const FIGHTING = {
  id: 'strike', type: 'Fighting',
  materials: [
    ['A', 'DOJO FLOOR', 'Honey-coloured floorboards, wooden stakes and a paper sliding door.',
      material('planks', { deep: '#2a1608', dark: '#6a4020', base: '#8a5a30', light: '#a87442', hi: '#e8c890', cap0: '#f0d0a0', cap1: '#c89c68', rope: '#d8c090', paper: '#ece4d0', paperLight: '#fffaf0', thi: '#f0d8a8', tlight: '#b08050', tdark: '#6a4424' }, { door: 'shoji' })],
    ['B', 'RING CANVAS', 'Blue-grey ring canvas with an orange line, thumbtack spikes and a gym shutter.',
      material('concrete', { deep: '#22262e', dark: '#3e4656', base: '#56607a', light: '#6e7894', hi: '#c0c8e0', cap0: '#e8ecf4', cap1: '#b4bccc', tape: '#ea6a34', rust: '#7c2d12', thi: '#ffffff', tlight: '#c0c0d0', tdark: '#6a6a80' }, { tape: true, joint: 48, door: 'shutter', spikes: 'spears' })],
    ['C', 'STREET CONCRETE', 'Cracked street concrete with a painted yellow line, rebar spikes and a fire-exit hatch.',
      material('concrete', { deep: '#26221e', dark: '#46403a', base: '#625a52', light: '#7c746a', hi: '#b8b0a4', cap0: '#d8d0c4', cap1: '#aaa294', tape: '#e8c020', rust: '#8a4a2a', thi: '#e0d0c0', tlight: '#b07850', tdark: '#6a4028' }, { tape: true, door: 'hatch', spikes: 'spears' })],
  ],
  backdrops: [
    still('ARENA CROWD', 'A packed arena in the dark, spotlights sweeping down, banners overhead, camera flashes.', (r) => {
      grad(r, 0, H, [[0, tn(strike, 0.04)], [0.7, tn(strike, 0.12)], [1, tn(strike, 0.06)]]);
      for (const [x, a] of [[100, 1.2], [240, 1.57], [380, 1.94]]) beam(r, x, -5, a, 0.09, 200, c('#f0e0c0'), 0.22);
      for (const x of [40, 160, 280, 400]) { fillRect(r, x, 0, 30, 46, S2(0.6)); for (let y = 0; y < 46; y++) r.set(x + 14, y, tn(strike, 0.3)); fillRect(r, x, 46, 30, 2, S2(0.3)); }
      for (let row = 0; row < 3; row++) for (let k = 0; k < 60; k++) {
        const x = k * 8 + (row % 2) * 4, y = 146 + row * 12, col = [tn(strike, 0.09), tn(strike, 0.07), tn(strike, 0.05)][row];
        for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 9) r.set(x + i, y + j, col);
        fillRect(r, x - 4, y + 3, 9, 10, col);
      }
      for (let i = 0; i < 6; i++) { const x = Math.floor(hash(i, 0, 131) * W), y = 140 + Math.floor(hash(i, 1, 131) * 30); r.set(x, y, c('#ffffff')); r.set(x + 1, y, c('#c8c8c8')); r.set(x, y + 1, c('#c8c8c8')); }
      fillRect(r, 0, 178, W, 46, tn(strike, 0.04));
    }),
    still('DOJO', 'Paper screens lit from behind, dark beams, and hanging scrolls.', (r) => {
      fillRect(r, 0, 0, W, H, c('#1a0e08'));
      const paper = mix(tn(strike, 0.2), c('#c8b090'), 0.35);
      for (let k = 0; k < 6; k++) {
        const x0 = 8 + k * 80;
        for (let y = 24; y < 150; y++) for (let x = x0; x < x0 + 72; x++) r.set(x, y, (x - x0) % 18 === 0 || (y - 24) % 21 === 0 ? c('#3a2414') : paper);
      }
      fillRect(r, 0, 16, W, 8, c('#2a1a0e')); fillRect(r, 0, 150, W, 8, c('#2a1a0e'));
      for (const x of [118, 278]) { fillRect(r, x, 30, 16, 60, c('#e8dcc0')); for (let y = 36; y < 84; y += 6) fillRect(r, x + 4, y, 8 - (y % 12 ? 2 : 0), 2, c('#2a1a0e')); }
      fillRect(r, 0, 158, W, 66, c('#140a06'));
    }),
    moving('MOUNTAIN TEMPLE', 'Peaks at sunset with a pagoda on the highest, mist between the ranges, pines up close. Scrolls in three layers.',
      [0.05, (r) => grad(r, 0, H, [[0, tn(strike, 0.06)], [0.5, tn(strike, 0.24)], [1, tn(strike, 0.1)]])],
      [0.12, (r, b, ox) => {
        ridge(r, ox, { y: 128, amp: 60, f: 0.012, seed: 132, col: tn(strike, 0.12), top: tn(strike, 0.18), sharp: 0.6 });
        const px = wrapX(300, ox, 600);
        for (let t = 0; t < 4; t++) { const y = 52 + t * 9, half = 5 + t * 3; for (let i = -half - 3; i <= half + 3; i++) r.set(px + i, y, c('#140a06')); fillRect(r, px - half, y + 1, half * 2 + 1, 8, c('#1c0e08')); r.set(px - half - 3, y - 1, c('#140a06')); r.set(px + half + 3, y - 1, c('#140a06')); }
      }],
      [0.3, (r, b, ox) => { for (let y = 140; y < 160; y++) for (let x = 0; x < W; x++) if (((x + ox) * 3 + y * 5) % 7 === 0) r.set(x, y, tn(strike, 0.2)); ridge(r, ox, { y: 166, amp: 26, f: 0.02, seed: 133, col: tn(strike, 0.07) }); }],
      [0.6, (r, b, ox) => trees(r, ox, { y: 190, minH: 40, maxH: 70, col: c('#0e0806'), seed: 134, every: 26 })]),
    still('BOXING GYM', 'A gym wall with heavy bags on chains, faded posters and weights on the floor.', (r) => {
      panels(r, 0, { pw: 16, ph: 8, base: tn(strike, 0.1), light: tn(strike, 0.13), dark: tn(strike, 0.06) });
      for (const [x, y, w, h] of [[30, 30, 40, 54], [380, 24, 50, 64]]) { fillRect(r, x, y, w, h, S2(0.5)); fillRect(r, x + 4, y + 4, w - 8, h - 24, tn(strike, 0.22)); fillRect(r, x + 6, y + h - 14, w - 12, 4, S2(0.9)); }
      for (const x of [130, 230, 330]) {
        for (let y = 0; y < 60; y += 2) r.set(x, y, tn(strike, 0.05));
        for (let y = 60; y < 120; y++) for (let i = -9; i <= 9; i++) if (Math.abs(i) < 9 - Math.max(0, (y - 112) * 1.2) && Math.abs(i) < 9 - Math.max(0, (66 - y) * 1.2)) r.set(x + i, y, i < -4 ? S2(1.1) : i > 4 ? S2(0.6) : S2(0.85));
      }
      fillRect(r, 0, 166, W, 58, tn(strike, 0.05));
      for (const x of [80, 280]) { fillRect(r, x, 156, 30, 3, c('#2a2420')); fillRect(r, x - 3, 150, 6, 14, c('#2a2420')); fillRect(r, x + 27, 150, 6, 14, c('#2a2420')); }
    }),
    moving('DUSK ROOFTOPS', 'Rooftops at sunset with water towers and aerials, the sun sinking behind the city. Scrolls in three layers.',
      [0.04, (r) => { grad(r, 0, H, [[0, tn(strike, 0.06)], [0.5, tn(strike, 0.26)], [1, tn(strike, 0.1)]]); disc(r, 300, 118, 24, [c('#f08040'), c('#ffb060'), c('#ffe0a0')]); }],
      [0.15, (r, b, ox) => skyline(r, ox, { y: 170, minH: 20, maxH: 60, col: tn(strike, 0.12), cw: 10, gap: 0.1, seed: 135 })],
      [0.4, (r, b, ox) => {
        skyline(r, ox, { y: 190, minH: 20, maxH: 40, col: c('#160c08'), cw: 24, gap: 0.15, seed: 136 });
        for (let wx = Math.floor(ox / 170) * 170; wx < ox + W + 170; wx += 170) {
          const x = wx - ox + 40, base = 150;
          fillRect(r, x, base - 26, 22, 18, c('#160c08')); for (let i = 0; i < 22; i++) r.set(x + i, base - 27 - Math.round(Math.sin((i / 21) * Math.PI) * 3), c('#160c08'));
          vert(r, x + 3, base - 8, base + 30, c('#160c08')); vert(r, x + 18, base - 8, base + 30, c('#160c08'));
        }
      }]),
    still('TORII AND DUMMIES', 'A red gate under a full moon, wooden training dummies standing in the grass.', (r) => {
      grad(r, 0, H, [[0, tn(strike, 0.04)], [0.7, tn(strike, 0.14)], [1, tn(strike, 0.06)]]);
      disc(r, 360, 54, 26, [tn(strike, 0.3), tn(strike, 0.42), mix(tn(strike, 0.5), c('#ffffff'), 0.3)], 137);
      const red = S2(1.6);
      fillRect(r, 150, 60, 140, 7, red); for (let i = 0; i < 6; i++) { r.set(146 - i, 60 - Math.floor(i / 2), red); r.set(293 + i, 60 - Math.floor(i / 2), red); }
      fillRect(r, 160, 76, 120, 5, red); fillRect(r, 166, 67, 8, 117, red); fillRect(r, 266, 67, 8, 117, red);
      for (const x of [60, 100, 340, 420]) { fillRect(r, x, 130, 6, 54, c('#120806')); fillRect(r, x - 8, 142, 22, 4, c('#120806')); fillRect(r, x - 1, 122, 8, 8, c('#120806')); }
      ridge(r, 0, { y: 184, amp: 6, f: 0.2, seed: 138, col: tn(strike, 0.05) });
    }),
  ],
};

export const BATCH1 = [TYPELESS, FIRE, WATER, ELECTRIC, GRASS, FIGHTING];
