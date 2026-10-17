/**
 * WEAPON ART — the contract between a weapon's code and its drawings, checked
 * for EVERY weapon in src/data/weapon-art.js, so a new weapon's sheets are
 * covered the day they are registered, with nothing added here.
 *
 * A weapon drawn this way keeps its FRAME DATA in its `.sprite` files: how long
 * each frame shows, which frame a move hits on, its hit area and its pivot.
 * The game reads that from `src/data/frame-data.json`, which the build writes.
 * So the guarantees that matter are plumbing ones: every sheet the code plays
 * exists, has every clip the code asks for in the shape the code expects, and
 * the generated file has not gone stale. None of it pins a number — a redrawn
 * sheet that hits two steps later must still pass.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  parse, serialize, frameDataOf, checkFrameData, CLIP_KINDS,
} from '../docs/sprite-fmt.js';
import { WEAPON_ART, weaponSheets } from '../src/data/weapon-art.js';
import { DEPTH } from '../src/config/display.js';
import { MANIFEST } from '../src/systems/assets.js';
import { clipOf, frameAt, cellAt, areaAt, pointAt } from '../src/systems/frame-data.js';
import { ladderAt } from '../src/data/weapons.js';

const FRAME_DATA = JSON.parse(readFileSync(new URL('../src/data/frame-data.json', import.meta.url), 'utf8'));
const targets = JSON.parse(readFileSync(new URL('../design/sprite-targets.json', import.meta.url), 'utf8'));
const source = (id) => new URL(`../design/sprites/${id}.sprite`, import.meta.url);

test('every registered weapon sheet has a source, and keeps its contract', () => {
  for (const w of weaponSheets()) {
    assert.ok(existsSync(source(w.id)), `${w.id}.sprite is missing — npm run art:placeholders -- ${w.weapon}`);
    const broke = checkFrameData(parse(readFileSync(source(w.id), 'utf8')), w);
    assert.deepEqual(broke, [], `${w.id}:\n  ${broke.join('\n  ')}`);
  }
});

test('frame-data.json still matches the .sprite sources', () => {
  for (const w of weaponSheets()) {
    const fresh = frameDataOf(parse(readFileSync(source(w.id), 'utf8')));
    assert.deepEqual(FRAME_DATA[w.key], JSON.parse(JSON.stringify(fresh)),
      `${w.key} drifted from its .sprite — run npm run sprites:build`);
  }
  const known = new Set(weaponSheets().map((w) => w.key));
  for (const k of Object.keys(FRAME_DATA)) {
    if (k !== '_note') assert.ok(known.has(k), `${k} is in frame-data.json but not in the registry`);
  }
});

test('the editor and the build know every weapon sheet, at the registry\'s grid', () => {
  for (const w of weaponSheets()) {
    const t = targets.weapons?.[w.id];
    assert.ok(t, `${w.id} is not in design/sprite-targets.json — run npm run sprites`);
    assert.deepEqual(t.grid, w.grid);
    assert.equal(t.key, w.key);
    assert.deepEqual(t.clips, w.clips);
  }
});

test('a weapon sheet loads held by its pivot, and draws in a band that exists', () => {
  for (const w of weaponSheets()) {
    assert.ok(DEPTH[w.layer] !== undefined, `${w.id}: no '${w.layer}' band in DEPTH`);
    const def = MANIFEST[w.key];
    if (!def) continue;                       // nothing drawn yet: the shapes stand in
    assert.equal(def.anchor, 'pivot');
    const doc = parse(readFileSync(source(w.id), 'utf8'));
    assert.deepEqual(def.pivot, [doc.pivot.x, doc.pivot.y]);
  }
});

/**
 * CLIP NAMES NEVER END IN A DIGIT. The sprite format reads `jab1` as action
 * `jab`, frame 2 — so a weapon whose clip names ended in numbers would be
 * read back as different clips from the ones the game plays.
 */
test('no weapon clip name ends in a digit', () => {
  for (const w of weaponSheets()) {
    for (const name of Object.keys(w.clips)) {
      assert.ok(!/\d$/.test(name), `${w.id}: '${name}' ends in a digit`);
      assert.ok(CLIP_KINDS[w.clips[name]], `${w.id}: '${name}' has an unknown kind '${w.clips[name]}'`);
    }
  }
});

