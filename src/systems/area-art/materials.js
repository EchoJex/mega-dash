/**
 * MATERIALS FOR EACH SLICE'S WORLD PIECES — VARIANTS FOR THE OWNER TO PICK FROM.
 * NONE OF THIS IS IN THE GAME.
 *
 * Drawn by Claude at the owner's request, 2026-11-05: "new plan. draw up all 17 slices world
 * pieces just like you did here(floor, platform, exit door, spikes)", with boss doors too.
 *
 * Eight kinds of material, each painting a floor, a platform, a spike bed and a door from a
 * palette, at the game's own sizes: the floor line at 184 with a 2-pixel lit top edge,
 * platforms 5 thick, spikes 7 tall, doors 16 by 28. A slice's three variants are a kind, a
 * palette and a few options (batch1.mjs). Nothing here changes a size or a hit box.
 */

import { Raster, hex, pick, hash, noise1, noise2, OL } from '../arena-art/pixels.js';
import { H, FLOOR, rect, blit, inTooth, paintDoor } from './kit.js';

const ol = hex(OL);
/** A palette of '#rrggbb' strings, turned into [r, g, b] once. */
export const pal = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, hex(v)]));
const mod = (a, n) => ((a % n) + n) % n;
const CYAN = [hex('#5cadd5'), hex('#d8f6ff')], WHITE = [hex('#fff4c8'), hex('#ffffff')];
const GOLD = [hex('#5c4a0a'), hex('#c9a21e'), hex('#f5d328'), hex('#fff3b0')];
const BATTERY = {   // rows of [left, middle, right]
  nub: hex('#ffffff'), cap: ['#e8e8f0', '#b0b0c4', '#6c6c80'].map(hex), band: ['#9a6ae8', '#5b21b6', '#2e0f60'].map(hex),
  cell: ['#fff7b0', '#f5d328', '#a8820c'].map(hex), foot: ['#c9a21e', '#a8820c', '#6a5208'].map(hex),
};

/** The lit top edge every floor shares: two rows, then whatever the kind paints below. */
function lip(r, x1, x2, P) {
  for (let x = x1; x < x2; x++) { r.set(x, FLOOR, P.cap0); r.set(x, FLOOR + 1, P.cap1); }
}
/** The faces of a pit: lit on the left wall of the gap, dark on the right. */
function faces(r, x1, x2, P, from = FLOOR + 2) {
  for (let y = from; y < H; y++) { r.set(x1, y, P.light); r.set(x2 - 1, y, P.deep); }
}

// ── Spike beds ────────────────────────────────────────────────────────

