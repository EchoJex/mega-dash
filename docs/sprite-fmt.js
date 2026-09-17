/**
 * THE `.sprite` FORMAT — one parser, imported by the editor AND by the build.
 *
 * Exactly the deal `tracker-md.js` has, and for the same reason: two copies of a
 * parser drift, and the one that drifts is always the one nobody is looking at.
 *
 * WHY TEXT AND NOT PNG. The editor could write the PNG the game loads directly
 * — the GitHub Contents API takes base64 and the autosave path would be
 * identical. Text wins on three counts that matter more than the extra build
 * step:
 *
 *   IT DIFFS. A binary autosave every few seconds is a wall of opaque blobs;
 *   this shows you which pixels moved, in a pull request, months later.
 *
 *   IT STORES ROLES, NOT COLOURS. A pixel is `1` for primary, not `#EA6A34`.
 *   The seventeen boss primaries are perceptually optimised as a SET, so they
 *   get re-tuned as a set — and when one changes, every sprite drawn against it
 *   recolours with no art reopened. A PNG would have to be repainted.
 *
 *   IT CANNOT BREAK THE PALETTE RULE. Three colours plus transparency is not a
 *   convention the artist has to remember here; it is the only thing the file
 *   can express.
 *
 * The cost is `npm run sprites:build`, which turns these into the PNGs
 * `MANIFEST` already knows how to load. Nothing downstream of that changes.
 *
 * SHAPE
 * -----
 *     # player                       <- the actor id, and the id is the join key
 *     status    deferred
 *     grid      24x24
 *     fudge     0.70 x 1.00
 *     note      anything after this is ignored, so notes are free
 *
 *     [idle 1] status=ready hold=40
 *     ........................
 *     ....00000000............
 *     ...
 *
 * One block per frame, each exactly `grid` rows of `grid` characters.
 * `.` transparent, `0` outline, `1` primary, `2` secondary — see ROLES.
 *
 * A FRAME IS `ACTOR > ACTION > INDEX`, AND THE INDEX IS 1-BASED PER ACTION.
 * `[run 1]` through `[run 6]` are one animation; `[idle 1]`, `[idle 2]` are
 * another. The sheet's absolute frame position is DERIVED from the order the
 * blocks appear in, never written down — which is what makes inserting a frame
 * safe. `MANIFEST.anims` used to hold those absolute indices by hand, so
 * inserting a frame anywhere but the end silently shifted every animation
 * after it; `npm run sprites:build` now regenerates them from this file.
 *
 * `status` is PER FRAME. A sheet is rarely finished all at once, and the old
 * one-status-per-sheet gate meant a single unfinished pose held back every
 * finished one.
 *
 * `hold` IS IN SIM STEPS — how many 1/60s game steps this frame stays on
 * screen. The game has always had this number; it was just spelled as one
 * `fps` for the whole sheet (12fps = 5 steps), with `animFps` as the single
 * escape hatch (the idle's 1.5fps = 40 steps). Per frame, it can be drawn
 * against instead of worked around. 5 is the default because that is what the
 * shipped sheet does everywhere except the idle.
 */

import { EMPTY } from './nes-palette.js';
import { MARKS } from './marks.js';

/**
 * A frame's status is a rung on the SAME ladder the tracker's fields use —
 * deferred, wip, draft, ready — so a rule written about one applies to the
 * other without translation. `marks.js` is the one copy.
 */
export const STATUSES = MARKS;

/**
 * One drawn frame lasts this many 1/60s sim steps unless it says otherwise.
 *
 * FIVE, because that is what the game already does: the player sheet is
 * `fps: 12`, and 60/12 is 5. A new frame therefore matches the frames beside
 * it, which a rounder-looking 10 would not — it would quietly play at half the
 * speed of its own animation.
 */
export const DEFAULT_HOLD = 5;

/**
 * Split a legacy frame name into an action and a 1-based index.
 *
 * Three shapes exist in the wild and all three are this editor's own doing:
 *
 *   `idle0` / `run3`   a trailing 0-based number — becomes index n+1
 *   `slide` / `jumpRise`   no number at all — one frame, index 1
 *   `slide_b` / `fly0_b_b` the old +FRAME button appended `_b` to the name it
 *                          copied, so the sixth frame of the Volt Spark was
 *                          called `fly0_b_b_b_b_b`. Each `_b` is one step
 *                          further along the same action.
 *
 * Order is preserved and indices are renumbered from the block order anyway,
 * so this only has to get the ACTION right; the number is a sanity check.
 */
export function splitLegacyName(name) {
  let n = String(name).trim();
  let bumps = 0;
  while (n.endsWith('_b')) { n = n.slice(0, -2); bumps++; }
  const m = /^(.*?)(\d+)$/.exec(n);
  if (m && m[1]) return { action: m[1], index: +m[2] + 1 + bumps };
  return { action: n || 'frame', index: 1 + bumps };
}

