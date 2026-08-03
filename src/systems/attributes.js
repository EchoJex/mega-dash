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
 * Several attributes are deliberately the SAME behaviour with a different tint:
 * stun, constrict and freeze all mean "the target cannot act for N frames" and
 * differ only in the colour that flashes. That is per the tracker, and it is why
 * they share HELD below rather than each getting its own branch.
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
  // Identical behaviour, different colour — see the note above.
  stun:      { form: 'character', tint: 0xF5D328, label: 'STUN', held: true },
  constrict: { form: 'character', tint: 0x2AAB1C, label: 'HELD', held: true },
  freeze:    { form: 'character', tint: 0xA0EFE7, label: 'FROZEN', held: true },
};

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
 */
export function applyStatus(bag, id, frames) {
  if (!ATTR[id]) return bag;
  const cur = bag[id];
  if (cur && cur.t > frames) { cur.tMax = Math.max(cur.tMax, frames); return bag; }
  bag[id] = { t: frames, tMax: frames, accum: cur?.accum || 0 };
  return bag;
}

export const hasStatus = (bag, id) => !!(bag && bag[id] && bag[id].t > 0);

/** Remaining strength, 1 at application falling to 0 at expiry. */
export const statusFrac = (bag, id) =>
  hasStatus(bag, id) ? bag[id].t / bag[id].tMax : 0;

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
      // Poison is the opposite shape: infrequent but it flinches. The flinch is
      // applied by the caller, which owns the hit reaction.
      s.accum += (FEEL.poisonDps / 60) * frac;
    }
    if (s.accum >= 1) { const n = Math.floor(s.accum); s.accum -= n; damage += n; }
  }
  return damage;
}

/** The tint to flash on an afflicted actor, or null. Strongest remaining wins. */
export function statusTint(bag) {
  let best = null, bestFrac = 0;
  for (const id of Object.keys(bag || {})) {
    const f = bag[id].t / bag[id].tMax;
    if (f > bestFrac) { bestFrac = f; best = ATTR[id]?.tint ?? null; }
  }
  return best;
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
export const PATCH_H = 4;
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
