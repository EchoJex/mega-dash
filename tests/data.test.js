/**
 * Data integrity for minions, pickups and the meta upgrades.
 *
 * These guard the rules that are easy to break by hand-editing a colour or a
 * ladder and hard to notice while playing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MINIONS, ELITE_OUTLINE } from '../src/data/minions.js';
import { BOSSES, bossLayer } from '../src/data/bosses.js';
import { UPGRADES } from '../src/data/upgrades.js';
import {
  WEAPONS, NULL_WEAPON, weaponOf, WHEEL_ORDER,
  WEAPON_LADDERS, hasLadder, damageAtLevel,
} from '../src/data/weapons.js';
import { SPRITE_CLASS, DEPTH, PLAYER_SPRITE_W, PLAYER_SPRITE_H } from '../src/config/display.js';
import { projectileHalfHeight, SHAPE_HALF_H } from '../src/systems/assets.js';
import { readFileSync } from 'node:fs';

const TRACKER = JSON.parse(
  readFileSync(new URL('../design/boss-data.json', import.meta.url), 'utf8'),
);

/**
 * design/TRACKER.md is the source of truth, so `bosses.js` is downstream of it.
 * There is no codegen for the game data — this test is what makes "downstream"
 * real. It reads boss-data.json, which tools/sync-tracker.js extracts from the
 * tracker's meta lines, and checks only the MECHANICAL values (palette hexes,
 * scale, names). Prose stays prose and is never asserted.
 *
 * A failure means somebody changed one side without the other. Fix TRACKER.md
 * first, run `npm run sync`, then bring the code to match — not the reverse.
 */
test('bosses.js matches design/TRACKER.md', () => {
  const t = TRACKER.bosses;
  assert.equal(BOSSES.length, Object.keys(t).length);
  for (const b of BOSSES) {
    const d = t[b.id];
    assert.ok(d, `${b.id} is missing from the tracker — check its \`id\` stamp`);
    assert.equal(b.primary.toUpperCase(), d.primary.toUpperCase(), `${b.id} primary`);
    assert.equal(b.secondary.toUpperCase(), d.secondary.toUpperCase(), `${b.id} secondary`);
    assert.equal(b.outline.toUpperCase(), d.outline.toUpperCase(), `${b.id} outline`);
    assert.equal(b.scale, d.scale, `${b.id} scale`);
    // Display names are UPPERCASE in code, title case in the tracker.
    assert.equal(b.name, d.name.toUpperCase(), `${b.id} name`);
    assert.equal(b.attackName, d.attackName, `${b.id} attack name`);
  }
});

// NOTE: minion colours are deliberately UNCONSTRAINED against the boss
// palette. The 17 boss primaries are perceptually spaced against each other;
// minions are not part of that set, so there is no separation test here.

test('minions honour the 3-colour NES palette rule', () => {
  for (const m of MINIONS) {
    assert.equal(m.outline, '#0A0A12', `${m.id} must use the shared outline`);
    assert.equal(new Set([m.primary, m.secondary, m.outline]).size, 3,
      `${m.id} must have three distinct colours`);
  }
});

test('there is exactly one ground and one airborne minion', () => {
  assert.deepEqual(MINIONS.map((m) => m.kind).sort(), ['air', 'ground']);
});

test('the elite rim is not one of the minion palette colours', () => {
  // otherwise an elite would be indistinguishable from its base form
  for (const m of MINIONS) {
    assert.ok(![m.primary, m.secondary, m.outline].includes(ELITE_OUTLINE));
  }
});

test('slide mastery gates the slide at rank 0 and describes every rank', () => {
  const slide = UPGRADES.find((u) => u.id === 'slide_mastery');
  const r = {};
  slide.apply(r, 0);
  assert.equal(r.slideRank, 0, 'rank 0 must leave the slide locked');
  for (let l = 0; l <= slide.maxLv; l++) {
    assert.equal(typeof slide.desc(l), 'string', `rank ${l} has no description`);
  }
});

test('every upgrade describes itself at every rank it can reach', () => {
  for (const u of UPGRADES) {
    for (let l = 0; l <= u.maxLv; l++) {
      assert.equal(typeof u.desc(l), 'string', `${u.id} rank ${l}`);
    }
  }
});

test('every actor fits inside its class sprite grid', () => {
  // The grid is the authoring contract for art — anything that outgrows it
  // would have to be drawn outside its own frame.
  for (const m of MINIONS) {
    assert.ok(m.w <= SPRITE_CLASS.minion.w && m.h <= SPRITE_CLASS.minion.h,
      `${m.id} is ${m.w}x${m.h}, over the ${SPRITE_CLASS.minion.w}x${SPRITE_CLASS.minion.h} minion grid`);
  }
  for (const b of BOSSES) {
    const h = Math.round(24 * b.scale), w = Math.round(h * 0.75);
    assert.ok(w <= SPRITE_CLASS.boss.w && h <= SPRITE_CLASS.boss.h,
      `${b.id} is ${w}x${h}, over the ${SPRITE_CLASS.boss.w}x${SPRITE_CLASS.boss.h} boss grid`);
  }
  assert.equal(SPRITE_CLASS.player.w, PLAYER_SPRITE_W);
  assert.equal(SPRITE_CLASS.player.h, PLAYER_SPRITE_H);
});

test('sprite grids escalate minion < player < miniboss < boss', () => {
  const order = ['minion', 'player', 'miniboss', 'boss'];
  for (let i = 1; i < order.length; i++) {
    assert.ok(SPRITE_CLASS[order[i]].h > SPRITE_CLASS[order[i - 1]].h,
      `${order[i]} must be taller than ${order[i - 1]}`);
  }
});

