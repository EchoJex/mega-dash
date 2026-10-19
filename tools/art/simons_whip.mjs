/**
 * SIMON'S WHIP'S PLACEHOLDER RIG — what `npm run art:placeholders --
 * simons_whip` paints into its two sheets.
 *
 * THE FRAME DATA is the owner's pick of 19 Oct 2026, option B of three in the
 * Whip Timing Lab: Simon's three poses from Super Castlevania IV at this
 * game's pace —
 *
 *   whip hanging behind him   5 steps   no hit
 *   swung overhead            5 steps   hurts lightly ("overhead arc hurts too")
 *   cracked out              10 steps   the main hit; its area is the tip
 *
 * THE PICTURES are the game's own fallback shapes (`drawWhipShape`, with the
 * points `whipPoints` takes from the owner's Stick Nodes poses) for the whip,
 * and his own standing or slide picture for the body sheet: until Claude
 * Design draws the poses, he holds still and only the whip moves (owner,
 * 19 Oct 2026: "His normal picture").
 *
 * HIT AREAS ARE MEASURED, NOT CHOSEN: the overhead swing's is the box round
 * the whip as drawn behind and over him, a pixel generous; the crack's is the
 * tip's square.
 */
import { readFileSync } from 'node:fs';
import { WHIP_SHAPE, whipPoints, drawWhipShape } from '../../src/systems/weaponry.js';
import { WHIP_CLIPS, WEAPON_ART } from '../../src/data/weapon-art.js';
import { parse } from '../../docs/sprite-fmt.js';

const GRID = WEAPON_ART.simons_whip.sheets.held.grid;
// His hand. Room behind it for the swing, in front for the longest crack,
// above for the tilted one.
const HAND = { x: 50, y: 62 };
const HOLDS = [5, 5, 10];

/** The box round some points (from the hand), a pixel generous, on the sheet. */
function boxOf(pts) {
  const xs = pts.map((p) => p[0] + HAND.x), ys = pts.map((p) => p[1] + HAND.y);
  const x0 = Math.max(0, Math.min(...xs) - 2), y0 = Math.max(0, Math.min(...ys) - 2);
  const x1 = Math.min(GRID.w, Math.max(...xs) + 3), y1 = Math.min(GRID.h, Math.max(...ys) + 3);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function crack(clip) {
  return HOLDS.map((hold, f) => {
    const pts = whipPoints(clip, f);
    const frame = { hold, paint: (g) => drawWhipShape(g, HAND.x, HAND.y, 1, pts, f === 2) };
    // The swing's area is the whip swung behind and over him, not the handle
    // running back to his hand: a minion against his front is the crack's.
    if (f === 1) frame.hit = boxOf(pts.slice(1));
    if (f === 2) {
      const [tx, ty] = pts[pts.length - 1], r = WHIP_SHAPE.tip / 2;
      frame.hit = { x: HAND.x + tx - r, y: HAND.y + ty - r, w: WHIP_SHAPE.tip, h: WHIP_SHAPE.tip };
    }
    return frame;
  });
}

/** His own picture, from player.sprite: the standing frame, or the slide's. */
const player = parse(readFileSync(new URL('../../design/sprites/player.sprite', import.meta.url), 'utf8'));
const pic = (action, index) => player.frames.find((f) => f.action === action && f.index === index);
const STAND = pic('idle', 1), SLIDE = pic('slide', 4);

/**
 * His box's corner from his hand: the hand is 17 in and 12 down standing,
 * 18 down in a slide (the game draws the slide picture in the same 24x24).
 */
function bodyFrame(hold, low) {
  const src = low ? SLIDE : STAND, ox = HAND.x - 17, oy = HAND.y - (low ? 18 : 12);
  return {
    hold,
    paint: (g) => src.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.') g.rows[oy + y][ox + x] = ch;
    })),
  };
}

export function rig() {
  const held = {
    sheet: 'held', pivot: HAND,
    palette: [
      { key: '0', hex: '#0A0A12', name: 'outline' },
      { key: '1', hex: '#1A6B12', name: 'vine (Thorn Man green, dark)' },
      { key: '2', hex: '#2AAB1C', name: 'vine core (Thorn Man primary)' },
      { key: '3', hex: '#FFFFFF', name: 'glint on the tip' },
    ],
    clips: Object.fromEntries(WHIP_CLIPS.map((c) => [c, crack(c)])),
  };
  const body = {
    sheet: 'body', pivot: HAND, palette: player.palette,
    clips: Object.fromEntries(WHIP_CLIPS.map((c) => [c, HOLDS.map((h) => bodyFrame(h, c.startsWith('low')))])),
  };
  return [held, body];
}

/** What the code holds the drawing to, in words, for the brief. tests/simons-whip.test.js enforces each. */
export function constraints() {
  return [
    '**every crack clip** has two hit frames: the first (the overhead swing) hurts lightly everything in its '
      + 'area while it shows; the second is the crack, and its area is the TIP — the only part that catches. '
      + 'The shaft is the straight line from the pivot to the middle of the tip\'s area.',
    `**the tip reaches further with level**: crack < crackLong < crackLonger, measured from the pivot.`,
    '**every crack reaches a minion standing against his front**, standing or sliding, at every length: a '
      + '12-pixel minion on the floor just past his hand is hit by the tip or the shaft. **The swing\'s area '
      + 'stays behind his hand**, so that minion takes the crack and not the light hit (one crack pays a '
      + 'target once).',
    '**the body sheet** has exactly the whip\'s clips, frame counts and holds, on the same paper and pivot, '
      + 'and uses only the player\'s own twelve colours. It is drawn in place of him while he cracks.',
    '**crackUp…** points up and forward; **lowCrack…** is the crack during a slide, his hand 6 pixels above '
      + 'the floor rather than 12.',
  ];
}
