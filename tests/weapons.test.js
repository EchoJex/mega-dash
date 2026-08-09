/**
 * WEAPON RUNTIMES AND THE LOADOUT — PLUMBING ONLY.
 *
 * Same standard as tests/fights.test.js: these check that every weapon runs,
 * does something, and obeys its structural rules. They deliberately do NOT
 * assert damage, cooldowns, clip sizes or knockback strengths — those are
 * placeholders straight off the tracker's adjectives, and pinning one would
 * only break the build the next time it is nudged.
 *
 * The exception is the Nullfire Drone's 40% duty cycle, which is asserted
 * because it is DERIVED rather than chosen: the tracker states the formula, and
 * a rung that breaks it is a mistake rather than a tuning decision.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS, WEAPON_BY_ID, WEAPON_LADDERS, ladderAt, hasLadder,
  SIDEARM_ID, OFFENSIVE, DEFENSIVE, SLOTS_PER_CLASS, specialsOfClass, classOf,
} from '../src/data/weapons.js';
import * as Loadout from '../src/systems/loadout.js';
import * as Wpn from '../src/systems/weaponry.js';

const FLOOR = 184;

/** A player, a couple of enemies, and every hook a weapon can reach for. */
function harness(id, level) {
  const run = {
    frame: 0, dmgMult: 1, wstate: {}, allies: [], lastDamaged: null,
    meleeArmor: 0, wpLevels: { [id]: level },
  };
  const player = {
    x: 100, y: FLOOR - 24, vx: 0, vy: 0, facing: 1, onGround: true,
  };
  const mkEnemy = (x, y) => ({
    x, y, w: 12, h: 12, hp: 999, vy: 0, kbVx: 0, status: {},
  });
  const enemies = [mkEnemy(120, FLOOR - 12), mkEnemy(160, FLOOR - 12), mkEnemy(70, FLOOR - 40)];
  const bullets = [];
  const hits = [];
  const shakes = [];
  const patches = [];
  const fx = Wpn.makeFx();
  const arena = {
    x0: 0, x1: 400, floorY: FLOOR, ceilY: 0, patches: [], platforms: [],
  };
  const ctx = {
    run, player, bullets, allies: run.allies, enemies, arena,
    floorY: FLOOR, landVy: 4, equipped: [id], fx,
    levelOf: () => level,
    spawn: (spec) => bullets.push({ life: 180, enemy: false, ...spec }),
    hitEnemy: (e, dmg, opts) => { hits.push({ e, dmg, opts }); e.hp -= dmg; },
    overGround: () => true,
    shake: (mag, dur) => shakes.push({ mag, dur }),
    puff: (spec) => Wpn.puff(fx, spec),
    arc: (a, b) => Wpn.arcFx(fx, a, b),
    patch: (pid, x, w, y, frames) => patches.push({ pid, x, w, y, frames }),
    sfx: () => {},
  };
  return { ctx, run, player, enemies, bullets, hits, shakes, patches, fx };
}

const LADDER_IDS = Object.keys(WEAPON_LADDERS);
const LEVELS = [1, 2, 3, 5, 6, 8, 10];

test('every weapon with a ladder has a runtime, and vice versa', () => {
  assert.deepEqual(
    LADDER_IDS.slice().sort(),
    Object.keys(Wpn.RUNTIME).slice().sort(),
    'a ladder with no runtime is a weapon that levels up and changes nothing',
  );
});

test('every ladder weapon runs a long stretch at every level without throwing', () => {
  for (const id of LADDER_IDS) {
    for (const level of LEVELS) {
      const h = harness(id, level);
      const beh = Wpn.RUNTIME[id];
      assert.doesNotThrow(() => {
        for (let i = 0; i < 2000; i++) {
          h.run.frame++;
          Wpn.coolWeapons(h.run.wstate);
          Wpn.stepWeapons(h.ctx, [id]);
          if (beh.fire) Wpn.fireActive(h.ctx, id, i % 60);
          if (i % 90 === 0) Wpn.notify(h.ctx, [id], 'land');
          if (i % 70 === 0) Wpn.notify(h.ctx, [id], 'jump');
          Wpn.stepFx(h.fx);
          // Keep the field populated — a weapon that only acts when an enemy
          // is present must not be scored as idle for lack of one.
          for (const e of h.enemies) if (e.hp <= 0) e.hp = 999;
        }
      }, `${id} Lv${level}`);

      // Applying an attribute counts as acting. Frost Guard's whole Lv1 effect
      // is a freeze and a blocked shot — neither spawns anything, and scoring
      // it as idle would be measuring the wrong thing.
      const statused = h.enemies.filter((e) => Object.keys(e.status).length > 0).length;
      const acted = h.bullets.length + h.hits.length + h.shakes.length
        + h.run.allies.length + h.fx.puffs.length + h.patches.length + statused;
      assert.ok(acted > 0, `${id} Lv${level} did nothing across 2000 frames`);
    }
  }
});

