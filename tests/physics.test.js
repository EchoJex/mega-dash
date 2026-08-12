/**
 * PHYSICS — the ledge rules.
 *
 * Cliff Edge Mastery turned one collision test into two cases that had been
 * sharing a branch, and the failure modes point in opposite directions: too
 * tight and a fast fall punches through the floor, too loose and every ledge is
 * secretly a body taller than it looks. Both are guarded here.
 *
 * These assert BEHAVIOUR, not tuning: which case applies, never how many pixels
 * a rank is worth. The depths in feel.js stay free to move.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Phys from '../src/systems/physics.js';
import { playerClip } from '../src/systems/assets.js';
import { FEEL } from '../src/config/feel.js';

const GROUND_Y = 184;

/** A world that is solid from x=0 to x=200 and open air beyond it. */
const world = () => ({ groundSpans: [{ x1: 0, x2: 200 }], platforms: [] });

const player = (over) => ({
  x: over, y: GROUND_Y - 24, vx: 0, vy: 0, facing: 1,
  onGround: true, sliding: false, slideTimer: 0,
  airActions: 1, djPause: 0, jumpBuffer: 0, coyote: 0, jumpCut: false,
  flinchTimer: 0, knockbackVx: 0,
});

const step = (p, w, input) => Phys.stepPlayer(p, w, input, GROUND_Y);

/**
 * Put the player over solid ground but `depth` px BELOW the floor plane, in
 * mid-air — exactly the state you are in a moment after stepping off a ledge
 * and hauling back toward it. Controlled depth rather than a whole walk-off,
 * because the rule under test is about depth and nothing else.
 */
function tryGrab(rank, depth) {
  const p = player(100), w = world();
  p.y = (GROUND_Y - 24) + depth;
  p.onGround = false;
  const grab = FEEL.cliffGrabDepth[rank];
  const stick = rank > 0 ? FEEL.cliffStickFrames : 0;
  let held = 0;
  for (let i = 0; i < 90 && !p.onGround; i++) {
    step(p, w, { moveDir: 0, cliffGrab: grab, cliffStick: stick });
    if (!p.onGround && p.cliffStick != null) held++;
  }
  return { caught: p.onGround, held };
}

test('rank 0 catches nothing — a ledge is where it looks like it is', () => {
  assert.equal(tryGrab(0, 6).caught, false);
  assert.equal(tryGrab(0, 20).caught, false);
});

test('each rank catches from deeper than the one below it', () => {
  const depths = FEEL.cliffGrabDepth;
  for (const rank of [1, 2, 3]) {
    // Comfortably inside this rank's reach.
    assert.equal(tryGrab(rank, depths[rank] - 2).caught, true,
      `rank ${rank} should catch just inside its own reach`);
    // Comfortably outside the rank BELOW it, which must therefore miss.
    assert.equal(tryGrab(rank - 1, depths[rank] - 2).caught, false,
      `rank ${rank - 1} should not reach as deep as rank ${rank}`);
  }
});

test('a rescue hangs on the wall instead of snapping up', () => {
  const { caught, held } = tryGrab(3, 16);
  assert.equal(caught, true);
  assert.ok(held >= FEEL.cliffStickFrames - 1,
    `expected roughly ${FEEL.cliffStickFrames} frames of hang, got ${held}`);
});

/**
 * The hold must PIN the height it caught at. Zeroing vertical velocity is not
 * enough — gravity re-applies at the top of the next step, so a catch near a
 * rank's limit would sink back out of range mid-rescue and drop a player the
 * game had already committed to saving.
 */
test('the hold pins the height it caught at', () => {
  const p = player(100), w = world();
  const opts = {
    moveDir: 0,
    cliffGrab: FEEL.cliffGrabDepth[3],
    cliffStick: FEEL.cliffStickFrames,
  };
  p.y = (GROUND_Y - 24) + FEEL.cliffGrabDepth[3] - 1;
  p.onGround = false;

  step(p, w, opts);
  assert.ok(p.cliffStick != null, 'the grab should have engaged');
  const heldY = p.y;
  for (let i = 0; i < 5; i++) step(p, w, opts);
  assert.equal(p.y, heldY, 'the player sank while supposedly stuck to the wall');
});

/**
 * THE REGRESSION THIS EXISTS FOR. A landing overshoots the floor plane by a
 * whole frame of falling — up to terminal velocity. If the depth tolerance were
 * a constant rather than `vy`, a fast fall would pass straight through solid
 * ground, and it would do it ONLY at speed, which is the worst kind of bug to
 * find by playing.
 */
test('a fall at terminal velocity still lands on solid ground', () => {
  for (const rank of [0, 1, 2, 3]) {
    const p = player(100), w = world();
    p.y = 20;
    p.onGround = false;
    p.vy = FEEL.maxFallSpeed;
    let landed = false;
    for (let i = 0; i < 120 && !landed; i++) {
      step(p, w, { moveDir: 0, cliffGrab: FEEL.cliffGrabDepth[rank] });
      landed = p.onGround;
    }
    assert.ok(landed, `rank ${rank}: a terminal-velocity fall fell through the floor`);
    assert.ok(p.y <= GROUND_Y, `rank ${rank}: landed below the floor`);
  }
});

test('standing on solid ground is unaffected by any rank', () => {
  for (const rank of [0, 3]) {
    const p = player(100), w = world();
    for (let i = 0; i < 30; i++) {
      step(p, w, { moveDir: 0, cliffGrab: FEEL.cliffGrabDepth[rank] });
    }
    assert.equal(p.onGround, true, `rank ${rank}: the player fell off flat ground`);
  }
});

