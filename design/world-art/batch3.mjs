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
import { CASTLE, STEEL_PLATES } from '../../src/systems/area-art/materials.js';
import { STEEL_LINE } from '../../src/systems/area-art/steel.js';
import { ARM_AT, Al, As, BEAT, BELT_Y, COPY_ROWS, CYAN, GOLD, HAZE, HOT, HOTS, ITEMS, MOVE, RIDE, SLAB, SLOT, SP, STEEL_C, UNIT, alloy, armPair, beltAt, blastDoor, bulkhead, copyAt, cycleOf, ease, feeder, frame, furnace, gate, hingedTable, item, ladle, lineWall, lookOf, mould, muted, paintCopy, paintPhases, press, rawBillet, repeatOf, rising, sequenceOf, slab, stamp, stationAt, steelDoors, thick, tipping, vaultDoor, walkPicture, walker, workOn } from '../../src/systems/area-art/steel.js';
import { GREAT_HALL, CHANDELIERS, Dd, INDIGO, VIOLET, TEAL, DRAGON_MASK, Dr, GILT, GLASS, HALL_ORDER, HALL_WINDOWS, STONE, banner, dragonEye, drake, lightShaft, pillar, stainedGlass, stoneWall, torches, ROCK_MATERIALS, STAR_MEADOW, DARK_MATERIALS, TOTAL_ECLIPSE, AMETHYST, AMETHYST_FAR, B, BAYER4, BLACK, BLOOD, BLOOMS, BLOOM_CUPS, BLUE, CAP_CYAN, CAP_VIOLET, CYAN_GLOW, DEBRIS, K, KR, LANTERNS, LUMEN, MIST, NIGHT, R, ROOF, ROWS, RS, TAU, VAULT, VIOLET_GLOW, WARM, WHITE, WOOD, WORMS, WORM_COLS, bareTree, bellAt, caveWall, ceiling, cluster, crystal, crystalRow, dark, dripstones, eclipse, ellipse, flame, glints, glow, glowworms, granite, grass, lit, motes, mushroom, oneEye, pale, pics, roofLayer, shade, stem, threads, wormSpots } from '../../src/systems/area-art/batch3.js';

