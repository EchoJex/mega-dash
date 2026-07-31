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
import * as Attr from './attributes.js';

/** Frames for each stage of the warp. Fade out, build, fade in. */
export const WARP = { out: 16, hold: 6, in: 18 };

/**
 * Build the sealed room for a boss.
 *
 * `floorY` matches the area's ground line so the player's footing does not jump
 * across the transition, and the walls sit exactly on the screen edges.
 */
export function makeArena(bossDef, layer, viewW, floorY) {
  const a = {
    boss: bossDef,
    layer,
    x0: 0,
    x1: viewW,
    floorY,
    ceilY: 0,
    // Per-boss furniture, built by FURNITURE below.
    platforms: [],
    turrets: [],
    // Terrain attributes (Hot ground and the like) live here, not on the boss:
    // they outlive whatever created them.
    patches: [],
    // Rising liquid, as a height above the floor. Blaze Man floods with lava,
    // Tempest Man stands in water — same field, different meaning per boss.
    liquid: null,
    drain: null,
    // A constant push applied to the player each frame (rain, current).
    push: { x: 0, y: 0 },
    // Hazard state lives here rather than on the boss, because the ambient loop
    // keeps running regardless of what the boss is doing.
    hazards: [],
    theme: themeFor(bossDef),
  };
  FURNITURE[bossDef?.id]?.(a, layer, viewW, floorY);
  return a;
}

/**
 * ARENA FURNITURE — the geometry each boss's designed hazards need to exist.
 *
 * Built here rather than in the hazard loop because it is the ROOM, not the
 * event: Core Man's turrets are bolted to the ceiling whether or not they are
 * currently firing, and Tempest Man's drain is in the floor before the water
 * arrives. Only the three bosses whose tracker entries are written have entries;
 * everything else gets a bare room, which is correct rather than missing.
 */
const FURNITURE = {
  /**
   * CORE MAN — "plain light grey room with a couple of small ceiling turrets".
   * Two turrets, mounted on the ceiling, inset from the walls so their spread
   * covers the room rather than firing into a corner.
   */
  core(a, layer, viewW) {
    a.turrets = [0.28, 0.72].map((f) => ({
      x: Math.round(viewW * f) - 5, y: a.ceilY, w: 10, h: 7, flash: 0,
    }));
  },

  /**
   * BLAZE MAN — "a few short platforms phase in and out in random places
   * throughout the entire fight as shelter."
   *
   * Phase state is per platform with staggered timers, so shelter appears and
   * disappears independently and you are never left with no option at all. The
   * lava field exists from the start at height 0; only layer 3 raises it.
   */
  blaze(a, layer, viewW, floorY) {
    const n = 3;
    a.platforms = Array.from({ length: n }, (_, i) => ({
      x: Math.round(viewW * (0.18 + 0.3 * i)) - 22,
      y: floorY - 42 - (i % 2) * 26,
      w: 44, h: 5,
      // Solid while `on`; phase timers are staggered so they never all vanish
      // on the same frame.
      on: true, t: 150 + i * 70, hot: 0,
    }));
    a.liquid = { kind: 'lava', h: 0, target: 0, rise: 0.22, hold: 0 };
  },

  /**
   * TEMPEST MAN — corner portholes pouring down the walls, knee-deep floor
   * water with an inward current, and a grate-covered central drain with a
   * damaging spike ball sitting on it.
   */
  torrent(a, layer, viewW, floorY) {
    a.portholes = [
      { x: a.x0 + 6, y: a.ceilY + 14, dir: 1 },
      { x: a.x1 - 16, y: a.ceilY + 14, dir: -1 },
    ];
    a.drain = {
      x: Math.round(viewW / 2) - 14, w: 28, y: floorY,
      // The spike ball rides on the grate. Layer 2 also makes the grate itself
      // damaging, per the tracker.
      ball: { x: Math.round(viewW / 2), y: floorY - 7, r: 6, bob: 0 },
      grateHurts: layer >= 2,
    };
    a.liquid = { kind: 'water', h: 9, target: 9, rise: 0.1, hold: 0 };
  },
};

/** Which bosses have their arena furniture built. Read by `npm run status`. */
export const FURNISHED = () => Object.keys(FURNITURE);

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

/**
 * Advance the room itself: phasing platforms, rising liquid, patch lifetimes.
 *
 * Separate from the hazard loop on purpose. The room keeps breathing whether or
 * not a hazard is mid-cycle, and the boss's own attacks read the same state —
 * Blaze Man's layer-3 flood is triggered by his attack but owned by the arena.
 */
export function stepArena(arena) {
  if (!arena) return;
  Attr.stepPatches(arena.patches);

  for (const pl of arena.platforms) {
    if (pl.hot > 0) pl.hot--;
    if (--pl.t > 0) continue;
    pl.on = !pl.on;
    pl.t = pl.on ? 220 + Math.random() * 160 : 90 + Math.random() * 70;
  }
  // NEVER let every platform be gone at once — the tracker calls them shelter,
  // and shelter you cannot reach is just a death sentence with extra steps.
  if (arena.platforms.length && !arena.platforms.some((p) => p.on)) {
    const p = arena.platforms[0];
    p.on = true; p.t = 200;
  }

  const q = arena.liquid;
  if (q) {
    if (q.h < q.target) q.h = Math.min(q.target, q.h + q.rise);
    else if (q.h > q.target) q.h = Math.max(q.target, q.h - q.rise * 0.7);
    if (q.hold > 0 && --q.hold === 0) q.target = q.kind === 'lava' ? 0 : q.target;
  }

  for (const t of arena.turrets) if (t.flash > 0) t.flash--;
  if (arena.drain) arena.drain.ball.bob += 0.06;
}

