/**
 * THE `.sprite` FORMAT — round-trip, and the guarantees the pipeline rests on.
 *
 * The same deal `tracker.test.js` has with TRACKER.md: Claude Design's handoffs
 * and the build rewrite these files, so a parser that quietly drops or reformats
 * something it did not understand would erase art rather than prose. Byte-for-byte is the
 * only standard worth holding it to.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import {
  parse, serialize, blankFrame, STATUSES,
  DEFAULT_HOLD, splitLegacyName, renumber, framesOf, actionsOf,
} from '../docs/sprite-fmt.js';
import { MANIFEST, holdsOf } from '../src/systems/assets.js';
import { FEEL } from '../src/config/feel.js';

const SPRITES = new URL('../design/sprites/', import.meta.url);
const sheets = () => readdirSync(SPRITES).filter((f) => f.endsWith('.sprite'))
  .map((f) => ({ id: f.replace(/\.sprite$/, ''), doc: parse(readFileSync(new URL(f, SPRITES), 'utf8')) }));
const keyOf = (id) => (id === 'player' ? 'player'
  : targets.minions.find((x) => x.id === id)?.id
  || (targets.bosses[id] || targets.shots[id] || targets.pickups[id]
    || targets.furniture?.[id] || targets.menu?.[id] || targets.weapons?.[id])?.key || id);
const shippable = (f) => f.status === 'ready' || f.status === 'draft';

/**
 * THE SLIDE IS ONE PASS OF ITS OWN ANIMATION, and that is a relationship rather
 * than a number: the asserted pose reads briefly, the original carries the rest,
 * and together they last exactly as long as a slide does. If they summed to
 * less, the cycle would come round and reset the pose mid-slide; if more, the
 * second frame would be cut off before it ever finished.
 *
 * The split between them is the owner's to tune. The SUM is not.
 */
test('the slide animation lasts exactly one slide', () => {
  const holds = holdsOf('player', 'slide');
  assert.equal(holds.reduce((a, b) => a + b, 0), FEEL.slideDurationFrames,
    'the slide cycle and FEEL.slideDurationFrames have to agree');
});

/**
 * A DRAWN FRAME REACHES THE GAME WITH NOBODY TYPING A LINE. The hand-written
 * MANIFEST entry was the last gap in the pipeline — the Volt Spark was drawn,
 * published and built to a PNG while staying completely invisible.
 */
test('every sheet with a shippable frame is in the MANIFEST', () => {
  for (const { id, doc } of sheets()) {
    if (!doc.frames.some(shippable)) continue;
    const def = MANIFEST[keyOf(id)];
    assert.ok(def, `${id} has shippable frames but no manifest entry`);
    assert.equal(def.frameW, doc.w);
    assert.equal(def.frameH, doc.h);
  }
});

/**
 * THE GENERATED FILE IS NOT ALLOWED TO GO STALE. It is a build output committed
 * to the repo, so a `.sprite` edited without re-running the build would ship a
 * sheet whose animations describe the previous version of itself.
 */
test('sprite-art.json still matches the .sprite sources', () => {
  for (const { id, doc } of sheets()) {
    if (!doc.frames.some(shippable)) continue;
    const def = MANIFEST[keyOf(id)];
    for (const action of actionsOf(doc)) {
      const live = framesOf(doc, action).filter(shippable);
      if (!live.length) continue;
      assert.deepEqual(def.anims[action], live.map((f) => f.at),
        `${id}.${action} drifted — run npm run sprites:build`);
      assert.deepEqual(def.holds[action], live.map((f) => f.hold),
        `${id}.${action} holds drifted — run npm run sprites:build`);
    }
  }
});

/**
 * A `wip` FRAME KEEPS ITS CELL AND LOSES ITS PLACE IN THE ANIMATION. Both
 * halves matter: the cell keeps every later frame's index stable, the omission
 * keeps a blank hole out of a cycle that is otherwise finished.
 */
