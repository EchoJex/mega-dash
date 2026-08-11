/**
 * WEAPONS — the sidearm plus one special per boss.
 *
 * CLASSES AND THE LOADOUT
 * -----------------------
 * A run carries ONE sidearm (the old Mega Buster) plus TWO offensive and TWO
 * defensive specials. `cls` below is what decides which pair a weapon competes
 * for, and it is taken from the first word of that weapon's tracker field —
 * "Offensive; ..." / "Defensive; ...". It is not flavour text.
 *
 *   sidearm    always equipped, always available, never occupies a slot
 *   offensive  shares the fire button with the sidearm; the wheel picks which
 *              one is live
 *   defensive  runs by itself — a drone that auto-fires, a shield that
 *              maintains itself, a jetpack that vents on landing. Never aimed.
 *
 * That split is why "defensive" is a real mechanical category and not a label:
 * a defensive weapon costs you nothing to hold and asks nothing of your thumb,
 * so the two defensive slots are a genuine build decision rather than a second
 * set of guns. systems/loadout.js owns the slots; this file only classifies.
 *
 * Weapons whose tracker field is still `[wip]` are classified provisionally
 * from what their prose describes, so the wheel has somewhere to put them. That
 * classification is not a design decision — it gets confirmed in that weapon's
 * own element slice.
 *
 * BALANCE INVARIANT
 * -----------------
 * Every weapon deals the same damage-per-second at level 1. A slow heavy
 * weapon and a fast light one trade blows evenly, so weapon choice is about
 * *utility* — reach, crowd control, status effects — not raw power.
 *
 *     damage = DPS_TARGET * cooldownFrames / 60 / projectiles
 *
 * The test asserting this is SKIPPED until the late tuning phase: every number
 * here is a placeholder, and pinning one in place only breaks the build when it
 * is nudged. The formula still governs — if you give a weapon extra projectiles
 * or pierce, rebalance its cooldown rather than raising damage.
 *
 * PALETTE
 * -------
 * Each special weapon carries its source boss's colours, and they are used for
 * its projectiles, its effects and its place on the re-quip wheel.
 *
 * THE PLAYER IS NOT ONE OF THOSE PLACES. Equipping a weapon used to recolour
 * the suit live; that is scrubbed and the player is a fixed blue forever (see
 * PLAYER_PALETTE in config/display.js). Do not reintroduce it — a protagonist
 * whose colour changes is one you have to re-find after every re-quip, and a
 * live tint is something placeholders do for free that real 3-colour art
 * cannot.
 *
 * LEVELS
 * ------
 * Weapons level 1 -> 10 within a run. Real feature jumps happen at Lv 1/3/6/10
 * per the design tracker; intermediate levels are damage-only steps. A weapon
 * uses the flat placeholder step (weaponDamagePerLevel) until it gains a
 * WEAPON_LADDERS entry, which happens as part of its ELEMENT'S SLICE — one
 * element built end to end at a time. Never fill these in a batch.
 *
 * SHAPES
 * ------
 * `shape` selects a placeholder projectile drawing so all 18 read differently
 * on screen (see systems/assets.js). Real art replaces these per actor via
 * MANIFEST, whenever the owner draws it.
 */

import { FEEL } from '../config/feel.js';
import { BOSS_BY_ID } from './bosses.js';

/**
 * The weapon classes. `cls` on every DEF below is one of these.
 *
 * SIDEARM is no longer a class a real weapon belongs to. The sidearm is an
 * OFFENSIVE weapon that happens to start in a slot, so it competes for that
 * slot like anything else; `SIDEARM` survives only as the class of NULL_WEAPON
 * and as classOf's fallback for an id that resolves to nothing.
 */
export const SIDEARM = 'sidearm';
export const OFFENSIVE = 'offensive';
export const DEFENSIVE = 'defensive';

/** Slots per special class. Two offensive — one of which starts as the sidearm
 * — and two defensive. */
export const SLOTS_PER_CLASS = 2;

