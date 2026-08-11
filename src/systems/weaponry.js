/**
 * WEAPONRY — what each special weapon actually DOES.
 *
 * GameScene owns the simulation; this file owns the eight weapons that have a
 * real Lv 1/3/6/10 ladder. Everything here is driven from one `ctx` object
 * built once per frame, so GameScene never learns a weapon's name and adding
 * the ninth weapon never touches it.
 *
 * THE SHAPE OF A WEAPON
 * ---------------------
 *   init(st, lv, ctx)   one-off state when the weapon is equipped
 *   step(st, lv, ctx)   every fixed step, for as long as it is equipped
 *   fire(st, lv, ctx)   an offensive weapon's fire-button press
 *   land(st, lv, ctx)   the frame the player touches down
 *   jump(st, lv, ctx)   the frame a jump or double jump leaves the ground
 *
 * Only `step` is required. Defensive weapons implement everything EXCEPT
 * `fire`, because they are never aimed — that is what makes the class a real
 * mechanical category rather than a label. See systems/loadout.js.
 *
 * PER-LEVEL BEHAVIOUR comes from WEAPON_LADDERS in data/weapons.js via
 * `ladderAt`, which merges every rung up to the current level. A weapon reads
 * its numbers out of that object and never branches on the level directly, so
 * an unwritten rung degrades to the last written one instead of falling into a
 * default nobody designed.
 *
 * SOURCE OF TRUTH: design/TRACKER.md. Each section below quotes the field it
 * was built from. Build only from fields the owner has marked `[draft]`; a
 * missing rung means the tracker leaves it blank and inventing it would be
 * designing blind.
 */

import { FEEL } from '../config/feel.js';
import { ladderAt, damageAtLevel, weaponOf } from '../data/weapons.js';
import * as Attr from './attributes.js';

/** Frames of held fire that count as a long press. The tracker says 0.4s. */
export const LONG_PRESS_FRAMES = 24;

// ── Shared helpers ───────────────────────────────────────────────────

const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

/** Centre of any actor with an x/y/w/h box. */
export const centreOf = (e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });

/**
 * The closest live enemy to a point, skipping anything in `seen`.
 *
 * Returns null when the field is empty, which every caller has to handle —
 * "only if an enemy is on screen" is an explicit condition on more than one
 * weapon, not an edge case.
 */
