/**
 * TEMPEST MAN'S PLACEHOLDER RIG — what `npm run art:placeholders -- tempest`
 * paints into `design/sprites/boss-tempest-body.sprite`.
 *
 * A transcription of the plain block the game drew him as: his 27×36 body
 * standing on the pivot (the point under his middle), his yellow band across
 * the top, and one white eye on the side he faces. Each move leans or squashes
 * the block a little so the clips can be told apart.
 *
 * THE JETPACK IS PART OF HIS BODY (owner, 11 Nov 2026: "Part of his body"): a
 * grey box on his back with two dark nozzles, pointing where the water goes in
 * that move — down while he hangs or climbs, behind him while he flies or
 * dives, up while he sinks in his warning. The game draws only the water.
 * `tell` is 30 steps, the warning his fight used before it read it from this
 * sheet.
 */
const P = { x: 32, y: 56 };
const W = 27, H = 36;
const L = 19, T = P.y - H;                   // 19, 20
const PALETTE = [
  { key: '0', hex: '#0A0A12', name: 'outline' },
  { key: '1', hex: '#145DBD', name: 'body (Tempest Man primary)' },
  { key: '2', hex: '#F5C518', name: 'band (Tempest Man secondary)' },
  { key: '3', hex: '#FFFFFF', name: 'his single eye' },
  { key: '4', hex: '#6B7686', name: 'jetpack' },
  { key: '5', hex: '#2A323C', name: 'jetpack nozzles' },
];
/** Where the water starts, in the sheet's pixels: the middle of him, three quarters of the way down. */
export const WATER = { x: P.x, y: T + Math.round(H * 0.75) };

const box = (g, x, y, w, h, fill) => {
  g.fillStyle(0x0A0A12, 1); g.fillRect(x, y, w, h);
  g.fillStyle(fill, 1); g.fillRect(x + 1, y + 1, w - 2, h - 2);
};
/** His body, `dx`/`dy` off his spot and `drop` pixels shorter, with his eye looking `look` pixels up or down. */
const body = (g, dx = 0, dy = 0, drop = 0, look = 0, jets = 'down') => {
  // The pack on his back (he faces right, so his back is the left), behind the body.
  const bx = L + dx - 7, by = T + dy + drop + 8;
  g.fillStyle(0x2A323C, 1);
  if (jets === 'down') { g.fillRect(bx, by + 18, 4, 5); g.fillRect(bx + 6, by + 18, 4, 5); }
  if (jets === 'up') { g.fillRect(bx, by - 4, 4, 5); g.fillRect(bx + 6, by - 4, 4, 5); }
  if (jets === 'back') { g.fillRect(bx - 4, by + 3, 5, 4); g.fillRect(bx - 4, by + 11, 5, 4); }
  box(g, bx, by, 12, 19, 0x6B7686);
  box(g, L + dx, T + dy + drop, W, H - drop, 0x145DBD);
  g.fillStyle(0xF5C518, 1);
  g.fillRect(L + dx + 1, T + dy + drop + 1, W - 2, 9);
  g.fillStyle(0x0A0A12, 1); g.fillRect(L + dx + W - 9, T + dy + drop + 12 + look, 6, 6);
  g.fillStyle(0xFFFFFF, 1); g.fillRect(L + dx + W - 8, T + dy + drop + 13 + look, 4, 4);
};

/** One frame: how long it shows and what it paints. */
const f = (hold, paint) => ({ hold, paint });

export function rig() {
  return [{
    sheet: 'body', pivot: P, palette: PALETTE,
    clips: {
      idle: [f(30, (g) => body(g)), f(30, (g) => body(g, 0, 0, 1))],
      // Cruising high up: a slow bob, the water going out behind him.
      fly: [f(12, (g) => body(g, 0, 0, 0, 0, 'back')), f(12, (g) => body(g, 0, -1, 0, 0, 'back'))],
      // The warning before a dive: he stops, shrinks back and looks down at the
      // player; the nozzles turn up, which is what pushes him down.
      tell: [f(18, (g) => body(g, -2, 0, 3, 3, 'up')), f(12, (g) => body(g, -3, 0, 5, 4, 'up'))],
      // The dive: pushed forward, shaking.
      dive: [f(4, (g) => body(g, 3, 0, 2, 0, 'back')), f(4, (g) => body(g, 4, 0, 2, 0, 'back'))],
      // Climbing back up: stretched, looking up, the water going straight down.
      climb: [f(8, (g) => body(g, 0, -2, 0, -3)), f(8, (g) => body(g, 0, -3, 0, -3))],
    },
  }];
}

/** What the code holds the drawing to, in words, for the brief. */
export function constraints() {
  return [
    '**he hangs on the pivot**, the point under the middle of him. His collision box (what the player\'s shots '
      + 'hit, and what hurts to touch) is 27 wide and 36 tall, centred on the pivot and standing on it; draw his '
      + 'body to fill about that. Touching him is the only way his own moves hurt, so what looks solid should be '
      + 'inside that box and what sticks out of it (spray, a scarf) should look like it would not hurt.',
    '**`tell` is the dive\'s warning, and its length is how long the warning lasts**: he stops dead and sinks a '
      + 'little before he crosses the room at the player\'s height. He has no shot to watch for, so this clip is '
      + 'all the warning there is; it has to read at a glance. A second or third dive in a row (layers 2 and 3) '
      + 'plays only its first six-tenths, so put the readable part first.',
    '**nothing on this sheet hits or spawns**: no `hit=` and no `spawn=` on any frame.',
    '**the jetpack is part of his body** (owner, 11 Nov 2026), drawn in every frame: "a large grey hydro jet '
      + 'pack", grey that is not one of his colours, with two nozzles. In each clip the nozzles point where the '
      + 'water goes in that move: down in `idle` and `climb`, out behind him in `fly` and `dive`, and up in '
      + '`tell` (he pushes himself down a little before he dives).',
    `**the game draws the water, not the pack.** It starts at ${WATER.x}, ${WATER.y} in the sheet's pixels `
      + '(the middle of him, three quarters of the way down) and runs about 30 pixels the way he is NOT going. '
      + 'It pushes the player and stops his shots, so it has to look like it comes out of the drawn nozzles: '
      + 'keep them within a few pixels of that point.',
    '**he has a single eye** (the owner\'s rule for every boss, to be interpreted with very wide creativity).',
    '**colours**: Tempest Man\'s blue `#145DBD` and yellow `#F5C518` with shades built from them and the '
      + 'near-black outline. Grey belongs to the jetpack only.',
  ];
}
