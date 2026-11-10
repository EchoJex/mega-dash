/**
 * GHOST'S PICKED WORLD PIECES, IN THE GAME — the grave tower, a climb: its wall of graves, its pillars,
 * the rotten floorboards, a fog over the play and blue spirit flames over the fog. The painters are
 * the canvas's own (design/world-art/batch3.mjs imports them back), so the two paint from one copy;
 * the owner's words are in systems/terrain.js above CLIMBS and in design/world-art/README.md.
 *
 * Drawn by Claude at the owner's request, 2026-11-07 to 2026-11-10.
 */
import { BOSSES } from '../../data/bosses.js';
import { material } from './materials.js';
import { fillRect, beam, tn, mix, c, vert, mod, line } from './paint.js';
import { Raster, hash, noise2, pick, pieces } from '../arena-art/pixels.js';
import { W, H, FLOOR } from './kit.js';
import { TAU, WHITE, BAYER4, glow, ellipse, pics } from './batch3.js';

const wraith = BOSSES.find((b) => b.id === 'wraith');
export const Wv = (k) => tn(wraith, k), Wd = (k) => tn(wraith, k, 'secondary');
export const SPIRIT = [c('#e0f8ff'), c('#7ad8ff'), c('#3a7ac8')];   // blue spirit flame: heart, body, edge
export const GRAVE_C = [Wd(0.22), mix(Wd(1), Wv(0.45), 0.5), Wv(0.62), Wv(0.82)];   // edge, body, lit, highlight

/** A blue spirit flame: a teardrop, its tip flicking up. */
export function spiritFlame(r, x, y, s) {
  glow(r, x, y, s * 3, SPIRIT[1], 0.35);
  for (let j = -s * 2; j <= s; j++) for (let i = -s; i <= s; i++) {
    const t = j < 0 ? 1 + j / (s * 2) : 1 - (j / s) ** 2, half = s * Math.sqrt(Math.max(0, t)) * (j < 0 ? 0.8 : 1);
    if (Math.abs(i) > half) continue;
    r.set(x + i, y + j, Math.abs(i) < half * 0.4 && j > -s ? SPIRIT[0] : Math.abs(i) < half * 0.8 ? SPIRIT[1] : SPIRIT[2]);
  }
}
/*
 * The owner, 7 Nov 2026, on the Ghost board's grave tower: "3a but This level will only be 3 full
 * screen widths wide. beyond this 3 screen wide scrolling, all other platforming and scrolling will
 * be done in the vertical as the player ascends this grave tower. add animated blue flame spirits,
 * significantly increase the unique styles of graves, have a thin fog with clear patches ebb and
 * flow, shifting with player movement like the layered parallax but over the foreground, mildly
 * obscuring the player, platforms, enemies etc but not the flame spirits. periodically there will be
 * a staircase that, at the top, is a one way passable platform that spans the whole level width as
 * checkpoints. all other platforms should have randomized widths no narrower than the current
 * standard platform".
 *
 * So: the grave tower with material A, the rotten floorboards, drawn as a climb. The tower is three
 * screens (1440 pixels) wide. Its far wall of graves moves at half the camera's speed, stone pillars
 * nearer at three quarters, then the climb itself: platforms 44 to 88 pixels wide (44 is today's
 * standard), and every few tiers a staircase up to a walkway the whole width of the tower, the
 * checkpoint. Over all of it a thin fog drifts faster than the camera, its clear patches opening and
 * closing; the blue flame spirits are drawn over the fog. The canvas paints it afresh each frame; the game paints it once
 * and only places it (buildTower, below).
 */
