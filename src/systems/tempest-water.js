/**
 * THE WATER BOSS'S WATER AND TANK BAR, as picked on the "Tempest Man Art" canvas
 * (15-16 Nov 2026). His body sheet draws him and his tank; this draws what changes
 * with the fight and so cannot be in his pictures:
 *
 * - the TANK BAR's level (`boss.tank`, 1 full, 0 empty), and the red X flashing
 *   whenever it is empty ("Whenever empty"), over the bar his sheet draws full;
 * - JET G, two thin roped streams straight down out of the nozzles, with a mound
 *   of churning foam where they hit the floor (the only direction drawn so far:
 *   pointing any other way the old plain water is kept);
 * - the CHARGE's shallow, airy water out of the two wide rear bells (bells B) and
 *   the BOW WAVE curling in front of the held-out mine (charge 2);
 * - THRUSTERS A's grey gas out of the back of the tank in the divebomb.
 *
 * Every frame of his sheet has a `spawn` point: the bar's top-left corner. All of
 * the above is placed from it, so it follows his bob and his squat with no table
 * of offsets here. The pictures themselves are the canvas's, in
 * `src/data/tempest-water.json`. Small enough to draw as pixels each step, like
 * the plain water was.
 */
import W from '../data/tempest-water.json' with { type: 'json' };
import { clipOf, frameAt } from './frame-data.js';

const SHEET = 'boss:tempest:body';
const PV = { x: 32, y: 56 };            // his sheet's pivot
const BAR = { x: 7, y: 27 };            // the bar's corner when he sits at ty 0
const num = (h) => parseInt(h.slice(1), 16);
const JP = Object.fromEntries(Object.entries(W.JPAL).map(([k, v]) => [k, num(v)]));
const BOWC = Object.fromEntries(Object.entries(W.BOWC).map(([k, v]) => [k, num(v)]));
const FOAM = [0xFFFFFF, 0xBDF3FF, 0x5CCBF5];
const XCOL = { d: 0x3A424E, 0: 0x0A0A12, f: 0xD0603A };
const EMPTY = 0x0A2659;

function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) % 1000 / 1000;
}

/**
 * Draws it all and answers true; answers 'bar' when it drew the bar but the jet
 * points a way that has no picture yet (the caller draws the plain water), and
 * false when his sheet has no frame data for this moment (the caller draws both). `px, py` is the
 * pivot on screen (the floor under his middle); `floorY` cuts water at the floor.
 */
