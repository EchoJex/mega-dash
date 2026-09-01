/**
 * SEEDED RANDOMNESS — so a run can be described, not just described *about*.
 *
 * WHY THIS EXISTS
 * ---------------
 * The world is procedural, which means a bug in it lives at a coordinate in a
 * world that no longer exists by the time it is reported. When an uncrossable
 * gap turned up during playtesting, there was no way to go and look at it: the
 * only recourse was to generate thousands of worlds and infer the rule that
 * must have produced it. That works, but it is a statistical argument about a
 * bug rather than the bug itself.
 *
 * With a seed on screen, "seed 4821, bad gap about 3000px in" is an exact
 * world. It can be rebuilt here, asserted against, and kept as a regression
 * test forever.
 *
 * SCOPE — read this before assuming more than it does.
 * ---------------------------------------------------
 * This seeds the WORLD: ground spans, pits, spikes, platforms. It does NOT make
 * a whole run replay identically — minion spawns, drops, and boss attack
 * choices still use Math.random, so the same seed gives you the same terrain
 * with a different fight in it. That is the useful half and by far the cheap
 * half. Full determinism needs every consumer routed through here plus recorded
 * input, which is a separate, much larger job.
 */

/**
 * mulberry32 — small, fast, and good enough for level generation.
 *
 * Not cryptographic and does not need to be. What it does need is to be
 * IDENTICAL everywhere: the same seed must produce the same world on a phone
 * and in a test on a laptop, which rules out anything host-provided.
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh seed for a new run. Short enough to read off a phone and type back. */
const randomSeed = () => Math.floor(Math.random() * 100000);

/**
 * The generator for one area of a run.
 *
 * Derived from the run seed and the area's index rather than carrying one
 * generator across the whole run, so area 3 is the same world whether you
 * reached it by playing or by skipping straight to it with the boss picker.
 * Without that, the dev boss selector — which exists precisely so a boss can be
 * fought repeatedly — would shift every later world each time it was used.
 */
export const areaRng = (seed, areaIndex) =>
  makeRng((seed ^ Math.imul(areaIndex + 1, 0x9E3779B9)) >>> 0);

/**
 * The seed a run should start from.
 *
 * `?seed=1234` pins it, which is how a reported world gets reproduced in a
 * browser without a rebuild. Anything unparseable falls back to random rather
 * than to a fixed value, so a typo cannot silently pin every run to one world.
 */
export function seedFromLocation() {
  try {
    const q = globalThis.location?.search;
    if (!q) return randomSeed();
    const v = new URLSearchParams(q).get('seed');
    if (v === null) return randomSeed();
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n >>> 0 : randomSeed();
  } catch {
    return randomSeed();
  }
}
