/**
 * npm run sprites — pixel-exact drawing templates for hand-crafted sprite art.
 *
 * WHY THIS IS GENERATED RATHER THAN DRAWN ONCE. Every number in these templates
 * is read out of the live code: the sprite grids from `SPRITE_CLASS`, the
 * player's hurtbox from `FEEL`, the minion boxes from `MINIONS`, and the boss
 * footprints from each boss's own `scale` through the exact same arithmetic
 * `spawnBoss` uses. Change a scale and re-run this, and the template changes
 * with it. A template drawn by hand is a template that goes stale silently, and
 * the artist finds out three sprites later.
 *
 * IT WRITES ITS OWN PNGs. No image library — a PNG is a signature, three
 * chunks and a CRC, and zlib is in the standard library. That is a page of code
 * against a dependency that would have to be installed on every machine that
 * ever wants to regenerate these, for a job that is four small images.
 *
 * TWO KINDS OF FILE, and the difference matters:
 *
 *   *-guide.png      EXACTLY the sprite grid — 16x16, 24x24, 48x48. This is the
 *                    canvas. Open it, add a layer above it, draw on that, then
 *                    delete the guide layer. Anything at 1:1 here is one game
 *                    pixel, so what you see in the editor is what ships.
 *
 *   grid-reference   The same four, magnified by a whole number with one cell
 *                    per pixel and a gridline between every cell. For READING,
 *                    never for drawing: it is 8x, so a pixel you place on it is
 *                    an eighth of a pixel in the game.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// ── A minimal PNG writer ──────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * An RGBA canvas that knows nothing about the game — set a pixel, write a file.
 *
 * Colours are `[r, g, b, a]`. `set` is a hard REPLACE rather than a blend: a
 * template is made of flat guide marks, and alpha compositing would turn a
 * gridline crossing a box edge into a third colour nobody chose.
 */
