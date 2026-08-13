/**
 * TERRAIN TRAVERSABILITY.
 *
 * This is the one place a numeric assertion is right at this phase: it is not
 * pinning a placeholder, it is checking that the generator cannot emit a level
 * the player is physically unable to cross. The threshold is DERIVED from the
 * live FEEL constants, so tuning the jump moves the bar with it instead of
 * breaking the build.
 *
 * The bug this guards: the pit branch used to `continue` straight into another
 * pit roll, so gaps compounded. At a 30% pit chance about 8% of gaps came out
 * wider than a jump could clear, and the worst ran past 300px.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeWorld, generate, jumpReach, maxPitWidth, jumpRise, maxPlatformHeight, THEMES,
} from '../src/systems/terrain.js';
import { makeRng, areaRng, seedFromLocation } from '../src/systems/rng.js';
import { BOSSES } from '../src/data/bosses.js';
import { FEEL } from '../src/config/feel.js';

const GROUND_Y = 184, VIEW_W = 480;

/**
 * SEEDED, with the GAME'S OWN generator.
 *
 * These tests used to sample Math.random, which made them a coin flip: the
 * theme sample-size assertion passed locally and failed ~54% of CI runs, and
 * worse, the traversability checks only caught a bad seed probabilistically. A
 * deterministic sweep over many seeds is both reproducible and far more
 * thorough than one lucky sample.
 *
 * It used to carry a private copy of mulberry32. Now that the shipped game
 * seeds its worlds too (systems/rng.js), the copy was actively harmful: it
 * meant these guarantees were proven about a generator the game does not use,
 * so the two could drift apart and nothing would notice.
 */
function survey(distance = 60000, bossId = null, seed = 1) {
  const w = makeWorld(80, GROUND_Y, bossId, makeRng(seed));
  for (let camX = 0; camX < distance; camX += 120) generate(w, camX, VIEW_W);
  const spans = [...w.groundSpans].sort((a, b) => a.x1 - b.x1);
  const gaps = [];
  for (let i = 1; i < spans.length; i++) {
    const g = spans[i].x1 - spans[i - 1].x2;
    if (g > 0.01) gaps.push({ width: g, landing: spans[i], after: spans[i - 1] });
  }
  return { world: w, spans, gaps };
}

test('jump reach is derived from the live motion constants', () => {
  const reach = jumpReach();
  assert.ok(reach > 0 && Number.isFinite(reach));
  // Sanity: a jump should carry at least a couple of player widths.
  assert.ok(reach > 24, `jump reach collapsed to ${reach}`);
  assert.ok(maxPitWidth() < reach, 'the pit cap must leave a margin under the reach');
});

test('NO generated gap is wider than a running jump can clear', () => {
  const { gaps } = survey();
  assert.ok(gaps.length > 200, `expected plenty of gaps to test, got ${gaps.length}`);
  const reach = jumpReach();
  const worst = gaps.reduce((m, g) => Math.max(m, g.width), 0);
  const impassable = gaps.filter((g) => g.width > maxPitWidth() + 0.01);
  assert.equal(impassable.length, 0,
    `${impassable.length} impassable gaps; worst ${worst.toFixed(1)}px vs cap ${maxPitWidth()}px (reach ${reach.toFixed(1)}px)`);
});

/**
 * The vertical twin of the gap guarantee, and the reason it exists: the
 * platform ceiling was a hardcoded 96px written before the double jump's height
 * was reduced, so the generator emitted shelves the player could not reach.
 * Asserting the RELATIONSHIP rather than either number, so tuning the motion
 * constants moves both together instead of failing the build.
 */
test('no generated platform is higher than a jump can reach', () => {
  assert.ok(jumpRise() > 0 && Number.isFinite(jumpRise()));
  assert.ok(maxPlatformHeight() < jumpRise(),
    'the platform cap must leave a margin under the reachable height');

  // Every theme, because `high` multiplies the band and the cap is what stops
  // an airy theme from pushing a shelf out of reach.
  for (const id of Object.keys(THEMES)) {
    const { world } = survey(30000, id, 7);
    assert.ok(world.platforms.length > 20,
      `${id}: expected plenty of platforms to test, got ${world.platforms.length}`);
    const worst = world.platforms.reduce((m, p) => Math.max(m, GROUND_Y - p.y), 0);
    assert.ok(worst <= maxPlatformHeight() + 0.01,
      `${id}: platform ${worst.toFixed(1)}px up vs cap ${maxPlatformHeight()}px `
      + `(reach ${jumpRise().toFixed(1)}px)`);
  }
});

test('every gap has ground wide enough to land on', () => {
  const { gaps } = survey();
  for (const g of gaps) {
    const landW = g.landing.x2 - g.landing.x1;
    assert.ok(landW >= 30 - 0.01,
      `landing span only ${landW.toFixed(1)}px wide after a ${g.width.toFixed(1)}px gap`);
  }
});

test('spikes never sit on the landing edge of a forced jump', () => {
  const { world, gaps } = survey();
  for (const g of gaps) {
    for (const s of world.spikes) {
      if (s.x + s.w <= g.landing.x1 || s.x >= g.landing.x2) continue;
      assert.ok(s.x - g.landing.x1 >= 30 - 0.01,
        `spike ${(s.x - g.landing.x1).toFixed(1)}px into a landing span — unavoidable hit`);
    }
  }
});

