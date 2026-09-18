/**
 * THORN MAN'S SWARM IS PAID BY THE TILE, NOT BY THE CLOCK.
 *
 * The field: "the Initial Bug ... has unlimited duration, and every
 * 10-2(bug swarm weapon level)th ground cover fully receded by this bug causes
 * an additional unlimited duration bug to spawn (up to a max of 1 bug per 3
 * receded ground covers)."
 *
 * This replaced a timer, and the timer is what a playtest reported as bugs
 * arriving without limit. What is asserted here is that the population is a
 * function of WORK DONE — not the bug's damage, its speed or any other
 * placeholder number, none of which this touches.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/systems/weaponry.js', import.meta.url), 'utf8');

/**
 * Lift the price ladder out of the live source rather than restating it.
 * weaponry.js imports the whole weapon runtime, which is more than this needs.
 */
const m = src.match(/const bugPrice = \(lv\) => ([^;]+);/);
assert.ok(m, 'bugPrice is gone from weaponry.js — the swarm economy moved');
// eslint-disable-next-line no-new-func
const bugPrice = new Function('lv', `return ${m[1]};`);

test('the price ladder is 8, 6, 4 and then floors at 3', () => {
  assert.equal(bugPrice(1), 8);
  assert.equal(bugPrice(2), 6);
  assert.equal(bugPrice(3), 4);
  // 10-2L reaches 0 at Lv5 and goes negative after. The stated maximum rate of
  // one bug per three tiles is what stops a divide by zero becoming a price.
  for (let lv = 4; lv <= 10; lv++) {
    assert.equal(bugPrice(lv), 3, `Lv${lv} must floor at the stated 1-per-3 rate`);
  }
});

test('population is earned, so an idle swarm never grows', () => {
  const earned = (recedes, lv) => 1 + Math.floor(recedes / bugPrice(lv));
  // The INITIAL bug is free — it is what does the work that buys the others.
  assert.equal(earned(0, 1), 1, 'a swarm that has receded nothing is one bug');
  assert.equal(earned(7, 1), 1, 'seven tiles at Lv1 has not bought the 8th yet');
  assert.equal(earned(8, 1), 2);
  assert.equal(earned(24, 1), 4);
  // Levelling buys a faster-growing swarm for the same work, and then stops.
  assert.equal(earned(12, 3), 4);
  assert.equal(earned(12, 10), 5);
  assert.equal(earned(12, 4), earned(12, 10), 'Lv4 and Lv10 share the floored rate');
});

test('the room still has an absolute ceiling', () => {
  const cap = Number(src.match(/const SWARM_PERSIST_CAP = (\d+);/)?.[1]);
  assert.ok(cap > 0, 'SWARM_PERSIST_CAP is gone');
  // Eight tiles cycling for five minutes is a few hundred recedes; the earned
  // count has no upper bound of its own, so the clamp is load-bearing.
  assert.match(src, /Math\.min\(earned, SWARM_PERSIST_CAP\)/);
});

test('persisting rooms no longer spawn a whole group on the recall timer', () => {
  // The regression this file exists for: `recallFrames` must not be reachable
  // from the persist branch, or the clock is back alongside the counter.
  const persistBranch = src.slice(src.indexOf('if (persist) {'), src.indexOf('if (mine.length === 0'));
  assert.ok(!persistBranch.includes('recallFrames'),
    'the persist branch is on a timer again');
  assert.ok(!persistBranch.includes('L.count'),
    'the persist branch spawns a group again — it must add one bug at a time');
});
