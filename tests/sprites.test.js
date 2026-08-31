/**
 * THE `.sprite` FORMAT — round-trip, and the guarantees the pipeline rests on.
 *
 * The same deal `tracker.test.js` has with TRACKER.md: the editor rewrites these
 * files every few seconds, so a parser that quietly drops or reformats something
 * it did not understand would erase art rather than prose. Byte-for-byte is the
 * only standard worth holding it to.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { parse, serialize, bounds, proposedBox, blankFrame, STATUSES } from '../docs/sprite-fmt.js';
import { NES, USABLE, UNSAFE, nearestSlot } from '../docs/nes-palette.js';

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

test('a new sprite defaults to deferred', () => {
  assert.equal(parse('# x\ngrid 4x4\n').status, 'deferred');
  assert.equal(STATUSES[0], 'deferred');
});

/**
 * THE FUDGE FACTORS, CHECKED AGAINST THE ART THEY WERE MEASURED FROM.
 *
 * This is the assertion that matters. The defaults are not a preference — they
 * are the ratio between the shipped player's drawn silhouette and the collision
 * box somebody already tuned by feel, and if applying them to that same
 * silhouette does not reproduce that same box, the number is wrong.
 */
test('the default horizontal fudge reproduces the shipped player box', () => {
  const src = new URL('../design/sprites/player.sprite', import.meta.url);
  if (!existsSync(src)) return;
  const doc = parse(readFileSync(src, 'utf8'));
  const idle = doc.frames.find((f) => f.name === 'idle0');
  const b = bounds(idle, doc.w, doc.h);
  assert.deepEqual({ w: b.w, h: b.h }, { w: 17, h: 23 }, 'the player silhouette changed');

  const box = proposedBox(idle, doc.w, doc.h, targets.fudge.w, targets.fudge.h);
  assert.equal(box.w, targets.player.box.w,
    `0.70 wide on a 17px silhouette must give ${targets.player.box.w}, the engine's own box`);
});

test('vertical fudge is 1.00 by default, and that is the point of it', () => {
  // Horizontal buys fairness; vertical decides where the feet land. If a future
  // edit makes the vertical default anything but 1, the editor's standing
  // warning is describing a rule the tool itself no longer follows.
  assert.equal(targets.fudge.h, 1);
  assert.ok(targets.fudge.w < 1, 'horizontal fudge must actually narrow the box');
  assert.equal(targets.fudge.step, 0.05);
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
