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
import { FIXED_DT, MAX_STEPS_PER_FRAME, VIEW_H, DEPTH } from '../config/display.js';
import { FEEL } from '../config/feel.js';
import { dev } from '../config/dev.js';
import { BOSSES, BOSS_BY_ID, makeBossBag, bossLayer } from '../data/bosses.js';
import { WEAPONS, NULL_WEAPON, weaponOf, BUSTER_ID, damageAtLevel } from '../data/weapons.js';
import { UPGRADES, applyUpgrades, chipsBreakdown } from '../data/upgrades.js';
import { save, persist, recordBossKill } from '../systems/save.js';
import { ELITE_OUTLINE } from '../data/minions.js';
import * as Terrain from '../systems/terrain.js';
import * as Phys from '../systems/physics.js';
import * as Minions from '../systems/minions.js';
import * as Pickups from '../systems/pickups.js';
import {
  ActorLayer, drawProjectile, drawPickup, projectileHalfHeight,
} from '../systems/assets.js';

const GROUND_Y = VIEW_H - 40; // leaves room for the on-screen controls

/** Copy of an array in random order. Used for the arsenal head start. */
const shuffled = (arr) => [...arr].sort(() => Math.random() - 0.5);

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.viewW = this.scale.gameSize.width;
    this.acc = 0;
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
    this.intent = { moveDir: 0, jumpHeld: false, fireHeld: false, fireStart: 0 };
    Terrain.generate(this.world, 0, this.viewW);
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

    Phys.stepPlayer(p, this.world, { moveDir, jumpHeld: this.intent.jumpHeld }, GROUND_Y);
    this.cam.x = Phys.stepCamera(this.cam, p, this.viewW);
    if (p.x < this.cam.x) p.x = this.cam.x; // never walk off the left edge

    // distance is real rightward progress, used for EXP and stats
    // Distance is a stat only. It grants no EXP — walking right is not progress
    // on its own, you have to kill things and go pick up what they drop.
    r.dist = Math.max(r.dist, (p.x - 80) / 8);

    // hazards: pits and spikes are instant death
    if (p.y > VIEW_H + 24) {
      if (!dev('pitImmunity')) return this.die();
      this.respawnOnGround();
    }
    const box = Phys.hitboxOf(p);
    if (!dev('spikeImmunity')) {
      for (const s of this.world.spikes) if (Phys.overlaps(box, s)) return this.die();
    }

    Terrain.generate(this.world, this.cam.x, this.viewW);
    Terrain.maybeSpawnDoor(this.world, this.cam.x, this.viewW, r.frame);
    Terrain.prune(this.world, this.cam.x);

    // walking into a door starts the boss fight
    for (const d of this.world.doors) {
      if (d.alive && Phys.overlaps(box, { x: d.x, y: d.y - d.h, w: d.w, h: d.h })) {
        d.alive = false;
        this.spawnBoss();
      }
    }

    if (r.invuln > 0) r.invuln--;
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

  stepBullets() {
    for (const b of this.bullets) { b.x += b.vx; b.y += b.vy; b.life--; }

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

    // boss damage
    if (this.boss) {
      const bb = { x: this.boss.x, y: this.boss.y, w: this.boss.w, h: this.boss.h };
      for (const b of this.bullets) {
        if (b.enemy || b.life <= 0) continue;
        if (Phys.overlaps(this.bulletBox(b), bb)) {
          this.boss.hp -= b.damage;
          b.life = -1;
          if (this.boss.hp <= 0) this.killBoss();
        }
      }
    }
    this.bullets = this.bullets.filter(
      (b) => b.life > 0 && b.x > this.cam.x - 40 && b.x < this.cam.x + this.viewW + 40,
    );
  }

  // ── Minions ─────────────────────────────────────────────────────────
  stepMinions(box) {
    const r = this.run;

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
        r.hp = Math.min(FEEL.hpMax + r.hpBonus + r.runHpBonus, r.hp + FEEL.pickupHeal);
      } else {
        this.gainExp(p.amount || 0);
      }
    }
    this.pickups = Pickups.prunePickups(this.pickups, this.cam.x);
  }

  // ── Bosses ──────────────────────────────────────────────────────────
  spawnBoss() {
    const def = this.nextBoss();
    const layer = bossLayer(save, def.id);
    const h = Math.round(24 * def.scale);
    const w = Math.round(h * 0.75);
    const hp = Math.round(def.baseHp * (1 + (layer - 1) * FEEL.bossLayerHpMult));
    // guarantee footing for the arena even if a pit generated here
    this.world.groundSpans.push({ x1: this.cam.x - 40, x2: this.cam.x + this.viewW + 40 });
    this.boss = {
      ...def, layer, hp, maxHp: hp,
      x: this.cam.x + this.viewW + w, y: GROUND_Y - h, w, h,
      anim: 0, state: 'enter',
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
    // PHASE 2/3: bosses are placeholder presences — they enter, drift, and can
    // be damaged, but do not attack.
    //
    // PHASES 6-8 fill this in as TWO CONCURRENT LOOPS that are always
    // layer-synced (a layer-2 boss uses layer-2 hazards AND layer-2 attacks):
    //   1. an ambient ARENA HAZARD timer, elementally themed
    //   2. the boss's own ATTACK state machine
    // Read design/boss-design-tracker.html before implementing either.
    b.x += Math.sin(b.anim * 0.018) * 0.2;

    // contact damage
    const box = Phys.hitboxOf(this.player);
    if (this.run.invuln === 0 && Phys.overlaps(box, { x: b.x, y: b.y, w: b.w, h: b.h })) {
      this.hurt(b.x + b.w / 2);
    }
  }

  killBoss() {
    const b = this.boss;
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
    // PHASE 5 adds the elemental death animation, fade, palette-swap reveal.
    this.boss = null;
  }

  // ── Damage / death ──────────────────────────────────────────────────
  hurt(sourceX) {
    const r = this.run, p = this.player;
    if (r.invuln > 0) return;
    if (dev('unlimitedHp')) return;
    r.hp--;
    r.invuln = FEEL.invulnFrames + r.armorBonus;
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

  /** DEV ONLY — drop the player back onto the nearest ground ahead of the camera. */
  respawnOnGround() {
    const p = this.player;
    for (let x = this.cam.x + 40; x < this.cam.x + this.viewW + 200; x += 8) {
      if (Phys.isOverGround(this.world, x)) {
        p.x = x;
        p.y = GROUND_Y - 24;
        p.vx = 0; p.vy = 0;
        return;
      }
    }
    // No ground generated yet — guarantee some rather than falling forever.
    this.world.groundSpans.push({ x1: this.cam.x + 40, x2: this.cam.x + 140 });
    p.x = this.cam.x + 60;
    p.y = GROUND_Y - 24;
    p.vx = 0; p.vy = 0;
  }

  die() {
    // PHASE 5 replaces this with the Mega Man 2 death burst + results screen.
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
  doJump() { this.intent.jumpHeld = true; Phys.requestJump(this.player); }
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

    L.bg.drawBackground(this.viewW, VIEW_H, cam, 0x060614);

    const g = L.world.g;
    const sx = (wx) => wx - cam; // world -> screen

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
    for (const d of this.world.doors) {
      g.fillStyle(0xf5d328, 0.6 + 0.4 * Math.sin(r.frame * 0.08));
      g.fillRect(sx(d.x) - 2, d.y - d.h - 2, d.w + 4, d.h + 4);
      g.fillStyle(0x5cadd5, 1);
      g.fillRect(sx(d.x), d.y - d.h, d.w, d.h);
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
    }

    for (const l of Object.values(L)) l.end();
  }
}