test('the Quake Hammer has one spike clip per ladder angle', () => {
  const angles = ladderAt('quake_hammer', 10).spikes.angles;
  assert.equal(Object.keys(WEAPON_ART.quake_hammer.sheets.spike.clips).length, angles.length);
});

// ── The format and the checker ───────────────────────────────────────

const SHEET = `# x
grid      6x4
fudge     0.70 x 1.00
pivot     2 2

[swing 1] status=ready hold=3
......
......
......
......

[swing 2] status=wip hold=2 hit=1,0,4,3 spawn=5,3
......
......
......
......

[swing 3] status=ready hold=4
......
......
......
......
`;

test('hit, spawn and pivot survive a round trip, byte for byte', () => {
  assert.equal(serialize(parse(SHEET)), SHEET);
  const doc = parse(SHEET);
  assert.deepEqual(doc.pivot, { x: 2, y: 2 });
  assert.deepEqual(doc.frames[1].hit, { x: 1, y: 0, w: 4, h: 3 });
  assert.deepEqual(doc.frames[1].spawn, { x: 5, y: 3 });
  const bare = parse(SHEET.replace('hit=1,0,4,3 ', 'hit '));
  assert.equal(bare.frames[1].hit, true, 'a bare hit is a flag');
  assert.equal(serialize(bare), SHEET.replace('hit=1,0,4,3 ', 'hit '));
});

test('frame data is measured from the pivot, and ignores how far the drawing has got', () => {
  const c = frameDataOf(parse(SHEET)).clips.swing;
  assert.deepEqual(c.holds, [3, 2, 4]);
  assert.equal(c.total, 9);
  assert.deepEqual(c.hits, [{ frame: 1, step: 3, len: 2, x: -1, y: -2, w: 4, h: 3 }]);
  assert.deepEqual(c.spawns, [{ frame: 1, step: 3, x: 3, y: 1 }]);
  assert.deepEqual(c.ship, [true, false, true], 'the wip frame keeps its hold and its place');
});

test('the checker names what is wrong in words, and passes a sound sheet', () => {
  const spec = { grid: { w: 6, h: 4 }, clips: { swing: 'hit', idle: 'loop' } };
  assert.deepEqual(checkFrameData(parse(SHEET), { grid: spec.grid, clips: { swing: 'hit' } }), []);
  const broke = checkFrameData(parse(SHEET), spec).join(' | ');
  assert.match(broke, /'idle' is missing/);
  const noHit = checkFrameData(parse(SHEET.replace(' hit=1,0,4,3', '')), { clips: { swing: 'hit' } });
  assert.match(noHit.join(), /exactly one frame with a hit area/);
  const off = checkFrameData(parse(SHEET.replace('hit=1,0,4,3', 'hit=4,0,4,3')), { clips: { swing: 'hit' } });
  assert.match(off.join(), /not inside the 6x4 sheet/);
  const extra = checkFrameData(parse(SHEET), { clips: { jab: 'hit' } }).join();
  assert.match(extra, /'swing' is not one the game plays/);
  const loop = checkFrameData(parse(SHEET), { clips: { swing: 'loop' } }).join();
  assert.match(loop, /cannot carry a hit/);
  const grow = checkFrameData(parse(SHEET.replace('hit=1,0,4,3', 'hit')), { clips: { swing: 'grow' } }).join();
  assert.match(grow, /start with at least one frame marked 'hit'/);
});

// ── Playing it ───────────────────────────────────────────────────────

test('a frame is picked by step: held on the last, wrapped for a loop', () => {
  const c = { holds: [3, 2, 4], cells: [7, 8, 9], ship: [true, true, true], total: 9 };
  assert.deepEqual([0, 2, 3, 4, 5, 8, 9, 50].map((t) => frameAt(c, t)), [0, 0, 1, 1, 2, 2, 2, 2]);
  assert.deepEqual([9, 12, 14].map((t) => frameAt(c, t, true)), [0, 1, 2]);
  assert.equal(cellAt(c, 4), 8);
});

test('a frame still being drawn holds the last drawn one; with none, the shapes stand in', () => {
  const c = { holds: [3, 2, 4], cells: [7, 8, 9], ship: [true, false, true], total: 9 };
  assert.equal(cellAt(c, 3), 7, 'the wip frame waits on the one before it');
  assert.equal(cellAt({ ...c, ship: [false, false, true] }, 0), -1);
});

