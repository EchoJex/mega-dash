/**
 * PHYSICS — hand-rolled, deliberately.
 *
 * WHY NOT PHASER ARCADE PHYSICS
 * -----------------------------
 * Mega Man-grade precision comes from deterministic, integer-ish, fully
 * predictable motion: instant max speed, no acceleration ramp, exact repeatable
 * landings, and collision resolution we control frame by frame. A general
 * purpose AABB solver introduces sub-pixel drift, resolution order surprises,
 * and tunneling edge cases that are very hard to tune out afterwards.
 *
 * So Phaser owns rendering, input, scenes, audio and the asset pipeline, and
 * this file owns movement. That split is intentional — do not "upgrade" this to
 * Arcade or Matter physics.
 *
 * All motion is per fixed 1/60s step (see config/display.js FIXED_DT). Never
 * multiply by a variable delta in here.
 */

import { FEEL } from '../config/feel.js';

/** Axis-aligned overlap test. */
export const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Current collision box for an actor, honouring the slide crouch. */
export function hitboxOf(p) {
  const hb = p.sliding ? FEEL.playerHitboxSlide : FEEL.playerHitbox;
  return { x: p.x + hb.offX, y: p.y + hb.offY, w: hb.w, h: hb.h };
}

/**
 * Is there solid ground under this world x?
 * Terrain is a list of {x1,x2} spans; the gaps between them are pits.
 */
export const isOverGround = (world, wx) =>
  world.groundSpans.some((s) => wx >= s.x1 && wx <= s.x2);

/**
 * Advance the player one fixed step.
 *
 * Order matters: horizontal first, then vertical, then ground resolution. That
 * ordering is what makes landing on a ledge edge behave predictably rather than
 * occasionally clipping into it.
 */
export function stepPlayer(p, world, input, groundY) {
  // ── Flinch overrides control ───────────────────────────────────────
  if (p.flinchTimer > 0) {
    p.flinchTimer--;
    p.x += p.knockbackVx;
    p.knockbackVx *= FEEL.knockbackDecay;
  } else {
    // Instant-response horizontal movement. accel/friction default to 1.0,
    // i.e. no ramp at all — that snap is a genre signature.
    // `speedMult` is the Stun attribute's stacking slow. It defaults to 1 so
    // every other caller — and every test — is unaffected by its existence.
    const slideMult = FEEL.slideSpeedMult * (p.slideSpeedBonus || 1);
    const target = input.moveDir * FEEL.moveSpeed
      * (p.sliding ? slideMult : 1) * (input.speedMult ?? 1);
    p.vx = target === 0
      ? p.vx * (1 - FEEL.friction)
      : p.vx + (target - p.vx) * FEEL.accel;
    if (Math.abs(p.vx) < 0.01) p.vx = 0;
    p.x += p.vx;
    if (input.moveDir !== 0) p.facing = input.moveDir;
  }

  // ── Slide timer ────────────────────────────────────────────────────
  if (p.sliding && --p.slideTimer <= 0) p.sliding = false;

  // ── Jump buffering + coyote time ───────────────────────────────────
  // Both exist so inputs that were *almost* right still work: a press slightly
  // before landing still jumps, and a press slightly after walking off a ledge
  // still jumps. Cheap, and a large part of feeling fair.
  if (p.jumpBuffer > 0) p.jumpBuffer--;
  if (p.onGround) p.coyote = FEEL.coyoteFrames;
  else if (p.coyote > 0) p.coyote--;

  if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
    // `jumpMult` is terrain drag on the launch — wading in Tempest Man's floor
    // water. It scales the IMPULSE, so a half-strength jump reaches a quarter
    // of the height; that is the intent, and the tracker's phrase is "half the
    // jump strength" rather than half the height.
    p.vy = FEEL.jumpVelocity * (input.jumpMult ?? 1);
    p.onGround = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    p.airActions = FEEL.maxAirActions;
    p.djPause = 0;
  }

  // ── Variable jump height ───────────────────────────────────────────
  // Releasing jump while still rising cuts the arc short. This is what makes
  // precise platforming possible; do not remove it.
  if (!input.jumpHeld && p.vy < 0 && !p.jumpCut) {
    p.vy *= FEEL.jumpCutMult;
    p.jumpCut = true;
  }
  if (p.onGround) p.jumpCut = false;

  // ── The double jump's hang ─────────────────────────────────────────
  // Vertical motion is frozen outright for a few frames — not slowed, not
  // lightened — while horizontal velocity carries on untouched. The second jump
  // fires on the frame the hang ends, using the SAME gravity and the same
  // release-to-cut rule as the first one, so the two jumps feel like the same
  // move at two heights rather than two different systems.
  if (p.djPause > 0) {
    p.vy = 0;
    if (--p.djPause === 0) {
      // Peak height goes as v^2/2g, so an 80% HEIGHT target needs sqrt(0.8) of
      // the velocity. See the note in feel.js.
      p.vy = FEEL.jumpVelocity * Math.sqrt(FEEL.doubleJumpHeightMult);
      p.jumpCut = false;              // the new jump gets its own variable height
    }
    p.y += p.vy;
  } else {
    p.vy = Math.min(p.vy + FEEL.gravity, FEEL.maxFallSpeed);
    p.y += p.vy;
  }

  // ── Vertical resolution ────────────────────────────────────────────
  p.onGround = false;
  const box = hitboxOf(p);

  // one-way platforms: only solid when falling onto them from above
  for (const pl of world.platforms) {
    if (p.vy < 0) break;
    if (overlaps(box, pl) && box.y + box.h - p.vy <= pl.y + 2) {
      p.y = pl.y - (box.h + (p.sliding ? FEEL.playerHitboxSlide.offY : FEEL.playerHitbox.offY));
      p.vy = 0;
      p.onGround = true;
      p.airActions = FEEL.maxAirActions;
      p.djPause = 0;
      break;
    }
  }

  // solid ground, but only where a span actually exists — the gaps are pits.
  // Probed at an inset from the sprite edges so you can stand with boots
  // overhanging a ledge, which is the classic landing-on-a-sliver look.
  if (!p.onGround) {
    const probe = box.x + box.w / 2;
    const inset = FEEL.groundProbeInset;
    const supported =
      isOverGround(world, probe) ||
      isOverGround(world, box.x + inset) ||
      isOverGround(world, box.x + box.w - inset);
    if (supported && box.y + box.h >= groundY) {
      const off = p.sliding ? FEEL.playerHitboxSlide.offY : FEEL.playerHitbox.offY;
      const h = p.sliding ? FEEL.playerHitboxSlide.h : FEEL.playerHitbox.h;
      p.y = groundY - h - off;
      p.vy = 0;
      p.onGround = true;
      p.airActions = FEEL.maxAirActions;
      p.djPause = 0;
    }
  }

  if (p.y < 0) { p.y = 0; p.vy = 0; }
}

