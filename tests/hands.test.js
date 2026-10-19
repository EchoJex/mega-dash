/**
 * WHICH HAND A HELD WEAPON IS IN (owner, 19 Oct 2026): offensive slot 1 is his
 * right hand, slot 2 his left; only a live weapon is in a hand; the front hand
 * draws over him and the back hand behind, shaded. Whether the hands follow
 * him round when he turns is HANDS, and this checks whichever it is set to.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HANDS, BACK_SHADE } from '../src/config/display.js';
import { handOf } from '../src/systems/weaponry.js';

const layers = { held: 'front', heldBack: 'back' };
const ctx = (facing, disabled = []) => ({
  run: { loadout: { offensive: ['simons_whip', 'quake_hammer'], disabled: new Set(disabled) } },
  equipped: ['simons_whip', 'quake_hammer'],
  player: { facing },
});

test('facing right, slot 1 is in front and slot 2 behind, shaded', () => {
  assert.equal(handOf(ctx(1), 'simons_whip', layers).layer, 'front');
  const back = handOf(ctx(1), 'quake_hammer', layers);
  assert.equal(back.layer, 'back');
  assert.equal(back.tint, BACK_SHADE);
});

test('turning left keeps slot 1 in front, or swaps the hands, as HANDS says', () => {
  const swapped = HANDS === 'right';
  assert.equal(handOf(ctx(-1), 'simons_whip', layers).layer, swapped ? 'back' : 'front');
  assert.equal(handOf(ctx(-1), 'quake_hammer', layers).layer, swapped ? 'front' : 'back');
});

test('a switched-off or unequipped weapon is in no hand', () => {
  assert.equal(handOf(ctx(1, ['quake_hammer']), 'quake_hammer', layers), null);
  assert.equal(handOf({ ...ctx(1), equipped: [] }, 'simons_whip', layers), null);
});
