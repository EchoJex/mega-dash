/**
 * THE SIMULATED PLAYER — a utility-scored controller standing in for a thumb.
 *
 * It writes to exactly what a human writes to: `gs.intent`, `gs.doJump()`,
 * `gs.toggleSlide()`, `gs.beginFire()` / `gs.endFire()`. Nothing here reaches
 * past the input surface, which is the only reason the numbers it produces mean
 * anything — a controller that poked at `run.hp` or spawned its own bullets
 * would be measuring a different game from the one that ships.
 *
 * WHY UTILITY SCORING AND NOT A STATE MACHINE. A state machine has to decide
 * WHICH threat it is reacting to before it can react, and a boss room routinely
 * has a body, two projectiles and an ambient hazard live at once. Scoring every
 * available action against every threat at once needs no such decision: the
 * action that is least bad overall wins, and "least bad" already accounts for
 * the fact that dodging one thing often means walking into another.
 *
 * THE PREDICTION IS DELIBERATELY CHEAP. It re-implements a stripped-down
 * version of stepPlayer's motion — instant horizontal speed, gravity, terminal
 * velocity — from the SAME `FEEL` constants the real physics reads, so the two
 * cannot disagree about how fast the player moves or how hard he falls. It does
 * not model ledges, one-way platforms or the cliff grab, because a boss arena
 * is one flat sealed room and none of them are in it.
 *
 * WHAT IT IS NOT. This is not a good player, and it is not trying to be. It is
 * a CONSISTENT player: the same policy against every weapon and every boss, so
 * the differences between the numbers are differences between the fights rather
 * than differences in how hard the harness was trying.
 */

import { FEEL } from '../config/feel.js';
import { hitboxOf, overlaps } from '../systems/physics.js';
import { RUNTIME, LONG_PRESS_FRAMES } from '../systems/weaponry.js';
import { ladderAt } from '../data/weapons.js';

/** How many frames ahead threats are projected. About a quarter-second. */
const LOOKAHEAD = 16;
/** Sampled every other frame — twice the resolution buys nothing at this size. */
const STEP = 2;
/** Virtual pixels of margin added around every threat box. */
const PAD = 5;

/**
 * How much a collision hurts the score. Enormous next to the offence terms on
 * purpose: taking a hit costs a third of the health bar and 90 frames of
 * flicker, so almost no amount of extra damage is worth one.
 */
const DANGER_W = 40;

/** The band a RANGED weapon holds: far enough to react, near enough to hit. */
const RANGE = { min: 40, max: 110 };

/**
 * WHERE THE PREFERRED RANGE COMES FROM — the weapon's own ladder, not a
 * constant.
 *
 * The first version held one 40-110px standoff for everything, and the Volt
 * Spark scored 0% against every boss with zero shots fired. It is not a
 * projectile at all: it zaps a 34px box in front of the player. The controller
 * was standing exactly far enough away to never touch anything, which reads in
 * the table as a broken weapon and was a broken CONTROLLER.
 *
 * So a rung that declares a `range`, `reach` or `jabReach` is a weapon that has
 * to be walked into, and the band becomes "get inside it". Everything else
 * keeps the standoff. The ladder is the right place to ask, because it is where
 * the weapon already states its own geometry.
 */
function bandFor(id, lv) {
  const L = ladderAt(id, lv) || {};
  const melee = L.range ?? L.reach ?? L.jabReach;
  if (!melee) return RANGE;
  // Aim for two thirds of the reach so a step in either direction still lands.
  return { min: 0, max: Math.max(12, melee * 0.66) };
}

export class SimController {
  /**
   * @param gs the live GameScene
   * @param opts.passive true when the weapon under test fires itself, which
   *        buys the controller nothing to aim and so raises the weight on
   *        staying alive and staying in range instead.
   */
  constructor(gs, opts = {}) {
    this.gs = gs;
    this.passive = !!opts.passive;
    const id = gs.run.activeWeapon;
    this.band = bandFor(id, gs.run.wpLevels[id] || 1);
    this.fireFrames = 0;
    this.releasing = 0;
    // Metrics the controller is best placed to collect, since it already
    // computes the boxes every frame.
    this.errorFrames = 0;
  }

  /** One decision. Call immediately before `gs.step()`. */
  step() {
    const gs = this.gs;
    const threats = this.threats();
    this.countError(threats);
    this.move(threats);
    this.shoot();
  }

