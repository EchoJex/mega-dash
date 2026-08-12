/**
 * BOSS DEATH — how each element falls apart.
 *
 * Five bosses have been beatable for a while and all five vanished on the frame
 * their HP hit zero, with a sound and nothing else. A boss that disappears reads
 * as a bug rather than as a victory: the one moment the fight was building
 * toward had no picture attached to it.
 *
 * WHAT THIS IS AND IS NOT. Every death here is drawn from rectangles, lines and
 * points — procedural effect, the same category as the placeholder arena
 * backdrops and the overworld terrain. It is NOT sprite art and it is not a
 * step toward any: the boss stays an honest rectangle at its true collision
 * footprint right up until it comes apart, and when the owner draws a real
 * silhouette this file keeps working unchanged because it only ever reads a box
 * and two palette colours.
 *
 * ONE SHAPE, KEYED ON ELEMENT. `element` already exists on every boss in
 * bosses.js, so a boss gains its death the moment it gains its element — no
 * registration, no per-boss wiring, and the twelve bosses whose fights are not
 * built yet still die properly the day they are.
 *
 * The bookkeeping in GameScene.killBoss (the unlock, the drops, the wrap door)
 * runs IMMEDIATELY and is not gated on this. A cosmetic sequence must never be
 * able to strand a run by failing partway through; the player can walk into the
 * door while the body is still coming apart, and that is fine.
 */

import { hexNum } from './assets.js';

/** How long a death plays, in fixed steps. Long enough to watch, short enough
 *  that it never delays walking to the door. */
export const DEATH_FRAMES = 100;

/**
 * Bits are seeded ONCE at death rather than spawned per frame, so the whole
 * sequence is deterministic from the moment it starts. A death that looked
 * different every time it was replayed would be impossible to tune against a
 * screenshot, and the fixed timestep already guarantees the rest of the frame.
 */
export function makeDeath(b) {
  const bits = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    bits.push({
      // Start spread through the body, not all at its centre: a boss coming
      // apart should look like the whole of it is failing at once.
      ox: (Math.random() - 0.5) * b.w,
      oy: (Math.random() - 0.5) * b.h,
      vx: Math.cos(a) * (0.6 + Math.random() * 1.4),
      vy: Math.sin(a) * (0.6 + Math.random() * 1.4),
      size: 2 + Math.floor(Math.random() * 3),
      spin: Math.random() * Math.PI,
      delay: Math.floor(Math.random() * 26),
    });
  }
  return {
    element: b.element || 'Typeless',
    x: b.x, y: b.y, w: b.w, h: b.h,
    primary: hexNum(b.primary), secondary: hexNum(b.secondary),
    outline: hexNum(b.outline || '#0A0A12'),
    bits,
    t: 0, max: DEATH_FRAMES,
    // Fighting is the one death with real motion of its own — he topples.
    lean: 0, vy: 0,
  };
}

/** Advance one death. Returns false once it is finished and can be dropped. */
export function stepDeath(d) {
  if (!d) return false;
  d.t++;
  const p = d.t / d.max;
  for (const bit of d.bits) {
    if (d.t < bit.delay) continue;
    bit.ox += bit.vx;
    bit.oy += bit.vy;
    bit.spin += 0.2;
    // Fire rises, everything else falls. That single sign flip is most of what
    // makes the two elements read differently at a glance.
    bit.vy += d.element === 'Fire' ? -0.035 : 0.055;
    bit.vx *= 0.985;
  }
  if (d.element === 'Fighting') {
    // He does not disintegrate — he goes down. The topple accelerates like a
    // falling body and stops flat, which is the whole Punch-Out picture.
    if (p > 0.25) d.lean = Math.min(1, d.lean + 0.035);
  }
  return d.t < d.max;
}

/** 1 at the start of a death, 0 at the end. */
const fade = (d) => Math.max(0, 1 - d.t / d.max);

/**
 * Draw one death. `sx` converts a world x to a screen x, exactly as every other
 * draw path in GameScene does, so shake and camera come for free.
 */
