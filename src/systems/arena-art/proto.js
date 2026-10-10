/**
 * PROTO MK0 — typeless. A military weapons bunker: armory and ballistics.
 *
 * Drawn by Claude at the owner's request, 4 Oct 2026 (Claude Design, "Boss
 * Arenas 16-bit v2", room 2a), and approved by the owner the same day.
 *
 * The turrets are the only FURNITURE, exactly as the tracker's furniture line
 * has it; everything else — sandbags, racks, the firing chart, the blast door,
 * the searchlights, the alarm light — is background, and the alarm light is a
 * picture only, not a new hazard.
 */
import {
  H, OL, OLc, hex, css, ramp, bayer, hash, noise1, noise2, canvas, pick,
  Raster, R, dot, sprite, frames, pieces,
} from './pixels.js';

/** Every aim the ceiling turrets can take: layer 3 snaps to 11.25 deg, 0..180. */
const AIMS = 17;
/** The searchlight's sweep is drawn at this many angles. */
const NB = 13;
/** How far the searchlight beam reaches, in pixels. */
const BL = 200;

export default function proto(S, a, viewW) {
  const FLOOR = a.floorY;
  const S9 = ramp(['#1E2228', '#2E3338', '#414852', '#56606C', '#687380', '#7F8A97', '#98A2AE', '#B3BBC5', '#CDD3DB', '#E4E8ED']);
  const Sc = S9.map(css), n9 = S9.length - 1;
  const solid = (v) => S9[Math.max(0, Math.min(n9, Math.round(v * n9)))];

  // ── the back wall: big riveted plates, staggered
  const wall = new Raster(viewW, FLOOR);
  const PW = 60, PH = 46, Y0 = 6;
  for (let y = 0; y < FLOOR; y++) {
    const base = 0.8 - 0.34 * (y / (FLOOR - 1));
    const row = Math.floor((y - Y0) / PH), ly = y - Y0 - row * PH, off = row & 1 ? PW / 2 : 0;
    for (let x = 0; x < viewW; x++) {
      const lx = (x + off) % PW;
      let c;
      if (ly === 0 || lx === 0) c = solid(base - 0.17);
      else if (ly === 1 || lx === 1) c = solid(base + 0.07);
      else if (ly === PH - 1 || lx === PW - 1) c = solid(base - 0.07);
      else if ((lx === 4 || lx === PW - 5) && (ly === 4 || ly === PH - 5)) c = solid(base + 0.15);
      else if ((lx === 5 || lx === PW - 4) && (ly === 5 || ly === PH - 4)) c = solid(base - 0.12);
      else c = pick(S9, base + (noise1(x * 0.06, row + 5) - 0.5) * 0.04, x, y);
      wall.set(x, y, c);
    }
  }
  const wallCv = wall.flush();

  // ── the ceiling beam the turrets and the alarm light hang from
  const beam = new Raster(viewW, 7);
  const bRows = [1, 7, 6, 5, 3, 1];
  for (let y = 0; y < 6; y++) for (let x = 0; x < viewW; x++) beam.set(x, y, S9[bRows[y]]);
  for (let x = 8; x < viewW; x += 20) { beam.set(x, 2, S9[9]); beam.set(x + 1, 2, S9[8]); beam.set(x, 3, S9[7]); beam.set(x + 1, 3, S9[2]); }
  for (let x = 0; x < viewW; x++) beam.set(x, 6, S9[0], 80);
  const beamCv = beam.flush();

  // ── the floor: a lit lip, grey warning stripes, plates, spent brass
  const floor = new Raster(viewW, H - FLOOR);
  const fr = [8, 7, 5, 4, 1];
  for (let y = 0; y < H - FLOOR; y++) for (let x = 0; x < viewW; x++) {
    let c;
    if (y < 5) c = S9[fr[y]];
    else {
      const v = 0.38 - 0.2 * ((y - 5) / 34);
      const sx = x % 48, k = (x + ((y >> 2) & 1) * 3) % 6, ly = y % 4;
      if (sx === 0) c = S9[1];
      else if (sx === 1) c = solid(v + 0.1);
      else if ((sx === 5 || sx === 43) && (y === 9 || y === 30)) c = S9[6];
      else if (ly === 1 && k === 0) c = solid(v + 0.16);
      else if (ly === 2 && k === 1) c = solid(v - 0.1);
      else c = pick(S9, v, x, y);
    }
    floor.set(x, y, c);
  }
  for (let x = 0; x < viewW; x++) for (let y = 5; y < 8; y++) floor.set(x, y, ((x + y) >> 2) & 1 ? S9[1] : S9[5]);
  for (let k = 0; k < 22; k++) { const x = Math.floor(hash(k, 0, 47) * (viewW - 2)); floor.set(x, 1, hex('#E0C070')); floor.set(x + 1, 1, hex('#9A7A30')); }
  const floorCv = floor.flush();

  const tSpr = sprite([
    '00000000000000',
    '08998888888870',
    '06777777777640',
    '00000000000000',
    '...07887650...',
    '..0788766540..',
    '..0677655430..',
    '..0565544320..',
    '...04433210...',
    '....000000....',
  ], { 0: OL, 1: '#2E3338', 2: '#414852', 3: '#56606C', 4: '#687380', 5: '#7F8A97', 6: '#98A2AE', 7: '#B3BBC5', 8: '#CDD3DB', 9: '#E4E8ED' });

  // ── the set: blast door, gun rack, sandbag positions, ammo cans, shells,
  // firing chart, armour test plate, pockmarks, wall lamps
  const BP = { 0: OL, 1: '#1E2228', 2: '#2E3338', 3: '#414852', 4: '#56606C', 5: '#687380', 6: '#7F8A97', 7: '#98A2AE', 8: '#B3BBC5', 9: '#E4E8ED' };
  const bagS = sprite(['..00000000..', '.0677777760.', '065666666540', '054555555430', '.0433333320.', '..00000000..'], { 0: OL, 2: '#3E3220', 3: '#5A4A30', 4: '#7A6844', 5: '#9A8658', 6: '#B8A472', 7: '#D2C090' });
  const canS = sprite(['0000000000000000', '0666666666666660', '0444444444444440', '0000000000000000', '0555555555555550', '0559955555555550', '0555555555555550', '0444444444444440', '0333333333333330', '0000000000000000'], { 0: OL, 3: '#2C3018', 4: '#3E4424', 5: '#525A32', 6: '#6A7448', 9: '#E0C070' });
  const gunS = sprite(['.0000.', '.0890.', '.0000.', '.0760.', '.0650.', '.0650.', '.0650.', '000000', '077760', '076550', '065540', '065440', '054430', '000000'], BP);
  const setCv = canvas(viewW, FLOOR), sx = setCv.getContext('2d');
  const dX = viewW - 46, dY = 112, dW = 42, dH = FLOOR - 112;
  R(sx, dX, dY, dW, dH, OL); R(sx, dX + 1, dY + 1, dW - 2, dH - 1, Sc[2]);
  for (let x = 0; x < dW - 2; x++) for (let y = 0; y < 6; y++) dot(sx, dX + 1 + x, dY + 1 + y, ((x + y) >> 2) & 1 ? Sc[1] : Sc[7]);
  R(sx, dX + 4, dY + 8, dW - 8, dH - 8, OL);
  for (const lx of [dX + 5, dX + 21]) {
    R(sx, lx, dY + 9, 16, dH - 9, Sc[4]); R(sx, lx, dY + 9, 16, 1, Sc[6]); R(sx, lx, dY + 9, 1, dH - 9, Sc[5]); R(sx, lx + 15, dY + 9, 1, dH - 9, Sc[2]);
    for (let y = dY + 18; y < FLOOR - 4; y += 12) { R(sx, lx + 1, y, 14, 1, Sc[6]); R(sx, lx + 1, y + 1, 14, 1, Sc[2]); }
    for (let y = dY + 12; y < FLOOR - 2; y += 6) { dot(sx, lx + 2, y, Sc[7]); dot(sx, lx + 13, y, Sc[7]); }
  }
  R(sx, dX + 20, dY + 9, 2, dH - 9, OL);
  const DG = { 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'] };
  [['0', dX + 9], ['1', dX + 26]].forEach(([g, gx]) => DG[g].forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') R(sx, gx + i * 2, dY + 24 + j * 2, 2, 2, Sc[8]); })));
  const rX = Math.round(viewW * 0.5) - 40;
  for (const ux of [rX - 2, rX + 80]) R(sx, ux, 140, 2, 22, OL);
  for (let k = 0; k < 6; k++) sx.drawImage(gunS, rX + 4 + k * 13, 144);
  R(sx, rX - 2, 149, 84, 2, OL); R(sx, rX - 1, 149, 82, 1, Sc[6]);
  R(sx, rX - 2, 158, 84, 3, OL); R(sx, rX - 1, 158, 82, 1, Sc[6]); R(sx, rX - 1, 159, 82, 1, Sc[3]);
  const bagRow = (x0, x1, y, off) => { for (let x = x0 + off; x < x1; x += 11) sx.drawImage(bagS, x, y); };
  for (const [a0, a1] of [[-4, 96], [dX - 124, dX - 40]]) { bagRow(a0, a1, FLOOR - 6, 0); bagRow(a0 + 2, a1 - 4, FLOOR - 11, 5); bagRow(a0 + 6, a1 - 12, FLOOR - 16, 0); }
  for (const [cx0, cy0] of [[dX - 36, FLOOR - 10], [dX - 20, FLOOR - 10], [dX - 28, FLOOR - 20]]) sx.drawImage(canS, cx0, cy0);
  const BRASS = ramp(['#3A2A0C', '#6A4E1A', '#9A7A30', '#C8A450', '#F0D890']), COP = ramp(['#4A1E10', '#8A3E20', '#C86A3A']), TIP = S9.slice(2, 9);
  const shell = new Raster(8, 18);
  for (let y = 0; y < 16; y++) {
    const hw = y < 6 ? 0.6 + y * 0.5 : 3;
    for (let x = 0; x < 8; x++) {
      const u = (x + 0.5 - 4) / hw;
      if (Math.abs(u) > 1) continue;
      const v = 0.15 + 0.85 * Math.max(0, -0.6 * u + 0.8 * Math.sqrt(1 - u * u));
      shell.set(x, y + 1, pick(y < 7 ? TIP : y === 7 ? COP : BRASS, y === 15 ? v * 0.55 : v, x, y));
    }
  }
  shell.outline(OLc);
  const shellCv = shell.flush(), sX0 = Math.round(viewW * 0.05);
  for (const ux of [sX0, sX0 + 66]) R(sx, ux, 50, 2, 95, OL);
  for (const shY of [74, 108, 142]) {
    for (let k = 0; k < 6; k++) sx.drawImage(shellCv, sX0 + 4 + k * 10, shY - 18);
    R(sx, sX0, shY, 68, 3, OL); R(sx, sX0 + 1, shY, 66, 1, Sc[6]); R(sx, sX0 + 1, shY + 1, 66, 1, Sc[3]);
  }
  const cX0 = Math.round(viewW * 0.3), cY0 = 26, cW = Math.round(viewW * 0.38), cH = 82, ox = cX0 + 14, oy = cY0 + cH - 12;
  const ARC = [25, 45, 65].map((d) => { const r = (d * Math.PI) / 180; return { R: (cW - 34) * Math.sin(2 * r), Hh: ((cH - 26) * Math.sin(r) ** 2) / Math.sin((65 * Math.PI) / 180) ** 2 }; });
  const arcAt = (A, s) => [ox + s * A.R, oy - 4 * A.Hh * s * (1 - s)];
  R(sx, cX0, cY0, cW, cH, OL); R(sx, cX0 + 1, cY0 + 1, cW - 2, cH - 2, Sc[3]); R(sx, cX0 + 2, cY0 + 2, cW - 4, cH - 4, '#1A1E22');
  for (let y = cY0 + 6; y < cY0 + cH - 3; y += 8) for (let x = cX0 + 6; x < cX0 + cW - 3; x += 8) dot(sx, x, y, Sc[2]);
  R(sx, ox, oy, cW - 22, 1, Sc[6]); R(sx, ox, cY0 + 8, 1, oy - cY0 - 8, Sc[5]);
  for (let k = 0; k <= 6; k++) { const an = (k * Math.PI) / 12; dot(sx, ox + Math.cos(an) * 10, oy - Math.sin(an) * 10, Sc[7]); }
  ARC.forEach((A, i) => {
    for (let q = 0; q <= 90; q++) { if (q % 3 === 2) continue; const [x, y] = arcAt(A, q / 90); dot(sx, x, y, i === 1 ? '#E4E8ED' : Sc[7]); }
    const lx = Math.round(arcAt(A, 1)[0]);
    for (const [ix, iy] of [[-1, -2], [1, -2], [0, -1], [-1, 0], [1, 0]]) dot(sx, lx + ix, oy + iy, '#C8301E');
  });
  R(sx, ox - 6, oy - 3, 8, 3, Sc[6]);
  for (let k = 0; k < 7; k++) dot(sx, ox + k * 0.7, oy - 3 - k * 0.7, Sc[8]);
  if (viewW >= 400) {
    const pX0 = Math.round(viewW * 0.73), pY0 = 50, pW = 44, pH = 78;
    for (const lx of [pX0 + 8, pX0 + pW - 10]) { R(sx, lx, pY0 + pH, 3, 168 - pY0 - pH, OL); R(sx, lx + 1, pY0 + pH, 1, 168 - pY0 - pH, Sc[5]); }
    const pl = new Raster(pW, pH);
    for (let y = 0; y < pH; y++) for (let x = 0; x < pW; x++) {
      const e = Math.min(x, y, pW - 1 - x, pH - 1 - y);
      pl.set(x, y, e === 0 ? OLc : e === 1 ? (x < pW / 2 && y < pH / 2 ? S9[8] : S9[3]) : pick(S9.slice(3, 8), 0.55 - y * 0.003 + (noise2(x * 0.2, y * 0.2, 44) - 0.5) * 0.15, x, y));
    }
    for (let k = 0; k < 15; k++) {
      const hx = 5 + Math.floor(hash(k, 0, 45) * (pW - 10)), hy = 5 + Math.floor(hash(k, 1, 45) * (pH - 10));
      for (const [ix, iy, c] of [[-1, -1, S9[9]], [0, -1, S9[8]], [-1, 0, S9[8]], [1, 1, S9[2]], [1, 0, S9[2]], [0, 1, S9[2]]]) pl.set(hx + ix, hy + iy, c);
      pl.set(hx, hy, hex('#0E1014'));
      if (hash(k, 2, 45) > 0.6) for (let c2 = 2; c2 < 5; c2++) pl.set(hx + c2, hy + Math.round(c2 * (hash(k, 3, 45) - 0.5)), S9[2]);
    }
    sx.drawImage(pl.flush(), pX0, pY0);
  }
  sx.globalCompositeOperation = 'destination-over';
  for (let k = 0; k < 30; k++) {
    const hx = Math.floor(hash(k, 0, 46) * viewW), hy = 20 + Math.floor(hash(k, 1, 46) * 140);
    dot(sx, hx, hy, '#14171C'); dot(sx, hx - 1, hy - 1, Sc[8]); dot(sx, hx + 1, hy + 1, Sc[2]);
  }
  sx.globalCompositeOperation = 'source-over';
  for (const lx of [2, viewW - 12]) { R(sx, lx, 8, 10, 7, OL); R(sx, lx + 1, 9, 8, 5, Sc[5]); R(sx, lx + 1, 9, 8, 1, Sc[8]); R(sx, lx + (lx < 9 ? 7 : 1), 10, 1, 3, Sc[9]); R(sx, lx + 4, 0, 2, 8, Sc[2]); }

  // ── searchlights: the beam painted at every angle of its sweep
  const beamC = hex('#E4E8ED');
  const beams = frames(NB, 0, 0, BL, FLOOR, (ctx, i) => {
    const ang = ((28 + (i * 44) / (NB - 1)) * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang), r = new Raster(BL, FLOOR);
    for (let y = 12; y < FLOOR; y++) for (let x = 6; x < BL; x++) {
      const dx = x - 9, dy = y - 12, along = dx * ca + dy * sa, lat = Math.abs(-dx * sa + dy * ca), w = along * 0.12 + 1;
      if (along <= 4 || along > BL || lat > w) continue;
      if (bayer(x, y) < 0.16 * (1 - along / BL) * (1 - lat / w) + 0.02) r.set(x, y, beamC);
    }
    ctx.drawImage(r.flush(), 0, 0);
  });

  // ── a turret at every aim, with and without its muzzle flash. The red eye
  // blinks on its own, so it is a separate piece laid over the body.
  const TX = 13;
  const turrets = frames(AIMS * 3, 0, 0, 36, 26, (ctx, f) => {
    const aim = (f % AIMS) * (Math.PI / (AIMS - 1)), flash = [0, 1, 3][Math.floor(f / AIMS)];
    const px = TX + 4.5, py = 7.5, len = flash > 0 ? 7 : 9;
    const c = Math.cos(aim), s = Math.sin(aim), pts = [];
    for (let k = 2; k <= len; k++) pts.push([Math.round(px + c * k - 1), Math.round(py + s * k - 1)]);
    for (const [bx, by] of pts) R(ctx, bx - 1, by - 1, 4, 4, OL);
    for (const [bx, by] of pts) R(ctx, bx, by, 2, 2, Sc[4]);
    for (let i = 0; i < pts.length - 1; i++) dot(ctx, pts[i][0], pts[i][1], Sc[7]);
    const tip = pts[pts.length - 1];
    R(ctx, tip[0], tip[1], 2, 2, Sc[1]);
    ctx.drawImage(tSpr, TX - 2, 0);
    if (flash > 0) {
      const fx = Math.round(px + c * (len + 2)), fy = Math.round(py + s * (len + 2));
      R(ctx, fx - 1, fy - 1, 2, 2, '#FFF3C4');
      const arm = flash > 2 ? 3 : 2;
      for (let k = 1; k <= arm; k++) {
        const col = k === 1 ? '#FFD070' : '#FF9A2E';
        dot(ctx, fx + c * (k + 1) - 0.5, fy + s * (k + 1) - 0.5, col);
        dot(ctx, fx - s * (k + 1) - 0.5, fy + c * (k + 1) - 0.5, col);
        dot(ctx, fx + s * (k + 1) - 0.5, fy - c * (k + 1) - 0.5, col);
      }
    }
  });

  // ── the alarm light on the ceiling beam: off, then four steps of its spin
  const bxc = Math.round(viewW / 2);
  const alarm = frames(5, bxc - 47, 6, 94, 13, (ctx, f) => {
    const warn = f > 0;
    R(ctx, bxc - 3, 6, 6, 3, OL); R(ctx, bxc - 2, 6, 4, 2, warn ? '#C8301E' : '#5A1810');
    if (!warn) return;
    const fx = [-4, 0, 4, 0][f - 1];
    R(ctx, bxc + fx - 1, 7, 2, 1, '#FF8A70');
    if (fx) for (let k = 0; k < 18; k++) { const ex = bxc + fx * (1 + k * 0.6), ey = 9 + k * 0.5; if (bayer(ex | 0, ey | 0) < 0.5) dot(ctx, ex, ey, '#7A1810'); }
  });
  // ...and the blast door's lamp: off, on
  const lamp = frames(2, viewW - 27, 106, 4, 3, (ctx, f) => {
    R(ctx, viewW - 27, 106, 4, 3, OL); R(ctx, viewW - 26, 106, 2, 2, f ? '#FF4A32' : '#5A1810');
  });

  const dots = pieces(['#FFF0B0', '#E0C070', '#9A7A30', '#FFD070']);
  const eyes = pieces(['#FFB8A8', '#FF4A32', '#7A1810', '#C8301E'].map((c) => {
    const cv = canvas(2, 1), x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 2, 1);
    return [c, cv];
  }));

  // ── the picture, back to front
  S.layer();
  S.image(wallCv);
  const lightL = S.image(beams, 0, 0).setAlpha(0.55);
  const lightR = S.image(beams, viewW - BL, 0).setAlpha(0.55).setFlipX(true);
  S.image(setCv);
  const tracer = S.pool(dots);
  S.image(beamCv);
  const alarmImg = S.image(alarm);
  const lampImg = S.image(lamp);
  S.image(floorCv, 0, FLOOR);

  S.layer({ furn: true });
  const guns = a.turrets.map(() => S.image(turrets));
  const eye = S.pool(eyes);

  return {
    update(a) {
      const t = a.t;
      lightL.show(Math.round(((Math.sin(t * 0.0065) + 1) / 2) * (NB - 1)));
      lightR.show(Math.round(((Math.sin(t * 0.0065 + 2.2) + 1) / 2) * (NB - 1)));

      // A tracer round flies one of the chart's three arcs every few seconds.
      tracer.begin();
      const tp = t % 150, A = ARC[Math.floor(t / 150) % 3];
      if (tp < 70) {
        const s = tp / 70;
        for (let q = 4; q >= 0; q--) { const sq = s - q * 0.025; if (sq < 0) continue; const [x, y] = arcAt(A, sq); tracer.put(x, y, q === 0 ? '#FFF0B0' : q < 2 ? '#E0C070' : '#9A7A30'); }
        if (tp < 4) { tracer.put(ox + 6, oy - 7, '#FFF0B0'); tracer.put(ox + 7, oy - 8, '#FFD070'); }
      } else if (tp < 78) {
        const x = arcAt(A, 1)[0], k = tp - 70;
        for (let j = 0; j < 5; j++) { const an = (j / 4) * Math.PI; tracer.put(x + Math.cos(an) * (1 + k * 0.5), oy - 1 - Math.sin(an) * (1 + k * 0.5), k < 4 ? '#FFD070' : '#9A7A30'); }
      }
      tracer.end();

      // The alarm spins up in the last 50 frames before a burst.
      const warn = (a.burstIn ?? Infinity) < 50;
      alarmImg.show(warn ? 1 + ((t >> 2) & 3) : 0);
      lampImg.show((warn ? (t >> 2) & 1 : t % 120 < 60) ? 1 : 0);

      eye.begin();
      a.turrets.forEach((tu, i) => {
        const k = Math.max(0, Math.min(AIMS - 1, Math.round((tu.aim ?? Math.PI / 2) / (Math.PI / (AIMS - 1)))));
        guns[i].setPosition(tu.x - TX, 0).show(k + AIMS * (tu.flash > 2 ? 2 : tu.flash > 0 ? 1 : 0));
        eye.put(tu.x + 4, 7, tu.flash > 0 ? '#FFB8A8' : warn ? ((t >> 2) & 1 ? '#FF4A32' : '#7A1810') : (t % 90) < 72 ? '#C8301E' : '#7A1810');
      });
      eye.end();
    },
  };
}
