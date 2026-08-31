/**
 * BITMAP FONT — the permanent fix for HUD legibility.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every earlier attempt fought the same losing battle. Phaser rasterises a Text
 * object at its LAYOUT size, so a 7px label is a 7px bitmap however clever the
 * settings are, and that bitmap is what gets magnified. `resolution` renders a
 * bigger glyph and then point-samples it back down, which deletes strokes and
 * visibly fragments letters. Render density made it survivable by giving the
 * canvas real pixels to land in, but the glyphs are still a system font being
 * squeezed into a space it was never designed for.
 *
 * A 5x7 bitmap font is drawn AT the size it is displayed. One virtual pixel of
 * glyph is one virtual pixel on screen, scaled by nearest-neighbour with the rest
 * of the game. It cannot blur, cannot fragment, and it looks like it belongs next
 * to the sprites instead of like a browser rendering text over them.
 *
 * NOT SPRITE ART. This is generated on purpose: a font is a system, not a
 * drawing, and CLAUDE.md's rule about human-authored art is about characters and
 * backdrops. Tweak any glyph below by editing its rows.
 *
 * FORMAT
 * ------
 * Each glyph is 7 rows of 5 columns. `#` is ink, anything else is transparent.
 * Uppercase only, by design — it is a NES-era HUD and lowercase at 5x7 is mush.
 * Lowercase input is folded to uppercase at draw time.
 */

import Phaser from 'phaser';

const G = {
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '####.', '#...#', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '####.', '#....', '#....', '#....', '#####'],
  F: ['#####', '#....', '####.', '#....', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '\\': ['#....', '#....', '.#...', '..#..', '...#.', '....#', '....#'],
  '(': ['..##.', '.#...', '#....', '#....', '#....', '.#...', '..##.'],
  ')': ['.##..', '...#.', '....#', '....#', '....#', '...#.', '.##..'],
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', '.....'],
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '|': ['..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  // The interpunct and multiplication sign the results screen uses.
  '·': ['.....', '.....', '.....', '.##..', '.##..', '.....', '.....'],
  '×': ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],
  // Arrow, for "Lv 3 -> 4" style text.
  '→': ['.....', '..#..', '...#.', '#####', '...#.', '..#..', '.....'],
  // The four movement-pad glyphs. Solid triangles for the cardinals, diagonal
  // arrows for the two reserved diagonals, so the pads read at a glance.
  '◀': ['....#', '...##', '..###', '.####', '..###', '...##', '....#'],
  '▶': ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
  '◸': ['.....', '####.', '##...', '#.#..', '#..#.', '....#', '.....'],
  '◹': ['.....', '.####', '...##', '..#.#', '.#..#', '#....', '.....'],
};

const GLYPH_W = 5;
export const GLYPH_H = 7;
/** One transparent column between glyphs; the font is drawn at 1:1, never scaled. */
const TRACKING = 1;
export const FONT_KEY = 'megafont';

const FALLBACK = ['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'];

/** Every character the font can draw, in texture order. */
const CHARS = Object.keys(G);

/**
 * Paint the glyph sheet into a texture and register it as a Phaser RetroFont.
 *
 * Called once from BootScene. The texture is built in code rather than loaded
 * from a PNG so there is no asset to keep in sync with this file — edit a glyph
 * above and the next run draws it.
 */
export function installFont(scene) {
  if (scene.textures.exists(FONT_KEY)) return;

  const perRow = 16;
  const rows = Math.ceil(CHARS.length / perRow);
  const cellW = GLYPH_W + TRACKING;
  const tex = scene.textures.createCanvas(FONT_KEY, perRow * cellW, rows * GLYPH_H);
  const ctx = tex.getContext();
  ctx.fillStyle = '#ffffff';

  CHARS.forEach((ch, i) => {
    const ox = (i % perRow) * cellW;
    const oy = Math.floor(i / perRow) * GLYPH_H;
    const rowsOf = G[ch] || FALLBACK;
    for (let y = 0; y < GLYPH_H; y++) {
      const line = rowsOf[y] || '';
      for (let x = 0; x < GLYPH_W; x++) {
        if (line[x] === '#') ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  });
  tex.refresh();

  // White ink so setTint can colour it freely — a single-colour glyph tints
  // cleanly, unlike a 3-colour sprite.
  scene.cache.bitmapFont.add(FONT_KEY, Phaser.GameObjects.RetroFont.Parse(scene, {
    image: FONT_KEY,
    width: cellW,
    height: GLYPH_H,
    chars: CHARS.join(''),
    charsPerRow: perRow,
    spacing: { x: 0, y: 0 },
  }));
}

/** Uppercase-fold and drop anything the font cannot draw. */
export const fold = (s) => String(s).toUpperCase()
  .split('')
  .map((c) => {
    if (c === '\n') return c;            // real line break, not a missing glyph
    return G[c] !== undefined ? c : '?';
  })
  .join('');

export { CHARS as FONT_CHARS, G as GLYPHS };