function bed(w, paint) {
  const t = new Raster(Math.ceil(w) + 2, 10);
  paint(t);
  t.outline(ol);
  return t;
}
const SPIKES = {
  cones(r, x, w, P) {
    const n = Math.max(1, Math.round(w / 5)), tw = w / n;
    blit(r, bed(w, (t) => {
      for (let py = 0; py < 7; py++) for (let px = 0; px < Math.ceil(w); px++) for (let i = 0; i < n; i++) {
        if (!inTooth(px, py, i * tw, tw, 0, 7)) continue;
        const left = px + 0.5 < i * tw + tw / 2;
        t.set(px + 1, py + 2, py === 6 ? P.deep : left ? (py < 3 ? P.thi : P.tlight) : P.tdark);
        break;
      }
    }), Math.floor(x) - 1, FLOOR - 9);
  },
  shards(r, x, w, P) {
    const n = Math.max(1, Math.round(w / 5)), tw = w / n;
    blit(r, bed(w, (t) => {
      for (let i = 0; i < n; i++) {
        const h = 5 + Math.floor(hash(i, Math.floor(x), 31) * 3);
        for (let py = 7 - h; py < 7; py++) for (let px = Math.floor(i * tw); px < Math.ceil((i + 1) * tw); px++) {
          if (!inTooth(px, py, i * tw, tw, 7 - h, h)) continue;
          t.set(px + 1, py + 2, px + 0.5 < i * tw + tw / 2 ? (py < 9 - h ? P.thi : P.tlight) : P.tdark);
        }
      }
    }), Math.floor(x) - 1, FLOOR - 9);
  },
  spears(r, x, w, P) {
    const n = Math.max(1, Math.round(w / 4)), tw = w / n;
    blit(r, bed(w, (t) => {
      for (let i = 0; i < n; i++) {
        const cx = Math.floor(i * tw + tw / 2);
        for (let py = 0; py < 6; py++) {
          const half = py < 2 ? 0 : 1;
          for (let px = cx - half; px <= cx + half; px++) t.set(px + 1, py + 2, py === 0 ? P.thi : px > cx ? P.tdark : P.tlight);
        }
      }
      for (let px = 0; px < Math.ceil(w); px++) t.set(px + 1, 8, P.deep);
    }), Math.floor(x) - 1, FLOOR - 9);
  },
  thorns(r, x, w, P) {
    // Bramble: hooked thorns leaning right off a woody vine along the floor.
    const n = Math.max(1, Math.round(w / 5)), tw = w / n;
    blit(r, bed(w, (t) => {
      for (let i = 0; i < n; i++) {
        const bx = Math.floor(i * tw) + 1;
        const shape = [[2, 0], [2, 1], [1, 2], [2, 2], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4], [0, 5], [1, 5], [2, 5], [3, 5]];
        for (const [dx, dy] of shape) t.set(bx + dx, dy + 2, dy < 2 ? P.thi : dx < 2 ? P.tlight : P.tdark);
      }
      for (let px = 0; px < Math.ceil(w); px++) { t.set(px + 1, 8, P.deep); if (hash(px, 3, 9) > 0.6) t.set(px + 1, 7, P.tdark); }
    }), Math.floor(x) - 1, FLOOR - 9);
  },
  stakes(r, x, w, P) {
    // Sharpened wooden stakes bound with a rope.
    const n = Math.max(1, Math.round(w / 4)), tw = w / n;
    blit(r, bed(w, (t) => {
      for (let i = 0; i < n; i++) {
        const bx = Math.floor(i * tw) + 1;
        for (let py = 0; py < 7; py++) for (let dx = 0; dx < 3; dx++) {
          if (py === 0 && dx !== 1) continue;
          if (py === 1 && dx === 2) continue;
          t.set(bx + dx, py + 2, py < 2 ? P.thi : dx === 0 ? P.tlight : dx === 2 ? P.tdark : P.tlight);
        }
      }
      for (let px = 0; px < Math.ceil(w); px++) t.set(px + 1, 6, (px & 1) ? P.rope : P.deep);
    }), Math.floor(x) - 1, FLOOR - 9);
  },
  glass(r, x, w, P) {
    // Obsidian (the owner's ask for Fire, 5 Nov 2026): jagged jet-black glass, each shard lit
    // white down its left edge and caught dark grey on its right, so it reads on a dark sky.
    const n = Math.max(1, Math.round(w / 5)), tw = w / n;
    blit(r, bed(w, (t) => {
      for (let i = 0; i < n; i++) {
        const h = 5 + Math.floor(hash(i, Math.floor(x), 31) * 3), x0 = i * tw;
        for (let py = 7 - h; py < 7; py++) {
          const row = [];
          for (let px = Math.floor(x0); px < Math.ceil(x0 + tw); px++) if (inTooth(px, py, x0, tw, 7 - h, h)) row.push(px);
          row.forEach((px, k) => {
            const d = py - (7 - h);   // rows below the tip
            t.set(px + 1, py + 2, k === 0 ? (d < 3 ? P.obs3 : P.obs2) : k === row.length - 1 || (k === 1 && d < 4) ? P.obs1 : P.obs0);
          });
        }
      }
    }), Math.floor(x) - 1, FLOOR - 9);
  },
  batteries(r, x, w) {
    // AA batteries standing in a row, terminal nub up (the owner's ask for Electric, 5 Nov 2026):
    // a silver cap and nub, a violet band, a yellow cell, each lit on its left like a cylinder.
    const n = Math.max(1, Math.round(w / 4)), tw = w / n;
    blit(r, bed(w, (t) => {
      for (let i = 0; i < n; i++) {
        const bx = Math.floor(i * tw + (tw - 3) / 2) + 1;
        t.set(bx + 1, 2, BATTERY.nub);
        for (let j = 1; j < 7; j++) {
          const row = j === 1 ? BATTERY.cap : j === 2 ? BATTERY.band : j === 6 ? BATTERY.foot : BATTERY.cell;
          for (let k = 0; k < 3; k++) t.set(bx + k, j + 2, row[k]);
        }
      }
    }), Math.floor(x) - 1, FLOOR - 9);
  },
  prongs(r, x, w, P) {
    // Metal prongs with lit tips: the electric kind.
    const n = Math.max(1, Math.round(w / 4)), tw = w / n;
    blit(r, bed(w, (t) => {
      for (let i = 0; i < n; i++) {
        const cx = Math.floor(i * tw + tw / 2) + 1;
        for (let py = 2; py < 7; py++) t.set(cx, py + 2, P.tlight);
        t.set(cx, 2, P.glow); t.set(cx, 3, P.glow); t.set(cx - 1, 3, P.glow2); t.set(cx + 1, 3, P.glow2); t.set(cx, 1, P.glow2);
      }
      for (let px = 0; px < Math.ceil(w); px++) { t.set(px + 1, 8, P.deep); t.set(px + 1, 7, P.tdark); }
    }), Math.floor(x) - 1, FLOOR - 9);
  },
};

