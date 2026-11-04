/**
 * THORN MAN'S PLACEHOLDER RIG — what `npm run art:placeholders -- thorn`
 * paints into `design/sprites/boss-thorn-body.sprite`.
 *
 * A transcription of the plain block the game drew him as: his 32×43 body
 * standing on the pivot (the floor under his middle), his brown band across
 * the top, and his two shuriken on the ends of his vine arms. The holds are
 * the timings his fight used before it read them from this sheet, so the
 * placeholder plays exactly the fight that was built.
 */
const P = { x: 32, y: 60 };
const W = 32, H = 43;
const L = P.x - W / 2, T = P.y - H;          // 16, 17
const PALETTE = [
  { key: '0', hex: '#0A0A12', name: 'outline' },
  { key: '1', hex: '#2AAB1C', name: 'body (Thorn Man primary)' },
  { key: '2', hex: '#5C4033', name: 'band and vines (Thorn Man secondary)' },
  { key: '3', hex: '#A8A296', name: 'shuriken' },
];

const box = (g, x, y, w, h, fill) => {
  g.fillStyle(0x0A0A12, 1); g.fillRect(x, y, w, h);
  g.fillStyle(fill, 1); g.fillRect(x + 1, y + 1, w - 2, h - 2);
};
/** His body, `dx` to the side and `drop` pixels shorter. */
const body = (g, dx = 0, drop = 0) => {
  box(g, L + dx, T + drop, W, H - drop, 0x2AAB1C);
  g.fillStyle(0x5C4033, 1);
  g.fillRect(L + dx + 1, T + drop + 1, W - 2, 11);
};
/** A vine arm from his shoulder to (x, y), with a shuriken on the end. */
const arm = (g, x, y, dx = 0) => {
  g.fillStyle(0x5C4033, 1);
  const x0 = L + W - 2 + dx, y0 = T + 14;
  const n = Math.max(Math.abs(x - x0), Math.abs(y - y0), 1);
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x - x0) * i / n), Math.round(y0 + (y - y0) * i / n), 2, 2);
  star(g, x, y);
};
const star = (g, x, y) => {
  g.fillStyle(0x0A0A12, 1); g.fillRect(x - 3, y - 1, 7, 3); g.fillRect(x - 1, y - 3, 3, 7);
  g.fillStyle(0xA8A296, 1); g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y - 2, 1, 5);
};
const rest = (g, dx = 0, drop = 0) => { body(g, dx, drop); star(g, L + W - 1 + dx, T + 26); };

/** One frame: how long it shows, what it paints, and its spawn point. */
const f = (hold, paint, extra = {}) => ({ hold, paint, ...extra });

export function rig() {
  return [{
    sheet: 'body', pivot: P, palette: PALETTE,
    clips: {
      idle: [f(30, (g) => rest(g)), f(30, (g) => rest(g, 0, 1))],
      // The tell: arm drawn back, then thrust out. The vines leave from the
      // shuriken on the last frame.
      aim: [
        f(18, (g) => { body(g); arm(g, L - 4, T + 10); }),
        f(12, (g) => { body(g); arm(g, L + W + 8, T + 12); }, { spawn: { x: L + W + 8, y: T + 12 } }),
      ],
      shoot: [f(6, (g) => { body(g); arm(g, L + W + 10, T + 12); }), f(6, (g) => { body(g); arm(g, L + W + 11, T + 13); })],
      zip: [f(4, (g) => { body(g, 2, 2); arm(g, L + W + 12, T + 10, 2); })],
      cling: [f(30, (g) => { body(g, 0, 3); arm(g, L + W + 4, T + 6); })],
      hold: [f(8, (g) => { body(g); arm(g, L + W + 9, T + 14); }), f(8, (g) => { body(g, -1); arm(g, L + W + 8, T + 15, -1); })],
      toss: [f(6, (g) => { body(g, 1); arm(g, L + W + 12, T + 4, 1); })],
      throw: [
        f(12, (g) => { body(g); arm(g, L - 4, T + 6); }),
        f(8, (g) => { body(g); arm(g, L + W + 6, T + 10); }, { spawn: { x: L + W + 6, y: T + 10 } }),
      ],
      fall: [f(6, (g) => { body(g, 0, 2); star(g, L - 2, T + 8); star(g, L + W + 1, T + 8); })],
    },
  }];
}

/** What the code holds the drawing to, in words, for the brief. */
export function constraints() {
  return [
    '**he stands on the pivot**, the floor under the middle of him. His collision box (what the player\'s shots '
      + 'hit, and what hurts to touch) is 32 wide and 43 tall, centred on the pivot and standing on it; draw his '
      + 'tall, skinny body to fill about that.',
    '**`aim` has exactly one spawn point**: the shuriken the pair of vines leaves from, on its last frame. The '
      + 'vines fly from there straight at the player, so it can be anywhere on his front arm.',
    '**`aim` is the vine grab\'s warning**: it has to read at a glance — the arm drawn back, then thrust out — '
      + 'because a catch costs the player two seconds held and a throw into the wall. Its length is how long the '
      + 'warning lasts, and at layer 3 the game plays it faster with each try.',
    '**`throw` has exactly one spawn point**, the hand the leaf kunai leave from; they leave on that frame\'s first step.',
    '**`cling` is how long he clings** to a wall or the ceiling before he fires again.',
    '**the vines themselves are not on this sheet**: the game draws them from the spawn point to wherever they '
      + 'reach. Draw his arms so a vine leaving the shuriken looks like it belongs to them.',
    '**colours**: Thorn Man\'s green `#2AAB1C` and brown `#5C4033` with shades built from them, the near-black '
      + 'outline, and steel-grey shuriken.',
  ];
}
