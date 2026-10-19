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
 *   IT STORES ROLES, NOT COLOURS — BY DEFAULT. A pixel is `1` for primary,
 *   not `#EA6A34`. The seventeen boss primaries are perceptually optimised as a
 *   SET, so they get re-tuned as a set — and when one changes, every sprite
 *   drawn against it recolours with no art reopened. A PNG would have to be
 *   repainted.
 *
 *   A 16-BIT SPRITE DECLARES ITS OWN PALETTE. `palette` lines in the header give
 *   it up to MAX_COLOURS fixed colours, one key character each, and its pixels
 *   store those keys. A file with no `palette` line is exactly the 3-role file
 *   it always was and round-trips byte for byte. The trade: a declared palette
 *   does not follow a primary re-tuned in the tracker.
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
 *     palette   0 #0A0A12 outline   <- optional, one line per colour (16-bit)
 *     pivot     28 28               <- optional: the pixel the game holds it by
 *
 *     [idle 1] status=ready hold=40
 *     ........................
 *     ....00000000............
 *     ...
 *
 * A frame of a weapon's move can also carry its FRAME DATA on the same line:
 *
 *     [jabOne 4] status=ready hold=3 hit=28,21,23,19 spawn=44,40
 *
 * `hit=x,y,w,h` is where the move connects (this frame's first step) and its
 * hit area; a bare `hit` hurts with a shape the code computes; `spawn=x,y` is
 * where something comes out. All in the sheet's own pixels, facing right.
 *
 * One block per frame, each exactly `grid` rows of `grid` characters.
 * `.` transparent, `0` outline, `1` primary, `2` secondary — see ROLES. A sprite
 * with a `palette` header uses its declared keys instead.
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

import { EMPTY, ROLES, OUTLINE_KEY } from './nes-palette.js';
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
    fudgeW: 0.7, fudgeH: 1, note: '', palette: [], pivot: null, frames: [],
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
     * row can never be mistaken for a key — a row is only ever `.` and keys.
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
      /**
       * `sfx=` IS A NAME, NOT A FILE. The sound lives in `public/sfx/<name>.<ext>`
       * exactly as a sprite sheet lives in `public/sprites/`, and this text
       * format stores the reference the way it stores a role rather than a
       * colour. A frame with no `sfx=` is silent, which is almost all of them.
       *
       * IT IS PER FRAME BECAUSE THAT IS WHERE A SOUND HAPPENS. A footstep lands
       * on the frame the foot lands on; hanging it off the ANIMATION would
       * either fire it once at the start of a six-frame walk or need a second
       * number saying which frame it really meant.
       */
      const sfx = at('sfx');
      /**
       * FRAME DATA: WHERE A MOVE HITS, AND WHERE SOMETHING COMES OUT.
       *
       * `hit=x,y,w,h` says the move connects on this frame's first step, and
       * the rectangle is its hit area in this sheet's own pixels, drawn facing
       * right. A bare `hit` is a frame that hurts with a shape the code works
       * out for itself (a spike's slanted line, which no rectangle fits).
       * `spawn=x,y` is the point something leaves from on this frame — the dust
       * where the hammer meets the floor.
       *
       * THEY LIVE ON THE FRAME BECAUSE THAT IS WHERE THE ART IS. Whoever moves
       * the drawing moves the hit with it, in the same line, and the game reads
       * its timing from these files rather than keeping a second copy that the
       * drawing could drift away from (see `npm run sprites:build`).
       */
      const hitRaw = at('hit');
      const hitRect = hitRaw && /^(-?\d+),(-?\d+),(\d+),(\d+)$/.exec(hitRaw);
      const hitBare = !hitRaw && /(?:^|\s)hit(?=\s|$)/.test(attrs);
      const spawnRaw = at('spawn');
      const spawnPt = spawnRaw && /^(-?\d+),(-?\d+)$/.exec(spawnRaw);
      frame = {
        action,
        index,
        status: STATUSES.includes(st) ? st : 'wip',
        hold: Number.isFinite(hold) && hold > 0 ? Math.round(hold) : DEFAULT_HOLD,
        ...(sfx ? { sfx } : {}),
        ...(hitRect ? { hit: { x: +hitRect[1], y: +hitRect[2], w: +hitRect[3], h: +hitRect[4] } }
          : hitBare ? { hit: true } : {}),
        ...(spawnPt ? { spawn: { x: +spawnPt[1], y: +spawnPt[2] } } : {}),
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
        } else if (k === 'pivot') {
          // `pivot   x y` — the pixel the game holds this sheet by (a hammer's
          // grip, a spike's foot). Only sheets that need one say it.
          const pv = /^(-?\d+)\s+(-?\d+)$/.exec(v.trim());
          if (pv) doc.pivot = { x: +pv[1], y: +pv[2] };
        } else if (k === 'note') doc.note = v.trim();
        else if (k === 'palette') {
          // `palette   <key> <#RRGGBB> <name>` — kept exactly as written, hex
          // case included, so the file round-trips byte for byte.
          const p = /^(\S)\s+(#[0-9A-Fa-f]{6})(?:\s+(.*))?$/.exec(v.trim());
          if (p && p[1] !== EMPTY) doc.palette.push({ key: p[1], hex: p[2], name: (p[3] || '').trim() });
        }
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

/** A sprite's declared palette ([{ key, hex, name }]), or null for a 3-role file. */
export const declaredPalette = (doc) => (doc.palette && doc.palette.length ? doc.palette : null);

/** The frames of one action, in order, each with its absolute sheet position. */
export const framesOf = (doc, action) => doc.frames
  .map((f, at) => ({ ...f, at }))
  .filter((f) => f.action === action);

// ── Frame data ────────────────────────────────────────────────────────

/**
 * A SHEET'S FRAME DATA, AS THE GAME READS IT. Per clip: every frame's hold, the
 * sheet cell it draws from, whether that cell is drawn yet, how long the clip
 * lasts, the step each hit lands on, and the hit areas and spawn points
 * measured from the pivot (so the game can place them at a hand or a foot and
 * mirror them for facing left).
 *
 * STATUS IS IGNORED FOR TIMING, ON PURPOSE. How far the drawing has got must
 * never change when a move hits: a frame being redrawn (`wip`) keeps its hold
 * and its place, and only the picture falls back. `ship` says which cells have
 * a picture.
 */
export function frameDataOf(doc) {
  const pv = doc.pivot || { x: 0, y: 0 };
  const clips = {};
  for (const action of actionsOf(doc)) {
    const c = { holds: [], cells: [], ship: [], total: 0, hits: [], spawns: [] };
    let step = 0;
    framesOf(doc, action).forEach((f, i) => {
      c.holds.push(f.hold);
      c.cells.push(f.at);
      c.ship.push(f.status === 'ready' || f.status === 'draft');
      if (f.hit) {
        c.hits.push({
          frame: i, step, len: f.hold,
          ...(f.hit === true ? {} : { x: f.hit.x - pv.x, y: f.hit.y - pv.y, w: f.hit.w, h: f.hit.h }),
        });
      }
      if (f.spawn) c.spawns.push({ frame: i, step, x: f.spawn.x - pv.x, y: f.spawn.y - pv.y });
      step += f.hold;
    });
    c.total = step;
    clips[action] = c;
  }
  return { grid: { w: doc.w, h: doc.h }, pivot: doc.pivot ? { ...doc.pivot } : null, clips };
}

/**
 * WHAT KIND OF CLIP THE CODE EXPECTS. The registry (src/data/weapon-art.js)
 * gives every clip one of these; `checkFrameData` holds the file to it.
 */
export const CLIP_KINDS = {
  hit: 'plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area',
  loop: 'loops for as long as the move lasts; no hit',
  once: 'plays once, and its length is how long the thing lasts; no hit',
  grow: 'plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand)',
  lash: 'plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip',
  still: 'a single frame; no hit',
};

/**
 * Every way this sheet breaks its contract, in plain words — empty when it is
 * sound. `spec` is `{ grid: { w, h }, clips: { name: kind } }`.
 *
 * THIS IS THE CHECK A HANDOFF HAS TO PASS to go straight in, by the owner's
 * call. It looks only at SHAPE — the clips the code plays are there, each is
 * the kind the code expects, every hit area and point is on the paper. It does
 * not judge timing: a move that now hits two steps later is a change the owner
 * reads about afterwards, not an error.
 */
export function checkFrameData(doc, spec) {
  const out = [];
  const W = doc.w, H = doc.h;
  if (spec.grid && (W !== spec.grid.w || H !== spec.grid.h)) {
    out.push(`the sheet is ${W}x${H} pixels; it has to be ${spec.grid.w}x${spec.grid.h}`);
  }
  if (!doc.pivot) out.push('it has no `pivot` line — the pixel the game holds it by');
  else if (doc.pivot.x < 0 || doc.pivot.y < 0 || doc.pivot.x > W || doc.pivot.y > H) {
    out.push(`its pivot (${doc.pivot.x}, ${doc.pivot.y}) is off the ${W}x${H} sheet`);
  }
  const on = (r) => r.x >= 0 && r.y >= 0 && r.w >= 1 && r.h >= 1 && r.x + r.w <= W && r.y + r.h <= H;
  const have = actionsOf(doc);
  for (const name of Object.keys(spec.clips)) {
    if (!have.includes(name)) out.push(`clip '${name}' is missing — the game plays it`);
  }
  for (const name of have) {
    const kind = spec.clips[name];
    if (!kind) { out.push(`clip '${name}' is not one the game plays (${Object.keys(spec.clips).join(', ')})`); continue; }
    const fr = framesOf(doc, name);
    const rects = fr.filter((f) => f.hit && f.hit !== true);
    const bares = fr.filter((f) => f.hit === true);
    for (const f of fr) {
      if (f.hit && f.hit !== true && !on(f.hit)) {
        out.push(`${name} ${f.index}: its hit area ${f.hit.x},${f.hit.y},${f.hit.w},${f.hit.h} is not inside the ${W}x${H} sheet`);
      }
      if (f.spawn && (f.spawn.x < 0 || f.spawn.y < 0 || f.spawn.x > W || f.spawn.y > H)) {
        out.push(`${name} ${f.index}: its spawn point ${f.spawn.x},${f.spawn.y} is off the sheet`);
      }
    }
    if (kind === 'hit') {
      if (rects.length !== 1) out.push(`${name} needs exactly one frame with a hit area (hit=x,y,w,h); it has ${rects.length}`);
      if (bares.length) out.push(`${name}: a bare 'hit' means nothing here — give it a hit area`);
    } else if (kind === 'lash') {
      if (rects.length !== 2) out.push(`${name} needs exactly two frames with a hit area (hit=x,y,w,h); it has ${rects.length}`);
      if (bares.length) out.push(`${name}: a bare 'hit' means nothing here — give it a hit area`);
    } else if (kind === 'grow') {
      const lead = fr.findIndex((f) => !f.hit);
      if (rects.length) out.push(`${name}: a spike's hit is its own shape — mark growing frames with a bare 'hit'`);
      if (!fr.length || !fr[0].hit) out.push(`${name} has to start with at least one frame marked 'hit' (growing)`);
      else if (lead < 0) out.push(`${name} has to end with at least one frame not marked 'hit' (standing)`);
      else if (fr.slice(lead).some((f) => f.hit)) out.push(`${name}: every 'hit' frame has to come before the first standing one`);
    } else {
      if (rects.length || bares.length) out.push(`${name} is a ${kind} clip and cannot carry a hit`);
      if (kind === 'still' && fr.length !== 1) out.push(`${name} is a single picture; it has ${fr.length} frames`);
    }
  }
  return out;
}

export function serialize(doc) {
  renumber(doc);
  const out = [`# ${doc.id}`];
  out.push(`grid      ${doc.w}x${doc.h}`);
  out.push(`fudge     ${doc.fudgeW.toFixed(2)} x ${doc.fudgeH.toFixed(2)}`);
  if (doc.pivot) out.push(`pivot     ${doc.pivot.x} ${doc.pivot.y}`);
  for (const p of doc.palette || []) out.push(`palette   ${p.key} ${p.hex}${p.name ? ` ${p.name}` : ''}`);
  if (doc.note) out.push(`note      ${doc.note}`);
  for (const f of doc.frames) {
    // `sfx` is omitted when absent rather than written empty, so adding the
    // feature does not rewrite every existing file — `serialize(parse(x)) === x`
    // is the guarantee tests/sprites.test.js holds this format to.
    const sfx = f.sfx ? ` sfx=${f.sfx}` : '';
    // Frame data, likewise only when present.
    const hit = f.hit === true ? ' hit'
      : f.hit ? ` hit=${f.hit.x},${f.hit.y},${f.hit.w},${f.hit.h}` : '';
    const spawn = f.spawn ? ` spawn=${f.spawn.x},${f.spawn.y}` : '';
    out.push('', `[${f.action} ${f.index}] status=${f.status} hold=${f.hold}${sfx}${hit}${spawn}`, ...f.rows);
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

