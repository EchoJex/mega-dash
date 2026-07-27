/**
 * ASSETS — placeholder / sprite abstraction.
 *
 * THE POINT OF THIS FILE
 * ----------------------
 * Every drawable actor declares itself once, here. At draw time it resolves to
 * EITHER a procedural placeholder rectangle OR real pixel art, depending on
 * whether art exists yet.
 *
 * So "I finally drew Blaze Man" is a two-step change with no code edits:
 *   1. drop  public/sprites/blaze.png  into the project
 *   2. add   blaze: { file: 'blaze.png', frameW: 42, frameH: 42 }  to MANIFEST
 *
 * Everything else — hitboxes, physics, AI, palette swapping — is unaffected,
 * because none of it ever touches the art. You can do this per boss, in any
 * order, over months, and the game stays playable the whole time.
 *
 * WHY RECTANGLES AND NOT ROUGH SILHOUETTES
 * ----------------------------------------
 * A boss's silhouette should follow from its attacks and its arena. Those are
 * not designed yet for most of the 17. Drawing shapes now would mean designing
 * blind and redoing the work later, so bosses are honest rectangles at their
 * true collision footprint until their fight exists.
 *
 * SPRITE BOX vs COLLISION BOX
 * ---------------------------
 * These are deliberately different sizes and this file only ever describes the
 * *sprite* box. Collision comes from config/feel.js. Keeping them separate is
 * what makes hits feel precise-but-fair — see the hitbox note in feel.js.
 */

import { PLAYER_SPRITE_W, PLAYER_SPRITE_H } from '../config/display.js';

/**
 * Real art, once it exists. Empty today — every lookup falls through to a
 * placeholder. Keys are actor ids (boss id, weapon id, 'player', enemy type).
 *
 * @example
 *   export const MANIFEST = {
 *     player: { file: 'player.png', frameW: 24, frameH: 24,
 *               anims: { idle: [0], run: [1,2,3,4], jump: [5] } },
 *     blaze:  { file: 'blaze.png',  frameW: 42, frameH: 42 },
 *   };
 */
export const MANIFEST = {};

export const hasArt = (id) => Object.prototype.hasOwnProperty.call(MANIFEST, id);

/** Queue every declared sprite for loading. No-op while MANIFEST is empty. */
export function preloadArt(scene) {
  for (const [id, def] of Object.entries(MANIFEST)) {
    scene.load.spritesheet(id, `sprites/${def.file}`, {
      frameWidth: def.frameW,
      frameHeight: def.frameH,
    });
  }
}

/**
 * Draw an actor. Uses real art if the manifest has it, otherwise draws the
 * placeholder. Callers never branch on this themselves.
 *
 * @param {Phaser.GameObjects.Graphics} g   placeholder draw target
 * @param {object} actor  { id, x, y, w, h, palette, facing }
 */
export function drawActor(g, actor) {
  if (hasArt(actor.id)) return; // sprite path handles itself; see spriteFor()
  drawPlaceholder(g, actor);
}

/**
 * Placeholder: a filled rect in the actor's primary colour, a secondary band
 * to hint at an accent, and the shared near-black outline.
 *
 * The outline is not decoration — it is the third colour of the 3-colour NES
 * palette and it is what stops a dark actor from dissolving into the dark
 * background.
 */