export function drawDeath(g, sx, d) {
  if (!d) return;
  const p = d.t / d.max;
  const a = fade(d);
  const cx = sx(d.x) + d.w / 2, cy = d.y + d.h / 2;

  switch (d.element) {
    // ── FIGHTING — a knockout, not an explosion ──────────────────────
    // He is a fighter. Fighters lose by hitting the mat, and blowing him up
    // would say the wrong thing about the one boss whose whole kit is fists.
    case 'Fighting': {
      const lean = d.lean;
      const h = d.h * (1 - lean * 0.72);        // folding down
      const w = d.w * (1 + lean * 0.55);        // and spreading out
      const x = sx(d.x) - (w - d.w) / 2;
      const y = d.y + (d.h - h);
      g.fillStyle(d.primary, Math.min(1, a + 0.35));
      g.fillRect(x, y, w, h);
      g.fillStyle(d.secondary, Math.min(1, a + 0.2));
      g.fillRect(x, y, w, Math.max(2, h * 0.28));
      g.lineStyle(1, d.outline, a);
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      // Impact dust, once he lands.
      if (lean >= 1) {
        g.fillStyle(0xB0A090, a * 0.5);
        const spread = (p - 0.6) * 90;
        g.fillRect(x - spread, y + h - 2, w + spread * 2, 2);
      }
      break;
    }

    // ── ELECTRIC — an overload ───────────────────────────────────────
    // Arcs whip out to the room and the strobe tightens until the body is just
    // light. Nothing falls: he does not break, he stops containing it.
    case 'Electric': {
      const strobe = Math.floor(d.t / Math.max(1, 5 - Math.floor(p * 4))) % 2 === 0;
      g.fillStyle(strobe ? 0xFFFFFF : d.primary, a);
      g.fillRect(sx(d.x), d.y, d.w, d.h);
      g.lineStyle(1, d.primary, a);
      for (const bit of d.bits) {
        if (d.t < bit.delay) continue;
        // Jagged, not straight — an arc that reads as a bolt rather than a ray.
        const mx = cx + bit.ox * 0.5 + Math.cos(bit.spin) * 6;
        const my = cy + bit.oy * 0.5 + Math.sin(bit.spin) * 6;
        g.lineBetween(cx, cy, mx, my);
        g.lineBetween(mx, my, cx + bit.ox * 2.2, cy + bit.oy * 2.2);
      }
      break;
    }

    // ── WATER — he sheets away ───────────────────────────────────────
    // The body drains from the top down and what leaves it falls as water,
    // which is the only element here that should look heavy.
    case 'Water': {
      const left = 1 - p;
      g.fillStyle(d.primary, a);
      g.fillRect(sx(d.x), d.y + d.h * (1 - left), d.w, d.h * left);
      for (const bit of d.bits) {
        if (d.t < bit.delay) continue;
        g.fillStyle(0x8FC7F0, a * 0.85);
        g.fillRect(cx + bit.ox, cy + bit.oy, 2, bit.size + 2);
      }
      break;
    }

    // ── FIRE — he burns down ─────────────────────────────────────────
    // Blackening from the bottom, embers drifting UP. The body is consumed
    // rather than broken, so the rectangle shrinks instead of scattering.
    case 'Fire': {
      const left = Math.max(0, 1 - p * 1.2);
      const h = d.h * left;
      g.fillStyle(0x1A0E08, a);
      g.fillRect(sx(d.x), d.y + d.h - (d.h - h), d.w, d.h - h);
      g.fillStyle(d.primary, a);
      g.fillRect(sx(d.x), d.y, d.w, h);
      g.fillStyle(0xF5A623, a);
      g.fillRect(sx(d.x), d.y + h - 2, d.w, 2);
      for (const bit of d.bits) {
        if (d.t < bit.delay) continue;
        g.fillStyle(bit.size > 3 ? 0xF5D328 : 0xE8541A, a * 0.9);
        g.fillRect(cx + bit.ox, cy + bit.oy, bit.size, bit.size);
      }
      break;
    }

    // ── TYPELESS and everything not yet given its own ────────────────
    // The classic: the body flashes out and a ring of debris leaves it. This is
    // the fallback for the twelve bosses whose slices have not happened, so it
    // has to look finished rather than like a placeholder.
    default: {
      if (p < 0.35) {
        g.fillStyle(d.t % 6 < 3 ? 0xFFFFFF : d.primary, 1);
        g.fillRect(sx(d.x), d.y, d.w, d.h);
      }
      for (const bit of d.bits) {
        if (d.t < bit.delay) continue;
        g.fillStyle(bit.size > 3 ? d.secondary : d.primary, a);
        g.fillRect(cx + bit.ox, cy + bit.oy, bit.size, bit.size);
      }
      break;
    }
  }
}
