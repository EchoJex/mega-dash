/**
 * STRIKE MAN'S PLACEHOLDER RIG — what `npm run art:placeholders -- strike`
 * paints into `design/sprites/boss-strike-body.sprite`.
 *
 * A transcription of the plain block the game drew him as: his 38×44 body
 * standing on the pivot (the floor under his middle), a darker band for his
 * trunks, and a red glove where each move's hit area is. The holds are the
 * timings his fight used before it read them from this sheet, so the
 * placeholder plays exactly the fight that was playtested.
 */
const P = { x: 48, y: 60 };
const W = 38, H = 44;
const L = P.x - W / 2, T = P.y - H;          // 29, 16
const PALETTE = [
  { key: '0', hex: '#0A0A12', name: 'outline' },
  { key: '1', hex: '#EA6A34', name: 'body (Strike Man primary)' },
  { key: '2', hex: '#7C2D12', name: 'trunks and arm (Strike Man secondary)' },
  { key: '3', hex: '#C81E1E', name: 'glove' },
];

const box = (g, x, y, w, h, fill) => {
  g.fillStyle(0x0A0A12, 1); g.fillRect(x, y, w, h);
  g.fillStyle(fill, 1); g.fillRect(x + 1, y + 1, w - 2, h - 2);
};
/** His body, `dx` to the side and `drop` pixels shorter (a crouch, a breath). */
const body = (g, dx = 0, drop = 0) => {
  box(g, L + dx, T + drop, W, H - drop, 0xEA6A34);
  g.fillStyle(0x7C2D12, 1);
  g.fillRect(L + dx + 1, P.y - 15, W - 2, 6);
};
const glove = (g, x, y, w = 8, h = 8) => box(g, x, y, w, h, 0xC81E1E);
const arm = (g, x0, x1, y) => { g.fillStyle(0x7C2D12, 1); g.fillRect(Math.min(x0, x1), y, Math.abs(x1 - x0), 4); };
const guardUp = (g, dx = 0) => glove(g, L + W - 6 + dx, T + 10);

/** One frame: how long it shows, what it paints, and its hit area or spawn point. */
const f = (hold, paint, extra = {}) => ({ hold, paint, ...extra });

