/**
 * BOSS DEATH — the generic one, and the hook for a weakness death.
 *
 * THE OWNER'S RULE (bug, build 1210): every boss death is either GENERIC or a
 * WEAKNESS DEATH — the one his tracker `boss notes` describe for when his
 * weakness lands the killing blow. The four element deaths that played
 * "whatever killed him" (Fire burning down, Water draining, Electric
 * overloading, Fighting's knockout) went with that rule. A weakness death is
 * added here the day its boss's notes are built.
 *
 * THE GENERIC DEATH: his idle picture flashes white and his primary colour,
 * then fades out. No debris. A boss with a drawn sheet (Strike Man) flashes
 * his own idle sprite — GameScene draws that, using `look(d)` below; every
 * other boss is still a rectangle, so it is drawn here.
 *
 * The bookkeeping in GameScene.killBoss (the unlock, the drops) lands on the
 * frame he dies, so a death can never strand a run. The door out, the
 * post-fight track and the wheel wait until this has finished playing.
 */

import { hexNum } from './assets.js';

/** How long a death plays, in fixed steps. */
const DEATH_FRAMES = 100;
/** He holds full strength this long, then fades over the rest. */
const HOLD = 50;
/** Steps per flash colour. */
const FLASH = 4;

export function makeDeath(b) {
  return {
    id: b.id,
    x: b.x, y: b.y, w: b.w, h: b.h, facing: b.facing ?? -1,
    primary: hexNum(b.primary), secondary: hexNum(b.secondary),
    outline: hexNum(b.outline || '#0A0A12'),
    t: 0, max: DEATH_FRAMES,
  };
}

/** Advance one death. Returns false once it is finished and can be dropped. */
export function stepDeath(d) {
  if (!d) return false;
  d.t++;
  return d.t < d.max;
}

/** This step's flash colour and how solid he still is. */
export function look(d) {
  return {
    fill: Math.floor(d.t / FLASH) % 2 === 0 ? 0xFFFFFF : d.primary,
    alpha: d.t < HOLD ? 1 : Math.max(0, 1 - (d.t - HOLD) / (d.max - HOLD)),
  };
}

/**
 * Draw a rectangle boss's death. `sx`/`sy` convert world to screen, shake
 * included, as every other draw path in GameScene does.
 */
export function drawDeath(g, sx, d, sy = (v) => v) {
  if (!d) return;
  const { fill, alpha } = look(d);
  g.fillStyle(fill, alpha);
  g.fillRect(sx(d.x), sy(d.y), d.w, d.h);
}
