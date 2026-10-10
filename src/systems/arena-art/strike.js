/**
 * STRIKE MAN — fighting. An underground fight pit: a crowd in the dark behind
 * chain-link, three hanging lamps over a stained mat, steel ceiling rails, and
 * the training bags that ride them.
 *
 * Drawn by Claude at the owner's request, 4 Oct 2026 (Claude Design, "Boss
 * Arenas 16-bit v2", room 2f), and approved by the owner the same day.
 *
 * The bags are leather in his two colours, taped at the top, hung on chains
 * from trolleys on the rails, and they swing when they turn round. A psychic
 * hit gives one a purple outline and haze. The bag's flashing top edge — the
 * warning that he is about to punch it — is the game's own and is kept.
 */
import { H, OLc, hex, css, ramp, bayer, hash, noise1, noise2, pick, Raster, rows, vcyl, dot, frames, pieces, canvas } from './pixels.js';

/** The longest chain the art keeps ready, in pixels. */
const CHAIN_MAX = 200;

export default function strike(S, a, viewW) {
  const FLOOR = a.floorY;
  const LEA = ramp(['#2A0E06', '#4A1A0C', '#7C2D12', '#A84420', '#EA6A34']);
  const MAT = ramp(['#1A0E0C', '#2A1814', '#3A2420', '#4E3028', '#6A4234']);
  const STL = ramp(['#1E2228', '#2A3038', '#3A424C', '#5A626E', '#8A929C']);
  const Sc = STL.map(css);
  const lamps = [0.22, 0.5, 0.78].map((f) => Math.round(viewW * f));

  // ── the dark beyond the cage, the crowd in it, the chain-link, the lamps' light
  const bg = new Raster(viewW, FLOOR);
  rows(bg, 0, 0, viewW, FLOOR, [[0, '#0A080C'], [0.45, '#120E14'], [1, '#1C1418']]);
  for (let y = 60; y < FLOOR; y++) for (let x = 0; x < viewW; x++) {
    const n = noise2(x * 0.08, y * 0.05, 5);
    if (n > 0.62 && bayer(x, y) < (n - 0.62) * 2) bg.set(x, y, hex('#24181E'));
  }
  const head = (() => {
    const r = new Raster(11, 10), c1 = hex('#1E1620'), c2 = hex('#2A1F2C');
    for (let y = 0; y < 10; y++) for (let x = 0; x < 11; x++) {
      const inHead = Math.hypot(x - 5, y - 2.5) < 2.8, inBody = y >= 5 && Math.abs(x - 5) < 5 - (y === 5 ? 1 : 0);
      if (inHead || inBody) r.set(x, y, x < 4 && y < 6 ? c2 : c1);
    }
    return r.flush();
  })();
  const crowd = [];
  for (let row = 0; row < 2; row++) for (let x = 4 + row * 6; x < viewW; x += 13) crowd.push({ x: x + Math.round(hash(x, row, 3) * 4), y: 116 + row * 12, ph: hash(x, row, 4) * 6 });
  const fence = new Raster(viewW, FLOOR), wire = hex('#3A3440'), wireL = hex('#5E5466'), knot = hex('#7A7084');
  for (let y = 44; y < FLOOR; y++) for (let x = 0; x < viewW; x++) {
    const p = (x + y) % 12, q = (((x - y) % 12) + 12) % 12;
    if (p === 0 && q === 0) fence.set(x, y, knot);
    else if (p === 0) fence.set(x, y, y & 1 ? wireL : wire);
    else if (q === 0) fence.set(x, y, wire);
  }
  for (let px = 0; px < viewW; px += 120) for (let y = 40; y < FLOOR; y++) {
    fence.set(px, y, STL[0]); fence.set(px + 1, y, STL[4]); fence.set(px + 2, y, STL[3]); fence.set(px + 3, y, STL[1]);
  }
  for (let x = 0; x < viewW; x++) { fence.set(x, 40, STL[4]); fence.set(x, 41, STL[2]); fence.set(x, 42, STL[0]); }
  const cone = new Raster(viewW, FLOOR), cc = hex('#EA6A34');
  for (const lx of lamps) for (let y = 32; y < FLOOR; y++) {
    const k = (y - 32) / (FLOOR - 32), hw = 11 + k * 46;
    for (let x = Math.round(lx - hw); x <= Math.round(lx + hw); x++) {
      const edge = 1 - Math.abs(x - lx) / hw;
      if (bayer(x, y) < 0.16 * edge * (1 - k * 0.45)) cone.set(x, y, cc);
    }
  }
  // ── the stained mat, brightest under each lamp
  const fl = new Raster(viewW, H - FLOOR);
  for (let y = 0; y < H - FLOOR; y++) for (let x = 0; x < viewW; x++) {
    const pool = Math.max(0, ...lamps.map((lx) => 1 - Math.abs(x - lx) / 60)) * Math.max(0, 1 - y / 14);
    let c;
    if (y === 0) c = pick(MAT, 0.7 + pool * 0.3, x, y);
    else if (y >= 30) c = y === 30 ? MAT[0] : y & 1 ? MAT[1] : MAT[0];
    else {
      const stain = noise2(x * 0.09, y * 0.3, 7) > 0.66 || noise2(x * 0.2, y * 0.5, 8) > 0.74;
      c = stain ? (bayer(x, y) < 0.5 ? LEA[0] : MAT[0]) : pick(MAT, 0.4 + pool * 0.45 - y * 0.008 + (noise1(x * 0.3, 9) - 0.5) * 0.1, x, y);
      if (y === 6 && x % 7 < 4) c = hex('#A84420');
    }
    fl.set(x, y, c);
  }
  // ── a lamp: cord, steel cone shade, lit rim — at each of its three sway positions
  const shadeCv = (() => {
    const r = new Raster(30, 16);
    for (let y = 0; y < 13; y++) {
      const hw = y < 2 ? 2 : 3 + Math.pow((y - 2) / 10, 1.25) * 10.5;
      for (let x = Math.round(15 - hw); x < Math.round(15 + hw); x++) {
        const u = (x - (15 - hw)) / (2 * hw);
        r.set(x, y + 1, y === 12 ? STL[4] : y === 11 ? STL[0] : pick(STL, 0.95 - u * 0.85 + (y < 4 ? 0.1 : 0), x, y));
      }
    }
    r.outline(OLc);
    return r.flush();
  })();
  const LX = 17;
  const lampSheet = frames(3, 0, 0, 34, 34, (ctx, k) => {
    const sw = k - 1;
    for (let y = 0; y < 18; y++) dot(ctx, LX + Math.round((sw * y) / 18), y, (y >> 1) & 1 ? Sc[2] : Sc[1]);
    ctx.drawImage(shadeCv, LX + sw - 15, 17);
    ctx.fillStyle = '#FFD08A'; ctx.fillRect(LX + sw - 10, 31, 20, 1);
    ctx.fillStyle = '#FFF2D0'; ctx.fillRect(LX + sw - 4, 32, 8, 1);
  });
  // ── the ceiling rails and their hangers
  const railCv = canvas(viewW, FLOOR), rc = railCv.getContext('2d');
  for (const rl of a.rails) {
    rc.fillStyle = Sc[4]; rc.fillRect(0, rl.y - 1, viewW, 1);
    rc.fillStyle = Sc[2]; rc.fillRect(0, rl.y, viewW, 1);
    rc.fillStyle = Sc[0]; rc.fillRect(0, rl.y + 1, viewW, 1);
    rc.fillStyle = Sc[1];
    for (let x = 30 + (rl.y % 40); x < viewW; x += 96) rc.fillRect(x, 0, 1, rl.y - 1);
  }

  // ── the bag, its psychic look, its chain at every swing, its trolley
  const bag = new Raster(16, 42);
  vcyl(bag, 1, 1, 14, 40, LEA);
  for (let x = 1; x < 15; x++) {
    bag.set(x, 1, LEA[1]); bag.set(x, 40, LEA[0]); bag.set(x, 39, LEA[1]);
    for (const y of [4, 5]) bag.set(x, y, pick(ramp(['#8A8478', '#C8C0B0', '#E8E2D4']), x < 5 ? 0.9 : x > 10 ? 0.2 : 0.6, x, y));
    for (const y of [20, 21]) bag.set(x, y, pick(ramp(['#7C2D12', '#EA6A34', '#FFB070']), x < 5 ? 0.8 : x > 10 ? 0.15 : 0.5, x, y));
  }
  const bagIn = bag.flush();
  const psiBag = canvas(16, 42), pc = psiBag.getContext('2d');
  pc.drawImage(bagIn, 0, 0);
  pc.fillStyle = '#B86BFF';
  pc.fillRect(0, 0, 1, 42); pc.fillRect(15, 0, 1, 42); pc.fillRect(1, 0, 14, 1); pc.fillRect(1, 41, 14, 1);
  bag.outline(OLc);
  const bagCv = bag.flush();
  // The haze around a lifted bag, at each of the dither's 16 phases.
  const haze = frames(16, 0, 0, 22, 48, (ctx, f) => {
    const px = f >> 2, py = f & 3;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 22; x++) if (bayer(x + px, y + py) < 0.12) dot(ctx, x, y, '#6B2CD0');
  });
  // The chain hangs from the trolley to the bag's top; at its usual length it
  // is drawn at every swing, otherwise straight and cut to length.
  const chainPx = (s) => (s % 3 === 0 ? Sc[4] : s % 3 === 1 ? Sc[2] : Sc[0]);
  const N0 = 105, chainOff = [];
  for (let off = -4; off <= 4; off++) {
    const cv = canvas(9, N0), ctx = cv.getContext('2d');
    for (let s = 0; s < N0; s++) dot(ctx, 4 + Math.round((off * s) / N0), s, chainPx(s));
    chainOff.push([`chain${off}`, cv]);
  }
  const straight = canvas(1, CHAIN_MAX), stc = straight.getContext('2d');
  for (let s = 0; s < CHAIN_MAX; s++) dot(stc, 0, s, chainPx(s));
  const trolley = canvas(7, 3), tc = trolley.getContext('2d');
  tc.fillStyle = Sc[3]; tc.fillRect(0, 0, 7, 2);
  dot(tc, 1, 2, Sc[0]); dot(tc, 5, 2, Sc[0]);
  const flat = (name, w, h, col) => { const cv = canvas(w, h), c = cv.getContext('2d'); c.fillStyle = col; c.fillRect(0, 0, w, h); return [name, cv]; };
  const bits = pieces([
    '#FFF6E0', '#E8D8C0', flat('flashA', 3, 3, '#FFFFFF'), flat('flashB', 3, 3, '#C8C0B0'),
    ['head', head], ['bag', bagCv], ['psiBag', psiBag], ['trolley', trolley], ...chainOff,
    flat('warn', 14, 2, '#F5D328'),
  ]);

  // ── the picture, back to front
  S.layer();
  S.image(bg.flush());
  const people = S.pool(bits);
  S.image(fence.flush());
  S.image(cone.flush()).setAlpha(0.42);
  const lampImgs = lamps.map((lx) => S.image(lampSheet, lx - LX, 0));
  const dust = S.pool(bits);
  S.image(fl.flush(), 0, FLOOR);

  S.layer({ furn: true });
  S.image(railCv);

  S.layer();
  const chains = S.crops({ cv: straight, cells: [[0, 0, 1, CHAIN_MAX]] });
  const hazes = S.crops(haze);
  const bags = S.pool(bits);

  // The swing, which only the picture keeps: a kick when the bag turns at a
  // wall, then a damped pendulum, stepped once per game step.
  const swing = new Map();
  let lastT = a.t;

  return {
    hazards: ['bag'],

    update(a) {
      const t = a.t, steps = Math.max(0, Math.min(8, t - lastT)); lastT = t;

      people.begin();
      for (const c of crowd) people.put(c.x, c.y + (Math.sin(t * 0.11 + c.ph) > 0.55 ? -1 : 0), 'head');
      // The odd camera flash in the crowd.
      const fk = Math.floor(t / 23), fp = t % 23;
      if (hash(fk, 0, 81) > 0.55 && fp < 4) {
        const c = crowd[Math.floor(hash(fk, 1, 81) * crowd.length)];
        people.put(c.x + 4, c.y + 2, fp < 2 ? 'flashA' : 'flashB');
        if (fp < 2) { people.put(c.x + 5, c.y, '#FFF6E0'); people.put(c.x + 5, c.y + 6, '#FFF6E0'); people.put(c.x + 2, c.y + 3, '#FFF6E0'); people.put(c.x + 8, c.y + 3, '#FFF6E0'); }
      }
      people.end();

      dust.begin();
      lamps.forEach((lx, i) => {
        const sw = Math.round(Math.sin(t * 0.017 + i * 2) * 1.2);
        lampImgs[i].show(sw + 1);
        // Chalk dust floating in the light.
        for (let k = 0; k < 6; k++) {
          const y = 35 + ((t * (0.05 + hash(i, k, 91) * 0.05) + hash(i, k, 92) * 145) % 145), spread = 11 + ((y - 32) / 152) * 46;
          const x = lx + (hash(i, k, 93) - 0.5) * 2 * spread + Math.sin(t * 0.02 + k) * 3;
          if ((t + k * 7) % 40 < 30) dust.put(x, y, '#E8D8C0');
        }
      });
      dust.end();

      chains.begin(); hazes.begin(); bags.begin();
      const live = new Set();
      for (const b of a.hazards) {
        if (b.kind !== 'bag') continue;
        live.add(b);
        let s = swing.get(b);
        if (!s) swing.set(b, s = { ang: 0, angV: 0, vx: b.vx });
        for (let k = 0; k < steps; k++) {
          if (Math.sign(b.vx) !== Math.sign(s.vx) && s.vx) s.angV += s.vx * 0.5;
          s.vx = b.vx;
          s.angV += -0.025 * s.ang - 0.03 * s.angV; s.ang += s.angV;
        }
        const onRail = b.mode === 'swing' || b.mode === 'shield';
        const off = onRail ? Math.max(-4, Math.min(4, Math.round(s.ang))) : 0;
        const tx = Math.round(b.x) + 7, bx = Math.round(b.x) + off, by = Math.round(b.y);
        if (onRail) {
          bags.put(tx - 3, b.railY - 3, 'trolley');
          const n = by - (b.railY + 1);
          if (n === N0) bags.put(tx - 4, b.railY + 1, `chain${off}`);
          else if (n > 0) chains.put(tx, b.railY + 1, 0, 0, 0, 1, Math.min(n, CHAIN_MAX));
        }
        if (b.outline) {
          // A psychic hit: purple haze round it and a purple outline.
          hazes.put(bx - 3, by - 3, (((bx - 3) & 3) << 2) | ((by - 3 + (t >> 2)) & 3), 0, 0, 22, 48);
          bags.put(bx - 1, by - 1, 'psiBag');
        } else bags.put(bx - 1, by - 1, 'bag');
        // The game's own warning that he is about to punch it off its rail.
        if (b.warn && Math.floor((b.stood || 0) / 5) % 2 === 0) bags.put(bx, by - 2, 'warn', 0.9);
      }
      for (const b of swing.keys()) if (!live.has(b)) swing.delete(b);
      chains.end(); hazes.end(); bags.end();
    },
  };
}
