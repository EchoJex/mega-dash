/**
 * THE AREAS' PICKED WORLD PIECES — PLUMBING ONLY.
 *
 * Every slice the owner has picked pieces for is built (its area, and its boss room's exit door)
 * against a stand-in for Phaser and run through a long scroll and many moments. It must not throw,
 * ask for a picture or a piece that was never painted, put anything at a position that is not a
 * number, or keep pictures after they have scrolled away. The rules the pieces rely on are checked
 * too: touching ground joins into one run (so no pit edge shows in solid ground), every layer that
 * scrolls repeats seamlessly, and everything that moves by itself is back where it started after
 * one loop, so a moving picture never jumps.
 *
 * Nothing here looks at a pixel. The pictures were picked by the owner on the review canvas and
 * checked by eye in the game; `npm run smoke` draws them in a real browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// A canvas that takes every drawing call (the same stand-in as the room test). Pixel buffers are
// real arrays, so the painting code runs exactly as it does in a browser.
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

const { buildArea, hasAreaArt, pickedMaterial, runs } = await import('../src/systems/area-art/index.js');
const { PICKED } = await import('../src/systems/area-art/slices.js');
const { BOSSES } = await import('../src/data/bosses.js');

const finite = (...v) => v.every(Number.isFinite);
const PICKS = Object.keys(PICKED);

/** The stage an area builds itself from, standing in for Phaser, counting the pictures alive. */
function fakeStage() {
  const live = new Set();
  const frameOk = (src, k) => (src.names ? src.has(k) : true);
  const thing = (src) => {
    const p = new Proxy({
      show(k) { assert.ok(frameOk(src, k), `door picture ${k} was never painted`); return p; },
      destroy() { live.delete(p); },
    }, {
      get: (t, k) => (k in t ? t[k] : () => p),
      set: (t, k, v) => { if (k === 'x' || k === 'y' || k === 'tilePositionX') assert.ok(finite(v), `${k} = ${v}`); t[k] = v; return true; },
    });
    live.add(p);
    return p;
  };
  return {
    live,
    layer: () => ({}),
    use() {},
    image: (src) => thing(src),
    tile: () => thing({}),
    rect: () => thing({}),
    drop: (o) => o.destroy(),
    pool: (src) => ({
      begin() {},
      put(x, y, name) {
        assert.ok(src.has(name), `no piece called ${name}`);
        assert.ok(finite(x, y), `${name} at ${x},${y}`);
      },
      end() {},
    }),
  };
}

/** A stretch of the world as terrain.js makes it: spans that touch and overlap, a pit, a platform, spikes and doors. */
function world(x) {
  return {
    groundSpans: [{ x1: x - 240, x2: x + 33.4 }, { x1: x + 33.4, x2: x + 120.7 }, { x1: x + 150, x2: x + 260 }, { x1: x + 200, x2: x + 300 }, { x1: x + 340.2, x2: x + 700 }],
    platforms: [{ x: x + 60.3, y: 141.7, w: 37.5, h: 5 }, { x: x + 420, y: 130, w: 52, h: 5 }],
    spikes: [{ x: x + 170.6, y: 177, w: 21.3, h: 7 }, { x: x + 500, y: 177, w: 12, h: 7 }],
    doors: [{ x: x + 260.4, y: 184, w: 16, h: 28, alive: true }, { x: x + 600, y: 184, w: 16, h: 28, alive: true, wrap: true, armed: false }],
  };
}

test('the slices the owner has picked have pieces, and every other slice is left alone', () => {
  // Batch 1 (5 Nov 2026), then Ice and Ground from batch 2 (6 Nov 2026).
  assert.deepEqual(PICKS.sort(), ['blaze', 'eclipse', 'frost', 'granite', 'proto', 'quake', 'strike', 'tempest', 'thorn', 'volt']);
  for (const b of BOSSES) assert.equal(hasAreaArt(b.id), PICKS.includes(b.id), b.id);
});

test('ground that touches or overlaps is one run, so a pit edge shows only at a real pit', () => {
  assert.deepEqual(runs([{ x1: 0, x2: 50 }, { x1: 50, x2: 90 }, { x1: 120, x2: 200 }, { x1: 150, x2: 260.4 }]), [[0, 90], [120, 260]]);
  assert.deepEqual(runs([]), []);
});

