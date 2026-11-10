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
  tempest:  { pit: 1.25, span: 0.90, spike: 0.7, plat: 1.2, high: 0.9 },  // channels
  frost:    { pit: 1.10, span: 1.00, spike: 0.8, plat: 1.2, high: 1.1 },
  thorn:    { pit: 0.95, span: 0.95, spike: 1.2, plat: 1.4, high: 1.3 },  // overgrown
  swarm:    { pit: 1.00, span: 0.90, spike: 1.1, plat: 1.5, high: 1.3 },
  venom:    { pit: 1.05, span: 0.95, spike: 1.4, plat: 1.1, high: 1.0 },
  volt:     { pit: 1.05, span: 1.00, spike: 1.2, plat: 1.3, high: 1.2 },
  eclipse:  { pit: 1.15, span: 0.90, spike: 1.2, plat: 1.2, high: 1.1 },
  proto:     { pit: 1.00, span: 1.00, spike: 1.0, plat: 1.0, high: 1.0 },  // the neutral baseline
};

const NEUTRAL = THEMES.proto;

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

/**
 * AREAS THAT CLIMB — the first is Ghost's grave tower, and the owner means to add verticality to
 * several levels (9 Nov 2026: "i will soon be adding verticality to several levels, so develop the
 * code to support it now"). A boss listed here gets a tower instead of the endless stream.
 *
 * Ghost's, in the owner's words (7 Nov 2026): "This level will only be 3 full screen widths wide.
 * beyond this 3 screen wide scrolling, all other platforming and scrolling will be done in the
 * vertical as the player ascends this grave tower ... periodically there will be a staircase that, at
 * the top, is a one way passable platform that spans the whole level width as checkpoints. all other
 * platforms should have randomized widths no narrower than the current standard platform"; then
 * (8 Nov 2026) "1a and b. The idea is that these checkpoint-like contiguous platforms will prevent
 * extreme fall heights. 2 the ghost boss will be in the upper right"; and (9 Nov 2026) five walkways,
 * the camera following a fall back down.
 *
 * `width` is fixed in world pixels, never the screen's: three of the widest screens (480), so the
 * tower is the same level on every phone.
 */
export const CLIMBS = {
  wraith: { width: 1440, walkways: 5 },
};
export const CLIMB_TIER = 40, CLIMB_TIERS = 7, CLIMB_WALL = 14, STAIR_STEPS = 10, STAIR_STEP = 8, PLATFORM_MIN = 44;

/**
 * A tower: a floor the whole width, walls at each side, tier on tier of one-way platforms climbing in a
 * zigzag, and every seven tiers a staircase up to a walkway the whole width (a checkpoint). Every
 * platform is one-way, so a missed jump drops onto whatever is below and a walkway catches any fall.
 * The boss door stands at the right end of the top walkway. Heights are counted up from the floor.
 */
export function makeClimb(spec, groundY, bossId, rng = Math.random) {
  const W = spec.width, platforms = [], route = [];
  const at = (h) => groundY - h;
  let x = 80, dir = 1;
  const step = () => {
    let nx = x + dir * rand(rng, 56, 86);
    if (nx > W - 100 || nx < 100) { dir = -dir; nx = x + dir * rand(rng, 56, 86); }
    return nx;
  };
  const top = spec.walkways * CLIMB_TIERS * CLIMB_TIER;
  for (let base = 0; base < top; base += CLIMB_TIERS * CLIMB_TIER) {
    for (let k = 1; k < CLIMB_TIERS - 1; k++) {   // tiers 1 to 5; tier 5's platform is the stair's foot
      const h = base + k * CLIMB_TIER, nx = step();
      const w = k === CLIMB_TIERS - 2 ? 64 : Math.round(rand(rng, PLATFORM_MIN, 88));
      platforms.push({ x: nx - w / 2, y: at(h), w, h: 5 });
      route.push([nx, h]);
      x = nx;
      if (k === CLIMB_TIERS - 2) {   // the staircase: ten steps of eight, up from the platform's far end to the walkway
        const run = STAIR_STEP * STAIR_STEPS, room = (d) => (d > 0 ? nx + 32 + run < W - CLIMB_WALL - 8 : nx - 32 - run > CLIMB_WALL + 8);
        if (!room(dir)) dir = -dir;   // no room ahead: the stair turns back over the platform's other end
        for (let s = 0; s < STAIR_STEPS; s++) {
          const sx = dir > 0 ? nx + 32 + STAIR_STEP * s : nx - 32 - STAIR_STEP * (s + 1);
          platforms.push({ x: sx, y: at(h + (s + 1) * STAIR_STEP), w: STAIR_STEP + 2, h: 5, step: true });
        }
        x = nx + dir * (32 + run);
      }
    }
    const wh = base + CLIMB_TIERS * CLIMB_TIER;
    platforms.push({ x: CLIMB_WALL, y: at(wh), w: W - 2 * CLIMB_WALL, h: 5, walk: true });
    route.push([x, wh]);
  }
  return {
    groundSpans: [{ x1: 0, x2: W }],
    spikes: [],
    platforms,
    doors: [{ x: W - CLIMB_WALL - 40, y: at(top), w: 16, h: 28, alive: true }],
    genX: Infinity,
    groundY,
    lastWasPit: false,
    theme: terrainShape(bossId),
    themeId: bossId,
    rng,
    // What only a climb has: its width, its walkways' heights (as screen y), the highest the
    // player has stood on (the camera never goes back below it), and the route the tests walk.
    climb: { width: W, walks: platforms.filter((p) => p.walk).map((p) => p.y), reached: groundY, top: at(top) - 200, route },
  };
}

export function makeWorld(startX, groundY, bossId = null, rng = Math.random) {
  if (CLIMBS[bossId]) return makeClimb(CLIMBS[bossId], groundY, bossId, rng);
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
  if (world.climb) return;   // a tower is built whole
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
  if (world.climb) return;
  const behind = camX - 120;
  world.groundSpans = world.groundSpans.filter((s) => s.x2 > behind);
  world.spikes = world.spikes.filter((s) => s.x + s.w > behind);
  world.platforms = world.platforms.filter((p) => p.x + p.w > behind);
  world.doors = world.doors.filter((d) => d.alive && d.x > behind);
}

/**
 * A boss door every doorIntervalSeconds, on solid ground we guarantee.
 *
 * `doorMult` is SATNAV, and it must land on a whole number of frames: the test
 * below is an exact modulo, so a fractional interval would match on no frame at
 * all and the run would never see another door.
 */
/** How far the area's door timer has run, 0 to 1, and 1 once the door is out: Steel's line reads it. */
export function doorProgress(world, elapsedFrames, doorMult = 1) {
  if (world.doors.length) return 1;
  return Math.min(1, elapsedFrames / Math.max(1, Math.round(FEEL.doorIntervalSeconds * 60 * doorMult)));
}

export function maybeSpawnDoor(world, camX, viewW, elapsedFrames, doorMult = 1) {
  const every = Math.max(1, Math.round(FEEL.doorIntervalSeconds * 60 * doorMult));
  if (world.climb || world.doors.length || elapsedFrames === 0 || elapsedFrames % every !== 0) return;
  const x = camX + viewW + 40;
  world.groundSpans.push({ x1: x - 30, x2: x + 46 });
  world.doors.push({ x, y: world.groundY, w: 16, h: 28, alive: true });
}