  // ── Perception ──────────────────────────────────────────────────────

  /**
   * Everything in the room that can damage the player, as boxes with velocity.
   *
   * Boxes come from the game's own helpers (`bulletBox`, the boss's real w/h,
   * the hazard's own rect) rather than from anything reconstructed here, so a
   * hazard the controller dodges is the hazard that would actually have hit.
   */
  threats() {
    const gs = this.gs, out = [];
    for (const b of gs.bullets) {
      if (!b.enemy) continue;
      const box = gs.bulletBox(b);
      out.push({ ...box, vx: b.vx || 0, vy: b.vy || 0 });
    }
    const boss = gs.boss;
    // 'enter' is the walk-on; he is not fighting yet and closing on him then is
    // correct rather than dangerous.
    if (boss && boss.state !== 'enter') {
      out.push({ x: boss.x, y: boss.y, w: boss.w, h: boss.h, vx: 0, vy: 0 });
    }
    for (const h of gs.arena?.hazards || []) {
      // `solid` furniture is a platform, not a threat — standing on a floating
      // barrel is how you cross Tempest Man's water.
      if (!h.damage || h.solid) continue;
      out.push({ x: h.x, y: h.y, w: h.w, h: h.h, vx: h.vx || 0, vy: h.vy || 0 });
    }
    // A flooded floor is a threat with no box of its own — Blaze Man's lava.
    const q = gs.arena?.liquid;
    if (q && q.kind === 'lava' && q.h > 0.5) {
      out.push({
        x: gs.arena.x0, y: gs.arena.floorY - q.h,
        w: gs.arena.x1 - gs.arena.x0, h: q.h, vx: 0, vy: 0,
      });
    }
    return out;
  }

  /**
   * ERROR MARGIN — frames spent standing inside something that can hurt you.
   *
   * Counted whether or not the hit lands, because i-frames are a consequence of
   * a mistake already made rather than a reason it was not one. A weapon that
   * forces the player to stand in the fire is a harder weapon to use even when
   * the flicker is eating the damage.
   */
  countError(threats) {
    const box = hitboxOf(this.gs.player);
    for (const t of threats) {
      if (overlaps(box, t)) { this.errorFrames++; return; }
    }
  }

  // ── Movement ────────────────────────────────────────────────────────

  /**
   * Score every action the player could take this frame and take the best one.
   *
   * The candidate set is small on purpose: three horizontal intents, each with
   * and without a jump, plus a slide. That is the whole vocabulary a human has
   * on this control scheme, so searching it exhaustively is both cheap and
   * complete.
   */
  move(threats) {
    const gs = this.gs, p = gs.player;
    const canJump = p.onGround || p.airActions > 0;
    const canSlide = p.onGround && !p.sliding && gs.run.slideRank > 0;

    let best = null;
    for (const dir of [-1, 0, 1]) {
      for (const jump of canJump ? [false, true] : [false]) {
        const s = this.score(threats, dir, jump, false);
        if (!best || s > best.s) best = { s, dir, jump, slide: false };
      }
    }
    if (canSlide) {
      const s = this.score(threats, p.facing, false, true);
      // A slide is a commitment — it locks the player low and fast for a fixed
      // number of frames — so it has to be clearly better, not merely equal.
      if (best && s > best.s + 2) best = { s, dir: p.facing, jump: false, slide: true };
    }

    gs.setMove(best.dir);
    if (best.slide) gs.toggleSlide();
    if (best.jump) gs.doJump();
    else if (gs.intent.jumpHeld && p.vy > 0) gs.endJump();
  }