/** A blank frame: `h` rows of `w` transparent pixels. */
export const blankFrame = (w, h) => Array.from({ length: h }, () => EMPTY.repeat(w));

export function parse(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const doc = {
    id: null, w: 0, h: 0,
    fudgeW: 0.7, fudgeH: 1, note: '', frames: [],
  };
  let frame = null;
  // The pre-per-frame sheet-wide `status` line, if this file still has one.
  let legacyStatus = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line) continue;

    if (line.startsWith('# ')) { doc.id = line.slice(2).trim(); continue; }

    /**
     * `[action index] status=ready hold=40`, or a legacy `[idle0]`.
     *
     * The attributes ride on the header line rather than on key lines inside
     * the block, so flipping one frame's status is a ONE-LINE diff and a pixel
     * row can never be mistaken for a key — a row is only ever `.012`.
     */
    const head = /^\[([^\]]+)\]\s*(.*)$/.exec(line);
    if (head) {
      const inside = head[1].trim();
      const attrs = head[2];
      const m = /^(\S+)\s+(\d+)$/.exec(inside);
      const { action, index } = m
        ? { action: m[1], index: +m[2] }
        : splitLegacyName(inside);
      const at = (k) => new RegExp(`\\b${k}=(\\S+)`).exec(attrs)?.[1];
      const st = at('status');
      const hold = Number(at('hold'));
      frame = {
        action,
        index,
        status: STATUSES.includes(st) ? st : 'wip',
        hold: Number.isFinite(hold) && hold > 0 ? Math.round(hold) : DEFAULT_HOLD,
        rows: [],
      };
      doc.frames.push(frame);
      continue;
    }

    // A key line only counts BEFORE the first frame. After one has opened,
    // everything is pixels — otherwise a row of dots that happened to look like
    // a key would be eaten as one.
    if (!frame) {
      const kv = /^(\w+)\s+(.*)$/.exec(line);
      if (kv) {
        const [, k, v] = kv;
        if (k === 'status' && STATUSES.includes(v.trim())) legacyStatus = v.trim();
        else if (k === 'grid') {
          const g = /^(\d+)\s*x\s*(\d+)$/.exec(v.trim());
          if (g) { doc.w = +g[1]; doc.h = +g[2]; }
        } else if (k === 'fudge') {
          const f = /^([0-9.]+)\s*x\s*([0-9.]+)$/.exec(v.trim());
          if (f) { doc.fudgeW = +f[1]; doc.fudgeH = +f[2]; }
        } else if (k === 'note') doc.note = v.trim();
        continue;
      }
    }

    if (frame) frame.rows.push(line);
  }

  /**
   * PAD AND TRIM TO THE GRID rather than trusting the file. A hand-edited or
   * half-uploaded sprite with one short row must open in the editor and be
   * fixable, not throw — the whole point of a text format is that a human can
   * touch it, and a parser that refuses the result of that is a parser that
   * makes the format a lie.
   */
  if (doc.w && doc.h) {
    for (const f of doc.frames) {
      f.rows = f.rows.slice(0, doc.h);
      while (f.rows.length < doc.h) f.rows.push(EMPTY.repeat(doc.w));
      f.rows = f.rows.map((r) => (r.length >= doc.w
        ? r.slice(0, doc.w)
        : r + EMPTY.repeat(doc.w - r.length)));
    }
  }
  if (!doc.frames.length && doc.w && doc.h) {
    doc.frames.push({
      action: 'idle', index: 1, status: 'wip', hold: DEFAULT_HOLD,
      rows: blankFrame(doc.w, doc.h),
    });
  }

  /**
   * A LEGACY SHEET INHERITS ITS OLD SHEET-WIDE STATUS on every frame. Dropping
   * a `ready` sheet to a wall of `wip` on first open would un-ship finished art
   * for having touched the parser.
   */
  if (legacyStatus) for (const f of doc.frames) f.status = legacyStatus;

  return renumber(doc);
}

/**
 * Renumber every frame's index from its position within its own action.
 *
 * THIS IS WHAT MAKES INSERTING A FRAME SAFE. Nothing anywhere stores an
 * absolute sheet position, so a frame dropped into the middle of `run` cannot
 * shift `slide`; the indices are re-derived from block order every time the
 * file is read or written. Mutates and returns `doc`.
 */
export function renumber(doc) {
  const seen = new Map();
  for (const f of doc.frames) {
    const n = (seen.get(f.action) || 0) + 1;
    seen.set(f.action, n);
    f.index = n;
  }
  return doc;
}

/** Every action on this sheet, in the order they first appear. */
export const actionsOf = (doc) => [...new Set(doc.frames.map((f) => f.action))];

/** The frames of one action, in order, each with its absolute sheet position. */
export const framesOf = (doc, action) => doc.frames
  .map((f, at) => ({ ...f, at }))
  .filter((f) => f.action === action);

