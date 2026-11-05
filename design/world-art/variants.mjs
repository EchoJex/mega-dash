/**
 * WORLD PIECES — VARIANTS FOR THE OWNER TO PICK FROM. NONE OF THIS IS IN THE GAME.
 *
 * Drawn by Claude at the owner's request, 2026-11-05. The owner asked for every
 * non-boss, non-weapon picture still drawn as plain shapes to get "a couple
 * questions and/or a few variants to review before getting a label as
 * 'Picked.'" This file paints the first group, the world pieces: the area
 * backdrop, the ground, floating platforms, spikes, the boss door and the exit
 * door. The pieces come in three materials (A steel plates, B bedrock, C castle
 * bricks) and the backdrop in three kinds, beside the game's look today.
 *
 * It paints with the game's own room kit (src/systems/arena-art/pixels.js), at
 * the game's own sizes (terrain.js and GameScene.draw), so a picked painter can
 * move into the game as written. Nothing here changes a hit box, a jump or a
 * size. Moving parts (a door's pulse, a glint) are shown at one moment.
 * `render.mjs` beside this file turns it into the canvas's pictures.
 */

import { Raster, hex, pick, hash, noise1, noise2, OL } from '../../src/systems/arena-art/pixels.js';
import { BOSSES } from '../../src/data/bosses.js';
import { themeFor } from '../../src/systems/arena.js';
import { W, H, FLOOR, rect, blit, inTooth, paintDoor } from '../../src/systems/area-art/kit.js';

export { W, H, FLOOR };
export const PADS = 199;
const ol = hex(OL);
const c = (h) => hex(h);
const blend = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** The coming boss's primary, darkened by k: the area backdrop is k = 0.16 (arena.js themeFor). */
const tone = (b, k) => { const p = c(b.primary); return p.map((v) => Math.round(6 + v * k)); };
export const backdropOf = (b) => { const f = themeFor(b).fill; return [(f >> 16) & 255, (f >> 8) & 255, f & 255]; };


// ── The game's look today (GameScene.draw) ────────────────────────────

const TODAY = {
  name: 'TODAY',
  check: { ground: '#3a6180', cap: '#8fb8d4' },
  ground(r, x1, x2) {
    rect(r, x1, FLOOR, x2 - x1, H - FLOOR, c('#3a6180'));
    rect(r, x1, FLOOR, x2 - x1, 2, c('#8fb8d4'));
  },
  platform(r, x, y, w) { rect(r, x, y, w, 5, c('#4d7da0')); },
  spikes(r, x, w) {
    const n = Math.max(1, Math.round(w / 5)), tw = w / n, top = FLOOR - 7;
    for (let py = top; py < FLOOR; py++) for (let px = Math.floor(x); px < x + w; px++) {
      for (let i = 0; i < n; i++) if (inTooth(px, py, x + i * tw, tw, top, 7)) { r.set(px, py, c('#c0c0c8')); break; }
    }
  },
  door(r, x, kind) {
    const y = FLOOR - 28;
    if (kind === 'unarmed') { rect(r, x, y, 16, 28, c('#4a4a44'), 140); return; }
    rect(r, x - 2, y - 2, 20, 32, c('#f5d328'), 204);
    rect(r, x, y, 16, 28, c(kind === 'exit' ? '#f5d328' : '#5cadd5'));
  },
};

// ── A: steel plates — riveted fortress panels ─────────────────────────

