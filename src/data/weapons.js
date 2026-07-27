/**
 * WEAPONS — the buster plus one special per boss.
 *
 * BALANCE INVARIANT
 * -----------------
 * Every weapon deals the same damage-per-second at level 1. A slow heavy
 * weapon and a fast light one trade blows evenly, so weapon choice is about
 * *utility* — reach, crowd control, status effects — not raw power.
 *
 *     damage = DPS_TARGET * cooldownFrames / 60 / projectiles
 *
 * This is asserted by tests/dps.test.js. If you give a weapon extra
 * projectiles, pierce, or multi-hit, rebalance its cooldown so the invariant
 * still holds — do not just raise its damage.
 *
 * PALETTE
 * -------
 * Each special weapon carries its source boss's colours. Equipping a weapon
 * recolours the player sprite live (see entities/Player.js). The buster's
 * palette is the classic blue.
 *
 * LEVELS
 * ------
 * Weapons level 1 -> 10 within a run. Real feature jumps happen at Lv 1/3/6/10
 * per the design tracker; intermediate levels are damage-only steps. Right now
 * ALL levels are the flat placeholder step (weaponDamagePerLevel) — the real
 * ladders land in Phases 12-14.
 *
 * SHAPES
 * ------
 * `shape` selects a placeholder projectile drawing so all 18 read differently
 * on screen (see systems/assets.js). Real art replaces these in Phases 9-11.
 */

import { FEEL } from '../config/feel.js';
import { BOSS_BY_ID } from './bosses.js';

/** The balance formula. Single source of truth. */
export function weaponDamage(cooldownFrames, projectiles = 1) {
  return +(FEEL.dpsTarget * (cooldownFrames / 60) / projectiles).toFixed(3);
}

/**
 * The buster is just another weapon — same palette structure, same slot on the
 * re-quip wheel, same DPS invariant. Nothing about it is special-cased. Dark
 * blue body, light blue accent.
 */
const BUSTER_PALETTE = {
  primary: '#1565C0',
  secondary: '#5CC8F0',
  outline: '#0A0A12',
};

/**
 * NULL WEAPON — the "no weapon equipped" starting point.
 *
 * Its palette has no primary and no secondary, so the player renders as an
 * OUTLINE ONLY with every interior cell transparent. That is deliberate: the
 * silhouette is the part that belongs to the player, and the fill is the part
 * that belongs to whatever weapon is equipped. It also means any code path that
 * fails to resolve a weapon degrades to a visible, obviously-wrong silhouette
 * rather than throwing.
 */
export const NULL_WEAPON = {
  id: null,
  name: 'NO WEAPON',
  cooldown: 8,
  projectiles: 0,   // fires nothing
  shape: 'bolt',
  speed: 0,
  radius: 0,
  damage: 0,
  desc: 'No weapon equipped.',
  palette: { primary: null, secondary: null, outline: '#0A0A12' },
  color: '#0A0A12',
};

/**
 * cooldown/projectiles/shape define each weapon's rhythm; damage is derived.
 * `boss` links a special to the boss that drops it (Phase 4 gates unlocks on
 * defeating that boss).
 */
