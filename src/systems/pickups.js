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

const orb = (type, x, y, extra = {}) => ({
  type, x, y,
  vx: (Math.random() - 0.5) * 1.2,  // small scatter so a pile is collectable
  vy: -1.2 - Math.random() * 0.6,
  w: 7, h: 7,
  life: FEEL.pickupLifeFrames,
  anim: 0,
  ...extra,
});

/**
 * How much EXP one drop from this tier is worth.
 *
 * The amount is inverse to its likelihood: `random ** bias` skews toward 0, so
 * most drops sit near the tier's minimum and the top of the range is genuinely
 * rare. The minimum is what scales with tier, so a better enemy is never worse
 * than a worse one even on an unlucky roll.
 */
export function rollExpAmount(tier) {
  const r = FEEL.expDrop[tier] || FEEL.expDrop.minion;
  const t = Math.random() ** FEEL.expDropBias;
  return Math.max(1, Math.round(r.min + t * (r.max - r.min)));
}

/**
 * Everything an enemy leaves behind. EXP always drops — it is the whole
 * progression loop, so it can never be denied by a bad roll. The E-Tank is the
 * only thing still gated on FEEL.pickupChance.
 */
export function dropsFor(tier, x, y, luckMult = 1) {
  const out = [];
  const orbs = tier === 'boss' ? FEEL.expOrbsBoss : 1;
  const total = rollExpAmount(tier);
  const each = Math.max(1, Math.round(total / orbs));
  for (let i = 0; i < orbs; i++) out.push(orb('exp', x, y, { amount: each }));

  if (Math.random() < FEEL.pickupChance * luckMult) out.push(orb('etank', x, y));
  return out;
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