const A_ = {
  deep: c('#262e37'), dark: c('#36414c'), base: c('#50606e'), light: c('#66788a'), hi: c('#8a9cae'),
  cap0: c('#dce6ee'), cap1: c('#a3b5c4'), tooth: [c('#f4f8fa'), c('#c9d3db'), c('#8d9aa6'), c('#5d6a76')],
};
const A = {
  name: 'A',
  check: { ground: '#50606e', cap: '#a3b5c4' },
  ground(r, x1, x2) {
    for (let y = FLOOR; y < H; y++) for (let x = x1; x < x2; x++) {
      let col;
      if (y === FLOOR) col = A_.cap0;
      else if (y === FLOOR + 1) col = A_.cap1;
      else if (y === FLOOR + 2) col = A_.deep;
      else {
        const tx = ((x % 16) + 16) % 16, ty = (y - FLOOR - 3) % 16;
        const rivet = (tx === 3 || tx === 12) && (ty === 3 || ty === 12);
        const shadow = (tx === 4 || tx === 13) && (ty === 4 || ty === 13);
        if (tx === 0 || ty === 0) col = A_.deep;
        else if (rivet) col = A_.hi;
        else if (shadow) col = A_.deep;
        else if (tx === 1 || ty === 1) col = A_.light;
        else if (tx === 15 || ty === 15) col = A_.dark;
        else col = (tx + ty === 10 || tx + ty === 11) && ((x + y) & 1) ? A_.light : A_.base;
      }
      if (x === x1 && y > FLOOR + 1) col = A_.light;          // the lit face of a pit edge
      if (x === x2 - 1 && y > FLOOR + 1) col = A_.dark;
      r.set(x, y, col);
    }
  },
  platform(r, x, y, w) {
    for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
      let col = [A_.cap0, A_.light, A_.base, A_.base, A_.dark][j];
      if (j === 2 && i % 6 === 3) col = A_.deep;               // truss holes
      if (i === 0 || i === w - 1) col = j === 0 ? A_.cap1 : A_.deep;
      if ((i === 2 || i === w - 3) && j === 2) col = A_.hi;   // end bolts
      r.set(x + i, y + j, col);
    }
  },
  spikes(r, x, w) {
    const t = new Raster(Math.ceil(w) + 2, 9), n = Math.max(1, Math.round(w / 5)), tw = w / n;
    for (let py = 0; py < 7; py++) for (let px = 0; px < Math.ceil(w); px++) {
      for (let i = 0; i < n; i++) {
        const tx = i * tw;
        if (!inTooth(px, py, tx, tw, 0, 7)) continue;
        const left = px + 0.5 < tx + tw / 2;
        t.set(px + 1, py + 1, py === 6 ? A_.tooth[3] : left ? A_.tooth[py < 3 ? 0 : 1] : A_.tooth[2]);
        break;
      }
    }
    t.outline(ol);
    blit(r, t, Math.floor(x) - 1, FLOOR - 8);
  },
  door(r, x, kind) {
    const y = FLOOR - 28, d = new Raster(16, 28);
    const gold = kind === 'exit';
    const sl = gold ? [c('#5c4a0a'), c('#c9a21e'), c('#f5d328')] : [A_.deep, A_.base, A_.light];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      let col;
      if (i < 2 || i > 13 || j < 2) col = i === 1 || j === 1 ? A_.light : A_.dark;
      else { const k = (j - 2) % 4; col = k === 3 ? sl[0] : k === 0 ? sl[2] : sl[1]; }
      d.set(i, j, col);
    }
    // The lamp: cyan for a boss, white for the way out.
    const lamp = gold ? [c('#fffbe6'), c('#ffffff')] : [c('#5cadd5'), c('#d8f6ff')];
    rect(d, 6, 4, 4, 4, A_.deep); rect(d, 7, 5, 2, 2, lamp[0]); d.set(7, 5, lamp[1]);
    paintDoor(r, d, x, y, kind);
  },
};

// ── B: bedrock — sunlit stone over strata ─────────────────────────────