// ── Doors: 16 by 28, a cyan light for a boss, gold for the way out ────

function door(paint) {
  return (r, x, kind, P) => {
    const d = new Raster(16, 28), exit = kind === 'exit';
    paint(d, P, exit, exit ? WHITE : CYAN);
    paintDoor(r, d, x, FLOOR - 28, kind);
  };
}
const lamp = (d, x, y, L) => { rect(d, x - 1, y - 1, 4, 4, ol); rect(d, x, y, 2, 2, L[0]); d.set(x, y, L[1]); };
const DOORS = {
  shutter: door((d, P, exit, L) => {
    const sl = exit ? [GOLD[0], GOLD[1], GOLD[2]] : [P.deep, P.base, P.light];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      if (i < 2 || i > 13 || j < 2) d.set(i, j, i === 1 || j === 1 ? P.light : P.dark);
      else { const k = (j - 2) % 4; d.set(i, j, k === 3 ? sl[0] : k === 0 ? sl[2] : sl[1]); }
    }
    lamp(d, 7, 5, L);
  }),
  arch: door((d, P, exit, L) => {
    const stones = [P.dark, P.base, P.light];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      const dx = i + 0.5 - 8, dy = j + 0.5 - 8;
      if (j < 8 && dx * dx + dy * dy > 64) continue;
      const inner = j >= 3 && i >= 3 && i <= 12 && (j >= 8 || dx * dx + dy * dy <= 25);
      if (inner) {
        const t = (j - 3) / 24;
        d.set(i, j, exit ? pick([GOLD[1], GOLD[2], GOLD[3]], 0.25 + 0.7 * t, i, j) : pick([ol, P.void || P.deep, P.deep], 0.2 + 0.6 * t, i, j));
      } else {
        const ci = (i + (Math.floor(j / 5) % 2) * 2) % 4, jr = j % 5;
        const mortar = jr === 0 || (ci === 0 && j > 8);
        if (mortar) d.set(i, j, P.mortar || P.deep);
        // Obsidian blocks (P.obs0..3): black glass, a white glint at each block's top corner.
        else if (P.obs0) d.set(i, j, jr === 1 ? (ci === 1 ? P.obs3 : P.obs1) : jr === 2 && ci === 1 ? P.obs1 : P.obs0);
        else d.set(i, j, stones[Math.floor(hash(i >> 1, Math.floor(j / 5), 41) * 3)]);
      }
    }
    if (!exit) for (const [i, j] of [[7, 11], [8, 11], [6, 12], [9, 12], [7, 15], [8, 15], [6, 16], [9, 16], [7, 19], [8, 19], [7, 20], [8, 20]]) d.set(i, j, L[0]);
  }),
  gate: door((d, P, exit, L) => {
    const bar = exit ? [GOLD[3], GOLD[2], GOLD[0]] : [P.light, P.base, P.deep];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      if (i < 2 || i > 13 || j < 3) d.set(i, j, j === 0 || i === 0 ? P.light : (j === 2 || i === 1) ? P.dark : P.base);
      else { const gx = (i - 2) % 3, gy = (j - 3) % 6; d.set(i, j, gx === 0 ? ((j & 1) ? bar[0] : bar[1]) : gy === 0 ? bar[2] : ol); }
    }
    lamp(d, 7, 6, L);
  }),
  wood: door((d, P, exit, L) => {
    const wood = exit ? [GOLD[0], GOLD[1], GOLD[2]] : [P.deep, P.base, P.light];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      if (i === 0 || i === 15 || j === 0) { d.set(i, j, P.deep); continue; }
      if (i === 7 || i === 8) { d.set(i, j, i === 7 ? wood[0] : wood[1]); continue; }       // the split between the leaves
      const board = (i < 8 ? i : i - 8) % 3;
      let col = board === 0 ? wood[0] : board === 1 ? wood[2] : wood[1];
      if (j === 7 || j === 8 || j === 20 || j === 21) col = j % 2 ? P.iron || P.deep : P.ironLight || P.dark;   // iron bands
      d.set(i, j, col);
    }
    d.set(5, 14, P.ironLight || P.light); d.set(10, 14, P.ironLight || P.light);
    lamp(d, 7, 3, L);
  }),
  shoji: door((d, P, exit, L) => {
    const paper = exit ? [GOLD[2], GOLD[3]] : [P.paper, P.paperLight];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      const frame = i < 2 || i > 13 || j < 2 || j > 25 || i === 7 || i === 8;
      const lattice = !frame && (((i - 2) % 3 === 2 && i < 7) || ((i - 9) % 3 === 2 && i > 8) || (j - 2) % 5 === 4);
      d.set(i, j, frame ? (i === 0 || j === 0 ? P.light : P.deep) : lattice ? P.base : ((i + j) % 7 === 0 ? paper[1] : paper[0]));
    }
    if (!exit) { rect(d, 3, 10, 3, 2, L[0]); rect(d, 10, 10, 3, 2, L[0]); }   // the light behind, a cyan glow
  }),
  hedge: door((d, P, exit, L) => {
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      const dx = i + 0.5 - 8, dy = j + 0.5 - 9;
      if (j < 9 && dx * dx + dy * dy > 81) continue;
      const inner = j >= 4 && i >= 3 && i <= 12 && (j >= 9 || dx * dx + dy * dy <= 30);
      if (inner) d.set(i, j, exit ? pick([GOLD[1], GOLD[2], GOLD[3]], 0.2 + (j - 4) / 30, i, j) : pick([ol, P.void || P.deep], 0.3 + (j - 4) / 40, i, j));
      else d.set(i, j, pick([P.leafDark, P.leaf, P.leafLight], 0.45 + 0.35 * (noise2(i * 0.6, j * 0.6, 7) - 0.5) - j * 0.006, i, j));
    }
    if (!exit) { d.set(7, 6, P.deep); d.set(8, 6, P.deep); rect(d, 7, 7, 2, 3, L[0]); d.set(7, 7, L[1]); }   // a lantern hung in the arch
  }),
  hatch: door((d, P, exit, L) => {
    const face = exit ? [GOLD[0], GOLD[1], GOLD[2]] : [P.deep, P.base, P.light];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      if (i < 2 || i > 13 || j < 2) { d.set(i, j, i === 1 || j === 1 ? P.light : P.dark); continue; }
      d.set(i, j, (j === 2 || i === 2) ? face[2] : (j === 27 || i === 13) ? face[0] : face[1]);
    }
    // The wheel: a ring with four spokes, in the middle of the door.
    for (let j = 9; j < 20; j++) for (let i = 2; i < 14; i++) {
      const dx = i + 0.5 - 8, dy = j + 0.5 - 14.5, rr = dx * dx + dy * dy;
      if (rr >= 12 && rr <= 22) d.set(i, j, exit ? GOLD[3] : P.hi);
      else if (rr < 12 && (Math.abs(dx) < 0.6 || Math.abs(dy) < 0.6)) d.set(i, j, exit ? GOLD[3] : P.hi);
    }
    lamp(d, 7, 4, L);
  }),
  energy: door((d, P, exit, L) => {
    const field = exit ? [GOLD[1], GOLD[2], GOLD[3]] : [P.deep, L[0], L[1]];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
      if (i < 3 || i > 12 || j < 3) { d.set(i, j, i === 0 || j === 0 ? P.light : (i === 2 || i === 13 || j === 2) ? P.deep : P.base); continue; }
      d.set(i, j, pick(field, 0.35 + 0.4 * Math.abs(Math.sin((i * 0.9) + j * 0.15)), i, j));
    }
    for (const [i, j] of [[1, 6], [14, 6], [1, 20], [14, 20]]) d.set(i, j, exit ? GOLD[3] : L[1]);   // emitters
  }),
};

