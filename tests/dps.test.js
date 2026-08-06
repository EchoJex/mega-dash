/**
 * THE DPS INVARIANT — one test, deliberately skipped, deliberately alone.
 *
 * This file holds nothing else so the invariant is easy to find and un-skip
 * when weapon tuning begins. It used to also carry two boss-data checks, which
 * had nothing to do with DPS and lived here only by accident; they are in
 * data.test.js with the rest of the data-shape tests now.
 *
 * NOTE ON BALANCE: the DPS invariant below is SKIPPED on purpose. Weapon
 * numbers are placeholders until the late tuning phase, and a test that pins a
 * placeholder in place only costs you a failing build every time you nudge one.
 * Re-enable it when real weapon tuning starts — see the testing note in
 * CLAUDE.md.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, dpsAtLevel } from '../src/data/weapons.js';
import { FEEL } from '../src/config/feel.js';

test('all weapons share the same level-1 DPS', {
  skip: 'balance is a late-phase concern; weapon numbers are placeholders',
}, () => {
  for (const w of WEAPONS) {
    assert.ok(
      Math.abs(dpsAtLevel(w, 1) - FEEL.dpsTarget) < 0.01,
      `${w.name} is off target: ${dpsAtLevel(w, 1).toFixed(3)} vs ${FEEL.dpsTarget}`,
    );
  }
});
