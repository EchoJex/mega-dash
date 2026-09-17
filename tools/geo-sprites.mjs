/**
 * npm run sprites:geo — transcribe the code-drawn placeholders into `.sprite`
 * sources so they can be edited by hand.
 *
 * THIS IS A TRANSCRIPTION, NOT ART. Every pixel it writes is the geometry the
 * game already draws, rasterised at its real radius into its real grid. It
 * invents no shapes, no silhouettes and no frame counts — a shape whose drawing
 * reads `frame` gets exactly the number of frames its own cycle repeats in, and
 * everything else gets one.
 *
 * EVERYTHING LANDS AT `wip`, AND THAT IS THE POINT. A `wip` frame builds no
 * sheet, so the game keeps drawing the geometry exactly as it does today —
 * nothing changes until the owner opens a sprite, draws on it, and promotes it.
 * The transcription is a starting canvas with the placeholder already on it,
 * which is the one part of "draw this" that is arithmetic.
 *
 * It REFUSES to overwrite a sprite that already has a shippable frame, because
 * that is hand-drawn work.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse, serialize, DEFAULT_HOLD } from '../docs/sprite-fmt.js';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(REPO, 'design/sprites');
const targets = JSON.parse(readFileSync(join(REPO, 'design/sprite-targets.json'), 'utf8'));
const { WEAPONS } = await import('../src/data/weapons.js');

// ── A tiny rasteriser in ROLE space ───────────────────────────────────
//
// The same four primitives Phaser's Graphics offers drawProjectile, writing
// '1' (primary) or '2' (secondary) instead of a colour. A pixel is covered when
// its CENTRE is inside the shape, which is what makes a 3px radius read as the
// 6px ball the engine draws rather than as a 7px one.

const blank = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));

const put = (px, x, y, role) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  if (iy >= 0 && iy < px.length && ix >= 0 && ix < px[0].length) px[iy][ix] = role;
};

const each = (px, fn, role) => {
  for (let y = 0; y < px.length; y++) {
    for (let x = 0; x < px[0].length; x++) if (fn(x + 0.5, y + 0.5)) put(px, x, y, role);
  }
};

const rect = (px, x, y, w, h, role) =>
  each(px, (cx, cy) => cx >= x && cx < x + w && cy >= y && cy < y + h, role);
const circle = (px, cx, cy, r, role) =>
  each(px, (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r, role);
const ellipse = (px, cx, cy, rw, rh, role) =>
  each(px, (x, y) => ((x - cx) / rw) ** 2 + ((y - cy) / rh) ** 2 <= 1, role);
const tri = (px, ax, ay, bx, by, cxx, cy2, role) => {
  const sign = (p1x, p1y, p2x, p2y, p3x, p3y) =>
    (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
  each(px, (x, y) => {
    const d1 = sign(x, y, ax, ay, bx, by);
    const d2 = sign(x, y, bx, by, cxx, cy2);
    const d3 = sign(x, y, cxx, cy2, ax, ay);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  }, role);
};

/**
 * One projectile shape, rasterised — the same switch `drawProjectile` runs,
 * with roles where it has colours. THE BASE COLOUR IS PRIMARY; a second colour
 * or a faded pass is SECONDARY, because that is the only distinction three
 * roles plus transparency can carry.
 */
