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

/**
 * Generation randomness is INJECTABLE.
 *
 * Production passes nothing and gets Math.random. Tests pass a seeded generator,
 * which turns the traversability checks from a probabilistic sample into a
 * deterministic sweep over many seeds — a rare seed that produced an uncrossable
 * world would otherwise only fail the build sometimes, which is worse than not
 * testing it at all. (An earlier unseeded threshold in those tests failed ~54%
 * of CI runs while passing locally.)
 */
const rand = (rng, a, b) => a + rng() * (b - a);

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

/** Peak height an impulse of `v0` reaches under the live gravity. */
function riseFrom(v0) {
  let vy = v0, y = 0, peak = 0, guard = 0;
  while (guard++ < 600) {
    vy = Math.min(FEEL.maxFallSpeed, vy + FEEL.gravity);
    y += vy;
    peak = Math.min(peak, y);
    if (y >= 0) break;
  }
  return -peak;
}

/**
 * How high the player can actually GET, simulated from the live FEEL values for
 * the same reason `jumpReach` is: a hand-written number becomes a lie the
 * moment the motion constants are tuned.
 *
 * THIS IS THE PLATFORMING BUG. The ceiling here was hardcoded at 96px, and the
 * band it clamped ran to 78 before a theme multiplier of up to 1.5 was applied
 * — numbers from before the double jump's height was cut. The best case is now
 * ~85px, and that is with the second jump fired exactly on the first one's
 * apex and both held to full height. So the generator was emitting shelves that
 * were flatly unreachable, and bunching a good share of the rest right at the
 * edge of frame-perfect. It did not read as "that platform is too high", it
 * read as the jump feeling wrong.
 *
 * The double is measured from the primary's apex, which is the best a player
 * can time it. `maxAirActions` at 0 correctly collapses this to one jump.
 */
export function jumpRise() {
  const first = riseFrom(FEEL.jumpVelocity);
  if (FEEL.maxAirActions < 1) return first;
  return first + riseFrom(FEEL.jumpVelocity * Math.sqrt(FEEL.doubleJumpHeightMult));
}

/**
 * The highest platform the generator may emit.
 *
 * Same 0.75 margin as `maxPitWidth`, for the same reason: the simulated reach
 * is the absolute best case, and a shelf that needs a frame-perfect apex double
 * jump is not a platform, it is a trick. The slack is what leaves room to be
 * slightly early, slightly late, or slightly off-centre and still make it.
 */
export const maxPlatformHeight = () => Math.floor(jumpRise() * 0.75);

/** Lowest platform worth generating — below this it is a step, not a shelf. */
const PLAT_MIN = 26;

/**
 * TERRAIN THEMES — the overworld leans toward the boss whose door is coming.
 *
 * The backdrop already foreshadows the next boss; the ground did not, so every
 * stretch between doors played identically no matter who was ahead. A theme
 * nudges the SHAPE of the run — how pitted, how high, how spiky, how many
 * platforms — so approaching Gale Man feels airy and approaching Granite Man
 * feels like a slab, without needing any new art or any new mechanics.
 *
 * These are multipliers on the base numbers, deliberately mild: this is flavour,
 * and the traversability guarantee in generate() still binds absolutely. Nothing
 * here can produce a gap a jump cannot clear.
 *
 * NOT the sealed boss arenas. Those backdrops are the owner's to draw.
 */