/** Queue a jump. Buffered so a slightly-early press still lands. */
export function requestJump(p) {
  if (p.onGround || p.coyote > 0) {
    p.jumpBuffer = FEEL.jumpBufferFrames;
  } else if (p.airActions > 0) {
    // Double jump: hang first, launch second. stepPlayer fires the impulse when
    // the hang runs out — doing it here instead would cancel the pause the bug
    // report specifically asked for.
    p.airActions--;
    p.djPause = FEEL.doubleJumpPauseFrames;
    return 'double';
  } else {
    // Airborne with nothing left: remember the press in case a landing arrives
    // within the buffer window. It is NOT a jump yet, and must not sound like one.
    p.jumpBuffer = FEEL.jumpBufferFrames;
    return 'buffered';
  }
  return 'jump';
}

/**
 * Begin a slide, taking its properties from the player's Slide Mastery rank.
 *
 * The rank's modifiers are captured ONTO the player at slide start rather than
 * read live each frame, so a slide already in progress keeps the shape it began
 * with. Returns false if the slide is unavailable — including rank 0, where the
 * ability is not yet unlocked at all.
 */
export function startSlide(p, opts = {}) {
  if (!p.onGround || p.sliding) return false;
  if ((opts.rank ?? 1) < 1) return false;
  p.sliding = true;
  p.slideTimer = Math.round(FEEL.slideDurationFrames * (opts.durMult ?? 1));
  p.slideSpeedBonus = opts.speedBonus ?? 1;
  return true;
}

export function cancelSlide(p) {
  if (!p.sliding) return false;
  p.sliding = false;
  p.slideTimer = 0;
  return true;
}

/**
 * Camera: follows once the player passes the deadzone, and never scrolls back
 * left. Walking backwards is allowed but does not rewind the world.
 */
export function stepCamera(cam, p, viewW) {
  const target = p.x - viewW * FEEL.camDeadzone;
  if (target > cam.x) cam.x += (target - cam.x) * FEEL.camLerp;
  return cam.x;
}
