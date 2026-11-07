/**
 * THE PICTURES ON THE PER-SLICE REVIEW BOARDS — how each variant is shown. Not in the game.
 *
 * A backdrop is shown behind today's plain pieces, so only the backdrop changes; under it, a strip
 * of its pit edge with each of the slice's three floors in front. A material is shown with all
 * five of its pieces in front of the slice's flat colour of today; under it, a strip of its pit
 * edge in front of each of the slice's six backdrops. A backdrop that scrolls in layers is also
 * painted as a moving picture: the camera runs right while the player runs on the spot.
 */

import { Raster, hex } from '../../src/systems/arena-art/pixels.js';
import { W, H, FLOOR, STYLES, LAYOUT, backdropOf, overlay } from './variants.mjs';

const STRIP = 40, GAP = 4;
const DOORS = { boss: 380, exit: 428 };

/** `t` is the game's clock in steps (1/60 s), for anything that moves by itself, like falling embers. */
function paintBackdrop(r, bd, b, cam = 0, t = 0) {
  for (const L of bd.layers) L.paint(r, b, Math.round(cam * L.rate), t);
}
/** The floor with its pit, a platform and the spike bed; at step `t`, also whatever on them moves by itself (sparks). */
function pieces(r, M, t = null) {
  M.ground(r, 0, LAYOUT.pit[0]);
  M.ground(r, LAYOUT.pit[1], W);
  const [px, py, pw] = LAYOUT.platform;
  M.platform(r, px, py, pw);
  M.spikes(r, LAYOUT.spikes[0], LAYOUT.spikes[1]);
  if (t !== null && M.sparks) for (const [x, y, k] of M.sparks.at(LAYOUT.spikes[0], LAYOUT.spikes[1], t)) r.set(x, y, hex(M.sparks.colours[k]));
}
/** A moment when something on the spike bed is moving, so a still picture shows it (0 if nothing ever does). */
const busyMoment = (M) => { for (let t = 0; M.sparks && t < 600; t++) if (M.sparks.at(LAYOUT.spikes[0], LAYOUT.spikes[1], t).length) return t; return 0; };
function finish(r, player, frame = 0, x = 52) {
  overlay(r);
  const cv = r.flush();
  if (player) cv.getContext('2d').drawImage(player, frame * 24, 0, 24, 24, x, FLOOR - 24, 24, 24);
  return cv;
}
function stack(main, strips, cropW, crop) {
  const out = document.createElement('canvas');
  out.width = W; out.height = H + GAP + STRIP;
  const g = out.getContext('2d');
  g.fillStyle = '#060614'; g.fillRect(0, 0, out.width, out.height);
  g.drawImage(main, 0, 0);
  strips.forEach((cv, i) => g.drawImage(cv, crop[0], crop[1], cropW, STRIP, i * (cropW + 4), H + GAP, cropW, STRIP));
  return out;
}

/** A backdrop behind today's pieces, plus its pit edge with each of the slice's floors. */
export function backdropPicture(slice, bd, b, player) {
  const r = new Raster(W, H);
  paintBackdrop(r, bd, b);
  pieces(r, STYLES.TODAY);
  STYLES.TODAY.door(r, LAYOUT.door, 'boss');
  const strips = slice.materials.map(([, , , M]) => {
    const s = new Raster(W, H); paintBackdrop(s, bd, b); pieces(s, M); return finish(s, null);
  });
  return stack(finish(r, player), strips, 156, [134, 150]);
}

/** One frame of a layered backdrop scrolling: the camera at `cam`, the player running on the spot. */
export function backdropFrame(slice, bd, b, player, cam, step) {
  const r = new Raster(W, H);
  paintBackdrop(r, bd, b, cam, step * 4);
  const period = 232, pit = 32;
  for (let x0 = -(cam % period); x0 < W; x0 += period) STYLES.TODAY.ground(r, Math.max(0, x0), Math.min(W, x0 + period - pit));
  const strips = slice.materials.map(([, , , M]) => {
    const s = new Raster(W, H); paintBackdrop(s, bd, b, cam, step * 4); pieces(s, M); return finish(s, null);
  });
  return stack(finish(r, player, 6 + (step % 8)), strips, 156, [134, 150]);
}

/** One frame of the owner's pick, backdrop and material together, the player standing still. */
export function pickFrame(bd, M, b, player, step) {
  const r = new Raster(W, H);
  paintBackdrop(r, bd, b, 0, step * 4);
  pieces(r, M, step * 4);
  M.door(r, DOORS.boss, 'boss');
  M.door(r, DOORS.exit, 'exit');
  return finish(r, player);
}

/** One frame of anything `paint` draws, behind a material's floor (none if `M` is null): flat, or scrolled to `cam` with a pit every 232 pixels; the player standing, or on running frame `run` (none if `player` is null). */
export function sceneFrame(paint, M, player, { cam = null, run = 0 } = {}) {
  const r = new Raster(W, H);
  paint(r);
  if (!M) { /* the picture paints its own floors */ }
  else if (cam === null) M.ground(r, 0, W);
  else for (let x0 = -(Math.round(cam) % 232); x0 < W; x0 += 232) M.ground(r, Math.max(0, x0), Math.min(W, x0 + 200));
  return finish(r, player, run);
}

/** A material's five pieces in front of the slice's flat colour of today, plus its pit edge against each backdrop. */
export function materialPicture(slice, M, b, player) {
  const r = new Raster(W, H);
  const flat = backdropOf(b);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) r.set(x, y, flat);
  pieces(r, M, busyMoment(M));
  M.door(r, DOORS.boss, 'boss');
  M.door(r, DOORS.exit, 'exit');
  const strips = slice.backdrops.map((bd) => {
    const s = new Raster(W, H); paintBackdrop(s, bd, b); pieces(s, M); return finish(s, null);
  });
  return stack(finish(r, player), strips, 76, [162, 150]);
}

/** The colours under the pit: what a floor's edge has to stand out against. */
export function pitSample(bd, b) {
  const r = new Raster(W, H);
  paintBackdrop(r, bd, b);
  const px = [];
  for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x += 3) { const i = (y * W + x) * 4; px.push([r.d[i], r.d[i + 1], r.d[i + 2]]); }
  return px;
}

/** A frame as PNG scanlines (filter byte 0 on each row), deflated in the browser: one APNG frame's data. */
export async function deflated(cv) {
  const { data } = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  const stride = cv.width * 4, raw = new Uint8Array(cv.height * (stride + 1));
  for (let y = 0; y < cv.height; y++) raw.set(data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  const buf = await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
  let s = '';
  const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
