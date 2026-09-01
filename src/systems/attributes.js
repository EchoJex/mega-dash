/**
 * ELEMENTAL ATTRIBUTES — the status layer shared by bosses, arenas and (later)
 * player special weapons.
 *
 * Each attribute has a TERRAIN form and a CHARACTER form, and the pair is the
 * unit of design: Hot / Burn, Soaked / Wet, Corrosive / Poisoned, Electrified /
 * Stunned. Terrain forms live on the arena; character forms live on an actor.
 *
 * FLINCH AND KNOCKBACK ARE NOT ATTRIBUTES. They are basic hitbox interaction,
 * present on every hit regardless of element. Do not model them here — Hot
 * *causes* flinch and knockback because it is a hit, not because flinch is a
 * status.
 *
 * Constrict and freeze are deliberately the SAME behaviour with a different
 * tint: both mean "the target cannot act for N frames" and differ only in the
 * colour that flashes, which is why they share HELD below.
 *
 * STUN IS NO LONGER ONE OF THEM. The tracker now defines it as a stacking
 * SLOW — 15% off the player's movement and attack speed per stack, 30% off an
 * enemy's, multiplied against whatever speed is left — not as a hold. A slow
 * that stacks and a hold that does not are different mechanics, so stun gets
 * its own branch and CLAUDE.md's older "stun, constrict and freeze already do"
 * line no longer covers it.
 *
 * WHO IS IMMUNE TO WHAT is decided by `source`, not by the attribute. The player
 * is immune to Hot it created itself (Blaze Wheel) but not to Hot the arena
 * created. One field, checked at the point of contact.
 */

import { FEEL } from '../config/feel.js';

/** Every attribute the design defines. `form` is the tracker's own wording. */
export const ATTR = {
  hot:       { form: 'terrain',   tint: 0xE11416, label: 'HOT' },
  burn:      { form: 'character', tint: 0xE11416, label: 'BURN' },
  wet:       { form: 'both',      tint: 0x145DBD, label: 'WET' },
  poisoned:  { form: 'character', tint: 0xA926D9, label: 'POISON' },
  /**
   * THE THREE SLOWS ARE ONE MECHANIC IN THREE COLOURS.
   *
   * The tracker now says Constrict and Freeze are "functionally the same as
   * stun", differing only by "elementally correct color hue". They used to be
   * the "cannot act" pair against Stun's slow, and that is a real reversal: a
   * hold takes the player's turn away, a slow taxes it. Three attributes that
   * behave identically and read differently is the design, and it is why the
   * only per-attribute data left here is the tint.
   *
   * `stacks` is what makes them multiplicative and resettable — see
   * applyStatus and speedMult, which now walk every stacking status rather
   * than reading `stun` by name.
   */
  stun:      { form: 'character', tint: 0xF5D328, label: 'STUN', stacks: true },
  // Not 'HELD' any more: it no longer holds anything, and a label that says it
  // does is the kind of thing a future reader trusts over the code.
  constrict: { form: 'character', tint: 0x2AAB1C, label: 'BOUND', stacks: true },
  freeze:    { form: 'character', tint: 0xA0EFE7, label: 'FROZEN', stacks: true },
  // NOT AN ELEMENTAL ATTRIBUTE, and deliberately not in the tracker's list.
  // The Astral Cloak's aggro pause is "loses track of you for a beat", which is
  // mechanically a hold and nothing else — it reuses the hold machinery so every
  // consumer already honours it.
  //
  // It flashes a FAINT DARK shimmer rather than a colour: an enemy that simply
  // stopped was indistinguishable from an enemy that happened not to be moving,
  // which made the cloak's best effect invisible. `flash` keeps it well under
  // every elemental tint, so a paused enemy reads as shadowed rather than as
  // afflicted with something.
  cloakHold: { form: 'character', tint: 0x2A273F, label: '', held: true, flash: 0.4 },
};

/** How strongly an attribute washes over the actor it is on. 1 is the default. */
const flashOf = (id) => ATTR[id]?.flash ?? 1;

/**
 * THE STACK CEILING, and why an unbounded stack is a softlock.
 *
 * Stun is multiplicative per stack, so N stacks is 0.85^N of your speed — and
 * it is re-applied by things that fire on a timer, like Volt Man's floor panels
 * and his conductors. Stand in the wrong place for a few seconds and the
 * exponent reaches the twenties, where the multiplier is effectively zero and
 * the weapon cooldown it divides becomes minutes long. That is the reported
 * "stun prevents the player from shooting ever again".
 *
 * Eight stacks is 0.27 of normal speed — punishing, survivable, and the point
 * past which more stacks were only ever adding an outage.
 */
const STUN_MAX_STACKS = 8;

/** Statuses that stop an actor acting. */
export const isHeld = (bag) => Object.keys(bag || {})
  .some((k) => ATTR[k]?.held && bag[k].t > 0);

// ── Character statuses ────────────────────────────────────────────────

export const makeStatus = () => ({});

