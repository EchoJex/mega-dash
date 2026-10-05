/**
 * The 16-bit boss rooms — PLUMBING ONLY.
 *
 * Every room with art is built against its real room state (arena.js) and run
 * through the states its fight can put it in — lightning, the blackout, the
 * flood, Hot ground, burnt cover, a lifted bag, falling and floating things — and
 * must not throw, ask for a frame or a piece that was never painted, or place
 * anything at a position that is not a number. This is the check CI runs before
 * every APK, so a room that would crash, or quietly draw a wrong picture, never
 * reaches the phone.
 *
 * Nothing here looks at a pixel. The pictures were checked by eye against the
 * design, and `npm run smoke` draws them in a real browser. The canvas and the
 * Phaser stage below are stand-ins that accept every call and remember nothing
 * — the known limit of a fast check, see the smoke note in CLAUDE.md.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// A canvas that takes every drawing call. Pixel buffers are real arrays, so
// the build-time painting code runs exactly as it does in a browser.
const anything = (base) => new Proxy(base, {
  get: (o, k) => (k in o ? o[k] : () => undefined),
  set: (o, k, v) => { o[k] = v; return true; },
});
globalThis.document ??= {
  createElement: () => {
    const ctx = anything({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    });
    return { width: 1, height: 1, getContext: () => ctx };
  },
};

const { hasArenaArt } = await import('../src/systems/arena-art/index.js');
const Arena = await import('../src/systems/arena.js');
const Attr = await import('../src/systems/attributes.js');
const { BOSSES } = await import('../src/data/bosses.js');

const FLOOR = 184;
const finite = (...v) => v.every(Number.isFinite);

/**
 * The stage a room builds itself from, standing in for Phaser. Every picture
 * checks that the frame it is asked to show was painted, and every pool that
 * the piece it is asked for exists.
 */
function fakeStage(viewW) {
  const frameOk = (src, k) => (src.names ? src.has(k) : Number.isInteger(k) && k >= 0 && k < src.cells.length);
  const thing = (src) => {
    const p = new Proxy({
      show(k) { assert.ok(frameOk(src, k), `frame ${k} was never painted`); return p; },
      setPosition(x, y) { assert.ok(finite(x, y), `placed at ${x},${y}`); return p; },
      setCrop(...c) { assert.ok(finite(...c), `cropped to ${c}`); return p; },
    }, {
      get: (t, k) => (k in t ? t[k] : () => p),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    return p;
  };
  const pool = (src) => ({
    begin() {},
    put(x, y, name) {
      assert.ok(src.has(name), `no piece called ${name}`);
      assert.ok(finite(x, y), `${name} at ${x},${y}`);
    },
    end() {},
  });
  return {
    viewW,
    layer() {},
    image: (src) => thing(src.cells ? src : { cells: [[0, 0, 1, 1]] }),
    tile: () => thing({ cells: [[0, 0, 1, 1]] }),
    rect: () => thing({ cells: [[0, 0, 1, 1]] }),
    pool,
    crops: (src) => ({
      begin() {},
      put(x, y, f, ...crop) {
        assert.ok(frameOk(src, f), `frame ${f} was never painted`);
        assert.ok(finite(x, y, ...crop), `crop at ${x},${y} ${crop}`);
      },
      end() {},
    }),
  };
}

/** Push a room through its states for a few seconds of game time. */
function stir(a, room, steps) {
  const kinds = new Set(room.hazards || []);
  for (let s = 1; s <= steps; s++) {
    Arena.stepArena(a);
    // Lightning, an arc flash, the lights going out and coming back.
    if (s % 90 === 10) { a.flash = 24; a.flashN = 24; a.boltX = [0.25, 0.5, 0.75][((s / 90) | 0) % 3]; }
    a.dim = s % 300 < 120 ? Math.min(1, (s % 300) / 30) : 0;
    a.ebb = s % 200 < 60 ? 0.8 : 0;
    // The flood, where the room has lava.
    if (a.liquid?.kind === 'lava') a.liquid.h = s % 240 < 120 ? 24 * Math.min(1, (s % 240) / 40) : 0;
    if (s % 40 === 0) Attr.addPatch(a.patches, Attr.makePatch('hot', (s * 37) % (a.x1 - 40), a.floorY - 3, 6 + (s % 30), 4, 120));
    for (const tu of a.turrets) { tu.aim = ((s / 7) % 17) * (Math.PI / 16); tu.flash = s % 50 < 4 ? 4 - (s % 50) : 0; }
    a.burstIn = 100 - (s % 100);
    a.panels.forEach((pn, i) => {
      const ph = (s + i * 40) % 300;
      pn.liveMax = 240; pn.discharge = 60;
      pn.live = ph < 240 ? 240 - ph : 0; pn.tell = ph >= 240 ? 300 - ph : 0;
    });
    for (const c of a.conductors) {
      const ph = s % 200;
      c.tell = ph < 60 ? 60 - ph : 0; c.arc = ph >= 60 && ph < 120 ? 120 - ph : 0;
      c.fade = ph >= 120 && ph < 180 ? 180 - ph : 0; c.fadeN = 60;
    }
    a.cover.forEach((c, i) => {
      const ph = (s + i * 30) % 260;
      c.grow = ph < 100 ? 1 - ph / 100 : Math.min(1, (ph - 100) / 120);
      c.burnt = i % 3 === 0 && ph < 150 ? 150 - ph : 0;
    });
    // Things the fights put in the room, coming and going.
    if (s % 60 === 1) {
      a.hazards.length = 0;
      if (kinds.has('rock')) a.hazards.push({ kind: 'rock', x: 40 + (s % 300), y: 20, w: s % 120 ? 12 : 15, h: 12, vy: 1 });
      if (kinds.has('barrel')) a.hazards.push({ kind: 'barrel', x: 30, y: 30, w: 14, h: 12 });
      if (kinds.has('spikeball')) a.hazards.push({ kind: 'spikeball', x: a.x1 - 60, y: a.floorY - 20, w: 12, h: 12, spin: s * 0.09 });
      if (kinds.has('bag')) {
        const rail = a.rails[1] || a.rails[0];
        for (const mode of ['swing', 'shield', 'psi', 'thrown']) {
          a.hazards.push({ kind: 'bag', x: 30 + s % 200, y: rail.y + 106, w: 14, h: 40, railY: rail.y, vx: s % 120 ? 1.1 : -1.1,
            mode, outline: mode === 'psi' ? 0x9B4DFF : undefined, warn: s % 120 ? 1 : 0, stood: s });
        }
      }
    }
    for (const h of a.hazards) { h.y += h.kind === 'rock' ? 2 : 0; if (h.kind === 'spikeball') h.spin += 0.09; }
    room.update(a);
  }
}

const ARTFUL = BOSSES.filter((b) => hasArenaArt(b.id));

test('the six approved rooms have art, and a room without art is left alone', () => {
  assert.deepEqual(ARTFUL.map((b) => b.id).sort(), ['blaze', 'proto', 'strike', 'tempest', 'thorn', 'volt']);
  assert.equal(hasArenaArt('frost'), false);
});

for (const def of ARTFUL) {
  for (const [layer, viewW] of [[1, 320], [3, 480]]) {
    test(`${def.id}: builds and plays at layer ${layer}, ${viewW} wide`, async () => {
      const a = Arena.makeArena(def, layer, viewW, FLOOR);
      const mod = await import(`../src/systems/arena-art/${def.id}.js`);
      const room = mod.default(fakeStage(viewW), a, viewW);
      assert.equal(typeof room.update, 'function');
      stir(a, room, 600);
    });
  }
}