export function nearestEnemy(ctx, x, y, seen = null, maxDist = Infinity) {
  let best = null, bestD = maxDist * maxDist;
  for (const e of ctx.enemies) {
    if (e.hp <= 0 || (seen && seen.has(e))) continue;
    const c = centreOf(e);
    const d = dist2(x, y, c.x, c.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

/** Enemies sorted near-to-far from a point. Used where "next nearest" matters. */
export function enemiesByRange(ctx, x, y, seen = null, maxDist = Infinity) {
  return ctx.enemies
    .filter((e) => e.hp > 0 && !(seen && seen.has(e)))
    .map((e) => { const c = centreOf(e); return { e, d: dist2(x, y, c.x, c.y) }; })
    .filter((r) => r.d <= maxDist * maxDist)
    .sort((a, b) => a.d - b.d)
    .map((r) => r.e);
}

/** Every enemy overlapping a box. */
export const enemiesIn = (ctx, box) => ctx.enemies.filter(
  (e) => e.hp > 0
    && box.x < e.x + e.w && box.x + box.w > e.x
    && box.y < e.y + e.h && box.y + box.h > e.y,
);

/** This weapon's damage at its current level, after the run's damage upgrades. */
const dmgOf = (id, lv, ctx) => damageAtLevel(weaponOf(id), lv) * ctx.run.dmgMult;

/**
 * The shoulder mount point — where a worn weapon sits on the player.
 *
 * One function because three weapons hang something off the player and they
 * must agree; if the drone and the jetpack drift apart by a pixel it reads as
 * one of them being attached wrong.
 */
export function mountPoint(p, aheadX = 9, aboveY = -3) {
  return { x: p.x + 12 + aheadX * p.facing, y: p.y + 6 + aboveY };
}

// ── NULLFIRE DRONE — Typeless, defensive ─────────────────────────────
/**
 * "A small gray drone hovers just above and in front of the player's shoulder.
 *  Very slowly refills the current clip when no enemies present. When clip is
 *  fully depleted indicate this emergency reload by making the drone dark grey
 *  and cease firing until clip reload completes. It continuously auto aims at
 *  the nearest enemy and auto fires, only if an enemy is on screen, a neutral
 *  bullet with clip cooldown = 1.5 * (clip_size / fire_rate)."
 *
 * THE DUTY CYCLE IS THE WEAPON. That formula is not arbitrary: firing a full
 * clip takes clip/rate seconds and reloading takes 1.5x that, so the drone is
 * live 40% of the time at EVERY level. Levelling it buys burst shape and
 * targeting, never uptime — which is why raising the clip size alone would be a
 * balance change and not a buff. Derive the reload, never hand-tune it.
 *
 * `fireRate` is BULLETS per second, not trigger pulls: that is the reading that
 * makes the tracker's three stated clip/rate pairs all land on the same 40%.
 */
const drone = {
  init(st, lv) {
    const L = ladderAt('core_blaster', lv);
    st.clip = L.clip;
    st.cool = 0;
    st.reload = 0;
    st.burst = 0;
    st.burstGap = 0;
    st.trickle = 0;
  },

  step(st, lv, ctx) {
    const L = ladderAt('core_blaster', lv);
    // Clip size can change under us when the weapon levels mid-run.
    if (st.clip > L.clip) st.clip = L.clip;

    const target = nearestEnemy(ctx, ctx.player.x + 12, ctx.player.y + 12);

    // EMERGENCY RELOAD. Dark grey and silent until it completes, then full.
    if (st.reload > 0) {
      st.reloading = true;
      if (--st.reload <= 0) { st.clip = L.clip; st.reloading = false; }
      return;
    }

    // "Very slowly refills the current clip when no enemies present" — the
    // out-of-combat trickle, so walking between fights tops you back up but
    // standing next to a minion never does.
    if (!target) {
      if (st.clip < L.clip && ++st.trickle >= L.trickleFrames) {
        st.trickle = 0;
        st.clip++;
      }
      return;
    }
    st.trickle = 0;

    // Mid-burst: keep feeding rounds out at the burst's own spacing.
    if (st.burst > 0) {
      if (--st.burstGap > 0) return;
      st.burstGap = L.burstGap;
      st.burst--;
      droneShot(st, L, lv, ctx, target);
      if (st.clip <= 0) { st.reload = L.reloadFrames; st.burst = 0; }
      return;
    }

    if (--st.cool > 0) return;
    // An empty clip with no reload running should be impossible — the clip only
    // empties inside the burst above, which starts one. Recovering rather than
    // spinning matters anyway: without this the drone would sit at cool <= 0
    // firing a zero-length burst every frame and never reload itself.
    if (st.clip <= 0) { st.reload = L.reloadFrames; return; }
    st.cool = L.pullFrames;
    st.burst = Math.min(L.burst, st.clip);
    st.burstGap = 1;
  },
};

function droneShot(st, L, lv, ctx, target) {
  st.clip--;
  const m = mountPoint(ctx.player);
  const dmg = dmgOf('core_blaster', lv, ctx) * (L.dmgMult ?? 1);
  ctx.sfx('shoot', { pitch: 1.4 });

  if (L.skyward) {
    // Lv10: "fires straight up instead of auto aiming; each bullet targets a
    // different enemy, travelling in a wide arc with strong auto aim and
    // rapidly accelerating." The launch is vertical and the seek does the rest,
    // which is what produces the arc rather than a straight line to the target.
    const ranked = enemiesByRange(ctx, m.x, m.y);
    const pick = ranked[st.skyIndex % Math.max(1, ranked.length)] || target;
    st.skyIndex = (st.skyIndex || 0) + 1;
    ctx.spawn({
      x: m.x, y: m.y, vx: (Math.random() - 0.5) * 0.6, vy: -L.speed,
      radius: 2.5, damage: dmg, color: '#B8C0CC', shape: 'bolt',
      weapon: 'core_blaster', life: 260,
      seek: pick, seekTurn: L.seekTurn, accel: L.accel, maxSpeed: L.maxSpeed,
    });
    return;
  }

  // Lv1-6: the DRONE aims, the bullet does not. It leaves on a locked heading.
  const c = centreOf(target);
  const dx = c.x - m.x, dy = c.y - m.y;
  const d = Math.hypot(dx, dy) || 1;
  ctx.spawn({
    x: m.x, y: m.y,
    vx: (dx / d) * L.speed, vy: (dy / d) * L.speed,
    radius: 2.5, damage: dmg, color: '#B8C0CC', shape: 'bolt',
    weapon: 'core_blaster', life: 220,
    // Lv6: "bullet splits into 3 fragments after a brief time; fragments have
    // moderate auto-aim". The two bursts chase different enemies, so the first
    // set locks the nearest and the second the next-nearest.
    ...(L.splitIn ? {
      splitIn: L.splitIn,
      splitCount: 3,
      splitSpeed: L.speed * 0.8,
      splitRadius: 2,
      splitSeekRank: st.burst,      // 0 for the last shot of the pair, 1 for the first
      splitSeekTurn: L.splitSeekTurn,
      splitAccel: L.splitAccel,
    } : {}),
  });
}

// ── BLAZE WHEEL — Fire, offensive ────────────────────────────────────
/**
 * "Orange/red glowing backpack that lobs a small bouncing fireball in the
 *  direction the player is facing, like a catapult; applies Hot to ground or
 *  Burn to enemy on contact for a scalable time. High fireball contact damage,
 *  which is separate from burn DPS."
 *
 * A LOB, NOT A SHOT. It leaves on a fixed arc rather than aimed at anything, so
 * range is set by where you stand — that is the cost of its damage. On landing
 * it converts to a roller that lays Hot behind it for a level-scaled distance.
 *
 * "Up to N on screen" is enforced against live fireballs, not against a
 * cooldown, so the weapon paces itself on what is actually still burning.
 */
const blaze = {
  step() {},

  fire(st, lv, ctx) {
    const L = ladderAt('blaze_wheel', lv);
    const live = ctx.bullets.filter((b) => b.weapon === 'blaze_wheel' && b.life > 0).length;
    if (live >= L.maxLive) return false;
    if (st.cool > 0) return false;
    st.cool = L.cooldown;
    ctx.sfx('shootBig', { pitch: 0.85 });

    const m = mountPoint(ctx.player, 6, 0);
    const dmg = dmgOf('blaze_wheel', lv, ctx);
    // Lv6+ adds a second, taller and much wider arc that lands roughly where
    // the first one is projected to stop rolling — so the pair covers double
    // the ground rather than doubling up on the same patch.
    const arcs = L.secondArc ? [1, L.secondArc] : [1];
    for (const k of arcs) {
      ctx.spawn({
        x: m.x, y: m.y,
        vx: L.lobVx * k * ctx.player.facing,
        vy: L.lobVy * (k > 1 ? 1.18 : 1),
        radius: 3.5, damage: dmg, color: '#E8541A', shape: 'wheel',
        weapon: 'blaze_wheel', life: 420,
        gravity: L.gravity,
        // The roll is what the ladder actually scales. `rollLeft` is distance
        // in pixels, spent as the fireball travels along the ground.
        roll: { left: L.roll, speed: L.rollSpeed, drag: L.rollDrag },
        hot: L.hotFrames,
        burn: L.burnFrames,
        pierce: L.pierce ?? 0,
      });
    }
    return true;
  },
};

// ── TORRENT CANNON — Water, defensive ────────────────────────────────
/**
 * "Small grey two-nozzle jetpack with a blue layer on top that indicates a tank
 *  fill level. Rapidly self-refilling water supply when not producing weapon
 *  effects. Tank capacity and refill rate level scalable."
 *
 * Every effect is a REACTION to movement you were making anyway — landing,
 * jumping, reaching an apex — so it never competes with the fire button. That
 * is what lets it share the screen with an offensive weapon instead of
 * replacing one, and it is why the class split exists.
 *
 * The tank is the whole balance lever: it refills fast but only while you are
 * not venting, so chaining jumps to spam the burst empties it and grounds the
 * ability until you stop.
 */
const torrent = {
  init(st, lv) {
    const L = ladderAt('torrent_cannon', lv);
    st.tank = L.tank;
    st.idle = 0;
    st.hovering = 0;
    // One hover per jump. Armed on the ground so equipping the pack mid-air
    // cannot hand you a free one before you have landed once.
    st.apexArmed = false;
  },

  step(st, lv, ctx) {
    const L = ladderAt('torrent_cannon', lv);
    const p = ctx.player;

    // Lv6: "hover briefly at the apex of any jump, shooting two water jets
    // directly downward with very low but very rapid damage and knockback."
    // The apex is detected rather than input-driven — it is the one moment in a
    // jump the player is already watching for.
    if (L.hover && !p.onGround && st.hovering === 0 && st.apexArmed
      && p.vy >= 0 && p.vy < 0.6 && st.tank >= L.hoverCost) {
      st.hovering = L.hoverFrames;
      st.apexArmed = false;
    }
    if (p.onGround) st.apexArmed = true;

    if (st.hovering > 0) {
      st.hovering--;
      st.idle = 0;
      st.tank = Math.max(0, st.tank - L.hoverCost / L.hoverFrames);
      p.vy = Math.min(p.vy, 0.1);          // held, not lifted
      if (ctx.run.frame % 4 === 0) {
        for (const side of [-5, 5]) {
          jetHit(ctx, lv, p.x + 12 + side, p.y + 24, L.jetDamage, L.jetKnock);
        }
      }
      if (st.tank <= 0) st.hovering = 0;
      return;
    }

    // "Rapidly self refilling ... when not producing weapon affects."
    if (++st.idle > 10 && st.tank < L.tank) {
      st.tank = Math.min(L.tank, st.tank + L.refill);
    }
  },

  jump(st, lv, ctx) {
    const L = ladderAt('torrent_cannon', lv);
    if (!L.onJump || st.tank < L.burstCost) return;
    st.tank -= L.burstCost;
    st.idle = 0;
    burst(ctx, lv, L, ctx.player.y + 24, 1);
  },

  land(st, lv, ctx) {
    const L = ladderAt('torrent_cannon', lv);
    if (st.tank < L.burstCost) return;
    // Lv10 scales the wave with impact speed, so a long drop is a real weapon
    // and a hop off a crate is not.
    const force = Math.min(1, Math.abs(ctx.landVy) / FEEL.maxFallSpeed);
    st.tank -= L.burstCost;
    st.idle = 0;
    burst(ctx, lv, L, ctx.player.y + 24, 1 + force);
    if (L.tidal) tidalWave(ctx, lv, L, force);
  },
};

/** The radial knockback vent. Mild damage, large push — it is a repositioner. */
function burst(ctx, lv, L, y, scale) {
  const p = ctx.player;
  const w = L.burstW * scale;
  ctx.sfx('shoot', { pitch: 0.6 });
  const box = { x: p.x + 12 - w / 2, y: y - 12, w, h: 16 };
  for (const e of enemiesIn(ctx, box)) {
    ctx.hitEnemy(e, dmgOf('torrent_cannon', lv, ctx) * (L.burstDmgMult ?? 1), {
      knockback: L.knock * scale, from: p.x + 12,
    });
  }
  ctx.puff({ x: p.x + 12, y, w, life: 12, color: 0x5CADD5 });
}

/** Lv6's downward jets: very low damage, very fast, mostly a knockback tool. */
function jetHit(ctx, lv, x, y, dmgMult, knock) {
  const box = { x: x - 3, y, w: 6, h: 40 };
  for (const e of enemiesIn(ctx, box)) {
    ctx.hitEnemy(e, dmgOf('torrent_cannon', lv, ctx) * dmgMult, { knockback: knock, from: x });
  }
  ctx.puff({ x, y: y + 18, w: 6, life: 6, color: 0x9AD8F0 });
}

/** Lv10: a ground-hugging wave each way, sized by how hard you hit the floor. */
function tidalWave(ctx, lv, L, force) {
  const p = ctx.player;
  for (const dir of [-1, 1]) {
    ctx.spawn({
      x: p.x + 12, y: (ctx.arena ? ctx.arena.floorY : ctx.floorY) - 6,
      vx: dir * L.tidalSpeed, vy: 0,
      radius: 4 + 4 * force, damage: dmgOf('torrent_cannon', lv, ctx) * L.tidalDmgMult,
      color: '#5CADD5', shape: 'stream', weapon: 'torrent_cannon',
      life: L.tidalLife, pierce: 99, knockback: L.knock * (1 + force),
      hugsFloor: true,
    });
  }
}

// ── VOLT SPARK — Electric, offensive ─────────────────────────────────
/**
 * "Fixed-range electric burst with typical fire rate and base damage that
 *  chains to nearby enemies with diminishing damage."
 *
 * FIXED RANGE means there is no projectile to dodge and no travel time — you
 * are either close enough or you are not. Everything the ladder buys is in the
 * chain, so the weapon rewards fighting inside a crowd.
 *
 * "No enemy can be hit more than twice in one complete hit+chain attack" is the
 * rule that stops a two-enemy room turning into an infinite loop, and it is
 * enforced with a hit tally rather than a visited set — an enemy is allowed to
 * be caught by two different branches, just not three.
 */
const volt = {
  step() {},

  fire(st, lv, ctx) {
    if (st.cool > 0) return false;
    const L = ladderAt('volt_spark', lv);
    st.cool = L.cooldown;
    ctx.sfx('shoot', { pitch: 1.8 });

    const p = ctx.player;
    const box = {
      x: p.facing > 0 ? p.x + 14 : p.x + 10 - L.range,
      y: p.y + 4, w: L.range, h: 18,
    };
    ctx.puff({ x: box.x + box.w / 2, y: box.y + 9, w: box.w, life: 8, color: 0xF5D328 });

    const first = enemiesIn(ctx, box)[0];
    if (!first) return true;

    const hits = new Map();
    const strike = (e, depth) => {
      const n = hits.get(e) || 0;
      if (n >= 2) return false;              // the twice rule
      hits.set(e, n + 1);
      const falloff = L.chainFalloff ** depth;
      ctx.hitEnemy(e, dmgOf('volt_spark', lv, ctx) * falloff, { from: p.x + 12 });
      const stunF = depth === 0 ? L.stunFrames : L.chainStunFrames;
      if (stunF > 0) {
        Attr.applyStatus(e.status, 'stun', stunF, { step: FEEL.stunEnemyStep });
      }
      return true;
    };

    strike(first, 0);
    // `fanout` is per depth: Lv1-6 is a flat list, Lv10 is a 3-2-1 tree. Both
    // fall out of the same walk, which is why the ladder states a shape rather
    // than a count.
    //
    // The budget is PER SOURCE, not per depth. Sharing one pool across the
    // front would let the first enemy in the list eat the whole layer, so a
    // tight cluster would chain three deep off one body while the rest of the
    // fan did nothing.
    let front = [first];
    for (let depth = 0; depth < (L.fanout || []).length; depth++) {
      const width = L.fanout[depth];
      const next = [];
      for (const src of front) {
        const c = centreOf(src);
        let taken = 0;
        for (const e of enemiesByRange(ctx, c.x, c.y, null, L.chainRange)) {
          if (taken >= width) break;
          if (e === src) continue;
          if (!strike(e, depth + 1)) continue;
          taken++;
          next.push(e);
          ctx.arc(src, e);
        }
      }
      if (!next.length) break;
      front = next;
    }
    return true;
  },
};

// ── FROST GUARD — Ice, defensive ─────────────────────────────────────
/**
 * "Forms a large shield of ice in front of the player that slowly bulks up.
 *  Short cooldown if damaged; long cooldown if destroyed by damage."
 *  Lv1 blocks 1 minion attack, Lv3 blocks 3. Contacting a minion instead breaks
 *  the shield and freezes that minion.
 *
 * Lv6 and Lv10 are still `[wip]` in the tracker, so this weapon ends at the
 * Lv3 rung and higher levels are damage-only. That is the correct degradation
 * for a partial ladder — see WEAPON_LADDERS.
 *
 * The shield is a SEPARATE health pool measured in hits, not in damage: an
 * enemy shot and a minion body are each worth one, which is what makes "blocks
 * three minion attacks" mean what it says regardless of what is shooting.
 */
const frost = {
  init(st, lv) {
    const L = ladderAt('frost_guard', lv);
    st.hits = L.hits;
    st.grow = 0;
    st.down = 0;
    st.chip = 0;
  },

  step(st, lv, ctx) {
    const L = ladderAt('frost_guard', lv);
    if (st.down > 0) {
      st.box = null;
      if (--st.down === 0) { st.hits = L.hits; st.grow = 0; }
      return;
    }
    // TWO COOLDOWNS, one field. Losing the shield outright costs `breakFrames`
    // with no shield at all; merely chipping it costs `chipFrames` per lost
    // hit while the rest of the shield keeps working. That is the tracker's
    // "short cooldown if damaged; long cooldown if destroyed" — the short one
    // is a repair, not an outage.
    if (st.hits < L.hits && --st.chip <= 0) {
      st.hits++;
      st.chip = L.chipFrames;
    }
    // "Slowly bulks up" — the shield is only at full strength once it has had
    // time to form, so re-forming after a break is a real window.
    if (st.grow < L.growFrames) st.grow++;
    st.box = shieldBox(ctx.player, L, st.grow / L.growFrames);

    // Body-blocking a minion: the shield breaks outright and freezes it.
    for (const e of enemiesIn(ctx, st.box)) {
      if (e.isBoss) continue;                // a boss shrugs it off
      Attr.applyStatus(e.status, 'freeze', L.freezeFrames);
      ctx.sfx('hurt', { pitch: 1.6 });
      st.hits = 0;
      break;
    }

    // Eating enemy fire. Each shot is worth one hit whatever its damage.
    if (st.hits > 0) {
      for (const b of ctx.bullets) {
        if (!b.enemy || b.life <= 0 || b.push) continue;
        if (b.x < st.box.x || b.x > st.box.x + st.box.w) continue;
        if (b.y < st.box.y || b.y > st.box.y + st.box.h) continue;
        b.life = -1;
        ctx.sfx('hurt', { pitch: 2 });
        if (--st.hits <= 0) break;
      }
    }

    if (st.hits <= 0) {
      st.down = L.breakFrames;
      st.box = null;
    } else if (st.chip <= 0) {
      st.chip = L.chipFrames;
    }
  },
};

function shieldBox(p, L, grown) {
  const w = Math.max(3, Math.round(L.w * grown));
  const h = Math.max(6, Math.round(L.h * grown));
  return {
    x: p.facing > 0 ? p.x + 18 : p.x + 6 - w,
    y: p.y + 20 - h,
    w, h,
  };
}

// ── STRIKE GAUNTLET — Fighting, offensive ────────────────────────────
/**
 * "Close-range powerful punching gloves with knockback and damage reduction
 *  during attack animations. Tap attack for a quick low-damage lunging
 *  combo-starter jab; long-press attack 0.4s for a combo finisher."
 *
 * TWO MOVES ON ONE BUTTON, split by how long you hold it. The jab chain is the
 * setup and the finisher is the payoff, and the finisher's lunge length is what
 * the ladder actually buys — Lv3 stops at the second enemy, Lv6 at the third,
 * Lv10 goes through everything.
 *
 * The lunge always stops at a platform edge or a pit edge. A weapon that
 * carries you off a ledge on a committed animation would make the strongest
 * attack in the game the one most likely to kill you, and no amount of damage
 * is worth that.
 */
const strike = {
  init(st) { st.chain = 0; st.chainTimer = 0; st.anim = 0; st.lunge = null; },

  step(st, lv, ctx) {
    if (st.chainTimer > 0 && --st.chainTimer === 0) st.chain = 0;
    if (st.anim > 0) st.anim--;
    // "Damage reduction during attack animations" — read by GameScene.hurt.
    ctx.run.meleeArmor = st.anim > 0 ? (ladderAt('strike_gauntlet', lv).armor) : 0;
    if (st.lunge) stepLunge(st, lv, ctx);
  },

  fire(st, lv, ctx, held) {
    if (st.anim > 0 || st.lunge) return false;
    const L = ladderAt('strike_gauntlet', lv);
    // A long press is a finisher; anything shorter is another jab.
    if (held >= LONG_PRESS_FRAMES) return finisher(st, lv, ctx, L);

    st.anim = L.jabFrames;
    st.chain = (st.chain % L.jabChain) + 1;
    st.chainTimer = L.chainWindow;
    ctx.sfx('shoot', { pitch: 1.2 + st.chain * 0.1 });

    const p = ctx.player;
    p.x += L.jabLunge * p.facing;            // the jab's own small step in
    const box = punchBox(p, L.jabReach);
    ctx.puff({ x: box.x + box.w / 2, y: box.y + 8, w: box.w, life: 6, color: 0xEA6A34 });
    // Only the LAST jab of the chain flinches and knocks back, per Lv3.
    const capper = st.chain === L.jabChain;
    for (const e of enemiesIn(ctx, box)) {
      ctx.hitEnemy(e, dmgOf('strike_gauntlet', lv, ctx) * L.jabDmgMult, {
        knockback: capper ? L.jabKnock : 0, from: p.x + 12,
      });
    }
    return true;
  },
};

function punchBox(p, reach) {
  return { x: p.facing > 0 ? p.x + 14 : p.x + 10 - reach, y: p.y + 4, w: reach, h: 18 };
}

function finisher(st, lv, ctx, L) {
  st.anim = L.finFrames;
  st.chain = 0;
  ctx.sfx('shootBig', { pitch: 0.9 });
  st.lunge = {
    left: L.lungeDist,
    // `stopAfter` is how many enemies the lunge passes through before it
    // stops. Lv10 sets it beyond any plausible crowd, which is the "dash
    // through all enemies" the tracker asks for without a special case.
    stopAfter: L.lungeStopAfter,
    passed: new Set(),
  };
  return true;
}

function stepLunge(st, lv, ctx) {
  const L = ladderAt('strike_gauntlet', lv);
  const p = ctx.player, lunge = st.lunge;
  const step = Math.min(L.lungeSpeed, lunge.left);
  const nx = p.x + step * p.facing;

  // Stop at the lip: a pit edge or the end of the platform being stood on.
  const probe = nx + (p.facing > 0 ? 20 : 4);
  if (p.onGround && !ctx.overGround(probe)) { st.lunge = null; return; }

  p.x = nx;
  lunge.left -= step;

  for (const e of enemiesIn(ctx, punchBox(p, L.jabReach))) {
    if (lunge.passed.has(e)) continue;
    lunge.passed.add(e);
    ctx.hitEnemy(e, dmgOf('strike_gauntlet', lv, ctx) * L.finDmgMult, {
      knockback: L.finKnock, from: p.x + 12, launch: L.finLaunch,
    });
    if (lunge.passed.size >= lunge.stopAfter) { st.lunge = null; return; }
  }
  if (lunge.left <= 0) st.lunge = null;
}

// ── QUAKE HAMMER — Ground, offensive ─────────────────────────────────
/**
 * "Large rock shaped hammer visible when active. Slow, delayed baseball-swing
 *  on tap for high damage and high knockback; long press 1.5s to hold the
 *  hammer overhead and on release swing downward producing shockwaves and
 *  stunning nearby enemies. Per-level scaling: shockwave size + stun duration."
 *  Lv1  "airborne swings cause the player to swing downward and rapidly travel
 *        downward where a shockwave will be generated on contact with the
 *        ground."
 *  Lv3  larger shockwave, longer stun, and the wave climbs low obstacles.
 *
 * Lv6 and Lv10 are still `[wip]`, so the ladder stops at Lv3.
 *
 * A 1.5 SECOND HOLD, NOT THE SHARED 0.4. This weapon's long press is a
 * commitment — you stop, you wind up, you are open — so it has to be long
 * enough that it can never happen by accident on a slightly slow tap. It
 * declares its own via `holdFrames`; every other long-press weapon still uses
 * LONG_PRESS_FRAMES.
 *
 * The pound resolves ON LANDING, not on the press. Committing to a slam and
 * then watching it land is the whole appeal of the move, and it also means the
 * shockwave always originates from real ground rather than from wherever the
 * player happened to be floating.
 */
const quake = {
  longPress: true,
  holdFrames: (lv) => ladderAt('quake_hammer', lv).holdFrames,

  init(st) { st.anim = 0; st.pounding = false; },

  step(st, lv, ctx) {
    if (st.anim > 0) st.anim--;
    if (st.pounding && !ctx.player.onGround) {
      const L = ladderAt('quake_hammer', lv);
      ctx.player.vy = Math.min(FEEL.maxFallSpeed, ctx.player.vy + L.poundAccel);
    }
  },

  fire(st, lv, ctx, held) {
    if (st.anim > 0 || st.pounding) return false;
    const L = ladderAt('quake_hammer', lv);

    if (held >= L.holdFrames) {
      st.pounding = true;
      st.anim = L.poundFrames;
      ctx.sfx('shootBig', { pitch: 0.7 });
      // Already grounded: no flight, resolve immediately.
      if (ctx.player.onGround) quake.land(st, lv, ctx);
      return true;
    }

    st.anim = L.swingFrames;
    ctx.sfx('shootBig', { pitch: 1.05 });
    const p = ctx.player;
    const box = { x: p.facing > 0 ? p.x + 12 : p.x + 12 - L.reach, y: p.y - 2, w: L.reach, h: 26 };
    ctx.puff({ x: box.x + box.w / 2, y: box.y + 13, w: box.w, life: 8, color: 0xA76625 });
    for (const e of enemiesIn(ctx, box)) {
      ctx.hitEnemy(e, dmgOf('quake_hammer', lv, ctx) * L.swingDmgMult, {
        knockback: L.swingKnock, from: p.x + 12,
      });
    }
    return true;
  },

  land(st, lv, ctx) {
    if (!st.pounding) return;
    st.pounding = false;
    const L = ladderAt('quake_hammer', lv);
    const p = ctx.player;
    ctx.shake(2, 20);
    ctx.sfx('rumble', { dur: 0.5, pitch: 0.8 });

    // "STUNS NEARBY ENEMIES" — the impact itself, separate from the waves it
    // sends out. Without this the stun would only ever reach whatever the wave
    // happened to catch, and an enemy standing on top of the player would be
    // the one thing the ground pound did not touch.
    for (const e of ctx.enemies) {
      if (e.hp <= 0) continue;
      const c = centreOf(e);
      if (Math.abs(c.x - (p.x + 12)) > L.stunRange) continue;
      Attr.applyStatus(e.status, 'stun', L.stunFrames, { step: FEEL.stunEnemyStep });
    }

    for (const dir of [-1, 1]) {
      ctx.spawn({
        x: p.x + 12, y: (ctx.arena ? ctx.arena.floorY : ctx.floorY) - 5,
        vx: dir * L.waveSpeed, vy: 0,
        radius: L.waveSize, damage: dmgOf('quake_hammer', lv, ctx) * L.waveDmgMult,
        color: '#A76625', shape: 'wave', weapon: 'quake_hammer',
        life: L.waveLife, pierce: 99, knockback: L.waveKnock,
        hugsFloor: true,
        // Lv3: "the wave now climbs low obstacles instead of stopping at them."
        climbsLedges: !!L.waveClimbs,
        stun: L.stunFrames,
      });
    }
  },
};

// ── SWARM CALLER — Bug, defensive ────────────────────────────────────
/**
 * "Summons temporary bug allies that attack nearby enemies."
 *  Lv1  ONE ally, short duration; "it attacks the nearest minion and must
 *       return to the player briefly between targets".
 *  Lv3  two allies with a longer duration, prioritising whatever the player
 *       last damaged.
 *  Lv6  three, and "every other bug spawned will prioritize intercepting
 *       projectiles as a meat shield".
 *  Lv10 "5 bugs continuously swarm all over the player forming a shield and
 *       slowly respawn after tanking enough damage. Additionally, 3 bugs
 *       simultaneously converge on an enemy and kamikaze with an explosive
 *       blast."
 *
 * BELOW Lv10 the allies expire as a GROUP, which makes the weapon read as a
 * summon on a cycle rather than a slowly-refilling pet count. Lv10 inverts
 * that: the swarm is permanent and individual bugs come and go, which is what
 * "continuously swarm" and "slowly respawn" mean together. That inversion is
 * the rung — not the count.
 *
 * The return-to-player beat from Lv1 survives the whole ladder. It is what
 * stops the swarm being a stationary damage aura parked on one enemy, and it
 * is why a bug is worth watching.
 */
const swarm = {
  init(st) { st.cool = 0; st.kami = 0; },

  step(st, lv, ctx) {
    const L = ladderAt('swarm_caller', lv);
    const mine = ctx.allies.filter((a) => a.owner === 'swarm_caller');

    // Lv10: a standing swarm. Bugs are topped back up one at a time on a slow
    // timer instead of the whole group being re-summoned at once.
    if (L.shield) {
      if (mine.length < L.count && --st.cool <= 0) {
        st.cool = L.respawnFrames;
        ctx.allies.push(makeBug(lv, ctx, L, 'shield'));
      }
      // "3 bugs simultaneously converge on an enemy and kamikaze." Sent from
      // the standing swarm, so the shield thins for as long as they are out —
      // the attack costs defence, which is what keeps it from being free.
      if (--st.kami <= 0) {
        const target = nearestEnemy(ctx, ctx.player.x + 12, ctx.player.y + 12);
        if (target) {
          st.kami = L.kamikazeFrames;
          for (const a of mine.filter((b) => b.role === 'shield').slice(0, L.kamikaze)) {
            a.role = 'kamikaze';
            a.target = target;
          }
          ctx.sfx('shoot', { pitch: 1.4 });
        }
      }
      return;
    }

    if (mine.length === 0 && --st.cool <= 0) {
      st.cool = L.recallFrames;
      ctx.sfx('pickupExp', { pitch: 0.8 });
      for (let i = 0; i < L.count; i++) {
        // Lv6: "every other bug spawned will prioritize intercepting projectiles."
        ctx.allies.push(makeBug(lv, ctx, L,
          L.intercept && i % 2 === 1 ? 'block' : 'attack'));
      }
    }
  },
};

function makeBug(lv, ctx, L, role) {
  return {
    owner: 'swarm_caller',
    role,
    x: ctx.player.x + 12, y: ctx.player.y + 6,
    w: 5, h: 5, vx: 0, vy: 0,
    // A standing swarm does not tick down; it is replaced when it dies.
    life: L.shield ? Infinity : L.lifeFrames,
    damage: dmgOf('swarm_caller', lv, ctx) * L.dmgMult,
    blastDamage: dmgOf('swarm_caller', lv, ctx) * (L.blastDmgMult || 0),
    blastRadius: L.blastRadius || 0,
    regroup: 0, regroupFor: L.regroup, hitGap: 0,
    orbit: Math.random() * Math.PI * 2,
  };
}

/**
 * Advance the ally swarm. Kept here rather than in GameScene because allies
 * only exist because a weapon made them, and their targeting rules are that
 * weapon's design.
 */
export function stepAllies(ctx) {
  const list = ctx.allies;
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    if (--a.life <= 0) { list.splice(i, 1); continue; }
    if (a.hitGap > 0) a.hitGap--;
    if (a.regroup > 0) a.regroup--;

    let tx, ty;
    if (a.role === 'trail') {
      // A shadow left BEHIND the player, so it does not move at all. It hurts
      // whatever walks into it and returns a cut of that to the player, which
      // is what "damage enemies and lifesteal" means for a thing you cannot aim.
      if (a.hitGap === 0) {
        const e = enemiesIn(ctx, { x: a.x - 4, y: a.y - 6, w: 8, h: 12 })[0];
        if (e) {
          ctx.hitEnemy(e, a.damage, { from: a.x });
          a.hitGap = a.hitEvery;
          ctx.heal(a.damage * a.lifesteal);
        }
      }
      continue;
    }
    if (a.role === 'block') {
      // Interceptors fly at the nearest incoming enemy shot and eat it.
      const shot = nearestEnemyShot(ctx, a.x, a.y);
      if (shot) {
        tx = shot.x; ty = shot.y;
        if (Math.abs(shot.x - a.x) < 5 && Math.abs(shot.y - a.y) < 5) {
          shot.life = -1;
          list.splice(i, 1);
          continue;
        }
      }
    } else if (a.role === 'kamikaze') {
      // A one-way trip. It flies at its target and detonates on arrival, and it
      // does NOT re-target if that enemy dies first — three bugs converging on
      // something already dead would look like a bug in the other sense.
      const t = a.target;
      if (!t || t.hp <= 0) { a.role = 'shield'; a.target = null; }
      else {
        const c = centreOf(t);
        tx = c.x; ty = c.y;
        if (Math.hypot(c.x - a.x, c.y - a.y) < 7) {
          ctx.puff({ x: a.x, y: a.y, w: a.blastRadius * 2, life: 12, color: 0xB8DC28 });
          ctx.sfx('shootBig', { pitch: 1.3 });
          for (const e of ctx.enemies) {
            if (e.hp <= 0) continue;
            const ec = centreOf(e);
            if (Math.hypot(ec.x - a.x, ec.y - a.y) > a.blastRadius) continue;
            ctx.hitEnemy(e, a.blastDamage, { from: a.x, knockback: 2 });
          }
          list.splice(i, 1);
          continue;
        }
      }
    } else if (a.role === 'shield') {
      // "Continuously swarm all over the player forming a shield." They orbit
      // rather than chase, and eat any shot that reaches them — a bug spent
      // this way is gone until the respawn timer replaces it.
      a.orbit += 0.09;
      tx = ctx.player.x + 12 + Math.cos(a.orbit) * 13;
      ty = ctx.player.y + 12 + Math.sin(a.orbit) * 11;
      const shot = nearestEnemyShot(ctx, a.x, a.y, 12);
      if (shot) { shot.life = -1; list.splice(i, 1); continue; }
    }

    // "MUST RETURN TO THE PLAYER BRIEFLY BETWEEN TARGETS." A bug that just
    // landed a hit goes home for a beat before picking its next one, so the
    // swarm pulses in and out instead of parking on whatever it reached first.
    if (tx === undefined && a.regroup > 0) {
      tx = ctx.player.x + 12; ty = ctx.player.y - 8;
    }
    if (tx === undefined) {
      // Lv3 prioritises whatever the player last damaged; otherwise nearest.
      const focus = ctx.run.lastDamaged;
      const t = (focus && focus.hp > 0 && ctx.enemies.includes(focus))
        ? focus : nearestEnemy(ctx, a.x, a.y);
      if (t) { const c = centreOf(t); tx = c.x; ty = c.y; }
    }
    if (tx === undefined) { tx = ctx.player.x + 12; ty = ctx.player.y - 8; }

    const dx = tx - a.x, dy = ty - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const top = a.role === 'kamikaze' ? 4 : 2.2;
    a.vx += (dx / d) * (a.role === 'kamikaze' ? 0.6 : 0.35);
    a.vy += (dy / d) * (a.role === 'kamikaze' ? 0.6 : 0.35);
    const sp = Math.hypot(a.vx, a.vy);
    if (sp > top) { a.vx = (a.vx / sp) * top; a.vy = (a.vy / sp) * top; }
    a.x += a.vx; a.y += a.vy;

    if (a.role !== 'block' && a.role !== 'shield' && a.hitGap === 0) {
      const box = { x: a.x - 3, y: a.y - 3, w: 6, h: 6 };
      const e = enemiesIn(ctx, box)[0];
      if (e) {
        ctx.hitEnemy(e, a.damage, { from: a.x });
        a.hitGap = 30;
        a.regroup = a.regroupFor || 0;
      }
    }
  }
}

function nearestEnemyShot(ctx, x, y, maxDist = 90) {
  let best = null, bestD = maxDist * maxDist;
  for (const b of ctx.bullets) {
    if (!b.enemy || b.life <= 0 || b.push) continue;
    const d = dist2(x, y, b.x, b.y);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

// ── THORN LASH — Grass, offensive ────────────────────────────────────
/**
 * "Stand still while shooting a directional-input whip-like vine that reels in
 *  enemies then immediately throws them back as projectiles. Moderately slow
 *  attack speed."
 *  Lv1  "short reach; can only reel in and damage minions; does not toss or
 *        constrict them."
 *  Lv3  "increased reach. Affected by diagonal inputs. On enemy contact:
 *        perform the attack as described. Else if on the ground and contacting
 *        the outer 20% of a platform: grapple on top of that platform. If in
 *        the air and contacting a platform or ceiling: swing forward in the
 *        current direction, then release."
 *  Lv6  "significantly increased reach."
 *  Lv10 "now constricts mini-bosses and applies DPS for 5 seconds. Now throws
 *        minions as high-damage projectiles."
 *
 * STANDING STILL IS THE PRICE. The root is what makes a whip with this reach
 * fair — you commit to a spot for the length of the lash, so every use is a
 * read on what is about to be where you are. It roots the INPUT rather than
 * freezing the player, so gravity, knockback and a hit landing on you all still
 * behave; you are braced, not paused.
 *
 * THE LV3 GRAPPLE IS THE SAME LASH WITH A DIFFERENT THING ON THE END. Enemy
 * first, terrain second, nothing third — one priority order, so the player
 * never has to choose a mode. A ledge lip pulls you up because you are on the
 * ground; a platform overhead swings you because you are not.
 */
const thorn = {
  init(st) { st.lash = null; st.root = 0; },

  step(st, lv, ctx) {
    const L = ladderAt('thorn_lash', lv);
    if (st.root > 0) { st.root--; ctx.run.rootFrames = Math.max(ctx.run.rootFrames, 1); }
    const la = st.lash;
    if (!la) return;

    const p = ctx.player;
    la.ox = p.x + 12; la.oy = p.y + 12;
    la.len = Math.min(L.reach, la.len + L.reach / L.lashFrames);

    // REELING: whatever is on the end comes home, then resolves.
    if (la.grabbed) {
      const e = la.grabbed;
      if (e.hp <= 0) { st.lash = null; return; }
      const dx = la.ox - (e.x + e.w / 2), dy = la.oy - (e.y + e.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * L.reelSpeed;
      e.y += (dy / d) * L.reelSpeed;
      if (L.constrictFrames) {
        Attr.applyStatus(e.status, 'constrict', L.constrictFrames);
      }
      if (d < 18) {
        // Lv10 throws it back as a projectile. Below that the reel is the whole
        // move and the enemy simply arrives.
        if (L.toss) {
          e.hp = 0;
          ctx.spawn({
            x: e.x + e.w / 2, y: e.y + e.h / 2,
            vx: L.tossSpeed * p.facing, vy: -0.6,
            radius: 4, damage: dmgOf('thorn_lash', lv, ctx) * L.tossDmgMult,
            color: '#2AAB1C', shape: 'rock', weapon: 'thorn_lash',
            life: 120, pierce: 3, knockback: 3,
          });
          ctx.sfx('shootBig', { pitch: 0.95 });
        }
        st.lash = null;
      }
      return;
    }

    // SWINGING: the Lv3 airborne grapple carries the player forward instead.
    if (la.swing) {
      p.x += L.swingSpeed * la.dir.x;
      p.vy = Math.min(p.vy, 0.4);
      if (--la.swing <= 0) st.lash = null;
      return;
    }

    if (la.t > 0 && --la.t === 0) { st.lash = null; return; }
    thornProbe(st, lv, ctx, L);
  },

  fire(st, lv, ctx) {
    if (st.lash || st.cool > 0) return false;
    const L = ladderAt('thorn_lash', lv);
    st.cool = L.cooldown;
    st.root = L.rootFrames;
    const p = ctx.player;
    ctx.sfx('shoot', { pitch: 0.7 });

    // "Affected by diagonal inputs" from Lv3. `diagInput` is the reserved
    // up-left / up-right hook; below Lv3 the lash is flat whatever is held.
    let dy = 0;
    if (L.diagonal && (p.diagInput === 'ul' || p.diagInput === 'ur')) dy = -0.7;
    const dir = { x: p.facing, y: dy };
    const d = Math.hypot(dir.x, dir.y) || 1;
    dir.x /= d; dir.y /= d;

    st.lash = {
      ox: p.x + 12, oy: p.y + 12, len: 0, dir,
      t: L.lashFrames, grabbed: null, swing: 0,
    };
    return true;
  },
};

/** The tip of the lash, and what it has found there. */
function thornTip(la) {
  return { x: la.ox + la.dir.x * la.len, y: la.oy + la.dir.y * la.len };
}

function thornProbe(st, lv, ctx, L) {
  const la = st.lash;
  const tip = thornTip(la);
  ctx.arc({ x: la.ox, y: la.oy }, tip);

  // ENEMY FIRST. A boss is never reeled — it is not moved by anything (see
  // hitEnemy) — so it takes the damage and the lash ends there.
  const box = { x: tip.x - 5, y: tip.y - 5, w: 10, h: 10 };
  const e = enemiesIn(ctx, box)[0];
  if (e) {
    ctx.hitEnemy(e, dmgOf('thorn_lash', lv, ctx) * L.dmgMult, { from: la.ox });
    if (e.isBoss) {
      if (L.constrictFrames) Attr.applyStatus(e.status, 'constrict', L.constrictFrames);
      st.lash = null;
    } else {
      la.grabbed = e;
    }
    return;
  }

  if (!L.grapple || la.len < L.reach) return;

  // TERRAIN SECOND, and only at full extension — a grapple that fired early
  // would keep stealing the enemy hit the player was actually aiming at.
  const p = ctx.player;
  if (p.onGround) {
    // "Contacting the outer 20% of a platform: grapple on top of it."
    for (const pl of ctx.platforms) {
      const lip = Math.max(4, pl.w * L.ledgeGrab);
      const nearEnd = (tip.x >= pl.x && tip.x <= pl.x + lip)
        || (tip.x <= pl.x + pl.w && tip.x >= pl.x + pl.w - lip);
      if (!nearEnd || tip.y < pl.y - 8 || tip.y > pl.y + 10) continue;
      p.x = tip.x - 12;
      p.y = pl.y - 24;
      p.vy = 0;
      ctx.sfx('select', { pitch: 1.2 });
      st.lash = null;
      return;
    }
    return;
  }
  // Airborne: anything overhead swings you forward, then releases.
  const overhead = ctx.platforms.some(
    (pl) => tip.x >= pl.x && tip.x <= pl.x + pl.w && Math.abs(tip.y - pl.y) < 10,
  ) || (ctx.arena && tip.y <= ctx.arena.ceilY + 4);
  if (overhead) {
    la.swing = L.lashFrames;
    ctx.sfx('select', { pitch: 0.9 });
  }
}

// ── GALE VORTEX — Flying, defensive ──────────────────────────────────
/**
 * "White puffs of smoke energy when falling, significantly reducing fall speed
 *  and significantly increasing horizontal movement."
 *  Lv1 "up to 3 puffs while falling, each one cancelling vertical velocity and
 *       separated by a very brief time."
 *
 * Lv3, Lv6 and Lv10 in the tracker still describe the OLD tornado weapon this
 * replaced and are `[wip]`, so the ladder stops at Lv1 and higher levels are
 * damage-only. Do not build them from the stale text.
 *
 * IT SPENDS ITSELF AND REFILLS ON THE GROUND, which is what makes it a
 * defensive weapon and not flight. Three cancelled falls is a large safety net
 * over a pit and nothing at all in a fight you are winning on the floor — the
 * budget is the whole design, and it never asks for the fire button.
 */
const gale = {
  init(st, lv) { st.left = ladderAt('gale_vortex', lv).puffs; st.gap = 0; st.glide = 0; },

  step(st, lv, ctx) {
    const L = ladderAt('gale_vortex', lv);
    const p = ctx.player;
    if (st.gap > 0) st.gap--;
    if (st.glide > 0) st.glide--;

    if (p.onGround) { st.left = L.puffs; st.glide = 0; return; }

    // A puff fires on its own the moment you are falling and one is due. It is
    // automatic because the class is: a defensive weapon that wanted a button
    // would be an offensive weapon with extra steps.
    if (p.vy > L.glideFall && st.left > 0 && st.gap === 0) {
      st.left--;
      st.gap = L.puffGap;
      st.glide = L.glideFrames;
      p.vy = p.vy * L.fallCut;
      ctx.puff({ x: p.x + 12, y: p.y + 20, w: 14, life: 14, color: 0xF8FAFC });
      ctx.sfx('shoot', { pitch: 1.6 });
    }

    // While a puff is live the fall is capped and horizontal authority is up.
    if (st.glide > 0) {
      ctx.run.glideFall = L.glideFall;
      ctx.run.airControl = L.airControl;
    }
  },
};

// ── ECLIPSE BLADE — Dark, defensive ──────────────────────────────────
/**
 * "Reduces aggro and become immune to status effects."
 *  Lv1  "while active enemies will fire projectiles slightly less frequently
 *        and when pursuing the player will pause very briefly at random times."
 *  Lv3  "slight increase in pause duration and frequency."
 *  Lv6  "creates shadow trails that damage enemies and lifesteal."
 *
 * Lv10's "Dark Mode" is still `[wip]`, so the ladder stops at Lv6.
 *
 * THE WEAPON WAS OFFENSIVE AND IS NOW DEFENSIVE. The tracker field used to
 * describe a returning boomerang; it now describes a cloak, and the field wins.
 * Its id and its name are unchanged so saves and the wheel are unaffected.
 *
 * AGGRO IS A TAX ON THE ENEMY'S CLOCK, not a shield on the player. It slows the
 * rate at which things happen TO you rather than reducing what they do, which
 * is the only reading of "stealth" that stays legible in a game where every
 * threat is already telegraphed — you can still see everything coming, there is
 * just less of it.
 */
const eclipse = {
  init(st) { st.trail = 0; },

  step(st, lv, ctx) {
    const L = ladderAt('eclipse_blade', lv);
    const p = ctx.player;

    // Read by systems/minions.js and by the boss fire path. Re-asserted every
    // frame and cleared by GameScene before the weapons run, so benching the
    // cloak restores full aggro on the very next frame.
    ctx.run.aggroFire = Math.min(ctx.run.aggroFire ?? 1, L.fireChance);
    ctx.run.aggroPause = { chance: L.pauseChance, frames: L.pauseFrames };
    // "Immune to status effects." Flat from Lv1 — a partial immunity would be
    // indistinguishable from luck.
    if (L.immune) Attr.clearStatus(ctx.statusBag);

    if (!L.trail) return;
    // Lv6: a trail behind a MOVING player, so the reward is for using the
    // mobility the cloak buys rather than for standing in it.
    if (Math.abs(p.vx) < 0.4 || --st.trail > 0) return;
    st.trail = L.trailGap;
    ctx.allies.push({
      owner: 'eclipse_blade', role: 'trail',
      x: p.x + 12, y: p.y + 12, w: 6, h: 6, vx: 0, vy: 0,
      life: L.trailLife,
      damage: dmgOf('eclipse_blade', lv, ctx) * L.trailDmgMult,
      lifesteal: L.lifesteal,
      hitGap: 0, hitEvery: L.trailHitGap,
      regroup: 0, regroupFor: 0, orbit: 0,
    });
  },
};

// ── ALLOY BLADE — Steel, offensive ───────────────────────────────────
/**
 * "Throws penetrative metal blades that ricochet multiple times. Per-level
 *  scaling: more ricochets + higher damage."
 *  Lv1  "single blade, one ricochet, pierces the first enemy hit."
 *  Lv3  "two ricochets and increased pierce; blades survive contact with
 *        terrain corners."
 *
 * Lv6's early recall and Lv10's armour mode are still `[wip]`.
 *
 * PIERCE AND RICOCHET ARE DIFFERENT BUDGETS and the ladder moves both, which is
 * what stops the weapon being a plain damage step: pierce is how many bodies
 * one pass goes through, ricochet is how many more passes there are. The
 * projectile plumbing for both already exists — this weapon spends it rather
 * than inventing anything.
 */
const alloy = {
  step() {},

  fire(st, lv, ctx) {
    if (st.cool > 0) return false;
    const L = ladderAt('alloy_blade', lv);
    st.cool = L.cooldown;
    const p = ctx.player;
    ctx.sfx('shoot', { pitch: 1.25 });
    ctx.spawn({
      x: p.x + 12 + 8 * p.facing, y: p.y + 12,
      vx: L.speed * p.facing * ctx.run.projSpeedMult, vy: 0,
      radius: 3, damage: dmgOf('alloy_blade', lv, ctx) * L.dmgMult,
      color: '#B2BABD', shape: 'blade', weapon: 'alloy_blade',
      life: L.life, ricochet: L.bounces, pierce: L.pierce,
      // "Blades survive contact with terrain corners" — a corner is two
      // surfaces on one frame, and without this the blade spends both bounces
      // there and dies on a wall it visibly grazed.
      cornerSafe: !!L.cornerSafe,
      bounceDmg: 1, bounceShrink: 1,
    });
    return true;
  },
};

// ── Registry and driver ──────────────────────────────────────────────

/**
 * Weapons with real behaviour. Anything absent falls through to the plain
 * projectile path in GameScene.fire() — the flat placeholder, which is correct
 * for a weapon whose element slice has not happened yet.
 */
export const RUNTIME = {
  core_blaster: drone,
  blaze_wheel: blaze,
  torrent_cannon: torrent,
  volt_spark: volt,
  frost_guard: frost,
  strike_gauntlet: strike,
  quake_hammer: quake,
  swarm_caller: swarm,
  thorn_lash: thorn,
  gale_vortex: gale,
  eclipse_blade: eclipse,
  alloy_blade: alloy,
};

export const hasRuntime = (id) => Object.prototype.hasOwnProperty.call(RUNTIME, id);

/** Per-weapon runtime state, lazily created and reset when a weapon is benched. */
export function stateFor(store, id, lv, ctx) {
  if (!store[id]) {
    store[id] = {};
    RUNTIME[id]?.init?.(store[id], lv, ctx);
  }
  return store[id];
}

/** Drop state for weapons that are no longer equipped, so re-slotting is fresh. */
export function pruneStates(store, liveIds) {
  for (const id of Object.keys(store)) if (!liveIds.includes(id)) delete store[id];
}

/** Advance every equipped weapon with a runtime. `ids` is sidearm + slots. */
export function stepWeapons(ctx, ids) {
  for (const id of ids) {
    const beh = RUNTIME[id];
    if (!beh) continue;
    const lv = ctx.levelOf(id);
    beh.step(stateFor(ctx.run.wstate, id, lv, ctx), lv, ctx);
  }
  stepAllies(ctx);
}

/** Route a landing or a jump to every equipped weapon that reacts to it. */
export function notify(ctx, ids, event) {
  for (const id of ids) {
    const beh = RUNTIME[id];
    if (!beh?.[event]) continue;
    const lv = ctx.levelOf(id);
    beh[event](stateFor(ctx.run.wstate, id, lv, ctx), lv, ctx);
  }
}

/**
 * Offer a fire-button press to the active offensive weapon.
 *
 * Returns true when the weapon handled it, which is the caller's signal NOT to
 * fall through to the generic projectile path. `held` is in frames, so the
 * long-press threshold survives a frame-rate change — the whole engine is
 * fixed-timestep and a millisecond clock here would not be.
 */
export function fireActive(ctx, id, held) {
  const beh = RUNTIME[id];
  if (!beh?.fire) return false;
  const lv = ctx.levelOf(id);
  const st = stateFor(ctx.run.wstate, id, lv, ctx);
  return beh.fire(st, lv, ctx, held) !== false;
}

/** Tick down the per-weapon cooldowns the fire path uses. */
export function coolWeapons(store) {
  for (const st of Object.values(store)) if (st.cool > 0) st.cool--;
}

// ── Effects and rendering ────────────────────────────────────────────
/**
 * Short-lived visual feedback owned by this file.
 *
 * Melee and chain weapons have no projectile to look at, so without a puff or
 * an arc the only evidence a Volt Spark went off is an enemy losing health.
 * These are SHAPES, not art — they cost nothing and they are what makes a
 * hitbox you cannot see legible. Real art replaces nothing here; a sprite for
 * a punch would be a different thing entirely.
 */
export const makeFx = () => ({ puffs: [], arcs: [] });

/** A fading rectangle of light where a hitbox was. `life` doubles as its fade. */
export const puff = (fx, spec) => fx.puffs.push({ ...spec, max: spec.life });

/** The visible link between two enemies a chain jumped across. */
export function arcFx(fx, a, b) {
  const ca = centreOf(a), cb = centreOf(b);
  fx.arcs.push({ x0: ca.x, y0: ca.y, x1: cb.x, y1: cb.y, life: 8, max: 8 });
}

export function stepFx(fx) {
  for (let i = fx.puffs.length - 1; i >= 0; i--) if (--fx.puffs[i].life <= 0) fx.puffs.splice(i, 1);
  for (let i = fx.arcs.length - 1; i >= 0; i--) if (--fx.arcs[i].life <= 0) fx.arcs.splice(i, 1);
}

/**
 * Draw everything a weapon puts on screen that is not a projectile: the worn
 * hardware, the allies it summoned, and the hit feedback.
 *
 * `sx` maps world x to shaken screen x, exactly as GameScene.draw uses it, so
 * every one of these tracks the screen shake with the world it belongs to.
 */
export function drawWeaponry(g, sx, ctx) {
  const { run, player: p, fx } = ctx;

  // NULLFIRE DRONE — grey while live, DARK grey during the emergency reload,
  // which is the tracker's own readout for "the clip is gone". The clip bar
  // beside it is the other half of that readout.
  const dr = run.wstate.core_blaster;
  if (dr && ctx.equipped.includes('core_blaster')) {
    const m = mountPoint(p);
    g.fillStyle(dr.reloading ? 0x3A3F4A : 0x9AA4B4, 1);
    g.fillRect(sx(m.x) - 4, m.y - 3, 8, 6);
    g.fillStyle(dr.reloading ? 0x22262E : 0xD8DEE8, 1);
    g.fillRect(sx(m.x) - 2, m.y - 1, 4, 2);
    const L = ladderAt('core_blaster', ctx.levelOf('core_blaster'));
    const frac = Math.max(0, Math.min(1, (dr.clip || 0) / L.clip));
    g.fillStyle(0x14243A, 1);
    g.fillRect(sx(m.x) - 5, m.y - 6, 10, 2);
    g.fillStyle(dr.reloading ? 0x8A3040 : 0x5CADD5, 1);
    g.fillRect(sx(m.x) - 5, m.y - 6, Math.round(10 * frac), 2);
  }

  // TORRENT CANNON — two nozzles under a blue tank layer whose height IS the
  // fill level, so the resource is read off the hardware rather than the HUD.
  const tc = run.wstate.torrent_cannon;
  if (tc && ctx.equipped.includes('torrent_cannon')) {
    const bx = sx(p.x + 12 - p.facing * 9), by = p.y + 6;
    const L = ladderAt('torrent_cannon', ctx.levelOf('torrent_cannon'));
    g.fillStyle(0x6B7686, 1);
    g.fillRect(bx - 4, by, 8, 11);
    const fill = Math.round(9 * Math.max(0, Math.min(1, tc.tank / L.tank)));
    g.fillStyle(0x145DBD, 1);
    g.fillRect(bx - 3, by + 1 + (9 - fill), 6, fill);
    g.fillStyle(0x39404E, 1);
    g.fillRect(bx - 3, by + 11, 2, 3);
    g.fillRect(bx + 1, by + 11, 2, 3);
  }

  // FROST GUARD — brighter as it bulks up, so "not yet at full strength" is
  // visible rather than something you discover by being hit through it.
  const fg = run.wstate.frost_guard;
  if (fg?.box && ctx.equipped.includes('frost_guard')) {
    const b = fg.box;
    const L = ladderAt('frost_guard', ctx.levelOf('frost_guard'));
    const solid = 0.35 + 0.45 * (fg.hits / L.hits);
    g.fillStyle(0xA0EFE7, solid);
    g.fillRect(sx(b.x), b.y, b.w, b.h);
    g.fillStyle(0xFFFFFF, Math.min(1, solid + 0.2));
    g.fillRect(sx(b.x), b.y, b.w, 1);
  }

  // SWARM CALLER allies. Interceptors carry a pale core so you can tell which
  // half of the swarm is guarding you and which half is out hunting.
  for (const a of run.allies) {
    g.fillStyle(a.role === 'block' ? 0xE8F0A0 : 0xB8DC28, 1);
    g.fillRect(sx(a.x) - 2, a.y - 2, 5, 5);
    g.fillStyle(0x4D5C1A, 1);
    g.fillRect(sx(a.x) - 1, a.y + Math.sin(a.life * 0.5), 3, 1);
  }

  for (const q of fx.puffs) {
    const t = q.life / q.max;
    g.fillStyle(q.color, 0.55 * t);
    const h = 4 + 10 * (1 - t);
    g.fillRect(sx(q.x) - q.w / 2, q.y - h / 2, q.w, h);
  }
  for (const arc of fx.arcs) {
    g.lineStyle(1, 0xF5D328, arc.life / arc.max);
    g.lineBetween(sx(arc.x0), arc.y0, sx(arc.x1), arc.y1);
  }
}