/**
 * Apply (or refresh) a character status.
 *
 * Statuses do NOT stack with themselves — a second application resets the
 * duration instead of adding a second instance. That is the tracker's rule for
 * Hot and Burn and it generalises: stacking would make a rapid-fire weapon
 * silently many times stronger than its damage numbers say.
 *
 * STUN IS THE ONE EXCEPTION, because the tracker asks for it explicitly:
 * re-applying adds a stack and resets the clock, and each stack multiplies what
 * is LEFT of the target's speed rather than subtracting from the original.
 * That shape approaches zero without reaching it, which sounds self-limiting and
 * is not: a source that re-applies on a timer drives the exponent up until the
 * multiplier is indistinguishable from zero. See STUN_MAX_STACKS.
 *
 * `opts.step` is the per-stack multiplier, and it is passed in rather than read
 * from FEEL here because the same attribute hits the player at 15% and an enemy
 * at 30%. The applier knows who it is hitting; this function does not.
 */
export function applyStatus(bag, id, frames, opts = {}) {
  const def = ATTR[id];
  if (!def) return bag;
  const cur = bag[id];

  if (def.stacks) {
    const step = opts.step ?? 1;
    bag[id] = {
      t: frames,
      tMax: frames,
      accum: cur?.accum || 0,
      stacks: (cur && cur.t > 0 ? cur.stacks : 0) + 1,
      step,
    };
    return bag;
  }

  if (cur && cur.t > frames) { cur.tMax = Math.max(cur.tMax, frames); return bag; }
  bag[id] = { t: frames, tMax: frames, accum: cur?.accum || 0 };
  return bag;
}

export const hasStatus = (bag, id) => !!(bag && bag[id] && bag[id].t > 0);

/**
 * Wipe every status. Immunity is expressed as a CONTINUOUS CLEAR rather than as
 * a flag consulted at application time, because statuses arrive from a dozen
 * places — patches, contact, projectiles, hazards — and a flag would have to be
 * checked correctly at every one of them. Clearing once a frame cannot be
 * forgotten by a future caller, and it degrades to a single wasted object walk
 * when nothing is applied.
 */
export function clearStatus(bag) {
  if (!bag) return;
  for (const id of Object.keys(bag)) delete bag[id];
}

/**
 * Advance every status one frame and return whole points of damage accrued.
 *
 * Burn is "very mild damage very rapidly, rapidly diminishing" — so it is a
 * fractional per-frame rate scaled by how much of the status is left, banked
 * until it crosses a whole point. Doing it as a periodic 1-damage tick instead
 * would make it lumpy and would not diminish smoothly.
 */
export function stepStatus(bag) {
  let damage = 0;
  for (const id of Object.keys(bag)) {
    const s = bag[id];
    if (s.t <= 0) { delete bag[id]; continue; }
    s.t--;
    const frac = s.t / s.tMax;
    if (id === 'burn') {
      s.accum += (FEEL.burnDps / 60) * frac;
    } else if (id === 'poisoned') {
      /**
       * DISCRETE TICKS, not a rate. "Small damage in discrete 3 second
       * intervals for 9 seconds" is three hits you can count, and it does NOT
       * diminish with remaining duration the way Burn does — the third tick
       * hurts exactly as much as the first. Counted UP from application so the
       * first tick lands three seconds in rather than instantly.
       */
      s.tick = (s.tick || 0) + 1;
      if (s.tick >= FEEL.poisonTickFrames) {
        s.tick = 0;
        damage += FEEL.poisonTickDamage;
      }
    }
    if (s.accum >= 1) { const n = Math.floor(s.accum); s.accum -= n; damage += n; }
  }
  return damage;
}

/**
 * The tint to flash on an afflicted actor and how hard to flash it.
 *
 * ONE FUNCTION RETURNING BOTH, because the two answers have to come from the
 * same winner. Returning the colour from one call and the strength from another
 * lets them disagree the moment two statuses are live at once, and the bug that
 * produces — a faint attribute washed at a fierce attribute's strength — is
 * almost impossible to spot by looking.
 *
 * Strongest remaining fraction wins. A status with no tint has nothing to say
 * visually and cannot take the slot from one that does.
 */
export function statusFlash(bag) {
  let best = null, bestFrac = 0, alpha = 1;
  for (const id of Object.keys(bag || {})) {
    const tint = ATTR[id]?.tint;
    if (tint == null) continue;
    const f = bag[id].t / bag[id].tMax;
    if (f > bestFrac) { bestFrac = f; best = tint; alpha = flashOf(id); }
  }
  return { tint: best, alpha };
}

/**
 * How strongly to flash the tint, 0-1. Stun deepens with every stack, per the
 * tracker's "faint yellow hue that becomes more intense with each additional
 * stack" — so the number of stacks is readable without a HUD counter.
 */
export function statusIntensity(bag) {
  let most = 0;
  for (const id of Object.keys(bag || {})) {
    if (!ATTR[id]?.stacks) continue;
    const s = bag[id];
    if (s && s.t > 0) most = Math.max(most, s.stacks);
  }
  return most ? Math.min(1, 0.45 + 0.18 * most) : 1;
}

