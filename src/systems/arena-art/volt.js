/**
 * VOLT MAN — electric. A power room on a one-second beat: the big plasma lamp,
 * two speakers keeping time, climbing-spark rods, circuit traces, the floor
 * panels, the overhead cables and their conductors.
 *
 * Drawn by Claude at the owner's request, 4 Oct 2026 (Claude Design, "Boss
 * Arenas 16-bit v2", room 2d), and approved by the owner the same day.
 *
 * THE ROOM PUTS ITS OWN LIGHTS OUT. At the end of a layer-2 sweep the room
 * darkens, and everything that gives off its own light — the lamp, the spark
 * rods, the meters, the traces, the panels, the bolts — is drawn AFTER the dark,
 * so it still glows. The bodies in the room (Volt Man, minions) are darkened by
 * GameScene in front of all of it, by the owner's call, so a body walking in
 * front of the lamp blocks its light. See `dim` in index.js.
 */
import {
  H, TAU, OL, OLc, hex, css, lerp, snap5, ramp, bayer, hash, rng, canvas, pick,
  Raster, hdma, R, dot, walk, line, sprite, checker, dotted, frames, pieces,
} from './pixels.js';
import { VOLT_LAMP_HOLD } from '../arena.js';

const TENDRIL_SETS = 32;   // lamp lightning shapes, cycled
const ARC_VARIANTS = 4;    // spark-rod arc jitters
const SPARKS = 8;          // panel spark patterns
const BOLT_SHAPES = 2;     // power-line bolt shapes per conductor
const BOLT_LEVELS = 8;     // steps of the bolt's dithered fade