const B_ = {
  crack: c('#3a3026'), dark: c('#5a4a38'), base: c('#6e5c45'), mid: c('#7a6750'), light: c('#86735a'),
  lip: c('#4a3c2c'), cap0: c('#efe3bc'), cap1: c('#c2a874'),
  shard: [c('#f1e9da'), c('#cdbfa6'), c('#968871'), c('#6b5f4e')],
};
const B = {
  name: 'B',
  check: { ground: '#6e5c45', cap: '#c2a874' },
  ground(r, x1, x2) {
    const rp = [B_.dark, B_.base, B_.mid, B_.light];
    for (let y = FLOOR; y < H; y++) for (let x = x1; x < x2; x++) {
      let col;
      if (y === FLOOR) col = hash(x, 1, 5) < 0.18 ? B_.cap1 : B_.cap0;
      else if (y === FLOOR + 1) col = B_.cap1;
      else if (y === FLOOR + 2 || (y === FLOOR + 3 && hash(x >> 1, 2, 9) < 0.3)) col = B_.lip;
      else {
        const band = Math.sin((y + 5 * noise1(x * 0.045, 3)) * 0.75);
        const v = 0.48 + 0.22 * band + 0.25 * (noise2(x * 0.18, y * 0.35, 7) - 0.5);
        col = pick(rp, Math.max(0.12, v), x, y);
        if (hash(x >> 2, y >> 2, 11) > 0.94 && ((x & 3) < 2) && ((y & 3) === 1)) col = B_.light;   // pebbles
        if (hash(x >> 2, y >> 2, 11) > 0.94 && ((x & 3) < 2) && ((y & 3) === 2)) col = B_.crack;
      }
      if (x === x1 && y > FLOOR + 1) col = B_.light;
      if (x === x2 - 1 && y > FLOOR + 1) col = B_.crack;
      r.set(x, y, col);
    }
  },
  platform(r, x, y, w) {
    for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
      if ((i === 0 || i === w - 1) && (j === 0 || j === 4)) continue;   // rounded corners
      let col = [B_.cap0, B_.cap1, B_.mid, B_.base, B_.dark][j];
      if (j >= 2 && j <= 3) col = pick([B_.dark, B_.base, B_.mid], 0.45 + 0.3 * (noise2((x + i) * 0.3, j, 4) - 0.5), x + i, y + j);
      r.set(x + i, y + j, col);
    }
    // Crumbs of rock hanging under the slab: drawing only, below its 5-pixel box.
    for (let i = 3; i < w - 3; i++) {
      const k = hash(x + i, y, 21);
      if (k > 0.72) r.set(x + i, y + 5, B_.crack);
      if (k > 0.9) r.set(x + i, y + 6, B_.crack);
    }
  },
  spikes(r, x, w) {
    const t = new Raster(Math.ceil(w) + 2, 9), n = Math.max(1, Math.round(w / 5)), tw = w / n;
    for (let i = 0; i < n; i++) {
      const hgt = 5 + Math.floor(hash(i, Math.floor(x), 31) * 3);   // shards of 5 to 7
      for (let py = 7 - hgt; py < 7; py++) for (let px = Math.floor(i * tw); px < Math.ceil((i + 1) * tw); px++) {
        if (!inTooth(px, py, i * tw, tw, 7 - hgt, hgt)) continue;
        const left = px + 0.5 < i * tw + tw / 2;
        t.set(px + 1, py + 1, py === 6 ? B_.shard[3] : left ? B_.shard[py < 7 - hgt + 2 ? 0 : 1] : B_.shard[2]);
      }
    }
    t.outline(ol);
    blit(r, t, Math.floor(x) - 1, FLOOR - 8);
  },
  door(r, x, kind) {
    const y = FLOOR - 28, d = new Raster(16, 28), gold = kind === 'exit';
    const stones = [B_.dark, B_.base, B_.mid, B_.light];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      // A round-topped arch: outside the curve stays clear.
      const dx = i + 0.5 - 8, dy = j + 0.5 - 8;
      if (j < 8 && dx * dx + dy * dy > 64) continue;
      const inner = j >= 3 && i >= 3 && i <= 12 && (j >= 8 || (dx * dx + dy * dy) <= 25);
      if (inner) {
        const t = (j - 3) / 24;
        d.set(i, j, gold ? pick([c('#c9a21e'), c('#f5d328'), c('#fff3b0')], 0.25 + 0.7 * t, i, j)
          : pick([c('#0a0a12'), c('#0e2236'), c('#1c4a66')], 0.15 + 0.8 * t, i, j));
      } else {
        const mortar = (j % 5 === 0) || ((i + (Math.floor(j / 5) % 2) * 2) % 4 === 0 && j > 8);
        d.set(i, j, mortar ? B_.crack : stones[1 + Math.floor(hash(i >> 1, Math.floor(j / 5), 41) * 3)]);
      }
    }
    if (!gold) { // a cyan rune in the dark: two chevrons over a bar
      for (const [i, j] of [[7, 10], [8, 10], [6, 11], [9, 11], [7, 14], [8, 14], [6, 15], [9, 15], [7, 18], [8, 18], [7, 19], [8, 19], [7, 20], [8, 20]]) d.set(i, j, c('#5cadd5'));
      d.set(7, 18, c('#d8f6ff'));
    }
    paintDoor(r, d, x, y, kind);
  },
};

