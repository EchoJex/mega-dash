/**
 * THE QUAKE HAMMER'S PLACEHOLDER RIG — what `npm run art:placeholders --
 * quake_hammer` paints into its five sheets.
 *
 * Two jobs, and only the second is lasting:
 *
 *   THE PICTURES are the game's own fallback shapes (`drawHammerShape` and
 *   friends in systems/weaponry.js) painted cell by cell — the plainest thing
 *   that shows the size and the motion. Design redraws every one of them.
 *
 *   THE FRAME DATA is the real content: how many frames each move has, how
 *   long each shows, which frame hits and where. It starts as Smash
 *   Ultimate's numbers for Dedede, which the owner asked for by name:
 *
 *     jab 1  hits on step 10, free on 33      (SmashWiki: 10, IASA 33)
 *     jab 2  hits on step 11, free on 28      (11, 28)
 *     jab 3  hits on step 4, free on 50       (the finisher)
 *     swing  hits 10 steps after release, free on 70 at full charge (Jet Hammer)
 *
 *   and each clip's holds are laid out so a frame boundary falls exactly on
 *   its hit. After this runs once the `.sprite` files own all of it; this rig
 *   only matters again if the sheets are ever started over.
 *
 * HIT AREAS ARE MEASURED, NOT CHOSEN. A move's hit area is the box round the
 * hammer head as drawn on its hit frame and on the frame before it — the sweep
 * the eye sees — stretched back to his hand, plus a pixel all round: the
 * player's attacks get a slightly generous box (CLAUDE.md, rule 4).
 */
import {
  HAMMER_SHAPE, hammerDeg, drawHammerShape, drawSpikeShape, drawDustShape, drawSandShape,
} from '../../src/systems/weaponry.js';
import { ladderAt } from '../../src/data/weapons.js';
import { readFileSync } from 'node:fs';

const OUTLINE = { key: '0', hex: '#0A0A12', name: 'outline' };

/** Bounding box of the plain hammer's head at `deg`, from the grip, facing right. */
function headBox(deg) {
  const r = (deg * Math.PI) / 180, R = HAMMER_SHAPE.reach;
  const cx = Math.cos(r) * R, cy = -Math.sin(r) * R;
  const along = (HAMMER_SHAPE.head.thick + 3) / 2, across = (HAMMER_SHAPE.head.across + 1) / 2;
  const hx = along * Math.abs(Math.cos(r)) + across * Math.abs(Math.sin(r));
  const hy = along * Math.abs(Math.sin(r)) + across * Math.abs(Math.cos(r));
  return { x0: cx - hx, y0: cy - hy, x1: cx + hx, y1: cy + hy };
}

