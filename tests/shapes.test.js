/**
 * The art-collision trial (branch test/art-collision): the rectangles fitted to each picture.
 * The owner's rules: at most 5 per picture, and none "shall extend beyond any visible pixel".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '../docs/sprite-fmt.js';
import { fitRects } from '../src/systems/fit-rects.js';
import { frameAt, artRects, touch, KIND, GENEROUS } from '../src/systems/shapes.js';
import SHAPES from '../src/data/art-shapes.json' with { type: 'json' };
import ART from '../src/data/sprite-art.json' with { type: 'json' };

test('no fitted rectangle covers a see-through pixel, and no picture has more than five', () => {
  for (const f of readdirSync('design/sprites').filter((n) => n.endsWith('.sprite'))) {
    const doc = parse(readFileSync(`design/sprites/${f}`, 'utf8'));
    for (const fr of doc.frames) {
      if (!fr.rows?.length) continue;
      const rects = fitRects(doc.w, doc.h, (x, y) => fr.rows[y][x] !== '.');
      assert.ok(rects.length <= 5, f);
      for (const [x, y, w, h] of rects) {
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
          assert.notEqual(fr.rows[yy][xx], '.', `${f} ${fr.action}: a rectangle covers an empty pixel`);
        }
      }
    }
  }
});

test('every built sheet has a set of rectangles for each of its frames', () => {
  for (const [key, a] of Object.entries(ART)) {
    assert.ok(SHAPES[key], `${key} has no fitted shapes: run npm run sprites:build`);
    for (const frames of Object.values(a.anims || {})) for (const f of frames) assert.ok(SHAPES[key][f]?.length, `${key} frame ${f}`);
  }
});

test('the frame tested is the frame its hold says, and it loops', () => {
  const { anims, holds } = ART.player;
  assert.equal(frameAt('player', 'run', 0), anims.run[0]);
  assert.equal(frameAt('player', 'run', holds.run[0]), anims.run[1]);
  const total = holds.run.reduce((a, b) => a + b, 0);
  assert.equal(frameAt('player', 'run', total), anims.run[0]);
});

test('the favour runs the right way: a hurtful shape is inside the plain one, a helpful one outside', () => {
  const at = { box: { x: 100, y: 100, w: 24, h: 24 } };
  const span = (rs) => Math.max(...rs.map((r) => r.x + r.w)) - Math.min(...rs.map((r) => r.x));
  const plain = span(artRects('player', 0, at)), kind = span(artRects('player', 0, at, KIND)), big = span(artRects('player', 0, at, GENEROUS));
  assert.ok(kind < plain && plain < big);
  // Facing left mirrors the picture inside the same cell.
  const l = artRects('player', 0, { ...at, facing: -1 }), r = artRects('player', 0, at);
  const mid = (rs) => (Math.min(...rs.map((q) => q.x)) + Math.max(...rs.map((q) => q.x + q.w))) / 2;
  assert.equal(mid(l) + mid(r), 2 * 112);
  assert.ok(touch(l, r));
});
