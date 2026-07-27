/**
 * Data integrity for minions, pickups and the meta upgrades.
 *
 * These guard the rules that are easy to break by hand-editing a colour or a
 * ladder and hard to notice while playing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MINIONS, ELITE_OUTLINE } from '../src/data/minions.js';
import { BOSSES } from '../src/data/bosses.js';
import { UPGRADES } from '../src/data/upgrades.js';
import { WEAPONS } from '../src/data/weapons.js';
import { projectileHalfHeight, SHAPE_HALF_H } from '../src/systems/assets.js';

/** '#RRGGBB' -> CIELAB, so "different colour" means perceptually, not numerically. */
function lab(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = srgb;
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const dE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

test('minion primaries stay perceptually clear of every boss primary', () => {
  // A minion must never be mistaken for a boss at a glance. 25 is just under
  // the ~27.7 minimum the 17 boss primaries hold between themselves.
  for (const m of MINIONS) {
    for (const b of BOSSES) {
      assert.ok(
        dE(m.primary, b.primary) > 25,
        `${m.id} (${m.primary}) reads too close to ${b.id} (${b.primary})`,
      );
    }
  }
});

test('minions honour the 3-colour NES palette rule', () => {
  for (const m of MINIONS) {
    assert.equal(m.outline, '#0A0A12', `${m.id} must use the shared outline`);
    assert.equal(new Set([m.primary, m.secondary, m.outline]).size, 3,
      `${m.id} must have three distinct colours`);
  }
});

test('there is exactly one ground and one airborne minion', () => {
  assert.deepEqual(MINIONS.map((m) => m.kind).sort(), ['air', 'ground']);
});

test('the elite rim is not one of the minion palette colours', () => {
  // otherwise an elite would be indistinguishable from its base form
  for (const m of MINIONS) {
    assert.ok(![m.primary, m.secondary, m.outline].includes(ELITE_OUTLINE));
  }
});

test('slide mastery gates the slide at rank 0 and describes every rank', () => {
  const slide = UPGRADES.find((u) => u.id === 'slide_mastery');
  const r = {};
  slide.apply(r, 0);
  assert.equal(r.slideRank, 0, 'rank 0 must leave the slide locked');
  for (let l = 0; l <= slide.maxLv; l++) {
    assert.equal(typeof slide.desc(l), 'string', `rank ${l} has no description`);
  }
});

test('every upgrade describes itself at every rank it can reach', () => {
  for (const u of UPGRADES) {
    for (let l = 0; l <= u.maxLv; l++) {
      assert.equal(typeof u.desc(l), 'string', `${u.id} rank ${l}`);
    }
  }
});

test('every weapon shape has an explicit drawn half-height', () => {
  // Duplicator echo spacing is derived from this. A shape missing from the
  // table silently falls back to the 'bolt' value, which would overlap the
  // echoes on anything taller than a thin bar.
  for (const w of WEAPONS) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(SHAPE_HALF_H, w.shape),
      `${w.shape} (${w.name}) is missing from SHAPE_HALF_H`,
    );
    assert.ok(projectileHalfHeight(w.shape, 10) > 0);
  }
});

test('duplicator echoes never overlap the real shot', () => {
  // The spacing rule, checked against every shape at a range of radii: two
  // stacked volleys must clear each other with the +1px gap intact.
  for (const shape of Object.keys(SHAPE_HALF_H)) {
    for (const radius of [2, 3, 4.5, 6]) {
      const half = projectileHalfHeight(shape, radius);
      const step = half * 2 + 1;
      assert.ok(step > half * 2, `${shape} at r=${radius} would touch`);
    }
  }
});