class Canvas {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.px = new Uint8Array(w * h * 4);   // zeroed = fully transparent
  }

  set(x, y, [r, g, b, a = 255]) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = r; this.px[i + 1] = g; this.px[i + 2] = b; this.px[i + 3] = a;
  }

  fill(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  /**
   * Lay a translucent colour OVER what is already there, rather than replacing
   * it. The collision-box wash needs this: replacing left the box interior more
   * transparent than the "transparent" checker around it, so the one part of
   * the canvas that is not empty looked like the only part that was.
   */
  wash(x, y, w, h, [r, g, b], k) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const px = x + i, py = y + j;
        if (px < 0 || py < 0 || px >= this.w || py >= this.h) continue;
        const o = (py * this.w + px) * 4;
        this.px[o] = Math.round(this.px[o] * (1 - k) + r * k);
        this.px[o + 1] = Math.round(this.px[o + 1] * (1 - k) + g * k);
        this.px[o + 2] = Math.round(this.px[o + 2] * (1 - k) + b * k);
        this.px[o + 3] = 255;
      }
    }
  }

  /** A one-pixel outline INSIDE the given rect, so w/h are the outer bounds. */
  stroke(x, y, w, h, c) {
    for (let i = 0; i < w; i++) { this.set(x + i, y, c); this.set(x + i, y + h - 1, c); }
    for (let j = 0; j < h; j++) { this.set(x, y + j, c); this.set(x + w - 1, y + j, c); }
  }

  png() {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8;    // bit depth
    ihdr[9] = 6;    // colour type: RGBA
    // 10, 11, 12 stay 0: deflate, adaptive filtering, no interlace.

    // One filter byte per scanline. Filter 0 (None) throughout — these images
    // are flat colour and compress fine, and it keeps the writer readable.
    const raw = Buffer.alloc(this.h * (this.w * 4 + 1));
    for (let y = 0; y < this.h; y++) {
      const src = y * this.w * 4;
      const dst = y * (this.w * 4 + 1);
      raw[dst] = 0;
      Buffer.from(this.px.buffer, src, this.w * 4).copy(raw, dst + 1);
    }

    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

// ── What the game says the sizes are ──────────────────────────────────

/**
 * READ FROM THE SOURCE, not copied. These four files are small and stable, and
 * regexing three numbers out of them is cheaper than making this tool import
 * Phaser — which `display.js` and `font.js` both drag in, and which cannot load
 * outside a browser.
 */
const REPO = fileURLToPath(new URL('..', import.meta.url));
const src = (p) => readFileSync(join(REPO, p), 'utf8');

const display = src('src/config/display.js');
const feel = src('src/config/feel.js');
const minions = src('src/data/minions.js');
const bosses = src('src/data/bosses.js');

const num = (text, re, name) => {
  const m = re.exec(text);
  if (!m) throw new Error(`could not read ${name} — has the source moved?`);
  return Number(m[1]);
};

const PLAYER_W = num(display, /PLAYER_SPRITE_W = (\d+)/, 'PLAYER_SPRITE_W');
const PLAYER_H = num(display, /PLAYER_SPRITE_H = (\d+)/, 'PLAYER_SPRITE_H');
// ANCHORED. `/boss:/` alone matches `miniboss:` — it read the 32px reserved
// grid and silently produced a boss template two thirds the right size, with a
// 36x48 collision box hanging off a 32x32 canvas.
const MINION_GRID = num(display, /^\s*minion:\s*\{ w: (\d+)/m, 'minion grid');
const BOSS_GRID = num(display, /^\s*boss:\s*\{ w: (\d+)/m, 'boss grid');

const hb = /playerHitbox:\s*\{ w: (\d+), h: (\d+), offX: (\d+), offY: (\d+) \}/.exec(feel);
if (!hb) throw new Error('could not read playerHitbox');
const PLAYER_BOX = { w: +hb[1], h: +hb[2], offX: +hb[3], offY: +hb[4] };

const sl = /playerHitboxSlide:\s*\{ w: (\d+), h: (\d+), offX: (\d+), offY: (\d+) \}/.exec(feel);
const SLIDE_BOX = sl ? { w: +sl[1], h: +sl[2], offX: +sl[3], offY: +sl[4] } : null;

// The two minions, in file order: SCRAPPER then DRIFTER.
const minionBoxes = [...minions.matchAll(/w: (\d+), h: (\d+),/g)].map((m) => ({
  w: +m[1], h: +m[2],
}));

const bossRows = [...bosses.matchAll(/id: '(\w+)', name: '([^']+)'[\s\S]*?scale: ([0-9.]+)/g)]
  .map((m) => ({ id: m[1], name: m[2], scale: +m[3] }));
if (bossRows.length !== 17) throw new Error(`read ${bossRows.length} bosses, expected 17`);

/**
 * THE EXACT ARITHMETIC `spawnBoss` USES, and it has to stay exact.
 *
 *     h = round(24 * scale)      w = round(h * 0.75)
 *
 * Deriving the width from the ROUNDED height rather than from the scale is not
 * incidental — round(round(24s) * 0.75) and round(24s * 0.75) disagree for
 * several of the seventeen, and the collision box the artist is drawing to is
 * whichever one the game actually computes.
 */
const bossBox = (scale) => {
  const h = Math.round(24 * scale);
  return { w: Math.round(h * 0.75), h };
};

const biggest = bossRows.reduce((a, b) => (b.scale > a.scale ? b : a));
const avgScale = bossRows.reduce((n, b) => n + b.scale, 0) / bossRows.length;

/**
 * NO COLLISION BOX MAY BE BIGGER THAN THE GRID IT IS DRAWN ON. The grid is a
 * ceiling, so a box that overflows it means one of the two numbers is wrong —
 * and the first version of this file proved that can happen quietly, by reading
 * `miniboss` for `boss` and handing over a 36x48 footprint on a 32x32 canvas.
 */
for (const [label, grid, box] of [
  ['player', { w: PLAYER_W, h: PLAYER_H }, PLAYER_BOX],
  ['minion', { w: MINION_GRID, h: MINION_GRID }, minionBoxes[0]],
  ['boss', { w: BOSS_GRID, h: BOSS_GRID }, bossBox(biggest.scale)],
]) {
  if (!box || box.w > grid.w || box.h > grid.h) {
    throw new Error(`${label}: collision box ${box?.w}x${box?.h} does not fit `
      + `its ${grid.w}x${grid.h} sprite grid`);
  }
}

// ── The palette ───────────────────────────────────────────────────────

const C = {
  // The canvas itself: a checker so transparency reads as transparency rather
  // than as a colour the artist might think is theirs.
  checkA: [26, 30, 38, 255],
  checkB: [34, 39, 48, 255],
  grid: [58, 66, 80, 255],
  grid8: [92, 104, 124, 255],     // every 8th line, for counting
  box: [92, 205, 213, 255],       // the collision box
  boxFill: [92, 205, 213, 38],
  slide: [245, 211, 40, 255],     // the player's slide box
  base: [234, 106, 52, 255],      // the baseline: where the feet sit
  centre: [154, 118, 255, 255],   // the centre line the sprite is aligned on
};

// ── The native-size guides ────────────────────────────────────────────

/**
 * A guide at EXACTLY the sprite grid. Every mark is one pixel, so the artist can
 * see which cells the collision box covers without any scaling in the way.
 *
 * The box is drawn as an outline plus a wash rather than a solid, because the
 * artist needs to see through it: it says where the game will hit you, not
 * where to put ink. Nothing here is art and all of it gets deleted.
 */
function guide(gridW, gridH, box, extra = null) {
  const cv = new Canvas(gridW, gridH);
  // Transparent ground, checkered so it cannot be mistaken for a colour.
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      cv.set(x, y, ((x >> 1) + (y >> 1)) % 2 ? C.checkA : C.checkB);
    }
  }
  // The collision box, horizontally centred and bottom-anchored — which is
  // exactly what AssetLayer.draw does with `cx` and `bottom`.
  const bx = Math.round((gridW - box.w) / 2);
  const by = gridH - box.h;
  cv.wash(bx, by, box.w, box.h, C.box, 0.22);
  cv.stroke(bx, by, box.w, box.h, C.box);
  if (extra) {
    const ex = Math.round((gridW - extra.box.w) / 2);
    cv.stroke(ex, gridH - extra.box.h, extra.box.w, extra.box.h, extra.color);
  }
  /**
   * TWO COLUMNS, not one. Every sprite grid here is even-width, so the centre
   * is the BOUNDARY between two columns rather than a column — drawing one of
   * them marks a line that is half a pixel off the axis the game actually
   * aligns to, and on a symmetrical sprite that is the difference between a
   * face that looks straight and one that does not.
   */
  for (let y = 0; y < gridH; y++) {
    cv.set(gridW / 2 - 1, y, C.centre);
    cv.set(gridW / 2, y, C.centre);
  }
  // LAST, so nothing paints over it. The baseline is the single most important
  // line on the sheet — it is where the ground is — and the slide box's bottom
  // edge sits exactly on it, which is what used to hide two thirds of it.
  for (let x = 0; x < gridW; x++) cv.set(x, gridH - 1, C.base);
  return cv;
}

// ── The magnified reference ───────────────────────────────────────────

const ZOOM = 8;

/**
 * One panel of the reference sheet: the grid magnified, one cell per pixel,
 * with a line between every cell and a brighter one every eight.
 *
 * EVERY EIGHT because that is how a pixel artist counts. A grid with no anchors
 * is a grid you lose your place in at 48 cells wide; eights give the eye
 * something to land on and match the 8px tiles the rest of the game is built
 * from.
 */
function panel(cv, ox, oy, gridW, gridH, box, extra) {
  const bx = Math.round((gridW - box.w) / 2);
  const by = gridH - box.h;
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const inBox = x >= bx && x < bx + box.w && y >= by;
      const base = ((x >> 1) + (y >> 1)) % 2 ? C.checkA : C.checkB;
      const cell = inBox
        ? [
          Math.round(base[0] * 0.55 + C.box[0] * 0.45),
          Math.round(base[1] * 0.55 + C.box[1] * 0.45),
          Math.round(base[2] * 0.55 + C.box[2] * 0.45), 255,
        ]
        : base;
      cv.fill(ox + x * ZOOM, oy + y * ZOOM, ZOOM, ZOOM, cell);
    }
  }
  // Gridlines, on the cell boundaries.
  for (let x = 0; x <= gridW; x++) {
    const c = x % 8 === 0 ? C.grid8 : C.grid;
    for (let y = 0; y < gridH * ZOOM; y++) cv.set(ox + x * ZOOM, oy + y, c);
  }
  for (let y = 0; y <= gridH; y++) {
    const c = y % 8 === 0 ? C.grid8 : C.grid;
    for (let x = 0; x < gridW * ZOOM; x++) cv.set(ox + x, oy + y * ZOOM, c);
  }
  // The collision box outline, on the boundary lines so it reads as an edge
  // between cells rather than as a row of coloured cells.
  const px = ox + bx * ZOOM, py = oy + by * ZOOM;
  cv.stroke(px, py, box.w * ZOOM + 1, box.h * ZOOM + 1, C.box);
  cv.stroke(px - 1, py - 1, box.w * ZOOM + 3, box.h * ZOOM + 3, C.box);
  // The baseline, along the bottom of the grid.
  cv.fill(ox, oy + gridH * ZOOM - 1, gridW * ZOOM + 1, 2, C.base);
  // The centre column the sprite is aligned on.
  for (let y = 0; y < gridH * ZOOM; y++) cv.set(ox + (gridW / 2) * ZOOM, oy + y, C.centre);
  if (extra) {
    const ex = ox + Math.round((gridW - extra.box.w) / 2) * ZOOM;
    const ey = oy + (gridH - extra.box.h) * ZOOM;
    cv.stroke(ex, ey, extra.box.w * ZOOM + 1, extra.box.h * ZOOM + 1, extra.color);
  }
}

