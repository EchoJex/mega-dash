/**
 * AN AREA'S WORLD PIECES, IN THE GAME — the owner's picks from the review canvas (slices.js).
 *
 * A slice with picked pieces draws its area itself: the backdrop, the ground with its pits, the
 * platforms, the spike beds and the boss door; and in that boss's room, the exit door (the owner's
 * answer, 5 Nov 2026). Any other slice keeps the plain shapes GameScene.draw has always drawn, so a
 * slice whose pieces have not been picked yet is unaffected. Drawn by Claude at the owner's
 * request and picked by the owner, 5 Nov 2026.
 *
 * EVERYTHING IS PAINTED ONCE, THEN ONLY PLACED, exactly as in the boss rooms (arena-art). Each
 * backdrop layer is painted into a strip that repeats without a seam and scrolls at its own speed;
 * the things in it that move by themselves (embers, a cheering crowd, a shark) are small pictures
 * painted when the area is built and put where they belong every step, by Phaser, in one go. The
 * ground is painted in slices of the world as they come into view; each platform, spike bed and
 * door when it first appears. Each is let go once it has scrolled away.
 *
 * NOTHING HERE CHANGES WHAT ANYTHING DOES. It reads the world terrain.js builds: every pit,
 * platform, spike bed and door is exactly where, and as big as, it always was.
 */
import { DEPTH } from '../../config/display.js';
import { stage } from '../arena-art/index.js';
import { Raster, pieces } from '../arena-art/pixels.js';
import { W, H, FLOOR, paintDoor } from './kit.js';
import { PICKED, pickedMaterial } from './slices.js';

/** Does this boss's area have picked world pieces? */
export const hasAreaArt = (id) => Object.prototype.hasOwnProperty.call(PICKED, id);
export { pickedMaterial };

/** A backdrop layer's still part: a strip `period` wide that repeats, or one screen for a layer that stays put. */
export function strip(L) {
  const P = L.rate ? L.period : W, r = new Raster(P, H);
  // The painters work a screen (W) at a time, so a wider strip is painted a screen at a time.
  for (let ox = 0; ox < P; ox += W) L.fixed({ set: (x, y, c, a) => { if (x >= 0 && x < W) r.set(x + ox, y, c, a); } }, ox);
  r.flush();
  return r;
}

