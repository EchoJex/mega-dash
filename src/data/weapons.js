/**
 * WEAPONS — the sidearm plus one special per boss.
 *
 * CLASSES AND THE LOADOUT
 * -----------------------
 * A run carries up to TWO offensive and TWO defensive weapons, how many of them
 * it may actually use set by Loadout Mastery. `cls` below is what decides which
 * pair a weapon competes for, and it is taken from the first word of that
 * weapon's tracker field — "Offensive; ..." / "Defensive; ...". It is not
 * flavour text.
 *
 *   offensive  shares the fire button; the wheel picks which one is aimed. THE
 *              SIDEARM IS ONE OF THESE — it occupies a slot rather than riding
 *              above them for free.
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
/**
 * The Nullfire Drone's reload, straight from the tracker's formula:
 * `clip_cooldown = 1.5 x (clip_size / fire_rate)`.
 *
 * FIRE RATE IS DERIVED, NOT DECLARED. A rung states a burst size, a gap between
 * rounds and a gap between sets; the bullets-per-second that falls out of those
 * is what the clip actually empties at. Passing a nominal rate by hand was off
 * by the burst spacing — Lv6's "one set per 3 seconds" is 0.909 bullets/sec,
 * not 1 — and the duty cycle drifted with it.
 *
 * Computing it here makes every rung land on exactly the same uptime by
 * construction: 1 / (1 + 1.5) = 40% firing, 60% reloading, whatever the numbers.
 */
const droneReload = (clip, burst, pullFrames, burstGap) => {
  const setFrames = pullFrames + burst * burstGap;
  const rate = (burst * 60) / setFrames;
  return Math.round(1.5 * (clip / rate) * 60);
};

