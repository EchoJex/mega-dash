/**
 * DRAKE BREATH'S PLACEHOLDER RIG — what `npm run art:placeholders --
 * drake_breath` paints into its six sheets, with the game's own fallback
 * shapes. Nothing hits by frame (see src/data/weapon-art.js).
 */
import {
  drawDrakeHead, drawDrakePuff, drawDrakeWave, drawDrakeBlast, drawDrakeBeam, drawDrakeStreak, BEAM_TILE,
} from '../../src/systems/weaponry.js';
import { ladderAt } from '../../src/data/weapons.js';

const PALETTE = [
  { key: '0', hex: '#0A0A12', name: 'outline' },
  { key: '1', hex: '#3B2A8C', name: 'indigo' },
  { key: '2', hex: '#8B5CF6', name: 'violet' },
  { key: '3', hex: '#2DD4BF', name: 'teal' },
  { key: '4', hex: '#F2EEFF', name: 'white core' },
];
const W = ladderAt('drake_breath', 3).wave;
const WAVE_H = 24 + W.above + W.below;             // the wave's height, and the beam's
const HAND = { x: 4, y: 9 }, FOOT = { x: 8, y: 46 }, MID = { x: 8, y: 8 }, TILE = { x: 0, y: 46 };

export function rig() {
  const head = (o) => (g) => drawDrakeHead(g, HAND.x, HAND.y, 1, o);
  return [
    {
      sheet: 'held', pivot: HAND, palette: PALETTE,
      clips: {
        rest: [{ hold: 5, paint: head({}) }],
        rear: [1, 2, 3].map((r) => ({ hold: 4, paint: head({ rear: r }) })),
        breathe: [false, true].map((o) => ({ hold: 4, paint: head({ open: true, rear: o ? 1 : 0 }) })),
        charge: [0, 1].map((b) => ({ hold: 6, paint: head({ glow: 1, blink: b }) })),
        chargeFull: [0, 1].map((b) => ({ hold: 4, paint: head({ glow: 2, blink: b }) })),
      },
    },
    {
      sheet: 'puff', pivot: MID, palette: PALETTE,
      clips: { burn: [0, 1, 2].map((ph) => ({ hold: 10, paint: (g) => drawDrakePuff(g, MID.x, MID.y, 4 + ph, ph) })) },
    },
    {
      sheet: 'wave', pivot: FOOT, palette: PALETTE,
      clips: { travel: [0, 1].map((f) => ({ hold: 3, paint: (g) => drawDrakeWave(g, FOOT.x + 3, FOOT.y, 1, WAVE_H, f) })) },
    },
    {
      sheet: 'blast', pivot: MID, palette: PALETTE,
      clips: { fly: [0, 1].map((f) => ({ hold: 4, paint: (g) => drawDrakeBlast(g, MID.x, MID.y, 7, f) })) },
    },
    {
      sheet: 'beam', pivot: TILE, palette: PALETTE,
      clips: {
        tele: [0, 1].map((f) => ({ hold: 2, paint: (g) => drawDrakeBeam(g, 0, TILE.y, 1, BEAM_TILE, WAVE_H, 'tele', f) })),
        start: [0, 1].map((f) => ({ hold: 4, paint: (g) => drawDrakeBeam(g, 0, TILE.y, 1, BEAM_TILE, WAVE_H, 'start', f) })),
        body: [0, 1].map((f) => ({ hold: 4, paint: (g) => drawDrakeBeam(g, 0, TILE.y, 1, BEAM_TILE, WAVE_H, 'body', f) })),
        fade: [0.8, 0.55, 0.3, 0.1].map((k) => ({ hold: 6, paint: (g) => drawDrakeBeam(g, 0, TILE.y, 1, BEAM_TILE, WAVE_H, 'fade', 0, k) })),
      },
    },
    {
      sheet: 'streak', pivot: { x: 0, y: 2 }, palette: PALETTE,
      clips: { blow: [12, 9, 6].map((len, i) => ({ hold: 5, paint: (g) => drawDrakeStreak(g, 0, 2, 1, len, i ? 1 : 0) })) },
    },
  ];
}

/** What the code holds the drawing to, in words, for the brief. */
export function constraints() {
  return [
    '**nothing hits by frame**: the breath puffs, the wave, the blast and the beam hurt by their own shapes, '
      + 'which the code sets from the ladder. Draw to fit those shapes; no frame carries a hit area.',
    `**the wave and the beam are ${WAVE_H} pixels tall**: from ${W.below} pixels below the floor he stands on to `
      + `${W.above} pixels (about two head-heights) above the top of his head. Their pivots sit at that bottom edge.`,
    `**the beam is drawn as tiles ${BEAM_TILE} wide**, laid edge to edge from the cannon's mouth outward, so a `
      + '`body` tile must join seamlessly to itself and to `start` (the first tile, at the mouth). `tele` is the '
      + 'one-pixel telegraph line before it fires; `fade` is the beam thinning away at the end of its two seconds.',
    '**the cannon is held at its back end** (the pivot), facing right; the mouth is its far end, about 16 pixels '
      + 'ahead of his hand. `rear` is the wind-up (it rears back and up), `breathe` has the jaw open, `charge` '
      + 'glows violet (the Lv6 blast is ready) and `chargeFull` glows white (the Lv10 beam is ready).',
    '**some timing is the game\'s, not the drawing\'s**: the wind-up, how long a puff lives (shorter the longer '
      + 'the breath is held), and the beam\'s fade. Those clips\' frames are spread evenly over that time, so '
      + 'their holds set the order and proportion of the frames, not how long they last.',
    '**colours**: indigo, violet and teal with a near-white core, never fire colours — Dragon is not Fire. The '
      + 'owner\'s references are Lucario\'s soul-fire colours and his final-smash beam (Super Smash Bros.).',
  ];
}
