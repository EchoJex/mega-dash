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
import { BACK_SHADE } from '../config/display.js';
import { ladderAt, damageAtLevel, weaponOf, DAMAGE_WORDS } from '../data/weapons.js';
import * as Attr from './attributes.js';
import { clipOf, cellAt, frameAt, areaAt, pointAt, growStepsOf } from './frame-data.js';

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
const enemiesIn = (ctx, box) => ctx.enemies.filter(
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
function mountPoint(p, aheadX = 9, aboveY = -3) {
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
    const L = ladderAt('nullfire_drone', lv);
    st.clip = L.clip;
    st.cool = 0;
    st.reload = 0;
    st.burst = 0;
    st.burstGap = 0;
    st.trickle = 0;
    // The Lv10 round-robin cursor. Unseeded it was `undefined % n` -> NaN ->
    // `ranked[NaN]` -> undefined, so the first shot of every engagement fell
    // through to the `|| target` nearest-enemy fallback and broke the rung's
    // one rule: each bullet targets a DIFFERENT enemy. It never threw, so
    // nothing surfaced it.
    st.skyIndex = 0;
  },

  step(st, lv, ctx) {
    const L = ladderAt('nullfire_drone', lv);
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

    /**
     * READ, DO NOT DECREMENT. `coolWeapons` already ticks `st.cool` once per
     * frame for every weapon state, and this decremented it a second time — so
     * the drone burned its cooldown at two frames per frame and had always
     * fired at DOUBLE its stated rate. Invisible while the rung said "1 shot
     * per second"; obvious the moment the tracker said "1 shot per 3 seconds"
     * and it delivered one every 1.5. Every other runtime reads this flag
     * without touching it.
     */
    if (st.cool > 0) return;
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
  const dmg = dmgOf('nullfire_drone', lv, ctx) * (L.dmgMult ?? 1);
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
      weapon: 'nullfire_drone', life: 260,
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
    weapon: 'nullfire_drone', life: 220,
    // Lv6: "bullet splits into 3 fragments after a brief time; fragments have
    // moderate auto-aim". The two bursts chase different enemies, so the first
    // set locks the nearest and the second the next-nearest.
    ...(L.splitIn ? {
      splitIn: L.splitIn,
      splitCount: 3,
      splitSpeed: L.speed * 0.8,
      splitRadius: 2,
      splitSeekRank: st.burst,      // which enemy in range order this set chases
      splitSeekTurn: L.splitSeekTurn,
      splitAccel: L.splitAccel,
      // "Fragments can not change target mid flight." A seeking shot normally
      // re-picks when its target dies; a fragment commits to the one it was
      // born chasing and flies on if that target is gone.
      splitLock: true,
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
        // Read by stepBullets when the arc becomes a roll, and when a rolling
        // wheel meets an enemy. Both belong to the projectile rather than to
        // this function, because both happen long after it returns.
        rollDmgMult: L.rollDmgMult,
        explodeR: L.explodeR,
        explodeBurn: L.explodeBurn,
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

    // A dive in progress owns the player's vertical motion; the hover must not
    // re-arm underneath it and lift him back out of it.
    if (st.diving) { st.idle = 0; st.apexArmed = false; return; }

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

  /**
   * THE JUMP BUTTON MEANS TWO THINGS UP HERE, and which one is unambiguous:
   * mid-hover it starts the nosedive, otherwise it vents.
   *
   * A tap during the hover is the only input in the weapon, and it can only
   * happen in a window the player deliberately entered — so it needs no
   * gesture, no hold, and nothing to tell it apart from an ordinary jump.
   */
  jump(st, lv, ctx) {
    const L = ladderAt('torrent_cannon', lv);

    if (L.tidal && st.hovering > 0) {
      // THE SIZE IS THE RECEIPT. Captured before the tank is emptied, because
      // the wave is "scaled down based on the amount of water remaining" and
      // after this line there is none remaining.
      st.diveFuel = st.tank / L.tank;
      st.tank = 0;
      st.hovering = 0;
      st.diving = true;
      st.idle = 0;
      ctx.player.vy = L.diveSpeed;
      ctx.sfx('shootBig', { pitch: 0.7 });
      return;
    }

    if (!L.onJump || st.tank < L.burstCost) return;
    st.tank -= L.burstCost;
    st.idle = 0;
    burst(ctx, lv, L, ctx.player.y + 24, 1);
  },

  land(st, lv, ctx) {
    const L = ladderAt('torrent_cannon', lv);

    // "On contact with a surface" — the dive resolves wherever it lands, and it
    // has already been paid for, so it never checks the tank.
    if (st.diving) {
      st.diving = false;
      const fuel = st.diveFuel ?? 0;
      st.diveFuel = 0;
      tidalWave(ctx, lv, L, fuel);
      ctx.shake(2, 20);
      // The landing vent comes free with it: the dive IS an impact.
      burst(ctx, lv, L, ctx.player.y + 24, 1.6);
      return;
    }

    if (st.tank < L.burstCost) return;
    const force = Math.min(1, Math.abs(ctx.landVy) / FEEL.maxFallSpeed);
    st.tank -= L.burstCost;
    st.idle = 0;
    burst(ctx, lv, L, ctx.player.y + 24, 1 + force);
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
/**
 * The wave that resolves a nosedive: one each way along the floor.
 *
 * `fuel` is 0-1, the tank at the moment the dive began. It sets the height and
 * nothing else — speed, life and pierce are the same wave however much water
 * paid for it, so a nearly-empty tank still crosses the room. What you lose by
 * diving early is REACH in the vertical, which is what decides how much of a
 * boss the wave actually covers.
 */
function tidalWave(ctx, lv, L, fuel) {
  const p = ctx.player;
  const r = L.waveMin + (L.waveMax - L.waveMin) * Math.max(0, Math.min(1, fuel));
  for (const dir of [-1, 1]) {
    ctx.spawn({
      x: p.x + 12, y: (ctx.arena ? ctx.arena.floorY : ctx.floorY) - 6,
      vx: dir * L.tidalSpeed, vy: 0,
      radius: r, damage: dmgOf('torrent_cannon', lv, ctx) * L.tidalDmgMult,
      color: '#5CADD5', shape: 'stream', weapon: 'torrent_cannon',
      life: L.tidalLife, pierce: 99, knockback: L.knock * (1 + fuel),
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
 * THE OWNER'S CHAIN RULES (17 Oct 2026): every enemy the chain touches is
 * stunned; one zap never touches the same enemy twice; and when choosing where
 * to jump, an enemy the PREVIOUS zap did not hit is preferred, then the nearest,
 * then a coin toss.
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
    /**
     * The zap's visual. `weapon` is what lets the Volt Spark's own sprite take
     * this over: with no art it is the rectangle it has always been, and with
     * a shippable frame it is the drawing, at the same place for the same time.
     */
    ctx.puff({
      x: box.x + box.w / 2, y: box.y + 9, w: box.w, life: 8,
      color: 0xF5D328, weapon: 'volt_spark', facing: p.facing,
    });

    const first = enemiesIn(ctx, box)[0];
    if (!first) return true;

    const prev = st.lastHits || new Set();
    const hits = new Set();
    st.lastHits = hits;
    const strike = (e, depth) => {
      if (hits.has(e)) return false;         // one zap never touches an enemy twice
      hits.add(e);
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
        const near = enemiesByRange(ctx, c.x, c.y, hits, L.chainRange);
        // Distance to the nearest whole pixel, so near-equal jumps are a real
        // tie that the coin toss settles.
        const rank = new Map(near.map((e) => {
          const ce = centreOf(e);
          return [e, Math.round(Math.hypot(ce.x - c.x, ce.y - c.y)) + Math.random() * 0.5];
        }));
        near.sort((a, b) => (prev.has(a) - prev.has(b)) || (rank.get(a) - rank.get(b)));
        for (const e of near) {
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

    // Body-blocking: the shield breaks outright and freezes what it hit.
    // A boss shrugs it off, EXCEPT the ones the rung names — from Lv3 that is
    // the water boss, which is the one matchup where ice is supposed to win.
    for (const e of enemiesIn(ctx, st.box)) {
      if (e.isBoss && !(L.freezeBosses || []).includes(e.id)) continue;
      Attr.applyStatus(e.status, 'freeze', L.freezeFrames, { step: FEEL.stunEnemyStep });
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
      // "Breaks from damage or from contact cause shield to break into small
      // ice shards" — one path, because the shield does not care which killed
      // it. Fired from the TOP EDGE of the shield as written, so they clear
      // the player's own head rather than raking along the floor.
      shatter(ctx, lv, L, st.box);
      st.down = L.breakFrames;
      st.box = null;
    } else if (st.chip <= 0) {
      st.chip = L.chipFrames;
    }
  },
};

/**
 * The shield coming apart, as a fan of shards.
 *
 * Angles are degrees above the horizon in the direction the player is facing,
 * straight off the rung — so the ladder states a SHAPE and this only has to
 * point it the right way. Nothing here knows what Lv3 or Lv6 look like.
 */
function shatter(ctx, lv, L, box) {
  if (!L.shards || !box) return;
  const p = ctx.player;
  const dir = p.facing > 0 ? 1 : -1;
  ctx.sfx('hurt', { pitch: 2.4 });
  for (const deg of L.shards) {
    const th = (deg * Math.PI) / 180;
    ctx.spawn({
      x: box.x + box.w / 2, y: box.y,
      vx: Math.cos(th) * L.shardSpeed * dir,
      vy: -Math.sin(th) * L.shardSpeed,
      radius: 2.5,
      damage: dmgOf('frost_guard', lv, ctx) * L.shardDmgMult,
      color: '#A0EFE7', shape: 'shard', weapon: 'frost_guard',
      life: 90, pierce: L.shardPierce || 0,
      // NO freeze on the shards. The rung puts the freeze on the SHIELD's
      // contact — "freezes the opponent if contacting a minion or the water
      // boss" — and the shards are what is left after that already happened.
      // stepBullets has no freeze path either; adding one for a field nobody
      // wrote would be inventing a rung.
    });
  }
}

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
  /**
   * TWO MOVES ON ONE BUTTON, so the trigger must wait for the RELEASE.
   *
   * `fire` below already branches on `held >= LONG_PRESS_FRAMES` — press for a
   * jab, hold for a finisher — but without this flag GameScene took the
   * auto-repeat path instead and fired on every eligible frame while the button
   * was down. Past frame 24 that made EVERY shot a finisher, so the jab chain
   * (`jabChain`, `chainWindow`, and the rule that only the last jab knocks
   * back) was unreachable for anyone holding the button, and releasing on
   * exactly the right frame was the only way to land a jab.
   *
   * GameScene's own docblock names the two weapons on this path — "Strike
   * Gauntlet, Quake Hammer" — and only the Quake Hammer had the flag.
   */
  longPress: true,

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
 * King Dedede's hammer: every press is a Jet Hammer charge, and a weak swing
 * can be followed by two quick jabs. The ladder in data/weapons.js carries the
 * owner's words and what each rung adds. THE MOVES THEMSELVES — how long each
 * lasts, the step it hits on, and the area it hits — are drawn into the
 * hammer's sprite sheets and read back from `src/data/frame-data.json`
 * (src/data/weapon-art.js says which). Moving a hold or a hit area in the art
 * moves the game with it.
 *
 * EVERY PRESS IS A CHARGE, FROM ITS FIRST STEP. GameScene calls `hold` every
 * step the button is down and `fire` once when it comes up. The charge starts
 * on the press with no minimum, so letting go at once swings with no charge.
 * There is no jab 1: by the owner's call (bug, build 1185) it went, and the
 * first press became the charge.
 *
 * A PRESS DURING A WEAK SWING IS JAB 2. Charged less than `afterSwing.below`,
 * a swing remembers a press made during it, and jab 2 starts the moment the
 * swing lets go; a press up to `grace` steps after it ends starts jab 2 at
 * once. THE FINISHER FOLLOWS JAB 2 THE SAME WAY (owner, 23 Oct 2026): a press
 * during jab 2 starts it no earlier than jab 2's step `open`, and a press up
 * to `grace` steps after jab 2 ends starts it at once. Through that window the
 * hammer stays in his hand on the frame the move let go on, rather than
 * dropping to rest. Jabs are decided on the PRESS, not the release, and a
 * press that became a jab never charges however long it is held. Any other
 * press made while the hammer is busy charges once it is free, so time spent
 * swinging never counts toward a charge.
 *
 * A COOLDOWN AFTER EVERY MOVE (owner, 23 Oct 2026): `cool.big` steps after the
 * finisher or a full charge, `cool.small` after anything else, counted from
 * the step the move lets go. It stops only a NEW press — the combo carries on
 * inside its windows regardless — and a press held through it charges once it
 * is over, like a press made while the hammer is busy.
 *
 * MOVEMENT is the rung's to decide (`jabMove`, `chargeMove`, `swingMove`) and
 * is asserted every step as `run.moveScale`: 0 roots the player, 0.5 is
 * walking speed, 1 leaves him alone. The released swing goes further and
 * PLANTS him (`run.planted`): by the owner's call he "shouldn't be able to
 * move once the hold is released", so jumping stops too, for the whole swing
 * and for the air dive. GameScene clears both every step, so a benched hammer
 * can never leave the player stuck.
 *
 * WHAT IS DRAWN IS READ, NEVER WRITTEN. `quakePose` says which clip of the
 * hammer's sheet is showing and how many steps into it; the dust, spikes and
 * sand live in the shared `fx`, so they finish even if the hammer is benched
 * mid-effect. `drawWeaponArt` is the only thing that draws any of it.
 */
// The sheets, by MANIFEST key, and the clips the code plays — the registry in
// src/data/weapon-art.js names the same ones, and the build holds the files to it.
const HAMMER = 'weapon:quake_hammer:held';
const DUST = 'weapon:quake_hammer:dust';
const PUFF = 'weapon:quake_hammer:puff';
const SPIKE = 'weapon:quake_hammer:spike';
const SAND = 'weapon:quake_hammer:sand';
const JAB_CLIPS = ['jabTwo', 'jabThree'];
const JAB_MOVES = ['jab2', 'jab3'];      // the owner's names for them, kept with jab 1 gone
const DUST_CLIPS = ['small', 'medium', 'large'];
const SPIKE_CLIPS = ['flat', 'low', 'high', 'steep'];   // one per ladder angle, shallowest first

/**
 * THE PLAIN HAMMER — the shapes drawn when its sheet has nothing drawn, and
 * the shapes `npm run art:placeholders` paints the placeholder sheet from.
 * Nothing in how the hammer PLAYS reads these: that is all frame data.
 *
 * A QUARTER SHORTER since the 12 Oct 2026 playtest ("the hammer is a bit too
 * long"): the head's middle is 16 pixels from his hand, where it was 23, so
 * its far edge is about 21 out against the player's 24 of height.
 *
 * Poses in degrees: 0 points forward, 90 straight up, 180 straight back —
 * [where the move starts, where the hammer is on the hit, where it ends]. The
 * low ends rest the head on the floor line rather than through it.
 */
export const HAMMER_SHAPE = {
  reach: 16,                             // hand to the middle of the head
  head: { across: 12, thick: 8 },
  poses: {
    jab2: [-12, 15, 60],                 // swung back up, hitting on the way through
    jab3: [150, -14, -14],               // the finisher: over the top and down
    swing: [105, -14, -15],              // from overhead to the ground in front
  },
  overhead: 105,                         // the charge: held up, like Dedede's forward smash
  dive: -60,
  rest: -20,                             // at rest: hanging down and forward at his side
};

const words = (w) => DAMAGE_WORDS[w] ?? 1;
const chargeOf = (st, L) => Math.min(1, st.chargeF / L.holdFrames);
/** 0 small below half a charge, 1 medium up to full, 2 large only at full. */
const cloudSize = (c, full) => (full ? 2 : c < 0.5 ? 0 : 1);

/**
 * HIS HAND: 5 pixels in front of his middle, halfway down. The hammer sheet's
 * pivot goes here, and every hit area on that sheet is measured from it.
 */
const gripOf = (p) => ({ x: p.x + 12 + p.facing * 5, y: p.y + 12 });

/**
 * Which way the plain hammer points `t` steps into a move that hits on `hit`:
 * eased from its start pose to its hit pose, then settling to its end pose
 * over six steps. Exported for the placeholder sheets, painted from the same.
 */
export function hammerDeg(move, t, hit) {
  const [s0, s1, s2] = HAMMER_SHAPE.poses[move];
  if (t < hit) {
    const u = Math.max(0, t) / hit;
    return s0 + (s1 - s0) * u * u * (3 - 2 * u);
  }
  return s1 + (s2 - s1) * Math.min(1, (t - hit) / 6);
}

/** Where the plain hammer's head is for a pose. */
function headAt(gx, gy, facing, deg) {
  const r = (deg * Math.PI) / 180, R = HAMMER_SHAPE.reach;
  return { x: gx + Math.cos(r) * facing * R, y: gy - Math.sin(r) * R };
}

/**
 * What the hammer is doing this step, or null while it is put away.
 *
 *   move   'jab2' 'jab3' 'swing', 'charge', or 'dive' (falling to
 *          the ground after a charge let go in the air)
 *   clip   which clip of the hammer's sheet shows, and `loop` if it repeats
 *   t      steps since that move began (for a charge, steps spent charging)
 *   hit    the step the move connects on; total, the step it lets go
 *   deg    which way the plain hammer points (0 forward, 90 up)
 *   full   a full charge, and `tell` whether this rung shows it
 */
function quakePose(st, L) {
  const a = st.act;
  if (st.diving) {
    return { move: 'dive', clip: 'dive', loop: true, t: st.diving.age, deg: HAMMER_SHAPE.dive };
  }
  if (a) {
    const clip = a.move === 'swing' ? 'swing' : JAB_CLIPS[a.n];
    return { move: a.move, clip, t: a.t, hit: a.hit, total: a.total, deg: hammerDeg(a.move, a.t, a.hit) };
  }
  if (st.charging) {
    const tell = !!L.fullTell && st.full;
    // A full charge trembles as well as puffing dust, so it reads even in the
    // middle of a busy room. With art, that is the `chargeFull` clip.
    return {
      move: 'charge', clip: tell ? 'chargeFull' : 'charge', loop: true,
      t: st.chargeF, full: st.full, tell,
      deg: HAMMER_SHAPE.overhead + (tell ? Math.sin(st.t * 0.9) * 4 : 0),
    };
  }
  // Still in his hand while the next move of the combo may follow.
  return st.linger && st.t <= st.linger.until ? st.linger : null;
}

/**
 * How fast the player may move while the hammer is busy. Never raises it.
 * The swing and the dive also plant him, and a jump he pressed a moment before
 * letting go is thrown away rather than left waiting to fire mid-swing.
 */
function moveGrant(st, L, ctx) {
  const swinging = st.diving || st.act?.move === 'swing';
  let m = 1;
  if (swinging) m = L.swingMove;
  else if (st.act) m = L.jabMove;
  else if (st.charging) m = L.chargeMove;
  if (m < (ctx.run.moveScale ?? 1)) ctx.run.moveScale = m;
  if (swinging) {
    ctx.run.planted = true;
    ctx.player.jumpBuffer = 0;
  }
}

/** `t0` is how many steps of this jab have already passed (see `settle`). */
function startJab(st, L, ctx, n, t0) {
  const c = clipOf(HAMMER, JAB_CLIPS[n]);
  st.act = { move: JAB_MOVES[n], n, t: t0, hit: c.hits[0].step, total: c.total, done: false };
  ctx.sfx('shootBig', { pitch: n === L.jab.length - 1 ? 1.0 : 1.45, dur: 0.5 });
}

/** A swing charged too little to stand on its own, so a jab may follow it. */
const weakSwing = (a, L) => a.move === 'swing' && a.c < L.afterSwing.below;

/**
 * Resolve whatever is due this step: the hit, the next jab, or the hammer
 * coming free. A loop because starting a jab late can make its own hit due at
 * once — a guard of four is more than any one step can ever need.
 *
 * A remembered press (`queued`) was only ever kept if it may chain (see
 * `press`): after a jab it is the next jab once that jab's window opens, after
 * a weak swing it is jab 2 the moment the swing lets go.
 */
function settle(st, L, lv, ctx) {
  for (let guard = 0; guard < 4 && st.act; guard++) {
    const a = st.act;
    if (!a.done && a.t >= a.hit) {
      a.done = true;
      if (a.move === 'swing') swingHit(L, lv, ctx, a);
      else jabHit(L, lv, ctx, a);
    }
    const q = st.queued;
    if (q && a.move !== 'swing') {
      const from = Math.max(L.jab[a.n].open, q.at);
      if (a.t < from) break;                       // waiting for the window
      st.queued = null;
      startJab(st, L, ctx, a.n + 1, a.t - from);
      continue;
    }
    if (a.t < a.total) break;
    st.act = null;
    st.freeAt = st.t;
    st.queued = null;
    // What may follow for `grace` steps: jab 2 after a weak swing, the
    // finisher after jab 2. The hammer holds the frame it let go on till then.
    const next = a.move === 'swing' ? (weakSwing(a, L) ? 0 : -1) : a.n + 1;
    st.chain = !q && next >= 0 && next < L.jab.length ? { n: next, until: st.t + L.grace } : null;
    const t = a.total - 1;
    st.linger = st.chain && {
      move: a.move, clip: a.move === 'swing' ? 'swing' : JAB_CLIPS[a.n], t, hit: a.hit, total: a.total,
      deg: hammerDeg(a.move, t, a.hit), until: st.chain.until,
    };
    const big = a.full || a.n === L.jab.length - 1;
    st.coolUntil = st.t + (big ? L.cool.big : L.cool.small);
    if (q) startJab(st, L, ctx, 0, a.t - a.total);
  }
}

/**
 * A NEW PRESS, whether it arrived as the first `hold` or as a release with no
 * hold before it. During a weak swing, or within `grace` steps of one ending,
 * it is jab 2; during jab 2, or within `grace` steps of it ending, it is the
 * finisher. A free, rested hammer starts charging on it. Anything else waits
 * for `hold` to charge it once the hammer is free and rested.
 */
function press(st, L, lv, ctx) {
  const a = st.act;
  if (a) {
    const chains = weakSwing(a, L) || (a.move !== 'swing' && a.n < L.jab.length - 1);
    if (chains && !st.queued) { st.queued = { at: a.t }; st.jabPress = true; }
    return;
  }
  if (st.diving) return;
  if (st.chain && st.t <= st.chain.until) {
    st.jabPress = true;
    startJab(st, L, ctx, st.chain.n, 0);
    st.chain = null; st.linger = null;
    settle(st, L, lv, ctx);
    return;
  }
  if (st.t < st.coolUntil) return;
  st.charging = true; st.chargeF = 0; st.full = false;
}

/**
 * The released swing. Its hit and its length are the swing clip's. A full
 * charge starts `fullSooner` steps in, because Jet Hammer's full charge comes
 * out a step quicker; a weaker one lets go `weakShorter` steps before the end
 * of the clip at no charge, closing to the whole clip at full. A dive's
 * landing moves it straight on to its hit.
 */
function swingAct(L, c, full) {
  const sw = L.swing, clip = clipOf(HAMMER, 'swing');
  return {
    move: 'swing', n: -1, t: full ? sw.fullSooner : 0, hit: clip.hits[0].step,
    total: clip.total - Math.round(sw.weakShorter * (1 - c)), done: false, c, full,
  };
}

/** A jab lands: everything in its hit frame's hit area, measured from his hand. */
function jabHit(L, lv, ctx, a) {
  const j = L.jab[a.n], p = ctx.player, g = gripOf(p), clip = clipOf(HAMMER, JAB_CLIPS[a.n]);
  const base = dmgOf('quake_hammer', lv, ctx);
  const struck = enemiesIn(ctx, areaAt(clip.hits[0], g.x, g.y, p.facing));
  for (const e of struck) {
    ctx.hitEnemy(e, base * words(j.dmg), { knockback: j.knock, launch: j.launch || 0, from: p.x + 12 });
  }
  // From Lv3 the finisher always throws up the medium cloud (owner, 23 Oct 2026).
  const at = L.cloud && a.n === L.jab.length - 1 && landing(clip, ctx, struck);
  if (at) throwDust(L, ctx, 'medium', at, struck, base);
}

/**
 * Where a blow landed: the ground under the hammer head if there is ground
 * there, otherwise the first thing it hit, otherwise nowhere (a blow at the
 * air). The head is the clip's spawn point on its hit frame — wherever the
 * drawing puts it — or the bottom of its hit area if it has none.
 */
function landing(clip, ctx, struck) {
  const p = ctx.player, g = gripOf(p), h = clip.hits[0];
  const sp = clip.spawns.find((s) => s.frame === h.frame) ?? { x: h.x + h.w / 2, y: h.y + h.h };
  const head = pointAt(sp, g.x, g.y, p.facing);
  const ground = !!p.onGround && ctx.overGround(head.x);
  if (ground) return { x: head.x, y: p.y + 24, ground };
  if (!struck.length) return null;
  // The cloud billows up from under whatever it hit.
  const e = struck[0];
  return { x: e.x + e.w / 2, y: e.y + e.h, ground };
}

/**
 * Lv3's dust cloud. How long it lasts and where it hurts are its clip's; a
 * cloud whose hit is its first frame hurts now.
 */
function throwDust(L, ctx, size, at, struck, base) {
  const d = {
    sheet: 'dust', clip: size, x: at.x, y: at.y, dir: ctx.player.facing, t: 0,
    life: clipOf(DUST, size).total, seed: Math.random(),
    struck, dmg: base * words(L.cloud.dmg), knock: L.cloud.knock, done: false,
  };
  ctx.fx.dust.push(d);
  cloudHit(d, ctx);
}

/**
 * The released swing landing. Jet Hammer's damage climbs with the charge and
 * then jumps at full charge (12% toward 30%, then 40%), and `partialShare` is
 * how far up the climb a nearly full charge gets before that jump.
 */
function swingHit(L, lv, ctx, a) {
  const p = ctx.player, f = p.facing, g = gripOf(p);
  const base = dmgOf('quake_hammer', lv, ctx);
  const lo = words(L.swingDmg), hi = words(L.swingDmgFull);
  const dmg = base * (a.full ? hi : lo + (hi - lo) * a.c * L.partialShare);
  const clip = clipOf(HAMMER, 'swing'), h = clip.hits[0];
  const struck = enemiesIn(ctx, areaAt(h, g.x, g.y, f));
  for (const e of struck) {
    ctx.hitEnemy(e, dmg, {
      knockback: L.swingKnock * (0.7 + 0.6 * a.c),
      launch: a.full ? L.fullLaunch : 0,
      from: p.x + 12,
    });
  }

  const at = landing(clip, ctx, struck);
  if (!at) return;
  ctx.shake(a.full ? 2 : 1, a.full ? 16 : 8);
  ctx.sfx('rumble', { dur: 0.2 + 0.2 * a.c, pitch: 1 - 0.2 * a.c });

  // Lv3: the dust cloud, sized by the charge.
  if (L.cloud) throwDust(L, ctx, DUST_CLIPS[cloudSize(a.c, a.full)], at, struck, base);

  // Lv10: the spikes. A FULL charge, and only where it met the GROUND.
  if (L.spikes && a.full && at.ground) raiseSpikes(L.spikes, at.x, at.y, f, base, ctx);
}

/**
 * A dust cloud HURTS ONCE, on the step its clip's hit frame begins: everything
 * in that frame's hit area, apart from whatever the hammer itself just hit —
 * the cloud is the splash, not a second blow.
 */
function cloudHit(d, ctx) {
  if (d.done || d.sheet !== 'dust') return;
  const h = clipOf(DUST, d.clip).hits[0];
  if (d.t < h.step) return;
  d.done = true;
  for (const e of enemiesIn(ctx, areaAt(h, d.x, d.y, d.dir))) {
    if (!d.struck.includes(e)) ctx.hitEnemy(e, d.dmg, { knockback: d.knock, from: d.x });
  }
}

/**
 * Lv10's spikes, one per ladder angle, each playing its own clip: it hurts
 * for as long as that clip's frames marked `hit` show, then stands for the
 * rest of it. Their angles and lengths stay the ladder's.
 */
function raiseSpikes(S, x, y, dir, base, ctx) {
  const hitSet = new Set();
  const dmg = base * words(S.dmg);
  S.angles.forEach((deg, i) => {
    const clip = SPIKE_CLIPS[i], c = clipOf(SPIKE, clip), grow = growStepsOf(c);
    ctx.fx.spikes.push({
      x, y, dir, deg, len: S.lens[i % S.lens.length], clip, t: 0,
      grow, stand: c.total - grow, hitSet, dmg, knock: S.knock, launch: S.launch,
      sandMin: S.sandMin, sandMax: S.sandMax,
    });
  });
  ctx.sfx('rumble', { dur: 0.35, pitch: 1.3 });
}

/**
 * A spike HURTS ONLY WHILE IT GROWS — once each per enemy per strike, whichever
 * spike reaches it first — and then, by the owner's call, "no longer deal[s]
 * damage, only block[s]" until it crumbles.
 *
 * Blocking means two things here: an enemy shot that touches a standing spike
 * is stopped (the Frost Guard's rule: a pushing gust is not a shot), and a
 * minion cannot pass through one. A boss is never moved by the player's
 * weapons, so he is not blocked; he simply is not hurt by a standing spike
 * either.
 */
function stepSpikes(ctx) {
  for (const s of ctx.fx.spikes) {
    const rad = (s.deg * Math.PI) / 180;
    const ux = Math.cos(rad) * s.dir, uy = -Math.sin(rad);
    if (s.t < s.grow) {
      const reach = (s.len * (s.t + 1)) / s.grow;
      for (const e of ctx.enemies) {
        if (e.hp <= 0 || s.hitSet.has(e)) continue;
        for (let d = 0; d <= reach; d += 3) {
          const px = s.x + ux * d, py = s.y + uy * d;
          if (px > e.x - 1 && px < e.x + e.w + 1 && py > e.y - 1 && py < e.y + e.h + 1) {
            s.hitSet.add(e);
            ctx.hitEnemy(e, s.dmg, { knockback: s.knock, launch: s.launch, from: s.x });
            break;
          }
        }
      }
      continue;
    }
    // A BOSS WALKS STRAIGHT THROUGH, by the owner's call, and the spike he
    // touches goes to sand at once instead of standing out its half second.
    // Brought forward to its last standing step, so the effects step that
    // follows crumbles it this same step.
    if (ctx.enemies.some((e) => e.isBoss && e.hp > 0 && spikeBand(e, s, rad))) {
      s.t = s.grow + s.stand - 1;
      continue;
    }
    const tx = s.x + ux * s.len, ty = s.y + uy * s.len;
    for (const b of ctx.bullets) {
      if (!b.enemy || b.life <= 0 || b.push) continue;
      if (distToSegment(b.x, b.y, s.x, s.y, tx, ty) > (b.radius || 2) + 1.5) continue;
      b.life = -1;
      ctx.fx.dust.push({
        sheet: 'puff', clip: 'block', x: b.x, y: b.y, t: 0,
        life: clipOf(PUFF, 'block').total, seed: Math.random(),
      });
    }
    for (const e of ctx.enemies) {
      if (!e.isBoss && e.hp > 0) blockBody(e, s, rad);
    }
  }
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + dx * u), py - (ay + dy * u));
}

/**
 * Push a minion out of a standing spike, back to the side it is on.
 *
 * Over the height of the minion's box the spike covers a band of x; the
 * minion is moved just clear of that band, forward if its middle is in front
 * of the spike and back if it is behind. A walker turns round, as it does at
 * the lip of a pit; a drifter has nowhere else to go and simply presses
 * against it. Knockback into the spike is cancelled for the same reason.
 */
function blockBody(e, s, rad) {
  const band = spikeBand(e, s, rad);
  if (!band) return;
  const right = band.front === (s.dir > 0);
  e.x = right ? band.hi : band.lo - e.w;
  const into = right ? -1 : 1;
  if (e.def?.kind === 'ground' && Math.sign(e.vx) === into) e.vx = -e.vx;
  if (Math.sign(e.kbVx || 0) === into) e.kbVx = 0;
}

/**
 * Where a standing spike crosses an actor's box, or null if it does not.
 * Over the height of the box the spike covers a band of x from `lo` to `hi`;
 * `front` says whether the actor's middle is on the far side of the spike from
 * the player who raised it.
 */
function spikeBand(e, s, rad) {
  const sin = Math.sin(rad), tan = Math.tan(rad);
  const tipY = s.y - s.len * sin;
  const y0 = Math.max(e.y, tipY), y1 = Math.min(e.y + e.h, s.y);
  if (y0 > y1) return null;
  const lineX = (y) => s.x + (s.dir * (s.y - y)) / tan;
  const xa = lineX(y0), xb = lineX(y1);
  const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
  if (hi <= e.x || lo >= e.x + e.w) return null;
  const ym = Math.max(tipY, Math.min(s.y, e.y + e.h / 2));
  return { lo, hi, front: (e.x + e.w / 2 - lineX(ym)) * s.dir > 0 };
}

/**
 * Lv3+: a full charge puffs small dust clouds round the hammer head. The head
 * is the `chargeFull` clip's spawn point, so the puffs follow the drawing.
 */
function puffAround(ctx, p, n) {
  const g = gripOf(p);
  const sp = clipOf(HAMMER, 'chargeFull').spawns[0];
  const h = sp ? pointAt(sp, g.x, g.y, p.facing) : headAt(g.x, g.y, p.facing, HAMMER_SHAPE.overhead);
  const life = clipOf(PUFF, 'tell').total;
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    ctx.fx.dust.push({
      sheet: 'puff', clip: 'tell', x: h.x + Math.cos(ang) * 7, y: h.y + Math.sin(ang) * 6,
      vx: Math.cos(ang) * 0.25, vy: Math.sin(ang) * 0.2 - 0.12,
      t: 0, life, seed: Math.random(),
    });
  }
}

/**
 * THE AIR DIVE. A charge let go in the air drives the player straight down,
 * and the swing lands where he lands — already at its hit, so it connects on
 * the step he touches the ground and the rest of it plays out from there. A
 * full charge dropped from a jump still makes its spikes that way.
 *
 * A pit ends it: falling in one beams the player out, and a dive that carried
 * on through the beam would land a swing wherever he was set down.
 */
function stepDive(st, L, lv, ctx) {
  const d = st.diving, p = ctx.player;
  if (p.beam) { st.diving = null; return; }
  d.age++;
  if (!p.onGround) {
    p.vy = Math.min(FEEL.maxFallSpeed, p.vy + L.diveAccel);
    return;
  }
  if (d.age < 2) return;                     // let go on the step he took off
  st.diving = null;
  const a = swingAct(L, d.c, d.full);
  a.t = a.hit;
  st.act = a;
  settle(st, L, lv, ctx);
}

const quake = {
  chargeRelease: true,
  holdFrames: (lv) => ladderAt('quake_hammer', lv).holdFrames,
  /**
   * How far in front of his middle the swing reaches, off its hit area —
   * `npm run sim` stands inside it, so the simulator follows the art too.
   */
  reach() {
    const h = clipOf(HAMMER, 'swing').hits[0];
    return 5 + h.x + h.w;
  },

  init(st) {
    st.t = 0; st.act = null; st.queued = null; st.freeAt = -Infinity; st.diving = null;
    st.holdSeen = false; st.charging = false; st.chargeF = 0; st.full = false;
    st.down = false; st.jabPress = false; st.chain = null; st.linger = null; st.coolUntil = -Infinity;
  },

  step(st, lv, ctx) {
    const L = ladderAt('quake_hammer', lv);
    st.t++;
    // No hold arrived last step: the button went up some way that is not a
    // release (a beam, a pause, another weapon aimed). The charge is dropped,
    // and the next hold is a new press.
    if (!st.holdSeen) {
      st.charging = false; st.chargeF = 0; st.full = false;
      st.down = false; st.jabPress = false;
    }
    st.holdSeen = false;
    if (st.act) { st.act.t++; settle(st, L, lv, ctx); }
    if (st.diving) stepDive(st, L, lv, ctx);
    for (const d of ctx.fx.dust) cloudHit(d, ctx);
    stepSpikes(ctx);
    if (L.fullTell && st.charging && st.full && !st.act && st.t % 5 === 0) {
      puffAround(ctx, ctx.player, 2);
    }
    moveGrant(st, L, ctx);
  },

  hold(st, lv, ctx) {
    st.holdSeen = true;
    const L = ladderAt('quake_hammer', lv);
    if (!st.down) { st.down = true; press(st, L, lv, ctx); }
    // A press made while the hammer was busy only starts charging once it is
    // free, so time spent swinging never counts toward a charge.
    if (!st.act && !st.diving && !st.jabPress && st.t >= st.coolUntil) {
      if (!st.charging) { st.charging = true; st.chargeF = 0; st.full = false; }
      st.chargeF++;
      if (!st.full && st.chargeF >= L.holdFrames) {
        st.full = true;
        if (L.fullTell) {
          ctx.sfx('select', { pitch: 0.6 });
          puffAround(ctx, ctx.player, 8);
        }
      }
    }
    moveGrant(st, L, ctx);
  },

  fire(st, lv, ctx, held) {
    const L = ladderAt('quake_hammer', lv);
    if (!st.down) {
      // A release with no press seen: pressed and let go between two steps
      // (held 0) is a tap; anything longer was a hold already dropped.
      if (held > 0) return false;
      press(st, L, lv, ctx);
    }
    st.down = false;
    if (st.jabPress) {                       // that press was a jab: the release is nothing
      st.jabPress = false;
      moveGrant(st, L, ctx);
      return true;
    }
    if (st.diving) return true;              // committed: nothing starts mid-dive
    if (!st.charging) return false;          // pressed while busy, let go before it was free
    const c = chargeOf(st, L), full = st.full;
    st.charging = false; st.chargeF = 0; st.full = false;
    // Let go in the air: the air dive. The swing waits for the ground.
    if (L.airDive && !ctx.player.onGround) st.diving = { c, full, age: 0 };
    else st.act = swingAct(L, c, full);
    ctx.sfx('shootBig', { pitch: 0.7 });
    moveGrant(st, L, ctx);
    return true;
  },
};

// ── DRAKE BREATH — Dragon, offensive ─────────────────────────────────
/**
 * "Offensive; a dragon head cannon. ... use colors like indigo, violet and
 *  teal when the animation might otherwise resemble fire. Holding fire rears
 *  the dragon head cannon back for a short wind-up — you cannot move."
 *  Lv1  Bowser's neutral B on hold; the breath shrinks the longer it is held,
 *       then recovers.
 *  Lv3  a wide energy wave like Guile's Flash Kick on release — high and
 *       overhead, limited range.
 *  Lv6  Corrin's neutral B: also charges a medium blast that releases on
 *       release; the wave keeps its end point, the blast carries on.
 *  Lv10 the Gaster Blaster: a quick narrow beam telegraphing a massive laminar
 *       beam, as tall as the wave reaches, nearly full screen, 2 s, dissipating.
 *
 * Dragon is not Fire, so nothing here lays Hot or applies Burn.
 *
 * Everything the weapon puts in the world lives on its own state (`st.fx`),
 * drawn by drawWeaponry. Benching it mid-beam ends the beam; that is fine.
 */
const DRAKE = { core: 0xF2EEFF, violet: 0x8B5CF6, indigo: 0x3B2A8C, teal: 0x2DD4BF };

/** Where the breath leaves the cannon, and his middle. */
const drakeMouth = (p) => ({ x: p.x + 12 + 17 * p.facing, y: p.y + 12 });

function drakeHits(ctx, st, box, dmg, opts, set) {
  for (const e of enemiesIn(ctx, box)) {
    if (set.has(e)) continue;
    set.add(e);
    ctx.hitEnemy(e, dmg, opts);
  }
}

const drake = {
  chargeRelease: true,
  holdFrames: (lv) => {
    const L = ladderAt('drake_breath', lv);
    return L.beam?.charge ?? L.blast?.charge ?? L.windup;
  },
  reach: () => { const L = ladderAt('drake_breath', 1); return L.speed * L.life; },

  init(st, lv) {
    st.fuel = ladderAt('drake_breath', lv).fuel;
    st.down = false; st.holdSeen = false; st.heldF = 0; st.fx = [];
  },

  step(st, lv, ctx) {
    const L = ladderAt('drake_breath', lv), p = ctx.player;
    if (!st.holdSeen) { st.down = false; st.heldF = 0; }   // dropped, not released
    st.holdSeen = false;
    st.breathing = st.down && st.heldF > L.windup && st.fuel > 0;
    if (st.breathing) {
      st.fuel--;
      if (st.heldF % L.every === 0) {
        // A puff, diagonally down. Speed and life shrink with the fuel.
        const m = drakeMouth(p), k = drake.breathK(st, L), a = L.deg * Math.PI / 180;
        st.fx.push({
          kind: 'puff', x: m.x, y: m.y, dir: p.facing, t: 0, life: Math.round(L.life * k),
          vx: L.speed * k * Math.cos(a), vy: L.speed * k * Math.sin(a),
          ground: p.y + 24, r: L.r, roll: L.roll, dmg: L.breathDmg, set: new Set(),
        });
      }
    } else if (!st.down) st.fuel = Math.min(L.fuel, st.fuel + L.refill);
    if (st.down) {                                  // rooted while rearing back and breathing
      ctx.run.moveScale = 0;
      ctx.run.planted = true;
      p.jumpBuffer = 0;
    }
    for (const f of st.fx) drake.stepFx(f, lv, ctx);
    st.fx = st.fx.filter((f) => !f.done);
  },

  /** How strong the breath is now: 1 on a full tank, down to `minK` on empty. */
  breathK: (st, L) => L.minK + (1 - L.minK) * (st.fuel / L.fuel),

  stepFx(f, lv, ctx) {
    f.t++;
    const base = dmgOf('drake_breath', lv, ctx);
    if (f.kind === 'puff') {
      // Down the diagonal until it reaches the floor he stood on, then rolls
      // along it, slowing and spreading.
      f.x += f.vx * f.dir;
      if (f.y + f.r < f.ground) f.y = Math.min(f.ground - f.r, f.y + f.vy);
      else { f.vx *= f.roll; f.r = Math.min(f.r + 0.15, 8); f.y = f.ground - f.r; }
      drakeHits(ctx, null, { x: f.x - f.r, y: f.y - f.r, w: f.r * 2, h: f.r * 2 },
        base * words(f.dmg), { from: f.x - f.dir * 10 }, f.set);
      if (f.t >= f.life) f.done = true;
    } else if (f.kind === 'wave') {
      f.x += f.speed * f.dir;
      drakeHits(ctx, null, drake.waveBox(f), base * words(f.dmg),
        { knockback: f.knock * f.dir, from: f.x - f.dir * 10 }, f.set);
      if (Math.abs(f.x - f.x0) >= f.range) f.done = true;
    } else if (f.kind === 'blast') {
      f.x += f.speed * f.dir;
      drakeHits(ctx, null, { x: f.x - f.r, y: f.y - f.r, w: f.r * 2, h: f.r * 2 },
        base * words(f.dmg), { knockback: f.knock * f.dir, from: f.x - f.dir * 10 }, f.set);
      if (f.t >= f.life) f.done = true;
    } else if (f.kind === 'beam') {
      const live = f.t > f.tele && f.t <= f.tele + f.life;
      if (live && (f.t - f.tele) % f.tick === 1) {
        drakeHits(ctx, null, drake.beamBox(f), base * words(f.dmg), { from: f.x }, new Set());
      }
      // Enemy shots that touch the live beam are erased, DBZ-style: each
      // leaves a few streaks that blow away down the beam and fade.
      if (live) {
        const bx = drake.beamBox(f);
        for (const b of ctx.bullets) {
          if (!b.enemy || b.life <= 0) continue;
          if (b.x < bx.x || b.x > bx.x + bx.w || b.y < bx.y || b.y > bx.y + bx.h) continue;
          b.life = -1;
          for (let i = 0; i < 4; i++) {
            f.streaks.push({ x: b.x, y: b.y + (i - 1.5) * 2, len: 4 + i * 3, t: 0, life: 14 + i * 3 });
          }
        }
      }
      for (const k of f.streaks) { k.t++; k.x += f.dir * 2.5; }
      f.streaks = f.streaks.filter((k) => k.t < k.life);
      if (f.t > f.tele + f.life) f.done = true;
    }
  },

  /** The wave's box: a band its own height, a few px thick, at its front. */
  waveBox: (f) => ({ x: f.x - 4, y: f.top, w: 8, h: f.bot - f.top }),

  /** The beam's box this step, thinning away over its last `fade` steps. */
  beamBox(f) {
    const left = f.tele + f.life - f.t;
    const k = left < f.fade ? Math.max(0, left / f.fade) : 1;
    const h = (f.bot - f.top) * k, mid = (f.top + f.bot) / 2;
    return { x: f.dir > 0 ? f.x : f.x - f.len, y: mid - h / 2, w: f.len, h };
  },

  hold(st, lv, ctx) {
    st.holdSeen = true;
    if (!st.down) { st.down = true; st.heldF = 0; ctx.sfx('select', { pitch: 0.5 }); }
    st.heldF++;
    ctx.run.moveScale = 0; ctx.run.planted = true; ctx.player.jumpBuffer = 0;
    const L = ladderAt('drake_breath', lv);
    if (L.blast && st.heldF === L.blast.charge) ctx.sfx('select', { pitch: 0.8 });
    if (L.beam && st.heldF === L.beam.charge) ctx.sfx('select', { pitch: 1.1 });
  },

  fire(st, lv, ctx, held) {
    const L = ladderAt('drake_breath', lv), p = ctx.player;
    const heldF = st.down ? st.heldF : held;
    st.down = false; st.heldF = 0;
    if (!L.wave) return true;
    const m = drakeMouth(p), cy = p.y + 10, dir = p.facing;
    // The wave's height — and the beam's, which matches it.
    const top = p.y - L.wave.above, bot = p.y + 24 + L.wave.below;
    st.fx.push({ kind: 'wave', x: m.x, x0: m.x, dir, t: 0, top, bot, set: new Set(), ...L.wave });
    if (L.beam && heldF >= L.beam.charge) {
      st.fx.push({ kind: 'beam', x: m.x, y: cy, dir, t: 0, top, bot, streaks: [], ...L.beam });
      ctx.shake?.(2, 20);
      ctx.sfx('shootBig', { pitch: 0.5 });
    } else if (L.blast && heldF >= L.blast.charge) {
      st.fx.push({ kind: 'blast', x: m.x, y: cy, dir, t: 0, set: new Set(), ...L.blast });
      ctx.sfx('shootBig', { pitch: 0.8 });
    } else ctx.sfx('shoot', { pitch: 0.7 });
    return true;
  },
};

/**
 * DRAKE BREATH ON SCREEN. Every piece is one cell of its sheet
 * (`weapon:drake_breath:*`), and each sheet falls back to the plain shapes
 * below — which are also what its placeholder is painted from.
 *
 * Durations here are the LADDER'S (the wind-up, a puff's life, the beam's
 * telegraph and fade): a clip's frames are spread evenly over the time the
 * game gives, so the drawing never changes how long anything lasts.
 */
const D_HELD = 'weapon:drake_breath:held', D_PUFF = 'weapon:drake_breath:puff';
const D_WAVE = 'weapon:drake_breath:wave', D_BLAST = 'weapon:drake_breath:blast';
const D_BEAM = 'weapon:drake_breath:beam', D_STREAK = 'weapon:drake_breath:streak';
/** The beam is drawn as tiles this wide, from the mouth outward. */
export const BEAM_TILE = 32;

/** A clip's cell `frac` of the way through it (0..1), for frames spread over a set time. */
const cellByFrac = (c, frac) => cellAt(c, Math.min(c.total - 1, Math.floor(Math.max(0, frac) * c.total)));

/**
 * The dragon head cannon, held at its back end (x, y) — his hand.
 * `rear` 0..3 px back and up; `open` jaw dropped; `glow` 0 none, 1 violet
 * (the blast is ready), 2 white (the beam is ready); `blink` alternates it.
 */
export function drawDrakeHead(g, x, y, facing, { rear = 0, open = false, glow = 0, blink = 0 } = {}) {
  const f = facing, X = (dx, w) => (f > 0 ? x + dx - rear : x - dx - w + rear);
  const yy = y - rear;
  g.fillStyle(DRAKE.indigo, 1);
  g.fillRect(X(0, 12), yy - 3, 12, 4);                     // skull and snout
  g.fillRect(X(2, 4), yy - 5, 4, 2);                        // brow ridge / horn
  g.fillStyle(DRAKE.violet, 1);
  g.fillRect(X(1, 11), yy + (open ? 3 : 1), 11, 2);         // jaw
  g.fillStyle(DRAKE.teal, 1);
  g.fillRect(X(6, 2), yy - 2, 2, 1);                        // eye
  if (glow) {
    g.fillStyle(glow === 2 ? DRAKE.core : DRAKE.violet, 1);
    g.fillCircle(f > 0 ? x + 13 - rear : x - 13 + rear, yy + 1, blink ? 2 : 3);
  }
}

/** One breath puff, centre (x, y). `phase` 0 teal at the mouth, 1 violet, 2 indigo. */
export function drawDrakePuff(g, x, y, r, phase, a = 1) {
  g.fillStyle([DRAKE.teal, DRAKE.violet, DRAKE.indigo][phase], a);
  g.fillCircle(x, y, r);
  if (phase === 0) { g.fillStyle(DRAKE.core, a); g.fillCircle(x, y, Math.max(1, r * 0.4)); }
}

/** The Lv3 wave: a crescent `h` tall standing on (x, y), bowed forward. */
export function drawDrakeWave(g, x, y, dir, h, frame = 0, a = 1) {
  const half = h / 2, mid = y - half, bow = frame ? 5 : 6;
  const pt = (i) => { const v = i / 4 - 1; return [x - dir * bow * v * v, mid + v * half]; };
  for (const [w, c] of [[3, DRAKE.violet], [1, DRAKE.core]]) {
    g.lineStyle(w, c, a);
    for (let i = 0; i < 8; i++) { const [x0, y0] = pt(i), [x1, y1] = pt(i + 1); g.lineBetween(x0, y0, x1, y1); }
  }
}

/** The Lv6 blast, centre (x, y). */
export function drawDrakeBlast(g, x, y, r, frame = 0) {
  g.fillStyle(DRAKE.violet, 1);
  g.fillCircle(x, y, r + (frame ? 0 : 1));
  g.fillStyle(DRAKE.core, 1);
  g.fillCircle(x, y, Math.max(1, r - 3));
}

/**
 * One tile of the Lv10 beam, `w` long and `h` tall, standing on (x, y) and
 * running away from the mouth in `dir`. `part`: 'tele' the hairline,
 * 'start' the flared end at the mouth, 'body', or 'fade' (`k` 1..0, thinning).
 */
export function drawDrakeBeam(g, x, y, dir, w, h, part, frame = 0, k = 1) {
  const x0 = dir > 0 ? x : x - w, mid = y - h / 2;
  if (part === 'tele') {
    g.fillStyle(DRAKE.core, 1);
    g.fillRect(x0, Math.round(mid) - (frame ? 0 : 1), w, 1);
    return;
  }
  const hh = h * k, top = mid - hh / 2, pulse = frame ? 1 : 0;
  g.fillStyle(DRAKE.indigo, 1);
  g.fillRect(x0, top - pulse, w, hh + pulse * 2);
  g.fillStyle(DRAKE.teal, 1);
  g.fillRect(x0, top + 2, w, Math.max(1, hh - 4));
  g.fillStyle(DRAKE.core, 1);
  g.fillRect(x0, top + hh * 0.25, w, Math.max(1, hh * 0.5));
  if (part === 'start') {                                  // flare at the mouth
    g.fillStyle(DRAKE.core, 1);
    g.fillRect(dir > 0 ? x : x - 4, top - 2 - pulse, 4, hh + 4 + pulse * 2);
  }
}

/** One streak of an erased shot, `len` long from (x, y), blowing away in `dir`. */
export function drawDrakeStreak(g, x, y, dir, len, phase, a = 1) {
  g.fillStyle(phase ? DRAKE.indigo : DRAKE.violet, a);
  g.fillRect(dir > 0 ? x : x - len, y, len, 1);
}

/** Where his hand holds the cannon. */
const drakeHand = (p) => ({ x: p.x + 12 + 4 * p.facing, y: p.y + 11 });

/** Which held clip, and how far into it. */
function drakePose(st, L, frame) {
  if (st.down && st.heldF <= L.windup) return { clip: 'rear', frac: st.heldF / L.windup };
  if (st.breathing) return { clip: 'breathe', t: frame };
  if (st.down && L.beam && st.heldF >= L.beam.charge) return { clip: 'chargeFull', t: frame };
  if (st.down && L.blast && st.heldF >= L.blast.charge) return { clip: 'charge', t: frame };
  return { clip: 'rest', t: 0 };
}

function drawDrakeArt(layers, sx, sy, ctx) {
  const st = ctx.run.wstate.drake_breath;
  if (!st || !ctx.equipped.includes('drake_breath')) return;
  const p = ctx.player, L = ladderAt('drake_breath', ctx.levelOf('drake_breath')), fr = ctx.run.frame;
  const back = layers.effects;
  for (const e of st.fx) {
    if (e.kind === 'puff') {
      const frac = e.t / Math.max(1, e.life), phase = frac < 0.3 ? 0 : frac < 0.7 ? 1 : 2;
      const a = 1 - frac * 0.5;
      back.drawCell({ id: D_PUFF, x: sx(e.x), y: sy(e.y), facing: e.dir, alpha: a, cell: cellByFrac(clipOf(D_PUFF, 'burn'), frac) },
        (g) => drawDrakePuff(g, sx(e.x), sy(e.y), e.r, phase, a));
    } else if (e.kind === 'wave') {
      const a = 1 - Math.max(0, Math.abs(e.x - e.x0) / e.range - 0.7) / 0.3;
      back.drawCell({ id: D_WAVE, x: sx(e.x), y: sy(e.bot), facing: e.dir, alpha: a, cell: cellAt(clipOf(D_WAVE, 'travel'), e.t, true) },
        (g) => drawDrakeWave(g, sx(e.x), sy(e.bot), e.dir, e.bot - e.top, (e.t >> 2) & 1, a));
    } else if (e.kind === 'blast') {
      back.drawCell({ id: D_BLAST, x: sx(e.x), y: sy(e.y), facing: e.dir, cell: cellAt(clipOf(D_BLAST, 'fly'), e.t, true) },
        (g) => drawDrakeBlast(g, sx(e.x), sy(e.y), e.r, (e.t >> 2) & 1));
    } else if (e.kind === 'beam') {
      const left = e.tele + e.life - e.t, tele = e.t <= e.tele;
      const fading = !tele && left < e.fade, k = fading ? Math.max(0, left / e.fade) : 1;
      for (let i = 0; i * BEAM_TILE < e.len; i++) {
        const tx = e.x + e.dir * i * BEAM_TILE;
        const part = tele ? 'tele' : fading ? 'fade' : i === 0 ? 'start' : 'body';
        const c = clipOf(D_BEAM, part);
        const cell = part === 'fade' ? cellByFrac(c, 1 - k) : cellAt(c, e.t, true);
        back.drawCell({ id: D_BEAM, x: sx(tx), y: sy(e.bot), facing: e.dir, cell },
          (g) => drawDrakeBeam(g, sx(tx), sy(e.bot), e.dir, BEAM_TILE, e.bot - e.top, part, (e.t >> 1) & 1, k));
      }
      for (const q of e.streaks) {
        const frac = q.t / q.life;
        back.drawCell({ id: D_STREAK, x: sx(q.x), y: sy(q.y), facing: e.dir, alpha: 1 - frac, cell: cellByFrac(clipOf(D_STREAK, 'blow'), frac) },
          (g) => drawDrakeStreak(g, sx(q.x), sy(q.y), e.dir, q.len, frac < 0.3 ? 0 : 1, 1 - frac));
      }
    }
  }
  const hand = handOf(ctx, 'drake_breath', layers);
  if (!hand) return;
  const pose = drakePose(st, L, fr), c = clipOf(D_HELD, pose.clip), h = drakeHand(p);
  const cell = pose.frac !== undefined ? cellByFrac(c, pose.frac) : cellAt(c, pose.t, true);
  const opts = {
    rear: pose.clip === 'rear' ? Math.round(3 * pose.frac) : 0,
    open: pose.clip === 'breathe',
    glow: pose.clip === 'chargeFull' ? 2 : pose.clip === 'charge' ? 1 : 0,
    blink: (fr >> 2) & 1,
  };
  hand.layer.drawCell({ id: D_HELD, x: sx(h.x), y: sy(h.y), facing: p.facing, cell, tint: hand.tint },
    (g) => drawDrakeHead(g, sx(h.x), sy(h.y), p.facing, opts));
}

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
/** How many bugs one room may accumulate. See the `bugsPersist` note below. */
const SWARM_PERSIST_CAP = 12;

/**
 * HOW MANY TILES ONE EXTRA BUG COSTS — "every 10-2(bug swarm weapon level)th
 * ground cover fully receded by this bug causes an additional unlimited
 * duration bug to spawn (up to a max of 1 bug per 3 receded ground covers)".
 *
 * THE PARENTHETICAL IS WHAT STOPS THE FORMULA EATING ITSELF. 10-2L is 8 at
 * Lv1 and reaches 0 at Lv5, which would be a divide by zero and then a
 * negative price; the floor of 3 is the stated maximum rate and it binds from
 * Lv4 up. So the ladder is 8, 6, 4, then 3 forever — levelling the weapon buys
 * a faster-growing swarm and then stops, rather than an unbounded one.
 */
const bugPrice = (lv) => Math.max(3, 10 - 2 * lv);

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

    /**
     * A ROOM CAN ASK THE SWARM TO STAY, AND THORN MAN'S PAYS IT BY THE TILE.
     *
     * "The INITIAL bug ... has unlimited duration, and every 10-2(level)th
     * ground cover fully receded by this bug causes an additional unlimited
     * duration bug to spawn."
     *
     * THE POPULATION IS DERIVED, NOT TIMED. An earlier wording had new bugs
     * arriving "at their normal rate", so this spawned a group every
     * `recallFrames` while the player did nothing and a playtest read it as
     * bugs appearing without limit. What the room owes is now a pure function
     * of `arena.bugRecedes`, the count of tiles the swarm has actually put
     * down (`bossFights.js` keeps it) — so a swarm that is working grows, one
     * that is idle stays put, and there is no clock to drift.
     *
     * ONE AT A TIME, so a burst of recedes reads as the swarm building rather
     * than as a group teleporting in, and so the arrival keeps its sound.
     *
     * Capped anyway. Eight tiles cycling for five minutes is a few hundred
     * recedes, and "the room fills up" stops being a reward well before that.
     */
    const persist = !!ctx.arena?.bugsPersist;
    if (persist) {
      const earned = 1 + Math.floor((ctx.arena.bugRecedes || 0) / bugPrice(lv));
      const want = Math.min(earned, SWARM_PERSIST_CAP);
      if (mine.length < want && --st.cool <= 0) {
        st.cool = L.respawnFrames || 30;
        ctx.sfx('pickupExp', { pitch: 0.8 });
        ctx.allies.push(makeBug(lv, ctx, L, 'attack'));
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
    // A standing swarm does not tick down; it is replaced when it dies. Nor
    // does one in a room that has asked them to stay — see `bugsPersist`.
    life: (L.shield || ctx.arena?.bugsPersist) ? Infinity : L.lifeFrames,
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
    /**
     * A JOB FROM THE ROOM, which outranks the bug's own role.
     *
     * Thorn Man's ground cover sets it every frame: "bug swarm prioritizes
     * keeping all overgrowth recessed". The ARENA decides what the job is and
     * this only flies there, which is the right split — a weapon that knew
     * about greenhouse floors would be a weapon that had to learn every room.
     * Cleared here rather than by the setter, so a bug whose room stops asking
     * goes back to its role on the very next frame.
     */
    const job = a.job;
    a.job = null;
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
    /**
     * THE ROOM'S JOB OUTRANKS THE BUG'S OWN IDEA OF WHERE TO GO — but not a
     * kamikaze already committed, not an interceptor with a shot in front of
     * it, and not the regroup beat, because the first two are one-way trips
     * already under way and the third is a ladder rung of the weapon itself.
     *
     * IT USED TO BE A LAST RESORT AND THEREFORE NEVER RAN. The test was
     * `tx === undefined`, so the job was taken only when the bug had nothing
     * else to fly at — and inside a sealed boss room there is always a boss, so
     * `nearestEnemy` filled `tx` on every frame and the errand was dropped on
     * every frame. Thorn Man's whole "bug swarm prioritizes keeping all
     * overgrowth receded" clause had never once fired; the comment here already
     * claimed the behaviour the code did not have.
     *
     * Applied HERE rather than as an early return, so a bug on an errand still
     * moves with the same acceleration and still hurts whatever it flies into.
     * A second movement path would have been a second thing to tune.
     */
    const committed = a.role === 'kamikaze' || (a.role === 'block' && tx !== undefined);
    if (job && !committed && a.regroup <= 0) { tx = job.x; ty = job.y; }

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

// ── SIMON'S WHIP — Grass, offensive ────────────────────────────────────
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
 * fair — you commit to a spot for the length of the crack, so every use is a
 * read on what is about to be where you are. It roots the INPUT rather than
 * freezing the player, so gravity, knockback and a hit landing on you all still
 * behave; you are braced, not paused. A crack started in a SLIDE keeps sliding,
 * low, and stands up if the slide ends first (owner, 19 Oct 2026).
 *
 * THE CRACK IS PLAYED FROM ITS DRAWING (weapon-simons_whip-held.sprite): whip
 * behind him, swung overhead, cracked out. Its frame data says when each part
 * hurts and where — the overhead swing's area lightly, then the crack, whose
 * area is the TIP. The shaft runs from his hand to the tip and is worked out
 * here. How far the whip reaches is how far the drawing puts its tip.
 *
 * THE LV3 GRAPPLE IS THE SAME LASH WITH A DIFFERENT THING ON THE END. Enemy
 * first, terrain second, nothing third — one priority order, so the player
 * never has to choose a mode. A ledge lip pulls you up because you are on the
 * ground; a platform overhead swings you because you are not.
 */
const WHIP = 'weapon:simons_whip:held';
const WHIP_BODY = 'weapon:simons_whip:body';
const WHIP_LEN = { short: '', long: 'Long', longer: 'Longer' };

/** Which drawn crack plays: the rung's length, tilted up from Lv3, or low in a slide. */
function whipClip(L, low, up) {
  const n = WHIP_LEN[L.whip];
  if (low) return `slidingCrack${n}`;
  return up && n ? `crackUp${n}` : `crack${n}`;
}

/** His hand, the whip's pivot. In a slide his body is half as tall, so it is lower. */
const whipHand = (p, low) => ({ x: p.x + 12 + p.facing * 5, y: p.y + (low ? 18 : 12) });

const thorn = {
  init(st) { st.lash = null; st.tossed = []; },

  /** How far in front of his hand the tip reaches at this level, read off the drawing. */
  reach(lv) {
    const h = clipOf(WHIP, whipClip(ladderAt('simons_whip', lv), false, false)).hits[1];
    return h.x + h.w;
  },

  step(st, lv, ctx) {
    const L = ladderAt('simons_whip', lv);
    stepTossed(st, ctx);
    const la = st.lash;
    if (!la) return;

    const p = ctx.player;
    // "Stands up mid-crack": a slide that ends first leaves the rest standing.
    if (la.low && !p.sliding) { la.low = false; la.clip = whipClip(L, false, la.up); }
    const hand = whipHand(p, la.low);
    la.ox = hand.x; la.oy = hand.y;

    // REELING: whatever is on the end comes home, then resolves.
    if (la.grabbed) {
      const e = la.grabbed;
      if (e.hp <= 0) { st.lash = null; return; }
      const dx = la.ox - (e.x + e.w / 2), dy = la.oy - (e.y + e.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * L.reelSpeed;
      e.y += (dy / d) * L.reelSpeed;
      if (L.constrictFrames) {
        Attr.applyStatus(e.status, 'constrict', L.constrictFrames,
          { step: FEEL.stunEnemyStep });
      }
      // "Mild knockback" even at Lv1, where the reel is the whole move.
      if (L.reelKnock) e.kbVx = -Math.sign(dx || 1) * L.reelKnock;
      if (d < 18) {
        // From Lv3 the minion is thrown rather than simply arriving.
        if (L.toss) tossMinion(st, lv, ctx, L, e);
        st.lash = null;
      }
      return;
    }

    // SWINGING: the Lv3 airborne grapple carries the player forward instead.
    if (la.swing) {
      p.x += L.swingSpeed * p.facing;
      p.vy = Math.min(p.vy, 0.4);
      if (--la.swing <= 0) st.lash = null;
      return;
    }

    // THE CRACK, one step of its clip at a time.
    const c = clipOf(WHIP, la.clip);
    if (la.t >= c.total) { st.lash = null; return; }
    if (!la.low) ctx.run.rootFrames = Math.max(ctx.run.rootFrames, 1);
    const h = c.hits.find((x) => la.t >= x.step && la.t < x.step + x.len);
    la.t++;
    if (!h) return;
    const box = areaAt(h, hand.x, hand.y, p.facing);
    if (h === c.hits[0]) whipArc(la, lv, ctx, L, box);
    else thornProbe(st, lv, ctx, L, box);
  },

  fire(st, lv, ctx) {
    if (st.lash || st.cool > 0) return false;
    const L = ladderAt('simons_whip', lv);
    st.cool = L.cooldown;
    const p = ctx.player;
    ctx.sfx('shoot', { pitch: 0.7 });
    // "Affected by diagonal inputs" from Lv3. `diagInput` is the reserved
    // up-left / up-right hook; below Lv3 the crack is flat whatever is held.
    const up = !!L.diagonal && (p.diagInput === 'ul' || p.diagInput === 'ur');
    const low = !!p.sliding;
    const hand = whipHand(p, low);
    st.lash = {
      clip: whipClip(L, low, up), t: 0, low, up, ox: hand.x, oy: hand.y,
      tip: null, grabbed: null, swing: 0,
      // ONE CRACK PAYS A TARGET ONCE, whichever part of it lands first.
      hit: new Set(),
    };
    return true;
  },
};

/** The overhead swing before the crack: light damage to whatever is in its area. */
function whipArc(la, lv, ctx, L, box) {
  for (const o of enemiesIn(ctx, box)) {
    if (la.hit.has(o)) continue;
    la.hit.add(o);
    ctx.hitEnemy(o, dmgOf('simons_whip', lv, ctx) * L.arcDmgMult, { from: la.ox });
  }
}

/**
 * THE MINION IS THE PROJECTILE, and it survives the flight.
 *
 * "Tosses straight forward a moderate distance before being affected by gravity
 * and rolling to a stop. CHECK FOR LETHAL DAMAGE AFTER completing the toss and
 * the minion comes to rest."
 *
 * So the damage is not dealt on the grab — it is carried. The old Lv10 version
 * killed the minion outright and spawned a rock in its place, which meant the
 * toss could never fail to kill and the enemy was gone before it had flown
 * anywhere. Here it is the same body all the way through: still alive, still on
 * the field, and only resolved once it stops.
 *
 * THE FLIGHT DOES NOT DEPEND ON THE CONSTRICT, and it used to. Constrict was a
 * hold, so it pinned the minion for the duration; the tracker has since made it
 * a stacking slow like stun, and a slowed minion can still walk. What keeps the
 * body on its ram is `stepTossed` writing the position every frame, which was
 * always the mechanism — the hold was belt to its braces. The constrict stack
 * stays because the rung asks for it, and it now does what the other two slows
 * do: taxes the minion once it lands.
 *
 * The escort projectile is what other enemies feel: damage 0, very large
 * knockback, per "minion projectile does not deal damage but has very large
 * knockback". It carries the body along with it and hands the damage over when
 * it stops.
 */
function tossMinion(st, lv, ctx, L, e) {
  Attr.applyStatus(e.status, 'constrict', L.constrictFrames, { step: FEEL.stunEnemyStep });
  const p = ctx.player;
  const shot = {
    x: e.x + e.w / 2, y: e.y + e.h / 2,
    vx: L.tossSpeed * p.facing, vy: -0.6,
    radius: 4, damage: 0,
    color: '#2AAB1C', shape: 'rock', weapon: 'simons_whip',
    life: 120, pierce: 99, knockback: L.tossKnock,
    gravity: 0.22,
  };
  ctx.spawn(shot);
  // The live bullet is the last one in the list — the ram to follow.
  const live = ctx.bullets[ctx.bullets.length - 1];
  (st.tossed || (st.tossed = [])).push({
    e, ram: live, dmg: dmgOf('simons_whip', lv, ctx) * L.tossDmgMult,
  });
  ctx.sfx('shootBig', { pitch: 0.95 });
}

/**
 * Ride the body along with its ram. THE THROWN MINION IS HURT ONLY WHEN IT
 * STRIKES SOMETHING — another enemy, a wall, the floor or a platform — by the
 * owner's call of 17 Oct 2026. Sailing off into a pit costs it nothing. The
 * damage lands once, through the normal path so a kill still scores, drops
 * and counts toward the combo.
 */
function stepTossed(st, ctx) {
  if (!st.tossed?.length) return;
  st.tossed = st.tossed.filter((t) => {
    if (t.e.hp <= 0) return false;                  // died to something else
    const flying = t.ram.life > 0 && ctx.bullets.includes(t.ram);
    if (!flying) return false;
    const e = t.e;
    e.x = t.ram.x - e.w / 2;
    e.y = t.ram.y - e.h / 2;
    e.kbVx = 0;
    e.vy = 0;
    if (!t.paid && struck(e, ctx)) {
      t.paid = true;
      ctx.hitEnemy(e, t.dmg, { from: t.ram.x });
    }
    return true;
  });
}

/** Is this body touching another enemy, a wall, the floor or a platform? */
function struck(e, ctx) {
  const a = ctx.arena;
  const touches = (o) => o.x < e.x + e.w && o.x + o.w > e.x && o.y < e.y + e.h && o.y + o.h > e.y;
  if (ctx.enemies.some((o) => o !== e && o.hp > 0 && touches(o))) return true;
  if (a && (e.x <= a.x0 || e.x + e.w >= a.x1)) return true;
  const floor = a ? a.floorY : ctx.floorY;
  if (e.y + e.h >= floor && (a || ctx.overGround(e.x + e.w / 2))) return true;
  return (ctx.platforms || []).some((pl) => touches(pl));
}

/** The tip of the lash, and what it has found there. */
function thornProbe(st, lv, ctx, L, box) {
  const la = st.lash;
  const tip = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  la.tip = tip;

  /**
   * THE TIP FIRST, and it is a small box on purpose — "small hit box high
   * damage at the tip of the whip". The drawing's hit area IS the tip, so
   * landing it is a real aim rather than a consequence of pointing the right
   * way. It is also the only part that CATCHES: a grab is the tip closing on
   * something, and letting the shaft grab would make the aim worthless.
   *
   * A boss is never reeled — it is not moved by anything (see hitEnemy) — so it
   * takes the damage and the crack ends there.
   *
   * ONE CRACK PAYS A TARGET ONCE (the shared hit set), so the arc, the shaft
   * and the tip never stack on one minion.
   */
  const e = enemiesIn(ctx, box).find((o) => !la.hit.has(o));
  if (e) {
    la.hit.add(e);
    ctx.hitEnemy(e, dmgOf('simons_whip', lv, ctx) * L.dmgMult, { from: la.ox });
    if (e.isBoss) {
      // `step` is what makes constrict DO anything. applyStatus defaults it to
      // 1, and speedMult computes `1 ** stacks === 1` — so this one call site,
      // alone among every application in the codebase, tinted a boss green and
      // slowed it by exactly nothing. This is the branch that fires on a boss,
      // which is precisely where the rung says it should bite.
      if (L.constrictFrames) {
        Attr.applyStatus(e.status, 'constrict', L.constrictFrames, { step: FEEL.stunEnemyStep });
      }
      st.lash = null;
    } else {
      la.grabbed = e;
    }
    return;
  }

  /**
   * THE SHAFT SECOND — "medium damage anywhere else". Sampled along the vine
   * rather than as one long box, because a rotated AABB is not a thing this
   * physics has and five samples over 34px cannot miss a 16px minion. Each
   * enemy is paid once per crack: body contact does not end the lash, so
   * without the hit set the whole move would tick every frame it lay across
   * something and the tip bonus would be worth nothing.
   */
  if (L.bodyDmgMult) {
    const len = Math.hypot(tip.x - la.ox, tip.y - la.oy);
    const steps = Math.max(2, Math.round(len / 7));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const bx = la.ox + (tip.x - la.ox) * t, by = la.oy + (tip.y - la.oy) * t;
      for (const o of enemiesIn(ctx, { x: bx - 4, y: by - 4, w: 8, h: 8 })) {
        if (la.hit.has(o)) continue;
        la.hit.add(o);
        ctx.hitEnemy(o, dmgOf('simons_whip', lv, ctx) * L.bodyDmgMult, { from: la.ox });
      }
    }
  }

  if (!L.grapple) return;

  // TERRAIN SECOND, and only once cracked out — a grapple that fired early
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
    la.swing = L.swingFrames;
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

// ── GRANITE FORM — Rock, defensive ───────────────────────────────────
/**
 * "The player turns to stone — Kirby's Rock form. It is driven by the ABSENCE
 *  OF PLAYER INPUT, not by a lack of movement or momentum. 80% damage
 *  reduction and total knockback immunity while hardened. Spike immunity while
 *  in the rock form. Taking damage in this form causes small stones to spawn
 *  around the player that can be attacked by the player to launch them at foes.
 *  Despawn stones after 15s or after being launched at opponents. Anything the
 *  stone lands on gets heavy knockback and heavy damage."
 *
 * As reworked with the owner, 22 Oct 2026:
 *  - ON THE GROUND it hardens after `groundIdle` steps of no input (1.5 s).
 *  - IN THE AIR it hardens the first step nothing is pressed, and slams
 *    straight down. Nothing steers the slam. From Lv3, pressing a direction
 *    during it puffs it into the round boulder, which rolls that way on
 *    landing; at Lv1 a direction does nothing and the statue stays put.
 *  - The statue is one of three shapes, at random: "a rocky treasure chest,
 *    8bit megaman in shooting pose, a simple geometric monolith rectangle like
 *    from 2001". Once hardened it lasts until it wears off (`stoneFrames`
 *    after touching down); the player's own attacks still work.
 *  - EVERY CHANGE OF FORM is covered by a quickly fading puff. The armour
 *    starts on the first step; the picture changes `morphFrames` later.
 *  - STONES knocked loose by hits fall, bounce and roll to a stop like round
 *    pebbles. A shot (or a flying stone) striking one sends it away from the
 *    point it was struck, like a billiard ball: straight, with no gravity,
 *    bouncing off floors and walls and slowing, until it hits an enemy or
 *    stops. Lv10: a struck stone explodes on the enemy it hits.
 *
 * Its grants — `stoneArmor`, `moveScale`, `planted` — are per-step, like every
 * other weapon's, so benching it mid-form frees the player at once.
 * GameScene's hurt() raises `stoneHit` when a hit lands on the statue, and
 * publishes `inputActive` / `moveInput` (the direction held) every step.
 */
const STONE_SLOTS = [-10, 10, 0];
export const STATUE_SHAPES = ['chest', 'megaman', 'monolith'];
const STATUE = 'weapon:granite_form:statue';
const BOULDER = 'weapon:granite_form:boulder';
const STONE = 'weapon:granite_form:stone';
const ROCKY = 'weapon:granite_form:rocky';

function crush(st, L, lv, ctx, box, word) {
  for (const e of enemiesIn(ctx, box)) {
    if (st.crushed.has(e)) continue;
    st.crushed.add(e);
    ctx.hitEnemy(e, dmgOf('granite_form', lv, ctx) * DAMAGE_WORDS[word], {
      knockback: L.slamKnock, from: ctx.player.x + 12,
    });
  }
}

const boulderBox = (p, L) => ({ x: p.x + 12 - L.boulderSize / 2, y: p.y + 24 - L.boulderSize, w: L.boulderSize, h: L.boulderSize });

/** A puff big enough to hide him while the picture changes. */
const morphPuff = (ctx, L) => ctx.puff({ x: ctx.player.x + 12, y: ctx.player.y + 12, w: 34, life: L.morphFrames + 4, fade: 4, color: 0xC8C2B6, cloud: true });

/**
 * THE SPIN-UP (owner, 22 Oct 2026): the longer the boulder falls after the
 * direction is pressed, the further and faster it rolls. `spin` is TIME spent
 * falling, in steps, not height (owner, 24 Oct 2026: "Time spent falling"), so
 * the boulder's slow fall winds up a bigger roll from the same drop. Up to the
 * steps the statue's slam takes to fall a perfect jump + midair jump the roll
 * grows evenly from `rollMin` to `rollRef` pixels; past it, by the square root, so
 * a longer fall still adds but less and less. Speed and length both scale
 * by the square root of the distance against the plain roll (`rollSpeed`
 * slowing to a stop over `rollFrames`), so a big roll is both quicker and
 * longer.
 */
export function spinUp(spin, dir, L) {
  // Steps it takes the statue's slam to fall the height of a full jump plus a
  // full midair jump: about 13 with the NES numbers.
  const peak = FEEL.jumpVelocity ** 2 / (2 * FEEL.gravity) * (1 + FEEL.doubleJumpHeightMult);
  const H = peak / FEEL.maxFallSpeed;
  const eff = spin <= H ? spin : H * Math.sqrt(spin / H);
  const d = L.rollMin + (L.rollRef - L.rollMin) * (eff / H);
  const k = Math.sqrt(d / (L.rollSpeed * L.rollFrames / 2));
  const T = Math.max(1, Math.round(L.rollFrames * k));
  return { v: dir * L.rollSpeed * k, t: T, T, d };
}

function stepRoll(st, L, lv, ctx) {
  const p = ctx.player, rl = st.roll;
  const v = rl.v * (rl.t / rl.T);
  // The boulder's picture turns at the speed it is rolling.
  st.spinT += Math.abs(v) / L.rollSpeed;
  rl.t--;
  const nx = p.x + v;
  // Stop, and drop the form, at the lip — the same probe the Strike lunge uses.
  if (!ctx.overGround(nx + (v > 0 ? 20 : 4))) { st.mode = null; return; }
  // A wall, an arena edge or a raised block ends the roll; the boulder stays.
  const box = { x: nx + 4, y: p.y, w: 16, h: 23 };
  const a = ctx.arena;
  if ((a && (box.x < a.x0 || box.x + box.w > a.x1))
    || (ctx.platforms || []).some((s) => box.x < s.x + s.w && box.x + box.w > s.x && box.y < s.y + s.h && box.y + box.h > s.y)) {
    rl.t = 0;
  } else p.x = nx;
  crush(st, L, lv, ctx, boulderBox(p, L), L.slamDmg);
  if (rl.t <= 0) st.mode = 'stone';
}

/** Send a stone away from the point (hx, hy) that struck it. */
function launchStone(s, L, hx, hy) {
  const r = L.stoneSize / 2, dx = s.x + r - hx, dy = s.y + r - hy, d = Math.hypot(dx, dy) || 1;
  s.flying = true; s.bounces = 0; s.life = 240;
  s.vx = (dx / d) * L.stoneSpeed; s.vy = (dy / d) * L.stoneSpeed;
}

/** Where a stone at x could rest: the floor if there is ground there, or a platform top it passed. */
function floorUnder(ctx, x, y0, y1) {
  for (const pl of ctx.platforms || []) {
    if (x >= pl.x && x <= pl.x + pl.w && y0 <= pl.y && y1 >= pl.y) return pl.y;
  }
  return ctx.overGround(x) ? ctx.floorY : Infinity;
}

function blast(s, L, lv, ctx) {
  const cx = s.x + L.stoneSize / 2, cy = s.y + L.stoneSize / 2, R = L.blastR;
  for (const e of enemiesIn(ctx, { x: cx - R, y: cy - R, w: R * 2, h: R * 2 })) {
    ctx.hitEnemy(e, dmgOf('granite_form', lv, ctx) * DAMAGE_WORDS[L.blastDmg], { knockback: L.slamKnock, from: cx });
  }
  ctx.puff({ x: cx, y: cy, w: R * 2, life: 12, color: 0xFFC860, cloud: true });
  ctx.shake(2, 6);
  ctx.sfx('shootBig', { pitch: 0.6 });
}

function stepStones(st, L, lv, ctx) {
  const n = L.stoneSize, a = ctx.arena;
  for (const s of st.stones) {
    s.life--;
    if (!s.flying) {
      // Loose: normal gravity, a small bounce, then rolling to a stop.
      s.vy = Math.min(FEEL.maxFallSpeed, s.vy + FEEL.gravity);
      const y1 = s.y + s.vy, fl = floorUnder(ctx, s.x + n / 2, s.y + n, y1 + n);
      s.x += s.vx;
      if (y1 + n >= fl) {
        s.y = fl - n;
        s.vy = s.vy > 1 ? -s.vy * L.stoneBounce : 0;
        s.vx *= L.stoneRoll;
        if (Math.abs(s.vx) < 0.05) s.vx = 0;
      } else s.y = y1;
      if (s.y > ctx.floorY + 80) s.life = 0;
      // Struck by one of his shots: off it goes, away from where it was hit.
      const b = ctx.bullets.find((q) => !q.enemy && q.life > 0
        && q.x + (q.radius || 2) > s.x && q.x - (q.radius || 2) < s.x + n
        && q.y + (q.radius || 2) > s.y && q.y - (q.radius || 2) < s.y + n);
      if (b) { b.life = -1; launchStone(s, L, b.x - (b.vx || 0), b.y - (b.vy || 0)); ctx.sfx('shoot', { pitch: 0.7 }); }
      continue;
    }
    // Flying: straight lines, no gravity, bouncing off floors, walls and the
    // ceiling and losing speed each time.
    s.x += s.vx; s.y += s.vy;
    const fl = floorUnder(ctx, s.x + n / 2, s.y + n - s.vy, s.y + n);
    let bounced = false;
    if (s.y + n >= fl && s.vy > 0) { s.y = fl - n; s.vy = -s.vy; bounced = true; }
    if (a && s.x < a.x0) { s.x = a.x0; s.vx = Math.abs(s.vx); bounced = true; }
    if (a && s.x + n > a.x1) { s.x = a.x1 - n; s.vx = -Math.abs(s.vx); bounced = true; }
    if (s.y < (a ? a.ceilY : -40) && s.vy < 0) { s.vy = -s.vy; bounced = true; }
    if (bounced) {
      s.vx *= L.stoneBounce * 1.6; s.vy *= L.stoneBounce * 1.6;
      if (++s.bounces > 4 || Math.hypot(s.vx, s.vy) < 0.8) s.life = 0;
    }
    if (s.y > ctx.floorY + 80) s.life = 0;
    // Billiards: a flying stone sets a loose one going.
    for (const o of st.stones) {
      if (o === s || o.flying || o.life <= 0) continue;
      if (Math.abs(o.x - s.x) < n && Math.abs(o.y - s.y) < n) launchStone(o, L, s.x + n / 2, s.y + n / 2);
    }
    const hit = enemiesIn(ctx, { x: s.x, y: s.y, w: n, h: n })[0];
    if (hit && s.life > 0) {
      ctx.hitEnemy(hit, dmgOf('granite_form', lv, ctx) * DAMAGE_WORDS[L.stoneDmg], { knockback: L.slamKnock, from: s.x + n / 2 });
      if (L.stoneExplode) blast(s, L, lv, ctx);
      s.life = 0;
    }
  }
  st.stones = st.stones.filter((s) => s.life > 0);
}

const granite = {
  init(st) {
    st.mode = null; st.idle = 0; st.t = 0; st.stones = []; st.crushed = new Set(); st.roll = null;
    st.shape = STATUE_SHAPES[0]; st.boulder = false; st.dir = 1;
    st.pic = null; st.want = null; st.picT = 0;
  },

  step(st, lv, ctx) {
    const L = ladderAt('granite_form', lv), p = ctx.player, r = ctx.run;
    stepStones(st, L, lv, ctx);
    granite.picture(st, L, ctx);
    if (p.beam) { st.mode = null; st.idle = 0; return; }

    if (!st.mode) {
      st.idle = r.inputActive ? 0 : st.idle + 1;
      if (!st.idle || (p.onGround && st.idle < L.groundIdle)) return;
      st.idle = 0;
      st.crushed = new Set();
      st.mode = p.onGround ? 'stone' : 'slam';
      st.t = L.stoneFrames;
      st.shape = STATUE_SHAPES[Math.floor(Math.random() * STATUE_SHAPES.length)];
      st.boulder = false;
      ctx.sfx('select', { pitch: 0.5 });
      granite.picture(st, L, ctx);
    }

    if (r.stoneHit) {
      r.stoneHit = false;
      if (st.stones.length < L.stoneMax) {
        const ox = STONE_SLOTS[st.stones.length];
        st.stones.push({
          x: p.x + 12 - L.stoneSize / 2 + ox, y: p.y + 2, vx: Math.sign(ox) * 0.6, vy: -2,
          life: L.stoneLife, flying: false,
        });
      }
    }

    // JUMP BREAKS THE FORM from Lv6 (owner, 24 Oct 2026); the jump itself
    // goes ahead in the same press. At Lv10 the stone flies apart as it
    // breaks: shards all the way round, the shape of Frost Guard's Lv10.
    if (r.jumpBreak) {
      r.jumpBreak = false;
      if (L.shards) {
        for (let i = 0; i < L.shards; i++) {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / L.shards;
          ctx.spawn({
            x: p.x + 12, y: p.y + 12, vx: Math.cos(a) * L.shardSpeed, vy: Math.sin(a) * L.shardSpeed,
            radius: 3, damage: dmgOf('granite_form', lv, ctx) * DAMAGE_WORDS[L.shardDmg],
            color: '#A8A296', shape: 'rock', weapon: 'granite_form', stone: true, life: 40,
          });
        }
        ctx.sfx('shootBig', { pitch: 0.7 });
      }
      st.mode = null; st.idle = 0;
      granite.picture(st, L, ctx);
      return;
    }

    // The stats are his from the first step; only the picture waits.
    r.stoneArmor = L.armor;
    r.planted = true;
    r.moveScale = 0;
    if (L.jumpCancel) r.jumpBreaks = true;
    if (st.mode === 'slam') {
      if (L.roll && !st.boulder && r.moveInput) {
        st.boulder = true; st.dir = Math.sign(r.moveInput); st.spin = 0; st.spinT = 0;
        granite.picture(st, L, ctx);
      } else if (st.boulder && !p.onGround) st.spin++;
      // THE WINDING-UP BOULDER FALLS SLOWLY, like Rollout charging in the air
      // (owner, bug of build 1195): its own fall cap, never the world's gravity.
      // The statue's slam still drops at full speed.
      if (st.boulder) { r.glideFall = L.boulderFall; p.vy = Math.min(p.vy, L.boulderFall); }
      else p.vy = Math.max(p.vy, FEEL.maxFallSpeed);
      // THE SPIN-UP SHOWS IN THE AIR: the boulder turns at the speed it would
      // roll if it landed now, so a long fall visibly winds it up.
      if (st.boulder) st.spinT += Math.abs(spinUp(st.spin, 1, L).v) / L.rollSpeed;
      crush(st, L, lv, ctx, { x: p.x + 4, y: p.y, w: 16, h: 26 }, L.slamDmg);
      if (!p.onGround) return;
      ctx.shake(2, 8);
      ctx.puff({ x: p.x + 12, y: p.y + 24, w: 30, life: 12, color: 0xA8A296 });
      st.mode = st.boulder ? 'roll' : 'stone';
      if (st.boulder) { st.roll = spinUp(st.spin, st.dir, L); p.facing = st.dir; }
      st.t = L.stoneFrames;
      return;
    }
    if (st.mode === 'roll') stepRoll(st, L, lv, ctx);
    // LV10: A DIRECTION WAKES THE STATUE UP AS ROCKY, who walks at
    // `walkScale` and stays Rocky until a jump breaks the form or it wears off.
    if (L.walk && st.mode === 'stone' && r.moveInput) { st.mode = 'walk'; granite.picture(st, L, ctx); }
    if (st.mode === 'walk') r.moveScale = L.walkScale;
    if (--st.t <= 0) st.mode = null;
    if (!st.mode) granite.picture(st, L, ctx);
  },

  /**
   * THE PICTURE LAGS THE FORM BY `morphFrames`, under a puff. `want` is the
   * form the state says; `pic` is what is drawn, and it catches up when the
   * countdown runs out.
   */
  picture(st, L, ctx) {
    const want = !st.mode ? null : st.mode === 'walk' ? 'rocky'
      : (st.mode === 'roll' || st.boulder) ? 'boulder' : 'statue';
    if (want !== st.want) {
      st.want = want; st.picT = L.morphFrames; morphPuff(ctx, L);
      st.cloud = ctx.fx.puffs[ctx.fx.puffs.length - 1];
    } else if (st.picT > 0 && --st.picT === 0) st.pic = st.want;
    // The puff goes where he goes until the picture has changed, so a jump
    // out of the form cannot leave the old picture showing above it.
    if (st.picT > 0 && st.cloud) { st.cloud.x = ctx.player.x + 12; st.cloud.y = ctx.player.y + 12; }
  },
};

// ── ASTRAL CLOAK — Dark, defensive ───────────────────────────────────
/**
 * "Reduces aggro and become immune to status effects."
 *  Lv1  "while active enemies will fire projectiles slightly less frequently
 *        and when pursuing the player will pause very briefly at random times."
 *  Lv3  "slight increase in pause duration and frequency."
 *  Lv6  "creates shadow trails that damage enemies and lifesteal."
 *
 * Lv10's "Dark Mode" is still `[wip]`, so the ladder stops at Lv6.
 *
 * THE WEAPON WAS AN OFFENSIVE BOOMERANG CALLED THE ASTRAL CLOAK. The tracker
 * field now describes a defensive cloak, and the field wins, so it is a cloak
 * and it is named like one. Only the ID is unchanged — `astral_cloak` is the
 * join key for the boss drop and for every save's unlock set, and a rename must
 * never cost anyone their save.
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
    const L = ladderAt('astral_cloak', lv);
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
      owner: 'astral_cloak', role: 'trail',
      x: p.x + 12, y: p.y + 12, w: 6, h: 6, vx: 0, vy: 0,
      life: L.trailLife, maxLife: L.trailLife,
      damage: dmgOf('astral_cloak', lv, ctx) * L.trailDmgMult,
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
  nullfire_drone: drone,
  blaze_wheel: blaze,
  torrent_cannon: torrent,
  volt_spark: volt,
  frost_guard: frost,
  strike_gauntlet: strike,
  quake_hammer: quake,
  swarm_caller: swarm,
  simons_whip: thorn,
  gale_vortex: gale,
  granite_form: granite,
  astral_cloak: eclipse,
  alloy_blade: alloy,
  drake_breath: drake,
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

/**
 * Tell a charge-and-release weapon the fire button is still down this step.
 * `held` counts steps since the press. The release itself arrives through
 * `fireActive`, exactly like any other press.
 */
export function holdActive(ctx, id, held) {
  const beh = RUNTIME[id];
  if (!beh?.hold) return;
  const lv = ctx.levelOf(id);
  beh.hold(stateFor(ctx.run.wstate, id, lv, ctx), lv, ctx, held);
}

/** Tick down the per-weapon cooldowns the fire path uses. */
/**
 * ONE TICK PER FRAME, AND IT HAPPENS HERE.
 *
 * `st.cool` belongs to this function. A runtime READS it — `if (st.cool > 0)
 * return` — and sets it when it fires; a runtime that decrements it too burns
 * its cooldown at two frames per frame and fires at double its stated rate.
 * The Nullfire Drone did exactly that, invisibly, until a rung asked for one
 * shot every three seconds and delivered one every one and a half.
 */
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
export const makeFx = () => ({ puffs: [], arcs: [], dust: [], spikes: [], sand: [] });

/** A fading rectangle of light where a hitbox was. `life` doubles as its fade. */
/**
 * A PUFF MAY NAME A WEAPON, and that is how a hitscan weapon gets a sprite.
 *
 * Most weapons throw a bullet, and a bullet already goes through `ActorLayer`
 * — so the moment its `.sprite` has a shippable frame the art replaces the
 * geometry with no edit anywhere. A HITSCAN weapon has no bullet to draw: the
 * Volt Spark is an instant hitbox and a fading rectangle, so its six drawn
 * frames built, loaded, and had nothing to attach to.
 *
 * Naming the weapon on the puff gives it that attachment. `GameScene.draw`
 * routes a named puff through the same layer a bullet uses, with the rectangle
 * below as the fallback — geometry until the art exists, art from then on.
 */
export const puff = (fx, spec) => fx.puffs.push({ ...spec, max: spec.life });

/** The visible link between two enemies a chain jumped across. */
export function arcFx(fx, a, b) {
  const ca = centreOf(a), cb = centreOf(b);
  fx.arcs.push({ x0: ca.x, y0: ca.y, x1: cb.x, y1: cb.y, life: 8, max: 8 });
}

export function stepFx(fx) {
  for (let i = fx.puffs.length - 1; i >= 0; i--) if (--fx.puffs[i].life <= 0) fx.puffs.splice(i, 1);
  for (let i = fx.arcs.length - 1; i >= 0; i--) if (--fx.arcs[i].life <= 0) fx.arcs.splice(i, 1);
  stepQuakeFx(fx);
}

/**
 * The Quake Hammer's dust, spikes and sand.
 *
 * A spike lives for its growth plus half a second standing, then becomes a
 * line of sand grains. They fall freely and lie where they land, and each one
 * vanishes at its own random moment between 0.1 and 3 seconds: the cheapest
 * fade there is, because a grain already counts its own life down and simply
 * stops being drawn — no see-through drawing, nothing shared to work out.
 */
function stepQuakeFx(fx) {
  for (let i = fx.dust.length - 1; i >= 0; i--) {
    const d = fx.dust[i];
    if (d.vx) d.x += d.vx;
    if (d.vy) d.y += d.vy;
    if (++d.t >= d.life) fx.dust.splice(i, 1);
  }
  for (let i = fx.spikes.length - 1; i >= 0; i--) {
    const s = fx.spikes[i];
    if (++s.t < s.grow + s.stand) continue;
    fx.spikes.splice(i, 1);
    crumble(fx, s);
  }
  for (let i = fx.sand.length - 1; i >= 0; i--) {
    const g = fx.sand[i];
    if (--g.life <= 0) { fx.sand.splice(i, 1); continue; }
    if (g.y < g.gy) {
      g.vy = Math.min(3, g.vy + 0.15);
      g.x += g.vx;
      g.y = Math.min(g.gy, g.y + g.vy);
    }
  }
  if (fx.sand.length > 400) fx.sand.splice(0, fx.sand.length - 400);
}

function crumble(fx, s) {
  const rad = (s.deg * Math.PI) / 180;
  const gy = s.y - 1;                       // where a grain comes to rest
  for (let d = 2; d <= s.len; d += 3) {
    fx.sand.push({
      x: s.x + Math.cos(rad) * s.dir * d + (Math.random() - 0.5) * 2,
      // A grain from the very foot of a spike starts ON the floor, not in it.
      y: Math.min(gy, s.y - Math.sin(rad) * d),
      vx: (Math.random() - 0.5) * 0.4, vy: 0, gy,
      life: s.sandMin + Math.floor(Math.random() * (s.sandMax - s.sandMin + 1)),
      shade: Math.random() < 0.5 ? 0 : 1,
    });
  }
}

/**
 * Draw everything a weapon puts on screen that is not a projectile: the worn
 * hardware, the allies it summoned, and the hit feedback.
 *
 * `sx` maps world x to shaken screen x, exactly as GameScene.draw uses it, so
 * every one of these tracks the screen shake with the world it belongs to.
 */
/**
 * One puff's geometry — the placeholder a hitscan weapon draws until its sprite
 * lands. Exported so `GameScene` can hand it to `ActorLayer.draw` as the
 * fallback, which is what makes the swap automatic rather than conditional.
 */
export function drawPuff(g, q, cx) {
  const t = q.life / q.max;
  // A cloud: solid until its last `fade` steps, so what changes behind it is
  // hidden, then gone fast.
  if (q.cloud) {
    g.fillStyle(q.color, Math.min(1, q.life / (q.fade || 4)));
    const r = q.w / 3;
    g.fillCircle(cx - r * 0.6, q.y + r * 0.2, r); g.fillCircle(cx + r * 0.6, q.y + r * 0.2, r);
    g.fillCircle(cx, q.y - r * 0.5, r);
    return;
  }
  g.fillStyle(q.color, 0.55 * t);
  const h = 4 + 10 * (1 - t);
  g.fillRect(cx - q.w / 2, q.y - h / 2, q.w, h);
}

// ── QUAKE HAMMER on screen ────────────────────────────────────────────

/**
 * THE QUAKE HAMMER ON SCREEN: the hammer in his hand on the `held` layer, in
 * front of him, and the dust, spikes and sand on the `effects` layer, behind
 * him (the player is never hidden).
 *
 * Every one of them is ONE CELL OF ITS SHEET, picked by frame data — the clip
 * it is in and how many steps into it — so a picture changes on exactly the
 * step the game says it does, and a hit lands on the frame drawn for it.
 * `ActorLayer.drawCell` falls back to the plain shapes below when a sheet has
 * nothing drawn: one rule, and nothing here asks which case it is in.
 *
 * There is deliberately no charge bar: by the owner's call the tell is the
 * hammer held overhead, and from Lv3 the dust that puffs round its head once
 * the charge is full.
 */
export function drawWeaponArt(layers, sx, sy, ctx) {
  const { run, player: p, fx } = ctx;
  drawDrakeArt(layers, sx, sy, ctx);
  const back = layers.effects;
  const gr = ctx.equipped.includes('granite_form') && run.wstate.granite_form;
  const sn = gr ? ladderAt('granite_form', ctx.levelOf('granite_form')).stoneSize : 0;
  for (const s of gr ? gr.stones : []) {
    back.drawCell(
      { id: STONE, x: sx(s.x + sn / 2), y: sy(s.y + sn), facing: 1, cell: cellAt(clipOf(STONE, 'loose'), 0) },
      (g) => drawStoneShape(g, sx(s.x + sn / 2), sy(s.y + sn)),
    );
  }
  for (const s of fx.sand) {
    back.drawCell(
      { id: SAND, x: sx(s.x), y: sy(s.y), facing: 1, cell: cellAt(clipOf(SAND, s.shade ? 'dark' : 'light'), 0) },
      (g) => drawSandShape(g, sx(s.x), sy(s.y), s.shade),
    );
  }
  for (const s of fx.spikes) {
    back.drawCell(
      { id: SPIKE, x: sx(s.x), y: sy(s.y), facing: s.dir, cell: cellAt(clipOf(SPIKE, s.clip), s.t) },
      (g) => drawSpikeShape(g, sx(s.x), sy(s.y), s.dir, s.deg, s.len, Math.min(1, (s.t + 1) / s.grow),
        // The last few steps before it crumbles, it flickers pale.
        s.t >= s.grow + s.stand - 6 && s.t % 2 === 0),
    );
  }
  for (const d of fx.dust) {
    const key = d.sheet === 'puff' ? PUFF : DUST, c = clipOf(key, d.clip);
    const r = d.sheet === 'puff' ? 3 : c.hits[0].w / 2;
    back.drawCell(
      { id: key, x: sx(d.x), y: sy(d.y), facing: d.dir || 1, cell: cellAt(c, d.t) },
      (g) => drawDustShape(g, sx(d.x), sy(d.y), r, d.t / d.life, d.seed, d.sheet === 'puff'),
    );
  }

  // THE TWO HELD WEAPONS, each in its hand (`handOf`): mid-move, the frame its
  // step says; otherwise its rest pose, hanging at his side.
  const rest = whipHand(p, p.sliding);
  const wh = handOf(ctx, 'simons_whip', layers);
  if (wh) {
    const wl = run.wstate.simons_whip?.lash;
    if (wl && !wl.grabbed && !wl.swing) {
      const c = clipOf(WHIP, wl.clip), t = Math.max(0, wl.t - 1), f = frameAt(c, t);
      wh.layer.drawCell(
        { id: WHIP, x: sx(wl.ox), y: sy(wl.oy), facing: p.facing, cell: cellAt(c, t), tint: wh.tint },
        (g) => drawWhipShape(g, sx(wl.ox), sy(wl.oy), p.facing, whipPoints(wl.clip, f), f === c.hits[1].frame),
      );
    } else if (!wl) {
      wh.layer.drawCell(
        { id: WHIP, x: sx(rest.x), y: sy(rest.y), facing: p.facing, cell: cellAt(clipOf(WHIP, 'rest'), 0), tint: wh.tint },
        (g) => drawWhipShape(g, sx(rest.x), sy(rest.y), p.facing, WHIP_SHAPE.rest, false),
      );
    }
  }

  const hh = handOf(ctx, 'quake_hammer', layers);
  const st = run.wstate.quake_hammer;
  if (!hh || !st) return;
  const pose = quakePose(st, ladderAt('quake_hammer', ctx.levelOf('quake_hammer')));
  if (!pose || (pose.total !== undefined && pose.t >= pose.total)) {
    hh.layer.drawCell(
      { id: HAMMER, x: sx(rest.x), y: sy(rest.y), facing: p.facing, cell: cellAt(clipOf(HAMMER, 'rest'), 0), tint: hh.tint },
      (gr) => drawHammerShape(gr, sx(rest.x), sy(rest.y), p.facing, HAMMER_SHAPE.rest),
    );
    return;
  }
  const g = gripOf(p);
  hh.layer.drawCell(
    { id: HAMMER, x: sx(g.x), y: sy(g.y), facing: p.facing, cell: cellAt(clipOf(HAMMER, pose.clip), pose.t, pose.loop), tint: hh.tint },
    (gr) => drawHammerShape(gr, sx(g.x), sy(g.y), p.facing, pose.deg),
  );

}

/**
 * WHICH HAND, AND SO WHICH LAYER. Offensive slot 1 is his right hand, slot 2
 * his left (owner, 19 Oct 2026); only a LIVE weapon is in a hand at all.
 *
 * HIS HANDS STAY HIS OWN AS HE TURNS (owner's pick of two trial builds, 21 Oct
 * 2026: "slot1-right-hand"). Facing right, his right hand is the one nearer the
 * screen, drawn over his body; facing left, his left hand is. The far hand is
 * drawn behind him, a quarter darker, even while it attacks.
 */
export function handOf(c, id, layers) {
  const lo = c.run.loadout;
  if (!c.equipped.includes(id)) return null;
  const i = lo ? lo.offensive.indexOf(id) : 0;
  if (i < 0 || i > 1 || lo?.disabled?.has(id)) return null;
  const front = (i === 0) === (c.player.facing > 0);
  return front ? { layer: layers.held } : { layer: layers.heldBack ?? layers.held, tint: BACK_SHADE };
}

/** The whip's crack while it is being cracked — not reeling or swinging — or null. */
function whipCracking(ctx) {
  const la = ctx.run.wstate.simons_whip?.lash;
  return la && !la.grabbed && !la.swing && ctx.equipped.includes('simons_whip') ? la : null;
}

/**
 * HIS BODY WHILE A WEAPON WITH A BODY SHEET IS MID-MOVE, or null for his own
 * picture. Drawn IN PLACE of him, on his layer, held by the same hand and
 * clock as the weapon so hand and handle line up (Simon's Whip so far).
 */
export function bodyArt(ctx) {
  // THE GRANITE FORM takes his place while it holds: a statue, or the boulder.
  // Held by his feet, the middle of the floor under him.
  const gr = ctx.equipped.includes('granite_form') && ctx.run.wstate.granite_form;
  if (gr?.pic) {
    const p = ctx.player;
    if (gr.pic === 'rocky') {
      const moving = Math.abs(p.vx) > 0.05, t = moving ? ctx.run.frame : 0, form = moving ? 'walk' : 'stand';
      return {
        id: ROCKY, x: p.x + 12, y: p.y + 24, facing: p.facing,
        cell: cellAt(clipOf(ROCKY, form), t, moving),
        shape: (g, x, y) => drawRockyShape(g, x, y, p.facing, t),
      };
    }
    const rolling = gr.pic === 'boulder';
    const t = rolling ? gr.spinT || 0 : 0;
    const form = rolling ? 'roll' : gr.shape;
    return {
      id: rolling ? BOULDER : STATUE, x: p.x + 12, y: p.y + 24, facing: p.facing,
      cell: cellAt(clipOf(rolling ? BOULDER : STATUE, form), t, rolling),
      shape: (g, x, y) => drawGraniteShape(g, x, y, p.facing, form, t),
    };
  }
  const la = whipCracking(ctx);
  if (!la) return null;
  return {
    id: WHIP_BODY, x: la.ox, y: la.oy, facing: ctx.player.facing,
    cell: cellAt(clipOf(WHIP_BODY, la.clip), Math.max(0, la.t - 1)),
  };
}

/**
 * THE PLAIN SHAPES — what each sheet falls back to with nothing drawn, and
 * what `npm run art:placeholders` paints the placeholder sheets from, through
 * a stand-in for Phaser's Graphics. Exported for that tool and nothing else.
 */

/**
 * THE GRANITE FORM'S PLAIN SHAPES, standing on (x, y), the floor under his
 * middle. `form` is a statue shape or `roll`; `t` turns the boulder.
 */
export function drawGraniteShape(g, x, y, facing, form, t = 0) {
  const D = 0x5F443A, L = 0xA8A296, K = 0x0A0A12, f = facing < 0 ? -1 : 1;
  const box = (bx, by, w, h, c) => { g.fillStyle(c, 1); g.fillRect(f > 0 ? x + bx : x - bx - w, y + by, w, h); };
  if (form === 'roll') {
    g.fillStyle(K, 1); g.fillCircle(x, y - 14, 14);
    g.fillStyle(L, 1); g.fillCircle(x, y - 14, 12);
    const a = (Math.floor(t / 4) % 4) * (Math.PI / 2) * f;
    g.fillStyle(D, 1); g.fillRect(Math.round(x + Math.cos(a) * 7) - 2, Math.round(y - 14 + Math.sin(a) * 7) - 2, 4, 4);
    return;
  }
  if (form === 'chest') {
    box(-11, -15, 22, 15, K); box(-10, -14, 20, 13, L);
    box(-10, -10, 20, 1, D); box(-2, -11, 4, 4, D);
    return;
  }
  if (form === 'monolith') {
    box(-6, -27, 12, 27, K); box(-5, -26, 10, 25, D);
    return;
  }
  // megaman: legs apart, body, head, and the arm cannon pointed forward
  box(-7, -6, 5, 6, K); box(2, -6, 5, 6, K);
  box(-5, -16, 10, 11, K); box(-4, -15, 8, 9, L);
  box(-4, -23, 9, 8, K); box(-3, -22, 7, 6, L);
  box(4, -15, 9, 5, K); box(5, -14, 7, 3, L);
}

/**
 * ROCKY, the Lv10 walking form — the Eridian from Project Hail Mary: a rocky
 * carapace on five legs. Standing on (x, y); `t` steps the legs.
 */
export function drawRockyShape(g, x, y, facing, t = 0) {
  const D = 0x5F443A, L = 0xA8A296, K = 0x0A0A12, f = facing < 0 ? -1 : 1;
  const box = (bx, by, w, h, c) => { g.fillStyle(c, 1); g.fillRect(f > 0 ? x + bx : x - bx - w, y + by, w, h); };
  const lift = Math.floor(t / 6) % 2;
  [-10, -5, 0, 5, 10].forEach((lx, i) => {
    const up = (i % 2) === lift ? 2 : 0;
    box(lx - 1, -9, 3, 9 - up, K); box(lx, -8, 1, 7 - up, D);
  });
  box(-9, -17, 18, 9, K); box(-8, -16, 16, 7, L);
  box(-5, -20, 10, 4, K); box(-4, -19, 8, 3, L);
  box(-6, -12, 12, 1, D); box(2, -15, 3, 2, D);
}

/** One loose stone, standing on (x, y). */
export function drawStoneShape(g, x, y) {
  g.fillStyle(0x5F443A, 1); g.fillCircle(x, y - 4, 4);
  g.fillStyle(0xA8A296, 1); g.fillCircle(x, y - 4, 3);
}

/**
 * THE WHIP'S PLAIN SHAPE, from the owner's Stick Nodes poses of Simon
 * (19 Oct 2026) at the player's size: hanging behind him, swung overhead, then
 * cracked straight out (or 45° up). Points are from his hand, facing right.
 * The handle runs back to his hand because his body does not take the pose
 * until it is drawn. Longer whips swing a bigger arc, and nothing goes
 * through the floor.
 */
export const WHIP_SHAPE = {
  lens: { '': 34, Long: 52, Longer: 78 },
  behind: [[-24, -4], [-29, -4], [-28, 4], [-28, 10], [-26, 13]],
  overhead: [[-18, -7], [-22, -8], [-26, -4], [-29, -1], [-28, 3], [-26, 6]],
  // At rest: coiled, hanging from his hand.
  rest: [[0, 0], [1, 5], [3, 8], [1, 11], [-2, 9], [-1, 6], [1, 5]],
  tip: 10,
};

/** The whip's points for frame 0, 1 or 2 of a crack clip. */
export function whipPoints(clip, frame) {
  const m = /^(lowC|c)rack(Up)?(Longer|Long)?$/.exec(clip);
  const len = WHIP_SHAPE.lens[m[3] || ''], floor = m[1] === 'lowC' ? 6 : 12;
  if (frame >= 2) {
    const a = m[2] ? -Math.PI / 4 : 0;
    return [[0, 0], [Math.round(len * Math.cos(a)), Math.round(len * Math.sin(a))]];
  }
  const k = 1 + (len - 34) / 88;
  const pts = [[0, 0], ...WHIP_SHAPE[frame ? 'overhead' : 'behind']
    .map(([x, y]) => [Math.round(x * k), Math.min(floor, Math.round(y * k))])];
  // Two points squashed onto the floor together would make a zero-length piece.
  return pts.filter((q, i) => !i || q[0] !== pts[i - 1][0] || q[1] !== pts[i - 1][1]);
}

/** The whip: a green vine through `pts` from the hand, with a white glint on the tip when `glint`. */
export function drawWhipShape(g, hx, hy, facing, pts, glint) {
  const P = pts.map(([x, y]) => [hx + x * facing, hy + y]);
  for (const [w, c] of [[3, 0x1A6B12], [1, 0x2AAB1C]]) {
    g.lineStyle(w, c, 1);
    for (let i = 1; i < P.length; i++) g.lineBetween(P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]);
  }
  const [tx, ty] = P[P.length - 1].map(Math.round);
  g.fillStyle(0x2AAB1C, 1);
  g.fillRect(tx - 2, ty - 2, 4, 4);
  if (glint) {
    g.fillStyle(0xFFFFFF, 1);
    g.fillRect(tx - 4, ty, 9, 1);
    g.fillRect(tx, ty - 4, 1, 9);
  }
}

/** The hammer: a handle and a blocky rock head across its end, pointed at `deg` from the grip. */
export function drawHammerShape(g, gx, gy, facing, deg) {
  const r = (deg * Math.PI) / 180, R = HAMMER_SHAPE.reach;
  const { across, thick } = HAMMER_SHAPE.head;
  const dx = Math.cos(r) * facing, dy = -Math.sin(r);
  const hx = gx + dx * R, hy = gy + dy * R;                  // the head's middle
  const ex = hx - dx * (thick / 2), ey = hy - dy * (thick / 2);
  g.lineStyle(4, 0x0A0A12, 1); g.lineBetween(gx, gy, ex, ey);
  g.lineStyle(2, 0x8A5A2B, 1); g.lineBetween(gx, gy, ex, ey);
  // The head sits across the end of the handle.
  const px = -dy, py = dx, a = across / 2;
  g.lineStyle(thick + 3, 0x0A0A12, 1);
  g.lineBetween(hx - px * (a + 0.5), hy - py * (a + 0.5), hx + px * (a + 0.5), hy + py * (a + 0.5));
  g.lineStyle(thick, 0xA76625, 1);
  g.lineBetween(hx - px * a, hy - py * a, hx + px * a, hy + py * a);
  g.lineStyle(2, 0xD08A44, 1);
  g.lineBetween(hx - px * (a - 1) - dx * 2, hy - py * (a - 1) - dy * 2,
    hx + px * (a - 1) - dx * 2, hy + py * (a - 1) - dy * 2);
}

/** One sand spike from its foot: `u` is how far it has grown (0 to 1), `pale` its last flicker. */
export function drawSpikeShape(g, bx, by, dir, deg, len, u, pale) {
  const l = len * (1 - (1 - u) * (1 - u));
  const rad = (deg * Math.PI) / 180;
  const ux = Math.cos(rad) * dir, uy = -Math.sin(rad);
  const tx = bx + ux * l, ty = by + uy * l;
  const wx = -uy * 3, wy = ux * 3;
  g.fillStyle(0x6E5226, 1);
  g.fillTriangle(bx + wx * 1.3, by + wy * 1.3, bx - wx * 1.3, by - wy * 1.3, tx, ty);
  g.fillStyle(pale ? 0xF0D898 : 0xD9B56A, 1);
  g.fillTriangle(bx + wx, by + wy, bx - wx, by - wy, tx, ty);
  g.fillStyle(0xA88445, 1);
  g.fillTriangle(bx, by, bx - wx, by - wy, tx, ty);
}

/** A dust cloud or puff of radius `r` around (x, y), `u` of the way through its life. */
export function drawDustShape(g, x, y, r, u, seed, puff) {
  const n = puff ? 3 : 6;
  for (let k = 0; k < n; k++) {
    const ang = seed * 6.283 + k * (6.283 / n);
    const dist = r * (0.25 + 0.75 * u) * (0.6 + 0.4 * (((k * 37) % 5) / 5));
    const rr = r * (puff ? 0.6 : 0.45) * (0.5 + 0.5 * u);
    g.fillStyle(k % 2 ? 0xE6D6B0 : 0xCDB892, (1 - u) * (puff ? 0.95 : 0.7));
    g.fillCircle(x + Math.cos(ang) * dist, y - Math.abs(Math.sin(ang)) * dist * 0.7, rr);
  }
}

/** One grain of sand. */
export function drawSandShape(g, x, y, shade) {
  g.fillStyle(shade ? 0xB8923F : 0xD9B56A, 1);
  g.fillRect(Math.round(x), Math.round(y), shade ? 1 : 2, 1);
}

export function drawWeaponry(g, sx, ctx) {
  const { run, player: p, fx } = ctx;

  // NULLFIRE DRONE — grey while live, DARK grey during the emergency reload,
  // which is the tracker's own readout for "the clip is gone". The clip bar
  // beside it is the other half of that readout.
  const dr = run.wstate.nullfire_drone;
  if (dr && ctx.equipped.includes('nullfire_drone')) {
    const m = mountPoint(p);
    g.fillStyle(dr.reloading ? 0x3A3F4A : 0x9AA4B4, 1);
    g.fillRect(sx(m.x) - 4, m.y - 3, 8, 6);
    g.fillStyle(dr.reloading ? 0x22262E : 0xD8DEE8, 1);
    g.fillRect(sx(m.x) - 2, m.y - 1, 4, 2);
    const L = ladderAt('nullfire_drone', ctx.levelOf('nullfire_drone'));
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

  /**
   * SIMON'S WHIP — the vine itself, drawn every frame it exists.
   *
   * It had no animation of its own at all. The only thing on screen was the
   * generic chain-arc fx it borrowed from the Volt Spark: one YELLOW hairline
   * with an eight-frame fade, pushed from `thornProbe` — which is not called
   * during the reel or during a Lv3 swing, both of which return early. So the
   * lash blinked, went the wrong colour, and then disappeared for the whole
   * interesting half of the move. It could not be playtested.
   *
   * A SHAPE, not art: a thick stem with a lighter core and a blunt head, in the
   * weapon's own green. The barbs are the segment ticks — enough to read as a
   * vine rather than a laser at 224px tall, and cheap enough to draw per frame.
   */
  // The crack itself is drawn from its sheet (drawWeaponArt); this is the
  // vine AFTER it, while it reels a catch home or swings him from a ledge.
  const tl = run.wstate.simons_whip;
  if ((tl?.lash?.grabbed || tl?.lash?.swing) && tl.lash.tip && ctx.equipped.includes('simons_whip')) {
    const la = tl.lash;
    // While reeling, the tip is the thing on the end of it — the vine has to
    // follow its catch home or the grab reads as the enemy moving by itself.
    const e = la.grabbed;
    const tip = e ? { x: e.x + e.w / 2, y: e.y + e.h / 2 } : la.tip;
    const x0 = sx(la.ox), y0 = la.oy, x1 = sx(tip.x), y1 = tip.y;
    g.lineStyle(3, 0x1A6B12, 1);          // stem
    g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(1, 0x2AAB1C, 1);          // lit core
    g.lineBetween(x0, y0, x1, y1);
    // Barbs, spaced along the stem so the vine reads as segmented.
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    for (let d = 6; d < len; d += 6) {
      const t = d / len, bx = x0 + dx * t, by = y0 + dy * t;
      const s = (d / 6) % 2 ? 2 : -2;
      g.fillStyle(0x2AAB1C, 1);
      g.fillRect(Math.round(bx + nx * s) - 1, Math.round(by + ny * s) - 1, 2, 2);
    }
    // The head. Bigger and paler while it has hold of something, which is the
    // only readout for "this grabbed" other than the enemy starting to move.
    g.fillStyle(e ? 0x8FE07A : 0x2AAB1C, 1);
    const hr = e ? 4 : 3;
    g.fillRect(Math.round(x1) - hr, Math.round(y1) - hr, hr * 2, hr * 2);
    /**
     * THE GLINT — "a small glint to indicate that zone".
     *
     * The tip carries roughly twice the shaft's damage and it is the only part
     * that catches, and none of that was visible: the head was the same green
     * as the vine it was on the end of. A white cross with a lit centre is the
     * arcade shorthand for "this is the business end", and it is drawn only
     * while the whip is out and empty — once something is caught, the pale
     * bigger head is already saying the more useful thing.
     */
    if (!e) {
      const gx = Math.round(x1), gy = Math.round(y1);
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillRect(gx - 4, gy, 9, 1);
      g.fillRect(gx, gy - 4, 1, 9);
      g.fillStyle(0xEAFBE4, 1);
      g.fillRect(gx - 1, gy - 1, 3, 3);
    }
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

  // ASTRAL CLOAK — a dark shroud over the player's own outline, and the only
  // way to know the thing is on. Every other effect it has is a change to what
  // the ENEMIES do, which is unreadable as feedback: fewer shots and the odd
  // pause look exactly like a quiet moment. Drawn OVER the suit rather than
  // instead of it, because the player is a fixed blue and must stay findable.
  if (ctx.equipped.includes('astral_cloak')) {
    const bob = Math.sin(run.frame * 0.06) * 1.5;
    g.fillStyle(0x2A273F, 0.5);
    g.fillRect(sx(p.x) + 1, p.y + 2 + bob, 22, 22);
    g.lineStyle(1, 0xA68DD8, 0.55);
    g.strokeRect(sx(p.x) + 0.5, p.y + 1.5 + bob, 23, 23);
  }

  // ALLIES. The Swarm Caller's bugs, and the Astral Cloak's shadow trails —
  // which are also allies but are emphatically NOT bugs, and were being painted
  // lime green because this loop did not look at the owner.
  for (const a of run.allies) {
    if (a.role === 'trail') {
      const t = a.life / (a.maxLife || 90);
      g.fillStyle(0x2A273F, 0.55 * t);
      g.fillRect(sx(a.x) - 4, a.y - 10, 8, 20);
      g.fillStyle(0xA68DD8, 0.35 * t);
      g.fillRect(sx(a.x) - 1, a.y - 10, 2, 20);
      continue;
    }
    // Interceptors carry a pale core so you can tell which half of the swarm is
    // guarding you and which half is out hunting; a kamikaze bug runs hot.
    g.fillStyle(a.role === 'block' ? 0xE8F0A0
      : a.role === 'kamikaze' ? 0xF5D328 : 0xB8DC28, 1);
    g.fillRect(sx(a.x) - 2, a.y - 2, 5, 5);
    g.fillStyle(0x4D5C1A, 1);
    g.fillRect(sx(a.x) - 1, a.y + Math.sin(a.life * 0.5), 3, 1);
  }

  // The QUAKE HAMMER and its dust are drawn from its sheets: drawWeaponArt.

  for (const q of fx.puffs) {
    // A puff that names a weapon is drawn by GameScene through the art layer,
    // which falls back to `drawPuff` below when that weapon has no sprite yet.
    if (q.weapon) continue;
    drawPuff(g, q, sx(q.x));
  }
  for (const arc of fx.arcs) {
    g.lineStyle(1, 0xF5D328, arc.life / arc.max);
    g.lineBetween(sx(arc.x0), arc.y0, sx(arc.x1), arc.y1);
  }
}
