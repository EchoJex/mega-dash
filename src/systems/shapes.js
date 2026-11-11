/**
 * ART-SHAPED COLLISION — the trial on branch test/art-collision.
 *
 * The owner's ask (10 Nov 2026): "match all collision dimensions to their visible art dimensions
 * within the nearest rectangle. For complex shapes use up to 5 rectangles for best fit", following
 * every picture of every animation, and "once fitted, use a 5% collision diameter
 * increase/decrease, always in the players favor".
 *
 * This is the opposite of architecture rule 4 on `main` (one steady box per thing), on purpose:
 * the branch exists to find out how it plays.
 *
 * `npm run sprites:build` fits the rectangles into `src/data/art-shapes.json`, one set per frame
 * of every sheet. This file puts a set where the game draws that picture, in world pixels, and
 * tests two sets against each other. **A thing with no drawing returns null**, and the caller
 * keeps the box it always had: plain shapes are already drawn at their box.
 *
 * Everything reads the game's own clock, never the renderer's, so the frame a hit is tested
 * against is the frame on screen (`ActorLayer.draw` shows `frameAt` when it is handed `t`).
 */
import SHAPES from '../data/art-shapes.json' with { type: 'json' };
import ART from '../data/sprite-art.json' with { type: 'json' };
import { fitRects } from './fit-rects.js';

/** How much a fitted shape grows or shrinks, always in the player's favour. */
export const FAVOR = 0.05;
export const KIND = (1 - FAVOR);   // something that would hurt him, and his own body: smaller
export const GENEROUS = (1 + FAVOR);   // something he hits or picks up: bigger

/** Which frame of sheet `key` shows `t` steps into `clip`, looping. -1 with no such clip. */
export function frameAt(key, clip, t) {
  const a = ART[key];
  const frames = a?.anims?.[clip] ?? (a?.anims && Object.values(a.anims)[0]);
  if (!frames?.length) return -1;
  const holds = a.holds?.[clip] ?? Object.values(a.holds || {})[0] ?? frames.map(() => 5);
  let total = 0;
  for (const hold of holds) total += hold;
  let at = ((Math.floor(t) % total) + total) % total;
  for (let i = 0; i < frames.length; i++) {
    if (at < holds[i]) return frames[i];
    at -= holds[i];
  }
  return frames[frames.length - 1];
}

/** Scale a set of rectangles about the middle of the whole shape. */
export function scaled(rects, k) {
  if (k === 1 || !rects.length) return rects;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rects) {
    x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return rects.map((r) => ({ x: cx + (r.x - cx) * k, y: cy + (r.y - cy) * k, w: r.w * k, h: r.h * k }));
}

/**
 * The rectangles of frame `frame` of sheet `key`, in world pixels, placed the way the game
 * draws it:
 *   - `box` (its collision box): the picture sits centred on the box, feet on its bottom edge,
 *     or centred on its middle for a shot or a pickup, as `ActorLayer.draw` places it;
 *   - `pivot` ({x, y}): the picture is held by its sheet's pivot, as `ActorLayer.drawCell` does.
 * `facing` below 0 mirrors it. `k` is KIND, GENEROUS or 1. Null when there is no such picture.
 */
export function artRects(key, frame, { box, pivot, facing = 1 }, k = 1) {
  const cell = SHAPES[key]?.[frame], a = ART[key];
  if (!cell?.length || !a) return null;
  const fw = a.frameW, fh = a.frameH, flip = facing < 0;
  let left, top;
  if (pivot) {
    const [px, py] = a.pivot ?? [fw / 2, fh / 2];
    left = Math.round(pivot.x) - (flip ? fw - px : px);
    top = Math.round(pivot.y) - py;
  } else {
    const cx = Math.round(box.x + box.w / 2 + (a.offX || 0));
    left = cx - fw / 2;
    top = a.anchor === 'center'
      ? Math.round(box.y + box.h / 2 + (a.offY || 0)) - fh / 2
      : Math.round(box.y + box.h + (a.offY || 0)) - fh;
  }
  return scaled(cell.map(([x, y, w, h]) => ({ x: left + (flip ? fw - x - w : x), y: top + y, w, h })), k);
}

const discs = new Map();
/**
 * A round shot with no drawing: the same fit, on the disc the game draws for it. Fitted once
 * per size and kept. (A shot's fancier plain shapes are all drawn inside this disc's reach.)
 */
export function discRects(x, y, radius, k = 1) {
  const r = Math.max(1, Math.round(radius));
  if (!discs.has(r)) {
    discs.set(r, fitRects(r * 2, r * 2, (px, py) => Math.hypot(px + 0.5 - r, py + 0.5 - r) <= r));
  }
  return scaled(discs.get(r).map(([rx, ry, w, h]) => ({ x: x - r + rx, y: y - r + ry, w, h })), k);
}

/** Do any two rectangles of the two sets overlap? */
export function touch(a, b) {
  for (const p of a) for (const q of b) {
    if (p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y) return true;
  }
  return false;
}

/** One plain box as a set, for the things that have no drawing. */
export const boxSet = (b) => [{ x: b.x, y: b.y, w: b.w, h: b.h }];
