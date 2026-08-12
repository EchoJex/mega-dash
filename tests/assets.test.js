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
  // A FRESH graphics object per call. One shared proxy made every layer's base
  // and overlay graphics the same object, so any test about their draw ORDER
  // silently compared a thing to itself.
  const mkG = () => { const g = new Proxy({}, { get: () => () => g }); return g; };
  return {
    made,
    animKeys: anims,
    anims: { exists: (k) => anims.has(k), create: (cfg) => anims.add(cfg.key) },
    add: {
      container: () => ({ order: [], add(o) { this.order.push(o); }, bringToTop(o) {
        const i = this.order.indexOf(o);
        if (i >= 0) { this.order.splice(i, 1); this.order.push(o); }
      } }),
      graphics: () => mkG(),
      sprite: (x, y, key) => mk('sprite', key),
      image: (x, y, key) => mk('image', key),
      tileSprite: () => ({ tilePositionX: 0 }),
    },
    load: { spritesheet: (...a) => made.push({ kind: 'load-sheet', a }),
            image: (...a) => made.push({ kind: 'load-image', a }) },
  };
}

const box = { x: 100, y: 50, w: 20, h: 30, palette: { primary: '#FF0000', secondary: '#00FF00' } };

/**
 * Remove only what a TEST added. This used to wipe MANIFEST wholesale, which
 * was harmless while it shipped empty and would have quietly deleted the
 * player's real entry for every test after the first one the day art landed.
 */
const SHIPPED = new Set(Object.keys(MANIFEST));
afterEach(() => {
  for (const k of Object.keys(MANIFEST)) if (!SHIPPED.has(k)) delete MANIFEST[k];
});

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
  // Counted as DELTAS over whatever the shipped manifest already queues, so
  // this keeps testing the routing rather than the size of the shipped list.
  const before = stubScene();
  preloadArt(before);
  const baseSheets = before.made.filter((o) => o.kind === 'load-sheet').length;
  const baseImages = before.made.filter((o) => o.kind === 'load-image').length;

  MANIFEST.sheet = { file: 'a.png', frameW: 8, frameH: 8 };
  MANIFEST.flat = { file: 'b.png' };
  const scene = stubScene();
  preloadArt(scene);
  assert.equal(scene.made.filter((o) => o.kind === 'load-sheet').length, baseSheets + 1);
  assert.equal(scene.made.filter((o) => o.kind === 'load-image').length, baseImages + 1);
  assert.ok(hasArt('sheet') && hasArt('flat') && !hasArt('nope'));
});

/**
 * The shipped manifest is now a real list rather than an empty one, so the
 * guard changes shape: instead of "nothing is here", it asserts that whatever
 * IS here is well-formed. A malformed entry does not throw — it silently loads
 * nothing and the actor falls back to a placeholder, which looks exactly like
 * art that was never added.
 */
test('every shipped manifest entry is well formed', () => {
  for (const [id, def] of Object.entries(MANIFEST)) {
    assert.ok(def.file, `${id} has no file`);
    assert.ok(/\.png$/.test(def.file), `${id} should be a png`);
    if (def.anims) {
      assert.ok(def.frameW && def.frameH, `${id} has anims but is not a spritesheet`);
      for (const [name, frames] of Object.entries(def.anims)) {
        assert.ok(Array.isArray(frames) && frames.length,
          `${id}:${name} has no frames`);
        for (const f of frames) {
          assert.equal(typeof f, 'number', `${id}:${name} frame is not an index`);
        }
      }
    }
    // Baked 3-colour art must never be tinted — a Phaser tint multiplies the
    // whole texture. Only a greyscale mask may set this.
    assert.notEqual(def.tintable, true, `${id} is tintable; is it really a mask?`);
  }
});

/**
 * THE PLAYER'S CLIPS ARE A CONTRACT WITH GameScene, which picks a clip name
 * every frame. A clip it asks for that the sheet does not have leaves the
 * sprite on whatever it was playing before, which reads as the animation
 * sticking rather than as a missing asset.
 */
test('the player sheet covers every clip GameScene asks for', () => {
  const need = ['idle', 'run', 'slide', 'jumpRise', 'jumpApex', 'jumpFall'];
  const have = Object.keys(MANIFEST.player.anims);
  for (const c of need) assert.ok(have.includes(c), `player sheet is missing '${c}'`);
  assert.equal(MANIFEST.player.frameW, 24);
  assert.equal(MANIFEST.player.frameH, 24);
});

test('the overlay graphics stays above sprites added after it', () => {
  const scene = stubScene();
  const layer = new ActorLayer(scene);
  MANIFEST.late = { file: 'late.png' };
  layer.begin();
  layer.draw({ ...box, id: 'late' });
  layer.end();
  const order = layer.root.order;
  assert.ok(order.indexOf(layer.gOver) > order.indexOf(layer.g),
    'the overlay must sit above the base graphics');
  assert.equal(order[order.length - 1], layer.gOver,
    'a sprite acquired after construction must not get above the overlay');
});
