/**
 * THE NES PALETTE — 64 slots, 55 of which carry a colour.
 *
 * THERE IS NO CANONICAL RGB FOR THE NES, and pretending otherwise is the first
 * mistake. The 2C02 does not store colours; it generates an NTSC composite
 * signal directly, so "the" palette depends on the decoder, the television, and
 * the tint bits. Every emulator ships a different approximation and none is
 * wrong. This is the NESTOPIA/FCEUX default, which is the one most modern NES
 * pixel art is drawn against — named here so that a future disagreement is
 * about WHICH approximation rather than about who typed a hex wrong.
 *
 * $0D IS A TRAP AND IT IS LEFT IN. It is "blacker than black" — below the
 * signal's blanking level — and on real CRTs it can pull the whole scanline,
 * which is why it is the one entry every NES art guide tells you never to use.
 * It stays in the table because the table is the hardware, and it is flagged so
 * the editor can warn rather than quietly omit it.
 *
 * $0E, $0F, $1E, $1F, $2E, $2F, $3E, $3F are hardware blacks — duplicates of
 * $0F with no distinct output. They are marked `dup` and the editor hides them,
 * because a palette with eight identical black swatches in it wastes the one
 * thing a colour picker has, which is room.
 *
 * WHAT THIS IS FOR. Not for the game — the game reads three hex strings per
 * actor and does not care where they came from. This is the CONSTRAINT the
 * artist picks those three from, so a hand-drawn sprite lands inside what an
 * NES could have shown instead of merely looking like it might have.
 */

/** Row-major, $00 through $3F. `null` marks a hardware-black duplicate. */
export const NES = [
  // $00-$0F — the dark row
  '#656565', '#002D69', '#131F7F', '#3C137C', '#600B62', '#730A37', '#710F07', '#5A1A00',
  '#342800', '#0B3400', '#003C00', '#003D10', '#003840', '#000000', null, null,
  // $10-$1F — mid
  '#AEAEAE', '#0F63B3', '#4051D0', '#7841CC', '#A736A9', '#C03470', '#BD3C30', '#9F4A00',
  '#6D5C00', '#366D00', '#077704', '#00793D', '#00727D', null, null, null,
  // $20-$2F — bright
  '#FEFEFF', '#5DB3FF', '#8FA1FF', '#C890FF', '#F785FA', '#FF83C0', '#FF8B7F', '#EF9A49',
  '#BDAB2A', '#85BC2F', '#55C753', '#3CC98C', '#3EC2CD', '#4E4E4E', null, null,
  // $30-$3F — pastel
  '#FEFEFF', '#BCDFFF', '#D1D8FF', '#E8D1FF', '#FBCDFD', '#FFCCE5', '#FFCFCA', '#F8D5B0',
  '#EBDBA3', '#D7E2A4', '#C7E7B8', '#C1E8D6', '#C2E6EE', '#B8B8B8', null, null,
];

/** $0D — blacker than black. Legal on the hardware, discouraged in practice. */
export const UNSAFE = 0x0D;

/**
 * The slots worth showing: 55 of the 64.
 *
 * NOT 54, which is the figure usually quoted. That count drops $0D — the
 * blacker-than-black entry — as unusable, which is advice rather than hardware.
 * It is in the table and flagged, so the number here is what the chip has and
 * the warning is what the artist should do about it. $20 and $30 are both white
 * and both stay: they are a genuine hardware duplicate, not a mistake.
 */
export const USABLE = NES.map((c, i) => (c === null ? -1 : i)).filter((i) => i >= 0);

/** `#RRGGBB` -> the nearest NES slot, by plain squared distance in RGB. */
export function nearestSlot(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let best = 0, bestD = Infinity;
  for (const i of USABLE) {
    const [nr, ng, nb] = [1, 3, 5].map((k) => parseInt(NES[i].slice(k, k + 2), 16));
    const d = (r - nr) ** 2 + (g - ng) ** 2 + (b - nb) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return { slot: best, exact: bestD === 0 };
}

/**
 * THE THREE ROLES EVERY SPRITE HAS, and the order is the drawing order.
 *
 * The game's palette rule is exactly three colours plus transparency, and the
 * outline is shared across the whole roster (`OUTLINE` in bosses.js) so that a
 * dark boss never dissolves into a dark room. Storing a pixel as its ROLE
 * rather than as a colour is what lets a boss's palette change in the tracker
 * and recolour his sprite without anybody reopening the art.
 */
export const ROLES = [
  { key: '0', name: 'outline', label: 'OUTLINE' },
  { key: '1', name: 'primary', label: 'PRIMARY' },
  { key: '2', name: 'secondary', label: 'SECONDARY' },
];

/** The character used for a transparent pixel, in the file and in the editor. */
export const EMPTY = '.';
