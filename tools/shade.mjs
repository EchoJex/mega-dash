/**
 * A FULL-COLOUR MINION'S COPY FOR EACH AREA (the Gunner, 10 Nov 2026).
 *
 * A drawing whose palette names some keys "body ..." has those turned into shades of an area's
 * boss colour, each keeping how much lighter or darker it is than the plain "body" key. The rest
 * stays as drawn. One copy, used by the sprite build and by the review canvas's pictures.
 */
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function hsl(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

export function rgbOf(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h * 6) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h * 6) % 6];
  return [r, g, b].map((v) => Math.round((v + m) * 255)).concat(255);
}

/** The palette keys named "body ...", or an empty list for a drawing that has none. */
export const bodyKeysOf = (palette) => (palette || []).filter((p) => p.name?.startsWith('body'));

/** `{ key: [r, g, b, 255] }` for each body key, shaded toward `primary` (a boss's colour). */
export function bodyShades(palette, primary) {
  const base = hsl(palette.find((p) => p.name === 'body').hex), b = hsl(primary);
  return Object.fromEntries(bodyKeysOf(palette).map((p) => [p.key,
    rgbOf(b[0], b[1], Math.max(0.04, Math.min(0.94, b[2] + hsl(p.hex)[2] - base[2])))]));
}
