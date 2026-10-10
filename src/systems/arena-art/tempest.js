/**
 * TEMPEST MAN — water. A storm: cloud banks driven by the wind, lightning, three
 * depths of rain, corner pipes pouring into knee-deep water, and the central
 * drain with its spike ball.
 *
 * Drawn by Claude at the owner's request, 4 Oct 2026 (Claude Design, "Boss
 * Arenas 16-bit v2", room 2c), and approved by the owner the same day.
 *
 * That pass added the distant sheets of rain under the far clouds, the mist on
 * the water, the lightning lighting up the water's surface, and spike balls
 * that roll at about an eighth of their old speed.
 */
import {
  H, TAU, OLc, hex, ramp, bayer, hash, rng, noise2, canvas, pick, Raster, hdma,
  R, dot, walk, flipX, frames, pieces,
} from './pixels.js';

const CASCADE_FRAMES = 32;   // the pouring water repeats exactly every 32 steps
const SURF_FRAMES = 157;     // the surface and its glints: one per two steps of 314
const BOLTS = 8;             // lightning shapes, taken in turn

export default function tempest(S, a, viewW) {
  const FLOOR = a.floorY;

  // ── the sky and three banks of cloud, each with a lit twin for lightning
  const skyRows = hdma(FLOOR, [[0, '#04060C'], [0.35, '#0A1020'], [0.7, '#111C32'], [1, '#172642']]);
  const sky = new Raster(viewW, FLOOR);
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < viewW; x++) sky.set(x, y, skyRows[y]);
  const W = viewW + 128;
  function band(y0, y1, rmin, rmax, count, seed, rn, rl, hang) {
    const r = rng(seed), cs = [];
    for (let i = 0; i < count; i++) {
      const rad = rmin + r() * (rmax - rmin), cx = ((i + r() * 0.8) / count) * W;
      const cy = hang ? y0 + r() * (y1 - y0) : y1 - rad * 0.75 - r() * Math.max(0, y1 - y0 - rad * 1.6);
      cs.push({ cx, cy, rad });
    }
    const n = new Raster(W, FLOOR), l = new Raster(W, FLOOR);
    const ya = hang ? 0 : Math.max(0, Math.floor(Math.min(...cs.map((c) => c.cy - c.rad)) - 1));
    const yb = Math.min(FLOOR, Math.ceil(Math.max(...cs.map((c) => c.cy + c.rad)) + 1));
    for (let y = ya; y < yb; y++) for (let x = 0; x < W; x++) {
      let best = -1e9, bdy = 0, bdx = 0, brad = 1;
      for (const c of cs) {
        let dx = x + 0.5 - c.cx;
        if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
        const dy = y + 0.5 - c.cy, d = c.rad - Math.hypot(dx, dy);
        if (d > best) { best = d; bdx = dx; bdy = dy; brad = c.rad; }
      }
      if (hang && y < 6) best = Math.max(best, 3);
      if (best < 0 || (best < 1.3 && hash(x, y, seed) > 0.5)) continue;
      let v = hang ? 0.4 + (bdy / brad) * 0.25 + (best < 1.5 ? 0.12 : 0) : 0.46 - (bdy / brad) * 0.36 - (bdx / brad) * 0.06 + (best < 1.6 ? 0.2 : 0);
      v += (noise2(x * 0.09, y * 0.09, seed) - 0.5) * 0.18;
      n.set(x, y, pick(rn, v, x, y)); l.set(x, y, pick(rl, v + 0.08, x, y));
    }
    return { n: n.flush(), l: l.flush(), ya, yb };
  }
  const farB = band(64, 138, 8, 18, 22, 5, ramp(['#0C1424', '#101A2E', '#152238', '#1B2A45']), ramp(['#22355A', '#2E4675', '#3C5A92', '#4E70AE']), false);
  const midB = band(26, 106, 12, 26, 16, 9, ramp(['#0A101E', '#101A2C', '#172440', '#203050', '#2B3F64']), ramp(['#2A3E66', '#3A5586', '#4E6EA8', '#6A8CC8', '#8EAEE2']), false);
  const topB = band(0, 22, 10, 22, 18, 13, ramp(['#04070E', '#080D18', '#0D1424', '#131C30']), ramp(['#1A2742', '#243559', '#304672', '#3E5A8E']), true);

  // ── far-off sheets of rain hanging under the clouds, one per wind lean
  const LEANS = [-1, -0.5, 0, 0.5, 1];
  const SHEETS = LEANS.map((lean) => {
    const hh = 64, ww = 22 + Math.ceil(Math.abs(lean) * hh * 0.6), r = new Raster(ww, hh), c = hex('#1E2E4C');
    for (let y = 0; y < hh; y++) {
      const off = Math.round((lean < 0 ? ww - 22 : 0) + lean * y * 0.6), fade = y < 8 ? y / 8 : y > hh - 16 ? (hh - y) / 16 : 1;
      for (let i = 0; i < 22; i++) if (bayer(i + off, y) < 0.32 * Math.sin(((i + 0.5) / 22) * Math.PI) * fade) r.set(off + i, y, c);
    }
    return r.flush();
  });
  const sheets = frames(SHEETS.length, 0, 0, Math.max(...SHEETS.map((c) => c.width)), 64, (ctx, k) => ctx.drawImage(SHEETS[k], 0, 0));

  const mist = new Raster(W, 9), mc = hex('#8EAEE2');
  for (let y = 0; y < 9; y++) for (let x = 0; x < W; x++) {
    const v = Math.sin((y / 8) * Math.PI) * (0.5 + 0.3 * Math.sin((x * TAU * 3) / W) + 0.2 * Math.sin((x * TAU * 7) / W + 1));
    if (bayer(x, y) < v * 0.45) mist.set(x, y, mc);
  }

  // ── lightning: a few shapes, drawn where the game says it struck
  function makeBolt(seed, x0) {
    const rn = rng(seed), pts = [];
    let x = x0, y = 14;
    while (y < 124) { pts.push([Math.round(x), Math.round(y)]); y += 3 + rn() * 4; x += (rn() - 0.5) * 7; }
    const branches = [];
    for (let b = 0; b < 2; b++) {
      const i = 3 + ((rn() * Math.max(1, pts.length - 6)) | 0);
      let [px, py] = pts[Math.min(i, pts.length - 1)];
      const dir = rn() < 0.5 ? -1 : 1, bp = [[px, py]];
      for (let k = 0; k < 4 + ((rn() * 3) | 0); k++) { px += dir * (2 + rn() * 4); py += 2 + rn() * 4; bp.push([Math.round(px), Math.round(py)]); }
      branches.push(bp);
    }
    return { pts, branches };
  }
  function drawBolt(ctx, b) {
    for (let i = 0; i < b.pts.length - 1; i++) walk(b.pts[i][0], b.pts[i][1], b.pts[i + 1][0], b.pts[i + 1][1], (x, y) => { if (bayer(x, y) < 0.7) { dot(ctx, x - 1, y, '#5A7CC0'); dot(ctx, x + 1, y, '#5A7CC0'); } });
    for (const br of b.branches) for (let i = 0; i < br.length - 1; i++) walk(br[i][0], br[i][1], br[i + 1][0], br[i + 1][1], (x, y) => dot(ctx, x, y, '#9EC2FF'));
    for (let i = 0; i < b.pts.length - 1; i++) walk(b.pts[i][0], b.pts[i][1], b.pts[i + 1][0], b.pts[i + 1][1], (x, y) => dot(ctx, x, y, '#FFFFFF'));
  }
  // The hazard strikes at a quarter, a half or three quarters of the room.
  const AT = [0.25, 0.5, 0.75], X0 = AT.map((f) => Math.round(viewW * f));
  const shapes = X0.map((x0) => Array.from({ length: BOLTS }, (_, s) => makeBolt(s + 1, x0)));
  let reach = 0, low = 0;
  shapes.forEach((g, xi) => g.forEach((b) => [...b.pts, ...b.branches.flat()].forEach(([x, y]) => {
    reach = Math.max(reach, Math.abs(x - X0[xi])); low = Math.max(low, y);
  })));
  const BW = 2 * reach + 6, BTOP = 12, BH = low - BTOP + 3;
  const bolts = frames(X0.length * BOLTS, 0, BTOP, BW, BH, (ctx, f) => {
    const xi = Math.floor(f / BOLTS);
    ctx.translate(BW / 2 - X0[xi], 0);
    drawBolt(ctx, shapes[xi][f % BOLTS]);
  });

  // ── the corner pipes, and the water pouring out of them
  const ST = ramp(['#1A1F26', '#262D36', '#323B46', '#4A5460', '#66727E', '#8A96A2', '#B8C2CC', '#DCE3EA']);
  const YE = ramp(['#5A4006', '#8A6408', '#C8960E', '#F5C518', '#FFE27A']);
  const cyl = [null, 5, 7, 6, 5, 4, 3, 2, 1, null], col14 = [null, 5, 7, 6, 6, 5, 5, 4, 4, 3, 2, 2, 1, null], toY = [0, 0, 1, 1, 2, 3, 4, 4];
  const pr = new Raster(20, 20);
  for (let y = 1; y <= 18; y++) for (let x = 0; x <= 3; x++) pr.set(x, y, y === 1 || y === 18 || x === 3 ? OLc : x === 0 ? ST[6] : x === 1 ? ST[4] : ST[2]);
  for (const by of [3, 15]) { pr.set(1, by, ST[7]); pr.set(1, by + 1, ST[1]); }
  for (let y = 5; y <= 14; y++) for (let x = 4; x <= 14; x++) {
    const k = cyl[y - 5];
    pr.set(x, y, k === null ? OLc : x >= 9 && x <= 11 ? YE[toY[k]] : ST[k]);
  }
  for (let y = 3; y <= 16; y++) for (let x = 15; x <= 18; x++) {
    const k = col14[y - 3];
    pr.set(x, y, k === null || x === 18 ? OLc : ST[Math.max(0, k - (x === 17 ? 1 : 0))]);
  }
  const pipeL = pr.flush(), pipeR = flipX(pipeL);
  const WC = ['#3E88C0', '#5CADD5', '#9AD8F0', '#5CADD5'];
  function cascade(ctx, pipe, t, surf) {
    const dir = pipe.dir, ox = dir > 0 ? 19 : viewW - 20;
    let last = ox;
    ctx.globalAlpha = 0.85;
    for (let y = 18; y < surf; y++) {
      const c = ox + dir * 0.6 * Math.sqrt((2 * Math.max(0, y - 19)) / 0.25), hw = y < 25 ? 3 : 2;
      const x0 = Math.round(c - hw), x1 = Math.round(c + hw);
      ctx.fillStyle = WC[((y - Math.floor(t * 3)) >> 2) & 3];
      ctx.fillRect(x0 + 1, y, x1 - x0 - 1, 1);
      ctx.fillStyle = '#CFEFFF';
      if (bayer(x0, y + t) < 0.6) ctx.fillRect(x0, y, 1, 1);
      if (bayer(x1, y + t) < 0.6) ctx.fillRect(x1, y, 1, 1);
      last = c;
    }
    ctx.globalAlpha = 1;
    for (let k = 0; k < 7; k++) {
      const ph = (t * 0.5 + k * 9) % 16;
      dot(ctx, last + (k - 3) * 1.5 + (k % 2 ? 1 : -1) * ph * 0.4, surf - 1 - ph * (16 - ph) * 0.04, k % 3 ? '#CFEFFF' : '#FFFFFF');
    }
    R(ctx, last - 5, surf - 3, 10, 3, '#CFEFFF', 0.22);
  }
  const top0 = a.floorY - a.liquid.h;
  const pours = a.pipes.map((pipe) => {
    const ox = pipe.dir > 0 ? 19 : viewW - 20, x0 = pipe.dir > 0 ? ox - 8 : ox - 32;
    return frames(CASCADE_FRAMES, x0, 17, 41, Math.ceil(top0) - 17 + 2, (ctx, t) => cascade(ctx, pipe, t, top0));
  });

  // ── the floor, the drain and its grate (eight frames of the water running in)
  const CON = ramp(['#070A10', '#0A0F16', '#0F1520', '#141C28', '#1A2432', '#22303F', '#2E3F52', '#3A5068']);
  const fl = new Raster(viewW, H - FLOOR);
  for (let y = 0; y < H - FLOOR; y++) for (let x = 0; x < viewW; x++) {
    let c;
    if (y === 0) c = CON[7]; else if (y === 1) c = CON[5]; else if (y === 2) c = CON[4];
    else {
      const sx = x % 32;
      let v = 0.42 - (y / 40) * 0.3 + (noise2(x * 0.12, y * 0.2, 4) - 0.5) * 0.1;
      const rl = Math.min(Math.abs(x - 30), Math.abs(x - (viewW - 31)));
      if (rl < 3 && y < 16) v += 0.14 * (1 - y / 16);
      c = sx === 0 || y === 20 ? CON[0] : sx === 1 || y === 21 ? pick(CON, v + 0.1, x, y) : pick(CON, v, x, y);
    }
    fl.set(x, y, c);
  }
  const d = a.drain;
  const drain = frames(8, d.x - 1, d.y - 1, d.w + 2, H - d.y + 1, (ctx, t) => {
    R(ctx, d.x, d.y, d.w, H - d.y, '#03070E');
    R(ctx, d.x, d.y, 1, H - d.y, '#1A2A3E'); R(ctx, d.x + d.w - 1, d.y, 1, H - d.y, '#0A1420');
    for (let i = 3; i < d.w - 3; i += 4) for (let y = d.y + 4; y < H; y++) {
      const k = ((y - Math.floor(t * 2) + i * 3) >> 2) & 3;
      if (k === 0) dot(ctx, d.x + i, y, '#1E4A78'); else if (k === 1) dot(ctx, d.x + i, y, '#14365A');
    }
    R(ctx, d.x - 1, d.y, 1, 3, '#5A6E88'); R(ctx, d.x + d.w, d.y, 1, 3, '#2A384A');
    const G = d.grateHurts ? ['#F0A0A8', '#C05060', '#8A3040', '#4A1420'] : ['#9ABCE0', '#5A86B4', '#2A4A70', '#16283E'];
    for (let i = 2; i < d.w; i += 5) {
      R(ctx, d.x + i, d.y, 2, 1, G[0]); R(ctx, d.x + i, d.y + 1, 2, 1, G[1]); R(ctx, d.x + i, d.y + 2, 2, 1, G[2]);
      if (d.grateHurts) dot(ctx, d.x + i + (i & 1), d.y - 1, G[0]);
    }
    R(ctx, d.x, d.y + 3, d.w, 1, G[3]);
  });

  // ── spike balls: the big one on the grate, and four turns of the small one
  const BALL = ramp(['#2A3038', '#3C434E', '#5E6772', '#8A949F', '#BCC4CE', '#E8EDF2']);
  function spiky(r, rot) {
    const s = Math.ceil(r * 2 + 10), c = s / 2, rs = new Raster(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, dd = Math.hypot(dx, dy);
      const lit = -(dx * 0.55 + dy * 0.83) / (dd || 1);
      if (dd <= r) {
        const spec = Math.hypot(dx + r * 0.38, dy + r * 0.42) < r * 0.28;
        rs.set(x, y, spec ? BALL[5] : pick(BALL, 0.45 + lit * 0.38 * (dd / r), x, y));
        continue;
      }
      const an = Math.atan2(dy, dx) - rot, k = Math.round((an * 8) / TAU), da = an - (k * TAU) / 8;
      const lat = Math.abs(dd * Math.sin(da)), along = dd * Math.cos(da);
      if (along > r - 1 && along < r + 3.5 && lat < 1.7 * (1 - (along - r + 1) / 4.6)) rs.set(x, y, lit > 0 ? BALL[4] : BALL[2]);
    }
    rs.outline(OLc);
    return rs.flush();
  }
  const bigBall = spiky(6, 0), smallBalls = [0, 1, 2, 3].map((k) => spiky(4.5, (k * Math.PI) / 16));
  // ── a barrel
  const WOOD = ramp(['#2E2018', '#3E2A1E', '#4A3224', '#5C4033', '#74523A', '#8A6244', '#B08058']);
  const HOOP = ramp(['#1A1C20', '#26282E', '#3A3E46', '#4A4E58', '#7A808C']);
  const br = new Raster(16, 14), tone = [5, 6, 5, 4, 4, 3, 3, 3, 2, 2, 1, 1];
  for (let y = 0; y < 12; y++) {
    const inset = y === 0 || y === 11 ? 2 : y === 1 || y === 10 ? 1 : 0;
    for (let x = inset; x < 14 - inset; x++) {
      let k = tone[y];
      if (y === 3 || y === 6 || y === 9) k = Math.max(0, k - 1);
      if (x === inset || x === 13 - inset) k = Math.max(0, k - 2);
      const hoop = x === 2 || x === 3 || x === 10 || x === 11;
      br.set(x + 1, y + 1, hoop ? HOOP[Math.min(4, Math.max(0, k - 1))] : WOOD[k]);
    }
  }
  br.outline(OLc);
  const barrelCv = br.flush();

  // ── the water's surface. Its line and glints repeat every 314 steps, the
  // two dashed currents below it every 80 and (near enough) 49. The darker
  // line under the surface is the same picture a pixel lower, recoloured, and
  // lightning turns the whole surface pale the same way — so neither needs
  // pictures of its own.
  const cxm = viewW / 2;
  const surf = frames(SURF_FRAMES, 0, 0, viewW, 5, (ctx, k) => {
    const t = k * 2;
    for (let x = 0; x < viewW; x++) {
      const ad = Math.abs(x + 0.5 - cxm);
      let sy = 1 + Math.round(Math.sin(ad * 0.3 + t * 0.14) * 0.9);
      if (ad < 16) sy += Math.round((1 - ad / 16) * 2);
      dot(ctx, x, sy, Math.sin(ad * 0.55 + t * 0.22) > 0.82 ? '#CFEFFF' : '#5CADD5');
    }
  });
  const dash4 = frames(80, 0, 0, viewW, 1, (ctx, t) => {
    for (let x = 0; x < viewW; x++) if ((Math.abs(x + 0.5 - cxm) + t * 0.6) % 16 < 4) dot(ctx, x, 0, '#3E88C0');
  });
  const dash7 = frames(49, 0, 0, viewW, 1, (ctx, t) => {
    for (let x = 0; x < viewW; x++) if ((Math.abs(x + 0.5 - cxm) + t * 0.45 + 7) % 22 < 3) dot(ctx, x, 0, '#2E7AB8');
  });

  // ── the small moving things: raindrops at three depths (cut short where
  // they reach the water), wind lines, sparkles, foam, spray, splashes
  const RAIN = [
    { n: 44, len: 3, sp: 2.6, col: '#2A4868', sl: 0.6, seed: 11 },
    { n: 34, len: 5, sp: 3.6, col: '#5A8AB4', sl: 0.75, seed: 23 },
    { n: 24, len: 8, sp: 4.8, col: '#9AD8F0', sl: 0.85, seed: 37 },
  ];
  const drop = (L, dx, k, col) => {
    const cv = canvas(Math.abs(dx) + 1, L + 1), c = cv.getContext('2d'), o = dx < 0 ? -dx : 0;
    let j = 0;
    walk(0, 0, dx, L, (x, y) => { if (j++ < k) dot(c, x + o, y, col); });
    return [`rain${L}:${dx}:${k}`, cv];
  };
  const list = [];
  for (const L of RAIN) {
    L.names = [];
    for (let dx = -4; dx <= 4; dx++) {
      L.names[dx + 4] = [];
      for (let k = 1; k <= L.len + 1; k++) { const e = drop(L.len, dx, k, L.col); list.push(e); L.names[dx + 4][k] = e[0]; }
    }
  }
  for (let len = 6; len <= 13; len++) for (const sg of [-1, 1]) for (const col of ['#2E4C70', '#4A7098']) {
    const cv = canvas(len + 1, Math.round(len * 0.25) + 1), c = cv.getContext('2d'), o = sg < 0 ? len : 0;
    walk(0, 0, sg * len, Math.round(len * 0.25), (x, y, i) => { if (!(i & 1)) dot(c, x + o, y, col); });
    list.push([`wind${len}:${sg}:${col}`, cv]);
  }
  const rect = (name, w, h, col, mid) => {
    const cv = canvas(w, h), c = cv.getContext('2d'); c.fillStyle = col; c.fillRect(0, 0, w, h);
    if (mid) { c.fillStyle = mid; c.fillRect(1, 0, 1, 1); }
    return [name, cv];
  };
  list.push(rect('foamA', 2, 1, '#9AD8F0'), rect('foamB', 2, 1, '#CFEFFF'), rect('glint', 3, 1, '#9EC2FF', '#FFFFFF'),
    rect('popB', 2, 1, '#8A6244'), rect('popB2', 2, 1, '#B08058'));
  list.push(...['#5CADD5', '#9AD8F0', '#CFEFFF', '#FFFFFF', '#3E88C0', '#2E7AB8', '#BCC4CE']);
  list.push(['barrel', barrelCv], ...smallBalls.map((c, k) => [`ball${k}`, c]));
  const bits = pieces(list);

  // ── the picture, back to front
  S.layer({ far: true });
  S.image(sky.flush());
  const bandTile = (b, cv) => S.tile(cv, 0, b.ya, viewW, b.yb - b.ya).setTilePosition(0, b.ya);
  const farN = bandTile(farB, farB.n), farL = bandTile(farB, farB.l);
  const sheetImgs = [0, 1, 2, 3].map(() => S.image(sheets, 0, 92));
  const boltImg = S.image(bolts);
  const midN = bandTile(midB, midB.n), midL = bandTile(midB, midB.l);
  const topN = bandTile(topB, topB.n), topL = bandTile(topB, topB.l);

  S.layer({ furn: true });
  const rain0 = S.pool(bits);
  S.image(pipeL, 0, a.pipes[0].y - 5);
  S.image(pipeR, viewW - 20, a.pipes[1].y - 5);
  const pourImgs = pours.map((p) => S.image(p));
  const drips = S.pool(bits);

  S.layer();
  S.image(fl.flush(), 0, FLOOR);

  S.layer({ furn: true });
  const drainImg = S.image(drain);
  const ballImg = S.image(bigBall);
  const wind = S.pool(bits);
  const rain1 = S.pool(bits);
  const body = S.rect(0, 0, viewW, 1, 0x1E62A2, 0.5);
  const bed = S.rect(0, 0, viewW, 3, 0x0E3A68, 0.35);
  const glints = S.pool(bits);
  const under = S.image(surf).setTintFill(0x2E7AB8), surfImg = S.image(surf), d4 = S.image(dash4), d7 = S.image(dash7);
  const ripples = S.pool(bits);
  const mistTile = S.tile(mist.flush(), 0, 0, viewW, 9).setAlpha(0.5);
  const spray = S.pool(bits);

  S.layer();
  const things = S.pool(bits);

  S.layer({ furn: true });
  const rain2 = S.pool(bits);

  // What only the picture keeps: cloud drift, the current bolt, splashes and pops.
  let oF = 0, oM = 0, oT = 0, lastT = a.t, lastFlash = 0, strikes = 0, bodyTop = null;
  const splashes = [], pops = [];
  let afloat = new Map(), was = new Map();

  function rain(pool, L, a, top) {
    const rx = a.rainDir || 0, span = viewW + 80, Hh = a.floorY + 24;
    for (let i = 0; i < L.n; i++) {
      const fall = (a.t * L.sp + hash(i, 1, L.seed) * Hh * 7) % Hh;
      const x0 = hash(i, 0, L.seed) * span - 40 + rx * fall * L.sl, y0 = fall - 20;
      const dx = Math.round(x0 + rx * L.len * 0.8) - Math.round(x0);
      // Cut short where it reaches the water, as the design's drops are.
      const k = Math.min(L.len + 1, Math.ceil(top) - Math.round(y0));
      if (k <= 0) continue;
      pool.put(dx < 0 ? x0 + dx : x0, y0, L.names[Math.max(-4, Math.min(4, dx)) + 4][k]);
    }
  }

  return {
    hazards: ['barrel', 'spikeball'],

    update(a) {
      const t = a.t, q = a.liquid, wind0 = a.rainDir || 0, top = a.floorY - q.h;
      const dt = Math.max(0, Math.min(8, t - lastT)); lastT = t;
      oF = (oF + dt * (0.03 + 0.05 * wind0) + W) % W; oM = (oM + dt * (0.07 + 0.12 * wind0) + W) % W; oT = (oT + dt * (0.12 + 0.2 * wind0) + W) % W;
      const lit = a.flash > 0 ? (a.flash / a.flashN > 0.66 ? 1 : a.flash / a.flashN > 0.33 ? 0.66 : 0.33) : 0;
      if (a.flash > lastFlash) strikes++;
      lastFlash = a.flash;

      for (const [n, l, o] of [[farN, farL, oF], [midN, midL, oM], [topN, topL, oT]]) {
        n.tilePositionX = Math.floor(o);
        l.tilePositionX = Math.floor(o);
        l.setVisible(lit > 0).setAlpha(lit);
      }
      const sv = Math.max(0, Math.min(4, Math.round((wind0 + 1) * 2)));
      sheetImgs.forEach((im, k) => im.setPosition(Math.round(((((k + 0.3) / 4) * W - oF) % W + W) % W - 40), 92).show(sv));
      const struck = a.flash > 0 && (a.flash >> 1) % 3 !== 2;
      const xi = Math.max(0, Math.min(2, Math.round(((a.boltX ?? 0.5) - 0.25) / 0.25))), si = strikes % BOLTS;
      boltImg.setVisible(struck).show(xi * BOLTS + si).setPosition(X0[xi] - BW / 2, BTOP);

      rain0.begin(); rain(rain0, RAIN[0], a, top); rain0.end();
      pourImgs.forEach((im) => im.show(t % CASCADE_FRAMES));
      drips.begin();
      for (let k = 0; k < 4; k++) {
        const dx = k & 1 ? viewW - 1 - (6 + (k >> 1) * 5) : 6 + (k >> 1) * 5, p = (t + k * 23) % 80;
        if (p < 34) { drips.put(dx, 26, '#5CADD5'); if (p > 18) drips.put(dx, 27, '#9AD8F0'); }
        else { const y = 27 + 0.07 * (p - 34) * (p - 34); if (y < top - 1) drips.put(dx, y, '#9AD8F0'); }
      }
      drips.end();

      drainImg.show(t % 8);
      const by = d.ball.y + Math.sin(d.ball.bob) * 1.5;
      ballImg.setPosition(Math.round(d.ball.x - bigBall.width / 2), Math.round(by - bigBall.height / 2));

      // Wind lines, only while the rain leans, pointing the way it pushes.
      wind.begin();
      const wa = Math.abs(wind0);
      if (wa > 0.15) {
        const sg = Math.sign(wind0), n = Math.round(14 * wa), span = viewW + 60;
        for (let k = 0; k < n; k++) {
          const len = 6 + ((hash(k, 3, 57) * 8) | 0), x0 = (((hash(k, 0, 57) * span + t * 5.5 * wind0) % span) + span) % span - 30;
          const y0 = Math.round(12 + hash(k, 1, 57) * 150);
          wind.put(sg < 0 ? x0 - len : x0, y0, `wind${len}:${sg}:${k % 3 ? '#2E4C70' : '#4A7098'}`);
        }
      }
      wind.end();
      rain1.begin(); rain(rain1, RAIN[1], a, top); rain1.end();

      if (bodyTop !== top) {
        bodyTop = top;
        body.setPosition(0, Math.round(top + 1)).setSize(viewW, Math.max(0, Math.round(a.floorY + 1 - (top + 1))));
        bed.setPosition(0, a.floorY - 1);
      }

      // The strike, reflected and broken up by the ripples.
      glints.begin();
      if (struck) {
        const pts = shapes[xi][si].pts, dep = a.floorY - top;
        for (let y = Math.ceil(top) + 2; y < a.floorY; y += 2) {
          const pt = pts[Math.min(pts.length - 1, Math.floor(((y - top) / dep) * pts.length * 0.6))];
          glints.put(pt[0] + Math.round(Math.sin(y * 1.7 + t * 0.5) * 1.5) - 1, y, 'glint');
        }
      }
      glints.end();

      const ty = Math.round(top);
      const sf = (t >> 1) % SURF_FRAMES;
      under.setPosition(0, ty).show(sf);
      surfImg.setPosition(0, ty - 1).show(sf);
      if (lit > 0.5) surfImg.setTintFill(0xCFEFFF); else surfImg.clearTint();
      d4.setPosition(0, ty + 4).show(t % 80);
      d7.setPosition(0, ty + 7).show(t % 49);

      ripples.begin();
      // Rain rings on the surface.
      for (let k = 0; k < 10; k++) {
        const cyc = t + k * 7, age = cyc % 24;
        if (age > 18) continue;
        const rx0 = hash(k, (cyc / 24) | 0, 73) * viewW, r = age * 0.4, col = age < 8 ? '#5CADD5' : '#3E88C0';
        ripples.put(rx0 - r, top + 2, col); ripples.put(rx0 + r, top + 2, col);
        if (age > 3) { ripples.put(rx0 - r * 0.6, top + 3, '#2E7AB8'); ripples.put(rx0 + r * 0.6, top + 3, '#2E7AB8'); }
      }
      // Foam riding the current into the drain.
      const run = cxm - 14;
      for (let k = 0; k < 12; k++) {
        const pos = (t * 0.35 + hash(k, 0, 77) * run) % run, fx = k & 1 ? viewW - 1 - pos : pos;
        ripples.put(fx, top + 1 + (k % 3), k % 4 ? 'foamA' : 'foamB');
      }
      for (let k = 0; k < 3; k++) { const an = t * 0.12 + (k * TAU) / 3; ripples.put(cxm + Math.cos(an) * 9, top + 3 + Math.sin(an) * 1.5, '#CFEFFF'); }
      ripples.end();
      mistTile.setPosition(0, Math.round(top - 8));
      mistTile.tilePositionX = Math.floor((oT * 1.6) % W);

      // Splashes where a floater meets the water, and pops where it breaks.
      const steps = dt;
      const now = new Map();
      for (const h of a.hazards) {
        if (h.kind !== 'barrel' && h.kind !== 'spikeball') continue;
        const riding = h.y + h.h >= top - 1;
        now.set(h, riding);
        if (riding && afloat.get(h) === false) splashes.push({ x: h.x + h.w / 2, t: 0 });
      }
      for (const [h] of was) {
        if (now.has(h)) continue;
        const hx = h.x + h.w / 2, hy = h.y + h.h / 2;
        for (let k = 0; k < 12; k++) pops.push({ x: hx, y: hy, vx: (Math.random() - 0.5) * 2.6, vy: -0.4 - Math.random() * 1.7, life: 16 + ((Math.random() * 10) | 0), kind: h.kind });
      }
      afloat = now; was = now;
      for (let s = 0; s < steps; s++) {
        for (let i = splashes.length - 1; i >= 0; i--) if (++splashes[i].t > 14) splashes.splice(i, 1);
        for (let i = pops.length - 1; i >= 0; i--) {
          const p = pops[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.14;
          if (--p.life <= 0) pops.splice(i, 1);
        }
      }
      spray.begin();
      for (let k = 0; k < 6; k++) {
        const cyc = t + k * 5, age = cyc % 4, sx0 = Math.round(hash(k, (cyc / 4) | 0, 71) * viewW), sy0 = top - 1;
        if (age === 0) spray.put(sx0, sy0, '#9AD8F0');
        else if (age === 1) { spray.put(sx0 - 1, sy0 - 1, '#CFEFFF'); spray.put(sx0 + 1, sy0 - 1, '#CFEFFF'); }
        else if (age === 2) { spray.put(sx0 - 2, sy0, '#9AD8F0'); spray.put(sx0 + 2, sy0, '#9AD8F0'); }
      }
      for (const s of splashes) {
        const r = 2 + s.t * 0.6, lift = s.t < 7 ? 2 : 0;
        spray.put(s.x - r, top - 1 - lift, '#CFEFFF'); spray.put(s.x + r, top - 1 - lift, '#CFEFFF');
        if (s.t < 8) { spray.put(s.x - 1, top - 3 - s.t * 0.4, '#FFFFFF'); spray.put(s.x + 1, top - 3 - s.t * 0.4, '#FFFFFF'); }
      }
      spray.end();

      things.begin();
      for (const h of a.hazards) {
        if (h.kind === 'barrel') things.put(Math.round(h.x) - 1, Math.round(h.y) - 1, 'barrel');
        else if (h.kind === 'spikeball') {
          // The ball rolls toward the drain: its turn is read off the spin the
          // hazard keeps, slowed to the design's pace and signed by its side.
          const side = h.x + h.w / 2 < cxm ? 1 : -1, s = smallBalls[0];
          const k = ((Math.floor((h.spin || 0) * (0.05 / 0.09) * 2.5 * side) % 4) + 4) % 4;
          things.put(Math.round(h.x + h.w / 2 - s.width / 2), Math.round(h.y + h.h / 2 - s.height / 2), `ball${k}`);
        }
      }
      for (const p of pops) things.put(p.x, p.y, p.kind === 'barrel' ? (p.life & 1 ? 'popB' : 'popB2') : '#BCC4CE');
      things.end();

      rain2.begin(); rain(rain2, RAIN[2], a, top); rain2.end();
    },
  };
}
