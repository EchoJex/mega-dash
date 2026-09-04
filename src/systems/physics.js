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
    // `rooted` is a weapon planting the player for the duration of a move — the
    // Thorn Lash's "stand still while shooting". It zeroes the INPUT rather than
    // the velocity, so friction still brings you to a stop over a frame or two
    // and being rooted reads as bracing rather than as hitting a wall.
    // `airControl` is the Gale Vortex's glide: horizontal authority while
    // airborne, and only while airborne.
    const dir = input.rooted ? 0 : input.moveDir;
    const target = dir * FEEL.moveSpeed
      * (p.sliding ? slideMult : 1) * (input.speedMult ?? 1)
      * (p.onGround ? 1 : (input.airControl ?? 1));
    p.vx = target === 0
      ? p.vx * (1 - FEEL.friction)
      : p.vx + (target - p.vx) * FEEL.accel;
    if (Math.abs(p.vx) < 0.01) p.vx = 0;
    p.x += p.vx;
    if (dir !== 0) p.facing = input.moveDir;
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
    // A glide caps the DESCENT only, never the rise: the Gale Vortex slows a
    // fall, it does not turn every jump into a float. Applied after the clamp
    // so it is a tighter terminal velocity rather than a second acceleration.
    if (input.fallCap != null && p.vy > input.fallCap) p.vy = input.fallCap;
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
      /**
       * A MOVING SURFACE CARRIES WHAT IS STANDING ON IT.
       *
       * There was no ride logic anywhere in the project: the landing was
       * resolved and nothing else. Tempest Man's floating barrels and Strike
       * Man's swinging bags both join `world.platforms` via their `solid` flag,
       * so both slid out from under a standing player — who then appeared to
       * drift backwards across the room with no input, which reads as the
       * controls having stopped responding rather than as the floor moving.
       *
       * Here rather than per-prop, because every current and future moving
       * solid routes through this one loop. `vx` is enough: it is what every
       * moving solid in the game is driven by, and the vertically-driven ones
       * (Blaze Man's layer-3 lift) are already kept attached by the landing
       * resolution above re-seating the player each frame.
       */
      if (pl.vx) p.x += pl.vx;
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

    /**
     * LANDING vs LEDGE GRAB — the same test used to serve both, and that is the
     * whole of the cliff bug.
     *
     * There was no depth limit here: as long as any probe was over a span and
     * your box had passed the floor plane, you were snapped up onto it. Walk
     * off a ledge, hold back toward it, and the game hauled you out of the pit
     * from most of a body down. Every ledge was quietly two dozen pixels taller
     * than it looked.
     *
     * The two cases are told apart by HOW you got below the plane:
     *
     *   landing  you were above it last frame and crossed it this frame. The
     *            overshoot can be a whole frame of falling — up to terminal
     *            velocity — so the tolerance has to be `vy`, not a constant, or
     *            a fast fall punches through the floor.
     *   grab     you were already below it and horizontal movement brought you
     *            back over the span. THIS is the thing Cliff Edge Mastery buys,
     *            and at rank 0 it barely exists.
     */
    const depth = (box.y + box.h) - groundY;
    if (supported && depth >= 0) {
      const landing = depth <= Math.max(1, p.vy) + 1;
      const reach = input.cliffGrab ?? FEEL.cliffGrabDepth[0];

      if (landing) {
        settleOnGround(p, groundY);
      } else if (depth <= reach) {
        // THE SAVE IS VISIBLE. Ranks 1-3 hang on the wall for a beat before
        // hauling up, so being rescued reads as being rescued rather than as
        // the floor twitching under you.
        //
        // The hold PINS the height it caught at. Merely zeroing vy is not
        // enough: gravity re-applies at the top of the next step, so the player
        // would sink a few pixels over the hold and — at a depth near the
        // rank's limit — sink straight back out of range, cancelling the rescue
        // it had already committed to. Sticking to a wall means not moving.
        if (p.cliffStick == null) {
          p.cliffStick = input.cliffStick ?? FEEL.cliffStickFrames;
          p.cliffY = p.y;
        }
        p.y = p.cliffY;
        p.vy = 0;
        if (p.cliffStick > 0) p.cliffStick--;
        else settleOnGround(p, groundY);
      }
    }
    // Clear of the plane again: any half-finished grab is forgotten.
    if (!p.onGround && depth < 0) p.cliffStick = null;
    resolvePitWalls(p, world, groundY, input.cliffGrab ?? FEEL.cliffGrabDepth[0]);
  }

  if (p.y < 0) { p.y = 0; p.vy = 0; }
}

/**
 * PITS HAVE SIDES.
 *
 * `groundSpans` are horizontal runs at one height, so nothing in this file ever
 * stopped the player sideways — the arena's own walls are the only horizontal
 * collision in the game. Fall into a pit at an angle and you carried straight
 * on under the ledge you had just left, inside the terrain, which is the
 * reported "falling diagonally into a pit passes through the wall".
 *
 * THE FACE IS SOLID ONLY BELOW THE CLIFF-GRAB REACH. Above that the lip has to
 * stay permeable, or drifting back over it could never trigger the rescue that
 * Cliff Edge Mastery buys — the grab works by being over a span while below the
 * plane, which is exactly the state this would otherwise forbid.
 *
 * Pushing out the SHORTER way is right for the shape this can occur in: you are
 * already inside the pit when you touch a wall, so the near edge is the one you
 * fell past.
 */
function resolvePitWalls(p, world, groundY, reach) {
  if (p.onGround) return;
  const box = hitboxOf(p);
  if ((box.y + box.h) - groundY <= reach) return;
  for (const s of world.groundSpans) {
    if (box.x + box.w <= s.x1 || box.x >= s.x2) continue;
    const outLeft = s.x1 - (box.x + box.w);
    const outRight = s.x2 - box.x;
    p.x += Math.abs(outLeft) <= Math.abs(outRight) ? outLeft : outRight;
    p.vx = 0;
    return;
  }
}

/**
 * Put the player down on the ground plane and refresh everything a landing
 * refreshes. Shared by a real landing and by a completed ledge grab, so the two
 * can never disagree about what touching down means.
 */
function settleOnGround(p, groundY) {
  const off = p.sliding ? FEEL.playerHitboxSlide.offY : FEEL.playerHitbox.offY;
  const h = p.sliding ? FEEL.playerHitboxSlide.h : FEEL.playerHitbox.h;
  p.y = groundY - h - off;
  p.vy = 0;
  p.onGround = true;
  p.airActions = FEEL.maxAirActions;
  p.djPause = 0;
  p.cliffStick = null;
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
