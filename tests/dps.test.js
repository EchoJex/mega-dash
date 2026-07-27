/**
 * The balance invariant, enforced.
 *
 * Every weapon must deal the same DPS at level 1. If you add projectiles or
 * change a cooldown, this test tells you immediately whether the weapon is
 * still fair. Run with:  npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, dpsAtLevel } from '../src/data/weapons.js';
import { FEEL } from '../src/config/feel.js';
import { BOSSES } from '../src/data/bosses.js';

test('all weapons share the same level-1 DPS', () => {
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
