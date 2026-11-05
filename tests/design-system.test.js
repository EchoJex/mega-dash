/**
 * THE DESIGN SYSTEM'S NUMBERS MATCH THE GAME.
 *
 * design/design-system/ is the copy of the MEGA DASH design system that Claude
 * Design reads before drawing. Its colours, sizes and timings are written by
 * tools/design-system.mjs from the game's own code; if a boss's colour or a size
 * changes and nobody reruns it, the page quietly tells the artist something the
 * game no longer does. This fails instead, naming the files to rebuild.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { stale } from '../tools/design-system.mjs';

test('the design system copy matches the code (npm run design:system)', () => {
  assert.deepEqual(stale(), [], 'out of date: run npm run design:system, then publish design/design-system/ to Claude');
});