/** The sweep from one pose to the next, back to the hand, a pixel generous — in sheet pixels. */
function sweepArea(degs, pivot, grid) {
  const bs = degs.map(headBox);
  let x0 = Math.min(0, ...bs.map((b) => b.x0)), x1 = Math.max(0, ...bs.map((b) => b.x1));
  let y0 = Math.min(...bs.map((b) => b.y0)), y1 = Math.max(...bs.map((b) => b.y1));
  x0 = Math.max(0, Math.floor(x0 - 1 + pivot.x)); y0 = Math.max(0, Math.floor(y0 - 1 + pivot.y));
  x1 = Math.min(grid.w, Math.ceil(x1 + 1 + pivot.x)); y1 = Math.min(grid.h, Math.ceil(y1 + 1 + pivot.y));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * One move as frames: `holds` laid out so frame `hitAt` starts on the hit,
 * each frame painted at the pose its first step shows in the game.
 */
function moveFrames(move, holds, hitAt, pivot, grid) {
  const hit = holds.slice(0, hitAt).reduce((a, b) => a + b, 0);
  let t = 0;
  return holds.map((hold, i) => {
    const deg = hammerDeg(move, t, hit);
    const f = { hold, paint: (g) => drawHammerShape(g, pivot.x, pivot.y, 1, deg) };
    if (i === hitAt) {
      const prev = hammerDeg(move, Math.max(0, t - holds[i - 1]), hit);
      f.hit = sweepArea([prev, deg], pivot, grid);
    }
    f.deg = deg;
    t += hold;
    return f;
  });
}

export function rig() {
  const heldGrid = { w: 56, h: 56 }, grip = { x: 28, y: 28 };
  const held = {
    sheet: 'held',
    pivot: grip,
    palette: [
      OUTLINE,
      { key: '1', hex: '#A76625', name: 'head (Quake Man primary)' },
      { key: '2', hex: '#D9B56A', name: 'Quake Man secondary' },
      { key: '3', hex: '#8A5A2B', name: 'handle' },
      { key: '4', hex: '#D08A44', name: 'head highlight' },
    ],
    clips: {
      jabTwo: moveFrames('jab2', [4, 4, 3, 3, 5, 9], 3, grip, heldGrid),
      jabThree: moveFrames('jab3', [2, 2, 4, 6, 10, 12, 14], 2, grip, heldGrid),
      // Held overhead, swaying a little; at full charge it trembles, and the
      // first frame's spawn point is the head the tell's dust puffs from.
      charge: [105, 103].map((deg) => ({ hold: 20, paint: (g) => drawHammerShape(g, grip.x, grip.y, 1, deg) })),
      chargeFull: [109, 101].map((deg, i) => {
        const r = (HAMMER_SHAPE.overhead * Math.PI) / 180;
        return {
          hold: 3, paint: (g) => drawHammerShape(g, grip.x, grip.y, 1, deg),
          ...(i === 0 ? {
            spawn: {
              x: Math.round(grip.x + Math.cos(r) * HAMMER_SHAPE.reach),
              y: Math.round(grip.y - Math.sin(r) * HAMMER_SHAPE.reach),
            },
          } : {}),
        };
      }),
      swing: moveFrames('swing', [3, 3, 4, 4, 6, 20, 30], 3, grip, heldGrid),
      dive: [HAMMER_SHAPE.dive, HAMMER_SHAPE.dive + 4].map((deg) => ({
        hold: 4, paint: (g) => drawHammerShape(g, grip.x, grip.y, 1, deg),
      })),
      // In his hand while it is live and not mid-move.
      rest: [{ hold: 5, paint: (g) => drawHammerShape(g, grip.x, grip.y, 1, HAMMER_SHAPE.rest) }],
    },
  };
  // The swing lands where the head meets the floor: its spawn point. The floor
  // is 12 below his hand (he is 24 tall and the hand is halfway down).
  const sw = held.clips.swing.find((f) => f.hit);
  const sr = (sw.deg * Math.PI) / 180;
  sw.spawn = { x: Math.round(grip.x + Math.cos(sr) * HAMMER_SHAPE.reach), y: grip.y + 12 };

  // ── Effects ──────────────────────────────────────────────────────────
  const DUST = [
    { key: '0', hex: '#0A0A12', name: 'outline (free for the art)' },
    { key: '1', hex: '#CDB892', name: 'dust shade' },
    { key: '2', hex: '#E6D6B0', name: 'dust light' },
  ];
  // The pivot is the floor under the cloud's middle: the sheet's bottom edge.
  const foot = { x: 32, y: 40 };
  /**
   * A cloud of radius `r` on the floor: it hurts once, on its first frame,
   * everything in the box over the floor its placeholder circle reached.
   */
  const cloud = (r, holds) => {
    const total = holds.reduce((a, b) => a + b, 0);
    let t = 0;
    return holds.map((hold, i) => {
      const u = t / total;
      t += hold;
      return {
        hold, paint: (g) => drawDustShape(g, foot.x, foot.y, r, u, 0.15, false),
        ...(i === 0 ? { hit: { x: foot.x - r, y: foot.y - r, w: 2 * r, h: r } } : {}),
      };
    });
  };
  const dust = {
    sheet: 'dust', pivot: foot, palette: DUST,
    clips: {
      small: cloud(10, [4, 4, 6, 10]),
      medium: cloud(16, [4, 6, 8, 14]),
      large: cloud(24, [4, 6, 10, 20]),
    },
  };
  const centre = { x: 6, y: 6 };
  const puffClip = (holds) => {
    const total = holds.reduce((a, b) => a + b, 0);
    let t = 0;
    return holds.map((hold) => {
      const u = t / total;
      t += hold;
      return { hold, paint: (g) => drawDustShape(g, centre.x, centre.y + 2, 3, u, 0.15, true) };
    });
  };
  const puff = {
    sheet: 'puff', pivot: centre, palette: DUST,
    clips: { tell: puffClip([4, 6, 8]), block: puffClip([3, 4, 5]) },
  };

  // Spikes: their angles and lengths are the ladder's; one clip per angle.
  const S = ladderAt('quake_hammer', 10).spikes;
  const base = { x: 4, y: 47 };
  const SPIKE_NAMES = ['flat', 'low', 'high', 'steep'];
  if (S.angles.length !== SPIKE_NAMES.length) throw new Error('one spike clip per ladder angle');
  const spikeClip = (deg, len) => [
    // Growing: 5 steps, hurting all the way (a bare `hit` on each).
    ...[[2, 0.2], [2, 0.6], [1, 1]].map(([hold, u]) => ({
      hold, hit: true, paint: (g) => drawSpikeShape(g, base.x, base.y, 1, deg, len, u, false),
    })),
    // Standing: half a second, flickering pale over its last few steps.
    ...[[24, false], [2, true], [2, false], [2, true]].map(([hold, pale]) => ({
      hold, paint: (g) => drawSpikeShape(g, base.x, base.y, 1, deg, len, 1, pale),
    })),
  ];
  const spike = {
    sheet: 'spike', pivot: base,
    palette: [
      OUTLINE,
      { key: '1', hex: '#D9B56A', name: 'sand' },
      { key: '2', hex: '#A88445', name: 'sand shade' },
      { key: '3', hex: '#6E5226', name: 'sand edge' },
      { key: '4', hex: '#F0D898', name: 'crumbling' },
    ],
    clips: Object.fromEntries(SPIKE_NAMES.map((n, i) => [n, spikeClip(S.angles[i], S.lens[i])])),
  };
  const grain = { x: 2, y: 2 };
  const sand = {
    sheet: 'sand', pivot: grain,
    palette: [
      OUTLINE,
      { key: '1', hex: '#D9B56A', name: 'sand' },
      { key: '2', hex: '#B8923F', name: 'sand shade' },
    ],
    clips: {
      light: [{ hold: 5, paint: (g) => drawSandShape(g, grain.x, grain.y, 0) }],
      dark: [{ hold: 5, paint: (g) => drawSandShape(g, grain.x, grain.y, 1) }],
    },
  };
  return [held, dust, puff, spike, sand];
}

/**
 * WHAT THE CODE HOLDS THE DRAWING TO, in words, for the brief Design reads
 * (`npm run art:brief`). Worked out from the ladder each time, so a window
 * moved in the ladder moves here too. `tests/quake-hammer.test.js` enforces
 * every one of these.
 */
export function constraints() {
  const L = ladderAt('quake_hammer', 1), L10 = ladderAt('quake_hammer', 10);
  const names = ['jabTwo', 'jabThree'];
  const out = [];
  L.jab.forEach((j, i) => {
    if (j.open === undefined) return;
    out.push(`**${names[i]}**: a press during it carries on into ${names[i + 1]}, which starts no earlier than `
      + `step ${j.open}, so ${names[i]} has to hit before step ${j.open} and last longer than ${j.open} steps.`);
  });
  out.push(`**swing**: a full charge starts it ${L.swing.fullSooner} step in, and an uncharged one lets go `
    + `${L.swing.weakShorter} steps before its end — so it has to hit after step ${L.swing.fullSooner} and `
    + `more than ${L.swing.weakShorter} steps before it ends.`);
  // Where a minion stands against his front, from his hand: he is 12 wide
  // round his middle and his hand is 5 in front of it, so the minion's box
  // starts 1 past the hand and runs 12 on; the floor is 12 below the hand.
  const pv = JSON.parse(readFileSync(new URL('../../src/data/frame-data.json', import.meta.url), 'utf8'))
    ['weapon:quake_hammer:held']?.pivot ?? { x: 28, y: 28 };
  out.push('**every jab and the swing** must reach a minion standing against his front: the hit area has to '
    + `overlap the square from (${pv.x + 1}, ${pv.y}) to (${pv.x + 13}, ${pv.y + 12}) on the held sheet — just `
    + 'right of his hand, down to the floor. Facing left is the same, mirrored.');
  out.push('**the swing\'s spawn point** is where the hammer head meets the floor: the dust and the spikes start '
    + `there. The floor is 12 pixels below his hand (row ${pv.y + 12} on the held sheet).`);
  out.push(`**the spikes** keep the ladder's angles and lengths, shallowest first: ${L10.spikes.angles
    .map((a, i) => `${['flat', 'low', 'high', 'steep'][i]} ${a}° and ${L10.spikes.lens[i]} px`).join(', ')}, `
    + 'measured from the pivot. A spike hurts along that line while its `hit` frames show, then blocks along it.');
  out.push('**the dust clouds** hurt once, on their hit frame, everything in the hit area — except whatever the '
    + 'hammer itself just hit. Each lasts exactly as long as its clip.');
  return out;
}
