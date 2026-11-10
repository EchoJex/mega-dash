/**
 * STEEL'S PICKED WORLD PIECES, IN THE GAME — the assembly line and the blast doors on the steel plates.
 * design/world-art/batch3.mjs, the review canvas, imports this so the canvas and the game paint from
 * one copy; the owner's words for each step are there and in design/world-art/README.md.
 *
 * Drawn by Claude at the owner's request, 2026-11-06 to 2026-11-09.
 */
import { BOSSES } from '../../data/bosses.js';
import { STEEL_PLATES } from './materials.js';
import { fillRect, panels, tn, mix, c, vert, mod, line } from './paint.js';
import { Raster, hash, pick } from '../arena-art/pixels.js';
import { W, H, FLOOR, paintDoor } from './kit.js';
import { TAU, WHITE, BLACK, lit, glow, ellipse, pics } from './batch3.js';

const B = (id) => BOSSES.find((b) => b.id === id);

export const alloy = B('alloy');
export const Al = (k) => tn(alloy, k), As = (k) => tn(alloy, k, 'secondary'), HOT = [c('#fff4b0'), c('#ffb030'), c('#e85a1a')];
// The first round's steel plates, picked for Steel (variants.mjs STYLES.A), and its doors' colours.
export const SP = { deep: c('#262e37'), dark: c('#36414c'), base: c('#50606e'), light: c('#66788a'), hi: c('#8a9cae'), cap: c('#dce6ee') };
export const CYAN = [c('#5cadd5'), c('#d8f6ff')], GOLD = [c('#5c4a0a'), c('#c9a21e'), c('#f5d328'), c('#fff3b0')];
/** A door's frame: a lit top-left edge, a dark bottom-right, two pixels thick. */
export const frame = (d, i, j) => (i < 2 || i > 13 || j < 2 ? (i === 0 || j === 0 ? SP.light : i === 15 ? SP.deep : SP.dark) : null);
/** VAULT: a round vault door with bolts and a spoked wheel; for the way out it stands open, gold light behind. */
export function vaultDoor(kind) {
  const d = new Raster(16, 28), exit = kind === 'exit', cy = 15;
  for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
    const f = frame(d, i, j);
    if (f) { d.set(i, j, f); continue; }
    const dx = i + 0.5 - 8, dy = j + 0.5 - cy, dd = Math.hypot(dx, dy);
    if (dd > 6.8) d.set(i, j, (i + j) % 4 === 0 ? SP.base : SP.dark);
    else if (exit) d.set(i, j, dd > 6 ? SP.deep : pick([GOLD[1], GOLD[2], GOLD[3]], 1 - dd / 6, i, j));
    else if (dd > 6) d.set(i, j, CYAN[0]);   // the seam of light round the shut door
    else if (dd > 4.9) d.set(i, j, dx + dy < 0 ? SP.hi : SP.deep);
    else d.set(i, j, SP.base);
  }
  if (exit) { for (let j = cy - 7; j <= cy + 7; j++) { d.set(14, j, SP.hi); d.set(15, j, SP.light); } }   // the door, swung open edge-on
  else {
    for (let k = 0; k < 8; k++) { const a = (k * TAU) / 8; d.set(Math.floor(8 + Math.cos(a) * 3.9), Math.floor(cy + 0.5 + Math.sin(a) * 3.9), SP.cap); }
    for (let k = -2; k <= 2; k++) { d.set(8 + k, cy, SP.hi); d.set(8, cy + k, SP.hi); }
    d.set(8, cy, CYAN[1]);
  }
  return d;
}
/** BLAST DOOR: two thick halves meeting in a zigzag seam under a hazard stripe; the way out stands parted. */
export function blastDoor(kind) {
  const d = new Raster(16, 28), exit = kind === 'exit';
  for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
    if (j < 4) { d.set(i, j, j === 0 ? SP.light : ((i + j) >> 1) % 2 ? c('#e8c020') : c('#1e1a14')); continue; }
    const f = frame(d, i, j);
    if (f) { d.set(i, j, f); continue; }
    const seam = 8 + (mod(j, 4) < 2 ? 1 : 0) - (mod(j, 4) === 3 ? 1 : 0), gap = exit ? 2 : 0;
    if (Math.abs(i + 0.5 - seam) < 0.6 + gap) d.set(i, j, exit ? pick([GOLD[2], GOLD[3]], 0.5, i, j) : SP.deep);
    else d.set(i, j, (j - 4) % 6 === 0 ? SP.dark : (i === 3 || i === 12) && j % 3 === 0 ? SP.hi : i < seam ? SP.base : SP.light);
  }
  const L = exit ? [GOLD[2], GOLD[3]] : CYAN;
  d.set(7, 5, L[0]); d.set(8, 5, L[0]); d.set(7, 6, L[1]); d.set(8, 6, L[0]);   // a lamp over the seam
  return d;
}
/** BULKHEAD: a ship's hatch with rounded corners, a raised rim, latches down each side and a round porthole. */
export function bulkhead(kind) {
  const d = new Raster(16, 28), exit = kind === 'exit';
  for (let j = 0; j < 28; j++) for (let i = 0; i < 16; i++) {
    const f = frame(d, i, j);
    if (f) { d.set(i, j, f); continue; }
    const cx = Math.min(Math.max(i, 5), 10), cyy = Math.min(Math.max(j, 6), 23), corner = Math.hypot(i - cx, j - cyy) > 3;
    if (corner) { d.set(i, j, SP.deep); continue; }
    const rim = i === 2 || i === 13 || j === 3 || j === 26 || Math.abs(Math.hypot(i - cx, j - cyy) - 3) < 0.6;
    d.set(i, j, rim ? (i < 8 && j < 14 ? SP.hi : SP.light) : exit ? SP.light : SP.base);
  }
  for (const j of [8, 14, 20]) { d.set(2, j, SP.cap); d.set(13, j, SP.cap); }   // the latches
  const L = exit ? [GOLD[1], GOLD[2], GOLD[3]] : [SP.deep, CYAN[0], CYAN[1]];
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) { const dd = Math.hypot(i - 3, j - 3); if (dd < 3.5) d.set(5 + i, 6 + j, dd > 2.6 ? SP.cap : dd > 1.4 ? L[1] : L[2]); }   // the porthole
  if (exit) for (let j = 3; j < 27; j++) { d.set(13, j, GOLD[3]); d.set(12, j, GOLD[2]); d.set(14, j, GOLD[1]); }   // standing ajar, gold light down its edge
  return d;
}
export const steelDoors = (paint) => ({ door: (r, x, kind) => paintDoor(r, paint(kind), x, FLOOR - 28, kind), doorPicture: paint });
/*
 * THE LINE, Steel's pick (the owner, 6 Nov 2026, on the Steel board): "1, 2, 5 and material B. I want
 * the backdrop to tell an assembly line story of low poly, mildly variable steel copies of the
 * player, progressing from the ladle to the billets, to a stamp, to welding arms, to the the end of
 * the conveyor belt where they are dropped into a black pit that extends below the visible area,
 * implying that they are getting dumped into a pit". So the rolling mill's hall (1), the foundry's
 * ladle (2) and the assembly line's arms and belt (5) are one line, left to right: the ladle pours,
 * billets cool along the rollers, a press stamps each into a flat cut-out of the player, two welding
 * arms raise it into a standing steel copy, and at the end of the belt each copy topples into a
 * black pit that runs on down past the bottom of the screen.
 *
 * Everything on the belt is one moving part. Items sit a slot apart and move one slot every 120
 * steps; what each looks like depends only on where it is along the line, and the copies come in
 * four slight variations by item, so the whole picture comes back to where it started every 480
 * steps (four slots).
 */