  /**
   * How good an action looks: danger avoided, minus the cost of being out of
   * position for the weapon under test.
   */
  score(threats, dir, jump, slide) {
    const gs = this.gs;
    let danger = 0;
    const path = this.predict(dir, jump, slide);

    /**
     * I-FRAMES ARE NOT DANGER. `hurt()` returns immediately while `invuln` is
     * up, so for those frames nothing in the room can touch the player — and a
     * real player spends them closing distance, which is the only way a melee
     * weapon ever reaches anything. Without this the controller fled the boss's
     * body during the exact window it was free to stand in it, and the Strike
     * Gauntlet took 11% off a bar it should have been chewing through.
     */
    const invuln = gs.run.invuln;

    for (let i = 0; i < path.length; i++) {
      const t = i * STEP;
      if (t < invuln) continue;
      for (const th of threats) {
        const box = {
          x: th.x + th.vx * t - PAD, y: th.y + th.vy * t - PAD,
          w: th.w + PAD * 2, h: th.h + PAD * 2,
        };
        // Sooner is worse: a threat 2 frames out is unavoidable, one 16 frames
        // out can still be walked away from next frame.
        if (overlaps(path[i], box)) danger += (LOOKAHEAD - t) / LOOKAHEAD;
      }
    }

    const end = path[path.length - 1];
    let good = 0;
    const boss = gs.boss;
    if (boss && boss.state !== 'enter') {
      const gap = Math.abs((end.x + end.w / 2) - (boss.x + boss.w / 2));
      const band = this.band;
      // A passive weapon has a radius rather than a barrel, so holding the band
      // IS its aiming — worth more to it than to a weapon that can simply be
      // pointed. Nothing else about the policy changes between the two.
      const w = this.passive ? 3 : 1.5;
      if (band.min && gap < band.min) good -= w * (band.min - gap) / band.min;
      else if (gap > band.max) good -= w * Math.min(2, (gap - band.max) / band.max);
      else good += w;
    }
    // Airborne is a worse place to be told about a new threat from — no ground
    // to push off. A mild preference, easily outweighed by a real dodge.
    if (!gs.player.onGround) good -= 0.4;

    return good - danger * DANGER_W;
  }

  /**
   * Where the player would be over the next LOOKAHEAD frames, as boxes.
   *
   * A stripped-down stepPlayer reading the SAME constants: instant horizontal
   * speed, gravity, terminal velocity, the arena floor. No ledges, no one-way
   * platforms, no cliff grab — a boss arena is one flat sealed room.
   */
  predict(dir, jump, slide) {
    const gs = this.gs, p = gs.player;
    const floor = gs.arena ? gs.arena.floorY : null;
    const hb = slide || p.sliding ? FEEL.playerHitboxSlide : FEEL.playerHitbox;
    let x = p.x, y = p.y, vy = p.vy;
    const speed = FEEL.moveSpeed * (slide || p.sliding ? FEEL.slideSpeedMult : 1);
    let launched = false;
    const out = [];

    for (let t = 0; t <= LOOKAHEAD; t += STEP) {
      for (let k = 0; k < STEP; k++) {
        x += dir * speed;
        if (jump && !launched && (p.onGround || p.airActions > 0)) {
          vy = FEEL.jumpVelocity;
          launched = true;
        }
        vy = Math.min(vy + FEEL.gravity, FEEL.maxFallSpeed);
        y += vy;
        if (floor != null) {
          const feet = y + hb.offY + hb.h;
          if (feet > floor) { y -= feet - floor; vy = 0; }
        }
      }
      out.push({ x: x + hb.offX, y: y + hb.offY, w: hb.w, h: hb.h });
    }
    return out;
  }

  // ── Shooting ────────────────────────────────────────────────────────

  /**
   * Hold the fire button, and let go of it when a weapon needs the release.
   *
   * Three firing paths exist in the game and this covers all of them without
   * knowing which is which: the flat weapons and the sidearm are gated by
   * `run.cooldown`, the runtime `fire()` weapons gate themselves, and a
   * long-press weapon needs the button held past its own threshold and then
   * RELEASED. So the policy is "hold, and release periodically" — the release
   * is what a tap-only weapon ignores and a charge weapon needs.
   */
  shoot() {
    const gs = this.gs, r = gs.run;
    const boss = gs.boss;
    if (!boss || boss.state === 'enter') { if (r.fireHeldFrames) gs.endFire(); return; }

    const id = r.activeWeapon;
    const beh = RUNTIME[id];
    const hold = beh?.longPress
      ? (beh.holdFrames ? beh.holdFrames(r.wpLevels[id] || 1) : LONG_PRESS_FRAMES) + 2
      : 30;

    if (this.releasing > 0) {
      this.releasing--;
      gs.endFire();
      this.fireFrames = 0;
      return;
    }
    if (!gs.intent.fireHeld) gs.beginFire();
    if (++this.fireFrames >= hold) this.releasing = 2;
  }
}
