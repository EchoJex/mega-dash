/**
 * docs/marks.js — the marker ladder both apps and the repo tooling speak.
 *
 * It had NO test, which is how the sprite editor shipped unable to set three of
 * its four markers. The rule is four lines long and every one of them is a
 * decision, so this pins the decisions rather than the lines.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARKS, SMALL_EDIT, markAfterEdit, changedChars, changedPixels } from '../docs/marks.js';

test('the ladder is four rungs in order', () => {
  assert.deepEqual(MARKS, ['deferred', 'wip', 'draft', 'ready'],
    'order is meaning here — each rung is strictly more done than the last');
});

/**
 * AN EDIT OF ZERO IS NOT AN EDIT. This is the one that broke the editor: every
 * caller reaches this from a general "something changed" path that covers more
 * than the content it measures, and before the guard a hand-set DRAFT fell
 * straight through to `return 'wip'` on the very next commit.
 */
test('nothing changed means nothing moves', () => {
  for (const m of MARKS) {
    assert.equal(markAfterEdit(m, 0), m,
      `picking ${m} by hand has to stick — otherwise the dropdown cannot set it at all`);
  }
});

test('a small edit to a finished thing puts it back in the queue, not in the bin', () => {
  assert.equal(markAfterEdit('ready', 1), 'draft');
  assert.equal(markAfterEdit('ready', SMALL_EDIT - 1), 'draft',
    'a touch-up on something built goes back to be re-checked; wip is where things go unlooked-at');
});

test('a rewrite of a finished thing is not something to build from', () => {
  assert.equal(markAfterEdit('ready', SMALL_EDIT), 'wip', 'fifty is the threshold, inclusive');
  assert.equal(markAfterEdit('ready', 9999), 'wip');
});

test('editing anything unfinished means it is being worked on', () => {
  for (const m of ['deferred', 'wip', 'draft']) {
    assert.equal(markAfterEdit(m, 1), 'wip');
    assert.equal(markAfterEdit(m, 9999), 'wip');
  }
});

/**
 * CLAUDE NEVER WRITES `draft`, so the only way a frame or a field can reach the
 * green light is the owner choosing it. That makes the zero case above load
 * bearing rather than tidy: it IS the promotion path.
 */
test('draft is reachable only by being chosen', () => {
  assert.equal(markAfterEdit('draft', 0), 'draft', 'chosen by hand, and it stays');
  assert.equal(markAfterEdit('ready', 1), 'draft', 'or a touch-up on something already built');
  for (const m of ['deferred', 'wip']) {
    assert.notEqual(markAfterEdit(m, 1), 'draft', 'drawing can never promote anything on its own');
  }
});

test('changedChars measures the span that differs, not the whole text', () => {
  assert.equal(changedChars('the quick brown fox', 'the quick brown fox'), 0);
  assert.equal(changedChars('a big fox', 'a red fox'), 3, 'a word swapped mid-sentence is that word');
  assert.equal(changedChars('', 'hello'), 5);
  assert.equal(changedChars(undefined, undefined), 0, 'an unopened field must not read as an edit');
});

/**
 * ROLE, NOT COLOUR. A palette re-tune changes every pixel's colour and none of
 * its meaning, and that is not an edit anybody made.
 */
test('changedPixels counts cells whose role changed', () => {
  assert.equal(changedPixels(['..', '..'], ['..', '..']), 0);
  assert.equal(changedPixels(['..', '..'], ['.1', '..']), 1);
  assert.equal(changedPixels(['12'], ['21']), 2);
  assert.equal(changedPixels([], []), 0, 'a frame with no rows is not an edit either');
});

/**
 * A ROW THAT GREW OR SHRANK STILL COUNTS. A menu element's grid is adjustable,
 * so +ROW / +COL genuinely changes the frame and has to read as an edit.
 */
test('a resized frame reads as an edit', () => {
  assert.equal(changedPixels(['..'], ['...']), 1);
  assert.equal(changedPixels(['..'], ['..', '..']), 2);
});
