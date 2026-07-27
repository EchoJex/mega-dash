/**
 * MINIONS — spawning, movement and the difficulty ramp that drives both.
 *
 * This file owns only where minions appear and how they move. Collision,
 * damage, death and drops stay in GameScene, mirroring how physics.js owns
 * player motion but not its consequences.
 *
 * THE RAMP (Vampire Survivors pillar 2)
 * -------------------------------------
 * Everything scales off ELAPSED TIME, never distance. The prototype keyed off
 * rightward progress, which meant a player who simply stopped moving froze the
 * difficulty and could farm in safety forever. Time-keying makes standing still
 * the most dangerous thing you can do, which is the whole point.
 *
 * Note this reads SIM time, not wall-clock time, so the re-quip slow-motion
 * does not advance the ramp at real-time speed. Slowing time slows the game,
 * including the thing trying to kill you.
 */

import { FEEL } from '../config/feel.js';
import { MINIONS } from '../data/minions.js';
import { isOverGround } from './physics.js';

/** Whole difficulty steps elapsed. Step 0 is the first `rampSeconds` of a run. */
export const difficultyStep = (frames) =>
  Math.floor(frames / 60 / FEEL.rampSeconds);

/** Spawn cadence, shortening as the run wears on. */
export const spawnIntervalFrames = (step) =>
  Math.max(18, Math.round((FEEL.spawnIntervalSeconds * 60) / (1 + step * FEEL.rampEnemyCount)));

export const eliteChance = (step) =>
  Math.min(FEEL.eliteChanceMax, FEEL.eliteChanceBase + step * FEEL.rampEliteChance);

const hpFor = (base, step) => Math.max(1, Math.round(base * (1 + step * FEEL.rampEnemyHp)));

/**
 * Try to place one minion just beyond the right edge of view.
 *
 * Returns the new minion, or null if there was nowhere sensible to put it —
 * a ground spawn needs actual ground, and refusing to spawn is better than
 * dropping a walker into a pit for the player to never see.
 */
export function trySpawn(world, camX, viewW, frames, groundY) {
  const step = difficultyStep(frames);
  const ground = Math.random() < 0.6;
  const def = MINIONS.find((m) => (ground ? m.kind === 'ground' : m.kind === 'air'));
  // An elite is the same silhouette at the same size, wearing a gold rim — not
  // a bigger minion. It shares one piece of art with its base form.
  const elite = Math.random() < eliteChance(step);
  const w = def.w, h = def.h;

  let x = camX + viewW + 16;
  let y;
  if (def.kind === 'ground') {
    // walk right looking for footing; give up rather than spawn over a pit
    let found = false;
    for (let i = 0; i < 12; i++) {
      if (isOverGround(world, x + w / 2)) { found = true; break; }
      x += 12;
    }
    if (!found) return null;
    y = groundY - h;
  } else {
    y = 40 + Math.random() * (groundY - 80);
  }

  const hp = hpFor(def.hp, step) * (elite ? FEEL.eliteHpMult : 1);
  return {
    def, id: def.id, elite,
    x, y, w, h,
    vx: def.kind === 'ground' ? -def.speed : -def.speed,
    vy: 0,
    hp: Math.round(hp), maxHp: Math.round(hp),
    anim: Math.floor(Math.random() * 120), // desync the bob between spawns
    onGround: false,
  };
}

/** Advance every minion one fixed step. */
export function stepMinions(list, world, player, groundY) {
  for (const e of list) {
    e.anim++;
    if (e.def.kind === 'ground') stepGround(e, world, groundY);
    else stepAir(e, player, groundY);
  }
}

function stepGround(e, world, groundY) {
  e.vy = Math.min(e.vy + FEEL.gravity, FEEL.maxFallSpeed);
  e.y += e.vy;

  e.onGround = false;
  if (isOverGround(world, e.x + e.w / 2) && e.y + e.h >= groundY) {
    e.y = groundY - e.h;
    e.vy = 0;
    e.onGround = true;
  }

  e.x += e.vx;

  // Turn back at the lip of a pit. Probed one step ahead of the leading edge so
  // the turn happens before any part of the body is over open air.
  if (e.def.turnsAtLedge && e.onGround) {
    const ahead = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
    if (!isOverGround(world, ahead)) e.vx = -e.vx;
  }
}

function stepAir(e, player, groundY) {
  e.x += e.vx;

  // Gentle altitude tracking: enough to make ignoring one a mistake, capped so
  // it arcs toward you and can be out-manoeuvred rather than simply landing on
  // your head.
  const dy = player.y + 12 - (e.y + e.h / 2);
  const track = Math.max(-e.def.trackMax, Math.min(e.def.trackMax, dy * e.def.trackStrength));
  e.y += track + Math.sin(e.anim * e.def.bobRate) * e.def.bobAmp;

  if (e.y < 8) e.y = 8;
  if (e.y + e.h > groundY - 2) e.y = groundY - 2 - e.h;
}

/** Drop anything well behind the camera or already dead. */
export function pruneMinions(list, camX) {
  return list.filter((e) => e.hp > 0 && e.x + e.w > camX - 80);
}
