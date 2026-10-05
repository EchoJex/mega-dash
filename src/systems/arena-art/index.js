/**
 * THE 16-BIT BOSS ROOMS — the owner-approved drawings from the Claude Design
 * handoff of 4 Oct 2026, brought into the game.
 *
 * A room with art here draws itself: its backdrop, its furniture, and the
 * hazards it knows. A room without art keeps the placeholder look in arena.js,
 * so a boss whose room has not been drawn is unaffected.
 *
 * EVERYTHING THAT MOVES IS DRAWN AHEAD OF TIME, by the owner's call. When the
 * room is built (behind the warp's full black) each moving thing — a sweeping
 * searchlight, rain, embers, a water edge — is painted once into numbered
 * frames by the design's own drawing code. Playing the room only picks a frame
 * and a position for each piece, which is how an SNES game worked and what
 * keeps a phone from repainting thousands of single pixels every frame.
 *
 * THE PICTURES FOLLOW THE GAME, NEVER THE OTHER WAY ROUND. Every piece reads
 * the state arena.js and bossFights.js already keep; nothing here changes what
 * anything does. The design page ran simplified stand-in fights to have
 * something to show — those were not brought across.
 */
import { DEPTH } from '../../config/display.js';
import proto from './proto.js';
import blaze from './blaze.js';

const ROOMS = { proto, blaze };

/** Does this boss's room have 16-bit art? */
export const hasArenaArt = (id) => Object.prototype.hasOwnProperty.call(ROOMS, id);

let builds = 0;

/**
 * Build a room's art for one visit, or null when the room has none.
 *
 * Built from `draw`, not when the arena is made, so `npm run sim` — which plays
 * thousands of fights and never draws a frame — never pays for a picture.
 */
export function makeArenaArt(scene, arena, viewW) {
  const id = arena?.boss?.id;
  if (!hasArenaArt(id)) return null;
  const S = stage(scene, `arena-art:${id}:${++builds}`, viewW);
  const room = ROOMS[id](S, arena, viewW);
  return {
    arena,
    /** Hazard kinds this room draws itself; anything else falls back to arena.js. */
    hazards: new Set(room.hazards || []),
    /** Terrain patch kinds (Hot ground and the like) this room draws itself. */
    patches: new Set(room.patches || []),
    /**
     * True when the room darkens itself and keeps its own lights on top — Volt
     * Man's. GameScene then darkens the bodies in the room instead of laying a
     * wash over everything, so a body still blocks the light behind it.
     */
    dim: !!room.dim,
    update(sh, reveal) {
      S.place(sh, reveal);
      room.update(arena);
    },
    destroy() { S.destroy(); },
  };
}

/**
 * THE STAGE — the few things a room builds its picture from.
 *
 * Layers are made in DRAW ORDER, back to front, and everything a room adds
 * goes into the latest one. A `far` layer moves at 0.3x of the screen shake,
 * the way the design's distant sky does; a `furn` layer is furniture, and
 * fades in a beat after the room on the warp in, as the tracker asks.
 */