const DEFS = [
  { id: 'buster', name: 'MEGA BUSTER', boss: null,
    cooldown: 8, projectiles: 1, shape: 'bolt', speed: 3.2,
    desc: 'Standard arm cannon.' },

  { id: 'core_blaster', name: 'CORE BLASTER', boss: 'core',
    cooldown: 15, projectiles: 1, shape: 'bolt', speed: 3.4,
    desc: 'Neutral bullet with scalable fire rate.' },
  { id: 'blaze_wheel', name: 'BLAZE WHEEL', boss: 'blaze',
    cooldown: 30, projectiles: 1, shape: 'wheel', speed: 2.4,
    desc: 'Bouncing fireball that leaves Hot ground.' },
  { id: 'torrent_cannon', name: 'TORRENT CANNON', boss: 'torrent',
    cooldown: 4, projectiles: 1, shape: 'stream', speed: 3.0,
    desc: 'Continuous stream that pushes enemies back.' },
  { id: 'volt_spark', name: 'VOLT SPARK', boss: 'volt',
    cooldown: 12, projectiles: 1, shape: 'spark', speed: 3.6,
    desc: 'Electric burst that chains and stuns.' },
  { id: 'thorn_lash', name: 'THORN LASH', boss: 'thorn',
    cooldown: 36, projectiles: 1, shape: 'lash', speed: 2.8,
    desc: 'Whip-vine that reels enemies in and throws them.' },
  { id: 'frost_guard', name: 'FROST GUARD', boss: 'frost',
    cooldown: 40, projectiles: 1, shape: 'shard', speed: 2.6,
    desc: 'Ice shield that releases icicles on release.' },
  { id: 'strike_gauntlet', name: 'STRIKE GAUNTLET', boss: 'strike',
    cooldown: 20, projectiles: 1, shape: 'punch', speed: 1.6,
    desc: 'Close-range punch with heavy knockback.' },
  { id: 'venom_spray', name: 'VENOM SPRAY', boss: 'venom',
    cooldown: 6, projectiles: 1, shape: 'spray', speed: 2.2,
    desc: 'Poison cone leaving lingering Toxic clouds.' },
  { id: 'quake_hammer', name: 'QUAKE HAMMER', boss: 'quake',
    cooldown: 40, projectiles: 1, shape: 'wave', speed: 2.0,
    desc: 'Ground pound sending shockwaves along the floor.' },
  { id: 'gale_vortex', name: 'GALE VORTEX', boss: 'gale',
    cooldown: 45, projectiles: 1, shape: 'tornado', speed: 1.8,
    desc: 'Controllable mini-tornado that lifts enemies.' },
  { id: 'psi_orb', name: 'PSI ORB', boss: 'psi',
    cooldown: 30, projectiles: 1, shape: 'orb', speed: 1.6,
    desc: 'Slow steerable homing psychic orb.' },
  { id: 'swarm_caller', name: 'SWARM CALLER', boss: 'swarm',
    cooldown: 24, projectiles: 3, shape: 'swarm', speed: 2.6,
    desc: 'Releases a pursuing insect swarm.' },
  { id: 'rock_buster', name: 'ROCK BUSTER', boss: 'granite',
    cooldown: 20, projectiles: 1, shape: 'rock', speed: 2.8,
    desc: 'Heavy stone shot that shatters on impact.' },
  { id: 'wraith_cloak', name: 'WRAITH CLOAK', boss: 'wraith',
    cooldown: 30, projectiles: 1, shape: 'wisp', speed: 3.0,
    desc: 'Phasing spectral bolt that passes through terrain.' },
  { id: 'drake_breath', name: 'DRAKE BREATH', boss: 'drake',
    cooldown: 6, projectiles: 1, shape: 'breath', speed: 2.4,
    desc: 'Sustained draconic flame breath.' },
  { id: 'eclipse_blade', name: 'ECLIPSE BLADE', boss: 'eclipse',
    cooldown: 24, projectiles: 1, shape: 'boomerang', speed: 3.0,
    desc: 'Dark boomerang that returns and steals health.' },
  { id: 'alloy_blade', name: 'ALLOY BLADE', boss: 'alloy',
    cooldown: 20, projectiles: 1, shape: 'blade', speed: 3.4,
    desc: 'Ricocheting metal blade that pierces armour.' },
];

export const WEAPONS = DEFS.map((d) => {
  const src = d.boss ? BOSS_BY_ID[d.boss] : null;
  return {
    ...d,
    damage: weaponDamage(d.cooldown, d.projectiles),
    radius: d.shape === 'stream' || d.shape === 'spray' ? 2 : 3,
    palette: src
      ? { primary: src.primary, secondary: src.secondary, outline: src.outline }
      : BUSTER_PALETTE,
    color: src ? src.primary : BUSTER_PALETTE.primary,
  };
});

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export const BUSTER_ID = 'buster';

/**
 * Resolve a weapon id, falling back to the outline-only NULL_WEAPON. Always use
 * this rather than indexing WEAPON_BY_ID directly, so an unknown or missing id
 * shows as a silhouette instead of crashing the frame.
 */
export const weaponOf = (id) => WEAPON_BY_ID[id] || NULL_WEAPON;

/**
 * RE-QUIP WHEEL slot order — fixed, and deliberately NOT filtered by unlock
 * state.
 *
 * A weapon sits at the same clock position for the life of the save, so
 * switching becomes muscle memory rather than a reading exercise — which is the
 * whole point of a radial menu, and the only way the slow-motion swipe is
 * usable under fire. Locked weapons keep their slot (drawn as a padlock) so the
 * wheel never reshuffles under your thumb as bosses fall.
 *
 * Slot 0 sits at 12 o'clock and is always the buster.
 */
export const WHEEL_ORDER = WEAPONS.map((w) => w.id);

/** Damage at a given weapon level. Placeholder curve until Phases 12-14. */
export function damageAtLevel(weapon, level) {
  return weapon.damage * (1 + (level - 1) * FEEL.weaponDamagePerLevel);
}

/** Effective DPS at a level — used by the debug overlay and the balance test. */
export function dpsAtLevel(weapon, level = 1) {
  return (damageAtLevel(weapon, level) * weapon.projectiles) / (weapon.cooldown / 60);
}
