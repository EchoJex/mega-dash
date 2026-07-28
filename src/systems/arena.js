/**
 * ARENAS — the sealed room a boss is fought in.
 *
 * A run alternates between two kinds of space:
 *
 *   AREA    the endless procedural stream. Its background is themed to the
 *           boss whose door is coming, so the arena is foreshadowed before you
 *           ever reach it.
 *   ARENA   exactly one screen, walled left and right, floored and ceilinged.
 *           Camera locked. No ambient minions. The boss and its hazards only.
 *
 * The door does not open into the arena — it WARPS you there. Contact freezes
 * everything, fades to black, builds the room while nothing is visible, then
 * fades back in and resumes. Nothing should ever be seen half-constructed.
 *
 * On the boss's death a WRAP DOOR appears, which warps back out to a fresh area
 * themed to the next boss in the bag.
 *
 * ONE SCREEN WIDE is deliberate: it matches the NES boss rooms this is modelled
 * on, it means the camera never has to make a decision, and it guarantees the
 * whole fight is always visible.
 */

import { VIEW_H } from '../config/display.js';
import { hexNum } from './assets.js';

/** Frames for each stage of the warp. Fade out, build, fade in. */
export const WARP = { out: 16, hold: 6, in: 18 };

/**
 * Build the sealed room for a boss.
 *
 * `floorY` matches the area's ground line so the player's footing does not jump
 * across the transition, and the walls sit exactly on the screen edges.
 */
export function makeArena(bossDef, layer, viewW, floorY) {
  return {
    boss: bossDef,
    layer,
    x0: 0,
    x1: viewW,
    floorY,
    ceilY: 0,
    // Platforms are per-boss furniture (Blaze Man's phasing shelter, Core Man's
    // turret mounts). Empty until each boss's arena is actually built.
    platforms: [],
    // Hazard state lives here rather than on the boss, because the ambient loop
    // keeps running regardless of what the boss is doing.
    hazards: [],
    theme: themeFor(bossDef),
  };
}

/**
 * Placeholder backdrop for a boss, derived from its palette.
 *
 * Real arena art arrives as MANIFEST key `background:<bossId>`. Until then a
 * darkened wash of the boss's own primary is enough to make each room feel
 * distinct and to make the foreshadowing legible — you can tell Blaze Man is
 * next because the area ahead of you is going red.
 */
export function themeFor(bossDef) {
  if (!bossDef) return { fill: 0x060614, id: null };
  const n = hexNum(bossDef.primary);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const k = 0.16; // heavily darkened — a backdrop must never fight the actors
  const mix = (c) => Math.round(6 + c * k);
  return {
    id: bossDef.id,
    fill: (mix(r) << 16) | (mix(g) << 8) | mix(b),
  };
}

/** Keep the player inside the sealed room. */
export function clampToArena(arena, p, w = 24) {
  if (p.x < arena.x0) { p.x = arena.x0; p.vx = 0; }
  if (p.x + w > arena.x1) { p.x = arena.x1 - w; p.vx = 0; }
  if (p.y < arena.ceilY) { p.y = arena.ceilY; p.vy = 0; }
}

/**
 * Screen shake, in whole virtual pixels.
 *
 * Whole pixels only: the game renders at a fixed 224px and integer-scales up, so
 * a fractional offset would break pixel alignment and shimmer. Blaze Man's
 * hazards use the intensity as their tell, so this needs to read clearly at
 * three distinct strengths.
 */
export function shakeOffset(shake) {
  if (!shake || shake.t <= 0) return { x: 0, y: 0 };
  const mag = shake.mag * (shake.t / shake.dur);
  return {
    x: Math.round((Math.random() * 2 - 1) * mag),
    y: Math.round((Math.random() * 2 - 1) * mag),
  };
}

export function stepShake(shake) {
  if (shake && shake.t > 0) shake.t--;
  return shake;
}

/** Draw the sealed room: walls, ceiling, floor. */
export function drawArena(g, arena, viewW, shake) {
  const sx = shake?.x || 0, sy = shake?.y || 0;

  g.fillStyle(arena.theme.fill, 1);
  g.fillRect(0, 0, viewW, VIEW_H);

  // Floor
  g.fillStyle(0x0a1628, 1);
  g.fillRect(sx, arena.floorY + sy, viewW, VIEW_H - arena.floorY);
  g.fillStyle(0x1a3050, 1);
  g.fillRect(sx, arena.floorY + sy, viewW, 2);

  // Sealed walls and ceiling — thin, so the play space stays a full screen
  g.fillStyle(0x141c2c, 1);
  g.fillRect(sx - 4, sy, 4, VIEW_H);
  g.fillRect(arena.x1 + sx, sy, 4, VIEW_H);
  g.fillRect(sx, sy - 4, viewW, 4);
  g.fillStyle(0x1a3050, 1);
  g.fillRect(sx, sy, viewW, 1);

  for (const pl of arena.platforms) {
    g.fillStyle(0x1a3a60, 1);
    g.fillRect(pl.x + sx, pl.y + sy, pl.w, pl.h);
  }
}