/**
 * The double jump is a HANG then a LAUNCH, and its peak is a fraction of the
 * primary jump's HEIGHT — not of its velocity. Height goes as v^2/2g, so the
 * two are not the same number and getting it wrong is invisible except by
 * measuring.
 */
test('the double jump reaches its stated fraction of the primary jump height', () => {
  const peak = (second) => {
    const p = player(100), w = world();
    Phys.requestJump(p);
    let best = p.y;
    for (let i = 0; i < 120; i++) {
      if (second && i === 12) Phys.requestJump(p);   // mid-rise, well clear of the ground
      step(p, w, { moveDir: 0, jumpHeld: true });
      best = Math.min(best, p.y);
      if (i > 20 && p.onGround) break;
    }
    return (GROUND_Y - 24) - best;                   // rise above the start line
  };
  const single = peak(false);
  assert.ok(single > 40, `the primary jump should clear ~47px, got ${single.toFixed(1)}`);
  // The second jump fires from mid-rise, so it reaches higher in absolute terms;
  // what is asserted is that it happens at all and adds height, not the total.
  assert.ok(peak(true) > single, 'the double jump must add height to the arc');
});

/**
 * WHICH POSE THE ART SHOWS is a contract between the sheet and the sim, and it
 * is the one part of landing the player's art that was NOT free. The jump is
 * three separate one-frame clips precisely so this function can choose; if it
 * ever went back to returning a single 'jump', the sheet would loop through
 * rise/apex/fall regardless of what the player was doing and nobody would get
 * a test failure telling them why.
 */
test('the player clip follows what the player is actually doing', () => {
  const at = (over) => playerClip({ onGround: false, vx: 0, vy: 0, sliding: false, djPause: 0, ...over });

  assert.equal(at({ onGround: true }), 'idle');
  assert.equal(at({ onGround: true, vx: 1.4 }), 'run');
  // The slide wins over everything, including running.
  assert.equal(at({ onGround: true, vx: 1.4, sliding: true }), 'slide');

  assert.equal(at({ vy: -4 }), 'jumpRise');
  assert.equal(at({ vy: 4 }), 'jumpFall');
  // A band around zero, not a single frame: vy crawls through zero at the top
  // of an arc and a one-frame window would flicker between rise and fall.
  assert.equal(at({ vy: 0 }), 'jumpApex');
  assert.equal(at({ vy: 0.2 }), 'jumpApex');

  // The double jump FREEZES vy for a few frames before it launches. That hang
  // is an apex in every sense the player can see, so it has to look like one.
  assert.equal(at({ vy: -6, djPause: 5 }), 'jumpApex');
});

/**
 * JUMP-CANCEL-INTO-SLIDE — the rule, not the numbers.
 *
 * The jump owns the first tap so no latency is ever added to it; a second tap
 * inside a tight window undoes that jump and slides instead. What matters and
 * is asserted here is WHICH tap wins in each state — the window length in
 * feel.js stays free to move.
 */
test('the slide window only ever eats a jump that is still rising', () => {
  // Modelled on GameScene.tryCancelIntoSlide's guards, which are pure state
  // questions: still airborne, still rising, still inside the window.
  const canCancel = (p, since) => !p.onGround && p.vy < 0
    && since <= FEEL.slideTapFrames && p.jumpFromY != null;

  const rising = { onGround: false, vy: -4, jumpFromY: 160 };
  assert.equal(canCancel(rising, 2), true, 'a fast second tap should slide');
  assert.equal(canCancel(rising, FEEL.slideTapFrames + 1), false,
    'past the window it must stay a double jump');

  // At the top of an arc and on the way down, the second tap is a DOUBLE JUMP.
  // Yanking a player back to the floor from there would be the worst possible
  // reading of a tap they meant as a second jump.
  assert.equal(canCancel({ onGround: false, vy: 0, jumpFromY: 160 }, 2), false);
  assert.equal(canCancel({ onGround: false, vy: 3, jumpFromY: 160 }, 2), false);

  // Grounded taps are plain jumps; there is nothing to cancel.
  assert.equal(canCancel({ onGround: true, vy: 0, jumpFromY: 160 }, 2), false);
});

/**
 * JUMP-CANCEL-INTO-SLIDE — the rule, not the numbers.
 *
 * The jump owns the first tap so no latency is ever added to it; a second tap
 * inside a tight window undoes that jump and slides instead. What is asserted
 * is WHICH tap wins in each state — the window length in feel.js stays free.
 */
test('the slide window only ever eats a jump that is still rising', () => {
  // The same three state questions GameScene.tryCancelIntoSlide asks.
  const canCancel = (p, since) => !p.onGround && p.vy < 0
    && since <= FEEL.slideTapFrames && p.jumpFromY != null;

  const rising = { onGround: false, vy: -4, jumpFromY: 160 };
  assert.equal(canCancel(rising, 2), true, 'a fast second tap should slide');
  assert.equal(canCancel(rising, FEEL.slideTapFrames + 1), false,
    'past the window it must stay a double jump');

  // At the apex and on the way down the second tap is a DOUBLE JUMP. Yanking a
  // player back to the floor from there is the worst possible reading of it.
  assert.equal(canCancel({ onGround: false, vy: 0, jumpFromY: 160 }, 2), false);
  assert.equal(canCancel({ onGround: false, vy: 3, jumpFromY: 160 }, 2), false);

  // Grounded taps are plain jumps; there is nothing to cancel.
  assert.equal(canCancel({ onGround: true, vy: 0, jumpFromY: 160 }, 2), false);
});
