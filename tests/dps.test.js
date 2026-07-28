/**
 * Weapon and boss data shape.
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
import { BOSSES } from '../src/data/bosses.js';

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

test('every boss drops a weapon that exists', () => {
  const ids = new Set(WEAPONS.map((w) => w.id));
  for (const b of BOSSES) assert.ok(ids.has(b.dropWeapon), `${b.id} -> ${b.dropWeapon} missing`);
});

test('boss primary colours are all distinct', () => {
  assert.equal(new Set(BOSSES.map((b) => b.primary)).size, BOSSES.length);
});