// ── C: castle bricks — staggered blocks under a stone lip ─────────────

const C_ = {
  mortar: c('#34303a'), edge: c('#4e4a56'), base: c('#6e6a76'), alt: c('#66626e'), light: c('#8a8692'),
  cap0: c('#e8e2d8'), cap1: c('#b0a898'), iron: [c('#ffffff'), c('#e3ded6'), c('#8a8692'), c('#4e4a56')],
};
const Cc = {
  name: 'C',
  check: { ground: '#6e6a76', cap: '#b0a898' },
  ground(r, x1, x2) {
    for (let y = FLOOR; y < H; y++) for (let x = x1; x < x2; x++) {
      let col;
      if (y === FLOOR) col = C_.cap0;
      else if (y === FLOOR + 1) col = ((x % 16) + 16) % 16 === 0 ? C_.mortar : C_.cap1;
      else if (y === FLOOR + 2) col = C_.mortar;
      else {
        const row = Math.floor((y - FLOOR - 3) / 8), by = (y - FLOOR - 3) % 8;
        const bx = (((x + (row % 2) * 8) % 16) + 16) % 16, brick = Math.floor((x + (row % 2) * 8) / 16);
        if (bx === 0 || by === 7) col = C_.mortar;
        else if (by === 0) col = C_.light;
        else if (by === 6) col = C_.edge;
        else col = hash(brick, row, 51) < 0.4 ? C_.alt : C_.base;
      }
      if (x === x1 && y > FLOOR + 2) col = C_.light;
      if (x === x2 - 1 && y > FLOOR + 2) col = C_.mortar;
      r.set(x, y, col);
    }
  },
  platform(r, x, y, w) {
    for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
      let col = [C_.cap0, C_.light, C_.base, C_.base, C_.edge][j];
      if (j >= 1 && j <= 3 && (i % 8 === 0)) col = C_.mortar;
      if (i === 0 || i === w - 1) col = j === 0 ? C_.cap1 : C_.mortar;
      r.set(x + i, y + j, col);
    }
  },
  spikes(r, x, w) {
    // Iron spears: thin, with gaps, on a bar.
    const t = new Raster(Math.ceil(w) + 2, 9), n = Math.max(1, Math.round(w / 4));
    const tw = w / n;
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(i * tw + tw / 2);
      for (let py = 0; py < 6; py++) {
        const half = py < 2 ? 0 : 1;
        for (let px = cx - half; px <= cx + half; px++) t.set(px + 1, py + 1, py === 0 ? C_.iron[0] : px < cx ? C_.iron[1] : px === cx ? C_.iron[1] : C_.iron[2]);
      }
    }
    for (let px = 0; px < Math.ceil(w); px++) t.set(px + 1, 7, C_.iron[3]);
    t.outline(ol);
    blit(r, t, Math.floor(x) - 1, FLOOR - 8);
  },
  door(r, x, kind) {
    const y = FLOOR - 28, d = new Raster(16, 28), gold = kind === 'exit';
    const bar = gold ? [c('#fff3b0'), c('#f5d328'), c('#8a6d10')] : [C_.light, C_.base, C_.mortar];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      let col;
      if (i < 2 || i > 13 || j < 3) {                          // the stone frame and lintel
        col = j === 0 || i === 0 ? C_.light : (j === 2 || i === 1) ? C_.edge : C_.base;
        if (j < 3 && i % 5 === 4) col = C_.mortar;
      } else {
        const gx = (i - 2) % 3, gy = (j - 3) % 6;
        col = gx === 0 ? bar[1] : gy === 0 ? bar[2] : c('#0a0a12');
        if (gx === 0 && (j & 1)) col = bar[0];
      }
      d.set(i, j, col);
    }
    if (!gold) { rect(d, 6, 5, 4, 5, C_.mortar); rect(d, 7, 6, 2, 3, c('#5cadd5')); d.set(7, 6, c('#d8f6ff')); }
    else { rect(d, 6, 5, 4, 5, c('#8a6d10')); rect(d, 7, 6, 2, 3, c('#ffffff')); }
    paintDoor(r, d, x, y, kind);
  },
};


export const STYLES = { TODAY, A, B, C: Cc };

