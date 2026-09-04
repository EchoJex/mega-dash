/**
 * npm run sprites:build — turn the editor's `.sprite` files into the PNGs the
 * game loads.
 *
 * THIS IS THE ONLY STEP BETWEEN DRAWING AND PLAYING. `design/sprites/*.sprite`
 * is what the editor writes and what git can diff; `public/sprites/*.png` is
 * what `MANIFEST` opens. Nothing downstream changes — adding art is still "a
 * PNG in public/sprites and one line in MANIFEST", it is just that the PNG now
 * has a source file instead of being the source.
 *
 * ROLES BECOME COLOURS HERE, and that is the whole reason the format stores
 * roles. A `.sprite` says a pixel is `1` for primary; this resolves primary
 * from the LIVE palette — `boss-data.json` for the seventeen, PLAYER_PALETTE
 * for the player. Re-tune the perceptually-optimised primaries in the tracker,
 * run this, and every sprite drawn against them recolours without anyone
 * reopening the art.
 *
 * IT REFUSES RATHER THAN GUESSES. A sprite whose grid does not match its
 * class's, a frame count that does not match the manifest, an unknown role
 * character — all of them stop the build with the file and line named. A
 * silently wrong sprite sheet is a sheet whose animation is off by one frame
 * forever, and that is not something anybody notices while drawing.
 */

import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse } from '../docs/sprite-fmt.js';
import { encodePng } from './png.mjs';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(REPO, 'design/sprites');
const OUT = join(REPO, 'public/sprites');

// PNG writing lives in tools/png.mjs — one copy, shared with
// tools/sprite-templates.mjs. It used to be duplicated here verbatim, under a
// comment that said so instead of fixing it.

// ── The live palettes ─────────────────────────────────────────────────

const targets = JSON.parse(readFileSync(join(REPO, 'design/sprite-targets.json'), 'utf8'));
const bossData = JSON.parse(readFileSync(join(REPO, 'design/boss-data.json'), 'utf8'));

/**
 * The player's three are baked into `PLAYER_PALETTE` rather than into the
 * tracker, because he is not a boss and has no slice. Read from the source so
 * the white-not-blue decision cannot be re-litigated by a stale copy here.
 */
const display = readFileSync(join(REPO, 'src/config/display.js'), 'utf8');
const playerPal = (() => {
  const grab = (k) => {
    const m = new RegExp(`${k}:\\s*'(#[0-9A-Fa-f]{6})'`).exec(display);
    return m ? m[1] : null;
  };
  return { primary: grab('primary'), secondary: grab('secondary'), outline: grab('outline') };
})();

function paletteOf(id) {
  const b = bossData.bosses[id];
  if (b) return { outline: b.outline, primary: b.primary, secondary: b.secondary };
  if (id === 'player') {
    const p = playerPal;
    if (!p.primary || !p.secondary || !p.outline) {
      throw new Error('could not read PLAYER_PALETTE out of src/config/display.js');
    }
    return p;
  }
  // Minions carry their own three and are not part of the boss spacing set.
  const minions = readFileSync(join(REPO, 'src/data/minions.js'), 'utf8');
  const re = new RegExp(`id: '${id}'[\\s\\S]*?primary: '(#[0-9A-Fa-f]{6})'[\\s\\S]*?`
    + `secondary: '(#[0-9A-Fa-f]{6})'`);
  const m = re.exec(minions);
  if (!m) throw new Error(`no palette for '${id}' — not a boss, not the player, not a minion`);
  return { primary: m[1], secondary: m[2], outline: '#0A0A12' };
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The grid and frame list this id is supposed to have. */
function targetOf(id) {
  if (id === 'player') return targets.player;
  const m = targets.minions.find((x) => x.id === id);
  return m || targets.bosses[id] || null;
}

// ── Build ─────────────────────────────────────────────────────────────

if (!existsSync(SRC)) {
  console.log('no design/sprites/ yet — nothing to build');
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.endsWith('.sprite'));
if (!files.length) { console.log('no .sprite files yet'); process.exit(0); }

let built = 0, skipped = 0;
const problems = [];

for (const file of files) {
  const id = file.replace(/\.sprite$/, '');
  const doc = parse(readFileSync(join(SRC, file), 'utf8'));
  const t = targetOf(id);

  if (!t) { problems.push(`${file}: '${id}' is not a drawable actor`); continue; }
  if (doc.w !== t.grid.w || doc.h !== t.grid.h) {
    problems.push(`${file}: grid ${doc.w}x${doc.h} but ${id} is a ${t.cls} `
      + `(${t.grid.w}x${t.grid.h}). Re-open it in the editor, which reads the live grid.`);
    continue;
  }

  /**
   * ONLY `ready` AND `draft` SHIP. A sprite the owner has marked `wip` or
   * `deferred` is one they are still deciding about, and dropping it into the
   * game would put half-finished art in a playtest — the same rule the fight
   * content follows, applied to the thing that is actually visible.
   */
  if (doc.status !== 'ready' && doc.status !== 'draft') {
    skipped++;
    continue;
  }

  const pal = paletteOf(id);
  const colour = { 0: rgb(pal.outline), 1: rgb(pal.primary), 2: rgb(pal.secondary) };

  const w = doc.w * doc.frames.length, h = doc.h;
  const px = new Uint8Array(w * h * 4);
  doc.frames.forEach((f, fi) => {
    for (let y = 0; y < doc.h; y++) {
      for (let x = 0; x < doc.w; x++) {
        const ch = f.rows[y][x];
        if (ch === '.') continue;                    // transparent, already zero
        const c = colour[ch];
        if (!c) {
          problems.push(`${file}: frame '${f.name}' row ${y} has '${ch}', `
            + `which is not a role — expected . 0 1 or 2`);
          return;
        }
        const o = (y * w + fi * doc.w + x) * 4;
        px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
      }
    }
  });

  writeFileSync(join(OUT, `${id}.png`), encodePng(w, h, px));
  built++;
  console.log(`  ${id.padEnd(10)} ${w}x${h}  ${doc.frames.length} frame(s)  [${doc.status}]`);
}

if (problems.length) {
  console.error('\nREFUSED:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`\nbuilt ${built} sprite sheet(s)`
  + (skipped ? `, skipped ${skipped} still wip/deferred` : ''));
