/**
 * ENCOUNTER — put the real game into a specific fight, over and over.
 *
 * Everything here drives the SHIPPED code paths: `startRun` builds the run,
 * `warpToArena` builds the room, `spawnBoss` scales his HP by layer. Nothing is
 * reconstructed. That is the whole reason to run the fight rather than compute
 * it — a difficulty number derived from a second copy of the rules would only
 * ever tell you about the copy.
 *
 * WHAT IS FORCED, AND WHY EACH ONE IS SAFE
 * ----------------------------------------
 * `DEV.enabled` goes ON with every perk explicitly OFF, purely so `layerFor()`
 * will honour `nextLayer`. That is the one dev hook the sim needs and the only
 * one it gets: `dev('hpFloor')`, `dev('startUnlocked')` and the rest all still
 * answer false, so the player really can die and really only carries what the
 * encounter gave him. `assertClean` checks this rather than trusting it — an
 * `hpFloor` left on silently turns every win rate into 100%.
 *
 * The LAYER is forced through `nextLayer` rather than by writing lifetime
 * clears into the save, for the same reason the dev menu does it that way: a
 * faked clear is permanent and there is no way back down from layer 3.
 */

import { DEV } from '../config/dev.js';
import { FEEL } from '../config/feel.js';
import { BOSS_BY_ID } from '../data/bosses.js';
import { fightFor } from '../data/bossFights.js';
import { weaponOf, classOf, SIDEARM_ID, hasLadder, OFFENSIVE } from '../data/weapons.js';
import { RUNTIME } from '../systems/weaponry.js';
import * as Loadout from '../systems/loadout.js';

/** Every perk, so they can be switched off by name rather than by hoping. */
const PERKS = [
  'hpFloor', 'unlockAnyWeapon', 'cardsFromAllWeapons', 'startUnlocked',
  'maxMastery', 'bossSelect', 'cycleLayers', 'requipAtStart', 'debugHud',
];

/** A weapon that fires itself. See the class split in CLAUDE.md. */
export const isPassive = (id) => !!RUNTIME[id] && !RUNTIME[id].fire;

/**
 * WHAT THE SIM REFUSES TO RUN, and exactly why.
 *
 * The tracker leaves most of the game `[wip]`, and a boss with no behaviour
 * stands still while the player shoots him. That is not an easy fight, it is
 * NO fight, and averaging it into a difficulty table would put a confident
 * number next to content that does not exist yet. So an incomplete pairing is
 * skipped and SAID, never silently scored.
 */
export function completeness(weaponId, bossId, layer) {
  const skip = [];
  const warn = [];
  const boss = BOSS_BY_ID[bossId];
  if (!boss) return { ok: false, skip: [`no such boss: ${bossId}`], warn };
  if (!weaponOf(weaponId) || weaponOf(weaponId).id !== weaponId) {
    return { ok: false, skip: [`no such weapon: ${weaponId}`], warn };
  }

  const f = fightFor(bossId, layer);
  if (!f.attack && !f.hazard) skip.push(`${bossId} has no fight built at any layer`);
  else if (!f.attack) skip.push(`${bossId} has no attack loop — the fight is hazards only`);
  else if (!f.hazard) warn.push('no hazard loop');

  /**
   * A LAYER THAT FALLS BACK IS NOT REALLY THAT LAYER.
   *
   * `fightFor` returns the hardest layer actually written at or below the one
   * asked for, and it returns the SAME OBJECT — so identity against the layer
   * below is an exact test for "this content is not new here". The fight still
   * runs (Strike Man's attack loop is genuinely layer 3) but the number has to
   * say his hazard is the layer-1 bag.
   */
  if (layer > 1) {
    const under = fightFor(bossId, layer - 1);
    for (const kind of ['attack', 'hazard']) {
      if (f[kind] && f[kind] === under[kind]) warn.push(`${kind} same as L${layer - 1}`);
    }
  }

  if (weaponId !== SIDEARM_ID && !hasLadder(weaponId)) {
    skip.push(`${weaponId} has no ladder — its levels are damage only`);
  }
  return { ok: skip.length === 0, skip, warn };
}