export const ROTTEN_P = { deep: '#140e1c', dark: '#2e2640', base: '#5e5072', light: '#726486', hi: '#9a8cb4', cap0: '#c4b8dc', cap1: '#9486b4', rope: '#6a5a80', iron: '#2a2430', ironLight: '#5a5068', thi: '#d8d0e8', tlight: '#8a80a0', tdark: '#4a4058' };
export const ROTTEN = material('planks', ROTTEN_P, { spikes: 'spears', door: 'wood' });
export const RP = Object.fromEntries(Object.entries(ROTTEN_P).map(([k, v]) => [k, c(v)]));
export const GRAVE_W = [9, 9, 7, 9, 11, 20, 13, 9, 9, 9, 9, 22, 10, 5, 7];
/** A grave standing on a ledge at (x, base): one of fifteen kinds. */
export function grave(r, x, base, kind, C = GRAVE_C) {
  const [E, B, L, Hh] = C, F = (i, j, w, h, col) => fillRect(r, x + i, base - j - h, w, h, col);   // j counts up from the ledge
  const body = (i, j, w, h) => { F(i, j, w, h, B); F(i, j, 1, h, L); F(i + w - 1, j, 1, h, E); };
  const WOOD = [c('#2a1c14'), c('#5a4030'), c('#7a5a40')];
  switch (kind) {
    case 0: body(0, 0, 9, 9); for (let i = 1; i < 8; i++) for (let j = 9; j < 13; j++) if (((i - 4) / 3.6) ** 2 + ((j - 9) / 3.4) ** 2 <= 1) r.set(x + i, base - 1 - j, i < 3 ? L : B); F(2, 4, 5, 1, E); F(2, 6, 5, 1, E); break;   // a rounded headstone
    case 1: body(3, 0, 3, 16); body(0, 10, 9, 3); break;   // a cross
    case 2: body(0, 0, 7, 3); body(1, 3, 5, 14); F(2, 17, 3, 2, B); F(3, 19, 1, 2, Hh); break;   // an obelisk
    case 3: body(3, 0, 3, 18); body(0, 11, 9, 3); for (let a = 0; a < 28; a++) { const t = (a / 28) * TAU; r.set(Math.round(x + 4 + Math.cos(t) * 4), Math.round(base - 13 + Math.sin(t) * 4), a < 14 ? E : L); } break;   // a cross in a ring
    case 4: body(0, 0, 11, 9); F(3, 3, 5, 4, L); r.set(x + 4, base - 6, E); r.set(x + 6, base - 6, E); F(4, 3, 3, 1, E); break;   // a slab with a skull carved in it
    case 5: body(0, 0, 20, 5); F(0, 5, 20, 2, L); F(1, 7, 18, 1, Hh); for (let i = 3; i < 18; i += 5) F(i, 1, 2, 3, E); break;   // a tomb chest under its lid
    case 6: body(4, 0, 5, 3); body(5, 3, 3, 9); F(2, 7, 2, 8, L); F(9, 7, 2, 8, E); F(1, 10, 1, 5, L); F(11, 10, 1, 5, E); ellipse(r, x + 6, base - 15, 2, 2, Hh); break;   // an angel, wings half raised
    case 7: body(0, 0, 9, 6); F(0, 6, 3, 3, B); F(3, 6, 2, 1, B); F(5, 6, 4, 2, B); F(7, 8, 2, 1, E); r.set(x + 1, base - 9, L); break;   // a broken headstone
    case 8: for (let j = 0; j < 14; j++) { const dx = Math.round(j * 0.25); r.set(x + 3 + dx, base - 1 - j, WOOD[1]); r.set(x + 4 + dx, base - 1 - j, WOOD[0]); } for (let i = 0; i < 9; i++) r.set(x + i + 2, base - 11 + Math.round(i * 0.1), i < 4 ? WOOD[2] : WOOD[1]); break;   // a wooden cross, leaning
    case 9: body(1, 0, 7, 4); body(3, 4, 3, 2); ellipse(r, x + 4, base - 9, 3, 3, B); r.set(x + 2, base - 10, L); F(3, 12, 3, 1, L); F(2, 13, 5, 1, B); break;   // an urn on a plinth
    case 10: body(0, 0, 9, 10); for (let j = 10; j < 15; j++) { const half = Math.round((15 - j) * 0.9); for (let i = 4 - half; i <= 4 + half; i++) r.set(x + i, base - 1 - j, i <= 4 - half + 1 ? L : B); } F(4, 6, 1, 5, E); F(2, 8, 5, 1, E); break;   // a pointed headstone with a cross cut in it
    case 11: body(0, 0, 22, 2); body(2, 2, 2, 11); body(18, 2, 2, 11); F(4, 2, 14, 11, Wd(0.12)); F(8, 2, 6, 8, Wd(0.05)); body(0, 13, 22, 2); for (let j = 15; j < 20; j++) { const half = Math.round((20 - j) * 2.2); F(11 - half, j, half * 2, 1, j === 15 ? L : B); } break;   // a little mausoleum, its door dark
    case 12: for (let j = 0; j < 12; j++) { const dx = Math.round(j * 0.35); for (let i = 0; i < 8; i++) { if (j > 8 && ((i - 3.5) / 3.6) ** 2 + ((j - 8) / 3.4) ** 2 > 1) continue; r.set(x + i + dx, base - 1 - j, i === 0 ? L : i === 7 ? E : B); } } break;   // a headstone sunk and leaning
    case 13: F(2, 0, 1, 10, Wd(0.15)); F(0, 10, 5, 6, Wd(0.15)); F(1, 11, 3, 4, SPIRIT[1]); r.set(x + 2, base - 13, SPIRIT[0]); glow(r, x + 2, base - 13, 6, SPIRIT[1], 0.35); break;   // an iron lantern on a post, a spirit flame inside
    case 14: body(1, 0, 5, 2); body(2, 2, 3, 12); ellipse(r, x + 3, base - 16, 2, 2, B); r.set(x + 2, base - 17, Hh); break;   // a pillar with a stone ball on top
  }
}
/** The tower's far wall, at `rate` of the camera: stone blocks, tall moonlit windows, and ledge on ledge of graves. */
export function towerWall(r, camX, camH, rate) {
  const ox = Math.round(camX * rate), oh = Math.round(camH * rate);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x + ox, wy = y - oh, row = Math.floor(wy / 12), bx = mod(wx + mod(row, 2) * 16, 32);
    r.set(x, y, mod(wy, 12) === 0 || bx === 0 ? Wd(0.35) : pick([Wd(0.6), mix(Wd(1), Wv(0.25), 0.3)], noise2(wx * 0.08, wy * 0.08, 430), x, y));
  }
  for (let k = Math.floor((-oh - 120) / 112); k * 112 - 40 + oh < H; k++) {
    const ly = k * 112 + 96 + oh;   // this ledge's top, on screen
    if (mod(k, 2) === 0) for (let n = Math.floor((ox - 60) / 240); n * 240 + 100 - ox < W; n++) {   // a tall arched window between this ledge and the one above
      const wx = n * 240 + 120 - ox, top = ly - 76;
      for (let j = 0; j < 62; j++) for (let i = 0; i < 22; i++) { const dx = i - 11; if (j < 11 && dx * dx + (j - 11) ** 2 > 121) continue; r.set(wx + i, top + j, i === 11 || j === 30 ? Wd(0.3) : mix(Wd(0.25), Wv(0.6), 0.35 - j * 0.004)); }
      beam(r, wx + 11, top + 30, Math.PI / 2 + 0.35, 0.1, 70, Wv(0.85), 0.07);
    }
    if (ly < -30 || ly > H + 30) continue;
    for (let x = 0; x < W; x++) { r.set(x, ly, Wv(0.45)); r.set(x, ly + 1, Wd(0.25)); for (let j = 2; j < 6; j++) r.set(x, ly + j, Wd(0.3)); }
    let gx = 4 + Math.floor(hash(k, 0, 940) * 10);
    for (let n = 0; gx < ox + W + 30; n++) {   // the graves along it: fifteen kinds, never two alike in a row
      const kind = Math.floor(hash(k, n, 941) * 15), w = GRAVE_W[kind];
      if (gx + w > ox - 30) grave(r, gx - ox, ly, kind);
      gx += w + 3 + Math.floor(hash(k, n, 942) * 9);
    }
  }
}
/** Stone pillars nearer than the wall, at `rate` of the camera. */
export function towerPillars(r, camX, rate) {
  const ox = Math.round(camX * rate);
  for (let n = Math.floor((ox - 40) / 300); n * 300 + 120 - ox < W; n++) {
    const px = n * 300 + 140 - ox;
    for (let y = 0; y < H; y++) for (let i = 0; i < 26; i++) r.set(px + i, y, i < 3 ? Wv(0.42) : i > 22 ? Wd(0.1) : mod(y + (i > 12 ? 8 : 0), 16) === 0 ? Wd(0.14) : Wd(0.24));
  }
}
// The climb shown on the canvas: its platforms, stairs and walkways, and the route the player takes.
export const FOG = c('#b8b4d8');

