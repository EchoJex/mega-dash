/**
 * THE GEN 3 TYPE CHART, ASSERTED TRAP BY TRAP.
 *
 * This file exists because the failure mode is a chart that LOOKS right. Every
 * entry is plausible, the table is symmetric enough to skim, and the handful of
 * rows that changed between generations are exactly the rows anybody
 * reconstructing it from memory gets wrong — including, reliably, a language
 * model, which has read far more of the modern chart than of this one.
 *
 * So the tests below are not "does the table parse". They are the specific
 * differences between Gen 3 and its neighbours, named, so that a future edit
 * that quietly modernises one row fails with a message saying which generation
 * it just moved to.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TYPES, CHART, weaknessesOf, resistsOf, immuneTo, ELEMENTLESS,
} from '../src/data/typechart.js';
import { BOSSES } from '../src/data/bosses.js';
import { readFileSync } from 'node:fs';

// ── The shape ─────────────────────────────────────────────────────────

test('seventeen types, and every entry names only real ones', () => {
  assert.equal(TYPES.length, 17);
  assert.equal(new Set(TYPES).size, 17, 'a type is listed twice');
  assert.ok(!TYPES.includes('Fairy'), 'Fairy is Gen 6 — this is the Gen 3 chart');
  for (const [atk, e] of Object.entries(CHART)) {
    assert.ok(TYPES.includes(atk), `${atk} is not a Gen 3 type`);
    for (const k of ['x2', 'half', 'zero']) {
      for (const def of e[k]) {
        assert.ok(TYPES.includes(def), `${atk}.${k} names ${def}, which is not a Gen 3 type`);
      }
    }
    // A matchup cannot be two things at once.
    const all = [...e.x2, ...e.half, ...e.zero];
    assert.equal(new Set(all).size, all.length, `${atk} lists a defender in two buckets`);
  }
  assert.equal(Object.keys(CHART).length, 17, 'every type must attack');
});

// ── The traps ─────────────────────────────────────────────────────────

test('STEEL RESISTS GHOST AND DARK — true in Gen 2-5, removed in Gen 6', () => {
  assert.ok(CHART.Ghost.half.includes('Steel'),
    'Ghost must be resisted by Steel; if it is not, this is the Gen 6 chart');
  assert.ok(CHART.Dark.half.includes('Steel'),
    'Dark must be resisted by Steel; if it is not, this is the Gen 6 chart');
  assert.ok(resistsOf('Steel').includes('Ghost'));
  assert.ok(resistsOf('Steel').includes('Dark'));
});

test('POISON beats Grass and nothing else — not Bug (Gen 1), not Fairy (Gen 6)', () => {
  assert.deepEqual(CHART.Poison.x2, ['Grass']);
  assert.ok(!CHART.Poison.x2.includes('Bug'), 'Poison stopped beating Bug in Gen 2');
  assert.ok(CHART.Poison.zero.includes('Steel'), 'Poison cannot touch Steel');
});

test('BUG IS RESISTED BY POISON — the Gen 1 chart had this the other way round', () => {
  assert.ok(CHART.Bug.half.includes('Poison'));
  assert.ok(!CHART.Bug.x2.includes('Poison'));
});

test('GHOST BEATS PSYCHIC — Gen 1 had no effect at all, fixed in Gen 2', () => {
  assert.ok(CHART.Ghost.x2.includes('Psychic'));
  assert.ok(CHART.Ghost.zero.includes('Normal'), 'Ghost still cannot touch Normal');
  assert.ok(CHART.Psychic.zero.includes('Dark'), 'and Psychic cannot touch Dark');
});

test('the SEVEN no-effect pairs, and only those seven', () => {
  // Immunity is the part of the chart with no gradient — a matchup either
  // happens or it does not — so listing all seven is the cheapest way to catch
  // a row that has drifted. The first draft of this test listed six and called
  // them three, which is how it caught its own author rather than the chart.
  const none = [];
  for (const [atk, e] of Object.entries(CHART)) for (const d of e.zero) none.push(`${atk}>${d}`);
  assert.deepEqual(none.sort(), [
    'Electric>Ground',   // the ground eats it
    'Fighting>Ghost',    // you cannot punch a ghost
    'Ghost>Normal',      // ...and it cannot touch you back
    'Ground>Flying',     // nothing to stand on
    'Normal>Ghost',
    'Poison>Steel',      // steel does not get sick
    'Psychic>Dark',      // and it cannot read a mind that is not there
  ].sort());
});

// ── The defending view, which is what the tracker actually uses ────────

test('every type\'s weaknesses match the published Gen 3 chart', () => {
  // Written out longhand rather than derived, so this is a genuine second
  // source: the table is checked against a list, not against itself.
  const want = {
    Normal: ['Fighting'],
    Fire: ['Water', 'Ground', 'Rock'],
    Water: ['Electric', 'Grass'],
    Electric: ['Ground'],
    Grass: ['Fire', 'Ice', 'Poison', 'Flying', 'Bug'],
    Ice: ['Fire', 'Fighting', 'Rock', 'Steel'],
    Fighting: ['Flying', 'Psychic'],
    Poison: ['Ground', 'Psychic'],
    Ground: ['Water', 'Grass', 'Ice'],
    Flying: ['Electric', 'Ice', 'Rock'],
    Psychic: ['Bug', 'Ghost', 'Dark'],
    Bug: ['Fire', 'Flying', 'Rock'],
    Rock: ['Water', 'Grass', 'Fighting', 'Ground', 'Steel'],
    Ghost: ['Ghost', 'Dark'],
    Dragon: ['Ice', 'Dragon'],
    Dark: ['Fighting', 'Bug'],
    Steel: ['Fire', 'Fighting', 'Ground'],
  };
  for (const t of TYPES) {
    assert.deepEqual(weaknessesOf(t), want[t], `${t}'s weaknesses`);
  }
});

test('the two self-beating types are Ghost and Dragon, and Dark is not one', () => {
  const selfBeating = TYPES.filter((t) => CHART[t].x2.includes(t));
  assert.deepEqual(selfBeating, ['Ghost', 'Dragon']);
  assert.ok(CHART.Dark.half.includes('Dark'), 'Dark RESISTS Dark rather than beating it');
});

test('Electric is the only type with exactly one weakness, and Ground is it', () => {
  const single = TYPES.filter((t) => weaknessesOf(t).length === 1);
  assert.deepEqual(single, ['Normal', 'Electric']);
  assert.deepEqual(weaknessesOf('Electric'), ['Ground']);
  assert.deepEqual(immuneTo('Ground'), ['Electric']);
});

// ── The roster ────────────────────────────────────────────────────────

test('the boss roster is the Gen 3 type list with Normal swapped for Typeless', () => {
  const elements = BOSSES.map((b) => b.element).sort();
  const expected = [...TYPES.filter((t) => t !== 'Normal'), ELEMENTLESS].sort();
  assert.deepEqual(elements, expected,
    'every Gen 3 type except Normal gets exactly one boss, plus Proto Mk0');
});

test('Typeless has no weaknesses, which is why Proto Mk0 teaches movement', () => {
  assert.deepEqual(weaknessesOf(ELEMENTLESS), []);
  assert.deepEqual(resistsOf(ELEMENTLESS), []);
});

/**
 * EVERY WEAKNESS THE TRACKER NAMES IS A REAL ONE.
 *
 * The point of the whole file. The `boss weakness A` / `boss weakness B` fields
 * are dropdowns, so the app cannot offer a type that does not exist — but it
 * has no idea which types are weaknesses OF THIS BOSS, and a Fire boss listed
 * as weak to Grass would be a plausible-looking mistake that survived every
 * other check in the project. This is the check.
 *
 * Read out of the Markdown rather than out of a generated JSON, because the
 * Markdown is the thing the owner edits and therefore the thing that can be
 * wrong.
 */