test('the player draws above every world actor', () => {
  const world = Object.entries(DEPTH).filter(([k]) => k !== 'player');
  for (const [name, d] of world) {
    assert.ok(DEPTH.player > d, `player must draw above ${name}`);
  }
});

test('the null weapon is an outline-only silhouette that fires nothing', () => {
  assert.equal(NULL_WEAPON.palette.primary, null);
  assert.equal(NULL_WEAPON.palette.secondary, null);
  assert.ok(NULL_WEAPON.palette.outline, 'the silhouette itself must still be drawn');
  assert.equal(NULL_WEAPON.projectiles, 0);
  // an unknown id must degrade to it rather than throw
  assert.equal(weaponOf('does_not_exist'), NULL_WEAPON);
  assert.equal(weaponOf(undefined), NULL_WEAPON);
  assert.equal(weaponOf('buster').id, 'buster');
});

test('the buster occupies a wheel slot like any other weapon', () => {
  // Structural only. The buster's COLOURS are a placeholder and are
  // deliberately not asserted — see the testing note in CLAUDE.md.
  assert.ok(WHEEL_ORDER.includes('buster'));
  assert.equal(weaponOf('buster').id, 'buster');
});

test('every weapon shape has an explicit drawn half-height', () => {
  // Duplicator echo spacing is derived from this. A shape missing from the
  // table silently falls back to the 'bolt' value, which would overlap the
  // echoes on anything taller than a thin bar.
  for (const w of WEAPONS) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(SHAPE_HALF_H, w.shape),
      `${w.shape} (${w.name}) is missing from SHAPE_HALF_H`,
    );
    assert.ok(projectileHalfHeight(w.shape, 10) > 0);
  }
});


/**
 * The element-slice plan depends on WEAPON_LADDERS being the honest record of
 * which weapons have graduated from the flat placeholder. A typo'd key would
 * make `npm run status` claim a slice is finished when it is not.
 */
test('every weapon ladder entry names a real weapon', () => {
  const ids = new Set(WEAPONS.map((w) => w.id));
  for (const id of Object.keys(WEAPON_LADDERS)) {
    assert.ok(ids.has(id), `WEAPON_LADDERS has "${id}", which is not a weapon`);
  }
});

test('a weapon without a ladder still levels, it just does not change behaviour', () => {
  // Guards the placeholder path staying intact while ladders are filled one at
  // a time — a half-migrated weapon must never become unplayable.
  for (const w of WEAPONS) {
    if (hasLadder(w.id)) continue;
    assert.ok(damageAtLevel(w, 10) > damageAtLevel(w, 1), `${w.id} does not scale at all`);
  }
});

/**
 * DEV LAYER CYCLING — the boss selector's whole point.
 *
 * Shipped behaviour clamps at layer 3 forever: a boss you have beaten five
 * times must not become easy again, or the meta progression means nothing.
 * But that makes layers 1 and 2 unreachable for testing once you have won
 * three times, so dev mode wraps instead: encounter 4 is encounter 1 again.
 */
test('shipped layers rise then stay at 3, and never fall', () => {
  const save = { bossKills: {} };
  let prev = 0;
  for (let clears = 0; clears <= 8; clears++) {
    save.bossKills.blaze = clears;
    const l = bossLayer(save, 'blaze');
    assert.ok(l >= 1 && l <= 3, `layer ${l} out of range`);
    assert.ok(l >= prev, 'a shipped layer must never go down');
    prev = l;
  }
  save.bossKills.blaze = 99;
  assert.equal(bossLayer(save, 'blaze'), 3, 'clamps at 3 however many clears');
});

test('dev cycling wraps 4=1, 5=2, 6=3', () => {
  const save = { bossKills: {} };
  const expected = [1, 2, 3, 1, 2, 3, 1, 2, 3];
  expected.forEach((want, clears) => {
    save.bossKills.blaze = clears;
    assert.equal(bossLayer(save, 'blaze', true), want,
      `${clears} clears (encounter ${clears + 1}) should be layer ${want}`);
  });
});

test('an unfought boss is layer 1 either way, and unknown ids do not throw', () => {
  assert.equal(bossLayer({ bossKills: {} }, 'blaze'), 1);
  assert.equal(bossLayer({ bossKills: {} }, 'blaze', true), 1);
  assert.equal(bossLayer({}, 'nope'), 1);
  assert.equal(bossLayer({}, 'nope', true), 1);
});

test('every boss drops a weapon that exists', () => {
  // Moved here from dps.test.js, which is about the DPS invariant and had
  // collected two unrelated boss-data checks.
  const ids = new Set(WEAPONS.map((w) => w.id));
  for (const b of BOSSES) assert.ok(ids.has(b.dropWeapon), `${b.id} -> ${b.dropWeapon} missing`);
});

test('boss primary colours are all distinct', () => {
  // The 17 primaries are perceptually spaced; two identical ones would make a
  // boss unidentifiable at a glance. Distinctness is structural, so it is
  // asserted — the SPACING is a tuned property and deliberately is not.
  assert.equal(new Set(BOSSES.map((b) => b.primary)).size, BOSSES.length);
});

test('every boss is reachable from the dev selector', () => {
  // The picker lists BOSSES directly, so this guards the case where a boss
  // exists in data but can never be selected to test.
  assert.equal(BOSSES.length, 17);
  assert.equal(new Set(BOSSES.map((b) => b.id)).size, 17, 'duplicate boss id');
  for (const b of BOSSES) {
    assert.ok(b.name && b.primary && b.outline, `${b.id} cannot render a tile`);
  }
});
