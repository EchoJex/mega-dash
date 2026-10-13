/**
 * FRAME DATA AT RUN TIME — the timing and hit areas drawn into a weapon's
 * `.sprite` files, as the game plays them.
 *
 * `npm run sprites:build` reads every sheet in `src/data/weapon-art.js` and
 * writes `src/data/frame-data.json`; this is the only thing that reads it. A
 * move's length, the step it hits on and the rectangle it hits are therefore
 * whatever the drawing says, so moving a hold or a hit area in the art moves
 * the game with it — that is the point of keeping them in one file.
 *
 * Everything here is in STEPS (1/60s each, the game's one clock) and in pixels
 * measured from the sheet's pivot, facing right.
 */
import FRAME_DATA from '../data/frame-data.json' with { type: 'json' };

/**
 * One clip's data. THROWS when it is missing rather than limping on: the
 * build refuses a sheet without every clip the registry names, so a miss here
 * means `frame-data.json` is stale, and `npm test` should say so loudly.
 */
export function clipOf(key, name) {
  const c = FRAME_DATA[key]?.clips?.[name];
  if (!c) throw new Error(`no frame data for ${key} '${name}' — run npm run sprites:build`);
  return c;
}

/** Which frame of a clip shows on `step`: wrapped for a loop, held on the last otherwise. */
export function frameAt(c, step, loop = false) {
  let t = Math.max(0, Math.floor(step));
  if (loop && c.total > 0) t %= c.total;
  for (let i = 0; i < c.holds.length; i++) {
    if (t < c.holds[i]) return i;
    t -= c.holds[i];
  }
  return c.holds.length - 1;
}

/**
 * The sheet cell to draw on `step`, or -1 when no drawn frame can stand in.
 *
 * A frame that is still being redrawn has no picture yet, so the last drawn
 * frame before it in the same clip holds instead — the timing never moves,
 * only the picture waits. With nothing drawn before it, -1 tells the layer to
 * use the placeholder shapes.
 */
export function cellAt(c, step, loop = false) {
  for (let i = frameAt(c, step, loop); i >= 0; i--) if (c.ship[i]) return c.cells[i];
  return -1;
}

/** A clip's hit area, put in the world at pivot (px, py), mirrored when facing left. */
export function areaAt(h, px, py, facing) {
  return { x: facing < 0 ? px - h.x - h.w : px + h.x, y: py + h.y, w: h.w, h: h.h };
}

/** A point drawn on the sheet (a spawn), put in the world the same way. */
export function pointAt(s, px, py, facing) {
  return { x: facing < 0 ? px - s.x : px + s.x, y: py + s.y };
}

/** Steps a `grow` clip hurts for: up to the end of its last frame marked `hit`. */
export function growStepsOf(c) {
  const last = c.hits[c.hits.length - 1];
  return last ? last.step + last.len : 0;
}
