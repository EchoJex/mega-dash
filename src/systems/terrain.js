/**
 * TERRAIN — procedural, world-space, generated ahead of the camera.
 *
 * The world is not a level; it is an endless stream of ground spans with gaps
 * (pits) between them, plus spikes and one-way platforms. Everything is
 * generated just beyond the right edge of view and pruned once safely behind.
 *
 * Because there are no hand-placed levels, there is no level editor and no
 * tilemap to author. That is also why a code-first engine suits this project.
 */

import { FEEL } from '../config/feel.js';

const SPAN_MIN = 40, SPAN_MAX = 96;
const PIT_MIN = 22;
const PIT_CHANCE = 0.30;
const SPIKE_CHANCE = 0.38;
const PLATFORM_CHANCE = 0.42;
const LOOKAHEAD = 160;
/** Ground guaranteed on the far side of a pit — room to land and to turn. */
const LANDING_MIN = 30;

const rand = (a, b) => a + Math.random() * (b - a);

/**
 * How far a running jump actually carries, SIMULATED from the live FEEL values.
 *
 * Derived rather than guessed, because it has to stay true when the motion
 * constants are tuned. A hand-written "max pit is 40" silently becomes a lie the
 * moment gravity or jump velocity moves, and the failure mode is a gap the
 * player cannot cross and cannot see the far side of.
 */
export function jumpReach() {
  let vy = FEEL.jumpVelocity, y = 0, x = 0, guard = 0;
  while (guard++ < 600) {
    vy = Math.min(FEEL.maxFallSpeed, vy + FEEL.gravity);
    y += vy;
    x += FEEL.moveSpeed;
    if (y >= 0) break;                    // back down to take-off height
  }
  return x;
}

/**
 * The widest pit the generator may emit.
 *
 * The margin matters: `jumpReach()` is the ABSOLUTE best case — taking off from
 * the last pixel of the ledge at full walk speed, holding jump for full height,
 * and landing on the first pixel of the far side. A gap that needs all three at
 * once is not a jump, it is a trick. 0.75 leaves room to be slightly early,
 * slightly slow, or slightly short and still make it.
 */
export const maxPitWidth = () => Math.floor(jumpReach() * 0.75);

export function makeWorld(startX, groundY) {
  return {
    groundSpans: [{ x1: startX - 240, x2: startX + 180 }],
    spikes: [],
    platforms: [],
    doors: [],
    genX: startX + 180,
    groundY,
    // Whether the last thing emitted was a pit. Two pits in a row used to be
    // possible and compounded into an uncrossable gap — see generate().
    lastWasPit: false,
  };
}

export function generate(world, camX, viewW) {
  const target = camX + viewW + LOOKAHEAD;
  const pitMax = maxPitWidth();
  let guard = 0;
  while (world.genX < target && guard++ < 40) {
    // A pit is simply the absence of a ground span. Falling in is not fatal —
    // it deals FEEL.hazardDamage and beams the player back onto solid ground.
    //
    // A pit is ALWAYS followed by ground. The pit branch used to `continue`
    // straight back into another pit roll, so gaps compounded: with a 30% pit
    // chance, ~8% of all gaps came out wider than a jump could clear, and the
    // worst ran to several hundred pixels. Damage-and-beam made those survivable
    // but not passable — the run simply could not continue rightward.
    if (!world.lastWasPit && Math.random() < PIT_CHANCE) {
      world.lastWasPit = true;
      world.genX += rand(PIT_MIN, pitMax);
      continue;
    }

    const afterPit = world.lastWasPit;
    world.lastWasPit = false;
    const w = Math.max(afterPit ? LANDING_MIN : 0, rand(SPAN_MIN, SPAN_MAX));
    const x1 = world.genX, x2 = x1 + w;
    world.groundSpans.push({ x1, x2 });

    if (w > 56 && Math.random() < SPIKE_CHANCE) {
      const sw = rand(12, 24);
      // Keep spikes off the landing edge: a spike bed exactly where a forced
      // jump has to put you is a hit you were never given the chance to avoid.
      const lead = afterPit ? LANDING_MIN : 16;
      const hi = Math.max(lead, w - sw - 16);
      world.spikes.push({ x: x1 + rand(lead, hi), y: world.groundY - 7, w: sw, h: 7 });
    }
    if (Math.random() < PLATFORM_CHANCE) {
      const pw = rand(28, 52);
      world.platforms.push({
        x: x1 + rand(0, Math.max(1, w - pw)),
        y: world.groundY - rand(26, 78),
        w: pw, h: 5,
      });
    }
    world.genX = x2;
  }
}

export function prune(world, camX) {
  const behind = camX - 120;
  world.groundSpans = world.groundSpans.filter((s) => s.x2 > behind);
  world.spikes = world.spikes.filter((s) => s.x + s.w > behind);
  world.platforms = world.platforms.filter((p) => p.x + p.w > behind);
  world.doors = world.doors.filter((d) => d.alive && d.x > behind);
}

/** A boss door every doorIntervalSeconds, on solid ground we guarantee. */
export function maybeSpawnDoor(world, camX, viewW, elapsedFrames) {
  const every = FEEL.doorIntervalSeconds * 60;
  if (world.doors.length || elapsedFrames === 0 || elapsedFrames % every !== 0) return;
  const x = camX + viewW + 40;
  world.groundSpans.push({ x1: x - 30, x2: x + 46 });
  world.doors.push({ x, y: world.groundY, w: 16, h: 28, alive: true });
}