// ── Backdrops ─────────────────────────────────────────────────────────
//
// Each is built from the coming boss's primary, never brighter than today's
// flat colour (k = 0.16) anywhere near the ground, so the ground and its edge
// keep at least the contrast they have now against all seventeen.

export const BACKDROPS = {
  TODAY: { name: 'TODAY', paint(r, b) { rect(r, 0, 0, W, H, backdropOf(b)); } },
  SKYLINE: {
    name: '1',
    paint(r, b) {
      rect(r, 0, 0, W, H, backdropOf(b));
      const sil = tone(b, 0.1), lit = tone(b, 0.34);
      let x = 0, s = 0;
      while (x < W) {                                          // far towers, 6 to 14 wide
        const bw = 6 + Math.floor(hash(s, 0, 61) * 9), bh = 26 + Math.floor(noise1(s * 0.6, 62) * 46);
        for (let i = 0; i < bw && x + i < W; i++) for (let y = FLOOR - bh; y < FLOOR; y++) {
          const win = (i % 3 === 1) && ((y - (FLOOR - bh)) % 4 === 2) && hash(x + i, y, s) > 0.82 && y < FLOOR - 6;
          r.set(x + i, y, win ? lit : sil);
        }
        x += bw + (hash(s, 1, 63) < 0.3 ? 2 : 0); s++;
      }
    },
  },
  HILLS: {
    name: '2',
    paint(r, b) {
      for (let y = 0; y < H; y++) {                            // row-by-row sky, dark at the top
        const k = 0.07 + 0.09 * Math.min(1, y / 150);
        const lo = tone(b, k - 0.012), hi = tone(b, k);
        for (let x = 0; x < W; x++) r.set(x, y, pick([lo, hi], 0.5, x, y));
      }
      const far = tone(b, 0.115), near = tone(b, 0.075), edge = tone(b, 0.15);
      for (let x = 0; x < W; x++) {
        const fh = 118 + Math.round(24 * noise1(x * 0.018, 71) + 8 * noise1(x * 0.07, 72));
        const nh = 150 + Math.round(16 * noise1(x * 0.03, 73) + 4 * noise1(x * 0.2, 74));
        for (let y = fh; y < FLOOR; y++) r.set(x, y, y === fh ? edge : far);
        for (let y = nh; y < FLOOR; y++) r.set(x, y, pick([near, far], (y - nh) < 2 ? 0.6 : 0.15, x, y));
      }
    },
  },
  STARS: {
    name: '3',
    paint(r, b) {
      for (let y = 0; y < H; y++) {
        const k = 0.05 + 0.11 * Math.min(1, y / 170);
        for (let x = 0; x < W; x++) r.set(x, y, pick([tone(b, k - 0.015), tone(b, k)], 0.5, x, y));
      }
      // A far moon in the boss's own colour, high and to the right.
      const mx = 392, my = 58, mr = 15, moon = [tone(b, 0.2), tone(b, 0.26), tone(b, 0.32)];
      for (let y = my - mr; y <= my + mr; y++) for (let x = mx - mr; x <= mx + mr; x++) {
        const dx = x + 0.5 - mx, dy = y + 0.5 - my;
        if (dx * dx + dy * dy > mr * mr) continue;
        const lit = 0.75 - (dx + dy) / (mr * 3.2) - (noise2(x * 0.4, y * 0.4, 81) > 0.72 ? 0.35 : 0);
        r.set(x, y, pick(moon, lit, x, y));
      }
      for (let i = 0; i < 70; i++) {                           // stars, above the ground's haze
        const x = Math.floor(hash(i, 0, 91) * W), y = Math.floor(hash(i, 1, 92) * 132);
        const bright = hash(i, 2, 93) > 0.8;
        if ((x - mx) ** 2 + (y - my) ** 2 < (mr + 3) ** 2) continue;
        r.set(x, y, bright ? [236, 240, 250] : [128, 136, 156]);
        if (bright && hash(i, 3, 94) > 0.5) { r.set(x - 1, y, [96, 104, 124]); r.set(x + 1, y, [96, 104, 124]); }
      }
    },
  },
};

// ── Scenes and strips ─────────────────────────────────────────────────

/** Where everything stands in a scene, the same in every picture so they can be compared. */
export const LAYOUT = { pit: [200, 232], platform: [120, 144, 44], spikes: [276, 20], door: 420, unarmed: 372, exit: 440 };