/**
 * PER-WEAPON LEVEL LADDERS — the real Lv 1/3/6/10 behaviour.
 *
 * Keyed by weapon id, then by the level the rung takes effect on. `ladderAt`
 * MERGES every rung up to the current level in ascending order, so a rung only
 * has to state what it CHANGES and intermediate levels inherit the last rung's
 * features while still gaining damage from the flat step. That is exactly the
 * tracker's model: real feature jumps at 1/3/6/10, damage-only in between.
 *
 * A PARTIAL LADDER IS LEGAL AND EXPECTED. Several weapons have Lv1 and Lv3
 * written but Lv6/Lv10 still `[wip]` in the tracker, and inventing the missing
 * rungs would be designing blind. Omitting them means level 7 plays as the Lv3
 * rung with more damage, which is the correct degradation — the weapon is
 * unfinished, not broken. Fill the rung in when the owner writes it.
 *
 * Fill one weapon at a time as part of its element slice, and never ahead of
 * the owner marking that boss's ladder `[draft]`.
 */
/**
 * The Nullfire Drone's emergency reload, straight off the tracker's formula:
 *
 *     clip_cooldown = 1.5 * (clip_size / fire_rate)
 *
 * DERIVED, NEVER TYPED IN. Firing a clip takes clip/rate seconds and reloading
 * takes 1.5x that, so the drone is live exactly 40% of the time at every level.
 * Levelling it buys burst shape and targeting, not uptime. Hand-tuning either
 * side of this would quietly turn a clip-size change into a balance change.
 *
 * `rate` is BULLETS per second, not trigger pulls — the reading under which all
 * three clip/rate pairs the tracker states land on the same duty cycle.
 */
const droneReload = (clip, rate) => Math.round(1.5 * (clip / rate) * 60);