// ── THE TOWER IN THE GAME ────────────────────────────────────────────
/*
 * Painted once when the area is built, then only placed, like every area: the far wall of graves as one
 * picture covering every scroll the tower can show (it moves at half the camera's speed, both ways), the
 * pillars as one strip (three quarters, along only: they are plain columns), the woodwork and the tower's
 * own walls as pictures standing in the world, two sheets of fog over the play drifting at 1.35 times the
 * camera and against each other so their clear patches open and close, and the spirit flames over the fog.
 */
export const RATE_WALL = 0.5, RATE_PILLARS = 0.75, RATE_FOG = 1.35;
const FOG_P = 256, SPIRIT_N = 70;
const clipTo = (big, X0, Y0) => ({ set: (x, y, col, a) => { if (x >= 0 && x < W && y >= 0 && y < H) big.set(x + X0, y + Y0, col, a); } });
/** A fog sheet that repeats every FOG_P both ways: the canvas's fog noise, blended across its own edges so it has no seam. */
function fogSheet(thr, seed) {
  const r = new Raster(FOG_P, FOG_P), n = (x, y) => 0.65 * noise2(x * 0.012, y * 0.02, seed) + 0.35 * noise2(x * 0.04 + 50, y * 0.05, seed + 1);
  for (let y = 0; y < FOG_P; y++) for (let x = 0; x < FOG_P; x++) {
    const u = x / FOG_P, v = y / FOG_P;
    const m = (1 - u) * (1 - v) * n(x, y) + u * (1 - v) * n(x - FOG_P, y) + (1 - u) * v * n(x, y - FOG_P) + u * v * n(x - FOG_P, y - FOG_P);
    const d = Math.min(1, Math.max(0, (m - thr) / 0.2));
    if (d > 0 && BAYER4[mod(y, 4)][mod(x, 4)] < d * 8) r.set(x, y, FOG, Math.round(40 + d * 45));
  }
  return r;
}
/** One staircase's picture: its steps, a stringer down the open side, an iron rail. */
function stairPicture(steps) {
  const x0 = Math.min(...steps.map((s) => s.x)), x1 = Math.max(...steps.map((s) => s.x + s.w)), y0 = Math.min(...steps.map((s) => s.y)) - 14, y1 = Math.max(...steps.map((s) => s.y)) + 12;
  const r = new Raster(x1 - x0 + 1, y1 - y0 + 1), up = steps[1].x > steps[0].x ? 1 : -1;
  steps.forEach((s, k) => {
    const x = s.x - x0 + 1, y = s.y - y0;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) r.set(x + i, y + j, j === 0 ? RP.cap0 : j === 1 ? RP.light : i === (up > 0 ? 7 : 0) ? RP.deep : j > 5 ? RP.dark : RP.base);
    for (let j = 8; j < 12; j++) r.set(x + (up > 0 ? 0 : 7), y + j, RP.deep);
    if (k % 3 === 1) vert(r, x + 4, y - 12, y, RP.iron);
  });
  const a = steps[0], b = steps.at(-1);
  line(r, a.x - x0 + 4, a.y - y0 - 12, b.x - x0 + 4, b.y - y0 - 12, RP.ironLight);
  return { r, x: x0 - 1, y: y0 };
}

