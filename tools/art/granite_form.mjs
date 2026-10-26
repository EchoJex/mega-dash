/**
 * GRANITE FORM'S PLACEHOLDER RIG — what `npm run art:placeholders --
 * granite_form` paints into its three sheets.
 *
 * Nothing here hits on a frame: the statue's slam and the boulder's crush are
 * worked out from his body, so the sheets carry pictures and a pivot only.
 * THE PICTURES are the game's own fallback shapes (`drawGraniteShape`,
 * `drawStoneShape`), standing on the pivot, facing right.
 */
import { drawGraniteShape, drawRockyShape, drawStoneShape, STATUE_SHAPES } from '../../src/systems/weaponry.js';

const FEET = { x: 20, y: 38 };
const PALETTE = [
  { key: '0', hex: '#0A0A12', name: 'outline' },
  { key: '1', hex: '#5F443A', name: 'dark stone (Granite Man primary)' },
  { key: '2', hex: '#A8A296', name: 'light stone (Granite Man secondary)' },
];

export function rig() {
  return [
    {
      sheet: 'statue', pivot: FEET, palette: PALETTE,
      clips: Object.fromEntries(STATUE_SHAPES.map((s) => [s, [
        { hold: 5, paint: (g) => drawGraniteShape(g, FEET.x, FEET.y, 1, s) },
      ]])),
    },
    {
      // Four quarter-turns, four steps each: the plain shape turns at that pace.
      sheet: 'boulder', pivot: FEET, palette: PALETTE,
      clips: { roll: [0, 1, 2, 3].map((q) => ({ hold: 4, paint: (g) => drawGraniteShape(g, FEET.x, FEET.y, 1, 'roll', q * 4) })) },
    },
    {
      // Two leg steps, six steps each: the plain shape walks at that pace.
      sheet: 'rocky', pivot: FEET, palette: PALETTE,
      clips: {
        stand: [{ hold: 5, paint: (g) => drawRockyShape(g, FEET.x, FEET.y, 1, 0) }],
        walk: [0, 1].map((q) => ({ hold: 6, paint: (g) => drawRockyShape(g, FEET.x, FEET.y, 1, q * 6) })),
      },
    },
    {
      sheet: 'stone', pivot: { x: 5, y: 9 }, palette: PALETTE,
      clips: { loose: [{ hold: 5, paint: (g) => drawStoneShape(g, 5, 9) }] },
    },
  ];
}

/** What the code holds the drawing to, in words, for the brief. */
export function constraints() {
  return [
    '**every picture stands on its pivot**, the floor under the middle of him: the statue, the boulder and '
      + 'the stone all sit on the floor, never float above it or sink into it.',
    '**the statue sheet has three still pictures**, one per shape: `chest`, `megaman`, `monolith`. The game '
      + 'picks one at random each time he hardens. They replace him, so each should read as roughly his size '
      + '(he is 24x24); a little taller or wider is fine.',
    '**the rocky sheet** is the Lv10 walking form, the cut-stone boulder on three stubby, kneeless legs: `stand` is one still '
      + 'picture, `walk` loops while he walks at half his speed. It replaces him like the statue does.',
    '**the boulder** is about 29 pixels across (1.2 times his size), and its `roll` clip loops while it rolls.',
    '**nothing on these sheets hits by frame**: what the statue lands on and what the boulder rolls through is '
      + 'worked out from his body, so no frame carries a hit area.',
    '**colours**: Granite Man\'s brown `#5F443A` and stone grey `#A8A296` with shades built from them, and the '
      + 'near-black outline.',
  ];
}