export const WEAPON_LADDERS = {
  // ── NULLFIRE DRONE — defensive, Typeless ──────────────────────────
  // Lv1  single shot, 1/s, 10-round clip. The weapon aims; the bullet does not.
  // Lv3  3-round burst once a second, 9-round clip — "like a rifle".
  // Lv6  2-round burst; each round splits into 3 mildly homing fragments, the
  //      two sets chasing the nearest and next-nearest enemy.
  // Lv10 fires straight up at 5/s from a 30-round clip; every bullet picks a
  //      different target and arcs in under strong homing. No split.
  core_blaster: {
    1: {
      clip: 10, burst: 1, burstGap: 1, pullFrames: 59,
      reloadFrames: droneReload(10, 1),
      trickleFrames: 90,          // the very slow out-of-combat top-up
      speed: 3.2,
    },
    3: {
      clip: 9, burst: 3, burstGap: 5, pullFrames: 45,
      reloadFrames: droneReload(9, 3),
    },
    6: {
      burst: 2, burstGap: 6, pullFrames: 48,
      reloadFrames: droneReload(9, 2),
      splitIn: 20, splitSeekTurn: 0.06, splitAccel: 1.03,
    },
    10: {
      clip: 30, burst: 1, burstGap: 1, pullFrames: 11,
      reloadFrames: droneReload(30, 5),
      splitIn: 0,                 // "does not split" — clears the Lv6 rung
      skyward: true, speed: 2.2, seekTurn: 0.14, accel: 1.05, maxSpeed: 6,
    },
  },

  // ── BLAZE WHEEL — offensive, Fire ─────────────────────────────────
  // A lob that converts to a roller on landing, laying Hot behind it.
  // Lv1  no roll at all, one on screen, 1s of Hot.
  // Lv3  2s of Hot and a moderate roll that decelerates rapidly.
  // Lv6  a second fireball on a taller, much wider arc; two on screen.
  // Lv10 half a screen of roll each (a full screen combined), piercing, and
  //      the roll ACCELERATES instead of dying out.
  blaze_wheel: {
    1: {
      cooldown: 30, maxLive: 1,
      lobVx: 2.4, lobVy: -2.4, gravity: 0.16,
      roll: 0, rollSpeed: 0, rollDrag: 1,
      hotFrames: 60, burnFrames: 60, pierce: 0,
    },
    3: { hotFrames: 120, roll: 40, rollSpeed: 2.2, rollDrag: 0.94 },
    6: { maxLive: 2, secondArc: 1.45 },
    // 200px each on a 320-480px screen — "full screen combined, half for each".
    10: { roll: 200, rollDrag: 1.05, pierce: 99, burnFrames: 120 },
  },

  // ── TORRENT CANNON — defensive, Water ─────────────────────────────
  // Everything is a reaction to movement, so it never competes for the fire
  // button. The tank is the limiter: it refills fast, but only while idle.
  // Lv1  a knockback vent on landing.
  // Lv3  the same vent on jumping and double jumping too.
  // Lv6  a brief hover at the apex, venting two downward jets.
  // Lv10 landing also throws a tidal wave both ways, sized by impact speed.
  torrent_cannon: {
    1: {
      tank: 100, refill: 2.2, burstCost: 34,
      burstW: 40, knock: 4.2, burstDmgMult: 0.6,
      onJump: false, hover: false, tidal: false,
    },
    3: { tank: 120, refill: 2.4, onJump: true },
    6: {
      tank: 150, refill: 2.8, hover: true,
      hoverFrames: 34, hoverCost: 30, jetDamage: 0.12, jetKnock: 1.1,
    },
    10: {
      tank: 180, refill: 3.2, tidal: true,
      tidalSpeed: 3.2, tidalDmgMult: 0.8, tidalLife: 120,
    },
  },

  // ── VOLT SPARK — offensive, Electric ──────────────────────────────
  // `fanout` is the chain SHAPE, one entry per depth. A flat list at Lv3/Lv6,
  // a 3-2-1 tree at Lv10 — both fall out of the same walk, which is why the
  // tracker can describe a topology instead of a hit count.
  volt_spark: {
    1: {
      cooldown: 12, range: 34, chainRange: 44, chainFalloff: 0.7,
      fanout: [], stunFrames: 60, chainStunFrames: 0,
    },
    3: { fanout: [2] },
    6: { fanout: [3], stunFrames: 120, chainStunFrames: 60 },
    10: { fanout: [3, 2, 1] },
  },

  // ── FROST GUARD — defensive, Ice ──────────────────────────────────
  // PARTIAL LADDER: Lv6 and Lv10 are still `[wip]` in the tracker, so levels
  // above 3 are damage-only. Do not invent the missing rungs.
  frost_guard: {
    1: {
      hits: 1, w: 8, h: 22, growFrames: 60,
      breakFrames: 240,     // destroyed outright — the long cooldown
      chipFrames: 90,       // merely damaged — the short one, per lost hit
      freezeFrames: 120,
    },
    3: { hits: 3, w: 10, h: 26 },
  },

  // ── STRIKE GAUNTLET — offensive, Fighting ─────────────────────────
  // Tap for a jab in the chain, hold 0.4s for the finisher. What the ladder
  // buys is the finisher's lunge: how far it goes and how many bodies it
  // passes through before stopping.
  strike_gauntlet: {
    1: {
      jabChain: 2, jabFrames: 14, jabReach: 18, jabLunge: 2,
      jabDmgMult: 0.55, jabKnock: 1.6, chainWindow: 40,
      armor: 0.3,
      finFrames: 26, finDmgMult: 1.9, finKnock: 3.4, finLaunch: 0,
      lungeDist: 0, lungeSpeed: 3, lungeStopAfter: 1,
    },
    3: { jabChain: 3, lungeDist: 28, lungeStopAfter: 2 },
    6: { lungeDist: 52, lungeStopAfter: 3, finLaunch: 3.2, armor: 0.5 },
    10: { lungeDist: 160, lungeStopAfter: 999 },
  },

  // ── QUAKE HAMMER — offensive, Ground ──────────────────────────────
  // PARTIAL LADDER: Lv6 and Lv10 are still `[wip]` in the tracker.
  quake_hammer: {
    1: {
      swingFrames: 30, reach: 22, swingDmgMult: 1.8, swingKnock: 3.6,
      poundFrames: 26,
      waveSpeed: 2.4, waveSize: 5, waveDmgMult: 0.7, waveLife: 70,
      waveKnock: 2.2, waveClimbs: false, stunFrames: 45,
    },
    3: { waveSize: 8, waveLife: 110, stunFrames: 120, waveClimbs: true },
  },

  // ── SWARM CALLER — defensive, Bug ─────────────────────────────────
  // PARTIAL LADDER: Lv10 is still `[wip]` in the tracker.
  swarm_caller: {
    1: { count: 2, lifeFrames: 300, recallFrames: 240, dmgMult: 0.45, intercept: false },
    3: { count: 3, lifeFrames: 480 },
    6: { intercept: true },
  },
};

