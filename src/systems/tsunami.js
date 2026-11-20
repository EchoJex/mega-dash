/**
 * THE TSUNAMI'S LIFE, shared by the Water boss's layer-3 divebomb and the
 * Torrent Cannon's Lv10 nosedive (owner, 19 Nov 2026: "The heavy boss
 * divebombs to the ground, causing tall waves to form next to him, like a
 * cannon ball splash, that begin to curl and then start to crash just before
 * reaching the spike wall"). The weapon's wave is the same one in miniature.
 *
 * A wave is a SPLASH where it is born, then RISES as it travels (seven
 * pictures, each taller), CURLS near the end of its run and CRASHES. Which
 * picture shows is decided by how far through its run it is, so the picture
 * and the water you can touch are always the same height. The pictures face
 * right; a wave going left is the same picture mirrored.
 *
 * The pictures are `src/data/tempest-tsunami.json`, written by
 * `design/weapon-art/tsunami/frames.py` from SpriteCook sheet B1.
 */
import TS from '../data/tempest-tsunami.json' with { type: 'json' };

export const TSUNAMI = TS;
/** How far through its run a wave starts to curl, and to crash. */
export const CURL_AT = 0.78, CRASH_AT = 0.95;
/** Steps the splash shows for. */
export const SPLASH_STEPS = 18;

/**
 * The picture for a wave `p` of the way through its run (0 to 1), or crashed:
 * `{ kind, i, f }`, `f` being the frame (`h`, `w`, `fx` its front column,
 * `rows`, `tops`).
 */
export function tsunamiFrame(set, p, crashed) {
  if (crashed || p >= CRASH_AT) return { kind: 'crash', i: 0, f: set.crash[0] };
  if (p >= CURL_AT) return { kind: 'curl', i: 0, f: set.curl[0] };
  const i = Math.min(set.rise.length - 1, Math.floor((Math.max(0, p) / CURL_AT) * set.rise.length));
  return { kind: 'rise', i, f: set.rise[i] };
}

/** The splash picture `t` steps after landing. */
export function splashFrame(set, t) {
  const n = set.splash.length;
  return { kind: 'splash', i: Math.min(n - 1, Math.floor(t / (SPLASH_STEPS / n))), f: set.splash[Math.min(n - 1, Math.floor(t / (SPLASH_STEPS / n)))] };
}

/** The Torrent Cannon's picture set for a wave about `h` pixels tall: the nearest one drawn. */
export function tidalSet(h) {
  let best = null;
  for (const k of Object.keys(TS.tidal)) if (!best || Math.abs(+k - h) < Math.abs(+best - h)) best = k;
  return TS.tidal[best];
}