/** Ground spans that touch or overlap, joined: a pit edge only where there really is a pit. */
export function runs(spans) {
  const list = spans.map((s) => [Math.round(s.x1), Math.round(s.x2)]).sort((a, b) => a[0] - b[0]), out = [];
  for (const s of list) {
    const last = out[out.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else out.push(s);
  }
  return out;
}

const SLICE = 256;           // the ground is painted in slices of the world this wide
const ABOVE = 8;             // and from this far above the ground line, for grass tufts and the like
const MARGIN = 16;           // painted a little before it scrolls into view

/**
 * Build an area's pieces (or, for a boss room, only its exit door) on a stage `S`: the real one
 * (makeAreaArt), or a stand-in in the tests. Returns `place(cam, t, world)`, called every drawn
 * step with the camera, the game's step count and the world as terrain.js keeps it.
 */
export function buildArea(S, id, viewW, room = false) {
  const slice = PICKED[id], M = pickedMaterial(id), layers = [];

  if (!room) {
    for (const L of slice.backdrop.layers) {
      S.layer({ far: true });
      const pic = !L.fixed ? null : L.rate ? S.tile(strip(L), 0, 0, viewW, H) : S.image(strip(L), 0, 0);
      const pools = L.parts.map((part) => [part, S.pool(pieces(part.pieces().map(([n, r]) => [n, r.flush()])))]);
      layers.push({ L, pic, pools });
    }
  }
  const terrain = room ? null : S.layer({ depth: DEPTH.world - 0.5 });
  // Above every piece of ground, however late it was painted.
  const sparks = room || !M.sparks ? null : (S.layer({ depth: DEPTH.world - 0.4 }), S.pool(pieces(M.sparks.colours)));
  const doorLayer = S.layer({ depth: DEPTH.world + 0.5 });
  const doorPic = (kind, off) => {
    const d = M.doorPicture(kind);
    if (!off) return d.flush();
    const r = new Raster(16, 28);
    paintDoor(r, d, 0, 0, 'unarmed');   // grey and see-through: the door will not open yet
    return r.flush();
  };
  const doorSheet = pieces([['boss', doorPic('boss')], ['exit', doorPic('exit')], ['boss-off', doorPic('boss', true)], ['exit-off', doorPic('exit', true)]]);

  const grounds = new Map(), things = new Map();
  /** A picture of one world thing, painted the first time it is wanted and kept while it is. */
  const keep = (map, key, seen, paint, x, y) => {
    seen.add(key);
    let e = map.get(key);
    if (!e) {
      const r = paint();
      r.flush();
      S.use(terrain);
      e = { r, o: S.image(r, x, y) };
      map.set(key, e);
    }
    return e.o;
  };
  const forget = (map, seen) => { for (const [k, e] of map) if (!seen.has(k)) { S.drop(e.o, e.r); map.delete(k); } };
  const doors = new Map();

  return {
    place(cam, t, world, px) {   // px: where the player is on screen, for parts that answer to him
      const c = Math.round(cam);   // for what is in view; pictures go exactly where GameScene puts everything else
      for (const { L, pic, pools } of layers) {
        const ox = Math.round(cam * L.rate);
        if (pic && L.rate) pic.tilePositionX = ox;
        for (const [part, pool] of pools) {
          pool.begin();
          for (const [n, x, y] of part.at(ox, t, px)) pool.put(x, y, n);
          pool.end();
        }
      }

      if (!room) {
        // THE GROUND, a slice of the world at a time. A slice is painted again only if the
        // ground in it changes (a door's footing added after it was first seen), which shows
        // in `sig`: the runs that reach into it, cut to just beyond its edges.
        const seenG = new Set(), all = runs(world.groundSpans);
        for (let k = Math.floor((c - MARGIN) / SLICE); k * SLICE < c + viewW + MARGIN; k++) {
          const a = k * SLICE, b = a + SLICE;
          const mine = all.filter(([x1, x2]) => x2 > a - 2 && x1 < b + 2).map(([x1, x2]) => [Math.max(x1, a - 2), Math.min(x2, b + 2)]);
          if (!mine.length) continue;
          const key = `${k}|${mine.join(',')}`;
          const o = keep(grounds, key, seenG, () => {
            // A run cut to the slice draws its pit edges just outside it when it carries on, so
            // only a real pit edge lands inside: the picture is the same as the run painted whole.
            const r = new Raster(SLICE, H - FLOOR + ABOVE);
            const clip = { set: (x, y, col, al) => { if (x >= a && x < b) r.set(x - a, y - FLOOR + ABOVE, col, al); } };
            for (const [x1, x2] of mine) M.ground(clip, x1, x2);
            return r;
          }, a - cam, FLOOR - ABOVE);
          o.x = a - cam;
        }
        forget(grounds, seenG);

        const seen = new Set();
        for (const p of world.platforms) {
          if (p.x + p.w < c - MARGIN || p.x > c + viewW + MARGIN) continue;
          const x0 = Math.floor(p.x), y0 = Math.floor(p.y);
          keep(things, p, seen, () => {
            const r = new Raster(Math.ceil(p.x + p.w) - x0 + 1, 5);
            M.platform({ set: (x, y, col, al) => r.set(x - x0, y - y0, col, al) }, p.x, p.y, p.w);
            return r;
          }, x0 - cam, y0).x = x0 - cam;
        }
        sparks?.begin();
        for (const s of world.spikes) {
          if (s.x + s.w < c - MARGIN || s.x > c + viewW + MARGIN) continue;
          const x0 = Math.floor(s.x) - 2;
          keep(things, s, seen, () => {
            const r = new Raster(Math.ceil(s.w) + 5, 10);
            M.spikes({ set: (x, y, col, al) => r.set(x - x0, y - (FLOOR - 9), col, al) }, s.x, s.w);
            return r;
          }, x0 - cam, FLOOR - 9).x = x0 - cam;
          if (sparks) for (const [x, y, k] of M.sparks.at(s.x, s.w, t)) sparks.put(x - cam, y, M.sparks.colours[k]);
        }
        sparks?.end();
        forget(things, seen);
      }

      // THE DOORS: the boss door in an area, the exit door in a boss room. GameScene still draws
      // the gold pulse behind a door that will open; this is the door itself.
      const seenD = new Set();
      for (const d of world.doors) {
        seenD.add(d);
        let o = doors.get(d);
        if (!o) { S.use(doorLayer); o = S.image(doorSheet); doors.set(d, o); }
        o.show(`${d.wrap ? 'exit' : 'boss'}${d.armed === false ? '-off' : ''}`);
        o.x = d.x - cam; o.y = d.y - d.h;   // where the gold pulse is, so the two line up
      }
      for (const [d, o] of doors) if (!seenD.has(d)) { o.destroy(); doors.delete(d); }
    },
  };
}

let builds = 0;

/**
 * An area's pieces for one visit (or a boss room's exit door, with `room`), or null when the boss
 * has none picked. Built from `draw`, never when the world is made, so `npm run sim` — which plays
 * thousands of fights and never draws a frame — never pays for a picture.
 */
export function makeAreaArt(scene, id, viewW, room = false) {
  if (!hasAreaArt(id)) return null;
  const S = stage(scene, `area-art:${id}:${++builds}`, viewW);
  const area = buildArea(S, id, viewW, room);
  return {
    update(cam, sh, t, world, px) {
      S.place(sh, 1);
      area.place(cam, t, world, px);
    },
    destroy() { S.destroy(); },
  };
}
