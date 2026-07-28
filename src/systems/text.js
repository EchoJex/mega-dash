/**
 * TEXT RESOLUTION — why the HUD looks soft, and the fix.
 *
 * The game renders into a 224px-tall virtual canvas which is then integer-scaled
 * up to fill the screen. Phaser rasterises a Text object into a texture at its
 * LAYOUT size, so a 7px label becomes a 7px-tall bitmap — and that bitmap is
 * what gets blown up 4-5x. You are not looking at a small font, you are looking
 * at a small font's pixels magnified, complete with the browser's antialiasing
 * smeared across five screen pixels per source pixel.
 *
 * `resolution` fixes exactly this. It renders the glyph texture N times larger
 * while keeping the object's layout size identical: the text still occupies the
 * same 7 virtual pixels of the HUD, it just arrives with enough real pixels to
 * survive the upscale. Nothing about the layout, the virtual resolution, or the
 * integer scaling changes.
 *
 * A VECTOR font would not help on its own. Every font is rasterised before it
 * reaches the canvas, so a vector typeface at 7px is still a 7px bitmap by the
 * time it is scaled. Resolution is the lever, not the typeface.
 *
 * The long-term "correct" answer for a pixel-art game is a hand-authored bitmap
 * font drawn at 1:1 and scaled with nearest-neighbour, which would be perfectly
 * crisp and stylistically of a piece with the sprites. That needs the font to be
 * drawn first, so this is the right fix until then.
 */

import { VIEW_H } from '../config/display.js';

/**
 * Match the texture resolution to how far the canvas is actually being scaled,
 * including device pixel ratio. Capped: past ~8x the textures get large for no
 * visible gain, and floored at 2 so even a small window is legible.
 */
export function textResolution() {
  const dpr = globalThis.devicePixelRatio || 1;
  const h = globalThis.innerHeight || VIEW_H;
  return Math.min(8, Math.max(2, Math.round((h / VIEW_H) * dpr)));
}

export const TEXT_RES = textResolution();