/**
 * Force the dev switches the sim needs and prove the rest are off.
 * Returns a restore function, so a harness run leaves the page as it found it.
 */
export function takeOverDev(layer) {
  const before = {};
  for (const k of [...PERKS, 'enabled', 'nextLayer', 'startLevel', 'offRank', 'defRank']) {
    before[k] = DEV[k];
  }
  DEV.enabled = true;                 // ONLY so layerFor() reads nextLayer
  for (const k of PERKS) DEV[k] = false;
  DEV.nextLayer = layer;
  DEV.startLevel = 1;
  DEV.offRank = null;
  DEV.defRank = null;
  return () => Object.assign(DEV, before);
}

/** Throw rather than report a number that a stray perk quietly invented. */
export function assertClean() {
  const on = PERKS.filter((k) => DEV[k] === true);
  if (on.length) throw new Error(`dev perks left on: ${on.join(', ')}`);
}

/**
 * Build one encounter and leave the scene sitting in the arena, ready to step.
 *
 * THE LOADOUT IS THE MEASUREMENT, so it is built deliberately rather than
 * inherited:
 *
 *   offensive weapon under test   carried ALONE. TTK then belongs to that
 *                                 weapon instead of to it plus the sidearm.
 *   defensive weapon under test   carried WITH the sidearm, because a
 *                                 defensive weapon runs by itself and cannot
 *                                 kill anything — without a gun the fight
 *                                 never ends and TTK is meaningless.
 *
 * `withSidearm` overrides the first case for a like-for-like comparison.
 */
export function setUp(gs, { weaponId, level, bossId, layer, withSidearm = false }) {
  const def = BOSS_BY_ID[bossId];
  // The harness parks the scene paused between encounters so Phaser's own loop
  // cannot advance a fight nobody is measuring. `update()` returns early while
  // it is set, and the warp below is driven through `update()`.
  gs.paused = false;
  gs.startRun();
  assertClean();

  const r = gs.run;
  const cls = classOf(weaponId);
  const carry = new Set([weaponId]);
  if (withSidearm || cls !== OFFENSIVE) carry.add(SIDEARM_ID);

  r.unlocked = new Set(carry);
  r.wpLevels = {};
  for (const id of carry) r.wpLevels[id] = id === weaponId ? level : 1;

  // Rank 3 both sides: the sim is measuring the weapon, not the mastery ladder,
  // and a lower rank would silently refuse to slot half the catalogue.
  r.offRank = r.defRank = Loadout.MAX_RANK;
  r.loadout = Loadout.makeLoadout({ offensive: Loadout.MAX_RANK, defensive: Loadout.MAX_RANK });
  // makeLoadout seeds the sidearm into offensive slot 0; clear it so an
  // offensive weapon under test is genuinely alone.
  Loadout.unequip(r.loadout, SIDEARM_ID);
  for (const id of carry) Loadout.autoEquip(r.loadout, id);
  r.activeWeapon = Loadout.normaliseActive(r.loadout, weaponId);
  // The trigger goes on the weapon under test whenever it can hold one.
  if (Loadout.firables(r.loadout).includes(weaponId)) r.activeWeapon = weaponId;
  r.wstate = {};

  // Into the room, through the real warp. It advances on REAL time rather than
  // sim time, so it is driven with update() and not step().
  gs.warpToArena(def);
  for (let i = 0; i < 600 && gs.warp; i++) gs.update(0, 1000 / 60);
  if (!gs.arena || !gs.boss) throw new Error(`arena never built for ${bossId}`);

  return {
    maxHp: FEEL.hpMax + r.hpBonus + (r.runHpBonus || 0),
    bossMaxHp: gs.boss.maxHp,
    passive: isPassive(weaponId),
  };
}