export function drawPlaceholder(g, actor) {
  const { x, y, w, h, palette } = actor;
  const primary = hexNum(palette.primary);
  const secondary = hexNum(palette.secondary);
  const outline = hexNum(palette.outline || '#0A0A12');

  g.fillStyle(primary, 1);
  g.fillRect(x, y, w, h);

  // accent band across the upper third — reads as a "head" and shows which
  // colour is the secondary without needing real art
  g.fillStyle(secondary, 1);
  g.fillRect(x, y, w, Math.max(2, Math.round(h * 0.28)));

  g.lineStyle(1, outline, 1);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/**
 * Placeholder projectile shapes. 17 distinguishable forms so weapons read
 * differently on screen before any art exists. Replaced in Phases 9-11.
 */
export function drawProjectile(g, b, frame) {
  const c = hexNum(b.color);
  const r = b.radius;
  g.fillStyle(c, 1);
  switch (b.shape) {
    case 'wheel':
      g.fillCircle(b.x, b.y, r);
      g.fillStyle(0xffcc00, 1);
      g.fillRect(b.x - r * 0.3, b.y - r * 0.3, r * 0.6, r * 0.6);
      break;
    case 'stream':
      g.fillRect(b.x - r * 2, b.y - r * 0.5, r * 4, r);
      break;
    case 'spark':
      for (let i = 0; i < 3; i++) {
        g.fillRect(b.x - r + i * r, b.y + (i % 2 ? -r : r) * 0.6, r, r * 0.5);
      }
      break;
    case 'lash':
      g.fillRect(b.x - r * 2, b.y - r * 0.35, r * 4, r * 0.7);
      break;
    case 'shard':
      g.fillTriangle(b.x + r, b.y, b.x - r, b.y - r, b.x - r, b.y + r);
      break;
    case 'punch':
      g.fillCircle(b.x, b.y, r * 1.2);
      break;
    case 'spray':
      for (let i = 0; i < 3; i++) {
        const a = frame * 0.1 + i * 2.1;
        g.fillCircle(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, r * 0.6);
      }
      break;
    case 'wave':
      g.fillRect(b.x - r * 1.5, b.y - r * 0.4, r * 3, r * 0.8);
      g.fillRect(b.x - r * 0.8, b.y - r, r * 1.6, r * 2);
      break;
    case 'tornado':
      g.fillEllipse(b.x, b.y, r * 1.2, r * 2.4);
      break;
    case 'orb':
      g.fillCircle(b.x, b.y, r);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(b.x - r * 0.3, b.y - r * 0.3, r * 0.35);
      break;
    case 'swarm':
      for (let i = 0; i < 4; i++) {
        const a = frame * 0.4 + i * 1.6;
        g.fillRect(b.x + Math.cos(a) * r - 1, b.y + Math.sin(a) * r - 1, 2, 2);
      }
      break;
    case 'rock':
      g.fillRect(b.x - r, b.y - r * 0.8, r * 2, r * 1.6);
      break;
    case 'wisp':
      for (let i = 0; i < 3; i++) {
        g.fillStyle(c, 1 - i * 0.3);
        g.fillCircle(b.x - i * r * 0.7, b.y, r * (1 - i * 0.22));
      }
      break;
    case 'breath':
      g.fillTriangle(b.x - r * 1.4, b.y - r * 0.7, b.x + r * 1.2, b.y, b.x - r * 1.4, b.y + r * 0.7);
      break;
    case 'boomerang':
      g.fillRect(b.x - r, b.y - r * 0.3, r * 2, r * 0.6);
      g.fillRect(b.x - r * 0.3, b.y - r, r * 0.6, r * 2);
      break;
    case 'blade':
      g.fillRect(b.x - r * 1.2, b.y - r * 0.25, r * 2.4, r * 0.5);
      g.fillRect(b.x - r * 0.25, b.y - r * 1.2, r * 0.5, r * 2.4);
      break;
    default: // 'bolt'
      g.fillRect(b.x - r, b.y - r * 0.5, r * 2, r);
  }
}

/**
 * Vertical half-extent of each projectile shape, as a multiple of its radius.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Duplicator upgrade stacks echo volleys above and below the real shot, and
 * they have to sit CLOSE without overlapping. That is only possible if the
 * spacing is derived from how tall each shape actually draws — and the shapes
 * vary wildly. A 'lash' is a thin bar at 0.35r; a 'spray' is a ring of orbiting
 * blobs reaching 1.6r. Spacing them all by `radius` would leave the lash with a
 * visible gap and still overlap the spray.
 *
 * These numbers are read straight off drawProjectile() below. If you change a
 * shape's drawing, change its entry here in the same edit — this file owns both
 * halves of that contract deliberately, and the same will be true when real art
 * replaces the placeholders in Phases 9-11.
 */
export const SHAPE_HALF_H = {
  wheel: 1, stream: 0.5, spark: 1.1, lash: 0.35, shard: 1,
  punch: 1.2, spray: 1.6, wave: 1, tornado: 1.2, orb: 1,
  swarm: 1.2, rock: 0.8, wisp: 1, breath: 0.7, boomerang: 1,
  blade: 1.2, bolt: 0.5,
};

/** Drawn half-height of a projectile in px, for spacing duplicate volleys. */
export const projectileHalfHeight = (shape, radius) =>
  radius * (SHAPE_HALF_H[shape] ?? SHAPE_HALF_H.bolt);

/** Pickups: a bright core in a dark shell so they read against any terrain. */
export function drawPickup(g, p, style, frame) {
  const bob = Math.sin(frame * 0.12 + p.anim * 0.05) * 0.8;
  const y = p.y + bob;
  g.fillStyle(hexNum('#0A0A12'), 1);
  g.fillRect(p.x - 1, y - 1, p.w + 2, p.h + 2);
  g.fillStyle(hexNum(style.primary), 1);
  g.fillRect(p.x, y, p.w, p.h);
  g.fillStyle(hexNum(style.secondary), 1);
  // E-Tanks get a cross, EXP gets a bar — distinguishable without colour alone
  if (p.type === 'etank') {
    g.fillRect(p.x + 3, y + 1, 1, 5);
    g.fillRect(p.x + 1, y + 3, 5, 1);
  } else {
    g.fillRect(p.x + 1, y + 3, 5, 1);
  }
}

/** '#RRGGBB' -> 0xRRGGBB */
export const hexNum = (s) => parseInt(String(s).replace('#', ''), 16);

/** Sprite footprint for an actor id, falling back to its collision size. */
export function spriteSize(id, fallbackW, fallbackH) {
  if (hasArt(id)) return { w: MANIFEST[id].frameW, h: MANIFEST[id].frameH };
  if (id === 'player') return { w: PLAYER_SPRITE_W, h: PLAYER_SPRITE_H };
  return { w: fallbackW, h: fallbackH };
}