// ── Floor kinds ───────────────────────────────────────────────────────

function plates(P, o = {}) {
  return {
    ground(r, x1, x2) {
      lip(r, x1, x2, P);
      for (let y = FLOOR + 2; y < H; y++) for (let x = x1; x < x2; x++) {
        let col;
        if (y === FLOOR + 2) col = P.deep;
        else if (o.stripe && y < FLOOR + 7) col = mod(x + y, 8) < 4 ? P.stripeA : P.stripeB;
        else if (o.diamond) {
          // Diamond plate: raised studs on a staggered grid.
          const sx = mod(x + (Math.floor((y - FLOOR) / 4) % 2) * 3, 6), sy = mod(y - FLOOR - 3, 4);
          col = sx === 1 && sy === 1 ? P.hi : sx === 2 && sy === 2 ? P.dark : (mod(x, 32) === 0 ? P.deep : P.base);
        } else {
          const tx = mod(x, 16), ty = mod(y - FLOOR - 3, 16);
          const riv = (tx === 3 || tx === 12) && (ty === 3 || ty === 12), sh = (tx === 4 || tx === 13) && (ty === 4 || ty === 13);
          col = tx === 0 || ty === 0 ? P.deep : riv ? P.hi : sh ? P.deep : tx === 1 || ty === 1 ? P.light : tx === 15 || ty === 15 ? P.dark : P.base;
        }
        r.set(x, y, col);
      }
      faces(r, x1, x2, P, FLOOR + 3);
    },
    platform(r, x, y, w) {
      for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
        let col = [P.cap0, P.light, P.base, P.base, P.dark][j];
        if (j === 2 && i % 6 === 3) col = P.deep;
        if (i === 0 || i === w - 1) col = j === 0 ? P.cap1 : P.deep;
        if ((i === 2 || i === w - 3) && j === 2) col = P.hi;
        r.set(x + i, y + j, col);
      }
    },
    spikes: (r, x, w) => SPIKES[o.spikes || 'cones'](r, x, w, P),
    door: (r, x, kind) => DOORS[o.door || 'shutter'](r, x, kind, P),
  };
}