const ROCK = {
  id: 'granite', type: 'Rock',
  // The owner, 6 Nov 2026: material B, with material A's arched doors; and of the six variants of the
  // glowworm grotto below, "2 and 4", then (8 Nov 2026) "A": one backdrop joining them, number 7.
  pick: { backdrop: 7, material: 'B', doors: 'A' },
  materials: ROCK_MATERIALS,
  backdrops: [
    scrolling('BLUE GROTTO', 'The grotto by blue light: glowworms strung under a roof of stalactites, far spires of rock in a blue haze, violet crystals glowing on the floor, specks of light drifting up. Scrolls in three layers.', 240,
      { rate: 0.05, period: 480, fixed: (r, ox) => {
        caveWall(r, ox, BLUE, 0.03, 400, 480);
        for (let y = 90; y < 178; y++) for (let x = 0; x < W; x++) if (BAYER4[mod(y, 4)][mod(x + ox, 4)] < ((y - 90) / 88) * 6) r.set(x, y, NIGHT[3]);   // a blue haze, thicker near the floor
      } },
      roofLayer(0, 402, (r, ox) => ridge(r, ox, { y: 152, amp: 30, f: 0.03, seed: 401, col: NIGHT[0], top: LUMEN[0], period: 960, sharp: 0.7 })),
      { rate: 0.35, period: 960, fixed: (r, ox) => { ROWS[0].paint(r, ox); dark(r, 178, NIGHT[0]); }, parts: [ROWS[0].glints, motes(405, 36, [LUMEN[1], LUMEN[2]])] }),
    scrolling('STAR VAULT', 'A cave so tall its roof is lost in the dark, glittering with crystals like a night sky, cyan and violet, crystals hanging from it; spires far off, crystals glowing close by. Scrolls in three layers.', 240,
      { rate: 0.03, period: 960, fixed: (r, ox) => {
        grad(r, 0, H, [[0, NIGHT[0]], [0.42, NIGHT[1]], [0.66, NIGHT[3]], [0.78, NIGHT[2]], [1, NIGHT[1]]]);
        for (let y = 0; y < 140; y++) for (let x = 0; x < W; x++) {   // a band of faint crystal light across the vault, like a galaxy
          const wx = mod(x + ox, 960), d = Math.abs(y - (30 + 60 * Math.sin((TAU * wx) / 960))) / 26;
          if (d < 1 && BAYER4[mod(y, 4)][mod(wx, 4)] < (1 - d) ** 2 * 7 * (0.6 + 0.4 * seamless((w) => noise1(w * 0.04, 416), wx, 960))) r.set(x, y, d < 0.35 ? LUMEN[0] : NIGHT[3]);
        }
        for (const [wx, sz, sd] of [[60, 34, 1], [300, 44, 2], [540, 30, 3], [770, 40, 4]]) { const x = mod(wx - ox, 960) - 20; if (x < -60 || x > W + 60) continue; glow(r, x, 14, 50, VIOLET_GLOW, 0.3); cluster(r, x, -2, sz, sd, AMETHYST, Math.PI); }
      }, parts: [glowworms(VAULT.filter((_, i) => hash(i, 2, 410) > 0.25), 960, [NIGHT[4], LUMEN[2], LUMEN[1]], 411), glowworms(VAULT.filter((_, i) => hash(i, 2, 410) <= 0.25), 960, [AMETHYST[0], AMETHYST[2], AMETHYST[1]], 412)] },
      { rate: 0.12, period: 960, fixed: (r, ox) => {
        ridge(r, ox, { y: 146, amp: 30, f: 0.02, seed: 413, col: NIGHT[1], top: LUMEN[0], period: 960, sharp: 0.7 });
        ridge(r, ox, { y: 164, amp: 14, f: 0.035, seed: 414, col: NIGHT[0], top: NIGHT[3], period: 960, sharp: 0.4 });
      } },
      { rate: 0.35, period: 960, fixed: (r, ox) => { ROWS[1].paint(r, ox); dark(r, 178, NIGHT[0]); }, parts: [ROWS[1].glints] }),
    scrolling('TALL GRASS', 'The grotto floor grown over with tall dark-blue grass that sways in slow waves, a few blades tipped with glowing seed heads; glowworms above. Scrolls in three layers.', 240,
      { rate: 0.05, period: 480, fixed: (r, ox) => caveWall(r, ox, BLUE, 0.03, 420, 480) },
      roofLayer(1, 421, (r, ox) => {
        for (let x = 0; x < W; x++) {   // far grass, a dark bank
          const wx = mod(x + ox, 960), top = 150 + Math.floor(seamless((w) => noise1(w * 0.05, 422), x + ox, 960) * 14) - Math.floor(hash(wx, 0, 427) * 5);
          for (let y = Math.max(0, top); y < H; y++) r.set(x, y, y === top ? NIGHT[3] : NIGHT[0]);
        }
      }),
      { rate: 0.35, period: 960, fixed: (r, ox) => { ROWS[2].paint(r, ox); dark(r, 178, NIGHT[0]); }, parts: [ROWS[2].glints, grass(425, 960, 180), motes(426, 24, [LUMEN[2], LUMEN[1]])] }),
    scrolling('GLOWING BLOOMS', 'A meadow of bell flowers on arching stems, their bells glowing cyan, the light rippling across them in slow waves, pollen drifting up; glowworms above. Scrolls in three layers.', 240,
      { rate: 0.05, period: 480, fixed: (r, ox) => caveWall(r, ox, BLUE, 0.03, 431, 480) },
      roofLayer(2, 432, (r, ox) => {
        ridge(r, ox, { y: 162, amp: 10, f: 0.03, seed: 434, col: NIGHT[1], top: NIGHT[3], period: 960 });
        for (let wx = Math.floor(ox / 9) * 9; wx < ox + W + 9; wx += 9) { const k = mod(wx, 960), x = wx - ox + Math.floor(hash(k, 0, 435) * 5), y = 160 + Math.floor(hash(k, 1, 435) * 14); if (hash(k, 2, 435) > 0.4) { r.set(x, y, LUMEN[1]); r.set(x, y + 1, NIGHT[3]); } }   // far flowers, dots of light
      }),
      { rate: 0.35, period: 960, fixed: (r, ox) => {
        ROWS[3].paint(r, ox);
        for (const [wx, h, lean] of BLOOMS) {   // each flower's glow and its stem; the bell is a moving part
          const x = mod(wx - ox, 960) - 20;
          if (x < -30 || x > W + 30) continue;
          const [bx, by] = bellAt(x, h, lean);
          glow(r, bx + 3, by + 4, 14, CYAN_GLOW, 0.3);
          stem(r, x, h, lean, NIGHT[4]);
        }
        dark(r, 178, NIGHT[0]);
      }, parts: [ROWS[3].glints, BLOOM_CUPS, motes(437, 30, [LUMEN[2], LUMEN[3]])] }),
    scrolling('MUSHROOM HOLLOW', 'A hollow of giant mushrooms, cyan and violet, their spotted caps and gills glowing and lighting the rock, spores drifting up; glowworms above. Scrolls in three layers.', 240,
      { rate: 0.05, period: 480, fixed: (r, ox) => caveWall(r, ox, BLUE, 0.03, 441, 480) },
      roofLayer(3, 442, (r, ox) => {
        ridge(r, ox, { y: 168, amp: 8, f: 0.03, seed: 443, col: NIGHT[1], top: NIGHT[3], period: 960 });
        for (let wx = Math.floor(ox / 120) * 120 - 120; wx < ox + W + 120; wx += 120) { const k = mod(wx, 960), x = wx - ox + 30 + Math.floor(hash(k, 0, 444) * 60); mushroom(r, x, 172, 18 + Math.floor(hash(k, 1, 444) * 16), 16 + Math.floor(hash(k, 2, 444) * 10), ((k / 120) % 2 ? CAP_VIOLET : CAP_CYAN).map((col) => shade(col, 0.35)), k); }
      }),
      { rate: 0.35, period: 960, fixed: (r, ox) => {
        for (let wx = Math.floor(ox / 240) * 240 - 240; wx < ox + W + 240; wx += 240) { const k = mod(wx, 960), x = wx - ox + 60 + Math.floor(hash(k, 0, 446) * 120); mushroom(r, x, 184, 44 + Math.floor(hash(k, 1, 446) * 34), 44 + Math.floor(hash(k, 2, 446) * 22), (k / 240) % 2 ? CAP_VIOLET : CAP_CYAN, k + 1); cluster(r, x + 24, 184, 16, k + 7, AMETHYST); }
        dark(r, 178, NIGHT[0]);
      }, parts: [motes(447, 40, [LUMEN[2], AMETHYST[2], LUMEN[1]])] }),
    scrolling('LANTERN WALK', 'An old boardwalk on stilts through the grotto, crystal lanterns on its posts flickering violet, mist drifting beneath it, glowworms above, the warm brown rock in their blue light. Scrolls in three layers.', 240,
      { rate: 0.05, period: 480, fixed: (r, ox) => caveWall(r, ox, WARM, 0.03, 451, 480) },
      roofLayer(4, 453, (r, ox) => dripstones(r, ox, { every: 26, maxLen: 40, cols: [R(0.1), R(0.16), RS(0.26)], seed: 452, period: 960, base: 178 }), [R(0.07), RS(0.22), R(0.12)]),
      { rate: 0.35, period: 960, fixed: (r, ox) => {
        ROWS[4].paint(r, ox);
        for (let k = 0; k < 24; k++) { const x = mod(k * 40 + 50 - ox, 960) - 20; if (x < -2 || x > W) continue; for (let y = 143; y < 184; y++) { r.set(x, y, WOOD[1]); r.set(x + 1, y, WOOD[0]); } }   // stilts
        for (let x = 0; x < W; x++) {   // the deck, planks 12 wide
          const wx = mod(x + 20 + ox, 960), gap = mod(wx, 12) === 0;
          for (let y = 138; y < 143; y++) r.set(x, y, gap || y === 142 ? WOOD[0] : y === 138 ? WOOD[3] : WOOD[hash(Math.floor(wx / 12), y, 455) > 0.5 ? 2 : 1]);
        }
        for (let k = 0; k < 12; k++) {   // posts, every other one carrying a lantern, and the rope rail sagging between them
          const x = mod(k * 80 + 70 - ox, 960) - 20;
          if (x < -90 || x > W + 10) continue;
          if (k % 2 === 0) glow(r, x, 117, 30, VIOLET_GLOW, 0.35);
          for (let y = k % 2 ? 126 : 123; y < 138; y++) { r.set(x, y, WOOD[2]); r.set(x + 1, y, WOOD[0]); }
          for (let i = 2; i < 80; i++) r.set(x + i, 127 + Math.round(4 * Math.sin((Math.PI * i) / 80)), c('#8a7050'));
        }
        dark(r, 178, R(0.04));
      }, parts: [ROWS[4].glints, LANTERNS, MIST] }),
    STAR_MEADOW,   // the owner, 8 Nov 2026: "A", backdrops 2 and 4 joined
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
// ── THE GRAVE TOWER, AS A CLIMB ──────────────────────────────────────
/*
 * The owner, 7 Nov 2026, on the Ghost board's grave tower: "3a but This level will only be 3 full
 * screen widths wide. beyond this 3 screen wide scrolling, all other platforming and scrolling will
 * be done in the vertical as the player ascends this grave tower. add animated blue flame spirits,
 * significantly increase the unique styles of graves, have a thin fog with clear patches ebb and
 * flow, shifting with player movement like the layered parallax but over the foreground, mildly
 * obscuring the player, platforms, enemies etc but not the flame spirits. periodically there will be
 * a staircase that, at the top, is a one way passable platform that spans the whole level width as
 * checkpoints. all other platforms should have randomized widths no narrower than the current
 * standard platform".
 *
 * So: the grave tower with material A, the rotten floorboards, drawn as a climb. The tower is three
 * screens (1440 pixels) wide. Its far wall of graves moves at half the camera's speed, stone pillars
 * nearer at three quarters, then the climb itself: platforms 44 to 88 pixels wide (44 is today's
 * standard), and every few tiers a staircase up to a walkway the whole width of the tower, the
 * checkpoint. Over all of it a thin fog drifts faster than the camera, its clear patches opening and
 * closing; the blue flame spirits are drawn over the fog. Painted afresh each frame for the canvas;
 * how the climb plays (falling, the door at the top) is still to be talked through. Not in the game.
 */
const ROTTEN_P = { deep: '#140e1c', dark: '#2e2640', base: '#5e5072', light: '#726486', hi: '#9a8cb4', cap0: '#c4b8dc', cap1: '#9486b4', rope: '#6a5a80', iron: '#2a2430', ironLight: '#5a5068', thi: '#d8d0e8', tlight: '#8a80a0', tdark: '#4a4058' };
const ROTTEN = material('planks', ROTTEN_P, { spikes: 'spears', door: 'wood' });
const RP = Object.fromEntries(Object.entries(ROTTEN_P).map(([k, v]) => [k, c(v)]));
const TW = 1440, GRAVE_C = [Wd(0.22), mix(Wd(1), Wv(0.45), 0.5), Wv(0.62), Wv(0.82)];   // edge, body, lit, highlight
const GRAVE_W = [9, 9, 7, 9, 11, 20, 13, 9, 9, 9, 9, 22, 10, 5, 7];
/** A grave standing on a ledge at (x, base): one of fifteen kinds. */
function grave(r, x, base, kind, C = GRAVE_C) {
  const [E, B, L, Hh] = C, F = (i, j, w, h, col) => fillRect(r, x + i, base - j - h, w, h, col);   // j counts up from the ledge
  const body = (i, j, w, h) => { F(i, j, w, h, B); F(i, j, 1, h, L); F(i + w - 1, j, 1, h, E); };
  const WOOD = [c('#2a1c14'), c('#5a4030'), c('#7a5a40')];
  switch (kind) {
    case 0: body(0, 0, 9, 9); for (let i = 1; i < 8; i++) for (let j = 9; j < 13; j++) if (((i - 4) / 3.6) ** 2 + ((j - 9) / 3.4) ** 2 <= 1) r.set(x + i, base - 1 - j, i < 3 ? L : B); F(2, 4, 5, 1, E); F(2, 6, 5, 1, E); break;   // a rounded headstone
    case 1: body(3, 0, 3, 16); body(0, 10, 9, 3); break;   // a cross
    case 2: body(0, 0, 7, 3); body(1, 3, 5, 14); F(2, 17, 3, 2, B); F(3, 19, 1, 2, Hh); break;   // an obelisk
    case 3: body(3, 0, 3, 18); body(0, 11, 9, 3); for (let a = 0; a < 28; a++) { const t = (a / 28) * TAU; r.set(Math.round(x + 4 + Math.cos(t) * 4), Math.round(base - 13 + Math.sin(t) * 4), a < 14 ? E : L); } break;   // a cross in a ring
    case 4: body(0, 0, 11, 9); F(3, 3, 5, 4, L); r.set(x + 4, base - 6, E); r.set(x + 6, base - 6, E); F(4, 3, 3, 1, E); break;   // a slab with a skull carved in it
    case 5: body(0, 0, 20, 5); F(0, 5, 20, 2, L); F(1, 7, 18, 1, Hh); for (let i = 3; i < 18; i += 5) F(i, 1, 2, 3, E); break;   // a tomb chest under its lid
    case 6: body(4, 0, 5, 3); body(5, 3, 3, 9); F(2, 7, 2, 8, L); F(9, 7, 2, 8, E); F(1, 10, 1, 5, L); F(11, 10, 1, 5, E); ellipse(r, x + 6, base - 15, 2, 2, Hh); break;   // an angel, wings half raised
    case 7: body(0, 0, 9, 6); F(0, 6, 3, 3, B); F(3, 6, 2, 1, B); F(5, 6, 4, 2, B); F(7, 8, 2, 1, E); r.set(x + 1, base - 9, L); break;   // a broken headstone
    case 8: for (let j = 0; j < 14; j++) { const dx = Math.round(j * 0.25); r.set(x + 3 + dx, base - 1 - j, WOOD[1]); r.set(x + 4 + dx, base - 1 - j, WOOD[0]); } for (let i = 0; i < 9; i++) r.set(x + i + 2, base - 11 + Math.round(i * 0.1), i < 4 ? WOOD[2] : WOOD[1]); break;   // a wooden cross, leaning
    case 9: body(1, 0, 7, 4); body(3, 4, 3, 2); ellipse(r, x + 4, base - 9, 3, 3, B); r.set(x + 2, base - 10, L); F(3, 12, 3, 1, L); F(2, 13, 5, 1, B); break;   // an urn on a plinth
    case 10: body(0, 0, 9, 10); for (let j = 10; j < 15; j++) { const half = Math.round((15 - j) * 0.9); for (let i = 4 - half; i <= 4 + half; i++) r.set(x + i, base - 1 - j, i <= 4 - half + 1 ? L : B); } F(4, 6, 1, 5, E); F(2, 8, 5, 1, E); break;   // a pointed headstone with a cross cut in it
    case 11: body(0, 0, 22, 2); body(2, 2, 2, 11); body(18, 2, 2, 11); F(4, 2, 14, 11, Wd(0.12)); F(8, 2, 6, 8, Wd(0.05)); body(0, 13, 22, 2); for (let j = 15; j < 20; j++) { const half = Math.round((20 - j) * 2.2); F(11 - half, j, half * 2, 1, j === 15 ? L : B); } break;   // a little mausoleum, its door dark
    case 12: for (let j = 0; j < 12; j++) { const dx = Math.round(j * 0.35); for (let i = 0; i < 8; i++) { if (j > 8 && ((i - 3.5) / 3.6) ** 2 + ((j - 8) / 3.4) ** 2 > 1) continue; r.set(x + i + dx, base - 1 - j, i === 0 ? L : i === 7 ? E : B); } } break;   // a headstone sunk and leaning
    case 13: F(2, 0, 1, 10, Wd(0.15)); F(0, 10, 5, 6, Wd(0.15)); F(1, 11, 3, 4, SPIRIT[1]); r.set(x + 2, base - 13, SPIRIT[0]); glow(r, x + 2, base - 13, 6, SPIRIT[1], 0.35); break;   // an iron lantern on a post, a spirit flame inside
    case 14: body(1, 0, 5, 2); body(2, 2, 3, 12); ellipse(r, x + 3, base - 16, 2, 2, B); r.set(x + 2, base - 17, Hh); break;   // a pillar with a stone ball on top
  }
}
/** The tower's far wall, at `rate` of the camera: stone blocks, tall moonlit windows, and ledge on ledge of graves. */
function towerWall(r, camX, camH, rate) {
  const ox = Math.round(camX * rate), oh = Math.round(camH * rate);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x + ox, wy = y - oh, row = Math.floor(wy / 12), bx = mod(wx + mod(row, 2) * 16, 32);
    r.set(x, y, mod(wy, 12) === 0 || bx === 0 ? Wd(0.35) : pick([Wd(0.6), mix(Wd(1), Wv(0.25), 0.3)], noise2(wx * 0.08, wy * 0.08, 430), x, y));
  }
  for (let k = Math.floor((-oh - 120) / 112); k * 112 - 40 + oh < H; k++) {
    const ly = k * 112 + 96 + oh;   // this ledge's top, on screen
    if (mod(k, 2) === 0) for (let n = Math.floor((ox - 60) / 240); n * 240 + 100 - ox < W; n++) {   // a tall arched window between this ledge and the one above
      const wx = n * 240 + 120 - ox, top = ly - 76;
      for (let j = 0; j < 62; j++) for (let i = 0; i < 22; i++) { const dx = i - 11; if (j < 11 && dx * dx + (j - 11) ** 2 > 121) continue; r.set(wx + i, top + j, i === 11 || j === 30 ? Wd(0.3) : mix(Wd(0.25), Wv(0.6), 0.35 - j * 0.004)); }
      beam(r, wx + 11, top + 30, Math.PI / 2 + 0.35, 0.1, 70, Wv(0.85), 0.07);
    }
    if (ly < -30 || ly > H + 30) continue;
    for (let x = 0; x < W; x++) { r.set(x, ly, Wv(0.45)); r.set(x, ly + 1, Wd(0.25)); for (let j = 2; j < 6; j++) r.set(x, ly + j, Wd(0.3)); }
    let gx = 4 + Math.floor(hash(k, 0, 940) * 10);
    for (let n = 0; gx < ox + W + 30; n++) {   // the graves along it: fifteen kinds, never two alike in a row
      const kind = Math.floor(hash(k, n, 941) * 15), w = GRAVE_W[kind];
      if (gx + w > ox - 30) grave(r, gx - ox, ly, kind);
      gx += w + 3 + Math.floor(hash(k, n, 942) * 9);
    }
  }
}
/** Stone pillars nearer than the wall, at `rate` of the camera. */
function towerPillars(r, camX, rate) {
  const ox = Math.round(camX * rate);
  for (let n = Math.floor((ox - 40) / 300); n * 300 + 120 - ox < W; n++) {
    const px = n * 300 + 140 - ox;
    for (let y = 0; y < H; y++) for (let i = 0; i < 26; i++) r.set(px + i, y, i < 3 ? Wv(0.42) : i > 22 ? Wd(0.1) : mod(y + (i > 12 ? 8 : 0), 16) === 0 ? Wd(0.14) : Wd(0.24));
  }
}
// The climb shown on the canvas: its platforms, stairs and walkways, and the route the player takes.
const CLIMB = (() => {
  const plats = [], stairs = [], walks = [360, 720], route = [[70, 0, 'stand']], tiers = [];
  let x = 70, dir = 1;
  const next = (i) => { let nx = x + dir * (56 + Math.floor(hash(i, 0, 950) * 30)); if (nx > TW - 100 || nx < 100) { dir = -dir; nx = x + dir * (56 + Math.floor(hash(i, 0, 950) * 30)); } return nx; };
  for (let h = 40, i = 0; h <= 800; h += 40, i++) {
    if (walks.includes(h) || walks.includes(h + 40)) continue;   // the stair climbs through these tiers
    const nx = next(i);
    if (walks.includes(h + 80)) {   // the platform at the stair's foot
      const foot = nx + dir * 32;
      plats.push([nx, h, 64]); stairs.push([foot, h, dir]);
      route.push([nx, h, 'hop'], [foot, h, 'walk'], [foot + dir * 80, h + 80, 'climb']);
      x = foot + dir * 80;
    } else {
      plats.push([nx, h, 44 + 4 * Math.floor(hash(i, 1, 950) * 12)]);
      route.push([nx, h, 'hop']); x = nx; tiers.push([h, nx]);
    }
  }
  for (const [h, px] of tiers) for (let q = 0; q < 2; q++) {   // more platforms on each tier, of random widths, off the route
    const fx = 60 + Math.floor(hash(h, q, 951) * (TW - 120)), w = 44 + 4 * Math.floor(hash(h, q, 952) * 12);
    if (Math.abs(fx - px) > 150 && hash(h, q, 953) > 0.25) plats.push([fx, h, w]);
  }
  let t = 30;
  const legs = route.slice(1).map(([x1, h1, how], k) => {
    const [x0, h0] = route[k], len = how === 'hop' ? 30 : Math.max(20, Math.round(Math.hypot(x1 - x0, h1 - h0) / (how === 'climb' ? 1.1 : 1.375)));
    const leg = { x0, h0, x1, h1, how, t0: t, t1: t + len }; t += len + (how === 'hop' ? 14 : 0); return leg;
  });
  return { plats, stairs, walks, legs, end: t + 40 };
})();
/** Where the player is at step t, how he stands (a frame of his sheet) and which way he faces. */
function climberAt(t) {
  let last = CLIMB.legs[0], prev = { x1: 70, h1: 0 };
  for (const leg of CLIMB.legs) {
    if (t < leg.t0) return [prev.x1, prev.h1, 0, Math.sign(leg.x1 - leg.x0) || 1];
    if (t < leg.t1) {
      const u = (t - leg.t0) / (leg.t1 - leg.t0), x = leg.x0 + (leg.x1 - leg.x0) * u, face = Math.sign(leg.x1 - leg.x0) || 1;
      if (leg.how === 'hop') return [x, leg.h0 + (leg.h1 - leg.h0) * u + 26 * Math.sin(Math.PI * u), u < 0.4 ? 14 : u < 0.6 ? 15 : 16, face];
      return [x, leg.h0 + (leg.h1 - leg.h0) * u, 6 + (Math.floor(t / 4) % 8), face];
    }
    prev = last = leg;
  }
  return [last.x1, last.h1, 0, 1];
}
/** The camera at step t: following the player, a little behind, inside the tower's three screens. */
function climbCam(t) {
  let cx = 0, ch = 0;
  for (let k = 0; k < 8; k++) { const [x, h] = climberAt(Math.max(0, t - k * 6)); cx += Math.max(0, Math.min(TW - W, x - 200)); ch += Math.max(0, h - 60); }
  return [cx / 8, ch / 8];
}
const FOG = c('#b8b4d8');
/** A thin fog over everything, drifting faster than the camera; its clear patches open and close as it ebbs and flows. */
function towerFog(r, camX, camH, t, rate = 1.35) {
  const ox = camX * rate, oy = -camH * rate, thr = 0.5 + 0.1 * Math.sin((TAU * t) / 600);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fx = x + ox + t * 0.12, fy = y + oy;
    const n = 0.65 * noise2(fx * 0.012, fy * 0.02, 911) + 0.35 * noise2(fx * 0.04 + 50, fy * 0.05 - t * 0.003, 912);
    const d = Math.min(1, Math.max(0, (n - thr) / 0.25));   // 0 in a clear patch, 1 at its thickest
    if (d > 0 && BAYER4[mod(y, 4)][mod(x, 4)] < d * 8) r.set(x, y, FOG, Math.round(50 + d * 50));
  }
}
const SPIRITS = Array.from({ length: 40 }, (_, i) => [20 + Math.floor(hash(i, 0, 960) * (TW - 40)), 20 + Math.floor(hash(i, 1, 960) * 860), 3 + Math.floor(hash(i, 2, 960) * 2)]);
/** The blue flame spirits, bobbing and drifting over the fog, each flickering on its own beat. */
function towerSpirits(r, camX, camH, t) {
  for (const [i, [sx, sh, s]] of SPIRITS.entries()) {
    const x = Math.round(sx - camX + 8 * Math.sin((TAU * t) / 400 + i)), y = Math.round(FLOOR - (sh - camH) + 4 * Math.sin((TAU * t) / 90 + i * 1.3));
    if (x < -12 || x > W + 12 || y < -12 || y > H + 12) continue;
    spiritFlame(r, x, y, mod(Math.floor(t / 5) + i, 3) === 0 ? s + 1 : s);
  }
}
/** Copy one frame of the player's sheet into r, his feet at (x, y), mirrored to face left. */
function stampPlayer(r, sprite, frame, x, y, face) {
  const p = sprite(frame);
  for (let j = 0; j < 24; j++) for (let i = 0; i < 24; i++) { const k = (j * 24 + (face < 0 ? 23 - i : i)) * 4; if (p.d[k + 3] > 128) r.set(x + i - 12, y + j - 24, [p.d[k], p.d[k + 1], p.d[k + 2]]); }
}
let GROUND_ROWS = null;   // the floorboards' ground, painted once, to lay at the foot of the tower
/** The tower at a moment: wall, pillars, the climb's woodwork, the player, the fog and, over it all, the spirits. */
function paintTower(r, camX, camH, t, sprite, flat = false) {
  towerWall(r, camX, camH, flat ? 1 : 0.5);
  towerPillars(r, camX, flat ? 1 : 0.75);
  const Y = (h) => Math.round(FLOOR - (h - camH)), X = (x) => Math.round(x - camX);
  if (Y(0) < H) {   // the tower's floor, at the bottom of the climb
    if (!GROUND_ROWS) { GROUND_ROWS = new Raster(W, H); ROTTEN.ground(GROUND_ROWS, 0, W); }
    for (let y = Y(0); y < H; y++) for (let x = 0; x < W; x++) { const k = ((FLOOR + y - Y(0)) * W + mod(x + Math.round(camX), W)) * 4, d = GROUND_ROWS.d; if (FLOOR + y - Y(0) < H && d[k + 3]) r.set(x, y, [d[k], d[k + 1], d[k + 2]]); }
  }
  for (const h of CLIMB.walks) {   // the checkpoints: a walkway the whole width of the tower, on brackets
    const y = Y(h);
    if (y < -8 || y > H) continue;
    ROTTEN.platform(r, X(12), y, TW - 24);
    for (let bx = 12; bx < TW - 12; bx += 120) { const x = X(bx); line(r, x, y + 5, x + 10, y + 15, RP.iron); line(r, x + 1, y + 5, x + 11, y + 15, RP.ironLight); }
  }
  for (const [fx, h, d] of CLIMB.stairs) for (let k = 0; k < 10; k++) {   // stairs: ten steps of eight, a stringer under them, an iron rail
    const x = X(fx + d * 8 * k) - (d < 0 ? 8 : 0), y = Y(h + 8 * (k + 1));
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) r.set(x + i, y + j, j === 0 ? RP.cap0 : j === 1 ? RP.light : i === (d > 0 ? 7 : 0) ? RP.deep : j > 5 ? RP.dark : RP.base);
    for (let j = 8; j < 12; j++) r.set(x + (d > 0 ? 0 : 7), y + j, RP.deep);
    if (k % 3 === 1) { vert(r, x + 4, y - 12, y, RP.iron); }
    line(r, X(fx) + (d > 0 ? 0 : -1), Y(h) - 12, X(fx + d * 80), Y(h + 80) - 12, RP.ironLight);
  }
  for (const [px, h, w] of CLIMB.plats) { const x = X(px - w / 2), y = Y(h); if (x < W && x + w > 0 && y > -6 && y < H) ROTTEN.platform(r, x, y, w); }
  for (const wx of [0, TW - 14]) { const x = X(wx); for (let y = 0; y < H; y++) for (let i = 0; i < 14; i++) r.set(x + i, y, i === (wx ? 0 : 13) ? Wv(0.45) : mod(y + i * 3, 12) === 0 ? Wd(0.12) : Wd(0.2)); }   // the tower's own walls
  if (sprite) { const [px, ph, frame, face] = climberAt(t); stampPlayer(r, sprite, frame, X(px), Y(ph), face); }
  towerFog(r, camX, camH, t, flat ? 1 : 1.35);
  towerSpirits(r, camX, camH, t);
}
/** The canvas pictures: the climb, the camera following the player up the tower, and a map of the tower three screens wide. */
const TOWER_PICTURES = [
  { name: 'tower-climb', frames: Math.ceil(CLIMB.end / 6), fps: 10, own: true,
    paint: (r, f, sprite) => { const t = f * 6, [cx, ch] = climbCam(t); paintTower(r, Math.round(cx), Math.round(ch), t, sprite); } },
  { name: 'tower-map', picture: (sprite) => {
    const big = new Raster(TW, 4 * H);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      const r = new Raster(W, H);
      paintTower(r, col * W, (3 - row) * H, 0, null, true);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; if (r.d[k + 3]) big.set(col * W + x, row * H + y, [r.d[k], r.d[k + 1], r.d[k + 2]]); }
    }
    return big.flush();
  } },
];
const GHOST = {
  id: 'wraith', type: 'Ghost',
  // The owner, 7 Nov 2026: "3a", the grave tower with the rotten floorboards, as a climb (above).
  pick: { material: 'A', backdrops: [3] },
  extras: TOWER_PICTURES,
  materials: [
    ['A', 'ROTTEN FLOORBOARDS', 'Warped grey-violet boards with iron nails, an iron railing for spikes and a heavy door bound in iron.', ROTTEN],
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

const CASTLE_C = ['C', 'CASTLE BRICKS', 'Picked in the first round: staggered castle blocks under a stone lip, iron spikes and a castle gate with a gold portcullis for the way out.', CASTLE];
const DRAGON_SLICE = {
  id: 'drake', type: 'Dragon',
  // Dragon's material was picked in the first round: "i really like the castle one for dragon" (5 Nov
  // 2026). On 6 Nov 2026 the owner said "6c but do another 6 variants based on 6c", so the six
  // backdrops below are castle halls built on the throne hall; the backdrop is still to pick.
  pick: { backdrop: 1, material: 'C' },   // the great hall, 9 Nov 2026: "put it into the game"
  materials: [CASTLE_C],
  backdrops: [
    GREAT_HALL,
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

const DARK = {
  id: 'eclipse', type: 'Dark',
  // The owner, 6 Nov 2026: "1a but with the cracked glowing stone from c" — material A's platform,
  // spikes and doors on C's cracked stone ground.
  pick: { backdrop: 1, material: 'A', ground: 'C' },
  materials: DARK_MATERIALS,
  backdrops: [
    TOTAL_ECLIPSE,
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

// The line and its doors live in the game: src/systems/area-art/steel.js.

/** The pictures for the canvas: each phase on its own and the walk through all of them, in both ways of moving. 6 steps a frame, 10 frames a second. */
const PHASE_PICTURES = ['step', 'flow'].flatMap((mode) => [
  ...[['1', repeatOf('p1'), 0], ['2', repeatOf('p2'), 0], ['3', repeatOf('p3'), 0], ['end', sequenceOf(['p3', 'end']), 200]].map(([k, unitOf, L]) => ({
    name: `line-${mode}-${k}`, frames: 80, fps: 10,
    paint: (r, f) => { lineWall(r, 0); paintPhases(r, mode, unitOf, L, f * 6); },
  })),
  walkPicture(`line-${mode}-walk`, mode, sequenceOf(['p1', 'p1', 'p2', 'p2', 'p3', 'end']), { from: -240, length: 880 }),
]);
/*
 * The owner, 7 Nov 2026, on B: "i for sure like the end result of the B column, only the entire
 * backdrop art needs to be more muted to distinguish it from the forground. now i need to think of
 * how to loop each section so that from a factory workflow perspective each phase looped makes sense.
 * Draw out 2 variants, one like what you just drew, where the player walks, with each phase looping
 * until some progress trigger makes phase 2 start being drawn and then eventually phase 3, and one
 * where all phases play in order with the entire assembly line loops with a new conveyor belt (this
 * would remove the progress based phase transitions)". So both are B, always moving, and muted: 1 is
 * the walk through the phases as before; 2 is the whole line, a ladle, a press and the four pairs of
 * arms once each, ending at its pit, then a new belt fed with empty moulds, and the whole line again.
 * The owner picked 1, 9 Nov 2026: "i hate 2, where the whole process repeats. lock in 1".
 */
const MUTE = 0.42;
const LOOP_PICTURES = [
  walkPicture('line-loop-1', 'flow', sequenceOf(['p1', 'p1', 'p2', 'p2', 'p3', 'end']), { from: -240, length: 880 }, MUTE),
  walkPicture('line-loop-2', 'flow', cycleOf(['p1', 'p2', 'p3', 'end']), { from: -240, length: 840 }, MUTE),
];
const STEEL = {
  id: 'alloy', type: 'Steel',
  // The owner, 6 Nov 2026: "1, 2, 5 and material B" — backdrops 1, 2 and 5 merged into one line, its story
  // in their words above THE LINE; it takes backdrop 5's place.
  pick: { backdrop: 5, material: 'B' },
  // The line in three phases, both ways of moving, for the owner to compare (above).
  extras: [...PHASE_PICTURES, ...LOOP_PICTURES],
  materials: [
    ['A', 'STEEL PLATES · VAULT DOORS', 'The steel plates picked in the first round, with round vault doors: bolted and wheeled for a boss, swung open on gold light for the way out.', { ...STEEL_PLATES, ...steelDoors(vaultDoor) }],
    ['B', 'STEEL PLATES · BLAST DOORS', 'The steel plates picked in the first round, with blast doors: two thick halves under a hazard stripe, parted on gold light for the way out.', { ...STEEL_PLATES, ...steelDoors(blastDoor) }],
    ['C', 'STEEL PLATES · BULKHEADS', 'The steel plates picked in the first round, with ship\'s bulkhead hatches: latched, with a cyan porthole for a boss and a gold one for the way out.', { ...STEEL_PLATES, ...steelDoors(bulkhead) }],
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
    STEEL_LINE,   // the line as the game draws it (src/systems/area-art/steel.js)
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
function web(r, cx, cy, rad, col) {
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; line(r, cx, cy, cx + Math.round(Math.cos(a) * rad), cy + Math.round(Math.sin(a) * rad), col); }
  for (let rr = 6; rr < rad; rr += 6) for (let a = 0; a < TAU; a += 0.04) if (hash(Math.round(a * 50), rr, cx) > 0.1) r.set(cx + Math.round(Math.cos(a) * rr), cy + Math.round(Math.sin(a) * rr), col);
}
