/**
 * GameScene — the run itself.
 *
 * Structure note: this scene owns the SIMULATION. All rendering of world actors
 * happens through a single Graphics object driven by systems/assets.js, so
 * swapping placeholders for real sprites never touches this file.
 *
 * The update loop is a FIXED TIMESTEP accumulator. Phaser hands us a variable
 * delta; we bank it and run whole 1/60s steps. That is what keeps the game
 * identical on 60Hz and 120Hz screens.
 */

import Phaser from 'phaser';
import { FIXED_DT, MAX_STEPS_PER_FRAME, VIEW_H, DEPTH, viewWidthOf } from '../config/display.js';
import { fitCamera } from '../systems/text.js';
import { FEEL } from '../config/feel.js';
import { dev } from '../config/dev.js';
import { BOSSES, BOSS_BY_ID, makeBossBag, bossLayer } from '../data/bosses.js';
import { WEAPONS, NULL_WEAPON, weaponOf, BUSTER_ID, damageAtLevel } from '../data/weapons.js';
import { UPGRADES, applyUpgrades, chipsBreakdown } from '../data/upgrades.js';
import { save, persist, recordBossKill } from '../systems/save.js';
import { ELITE_OUTLINE } from '../data/minions.js';
import { fightFor } from '../data/bossFights.js';
import * as Terrain from '../systems/terrain.js';
import * as Phys from '../systems/physics.js';
import * as Minions from '../systems/minions.js';
import * as Pickups from '../systems/pickups.js';
import * as Arena from '../systems/arena.js';
import * as Attr from '../systems/attributes.js';
import { sfx } from '../systems/sfx.js';
import {
  ActorLayer, drawProjectile, drawPickup, projectileHalfHeight,
} from '../systems/assets.js';

const GROUND_Y = VIEW_H - 40; // leaves room for the on-screen controls