export function drawTempestWater(g, b, px, py, floorY = Infinity) {
  let c, i;
  try {
    c = clipOf(SHEET, b.clip || 'idle');
    i = frameAt(c, b.clip ? Math.max(0, b.clipT - 1) : b.anim, true);
  } catch { return false; }
  const sp = c.spawns.find((s) => s.frame === i);
  if (!sp) return false;
  const face = b.facing ?? -1, ty = PV.y + sp.y - BAR.y, step = b.anim || 0;
  // A pixel of his sheet (x, y in its 64 x 64) to the screen, mirrored with him.
  const put = (X, Y, col) => {
    const sx = face < 0 ? px - (X - PV.x) - 1 : px + (X - PV.x), sy = py + (Y - PV.y);
    if (sy >= floorY) return false;
    g.fillStyle(col, 1); g.fillRect(sx, sy, 1, 1);
    return true;
  };

  // THE BAR. His sheet draws it full; the drained end goes dark.
  const bx = BAR.x, by = BAR.y + ty;
  if (b.tank !== undefined) {
    if (b.tank > 0) {
      const n = Math.max(1, Math.round(9 * b.tank));
      for (let k = n; k < 9; k++) for (let r = 1; r <= 3; r++) put(bx + k, by + r, EMPTY);
    } else {
      const lit = Math.floor(step / 8) % 2 === 0;
      W.XBAR.forEach((row, r) => { for (let k = 0; k < 9; k++) put(bx + k, by + r, XCOL[row[k] === 'f' && !lit ? '0' : row[k]]); });
    }
  }

  const jf = Math.floor(step / 3) % 4, j = b.jet;
  // THRUSTERS A: a hiss of gas behind him for the whole dive, a puff as the wait ends.
  const clip = b.clip || 'idle';
  let gas = 0;
  if (clip === 'dive') gas = 1;
  else if (clip === 'tell' && b.clipT > c.total - 10) gas = 0.4;
  if (gas) for (const n of W.RCS) puff(put, n, ty, step, gas);

  if (!j || j.len <= 0) return true;
  if (clip === 'dash') {
    // Bells B: shallow, airy water fanning out behind; the bow wave ahead.
    for (const m of W.MOUTHS) rearJet(put, m[0], m[1] + ty, step);
    const mi = W.DASH_M[Math.min(i, W.DASH_M.length - 1)];
    bowWave(put, mi[0], step);
    return true;
  }
  if (j.dy < 0.8) return 'bar';   // only straight down has its picture so far
  // JET G: the two streams, cut at the floor, and the foam where they land.
  let lands = false;
  for (const nx of W.NOZ) {
    W.STREAM[jf].forEach((row, y) => {
      for (let x = 0; x < 16; x++) {
        if (row[x] === '.') continue;
        if (!put(nx + x, W.NOZY + ty + y, JP[row[x]])) lands = true;
      }
    });
  }
  if (lands && Number.isFinite(floorY)) {
    const cx = W.NOZ[0] + 11 - 20;
    W.SPLASH[jf].forEach((row, y) => {
      for (let x = 0; x < 40; x++) {
        if (row[x] === '.') continue;
        const X = cx + x, sx = face < 0 ? px - (X - PV.x) - 1 : px + (X - PV.x);
        g.fillStyle(JP[row[x]], 1); g.fillRect(sx, floorY - 12 + y, 1, 1);
      }
    });
  }
  return true;
}

function puff(put, n, ty, step, scale) {
  const len = Math.max(3, Math.round(n.len * 1.6 * scale)), px = -n.dy, py = n.dx, flick = Math.floor(step / 2);
  for (let d = 1; d <= len; d++) {
    const r = 0.5 + (d * n.w * 1.5) / len;
    for (let o = -Math.ceil(r); o <= Math.ceil(r); o++) {
      if (Math.abs(o) > r) continue;
      const x = Math.round(n.x + n.dx * d + px * o), y = Math.round(n.y + ty + n.dy * d + py * o);
      if (d > len * 0.6 && ((x * 73 + y * 37 + flick * 11) % 7 + 7) % 7 < 3) continue;
      put(x, y, d <= 2 ? 0xFFFFFF : d <= len * 0.6 ? 0xD8DEE8 : 0x9AA4B4);
    }
  }
}

function rearJet(put, mx, my, step) {
  const fl = Math.floor(step / 2), len = W.FX.len, hw = W.HW;
  for (let d = 1; d <= len; d++) {
    const spread = hw + d * 0.6;
    for (let o = -Math.ceil(spread); o <= Math.ceil(spread); o++) {
      if (Math.abs(o) > spread) continue;
      if (hash(d, o, fl) < 0.25 + (d / len) * 0.45) continue;
      put(mx - d, Math.round(my + o), FOAM[d < 3 ? 0 : hash(o, d, fl + 1) < 0.5 ? 1 : 2]);
    }
  }
}

function bowWave(put, mx, step) {
  const fl = Math.floor(step / 3), x0 = mx - 16, y0 = PV.y - W.BOW.length;
  W.BOW.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      let k = row[x];
      if (k === '.') continue;
      if (x < 7 && hash(x, y, fl) < 0.3) continue;
      if ((k === 'l' || k === 'c') && hash(x, y, fl) < 0.22) k = k === 'l' ? 'c' : 'l';
      put(x0 + x, y0 + y, BOWC[k]);
    }
  });
  for (let q = 0; q < 5; q++) {
    if (hash(q, fl, 7) < 0.55) put(x0 + 24 + Math.round(hash(q, fl, 3) * 7), y0 - 1 - Math.round(hash(fl, q, 5) * 3), hash(q, q, fl) < 0.5 ? 0xFFFFFF : 0xBDF3FF);
  }
}
