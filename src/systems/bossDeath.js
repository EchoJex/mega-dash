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

/**
 * WEAKNESS DEATHS, per boss and per element that landed the killing blow
 * (Burn and Poisoned ticks included). Only the Grass boss has any so far.
 *
 *  ash    (Grass, Fire) "if off the ground return to ground level, then fall
 *         to his knees and otherwise limp. Frame by frame slowly fade all
 *         colors on the boss to ash grey, then blow away like grey cherry
 *         blossom petals."
 *  leaves (Grass, Poison) "...fall to his knees and otherwise limp. Frame by
 *         frame slowly fade all greens on the boss to dry brown, then
 *         anything that was originally green gets blown off like rustling
 *         leaves in the fall, leaving a very thin, tree trunk like silhouette
 *         that blends in well with the background."
 *
 * Drawn in plain shapes over his box until his sheet exists.
 */
const WEAKNESS_DEATH = { thorn: { Fire: 'ash', Poison: 'leaves' } };
const WEAK = { frames: 220, kneel: 20, fadeAt: 30, fadeLen: 80, blowAt: 120, petals: 32 };
const ASH = 0x9A9A9A, DRY = 0x8A5A2A;

export function makeDeath(b, element = null, floorY = null) {
  const kind = WEAKNESS_DEATH[b.id]?.[element] || 'generic';
  return {
    id: b.id, kind,
    x: b.x, y: b.y, w: b.w, h: b.h, facing: b.facing ?? -1,
    primary: hexNum(b.primary), secondary: hexNum(b.secondary),
    outline: hexNum(b.outline || '#0A0A12'),
    floorY: floorY ?? b.y + b.h, vy: 0, kneel: 0, bits: [],
    t: 0, max: kind === 'generic' ? DEATH_FRAMES : WEAK.frames,
  };
}

/** Advance one death. Returns false once it is finished and can be dropped. */
export function stepDeath(d) {
  if (!d) return false;
  d.t++;
  if (d.kind !== 'generic') {
    // Back down to the ground first, then onto his knees.
    if (d.y + d.h < d.floorY) {
      d.vy += 0.3;
      d.y = Math.min(d.floorY - d.h, d.y + d.vy);
    } else if (d.kneel < 1) {
      d.kneel = Math.min(1, d.kneel + 1 / WEAK.kneel);
    }
    if (d.t === WEAK.blowAt) {
      // The wind takes him: petals (Fire) or leaves (Poison), from all over him.
      for (let i = 0; i < WEAK.petals; i++) {
        d.bits.push({
          // From the top half of him, so they clear the brambles in front.
          x: (i * 37 % 100) / 100 * d.w, y: d.h * 0.3 + (i * 61 % 100) / 100 * d.h * 0.35,
          vx: 0.5 + (i * 13 % 10) / 10, vy: -0.35 - (i * 7 % 10) / 12, ph: i,
          delay: i % 24,
        });
      }
    }
    for (const bit of d.bits) {
      if (d.t < WEAK.blowAt + bit.delay) continue;
      bit.x += bit.vx; bit.y += bit.vy + Math.sin((d.t + bit.ph * 9) * 0.15) * 0.4;
    }
  }
  return d.t < d.max;
}

/** Mix two 0xRRGGBB colours, `k` of the way from a to b. */
const mix = (a, b, k) => {
  const ch = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

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
  if (d.kind === 'generic') {
    const { fill, alpha } = look(d);
    g.fillStyle(fill, alpha);
    g.fillRect(sx(d.x), sy(d.y), d.w, d.h);
    return;
  }
  const fade = Math.max(0, Math.min(1, (d.t - WEAK.fadeAt) / WEAK.fadeLen));
  const blow = Math.max(0, Math.min(1, (d.t - WEAK.blowAt) / (d.max - WEAK.blowAt)));
  const ash = d.kind === 'ash';
  // Ash: every colour to grey. Leaves: only the greens (his primary) to brown.
  const prim = mix(d.primary, ash ? ASH : DRY, fade);
  const sec = ash ? mix(d.secondary, ASH, fade) : d.secondary;
  // On his knees: shorter, a little wider, slumped to one side.
  const h = Math.round(d.h * (1 - 0.3 * d.kneel)), w = Math.round(d.w * (1 + 0.1 * d.kneel));
  const x = sx(d.x) + Math.round((d.w - w) / 2), y = sy(d.y + d.h) - h;
  if (ash) {
    // The body thins out as the petals leave it.
    const a = 1 - blow;
    if (a > 0) {
      g.fillStyle(d.outline, a); g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle(prim, a); g.fillRect(x, y, w, h);
      g.fillStyle(sec, a); g.fillRect(x, y, w, Math.max(2, Math.round(h * 0.28)));
    }
  } else {
    // The green blows away and leaves a thin trunk in his secondary brown,
    // which fades into the room over the last stretch.
    const trunkW = Math.max(3, Math.round(w * (1 - 0.75 * blow)));
    const tx = x + Math.round((w - trunkW) / 2), a = d.t > d.max - 40 ? (d.max - d.t) / 40 : 1;
    g.fillStyle(d.outline, a); g.fillRect(tx - 1, y - 1, trunkW + 2, h + 2);
    g.fillStyle(blow > 0 ? sec : prim, a); g.fillRect(tx, y, trunkW, h);
    if (blow < 1 && blow > 0) { g.fillStyle(prim, 1 - blow); g.fillRect(x, y, w, Math.round(h * 0.6)); }
    if (!blow) { g.fillStyle(sec, a); g.fillRect(x, y, w, Math.max(2, Math.round(h * 0.28))); }
  }
  for (const bit of d.bits) {
    if (d.t < WEAK.blowAt + bit.delay) continue;
    const bx = sx(d.x) + bit.x, by = sy(d.y) + bit.y;
    if (ash) {
      // Grey cherry-blossom petals: a pale grey and a darker one.
      g.fillStyle(bit.ph % 3 ? 0xE0E0E0 : 0xA8A8A8, 1 - blow * 0.6);
      g.fillRect(Math.round(bx), Math.round(by), 3, 2);
    } else {
      // Autumn leaves: dry browns and an orange.
      g.fillStyle([0x8A5A2A, 0xB07A3A, 0xC8642A][bit.ph % 3], 1 - blow * 0.6);
      g.fillRect(Math.round(bx), Math.round(by), 3, 3);
    }
  }
}