export const THEMES = {
  //          pit     span    spike   plat    height  (multipliers / bias)
  gale:     { pit: 1.30, span: 0.75, spike: 0.8, plat: 1.6, high: 1.5 },  // airy, broken
  psi:      { pit: 1.15, span: 0.85, spike: 0.9, plat: 1.5, high: 1.4 },
  wraith:   { pit: 1.20, span: 0.85, spike: 1.0, plat: 1.3, high: 1.2 },
  granite:  { pit: 0.55, span: 1.40, spike: 0.9, plat: 0.5, high: 0.6 },  // solid slabs
  quake:    { pit: 0.70, span: 1.30, spike: 1.1, plat: 0.6, high: 0.7 },
  alloy:    { pit: 0.85, span: 1.15, spike: 1.3, plat: 0.9, high: 0.9 },  // industrial
  strike:   { pit: 0.80, span: 1.20, spike: 1.2, plat: 0.8, high: 0.8 },  // arena floors
  blaze:    { pit: 1.20, span: 0.90, spike: 1.3, plat: 1.0, high: 1.0 },  // broken, hostile
  drake:    { pit: 1.10, span: 0.95, spike: 1.3, plat: 1.1, high: 1.2 },
  torrent:  { pit: 1.25, span: 0.90, spike: 0.7, plat: 1.2, high: 0.9 },  // channels
  frost:    { pit: 1.10, span: 1.00, spike: 0.8, plat: 1.2, high: 1.1 },
  thorn:    { pit: 0.95, span: 0.95, spike: 1.2, plat: 1.4, high: 1.3 },  // overgrown
  swarm:    { pit: 1.00, span: 0.90, spike: 1.1, plat: 1.5, high: 1.3 },
  venom:    { pit: 1.05, span: 0.95, spike: 1.4, plat: 1.1, high: 1.0 },
  volt:     { pit: 1.05, span: 1.00, spike: 1.2, plat: 1.3, high: 1.2 },
  eclipse:  { pit: 1.15, span: 0.90, spike: 1.2, plat: 1.2, high: 1.1 },
  core:     { pit: 1.00, span: 1.00, spike: 1.0, plat: 1.0, high: 1.0 },  // the neutral baseline
};

const NEUTRAL = THEMES.core;

/**
 * The TERRAIN shape multipliers for a boss's approach — how wide his pits are,
 * how tall his platforms sit.
 *
 * NOT EXPORTED, AND NOT CALLED `themeFor`. `arena.js` exports a `themeFor` too
 * and it answers a completely different question: the sealed room's BACKDROP
 * colour. Two exported functions with one name across two modules the same
 * scene imports is a trap that costs nothing to avoid — `import { themeFor }`
 * from the wrong one type-checks, runs, and gives you a silently wrong world.
 * Nothing outside this file ever needed it.
 */
const terrainShape = (bossId) => THEMES[bossId] || NEUTRAL;

export function makeWorld(startX, groundY, bossId = null, rng = Math.random) {
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
    theme: terrainShape(bossId),
    themeId: bossId,
    rng,
  };
}

export function generate(world, camX, viewW) {
  const target = camX + viewW + LOOKAHEAD;
  const pitMax = maxPitWidth();
  const platMax = maxPlatformHeight();
  const th = world.theme || NEUTRAL;
  const rng = world.rng || Math.random;
  // Themed chances are clamped so no theme can push the world past what the
  // generator's own guarantees assume — flavour never overrides traversability.
  const pitChance = Math.min(0.42, PIT_CHANCE * th.pit);
  const spikeChance = Math.min(0.6, SPIKE_CHANCE * th.spike);
  const platChance = Math.min(0.85, PLATFORM_CHANCE * th.plat);
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
    if (!world.lastWasPit && rng() < pitChance) {
      world.lastWasPit = true;
      world.genX += rand(rng, PIT_MIN, pitMax);
      continue;
    }

    const afterPit = world.lastWasPit;
    world.lastWasPit = false;
    const w = Math.max(afterPit ? LANDING_MIN : 0, rand(rng, SPAN_MIN, SPAN_MAX) * th.span);
    const x1 = world.genX, x2 = x1 + w;
    world.groundSpans.push({ x1, x2 });

    if (w > 56 && rng() < spikeChance) {
      const sw = rand(rng, 12, 24);
      // Keep spikes off the landing edge: a spike bed exactly where a forced
      // jump has to put you is a hit you were never given the chance to avoid.
      const lead = afterPit ? LANDING_MIN : 16;
      const hi = Math.max(lead, w - sw - 16);
      world.spikes.push({ x: x1 + rand(rng, lead, hi), y: world.groundY - 7, w: sw, h: 7 });
    }
    if (rng() < platChance) {
      const pw = rand(rng, 28, 52);
      // The theme biases the height WITHIN what a jump can reach; the cap binds
      // absolutely, exactly like the pit-width guarantee above. Flavour never
      // overrides reachability.
      const h = Math.min(platMax, rand(rng, PLAT_MIN, platMax) * th.high);
      world.platforms.push({
        x: x1 + rand(rng, 0, Math.max(1, w - pw)),
        y: world.groundY - h,
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