function strata(P, o = {}) {
  return {
    ground(r, x1, x2) {
      lip(r, x1, x2, P);
      const rp = [P.dark, P.base, P.mid, P.light];
      for (let y = FLOOR; y < H; y++) for (let x = x1; x < x2; x++) {
        if (y === FLOOR) { if (o.wet && hash(x >> 2, 1, 5) > 0.82) r.set(x, y, P.hi); else if (hash(x, 1, 5) < 0.18) r.set(x, y, P.cap1); continue; }
        if (y === FLOOR + 1) continue;
        let col;
        if (y === FLOOR + 2 || (y === FLOOR + 3 && hash(x >> 1, 2, 9) < 0.3)) col = P.deep;
        else {
          const band = Math.sin((y + 5 * noise1(x * 0.045, 3)) * 0.75);
          col = pick(rp, Math.max(0.12, 0.48 + 0.22 * band + 0.25 * (noise2(x * 0.18, y * 0.35, 7) - 0.5)), x, y);
          if (o.cracks && y > FLOOR + 5) {
            const v = Math.abs(noise2(x * 0.09, y * 0.16, 17) - 0.5);
            if (v < 0.01) col = P.glow2; else if (v < 0.024) col = P.glow;
          }
        }
        r.set(x, y, col);
      }
      faces(r, x1, x2, P, FLOOR + 2);
    },
    platform(r, x, y, w) {
      for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
        if ((i === 0 || i === w - 1) && (j === 0 || j === 4)) continue;
        const col = j < 2 ? [P.cap0, P.cap1][j] : j === 4 ? P.dark : pick([P.dark, P.base, P.mid], 0.45 + 0.3 * (noise2((x + i) * 0.3, j, 4) - 0.5), x + i, y + j);
        r.set(x + i, y + j, o.cracks && j === 3 && hash(x + i, 2, 3) > 0.85 ? P.glow : col);
      }
      for (let i = 3; i < w - 3; i++) { const k = hash(x + i, y, 21); if (k > 0.72) r.set(x + i, y + 5, P.deep); if (k > 0.9) r.set(x + i, y + 6, P.deep); }
    },
    spikes: (r, x, w) => SPIKES[o.spikes || 'shards'](r, x, w, P),
    door: (r, x, kind) => DOORS[o.door || 'arch'](r, x, kind, P),
  };
}

