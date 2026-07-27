/**
 * The sprite path, exercised headlessly.
 *
 * MANIFEST ships empty, so every actor in the real game currently renders as a
 * placeholder — which means the art branch would otherwise be dead code that
 * nobody notices is broken until the first PNG lands, possibly months from now.
 * These tests drive ActorLayer against a stub scene with a temporary manifest so
 * both branches stay honest.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ActorLayer, MANIFEST, createAnims, preloadArt, hasArt } from '../src/systems/assets.js';

/** Minimal stand-in for the parts of a Phaser scene ActorLayer touches. */
function stubScene() {
  const made = [];
  const anims = new Set();
  const mk = (kind, key) => {
    const o = {
      kind, key, x: 0, y: 0, visible: true, origin: null, flipX: false, tint: null, played: null,
      anims: { getName: () => o.played },
      setOrigin(a, b) { o.origin = [a, b]; return o; },
      setPosition(x, y) { o.x = x; o.y = y; return o; },
      setVisible(v) { o.visible = v; return o; },
      setFlipX(v) { o.flipX = v; return o; },
      setTint(t) { o.tint = t; return o; },
      play(k) { o.played = k; return o; },
    };
    made.push(o);
    return o;
  };
  const noopG = new Proxy({}, { get: () => () => noopG });
  return {
    made,
    animKeys: anims,
    anims: { exists: (k) => anims.has(k), create: (cfg) => anims.add(cfg.key) },
    add: {
      container: () => ({ add() {} }),
      graphics: () => noopG,
      sprite: (x, y, key) => mk('sprite', key),
      image: (x, y, key) => mk('image', key),
      tileSprite: () => ({ tilePositionX: 0 }),
    },
    load: { spritesheet: (...a) => made.push({ kind: 'load-sheet', a }),
            image: (...a) => made.push({ kind: 'load-image', a }) },
  };
}

const box = { x: 100, y: 50, w: 20, h: 30, palette: { primary: '#FF0000', secondary: '#00FF00' } };

afterEach(() => { for (const k of Object.keys(MANIFEST)) delete MANIFEST[k]; });

test('with no manifest entry the actor falls back to the placeholder', () => {
  const scene = stubScene();
  const layer = new ActorLayer(scene);
  let fell = false;
  layer.begin();
  const r = layer.draw({ ...box, id: 'ghost' }, () => { fell = true; });
  layer.end();
  assert.equal(fell, true, 'placeholder renderer should have been called');
  assert.equal(r, null);
  assert.equal(scene.made.filter((o) => o.kind === 'sprite' || o.kind === 'image').length, 0);
});

test('a static entry becomes an Image anchored to the box bottom-centre', () => {
  MANIFEST.rock = { file: 'rock.png' };
  const scene = stubScene();
  const layer = new ActorLayer(scene);
  let fell = false;
  layer.begin();
  const s = layer.draw({ ...box, id: 'rock' }, () => { fell = true; });
  layer.end();
  assert.equal(fell, false, 'placeholder must not run when art exists');
  assert.equal(s.kind, 'image');
  assert.deepEqual(s.origin, [0.5, 1]);
  assert.equal(s.x, 110);           // 100 + 20/2
  assert.equal(s.y, 80);            // 50 + 30, feet on the collision box floor
});

test('a spritesheet entry becomes a Sprite and plays the actor clip', () => {
  MANIFEST.hero = {
    file: 'hero.png', frameW: 24, frameH: 24,
    anims: { idle: [0], run: [1, 2] },
  };
  const scene = stubScene();
  createAnims(scene);
  assert.ok(scene.animKeys.has('hero:idle') && scene.animKeys.has('hero:run'));

  const layer = new ActorLayer(scene);
  layer.begin();
  const s = layer.draw({ ...box, id: 'hero', clip: 'run', facing: -1 });
  layer.end();
  assert.equal(s.kind, 'sprite');
  assert.equal(s.played, 'hero:run');
  assert.equal(s.flipX, true, 'facing left should flip the sprite');
});

test('anchor center and offsets are honoured', () => {
  MANIFEST.shot = { file: 's.png', anchor: 'center', offX: 3, offY: -4 };
  const scene = stubScene();
  const layer = new ActorLayer(scene);
  layer.begin();
  const s = layer.draw({ ...box, id: 'shot' });
  layer.end();
  assert.deepEqual(s.origin, [0.5, 0.5]);
  assert.equal(s.x, 113);           // 110 + offX
  assert.equal(s.y, 61);            // 50 + 30/2 + offY
});

test('sprites are pooled across frames and surplus ones are hidden', () => {
  MANIFEST.bug = { file: 'bug.png' };
  const scene = stubScene();
  const layer = new ActorLayer(scene);

  layer.begin();
  for (let i = 0; i < 3; i++) layer.draw({ ...box, id: 'bug', x: i * 10 });
  layer.end();
  const created = scene.made.filter((o) => o.kind === 'image');
  assert.equal(created.length, 3);

  // next frame only needs one — the other two must be hidden, not recreated
  layer.begin();
  layer.draw({ ...box, id: 'bug' });
  layer.end();
  assert.equal(scene.made.filter((o) => o.kind === 'image').length, 3, 'no new allocations');
  assert.deepEqual(created.map((o) => o.visible), [true, false, false]);
});

test('preload routes sheets and single images to the right loader', () => {
  MANIFEST.sheet = { file: 'a.png', frameW: 8, frameH: 8 };
  MANIFEST.flat = { file: 'b.png' };
  const scene = stubScene();
  preloadArt(scene);
  assert.equal(scene.made.filter((o) => o.kind === 'load-sheet').length, 1);
  assert.equal(scene.made.filter((o) => o.kind === 'load-image').length, 1);
  assert.ok(hasArt('sheet') && hasArt('flat') && !hasArt('nope'));
});

test('the shipped manifest is empty, so every actor renders as a placeholder', () => {
  // Guards against test art being committed by accident.
  assert.deepEqual(Object.keys(MANIFEST), []);
});
