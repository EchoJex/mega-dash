/**
 * WHICH HAND A HELD WEAPON IS IN (owner, 19 and 21 Oct 2026): offensive slot 1
 * is his right hand, slot 2 his left; only a live weapon is in a hand; his hands
 * stay his own as he turns, the near one drawn over him and the far one behind,
 * shaded.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BACK_SHADE } from '../src/config/display.js';
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

test('turning left swaps them: his left hand (slot 2) comes in front, slot 1 goes behind', () => {
  assert.equal(handOf(ctx(-1), 'simons_whip', layers).layer, 'back');
  assert.equal(handOf(ctx(-1), 'quake_hammer', layers).layer, 'front');
});

test('a switched-off or unequipped weapon is in no hand', () => {
  assert.equal(handOf(ctx(1, ['quake_hammer']), 'quake_hammer', layers), null);
  assert.equal(handOf({ ...ctx(1), equipped: [] }, 'simons_whip', layers), null);
});