export const SLOT = 40, BELT_Y = 152;
export const STEEL_C = [c('#dfe5ea'), c('#aab4bd'), c('#77818c'), c('#4a535d'), c('#2a3038')];   // lit, light, mid, dark, deep
export const HOTS = [[c('#fffbe0'), c('#ffd060'), c('#ff9a30')], [c('#ffd060'), c('#ff8a20'), c('#c84a10')], [c('#ff7a30'), c('#c03a10'), c('#7a2a18')], [c('#8a4a3a'), c('#5a3a34'), c('#3e3438')]];
/** A copy of the player in low-poly steel: helmet and fin, a dark visor, the body in flat facets. */
export const COPY_ROWS = ['......##......', '.....####.....', '....######....', '...########...', '...#vvvvvv#...', '...########...', '....######....', '..##########..', '.############.', '##.########.##', '##.########.##', '##.########.##', '#..########..#', '...########...', '...###..###...', '...###..###...', '...###..###...', '..####..####..', '..####..####..'];
export function paintCopy(p, v, dim = 0) {
  const tint = (col) => mix(v === 2 ? lit(col, 0.06) : col, BLACK, dim);
  COPY_ROWS.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    if (v === 3 && j >= 9 && j <= 12 && (i <= 1 || i >= 12)) { if (j === 9) return; }   // one arm hanging a little lower
    let col;
    if (ch === 'v') col = j === 4 && i === 4 ? c('#5a7080') : c('#1a2026');   // the visor, dark: nobody home
    else if (j <= 6) col = i < 5 ? STEEL_C[0] : i < 9 ? STEEL_C[1] : STEEL_C[3];   // the helmet's three facets
    else if (j <= 13) col = i <= 1 || i >= 12 ? (i <= 1 ? STEEL_C[1] : STEEL_C[3]) : Math.abs(i - 6.5) < (13 - j) * 0.6 ? STEEL_C[1] : i < 7 ? STEEL_C[2] : STEEL_C[3];   // a V of chest plate between flat sides
    else col = i < 7 ? STEEL_C[2] : STEEL_C[3];   // legs
    p.set(i, j + (v === 2 ? 0 : 1), tint(col));
  }));
  if (v === 1) { p.set(6, 11, tint(STEEL_C[4])); p.set(7, 12, tint(STEEL_C[4])); p.set(7, 0, BLACK, 0); p.set(8, 1, tint(STEEL_C[1])); }   // a dent, and a bent fin
  if (v === 3) p.set(9, 15, tint(c('#7a4a30')));   // a fleck of rust
}
/** The line's far wall: plate panels, high windows, the crane gantry and a hazard band. */
export function lineWall(r, ox) {
  panels(r, ox, { y0: 0, y1: 178, pw: 48, ph: 40, base: As(0.4), light: As(0.54), dark: As(0.26) });
  for (let x = 0; x < W; x++) { if (mod(x + ox, 48) > 6 && mod(x + ox, 48) < 42) for (let y = 8; y < 22; y++) r.set(x, y, y < 10 ? Al(0.9) : mix(Al(0.7), c('#c8d8e0'), 0.3)); r.set(x, 28, Al(0.3)); r.set(x, 29, Al(0.3)); const z = mod(x + ox, 16); r.set(x, 30 + Math.min(z, 16 - z), Al(0.3)); r.set(x, 38, Al(0.3)); }   // high windows and the crane gantry
  for (let x = 0; x < W; x++) for (let y = 120; y < 126; y++) r.set(x, y, mod(x + ox + y, 12) < 6 ? mix(c('#e8c020'), As(0.4), 0.4) : As(0.2));   // a hazard band along the far wall
}
// ── THE LINE IN THREE PHASES ─────────────────────────────────────────
/*
 * The owner, 6 Nov 2026, on the Steel pick: "since each phase of the assembly line will be repeating
 * for a while as a backdrop, have Phase 1 backdrop art spawn off-screen to the right, repeating molten
 * steel filled ladles pouring glowing hot billets that slightly cool, then at whatever the progress
 * metric ends phase 1, dont switch the entire backdrop, just shift to spawning in phase 2 art
 * off-screen to the right as the player walks such that phase 1 images remain on screen until the
 * last one spawned has drifted off screen to the left due to the player progressing to the right.
 * Phase 2 will be a more detailed press, which only forms the head and torso, briefly pauses the
 * assembly line while the billet cools rapidly and takes on the form the press made, then a hinged
 * table lifts the now shaped billet upright, freeing the space under the press and the conveyor belt
 * continues, loading up a new billet under the press. Phase 3 will be 4 sets of moving arm pairs, one
 * pair for assembly of arms, one pair for welding the arms, then one pair for assembly of the legs
 * and one pair for welding the legs." Their answers to four questions: "1b" (the pit once only, at
 * the very end before the boss door), "2a" (each fitting pair takes its parts from a bin hanging
 * above the line), "3 idk. show me both options. one option is pauses (pouring, pressing, welding
 * dumping) should all share the same cadence so the phases line up visually at the phase seams), or
 * having the conveyor always moving, and the ladles, press, arms, follow the belt" and "4a" (each
 * phase as its own moving picture, plus a walk through the handovers).
 *
 * So the line is built of units, each one station's stretch of belt: a ladle (phase 1), a furnace
 * and a press (phase 2), a gate and four pairs of arms (phase 3), and once, at the very end, the
 * belt's end over the pit. The game would choose each unit's phase as it first appears off the right
 * edge. What an item on the belt looks like depends only on where it is in its unit and how far that
 * unit's station has got, so any unit can follow any other. The furnace and the gate hide the belt
 * where a unit meets the next of its kind, so what goes in need not be what comes out.
 *
 * Two ways of moving: 'step' (one beat for everything: the belt moves a slot in 24 steps, then stands
 * for 96 while every station works, all together, so the phases line up where they meet) and 'flow'
 * (the belt never stops, a third of a pixel a step, and each station rides along with its item for 90
 * steps, then hurries back for the next). Either way it all comes back to where it started every 480
 * steps. Shown on the canvas only, painted afresh each frame; nothing here is in the game yet.
 */