function bricks(P, o = {}) {
  const bw = o.bw || 16, bh = o.bh || 8;
  return {
    ground(r, x1, x2) {
      lip(r, x1, x2, P);
      for (let y = FLOOR + 2; y < H; y++) for (let x = x1; x < x2; x++) {
        let col;
        if (y === FLOOR + 2) col = o.glow ? P.glow : P.deep;
        else {
          const row = Math.floor((y - FLOOR - 3) / bh), by = (y - FLOOR - 3) % bh;
          const sx = x + (row % 2) * (bw / 2), bx = mod(sx, bw), brick = Math.floor(sx / bw);
          if (bx === 0 || by === bh - 1) col = o.glow ? (hash(brick, row, 3) > 0.5 ? P.glow : P.glow2) : P.deep;
          else if (by === 0) col = P.light;
          else if (by === bh - 2) col = P.dark;
          else col = hash(brick, row, 51) < 0.4 ? P.alt : P.base;
          if (o.moss && y < FLOOR + 12 && noise2(x * 0.2, y * 0.5, 23) > 0.55 - (FLOOR + 12 - y) * 0.03) col = pick([P.mossDark, P.moss], 0.5, x, y);
        }
        r.set(x, y, col);
      }
      faces(r, x1, x2, P, FLOOR + 3);
    },
    platform(r, x, y, w) {
      for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
        let col = [P.cap0, P.light, P.base, P.base, P.dark][j];
        if (j >= 1 && j <= 3 && i % (bw / 2) === 0) col = o.glow ? P.glow : P.deep;
        if (i === 0 || i === w - 1) col = j === 0 ? P.cap1 : P.deep;
        if (o.moss && j <= 1 && hash(x + i, j, 7) > 0.55) col = P.moss;
        r.set(x + i, y + j, col);
      }
    },
    spikes: (r, x, w) => SPIKES[o.spikes || 'spears'](r, x, w, P),
    door: (r, x, kind) => DOORS[o.door || 'gate'](r, x, kind, P),
  };
}

function planks(P, o = {}) {
  const bh = o.bh || 6;
  return {
    ground(r, x1, x2) {
      lip(r, x1, x2, P);
      for (let y = FLOOR + 2; y < H; y++) for (let x = x1; x < x2; x++) {
        const row = Math.floor((y - FLOOR - 2) / bh), by = (y - FLOOR - 2) % bh;
        let col;
        if (o.bamboo) {
          col = by === 0 ? P.light : by === 1 ? P.hi : by === bh - 1 ? P.deep : P.base;
          if (mod(x + row * 7, 14) === 0 && by > 0 && by < bh - 1) col = P.dark;            // the nodes
          if (mod(x + row * 7, 14) === 1 && by > 0 && by < bh - 1) col = P.light;
        } else {
          const len = 40, joint = mod(x + Math.floor(hash(row, 0, 61) * len), len);
          col = by === 0 ? P.light : by === bh - 1 ? P.deep : P.base;
          if (by > 0 && by < bh - 1 && noise1(x * 0.12 + row * 13.7, 62) > 0.72) col = P.dark;  // grain
          if (joint === 0) col = P.deep;
          if ((joint === 2 || joint === len - 2) && (by === 1 || by === bh - 2)) col = P.hi;     // nails
        }
        r.set(x, y, col);
      }
      faces(r, x1, x2, P, FLOOR + 2);
    },
    platform(r, x, y, w) {
      for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
        let col = [P.cap0, P.light, P.base, P.base, P.deep][j];
        if (o.bamboo) { if (j > 0 && j < 4 && i % 14 === 6) col = P.dark; }
        else if (j > 0 && j < 4 && i % 10 === 0) col = P.deep;
        if (i === 0 || i === w - 1) col = j === 0 ? P.cap1 : P.deep;
        if ((i === 2 || i === w - 3) && j >= 1 && j <= 3) col = o.bamboo ? P.rope : (j === 2 ? P.hi : col);
        r.set(x + i, y + j, col);
      }
    },
    spikes: (r, x, w) => SPIKES[o.spikes || 'stakes'](r, x, w, P),
    door: (r, x, kind) => DOORS[o.door || 'wood'](r, x, kind, P),
  };
}

