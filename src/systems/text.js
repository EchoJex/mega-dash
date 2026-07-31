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

import { VIEW_H, RENDER_SCALE } from '../config/display.js';
import { FONT_KEY, GLYPH_H, fold } from './font.js';
import { hexNum } from './assets.js';

/**
 * THE HUD FONT — every piece of text in the game goes through here.
 *
 * `scale` is an INTEGER multiplier of the 7px glyph, never an arbitrary point
 * size. That is the whole point of a bitmap font: at 1x one glyph pixel is one
 * virtual pixel and nearest-neighbour scaling keeps it exact. A fractional size
 * would resample the glyph and reintroduce the mush this replaced.
 *
 *   1  body text, HUD, card copy   (7px tall)
 *   2  headings                    (14px)
 *   3  the title                   (21px)
 */
export function label(scene, x, y, str, opts = {}) {
  const { scale = 1, color = '#E0F0FF', origin = 0, depth } = opts;
  const t = scene.add.bitmapText(Math.round(x), Math.round(y), FONT_KEY, fold(str));
  t.setFontSize(GLYPH_H * scale);
  // The glyph box is exactly 7px with no built-in leading, so stacked lines
  // touch without this. 2px reads as a deliberate gap at every scale.
  t.setLineSpacing?.(2 * scale);
  if (color) t.setTint(hexNum(color));
  t.setOrigin(origin === 0.5 ? 0.5 : 0);
  if (depth !== undefined) t.setDepth(depth);
  // Keep setText folding too, so callers can push raw strings in later.
  const setText = t.setText.bind(t);
  t.setText = (s) => setText(fold(s));
  return t;
}

/**
 * A label on a filled plate — the button treatment.
 *
 * Returns { rect, txt } because a bitmap font has no backgroundColor of its own,
 * and drawing the plate separately is what lets the text stay pixel-exact on top
 * of it. `rect` is the interactive surface.
 */
export function plate(scene, cx, cy, str, opts = {}) {
  const {
    scale = 1, color = '#5CADD5', bg = 0x0d1420, padX = 6, padY = 4,
    alpha = 1, stroke = null,
  } = opts;
  const txt = label(scene, cx, cy, str, { scale, color, origin: 0.5 });
  const w = txt.width + padX * 2, h = txt.height + padY * 2;
  const rect = scene.add.rectangle(Math.round(cx), Math.round(cy), Math.ceil(w), Math.ceil(h), bg, alpha)
    .setOrigin(0.5);
  if (stroke !== null) rect.setStrokeStyle(1, stroke, 1);
  // The plate is created after the text, so put it back underneath.
  scene.children.moveBelow(rect, txt);
  rect.setInteractive({ useHandCursor: true });
  return { rect, txt };
}

/**
 * Match the texture resolution to how far the canvas is actually being scaled,
 * including device pixel ratio. Capped: past ~8x the textures get large for no
 * visible gain, and floored at 2 so even a small window is legible.
 */
/**
 * Match the glyph texture exactly to the canvas density. Anything higher gets
 * point-sampled down and fragments; anything lower is upscaled and blurs.
 */
export const TEXT_RES = RENDER_SCALE;

/**
 * Zoom a scene's camera so the dense canvas shows exactly the virtual playfield.
 * Every scene calls this once; without it the extra backing-store pixels would
 * simply reveal more world instead of drawing the same world more finely.
 */
export function fitCamera(scene, viewW) {
  const cam = scene.cameras.main;
  cam.setZoom(RENDER_SCALE);
  cam.centerOn(viewW / 2, VIEW_H / 2);
}
