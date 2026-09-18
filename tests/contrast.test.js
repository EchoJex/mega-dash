/**
 * PIT LEGIBILITY — the one relationship that makes a pit visible.
 *
 * A pit is not drawn. It is the absence of a ground span, so what the player
 * actually sees is the BACKDROP showing through a gap in the GROUND. If those
 * two colours are close, the pit is invisible, and the first anyone hears about
 * it is a playtest note saying a zone is unfair.
 *
 * The backdrop is derived from the coming boss's primary, so it moves whenever
 * the palette does — which is exactly how this broke. Tempest Man's backdrop
 * resolves within a dE of 2.4 of the ground the old constants used.
 *
 * WHAT IS ASSERTED IS THE RELATIONSHIP, NEVER THE HEXES. Every colour in this
 * project is provisional and a test that pinned one would just fail whenever it
 * was nudged. This fails only when a change makes a zone UNREADABLE, which is
 * the regression worth a red build.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOSSES } from '../src/data/bosses.js';
import { themeFor } from '../src/systems/arena.js';

/** sRGB relative luminance, per WCAG. */
const chan = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lum = (n) => 0.2126 * chan((n >> 16) & 255) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255);
const ratio = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/**
 * Read the live constants out of the scene rather than restating them, so this
 * measures what actually ships. GameScene imports Phaser, which does not load
 * headless, so the three values are lifted from the source text.
 */
const src = readFileSync(new URL('../src/scenes/GameScene.js', import.meta.url), 'utf8');
const constOf = (name) => {
  const m = src.match(new RegExp(`const ${name}\\s*=\\s*(0x[0-9a-fA-F]{6})`));
  assert.ok(m, `${name} is gone from GameScene — the area palette moved, update this test`);
  return parseInt(m[1], 16);
};
const GROUND = constOf('AREA_GROUND');
const CAP = constOf('AREA_CAP');

/**
 * 2.0 is the floor, not the target. Below it a gap in the ground stops reading
 * as a hole and starts reading as a slightly different patch of floor. The
 * shipped set clears it at 2.20 in its worst theme, so this has headroom for an
 * ordinary palette nudge and fails on one that buries a zone.
 */
const FLOOR = 2.0;

test('every boss backdrop separates from the area ground', () => {
  const bad = [];
  for (const b of BOSSES) {
    const cr = ratio(themeFor(b).fill, GROUND);
    if (cr < FLOOR) bad.push(`${b.id} (${b.primary}) CR ${cr.toFixed(2)}`);
  }
  assert.deepEqual(bad, [], `backdrops that swallow a pit:\n  ${bad.join('\n  ')}`);
});

test('the cap line — the pit edge itself — clears every backdrop harder', () => {
  // The cap sits in the 10px strip above the control pads, so it is the only
  // part of the ground guaranteed never to be behind a thumb. It carries the
  // edge where the pad band crushes the body contrast, and so is held higher.
  for (const b of BOSSES) {
    const cr = ratio(themeFor(b).fill, CAP);
    assert.ok(cr >= 4.5, `${b.id}: cap reads at only CR ${cr.toFixed(2)} against its backdrop`);
  }
});

test('the ground does not swallow the white player standing on it', () => {
  // The player is a fixed white and "never lose sight of the player" outranks
  // every other legibility rule here — lifting the ground must not cost that.
  assert.ok(ratio(0xffffff, GROUND) >= 4.5, 'the area ground has been lifted too far');
});