function turf(P, o = {}) {
  return {
    ground(r, x1, x2) {
      for (let x = x1; x < x2; x++) {
        const blade = Math.floor(hash(x, 4, 71) * 4);           // how far the grass hangs into the soil
        for (let y = FLOOR; y < H; y++) {
          let col;
          if (y === FLOOR) col = hash(x, 1, 72) < 0.2 ? P.cap1 : P.cap0;
          else if (y === FLOOR + 1) col = P.cap1;
          else if (y < FLOOR + 2 + blade) col = (y + x) & 1 ? P.grassDark : P.cap1;
          else {
            col = pick([P.dark, P.base, P.mid], 0.45 + 0.35 * (noise2(x * 0.15, y * 0.3, 73) - 0.5), x, y);
            if (Math.abs(noise2(x * 0.07, y * 0.2, 74) - 0.5) < 0.02) col = P.root;
            if (hash(x >> 1, y >> 1, 75) > 0.96) col = P.light;
          }
          r.set(x, y, col);
        }
        // Tufts poking a pixel or two above the floor line: drawing only.
        const tuft = hash(x, 5, 76);
        if (tuft > 0.82 && x > x1 && x < x2 - 1) { r.set(x, FLOOR - 1, P.cap0); if (tuft > 0.93) r.set(x, FLOOR - 2, o.flowers && tuft > 0.97 ? P.flower : P.cap1); }
      }
      faces(r, x1, x2, P, FLOOR + 4);
    },
    platform(r, x, y, w) {
      for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
        if ((i === 0 || i === w - 1) && j === 4) continue;
        const col = [P.cap0, P.cap1, P.grassDark, P.base, P.dark][j];
        r.set(x + i, y + j, j === 2 && (i & 1) ? P.base : col);
      }
      for (let i = 2; i < w - 2; i++) { const k = hash(x + i, y, 77); if (k > 0.7) r.set(x + i, y + 5, P.root); if (k > 0.88) r.set(x + i, y + 6, P.root); }
    },
    spikes: (r, x, w) => SPIKES[o.spikes || 'thorns'](r, x, w, P),
    door: (r, x, kind) => DOORS[o.door || 'hedge'](r, x, kind, P),
  };
}

function concrete(P, o = {}) {
  return {
    ground(r, x1, x2) {
      lip(r, x1, x2, P);
      for (let y = FLOOR + 2; y < H; y++) for (let x = x1; x < x2; x++) {
        let col = y === FLOOR + 2 ? P.deep : pick([P.dark, P.base], 0.75 + 0.3 * (noise2(x * 0.05, y * 0.08, 81) - 0.5), x, y);
        const sp = hash(x, y, 82);
        if (y > FLOOR + 2 && sp < 0.05) col = P.light; else if (y > FLOOR + 2 && sp < 0.08) col = P.dark;
        if (o.hazard && y >= FLOOR + 3 && y < FLOOR + 7) col = mod(x - y, 8) < 4 ? P.stripeA : P.stripeB;
        if (o.tape && (y === FLOOR + 5 || y === FLOOR + 6) && mod(x, 24) < 18) col = P.tape;
        if (mod(x, o.joint || 32) === 0 && y > FLOOR + 2) col = P.deep;
        if (y === FLOOR + 22) col = P.dark;
        r.set(x, y, col);
      }
      faces(r, x1, x2, P, FLOOR + 3);
    },
    platform(r, x, y, w) {
      for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
        let col = [P.cap0, P.cap1, P.base, P.base, P.dark][j];
        if (o.tape && j === 2 && i % 8 < 5) col = P.tape;
        if (i === 0 || i === w - 1) col = j === 0 ? P.cap1 : P.deep;
        if ((i === 1 || i === w - 2) && j === 3) col = P.rust || P.dark;     // rebar ends
        r.set(x + i, y + j, col);
      }
    },
    spikes: (r, x, w) => SPIKES[o.spikes || 'spears'](r, x, w, P),
    door: (r, x, kind) => DOORS[o.door || 'hatch'](r, x, kind, P),
  };
}