test('a weapon with no enemies on screen still runs without throwing', () => {
  for (const id of LADDER_IDS) {
    const h = harness(id, 10);
    h.enemies.length = 0;
    assert.doesNotThrow(() => {
      for (let i = 0; i < 600; i++) {
        h.run.frame++;
        Wpn.coolWeapons(h.run.wstate);
        Wpn.stepWeapons(h.ctx, [id]);
        if (Wpn.RUNTIME[id].fire) Wpn.fireActive(h.ctx, id, 30);
        Wpn.notify(h.ctx, [id], 'land');
      }
    }, `${id} with an empty field`);
  }
});

/**
 * The one number worth pinning. The tracker DERIVES the reload from the clip
 * and the fire rate, so every rung has to land on the same uptime; a rung that
 * does not is an arithmetic slip, not a balance choice.
 */
test('the Nullfire Drone holds a 40% duty cycle at every rung', () => {
  for (const level of [1, 3, 6, 10]) {
    const L = ladderAt('core_blaster', level);
    const bulletsPerSecond = (L.burst * 60) / (L.pullFrames + L.burst * L.burstGap);
    const emptyFrames = (L.clip / bulletsPerSecond) * 60;
    const ratio = emptyFrames / (emptyFrames + L.reloadFrames);
    assert.ok(Math.abs(ratio - 0.4) < 0.02,
      `Lv${level} is live ${(ratio * 100).toFixed(1)}% of the time, not 40%`);
  }
});

test('the drone reloads when the clip runs dry and refills to full', () => {
  const h = harness('core_blaster', 1);
  const L = ladderAt('core_blaster', 1);
  let sawEmpty = false;
  for (let i = 0; i < L.reloadFrames + 60 * L.clip + 200; i++) {
    Wpn.stepWeapons(h.ctx, ['core_blaster']);
    const st = h.run.wstate.core_blaster;
    if (st.reloading) sawEmpty = true;
    if (sawEmpty && !st.reloading) { assert.equal(st.clip, L.clip); return; }
  }
  assert.fail('the drone never reloaded');
});

test('ladderAt merges rungs upward and leaves unmentioned fields alone', () => {
  const l1 = ladderAt('blaze_wheel', 1);
  const l4 = ladderAt('blaze_wheel', 4);
  assert.equal(l4.maxLive, l1.maxLive, 'level 4 has not reached the Lv6 rung');
  assert.notEqual(ladderAt('blaze_wheel', 3).hotFrames, l1.hotFrames);
  assert.equal(ladderAt('blaze_wheel', 6).hotFrames, ladderAt('blaze_wheel', 3).hotFrames,
    'a rung inherits what it does not restate');
  assert.equal(ladderAt('nope', 1), null);
});

/**
 * PARTIAL LADDERS ARE LEGAL. Frost Guard, Quake Hammer and Swarm Caller all
 * stop short because the tracker leaves their top rungs blank. This asserts the
 * degradation is graceful rather than asserting which rungs exist — the answer
 * changes the moment the owner writes one.
 */
test('a partial ladder degrades to its last written rung', () => {
  for (const id of LADDER_IDS) {
    const top = Math.max(...Object.keys(WEAPON_LADDERS[id]).map(Number));
    assert.deepEqual(ladderAt(id, 10), ladderAt(id, top),
      `${id} above its last rung must reuse that rung, not fall through`);
  }
});

// ── Loadout ──────────────────────────────────────────────────────────

test('every weapon has a class and a distinct three-letter abbreviation', () => {
  const abbrs = new Set();
  for (const w of WEAPONS) {
    assert.ok([SIDEARM_ID].includes(w.id) || [OFFENSIVE, DEFENSIVE].includes(w.cls),
      `${w.id} needs a class so the wheel knows where to put it`);
    assert.equal(w.abbr.length, 3, `${w.id} abbreviation must be three glyphs`);
    abbrs.add(w.abbr);
  }
  assert.equal(abbrs.size, WEAPONS.length, 'two weapons share an abbreviation');
});

test('the sidearm belongs to neither special class and cannot be benched', () => {
  assert.equal(WEAPON_BY_ID[SIDEARM_ID].cls, 'sidearm');
  for (const cls of [OFFENSIVE, DEFENSIVE]) {
    assert.ok(!specialsOfClass(cls).includes(SIDEARM_ID));
  }
  const lo = Loadout.makeLoadout();
  Loadout.toggleEnabled(lo, SIDEARM_ID);
  assert.equal(Loadout.isEnabled(lo, SIDEARM_ID), true);
});

test('a class holds two weapons and refuses a third without being asked', () => {
  const lo = Loadout.makeLoadout();
  const [a, b, c] = specialsOfClass(OFFENSIVE);
  assert.equal(Loadout.autoEquip(lo, a), 0);
  assert.equal(Loadout.autoEquip(lo, b), 1);
  assert.equal(Loadout.autoEquip(lo, c), -1, 'the third must become a decision');
  assert.deepEqual(Loadout.slotsOf(lo, OFFENSIVE), [a, b]);
});