/**
 * Ghost's tower for one visit. `S` is the stage, `M` the picked material (the rotten floorboards), `world`
 * the tower terrain.js built. Returns `place(cam, camY, t)`; the doors are placed by the caller.
 */
export function buildTower(S, viewW, M, world, depth) {
  const c = world.climb, TW = c.width, climbH = world.groundY - c.top;   // the camera rises up to climbH
  // The far wall: big row Y shows the wall's row Y - OH, so every scroll is one placement of one picture.
  const OH = Math.ceil(climbH * RATE_WALL), OX = Math.ceil((TW - W) * RATE_WALL);
  const wall = new Raster(OX + W, OH + H);
  for (let Y0 = 0; Y0 < OH + H; Y0 += H) for (let X0 = 0; X0 < OX + W; X0 += W) towerWall(clipTo(wall, X0, Y0), X0 / RATE_WALL, (OH - Y0) / RATE_WALL, RATE_WALL);
  const PX = Math.ceil((TW - W) * RATE_PILLARS), pillars = new Raster(PX + W, H);
  for (let X0 = 0; X0 < PX + W; X0 += W) towerPillars(clipTo(pillars, X0, 0), X0 / RATE_PILLARS, RATE_PILLARS);
  S.layer({ far: true });
  const wallO = S.image(wall.flush(), 0, 0), pillarO = S.image(pillars.flush(), 0, 0);

  // The woodwork and the tower's walls, standing in the world.
  S.layer({ depth: depth.world - 0.5 });
  const things = [];
  const stand = (r, x, y) => things.push({ o: S.image(r.flush(), x, y), x });
  const floor = new Raster(TW, H - FLOOR);
  M.ground({ set: (x, y, col, a) => floor.set(x, y - FLOOR, col, a) }, 0, TW);
  stand(floor, 0, FLOOR);
  for (const p of world.platforms.filter((q) => !q.step)) {
    const x0 = Math.floor(p.x), r = new Raster(Math.ceil(p.x + p.w) - x0 + 1, p.walk ? 16 : 5);
    M.platform({ set: (x, y, col, a) => r.set(x - x0, y - p.y, col, a) }, p.x, p.y, p.w);
    if (p.walk) for (let bx = 12; bx < p.w - 12; bx += 120) { line(r, bx, 5, bx + 10, 15, RP.iron); line(r, bx + 1, 5, bx + 11, 15, RP.ironLight); }   // brackets under a walkway
    stand(r, x0, p.y);
  }
  const steps = world.platforms.filter((q) => q.step).sort((a, b) => b.y - a.y);
  for (let i = 0; i < steps.length; i += STAIR) { const s = stairPicture(steps.slice(i, i + STAIR)); stand(s.r, s.x, s.y); }
  const wallH = climbH + H;
  for (const wx of [0, TW - 14]) {
    const r = new Raster(14, wallH);
    for (let y = 0; y < wallH; y++) for (let i = 0; i < 14; i++) r.set(i, y, i === (wx ? 0 : 13) ? Wv(0.45) : mod(y + i * 3, 12) === 0 ? Wd(0.12) : Wd(0.2));
    stand(r, wx, world.groundY - climbH - 40);
  }

  // The fog over the play and the spirits over the fog.
  S.layer({ depth: depth.cover + 0.5 });
  const fogs = [S.tile(fogSheet(0.52, 911).flush(), 0, 0, viewW, H), S.tile(fogSheet(0.6, 921).flush(), 0, 0, viewW, H)];
  S.layer({ depth: depth.cover + 0.6 });
  const sizes = [3, 4, 5];
  const flames = S.pool(pieces(sizes.map((s) => { const r = new Raster(6 * s + 2, 6 * s + 2); spiritFlame(r, 3 * s + 1, 3 * s + 1, s); return [`s${s}`, r.flush()]; })));
  const spirits = Array.from({ length: SPIRIT_N }, (_, i) => [20 + Math.floor(hash(i, 0, 960) * (TW - 40)), 20 + Math.floor(hash(i, 1, 960) * (climbH + 120)), 3 + Math.floor(hash(i, 2, 960) * 2)]);

  return {
    place(cam, camY, t) {
      const cx = Math.round(cam), cy = Math.round(camY), h = -cy;   // h: how far the view has risen
      wallO.x = -Math.round(cx * RATE_WALL); wallO.y = cy - (OH - Math.round(h * RATE_WALL));
      pillarO.x = -Math.round(cx * RATE_PILLARS); pillarO.y = cy;
      for (const th of things) th.o.x = th.x - cx;
      fogs.forEach((f, k) => {
        f.y = cy;
        f.tilePositionX = Math.round(cx * RATE_FOG + (k ? -t * 0.07 : t * 0.12));
        f.tilePositionY = Math.round(cy * RATE_FOG + (k ? t * 0.03 : 0));
      });
      flames.begin();
      spirits.forEach(([sx, sh, s], i) => {
        const x = Math.round(sx - cx + 8 * Math.sin((TAU * t) / 400 + i)), y = Math.round(world.groundY - sh + 4 * Math.sin((TAU * t) / 90 + i * 1.3));
        if (x < -20 || x > viewW + 20 || y < cy - 20 || y > cy + H + 20) return;
        const k = mod(Math.floor(t / 5) + i, 3) === 0 ? s + 1 : s;
        flames.put(x - 3 * k - 1, y - 3 * k - 1, `s${k}`);
      });
      flames.end();
    },
  };
}
const STAIR = 10;
