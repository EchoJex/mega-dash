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
 * RENDER SCALE — real pixels per virtual pixel.
 *
 * The virtual coordinate system stays exactly 224 tall; this only changes how
 * DENSELY it is rasterised. The canvas backing store becomes RENDER_SCALE times
 * larger and every camera zooms by the same amount, so one virtual pixel is
 * always an exact RENDER_SCALE-by-RENDER_SCALE block. Sprites stay perfectly
 * crisp, and gameplay is untouched — nothing reads this but the renderer.
 *
 * WHY: at 1x the canvas held only 224 real vertical pixels, so a 7px label was
 * a 7px bitmap and there was physically nowhere for a legible glyph to live.
 * Text `resolution` cannot help there — it renders a larger glyph and then
 * point-samples it back down into the same 224 pixels, which deletes strokes
 * and visibly fragments letters. Density is the only lever that adds detail.
 *
 * This is NOT a violation of the fixed-resolution rule: no gameplay value comes
 * from it, and the playfield is the same 224 virtual pixels on every device.
 */
function pickRenderScale() {
  // Node (tests) has no window; any value works there since nothing renders.
  const h = globalThis.innerHeight;
  if (!h) return 3;
  const physical = h * (globalThis.devicePixelRatio || 1);
  // Aim for roughly one real device pixel per rasterised pixel, so the browser's
  // final scale is close to 1:1 and neither blurs nor drops detail. Clamped:
  // below 2 there is nothing to gain, above 5 the buffer grows for no visible
  // benefit on any phone.
  return Math.max(2, Math.min(5, Math.round(physical / VIEW_H)));
}

export const RENDER_SCALE = pickRenderScale();

/**
 * WHAT pickRenderScale() ACTUALLY SAW — dev HUD only, never read by gameplay.
 *
 * RENDER_SCALE is chosen once from the viewport the browser reports at startup,
 * and a platform change can move that number without anything in this project
 * changing: Android 15's forced edge-to-edge lays the window out behind the
 * system bars, so the WebView reports a taller viewport and the density can jump
 * a whole step. One step from 4 to 5 is 56% more real pixels per frame, which is
 * felt and not seen — the game looks identical and runs worse.
 *
 * Diagnosing that from a phone with no debugger means guessing, so the numbers
 * go on screen in dev mode instead.
 */
/**
 * Which CI build this is, stamped in at bundle time by vite.config.js.
 *
 * "dev" for a local build, otherwise the same number as the APK's versionCode,
 * the updater's comparison value, and the GitHub release. One number, so a bug
 * report can name the build it came from without anyone having to remember.
 */
export const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

export const DISPLAY_DIAG = {
  cssW: Math.round(globalThis.innerWidth || 0),
  cssH: Math.round(globalThis.innerHeight || 0),
  dpr: globalThis.devicePixelRatio || 1,
  scale: RENDER_SCALE,
};

/** Virtual view width, independent of how densely the canvas is rasterised. */
export const viewWidthOf = (scaleManager) =>
  Math.round(scaleManager.gameSize.width / RENDER_SCALE);

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
