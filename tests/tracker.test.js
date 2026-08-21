/**
 * TRACKER.md round-trip.
 *
 * The tracker web app parses this file, lets the owner edit it, and writes it
 * back. If that round-trip is not EXACT, the app silently rewrites or drops
 * design prose that nobody asked it to touch — which is the single worst thing
 * this tooling could do, and a failure mode this project has already lived
 * through once with the old HTML tracker's stale-array trap.
 *
 * These tests run against the same module the web app imports, so they cannot
 * pass while the shipped parser misbehaves.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, serialize, fieldsOf, rawOf } from '../docs/tracker-md.js';

const SRC = new URL('../design/TRACKER.md', import.meta.url);
const raw = readFileSync(SRC, 'utf8');

test('serialize(parse(x)) is byte-identical to x', () => {
  assert.equal(serialize(parse(raw)), raw,
    'the tracker app would rewrite the file just by opening and saving it');
});

test('round-tripping is idempotent', () => {
  const once = serialize(parse(raw));
  assert.equal(serialize(parse(once)), once);
});

test('no word of the tracker is lost in a round-trip', () => {
  const words = (s) => s.match(/[A-Za-z0-9#][A-Za-z0-9'#.-]{2,}/g) || [];
  const after = new Map();
  for (const w of words(serialize(parse(raw)))) after.set(w, (after.get(w) || 0) + 1);
  const lost = [];
  for (const w of words(raw)) {
    const n = after.get(w) || 0;
    if (n === 0) lost.push(w); else after.set(w, n - 1);
  }
  assert.deepEqual(lost, [], 'these words vanished in the round-trip');
});

test('every slice carries an id stamp linking it to the code', () => {
  // The id is how tools/sync-tracker.js and the status board join the doc to
  // bosses.js. Tempest Man ships as `torrent`, so deriving the id from the
  // display name would be wrong for at least one boss and wrong silently.
  const doc = parse(raw);
  const slices = doc.sections.find((s) => s.title === 'SLICES');
  assert.ok(slices, 'TRACKER.md must have a "# SLICES" section');
  const bosses = slices.items.filter((i) => i.title !== null);
  assert.equal(bosses.length, 17);
  for (const b of bosses) {
    const meta = rawOf(b).join(' ');
    assert.match(meta, /`id`\s*[a-z_]+/, `${b.title} has no \`id\` stamp`);

    /**
     * THE PALETTE IS THREE FIELDS NOW, not three hexes in the meta strip.
     *
     * It moved so the owner can edit a colour in the tracker app like any other
     * design decision — a palette is exactly the kind of thing that moves as a
     * game finds itself, and it used to be the one part of a slice that needed
     * a commit to change. The `id` stays in the meta strip on purpose: it is the
     * join key that saves and code depend on, so it is readable and not
     * editable.
     */
    const f = (label) => fieldsOf(b).find((x) => x.label === label)?.text?.trim();
    for (const part of ['primary', 'secondary', 'outline']) {
      assert.match(f(`palette ${part}`) ?? '', /^#[0-9A-Fa-f]{6}$/,
        `${b.title} needs a \`palette ${part}\` field holding one hex`);
    }
    assert.ok(f('scale'), `${b.title} has no \`scale\` field`);
  }
});

test('every field uses a known status marker', () => {
  const OK = new Set(['ready', 'wip', 'draft', 'todo', 'na']);
  const doc = parse(raw);
  for (const sec of doc.sections) {
    for (const item of sec.items) {
      for (const f of fieldsOf(item)) {
        assert.ok(OK.has(f.mark),
          `${item.title} / ${f.label} has unknown marker [${f.mark}]`);
      }
    }
  }
});

test('the tracker still has its non-slice sections', () => {
  // BUGS and BRAINSTORM are part of what makes this a dev tracker rather than
  // just a boss table. BRAINSTORM is explicitly never implemented from.
  const titles = parse(raw).sections.map((s) => s.title);
  assert.ok(titles.some((t) => /^BUGS/.test(t)), 'BUGS section missing');
  assert.ok(titles.some((t) => /^BRAINSTORM/.test(t)), 'BRAINSTORM section missing');
  assert.ok(titles.some((t) => /^ELEMENTAL ATTRIBUTES/.test(t)));
});

test('an edit survives a round-trip and cannot stay marked ready', () => {
  const doc = parse(raw);
  const slices = doc.sections.find((s) => s.title === 'SLICES');
  const boss = slices.items.find((i) => i.title && /Blaze/.test(i.title));
  const field = fieldsOf(boss).find((f) => f.mark === 'ready');
  assert.ok(field, 'expected at least one ready field to edit');

  // This is what the app does on input: change the text, revoke ready.
  field.text += ' EDITED BY TEST';
  field.mark = 'wip';

  const back = parse(serialize(doc));
  const again = fieldsOf(
    back.sections.find((s) => s.title === 'SLICES').items.find((i) => i.title && /Blaze/.test(i.title)),
  ).find((f) => f.label === field.label);
  assert.match(again.text, /EDITED BY TEST$/);
  assert.equal(again.mark, 'wip', 'editing must revoke the ready assertion');
});
