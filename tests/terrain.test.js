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
import { makeWorld, generate, jumpReach, maxPitWidth, THEMES } from '../src/systems/terrain.js';
import { BOSSES } from '../src/data/bosses.js';
import { FEEL } from '../src/config/feel.js';

const GROUND_Y = 184, VIEW_W = 480;

/** Generate a long stretch and return its gaps and spans, left to right. */
function survey(distance = 60000, bossId = null) {
  const w = makeWorld(80, GROUND_Y, bossId);
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
test('EVERY boss theme still produces a crossable world', () => {
  for (const id of Object.keys(THEMES)) {
    const { gaps } = survey(30000, id);
    assert.ok(gaps.length > 50, `${id}: too few gaps to be meaningful (${gaps.length})`);
    const bad = gaps.filter((g) => g.width > maxPitWidth() + 0.01);
    assert.equal(bad.length, 0, `${id}: ${bad.length} impassable gaps`);
    for (const g of gaps) {
      const landW = g.landing.x2 - g.landing.x1;
      assert.ok(landW >= 30 - 0.01, `${id}: landing span only ${landW.toFixed(1)}px`);
    }
  }
});

test('every boss has a terrain theme', () => {
  for (const b of BOSSES) {
    assert.ok(THEMES[b.id], `${b.id} has no terrain theme, so its approach plays neutral`);
  }
});

test('themes actually differ from each other', () => {
  // Otherwise the whole feature is a no-op that looks implemented.
  const shape = (id) => {
    const { gaps, spans } = survey(40000, id);
    const avgSpan = spans.reduce((s, x) => s + (x.x2 - x.x1), 0) / spans.length;
    return { gapRate: gaps.length / spans.length, avgSpan };
  };
  const airy = shape('gale'), solid = shape('granite');
  assert.ok(airy.gapRate > solid.gapRate * 1.4,
    `gale should be far more pitted than granite (${airy.gapRate.toFixed(2)} vs ${solid.gapRate.toFixed(2)})`);
  assert.ok(solid.avgSpan > airy.avgSpan * 1.4,
    `granite should have far longer ground than gale (${solid.avgSpan.toFixed(0)} vs ${airy.avgSpan.toFixed(0)})`);
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
