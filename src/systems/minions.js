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
import { MINIONS, minionFor } from '../data/minions.js';
import { isOverGround } from './physics.js';
import * as Attr from './attributes.js';

/** Whole difficulty steps elapsed. Step 0 is the first `rampSeconds` of a run. */
export const difficultyStep = (frames) =>
  Math.floor(frames / 60 / FEEL.rampSeconds);

/** Spawn cadence, shortening as the run wears on. */
export const spawnIntervalFrames = (step) =>
  Math.max(18, Math.round((FEEL.spawnIntervalSeconds * 60) / (1 + step * FEEL.rampEnemyCount)));

const eliteChance = (step) =>
  Math.min(FEEL.eliteChanceMax, FEEL.eliteChanceBase + step * FEEL.rampEliteChance);

const hpFor = (base, step) => Math.max(1, Math.round(base * (1 + step * FEEL.rampEnemyHp)));

/**
 * Try to place one minion just beyond the right edge of view.
 *
 * Returns the new minion, or null if there was nowhere sensible to put it —
 * a ground spawn needs actual ground, and refusing to spawn is better than
 * dropping a walker into a pit for the player to never see.
 */
export function trySpawn(world, camX, viewW, frames, groundY, boss = null, camY = 0) {
  const step = difficultyStep(frames);
  // A climb has no ground to walk along but its floor, so only fliers come, from either side of the
  // view at the height the player is climbing (ponytail: walkers on platforms when a level needs them).
  const ground = !world.climb && Math.random() < 0.6;
  const def = minionFor(pickOf(ground ? 'ground' : 'air'), boss);
  // An elite is the same silhouette at the same size, wearing a gold rim — not
  // a bigger minion. It shares one piece of art with its base form.
  const elite = Math.random() < eliteChance(step);
  const w = def.w, h = def.h;

  let x = world.climb && Math.random() < 0.5 ? camX - 16 - w : camX + viewW + 16;
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
    y = camY + 40 + Math.random() * (groundY - 80);
  }

  return makeMinion(def, x, y, step, elite);
}

/** One minion of a plane, picked evenly from every minion that moves in it. */
function pickOf(kind) {
  const all = MINIONS.filter((m) => m.kind === kind);
  return all[Math.floor(Math.random() * all.length)];
}

/**
 * One minion, fully formed, at a given place.
 *
 * Split out of trySpawn because a BOSS CAN SUMMON. The ambient spawner picks
 * where a minion appears from the camera and the terrain; a summon already
 * knows, and must not inherit "off the right edge of the screen" — inside a
 * sealed arena that is a wall. Everything about what a minion IS stays here so
 * the two paths cannot drift into producing different creatures.
 */
function makeMinion(def, x, y, step = 0, elite = false) {
  const hp = hpFor(def.hp, step) * (elite ? FEEL.eliteHpMult : 1);
  return {
    def, id: def.id, elite,
    x, y, w: def.w, h: def.h,
    vx: -def.speed,
    vy: 0,
    hp: Math.round(hp), maxHp: Math.round(hp),
    anim: Math.floor(Math.random() * 120), // desync the bob between spawns
    onGround: false,
    // Elemental attributes live per actor, exactly as they do on the player.
    // Empty at birth — nothing carries an element until something puts one on it.
    status: {},
    kbVx: 0,
  };
}

/**
 * Summon a minion of a given plane at a point. Used by boss movesets.
 *
 * Returns null for an unknown kind rather than throwing, so a fight that names
 * a plane that does not exist degrades to summoning nothing.
 */
export function spawnAt(kind, x, y, frames = 0, elite = false, boss = null) {
  if (!MINIONS.some((m) => m.kind === kind)) return null;
  const def = pickOf(kind);
  return makeMinion(minionFor(def, boss), x, y, difficultyStep(frames), elite);
}

/**
 * Advance every minion one fixed step.
 *
 * Returns whole points of attribute damage per minion so the caller can kill
 * and score them; Burn on an enemy has to route through the same death path as
 * a bullet or the drop never happens.
 */
export function stepMinions(list, world, player, groundY) {
  const burned = [];
  for (const e of list) {
    e.anim++;
    const dot = Attr.stepStatus(e.status);
    if (dot > 0) burned.push({ e, dot });

    // Knockback overrides walking for as long as it lasts, then decays away.
    // Applied to position rather than folded into vx, because a Spiglet's vx
    // is its patrol direction and blending the two would flip it permanently.
    if (Math.abs(e.kbVx) > 0.05) {
      e.x += e.kbVx;
      e.kbVx *= FEEL.knockbackDecay;
    } else {
      e.kbVx = 0;
    }

    // Freeze and Constrict stop an actor outright; Stun only slows it. The two
    // are different mechanics — see the note in systems/attributes.js.
    const held = Attr.isHeld(e.status);
    const slow = Attr.speedMult(e.status);
    if (e.def.kind === 'ground') stepGround(e, world, groundY, held, slow);
    else stepAir(e, player, groundY, held, slow);
  }
  return burned;
}