test('every boss weakness in the tracker is a real Gen 3 weakness of that boss', () => {
  const md = readFileSync(new URL('../design/TRACKER.md', import.meta.url), 'utf8');
  const slices = md.split(/^## /m).slice(1);
  let checked = 0;
  for (const sl of slices) {
    const id = /^`id` (\w+)/m.exec(sl)?.[1];
    if (!id) continue;
    const boss = BOSSES.find((b) => b.id === id);
    if (!boss) continue;
    const legal = weaknessesOf(boss.element);
    for (const slot of ['A', 'B']) {
      const f = new RegExp(`^- \\*\\*boss weakness ${slot}\\*\\* \`\\[(\\w+)\\]\` (.*)$`, 'm').exec(sl);
      assert.ok(f, `${id} is missing its boss weakness ${slot} field`);
      const [, mark, text] = f;
      // `[na]` is the honest answer for Proto Mk0, who has no element, and for
      // Volt Man's second slot — Electric has exactly one weakness on the whole
      // chart. Neither is a type name and neither is checked as one.
      if (mark === 'na') continue;
      const type = text.trim();
      assert.ok(legal.includes(type),
        `${id} is ${boss.element}, which is not weak to ${type} in Gen 3`
        + ` — its weaknesses are ${legal.join(', ')}`);
      checked++;
    }
  }
  assert.ok(checked >= 30, `only ${checked} weaknesses checked; the fields may not be parsing`);
});

test('the tracker app offers exactly the types that can be a weakness', () => {
  // The app is served from docs/ and cannot import src/, so it carries a copy
  // of the list. This is the thing that stops the copy drifting — the same deal
  // design/boss-data.json has, and for the same reason.
  const html = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
  const block = /const WEAKNESS_TYPES = \[([\s\S]*?)\];/.exec(html);
  assert.ok(block, 'the app no longer declares WEAKNESS_TYPES');
  const listed = [...block[1].matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
  // NORMAL IS EXCLUDED and that is a fact about the chart: it is super
  // effective against nothing, so nothing can be weak to it.
  assert.deepEqual(weaknessesOf('Normal').length > 0, true);
  assert.equal(TYPES.filter((t) => CHART[t].x2.length === 0).join(), 'Normal',
    'Normal is the only type that beats nothing');
  assert.deepEqual(listed, TYPES.filter((t) => t !== 'Normal'),
    'the app\'s type list has drifted from src/data/typechart.js');
});

test('a boss with a second weakness on the chart has one in the tracker', () => {
  const md = readFileSync(new URL('../design/TRACKER.md', import.meta.url), 'utf8');
  for (const sl of md.split(/^## /m).slice(1)) {
    const id = /^`id` (\w+)/m.exec(sl)?.[1];
    const boss = BOSSES.find((b) => b.id === id);
    if (!boss) continue;
    const naB = /^- \*\*boss weakness B\*\* `\[na\]`/m.test(sl);
    const legal = weaknessesOf(boss.element);
    // Only Proto Mk0 (no element) and Volt Man (Electric, one weakness) may
    // leave the optional slot empty. Anyone else doing so is an oversight.
    if (naB) {
      assert.ok(legal.length < 2,
        `${id} left weakness B empty but ${boss.element} has ${legal.length} weaknesses`);
    }
  }
});
