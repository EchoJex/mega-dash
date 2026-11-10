/**
 * node design/minion-art/render.mjs <out-dir> — paint the review canvas's pictures for
 * PIXIE, the E-Tank and the EXP orb (group 2 of the owner's ask of 5 Nov 2026).
 *
 * Reads every variant in design/minion-art/variants/ (the game's own .sprite format, so a
 * picked one is copied into design/sprites/ as it is) and writes, blown up so each game pixel
 * is a square you can see:
 *   <variant>.png    every frame side by side, numbered left to right
 *   <variant>.apng   the animation at game speed (an animated PNG, which every browser plays)
 *   <pixie>-slices.png  a PIXIE in four areas' colours, the way each area's copy is made,
 *                    and the same with an elite's gold rim
 * None of it is in the game.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { parse } from '../../docs/sprite-fmt.js';
import { encodePng, chunk } from '../../tools/png.mjs';
import { BOSSES } from '../../src/data/bosses.js';
import { bodyShades } from '../../tools/shade.mjs';
import { MINIONS, ELITE_OUTLINE } from '../../src/data/minions.js';

const DIR = fileURLToPath(new URL('./variants', import.meta.url));
const out = process.argv[2];
if (!out) { console.error('usage: node design/minion-art/render.mjs <out-dir>'); process.exit(1); }
mkdirSync(out, { recursive: true });

const S = 8, BG = [16, 20, 28, 255];
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

/** A w×h canvas of RGBA bytes, filled with the background. */
function canvas(w, h) {
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) px.set(BG, i * 4);
  return { w, h, px, set(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h) px.set(c, (y * w + x) * 4); } };
}

/** One frame, scaled by S, at (ox, oy). `colours` maps a key character to RGBA. A rim colour draws a one-pixel ring round it. */
function blit(cv, rows, ox, oy, colours, rim = null) {
  const on = (x, y) => rows[y]?.[x] !== undefined && rows[y][x] !== '.';
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    let c = on(x, y) ? colours[rows[y][x]] : null;
    if (!c && rim && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) c = rim;
    if (!c) continue;
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) cv.set(ox + x * S + dx, oy + y * S + dy, c);
  }
}

function apng(w, h, frames) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const actl = Buffer.alloc(8);
  actl.writeUInt32BE(frames.length, 0);
  const parts = [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('acTL', actl)];
  let seq = 0;
  frames.forEach(({ cv, hold }, i) => {
    const fc = Buffer.alloc(26);
    fc.writeUInt32BE(seq++, 0); fc.writeUInt32BE(w, 4); fc.writeUInt32BE(h, 8);
    fc.writeUInt16BE(hold, 20); fc.writeUInt16BE(60, 22);   // shown `hold` steps of 1/60 s
    parts.push(chunk('fcTL', fc));
    const raw = Buffer.alloc(h * (w * 4 + 1));
    for (let y = 0; y < h; y++) Buffer.from(cv.px.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
    const data = deflateSync(raw);
    if (i === 0) parts.push(chunk('IDAT', data));
    else { const s = Buffer.alloc(4); s.writeUInt32BE(seq++); parts.push(chunk('fdAT', Buffer.concat([s, data]))); }
  });
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

/** A colour's hue, saturation and lightness, each 0 to 1, and back. */
const pixie = MINIONS.find((m) => m.id === 'pixie');
/** The three roles, the way the game paints a three-colour sprite and its per-area copies. */
// Key 3 is white whatever the area: the Pixie's wings (owner, 10 Nov 2026).
const roles = (def) => ({ 0: rgb(def.outline), 1: rgb(def.primary), 2: rgb(def.secondary), 3: [255, 255, 255, 255] });

for (const f of readdirSync(DIR).filter((n) => n.endsWith('.sprite')).sort()) {
  const name = f.replace('.sprite', '');
  const doc = parse(readFileSync(join(DIR, f), 'utf8'));
  const colours = doc.palette?.length
    ? Object.fromEntries(doc.palette.map((p) => [p.key, rgb(p.hex)]))
    : roles(pixie);
  const pad = 8, cell = doc.w * S + pad;

  const sheet = canvas(doc.frames.length * cell + pad, doc.h * S + pad * 2);
  doc.frames.forEach((fr, i) => blit(sheet, fr.rows, pad + i * cell, pad, colours));
  writeFileSync(join(out, `${name}.png`), encodePng(sheet.w, sheet.h, sheet.px));

  const W = doc.w * S + pad * 2, H = doc.h * S + pad * 2;
  writeFileSync(join(out, `${name}.apng`), apng(W, H, doc.frames.map((fr) => {
    const cv = canvas(W, H);
    blit(cv, fr.rows, pad, pad, colours);
    return { cv, hold: fr.hold || 5 };
  })));

  // A full-colour drawing whose palette names some keys "body ...": each area's copy turns
  // those into shades of that boss's primary, keeping how much lighter or darker each one is
  // than the plain "body" key (the Gunner, 10 Nov 2026). The rest stays as drawn.
  const bodyKeys = (doc.palette || []).filter((p) => p.name.startsWith('body'));
  if (bodyKeys.length) {
    const looks = [null, 'blaze', 'tempest', 'thorn'].map((id) => {
      if (!id) return colours;
      return { ...colours, ...bodyShades(doc.palette, BOSSES.find((x) => x.id === id).primary) };
    });
    const cv = canvas(looks.length * cell + pad, 2 * (doc.h * S + pad) + pad);
    looks.forEach((c, i) => {
      blit(cv, doc.frames[0].rows, pad + i * cell, pad, c);
      blit(cv, doc.frames[0].rows, pad + i * cell, pad * 2 + doc.h * S, c, rgb(ELITE_OUTLINE));
    });
    writeFileSync(join(out, `${name}-slices.png`), encodePng(cv.w, cv.h, cv.px));
  }

  if (!doc.palette?.length) {
    // The original, then three areas' copies (its most common colour turned into that boss's
    // primary, as minionFor does), each plain and with an elite's gold rim.
    const looks = [pixie, ...['blaze', 'tempest', 'thorn'].map((id) => {
      const b = BOSSES.find((x) => x.id === id);
      return { ...pixie, [pixie.swap]: b.primary };
    })];
    const cv = canvas(looks.length * cell + pad, 2 * (doc.h * S + pad) + pad);
    looks.forEach((d, i) => {
      blit(cv, doc.frames[0].rows, pad + i * cell, pad, roles(d));
      blit(cv, doc.frames[0].rows, pad + i * cell, pad * 2 + doc.h * S, roles(d), rgb(ELITE_OUTLINE));
    });
    writeFileSync(join(out, `${name}-slices.png`), encodePng(cv.w, cv.h, cv.px));
  }
  console.log(`  ${name}: ${doc.frames.length} frame(s)`);
}