/** Copy of an array in random order. Used for the arsenal head start. */
const shuffled = (arr) => [...arr].sort(() => Math.random() - 0.5);

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.viewW = viewWidthOf(this.scale);
    fitCamera(this, this.viewW);
    this.acc = 0;
    // Phaser reuses the scene instance across scene.start, so a run that ended
    // while paused would leave the NEXT run frozen on its first frame.
    this.paused = false;
    this.timeScale = 1;
    this.tsTarget = 1;
    this.tsStep = 0;

    // Depth bands. Each owns a Graphics for placeholders AND a sprite pool for
    // real art, so ordering stays correct no matter which actors have art yet —
    // see the ActorLayer note in systems/assets.js. Depths are explicit (see
    // DEPTH in config/display.js) so the player stays above every world actor
    // even if this literal is reordered.
    this.layers = {
      bg: new ActorLayer(this, DEPTH.background),
      world: new ActorLayer(this, DEPTH.world),
      pickups: new ActorLayer(this, DEPTH.pickups),
      minions: new ActorLayer(this, DEPTH.minions),
      bullets: new ActorLayer(this, DEPTH.bullets),
      boss: new ActorLayer(this, DEPTH.boss),
      player: new ActorLayer(this, DEPTH.player),
    };
    this.nextBoss = makeBossBag();
    this.startRun();

    // Input intent is filled by UIScene (touch) and keyboard here.
    // The `if (!jumpHeld)` guards matter: browsers repeat keydown while a key is
    // held, and without them a held jump would burn the air dash instantly.
    this.input.keyboard.on('keydown-SPACE', () => { if (!this.intent.jumpHeld) this.doJump(); });
    this.input.keyboard.on('keyup-SPACE', () => this.endJump());
    this.input.keyboard.on('keydown-UP', () => { if (!this.intent.jumpHeld) this.doJump(); });
    this.input.keyboard.on('keyup-UP', () => this.endJump());
    this.input.keyboard.on('keydown-X', () => this.toggleSlide());
    // Routed through the same beginFire/endFire the touch pad uses so charging
    // works identically on both. The guard matters: browsers repeat keydown
    // while a key is held, and re-stamping fireStart would make a charged shot
    // impossible to reach.
    this.input.keyboard.on('keydown-Z', () => { if (!this.intent.fireHeld) this.beginFire(); });
    this.input.keyboard.on('keyup-Z', () => this.endFire());
    this.keys = this.input.keyboard.addKeys('A,D,LEFT,RIGHT');

    this.scene.launch('UI', { game: this });
  }

  /** Build a fresh run. Everything here is run-scoped and resets on death. */
  startRun() {
    const run = {
      frame: 0, score: 0, dist: 0, combo: 1, comboTimer: 0,
      exp: 0, level: 1, expToNext: FEEL.expPerLevel, pendingLevelUps: 0,
      hp: FEEL.hpMax, hpBonus: 0, runHpBonus: 0,
      invuln: 0, kills: 0, maxCombo: 1,
      bossesDefeated: [],
      // meta-upgrade derived fields (applyUpgrades fills these)
      cdMult: 1, comboDecayMult: 1, magnetMult: 1, dmgMult: 1, projSpeedMult: 1,
      bulletSizeMult: 1, extraShots: 0, armorBonus: 0, scoreMult: 1,
      chipGainMult: 1, luckMult: 1, revives: 0, revivesLeft: 0,
      starterArsenal: false, twinArsenal: false,
      // slide is meta-gated: rank 0 means the player cannot slide at all
      slideRank: 0, slideDurMult: 1, slideSpeedBonus: 1, slideIframes: 0,
      // weapons
      unlocked: new Set([BUSTER_ID]),
      wpLevels: { [BUSTER_ID]: 1 },
      activeWeapon: BUSTER_ID,
      cooldown: 0,
    };
    applyUpgrades(save, run);
    run.hp = FEEL.hpMax + run.hpBonus;
    run.revivesLeft = run.revives;

    // Weapons are EARNED: you start with the buster and unlock a special by
    // beating the boss that carries it (killBoss below). The two arsenal
    // upgrades are the only head start, and they cost Chips.
    const specials = WEAPONS.filter((w) => w.id !== BUSTER_ID);
    const headStart = run.twinArsenal ? 2 : run.starterArsenal ? 1 : 0;
    for (const w of shuffled(specials).slice(0, headStart)) {
      run.unlocked.add(w.id);
      run.wpLevels[w.id] = 1;
    }

    this.run = run;
    this.world = Terrain.makeWorld(80, GROUND_Y);
    this.cam = { x: 0 };
    this.player = {
      x: 80, y: GROUND_Y - 24, vx: 0, vy: 0, facing: 1,
      onGround: true, sliding: false, slideTimer: 0,
      airActions: FEEL.maxAirActions, airDashTimer: 0,
      jumpBuffer: 0, coyote: 0, jumpCut: false,
      flinchTimer: 0, knockbackVx: 0, hitAnim: 0,
    };
    this.bullets = [];
    this.minions = [];
    this.pickups = [];
    this.spawnTimer = 0;
    this.boss = null;
    this.arena = null;
    this.warp = null;
    this.shake = null;
    // Character attributes on the player (Burn, Wet, ...). Run-scoped: nothing
    // about a status survives death, so it lives here and not in save.
    this.status = Attr.makeStatus();
    this.intent = { moveDir: 0, jumpHeld: false, fireHeld: false, fireStart: 0 };
    this.startArea();
  }

  /**
   * Begin a fresh scrolling area. Draws the NEXT boss from the bag immediately
   * so the backdrop can foreshadow which arena the door leads to — you should
   * be able to tell Blaze Man is coming because the world ahead is going red.
   */
  startArea(forceBoss = null) {
    this.upcoming = forceBoss || this.nextBoss();
    this.areaTheme = Arena.themeFor(this.upcoming);
    // The ground leans toward the coming boss too, not just the backdrop — an
    // approach to Gale Man should FEEL airy, not merely look it.
    this.world = Terrain.makeWorld(80, GROUND_Y, this.upcoming?.id);
    this.cam = { x: 0 };
    this.player.x = 80;
    this.player.y = GROUND_Y - 24;
    this.player.vx = 0; this.player.vy = 0;
    this.bullets = [];
    this.minions = [];
    this.pickups = [];
    this.arena = null;
    this.areaFrame = 0;
    Terrain.generate(this.world, 0, this.viewW);
    if (forceBoss) this.placeDoorAhead();
  }

  /**
   * DEV — drop the boss door a short walk to the right of the spawn.
   *
   * Deliberately OUTSIDE the door rather than inside the arena: the warp, the
   * fade, and the room building on the far side are all part of what needs
   * testing, and skipping straight to the fight would skip the transition bugs.
   * A few steps is enough to reach it without waiting out a 60-second timer.
   */
  placeDoorAhead() {
    const x = this.player.x + 72;
    // Guarantee solid ground under and around it — the procedural stream may
    // well have put a pit exactly there.
    this.world.groundSpans.push({ x1: x - 48, x2: x + 64 });
    this.world.spikes = this.world.spikes.filter((sp) => sp.x + sp.w < x - 48 || sp.x > x + 64);
    this.world.doors = [{ x, y: GROUND_Y, w: 16, h: 28, alive: true }];
  }

  /**
   * DEV — restart the area at a chosen boss, keeping the run's progress.
   *
   * Weapon levels, EXP and Chips all survive, because the point is to test a
   * fight repeatedly with whatever loadout you are carrying, not to reset.
   */
  devJumpToBoss(def) {
    if (!dev('bossSelect')) return;
    this.startArea(def);
    this.paused = false;
  }

  // ── Warp ────────────────────────────────────────────────────────────
  /**
   * Freeze everything and fade to black; build on the far side of the fade;
   * fade back in and resume. Nothing is ever seen half-constructed.
   *
   * The warp advances on REAL time, not sim time, because the sim is stopped
   * for its duration.
   */
  beginWarp(build) {
    if (this.warp) return;
    sfx('warp');
    this.warp = { phase: 'out', t: Arena.WARP.out, alpha: 0, build };
    this.intent.moveDir = 0;
    this.intent.fireHeld = false;
    this.intent.jumpHeld = false;
  }

  stepWarp(delta) {
    const w = this.warp;
    const step = delta / FIXED_DT;
    w.t -= step;
    if (w.phase === 'out') {
      w.alpha = Math.min(1, 1 - w.t / Arena.WARP.out);
      if (w.t <= 0) { w.phase = 'hold'; w.t = Arena.WARP.hold; w.alpha = 1; }
    } else if (w.phase === 'hold') {
      w.alpha = 1;
      if (w.t <= 0) {
        w.build();                       // everything loads behind full black
        w.phase = 'in';
        w.t = Arena.WARP.in;
      }
    } else {
      w.alpha = Math.max(0, w.t / Arena.WARP.in);
      if (w.t <= 0) this.warp = null;    // time resumes
    }
  }

  /** Door contact -> the boss's sealed arena. */
  warpToArena(def) {
    this.beginWarp(() => {
      const layer = bossLayer(save, def.id, dev('cycleLayers'));
      this.arena = Arena.makeArena(def, layer, this.viewW, GROUND_Y);
      this.cam = { x: 0 };
      this.minions = [];   // nothing follows you in
      this.bullets = [];
      this.pickups = [];
      this.world.doors = [];
      this.player.x = 24;
      this.player.y = GROUND_Y - 24;
      this.player.vx = 0; this.player.vy = 0;
      this.spawnBoss(def, layer);
    });
  }

  /** Wrap door contact -> out of the arena into a fresh area. */
  warpToNextArea() {
    this.beginWarp(() => this.startArea());
  }

  /**
   * Slow motion, used by the re-quip swipe.
   *
   * The fixed timestep is untouched — we simply bank real milliseconds more
   * slowly, so the sim still advances in whole 1/60s steps and not one line of
   * movement code changes. That is the only way to add slow-mo here without
   * breaking the determinism the whole engine is built around.
   */
  setTimeScale(target, frames) {
    this.tsTarget = target;
    this.tsStep = Math.abs(target - this.timeScale) / Math.max(1, frames);
  }

  // ── Fixed-timestep driver ───────────────────────────────────────────
  update(_time, delta) {
    // The ramp runs on RAW delta, not scaled: the whoosh in and out should take
    // the same wall-clock time however slowly the game itself is running.
    if (this.timeScale !== this.tsTarget) {
      const d = this.tsStep * (delta / FIXED_DT);
      this.timeScale = this.timeScale < this.tsTarget
        ? Math.min(this.tsTarget, this.timeScale + d)
        : Math.max(this.tsTarget, this.timeScale - d);
    }
    if (this.paused) return;
    // A warp freezes the simulation entirely and advances on real time.
    if (this.warp) { this.stepWarp(delta); this.draw(); return; }
    this.acc += delta * this.timeScale;
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      this.step();
      this.acc -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0; // spiral guard
    this.draw();
  }

  step() {
    const r = this.run, p = this.player;
    r.frame++;

    // keyboard movement folded into the same intent object touch uses
    const k = this.keys;
    let kb = 0;
    if (k.A.isDown || k.LEFT.isDown) kb = -1;
    if (k.D.isDown || k.RIGHT.isDown) kb = 1;
    const moveDir = kb !== 0 ? kb : this.intent.moveDir;

    if (p.beam) {
      this.stepBeam();
    } else {
      Phys.stepPlayer(p, this.world, { moveDir, jumpHeld: this.intent.jumpHeld }, GROUND_Y);
      if (!this.arena) {
        this.cam.x = Phys.stepCamera(this.cam, p, this.viewW);
        if (p.x < this.cam.x) p.x = this.cam.x; // never walk off the left edge
      }
    }

    // distance is real rightward progress, used for EXP and stats
    // Distance is a stat only. It grants no EXP — walking right is not progress
    // on its own, you have to kill things and go pick up what they drop.
    r.dist = Math.max(r.dist, (p.x - 80) / 8);

    // HAZARDS. Pits and spikes deal the same massive damage and then beam you
    // out — never an instant kill. The beam fires even during i-frames: a hit
    // may be ignored, but you still cannot be left inside a pit or standing on
    // spikes.
    const box = Phys.hitboxOf(p);
    if (p.y > VIEW_H + 24) {
      this.hurt(p.x, FEEL.hazardDamage);
      this.beamOut();
    } else {
      for (const s of this.world.spikes) {
        if (Phys.overlaps(box, s)) {
          // Check BEFORE hurt(), which sets the i-frames itself.
          const landed = r.invuln === 0;
          this.hurt(s.x + s.w / 2, FEEL.hazardDamage);
          // Beam only if the hit actually registered, or if you are standing in
          // them. Clipping a spike mid-jump while already invulnerable should
          // not stop you dead — you are passing through, not stuck, and killing
          // the jump there reads as the game eating your input.
          if (landed || p.onGround) this.beamOut();
          break;
        }
      }
    }

    Arena.stepShake(this.shake);
    this.stepAttributes(box);

    if (this.arena) {
      Arena.stepArena(this.arena);
      // Phasing platforms are real collision only while they are ON. Republishing
      // the list each frame is what makes a platform vanish from under you the
      // instant it phases out, which is the whole point of the mechanic.
      this.world.platforms = this.arena.platforms.filter((pl) => pl.on);
      this.stepArenaHazards(box);
      // Sealed room: no streaming, no camera, walls hold you in. The beam is
      // exempt — it deliberately travels above the ceiling.
      if (!p.beam) Arena.clampToArena(this.arena, p);
      // The wrap door only exists once the boss is down.
      for (const d of this.world.doors) {
        if (d.alive && Phys.overlaps(box, { x: d.x, y: d.y - d.h, w: d.w, h: d.h })) {
          d.alive = false;
          this.warpToNextArea();
          return;
        }
      }
    } else {
      this.areaFrame++;
      Terrain.generate(this.world, this.cam.x, this.viewW);
      Terrain.maybeSpawnDoor(this.world, this.cam.x, this.viewW, this.areaFrame);
      Terrain.prune(this.world, this.cam.x);

      // walking into the boss door warps you to its arena
      for (const d of this.world.doors) {
        if (d.alive && Phys.overlaps(box, { x: d.x, y: d.y - d.h, w: d.w, h: d.h })) {
          d.alive = false;
          this.warpToArena(this.upcoming);
          return;
        }
      }
    }

    if (r.invuln > 0 && !p.beam) r.invuln--; // the beam must not eat the i-frames
    if (r.cooldown > 0) r.cooldown--;
    if (p.hitAnim > 0) p.hitAnim--;
    if (r.comboTimer > 0 && --r.comboTimer === 0) r.combo = 1;

    // held fire auto-repeats; hold long enough and release for a charged shot
    if (this.intent.fireHeld && r.cooldown === 0) this.fire(false);

    this.stepMinions(box);
    this.stepPickups(box);
    this.stepBullets();
    this.stepBoss();
  }

  // ── Weapons ─────────────────────────────────────────────────────────
  fire(charged) {
    const r = this.run, p = this.player;
    if (r.cooldown > 0) return;
    const w = weaponOf(r.activeWeapon);
    // No weapon equipped: the player is a bare silhouette and fires nothing.
    if (w === NULL_WEAPON || w.projectiles < 1) return;
    const lv = r.wpLevels[w.id] || 1;
    sfx(charged ? 'shootBig' : 'shoot');
    let dmg = damageAtLevel(w, lv) * r.dmgMult;
    let rad = w.radius * r.bulletSizeMult;
    if (charged) { dmg *= FEEL.chargedDamageMult; rad *= FEEL.chargedSizeMult; }

    const ox = p.facing > 0 ? p.x + 20 : p.x + 4;
    const oy = p.y + 12;

    // DUPLICATOR: each rank adds one echo of the whole volley, stacked
    // perpendicular to travel. Spacing comes from the shape's ACTUAL drawn
    // half-height rather than a constant, because the 18 placeholder shapes
    // range from a thin 0.35r bar to a 1.6r orbiting ring — and radius itself
    // moves with Payload Frame and with charged shots.
    const gap = projectileHalfHeight(w.shape, rad) * 2 + 1;

    for (let v = 0; v <= r.extraShots; v++) {
      const tier = Math.ceil(v / 2);
      const dy = (v % 2 === 1 ? -1 : 1) * tier * gap;
      for (let i = 0; i < w.projectiles; i++) {
        const spread = w.projectiles > 1 ? (i - (w.projectiles - 1) / 2) * 0.5 : 0;
        this.bullets.push({
          x: ox, y: oy + dy,
          vx: w.speed * r.projSpeedMult * p.facing,
          vy: spread,
          radius: rad, damage: dmg, color: w.color, shape: w.shape,
          weapon: w.id, // resolves art as 'shot:<weaponId>' once it exists
          life: 180, charged, enemy: false,
        });
      }
    }
    r.cooldown = Math.max(1, Math.round(w.cooldown * r.cdMult));
  }

  /**
   * Collision box for a shot. Player shots get a slightly GENEROUS box so hits
   * connect when they look close; enemy shots get a stingy one, inverted for the
   * same reason. Both pads are declared in feel.js.
   */
  bulletBox(b) {
    const r = b.radius + (b.enemy ? FEEL.enemyBulletPad : FEEL.playerBulletPad);
    return { x: b.x - r, y: b.y - r, w: r * 2, h: r * 2 };
  }

  releaseFire() {
    const held = performance.now() - this.intent.fireStart;
    if (held >= FEEL.chargeFullMs) this.fire(true);
  }

  /**
   * Character attributes on the player, plus contact with terrain attributes.
   *
   * Burn damage does NOT go through hurt(): the tracker is explicit that it has
   * no flinch and no knockback, and routing it through the hit path would give
   * it both, plus i-frames that would then block real hits. Hot is the opposite
   * — it IS a hit, so it uses hurt() and gets the full reaction.
   */
  stepAttributes(box) {
    const r = this.run;
    const dot = Attr.stepStatus(this.status);
    if (dot > 0) {
      r.hp -= dot;
      if (dev('hpFloor')) r.hp = Math.max(1, r.hp);
      if (r.hp <= 0) return this.gameOver();
    }

    if (!this.arena) return;

    // Hot ground. The tick keeps it from firing every frame while you stand in
    // it; the remaining fraction scales the damage down as it cools.
    const hot = Attr.patchAt(this.arena.patches, box, 'player');
    if (hot && hot.tick === 0 && r.invuln === 0) {
      hot.tick = FEEL.hotTickFrames;
      const frac = Attr.patchFrac(hot);
      this.hurt(box.x + box.w / 2, Math.max(1, Math.round(FEEL.hotDamage * frac)));
      Attr.applyStatus(this.status, 'burn', Math.round(FEEL.burnFrames * frac));
    }

    // Standing in lava is Hot by another name; water is only a current.
    const q = this.arena.liquid;
    if (q && q.kind === 'lava' && q.h > 0.5 && box.y + box.h > this.arena.floorY - q.h) {
      if (r.invuln === 0) {
        this.hurt(box.x + box.w / 2, FEEL.hazardDamage);
        Attr.applyStatus(this.status, 'burn', FEEL.burnFrames);
      }
    }

    // A steady environmental push (rain, current). Applied to position rather
    // than velocity so it is a force you lean against, not something that
    // accumulates into a slide.
    const push = this.arena.push;
    if (push && (push.x || push.y)) {
      this.player.x += push.x;
      this.player.y += push.y;
    }
  }

  /**
   * Arena hazard entities — currently Blaze Man's falling rocks.
   *
   * They crumble on the floor OR on a platform, leaving Hot where they land, and
   * deal a real hit plus Burn if they catch you on the way down.
   */
  stepArenaHazards(box) {
    const a = this.arena;
    for (let i = a.hazards.length - 1; i >= 0; i--) {
      const h = a.hazards[i];
      h.y += h.vy;

      const hitPlayer = this.run.invuln === 0
        && box.x < h.x + h.w && box.x + box.w > h.x
        && box.y < h.y + h.h && box.y + box.h > h.y;
      if (hitPlayer) {
        this.hurt(h.x + h.w / 2, FEEL.hazardDamage);
        Attr.applyStatus(this.status, 'burn', FEEL.burnFrames);
        a.hazards.splice(i, 1);
        continue;
      }

      // Crumble on the first surface it meets.
      let landed = h.y + h.h >= a.floorY ? a.floorY : null;
      for (const pl of a.platforms) {
        if (!pl.on) continue;
        if (h.x + h.w > pl.x && h.x < pl.x + pl.w
          && h.y + h.h >= pl.y && h.y + h.h <= pl.y + pl.h + h.vy + 1) {
          landed = pl.y;
          pl.hot = FEEL.hotLingerFrames;
          break;
        }
      }
      if (landed !== null) {
        // A rock leaves a rock-wide scorch — see surfacePatch for why the
        // footprint is derived rather than padded.
        Attr.addPatch(a.patches,
          Attr.surfacePatch('hot', h.x, h.w, landed, FEEL.hotLingerFrames));
        a.hazards.splice(i, 1);
      }
    }
  }

  stepBullets() {
    const r = this.run;
    const pcx = this.player.x + 12, pcy = this.player.y + 12;
    const spawned = [];

    for (const b of this.bullets) {
      // Mild auto-aim: steer the velocity toward the player rather than
      // snapping to them, so a homing shot can still be out-manoeuvred.
      if (b.homing) {
        const dx = pcx - b.x, dy = pcy - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = Math.hypot(b.vx, b.vy) || 1;
        b.vx += (dx / d) * sp * b.homing;
        b.vy += (dy / d) * sp * b.homing;
        const ns = Math.hypot(b.vx, b.vy) || 1;
        b.vx = (b.vx / ns) * sp;
        b.vy = (b.vy / ns) * sp;
      }
      // Ballistic shots: gravity, a bounce off the floor, and a climb up the
      // sealed walls. Blaze Man's fireballs are the reason all three exist —
      // "bouncing fireballs that climb up walls and leave hot trails".
      if (b.gravity) b.vy += b.gravity;
      b.x += b.vx; b.y += b.vy; b.life--;

      if (b.bounce || b.crawls) {
        const floor = this.arena ? this.arena.floorY : GROUND_Y;
        if (b.y + b.radius >= floor) {
          b.y = floor - b.radius;
          if (b.hot && this.arena) {
            // The trail is the width of the fireball that left it, not a fixed
            // 16px stamp under a 6px shot.
            Attr.addPatch(this.arena.patches,
              Attr.surfacePatch('hot', b.x - b.radius, b.radius * 2, floor, b.hot));
          }
          if (b.crawls) {
            // Tempest Man's water keeps travelling along the floor until it
            // reaches a drain, rather than stopping where it lands.
            b.vy = 0; b.gravity = 0;
            const d = this.arena?.drain;
            if (d && b.x > d.x && b.x < d.x + d.w) b.life = -1;
          } else {
            b.vy = -Math.abs(b.vy) * b.bounce;
            if (Math.abs(b.vy) < 0.6) b.vy = -0.6;   // never settle into a crawl
          }
        }
      }
      if (b.climbs && this.arena) {
        // At a wall the fireball turns and runs UP it instead of dying.
        if (b.x - b.radius <= this.arena.x0) { b.x = this.arena.x0 + b.radius; b.vx = 0; b.vy = -1.6; b.gravity = 0.02; }
        if (b.x + b.radius >= this.arena.x1) { b.x = this.arena.x1 - b.radius; b.vx = 0; b.vy = -1.6; b.gravity = 0.02; }
      }

      // Split after a delay into a fan of smaller, mildly homing fragments.
      if (b.splitIn !== undefined && --b.splitIn <= 0) {
        b.life = -1;
        const n = b.splitCount || 3;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
          spawned.push({
            ...b,
            x: b.x, y: b.y,
            vx: Math.cos(a) * (b.splitSpeed || 1.5),
            vy: Math.sin(a) * (b.splitSpeed || 1.5),
            radius: b.splitRadius || 2.5,
            homing: b.splitHoming || 0,
            splitIn: undefined, life: 240,
          });
        }
      }
    }
    if (spawned.length) this.bullets.push(...spawned);

    // enemy shots hitting the player — nothing did this before, so a boss
    // could not actually land a hit no matter what it fired
    const pbox = Phys.hitboxOf(this.player);
    for (const b of this.bullets) {
      if (!b.enemy || b.life <= 0) continue;
      if (!Phys.overlaps(this.bulletBox(b), pbox)) continue;

      // A pressure shot PUSHES instead of hurting and does not expire on
      // contact — Tempest Man's water is an obstacle, not a bullet.
      if (b.push) {
        this.player.x += Math.sign(b.vx || 1) * b.push;
        continue;
      }
      b.life = -1;
      if (r.invuln === 0) {
        this.hurt(b.x, b.damage || 1);
        if (b.burn) Attr.applyStatus(this.status, 'burn', b.burn);
      }
    }

    // Shots flagged `blocks` eat player fire, so cover matters.
    for (const w of this.bullets) {
      if (!w.blocks || w.life <= 0) continue;
      const wb = this.bulletBox(w);
      for (const b of this.bullets) {
        if (b.enemy || b.life <= 0) continue;
        if (Phys.overlaps(this.bulletBox(b), wb)) b.life = -1;
      }
    }

    // minion damage
    for (const b of this.bullets) {
      if (b.enemy || b.life <= 0) continue;
      const box = this.bulletBox(b);
      for (const e of this.minions) {
        if (e.hp <= 0) continue;
        if (Phys.overlaps(box, { x: e.x, y: e.y, w: e.w, h: e.h })) {
          e.hp -= b.damage;
          b.life = -1;
          if (e.hp <= 0) this.killMinion(e);
          break;
        }
      }
    }

    // BOSS DAMAGE.
    //
    // killBoss() nulls this.boss, so the loop MUST stop the moment it fires.
    // It used to keep going, and the next bullet overlapping the boss on that
    // same frame dereferenced null — which threw out of update() and killed
    // Phaser's game loop, freezing the whole game on the frame the boss died.
    //
    // It needed two bullets landing on one frame to happen, so the buster almost
    // never triggered it and a multi-projectile weapon (Swarm Caller fires three)
    // triggered it most times. Any early-out inside a loop over `bullets` that
    // can clear `this.boss` needs the same treatment.
    if (this.boss) {
      const bb = { x: this.boss.x, y: this.boss.y, w: this.boss.w, h: this.boss.h };
      for (const b of this.bullets) {
        if (b.enemy || b.life <= 0) continue;
        if (!Phys.overlaps(this.bulletBox(b), bb)) continue;
        this.boss.hp -= b.damage;
        b.life = -1;
        if (this.boss.hp <= 0) { this.killBoss(); break; }
      }
    }
    this.bullets = this.bullets.filter(
      (b) => b.life > 0 && b.x > this.cam.x - 40 && b.x < this.cam.x + this.viewW + 40,
    );
  }

  // ── Minions ─────────────────────────────────────────────────────────
  stepMinions(box) {
    const r = this.run;

    // NO AMBIENT MINIONS DURING A BOSS FIGHT. A boss arena is sealed: the only
    // enemies in it are the boss and anything its own moveset summons (which
    // comes from data/bossFights.js, not from here). The ambient stream resumes
    // when the fight ends.
    if (this.boss) return;

    // Spawn cadence tightens with the difficulty step, which is keyed to
    // elapsed time — camping does not slow this down.
    if (--this.spawnTimer <= 0) {
      this.spawnTimer = Minions.spawnIntervalFrames(Minions.difficultyStep(r.frame));
      if (this.minions.length < FEEL.maxMinions) {
        const m = Minions.trySpawn(this.world, this.cam.x, this.viewW, r.frame, GROUND_Y);
        if (m) this.minions.push(m);
      }
    }

    Minions.stepMinions(this.minions, this.world, this.player, GROUND_Y);

    for (const e of this.minions) {
      if (r.invuln === 0 && Phys.overlaps(box, { x: e.x, y: e.y, w: e.w, h: e.h })) {
        this.hurt(e.x + e.w / 2);
      }
    }
    this.minions = Minions.pruneMinions(this.minions, this.cam.x);
  }

  killMinion(e) {
    const r = this.run;
    sfx('enemyDie');
    r.kills++;
    r.combo = Math.min(r.combo + 1, FEEL.comboMax);
    r.maxCombo = Math.max(r.maxCombo, r.combo);
    r.comboTimer = Math.round(FEEL.comboDecayFrames * r.comboDecayMult);
    const base = e.elite ? FEEL.scoreElite : FEEL.scoreMinion;
    r.score += Math.round((base + r.combo * FEEL.scoreComboStep) * r.scoreMult);
    this.pickups.push(...Pickups.dropsFor(
      e.elite ? 'elite' : 'minion', e.x + e.w / 2 - 3, e.y + e.h / 2, r.luckMult,
    ));
    e.hp = 0; // pruned at the end of the step
  }

  // ── Pickups ─────────────────────────────────────────────────────────
  stepPickups(box) {
    const r = this.run;
    const got = Pickups.stepPickups(
      this.pickups, this.player, box, GROUND_Y, this.world, r.magnetMult,
    );
    for (const p of got) {
      if (p.type === 'etank') {
        sfx('pickupTank');
        r.hp = Math.min(FEEL.hpMax + r.hpBonus + r.runHpBonus, r.hp + FEEL.pickupHeal);
      } else {
        sfx('pickupExp');
        this.gainExp(p.amount || 0);
      }
    }
    this.pickups = Pickups.prunePickups(this.pickups, this.cam.x);
  }

  // ── Bosses ──────────────────────────────────────────────────────────
  spawnBoss(def, layer) {
    const h = Math.round(24 * def.scale);
    const w = Math.round(h * 0.75);
    const hp = Math.round(def.baseHp * (1 + (layer - 1) * FEEL.bossLayerHpMult));
    // The arena floor is solid wall to wall — no pits in a boss room.
    this.world.groundSpans = [{ x1: -40, x2: this.viewW + 40 }];
    this.world.spikes = [];
    this.world.platforms = [];
    const fight = fightFor(def.id, layer);
    this.boss = {
      ...def, layer, hp, maxHp: hp,
      x: this.viewW - w - 24, y: GROUND_Y - h, w, h,
      anim: 0, state: 'enter',
      fight,
      fs: null, // attack-loop state, owned by data/bossFights.js
      hs: null, // hazard-loop state
    };
  }

  stepBoss() {
    const b = this.boss;
    if (!b) return;
    b.anim++;
    if (b.state === 'enter') {
      const tx = this.cam.x + this.viewW * 0.6 - b.w / 2;
      b.x += (tx - b.x) * 0.055;
      if (Math.abs(b.x - tx) < 1) { b.x = tx; b.state = 'idle'; }
      return;
    }
    if (!b.fight?.attack) b.x += Math.sin(b.anim * 0.018) * 0.2; // idle drift only

    // TWO CONCURRENT LOOPS, always layer-synced. They run independently on
    // their own timers — the hazard loop keeps firing no matter what the boss
    // itself is doing, which is the whole point of having both.
    this.stepFight(b, 'attack');
    this.stepFight(b, 'hazard');

    // contact damage
    const box = Phys.hitboxOf(this.player);
    if (this.run.invuln === 0 && Phys.overlaps(box, { x: b.x, y: b.y, w: b.w, h: b.h })) {
      this.hurt(b.x + b.w / 2);
    }
  }

  /**
   * Advance one of the boss's two loops. Called every frame so a boss can
   * patrol, telegraph and fire in sequence rather than teleporting between
   * cooldowns. A loop with no behaviour for this layer simply does nothing —
   * see the null entries in data/bossFights.js.
   */
  stepFight(b, kind) {
    const beh = b.fight?.[kind];
    if (!beh) return;
    beh.step({
      boss: b,
      player: this.player,
      playerBox: Phys.hitboxOf(this.player),
      layer: b.layer,
      arena: this.arena,
      floorY: GROUND_Y,
      shoot: (spec) => this.spawnEnemyShot(spec),
      shake: (mag, dur) => {
        this.shake = { mag, dur, t: dur };
        // Stretch the rumble to EXACTLY the shake it is announcing, and drop its
        // pitch further as the shake gets heavier so a bigger tell sounds bigger.
        //
        // 96 is not arbitrary: the base rumble is 1.6s, `dur` is in frames, so
        // dur/60/1.6 = dur/96 makes the sound and the shake start and stop
        // together. They are one telegraph and must not disagree about when it
        // is over.
        sfx('rumble', { dur: Math.max(0.7, dur / 96), pitch: mag >= 3 ? 0.72 : 0.9 });
      },
      hurt: (x, dmg) => { if (this.run.invuln === 0) this.hurt(x, dmg); },
      status: (id, frames) => Attr.applyStatus(this.status, id, frames),
      patch: (id, x, y, w, h, frames, opts = {}) => {
        if (!this.arena) return;
        Attr.addPatch(this.arena.patches,
          Object.assign(Attr.makePatch(id, x, y, w, h, frames, 'boss'), opts));
      },
      // The walkable span: the sealed arena's inner walls during a fight, the
      // camera view otherwise (a boss met outside an arena still has somewhere
      // to patrol). Every behaviour is written against bounds, never the camera.
      bounds: this.arena
        ? { x0: this.arena.x0 + 16, x1: this.arena.x1 - 16 }
        : { x0: this.cam.x + 16, x1: this.cam.x + this.viewW - 16 },
    });
  }

  /** A projectile owned by a boss or hazard. Enemy shots use the stingy pad. */
  spawnEnemyShot(spec) {
    this.bullets.push({
      vy: 0, life: 300, charged: false, weapon: null,
      ...spec,
      enemy: true,
    });
  }

  killBoss() {
    const b = this.boss;
    sfx('bossDie');
    this.run.kills++;
    this.run.score += Math.round((500 + this.run.combo * 100) * this.run.scoreMult);
    this.run.bossesDefeated.push(b.id);
    this.pickups.push(...Pickups.dropsFor(
      'boss', b.x + b.w / 2 - 3, b.y + b.h / 2, this.run.luckMult,
    ));
    recordBossKill(b.id);
    // THE weapon unlock: this is the only way a special enters the run.
    if (b.dropWeapon && !this.run.unlocked.has(b.dropWeapon)) {
      this.run.unlocked.add(b.dropWeapon);
      this.run.wpLevels[b.dropWeapon] = 1;
      this.run.justUnlocked = b.dropWeapon;   // UIScene surfaces this
    }
    // The elemental death animation, fade and palette-swap reveal land in this
    // boss's own element slice — see the plan in CLAUDE.md.
    // The WRAP DOOR out only exists once the boss is down.
    this.world.doors = [{
      x: this.viewW / 2 - 8, y: GROUND_Y, w: 16, h: 28, alive: true, wrap: true,
    }];
    this.boss = null;
  }

  // ── Damage / death ──────────────────────────────────────────────────
  hurt(sourceX, amount = 1) {
    const r = this.run, p = this.player;
    if (r.invuln > 0) return;
    r.hp -= amount;
    // DEV: the hit lands in full — flinch, knockback and i-frames all apply —
    // it just cannot finish you.
    if (dev('hpFloor')) r.hp = Math.max(1, r.hp);
    r.invuln = FEEL.invulnFrames + r.armorBonus;
    sfx('hurt');
    r.combo = 1; r.comboTimer = 0;
    p.hitAnim = 20;
    p.flinchTimer = FEEL.flinchFrames;
    const dir = Math.sign(p.x + 12 - sourceX) || -p.facing || 1;
    p.knockbackVx = dir * FEEL.knockbackSpeed;
    p.vy = Math.min(p.vy, -1.6);
    if (r.hp <= 0) {
      if (r.revivesLeft > 0) { r.revivesLeft--; r.hp = 3; r.invuln = 150; }
      else this.die();
    }
  }

  /**
   * Begin the hazard beam: straight up and off the top of the screen, then back
   * down at the leftmost safe spot on screen. Control is suspended throughout.
   */
  beamOut() {
    sfx('beam');
    const p = this.player;
    if (p.beam) return;                       // already going
    p.beam = { phase: 'up' };
    p.vx = 0; p.vy = 0;
    p.sliding = false;
    p.flinchTimer = 0; p.knockbackVx = 0;     // the beam overrides the hit reaction
    this.intent.moveDir = 0;
    this.intent.jumpHeld = false;
    this.intent.fireHeld = false;
  }

  stepBeam() {
    const p = this.player;
    if (p.beam.phase === 'up') {
      p.y -= FEEL.beamSpeed;
      if (p.y < -32) {
        p.beam.phase = 'down';
        p.x = this.findBeamSpot();
        p.y = -32;
      }
      return;
    }
    p.y += FEEL.beamSpeed;
    const rest = GROUND_Y - 24;
    if (p.y >= rest) {                        // touchdown
      p.y = rest;
      p.vx = 0; p.vy = 0;
      p.onGround = true;
      p.beam = null;
    }
  }

  /**
   * Leftmost on-screen spot where the player would stand clear of a wall, a
   * spike and a pit. Scans from the left edge rightward and takes the first
   * that works, so you are always put back as far behind as is survivable
   * rather than skipped past the hazard you just failed.
   */
  findBeamSpot() {
    const x0 = this.arena ? this.arena.x0 + 4 : this.cam.x + 4;
    const x1 = (this.arena ? this.arena.x1 : this.cam.x + this.viewW) - 28;
    for (let x = x0; x <= x1; x += 4) if (this.isSafeSpot(x)) return x;

    // Nothing on screen is safe. Rather than beam into a pit, lay down footing.
    const fallback = Math.max(x0, this.cam.x + 40);
    this.world.groundSpans.push({ x1: fallback - 16, x2: fallback + 64 });
    this.world.spikes = this.world.spikes.filter(
      (s) => s.x + s.w < fallback - 16 || s.x > fallback + 64,
    );
    return fallback;
  }

  /** Would the player standing at this x be clear of ground gaps and spikes? */
  isSafeSpot(x) {
    const hb = FEEL.playerHitbox;
    const box = { x: x + hb.offX, y: GROUND_Y - 24 + hb.offY, w: hb.w, h: hb.h };
    const inset = FEEL.groundProbeInset;
    if (!Phys.isOverGround(this.world, box.x + inset)) return false;
    if (!Phys.isOverGround(this.world, box.x + box.w - inset)) return false;
    if (!Phys.isOverGround(this.world, x + 12)) return false;
    for (const s of this.world.spikes) if (Phys.overlaps(box, s)) return false;
    return true;
  }

  die() {
    // The Mega Man 2 death burst replaces this during the finishing passes.
    save.runs++;
    save.dist += Math.floor(this.run.dist);
    if (this.run.score > save.hi) save.hi = this.run.score;
    // Itemised so the results screen can show the conversion rather than just
    // a number that appeared from nowhere.
    const earned = chipsBreakdown(
      this.run.score, this.run.bossesDefeated.length, this.run.chipGainMult,
    );
    this.run.chipsEarned = earned;
    save.chips += earned.total;
    persist();
    this.scene.stop('UI');
    this.scene.start('Title', { died: true, run: this.run });
  }

  // ── Progression ─────────────────────────────────────────────────────
  gainExp(amount) {
    const r = this.run;
    r.exp += amount;
    while (r.exp >= r.expToNext) {
      r.exp -= r.expToNext;
      r.level++;
      r.expToNext = FEEL.expPerLevel;
      // Queue a card screen rather than showing it here: a single big orb can
      // grant several levels at once, and each one deserves its own choice.
      r.pendingLevelUps++;
      sfx('levelUp');
    }
    if (r.pendingLevelUps > 0) this.paused = true;
  }

  // ── Player actions (called by UIScene and keyboard) ─────────────────
  /**
   * Jump is a HELD input, not a tap: physics reads `jumpHeld` every step to
   * decide whether to cut the rise short. Nothing used to set it, which meant
   * the cut fired on literally every jump and variable jump height — the genre
   * signature this engine is built around — never actually worked.
   */
  doJump() {
    this.intent.jumpHeld = true;
    // Only sound a jump that actually leaves the ground. A buffered press while
    // airborne may never become a jump at all.
    const kind = Phys.requestJump(this.player);
    if (kind === 'jump' || kind === 'airdash') sfx('jump');
  }
  endJump() { this.intent.jumpHeld = false; }

  toggleSlide() {
    const r = this.run;
    if (this.player.sliding) { Phys.cancelSlide(this.player); return; }
    const started = Phys.startSlide(this.player, {
      rank: r.slideRank,             // rank 0 refuses outright — no slide yet
      durMult: r.slideDurMult,
      speedBonus: r.slideSpeedBonus,
    });
    // Rank 3 turns the slide into a dodge. Granted on the opening frames only,
    // so it rewards sliding INTO danger on purpose rather than parking in one.
    if (started && r.slideIframes > 0) r.invuln = Math.max(r.invuln, r.slideIframes);
  }
  setMove(dir) { this.intent.moveDir = dir; }
  beginFire() { this.intent.fireHeld = true; this.intent.fireStart = performance.now(); }
  endFire() { this.intent.fireHeld = false; this.releaseFire(); }
  selectWeapon(id) {
    if (this.run.unlocked.has(id) || dev('unlockAnyWeapon')) this.run.activeWeapon = id;
  }

  // ── Render ──────────────────────────────────────────────────────────
  /**
   * Everything is drawn through ActorLayers, which resolve each actor to a
   * placeholder shape or to real art from MANIFEST without this file knowing or
   * caring which. Adding art never touches this method.
   */
  draw() {
    const cam = this.cam.x, r = this.run;
    const L = this.layers;
    for (const l of Object.values(L)) l.begin();

    // Screen shake offsets the WORLD, never the HUD. Whole pixels only — the
    // render is integer-scaled, so a fractional offset would shimmer.
    const sh = Arena.shakeOffset(this.shake);
    const theme = this.arena ? this.arena.theme : this.areaTheme;
    L.bg.drawBackground(this.viewW, VIEW_H, cam, theme?.fill ?? 0x060614);

    const g = L.world.g;
    const sx = (wx) => wx - cam + sh.x; // world -> screen, shaken

    if (this.arena) {
      Arena.drawArena(g, this.arena, this.viewW, sh);
      // Falling rocks: a hot core with a darker crust, so they read as burning
      // debris rather than as another grey projectile.
      for (const h of this.arena.hazards) {
        g.fillStyle(0x3A1A10, 1);
        g.fillRect(h.x + sh.x, h.y + sh.y, h.w, h.h);
        g.fillStyle(0xE8541A, 1);
        g.fillRect(h.x + 2 + sh.x, h.y + 2 + sh.y, h.w - 4, h.h - 4);
        g.fillStyle(0xFFC24A, 1);
        g.fillRect(h.x + 4 + sh.x, h.y + 4 + sh.y, h.w - 8, h.h - 8);
      }
    } else {
    // ground spans; the gaps between them are the pits
    for (const s of this.world.groundSpans) {
      if (s.x2 < cam - 8 || s.x1 > cam + this.viewW + 8) continue;
      g.fillStyle(0x0a1628, 1);
      g.fillRect(sx(s.x1), GROUND_Y, s.x2 - s.x1, VIEW_H - GROUND_Y);
      g.fillStyle(0x1a3050, 1);
      g.fillRect(sx(s.x1), GROUND_Y, s.x2 - s.x1, 2);
    }
    for (const s of this.world.spikes) {
      g.fillStyle(0xc0c0c8, 1);
      const n = Math.max(1, Math.round(s.w / 5));
      for (let i = 0; i < n; i++) {
        const tx = sx(s.x + i * (s.w / n));
        g.fillTriangle(tx, s.y + s.h, tx + s.w / n / 2, s.y, tx + s.w / n, s.y + s.h);
      }
    }
    for (const p of this.world.platforms) {
      g.fillStyle(0x1a3a60, 1);
      g.fillRect(sx(p.x), p.y, p.w, p.h);
    }
    }

    // Doors exist in both spaces: the boss door in an area, the wrap door out
    // of an arena. The wrap door is gold-cored to read as an exit, not a threat.
    for (const d of this.world.doors) {
      g.fillStyle(0xf5d328, 0.6 + 0.4 * Math.sin(r.frame * 0.08));
      g.fillRect(sx(d.x) - 2, d.y - d.h - 2 + sh.y, d.w + 4, d.h + 4);
      g.fillStyle(d.wrap ? 0xf5d328 : 0x5cadd5, 1);
      g.fillRect(sx(d.x), d.y - d.h + sh.y, d.w, d.h);
    }

    for (const p of this.pickups) {
      const style = Pickups.PICKUP_STYLE[p.type];
      L.pickups.draw(
        { ...p, id: `pickup:${p.type}`, x: sx(p.x), palette: style },
        (gg, a) => drawPickup(gg, a, style, r.frame),
      );
    }

    for (const e of this.minions) {
      L.minions.draw({
        id: e.id, x: sx(e.x), y: e.y, w: e.w, h: e.h,
        facing: Math.sign(e.vx) || 1,
        clip: e.def.kind === 'ground' ? 'walk' : 'fly',
        palette: {
          primary: e.def.primary,
          secondary: e.def.secondary,
          // elites keep their palette but take a gold rim — size alone is not a
          // reliable tell once the ramp has been running for a while
          outline: e.elite ? ELITE_OUTLINE : e.def.outline,
        },
      });
    }

    for (const b of this.bullets) {
      const cx = sx(b.x);
      L.bullets.draw(
        {
          ...b, id: `shot:${b.weapon}`,
          x: cx - b.radius, y: b.y - b.radius, w: b.radius * 2, h: b.radius * 2,
          facing: Math.sign(b.vx) || 1,
          palette: { primary: b.color, secondary: b.color },
        },
        (gg, a) => drawProjectile(gg, { ...a, x: cx, y: b.y }, r.frame),
      );
    }

    if (this.boss) {
      const b = this.boss;
      L.boss.draw({
        id: b.id, x: sx(b.x), y: b.y, w: b.w, h: b.h,
        facing: -1, clip: b.state,
        palette: { primary: b.primary, secondary: b.secondary, outline: b.outline },
      });
    }

    // player — flashes while invulnerable
    if (!(r.invuln > 0 && Math.floor(r.frame / 3) % 2 === 0)) {
      const p = this.player;
      L.player.draw({
        id: 'player',
        x: sx(p.x), y: p.y + (p.sliding ? 12 : 0),
        w: 24, h: p.sliding ? 12 : 24,
        facing: p.facing,
        clip: p.sliding ? 'slide' : !p.onGround ? 'jump' : p.vx !== 0 ? 'run' : 'idle',
        // live palette swap: the suit takes the equipped weapon's colours
        palette: weaponOf(r.activeWeapon).palette,
      });
      // An active attribute flashes its colour over the suit. Flashing rather
      // than tinting keeps the weapon's own palette readable underneath, which
      // matters because the palette is how you know what you have equipped.
      const tint = Attr.statusTint(this.status);
      if (tint !== null && Math.floor(r.frame / 4) % 2 === 0) {
        L.player.g.fillStyle(tint, 0.45);
        L.player.g.fillRect(sx(p.x), p.y + (p.sliding ? 12 : 0), 24, p.sliding ? 12 : 24);
      }
    }

    for (const l of Object.values(L)) l.end();
  }
}
