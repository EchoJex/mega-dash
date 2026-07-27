/**
 * DISPLAY — fixed virtual resolution.
 *
 * This is the single most important structural rule in the project.
 *
 * The game renders internally at a small, FIXED pixel resolution and is then
 * integer-scaled up to fill the device screen. Consequences:
 *
 *   - Physics are identical on every device. A jump clears the same gap on a
 *     phone and a tablet. (The old HTML prototype scaled physics off screen
 *     height, so it literally played differently per device — this fixes that.)
 *   - Pixels stay square and crisp. No half-pixel shimmer, no filtering.
 *   - Sprite art is authored once at one scale.
 *
 * NEVER derive a gameplay value from window size. If you need "the middle of
 * the screen", use VIEW_W / 2 — not window.innerWidth / 2.
 */

// Vertical is LOCKED. 224 is the NES/SNES "composed-for" safe area — the real
// framebuffer was 240 but CRTs cropped ~8 rows top and bottom, so games were
// actually designed inside 224.
export const VIEW_H = 224;

// Horizontal FLEXES with device aspect ratio. A landscape phone is ~20:9, so
// pillarboxing a square-ish 256 would waste half the screen. Wider devices
// simply see further ahead/behind — harmless in a procedurally generated
// sidescroller, and it keeps the whole screen filled.
export const VIEW_W_MIN = 320; // 4:3-ish tablet
export const VIEW_W_MAX = 480; // ultrawide phone
export const VIEW_W_DEFAULT = 400;

/** Virtual width for a given physical aspect ratio, snapped to even pixels. */
export function computeViewWidth(screenW, screenH) {
  const target = Math.round(VIEW_H * (screenW / screenH));
  const clamped = Math.max(VIEW_W_MIN, Math.min(VIEW_W_MAX, target));
  return clamped % 2 === 0 ? clamped : clamped + 1;
}

/**
 * FIXED TIMESTEP.
 *
 * The sim always advances in whole 1/60s steps regardless of display refresh,
 * so the game behaves identically on 60Hz and 120Hz panels. Rendering is
 * decoupled and may run at any rate. Mega Man-grade precision requires this,
 * and retrofitting it later is miserable.
 */
export const FIXED_DT = 1000 / 60;
export const MAX_STEPS_PER_FRAME = 5; // spiral-of-death guard after tab-out

/** Sprite grid. The player is 24x24 like the NES original. */
export const TILE = 8;
export const PLAYER_SPRITE_W = 24;
export const PLAYER_SPRITE_H = 24;

/**
 * MAXIMUM SPRITE GRID PER CLASS — the authoring contract for art.
 *
 * Every actor of a class is drawn inside its class's grid, and art is authored
 * at exactly that size using transparency to carve the real silhouette. Sizes
 * are multiples of TILE and anchored on the player matching the classic NES
 * Mega Man sprite, with the rest scaled around it:
 *
 *   minion    smaller than the player — reads instantly as chaff
 *   player    the reference, 24x24, same as the original
 *   miniboss  bigger than a minion, smaller than a boss (reserved, unused)
 *   boss      significantly larger; covers the 2.0x tallest boss (Granite)
 *
 * ELITES SHARE THE MINION GRID. An elite is not a bigger minion — it is the
 * same silhouette with a gold rim. Size would be a poor tell anyway once the
 * ramp has been running, and reusing the grid means one piece of art per minion
 * covers both forms.
 *
 * These are CEILINGS, not the collision box. Collision stays separate (see the
 * hitbox note in config/feel.js) and gets tuned against the final art.
 */
export const SPRITE_CLASS = {
  minion:   { w: 16, h: 16 },
  player:   { w: PLAYER_SPRITE_W, h: PLAYER_SPRITE_H },
  miniboss: { w: 32, h: 32 },
  boss:     { w: 48, h: 48 },
};

/**
 * DRAW ORDER — explicit, because construction order alone is too easy to break
 * by reordering a literal.
 *
 * The PLAYER IS ALWAYS ON TOP of every world actor: hazards, pickups, minions,
 * projectiles and bosses. The player is the one thing that must never be
 * occluded, because losing track of it is losing the run. Only UI overlays go
 * above, and those live in UIScene, which renders as a whole scene above this
 * one. The gap between `boss` and `player` is deliberate headroom for future
 * world layers that still belong beneath the player.
 */
export const DEPTH = {
  background: 10,
  world: 20,   // terrain, spikes, platforms, boss doors
  pickups: 30,
  minions: 40,
  bullets: 50,
  boss: 60,
  player: 100,
};