function stepGround(e, world, groundY, held, slow) {
  // Gravity applies even while held — a frozen Pixie has to fall, or a
  // freeze weapon would read as parking enemies in mid-air.
  e.vy = Math.min(e.vy + FEEL.gravity, FEEL.maxFallSpeed);
  e.y += e.vy;

  e.onGround = false;
  if (isOverGround(world, e.x + e.w / 2) && e.y + e.h >= groundY) {
    e.y = groundY - e.h;
    e.vy = 0;
    e.onGround = true;
  }

  if (held) return;
  e.x += e.vx * slow;

  // Turn back at the lip of a pit. Probed one step ahead of the leading edge so
  // the turn happens before any part of the body is over open air.
  if (e.def.turnsAtLedge && e.onGround) {
    const ahead = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
    if (!isOverGround(world, ahead)) e.vx = -e.vx;
  }
}

function stepAir(e, player, groundY, held, slow) {
  if (held) return;
  if (e.def.move === 'stopGo') return stepStopGo(e, player, groundY, slow);
  e.x += e.vx * slow;

  // Gentle altitude tracking: enough to make ignoring one a mistake, capped so
  // it arcs toward you and can be out-manoeuvred rather than simply landing on
  // your head.
  const dy = player.y + 12 - (e.y + e.h / 2);
  const track = Math.max(-e.def.trackMax, Math.min(e.def.trackMax, dy * e.def.trackStrength));
  e.y += (track + Math.sin(e.anim * e.def.bobRate) * e.def.bobAmp) * slow;

  if (e.y < 8) e.y = 8;
  if (e.y + e.h > groundY - 2) e.y = groundY - 2 - e.h;
}

/**
 * THE GUNNER: heads for the player for `moveFrames`, then hangs still for `stopFrames`, and
 * again. Along at its own `speed`, up or down at the slower `climb`.
 *
 * IT NEVER STOPS INSIDE HIM, AND NEVER TURNS ON THE SPOT (owner, bug of build 1242: "Enemies
 * that make contact with the player can not stop inside the player. Pursuit is allowed, but
 * after passing through the player the enemy must make a wide U-turn instead of instantly
 * turning around"). It keeps its heading through him and `turnWide` pixels past, peeling away
 * from his height as it goes, and only then comes about, so the way back is a loop and a
 * player who was touched once is not sat on. A stop that would land on him waits until it is clear.
 */
function stepStopGo(e, player, groundY, slow) {
  const { moveFrames, stopFrames, speed, climb, turnWide } = e.def;
  const touching = e.x < player.x + 24 && e.x + e.w > player.x && e.y < player.y + 24 && e.y + e.h > player.y;
  if (e.anim % (moveFrames + stopFrames) >= moveFrames && !touching) return;
  const dx = player.x + 12 - (e.x + e.w / 2), dy = player.y + 12 - (e.y + e.h / 2);
  if (!e.dir) e.dir = Math.sign(dx) || -1;
  const behind = dx !== 0 && Math.sign(dx) !== e.dir;      // he is behind it: it has gone through
  if (behind && Math.abs(dx) >= turnWide) e.dir = -e.dir;   // far enough past: come about
  e.vx = e.dir * speed;
  e.x += e.dir * speed * slow;
  // Ahead of it, it closes on his height. Past him, it peels away from it, which is the U.
  if (behind && Math.abs(dx) < turnWide) e.y += (Math.sign(-dy) || -1) * climb * slow;
  else e.y += Math.sign(dy) * Math.min(Math.abs(dy), climb * slow);
  if (e.y < 8) e.y = 8;
  if (e.y + e.h > groundY - 2) e.y = groundY - 2 - e.h;
}

/** Drop anything well behind the camera or already dead. */
export function pruneMinions(list, camX, camY = null) {
  // A climb's view moves both ways, so there a minion goes once it is well off any side of it.
  if (camY !== null) return list.filter((e) => e.hp > 0 && Math.abs(e.x - camX) < 900 && Math.abs(e.y - camY) < 500);
  return list.filter((e) => e.hp > 0 && e.x + e.w > camX - 80);
}