// ── Build ─────────────────────────────────────────────────────────────

const OUT = join(REPO, 'design/sprite-templates');
mkdirSync(OUT, { recursive: true });

const avg = bossBox(avgScale);
const max = bossBox(biggest.scale);

const SUBJECTS = [
  {
    file: 'player-24x24-guide.png', label: 'PLAYER',
    gridW: PLAYER_W, gridH: PLAYER_H,
    box: { w: PLAYER_BOX.w, h: PLAYER_BOX.h },
    extra: SLIDE_BOX ? { box: { w: SLIDE_BOX.w, h: SLIDE_BOX.h }, color: C.slide } : null,
  },
  {
    file: 'minion-16x16-guide.png', label: 'MINION',
    gridW: MINION_GRID, gridH: MINION_GRID,
    box: minionBoxes[0] || { w: 14, h: 14 },
    extra: minionBoxes[1] ? { box: minionBoxes[1], color: C.slide } : null,
  },
  {
    file: 'boss-48x48-average-guide.png', label: 'BOSS (AVERAGE)',
    gridW: BOSS_GRID, gridH: BOSS_GRID, box: avg, extra: null,
  },
  {
    file: 'boss-48x48-largest-guide.png', label: 'BOSS (LARGEST)',
    gridW: BOSS_GRID, gridH: BOSS_GRID, box: max, extra: null,
  },
];