export const WEAPON_LADDERS = {
  /**
   * NULLFIRE DRONE — defensive, Typeless. "A small gray drone hovers well above
   * and in front of the player's shoulder... continuously auto aims at the
   * nearest enemy and auto fires, only if an enemy is on screen."
   *
   * THE CLIP IS THE WHOLE BALANCE LEVER, and its reload is stated as a formula
   * rather than a number: `clip_cooldown = 1.5 x (clip_size / fire_rate)`, so a
   * reload always costs half again the time the clip took to empty. That means
   * a rung cannot quietly buy a faster reload — it has to buy a bigger clip or
   * a faster gun, and pay for either.
   *
   * `pullFrames` is the gap between SETS, not between rounds. Lv1 through Lv6
   * all fire one set every three seconds; only Lv10 changes the rhythm.
   *
   * Lv1  one round every 3s, 10-round clip. The weapon aims; the bullet does not.
   * Lv3  3-round burst every 3s, 9-round clip — "like a rifle".
   * Lv6  3-round burst; each round splits into 3 fragments that home moderately
   *      and MAY NOT change target once they are flying.
   * Lv10 straight up at 5/s from a 30-round clip, every bullet on a different
   *      target, arcing in under strong homing. No split.
   */
  core_blaster: {
    1: {
      // "1 shot per 3 seconds, 10 ammo clip."
      clip: 10, burst: 1, burstGap: 1, pullFrames: 180,
      // A third of a shot per second, so the clip takes half a minute to empty
      // and the reload is long in proportion. That is the formula applied
      // honestly: at this rate you will almost never reach the reload, which is
      // what makes its length affordable.
      reloadFrames: droneReload(10, 1, 180, 1),
      trickleFrames: 90,          // the very slow out-of-combat top-up
      speed: 3.2,
    },
    3: {
      // "3-bullet burst. One set of bullets per 3 seconds, like a rifle."
      clip: 9, burst: 3, burstGap: 5, pullFrames: 180,
      reloadFrames: droneReload(9, 3, 180, 5),
    },
    6: {
      // "3 bullet burst" — up from two, and the split arrives.
      burst: 3, burstGap: 6,
      reloadFrames: droneReload(9, 3, 180, 6),
      splitIn: 20, splitSeekTurn: 0.06, splitAccel: 1.03,
    },
    10: {
      // "5 shots per second" — 12 frames apart, and the only rung that is not
      // on the three-second beat.
      // 11 + 1 = a 12-frame set, which is exactly 5 shots per second.
      clip: 30, burst: 1, burstGap: 1, pullFrames: 11,
      reloadFrames: droneReload(30, 1, 11, 1),
      splitIn: 0,                 // "does not split" — clears the Lv6 rung
      skyward: true, speed: 2.2, seekTurn: 0.14, accel: 1.05, maxSpeed: 6,
    },
  },

  /**
   * BLAZE WHEEL — offensive, Fire. "Fire wheels are lobbed in the direction the
   * player is facing, like a backpack catapult."
   *
   * THE FIRE RATE IS FIXED AT EVERY RUNG — "base fire rate fixed for all levels
   * at once set per 3 seconds" — so `cooldown` is deliberately absent from every
   * rung above Lv1. What the ladder buys is ROLL, and from Lv6 a second arc.
   * That is unusual and it is the design: the weapon does not get faster, it
   * gets more ground covered per throw.
   *
   * "High Fireball contact damage, LOW rolling contact damage" is `rollDmgMult`,
   * applied the moment the arc becomes a roll. A wheel you catch in the air is
   * the dangerous one; the burning trail is area denial, not a hit.
   */
  blaze_wheel: {
    1: {
      cooldown: 180, maxLive: 2,
      lobVx: 2.4, lobVy: -2.4, gravity: 0.16,
      // "Very slight rolling distance."
      roll: 10, rollSpeed: 1.4, rollDrag: 0.90,
      // "2s Hot duration applied to surfaces and 2s burn applied on contact."
      hotFrames: 120, burnFrames: 120, pierce: 0,
      rollDmgMult: 0.35,
    },
    // "5s Hot trail duration on ground; moderate roll distance with rapid
    // deceleration while on the ground."
    3: { hotFrames: 300, roll: 40, rollSpeed: 2.2, rollDrag: 0.94 },
    // The second arc is taller and much wider so it lands about where the first
    // is projected to stop, then rolls its own equal distance.
    6: { secondArc: 1.45 },
    /**
     * "Combined effective roll distance shall be full screen (half for each
     * fireball)" — 200px each against a 320-480 screen. "Fireballs rapidly
     * accelerate while on the ground" is drag above 1. Pierce goes away because
     * they now EXPLODE on contact instead of passing through.
     *
     * THE BLAST IS THREE FIREBALL DIAMETERS ACROSS — equivalently, a border one
     * fireball wide all the way around the one that burst. Read literally, "a
     * one fireball radius in all directions" was 3.5px on a 224px screen, which
     * is a blast the size of the wheel and reads as nothing; the owner clarified
     * the intent. The wheel's radius is 3.5, so 3x that is a 21px-wide burst
     * against a 24px-tall player — big enough to catch a neighbour, small enough
     * that placement still matters.
     */
    10: {
      roll: 200, rollDrag: 1.08, pierce: 0, burnFrames: 120,
      explodeR: 3.5 * 3, explodeBurn: 120,
    },
  },

  // ── TORRENT CANNON — defensive, Water ─────────────────────────────
  // Everything is a reaction to movement, so it never competes for the fire
  // button. The tank is the limiter: it refills fast, but only while idle.
  // Lv1  a knockback vent on landing.
  // Lv3  the same vent on jumping and double jumping too.
  // Lv6  a brief hover at the apex, venting two downward jets.
  // Lv10 a straight-down nosedive out of the hover, paid for with the tank.
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
    /**
     * "Add a straight down nosedive that produces a large tidal wave in both
     * horizontal directions on contact with a surface. Activated by tapping
     * jump after a water hover has started. Consumes all remaining water. Size
     * is initially taller than the player, but scaled down based on the amount
     * of water remaining in the tank."
     *
     * The rung used to fire a wave on EVERY landing, sized by impact speed.
     * That is a different weapon: it costs nothing to aim, happens whether you
     * wanted it or not, and never runs out. This one is a decision made in the
     * air, paid for with the whole tank, and its size is the receipt for how
     * much you had left.
     */
    10: {
      tank: 180, refill: 3.2, tidal: true,
      tidalSpeed: 3.2, tidalDmgMult: 0.8, tidalLife: 120,
      diveSpeed: 9,          // faster than terminal velocity — it is a dive
      // Wave half-height in pixels at a full tank and at an empty one. The
      // player is 24 tall, so even the floor of it is "taller than the player".
      waveMax: 30, waveMin: 13,
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
  /**
   * FROST GUARD — defensive, Ice. "Slowly forms a large shield of ice in front
   * of the player that slowly bulks up. Short cooldown if damaged; long
   * cooldown if destroyed by damage."
   *
   * `hits` is the shield's whole strength: one enemy projectile costs one hit
   * whatever its damage, which is what "the equivalent of N minion projectiles"
   * means and why a boss's big shot is not worth three of a minion's.
   *
   * `shards` are degrees ABOVE the horizon, fired from the top edge when the
   * shield breaks — by damage or by body-blocking something. Lv3's three sit at
   * 22.5/45/67.5; Lv6 adds a fourth and slides the fan down so the lowest is
   * 22.5 BELOW the horizon, keeping the same even 22.5-degree spacing.
   */
  frost_guard: {
    1: {
      // "Full Shield blocks the equivalent of 3 minion projectile."
      hits: 3, w: 8, h: 22,
      // "VERY slow ice buildup" — two and a half seconds to reach full size,
      // so re-forming after a break is a real window rather than a blink.
      growFrames: 150,
      breakFrames: 240,     // destroyed outright — the long cooldown
      chipFrames: 90,       // merely damaged — the short one, per lost hit
      freezeFrames: 120,
      shards: null, shardPierce: 0, shardDmgMult: 0.45, shardSpeed: 3.4,
      // Which bosses the shield can freeze on contact. None at Lv1: a boss
      // shrugs it off, and only the ice-vs-water matchup ever changes that.
      freezeBosses: [],
    },
    3: {
      hits: 4, w: 10, h: 26,
      shards: [22.5, 45, 67.5],
      // "Freezes the opponent if contacting a minion OR THE WATER BOSS."
      freezeBosses: ['torrent'],
    },
    6: { shards: [-22.5, 0, 22.5, 45], shardPierce: 99 },
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
  // "Slow, delayed baseball-swing on tap for high damage and high knockback;
  //  long press 1.5s to hold the hammer overhead and on release swing downward
  //  producing shockwaves and stunning nearby enemies. Per-level scaling:
  //  shockwave size + stun duration."
  //  Lv1  an airborne pound drives the player down fast; the wave is born
  //       where he actually lands.
  //  Lv3  larger wave, longer stun, and the wave climbs low obstacles.
  // PARTIAL LADDER: Lv6 and Lv10 are still `[wip]` in the tracker.
  //
  // `holdFrames` IS THE TRACKER'S 1.5 SECONDS and is this weapon's own, not the
  // shared LONG_PRESS_FRAMES: the hold is a commitment here, not a modifier, and
  // 0.4s would let it happen by accident on a slightly slow tap.
  quake_hammer: {
    1: {
      swingFrames: 30, reach: 22, swingDmgMult: 1.8, swingKnock: 3.6,
      holdFrames: 90, poundFrames: 26, poundAccel: 1.2,
      waveSpeed: 2.4, waveSize: 5, waveDmgMult: 0.7, waveLife: 70,
      waveKnock: 2.2, waveClimbs: false, stunFrames: 45, stunRange: 40,
    },
    3: {
      waveSize: 8, waveLife: 110, stunFrames: 120, waveClimbs: true,
      stunRange: 56,
    },
  },

  // ── SWARM CALLER — defensive, Bug ─────────────────────────────────
  // "Summons temporary bug allies that attack nearby enemies."
  //  Lv1  ONE ally, short duration; nearest minion, returning to the player
  //       briefly between targets.
  //  Lv3  two allies, longer, prioritising whatever the player last damaged.
  //  Lv6  three, and every other one intercepts projectiles as a meat shield.
  //  Lv10 five that swarm the player as a shield and slowly respawn after
  //       tanking damage, plus a three-bug kamikaze converge on one enemy.
  swarm_caller: {
    1: {
      count: 1, lifeFrames: 300, recallFrames: 240, dmgMult: 0.45,
      intercept: false, regroup: 45, shield: false, kamikaze: 0,
    },
    3: { count: 2, lifeFrames: 480 },
    6: { count: 3, intercept: true },
    10: {
      count: 5, lifeFrames: 900, shield: true, respawnFrames: 240,
      kamikaze: 3, kamikazeFrames: 300, blastRadius: 22, blastDmgMult: 2.4,
    },
  },

  // ── THORN LASH — offensive, Grass ─────────────────────────────────
  // "Stand still while shooting a directional-input whip-like vine that reels
  //  in enemies then immediately throws them back as projectiles. Moderately
  //  slow attack speed."
  //  Lv1  short reach; reels and damages minions only, no toss, no constrict.
  //  Lv3  longer, diagonal-aware, and it grapples terrain: a ledge lip pulls
  //       you up, a platform or ceiling hit while airborne swings you forward.
  //  Lv6  significantly longer again.
  //  Lv10 constricts minibosses for 5s of DPS, and thrown minions become
  //       high-damage projectiles.
  //
  // REACH IS THE WHOLE LADDER at Lv1/6, which is why nothing else moves there.
  // A whip that has to be aimed while standing still is priced in exposure, and
  // reach is what buys the exposure back.
  /**
   * THORN LASH — offensive, Grass.
   * Lv1 "Short reach; can only reel in and damage minions; mild knockback but
   *      does not toss or constrict them."
   * Lv3 "Increased reach. Each hit applies a stack of constrict and if a minion
   *      then tosses straight forward a moderate distance before being affected
   *      by gravity and rolling to a stop. Check for lethal damage after
   *      completing the toss and the minion comes to rest. Minion projectile
   *      does not deal damage but has very large knockback. Affected by
   *      diagonal inputs; [grapple and swing rules]."
   *
   * THE TOSS AND THE CONSTRICT MOVED FROM Lv10 TO Lv3. They used to be the top
   * rung's whole payload; the field now puts both at Lv3, which changes what
   * the weapon IS — a crowd tool from its second rung rather than a reel that
   * eventually learns a trick.
   */
  thorn_lash: {
    1: {
      cooldown: 36, reach: 34, lashFrames: 18, rootFrames: 22,
      // "Mild knockback" on the reel, which it did not have at all.
      reelSpeed: 3.2, dmgMult: 1.4, reelKnock: 1.4,
      toss: false, tossDmgMult: 0, constrictFrames: 0,
      grapple: false, diagonal: false,
    },
    3: {
      reach: 52, diagonal: true, grapple: true, swingSpeed: 3.4, ledgeGrab: 0.2,
      toss: true, constrictFrames: 300,
      // The tossed minion is a BATTERING RAM, not a bullet: "does not deal
      // damage but has very large knockback". The damage it is carrying is its
      // OWN, resolved when it comes to rest.
      tossDmgMult: 2.6, tossSpeed: 5, tossKnock: 9,
    },
    6: { reach: 78 },
    10: { tossDmgMult: 3.4, tossSpeed: 6 },
  },

  // ── GALE VORTEX — defensive, Flying ───────────────────────────────
  // "White puffs of smoke energy when falling, significantly reducing fall
  //  speed and significantly increasing horizontal movement."
  //  Lv1  up to 3 puffs while falling, each cancelling vertical velocity,
  //       separated by a very brief time.
  // PARTIAL LADDER: Lv3/6/10 still describe the OLD tornado weapon and are
  // `[wip]`. Do not build them — this weapon was redesigned and those rungs
  // have not caught up.
  //
  // THE PUFFS ARE AUTOMATIC. It is a defensive weapon, so it must never want the
  // fire button: falling is the trigger, the count is the budget, and touching
  // the ground refills it. That makes it a safety net you spend rather than an
  // ability you aim.
  gale_vortex: {
    1: {
      puffs: 3, puffGap: 14, fallCut: 0.18, glideFall: 1.1,
      airControl: 1.75, glideFrames: 40,
    },
  },

  // ── ASTRAL CLOAK — defensive, Dark ────────────────────────────────
  // "Reduces aggro and become immune to status effects."
  //  Lv1  enemies fire slightly less often and pause briefly at random while
  //       pursuing.
  //  Lv3  slightly longer and more frequent pauses.
  //  Lv6  shadow trails that damage enemies and lifesteal.
  // PARTIAL LADDER: Lv10's "Dark Mode" is still `[wip]`.
  //
  // AGGRO IS A TAX ON THE ENEMY'S CLOCK, not a stat on the player: it slows the
  // rate things happen TO you rather than making them hurt less, which is the
  // only version of "stealth" that stays legible in a game where every threat is
  // already telegraphed. The status immunity is flat from Lv1 because a partial
  // immunity would be indistinguishable from luck.
  eclipse_blade: {
    1: {
      fireChance: 0.85, pauseChance: 0.012, pauseFrames: 18,
      immune: true, trail: false,
    },
    3: { pauseChance: 0.02, pauseFrames: 30 },
    6: {
      trail: true, trailGap: 8, trailLife: 90, trailDmgMult: 0.5,
      lifesteal: 0.25, trailHitGap: 30,
    },
  },

  // ── ALLOY BLADE — offensive, Steel ────────────────────────────────
  // "Throws penetrative metal blades that ricochet multiple times. Per-level
  //  scaling: more ricochets + higher damage."
  //  Lv1  single blade, one ricochet, pierces the first enemy hit.
  //  Lv3  two ricochets, more pierce, and blades survive terrain corners.
  // PARTIAL LADDER: Lv6's early recall and Lv10's armour mode are `[wip]`.
  alloy_blade: {
    1: {
      cooldown: 20, speed: 3.4, bounces: 1, pierce: 1,
      dmgMult: 1, life: 240, cornerSafe: false,
    },
    3: { bounces: 2, pierce: 2, dmgMult: 1.25, cornerSafe: true },
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
  // Offensive by behaviour rather than by a class word: the tracker's field
  // does not name one, and a whip you aim while standing still is not a thing
  // that runs itself. Confirmed if the owner ever writes the word.
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
  // The tracker replaced the tornado with a fall-arresting glide; the name and
  // id stayed. Higher rungs of its ladder still describe the tornado and are
  // `[wip]`, so only Lv1 is built.
  { id: 'gale_vortex', name: 'GALE VORTEX', short: 'GALE', cls: DEFENSIVE, boss: 'gale',
    cooldown: 45, projectiles: 1, shape: 'tornado', speed: 1.8,
    desc: 'Smoke puffs that cancel a fall and widen air control.' },
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
  // RENAMED AND RECLASSIFIED. This was an offensive boomerang called the Eclipse
  // Blade while its tracker field was `[wip]`; the field now reads "Defensive;
  // reduces aggro and become immune to status effects", so it is a cloak and it
  // is named like one.
  //
  // THE ID STAYS `eclipse_blade`. It is the join key for `BOSSES[].dropWeapon`
  // and for every save's unlock set and weapon levels — the same reason the
  // sidearm is still literally 'buster'. A rename is a display change and must
  // never cost anyone their save.
  { id: 'eclipse_blade', name: 'ASTRAL CLOAK', short: 'ASTRAL', cls: DEFENSIVE, boss: 'eclipse',
    cooldown: 24, projectiles: 1, shape: 'wisp', speed: 3.0,
    desc: 'Cloak that dulls enemy aggro and blocks status effects.' },
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
