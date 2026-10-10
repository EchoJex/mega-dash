/**
 * THORN MAN — grass. An overgrown greenhouse with a shattered glass roof, and
 * the eight ground-cover tiles as brambles that sink into the soil when cut
 * and grow back up out of it.
 *
 * Drawn by Claude at the owner's request, 4 Oct 2026 (Claude Design, "Boss
 * Arenas 16-bit v2", room 2e), and approved by the owner the same day.
 *
 * The burnt look follows the furniture field's current wording, which is
 * still [wip]: "black with small red glowing embers", down three times as long.
 */
import { H, OLc, hex, css, bayer, hash, rng, noise1, noise2, pick, Raster, rows, fill, dot, ramp, pieces, canvas } from './pixels.js';

/** Steps of one vine's sway drawn ahead of time. */
const SWAY = 24;

export default function thorn(S, a, viewW) {
  const FLOOR = a.floorY;
  const LEAF = ramp(['#0A1A0E', '#10281A', '#174022', '#1F5A2A', '#2A7A30', '#3E9A38', '#64BC4A']);
  const WOOD = ramp(['#24160E', '#3A2618', '#5C4033', '#7A5A44', '#9A7656']);
  const IRON = ramp(['#1A120C', '#2A1E14', '#3A2A1C', '#5A4430']);
  const Lc = LEAF.map(css), Wc = WOOD.map(css);
  const PW = 22, PH = 14, ROOF = 56;
  const broken = (px, py) => hash(px, py, 7) > 0.7;

  // ── the greenhouse: glazed back wall, the roof with its broken panes, a
  // fallen roof bar, climbers on the frame
  const bg = new Raster(viewW, FLOOR);
  rows(bg, 0, 0, viewW, FLOOR, [[0, '#0C1A12'], [0.5, '#12261A'], [1, '#0A160E']]);
  fill(bg, 0, ROOF, viewW, FLOOR - ROOF, LEAF.slice(0, 4), (x, y) => {
    const n = noise2(x * 0.045, y * 0.06, 3) * 0.7 + noise2(x * 0.15, y * 0.15, 4) * 0.3;
    return n > 0.48 ? 0.2 + (n - 0.48) * 1.6 : null;
  });
  for (let y = ROOF; y < FLOOR; y++) for (let x = 0; x < viewW; x++) {
    const lx = x % PW, ly = (y - ROOF) % 28;
    if (lx === 0 || ly === 0) bg.set(x, y, IRON[1]);
    else if (lx === 1 || ly === 1) bg.set(x, y, IRON[2]);
    else if ((lx + ly) % 9 === 0 && lx > 3 && lx < 12 && hash(Math.floor(x / PW), Math.floor((y - ROOF) / 28), 2) > 0.5) bg.set(x, y, hex('#2E5C42'));
  }
  for (let y = ROOF; y < FLOOR; y++) for (let x = 0; x < viewW; x++) {
    const lx = x % PW, ly = (y - ROOF) % 28;
    if (lx < 2 || ly < 2) { if (hash(x, y, 14) > 0.93) bg.set(x, y, hex('#7A4A24')); continue; }
    const col = Math.floor(x / PW), rw = Math.floor((y - ROOF) / 28);
    if (hash(col, rw, 15) > 0.86) { if (bayer(x, y) < 0.7) bg.set(x, y, hex('#060C08')); continue; }
    if (noise1(x * 0.7, 16) > 0.62 && hash(col, rw, 17) > 0.4 && bayer(x, y) < 0.35 * (ly / 28)) bg.set(x, y, hex('#2A2A1C'));
    if (ly > 22 && bayer(x, y) < (ly - 22) / 8) bg.set(x, y, hex(ly > 25 ? '#2A5A24' : '#1F4A20'));
  }
  for (let col = 0; col * PW < viewW; col++) {
    if (hash(col, 0, 18) < 0.45) continue;
    const x0 = col * PW, top = ROOF + Math.round(hash(col, 1, 18) * 60);
    for (let y = FLOOR - 1; y > top; y--) {
      const x = x0 + Math.round(Math.sin(y * 0.35 + col) * 1.5);
      bg.set(x, y, LEAF[3]); bg.set(x + 1, y, LEAF[2]);
      if (y % 4 === 0) { const s = (y >> 2) & 1 ? -2 : 2; bg.set(x + s, y, LEAF[5]); bg.set(x + s, y - 1, LEAF[4]); bg.set(x + s + Math.sign(s), y, LEAF[4]); }
    }
  }
  const SKY = ramp(['#A8D4A0', '#C8E8B8', '#E4F4D8']), GL = ramp(['#12301F', '#183A26', '#1F462E']);
  const shafts = [];
  for (let py = 0; py < ROOF; py += PH) for (let px = 0; px < viewW; px += PW) {
    const b = broken(px, py);
    if (b) shafts.push({ x: px + 3, w: PW - 6, y: py + PH });
    for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
      const x = px + i, y = py + j;
      if (i === 0 || j === 0) { bg.set(x, y, IRON[2]); continue; }
      if (i === 1 || j === 1) { bg.set(x, y, IRON[3]); continue; }
      if (b) {
        const e = Math.min(i - 2, PW - 1 - i, j - 2, PH - 1 - j);
        if (e < 1 + Math.floor(hash(x, y, 9) * 3)) bg.set(x, y, hex(hash(x, y, 8) > 0.5 ? '#3E7A58' : '#24503A'));
        else bg.set(x, y, pick(SKY, 0.3 + (1 - j / PH) * 0.6, x, y));
      } else bg.set(x, y, j === 2 ? hex('#2E5C42') : pick(GL, 0.4 + (i / PW) * 0.3, x, y));
    }
  }
  for (let y = 2; y < ROOF; y++) for (let x = 0; x < viewW; x++) {
    if (broken(x - (x % PW), y - (y % PH)) || x % PW < 2 || y % PH < 2) continue;
    if (noise2(x * 0.12, y * 0.3, 19) > 0.6 && bayer(x, y) < 0.5) bg.set(x, y, hex('#2A3420'));
    if (hash(x, y, 20) > 0.985) bg.set(x, y, hex('#7A4A24'));
  }
  const rx = Math.round(viewW * 0.62);
  for (let s = 0; s < 42; s++) {
    const x = Math.round(rx + s * 0.62), y = ROOF + s;
    bg.set(x, y, IRON[3]); bg.set(x + 1, y, IRON[1]);
    if (hash(s, 0, 26) > 0.75) bg.set(x, y, hex('#7A4A24'));
  }
  for (let j = 0; j < 7; j++) for (let i = 0; i <= j; i++) bg.set(rx + 26 + i, ROOF + 38 + j, hex(i === 0 ? '#6E9E82' : '#3E7A58'));
  // ── shafts of sunlight through the broken panes
  const sh = new Raster(viewW, FLOOR), sc = hex('#B8E49A');
  for (const s of shafts) for (let y = s.y; y < FLOOR; y++) {
    const off = Math.round((y - s.y) * 0.28), fade = 1 - (y - s.y) / (FLOOR - s.y + 10);
    for (let i = 0; i < s.w; i++) { const x = s.x + i + off; if (bayer(x, y) < 0.22 * fade * Math.sin(((i + 0.5) / s.w) * Math.PI)) sh.set(x, y, sc); }
  }
  // ── bushes and broken flowerpots along the foot of the wall
  const bush = new Raster(viewW, 48);
  for (let x = 0; x < viewW; x++) {
    const h = Math.round(16 + 22 * noise1(x * 0.06, 11) + 4 * Math.sin(x * 0.5) * noise1(x * 0.2, 12));
    for (let j = 0; j < h; j++) {
      const y = 47 - j;
      bush.set(x, y, j === h - 1 ? LEAF[5] : pick(LEAF.slice(1, 6), 0.25 + (j / h) * 0.45 + (noise2(x * 0.25, y * 0.25, 13) - 0.5) * 0.4, x, y));
    }
  }
  const POT = ramp(['#2A140C', '#4A2414', '#6A3A24', '#8A5434', '#A86A44']);
  for (const [px, ph, broke] of [[Math.round(viewW * 0.12), 9, 1], [Math.round(viewW * 0.4), 7, 0], [Math.round(viewW * 0.83), 10, 1]]) {
    for (let j = 0; j < ph; j++) {
      const hw = 4 + j * 0.35, y = 47 - j;
      for (let x = Math.round(px - hw); x <= Math.round(px + hw); x++) {
        if (broke && j > ph - 4 && hash(x, j, 25) > 0.45 + (ph - j) * 0.1) continue;
        bush.set(x, y, j === ph - 1 ? POT[4] : pick(POT, 0.85 - ((x - (px - hw)) / (2 * hw)) * 0.75, x, y));
      }
    }
    if (broke) { bush.set(px + 8, 47, POT[2]); bush.set(px + 9, 47, POT[1]); bush.set(px - 9, 46, POT[3]); bush.set(px - 10, 47, POT[2]); }
  }
  // ── the floor: soil and brick
  const fl = new Raster(viewW, H - FLOOR);
  for (let y = 0; y < H - FLOOR; y++) for (let x = 0; x < viewW; x++) {
    let c;
    if (y === 0) c = hash(x, 0, 21) > 0.6 ? LEAF[4] : hash(x, 0, 24) > 0.82 ? hex('#8A6A3A') : WOOD[3];
    else if (y < 3) c = hash(x, y, 27) > 0.9 ? hex('#6A5030') : WOOD[1];
    else {
      const row = Math.floor((y - 3) / 6), ly = (y - 3) % 6, sx = x + (row & 1) * 8, lx = sx % 16;
      c = ly === 0 || lx === 0 ? (hash(x, y, 22) > 0.55 ? LEAF[3] : WOOD[0])
        : pick(WOOD, 0.62 - row * 0.07 + (hash(Math.floor(sx / 16), row, 23) - 0.5) * 0.25 + (ly === 1 ? 0.15 : 0), x, y);
    }
    fl.set(x, y, c);
  }

  // ── vines hanging from the roof, each painted at every step of its sway
  const vines = Array.from({ length: 26 }, (_, k) => ({ x: Math.round(hash(k, 0, 31) * viewW), y: 14 * (k % 5), len: 16 + Math.round(hash(k, 1, 31) ** 1.5 * 96), ph: k * 1.7, thick: hash(k, 2, 31) > 0.6 }));
  const VW = 13;
  const vineFrames = [];
  vines.forEach((v, vi) => {
    for (let f = 0; f < SWAY; f++) {
      const cv = canvas(VW, v.len + 2), ctx = cv.getContext('2d'), th = (f / SWAY) * Math.PI * 2;
      ctx.translate(Math.floor(VW / 2) - v.x, 1 - v.y);
      for (let s = 0; s < v.len; s++) {
        const x = v.x + Math.sin(th + s * 0.08 + v.ph) * (s / v.len) * 3, y = v.y + s;
        dot(ctx, x, y, Lc[2]);
        if (v.thick) dot(ctx, x - 1, y, Lc[1]);
        if (s % 5 === 3) { const sd = (s / 5) & 1 ? 1 : -1, dead = hash(vi, s, 32) > 0.8; dot(ctx, x + sd, y, dead ? Wc[3] : Lc[4]); dot(ctx, x + sd, y - 1, dead ? Wc[4] : Lc[5]); }
      }
      vineFrames.push([`v${vi}:${f}`, cv]);
    }
  });

  // ── the ground cover: a bramble per tile (it rises out of the soil, so the
  // top rows show first), and the burnt tile's charred soil
  function bramble(w, seed) {
    const r = new Raster(w, 14), rn = rng(seed);
    for (let k = 0; k < Math.ceil(w / 5); k++) {
      let x = rn() * w; const dir = rn() < 0.5 ? -1 : 1, hgt = 7 + rn() * 6;
      for (let s = 0; s < hgt; s++) {
        x += dir * (0.2 + rn() * 0.4);
        const y = 13 - s, xi = Math.max(0, Math.min(w - 1, Math.round(x)));
        r.set(xi, y, WOOD[s < 3 ? 1 : 2]);
        if (s > 2 && rn() < 0.3) r.set(xi + (rn() < 0.5 ? -1 : 1), y, hex('#D8C8A0'));
        if (s > 3 && rn() < 0.45) { const lx = xi + (rn() < 0.5 ? -1 : 1); r.set(lx, y, LEAF[y < 7 ? 6 : 4]); r.set(lx, y + 1, LEAF[3]); }
      }
    }
    for (let x = 0; x < w; x++) r.set(x, 13, WOOD[0]);
    r.outline(OLc);
    return r.flush();
  }
  const burnt = (c) => {
    const cv = canvas(c.w, 4), ctx = cv.getContext('2d'), base = c.y + c.h;
    ctx.translate(-c.x, -(base - 3));
    for (let x = c.x; x < c.x + c.w; x++) for (let y = base - 3; y < base + 1; y++) dot(ctx, x, y, bayer(x, y) < 0.5 ? '#120C0A' : '#24180F');
    return cv;
  };

  const flat = (name, w, h, col) => { const cv = canvas(w, h), c = cv.getContext('2d'); c.fillStyle = col; c.fillRect(0, 0, w, h); return [name, cv]; };
  const bits = pieces([
    '#E8F5A0', '#FFD27A', '#FF9A2E', '#C8301E', '#7A1E0A',
    flat('dew', 1, 2, '#BFE8E0'), '#BFE8E0',
    flat('leafA', 2, 1, Lc[4]), flat('leafB', 1, 2, Lc[4]), flat('leafC', 2, 1, Wc[3]), flat('leafD', 1, 2, Wc[3]),
  ]);
  const vineAtlas = pieces(vineFrames);

  // ── the picture, back to front
  S.layer();
  S.image(bg.flush());
  const vineImgs = vines.map((v) => S.image(vineAtlas, v.x - Math.floor(VW / 2), v.y - 1));
  S.image(sh.flush()).setAlpha(0.55);
  const air = S.pool(bits);
  S.image(bush.flush(), 0, FLOOR - 48);
  const leaves = S.pool(bits);
  S.image(fl.flush(), 0, FLOOR);

  S.layer({ furn: true });
  const char = a.cover.map((c) => S.image(burnt(c), c.x, c.y + c.h - 3).setVisible(false));
  const embers = S.pool(bits);
  const brambles = a.cover.map((c, i) => S.image(bramble(c.w, 101 + i), c.x, 0).setVisible(false));

  const VN = vines.map((_, vi) => Array.from({ length: SWAY }, (__, f) => `v${vi}:${f}`));

  return {
    update(a) {
      const t = a.t;
      const sway = Math.floor(((((t * 0.02) % (Math.PI * 2)) / (Math.PI * 2)) * SWAY)) % SWAY;
      vineImgs.forEach((im, vi) => im.show(VN[vi][sway]));

      // Pollen drifting down the light shafts, and drops of dew from the roof.
      air.begin();
      shafts.forEach((s, i) => {
        for (let k = 0; k < 3; k++) {
          const span = FLOOR - s.y, yy = s.y + ((t * 0.08 + hash(i, k, 41) * 400) % span);
          const xx = s.x + (yy - s.y) * 0.28 + hash(i, k, 42) * s.w + Math.sin(t * 0.03 + k + i) * 2;
          if (((t >> 3) + k) % 4) air.put(xx, yy, '#E8F5A0');
        }
      });
      for (let k = 0; k < 3; k++) {
        const cyc = Math.floor((t + k * 53) / 160), p = (t + k * 53) % 160, x = Math.round(hash(k, cyc, 51) * viewW);
        if (p < 30) air.put(x, ROOF + 1, '#BFE8E0');
        else { const y = ROOF + 1 + 0.5 * 0.06 * (p - 30) ** 2; if (y < FLOOR) air.put(x, y, 'dew'); }
      }
      air.end();
      leaves.begin();
      for (let k = 0; k < 5; k++) {
        const y = ((t * 0.25 + hash(k, 0, 61) * 400) % 200) - 10, x = (hash(k, 1, 61) * viewW + Math.sin(t * 0.03 + k) * 8 + t * 0.05) % viewW;
        if (y > FLOOR) continue;
        const flip = ((t >> 4) + k) & 1;
        leaves.put(x, y, k % 2 ? (flip ? 'leafA' : 'leafB') : (flip ? 'leafC' : 'leafD'));
      }
      leaves.end();

      embers.begin();
      a.cover.forEach((c, i) => {
        const base = c.y + c.h;
        char[i].setVisible(c.burnt > 0);
        if (c.burnt > 0) {
          const fade = Math.min(1, c.burnt / 60);
          for (let k = 0; k < 6; k++) {
            const ex = c.x + 2 + Math.floor(hash(c.x, k, 71) * (c.w - 4)), ey = base - 1 - Math.floor(hash(c.x, k, 72) * 2);
            const s = Math.sin(t * 0.2 + k * 2.3);
            if (s > 0.6 - fade) embers.put(ex, ey, s > 0.85 ? '#FFD27A' : s > 0.6 ? '#FF9A2E' : '#C8301E');
            const ph = (t + k * 40) % 80;
            if (fade > 0.5 && ph < 24 && k % 2) embers.put(ex + Math.sin(ph * 0.3), ey - ph * 0.5, ph < 12 ? '#FF9A2E' : '#7A1E0A');
          }
        }
        // The bramble rises out of the soil: its top rows show first.
        const show = c.grow > 0.02;
        brambles[i].setVisible(show);
        if (show) {
          const h = Math.min(14, Math.round(c.grow * 13) + 1);
          brambles[i].setCrop(0, 0, c.w, h).setPosition(c.x, base - h);
        }
      });
      embers.end();
    },
  };
}