test('a wip frame holds its cell but leaves the animation', () => {
  const doc = parse('# x\ngrid 2x2\n\n[run 1] status=ready hold=5\n..\n..\n'
    + '\n[run 2] status=wip hold=5\n..\n..\n\n[run 3] status=ready hold=5\n..\n..\n');
  const live = framesOf(doc, 'run').filter(shippable);
  assert.deepEqual(live.map((f) => f.at), [0, 2],
    'the wip frame is skipped, and frame 3 keeps sheet index 2 rather than sliding to 1');
});
import { NES, USABLE, UNSAFE, nearestSlot, MAX_COLOURS } from '../docs/nes-palette.js';

const targets = JSON.parse(readFileSync(new URL('../design/sprite-targets.json', import.meta.url)));

test('serialize(parse(x)) is byte-identical for every real sprite', () => {
  const dir = new URL('../design/sprites/', import.meta.url);
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((f) => f.endsWith('.sprite'));
  assert.ok(files.length, 'no sprites to check — the round-trip guard is asleep');
  for (const f of files) {
    const text = readFileSync(new URL(f, dir), 'utf8');
    assert.equal(serialize(parse(text)), text, `${f} does not round-trip`);
  }
});

test('a short or ragged file opens instead of throwing', () => {
  // The whole point of a text format is that a person can edit it by hand. A
  // parser that refuses the result of that makes the format a lie.
  const doc = parse('# x\ngrid      4x3\n\n[a]\n.1\n1221111\n');
  assert.equal(doc.w, 4);
  assert.deepEqual(doc.frames[0].rows, ['.1..', '1221', '....']);
});

test('an empty file still yields one blank frame at the right size', () => {
  const doc = parse('# x\ngrid      8x8\n');
  assert.equal(doc.frames.length, 1);
  assert.deepEqual(doc.frames[0].rows, blankFrame(8, 8));
});

test('a new sprite defaults to one wip frame', () => {
  const doc = parse('# x\ngrid 4x4\n');
  assert.equal(doc.frames.length, 1);
  assert.equal(doc.frames[0].status, 'wip',
    'a frame nobody has drawn yet has not been approved for a playtest');
  assert.equal(doc.frames[0].hold, DEFAULT_HOLD);
  assert.equal(STATUSES[0], 'deferred');
});

/**
 * THE HOLD DEFAULT IS MEASURED, NOT CHOSEN — the same standard as the fudge
 * factors below. The shipped player sheet is `fps: 12`, and 60/12 is 5, so a
 * new frame lasts exactly as long as the frames either side of it.
 */
test('the default hold matches what the shipped sheet already plays at', () => {
  assert.equal(DEFAULT_HOLD, Math.round(60 / MANIFEST.player.fps));
});

/**
 * MIGRATION OFF THE OLD NAMES. Every shape below is this editor's own doing:
 * `idle0` from the first hand-written sheet, `slide_b` and `fly0_b_b` from a
 * +FRAME button that appended `_b` to the name it copied.
 */
test('legacy frame names become an action and a 1-based index', () => {
  assert.deepEqual(splitLegacyName('idle0'), { action: 'idle', index: 1 });
  assert.deepEqual(splitLegacyName('run5'), { action: 'run', index: 6 });
  assert.deepEqual(splitLegacyName('jumpRise'), { action: 'jumpRise', index: 1 });
  assert.deepEqual(splitLegacyName('slide_b'), { action: 'slide', index: 2 });
  assert.deepEqual(splitLegacyName('fly0_b_b_b_b_b'), { action: 'fly', index: 6 });
});

test('a legacy sheet keeps its status on every frame', () => {
  const doc = parse('# x\nstatus ready\ngrid 2x2\n\n[idle0]\n..\n..\n\n[idle1]\n..\n..\n');
  assert.deepEqual(doc.frames.map((f) => f.status), ['ready', 'ready'],
    'dropping a finished sheet to wip would un-ship it for having touched the parser');
  assert.deepEqual(doc.frames.map((f) => f.action), ['idle', 'idle']);
  assert.deepEqual(doc.frames.map((f) => f.index), [1, 2]);
});

