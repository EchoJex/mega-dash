/**
 * SPRITE KIT — the few helpers a page needs to SHOW and WRITE `.sprite` art,
 * on top of the one parser (`sprite-fmt.js`).
 *
 * WRITTEN FOR CLAUDE DESIGN, which draws a weapon's art from this repository
 * (design/weapon-art/README.md). Instead of writing its own reader and writer
 * for the format — a second copy that could drift from the game's — a design
 * page imports these, with `sprite-fmt.js` and the two files it imports
 * (`nes-palette.js`, `marks.js`), from the game's own site:
 *
 *     import { parse, serialize } from 'https://echojex.github.io/mega-dash/sprite-fmt.js';
 *     import { drawFrame, frameAt, rowsFromCanvas } from 'https://echojex.github.io/mega-dash/sprite-kit.js';
 *
 * or copies the four files next to its page. `serialize(parse(x)) === x`
 * byte for byte, so a sheet read, redrawn and written with these comes back
 * in exactly the shape the game's build expects.
 *
 * Nothing here is used by the game itself; `tests/weapon-art.test.js` checks
 * it against the real sheets so the kit cannot quietly go wrong.
 */
import { framesOf } from './sprite-fmt.js';

const EMPTY = '.';

/**
 * The frame of `clip` that shows `step` steps in (60 steps a second, each
 * frame for its `hold`): held on the last, or wrapped when `loop` is set.
 */
export function frameAt(doc, clip, step, loop = false) {
  const fr = framesOf(doc, clip);
  if (!fr.length) return null;
  const total = fr.reduce((n, f) => n + f.hold, 0);
  let t = Math.max(0, Math.floor(step));
  if (loop && total) t %= total;
  for (const f of fr) {
    if (t < f.hold) return f;
    t -= f.hold;
  }
  return fr[fr.length - 1];
}

/**
 * Paint one frame on a 2D canvas with its PIVOT at (x, y), `scale` screen
 * pixels per sprite pixel, mirrored about the pivot when `facing` is -1 —
 * exactly how the game places it. `marks: true` also draws the pivot (cyan
 * cross) and, on a frame that hits, its hit area (red) and spawn point (red
 * dot), the overlay the owner checks a handoff against.
 */
export function drawFrame(ctx, doc, frame, x, y, { scale = 1, facing = 1, marks = false } = {}) {
  const pv = doc.pivot || { x: 0, y: 0 };
  const colour = Object.fromEntries((doc.palette || []).map((p) => [p.key, p.hex]));
  const sx = (cx) => (facing < 0 ? x + (pv.x - cx - 1) * scale : x + (cx - pv.x) * scale);
  for (let r = 0; r < doc.h; r++) {
    const row = frame.rows[r] || '';
    for (let c = 0; c < doc.w; c++) {
      const ch = row[c];
      if (!ch || ch === EMPTY) continue;
      ctx.fillStyle = colour[ch] || '#FF00FF';      // magenta: a key with no colour
      ctx.fillRect(sx(c), y + (r - pv.y) * scale, scale, scale);
    }
  }
  if (!marks) return;
  ctx.lineWidth = Math.max(1, scale / 2);
  ctx.strokeStyle = '#5CCDD5';
  ctx.beginPath();
  ctx.moveTo(x - 3 * scale, y); ctx.lineTo(x + 3 * scale, y);
  ctx.moveTo(x, y - 3 * scale); ctx.lineTo(x, y + 3 * scale);
  ctx.stroke();
  if (frame.hit && frame.hit !== true) {
    const h = frame.hit;
    const left = facing < 0 ? x + (pv.x - h.x - h.w) * scale : x + (h.x - pv.x) * scale;
    ctx.strokeStyle = '#FF4A32';
    ctx.strokeRect(left, y + (h.y - pv.y) * scale, h.w * scale, h.h * scale);
  }
  if (frame.spawn) {
    ctx.fillStyle = '#FF4A32';
    const px = facing < 0 ? x + (pv.x - frame.spawn.x) * scale : x + (frame.spawn.x - pv.x) * scale;
    ctx.fillRect(px - scale, y + (frame.spawn.y - pv.y) * scale - scale, 2 * scale, 2 * scale);
  }
}

/**
 * A finished drawing back into `.sprite` rows: every opaque pixel of the
 * canvas, at 1 canvas pixel per sprite pixel from (0, 0), becomes the key of
 * its colour in `palette` ([{ key, hex }]); see-through becomes `.`. THROWS,
 * naming the pixel, on a colour the palette does not declare — the build
 * would refuse the sheet anyway, and this says where.
 */
export function rowsFromCanvas(ctx, w, h, palette) {
  const keyOf = new Map(palette.map((p) => [p.hex.toUpperCase(), p.key]));
  const px = ctx.getImageData(0, 0, w, h).data;
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] < 128) { row += EMPTY; continue; }
      const hex = `#${[px[i], px[i + 1], px[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
      const k = keyOf.get(hex);
      if (!k) throw new Error(`pixel ${x},${y} is ${hex}, which is not in the palette`);
      row += k;
    }
    rows.push(row);
  }
  return rows;
}