test('a mixed pick draws one material on another\'s ground, or with another\'s doors', () => {
  for (const id of PICKS) {
    const { pick, materials } = PICKED[id], M = pickedMaterial(id);
    assert.equal(M.ground, materials[pick.ground || pick.material][3].ground, id);
    assert.equal(M.platform, materials[pick.material][3].platform, id);
    assert.equal(typeof M.doorPicture, 'function', `${id} has no door picture`);
    assert.equal(M.doorPicture, materials[pick.doors || pick.material][3].doorPicture, `${id}'s doors come from the wrong material`);
  }
});

test('every layer that scrolls has a strip to repeat, and every moving part comes back after one loop', () => {
  for (const id of PICKS) {
    const bd = PICKED[id].backdrop, loop = bd.loop || 240;
    for (const L of bd.layers) {
      if (L.fixed && L.rate) assert.ok(L.period >= 480 && L.period % 4 === 0, `${id}: a layer at ${L.rate} repeats every ${L.period}`);
      for (const part of L.parts) for (const t of [0, 7, 133]) {
        assert.deepEqual(part.at(57, t + loop), part.at(57, t), `${id}: a moving part jumps when its ${loop}-step loop comes round`);
      }
    }
  }
});

for (const id of PICKS) {
  test(`${id}: the area and its boss room's exit door are built and played without asking for anything never painted`, () => {
    for (const room of [false, true]) {
      const S = fakeStage(), area = buildArea(S, id, 432, room);
      const settled = [];
      for (let step = 0; step < 900; step += 3) {
        const cam = step * 1.37 + 0.4;   // a run's worth of scrolling, in fractions of a pixel
        area.place(cam, step, world(Math.floor(cam / 700) * 700 + 40));
        if (step >= 600) settled.push(S.live.size);
      }
      // Pictures that scrolled away were let go: the number alive stays level rather than climbing.
      assert.ok(Math.max(...settled) - Math.min(...settled) < 40, `${id}${room ? ' room' : ''}: pictures alive ran from ${Math.min(...settled)} to ${Math.max(...settled)}`);
    }
  });
}

/**
 * PIT LEGIBILITY, ON THE PICKED PIECES — tests/contrast.test.js's rule, moved onto the colours a
 * picked slice actually draws: its ground against the brightest pixel its own backdrop shows
 * through a pit (wherever the layers have scrolled to), its lit edge likewise, and the white
 * player against its ground. The same floors as the plain look: 2, 4.5 and 4.5.
 */
const { Raster } = await import('../src/systems/arena-art/pixels.js');
const chan = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lumOf = ([r, g, b]) => 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const cr = (a, b) => { const [x, y] = [lumOf(a), lumOf(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('every picked area\'s ground and lit edge stand out from what its pits show, and the player from its ground', () => {
  const bad = [];
  for (const id of PICKS) {
    const M = pickedMaterial(id);
    let brightest = 0, at = null;
    for (const cam of [0, 517, 1311, 2900]) {
      const r = new Raster(480, 224);
      for (const L of PICKED[id].backdrop.layers) L.fixed?.(r, Math.round(cam * L.rate));
      for (let y = 184; y < 224; y++) for (let x = 0; x < 480; x++) {
        const i = (y * 480 + x) * 4, l = lumOf([r.d[i], r.d[i + 1], r.d[i + 2]]);
        if (l >= brightest) { brightest = l; at = [r.d[i], r.d[i + 1], r.d[i + 2]]; }
      }
    }
    const g = cr(rgb(M.check.ground), at), e = cr(rgb(M.check.cap), at), p = cr([255, 255, 255], rgb(M.check.ground));
    if (g < 2 || e < 4.5 || p < 4.5) bad.push(`${id}: ground ${g.toFixed(2)}, edge ${e.toFixed(2)}, player ${p.toFixed(2)}`);
  }
  assert.deepEqual(bad, [], `picked areas whose pits do not read:\n  ${bad.join('\n  ')}`);
});