export function serialize(doc) {
  renumber(doc);
  const out = [`# ${doc.id}`];
  out.push(`grid      ${doc.w}x${doc.h}`);
  out.push(`fudge     ${doc.fudgeW.toFixed(2)} x ${doc.fudgeH.toFixed(2)}`);
  if (doc.note) out.push(`note      ${doc.note}`);
  for (const f of doc.frames) {
    out.push('', `[${f.action} ${f.index}] status=${f.status} hold=${f.hold}`, ...f.rows);
  }
  out.push('');
  return out.join('\n');
}

/**
 * The drawn silhouette's bounding box, and the collision box the fudge factors
 * propose from it.
 *
 * THIS IS THE WHOLE POINT OF THE FUDGE CONTROL. The game's fairness rule is
 * that the collision box is NARROWER than the drawing, so a near miss visibly
 * misses — measured off the shipped player art, the standing box is 12 wide
 * against a 17px silhouette and the slide box is 16 against 21, which is 0.71
 * and 0.76. Height is 22 against 23 and 11 against 11: essentially 1.0.
 *
 * So the two axes are NOT one number, and the editor offers them separately.
 * Width is the dial that buys fairness; height is honest because platforming
 * needs to know exactly where the feet are.
 *
 * The box is centred horizontally on the silhouette and sits on its BOTTOM
 * edge, because that is what `AssetLayer.draw` does with the finished art.
 */
export function bounds(frame, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (frame.rows[y][x] === EMPTY) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function proposedBox(frame, w, h, fudgeW, fudgeH) {
  const b = bounds(frame, w, h);
  if (!b) return null;
  const bw = Math.max(1, Math.round(b.w * fudgeW));
  const bh = Math.max(1, Math.round(b.h * fudgeH));
  return {
    w: bw, h: bh,
    x: b.x0 + Math.round((b.w - bw) / 2),
    y: b.y1 + 1 - bh,
  };
}

/**
 * WRAP THE SILHOUETTE IN THE OUTLINE ROLE, growing OUTWARD by one pixel.
 *
 * Outward and not inward, because that is how the shipped art is actually
 * drawn — `player.sprite` reads `....0000111111110`, outline sitting around
 * the fill rather than eating its edge. Growing inward would keep the sprite
 * the same size and make every drawing a pixel thinner than the artist drew it.
 *
 * Only primary and secondary count as solid, so outline never grows outline:
 * running this twice does the same thing as running it once.
 *
 * `clipped` is true when the grid edge stopped the outline going where it
 * should have. The caller says so out loud rather than silently shipping a
 * sprite whose outline is open along one side.
 */
export function outlineFrame(rows, w, h) {
  const out = rows.map((r) => [...r]);
  const solid = (x, y) => rows[y][x] === '1' || rows[y][x] === '2';
  let clipped = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) { clipped = true; continue; }
        if (rows[ny][nx] === EMPTY) out[ny][nx] = '0';
      }
    }
  }
  return { rows: out.map((r) => r.join('')), clipped };
}

/**
 * REGION OPS — the three moves a rectangular selection is made of.
 *
 * They are pure and they live here rather than inside the editor's script for
 * the same reason `outlineFrame` does: a frame is an array of short strings,
 * so the whole of "move that arm two pixels left" is string arithmetic that a
 * test can reach without a browser.
 *
 * A region may hang off the grid. `readRegion` pads with transparent and
 * `stampRegion` clips, because a selection dragged half off the canvas is a
 * thing an artist does on purpose and losing what went over the edge is the
 * honest result — not an exception.
 */
const inGrid = (x, y, w, h) => x >= 0 && y >= 0 && x < w && y < h;

export function readRegion(rows, gw, gh, sel) {
  return Array.from({ length: sel.h }, (_, j) => Array.from({ length: sel.w }, (_, i) => {
    const x = sel.x + i, y = sel.y + j;
    return inGrid(x, y, gw, gh) ? rows[y][x] : EMPTY;
  }).join(''));
}

export function clearRegion(rows, gw, gh, sel) {
  return rows.map((row, y) => {
    if (y < sel.y || y >= sel.y + sel.h) return row;
    const a = [...row];
    for (let i = 0; i < sel.w; i++) {
      const x = sel.x + i;
      if (inGrid(x, y, gw, gh)) a[x] = EMPTY;
    }
    return a.join('');
  });
}

/**
 * TRANSPARENT CELLS DO NOT PAINT. Moving an arm over the torso must not punch
 * a rectangular hole around it — the selection is a rectangle but the thing
 * inside it is not, and the gaps are where the rest of the drawing shows
 * through. The origin is already blank by the time this runs on a move.
 */
export function stampRegion(rows, gw, gh, cells, x0, y0) {
  const out = rows.map((r) => [...r]);
  cells.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      const x = x0 + i, y = y0 + j;
      if (ch !== EMPTY && inGrid(x, y, gw, gh)) out[y][x] = ch;
    });
  });
  return out.map((r) => r.join(''));
}