function stage(scene, key, viewW) {
  const root = scene.add.container(0, 0).setDepth(DEPTH.arena);
  const layers = [], keys = [], made = new Map();
  let cur = null, n = 0;
  const add = (o) => { cur.add(o); return o; };

  const S = {
    viewW,
    layer({ far = false, furn = false } = {}) {
      cur = scene.add.container(0, 0);
      root.add(cur);
      layers.push({ c: cur, far, furn });
    },

    /** Hand a canvas, or a `frames` sheet, to Phaser once. Returns its key. */
    tex(src) {
      if (made.has(src)) return made.get(src);
      const k = `${key}:${n++}`;
      made.set(src, k);
      const t = scene.textures.addCanvas(k, src.cv || src);
      if (src.cells) src.cells.forEach(([x, y, w, h], i) => t.add(src.names ? src.names[i] : i, 0, x, y, w, h));
      keys.push(k);
      return k;
    },

    /**
     * A picture. A plain canvas sits where it is put; a `frames` sheet defaults
     * to the room position its frames were painted at, and `show(k)` picks
     * which one shows.
     */
    image(src, x = src.x0 ?? 0, y = src.y0 ?? 0) {
      const f = src.cells ? (src.names ? src.names[0] : 0) : undefined;
      const o = add(scene.add.image(x, y, S.tex(src), f).setOrigin(0));
      // `show(k)` picks a frame, and does nothing when that frame is already
      // up — most of the time it is, and a frame change is not free.
      let shown = f;
      o.show = (k) => { if (k !== shown) { shown = k; o.setFrame(k); } return o; };
      return o;
    },

    /**
     * A reusable set of pictures that can each show PART of a frame — for
     * things that come and go and vary in width, like a strip of Hot ground.
     * Same begin/put/end rhythm as `pool`; `put` takes the crop rectangle in
     * the frame's own coordinates and the picture is placed by its frame's
     * top-left corner, so a crop lands exactly where it was painted.
     */
    crops(src) {
      const key = S.tex(src), box = add(scene.add.container(0, 0)), list = [];
      let i = 0;
      return {
        begin() { i = 0; },
        put(x, y, frame, cx, cy, cw, ch) {
          let o = list[i++];
          if (!o) { o = scene.add.image(0, 0, key, frame).setOrigin(0); o.was = [frame]; box.add(o); list.push(o); }
          const w = o.was;
          if (w[0] !== frame) { w[0] = frame; o.setFrame(frame); w[1] = null; }
          if (w[1] !== cx || w[2] !== cy || w[3] !== cw || w[4] !== ch) { w[1] = cx; w[2] = cy; w[3] = cw; w[4] = ch; o.setCrop(cx, cy, cw, ch); }
          o.x = Math.round(x); o.y = Math.round(y);
          if (!o.visible) o.setVisible(true);
        },
        end() { for (let k = i; k < list.length; k++) if (list[k].visible) list[k].setVisible(false); },
      };
    },

    /** A picture that repeats across `w` and scrolls with `tilePositionX`. */
    tile(src, x, y, w, h) {
      return add(scene.add.tileSprite(x, y, w, h, S.tex(src)).setOrigin(0));
    },

    /** A flat colour, for washes. */
    rect(x, y, w, h, color, alpha = 1) {
      return add(scene.add.rectangle(x, y, w, h, color, alpha).setOrigin(0));
    },

    /**
     * MANY SMALL THINGS — sparks, drops, ash, embers. One Phaser Blitter, which
     * draws a whole crowd of small pictures in one go, with its pieces reused
     * frame to frame rather than made and thrown away.
     *
     * `atlas` is a `pieces` sheet. Each frame: `begin()`, `put(x, y, name)` per
     * thing on screen, `end()` hides whatever was left over.
     */
    pool(atlas) {
      const b = add(scene.add.blitter(0, 0, S.tex(atlas)));
      const bobs = [];
      let i = 0;
      return {
        begin() { i = 0; },
        put(x, y, name, alpha = 1) {
          if (!atlas.has(name)) return;
          let o = bobs[i++];
          if (!o) { o = b.create(0, 0, name); o.was = name; bobs.push(o); }
          // Only what changed is touched: a piece that kept its picture and
          // stayed on screen costs two numbers.
          o.x = Math.round(x); o.y = Math.round(y);
          if (o.was !== name) { o.was = name; o.setFrame(name); }
          if (!o.visible) o.visible = true;
          if (o.alpha !== alpha) o.alpha = alpha;
        },
        end() { for (let k = i; k < bobs.length; k++) if (bobs[k].visible) bobs[k].visible = false; },
      };
    },

    place(sh, reveal) {
      for (const L of layers) {
        const k = L.far ? 0.3 : 1;
        L.c.setPosition(Math.round(sh.x * k), Math.round(sh.y * k));
        if (L.furn) L.c.setAlpha(reveal).setVisible(reveal > 0);
      }
    },

    destroy() {
      root.destroy();
      for (const k of keys) scene.textures.remove(k);
    },
  };
  return S;
}
