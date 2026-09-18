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
import { parse, actionsOf, framesOf } from '../docs/sprite-fmt.js';
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
  /**
   * A SHOT IS DRAWN IN ITS SOURCE BOSS'S COLOURS, so re-tuning a primary in
   * the tracker recolours his bullet too. The sidearm has no boss and falls
   * back to the buster's own palette, read from the same source that defines
   * it rather than copied here.
   */
  const shot = targets.shots[id];
  if (shot) {
    if (shot.boss) return paletteOf(shot.boss);
    const w = readFileSync(join(REPO, 'src/data/weapons.js'), 'utf8');
    const bp = /BUSTER_PALETTE[\s\S]*?primary: '(#[0-9A-Fa-f]{6})'[\s\S]*?secondary: '(#[0-9A-Fa-f]{6})'/.exec(w);
    if (!bp) throw new Error('could not read BUSTER_PALETTE out of src/data/weapons.js');
    return { primary: bp[1], secondary: bp[2], outline: '#0A0A12' };
  }

  /**
   * A PIECE OF FURNITURE WEARS ITS ROOM'S COLOURS — the boss's own three, the
   * same deal a shot gets from the weapon's source boss. The arena draws it in
   * greys today, but grey is a colour and the format stores ROLES; re-tune the
   * boss's primary and his furniture follows, which is the whole point.
   */
  const furn = targets.furniture?.[id];
  if (furn?.boss) return paletteOf(furn.boss);

  const pick = targets.pickups[id];
  if (pick) {
    const src = readFileSync(join(REPO, 'src/systems/pickups.js'), 'utf8');
    const key = id.replace('pickup-', '');
    const m = new RegExp(`${key}:\\s*\\{ primary: '(#[0-9A-Fa-f]{6})', `
      + `secondary: '(#[0-9A-Fa-f]{6})'`).exec(src);
    if (!m) throw new Error(`no PICKUP_STYLE entry for '${key}'`);
    return { primary: m[1], secondary: m[2], outline: '#0A0A12' };
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
  return m || targets.bosses[id] || targets.shots[id] || targets.pickups[id]
    || targets.furniture?.[id] || null;
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
const warnings = [];

/**
 * THE WHOLE MANIFEST ENTRY, written to src/data/sprite-art.json.
 *
 * DERIVED, NEVER HAND-MAINTAINED. This started as just the anim map, because
 * absolute sheet indices typed into assets.js meant inserting a frame silently
 * shifted every animation after it. It now carries the entry itself, because
 * the hand-written MANIFEST line was the LAST thing standing between a drawn
 * frame and the game: the Volt Spark was published, built to a PNG, and still
 * invisible, waiting on one line nobody had typed.
 *
 * Everything here is a FACT about the sheet — its file, its grid, where it
 * anchors — so nothing is decided here that the `.sprite` file and the class it
 * belongs to do not already decide. `assets.js` still lets a hand-written entry
 * override the look fields; the derived anims always win.
 */
const art = {};

/**
 * A SHOT AND A PICKUP ARE CENTRED; EVERYTHING ELSE STANDS ON THE GROUND.
 *
 * The same split the editor draws with (`isProp`): a projectile's position IS
 * its middle, while an actor's is the bottom of its collision box.
 */
const anchorFor = (cls) => (cls === 'shot' || cls === 'pickup' ? 'center' : 'bottom');

/** A frame the owner has finished enough to ship. */
const shippable = (f) => f.status === 'ready' || f.status === 'draft';

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
   * ONLY `ready` AND `draft` SHIP, AND THAT IS NOW PER FRAME. A sheet is rarely
   * finished all at once; the old sheet-wide gate meant one unfinished pose
   * held back every finished one.
   *
   * A `wip` frame STILL GETS ITS CELL, drawn blank. Dropping the cell would
   * renumber every frame after it in the PNG, which is the exact breakage the
   * derived anim list exists to prevent — and it would do it silently, because
   * a sheet one frame short still loads.
   *
   * IT IS LEFT OUT OF THE ANIMATION, THOUGH. The two rules together are what
   * the owner asked for: a blank cell keeps the sheet's shape, and an animation
   * that skips it never plays a hole. Half-finished art cannot reach a
   * playtest either way.
   */
  if (!doc.frames.some(shippable)) {
    skipped++;
    continue;
  }

  const pal = paletteOf(id);
  const colour = { 0: rgb(pal.outline), 1: rgb(pal.primary), 2: rgb(pal.secondary) };

  const w = doc.w * doc.frames.length, h = doc.h;
  const px = new Uint8Array(w * h * 4);
  doc.frames.forEach((f, fi) => {
    if (!shippable(f)) return;                 // cell stays, drawn transparent
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

  /**
   * The anim list, and the per-frame HOLD in sim steps beside it.
   *
   * `hold` is what the sheet-wide `fps: 12` always meant — 60/12 is 5 steps —
   * except it is now per frame, so the idle's breath (40 steps) is a property
   * of the idle rather than a special case in assets.js.
   */
  const a = {
    file: `${id}.png`,
    frameW: doc.w,
    frameH: doc.h,
    anchor: anchorFor(t.cls),
    // The three colours are baked into the PNG; a Phaser tint multiplies the
    // whole texture and would wreck a 3-colour sheet.
    tintable: false,
    anims: {},
    holds: {},
    // Per-frame one-shots, parallel to `holds` and sparse: only actions that
    // actually name a sound get an entry, and a silent frame is null. Derived
    // from the `.sprite` source for the same reason the frame indices are —
    // a sound hung on frame 3 by hand would repoint the moment a frame was
    // inserted before it.
    sfx: {},
  };
  for (const action of actionsOf(doc)) {
    const live = framesOf(doc, action).filter(shippable);
    if (!live.length) continue;
    a.anims[action] = live.map((f) => f.at);
    a.holds[action] = live.map((f) => f.hold);
    const cues = live.map((f) => f.sfx || null);
    if (cues.some(Boolean)) a.sfx[action] = cues;
  }
  if (!Object.keys(a.sfx).length) delete a.sfx;
  art[t.key || id] = a;

  const wip = doc.frames.length - doc.frames.filter(shippable).length;
  writeFileSync(join(OUT, `${id}.png`), encodePng(w, h, px));
  built++;
  console.log(`  ${(t.key || id).padEnd(20)} ${id}.png  ${w}x${h}  `
    + `${doc.frames.length} frame(s)${wip ? `, ${wip} blank (wip)` : ''}  `
    + Object.entries(a.anims).map(([k, v]) => `${k}:${v.length}`).join(' '));
}

if (problems.length) {
  console.error('\nREFUSED:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

/**
 * SAY SO WHEN AN ANIMATION'S SHAPE CHANGES. Adding a frame to an action is a
 * gameplay change — the pose the player reads mid-slide is not a detail — and
 * it arrives here as a side effect of drawing, with nothing else to announce
 * it. Compared against the hand-written `MANIFEST.anims` still in assets.js,
 * which is now a fallback for sprites that have no `.sprite` source.
 */
const ART = join(REPO, 'src/data/sprite-art.json');
const prev = existsSync(ART) ? JSON.parse(readFileSync(ART, 'utf8')) : {};
for (const [key, a] of Object.entries(art)) {
  const was = prev[key]?.anims;
  if (!was) { warnings.push(`${key}: NEW to the game — it had no sheet before this build`); continue; }
  for (const [name, frames] of Object.entries(a.anims)) {
    const old = was[name];
    if (!old) { warnings.push(`${key}.${name}: a NEW animation`); continue; }
    if (old.length !== frames.length || old.some((v, i) => v !== frames[i])) {
      warnings.push(`${key}.${name}: was [${old}], now [${frames}] `
        + `— the game will play ${frames.length} frame(s) here, not ${old.length}`);
    }
  }
}

writeFileSync(ART, `${JSON.stringify(art, null, 2)}\n`);

if (warnings.length) {
  console.log('\nANIMATION SHAPE CHANGED:');
  for (const w of warnings) console.log(`  ${w}`);
}
console.log(`\nbuilt ${built} sprite sheet(s)`
  + (skipped ? `, skipped ${skipped} with nothing shippable` : '')
  + '\n  src/data/sprite-art.json rewritten');
