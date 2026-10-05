/**
 * BLAZE MAN — fire. A smoking volcano under a red sky, a cracked basalt floor,
 * and the room's own platforms, Hot ground, lava flood and falling rocks.
 *
 * Drawn by Claude at the owner's request, 4 Oct 2026 (Claude Design, "Boss
 * Arenas 16-bit v2", room 2b), and approved by the owner the same day.
 *
 * Lava bombs, ash and the deep cracks that glow and fade were added in that
 * pass. The cracks sit well below the surface you walk on, so they cannot be
 * mistaken for Hot ground.
 */
import {
  H, TAU, OLc, hex, css, lerp, snap5, ramp, bayer, hash, rng, noise1, noise2,
  canvas, pick, Raster, hdma, R, dot, checker, rot90, dotted, frames, pieces, named,
} from './pixels.js';

/** Rows of the backdrop that shimmer in the heat, from here to the floor. */
const SHIMMER_TOP = 110;
/** Lava-surface frames: one per two steps across its ~180-step cycle. */
const SURF_FRAMES = 90;
/** The floor cracks' slow breath, as this many frames round one cycle. */
const CRACK_FRAMES = 32;

export default function blaze(S, a, viewW) {
  const FLOOR = a.floorY;
  const ROCK = ramp(['#0E080A', '#160C0E', '#1E1012', '#281618', '#341C1C', '#442424', '#5A2E28', '#7A3E30']);
  const GLOW = ramp(['#4A1006', '#7A1E0A', '#B0300E', '#E0501A', '#FF7E22', '#FFB43C', '#FFE08A', '#FFF6D0']);
  const IRON = ramp(['#1C1C22', '#2A2A30', '#45454E', '#6A6A74', '#9A9AA4']);
  const Gc = GLOW.map(css), Rc = ROCK.map(css), Ic = IRON.map(css);
  const bx = Math.round(viewW / 2), topY = 54;

  // ── the sky, with two bands of smoke
  const skyRows = hdma(FLOOR, [[0, '#0A0306'], [0.3, '#1A070A'], [0.6, '#33100E'], [0.85, '#4E1810'], [1, '#5E1E12']]);
  const smokeC = hex('#120608');
  const sky = new Raster(viewW, FLOOR);
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < viewW; x++) {
    const band = Math.exp(-((y - 24) ** 2) / 260) * 0.95 + Math.exp(-((y - 66) ** 2) / 420) * 0.55;
    const s = (noise2(x * 0.02, y * 0.07, 7) * 0.7 + noise2(x * 0.06, y * 0.15, 9) * 0.3) * band;
    sky.set(x, y, s > 0.3 + bayer(x, y) * 0.28 ? snap5(lerp(skyRows[y], smokeC, 0.6)) : skyRows[y]);
  }
  // ── the ebb: the sky's red pixels pulsing before the flood
  const ebb = new Raster(viewW, FLOOR);
  for (let y = 30; y < FLOOR; y++) for (let x = 0; x < viewW; x++) if (bayer(x, y) < 0.5) ebb.set(x, y, pick([GLOW[0], GLOW[1], GLOW[2]], (y - 30) / (FLOOR - 30), x, y));
  // ── far hills and the volcano
  const mount = new Raster(viewW, FLOOR);
  for (let x = 0; x < viewW; x++) {
    const h = Math.round(148 + 9 * Math.sin(x * 0.021 + 1.3) + 6 * Math.sin(x * 0.057) + 4 * (noise1(x * 0.25, 4) - 0.5));
    for (let y = h; y < FLOOR; y++) mount.set(x, y, y === h ? ROCK[3] : pick([ROCK[1], ROCK[2]], 0.35 + 0.3 * noise2(x * 0.2, y * 0.2, 5), x, y));
  }
  const hwAt = (y) => 16 + 80 * Math.pow(Math.max(0, (y - topY) / (FLOOR - topY)), 1.25);
  for (let y = topY - 1; y < FLOOR; y++) {
    const hw = hwAt(y);
    for (let x = Math.floor(bx - hw - 3); x <= Math.ceil(bx + hw + 3); x++) {
      const dx = x + 0.5 - bx, ad = Math.abs(dx);
      const hwj = hw + (noise1(y * 0.35, dx < 0 ? 11 : 12) - 0.5) * 3.2;
      if (ad > hwj) continue;
      const craterTop = topY + (ad < 14 ? 3.5 * (1 - (dx / 14) ** 2) : 0);
      if (y < craterTop) continue;
      let v = 0.24 + (noise2(dx * 0.22, y * 0.035, 3) - 0.5) * 0.18;
      v += Math.max(0, 1 - (y - topY) / 46) * 0.3 * (1 - ad / (hwj + 1));
      if (hwj - ad < 1.2) v += 0.24;
      if (y - craterTop < 1) v += 0.2;
      mount.set(x, y, pick(ROCK, v, x, y));
    }
  }
  // The ebb is ADDED to the sky and the mountain covers it, so it is cut out of
  // the mountain here and can then sit on top of both as one overlay.
  for (let i = 3; i < ebb.d.length; i += 4) if (mount.d[i]) ebb.d[i] = 0;
  const glow = new Raster(viewW, FLOOR);
  for (let y = 18; y < 112; y++) for (let x = bx - 52; x < bx + 52; x++) {
    const d = Math.hypot((x + 0.5 - bx) / 38, (y + 0.5 - (topY + 2)) / 22);
    if (d >= 1) continue;
    const i = Math.pow(1 - d, 1.7);
    if (i < 0.08 + bayer(x, y) * 0.22) continue;
    glow.set(x, y, pick([GLOW[0], GLOW[1], GLOW[2], GLOW[3]], i, x, y));
  }
  const skyMount = canvas(viewW, FLOOR), sm = skyMount.getContext('2d');
  sm.drawImage(sky.flush(), 0, 0); sm.drawImage(mount.flush(), 0, 0);
  // The heat shimmer moves single rows of it; each is its own named frame.
  const rowsSrc = [];
  for (let y = SHIMMER_TOP; y < FLOOR; y++) rowsSrc.push([`r${y}`, 0, y, viewW, 1]);
  const skyMountSrc = named(skyMount, rowsSrc);

  // ── lava rivers running down the cone
  const rivs = [], rr = rng(31);
  for (const [sx0, len] of [[-9, 64], [3, 104], [10, 50], [-4, 86]]) {
    const pts = [], drift = Math.sign(sx0) * 0.28;
    let x = bx + sx0, y = topY + 4;
    while (y < topY + len) {
      const lim = hwAt(y) - 3;
      x = Math.max(bx - lim, Math.min(bx + lim, x));
      pts.push([Math.round(x), y]); y++; x += drift + (rr() - 0.5) * 0.9;
    }
    rivs.push(pts);
  }
  const all = rivs.flat();
  const rx0 = Math.min(...all.map((p) => p[0])), ry0 = Math.min(...all.map((p) => p[1]));
  const rivers = frames(24, rx0, ry0, Math.max(...all.map((p) => p[0])) - rx0 + 1, Math.max(...all.map((p) => p[1])) - ry0 + 1, (ctx, f) => {
    const flow = f % 12, boost = f >= 12 ? 2 : 0;
    for (const pts of rivs) for (const [x, y] of pts) dot(ctx, x, y, Gc[Math.min(7, [0, 1, 2, 3, 2, 1][((((y - flow) >> 1) % 6) + 6) % 6] + boost)]);
  });
  // ── the crater's lip, its colour stepping round every 8 frames
  const rim = frames(4, bx - 10, topY, 21, 5, (ctx, k) => {
    for (let dx = -10; dx <= 10; dx++) dot(ctx, bx + dx, Math.round(topY + 3.5 * (1 - (dx / 14) ** 2)), (dx + k) & 3 ? Gc[5] : Gc[6]);
  });
  // ── smoke puffs, one per size
  const SM = ramp(['#120707', '#1C0B0B', '#281110', '#3A1712', '#521E14']);
  const puffs = [];
  for (let r = 3; r <= 11; r++) {
    const p = new Raster(r * 2 + 2, r * 2 + 2);
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const dx = x + 0.5 - (r + 1), dy = y + 0.5 - (r + 1), d = Math.hypot(dx, dy);
      if (d > r * (0.84 + 0.16 * noise1(Math.atan2(dy, dx) * 2 + r, 21))) continue;
      p.set(x, y, pick(SM, 0.35 + (dy / r) * 0.35 + (noise2(x * 0.3, y * 0.3, r) - 0.5) * 0.2, x, y));
    }
    puffs.push(p.flush());
  }

  // ── the floor, and the deep cracks that breathe
  const hotCracks = [];
  const floor = new Raster(viewW, H - FLOOR);
  for (let y = 0; y < H - FLOOR; y++) for (let x = 0; x < viewW; x++) {
    let c;
    if (y === 0) c = ROCK[6]; else if (y === 1) c = ROCK[5]; else if (y === 2) c = ROCK[4];
    else {
      const jx = x + (noise1(y * 0.12, 2) - 0.5) * 8, col = Math.floor(jx / 17), lx = jx - col * 17;
      const hc = 6 + Math.floor(hash(col, 0, 3) * 22);
      const crack = lx < 1 || y === hc || y === hc + 11;
      const v = 0.36 - (y / 40) * 0.22 + (noise2(x * 0.15, y * 0.15, 1) - 0.5) * 0.12;
      const hot = crack && y > 12 && hash(col, y >> 3, 4) > 0.78;
      if (hot) hotCracks.push(x, y);
      c = crack ? (hot ? GLOW[0] : ROCK[0]) : pick(ROCK, lx < 2 ? v + 0.08 : v, x, y);
    }
    floor.set(x, y, c);
  }

  // The cracks' glow is a wave rolling along the floor, so the whole set is
  // painted at 32 points round one breath and played back by phase.
  const cracks = frames(CRACK_FRAMES, 0, FLOOR + 13, viewW, H - FLOOR - 13, (ctx, k) => {
    const ph = (k / CRACK_FRAMES) * TAU;
    for (let i = 0; i < hotCracks.length; i += 2) {
      const x = hotCracks[i], y = hotCracks[i + 1], w = Math.sin(ph - x * 0.05 + y * 0.2);
      if (w > 0.2) dot(ctx, x, FLOOR + y, w > 0.75 ? Gc[2] : Gc[1]);
    }
  });

  // ── platforms: solid, about-to-go ghost, Hot (two frames), phased out
  function slab(w, shape, cs, hot) {
    const r = new Raster(w, 9);
    for (let x = 1; x < w - 1; x++) {
      const extra = x > 2 && x < w - 3 ? Math.floor(noise1(x * 0.45, shape) * 3) : 0;
      for (let y = 1; y <= 3 + extra; y++) {
        let c;
        if (hot) c = y === 1 ? (hash(x, 1, cs) > 0.5 ? GLOW[6] : GLOW[5]) : y === 2 ? GLOW[3] : y === 3 ? hex('#E11416') : ROCK[2];
        else c = y === 1 ? (hash(x, 1, cs) > 0.86 ? ROCK[7] : ROCK[6]) : y === 2 ? pick([ROCK[4], ROCK[5]], 0.5 + (hash(x, 2, cs) - 0.5) * 0.7, x, y) : y === 3 ? (hash(x, 3, cs) > 0.8 ? ROCK[2] : ROCK[3]) : ROCK[2];
        r.set(x, y, c);
      }
    }
    r.outline(OLc);
    return r.flush();
  }
  const PLW = 44;
  const slabN = slab(PLW, 3, 5, false), slabs = [slabN, checker(slabN), slab(PLW, 3, 5, true), slab(PLW, 3, 9, true)];
  const slabSheet = frames(5, 0, 0, PLW, 9, (ctx, k) => (k < 4 ? ctx.drawImage(slabs[k], 0, 0) : dotted(ctx, 0, 0, PLW, 5, '#6A2A1A')));
  // His own lift (layer 3), and the chain it hangs from — painted once, tall
  // enough for any height, with the links counted up from the bottom so they
  // ride with the lift.
  const lift = new Raster(32, 6);
  for (let x = 1; x < 31; x++) for (let y = 1; y <= 3; y++) {
    const band = x >= 9 && x <= 22;
    lift.set(x, y, y === 1 ? (band ? hex('#FF5A4A') : IRON[4]) : y === 2 ? (band ? hex('#E11416') : IRON[3]) : band ? hex('#8A0C0E') : IRON[2]);
  }
  for (const x of [3, 28]) { lift.set(x, 2, IRON[4]); lift.set(x, 3, IRON[1]); }
  lift.outline(OLc);
  const CH = FLOOR, chain = canvas(3, CH), cc = chain.getContext('2d');
  for (let r = 0; r < CH; r++) {
    const m = (CH - r) % 4;
    if (m === 0) dot(cc, 1, r, Ic[4]); else if (m === 1) dot(cc, 1, r, Ic[3]);
    else { dot(cc, 0, r, Ic[2]); dot(cc, 2, r, m === 2 ? Ic[3] : Ic[1]); }
  }

  // ── falling rocks (each size, four turns) and the flames riding them
  function rockSpr(n, seed) {
    const s = n + 2, c = s / 2, r = new Raster(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
      const rad = (n / 2 - 0.4) * (0.8 + 0.2 * noise1((Math.atan2(dy, dx) + Math.PI) * 1.9, seed));
      if (d > rad) continue;
      const lit = -(dx * 0.6 + dy * 0.8) / rad;
      let col = pick([ROCK[2], ROCK[3], ROCK[4], ROCK[5], ROCK[6]], 0.45 + lit * 0.35 + (hash(x, y, seed) - 0.5) * 0.15, x, y);
      if (Math.abs(noise2(x * 0.55, y * 0.55, seed + 3) - 0.5) < 0.07 && d < rad - 1) col = GLOW[3];
      if (d < rad * 0.38 && hash(x, y, seed + 1) > 0.45) col = GLOW[5];
      r.set(x, y, col);
    }
    r.outline(OLc);
    const cv = r.flush();
    return [0, 1, 2, 3].map((k) => rot90(cv, k));
  }
  // The sizes the hazard drops (bossFights BLAZE_HAZ.size); any other size
  // borrows the nearer of the two rather than going unseen.
  const ROCKS = { 12: rockSpr(12, 41), 15: rockSpr(15, 43) };
  const rockOf = (w) => (w > 13 ? 15 : 12);
  const flames = [0, 1, 2].map((f) => {
    const r = new Raster(12, 12);
    for (let y = 0; y < 12; y++) {
      const k = (11 - y) / 11, wob = Math.sin(y * 0.9 + f * 2.1) * 1.1;
      const hw = 4.6 * Math.sin(Math.PI * (1 - k * 0.92) * 0.5 + 0.3) * (1 - k * 0.75);
      for (let x = 0; x < 12; x++) {
        const q = Math.abs(x + 0.5 - (6 + wob * k)) / Math.max(0.5, hw);
        if (q > 1 || (y < 3 && hash(x, y, f + 40) > 0.6)) continue;
        const heat = (1 - q) * 0.7 + (1 - k) * 0.5;
        r.set(x, y, heat > 0.95 ? GLOW[7] : heat > 0.72 ? GLOW[6] : heat > 0.5 ? GLOW[5] : heat > 0.32 ? GLOW[4] : GLOW[3]);
      }
    }
    return r.flush();
  });

  // ── the lava flood: a repeating body, and its surface over one ~180-step cycle
  const lava = new Raster(64, 30);
  for (let y = 0; y < 30; y++) for (let x = 0; x < 64; x++) {
    const u = (x / 64) * TAU;
    const cr = 0.5 + 0.22 * Math.sin(u * 2 + y * 0.45) + 0.2 * Math.sin(u * 5 - y * 0.7 + 1.3) + 0.12 * Math.sin(u * 3 + y * 1.1 + 2);
    const v = 0.85 - (y / 29) * 0.7;
    lava.set(x, y, cr > 0.8 ? ROCK[4] : cr > 0.74 ? GLOW[5] : pick([GLOW[1], GLOW[2], GLOW[3], GLOW[4]], v, x, y));
  }
  const surfY = (x, top, t) => Math.round(top + Math.sin(x * 0.19 + t * 0.07) * 0.8 + Math.sin(x * 0.05 - t * 0.035) * 0.7);
  const surface = frames(SURF_FRAMES, 0, 0, viewW, 8, (ctx, k) => {
    const t = k * 2;
    for (let x = 0; x < viewW; x++) {
      const sy = surfY(x, 2, t);
      dot(ctx, x, sy, ((x + ((t * 0.4) | 0)) >> 3) % 3 === 0 ? Gc[7] : Gc[6]);
      R(ctx, x, sy + 1, 1, 3, Gc[5]);
    }
  });

  // ── Hot ground, as single-row strips: every dither level, at each of the
  // dither's four row phases, and (for the bright top row) each step of its
  // five-step shimmer. A patch shows the strips it needs, cut to its width.
  const level = (v) => Math.max(0, Math.min(16, Math.ceil(16 * v - 0.5)));
  const TOPS = 17 * 4 * 5;
  const strips = frames(TOPS + 17 * 4, 0, 0, viewW, 1, (ctx, f) => {
    const top = f < TOPS, g = top ? f : f - TOPS;
    const sp = top ? g % 5 : 0, yp = top ? Math.floor(g / 5) % 4 : g & 3, L = top ? Math.floor(g / 20) : g >> 2;
    for (let x = 0; x < viewW; x++) {
      if (bayer(x, yp) * 16 - 0.5 >= L) continue;
      dot(ctx, x, 0, top ? ((x + sp) % 5 ? '#FF9A2E' : '#FFD27A') : '#E11416');
    }
  });
  const stripOf = (top, L, y, sp) => (top ? (L * 4 + (y & 3)) * 5 + sp : TOPS + L * 4 + (y & 3));

  const bits = pieces([
    Gc[1], Gc[2], Gc[3], Gc[4], Gc[5], Gc[6], Gc[7], '#4E3A38', '#7A6460',
    ...[Gc[6], Gc[5], Gc[3], Rc[5]].map((c) => [`${c}:2`, (() => { const cv = canvas(2, 2), x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 2, 2); return cv; })()]),
    ...puffs.map((p, i) => [`puff${i}`, p]),
    ...flames.map((f, i) => [`flame${i}`, f]),
    ...Object.entries(ROCKS).flatMap(([n, list]) => list.map((cv, k) => [`rock${n}:${k}`, cv])),
  ]);

  // ── the picture, back to front
  S.layer({ far: true });
  S.image(skyMountSrc);
  const shimmer = S.pool(skyMountSrc);
  // Cropped to where they have pixels, so a phone does not paint empty space.
  const ebbImg = S.image(ebb.flush()).setBlendMode('ADD').setCrop(0, 30, viewW, FLOOR - 30);
  const glowImg = S.image(glow.flush()).setBlendMode('ADD').setCrop(bx - 52, 18, 104, 94);
  const rimImg = S.image(rim);
  const riverImg = S.image(rivers);
  const air = S.pool(bits);

  S.layer();
  S.image(floor.flush(), 0, FLOOR);
  const crackImg = S.image(cracks);

  S.layer({ furn: true });
  const L3 = a.platforms.find((pl) => pl.lift);
  const chains = L3 ? [4, 27].map(() => S.image(chain)) : [];
  if (L3) for (const cxo of [4, 27]) S.rect(L3.x + cxo - 2, 0, 5, 2, IRON[2][0] << 16 | IRON[2][1] << 8 | IRON[2][2]);
  const liftImg = L3 ? S.image(lift.flush()) : null;
  const slabsOf = a.platforms.filter((pl) => !pl.lift);
  const plats = slabsOf.map(() => S.image(slabSheet));
  const fire = S.pool(bits);
  const hot = S.crops(strips);
  const sparks = S.pool(bits);
  const lavaBody = S.tile(lava.flush(), 0, 0, viewW, 30);
  const lavaTop = S.image(surface);
  const bubbles = S.pool(bits);

  S.layer();
  const rocks = S.pool(bits);

  // Names, made once rather than every frame.
  const ROWN = [], PUFFN = puffs.map((_, i) => `puff${i}`), FLAMEN = flames.map((_, i) => `flame${i}`);
  for (let y = SHIMMER_TOP; y < FLOOR; y++) ROWN[y] = `r${y}`;
  const ROCKN = { 12: [0, 1, 2, 3].map((k) => `rock12:${k}`), 15: [0, 1, 2, 3].map((k) => `rock15:${k}`) };
  const BOMB = `${Gc[6]}:2`, DEB = [`${Gc[5]}:2`, `${Gc[3]}:2`, `${Rc[5]}:2`];

  // Things only the picture keeps: the debris a rock breaks into.
  const debris = [];
  let seen = new Map(), next = new Map(), lastT = a.t;
  const bombs = new Map();

  return {
    // Rocks and Hot ground are drawn here, in the room's own look.
    hazards: ['rock'],
    patches: ['hot'],

    update(a) {
      const t = a.t, q = a.liquid, flooded = q.h > 0.5;
      const eb = Math.round(a.ebb * 4) / 4;
      const surging = flooded || a.ebb > 0.05;
      const steps = Math.max(0, Math.min(8, t - lastT)); lastT = t;

      ebbImg.setVisible(eb > 0).setAlpha(0.6 * eb);
      glowImg.setAlpha(0.5 + 0.45 * eb);
      rimImg.show((t >> 3) & 3);
      const flow = Math.floor(t * 0.4);
      riverImg.show(((flow % 12) + 12) % 12 + (eb > 0.5 ? 12 : 0));

      // The heat shimmer: rows near the floor slide a pixel or two.
      shimmer.begin();
      const amp = surging ? 1.6 : 0.9;
      for (let y = SHIMMER_TOP; y < FLOOR; y++) {
        // Every row, even when it does not move, so each piece keeps its row.
        shimmer.put(Math.round(Math.sin(y * 0.42 + t * 0.13) * amp * ((y - SHIMMER_TOP) / 74)), y, ROWN[y]);
      }
      shimmer.end();

      air.begin();
      for (let k = 0; k < 7; k++) {
        const ph = ((t * 0.22 + k * 26) % 182) / 182;
        if (ph > 0.92) continue;
        const i = Math.min(8, Math.round(ph * 8)), s = puffs[i];
        air.put(bx + ph * 34 + Math.sin(ph * 6 + k) * 3 - s.width / 2, topY - 3 - ph * 64 - s.height / 2, PUFFN[i]);
      }
      const ne = flooded ? 40 : 26;
      for (let k = 0; k < ne; k++) {
        const ph = (t * (0.3 + hash(k, 0, 51) * 0.35) + hash(k, 1, 51) * 400) % 200;
        const x = (hash(k, 2, 51) * viewW + Math.sin(ph * 0.06 + k) * 5 + ph * 0.12) % viewW;
        air.put(x, FLOOR - 2 - ph * 0.65, ph > 150 ? Gc[2] : ((t + k * 3) >> 2) & 1 ? Gc[5] : Gc[4]);
      }
      // Lava bombs thrown from the crater, landing on the flanks.
      for (let k = 0; k < 3; k++) {
        const per = surging ? 150 : 190, cyc = Math.floor((t + k * 57) / per), p = (t + k * 57) % per;
        const vx = (hash(k, cyc, 81) - 0.5) * 0.7, vy = -1.0 - hash(k, cyc, 82) * 0.4, gr = 0.032;
        const at = (s) => [bx + vx * s, topY + vy * s + 0.5 * gr * s * s];
        const key = `${k}:${cyc}:${per}`;
        let land = bombs.get(key);
        if (land === undefined) {
          land = per;
          for (let s = 12; s < per; s++) { const [xx, yy] = at(s); if (yy > topY + 6 && Math.abs(xx - bx) < hwAt(yy) - 1) { land = s; break; } }
          if (bombs.size > 12) bombs.clear();
          bombs.set(key, land);
        }
        if (p < land) {
          for (let j = 2; j >= 0; j--) { const s = p - j * 3; if (s < 0) continue; const [xx, yy] = at(s); if (j) air.put(xx, yy, j === 1 ? Gc[4] : Gc[2]); else air.put(xx - 1, yy - 1, BOMB); }
        } else if (p < land + 24) { const [xx, yy] = at(land); air.put(xx, yy, Gc[Math.max(1, 5 - ((p - land) >> 3) * 2)]); }
      }
      // Ash drifting down through the heat.
      for (let k = 0; k < 34; k++) {
        const sp = 0.16 + hash(k, 0, 91) * 0.22, y = (t * sp + hash(k, 1, 91) * 600) % (FLOOR + 8) - 4;
        const x = (((hash(k, 2, 91) * viewW + t * 0.12 + Math.sin(t * 0.021 + k * 1.7) * 5) % viewW) + viewW) % viewW;
        air.put(x, y, k % 3 ? '#4E3A38' : '#7A6460');
      }
      air.end();

      // The deep cracks breathe, well below the walking surface.
      crackImg.show(Math.round((((t * 0.045) % TAU) / TAU) * CRACK_FRAMES) % CRACK_FRAMES);

      if (L3) {
        chains.forEach((c, i) => c.setPosition(L3.x + [4, 27][i] - 1, L3.y - CH));
        liftImg.setPosition(L3.x, L3.y);
      }
      fire.begin();
      slabsOf.forEach((pl, i) => {
        const going = pl.t < 45, fresh = t - pl.born < 8;
        plats[i].setPosition(pl.x, pl.y)
          .show(!pl.on ? 4 : pl.hot > 0 ? 2 + ((t >> 3) & 1) : fresh || (going && (t >> 2) & 1) ? 1 : 0);
        if (pl.on && pl.hot > 0) for (let x = 2; x < pl.w - 2; x += 3) {
          const fh = (hash(pl.x + x, t >> 2, 9) * 3.2) | 0;
          for (let k = 1; k <= fh; k++) fire.put(pl.x + x, pl.y - k, k === 1 ? Gc[5] : k === 2 ? Gc[4] : Gc[3]);
        }
      });
      fire.end();

      hot.begin(); sparks.begin();
      for (const p of a.patches) {
        if (p.id !== 'hot') continue;
        const al = 0.55 * (p.t / (p.tMax || 1)), x0 = Math.round(p.x), w = Math.round(p.w), y0 = Math.round(p.y);
        const Lt = level(Math.min(1, al * 2.2)), Lb = level(al * 1.5);
        if (Lt) hot.put(0, y0, stripOf(true, Lt, y0, (t >> 3) % 5), x0, 0, w, 1);
        if (Lb) for (let y = y0 + 1; y < y0 + p.h; y++) hot.put(0, y, stripOf(false, Lb, y, 0), x0, 0, w, 1);
        if (al > 0.14) for (let x = p.x + 1; x < p.x + p.w - 1; x += 4) if (hash(x, t >> 2, 13) > 0.5) sparks.put(x, p.y - 1, Gc[4]);
      }
      hot.end(); sparks.end();

      bubbles.begin();
      lavaBody.setVisible(flooded); lavaTop.setVisible(flooded);
      if (flooded) {
        const top = a.floorY - q.h, depth = Math.min(30, Math.ceil(q.h));
        lavaBody.setPosition(0, Math.round(top + 2)).setCrop(0, 0, viewW, depth);
        lavaBody.tilePositionX = Math.floor(t * 0.3) % 64;
        lavaTop.setPosition(0, Math.round(top) - 2).show((t >> 1) % SURF_FRAMES);
        for (let k = 0; k < 4; k++) {
          const cyc = t + k * 29, ph = cyc % 60, id = (cyc / 60) | 0;
          const bxp = Math.round(hash(k, id, 61) * (viewW - 8) + 4), sy = surfY(bxp, top, t);
          if (ph < 18) bubbles.put(bxp, sy - 1, Gc[7]);
          else if (ph < 28) { bubbles.put(bxp - 1, sy - 1, Gc[6]); bubbles.put(bxp + 1, sy - 1, Gc[6]); bubbles.put(bxp, sy - 2, Gc[7]); }
          else if (ph < 33) { bubbles.put(bxp - 2, sy - 2, Gc[5]); bubbles.put(bxp + 2, sy - 3, Gc[5]); bubbles.put(bxp, sy - 4, Gc[6]); }
        }
      }
      bubbles.end();

      // A rock that has gone has hit something: it breaks into debris there.
      next.clear();
      for (const h of a.hazards) if (h.kind === 'rock') next.set(h, h.y);
      for (const [h] of seen) {
        if (next.has(h)) continue;
        for (let k = 0; k < 9; k++) debris.push({ x: h.x + Math.random() * h.w, y: h.y + h.h - 2 - Math.random() * 3, vx: (Math.random() - 0.5) * 2.4, vy: -0.6 - Math.random() * 1.9, life: 16 + ((Math.random() * 14) | 0), hot: Math.random() < 0.5 });
      }
      [seen, next] = [next, seen];
      for (let s = 0; s < steps; s++) {
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i]; d.x += d.vx; d.y += d.vy; d.vy += 0.16;
          if (--d.life <= 0) debris.splice(i, 1);
        }
      }

      rocks.begin();
      for (const h of a.hazards) {
        if (h.kind !== 'rock') continue;
        const x = Math.round(h.x), y = Math.round(h.y), n = rockOf(h.w);
        rocks.put(x + (h.w >> 1) - 6, y - 9, FLAMEN[((t >> 2) + (h.x | 0)) % 3]);
        rocks.put(x - 1 - (n - h.w) / 2, y - 1 - (n - h.w) / 2, ROCKN[n][((h.x | 0) + (t >> 3)) & 3]);
      }
      for (const d of debris) rocks.put(d.x, d.y, DEB[d.hot ? (d.life > 8 ? 0 : 1) : 2]);
      rocks.end();
    },
  };
}