export const BEAT = 120, MOVE = 24, RIDE = 30, UNIT = { p1: 120, p2: 160, p3: 360, end: 200 }, ARM_AT = [60, 140, 220, 300];
export const ease = (u) => u * u * (3 - 2 * u);
export const beltAt = (mode, t) => (mode === 'step' ? SLOT * (Math.floor(t / BEAT) + ease(Math.min(1, mod(t, BEAT) / MOVE))) : (SLOT * t) / BEAT);
/** Where the station whose item arrives at x0 stands now, and how far its work has got (null while it waits, or hurries back). */
export function stationAt(mode, x0, t) {
  const p = mod(t, BEAT);
  if (mode === 'step') return [x0, p >= MOVE ? (p - MOVE) / (BEAT - MOVE) : null];
  const q = p / BEAT;
  return q < 0.75 ? [x0 + SLOT * q, q / 0.75] : [x0 + RIDE * (1 - (q - 0.75) / 0.25), null];
}
/** How far the station at x0 has got with the item at x: 0 before it reaches it, 1 once past. */
export function workOn(mode, x, x0, t) {
  if (mode === 'step') return Math.abs(x - x0) < 0.5 ? stationAt(mode, x0, t)[1] ?? 1 : x < x0 ? 0 : 1;
  return Math.max(0, Math.min(1, (x - x0) / RIDE));
}
/** A line of one kind of unit, repeating; or a sequence, its first unit repeating to the left and no line past its end. */
export const repeatOf = (kind) => (x) => [kind, Math.floor(x / UNIT[kind]) * UNIT[kind]];
/** A whole line of units, in order, repeating: each repeat is a new belt, starting again after the last one's pit. */
export const cycleOf = (seq) => (x) => {
  const len = seq.reduce((n, kind) => n + UNIT[kind], 0), base = Math.floor(x / len) * len;
  let s = base;
  for (const kind of seq) { if (x < s + UNIT[kind]) return [kind, s]; s += UNIT[kind]; }
  return null;
};
export const sequenceOf = (seq) => (x) => {
  if (x < 0) return repeatOf(seq[0])(x);
  let s = 0;
  for (const kind of seq) { if (x < s + UNIT[kind]) return [kind, s]; s += UNIT[kind]; }
  return null;
};
/** Copy the opaque pixels of a small picture into r at (x, y). */
export function stamp(r, p, x, y) {
  for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) { const k = (j * p.w + i) * 4; if (p.d[k + 3]) r.set(x + i, y + j, [p.d[k], p.d[k + 1], p.d[k + 2]], p.d[k + 3]); }
}
// What rides the belt: moulds, billets, pressed slabs and the copies at each stage, all on one stand.
export const ITEMS = new Map();
export const item = (name, w, h, paint) => { if (!ITEMS.has(name)) { const p = new Raster(w, h); paint(p); ITEMS.set(name, p); } return ITEMS.get(name); };
export const mould = (T) => item(`mould${T}`, 22, 7, (p) => {
  for (let i = 1; i < 21; i++) { p.set(i, 0, i < 3 || i > 18 ? HOTS[T][2] : HOTS[T][0]); p.set(i, 1, HOTS[T][1]); }   // the molten top, seen from a little above
  for (let j = 0; j < 7; j++) for (const i of [0, 21]) p.set(i, j, STEEL_C[2]);
  for (let j = 2; j < 7; j++) for (let i = 1; i < 21; i++) p.set(i, j, j === 6 ? STEEL_C[4] : j === 2 ? mix(STEEL_C[3], HOTS[T][2], 0.5) : i % 7 === 3 && j === 4 ? STEEL_C[1] : STEEL_C[3]);
});
export const rawBillet = () => item('raw', 20, 5, (p) => { for (let j = 0; j < 5; j++) for (let i = 0; i < 20; i++) p.set(i, j, j === 0 ? HOTS[1][0] : i === 0 || i === 19 || j === 4 ? HOTS[1][2] : HOTS[1][1]); });
export const SLAB = [HOTS[1], HOTS[2], HOTS[3], [STEEL_C[1], STEEL_C[2], STEEL_C[3]]];
export const slab = (k) => item(`slab${k}`, 22, 4, (p) => {   // pressed flat: the head and torso's outline in relief, cooling from orange to grey
  [1, 2, 3, 3, 2, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 3, 4, 4, 4, 3, 2, 1].forEach((h, i) => { for (let j = 4 - h; j < 4; j++) p.set(i, j, j === 4 - h ? SLAB[k][0] : j === 3 ? SLAB[k][2] : SLAB[k][1]); });
});
/** The copy at a stage: 'torso' (head and torso, no arms), 'arms', or 'whole'; on its stand, a dark post under the hips. */
export function copyAt(stage, v) {
  return item(`${stage}${v}`, 14, 20, (p) => {
    const full = new Raster(14, 20); paintCopy(full, v);
    const off = v === 2 ? 0 : 1;
    for (let y = 0; y < 20; y++) for (let x = 0; x < 14; x++) {
      const j = y - off, k = (y * 14 + x) * 4;
      if (!full.d[k + 3]) continue;
      if (stage !== 'whole' && j >= 14) continue;   // no legs yet
      if (stage === 'torso' && j >= 9 && j <= 12 && (x <= 1 || x >= 12)) continue;   // no arms yet
      p.set(x, y, [full.d[k], full.d[k + 1], full.d[k + 2]]);
    }
    for (let y = 14 + off; y < 20; y++) p.set(6, y, STEEL_C[4]);   // the stand
    if (stage !== 'whole') for (let x = 5; x < 9; x++) p.set(x, 19, STEEL_C[4]);
  });
}
/** The pressed piece rising upright on its hinged table, `h` rows of its 14 showing. */
export const rising = (h) => item(`rise${h}`, 14, 20, (p) => {
  const src = copyAt('torso', 0);
  for (let j = 0; j < h; j++) { const sj = Math.floor((j * 14) / h) + 1; for (let x = 0; x < 14; x++) { const k = (sj * 14 + x) * 4; if (src.d[k + 3]) p.set(x, 15 - h + j, [src.d[k], src.d[k + 1], src.d[k + 2]]); } }
  for (let y = 15; y < 20; y++) p.set(6, y, STEEL_C[4]);
  for (let x = 5; x < 9; x++) p.set(x, 19, STEEL_C[4]);
});
/** A whole copy tipping forward over the belt's end, a quarter turn in four steps, turned about its front foot (at 15, 25). */
export const tipping = (v, a) => item(`tip${v}${a}`, 36, 26, (p) => {
  const src = copyAt('whole', v), th = (a * Math.PI) / 8, cs = Math.cos(th), sn = Math.sin(th);
  for (let dy = -25; dy < 1; dy++) for (let dx = -15; dx < 21; dx++) {
    const sx = Math.floor(14 + dx * cs + dy * sn), sy = Math.floor(20 - dx * sn + dy * cs);
    if (sx < 0 || sy < 0 || sx >= 14 || sy >= 20) continue;
    const k = (sy * 14 + sx) * 4;
    if (src.d[k + 3]) p.set(15 + dx, 25 + dy, mix([src.d[k], src.d[k + 1], src.d[k + 2]], BLACK, 0.12 * a));
  }
});
/** The look of the item at line x: [picture, left, top], or null. */
export function lookOf(mode, unitOf, X, v, t) {
  const u = unitOf(X);
  if (!u) return null;
  const [kind, s] = u, xl = X - s;
  if (kind === 'p1') {
    const w = workOn(mode, xl, 60, t), d = mod(xl - 60, 120);
    const T = w > 0 && w < 1 ? (w < 0.3 ? 2 : 0) : d < 34 ? 0 : d < 74 ? 1 : 2;   // topped up by its ladle, then cooling a little
    return [mould(T), X - 11, BELT_Y - 7];
  }
  if (kind === 'p2') {
    const w = workOn(mode, xl, 60, t);
    if (w < 0.12) return [rawBillet(), X - 10, BELT_Y - 5];
    if (w < 0.62) return [slab(Math.min(3, Math.floor(((w - 0.12) / 0.38) * 4))), X - 11, BELT_Y - 4];
    if (w < 0.92) return [rising([4, 8, 12][Math.min(2, Math.floor(((w - 0.62) / 0.3) * 3))]), X - 7, BELT_Y - 20];
    return [copyAt('torso', v), X - 7, BELT_Y - 20];
  }
  if (kind === 'p3') {
    const arms = workOn(mode, xl, ARM_AT[0], t) >= 0.7, legs = workOn(mode, xl, ARM_AT[2], t) >= 0.7;
    return [copyAt(legs ? 'whole' : arms ? 'arms' : 'torso', v), X - 7, BELT_Y - 20];
  }
  // the end: ride to the roller, tip over it, fall into the pit (in 'step', on the beat)
  if (xl < 104) return [copyAt('whole', v), X - 7, BELT_Y - 20];
  const a = Math.min(4, 1 + Math.floor((xl - 104) / 5)), p = mod(t, BEAT);
  const fall = mode === 'step' ? (xl < 139.5 ? 0 : p >= MOVE ? (p - MOVE) / (BEAT - MOVE) : 1) : Math.max(0, Math.min(1, (xl - 118) / 26));
  if (fall >= 1) return null;
  return [tipping(v, a), Math.min(X + 7, s + 121) - 15 + Math.round(fall * 6), BELT_Y - 26 + Math.round(fall * fall * 100)];
}