/** True once a weapon has real per-level behaviour rather than a damage step. */
export const hasLadder = (id) => Object.prototype.hasOwnProperty.call(WEAPON_LADDERS, id);

/**
 * The merged feature set for a weapon at a level, or null if it has no ladder.
 *
 * Rungs are applied in ascending order so a later rung overrides an earlier
 * field and leaves everything it does not mention alone.
 */
export function ladderAt(id, level) {
  const ladder = WEAPON_LADDERS[id];
  if (!ladder) return null;
  const out = {};
  for (const rung of Object.keys(ladder).map(Number).sort((a, b) => a - b)) {
    if (rung > level) break;
    Object.assign(out, ladder[rung]);
  }
  return out;
}

/** The balance formula. Single source of truth. */
export function weaponDamage(cooldownFrames, projectiles = 1) {
  return +(FEEL.dpsTarget * (cooldownFrames / 60) / projectiles).toFixed(3);
}

/**
 * The sidearm is just another weapon — same palette structure, same DPS
 * invariant. Its only privilege is not competing for a slot. Dark blue body,
 * light blue accent.
 */
const BUSTER_PALETTE = {
  primary: '#1565C0',
  secondary: '#5CC8F0',
  outline: '#0A0A12',
};

/**
 * NULL WEAPON — what an unresolvable weapon id resolves to.
 *
 * It fires nothing and its palette has no primary and no secondary, so anything
 * drawn from it is an OUTLINE ONLY with every interior cell transparent. Any
 * code path that fails to find a weapon therefore degrades to something visible
 * and obviously wrong rather than throwing mid-frame — including an offensive
 * row emptied of every weapon, which is reachable at top mastery rank.
 *
 * It is no longer what the PLAYER draws as: the suit is a fixed blue whatever
 * is equipped. See PLAYER_PALETTE.
 */