/**
 * Movement and attack speed multiplier from Stun. 1 when unstunned.
 *
 * Multiplicative in the number of stacks, which is the tracker's wording:
 * each stack takes its cut of the speed that is LEFT, not of the original.
 */
export function speedMult(bag) {
  let mult = 1;
  for (const id of Object.keys(bag || {})) {
    if (!ATTR[id]?.stacks) continue;
    const s = bag[id];
    if (!s || s.t <= 0) continue;
    // A caller that did not name a step gets the player's 15%, which is the
    // gentler of the two and therefore the safe default to guess wrong with.
    const step = s.step ?? FEEL.stunPlayerStep;
    mult *= step ** Math.min(s.stacks, STUN_MAX_STACKS);
  }
  return mult;
}

/** Wet reduces contact friction; nothing else changes how the player moves. */
export const frictionMult = (bag) =>
  hasStatus(bag, 'wet') ? FEEL.wetFrictionMult : 1;

// ── Terrain attributes ────────────────────────────────────────────────

/**
 * A patch of attributed ground. `source` decides who it can hurt: the player is
 * immune to its own Hot, so Blaze Wheel can leave a trail you can stand in.
 */
export function makePatch(id, x, y, w, h, frames, source = 'boss') {
  return { id, x, y, w, h, t: frames, tMax: frames, source, tick: 0 };
}

/**
 * A patch laid down BY something, ON the surface it landed on.
 *
 * THE MARK IS THE SIZE OF THE THING THAT MADE IT. This exists so that rule lives
 * in one place: the two call sites (a falling rock crumbling, a fireball
 * bouncing) each used to compute their own footprint and each got it wrong in a
 * different direction — a radius-3 fireball stamped 16px, a 12px rock stamped
 * 20px. Both looked and hurt wider than the thing you were watching, which is
 * the same unfairness the sprite-box/collision-box split exists to prevent.
 *
 * `srcX`/`srcW` are the SOURCE's own horizontal extent. The patch sits 3px into
 * the surface so it reads as scorched ground rather than a floating bar.
 */
const PATCH_H = 4;
export const surfacePatch = (id, srcX, srcW, surfaceY, frames, source = 'boss') =>
  makePatch(id, srcX, surfaceY - 3, Math.max(2, srcW), PATCH_H, frames, source);

export function stepPatches(list) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    if (p.tick > 0) p.tick--;
    if (p.permanent) continue;          // lava pools last the whole fight
    if (--p.t <= 0) list.splice(i, 1);
  }
}

/**
 * How much of a new patch must sit on an existing one to count as the SAME
 * ground being re-heated rather than new ground catching fire.
 *
 * This ratio is the whole fix for a real bug. Merging on ANY overlap meant a
 * bouncing fireball welded its entire trail into one patch and reset that whole
 * strip's clock on every bounce — so the ground it touched first stayed at full
 * heat until the fireball was gone, and only then began to cool. Hot appeared to
 * last far longer than its duration, and the duration itself looked broken.
 *
 * Requiring substantial overlap means each bounce point ages on its own clock
 * and the trail cools from the back forward, which is what "applies Hot for a
 * scalable time" actually means.
 */
const MERGE_RATIO = 0.6;

/**
 * Add a terrain patch, refreshing an existing one only when it is genuinely the
 * same ground. Re-application resets the duration and never stacks, per the
 * tracker's rule for Hot and Burn.
 */
export function addPatch(list, patch) {
  for (const p of list) {
    if (p.id !== patch.id || p.source !== patch.source) continue;
    if (Math.abs(p.y - patch.y) >= 4) continue;
    const overlap = Math.min(p.x + p.w, patch.x + patch.w) - Math.max(p.x, patch.x);
    if (overlap < patch.w * MERGE_RATIO) continue;   // adjacent ground, not the same
    // Refresh in place. The span deliberately does NOT grow: growing is what let
    // one patch swallow a whole trail and made its lifetime unbounded.
    p.t = Math.max(p.t, patch.t);
    p.tMax = Math.max(p.tMax, patch.tMax);
    return p;
  }
  list.push(patch);
  return patch;
}

/**
 * The strongest patch touching `box` that can actually affect `victim`, or null.
 * Returns the patch so the caller can read its remaining fraction — Hot scales
 * its damage, flinch and knockback down as it cools.
 */
export function patchAt(list, box, victim = 'player') {
  let best = null;
  for (const p of list) {
    if (p.source === victim) continue;                    // immune to your own
    if (box.x + box.w <= p.x || box.x >= p.x + p.w) continue;
    if (box.y + box.h <= p.y || box.y >= p.y + p.h) continue;
    if (!best || patchFrac(p) > patchFrac(best)) best = p;
  }
  return best;
}

/** How much of a patch is left, 1 -> 0. A permanent pool never weakens. */
export const patchFrac = (p) => (p.permanent ? 1 : p.t / p.tMax);

/** Blend a patch's tint toward transparent as it subsides, for drawing. */
export const patchAlpha = (p, peak = 0.55) => peak * patchFrac(p);