function grating(P, o = {}) {
  const under = (x, y) => o.under === 'coals' ? pick([P.void, P.void, P.glow, P.glow2], 0.2 + 0.55 * (noise2(x * 0.12, y * 0.2, 91) - 0.25), x, y)
    : o.under === 'glow' ? pick([P.void, P.void, P.glow], 0.15 + 0.45 * noise2(x * 0.1, y * 0.12, 92), x, y) : P.void;
  return {
    ground(r, x1, x2) {
      lip(r, x1, x2, P);
      for (let y = FLOOR + 2; y < H; y++) for (let x = x1; x < x2; x++) {
        let col;
        if (y === FLOOR + 2) col = P.deep;
        else if (o.stripe && y < FLOOR + 7) col = mod(x + y, 8) < 4 ? P.stripeA : P.stripeB;
        else if (y < FLOOR + 7) col = y === FLOOR + 3 ? P.light : P.base;
        else {
          const beam = mod(x, 32);
          if (beam < 3) col = [P.light, P.base, P.dark][beam];
          else { const gx = mod(x, 4), gy = mod(y - FLOOR - 7, 4); col = gx === 0 || gy === 0 ? (gy === 0 ? P.light : P.base) : gx === 3 && gy === 3 ? P.dark : under(x, y); }
        }
        r.set(x, y, col);
      }
      faces(r, x1, x2, P, FLOOR + 3);
    },
    platform(r, x, y, w) {
      for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
        let col = j === 0 ? P.cap0 : j === 4 ? P.dark : (i % 3 === 0 ? P.base : under(x + i, y + j));
        if (i === 0 || i === w - 1) col = j === 0 ? P.cap1 : P.deep;
        r.set(x + i, y + j, col);
      }
    },
    spikes: (r, x, w) => SPIKES[o.spikes || 'prongs'](r, x, w, P),
    door: (r, x, kind) => DOORS[o.door || 'shutter'](r, x, kind, P),
  };
}

function tiles(P, o = {}) {
  const s = o.size || 8;
  return {
    ground(r, x1, x2) {
      lip(r, x1, x2, P);
      for (let y = FLOOR + 2; y < H; y++) for (let x = x1; x < x2; x++) {
        let col;
        if (y === FLOOR + 2) col = P.deep;
        else if (o.traces) {
          // A circuit board: a few lines running along the grid, with pads where they turn.
          const gx = mod(x, 12), gy = mod(y - FLOOR - 3, 10), cell = hash(Math.floor(x / 12), Math.floor((y - FLOOR - 3) / 10), 95);
          col = noise2(x * 0.1, y * 0.1, 96) > 0.6 ? P.alt : P.base;
          if (gy === 4 && cell > 0.35) col = P.trace;
          if (gx === 6 && cell < 0.55) col = P.trace;
          if (gx >= 5 && gx <= 7 && gy >= 3 && gy <= 5 && cell > 0.8) col = P.pad;
        } else {
          const tx = mod(x, s), ty = mod(y - FLOOR - 3, s);
          col = tx === 0 || ty === 0 ? P.deep : tx === 1 || ty === 1 ? P.light : tx === s - 1 || ty === s - 1 ? P.dark : P.base;
          if (tx === 2 && ty === 2) col = P.hi;
          if (o.wave && Math.floor((y - FLOOR - 3) / s) % 2 === 1 && ty === Math.round(s / 2 + Math.sin(x * 0.8)) && tx > 1) col = P.light;
        }
        r.set(x, y, col);
      }
      faces(r, x1, x2, P, FLOOR + 3);
    },
    platform(r, x, y, w) {
      for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) {
        let col = j === 0 ? P.cap0 : j === 4 ? P.deep : (i % 4 === 0 ? P.deep : j === 1 ? P.light : P.base);
        if (o.traces && j === 2 && i % 4 !== 0) col = P.trace;
        if (i === 0 || i === w - 1) col = j === 0 ? P.cap1 : P.deep;
        r.set(x + i, y + j, col);
      }
    },
    spikes: (r, x, w) => SPIKES[o.spikes || 'prongs'](r, x, w, P),
    door: (r, x, kind) => DOORS[o.door || 'energy'](r, x, kind, P),
  };
}

export const KINDS = { plates, strata, bricks, planks, turf, concrete, grating, tiles };

/** A material: its kind, its palette, its options; `check` names the two colours the contrast rule reads. */
export function material(kind, palette, opts = {}) {
  const P = pal(palette);
  return { ...KINDS[kind](P, opts), check: { ground: palette.base, cap: palette.cap1 } };
}