export const NULL_WEAPON = {
  id: null,
  name: 'NO WEAPON',
  short: 'NONE',
  abbr: 'NON',
  cls: SIDEARM,
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
  // THE SIDEARM OCCUPIES AN OFFENSIVE SLOT. It is not a free extra weapon
  // riding above the loadout — a run starts with it in the first offensive
  // slot, and swapping it out for a special is a real trade you are allowed to
  // make. `sidearm: true` only keeps it off the ring arc: it has its own fixed
  // bench position above the wheel, so it never moves and is always findable.
  { id: 'buster', name: 'SIDE ARM', short: 'SIDEARM', cls: OFFENSIVE, sidearm: true, boss: null,
    cooldown: 8, projectiles: 1, shape: 'bolt', speed: 3.2,
    desc: 'Standard arm cannon. Starts in your first offensive slot.' },

  { id: 'core_blaster', name: 'NULLFIRE DRONE', short: 'N-DRONE', cls: DEFENSIVE, boss: 'core',
    cooldown: 15, projectiles: 1, shape: 'bolt', speed: 3.4,
    desc: 'Shoulder drone that auto-fires a neutral bullet from a clip.' },
  { id: 'blaze_wheel', name: 'BLAZE WHEEL', short: 'BLAZE', cls: OFFENSIVE, boss: 'blaze',
    cooldown: 30, projectiles: 1, shape: 'wheel', speed: 2.4,
    desc: 'Lobbed fireball that rolls and leaves Hot ground.' },
  { id: 'torrent_cannon', name: 'TORRENT CANNON', short: 'TORRENT', cls: DEFENSIVE, boss: 'torrent',
    cooldown: 4, projectiles: 1, shape: 'stream', speed: 3.0,
    desc: 'Jetpack that vents knockback water on landing.' },
  { id: 'volt_spark', name: 'VOLT SPARK', short: 'VOLT', cls: OFFENSIVE, boss: 'volt',
    cooldown: 12, projectiles: 1, shape: 'spark', speed: 3.6,
    desc: 'Fixed-range burst that chains between enemies and stuns.' },
  // Provisional class — its tracker field is still `[wip]`.
  { id: 'thorn_lash', name: 'THORN LASH', short: 'THORN', cls: OFFENSIVE, boss: 'thorn',
    cooldown: 36, projectiles: 1, shape: 'lash', speed: 2.8,
    desc: 'Whip-vine that reels enemies in and throws them.' },
  { id: 'frost_guard', name: 'FROST GUARD', short: 'FROST', cls: DEFENSIVE, boss: 'frost',
    cooldown: 40, projectiles: 1, shape: 'shard', speed: 2.6,
    desc: 'Ice shield that bulks up in front of you.' },
  { id: 'strike_gauntlet', name: 'STRIKE GAUNTLET', short: 'STRIKE', cls: OFFENSIVE, boss: 'strike',
    cooldown: 20, projectiles: 1, shape: 'punch', speed: 1.6,
    desc: 'Close-range jab chain with a long-press finisher.' },
  // Provisional class — its tracker field is still `[wip]`.
  { id: 'venom_spray', name: 'VENOM SPRAY', short: 'VENOM', cls: OFFENSIVE, boss: 'venom',
    cooldown: 6, projectiles: 1, shape: 'spray', speed: 2.2,
    desc: 'Poison cone leaving lingering Toxic clouds.' },
  { id: 'quake_hammer', name: 'QUAKE HAMMER', short: 'QUAKE', cls: OFFENSIVE, boss: 'quake',
    cooldown: 40, projectiles: 1, shape: 'wave', speed: 2.0,
    desc: 'Rock hammer; long-press for a stunning ground pound.' },
  // Provisional class — its tracker field is still `[wip]`.
  { id: 'gale_vortex', name: 'GALE VORTEX', short: 'GALE', cls: DEFENSIVE, boss: 'gale',
    cooldown: 45, projectiles: 1, shape: 'tornado', speed: 1.8,
    desc: 'Controllable mini-tornado that lifts enemies.' },
  // Provisional class — its tracker field is still `[wip]`.
  { id: 'psi_orb', name: 'PSI ORB', short: 'PSI', cls: OFFENSIVE, boss: 'psi',
    cooldown: 30, projectiles: 1, shape: 'orb', speed: 1.6,
    desc: 'Slow steerable homing psychic orb.' },
  { id: 'swarm_caller', name: 'SWARM CALLER', short: 'SWARM', cls: DEFENSIVE, boss: 'swarm',
    cooldown: 24, projectiles: 3, shape: 'swarm', speed: 2.6,
    desc: 'Summons temporary bug allies that fight for you.' },
  // Provisional class — its tracker field is still `[wip]`.
  { id: 'rock_buster', name: 'ROCK BUSTER', short: 'ROCK', cls: OFFENSIVE, boss: 'granite',
    cooldown: 20, projectiles: 1, shape: 'rock', speed: 2.8,
    desc: 'Heavy stone shot that shatters on impact.' },
  // Provisional class — its tracker field is still `[wip]`.
  { id: 'wraith_cloak', name: 'WRAITH CLOAK', short: 'WRAITH', cls: DEFENSIVE, boss: 'wraith',
    cooldown: 30, projectiles: 1, shape: 'wisp', speed: 3.0,
    desc: 'Brief invulnerability and invisibility.' },
  // Provisional class — its tracker field is still `[wip]`.
  { id: 'drake_breath', name: 'DRAKE BREATH', short: 'DRAKE', cls: OFFENSIVE, boss: 'drake',
    cooldown: 6, projectiles: 1, shape: 'breath', speed: 2.4,
    desc: 'Sustained draconic flame breath.' },
  // Provisional class — its tracker field is still `[wip]`.
  { id: 'eclipse_blade', name: 'ECLIPSE BLADE', short: 'ECLIPSE', cls: OFFENSIVE, boss: 'eclipse',
    cooldown: 24, projectiles: 1, shape: 'boomerang', speed: 3.0,
    desc: 'Dark boomerang that returns and steals health.' },
  // Provisional class — its tracker field is still `[wip]`.
  { id: 'alloy_blade', name: 'ALLOY BLADE', short: 'ALLOY', cls: OFFENSIVE, boss: 'alloy',
    cooldown: 20, projectiles: 1, shape: 'blade', speed: 3.4,
    desc: 'Ricocheting metal blade that pierces armour.' },
];