/** Surface height of the arena's liquid, in world Y. Infinity when there is none. */
export const liquidTop = (arena) =>
  arena?.liquid && arena.liquid.h > 0.5 ? arena.floorY - arena.liquid.h : Infinity;

/** Draw the sealed room: walls, ceiling, floor, furniture, attributes. */
export function drawArena(g, arena, viewW, shake) {
  const sx = shake?.x || 0, sy = shake?.y || 0;

  g.fillStyle(arena.theme.fill, 1);
  g.fillRect(0, 0, viewW, VIEW_H);
  drawBackdrop(g, arena, viewW, sx, sy);

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

  // Drain and its spike ball sit IN the floor, so they draw before the liquid.
  if (arena.drain) {
    const d = arena.drain;
    g.fillStyle(0x061020, 1);
    g.fillRect(d.x + sx, d.y + sy, d.w, VIEW_H - d.y);
    g.fillStyle(d.grateHurts ? 0x8a3040 : 0x2a4a70, 1);
    for (let i = 2; i < d.w; i += 5) g.fillRect(d.x + i + sx, d.y + sy, 2, 3);
    const by = d.ball.y + Math.sin(d.ball.bob) * 1.5;
    g.fillStyle(0x9aa4b4, 1);
    g.fillCircle(d.ball.x + sx, by + sy, d.ball.r);
    g.fillStyle(0xd8dee8, 1);
    for (let i = 0; i < 8; i++) {
      const th = (i / 8) * Math.PI * 2;
      g.fillRect(d.ball.x + Math.cos(th) * d.ball.r - 1 + sx, by + Math.sin(th) * d.ball.r - 1 + sy, 2, 2);
    }
  }

  // Phasing platforms. A platform mid-phase is drawn hollow so you can read that
  // it is about to leave rather than discovering it underfoot.
  for (const pl of arena.platforms) {
    const going = pl.on && pl.t < 45;
    if (!pl.on) {
      g.lineStyle(1, 0x1a3a60, 0.35);
      g.strokeRect(pl.x + sx + 0.5, pl.y + sy + 0.5, pl.w - 1, pl.h - 1);
      continue;
    }
    g.fillStyle(pl.hot > 0 ? 0xB03018 : 0x1a3a60, going ? 0.55 : 1);
    g.fillRect(pl.x + sx, pl.y + sy, pl.w, pl.h);
  }

  // Ceiling turrets, with a muzzle flash while firing.
  for (const t of arena.turrets) {
    g.fillStyle(0x39404e, 1);
    g.fillRect(t.x + sx, t.y + sy, t.w, t.h);
    g.fillStyle(t.flash > 0 ? 0xffd070 : 0x6b7686, 1);
    g.fillRect(t.x + t.w / 2 - 1 + sx, t.y + t.h + sy, 2, 3);
  }

  // Terrain attributes: a translucent wash that fades as the attribute subsides.
  for (const p of arena.patches) {
    g.fillStyle(Attr.ATTR[p.id]?.tint ?? 0xffffff, Attr.patchAlpha(p));
    g.fillRect(p.x + sx, p.y + sy, p.w, p.h);
  }

  // Liquid last, so it covers the floor furniture it is supposed to submerge.
  const q = arena.liquid;
  if (q && q.h > 0.5) {
    const top = arena.floorY - q.h;
    const body = q.kind === 'lava' ? 0xC0300C : 0x14508A;
    const skin = q.kind === 'lava' ? 0xFF9A2E : 0x5CADD5;
    g.fillStyle(body, q.kind === 'lava' ? 1 : 0.55);
    g.fillRect(sx, top + sy, viewW, arena.floorY - top + 2);
    g.fillStyle(skin, 0.9);
    g.fillRect(sx, top + sy, viewW, 1);
  }
}

/**
 * Placeholder backdrops, one per themed boss. These are shapes, not art — the
 * point is that each room is recognisable at a glance before any PNG exists.
 * Real art replaces them via MANIFEST key `background:<bossId>`.
 */
function drawBackdrop(g, arena, viewW, sx, sy) {
  const id = arena.theme.id;
  if (id === 'core') {
    // "Background shall be of various size metal gears"
    g.fillStyle(0x2a2f38, 1);
    const gears = [[60, 60, 22], [150, 38, 14], [250, 66, 28], [340, 44, 18], [430, 72, 12]];
    for (const [gx, gy, r] of gears) {
      if (gx > viewW + r) continue;
      g.fillCircle(gx + sx * 0.4, gy + sy * 0.4, r);
      g.fillStyle(0x1e222a, 1);
      g.fillCircle(gx + sx * 0.4, gy + sy * 0.4, r * 0.45);
      g.fillStyle(0x2a2f38, 1);
    }
  } else if (id === 'blaze') {
    // "Silhouette of a faintly glowing active volcano"
    const bx = viewW * 0.5, base = arena.floorY;
    g.fillStyle(0x2A1410, 1);
    g.fillTriangle(bx - 96 + sx * 0.3, base + sy * 0.3, bx + 96 + sx * 0.3, base + sy * 0.3, bx + sx * 0.3, 52 + sy * 0.3);
    g.fillStyle(0x8A2A10, 0.7);
    g.fillTriangle(bx - 16 + sx * 0.3, 66 + sy * 0.3, bx + 16 + sx * 0.3, 66 + sy * 0.3, bx + sx * 0.3, 50 + sy * 0.3);
  } else if (id === 'torrent') {
    // "High seas, tempest" — a heaving horizon behind the room
    g.fillStyle(0x0C2340, 1);
    for (let i = 0; i < 4; i++) {
      const y = 70 + i * 22;
      g.fillRect(sx * 0.3, y + sy * 0.3, viewW, 10 - i);
    }
  }
}