export function rig() {
  return [{
    sheet: 'body', pivot: P, palette: PALETTE,
    clips: {
      idle: [f(30, (g) => { body(g); guardUp(g); }), f(30, (g) => { body(g, 0, 1); guardUp(g); })],
      walk: [0, 1, 0, -1].map((dx) => f(8, (g) => { body(g, dx); guardUp(g, dx); })),
      guard: [f(10, (g) => { body(g); glove(g, L + W - 4, T + 2, 10, 12); })],
      // The punches come in at the PLAYER's head height, 12 to 24 pixels off the
      // floor: a boxer this tall hooks down at him, or a jab sails overhead.
      jabReady: [f(12, (g) => { body(g); glove(g, L + W - 12, T + 21); })],
      jab: [
        f(4, (g) => { body(g); arm(g, L + W, L + W + 14, T + 23); glove(g, L + W + 14, T + 21, 8, 10); },
          { hit: { x: L + W, y: T + 20, w: 22, h: 12 } }),
        f(6, (g) => { body(g); arm(g, L + W, L + W + 4, T + 23); glove(g, L + W + 4, T + 21, 8, 10); }),
      ],
      back: [f(7, (g) => { body(g, -2); guardUp(g, -2); }), f(7, (g) => { body(g, -1); guardUp(g, -1); })],
      lean: [f(15, (g) => { body(g, -2); glove(g, L - 8, T + 18, 10, 10); }),
        f(15, (g) => { body(g, -3); glove(g, L - 9, T + 18, 10, 10); })],
      lunge: [
        f(4, (g) => { body(g, 2); glove(g, L + W, T + 20, 12, 12); }, { hit: { x: L + W, y: T + 20, w: 12, h: 12 } }),
        f(4, (g) => { body(g, 2); glove(g, L + W, T + 20, 12, 12); g.fillStyle(0x7C2D12, 1); g.fillRect(L - 6, T + 24, 4, 2); }),
      ],
      recover: [f(18, (g) => { body(g); guardUp(g); })],
      down: [
        f(10, (g) => { box(g, L - 2, P.y - 28, W + 4, 28, 0xEA6A34); }),
        f(40, (g) => { box(g, L - 4, P.y - 14, W + 8, 14, 0xEA6A34); glove(g, L + W + 4, P.y - 8, 6, 6); }),
      ],
      dizzy: [f(20, (g) => { body(g, -1); glove(g, L + W - 6, T + 26); }),
        f(20, (g) => { body(g, 1); glove(g, L + W - 4, T + 26); })],
      riseReady: [f(20, (g) => { body(g, 0, 4); glove(g, L + W - 8, P.y - 16); })],
      rise: [
        f(6, (g) => { body(g); glove(g, P.x - 4, T - 12, 10, 12); arm(g, P.x, P.x + 2, T - 2); },
          { hit: { x: P.x - 12, y: T - 6, w: 24, h: H + 6 } }),
        f(6, (g) => { body(g); glove(g, P.x - 3, T - 11, 10, 12); }),
      ],
      blast: [
        f(20, (g) => { body(g); glove(g, L - 6, T + 16, 10, 10); }),
        f(8, (g) => { body(g); glove(g, L + W, T + 16, 10, 10); }, { spawn: { x: L + W + 5, y: T + 20 } }),
      ],
      spinReady: [f(22, (g) => { body(g, 0, 3); glove(g, L - 4, T + 14); })],
      spin: [0, 1, 2, 3].map((q) => f(5, (g) => {
        body(g);
        g.fillStyle(0x7C2D12, 1);
        if (q % 2 === 0) g.fillRect(q ? L - 10 : L + W, T + 6, 10, 5);
        else g.fillRect(P.x - 2, T - 4, 5, 4);
      }, q === 0 ? { hit: { x: L - 3, y: T, w: W + 6, h: H } } : {})),
    },
  }];
}

/** What the code holds the drawing to, in words, for the brief. */
export function constraints() {
  return [
    '**he stands on the pivot**, the floor under the middle of him. His collision box (what the player\'s shots '
      + 'hit, and what hurts to touch) is 38 wide and 44 tall, centred on the pivot and standing on it; draw his '
      + 'body to fill about that, a heavyweight boxer, a little shorter and a bit wider than the old sumo build.',
    '**every jab reaches a player standing against him**: the `jab` hit area starts at or inside the front of '
      + 'his body, reaches at least 8 pixels past it, and covers part of 12 to 24 pixels above the floor — the '
      + 'player is only 24 tall, so a punch at Strike Man\'s own chest height sails over his head.',
    '**the lunge\'s fist is in front of him at the player\'s head height**, and must reach a player standing '
      + 'against him.',
    '**the uppercut (`rise`) covers the space above his head**, so a player jumping over him is caught.',
    '**the spin is a spinning lariat**: the band both gloves sweep through covers at least the width of his collision box.',
    '**`blast` has exactly one spawn point**, the fist the energy blast leaves from; the shot leaves on that '
      + 'frame\'s first step.',
    '**`lean` is the lunge\'s warning**: he plainly rocks back with the glove cocked behind him. It is what '
      + 'makes a punch that crosses most of the room fair, so it has to read at a glance.',
    '**`down` ends in the limp 45° lean, treads planted**, and `dizzy` and `dizzyHard` (stage 2) loop in that lean. '
      + 'The stars (`dizzy`) and the birdies (`dizzyHard`) are drawn in the art, so they follow his head as he leans; '
      + 'the game draws none of its own.',
    '**colours**: Strike Man\'s orange `#EA6A34` and brown `#7C2D12` with shades built from them, the near-black '
      + 'outline, and red boxing gloves.',
  ];
}