function shotFrame(shape, r, w, h, frame) {
  const px = blank(w, h);
  const x = w / 2, y = h / 2;
  switch (shape) {
    case 'wheel':
      circle(px, x, y, r, '1');
      rect(px, x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.6, '2');
      break;
    case 'stream': rect(px, x - r * 2, y - r * 0.5, r * 4, r, '1'); break;
    case 'spark':
      for (let i = 0; i < 3; i++) {
        rect(px, x - r + i * r, y + (i % 2 ? -r : r) * 0.6, r, r * 0.5, '1');
      }
      break;
    case 'lash': rect(px, x - r * 2, y - r * 0.35, r * 4, r * 0.7, '1'); break;
    case 'shard': tri(px, x + r, y, x - r, y - r, x - r, y + r, '1'); break;
    case 'punch': circle(px, x, y, r * 1.2, '1'); break;
    case 'spray':
      for (let i = 0; i < 3; i++) {
        const a = frame * 0.1 + i * 2.1;
        circle(px, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.6, '1');
      }
      break;
    case 'wave':
      rect(px, x - r * 1.5, y - r * 0.4, r * 3, r * 0.8, '1');
      rect(px, x - r * 0.8, y - r, r * 1.6, r * 2, '1');
      break;
    case 'tornado': ellipse(px, x, y, r * 1.2, r * 2.4, '1'); break;
    case 'orb':
      circle(px, x, y, r, '1');
      circle(px, x - r * 0.3, y - r * 0.3, r * 0.35, '2');
      break;
    case 'swarm':
      for (let i = 0; i < 4; i++) {
        const a = frame * 0.4 + i * 1.6;
        rect(px, x + Math.cos(a) * r - 1, y + Math.sin(a) * r - 1, 2, 2, '1');
      }
      break;
    case 'rock': rect(px, x - r, y - r * 0.8, r * 2, r * 1.6, '1'); break;
    case 'wisp':
      // Three circles at falling alpha. Alpha is not a role, so the leading
      // one is primary and the fading tail is secondary.
      for (let i = 2; i >= 0; i--) {
        circle(px, x - i * r * 0.7, y, r * (1 - i * 0.22), i === 0 ? '1' : '2');
      }
      break;
    case 'breath':
      tri(px, x - r * 1.4, y - r * 0.7, x + r * 1.2, y, x - r * 1.4, y + r * 0.7, '1');
      break;
    case 'boomerang':
      rect(px, x - r, y - r * 0.3, r * 2, r * 0.6, '1');
      rect(px, x - r * 0.3, y - r, r * 0.6, r * 2, '1');
      break;
    case 'blade':
      rect(px, x - r * 1.2, y - r * 0.25, r * 2.4, r * 0.5, '1');
      rect(px, x - r * 0.25, y - r * 1.2, r * 0.5, r * 2.4, '1');
      break;
    default: rect(px, x - r, y - r * 0.5, r * 2, r, '1');   // 'bolt'
  }
  return px.map((row) => row.join(''));
}

/**
 * HOW MANY FRAMES A SHAPE NEEDS, derived from its own drawing.
 *
 * Both animated shapes rotate a ring of N marks by a fixed step per frame, so
 * the picture repeats once the rotation has advanced by the gap between two
 * marks: spray steps 0.1 with marks 2.1 apart, swarm steps 0.4 with marks 1.6
 * apart. Nothing else reads `frame`, so nothing else moves.
 */
const FRAMES = { spray: Math.round(2.1 / 0.1), swarm: Math.round(1.6 / 0.4) };

mkdirSync(SRC, { recursive: true });
let wrote = 0, kept = 0;
const shippable = (f) => f.status === 'ready' || f.status === 'draft';

for (const wpn of WEAPONS) {
  const id = `shot-${wpn.id}`;
  const t = targets.shots[id];
  if (!t) { console.log(`  skip ${id} — not a drawable target`); continue; }
  const path = join(SRC, `${id}.sprite`);

  if (existsSync(path) && parse(readFileSync(path, 'utf8')).frames.some(shippable)) {
    kept++;
    console.log(`  keep ${id.padEnd(22)} already has hand-drawn frames`);
    continue;
  }

  const shape = wpn.shape || 'bolt';
  const n = FRAMES[shape] || 1;
  const doc = {
    id, w: t.grid.w, h: t.grid.h, fudgeW: targets.fudge.w, fudgeH: targets.fudge.h,
    note: `transcribed from drawProjectile '${shape}' at radius ${wpn.radius}`,
    frames: Array.from({ length: n }, (_, i) => ({
      action: 'fly', index: i + 1, status: 'wip', hold: DEFAULT_HOLD,
      rows: shotFrame(shape, wpn.radius, t.grid.w, t.grid.h, i),
    })),
  };
  writeFileSync(path, serialize(doc));
  wrote++;
  const ink = doc.frames.reduce((a, f) => a + f.rows.join('').replace(/\./g, '').length, 0);
  console.log(`  ${id.padEnd(22)} ${shape.padEnd(10)} r=${wpn.radius}  `
    + `${n} frame(s), ${ink} px drawn`);
}

console.log(`\n${wrote} transcribed at [wip], ${kept} left alone.`);
console.log('Nothing changes in the game until you promote a frame — a wip sheet');
console.log('does not build, so the geometry keeps drawing exactly as it does now.');