export const WEAPONS = DEFS.map((d) => {
  const src = d.boss ? BOSS_BY_ID[d.boss] : null;
  return {
    ...d,
    // Three letters is all an arc slot fits. Derived from `short` rather than
    // from `name` so N-DRONE reads NDR instead of NUL, and hyphens never eat a
    // character. All 18 are distinct — see tests/data.test.js.
    abbr: d.short.replace(/-/g, '').slice(0, 3),
    damage: weaponDamage(d.cooldown, d.projectiles),
    radius: d.shape === 'stream' || d.shape === 'spray' ? 2 : 3,
    palette: src
      ? { primary: src.primary, secondary: src.secondary, outline: src.outline }
      : BUSTER_PALETTE,
    color: src ? src.primary : BUSTER_PALETTE.primary,
  };
});

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
/**
 * The sidearm's id. Still literally 'buster' so every existing save keeps its
 * unlock set and weapon levels — the rename is a display change, not a data
 * migration, and paying for it with a wiped save would be absurd.
 */
export const SIDEARM_ID = 'buster';

/**
 * Resolve a weapon id, falling back to the outline-only NULL_WEAPON. Always use
 * this rather than indexing WEAPON_BY_ID directly, so an unknown or missing id
 * shows as a silhouette instead of crashing the frame.
 */
export const weaponOf = (id) => WEAPON_BY_ID[id] || NULL_WEAPON;

/**
 * Every weapon id in declaration order. The card pool and the tests walk this;
 * the wheel builds its own per-class arcs from ARC_ORDER below.
 */
export const WHEEL_ORDER = WEAPONS.map((w) => w.id);

/**
 * ARC ORDER — the fixed position of every special within its class's arc on the
 * re-quip wheel, and deliberately NOT filtered by unlock state.
 *
 * A weapon sits at the same place in its arc for the life of the save, so
 * reaching for it becomes muscle memory rather than a reading exercise. Locked
 * weapons keep their position under a padlock and unlocked-but-benched ones are
 * greyed, so the arc never reshuffles under your thumb as bosses fall. That
 * property is the whole reason a radial menu is worth having, and it survived
 * the redesign even though the brainstorm only asked for the benched ones to be
 * shown.
 *
 * The SIDEARM is excluded even though it is an offensive weapon, because it
 * keeps its own fixed position above the ring. That position is now its BENCH:
 * swap it out for a special and it reappears up there, one tap from going back
 * in, rather than sliding into the arc and shifting eleven learned positions.
 */
export const ARC_ORDER = {
  [OFFENSIVE]: WEAPONS.filter((w) => w.cls === OFFENSIVE && !w.sidearm).map((w) => w.id),
  [DEFENSIVE]: WEAPONS.filter((w) => w.cls === DEFENSIVE).map((w) => w.id),
};

/** Every special of a class, in arc order. The sidearm is in neither. */
export const specialsOfClass = (cls) => ARC_ORDER[cls] || [];

/** Is this the sidearm? It slots like a special but benches to its own spot. */
export const isSidearm = (id) => !!WEAPON_BY_ID[id]?.sidearm;

/** The class a weapon id belongs to, defaulting to the sidearm's. */
export const classOf = (id) => (WEAPON_BY_ID[id]?.cls) || SIDEARM;

/** Damage at a given weapon level. Placeholder curve until the weapon's slice. */
export function damageAtLevel(weapon, level) {
  return weapon.damage * (1 + (level - 1) * FEEL.weaponDamagePerLevel);
}

/** Effective DPS at a level — used by the debug overlay and the balance test. */
export function dpsAtLevel(weapon, level = 1) {
  return (damageAtLevel(weapon, level) * weapon.projectiles) / (weapon.cooldown / 60);
}