test('the generator keeps producing ground and never stalls', () => {
  const w = makeWorld(80, GROUND_Y);
  const before = w.genX;
  for (let camX = 0; camX < 20000; camX += 120) generate(w, camX, VIEW_W);
  assert.ok(w.genX > before + 19000, 'generation fell behind the camera');
  assert.ok(w.groundSpans.length > 100);
});

/**
 * Themes are flavour and must never be able to break the traversability
 * guarantee. This is the test that lets the theme numbers be tuned freely: any
 * value that would produce an uncrossable world fails the build instead of
 * shipping.
 */
test('EVERY boss theme still produces a crossable world, across many seeds', () => {
  const SEEDS = 25;
  for (const id of Object.keys(THEMES)) {
    let total = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { gaps } = survey(20000, id, seed);
      total += gaps.length;
      const bad = gaps.filter((g) => g.width > maxPitWidth() + 0.01);
      assert.equal(bad.length, 0, `${id} seed ${seed}: ${bad.length} impassable gaps`);
      for (const g of gaps) {
        const landW = g.landing.x2 - g.landing.x1;
        assert.ok(landW >= 30 - 0.01, `${id} seed ${seed}: landing span ${landW.toFixed(1)}px`);
      }
    }
    // Sample size is now a property of the sweep, not of one lucky draw.
    assert.ok(total > 100, `${id}: only ${total} gaps across ${SEEDS} seeds`);
  }
});

test('every boss has a terrain theme', () => {
  for (const b of BOSSES) {
    assert.ok(THEMES[b.id], `${b.id} has no terrain theme, so its approach plays neutral`);
  }
});

test('themes actually differ from each other', () => {
  // Otherwise the whole feature is a no-op that looks implemented. Averaged over
  // seeds so the comparison is about the THEME, not about one draw.
  const shape = (id) => {
    let gapRate = 0, avgSpan = 0;
    const N = 10;
    for (let seed = 1; seed <= N; seed++) {
      const { gaps, spans } = survey(20000, id, seed);
      gapRate += gaps.length / spans.length / N;
      avgSpan += spans.reduce((s, x) => s + (x.x2 - x.x1), 0) / spans.length / N;
    }
    return { gapRate, avgSpan };
  };
  const airy = shape('gale'), solid = shape('granite');
  assert.ok(airy.gapRate > solid.gapRate * 1.4,
    `gale should be far more pitted than granite (${airy.gapRate.toFixed(2)} vs ${solid.gapRate.toFixed(2)})`);
  assert.ok(solid.avgSpan > airy.avgSpan * 1.4,
    `granite should have far longer ground than gale (${solid.avgSpan.toFixed(0)} vs ${airy.avgSpan.toFixed(0)})`);
});

/**
 * THE SEED HAS TO MEAN SOMETHING.
 *
 * The dev HUD prints a run's seed so a bad world can be named and rebuilt here.
 * That is only worth anything if the same seed really does give the same world
 * — otherwise the number on screen is decoration and every world bug stays
 * un-investigable. This is the test that makes it a promise.
 */
test('the same seed rebuilds exactly the same world', () => {
  const build = () => {
    const w = makeWorld(80, GROUND_Y, 'blaze', areaRng(4821, 1));
    for (let camX = 0; camX < 8000; camX += 120) generate(w, camX, VIEW_W);
    return JSON.stringify(w.groundSpans.concat(w.spikes, w.platforms));
  };
  assert.equal(build(), build(), 'a seeded world must be reproducible');
});

test('different seeds and different areas give different worlds', () => {
  // Otherwise every run would be the same level, or every area within a run.
  const build = (seed, area) => {
    const w = makeWorld(80, GROUND_Y, 'blaze', areaRng(seed, area));
    for (let camX = 0; camX < 8000; camX += 120) generate(w, camX, VIEW_W);
    return JSON.stringify(w.groundSpans);
  };
  assert.notEqual(build(4821, 1), build(777, 1), 'seed must change the world');
  assert.notEqual(build(4821, 1), build(4821, 2), 'each area must differ');
  // Area worlds are keyed on the INDEX, not on a generator carried through the
  // run, so jumping straight to a boss with the dev picker cannot shift the
  // worlds that follow it.
  assert.equal(build(4821, 3), build(4821, 3), 'area 3 is area 3 however you got there');
});

test('an unparseable ?seed= falls back to random, never to a fixed world', () => {
  // A typo that silently pinned every run to one world would be worse than
  // ignoring the parameter, and much harder to notice.
  const orig = globalThis.location;
  try {
    globalThis.location = { search: '?seed=banana' };
    const a = seedFromLocation(), b = seedFromLocation();
    assert.ok(Number.isFinite(a) && Number.isFinite(b));
    globalThis.location = { search: '?seed=4821' };
    assert.equal(seedFromLocation(), 4821, 'a valid seed must still pin');
  } finally {
    globalThis.location = orig;
  }
});

test('a wider jump immediately permits wider pits', () => {
  // Not a balance assertion — it proves the cap tracks the physics rather than
  // being a constant that quietly goes stale when the jump is tuned.
  const base = maxPitWidth();
  const jv = FEEL.jumpVelocity;
  try {
    FEEL.jumpVelocity = jv * 1.4;
    assert.ok(maxPitWidth() > base, 'pit cap ignored a stronger jump');
  } finally {
    FEEL.jumpVelocity = jv;
  }
  assert.equal(maxPitWidth(), base, 'cap must return to its original value');
});
