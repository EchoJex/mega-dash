/**
 * THE TSUNAMI'S PICTURES, started from scratch by the owner (19 Nov 2026): a
 * splash where he lands, then a wave each way that grows as it travels, curls
 * and crashes at its wall. The pictures are SpriteCook sheet B1, AI-made
 * (SpriteCook) at the owner's request, 2026-11-19; `systems/tsunami.js` says
 * which one shows, and the fight takes the wave's height from the same one.
 *
 * Painted once when the room is built, never per step: every frame facing
 * right and mirrored facing left. The room places and crops them.
 */
import { canvas } from './pixels.js';
import { TSUNAMI, tsunamiFrame, splashFrame } from '../tsunami.js';

const KINDS = ['splash', 'rise', 'curl', 'crash'];

function paint(f, dir) {
  const cv = canvas(f.w, f.h), c = cv.getContext('2d');
  f.rows.forEach((r, y) => {
    for (let x = 0; x < f.w; x++) {
      const k = r[x]; if (k === '.') continue;
      c.fillStyle = TSUNAMI.pal[k]; c.fillRect(dir > 0 ? x : f.w - 1 - x, y, 1, 1);
    }
  });
  return cv;
}

/** Every picture, as `[name, canvas]` for `pieces`: `tsunami:<dir>:<kind>:<i>`. */
export function wavePictures() {
  const list = [];
  for (const dir of [1, -1]) for (const k of KINDS) TSUNAMI.boss[k].forEach((f, i) => list.push([`tsunami:${dir}:${k}:${i}`, paint(f, dir)]));
  return list;
}

/**
 * Where a wave of the fight's shows, and what: `{ name, f, left }`, `left`
 * being the picture's left edge in the room. Its front column sits on the
 * leading edge of the fight's box.
 */
export function wavePlace(w) {
  const { kind, i, f } = tsunamiFrame(TSUNAMI.boss, w.p || 0, w.crash > 0);
  const edge = w.dir > 0 ? w.x + w.w : w.x;
  const left = Math.round(w.dir > 0 ? edge - f.fx : edge - (f.w - 1 - f.fx));
  return { name: `tsunami:${w.dir}:${kind}:${i}`, f, left };
}

/** The splash where he landed, for `age` steps after: `{ name, f, left }`, or null once it is over. */
export function splashPlace(w, steps) {
  if (w.age >= steps) return null;
  const { i, f } = splashFrame(TSUNAMI.boss, w.age);
  return { name: `tsunami:1:splash:${i}`, f, left: Math.round(w.x0 - f.w / 2) };
}