for (const s of SUBJECTS) {
  writeFileSync(join(OUT, s.file), guide(s.gridW, s.gridH, s.box, s.extra).png());
  /**
   * A GENUINELY EMPTY CANVAS at the same size, because the guide is opaque.
   * The guide is for looking at and the blank is for drawing in — and having
   * the blank means a finished sprite never has to be rescued from a file that
   * had a checkerboard baked into it.
   */
  writeFileSync(join(OUT, s.file.replace('-guide', '-blank')),
    new Canvas(s.gridW, s.gridH).png());
}

// The reference sheet: all four in a row, bottom-aligned so the baselines line
// up and the size difference is the thing you actually see.
const PAD = 14;
const tallest = Math.max(...SUBJECTS.map((s) => s.gridH));
const sheetW = PAD + SUBJECTS.reduce((n, s) => n + s.gridW * ZOOM + PAD, 0);
const sheetH = PAD * 2 + tallest * ZOOM;
const sheet = new Canvas(sheetW, sheetH);
sheet.fill(0, 0, sheetW, sheetH, [16, 18, 24, 255]);

let x = PAD;
for (const s of SUBJECTS) {
  const y = PAD + (tallest - s.gridH) * ZOOM;   // bottom-aligned
  panel(sheet, x, y, s.gridW, s.gridH, s.box, s.extra);
  x += s.gridW * ZOOM + PAD;
}
writeFileSync(join(OUT, 'grid-reference.png'), sheet.png());

// ── The numbers, as text, so nothing has to be measured off a picture ──

const fmt = (s) => {
  const b = s.box;
  const left = Math.round((s.gridW - b.w) / 2);
  return `| ${s.label} | ${s.gridW}x${s.gridH} | ${b.w}x${b.h} | `
    + `x ${left}..${left + b.w - 1}, y ${s.gridH - b.h}..${s.gridH - 1} |`
    + (b.w % 2 === s.gridW % 2 ? '' : ' **odd/even mismatch**');
};

