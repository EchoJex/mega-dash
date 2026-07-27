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
const PIT_MIN = 22, PIT_MAX = 40;
const PIT_CHANCE = 0.30;
const SPIKE_CHANCE = 0.38;
const PLATFORM_CHANCE = 0.42;
const LOOKAHEAD = 160;

const rand = (a, b) => a + Math.random() * (b - a);

export function makeWorld(startX, groundY) {
  return {
    groundSpans: [{ x1: startX - 240, x2: startX + 180 }],
    spikes: [],
    platforms: [],
    doors: [],
    genX: startX + 180,
    groundY,
  };
}

export function generate(world, camX, viewW) {
  const target = camX + viewW + LOOKAHEAD;
  let guard = 0;
  while (world.genX < target && guard++ < 40) {
    // A pit is simply the absence of a ground span. Falling into one is death.
    if (Math.random() < PIT_CHANCE) {
      world.genX += rand(PIT_MIN, PIT_MAX);
      continue;
    }
    const w = rand(SPAN_MIN, SPAN_MAX);
    const x1 = world.genX, x2 = x1 + w;
    world.groundSpans.push({ x1, x2 });

    if (w > 56 && Math.random() < SPIKE_CHANCE) {
      const sw = rand(12, 24);
      world.spikes.push({ x: x1 + rand(16, Math.max(16, w - sw - 16)), y: world.groundY - 7, w: sw, h: 7 });
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