test('hit areas and points mirror about the pivot when facing left', () => {
  const h = { x: 2, y: -3, w: 5, h: 4 };
  assert.deepEqual(areaAt(h, 100, 50, 1), { x: 102, y: 47, w: 5, h: 4 });
  assert.deepEqual(areaAt(h, 100, 50, -1), { x: 93, y: 47, w: 5, h: 4 }, 'from 93 to 98: the same span the other side');
  assert.deepEqual(pointAt({ x: 4, y: 1 }, 100, 50, -1), { x: 96, y: 51 });
});

test('a clip the build never wrote is a loud error, not a silent miss', () => {
  assert.throws(() => clipOf('weapon:quake_hammer:held', 'noSuchClip'), /npm run sprites:build/);
});

// ── The kit Claude Design draws with (docs/sprite-kit.js) ────────────

test('the design kit picks the same frame the game does, step for step', async () => {
  const { frameAt: kitFrameAt } = await import('../docs/sprite-kit.js');
  for (const w of weaponSheets()) {
    const doc = parse(readFileSync(source(w.id), 'utf8'));
    for (const [name, kind] of Object.entries(w.clips)) {
      const c = clipOf(w.key, name), loop = kind === 'loop';
      for (let t = 0; t < c.total * 2 + 3; t++) {
        assert.equal(kitFrameAt(doc, name, t, loop).at, c.cells[frameAt(c, t, loop)], `${w.id} ${name} step ${t}`);
      }
    }
  }
});

test('the design kit paints a frame held by its pivot, mirrored for left, and reads it back', async () => {
  const { drawFrame, rowsFromCanvas } = await import('../docs/sprite-kit.js');
  const doc = parse(readFileSync(source('weapon-quake_hammer-held'), 'utf8'));
  const f = doc.frames.find((x) => x.hit && x.hit !== true);
  const painted = (facing) => {
    const rects = [];
    drawFrame({ fillRect: (x, y) => rects.push(`${x},${y}`), set fillStyle(_) {} }, doc, f, 100, 50, { facing });
    return rects;
  };
  const solid = f.rows.join('').replace(/\./g, '').length;
  assert.equal(painted(1).length, solid, 'one square per drawn pixel');
  // The first drawn pixel of the first drawn row, both ways round.
  const r = f.rows.findIndex((row) => /[^.]/.test(row)), c = f.rows[r].search(/[^.]/);
  assert.ok(painted(1).includes(`${100 + c - doc.pivot.x},${50 + r - doc.pivot.y}`));
  assert.ok(painted(-1).includes(`${100 + doc.pivot.x - c - 1},${50 + r - doc.pivot.y}`), 'mirrored about the pivot');
  // Back from pixels to rows: the same frame, character for character.
  const hex = Object.fromEntries(doc.palette.map((p) => [p.key, p.hex]));
  const data = new Uint8ClampedArray(doc.w * doc.h * 4);
  f.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const v = parseInt(hex[ch].slice(1), 16), i = (y * doc.w + x) * 4;
    data.set([v >> 16, (v >> 8) & 255, v & 255, 255], i);
  }));
  const ctx = { getImageData: () => ({ data }) };
  assert.deepEqual(rowsFromCanvas(ctx, doc.w, doc.h, doc.palette), f.rows);
  data.set([1, 2, 3, 255], 0);
  assert.throws(() => rowsFromCanvas(ctx, doc.w, doc.h, doc.palette), /pixel 0,0 is #010203/);
});

/**
 * THE BRIEF DESIGN READS CANNOT GO STALE. Its tables of clips, holds, hit
 * steps and hit areas are generated from the frame data; a sheet changed
 * without `npm run art:brief` would leave Design drawing to the old numbers.
 */
test('every weapon with art has a brief, and its generated parts are current', async () => {
  const { refreshed, briefPath } = await import('../tools/art-brief.mjs');
  for (const weapon of Object.keys(WEAPON_ART)) {
    assert.ok(existsSync(briefPath(weapon)), `design/weapon-art/${weapon}.md is missing`);
    assert.equal(readFileSync(briefPath(weapon), 'utf8'), await refreshed(weapon),
      `design/weapon-art/${weapon}.md is stale — run npm run art:brief`);
  }
});