/**
 * One screen, 480 wide (a dotted line marks where a 320 screen ends): the
 * backdrop, ground with a pit, a platform, a spike bed and a door, the player
 * standing for scale, and the see-through thumb pads drawn the game's way.
 * `pieces` names a material per piece; `room` draws the exit door in a plain
 * boss room instead of an area.
 */
export function scene({ bg = 'TODAY', ground = 'TODAY', platform = 'TODAY', spikes = 'TODAY', door = 'TODAY', exit = 'TODAY', boss, room = false, unarmed = false }, player) {
  const r = new Raster(W, H);
  BACKDROPS[bg].paint(r, boss);
  if (room) {
    STYLES[ground].ground(r, 0, W);
    rect(r, 0, 0, 8, FLOOR, tone(boss, 0.07)); rect(r, W - 8, 0, 8, FLOOR, tone(boss, 0.07));
    rect(r, 8, 0, 1, FLOOR, tone(boss, 0.12)); rect(r, W - 9, 0, 1, FLOOR, tone(boss, 0.12));
    STYLES[exit].door(r, LAYOUT.exit, 'exit');
  } else {
    STYLES[ground].ground(r, 0, LAYOUT.pit[0]);
    STYLES[ground].ground(r, LAYOUT.pit[1], W);
    const [px, py, pw] = LAYOUT.platform;
    STYLES[platform].platform(r, px, py, pw);
    STYLES[spikes].spikes(r, LAYOUT.spikes[0], LAYOUT.spikes[1]);
    STYLES[door].door(r, LAYOUT.door, 'boss');
    if (unarmed) STYLES[door].door(r, LAYOUT.unarmed, 'unarmed');
  }
  overlay(r);
  const cv = r.flush();
  if (player) cv.getContext('2d').drawImage(player, 0, 0, 24, 24, 52, FLOOR - 24, 24, 24);
  return cv;
}

/** The see-through thumb pads (a thin gold border at 70%, as UIScene draws them) and a dotted line where a 320 screen ends. */
export function overlay(r) {
  const pads = [[0, 35], [36, 35], [72, 35], [108, 35], [W - 108, 53], [W - 54, 53]];
  for (const [x, w] of pads) {
    rect(r, x, PADS, w, 1, c('#f5d328'), 178); rect(r, x, H - 1, w, 1, c('#f5d328'), 178);
    rect(r, x, PADS, 1, H - PADS, c('#f5d328'), 178); rect(r, x + w - 1, PADS, 1, H - PADS, c('#f5d328'), 178);
  }
  for (let y = 0; y < H; y += 2) r.set(320, y, [255, 255, 255], 90);
}

/** The part of a scene a strip shows for each piece: x, y of a 28 x 40 window. */
export const CROPS = { bg: [340, 130], ground: [186, 164], platform: [128, 128], spikes: [272, 160], door: [414, 150], exit: [434, 150] };

/** The scene once per boss, cropped to the piece: seventeen windows side by side under the main picture. */
export function composite(opts, crop, player) {
  const main = scene(opts, player);
  const out = document.createElement('canvas');
  out.width = W; out.height = H + 4 + 40;
  const g = out.getContext('2d');
  g.fillStyle = '#060614'; g.fillRect(0, 0, out.width, out.height);
  g.drawImage(main, 0, 0);
  const [cx, cy] = CROPS[crop];
  BOSSES.forEach((b, i) => {
    const s = scene({ ...opts, boss: b }, player);
    g.drawImage(s, cx, cy, 28, 40, 2 + i * 28, H + 4, 28, 40);
  });
  return out;
}

/** The worst contrast a material's ground and edge reach against the seventeen backdrops, and the player's white on its ground. */
export function contrast(style) {
  const lum = (rgb) => {
    const ch = rgb.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const { ground, cap } = STYLES[style].check;
  return {
    ground: Math.min(...BOSSES.map((b) => cr(c(ground), backdropOf(b)))),
    cap: Math.min(...BOSSES.map((b) => cr(c(cap), backdropOf(b)))),
    player: cr([255, 255, 255], c(ground)),
  };
}

// Shared with the per-slice kits (materials.mjs, backdrops.mjs).
export { c, rect, blit, inTooth, paintDoor, tone, A_, B_, C_ };