// The stations, painted where they stand at this moment.
export function thick(r, x0, y0, x1, y1) {   // a robot arm's segment, 3 pixels thick, lit down its left side
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))), pts = [];
  for (let s = 0; s <= n; s++) pts.push([Math.round(x0 + ((x1 - x0) * s) / n), Math.round(y0 + ((y1 - y0) * s) / n)]);
  for (const [x, y] of pts) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) r.set(x + dx, y + dy, STEEL_C[3]);
  for (const [x, y] of pts) { r.set(x - 1, y, STEEL_C[0]); r.set(x, y, STEEL_C[1]); }
}
export function ladle(r, sx, w) {
  const tilt = w === null ? 0 : w < 0.15 ? w / 0.15 : w < 0.8 ? 1 : 1 - (w - 0.8) / 0.2, th = tilt * 0.75, cs = Math.cos(th), sn = Math.sin(th);
  const cx = sx - 14, cy = 92;
  fillRect(r, cx - 12, 23, 24, 6, STEEL_C[3]); fillRect(r, cx - 12, 23, 24, 1, STEEL_C[1]); for (const wx of [cx - 9, cx + 7]) fillRect(r, wx, 21, 3, 3, STEEL_C[4]);   // its trolley on the rail
  for (const hx of [cx - 13, cx + 13]) { vert(r, hx, 29, cy - 4, STEEL_C[4]); r.set(hx, cy - 3, STEEL_C[1]); }   // the hangers, down to its pivots
  for (let dy = -20; dy <= 20; dy++) for (let dx = -20; dx <= 20; dx++) {
    const u = dx * cs + dy * sn, v = -dx * sn + dy * cs, half = 11 - (v + 10) * 0.12;   // the pot's own frame: u across, v down
    if (v < -10 || v > 11 || Math.abs(u) > half) continue;
    const col = v < -8.5 ? (Math.abs(u) > half - 1.5 ? STEEL_C[1] : HOTS[0][1]) : Math.abs(u) > half - 1.2 ? STEEL_C[4] : u < -half * 0.4 ? STEEL_C[2] : u > half * 0.5 ? STEEL_C[4] : STEEL_C[3];
    r.set(cx + dx, cy + dy, col);
  }
  if (!(w !== null && w >= 0.15 && w < 0.8)) return;
  const lx = Math.round(cx + 11 * cs + 10 * sn), ly = Math.round(cy + 11 * sn - 10 * cs);   // the lip, and the pour down from it
  glow(r, sx, BELT_Y - 12, 22, c('#ff8a30'), 0.35);
  for (let y = ly; y < BELT_Y - 6; y++) { const f = (y - ly) / Math.max(1, BELT_Y - 6 - ly), x = Math.round(lx + (sx - lx) * Math.sqrt(f)); r.set(x - 1, y, HOTS[0][1]); r.set(x, y, HOTS[0][0]); r.set(x + 1, y, HOTS[0][1]); }
}
export function press(r, sx, w) {
  const drop = w === null ? 0 : w < 0.12 ? w / 0.12 : w < 0.5 ? 1 : w < 0.62 ? 1 - (w - 0.5) / 0.12 : 0, top = 98 + Math.round(drop * 39);
  for (const px of [sx - 21, sx + 15]) { fillRect(r, px, 52, 6, BELT_Y + 6 - 52, STEEL_C[3]); fillRect(r, px, 52, 2, BELT_Y + 6 - 52, STEEL_C[1]); fillRect(r, px + 5, 52, 1, BELT_Y + 6 - 52, STEEL_C[4]); }
  fillRect(r, sx - 24, 46, 48, 14, STEEL_C[3]); fillRect(r, sx - 24, 46, 48, 2, STEEL_C[1]); fillRect(r, sx - 24, 59, 48, 1, STEEL_C[4]);
  for (let i = 0; i < 44; i += 8) fillRect(r, sx - 22 + i, 51, 4, 4, c('#e8c020'));   // hazard marks on its crown
  fillRect(r, sx - 3, 60, 6, top - 60, STEEL_C[2]); vert(r, sx - 3, 60, top, STEEL_C[0]);   // the ram's piston, polished
  fillRect(r, sx - 13, top, 26, 10, STEEL_C[3]); fillRect(r, sx - 13, top, 26, 1, STEEL_C[1]); fillRect(r, sx - 13, top + 9, 26, 1, STEEL_C[4]);
  for (const [i, h] of [[-6, 3], [-3, 4], [0, 4], [3, 4], [6, 3]]) fillRect(r, sx + i - 1, top + 9 - h + 1, 3, h - 1, STEEL_C[2]);   // the die: the head and torso's shape, cut into the ram's face
  if (drop > 0.95 && w < 0.5) for (let q = 0; q < 6; q++) r.set(sx - 12 + Math.floor(hash(q, Math.floor(w * 40), 720) * 24), BELT_Y - 6 - Math.floor(hash(q, 1, 720) * 3), c('#d8e4ec'));   // steam as the steel cools
}
export function hingedTable(r, sx, w) {
  const u = w === null ? 0 : w < 0.62 ? 0 : w < 0.92 ? (w - 0.62) / 0.3 : w < 0.97 ? 1 : 1 - (w - 0.97) / 0.03, h = Math.round(1 + u * 17);
  fillRect(r, sx - 12, BELT_Y - h, 24, h, STEEL_C[2]); fillRect(r, sx - 12, BELT_Y - h, 24, 1, STEEL_C[1]); fillRect(r, sx - 12, BELT_Y - 1, 24, 1, STEEL_C[4]);
  if (h > 4) for (const hx of [sx - 10, sx + 9]) r.set(hx, BELT_Y - 2, STEEL_C[0]);   // its hinges
}
export function furnace(r, sx) {   // feeds the press: what goes in one side comes out a hot billet
  fillRect(r, sx - 2, BELT_Y - 36, 44, 40, STEEL_C[4]); fillRect(r, sx - 2, BELT_Y - 36, 44, 2, STEEL_C[2]);
  for (let j = 0; j < 30; j += 6) for (let i = 2; i < 40; i += 12) fillRect(r, sx + i, BELT_Y - 31 + j, 9, 4, STEEL_C[3]);   // brick courses
  for (const ex of [sx - 2, sx + 37]) { fillRect(r, ex, BELT_Y - 9, 5, 9, HOTS[1][1]); fillRect(r, ex + 1, BELT_Y - 8, 3, 7, HOTS[0][0]); }   // its mouths, glowing
  fillRect(r, sx + 14, BELT_Y - 48, 12, 12, STEEL_C[3]); fillRect(r, sx + 14, BELT_Y - 48, 12, 1, STEEL_C[1]);   // the flue
  glow(r, sx + 20, BELT_Y - 2, 26, c('#ff8a30'), 0.25);
}
export function feeder(r, sx) {   // a new belt starting after the last one's pit: a hopper stacked with empty moulds feeds it
  fillRect(r, sx - 4, BELT_Y - 34, 32, 40, STEEL_C[4]); fillRect(r, sx - 4, BELT_Y - 34, 32, 2, STEEL_C[2]); fillRect(r, sx - 4, BELT_Y - 34, 2, 40, STEEL_C[3]);
  for (let j = 0; j < 4; j++) { fillRect(r, sx, BELT_Y - 29 + j * 6, 22, 5, STEEL_C[3]); fillRect(r, sx, BELT_Y - 29 + j * 6, 22, 1, STEEL_C[1]); }
  ellipse(r, sx + 2, BELT_Y + 3, 3, 3, STEEL_C[2]); r.set(sx + 2, BELT_Y + 3, STEEL_C[0]);   // the new belt's first roller
}
export function gate(r, sx) {   // the gate into phase 3's arms
  fillRect(r, sx - 2, BELT_Y - 40, 44, 6, STEEL_C[3]); fillRect(r, sx - 2, BELT_Y - 40, 44, 1, STEEL_C[1]);
  for (const px of [sx - 2, sx + 36]) { fillRect(r, px, BELT_Y - 40, 6, 46, STEEL_C[3]); fillRect(r, px, BELT_Y - 40, 1, 46, STEEL_C[1]); }
  for (let x = sx + 4; x < sx + 36; x += 3) for (let y = BELT_Y - 34; y < BELT_Y; y++) r.set(x, y, x % 2 ? STEEL_C[4] : c('#3a4450'));   // a curtain of strips
  fillRect(r, sx + 17, BELT_Y - 45, 6, 5, STEEL_C[4]); fillRect(r, sx + 18, BELT_Y - 44, 4, 3, c('#5cd0ff')); glow(r, sx + 20, BELT_Y - 43, 8, c('#5cd0ff'), 0.4);
}
/** A pair of arms over the item at sx: 0 fits arms, 1 welds them, 2 fits legs, 3 welds them. */
export function armPair(r, sx, w, job, t) {
  const fit = job % 2 === 0, legs = job >= 2;
  fillRect(r, sx - 10, 22, 20, 9, STEEL_C[3]); fillRect(r, sx - 10, 22, 20, 1, STEEL_C[1]); fillRect(r, sx - 10, 30, 20, 1, STEEL_C[4]);   // the carriage on the rail
  fillRect(r, sx - 2, 31, 4, 62, STEEL_C[3]); vert(r, sx - 2, 31, 93, STEEL_C[1]); fillRect(r, sx - 7, 90, 14, 7, STEEL_C[3]); fillRect(r, sx - 7, 90, 14, 1, STEEL_C[1]);   // its mast and the hub the arms turn on
  if (fit) {   // the parts bin, hanging under the hub, parts sticking out of its top
    fillRect(r, sx - 6, 100, 12, 8, STEEL_C[2]); fillRect(r, sx - 6, 100, 12, 1, STEEL_C[1]); fillRect(r, sx - 6, 107, 12, 1, STEEL_C[4]); vert(r, sx, 97, 100, STEEL_C[4]);
    for (const px of [sx - 5, sx - 1, sx + 3]) fillRect(r, px, 98, legs ? 3 : 2, 2, STEEL_C[1]);
  }
  for (const side of [-1, 1]) {
    const sh = [sx + side * 6, 95], rest = [sx + side * 16, 118], bin = [sx + side * 4, 103];
    const target = legs ? [sx + side * 3, BELT_Y - (fit ? 4 : 7)] : [sx + side * 7, BELT_Y - (fit ? 9 : 10)];
    const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    let hand = rest, carry = false;
    if (w !== null && fit) {
      if (w < 0.3) hand = lerp(rest, bin, ease(w / 0.3)); else if (w < 0.4) hand = bin; else if (w < 0.7) { hand = lerp(bin, target, ease((w - 0.4) / 0.3)); carry = true; } else if (w < 0.85) hand = target; else hand = lerp(target, rest, ease((w - 0.85) / 0.15));
    } else if (w !== null) hand = w < 0.2 ? lerp(rest, target, ease(w / 0.2)) : w < 0.8 ? target : lerp(target, rest, ease((w - 0.8) / 0.2));
    const [hx, hy] = hand.map(Math.round), mx = (sh[0] + hx) / 2, my = (sh[1] + hy) / 2, len = Math.hypot(hx - sh[0], hy - sh[1]);
    const ex = Math.round(mx + side * Math.min(12, Math.max(5, 26 - len * 0.3))), ey = Math.round(my - 2);   // the elbow, bent outwards
    thick(r, sh[0], sh[1], ex, ey); thick(r, ex, ey, hx, hy);
    for (const [jx, jy] of [sh, [ex, ey]]) { fillRect(r, jx - 1, jy - 1, 3, 3, c('#e8a020')); r.set(jx, jy, STEEL_C[0]); }
    if (fit) { r.set(hx - 1, hy + 1, STEEL_C[1]); r.set(hx + 1, hy + 1, STEEL_C[1]); }   // a gripper
    else { r.set(hx, hy + 1, STEEL_C[1]); r.set(hx, hy + 2, w !== null && w >= 0.2 && w < 0.8 ? WHITE : STEEL_C[3]); }   // a torch
    if (carry) fillRect(r, hx - 1, hy + 1, legs ? 3 : 2, legs ? 5 : 4, STEEL_C[1]);   // the part it carries
    if (!fit && w !== null && w >= 0.2 && w < 0.8) {   // welding: a spark at the joint, flecks flying
      const fx = hx, fy = hy + 2, fl = Math.floor(t / 3) % 2;
      for (const [dx, dy] of [[0, -2 - fl], [0, 2 + fl], [-2 - fl, 0], [2 + fl, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) r.set(fx + dx, fy + dy, c('#a8e8ff'));
      r.set(fx, fy, WHITE);
      for (let q = 0; q < 4; q++) r.set(fx + Math.round(Math.cos(q * 1.6 + (TAU * mod(t, 24)) / 24) * (3 + q)), fy + 2 + q, c('#ffd060'));
    }
  }
}
/** The line's window [L, L + W): the units it is built of in this picture, its belt, its stations and what rides on it. */
export function paintPhases(r, mode, unitOf, L, t) {
  const units = [];
  for (let u = unitOf(L - 400); u && u[1] < L + W + 40; u = unitOf(u[1] + UNIT[u[0]])) units.push(u);
  for (let x = 0; x < W; x++) if (unitOf(x + L)) { r.set(x, 20, STEEL_C[2]); for (let y = 21; y < 25; y++) r.set(x, y, mod(x + L, 16) === 3 && y === 22 ? STEEL_C[1] : STEEL_C[3]); r.set(x, 25, STEEL_C[4]); }   // the overhead rail
  for (const [kind, s] of units) {
    const x1 = s - L, x2 = x1 + (kind === 'end' ? 121 : UNIT[kind]);
    for (let x = Math.max(0, x1); x < Math.min(W, x2); x++) {
      r.set(x, BELT_Y, STEEL_C[1]);
      for (let y = BELT_Y + 1; y < BELT_Y + 6; y++) r.set(x, y, y === BELT_Y + 5 ? STEEL_C[4] : STEEL_C[3]);
      if (mod(x + L - Math.round(beltAt(mode, t)), 10) < 5) r.set(x, BELT_Y + 2, STEEL_C[2]);   // the belt's treads, moving with it
    }
    for (let lx = s + 30; lx < s + (kind === 'end' ? 120 : UNIT[kind]); lx += 60) { fillRect(r, lx - L, BELT_Y + 6, 4, 178 - BELT_Y - 6, STEEL_C[4]); fillRect(r, lx - L, BELT_Y + 6, 1, 178 - BELT_Y - 6, STEEL_C[2]); }
    if (kind === 'end') {   // the belt's end roller, then the pit: black, running on down below the floor, a hazard stripe round its lip and a red lamp
      ellipse(r, x1 + 120, BELT_Y + 3, 3, 3, STEEL_C[2]); r.set(x1 + 120, BELT_Y + 3, STEEL_C[0]);
      fillRect(r, x1 + 124, BELT_Y - 2, 76, H - BELT_Y + 2, c('#020204'));
      for (let x = x1 + 122; x < x1 + 200; x++) r.set(x, BELT_Y - 3, mod(x + L, 8) < 4 ? c('#e8c020') : c('#1e1a14'));
      for (let y = BELT_Y - 3; y < H; y++) r.set(x1 + 123, y, mod(y, 8) < 4 ? c('#e8c020') : c('#1e1a14'));
      vert(r, x1 + 196, 118, BELT_Y - 3, STEEL_C[3]); glow(r, x1 + 196, 116, 10, c('#ff3a2a'), 0.5); fillRect(r, x1 + 195, 114, 3, 3, c('#ff3a2a'));
    }
  }
  for (const [kind, s] of units) if (kind === 'p2') { const [px, w] = stationAt(mode, s + 60, t); hingedTable(r, Math.round(px - L), w); }
  for (const [X, v] of (() => { const b = mod(beltAt(mode, t), 4 * SLOT), out = []; for (let k = Math.floor((L - 80 - b) / SLOT); 20 + b + k * SLOT < L + W + 40; k++) out.push([20 + b + k * SLOT, mod(k, 4)]); return out; })()) {
    const look = lookOf(mode, unitOf, X, v, t);
    if (look) stamp(r, look[0], Math.round(look[1] - L), Math.round(look[2]));
  }
  for (const [kind, s] of units) { if (kind === 'p2') furnace(r, s - L); if (kind === 'p3') gate(r, s - L); if (kind === 'p1' && unitOf(s - 1)?.[0] === 'end') feeder(r, s - L); }
  for (const [kind, s] of units) {
    if (kind === 'p1') { const [px, w] = stationAt(mode, s + 60, t); ladle(r, Math.round(px - L), w); }
    if (kind === 'p2') { const [px, w] = stationAt(mode, s + 60, t); press(r, Math.round(px - L), w); }
    if (kind === 'p3') ARM_AT.forEach((x0, job) => { const [px, w] = stationAt(mode, s + x0, t); armPair(r, Math.round(px - L), w, job, t); });
  }
}
/** A walk: still for 20 frames at `from`, then the line pans 4.5 pixels a frame (the camera 9, about walking pace) for `length`, then still. */
export const walker = ({ from, length }) => (f) => from + Math.max(0, Math.min(length, (f - 20) * 4.5));
export const walkPicture = (name, mode, unitOf, w, mute = 0) => {
  const at = walker(w);
  return { name, frames: 40 + Math.ceil(w.length / 4.5) + 1, fps: 10, walk: (f) => (at(f) - w.from) * 2,
    paint: (r, f) => { const L = at(f); lineWall(r, mod(Math.round(L * 0.2), 480)); paintPhases(r, mode, unitOf, Math.round(L), f * 6); if (mute) muted(r, mute); } };
};
/** The backdrop pushed back behind the floor: its colours greyed a third of the way and darkened towards the hall's haze. */
export const HAZE = c('#161a22');
export function muted(r, k) {
  for (let i = 0; i < r.d.length; i += 4) {
    if (!r.d[i + 3]) continue;
    const g = 0.3 * r.d[i] + 0.59 * r.d[i + 1] + 0.11 * r.d[i + 2];
    for (let q = 0; q < 3; q++) { const v = r.d[i + q] + (g - r.d[i + q]) * 0.35; r.d[i + q] = Math.round(v + (HAZE[q] - v) * k); }
  }
}

// ── THE LINE IN THE GAME ─────────────────────────────────────────────
/*
 * The owner, 9 Nov 2026: "i hate 2, where the whole process repeats. lock in 1" — the line runs by
 * phases; and for what moves it on, the time to the door ("percentage distance between spawn point
 * and boss door", then, since a door is placed by its timer and not ahead of time, "Time to the
 * door"). So `prog` is how much of the area's door timer has passed, 0 to 1, and stays 1 once the
 * door is out.
 *
 * Each stretch of belt (a unit: a ladle, a press, the arms, or the end over the pit) takes its phase
 * from `prog` at the moment it first comes in at the right edge, and keeps it, so what is on screen
 * never changes under the player's eyes: a phase's machines stay until they scroll off to the left.
 * Phase 1 until 30% of the timer, phase 2 until 60%, phase 3 until 85%, then the belt's end and its
 * pit, once, and no belt past it. The belt is always moving ("flow"), and the whole line is muted so
 * it sits back behind the floor, as the owner picked on 7 Nov 2026.
 *
 * Painted once, then only placed, like every area: each unit's belt and legs, each thing that rides
 * the belt, and each station at sixteen points of its work are small pictures painted when the area
 * is built; `at` only says which goes where. A station's picture is cropped to what it covers.
 */
export const MUTE = 0.42;
const L0 = -240, STEPS = 16, PHASE_AT = [0.3, 0.6, 0.85];
const phaseFor = (prog) => (prog === undefined || prog < PHASE_AT[0] ? 'p1' : prog < PHASE_AT[1] ? 'p2' : prog < PHASE_AT[2] ? 'p3' : 'end');
const qw = (w) => (w === null ? 'n' : Math.min(STEPS, Math.round(w * STEPS)));
const wOf = (q) => (q === 'n' ? null : q / STEPS);

/** Paint `paint(r, ox)` into a picture `wide` across, ox in from its left, mute it and crop it to what it covers. */
function cropped(name, wide, ox, paint, out, off) {
  const r = new Raster(wide, H);
  paint(r, ox);
  let x0 = wide, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < wide; x++) if (r.d[(y * wide + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
  const p = new Raster(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = (y * wide + x) * 4; if (r.d[k + 3]) p.set(x - x0, y - y0, [r.d[k], r.d[k + 1], r.d[k + 2]], r.d[k + 3]); }
  muted(p, MUTE);
  out.push([name, p]);
  off.set(name, [x0 - ox, y0]);
}
/** A unit's belt, legs, rail and (for the end) its roller and pit, as paintPhases draws them; `front` is the furnace or the gate, drawn over what rides the belt. */
function unitBack(r, ox, kind) {
  const w = kind === 'end' ? 121 : UNIT[kind];
  for (let x = 0; x < w; x++) {
    r.set(ox + x, 20, STEEL_C[2]); for (let y = 21; y < 25; y++) r.set(ox + x, y, mod(x, 16) === 3 && y === 22 ? STEEL_C[1] : STEEL_C[3]); r.set(ox + x, 25, STEEL_C[4]);
    r.set(ox + x, BELT_Y, STEEL_C[1]);
    for (let y = BELT_Y + 1; y < BELT_Y + 6; y++) r.set(ox + x, y, y === BELT_Y + 5 ? STEEL_C[4] : STEEL_C[3]);
  }
  for (let lx = 30; lx < w; lx += 60) { fillRect(r, ox + lx, BELT_Y + 6, 4, 178 - BELT_Y - 6, STEEL_C[4]); fillRect(r, ox + lx, BELT_Y + 6, 1, 178 - BELT_Y - 6, STEEL_C[2]); }
  if (kind === 'end') {
    const x1 = ox;
    ellipse(r, x1 + 120, BELT_Y + 3, 3, 3, STEEL_C[2]); r.set(x1 + 120, BELT_Y + 3, STEEL_C[0]);
    fillRect(r, x1 + 124, BELT_Y - 2, 76, H - BELT_Y + 2, c('#020204'));
    for (let x = x1 + 122; x < x1 + 200; x++) r.set(x, BELT_Y - 3, mod(x - ox, 8) < 4 ? c('#e8c020') : c('#1e1a14'));
    for (let y = BELT_Y - 3; y < H; y++) r.set(x1 + 123, y, mod(y, 8) < 4 ? c('#e8c020') : c('#1e1a14'));
    vert(r, x1 + 196, 118, BELT_Y - 3, STEEL_C[3]); glow(r, x1 + 196, 116, 10, c('#ff3a2a'), 0.5); fillRect(r, x1 + 195, 114, 3, 3, c('#ff3a2a'));
  }
}
/** The belt's treads, moving with it: a dash every ten pixels, as one small picture placed along each unit. */
const TREAD = 10;

/** The line as a moving part of the game's backdrop. `fresh()` forgets the units, for a new area. */
export const LINE_PHASES = {
  units: [],
  fresh() { this.units = []; },
  pieces() {
    const out = [], off = (this.off = new Map());
    for (const kind of ['p1', 'p2', 'p3', 'end']) {
      cropped(`back-${kind}`, (kind === 'end' ? 200 : UNIT[kind]) + 16, 8, (r, ox) => unitBack(r, ox, kind), out, off);
      if (kind === 'p2') cropped('front-p2', 80, 16, (r, ox) => furnace(r, ox), out, off);
      if (kind === 'p3') cropped('front-p3', 80, 16, (r, ox) => gate(r, ox), out, off);
    }
    cropped('tread', 6, 0, (r) => fillRect(r, 0, BELT_Y + 2, 5, 1, STEEL_C[2]), out, off);
    const qs = ['n', ...Array.from({ length: STEPS + 1 }, (_, q) => q)];
    for (const q of qs) {
      cropped(`ladle-${q}`, 90, 50, (r, sx) => ladle(r, sx, wOf(q)), out, off);
      cropped(`press-${q}`, 70, 35, (r, sx) => press(r, sx, wOf(q)), out, off);
      cropped(`table-${q}`, 40, 20, (r, sx) => hingedTable(r, sx, wOf(q)), out, off);
      for (let job = 0; job < 4; job++) {
        const welding = job % 2 === 1 && q !== 'n' && wOf(q) >= 0.2 && wOf(q) < 0.8;
        for (let k = 0; k < (welding ? 4 : 1); k++) cropped(`arm-${job}-${q}-${k}`, 90, 45, (r, sx) => armPair(r, sx, wOf(q), job, k * 6), out, off);
      }
    }
    // Everything that rides the belt, every look it can have: the same pictures the canvas stamps.
    for (let T = 0; T < 3; T++) mould(T);
    rawBillet();
    for (let k = 0; k < 4; k++) slab(k);
    for (const h of [4, 8, 12]) rising(h);
    for (let v = 0; v < 4; v++) { for (const st of ['torso', 'arms', 'whole']) copyAt(st, v); for (let a = 1; a <= 4; a++) tipping(v, a); }
    this.names = new Map();
    for (const [name, p] of ITEMS) {
      const m = new Raster(p.w, p.h);
      for (let i = 0; i < p.d.length; i++) m.d[i] = p.d[i];
      muted(m, MUTE);
      out.push([`item-${name}`, m]);
      off.set(`item-${name}`, [0, 0]);
      this.names.set(p, `item-${name}`);
    }
    return out;
  },
  /** The unit at line x, [kind, start], or null past the end. Left of the start, ladles repeat. */
  unitOf(x) {
    if (x < 0) return ['p1', Math.floor(x / UNIT.p1) * UNIT.p1];
    for (const u of this.units) if (x < u[1] + UNIT[u[0]]) return u;
    return null;
  },
  at(ox, t, px, prog) {
    if (!this.off) this.pieces();
    const L = ox + L0, out = [], off = this.off, put = (n, x, y) => { const o = off.get(n); out.push([n, Math.round(x + o[0]), y + o[1]]); };
    // New units come in at the right edge with the phase of the moment; the end comes once, then no more belt.
    for (let next = this.units.length ? this.units.at(-1)[1] + UNIT[this.units.at(-1)[0]] : 0; this.units.at(-1)?.[0] !== 'end' && next < L + W + 40; next += UNIT[this.units.at(-1)[0]]) this.units.push([phaseFor(prog), next]);
    const unitOf = (x) => this.unitOf(x), units = [];
    for (let u = unitOf(L - 400); u && u[1] < L + W + 40; u = unitOf(u[1] + UNIT[u[0]])) units.push(u);
    const belt = (SLOT * t) / BEAT;
    for (const [kind, s] of units) {
      put(`back-${kind}`, s - L, 0);
      for (let x = mod(Math.round(belt) - s, TREAD); x < (kind === 'end' ? 121 : UNIT[kind]) - 5; x += TREAD) if (s + x - L > -6 && s + x - L < W) put('tread', s + x - L, 0);
    }
    for (const [kind, s] of units) if (kind === 'p2') { const [sx, w] = stationAt('flow', s + 60, t); put(`table-${qw(w)}`, sx - L, 0); }
    const b = mod(belt, 4 * SLOT);
    for (let k = Math.floor((L - 80 - b) / SLOT); 20 + b + k * SLOT < L + W + 40; k++) {
      const look = lookOf('flow', unitOf, 20 + b + k * SLOT, mod(k, 4), t);
      if (look) put(this.names.get(look[0]), look[1] - L, Math.round(look[2]));
    }
    for (const [kind, s] of units) if (kind === 'p2' || kind === 'p3') put(`front-${kind}`, s - L, 0);
    for (const [kind, s] of units) {
      if (kind === 'p1') { const [sx, w] = stationAt('flow', s + 60, t); put(`ladle-${qw(w)}`, sx - L, 0); }
      if (kind === 'p2') { const [sx, w] = stationAt('flow', s + 60, t); put(`press-${qw(w)}`, sx - L, 0); }
      if (kind === 'p3') ARM_AT.forEach((x0, job) => {
        const [sx, w] = stationAt('flow', s + x0, t), q = qw(w), welding = job % 2 === 1 && q !== 'n' && wOf(q) >= 0.2 && wOf(q) < 0.8;
        put(`arm-${job}-${q}-${welding ? Math.floor(mod(t, 24) / 6) : 0}`, sx - L, 0);
      });
    }
    return out;
  },
};
/** One colour muted the way `muted` mutes a picture, for painters that only `set`. */
const muteCol = (c, k = MUTE) => { const g = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; return [0, 1, 2].map((q) => { const v = c[q] + (g - c[q]) * 0.35; return Math.round(v + (HAZE[q] - v) * k); }); };
const mutes = (r) => ({ set: (x, y, col, a) => r.set(x, y, col && muteCol(col), a) });
/** Steel's picked backdrop in the game: the far wall, then the line, both muted. */
export const STEEL_LINE = {
  name: 'ASSEMBLY LINE', moving: true, loop: 480,
  desc: 'The line by phases (loop 1): ladles, then presses, then the arms, then the belt\'s end over the pit, as the door timer runs down.',
  layers: [
    { rate: 0.06, period: 480, fixed: (r, ox) => lineWall(mutes(r), ox), parts: [], paint: (r, b, ox) => lineWall(mutes(r), ox) },
    { rate: 0.2, parts: [LINE_PHASES], paint: (r, b, ox, t = 0, px, prog) => { const at = LINE_PHASES; const atlas = (at.atlas ??= new Map(at.pieces())); for (const [n, x, y] of at.at(ox, t, px, prog)) { const p = atlas.get(n); for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) { const k = (j * p.w + i) * 4; if (p.d[k + 3]) r.set(x + i, y + j, [p.d[k], p.d[k + 1], p.d[k + 2]], p.d[k + 3]); } } } },
  ],
};
/** Steel's picked material in the game: the first round's steel plates, with the blast doors (owner, 9 Nov 2026: "B"). */
export const STEEL_PICK = { ...STEEL_PLATES, ...steelDoors(blastDoor), name: 'B' };