test('equipping into an occupied slot displaces, and never duplicates', () => {
  const lo = Loadout.makeLoadout();
  const [a, b, c] = specialsOfClass(OFFENSIVE);
  Loadout.autoEquip(lo, a);
  Loadout.autoEquip(lo, b);
  assert.equal(Loadout.equip(lo, c, 0), a, 'the displaced weapon is reported');
  assert.deepEqual(Loadout.slotsOf(lo, OFFENSIVE), [c, b]);

  // Moving a weapon to the other slot of its own class is a swap, not a copy.
  Loadout.equip(lo, c, 1);
  assert.deepEqual(Loadout.slotsOf(lo, OFFENSIVE), [b, c]);
  assert.equal(new Set(Loadout.equippedIds(lo)).size, Loadout.equippedIds(lo).length);
});

test('a weapon only ever lands in a slot of its own class', () => {
  const lo = Loadout.makeLoadout();
  const def = specialsOfClass(DEFENSIVE)[0];
  Loadout.equip(lo, def, 0);
  assert.deepEqual(Loadout.slotsOf(lo, OFFENSIVE), Array(SLOTS_PER_CLASS).fill(null));
  assert.equal(Loadout.slotsOf(lo, DEFENSIVE)[0], def);
});

test('only the sidearm and enabled offensive slots can be fired', () => {
  const lo = Loadout.makeLoadout();
  const off = specialsOfClass(OFFENSIVE)[0];
  const def = specialsOfClass(DEFENSIVE)[0];
  Loadout.autoEquip(lo, off);
  Loadout.autoEquip(lo, def);
  assert.deepEqual(Loadout.firables(lo), [SIDEARM_ID, off]);
  assert.deepEqual(Loadout.running(lo), [def]);

  Loadout.toggleEnabled(lo, off);
  assert.deepEqual(Loadout.firables(lo), [SIDEARM_ID]);
  assert.deepEqual(Loadout.running(lo), [def], 'switching one off leaves the other alone');

  Loadout.toggleEnabled(lo, def);
  assert.deepEqual(Loadout.running(lo), []);
});

test('benching or disabling the live weapon falls back to the sidearm', () => {
  const lo = Loadout.makeLoadout();
  const [a, b] = specialsOfClass(OFFENSIVE);
  Loadout.autoEquip(lo, a);
  assert.equal(Loadout.normaliseActive(lo, a), a);
  Loadout.toggleEnabled(lo, a);
  assert.equal(Loadout.normaliseActive(lo, a), SIDEARM_ID);
  Loadout.toggleEnabled(lo, a);
  Loadout.equip(lo, b, 0);
  assert.equal(Loadout.normaliseActive(lo, a), SIDEARM_ID, 'a benched weapon cannot stay live');
});

/**
 * Being switched off belongs to the SLOT, not to the weapon. A weapon that
 * comes back from the bench hours later must not still be off from a decision
 * the player has long forgotten making.
 */
test('leaving a slot clears the switched-off flag', () => {
  const lo = Loadout.makeLoadout();
  const [a, b] = specialsOfClass(OFFENSIVE);
  Loadout.autoEquip(lo, a);
  Loadout.toggleEnabled(lo, a);
  assert.equal(Loadout.isEnabled(lo, a), false);

  Loadout.equip(lo, b, 0);                     // b displaces a
  assert.equal(Loadout.isEnabled(lo, a), true, 'displaced weapons come back on');

  Loadout.toggleEnabled(lo, b);
  Loadout.unequip(lo, b);
  assert.equal(Loadout.isEnabled(lo, b), true, 'unequipping clears it too');
});

test('the bench is everything unlocked in a class that is not slotted', () => {
  const lo = Loadout.makeLoadout();
  const [a, b, c] = specialsOfClass(OFFENSIVE);
  const unlocked = new Set([SIDEARM_ID, a, b, c]);
  Loadout.autoEquip(lo, a);
  assert.deepEqual(Loadout.benched(lo, OFFENSIVE, unlocked), [b, c]);
  assert.deepEqual(Loadout.benched(lo, DEFENSIVE, unlocked), []);
});

test('weapon state is dropped when a weapon leaves the loadout', () => {
  const store = {};
  const h = harness('core_blaster', 1);
  Wpn.stateFor(store, 'core_blaster', 1, h.ctx);
  assert.ok(store.core_blaster);
  Wpn.pruneStates(store, ['blaze_wheel']);
  assert.equal(store.core_blaster, undefined,
    're-slotting a weapon should start it fresh, not resume a stale clip');
});

test('classOf falls back to the sidearm rather than throwing on a bad id', () => {
  assert.equal(classOf('does_not_exist'), 'sidearm');
  assert.equal(classOf(undefined), 'sidearm');
});

test('only weapons with a runtime report a ladder', () => {
  for (const w of WEAPONS) {
    assert.equal(hasLadder(w.id), Wpn.hasRuntime(w.id), w.id);
  }
});