export default function volt(S, a, viewW) {
  const FLOOR = a.floorY;
  const MET = ramp(['#0E1116', '#1B2029', '#2A313C', '#39404E', '#4B5563', '#6B7686', '#9AA4B4']);
  const Mc = MET.map(css);
  const cx = Math.round(viewW / 2), gy = 78, gr = 34;

  // ── the back wall: panels, the dim rail, circuit traces, the lamp's stand,
  // the spark rods and their warning signs
  const wallRows = hdma(FLOOR, [[0, '#06030B'], [0.5, '#0E0720'], [1, '#190D34']]);
  const wall = new Raster(viewW, FLOOR);
  const seam = hex('#07040E'), lip = hex('#3A2466');
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < viewW; x++) {
    const lx = x % 24;
    let c = wallRows[y];
    if (lx === 0) c = seam; else if (lx === 1) c = snap5(lerp(c, lip, 0.35)); else if (lx === 23) c = snap5(lerp(c, seam, 0.5));
    wall.set(x, y, c);
  }
  // rail kept clear of both platform rows (118–122, 146–150) and out of their metal colours
  const RAIL = ramp(['#3A2466', '#24164A', '#160C2C', '#07040E']);
  for (let x = 0; x < viewW; x++) for (let k = 0; k < 4; k++) wall.set(x, 162 + k, RAIL[k]);
  for (let x = 12; x < viewW; x += 48) for (let y = 166; y < 172; y++) wall.set(x, y, RAIL[1]);
  const traces = [], tr = rng(77), dimT = hex('#24164A'), pad = hex('#3A2466');
  for (let k = 0; k < 6; k++) {
    const dir = k % 2 ? 1 : -1, pts = [];
    let x = cx + dir * (26 + (k >> 1) * 3), y = 116 + (k >> 1) * 9;
    while (x > 1 && x < viewW - 2) {
      const run = 8 + ((tr() * 26) | 0);
      for (let i = 0; i < run && x > 1 && x < viewW - 2; i++) { pts.push([x, y]); x += dir; }
      const jog = (tr() < 0.5 ? -1 : 1) * (2 + ((tr() * 5) | 0));
      for (let i = 0; i < Math.abs(jog) && x > 1 && x < viewW - 2; i++) { pts.push([x, y]); x += dir; y = Math.max(96, Math.min(140, y + Math.sign(jog))); }
    }
    traces.push(pts);
    for (const [px, py] of pts) wall.set(px, py, dimT);
    if (pts.length) { const [ex, ey] = pts[pts.length - 1]; wall.set(ex, ey, pad); wall.set(ex, ey + 1, pad); }
  }
  for (let y = 104; y <= 134; y++) {
    const hw = y < 112 ? 9 : 14 + (y - 112) * 0.4;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const dx = x - cx, u = (dx + hw) / (2 * hw), edge = Math.abs(Math.abs(dx) - hw) < 0.6;
      const v = y < 112 ? 0.25 + Math.sin(u * Math.PI) * 0.45 - u * 0.1 - (y === 106 || y === 109 ? 0.25 : 0) : y === 112 ? 0.8 : 0.3 + Math.sin(u * Math.PI) * 0.35 - u * 0.12 - (y - 112) * 0.004;
      let c = edge || y === 134 ? OLc : pick(MET, v, x, y);
      if (y >= 121 && y <= 123 && !edge) c = ((x + y) >> 1) & 1 ? hex('#C8A020') : OLc;
      wall.set(x, y, c);
    }
  }
  // two Jacob's ladders on the back wall: the arc climbs once per beat and breaks on the next
  const jl = [Math.round(viewW * 0.2), Math.round(viewW * 0.8)];
  const spread = (y) => 3 + ((88 - y) * 9) / 58;
  for (const jx of jl) {
    for (const sd of [-1, 1]) walk(jx + sd * 3, 88, jx + sd * 12, 30, (x, y) => { wall.set(x, y, MET[5]); wall.set(x + sd, y, MET[2]); });
    for (let y = 88; y < 96; y++) for (let x = jx - 6; x < jx + 6; x++) wall.set(x, y, y === 88 || y === 95 || x === jx - 6 || x === jx + 5 ? OLc : y === 89 ? MET[5] : y & 1 ? MET[3] : MET[2]);
  }
  const signCv = sprite([
    '.....0.....',
    '....0Y0....',
    '....0Y0....',
    '...0YYK0...',
    '...0YKY0...',
    '..0YKKKY0..',
    '..0YYKYY0..',
    '.0YYKYYYY0.',
    '.0YYYYYYY0.',
    '00000000000',
  ], { 0: OL, Y: '#F5D328', K: '#0A0A12' });
  // The signs hang below the rods and nothing passes in front of them, so they
  // are painted straight onto the wall.
  const wallCv = wall.flush();
  for (const jx of jl) wallCv.getContext('2d').drawImage(signCv, jx - 5, 99);

  // ── the plasma lamp's glass, back and front
  const GS = gr * 2 + 6, gc = GS / 2;
  const gb = new Raster(GS, GS), gf = new Raster(GS, GS);
  const HZ = ramp(['#120824', '#1A0C34', '#26124C', '#341A66', '#43217F']);
  for (let y = 0; y < GS; y++) for (let x = 0; x < GS; x++) {
    const dx = x + 0.5 - gc, dy = y + 0.5 - gc, d = Math.hypot(dx, dy) / gr;
    if (d > 1.08) continue;
    if (d > 1) { if (bayer(x, y) < 0.35) gb.set(x, y, hex('#1E0E3C')); continue; }
    gb.set(x, y, d > 0.955 ? hex('#4A3290') : d > 0.91 ? hex('#24164A') : pick(HZ, Math.pow(1 - d, 1.3) * 0.95, x, y));
    const ang = Math.atan2(dy, dx);
    if (d > 0.78 && d < 0.88 && ang > -2.6 && ang < -1.9) gf.set(x, y, hex('#9A7ADF'));
    if (d > 0.8 && d < 0.86 && ang > 0.35 && ang < 0.9) gf.set(x, y, hex('#3E2A78'));
  }
  const g0x = Math.round(gc - gr * 0.55), g0y = Math.round(gc - gr * 0.6);
  gf.set(g0x, g0y, hex('#FFFFFF')); gf.set(g0x + 1, g0y, hex('#E0D4FF')); gf.set(g0x, g0y + 1, hex('#E0D4FF')); gf.set(g0x + 1, g0y + 1, hex('#B8A4F0'));
  const cg = new Raster(25, 25);
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    const i = 1 - Math.hypot(x + 0.5 - 12.5, y + 0.5 - 12.5) / 12.5;
    if (i > 0.1 + bayer(x, y) * 0.4) cg.set(x, y, hex(i < 0.5 ? '#5B21B6' : '#7C2BD9'));
  }
  // The core and the glass's front highlight, painted together over the tendrils.
  const front = canvas(GS, GS), fc = front.getContext('2d');
  fc.translate(gc - cx, gc - gy);
  R(fc, cx - 3, gy - 4, 6, 8, '#F5D328'); R(fc, cx - 4, gy - 3, 8, 6, '#F5D328');
  R(fc, cx - 2, gy - 3, 4, 6, '#FFF6C0'); R(fc, cx - 3, gy - 2, 6, 4, '#FFF6C0'); dot(fc, cx - 1, gy - 2, '#FFFFFF');
  fc.setTransform(1, 0, 0, 1, 0, 0);
  fc.drawImage(gf.flush(), 0, 0);
  // The lamp's lightning: a set of six tendrils, held for VOLT_LAMP_HOLD steps
  // then replaced. Painted for 32 holds, each as it first strikes (brighter)
  // and as it settles.
  function tendrils(bolt) {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const rn = rng((bolt * 7919 + i * 104729 + 1) >>> 0);
      const th = (i / 6) * TAU + Math.sin(bolt + i * 2.3) * 0.5, pts = [[cx, gy]];
      for (let k = 1; k <= 7; k++) {
        const rr = (k / 7) * (gr - 3), a2 = th + (rn() - 0.5) * 0.35, j = k < 7 ? (rn() - 0.5) * 7 : 0;
        pts.push([Math.round(cx + Math.cos(a2) * rr - Math.sin(a2) * j * 0.4), Math.round(gy + Math.sin(a2) * rr + Math.cos(a2) * j * 0.4)]);
      }
      out.push(pts);
    }
    return out;
  }
  const lamp = frames(TENDRIL_SETS * 2, cx - gc, gy - gc, GS, GS, (ctx, f) => {
    const fresh = f & 1, list = tendrils(f >> 1);
    for (const pts of list) {
      for (let i = 0; i < pts.length - 1; i++) walk(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], (x, y) => { if (bayer(x, y) < 0.5) { dot(ctx, x + 1, y, '#7C2BD9'); dot(ctx, x, y + 1, '#7C2BD9'); } });
      for (let i = 0; i < pts.length - 1; i++) walk(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], (x, y) => dot(ctx, x, y, i < 2 || fresh ? '#FFF6C0' : '#F5D328'));
      const [ex, ey] = pts[pts.length - 1];
      dot(ctx, ex, ey, '#FFF6C0'); dot(ctx, ex - 1, ey, '#F5D328'); dot(ctx, ex + 1, ey, '#F5D328'); dot(ctx, ex, ey - 1, '#F5D328'); dot(ctx, ex, ey + 1, '#F5D328');
    }
  });

  // ── the spark rods' arc: every height it climbs through, in a few jitters,
  // plus the moment it breaks at the top
  const ARC_Y0 = 32, ARC_N = 86 - ARC_Y0 + 1, AW = 28, AH = 9;
  const arcs = frames(jl.length * ARC_N * (ARC_VARIANTS + 1), 0, 0, AW, AH, (ctx, f) => {
    const li = Math.floor(f / (ARC_N * (ARC_VARIANTS + 1))), rest = f % (ARC_N * (ARC_VARIANTS + 1));
    const y = ARC_Y0 + Math.floor(rest / (ARC_VARIANTS + 1)), v = rest % (ARC_VARIANTS + 1), jx = jl[li], s = spread(y);
    ctx.translate(AW / 2 - jx, 5 - y);
    if (v === ARC_VARIANTS) { R(ctx, jx - s - 1, y - 1, 3, 2, '#F5D328'); R(ctx, jx + s - 1, y - 1, 3, 2, '#F5D328'); return; }
    const rn = rng((v * 31 + jx) >>> 0), pts = [[jx - s, y]];
    for (let i = 1; i < 4; i++) pts.push([jx - s + (2 * s * i) / 4, y + Math.round((rn() - 0.5) * 4 - Math.sin((i / 4) * Math.PI) * 2)]);
    pts.push([jx + s, y]);
    for (let i = 0; i < pts.length - 1; i++) walk(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], (x, yy) => { if (bayer(x, yy) < 0.5) { dot(ctx, x, yy - 1, '#C8A020'); dot(ctx, x, yy + 1, '#C8A020'); } });
    for (let i = 0; i < pts.length - 1; i++) walk(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], (x, yy) => dot(ctx, x, yy, '#FFF6C0'));
  });

  // ── the speakers: cabinet, its cone at every point of the beat's decay, and
  // the light it throws (the same decay, mirrored for the right-hand one)
  function cabinet(w, h) {
    const r = new Raster(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      r.set(x, y, x === 0 || y === 0 || x === w - 1 || y === h - 1 ? OLc : x === 1 || y === 1 ? MET[3] : x === w - 2 || y === h - 2 ? MET[0] : pick([MET[1], MET[2]], 0.3 + 0.25 * (1 - y / h), x, y));
    }
    for (const [ox, oy] of [[1, 1], [w - 5, 1], [1, h - 5], [w - 5, h - 5]]) for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) r.set(ox + i, oy + j, i + j < 2 ? MET[6] : i + j < 4 ? MET[5] : MET[4]);
    for (let y = 6; y <= 16; y++) for (let x = 4; x <= w - 5; x++) {
      const d = Math.min(x - 4, w - 5 - x, y - 6, 16 - y);
      r.set(x, y, d === 0 ? MET[3] : d === 1 ? MET[2] : d === 2 ? MET[1] : (x + y) & 1 ? hex('#141820') : hex('#07090C'));
    }
    const wcx = w / 2, wcy = h * 0.62, rs = w * 0.34 + 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - wcx, dy = y + 0.5 - wcy, d = Math.hypot(dx, dy);
      if (d > rs + 0.6 || d < rs - 1.6) continue;
      const lit = -(dx * 0.6 + dy * 0.8) / d;
      r.set(x, y, lit > 0.35 ? MET[4] : lit < -0.35 ? hex('#121720') : MET[2]);
    }
    return r.flush();
  }
  const sp0 = a.speakers[0];
  const cabCv = cabinet(sp0.w, sp0.h);
  function cone(ctx, sp, p) {
    const wcx = sp.x + sp.w / 2, wcy = sp.y + sp.h * 0.62, rin = sp.w * 0.34 + 0.4, cap = 2.6 + 1.6 * p;
    for (let y = Math.floor(wcy - rin); y <= Math.ceil(wcy + rin); y++) for (let x = Math.floor(wcx - rin); x <= Math.ceil(wcx + rin); x++) {
      const dx = x + 0.5 - wcx, dy = y + 0.5 - wcy, d = Math.hypot(dx, dy);
      if (d >= rin) continue;
      const lit = -(dx * 0.6 + dy * 0.8) / (d || 1);
      let c;
      if (d < cap) c = d < cap - 1 ? (lit > 0.3 && d > 1 ? Mc[5] : Mc[3]) : Mc[2];
      else c = Math.floor((d - cap + (1 - p) * 1.5) / 1.6) & 1 ? '#1E242E' : lit > 0.2 ? Mc[3] : Mc[2];
      dot(ctx, x, y, c);
    }
  }
  function speakerLight(ctx, sp, p, facing) {
    const wcx = sp.x + sp.w / 2, wcy = sp.y + sp.h * 0.62, rs = sp.w * 0.34 + 1.4;
    const lc = p > 0.6 ? '#FFF6C0' : p > 0.25 ? '#F5D328' : '#4A3C0E';
    for (let k = 0; k < 8; k++) { const an = (k * Math.PI) / 4; dot(ctx, wcx + Math.cos(an) * rs - 0.5, wcy + Math.sin(an) * rs - 0.5, lc); }
    if (p > 0.3) R(ctx, wcx - 1, wcy - 1, 2, 2, '#F5D328', 0.4 + 0.5 * p);
    if (p > 0.05) {
      const rad = rs + 4 + (1 - p) * 13;
      for (let an = -1.2; an <= 1.2; an += 0.1) {
        const x = wcx + Math.cos(an) * rad * facing, y = wcy + Math.sin(an) * rad;
        if (bayer(Math.round(x), Math.round(y)) < p * 0.7) dot(ctx, x, y, '#6B2CD0');
      }
    }
  }
  const pOf = (beat) => Math.max(0, 1 - beat / 16);
  const cones = frames(17, sp0.x, sp0.y, sp0.w, sp0.h, (ctx, b) => cone(ctx, sp0, pOf(b)));
  const LR = 28;
  const lights = frames(a.speakers.length * 17, 0, 0, LR * 2, LR * 2, (ctx, f) => {
    const i = Math.floor(f / 17), sp = a.speakers[i];
    ctx.translate(LR - (sp.x + sp.w / 2), LR - Math.round(sp.y + sp.h * 0.62));
    speakerLight(ctx, sp, pOf(f % 17), i === 0 ? 1 : -1);
  });

  // ── furniture that does not move: speaker brackets, cables, conductors,
  // the floor panels' housings
  const fixed = canvas(viewW, FLOOR), fx = fixed.getContext('2d');
  for (const [i, sp] of a.speakers.entries()) {
    fx.drawImage(cabCv, sp.x, sp.y);
    const bx0 = i === 0 ? 0 : sp.x + sp.w, bw = i === 0 ? sp.x : viewW - sp.x - sp.w;
    for (const yy of [sp.y + 8, sp.y + 45]) { R(fx, bx0, yy, bw, 1, Mc[4]); R(fx, bx0, yy + 1, bw, 1, Mc[1]); }
  }
  const wires = new Raster(viewW, 20);
  a.conductors.forEach((c, i) => {
    for (let x = 0; x < viewW; x++) { wires.set(x, c.cableY, MET[4]); wires.set(x, c.cableY + 1, MET[1]); wires.set(x, c.cableY + 2, hex('#05030A'), 110); }
    for (let x = 20 + i * 32; x < viewW - 4; x += 64) {
      for (let y = 0; y < c.cableY; y++) wires.set(x, y, MET[2]);
      for (let k = -1; k <= 1; k++) wires.set(x + k, c.cableY - 1, MET[5]);
    }
    const dx = c.x + c.w / 2 - 1;
    for (let y = c.cableY; y <= c.y; y++) { wires.set(dx, y, MET[5]); wires.set(dx + 1, y, MET[3]); }
    wires.set(dx - 1, c.cableY, MET[6]); wires.set(dx + 2, c.cableY, MET[6]);
  });
  for (const x0 of [0, viewW - 3]) for (let y = 1; y < 14; y++) for (let x = x0; x < x0 + 3; x++) wires.set(x, y, (x0 === 0 ? x === 2 : x === x0) ? MET[1] : MET[3]);
  fx.drawImage(wires.flush(), 0, 0);
  const conSpr = sprite([
    '0000000000',
    '0dCCCCCCd0',
    '0cccccccc0',
    '000nNNn000',
    '.0dCCCCd0.',
    '.0cccccc0.',
    '...0kK0...',
    '....00....',
  ], { 0: OL, C: '#E4DCEC', d: '#B0A6C0', c: '#7A7088', n: '#5A5266', N: '#8A8298', k: '#C06A2A', K: '#FFB060' });
  for (const c of a.conductors) if (c.live) fx.drawImage(conSpr, c.x - 1, c.y - 1);
  for (const pn of a.panels) {
    const w = pn.w - 1, lx = pn.x + Math.floor(pn.w / 2) - 2;
    R(fx, pn.x, pn.y, w, 1, Mc[4]); R(fx, pn.x, pn.y + 1, w, 1, Mc[2]); R(fx, pn.x, pn.y + 2, w, 1, Mc[1]);
    for (let i = pn.x + 3; i < pn.x + w - 3; i += 2) dot(fx, i, pn.y + 1, '#6A4A1E');
    R(fx, lx, pn.y, 4, 3, OL); R(fx, lx + 1, pn.y + 1, 2, 1, '#3A1410');
  }

  // ── the floor
  const pw = Math.floor(viewW / 8);
  const fl = new Raster(viewW, H - FLOOR);
  for (let y = 0; y < H - FLOOR; y++) for (let x = 0; x < viewW; x++) {
    let c;
    if (y === 0) c = MET[4]; else if (y === 1) c = MET[2]; else if (y === 2) c = MET[1];
    else if (y >= 5 && y <= 7) c = ((x + y) >> 1) % 4 < 2 ? hex('#4A3C0E') : OLc;
    else c = x % pw === 0 ? MET[0] : pick([MET[0], MET[1], MET[2]], (0.3 - (y / 40) * 0.2) * 2, x, y);
    if (y === 12 && x % pw === 6) c = MET[4];
    fl.set(x, y, c);
  }

  // ── the platforms: solid, about-to-go ghost, phased out
  const vp = new Raster(40, 5);
  for (let x = 0; x < 40; x++) for (let y = 0; y < 5; y++) {
    const endZone = x <= 6 || x >= 33;
    let c;
    if (y === 0 || y === 4 || x === 0 || x === 39) c = OLc;
    else if (y === 1) c = x <= 4 || x >= 35 ? hex('#FFE97A') : MET[5];
    else if (y === 2) c = endZone ? (((x + y) >> 1) & 1 ? hex('#F5D328') : OLc) : MET[3];
    else c = endZone ? hex('#8A7414') : MET[2];
    vp.set(x, y, c);
  }
  for (const x of [11, 20, 28]) vp.set(x, 2, MET[6]);
  const vpCv = vp.flush();
  const plat0 = a.platforms[0];
  const slabs = frames(3, 0, 0, plat0.w, plat0.h, (ctx, k) => (k === 0 ? ctx.drawImage(vpCv, 0, 0) : k === 1 ? ctx.drawImage(checker(vpCv), 0, 0) : dotted(ctx, 0, 0, plat0.w, plat0.h, '#6A4AB0')));
  // Their lights: a dithered row that brightens on the beat. Full-width rows,
  // one per dither level and row phase, cut to each platform.
  const level = (v) => Math.max(0, Math.min(16, Math.ceil(16 * v - 0.5)));
  const pLights = frames(17 * 4, 0, 0, viewW, 1, (ctx, f) => {
    const L = f >> 2, yp = f & 3;
    for (let x = 0; x < viewW; x++) if (bayer(x, yp) * 16 - 0.5 < L) dot(ctx, x, 0, '#F5D328');
  });

  // ── the floor panels when they matter: lit (discharging or lingering, each
  // with its sparks) and warning. One sheet, a column of frames per panel.
  const PF = 2 * SPARKS + 2, PH = 16, PM = 4;
  const panelFx = frames(a.panels.length * PF, 0, 0, pw + 2 * PM, PH, (ctx, f) => {
    const pn = a.panels[Math.floor(f / PF)], k = f % PF, w = pn.w - 1, lx = pn.x + Math.floor(pn.w / 2) - 2;
    ctx.translate(PM - pn.x, -(pn.y - 13));
    if (k < 2 * SPARKS) {
      const dis = k < SPARKS, v = k % SPARKS;
      R(ctx, pn.x, pn.y, w, 1, dis ? '#FFFFFF' : '#FFF6C0'); R(ctx, pn.x, pn.y + 1, w, 1, '#F5D328'); R(ctx, pn.x, pn.y + 2, w, 1, '#C8A020');
      for (let i = pn.x + 3; i < pn.x + w - 3; i += 2) dot(ctx, i, pn.y + 1, '#FFE97A');
      if (dis) {
        const rn = rng(v * 131 + pn.x * 7 + 1);
        for (let q = 0; q < 5; q++) {
          let ax = pn.x + 2 + rn() * (w - 4), ay = pn.y;
          const hgt = 6 + rn() * 5, pts = [[ax, ay]];
          while (ay > pn.y - hgt) { ay -= 2 + rn() * 2; ax += (rn() - 0.5) * 4; pts.push([ax, ay]); }
          for (let i = 0; i < pts.length - 1; i++) walk(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], (x, y) => { dot(ctx, x - 1, y, '#F5D328'); dot(ctx, x + 1, y, '#F5D328'); });
          for (let i = 0; i < pts.length - 1; i++) walk(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], (x, y) => dot(ctx, x, y, '#FFFFFF'));
        }
      } else {
        const rn = rng(v * 97 + pn.x + 3);
        for (let q = 0; q < 4; q++) { const ax = pn.x + 1 + ((rn() * (w - 2)) | 0); dot(ctx, ax, pn.y - 1, '#FFF6C0'); if (rn() > 0.5) dot(ctx, ax + (rn() < 0.5 ? -1 : 1), pn.y - 2, '#F5D328'); }
      }
    } else {
      const col = k === 2 * SPARKS ? '#F5D328' : '#E11416';
      R(ctx, lx + 1, pn.y + 1, 2, 1, col); R(ctx, lx + 1, pn.y, 2, 1, col);
      for (let j = 1; j <= 3; j++) for (let i = -2; i <= 5; i++) if (bayer(lx + i, pn.y - j) < 0.5 - j * 0.12) dot(ctx, lx + i, pn.y - j, col);
    }
  });

  // ── the power-line bolts: a couple of shapes per conductor, each at every
  // step of its dithered fade
  const boltCache = a.conductors.map((c, ci) => Array.from({ length: BOLT_SHAPES }, (_, s) => {
    const rn = rng(1000 * (ci + 1) + s + 1), cx0 = c.x + c.w / 2, pts = [];
    let k = 0;
    for (let y = c.y + c.h; y < FLOOR; y += 4) { pts.push([Math.round(cx0 + (k % 2 ? 3 : -3) + (rn() - 0.5) * 2), y]); k++; }
    pts.push([Math.round(cx0 + (rn() - 0.5) * 2), FLOOR - 1]);
    const branches = [];
    for (let n = 0; n < 3; n++) {
      const i = 2 + ((rn() * Math.max(1, pts.length - 4)) | 0);
      let [x, y] = pts[Math.min(i, pts.length - 1)];
      const dir = rn() < 0.5 ? -1 : 1, bp = [[x, y]];
      for (let q = 0; q < 3 + ((rn() * 3) | 0); q++) { x += dir * (2 + rn() * 3); y += 2 + rn() * 3; bp.push([Math.round(x), Math.round(y)]); }
      branches.push(bp);
    }
    return { pts, branches };
  }));
  function drawVBolt(ctx, b, a1, floorY) {
    const run = (fn) => { for (let i = 0; i < b.pts.length - 1; i++) walk(b.pts[i][0], b.pts[i][1], b.pts[i + 1][0], b.pts[i + 1][1], fn); };
    const g = (x, y) => bayer(x, y) < a1;
    run((x, y) => { for (const o of [-3, -2, 2, 3]) if (g(x + o, y) && (Math.abs(o) === 2 || bayer(x + o + 1, y) < 0.55)) dot(ctx, x + o, y, '#7C2BD9'); });
    for (const br of b.branches) for (let i = 0; i < br.length - 1; i++) walk(br[i][0], br[i][1], br[i + 1][0], br[i + 1][1], (x, y) => { if (g(x, y)) dot(ctx, x, y, '#B86BFF'); });
    run((x, y) => { for (const o of [-1, 1]) if (g(x + o, y)) dot(ctx, x + o, y, '#B86BFF'); });
    run((x, y) => { if (g(x, y)) dot(ctx, x, y, '#F3E8FF'); });
    const [ex] = b.pts[b.pts.length - 1];
    for (let i = -5; i <= 5; i++) for (let j = 0; j < 2; j++) if (g(ex + i, floorY - 1 - j) && Math.abs(i) < 5 - j * 2) dot(ctx, ex + i, floorY - 1 - j, Math.abs(i) < 2 ? '#F3E8FF' : '#B86BFF');
  }
  const boltSheets = a.conductors.map((c, ci) => {
    let reach = 6;
    for (const b of boltCache[ci]) for (const [x] of [...b.pts, ...b.branches.flat()]) reach = Math.max(reach, Math.abs(x - (c.x + c.w / 2)) + 4);
    const x0 = Math.floor(c.x + c.w / 2 - reach), y0 = c.y + c.h - 1;
    return frames(BOLT_SHAPES * BOLT_LEVELS, x0, y0, Math.ceil(2 * reach) + 1, FLOOR - y0 + 1, (ctx, f) => {
      drawVBolt(ctx, boltCache[ci][Math.floor(f / BOLT_LEVELS)], (2 * ((f % BOLT_LEVELS) + 1)) / 16, FLOOR);
    });
  });

  // ── small things: trace comets, meters, beat lights, conductor sparks
  const bar = (h) => { const cv = canvas(1, 5), c = cv.getContext('2d'); for (let j = 0; j < h; j++) dot(c, 0, 4 - j, j >= 4 ? '#FFF6C0' : j === 3 ? '#F5D328' : '#C8A020'); return [`bar${h}`, cv]; };
  const flat = (name, w, h, col) => { const cv = canvas(w, h), c = cv.getContext('2d'); c.fillStyle = col; c.fillRect(0, 0, w, h); return [name, cv]; };
  const spark = (v) => {
    const cv = canvas(12, 8), c = cv.getContext('2d'), rn = rng(v * 17 + 5);
    for (let k = 0; k < 4; k++) { const an = rn() * TAU, L = 2 + rn() * 3; line(c, 6, 1, 6 + Math.cos(an) * L, 1 + Math.abs(Math.sin(an)) * L, '#C9A2FF'); }
    dot(c, 6, 1, '#F3E8FF');
    return [`spark${v}`, cv];
  };
  const bits = pieces([
    '#E0C8FF', '#B86BFF', '#9B4DFF', '#7C2BD9', '#FFF6C0',
    ...[0, 1, 2, 3, 4, 5].map(bar),
    flat('lampA', 2, 1, '#FFF6C0'), flat('lampB', 2, 1, '#F5D328'), flat('lampC', 2, 1, '#5A4A10'),
    ...[3, 4, 5].map((h) => flat(`coil${h}`, 2, h, '#9B4DFF')),
    ...Array.from({ length: 8 }, (_, v) => spark(v)),
  ]);

  // ── the picture, back to front
  S.layer();
  S.image(wallCv);
  S.image(gb.flush(), cx - gc, gy - gc);
  S.image(fl.flush(), 0, FLOOR);

  S.layer({ furn: true });
  S.image(fixed);
  const coneImgs = a.speakers.map((sp) => S.image(cones, sp.x, sp.y));
  const plats = a.platforms.map(() => S.image(slabs));

  // The room's own darkness. Everything after this gives off its own light.
  S.layer();
  // Oversized, so a screen shake never slides a lit edge into view.
  const dark = S.rect(-8, -8, viewW + 16, H + 16, 0x02010A, 0).setVisible(false);
  const arcImgs = jl.map(() => S.image(arcs));
  const comets = S.pool(bits);
  S.image(cg.flush(), cx - 12, gy - 12);
  const lampImg = S.image(lamp);
  S.image(front, cx - gc, gy - gc);

  S.layer({ furn: true });
  const meters = S.pool(bits);
  const lightImgs = a.speakers.map((sp) => S.image(lights, Math.round(sp.x + sp.w / 2) - LR, Math.round(sp.y + sp.h * 0.62) - LR));
  const platLights = S.crops(pLights);
  const panelImgs = a.panels.map((pn) => S.image(panelFx, pn.x - PM, pn.y - 13).setVisible(false));
  const zaps = S.pool(bits);
  const boltImgs = a.conductors.map((c, ci) => S.image(boltSheets[ci]).setVisible(false));

  const shapeOf = a.conductors.map(() => 0), striking = a.conductors.map(() => false);

  return {
    // The room darkens itself; see `dim` in index.js and `shadeA` in GameScene.
    dim: true,

    update(a) {
      const t = a.t, beat = a.beat, p = pOf(beat), pb = Math.min(16, beat);
      coneImgs.forEach((im) => im.show(pb));
      a.platforms.forEach((pl, i) => {
        const age = t - pl.born, going = pl.t < 45;
        plats[i].setPosition(pl.x, pl.y).setVisible(!(pl.on && age < 10 && (age & 1)))
          .show(!pl.on ? 2 : going && (t >> 2) & 1 ? 1 : 0);
      });

      const dimA = a.dim > 0 ? Math.round(a.dim * 0.72 * 8) / 8 : 0;
      dark.setVisible(dimA > 0).setFillStyle(0x02010A, dimA);

      // The spark climbs between the rods once a beat and breaks at the top.
      const f = beat / a.beatLen, y = Math.round(86 - f * 54);
      jl.forEach((jx, li) => {
        const v = f > 0.93 ? ARC_VARIANTS : ((t >> 1) + li) % ARC_VARIANTS;
        arcImgs[li].setPosition(jx - AW / 2, y - 5).show((li * ARC_N + (y - ARC_Y0)) * (ARC_VARIANTS + 1) + v);
      });
      comets.begin();
      if (beat < 40) {
        const g = beat / 40;
        for (const pts of traces) {
          const head = Math.floor(g * pts.length);
          for (let k = 0; k < 8; k++) { const q = pts[head - k]; if (q) comets.put(q[0], q[1], k === 0 ? '#E0C8FF' : k < 3 ? '#B86BFF' : k < 5 ? '#9B4DFF' : '#7C2BD9'); }
        }
      }
      for (let k = -2; k <= 2; k++) comets.put(cx + k * 6 - 1, 128, a.beatN % 5 === k + 2 ? 'lampA' : p > 0.5 ? 'lampB' : 'lampC');
      comets.end();
      lampImg.show((Math.floor(t / VOLT_LAMP_HOLD) % TENDRIL_SETS) * 2 + (t % VOLT_LAMP_HOLD < 2 ? 1 : 0));

      // Level meters in the speaker windows, kicking on every beat.
      meters.begin();
      a.speakers.forEach((sp) => {
        for (let b = 0; b < 4; b++) {
          const lv = Math.min(1, p * (0.55 + 0.45 * hash(b, a.beatN, 33)) + 0.18 * hash(b, t >> 3, 34));
          meters.put(sp.x + 7 + b * 2, sp.y + 9, `bar${Math.round(lv * 5)}`);
        }
      });
      meters.end();
      lightImgs.forEach((im, i) => im.show(i * 17 + pb));

      platLights.begin();
      const L = level(0.2 + 0.45 * p);
      for (const pl of a.platforms) if (pl.on && L > 0) platLights.put(0, pl.y + 5, (L << 2) | ((pl.y + 5) & 3), pl.x + 7, 0, pl.w - 14, 1);
      platLights.end();

      a.panels.forEach((pn, i) => {
        const im = panelImgs[i];
        if (pn.live > 0) {
          const dis = pn.live > pn.liveMax - pn.discharge;
          im.setVisible(true).show(i * PF + (dis ? ((t / 3) | 0) % SPARKS : SPARKS + ((t >> 1) % SPARKS)));
        } else if (pn.tell > 0) im.setVisible(true).show(i * PF + 2 * SPARKS + (Math.floor(pn.tell / 5) % 2 ? 1 : 0));
        else im.setVisible(false);
      });

      zaps.begin();
      a.conductors.forEach((c, ci) => {
        if (!c.live) return;
        const winding = c.tell > 0, tx = c.x + 3 + ((Math.random() * 2) | 0), ty = c.y + 6;
        if (Math.random() < (winding ? 0.9 : 0.25)) {
          if (winding) zaps.put(tx - 6, ty - 1, `spark${(Math.random() * 8) | 0}`);
          else zaps.put(tx, ty, '#FFF6C0');
        }
        if (winding) zaps.put(c.x + 3, c.y + 6, `coil${3 + ((Math.random() * 3) | 0)}`, 0.5 + 0.4 * Math.random());
        // A new strike takes the next shape; the fade plays its dither down.
        const on = c.arc > 0 || c.fade > 0;
        if (on && !striking[ci]) shapeOf[ci] = (shapeOf[ci] + 1) % BOLT_SHAPES;
        striking[ci] = on;
        const a1 = c.arc > 0 ? 1 : c.fade / Math.max(1, c.fadeN || 1);
        const lv = Math.ceil(Math.max(0, Math.min(16, Math.ceil(16 * a1 - 0.5))) / 2);
        boltImgs[ci].setVisible(on && lv > 0);
        if (on && lv > 0) boltImgs[ci].show(shapeOf[ci] * BOLT_LEVELS + lv - 1);
      });
      zaps.end();
    },
  };
}