test('status and hold survive a round trip, per frame', () => {
  const src = '# x\ngrid      2x2\nfudge     0.70 x 1.00\n\n'
    + '[run 1] status=ready hold=40\n..\n..\n\n[run 2] status=wip hold=3\n..\n..\n';
  assert.equal(serialize(parse(src)), src);
});

/**
 * THE WHOLE REASON THE INDEX IS PER-ACTION. Inserting a frame into `run` used
 * to shift every absolute index after it, and `MANIFEST.anims` held those
 * indices by hand — so a new run frame silently repointed `slide` at the wrong
 * cell. Nothing stores an absolute position now; it is re-derived from order.
 */
test('inserting a frame renumbers its own action and no other', () => {
  const doc = parse('# x\ngrid 2x2\n\n[run 1]\n..\n..\n\n[run 2]\n..\n..\n'
    + '\n[slide 1]\n..\n..\n');
  doc.frames.splice(1, 0, {
    action: 'run', index: 0, status: 'wip', hold: DEFAULT_HOLD, rows: blankFrame(2, 2),
  });
  renumber(doc);
  assert.deepEqual(doc.frames.map((f) => `${f.action} ${f.index}`),
    ['run 1', 'run 2', 'run 3', 'slide 1']);
  assert.deepEqual(framesOf(doc, 'slide').map((f) => f.at), [3],
    'slide moved along the sheet, and that is exactly why nothing may store its index');
});

// ── The palette ───────────────────────────────────────────────────────

test('the NES table is 64 slots with the hardware blacks marked', () => {
  assert.equal(NES.length, 64);
  assert.equal(USABLE.length, 55, 'the nulls are the eight-plus-one hardware blacks');
  assert.equal(NES[UNSAFE], '#000000', '$0D is the blacker-than-black entry');
  assert.ok(!NES.includes('#FF00FF'), 'nothing magenta — this is a hardware table');
});

test('$20 and $30 are both white, which is the hardware and not a typo', () => {
  assert.equal(NES[0x20], NES[0x30]);
});

test('nearestSlot reports whether a design colour is actually on the chip', () => {
  assert.equal(nearestSlot(NES[0x16]).exact, true);
  // The player is #FFFFFF; the NES white is #FEFEFF. Close, and NOT the same —
  // the editor says "off-palette" rather than snapping, because which one wins
  // is a design decision and not a rounding.
  assert.equal(nearestSlot('#FFFFFF').exact, false);
  assert.equal(NES[nearestSlot('#FFFFFF').slot], '#FEFEFF');
});

test('every drawable actor has a grid its collision box fits inside', () => {
  const all = [
    ['player', targets.player],
    ...targets.minions.map((m) => [m.id, m]),
    ...Object.entries(targets.bosses),
  ];
  for (const [id, t] of all) {
    assert.ok(t.box.w <= t.grid.w && t.box.h <= t.grid.h,
      `${id}: box ${t.box.w}x${t.box.h} overflows grid ${t.grid.w}x${t.grid.h}`);
    assert.ok(t.frames.length >= 1, `${id} has no frames`);
  }
});

/**
 * A FRAME MAY NAME A SOUND, and the reference survives the round trip.
 *
 * `.sprite` is a text format and audio is binary, so the frame stores a NAME
 * and the bytes live in `public/sfx/` — the same split sprite sheets already
 * have. The header was already an attribute bag, so this needed no new syntax.
 */
