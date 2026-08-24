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
import * as Attr from '../src/systems/attributes.js';

const FLOOR = 184;

/** A player, a couple of enemies, and every hook a weapon can reach for. */
function harness(id, level) {
  const run = {
    frame: 0, dmgMult: 1, projSpeedMult: 1, hp: 20, hpBonus: 0, runHpBonus: 0,
    wstate: {}, allies: [], lastDamaged: null,
    // Every per-frame grant a weapon may assert. GameScene clears these before
    // the weapons run; the harness just has to have them.
    meleeArmor: 0, rootFrames: 0, glideFall: null, airControl: 1,
    aggroFire: 1, aggroPause: null,
    wpLevels: { [id]: level },
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
  const effects = [];
  const fx = Wpn.makeFx();
  const arena = {
    x0: 0, x1: 400, floorY: FLOOR, ceilY: 0, patches: [], platforms: [],
  };
  const statusBag = {};
  const ctx = {
    run, player, bullets, allies: run.allies, enemies, arena,
    platforms: arena.platforms, statusBag,
    floorY: FLOOR, landVy: 4, equipped: [id], fx,
    levelOf: () => level,
    heal: (n) => { run.hp += n; },
    spawn: (spec) => bullets.push({ life: 180, enemy: false, ...spec }),
    hitEnemy: (e, dmg, opts) => { hits.push({ e, dmg, opts }); e.hp -= dmg; },
    overGround: () => true,
    shake: (mag, dur) => shakes.push({ mag, dur }),
    // COUNTED, NOT SAMPLED. A puff lives a few frames and stepFx clears it, so
    // reading fx.puffs at the end of a 2000-frame run scores a weapon whose
    // whole output is puffs as idle. Every transient effect has to be tallied
    // as it happens.
    puff: (spec) => { effects.push(spec); return Wpn.puff(fx, spec); },
    arc: (a, b) => Wpn.arcFx(fx, a, b),
    patch: (pid, x, w, y, frames) => patches.push({ pid, x, w, y, frames }),
    sfx: () => {},
  };
  return { ctx, run, player, enemies, bullets, hits, shakes, patches, fx, statusBag, effects };
}

/**
 * Put the player through a jump-and-fall cycle as the frames tick by.
 *
 * A PERMANENTLY GROUNDED HARNESS CANNOT SEE A FALL-TRIGGERED WEAPON. The Gale
 * Vortex only acts while descending, so with `onGround` pinned true it scored as
 * doing nothing across two thousand frames — the same shape of gap as the boss
 * harness that was missing `anim` and hid a real crash behind a green suite.
 * Anything that reads the player's vertical state gets exercised here.
 */
function airCycle(player, i) {
  const phase = i % 120;
  if (phase < 40) {
    player.onGround = false; player.vy = -2 + phase * 0.1;   // rising
  } else if (phase < 80) {
    player.onGround = false; player.vy = 2 + (phase - 40) * 0.05; // falling
  } else {
    player.onGround = true; player.vy = 0;
  }
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
          airCycle(h.player, i);
          Wpn.coolWeapons(h.run.wstate);
          Wpn.stepWeapons(h.ctx, [id]);
          Wpn.stepAllies(h.ctx);
          // Long enough to trip every long press, including the Quake Hammer's
          // own 1.5s one — a shared 0.4s ceiling would never reach it.
          if (beh.fire) Wpn.fireActive(h.ctx, id, i % 120);
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
      // So does asserting a per-frame grant. The Eclipse Blade at Lv1 spawns
      // nothing at all: its whole effect is the aggro tax it publishes onto the
      // run for GameScene to apply, which is exactly what "reduces aggro" means.
      const granted = (h.run.aggroFire < 1 ? 1 : 0) + (h.run.aggroPause ? 1 : 0)
        + (h.run.rootFrames > 0 ? 1 : 0) + (h.run.glideFall != null ? 1 : 0);
      const acted = h.bullets.length + h.hits.length + h.shakes.length
        + h.run.allies.length + h.effects.length + h.patches.length
        + statused + granted;
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
  /**
   * The budget is DERIVED, not guessed at. It used to assume roughly a shot a
   * second and read `60 * clip`; Lv1 now fires one round every three seconds,
   * so emptying the clip alone takes half a minute and the loop expired long
   * before the drone had anything to reload.
   */
  const setFrames = L.pullFrames + L.burst * L.burstGap;
  const emptyFrames = (L.clip / L.burst) * setFrames;
  for (let i = 0; i < emptyFrames + L.reloadFrames + 200; i++) {
    // A REAL FRAME IS coolWeapons THEN stepWeapons — see GameScene.stepEquipped.
    // Leaving the first one out means `st.cool` never falls and the drone never
    // fires a shot, which is a fake context quietly testing nothing.
    Wpn.coolWeapons(h.run.wstate);
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

/**
 * The DIRECTION each new ladder moves in, which is the design — not the
 * numbers, which are placeholders. A rung that moved the wrong way would be a
 * mistake rather than a tuning choice, and that is the only thing worth pinning
 * this early.
 */
test('every ladder moves in the direction its tracker field describes', () => {
  const grows = (id, key, rungs) => {
    for (let i = 1; i < rungs.length; i++) {
      const lo = ladderAt(id, rungs[i - 1])[key];
      const hi = ladderAt(id, rungs[i])[key];
      assert.ok(hi > lo, `${id}.${key} must grow from Lv${rungs[i - 1]} to Lv${rungs[i]}`);
    }
  };
  // "Increased reach" at Lv3, "significantly increased reach" at Lv6.
  grows('thorn_lash', 'reach', [1, 3, 6]);
  // "More ricochets + higher damage."
  grows('alloy_blade', 'bounces', [1, 3]);
  grows('alloy_blade', 'pierce', [1, 3]);
  // "Larger shockwave and longer Stun."
  grows('quake_hammer', 'waveSize', [1, 3]);
  grows('quake_hammer', 'stunFrames', [1, 3]);
  // "2 allies", then 3, then 5 — and a longer duration with them.
  grows('swarm_caller', 'count', [1, 3, 6, 10]);
  grows('swarm_caller', 'lifeFrames', [1, 3, 10]);
  // "Slight increase in pause duration and frequency."
  grows('eclipse_blade', 'pauseFrames', [1, 3]);
  grows('eclipse_blade', 'pauseChance', [1, 3]);
  // Hot lingers longer as the Blaze Wheel levels: 3s then 5s.
  grows('blaze_wheel', 'hotFrames', [1, 3]);
});

test('the Thorn Lash only tosses and constricts at its top rung', () => {
  // "Lv1: can only reel in and damage minions; does not toss or constrict them."
  assert.equal(ladderAt('thorn_lash', 1).toss, false);
  assert.equal(ladderAt('thorn_lash', 1).constrictFrames, 0);
  assert.equal(ladderAt('thorn_lash', 1).grapple, false, 'the grapple arrives at Lv3');
  assert.equal(ladderAt('thorn_lash', 3).grapple, true);
  assert.equal(ladderAt('thorn_lash', 10).toss, true);
  assert.ok(ladderAt('thorn_lash', 10).constrictFrames > 0);
});

test('the Swarm Caller inverts from a timed group to a standing swarm at Lv10', () => {
  // Below Lv10 the group expires together and is re-summoned; at Lv10 the bugs
  // are permanent and individually replaced. That inversion IS the rung.
  assert.ok(!ladderAt('swarm_caller', 6).shield);
  assert.equal(ladderAt('swarm_caller', 10).shield, true);
  assert.ok(ladderAt('swarm_caller', 10).kamikaze > 0);
});

test('the Quake Hammer declares its own 1.5 second hold', () => {
  // The tracker says 1.5s for this weapon specifically. It must not silently
  // fall back to the shared 0.4s long press every other weapon uses.
  const hold = ladderAt('quake_hammer', 1).holdFrames;
  assert.equal(hold, 90);
  assert.ok(hold > Wpn.LONG_PRESS_FRAMES);
  assert.equal(Wpn.RUNTIME.quake_hammer.holdFrames(1), hold);
});

test('a status-immune weapon clears whatever has been applied', () => {
  const h = harness('eclipse_blade', 1);
  Attr.applyStatus(h.statusBag, 'burn', 120);
  assert.ok(Attr.hasStatus(h.statusBag, 'burn'));
  Wpn.stepWeapons(h.ctx, ['eclipse_blade']);
  assert.ok(!Attr.hasStatus(h.statusBag, 'burn'), 'the cloak must clear it the same frame');
  assert.ok(h.run.aggroFire < 1, 'and publish the aggro tax');
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

/** A fully-mastered loadout — the shape most slot mechanics are about. */
const maxed = () => Loadout.makeLoadout({ [OFFENSIVE]: 3, [DEFENSIVE]: 3 });

test('the sidearm is an offensive weapon that stays off the arc', () => {
  // It competes for an offensive slot, so it must carry that class...
  assert.equal(WEAPON_BY_ID[SIDEARM_ID].cls, OFFENSIVE);
  // ...but it keeps its own fixed bench position rather than joining the arc,
  // where it would shift eleven learned positions along by one.
  for (const cls of [OFFENSIVE, DEFENSIVE]) {
    assert.ok(!specialsOfClass(cls).includes(SIDEARM_ID));
  }
});

// ── Loadout Mastery ──────────────────────────────────────────────────
//
// These assert the LADDER'S SHAPE, which is the design, not a placeholder
// number: what each rank grants is the whole content of the upgrade.

test('a new save carries the sidearm, one welded slot, and no defensive row', () => {
  const lo = Loadout.makeLoadout();
  assert.deepEqual(Loadout.firables(lo), [SIDEARM_ID], 'rank 0 fires the sidearm only');
  assert.equal(Loadout.slotCount(lo, DEFENSIVE), 0, 'no defensive row at rank 0');
  assert.equal(Loadout.freeSlot(lo, OFFENSIVE), -1, 'the one position is the sidearm/s');
  assert.equal(Loadout.tradeableSlots(lo, OFFENSIVE), 0);

  // A special cannot be forced into the welded position.
  const a = specialsOfClass(OFFENSIVE)[0];
  assert.equal(Loadout.autoEquip(lo, a), -1);
  Loadout.equip(lo, a, 0);
  assert.equal(Loadout.slotsOf(lo, OFFENSIVE)[0], SIDEARM_ID);
});

test('each offensive rank lifts exactly one restriction', () => {
  const a = specialsOfClass(OFFENSIVE)[0];

  // Rank 1: a slot opens, but only one of it and the sidearm may run.
  const r1 = Loadout.makeLoadout({ [OFFENSIVE]: 1 });
  assert.equal(Loadout.autoEquip(r1, a), 0);
  assert.equal(Loadout.slotsOf(r1, OFFENSIVE)[1], SIDEARM_ID, 'slot 2 is still the sidearm');
  assert.equal(Loadout.firables(r1).length, 1, 'rank 1 runs one at a time');
  // The press-and-hold moves that one live position between the two.
  Loadout.toggleEnabled(r1, a);
  assert.deepEqual(Loadout.firables(r1), [a], 'switching one on switches the other off');
  Loadout.toggleEnabled(r1, SIDEARM_ID);
  assert.deepEqual(Loadout.firables(r1), [SIDEARM_ID]);
  // ...and can never leave the fire button pointed at nothing.
  Loadout.toggleEnabled(r1, SIDEARM_ID);
  assert.equal(Loadout.firables(r1).length, 1, 'the offensive row is never empty');

  // Rank 2: both run at once, second position still the sidearm.
  const r2 = Loadout.makeLoadout({ [OFFENSIVE]: 2 });
  Loadout.autoEquip(r2, a);
  assert.deepEqual(Loadout.firables(r2), [a, SIDEARM_ID]);
  assert.equal(Loadout.tradeableSlots(r2, OFFENSIVE), 1);

  // Rank 3: the sidearm's position is freed and can be traded away.
  const [x, y] = specialsOfClass(OFFENSIVE);
  const r3 = maxed();
  Loadout.equip(r3, x, 0);
  Loadout.equip(r3, y, 1);
  assert.deepEqual(Loadout.firables(r3), [x, y], 'rank 3 may drop the sidearm entirely');
  assert.equal(Loadout.tradeableSlots(r3, OFFENSIVE), 2);
});

test('each defensive rank lifts exactly one restriction', () => {
  const [a, b] = specialsOfClass(DEFENSIVE);

  const r1 = Loadout.makeLoadout({ [DEFENSIVE]: 1 });
  assert.equal(Loadout.autoEquip(r1, a), 0);
  assert.equal(Loadout.autoEquip(r1, b), -1, 'rank 1 is one slot');

  const r2 = Loadout.makeLoadout({ [DEFENSIVE]: 2 });
  Loadout.autoEquip(r2, a);
  Loadout.autoEquip(r2, b);
  assert.deepEqual(Loadout.slotsOf(r2, DEFENSIVE), [a, b], 'rank 2 is two slots');
  assert.equal(Loadout.running(r2).length, 1, 'but only one of them runs');
  Loadout.toggleEnabled(r2, b);
  assert.deepEqual(Loadout.running(r2), [b], 'the hold moves which one');
  // Unlike offensive, zero defensive running is a legal state.
  Loadout.toggleEnabled(r2, b);
  assert.deepEqual(Loadout.running(r2), []);

  const r3 = maxed();
  Loadout.autoEquip(r3, a);
  Loadout.autoEquip(r3, b);
  assert.deepEqual(Loadout.running(r3), [a, b], 'rank 3 runs both');
});

test('a rank the loadout outgrows is reconciled, not left illegal', () => {
  const [a, b] = specialsOfClass(DEFENSIVE);
  const lo = maxed();
  Loadout.autoEquip(lo, a);
  Loadout.autoEquip(lo, b);
  assert.equal(Loadout.running(lo).length, 2);
  Loadout.setRanks(lo, { [DEFENSIVE]: 2 });
  assert.equal(Loadout.running(lo).length, 1, 'the cap is enforced retroactively');
  Loadout.setRanks(lo, { [DEFENSIVE]: 0 });
  assert.deepEqual(Loadout.equippedIds(lo).filter((id) => id === a || id === b), [],
    'positions past the rank hold nothing');
});

test('a class fills its free positions and refuses the next without being asked', () => {
  const lo = maxed();
  const [a, b] = specialsOfClass(OFFENSIVE);
  // Slot 0 starts as the sidearm, so a fully-mastered offensive row has exactly
  // one position going spare until the player deliberately trades it away.
  assert.equal(Loadout.autoEquip(lo, a), 1);
  assert.equal(Loadout.autoEquip(lo, b), -1, 'the next must become a decision');
  assert.deepEqual(Loadout.slotsOf(lo, OFFENSIVE), [SIDEARM_ID, a]);

  const [d, e] = specialsOfClass(DEFENSIVE);
  assert.equal(Loadout.autoEquip(lo, d), 0);
  assert.equal(Loadout.autoEquip(lo, e), 1, 'the defensive row has no sidearm in it');
});

test('equipping into an occupied slot displaces, and never duplicates', () => {
  const lo = maxed();
  const [a, b, c] = specialsOfClass(OFFENSIVE);
  Loadout.equip(lo, a, 0);
  Loadout.equip(lo, b, 1);
  assert.equal(Loadout.equip(lo, c, 0), a, 'the displaced weapon is reported');
  assert.deepEqual(Loadout.slotsOf(lo, OFFENSIVE), [c, b]);

  // Moving a weapon to the other slot of its own class is a swap, not a copy.
  Loadout.equip(lo, c, 1);
  assert.deepEqual(Loadout.slotsOf(lo, OFFENSIVE), [b, c]);
  assert.equal(new Set(Loadout.equippedIds(lo)).size, Loadout.equippedIds(lo).length);
});

test('a weapon only ever lands in a slot of its own class', () => {
  const lo = maxed();
  const def = specialsOfClass(DEFENSIVE)[0];
  Loadout.equip(lo, def, 0);
  assert.equal(Loadout.slotsOf(lo, OFFENSIVE)[0], SIDEARM_ID, 'the offensive row is untouched');
  assert.equal(Loadout.slotsOf(lo, DEFENSIVE)[0], def);
  assert.equal(Loadout.slotsOf(lo, OFFENSIVE).length, SLOTS_PER_CLASS);
});

test('only enabled offensive slots can be fired, and defensive slots never are', () => {
  const lo = maxed();
  const off = specialsOfClass(OFFENSIVE)[0];
  const def = specialsOfClass(DEFENSIVE)[0];
  Loadout.autoEquip(lo, off);     // the free offensive position
  Loadout.autoEquip(lo, def);
  assert.deepEqual(Loadout.firables(lo), [SIDEARM_ID, off]);
  assert.deepEqual(Loadout.running(lo), [def]);

  Loadout.toggleEnabled(lo, off);
  assert.deepEqual(Loadout.firables(lo), [SIDEARM_ID]);
  assert.deepEqual(Loadout.running(lo), [def], 'switching one off leaves the other alone');

  Loadout.toggleEnabled(lo, def);
  assert.deepEqual(Loadout.running(lo), []);
});

test('benching or disabling the live weapon falls back to something firable', () => {
  const lo = maxed();
  const [a, b] = specialsOfClass(OFFENSIVE);
  Loadout.equip(lo, a, 1);
  assert.equal(Loadout.normaliseActive(lo, a), a);
  Loadout.toggleEnabled(lo, a);
  assert.equal(Loadout.normaliseActive(lo, a), SIDEARM_ID);
  Loadout.toggleEnabled(lo, a);
  Loadout.equip(lo, b, 1);
  assert.equal(Loadout.normaliseActive(lo, a), SIDEARM_ID, 'a benched weapon cannot stay live');

  // An offensive row with nothing in it resolves to null, which draws as
  // NULL_WEAPON and fires nothing, rather than throwing mid-frame.
  const bare = Loadout.makeLoadout({ [OFFENSIVE]: 3 });
  Loadout.unequip(bare, SIDEARM_ID);
  assert.equal(Loadout.normaliseActive(bare, SIDEARM_ID), null);
});

/**
 * Being switched off belongs to the SLOT, not to the weapon. A weapon that
 * comes back from the bench hours later must not still be off from a decision
 * the player has long forgotten making.
 */
test('leaving a slot clears the switched-off flag', () => {
  const lo = maxed();
  const [a, b] = specialsOfClass(OFFENSIVE);
  Loadout.equip(lo, a, 1);
  Loadout.toggleEnabled(lo, a);
  assert.equal(Loadout.isEnabled(lo, a), false);

  Loadout.equip(lo, b, 1);                     // b displaces a
  assert.equal(Loadout.isEnabled(lo, a), true, 'displaced weapons come back on');

  Loadout.toggleEnabled(lo, b);
  Loadout.unequip(lo, b);
  assert.equal(Loadout.isEnabled(lo, b), true, 'unequipping clears it too');
});

test('the bench is everything unlocked in a class that is not slotted', () => {
  const lo = maxed();
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