writeFileSync(join(OUT, 'README.md'), `# Sprite templates

Generated by \`npm run sprites\`. Do not hand-edit — every number below is read
out of the live source, so re-running this after a \`scale\` change updates it.

## The files

| file | what it is |
|---|---|
| \`*-guide.png\` | **the canvas.** Exactly the sprite grid. Open it, add a layer above, draw on that, delete the guide layer when you export. At 1:1 one pixel here is one pixel in the game. |
| \`grid-reference.png\` | all four magnified ${ZOOM}x with one cell per pixel, bottom-aligned so the size difference is visible. **For reading, not for drawing** — a pixel placed on it is a ${ZOOM}th of a game pixel. |

## The sizes

| subject | sprite grid | collision box | box occupies |
|---|---|---|---|
${SUBJECTS.map(fmt).join('\n')}

The largest boss is **${biggest.name}** at ${biggest.scale}x player height. The
average across all seventeen is ${avgScale.toFixed(4)}x, which rounds to the box
above; no single boss sits exactly on it.

## How the game places your art

\`AssetLayer.draw\` centres the sprite horizontally on the collision box and
aligns its BOTTOM edge to the box's bottom edge:

    centre x = actor.x + actor.w / 2       bottom = actor.y + actor.h

So the grid is a **ceiling, not a frame**. Draw anywhere in it and use
transparency to carve the real silhouette; art is never stretched to fit a
collision box. The orange row is the baseline — whatever you want standing on
the ground goes there. The violet column is the centre the game aligns to.

## Colour key

| colour | meaning |
|---|---|
| cyan | the collision box — where the game registers a hit |
| gold | the second box, where there is one: the player's SLIDE box, or the DRIFTER's box on the minion sheet |
| orange | the baseline. The sprite's bottom edge lands here |
| violet | the centre column the sprite is aligned on |
| grey checker | transparent |

## One thing to watch

The sprite grid is even-width in every class. A collision box whose width has
the OPPOSITE parity cannot centre exactly, and \`draw\` resolves it with
\`Math.round\` — half a pixel to one side. It is invisible in play and it is not
a bug, but if you are matching a silhouette to a box down to the pixel, that is
where the odd column goes. Any row flagged above has it.
`);

/**
 * THE SAME NUMBERS, MACHINE-READABLE — for the in-browser sprite editor, which
 * is served from `docs/` and cannot import a line of `src/`.
 *
 * Emitting it HERE rather than writing a second extractor is the whole point:
 * one tool owns the arithmetic, and the editor, the templates and the README
 * are three renderings of one answer. The editor fetches this the way the
 * tracker app fetches `boss-data.json`, and for the same reason.
 *
 * The palette is deliberately NOT in here. It lives in `boss-data.json`, which
 * is generated from the tracker, and duplicating it would make two files that
 * could disagree about what colour a boss is.
 */
const targets = {
  _note: 'GENERATED by tools/sprite-templates.mjs. Do not edit.',
  player: {
    label: 'PLAYER', cls: 'player', grid: { w: PLAYER_W, h: PLAYER_H },
    box: { w: PLAYER_BOX.w, h: PLAYER_BOX.h },
    boxAlt: SLIDE_BOX ? { w: SLIDE_BOX.w, h: SLIDE_BOX.h, label: 'SLIDE' } : null,
    frames: ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'run4', 'run5',
      'jumpRise', 'jumpApex', 'jumpFall', 'slide'],
  },
  minions: [
    { id: 'scrapper', label: 'SCRAPPER', cls: 'minion',
      grid: { w: MINION_GRID, h: MINION_GRID }, box: minionBoxes[0], frames: ['walk0', 'walk1'] },
    { id: 'drifter', label: 'DRIFTER', cls: 'minion',
      grid: { w: MINION_GRID, h: MINION_GRID }, box: minionBoxes[1], frames: ['drift0', 'drift1'] },
  ],
  bosses: Object.fromEntries(bossRows.map((b) => [b.id, {
    label: b.name, cls: 'boss', scale: b.scale,
    grid: { w: BOSS_GRID, h: BOSS_GRID },
    box: bossBox(b.scale),
    frames: ['idle0', 'idle1'],
  }])),
  /**
   * THE FUDGE DEFAULT, MEASURED RATHER THAN CHOSEN.
   *
   * The shipped player art is the only sprite in the game with a collision box
   * somebody already tuned by feel, so it is the only honest source for what
   * "fair" means here. Standing: a 12-wide box on a 17-wide silhouette, 22 tall
   * on 23. Sliding: 16 on 21, 11 on 11.
   *
   * WIDTH IS THE DIAL AND HEIGHT IS NOT. 0.71 and 0.76 against 0.96 and 1.00 —
   * the box is meaningfully narrower than the drawing and essentially exactly
   * as tall. That is the Mega Man reading of fair: a near miss to the side
   * visibly misses, while a landing is exactly where the feet are, because
   * platforming cannot afford a vertical lie.
   */
  fudge: { w: 0.7, h: 1, step: 0.05, measured: { standing: [0.71, 0.96], sliding: [0.76, 1] } },
};
writeFileSync(join(REPO, 'design/sprite-targets.json'), `${JSON.stringify(targets, null, 2)}\n`);

console.log(`wrote ${SUBJECTS.length + 2} files to design/sprite-templates/`);
for (const s of SUBJECTS) {
  console.log(`  ${s.file.padEnd(34)} ${s.gridW}x${s.gridH}  box ${s.box.w}x${s.box.h}`);
}
console.log(`  grid-reference.png                 ${sheetW}x${sheetH} (${ZOOM}x)`);