test('sfx= round-trips, and a silent frame writes nothing', () => {
  const src = [
    '# player',
    'grid      2x1',
    'fudge     0.70 x 1.00',
    '',
    '[idle 1] status=ready hold=5 sfx=step.wav',
    '1.',
    '',
    '[idle 2] status=ready hold=5',
    '.1',
    '',
  ].join('\n');
  const doc = parse(src);
  assert.equal(doc.frames[0].sfx, 'step.wav');
  assert.equal(doc.frames[1].sfx, undefined, 'a frame with no sound has no key at all');
  // ADDING THE FEATURE MUST NOT REWRITE EVERY EXISTING FILE. An empty `sfx=`
  // on the 27 silent sheets would be a diff on all of them for no content.
  assert.equal(serialize(doc), src, 'byte for byte, including the silent frame');
  assert.ok(!serialize(parse(src.replace(' sfx=step.wav', ''))).includes('sfx='));
});

/**
 * THE CUE LIST IS DERIVED, never hand-written — the same rule the frame indices
 * follow, and for the same reason: a sound hung on "frame 3" by hand repoints
 * the moment somebody inserts a frame before it.
 */
test('the build derives per-frame cues parallel to holds', () => {
  const art = JSON.parse(readFileSync(new URL('../src/data/sprite-art.json', import.meta.url), 'utf8'));
  for (const [key, def] of Object.entries(art)) {
    if (!def.sfx) continue;   // sparse on purpose: almost every sheet is silent
    for (const [action, cues] of Object.entries(def.sfx)) {
      assert.ok(Array.isArray(cues), `${key}.${action}: cues must be a list`);
      assert.equal(cues.length, def.holds[action].length,
        `${key}.${action}: ${cues.length} cues against ${def.holds[action].length} frames — `
        + 'the lists are read by index, so a mismatch plays the wrong frame’s sound');
      assert.ok(cues.some(Boolean), `${key}.${action}: an all-silent list should not be emitted`);
    }
  }
});

/**
 * THE 16-BIT PALETTE HEADER — opt-in per sprite, and invisible to every file
 * that does not use it. The 3-role sprites must not gain a single byte.
 */
test('a declared palette round-trips and a 3-role file is untouched', () => {
  const src = ['# x', 'grid      2x1', 'fudge     0.70 x 1.00',
    'palette   0 #0A0A12 outline', 'palette   1 #FFFFFF highlight', 'palette   9 #3CBCFC',
    'note      n', '', '[idle 1] status=ready hold=5', '19', ''].join('\n');
  const doc = parse(src);
  assert.deepEqual(doc.palette.map((p) => p.key), ['0', '1', '9']);
  assert.equal(doc.palette[2].name, '', 'a colour may go unnamed');
  assert.equal(serialize(doc), src, 'byte for byte, palette lines and all');
  const plain = parse('# x\ngrid 2x1\n\n[idle 1] status=ready hold=5\n12\n');
  assert.deepEqual(plain.palette, []);
  assert.ok(!serialize(plain).includes('palette'), 'a 3-role file never grows a palette line');
});

test('no sprite exceeds the SNES colour limit, and every pixel is declared', () => {
  for (const { id, doc } of sheets()) {
    if (!doc.palette.length) continue;
    assert.ok(doc.palette.length <= MAX_COLOURS, `${id}: ${doc.palette.length} colours, limit ${MAX_COLOURS}`);
    const keys = new Set(doc.palette.map((p) => p.key));
    for (const f of doc.frames) for (const row of f.rows) for (const ch of row) {
      assert.ok(ch === '.' || keys.has(ch), `${id} ${f.action} ${f.index}: '${ch}' is not in its palette`);
    }
  }
});

test('the 16-bit player keeps the shared outline, his white and his accent', () => {
  const doc = parse(readFileSync(new URL('../design/sprites/player.sprite', import.meta.url), 'utf8'));
  const hex = Object.fromEntries(doc.palette.map((p) => [p.key, p.hex.toUpperCase()]));
  assert.equal(hex['0'], '#0A0A12', 'the outline is shared by the whole roster');
  assert.equal(hex['1'], '#FFFFFF', 'the suit is white');
  assert.ok(Object.values(hex).includes('#3CBCFC'), 'the visor, muzzle and fin accent');
});
