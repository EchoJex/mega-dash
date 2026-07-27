/**
 * PICKUPS — the drops minions leave behind.
 *
 * Two types only, and they map onto the two things a run can be short of:
 *   etank  energy, the resource you lose to mistakes
 *   exp    progress, the resource you lose to playing slowly
 *
 * Both are rolled from a single chance so the drop rate is one number to tune
 * rather than two that interact. The Luck Chip upgrade widens the roll; the
 * Item Magnet upgrade widens the collection radius.
 *
 * Collection does NOT happen here — step() returns what was picked up and
 * GameScene applies it, because granting EXP is a progression concern that
 * belongs with the level-up logic, not with a physics helper.
 */

import { FEEL } from '../config/feel.js';
import { isOverGround, overlaps } from './physics.js';

export const PICKUP_STYLE = {
  etank: { primary: '#E11416', secondary: '#F8FAFC' },
  exp:   { primary: '#F5D328', secondary: '#5C4A0A' },
};

/**
 * Roll for a drop at a dead minion's position. Returns the pickup or null.
 * One roll, then a coin flip for the type — so each type is effectively half
 * of FEEL.pickupChance.
 */
export function maybeDrop(x, y, luckMult = 1) {
  if (Math.random() >= FEEL.pickupChance * luckMult) return null;
  return {
    type: Math.random() < 0.5 ? 'etank' : 'exp',
    x, y, vx: 0, vy: -1.2,       // small pop so it separates from the corpse
    w: 7, h: 7,
    life: FEEL.pickupLifeFrames,
    anim: 0,
  };
}

/**
 * Advance pickups and collect any the player touches.
 * Returns the array of collected pickups; survivors stay in `list`.
 */
export function stepPickups(list, player, playerBox, groundY, world, magnetMult = 1) {
  const collected = [];
  const range = FEEL.pickupMagnetRange * magnetMult;
  const px = playerBox.x + playerBox.w / 2;
  const py = playerBox.y + playerBox.h / 2;

  for (const p of list) {
    p.anim++;
    p.life--;

    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const dx = px - cx, dy = py - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < range) {
      // Inside magnet range it homes and ignores gravity entirely — a pickup
      // that falls into a pit while being attracted feels like a bug.
      const s = FEEL.pickupMagnetSpeed / (dist || 1);
      p.x += dx * s;
      p.y += dy * s;
    } else {
      p.vy = Math.min(p.vy + FEEL.gravity * 0.6, FEEL.maxFallSpeed);
      p.y += p.vy;
      if (isOverGround(world, cx) && p.y + p.h >= groundY) {
        p.y = groundY - p.h;
        p.vy = 0;
      }
    }

    if (overlaps(playerBox, { x: p.x, y: p.y, w: p.w, h: p.h })) {
      p.life = -1;
      collected.push(p);
    }
  }

  return collected;
}

export const prunePickups = (list, camX) =>
  list.filter((p) => p.life > 0 && p.y < 400 && p.x > camX - 80);
