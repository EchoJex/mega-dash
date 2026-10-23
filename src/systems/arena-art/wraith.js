/**
 * WRAITH MAN — ghost. A derelict chapel.
 *
 * Drawn by Claude at the owner's request, 23 Oct 2026, from the tracker's arena
 * line: "Derelict chapel: broken pews, a collapsed rose window, and shafts of
 * pale light through dust with partially lit candelabra in the background. No
 * secular imagery." The owner added, in the conversation: "include art in the
 * background that wiggles from time to time like it is possessed" — the
 * painting below the rose window, which shudders and opens its eyes now and
 * then.
 *
 * No symbols and nothing worldly: stone, broken glass, pews, candles, light.
 * The room has no furniture yet (that tracker line is still deferred), so
 * everything here is background and nothing here can be stood on or hurt by.
 */
import { H, OL, OLc, hex, css, ramp, bayer, hash, noise1, noise2, pick, Raster, R, dot, frames, pieces } from './pixels.js';

/** Steps between the painting's fits; a fit happens on about two in three. */
const FIT_EVERY = 420, FIT_LEN = 36;

export default function wraith(S, a, viewW) {
  const FLOOR = a.floorY;
  const ST = ramp(['#0E0A1A', '#171126', '#211934', '#2A1F4A', '#3A2D5E', '#4B3D72', '#5E5086', '#77699C', '#9283B8', '#B9A9E0']);
  const Sc = ST.map(css), nS = ST.length - 1;
  const stone = (v) => ST[Math.max(0, Math.min(nS, Math.round(v * nS)))];
  const SKY = hex('#07050F');
  const cx = Math.round(viewW / 2), RY = 50, RR = 30;

  // ── the back wall: ashlar blocks, darker toward the floor, two pilasters
  const wall = new Raster(viewW, FLOOR);
  const BW = 24, BH = 12;
  const lancets = [Math.round(viewW * 0.2), Math.round(viewW * 0.8)];
  const lancetIn = (x, y) => {
    for (const lx of lancets) {
      const dx = Math.abs(x - lx), top = 40, bot = 122;
      if (y < top || y > bot || dx > 10) continue;
      if (y < top + 14) { const k = (top + 14 - y) / 14; if (dx > 10 * Math.sqrt(Math.max(0, 1 - k * k)) - k * 3) continue; }
      return lx;
    }
    return null;
  };
  for (let y = 0; y < FLOOR; y++) {
    const base = 0.46 - 0.3 * (y / FLOOR);
    const row = Math.floor(y / BH), ly = y % BH, off = row & 1 ? BW / 2 : 0;
    for (let x = 0; x < viewW; x++) {
      const dR = Math.hypot(x - cx, y - RY);
      if (dR <= RR + 3) continue;                          // the rose window, drawn below
      const lx = lancetIn(x, y);
      if (lx !== null) {                                    // a lancet: night, leading, a few panes left
        const gx = x - lx + 10, gy = y - 40;
        const lead = (gx + gy) % 6 === 0 || (gx - gy + 60) % 6 === 0;
        const pane = hash(Math.floor((gx + gy) / 6), Math.floor((gx - gy + 60) / 6), lx) < 0.28;
        wall.set(x, y, lead && pane ? ST[1] : pane ? pick(ramp(['#1E1838', '#2C2450', '#3A3066']), 0.5, x, y) : SKY);
        continue;
      }
      const edge = lancets.some((q) => Math.abs(x - q) <= 12 && y >= 36 && y <= 124) && lancetIn(x - 1, y) === null && lancetIn(x + 1, y) === null;
      const lx2 = (x + off) % BW;
      let c;
      if (ly === 0 || lx2 === 0) c = stone(base - 0.14);
      else if (ly === 1 || lx2 === 1) c = stone(base + 0.05);
      else c = pick(ST, base + (noise2(x * 0.09, y * 0.09, 7) - 0.5) * 0.12, x, y);
      if (edge) c = stone(base + 0.12);
      wall.set(x, y, c);
    }
  }
  // cracks running down from the broken window
  for (let k = 0; k < 3; k++) {
    let x = cx - 18 + k * 14 + Math.round(hash(k, 1, 3) * 6), y = RY + RR + 2;
    for (let s = 0; s < 10 + hash(k, 2, 3) * 18; s++) {
      wall.set(x, y, ST[0]); wall.set(x + 1, y, ST[5]);
      y++; if (hash(k, s, 4) < 0.35) x += hash(k, s, 5) < 0.5 ? -1 : 1;
    }
  }
  const wallCv = wall.flush();

  // ── the rose window: tracery and old glass, its lower left fallen in
  const GLASS = [ramp(['#24121C', '#3A1E2A', '#52303C']), ramp(['#121628', '#1C2440', '#2A3656']), ramp(['#28221A', '#3E3424', '#564A34']), ramp(['#1A1430', '#2A2048', '#3C3062'])];
  const rose = new Raster(RR * 2 + 7, RR * 2 + 7);
  const fallen = (ang, d) => ang > 1.75 && ang < 3.6 && d > 9 + hash(Math.round(ang * 9), 0, 21) * 6;
  for (let y = 0; y < rose.h; y++) for (let x = 0; x < rose.w; x++) {
    const dx = x - RR - 3, dy = y - RR - 3, d = Math.hypot(dx, dy);
    if (d > RR + 3) continue;
    const ang = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2), sec = Math.floor(ang / (Math.PI / 8));
    if (fallen(ang, d)) { rose.set(x, y, d > RR ? (hash(x, y, 22) < 0.5 ? null : OLc) : SKY); continue; }
    if (d > RR) rose.set(x, y, d > RR + 2 ? OLc : stone(0.62 - (dy / RR) * 0.15));
    else if (d < 3) rose.set(x, y, stone(0.6));
    else if (Math.abs(d - 9) < 1.2) rose.set(x, y, stone(0.55));
    else if (d > 9 && Math.abs(((ang + Math.PI / 16) % (Math.PI / 8)) - Math.PI / 16) * d < 0.9) rose.set(x, y, stone(0.5));
    else {
      const g = GLASS[sec % 4], keep = hash(sec, Math.floor(d / 5), 23) > 0.22;
      rose.set(x, y, keep ? pick(g, 0.25 + 0.35 * (1 - d / RR) + (dy < 0 ? 0.1 : 0), x, y) : SKY);
    }
  }
  // a few stars through the hole
  for (let k = 0; k < 9; k++) { const ang = 1.9 + hash(k, 0, 24) * 1.6, d = 12 + hash(k, 1, 24) * 16; rose.set(RR + 3 + Math.cos(ang) * d, RR + 3 + Math.sin(ang) * d, hex(k % 3 ? '#5A5080' : '#C9C0EE')); }
  const roseCv = rose.flush();

  // ── shafts of pale light through the window and the dust in them
  const LIGHT = hex('#D8D0F0');
  const shaftOf = [[-14, 0.5, 5], [2, 0.42, 7], [16, 0.55, 5]];
  const inShaft = (x, y) => {
    for (const [ox, slope, w0] of shaftOf) {
      const y0 = RY + 12, t = y - y0;
      if (t < 0) continue;
      const mid = cx + ox + t * slope, w = w0 + t * 0.12;
      const lat = Math.abs(x - mid);
      if (lat < w) return (1 - lat / w) * (1 - t / (FLOOR - y0) * 0.6);
    }
    return 0;
  };
  const shaft = new Raster(viewW, FLOOR);
  for (let y = RY + 12; y < FLOOR; y++) for (let x = 0; x < viewW; x++) {
    const v = inShaft(x, y);
    if (v > 0 && bayer(x, y) < v * 0.55) shaft.set(x, y, LIGHT);
  }
  const shaftCv = shaft.flush();
  const motes = pieces(['#E8E0FF', '#9A8CC0']);

  // ── two candelabra, some of their candles lit
  const BR = ['#2A2014', '#4A3A20', '#7A6234', '#A88C52'];
  const WAX = ['#6E685E', '#A8A090', '#D4CCBA'];
  const cdl = new Raster(23, 46);
  const cups = [[2, 14], [6, 9], [11, 3], [16, 9], [20, 14]];
  for (let y = 18; y < 42; y++) { cdl.set(11, y, hex(BR[2])); cdl.set(12, y, hex(BR[1])); }
  for (const [x0, y0] of cups) {
    for (let y = y0 + 4; y < 19; y++) cdl.set(x0 + 1, y, hex(BR[x0 < 11 ? 2 : 1]));
    for (let x = Math.min(x0, 11); x <= Math.max(x0 + 1, 12); x++) cdl.set(x, 18, hex(BR[2]));
    for (let x = x0 - 1; x <= x0 + 2; x++) cdl.set(x, y0 + 4, hex(BR[3]));
  }
  for (let x = 6; x <= 17; x++) { cdl.set(x, 42, hex(BR[x < 12 ? 2 : 1])); cdl.set(x, 43, hex(BR[1])); }
  cdl.set(5, 44, hex(BR[1])); cdl.set(18, 44, hex(BR[1])); cdl.set(4, 45, hex(BR[0])); cdl.set(19, 45, hex(BR[0]));
  const candle = (r, x0, y0, len) => { for (let y = y0 + 4 - len; y < y0 + 4; y++) { r.set(x0, y, hex(WAX[2])); r.set(x0 + 1, y, hex(WAX[1])); } r.set(x0, y0 + 3 - len, hex('#2A2420')); };
  const LITS = [[0, 2, 3], [1, 4]], LENS = [5, 7, 6, 4, 6];
  const cXs = [Math.round(viewW * 0.3) - 11, Math.round(viewW * 0.7) - 11], cY = FLOOR - 46;
  const cdlCvs = cXs.map((_, j) => {
    const r = new Raster(23, 46);
    r.d.set(cdl.d);
    cups.forEach(([x0, y0], k) => { if (!(j === 1 && k === 2)) candle(r, x0, y0, LENS[k]); });
    r.outline(OLc);
    return r.flush();
  });
  const flame = pieces([
    ['f0', flameCv(['.1.', '121', '232', '.3.'])],
    ['f1', flameCv(['1..', '121', '232', '.3.'])],
    ['f2', flameCv(['..1', '121', '232', '.3.'])],
  ]);
  // a faint warm glow round each lit candle, painted once onto the wall's side
  const glow = new Raster(viewW, FLOOR);
  cXs.forEach((x0, j) => LITS[j].forEach((k) => {
    const [ux, uy] = cups[k], gx = x0 + ux + 1, gy = cY + uy - LENS[k] - 1;
    for (let y = gy - 10; y < gy + 10; y++) for (let x = gx - 10; x < gx + 10; x++) {
      const d = Math.hypot(x - gx, y - gy) / 10;
      if (d < 1 && bayer(x, y) < (1 - d) * 0.45) glow.set(x, y, hex('#5A3A2A'));
    }
  }));
  const glowCv = glow.flush();

  // ── the possessed painting: a robed, faceless figure in a tarnished frame.
  // Frame 0 at rest; 1 and 2 leaning as it shudders; 3 at rest with its eyes open.
  const PW = 28, PH = 38, pX = Math.round(viewW * 0.36) - PW / 2, pY = 88;
  const GOLD = ramp(['#3A2C12', '#6A5222', '#9A7C3A', '#C8A85A']);
  const ROBE = ramp(['#140E22', '#221838', '#33264E', '#4A3A6A']);
  const portrait = (eyes) => {
    const r = new Raster(PW, PH);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const e = Math.min(x, y, PW - 1 - x, PH - 1 - y);
      if (e === 0) { r.set(x, y, OLc); continue; }
      if (e < 4) { r.set(x, y, pick(GOLD, (e === 1 ? 0.9 : e === 3 ? 0.25 : 0.6) - y * 0.004 + (noise2(x, y, 31) - 0.5) * 0.25, x, y)); continue; }
      const fx = (x - PW / 2) / (PW / 2 - 4), fy = (y - 4) / (PH - 8);
      const hood = Math.hypot(fx * 1.6, (fy - 0.32) * 2.2) < 0.62, body = fy > 0.45 && Math.abs(fx) < 0.25 + (fy - 0.45) * 1.4;
      const face = Math.hypot(fx * 2.4, (fy - 0.36) * 3.2) < 0.55;
      if (face) r.set(x, y, hex('#05030A'));
      else if (hood || body) r.set(x, y, pick(ROBE, 0.75 - fy * 0.5 - Math.abs(fx) * 0.3, x, y));
      else r.set(x, y, pick(ramp(['#0C0A14', '#16121F', '#201A2C']), 0.6 - fy * 0.4, x, y));
    }
    const eyeY = 4 + Math.round((PH - 8) * 0.36), eL = Math.round(PW / 2) - 3, eR = Math.round(PW / 2) + 2;
    const ec = eyes ? hex('#E8E0FF') : hex('#2A1F4A');
    r.set(eL, eyeY, ec); r.set(eR, eyeY, ec);
    if (eyes) for (const [ex, ey] of [[eL - 1, eyeY], [eL + 1, eyeY], [eR - 1, eyeY], [eR + 1, eyeY]]) r.set(ex, ey, hex('#7A6AB0'));
    return r;
  };
  const still = portrait(false), awake = portrait(true);
  const painting = frames(4, pX - 3, pY - 2, PW + 6, PH + 4, (ctx, f) => {
    const src = f > 0 ? awake : still, lean = f === 1 ? -3 : f === 2 ? 3 : 0;
    const cvs = src.flush();
    for (let y = 0; y < PH; y++) {
      const dx = Math.round((lean * (y - PH / 2)) / (PH / 2));
      ctx.drawImage(cvs, 0, y, PW, 1, pX + dx, pY + y, PW, 1);
    }
    if (f === 0) { R(ctx, pX + PW / 2 - 1, pY - 2, 2, 2, OL); }          // the nail it hangs from
  });

  // ── broken pews along the floor
  const WOOD = ramp(['#1C130F', '#2E2018', '#45301F', '#5E4429', '#7A5A36']);
  const pews = new Raster(viewW, 20);
  const pewAt = (x0, w, broken, tilt) => {
    for (let x = x0; x < x0 + w; x++) {
      if (broken && x > x0 + w * 0.45 && x < x0 + w * 0.62) continue;
      const lift = tilt ? Math.round(((x - x0) / w) * tilt) : 0;
      for (let y = 4 + lift; y < 11 + lift; y++) pews.set(x, y, pick(WOOD, 0.7 - (y - lift) * 0.06 + (noise1(x * 0.3, 9) - 0.5) * 0.2, x, y));
      for (let y = 11 + lift; y < 13 + lift; y++) pews.set(x, y, WOOD[0]);
    }
    for (const px of [x0, x0 + w - 3]) for (let y = 2; y < 20; y++) for (let k = 0; k < 3; k++) pews.set(px + k, y, WOOD[k === 0 ? 3 : 1]);
  };
  const PEW_W = 46, gap = 18;
  for (let x = 6, i = 0; x + PEW_W < viewW - 4; x += PEW_W + gap, i++) pewAt(x, PEW_W, i % 3 === 1, i % 4 === 2 ? 4 : 0);
  pews.outline(OLc);
  const pewCv = pews.flush();

  // ── the floor: worn flagstones, cracked, dusty
  const floor = new Raster(viewW, H - FLOOR);
  for (let y = 0; y < H - FLOOR; y++) {
    const row = Math.floor((y - 3) / 10), ly = (y - 3) % 10, off = row & 1 ? 16 : 0;
    for (let x = 0; x < viewW; x++) {
      let c;
      if (y < 3) c = ST[[7, 5, 2][y]];
      else if (ly === 0 || (x + off) % 32 === 0) c = ST[1];
      else c = pick(ST, 0.36 - y * 0.006 + (noise2(x * 0.15, y * 0.3, 13) - 0.5) * 0.14, x, y);
      floor.set(x, y, c);
    }
  }
  for (let k = 0; k < 40; k++) floor.set(Math.floor(hash(k, 0, 33) * viewW), 3 + Math.floor(hash(k, 1, 33) * 30), ST[6]);
  const floorCv = floor.flush();

  // ── the picture, back to front
  S.layer({ far: true });
  S.image(wallCv);
  S.image(roseCv, cx - RR - 3, RY - RR - 3);
  S.layer();
  S.image(glowCv).setAlpha(0.6);
  const paintImg = S.image(painting);
  cXs.forEach((x0, j) => S.image(cdlCvs[j], x0, cY));
  const fl = S.pool(flame);
  const shaftImg = S.image(shaftCv).setAlpha(0.32);
  const dust = S.pool(motes);
  S.image(pewCv, 0, FLOOR - 20);
  S.image(floorCv, 0, FLOOR);

  return {
    update(a) {
      const t = a.t;

      // The painting: still most of the time; now and then a fit — it leans
      // one way and the other, its eyes open, then it settles.
      const cyc = Math.floor(t / FIT_EVERY), into = t % FIT_EVERY;
      const fit = hash(cyc, 0, 41) < 0.66 && into < FIT_LEN;
      paintImg.show(fit ? (into < FIT_LEN - 8 ? 1 + ((into >> 2) & 1) : 3) : 0);
      paintImg.setPosition(pX - 3 + (fit && into < FIT_LEN - 8 ? (((into >> 1) & 1) ? 1 : 0) : 0), pY - 2);

      fl.begin();
      cXs.forEach((x0, j) => LITS[j].forEach((k) => {
        const [ux, uy] = cups[k];
        fl.put(x0 + ux - 1 + 1, cY + uy - LENS[k] - 2, `f${Math.floor(hash(k + j * 7, t >> 3, 42) * 3)}`);
      }));
      fl.end();

      // the light breathes a little, and the dust drifts down through it
      shaftImg.setAlpha(0.27 + 0.06 * Math.sin(t / 97));
      dust.begin();
      for (let k = 0; k < 36; k++) {
        const [ox, slope] = shaftOf[k % 3];
        const life = 600 + Math.floor(hash(k, 0, 43) * 400), p = ((t + hash(k, 1, 43) * life) % life) / life;
        const y = RY + 16 + p * (FLOOR - RY - 20);
        const x = cx + ox + (y - RY - 12) * slope + (hash(k, 2, 43) - 0.5) * 8 + Math.sin(t / 60 + k) * 1.5;
        dust.put(x, y, k % 4 ? '#9A8CC0' : '#E8E0FF', 0.7);
      }
      dust.end();
    },
  };
}

/** A small flame, 3 wide, from rows of keys: 1 tip, 2 body, 3 base. */
function flameCv(rows) {
  const r = new Raster(3, rows.length), pal = { 1: hex('#FFF0B0'), 2: hex('#FFB040'), 3: hex('#C85A1E') };
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) r.set(x, y, pal[ch]); }));
  return r.flush();
}
