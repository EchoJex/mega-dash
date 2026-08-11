/**
 * META UPGRADES — bought with Chips in the Hub, persist forever.
 *
 * TERMINOLOGY (do not blur these):
 *   Chips    persistent currency, earned per run, spent here
 *   Upgrades persistent, bought with Chips        <- this file
 *   EXP      run-only, earns player Levels
 *   Levels   run-only, spent on weapon level-ups
 *
 * Each upgrade writes a derived field onto the run state at run start.
 */

import { FEEL } from '../config/feel.js';

export const UPGRADES = [
  { id: 'energy_tank',  name: 'ENERGY TANK',  color: '#E11416', maxLv: 4, cost: 120, mult: 1.7,
    desc: (l) => `+${l} max energy pip${l === 1 ? '' : 's'} every run`,
    apply: (r, l) => { r.hpBonus = l; } },
  { id: 'quick_charge', name: 'QUICK CHARGE', color: '#4A90D9', maxLv: 5, cost: 150, mult: 1.6,
    desc: (l) => `Weapon cooldowns -${l * 8}%`,
    apply: (r, l) => { r.cdMult = 1 - l * 0.08; } },
  { id: 'combo_chip',   name: 'COMBO CHIP',   color: '#F5D328', maxLv: 4, cost: 140, mult: 1.55,
    desc: (l) => `Combo lasts +${l * 25}% longer`,
    apply: (r, l) => { r.comboDecayMult = 1 + l * 0.25; } },
  { id: 'magnet',       name: 'ITEM MAGNET',  color: '#A0EFE7', maxLv: 3, cost: 100, mult: 1.6,
    desc: (l) => `Pickup range +${l * 35}%`,
    apply: (r, l) => { r.magnetMult = 1 + l * 0.35; } },
  { id: 'starter_arsenal', name: 'STARTER ARSENAL', color: '#2AAB1C', maxLv: 1, cost: 600, mult: 1,
    desc: () => 'Begin each run with a random boss weapon already unlocked',
    apply: (r, l) => { r.starterArsenal = l > 0; } },
  { id: 'rush_rescue',  name: 'RUSH RESCUE',  color: '#A68CD8', maxLv: 3, cost: 900, mult: 2.0,
    desc: (l) => `Survive ${l} fatal hit${l === 1 ? '' : 's'} per run at 3 energy`,
    apply: (r, l) => { r.revives = l; } },
  { id: 'might_core',   name: 'MIGHT CORE',   color: '#EA6A34', maxLv: 6, cost: 160, mult: 1.45,
    desc: (l) => `All weapon damage +${l * 10}%`,
    apply: (r, l) => { r.dmgMult = 1 + l * 0.10; } },
  { id: 'overclock',    name: 'OVERCLOCK',    color: '#EA43BD', maxLv: 4, cost: 170, mult: 1.5,
    desc: (l) => `Projectile speed +${l * 12}%`,
    apply: (r, l) => { r.projSpeedMult = 1 + l * 0.12; } },
  { id: 'payload',      name: 'PAYLOAD FRAME', color: '#A76625', maxLv: 3, cost: 180, mult: 1.5,
    desc: (l) => `Projectile size +${l * 15}%`,
    apply: (r, l) => { r.bulletSizeMult = 1 + l * 0.15; } },
  { id: 'duplicator',   name: 'DUPLICATOR',   color: '#A926D9', maxLv: 2, cost: 800, mult: 2.2,
    desc: (l) => `Fire ${l} extra echo volley${l === 1 ? '' : 's'} per shot`,
    apply: (r, l) => { r.extraShots = l; } },
  { id: 'armor_plate',  name: 'ARMOR PLATE',  color: '#687380', maxLv: 4, cost: 130, mult: 1.5,
    desc: (l) => `+${l * 15} bonus invulnerability frames per hit`,
    apply: (r, l) => { r.armorBonus = l * 15; } },
  { id: 'greed',        name: 'GREED CIRCUIT', color: '#F5D328', maxLv: 5, cost: 130, mult: 1.5,
    desc: (l) => `Score gain +${l * 12}%`,
    apply: (r, l) => { r.scoreMult = 1 + l * 0.12; } },
  { id: 'growth',       name: 'GROWTH MODULE', color: '#B8DC28', maxLv: 5, cost: 150, mult: 1.5,
    desc: (l) => `Chips earned per run +${l * 15}%`,
    apply: (r, l) => { r.chipGainMult = 1 + l * 0.15; } },
  { id: 'luck',         name: 'LUCK CHIP',    color: '#5CADD5', maxLv: 4, cost: 140, mult: 1.5,
    desc: (l) => `Pickup drop rate +${l * 20}%`,
    apply: (r, l) => { r.luckMult = 1 + l * 0.20; } },
  { id: 'twin_arsenal', name: 'TWIN ARSENAL', color: '#2AAB1C', maxLv: 1, cost: 1400, mult: 1,
    desc: () => 'Begin each run with TWO random boss weapons unlocked',
    apply: (r, l) => { r.twinArsenal = l > 0; } },
  /**
   * SLIDE MASTERY — the slide is not a starting ability, it is meta progression.
   *
   * Rank 0 means you genuinely cannot slide. That makes the first rank one of
   * the most valuable purchases in the Hub and gives a new save an obvious first
   * goal, rather than handing over the full moveset before the player has earned
   * any of it. Each rank adds a feature rather than another percentage:
   *
   *   1  unlock — the slide exists, at the feel.js baseline
   *   2  reach  — +50% duration and +15% speed, so it crosses real distance
   *   3  dodge  — i-frames on the opening of the slide, making it defensive
   *
   * Rank 1 is priced low on purpose; the later ranks are where the cost is.
   */
  { id: 'slide_mastery', name: 'SLIDE MASTERY', color: '#A0EFE7', maxLv: 3, cost: 80, mult: 2.2,
    desc: (l) => ['No slide — rank 1 unlocks it', 'Slide unlocked',
      'Slide +50% duration and +15% speed', 'Slide grants 24 invulnerable frames'][l],
    apply: (r, l) => {
      r.slideRank = l;
      r.slideDurMult = l >= 2 ? 1.5 : 1;
      r.slideSpeedBonus = l >= 2 ? 1.15 : 1;
      r.slideIframes = l >= 3 ? 24 : 0;
    } },
  /**
   * CLIFF EDGE MASTERY — how far below a ledge you can still claw back up.
   *
   * At rank 0 the ledge is nearly absolute: walk off it and you have walked off
   * it. That is the honest default the owner asked for, "similar to the
   * almost-but-not-quite tolerance for incoming bullet hurt box detection" —
   * the edge is where it looks like it is.
   *
   * The recovery the game USED to give for free is now the reward. Each rank
   * buys depth, and ranks 1-3 make the save visible: you stick to the wall for
   * a quarter second before hauling yourself up, so a rescue reads as a rescue
   * rather than as the floor twitching. Rank 3 restores the old full player
   * height, plus that pause.
   */
  { id: 'cliff_mastery', name: 'CLIFF EDGE MASTERY', color: '#5CADD5', maxLv: 3, cost: 110, mult: 2.0,
    desc: (l) => ['Walk off a ledge and you fall — no recovery',
      'Catch a ledge from a third of a body below',
      'Catch a ledge from two thirds of a body below',
      'Catch a ledge from a full body below'][l],
    apply: (r, l) => {
      r.cliffRank = l;
      r.cliffGrab = FEEL.cliffGrabDepth[l];
    } },
  /**
   * OFFENSIVE MASTERY — how much of the offensive row you are allowed to use.
   *
   * A new save carries the sidearm and nothing else, in a single welded
   * position. That is the honest floor: every special weapon in the game is
   * still earned from a boss, still levels, still shows up on cards, and simply
   * has nowhere to go until this is bought. The ladder gives back one
   * restriction at a time — a slot, then the right to run both at once, then
   * the sidearm's own position.
   *
   * Rank 2 is the one that looks smallest and is not: your thumb can only aim
   * one offensive weapon at a time either way, but at rank 1 switching to the
   * special SILENCES the sidearm, and at rank 2 it does not.
   *
   * RANK 1 IS DELIBERATELY VERY CHEAP on both mastery ladders — cheaper than
   * anything else in the Hub. Without it a player earns weapons they physically
   * cannot use, and an upgrade that gates the whole rest of the arsenal must not
   * also be a grind. The steep multiplier puts the cost back in ranks 2 and 3,
   * where you are buying convenience rather than access.
   */
  { id: 'offensive_mastery', name: 'OFFENSIVE MASTERY', color: '#E11416', maxLv: 3, cost: 25, mult: 3.4,
    desc: (l) => ['Side arm only — rank 1 opens an offensive slot',
      'One offensive slot; it or the side arm, not both',
      'Offensive slot and side arm both live at once',
      'Two free offensive slots — trade the side arm away'][l],
    apply: (r, l) => { r.offRank = l; } },
  /**
   * DEFENSIVE MASTERY — the same ladder without a sidearm to work around.
   *
   * Rank 0 means no defensive row at all, so a defensive weapon dropped by a
   * boss unlocks and benches. That is deliberate: defensive weapons cost no
   * thumb, so being handed two of them for free would make the class strictly
   * additive, which is the thing the slot cap exists to prevent.
   */
  { id: 'defensive_mastery', name: 'DEFENSIVE MASTERY', color: '#A0EFE7', maxLv: 3, cost: 25, mult: 3.4,
    desc: (l) => ['No defensive slots — rank 1 opens one',
      'One defensive slot',
      'Two defensive slots; only one may run',
      'Both defensive slots run at once'][l],
    apply: (r, l) => { r.defRank = l; } },
];

export const upgradeLevel = (save, id) => save.upgrades[id] || 0;
export const upgradeCost = (u, lv) => Math.round(u.cost * Math.pow(u.mult, lv));

export function applyUpgrades(save, run) {
  for (const u of UPGRADES) u.apply(run, upgradeLevel(save, u.id));
}

/**
 * Score -> Chips at the end of a run, itemised so the results screen can show
 * the player where each Chip came from.
 *
 * Score converting at all is what lets meta progression start before the first
 * boss ever falls: a run that ends badly still buys something, so the Hub is
 * never gated behind a win.
 */
export const CHIPS_PER_SCORE = 50;   // score needed for one Chip
export const CHIPS_PER_BOSS = 40;

export function chipsBreakdown(score, bossCount, mult = 1) {
  const fromScore = Math.floor(score / CHIPS_PER_SCORE);
  const fromBosses = bossCount * CHIPS_PER_BOSS;
  return {
    fromScore, fromBosses, mult,
    total: Math.round((fromScore + fromBosses) * mult),
  };
}

export const chipsForRun = (score, bossCount, mult = 1) =>
  chipsBreakdown(score, bossCount, mult).total;
