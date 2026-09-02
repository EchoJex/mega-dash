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
  let checked = 0;
  for (const sec of doc.sections) {
    for (const item of sec.items) {
      for (const f of fieldsOf(item)) {
        checked++;
        assert.ok(OK.has(f.mark),
          `${item.title} / ${f.label} has unknown marker [${f.mark}]`);
      }
    }
  }
  /**
   * THE LOOP HAS TO HAVE RUN. Without this the test passes hardest when the
   * parser is most broken: on a CRLF checkout `fieldsOf` returned NOTHING for
   * every item, so the body never executed and this was the one test in the
   * file that stayed green while `npm run status` reported 0/13 design fields
   * for all seventeen bosses and `npm run sync` blanked three fields on each.
   *
   * A count, not an exact number — fields are added as the design grows, and
   * pinning the total would make writing a new one fail the build.
   */
  assert.ok(checked > 300,
    `only ${checked} fields parsed — the parser is not reading TRACKER.md`);
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

/**
 * CRLF MUST NOT BE ABLE TO KILL THE TOOLCHAIN AGAIN.
 *
 * Git for Windows sets core.autocrlf=true in its SYSTEM gitconfig, so before
 * .gitattributes existed every Windows checkout got CRLF while the index stayed
 * LF. `\r` is a line terminator in JavaScript — `.` will not match it and `$`
 * will not sit before it — so splitting on '\n' left FIELD_RE unable to match
 * anything at all, and it matched NOTHING.
 *
 * Nothing reported an error. `npm run status` printed 0/13 design fields for
 * all seventeen bosses while calling five of them DONE; `npm run sync`
 * overwrote design/boss-data.json with attackName, weaponName and weaponClass
 * blanked on every boss and then printed a success line and exited 0. CI runs
 * on Ubuntu, so none of it could ever go red there — which is why this belongs
 * in the suite rather than in a note somewhere.
 */
test('the parser reads CRLF exactly as it reads LF', () => {
  const lf = raw.replace(/\r\n/g, '\n');
  const crlf = lf.replace(/\n/g, '\r\n');

  const fieldsIn = (text) => {
    const doc = parse(text);
    const out = [];
    for (const sec of doc.sections) {
      for (const item of sec.items) {
        for (const f of fieldsOf(item)) out.push(`${item.title}/${f.label}=[${f.mark}]`);
      }
    }
    return out;
  };

  const a = fieldsIn(lf);
  const b = fieldsIn(crlf);
  assert.ok(a.length > 300, `LF parse found only ${a.length} fields`);
  assert.deepEqual(b, a, 'a CRLF file must parse to exactly the same fields as LF');
});

/**
 * The guard tools/sync-tracker.js uses before it overwrites boss-data.json: a
 * line that LOOKS like a field must have parsed as one. If this can be true
 * while fields exist, the tool would happily write a file built from nothing.
 */
test('a field line always parses as a field, never as raw prose', () => {
  const doc = parse(raw);
  const stragglers = [];
  for (const sec of doc.sections) {
    for (const item of sec.items) {
      for (const c of item.content) {
        if (c.type === 'raw' && /^- \*\*.+\*\* `\[\w+\]`/.test(c.line)) {
          stragglers.push(`${item.title}: ${c.line.slice(0, 60)}`);
        }
      }
    }
  }
  assert.deepEqual(stragglers, [], 'these look like fields but parsed as raw lines');
});
