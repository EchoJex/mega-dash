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
 *     [idle0]
 *     ........................
 *     ....00000000............
 *     ...
 *
 * One `[frame]` block per frame, each exactly `grid` rows of `grid` characters.
 * `.` transparent, `0` outline, `1` primary, `2` secondary — see ROLES.
 */

import { EMPTY } from './nes-palette.js';

export const STATUSES = ['deferred', 'wip', 'draft', 'ready'];

/** A blank frame: `h` rows of `w` transparent pixels. */
export const blankFrame = (w, h) => Array.from({ length: h }, () => EMPTY.repeat(w));

export function parse(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const doc = {
    id: null, status: 'deferred', w: 0, h: 0,
    fudgeW: 0.7, fudgeH: 1, note: '', frames: [],
  };
  let frame = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line) continue;

    if (line.startsWith('# ')) { doc.id = line.slice(2).trim(); continue; }

    const head = /^\[(.+)\]$/.exec(line);
    if (head) {
      frame = { name: head[1].trim(), rows: [] };
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
        if (k === 'status' && STATUSES.includes(v.trim())) doc.status = v.trim();
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
    doc.frames.push({ name: 'frame0', rows: blankFrame(doc.w, doc.h) });
  }
  return doc;
}

export function serialize(doc) {
  const out = [`# ${doc.id}`];
  out.push(`status    ${doc.status}`);
  out.push(`grid      ${doc.w}x${doc.h}`);
  out.push(`fudge     ${doc.fudgeW.toFixed(2)} x ${doc.fudgeH.toFixed(2)}`);
  if (doc.note) out.push(`note      ${doc.note}`);
  for (const f of doc.frames) {
    out.push('', `[${f.name}]`, ...f.rows);
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
