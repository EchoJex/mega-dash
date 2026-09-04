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
import {
  FIXED_DT, MAX_STEPS_PER_FRAME, VIEW_H, DEPTH, viewWidthOf, PLAYER_PALETTE,
} from '../config/display.js';
import { fitCamera } from '../systems/text.js';
import { FEEL } from '../config/feel.js';
import { dev, DEV, layerFor } from '../config/dev.js';
import { BOSSES, BOSS_BY_ID, PLAYABLE_BOSSES, makeBossBag, bossLayer } from '../data/bosses.js';
import {
  WEAPONS, NULL_WEAPON, weaponOf, SIDEARM_ID, damageAtLevel, classOf, hasLadder,
  elementOf,
} from '../data/weapons.js';
import { UPGRADES, applyUpgrades, chipsBreakdown } from '../data/upgrades.js';
import { save, persist, recordBossKill } from '../systems/save.js';
import { ELITE_OUTLINE } from '../data/minions.js';
import { fightFor } from '../systems/bossFights.js';
import * as Terrain from '../systems/terrain.js';
import * as Phys from '../systems/physics.js';
import * as Minions from '../systems/minions.js';
import * as Pickups from '../systems/pickups.js';
import * as Arena from '../systems/arena.js';
import * as Death from '../systems/bossDeath.js';
import * as Attr from '../systems/attributes.js';
import * as Loadout from '../systems/loadout.js';
import * as Wpn from '../systems/weaponry.js';
import { sfx } from '../systems/sfx.js';
import { areaRng, seedFromLocation } from '../systems/rng.js';
import { setCrashContext } from '../systems/crash.js';
import {
  ActorLayer, drawProjectile, drawPickup, projectileHalfHeight, drawBossRig,
  playerClip,
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
    /**
     * A PLAYTESTER ONLY MEETS CONTENT THAT HAS BEEN DEVELOPED. Dev mode draws
     * from all seventeen because testing the unbuilt is what it is for; the
     * shipped branch draws only from the bosses that actually fight. See
     * PLAYABLE_BOSSES — it is derived from the fight table, so this needs no
     * edit when a boss gains his attack loop.
     */
    this.nextBoss = makeBossBag(DEV.enabled ? BOSSES : PLAYABLE_BOSSES());
    this.startRun();

    /**
     * KEYBOARD — the owner's layout, from the tracker's `keyboard` field.
     *
     *   A / D          walk            SPACE    jump (double-tap to slide)
     *   W              aim up          RSHIFT   fire
     *   arrows         walk (kept)     Q / E    open the in-situ wheel
     *   ESC / ENTER    pause           ESC      close a wheel
     *
     * JUMP AND FIRE SWAPPED SIDES, and the swap is the point. Space is the
     * biggest key on the board and jumping is the input this genre asks for
     * most often, so the two belong together; fire moves under the same little
     * finger that used to jump. Everything the old layout is remembered by —
     * "shift jumps" — is now wrong, which is why nothing accepts both.
     *
     * S NO LONGER SLIDES. The field lists no slide key, because the slide is
     * "double tap jump to cancel into a slide" on a keyboard exactly as it is
     * under a thumb: `doJump` owns that window and always has, so the keyboard
     * gets the gesture for free the moment jump moves onto a key a person will
     * actually double-tap. One rule on both surfaces, one place to tune it.
     *
     * EITHER SHIFT FIRES. The field names RSHIFT and that is the one the
     * tracker documents; left shift is accepted too because nothing else in
     * the game claims it, and a modifier that silently does nothing is a worse
     * outcome than one that does the obvious thing. Phaser has no LSHIFT/RSHIFT
     * event either — both arrive as `keydown-SHIFT` — so refusing the left one
     * would mean reading `location` off the native event to turn a working key
     * into a dead one.
     *
     * ARROWS STILL WALK. They are the only binding a person can find without
     * being told, and the boss-defeat picker uses left/right for its cursor —
     * so removing them would make the one screen that needs discovering the
     * one screen with no obvious controls.
     *
     * The `if (!held)` guards matter: browsers repeat keydown while a key is
     * held, and without them a held jump would burn the double jump instantly
     * and a held fire would re-stamp `fireStart` so no charge could ever build.
     */
    this.input.keyboard.on('keydown-SPACE', () => {
      // The jump key is the post-boss wheel's other exit while it is up —
      // checked before the jump so leaving the menu never also launches the
      // player.
      const ui = this.scene.get('UI');
      if (ui?.mode === 'open') { ui.closeWheel(); return; }
      if (ui?.pausePanel || ui?.cards) return;
      if (!this.intent.jumpHeld) this.doJump();
    });
    this.input.keyboard.on('keyup-SPACE', () => this.endJump());
    this.input.keyboard.on('keydown-SHIFT', () => {
      // The post-boss wheel borrows the fire key as its confirm, so firing
      // stands down while it is up. Both handlers are bound to the same key and
      // both run; without this, confirming a swap also queued a shot for the
      // frame the game resumed on.
      const ui = this.scene.get('UI');
      if (ui?.mode === 'open' || ui?.pausePanel || ui?.cards) return;
      if (!this.intent.fireHeld) this.beginFire();
    });
    /**
     * THE RELEASE HAS TO STAND DOWN WHEREVER THE PRESS DID.
     *
     * The keydown above declines to `beginFire()` while a wheel, the pause menu
     * or a card screen is up. The keyup did not decline to `endFire()`, so a
     * release with no matching press still set `fireReleased` — and only step()
     * clears that, which a paused game does not run.
     *
     * SHIFT is the post-boss wheel's confirm and sits next to the pause key, so
     * this fired constantly: `releaseFire()` measured `now - fireStart` against
     * a `fireStart` from seconds earlier (or 0), decided the shot was fully
     * charged, and spat one out on the frame the game resumed. Exactly the bug
     * the keydown comment above says it fixed — it only fixed half of it.
     */
    this.input.keyboard.on('keyup-SHIFT', () => {
      if (!this.intent.fireHeld) return;
      this.endFire();
    });
    this.keys = this.input.keyboard.addKeys('A,D,W,LEFT,RIGHT');

    /**
     * THE IN-SITU WHEEL ON A KEYBOARD. Q or E opens it; then Q/E/Z/C pick a
     * slot, toggle it and close. The four keys sit in the same 2x2 shape on the
     * board that the modules do on screen — Q above Z on the left, E above C on
     * the right — so the mapping is spatial rather than memorised, exactly like
     * the four diagonals on a touchscreen.
     */
    const SITU_KEYS = { Q: ['offensive', 0], E: ['offensive', 1],
      Z: ['defensive', 0], C: ['defensive', 1] };
    for (const [key, [cls, index]] of Object.entries(SITU_KEYS)) {
      this.input.keyboard.on(`keydown-${key}`, () => {
        const ui = this.scene.get('UI');
        if (!ui) return;
        if (ui.mode === 'situ') ui.situKey(cls, index);
        // Only Q and E open it. Z and C would be a surprise to anyone who
        // pressed them with the wheel down and no way to know what they meant.
        else if (!ui.mode && (key === 'Q' || key === 'E')) ui.beginRequipKey();
      });
    }
    /**
     * THE POST-BOSS WHEEL'S CURSOR. Left/right cycle, fire confirms, and either
     * Esc or the jump key leaves — "repeat until escape key or jump key".
     *
     * Bound here with the other keys rather than inside UIScene because this is
     * where every keyboard binding in the game lives, and a second keyboard
     * owner is how two handlers end up fighting over one key.
     */
    for (const [key, d] of [['LEFT', -1], ['RIGHT', 1], ['A', -1], ['D', 1]]) {
      this.input.keyboard.on(`keydown-${key}`, () => {
        const ui = this.scene.get('UI');
        if (ui?.mode === 'open') ui.cursorStep(d);
        else if (ui?.pausePanel) ui.pauseStep(d);
      });
    }
    for (const [key, d] of [['W', -1], ['UP', -1], ['S', 1], ['DOWN', 1]]) {
      this.input.keyboard.on(`keydown-${key}`, () => {
        // The pause menu is a column, so it takes the vertical pair as well as
        // the horizontal one. Nothing else reads these while it is up.
        const ui = this.scene.get('UI');
        if (ui?.pausePanel) ui.pauseStep(d);
      });
    }
    this.input.keyboard.on('keydown-SHIFT', () => {
      const ui = this.scene.get('UI');
      if (ui?.mode === 'open') ui.cursorPick();
    });

    /**
     * ESC AND ENTER — "Esc or Enter pauses and brings up pause menu. Esc or
     * enter key while Resume is cursored closes and unpauses. Esc closes post
     * boss requip wheel."
     *
     * One key, three jobs, resolved by what is on screen rather than by a mode
     * the player has to track. Esc reads as BACK the whole way down: it leaves
     * a wheel, it steps a pause cursor off ABORT RUN and back onto RESUME
     * before it will close anything, and only then does it unpause. That last
     * step is deliberate — an Esc that closed the menu from wherever the cursor
     * happened to be would make the key next to ABORT RUN the one you press
     * when you want out.
     */
    this.input.keyboard.on('keydown-ESC', () => {
      const ui = this.scene.get('UI');
      if (!ui) return;
      if (ui.mode) { ui.closeWheel(); return; }
      // The exit door's confirmation is a two-button question and Esc is its
      // BACK. Without this it fell through to the pause menu, which would have
      // opened UNDER the confirm panel — both hard-pause, and the pause panel
      // sits at a lower depth, so it would have been invisible and live at once.
      if (this.run.confirmExit) { this.cancelExit(); return; }
      if (ui.pausePanel) { ui.pauseBack(); return; }
      ui.togglePause();
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      const ui = this.scene.get('UI');
      if (!ui || ui.mode) return;
      if (this.run.confirmExit) { this.confirmExit(); return; }
      if (ui.pausePanel) { ui.pauseConfirm(); return; }
      ui.togglePause();
    });

    this.scene.launch('UI', { game: this });
  }

  /** Build a fresh run. Everything here is run-scoped and resets on death. */
  startRun() {
    // Cleared here rather than in create(), because a run can start again
    // without the scene being rebuilt. See the guard in die().
    this.dead = false;
    const run = {
      frame: 0, score: 0, dist: 0, combo: 1, comboTimer: 0,
      exp: 0, level: 1, expToNext: FEEL.expPerLevel, pendingLevelUps: 0,
      hp: FEEL.hpMax, hpBonus: 0, runHpBonus: 0,
      invuln: 0, kills: 0, maxCombo: 1,
      // Set by a hazard beam touchdown: the i-frame countdown is parked until
      // the player acts. See the grace note in step().
      graceHeld: false,
      bossesDefeated: [],
      // meta-upgrade derived fields (applyUpgrades fills these)
      cdMult: 1, comboDecayMult: 1, magnetMult: 1, dmgMult: 1, projSpeedMult: 1,
      bulletSizeMult: 1, extraShots: 0, armorBonus: 0, scoreMult: 1,
      chipGainMult: 1, luckMult: 1, revives: 0, revivesLeft: 0,
      starterArsenal: false, twinArsenal: false,
      // slide is meta-gated: rank 0 means the player cannot slide at all
      slideRank: 0, slideDurMult: 1, slideSpeedBonus: 1, slideIframes: 0,
      // Cliff Edge Mastery is meta-gated the same way the slide is: rank 0
      // means a ledge is a ledge and walking off it is walking off it.
      cliffRank: 0, cliffGrab: FEEL.cliffGrabDepth[0],
      // Loadout Mastery, meta-gated the same way. Rank 0 is the sidearm in a
      // welded offensive position and no defensive row at all.
      offRank: 0, defRank: 0,
      // weapons
      unlocked: new Set([SIDEARM_ID]),
      wpLevels: { [SIDEARM_ID]: 1 },
      // THE LOADOUT: up to two offensive positions and two defensive ones, how
      // many of them you may use set by Loadout Mastery, and the SIDEARM
      // occupying one of the offensive ones rather than riding above them.
      // Everything else unlocked sits on the bench, still levelling and still
      // offered by cards. See systems/loadout.js.
      loadout: Loadout.makeLoadout(),
      activeWeapon: SIDEARM_ID,
      // Slots may only be rearranged between beating a boss and reaching the
      // next arena — see equipSlot.
      requipOpen: false,
      cooldown: 0,
      // Per-weapon runtime state (drone clip, shield hits, jab chain), keyed by
      // weapon id and owned by systems/weaponry.js.
      wstate: {},
      allies: [],
      fireHeldFrames: 0,
      // Per-frame grants from equipped weapons. All of these are cleared and
      // re-asserted every step by stepEquipped — see the note there.
      meleeArmor: 0,
      rootFrames: 0,
      glideFall: null,
      airControl: 1,
      aggroFire: 1,
      aggroPause: null,
      lastDamaged: null,
      pendingLoadout: null,
      // The weapon THIS re-quip window is about, whether or not it needed a
      // decision. `justUnlocked` cannot do this job — the acquire banner clears
      // it after 2.5s, and the halo has to survive as long as the window does.
      freshWeapon: null,
      // A free level from re-beating a boss whose weapon you already own; the
      // post-boss wheel announces it and then clears it.
      bonusLevel: null,
      // Set when the player touches the exit door with the re-quip window still
      // open; UIScene turns it into the confirmation pop-up.
      confirmExit: null,
      // DEV — ask UIScene to open the post-boss wheel once the first frame has
      // drawn. See DEV.requipAtStart; it is cleared the moment it is honoured.
      devRequipPending: false,
    };
    applyUpgrades(save, run);
    if (dev('maxMastery')) run.offRank = run.defRank = Loadout.MAX_RANK;
    // The dev panel's ranks are LAST, so setting one there overrides both the
    // purchased rank and maxMastery's blanket 3. That is the whole point of the
    // dial: maxMastery cannot show you how ranks 0-2 feel.
    if (DEV.enabled && DEV.offRank != null) run.offRank = DEV.offRank;
    if (DEV.enabled && DEV.defRank != null) run.defRank = DEV.defRank;
    // The ranks are copied onto the loadout ONCE, here. Nothing downstream
    // reads `save` again, so a purchase made in the Hub can never reshape a
    // run that is already in progress.
    Loadout.setRanks(run.loadout, {
      offensive: run.offRank, defensive: run.defRank,
    });
    run.hp = FEEL.hpMax + run.hpBonus;
    run.revivesLeft = run.revives;

    // Weapons are EARNED: you start with the sidearm and unlock a special by
    // beating the boss that carries it (killBoss below). The two arsenal
    // upgrades are the only head start, and they cost Chips.
    const specials = WEAPONS.filter((w) => w.id !== SIDEARM_ID);
    // ...except in dev mode, where the whole arsenal is on the table from the
    // first frame — at LEVEL 1, so the ladders still have to be climbed.
    if (dev('startUnlocked')) {
      for (const w of specials) {
        run.unlocked.add(w.id);
        run.wpLevels[w.id] = 1;
      }
    }
    /**
     * THE HEAD START IS SUBJECT TO THE SAME RULE AS THE BOSS BAG. Six weapons
     * have no ladder and play as a flat damage step whatever their level, so
     * handing a playtester one — bought with Chips, at the start of a run they
     * are trying to read — spends a real purchase on a weapon that cannot
     * answer the question. Dev mode keeps the whole arsenal available.
     *
     * The drops need no such filter: a special is unlocked by beating the boss
     * that carries it, and a boss who can be reached is a boss who fights.
     */
    const grantable = DEV.enabled ? specials : specials.filter((w) => hasLadder(w.id));
    const headStart = run.twinArsenal ? 2 : run.starterArsenal ? 1 : 0;
    for (const w of shuffled(grantable).slice(0, headStart)) {
      run.unlocked.add(w.id);
      run.wpLevels[w.id] = 1;
      // A head start you have to go and equip is not a head start. It is still
      // bounded by Loadout Mastery, so at low rank the arsenal upgrades hand
      // you an unlocked weapon on the bench rather than a slot you do not own.
      Loadout.autoEquip(run.loadout, w.id);
    }

    // The dev menu's START LV rung, applied to everything the run has — the
    // sidearm included, since it is a weapon with a ladder like any other.
    // Levels only, never unlocks: which weapons you HAVE is what `startUnlocked`
    // decides, and conflating the two would make it impossible to test a ladder
    // on a run where something was deliberately left locked.
    if (DEV.enabled && DEV.startLevel > 1) {
      for (const id of run.unlocked) {
        run.wpLevels[id] = Math.min(FEEL.weaponMaxLevel, DEV.startLevel);
      }
    }

    this.run = run;
    // THE RUN'S WORLD SEED. Printed in the dev HUD and in the crash overlay so
    // any world you can see is a world I can rebuild — see systems/rng.js.
    // `?seed=1234` pins it for reproducing a reported world in a browser.
    this.seed = seedFromLocation();
    this.areaIndex = 0;
    setCrashContext({ seed: this.seed });
    this.world = Terrain.makeWorld(80, GROUND_Y, null, areaRng(this.seed, 0));
    this.cam = { x: 0 };
    this.player = {
      x: 80, y: GROUND_Y - 24, vx: 0, vy: 0, facing: 1,
      onGround: true, sliding: false, slideTimer: 0,
      airActions: FEEL.maxAirActions, djPause: 0,
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
    this.fx = Wpn.makeFx();
    this.deaths = [];
    this.intent = { moveDir: 0, jumpHeld: false, fireHeld: false, fireStart: 0 };

    /**
     * DEV — THE GRANTED RE-QUIP WINDOW.
     *
     * The real thing, not a bypass: `requipOpen` is the same flag a boss death
     * sets, `canRequip` is untouched, and it shuts on the first arena warp like
     * any other window. Without it the arsenal is unreachable until a boss
     * falls, which is the wrong order for a session testing a weapon against a
     * fight — and it is the answer to re-quipping mid-run, since aborting drops
     * you back here.
     */
    if (dev('requipAtStart')) {
      this.run.requipOpen = true;
      this.run.devRequipPending = true;
    }

    /**
     * DEV — the boss picker's answer, CONSUMED so it cannot linger. A plain
     * START from the title must never be quietly redirected to a boss chosen
     * twenty minutes ago.
     */
    const want = DEV.enabled && DEV.startBoss ? BOSS_BY_ID[DEV.startBoss] : null;
    DEV.startBoss = null;
    this.startArea(want || null);
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
    // Keyed on the area's INDEX, not on a generator carried through the run, so
    // area 3 is the same world whether you walked there or jumped straight to it
    // with the dev boss picker.
    this.areaIndex++;
    setCrashContext({ where: `area ${this.areaIndex} -> ${this.upcoming?.id || '?'}` });
    this.world = Terrain.makeWorld(
      80, GROUND_Y, this.upcoming?.id, areaRng(this.seed, this.areaIndex),
    );
    this.cam = { x: 0 };
    this.player.x = 80;
    this.player.y = GROUND_Y - 24;
    this.player.vx = 0; this.player.vy = 0;
    this.bullets = [];
    this.minions = [];
    this.pickups = [];
    // Summoned allies and hit sparks belong to the space they were made in.
    // Weapon STATE survives (a drone keeps its clip across a door) — the two
    // are deliberately different: state is the weapon, allies are the room.
    this.run.allies.length = 0;
    this.fx = Wpn.makeFx();
    this.deaths = [];
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
      const layer = layerFor(bossLayer(save, def.id, dev('cycleLayers')));
      // A crash inside a fight should say WHICH fight. Boss and layer are the
      // two things that pick which code was running.
      setCrashContext({ where: `arena ${def.id} L${layer}` });
      // The build you walk in with is the build you fight with. Closed here as
      // a backstop only: the window is normally shut at the EXIT DOOR of the
      // previous fight, by the confirmation pop-up. This catches the paths that
      // never touch a door — the dev boss picker, a granted start-of-run window.
      this.run.requipOpen = false;
      this.run.confirmExit = null;
      this.run.pendingLoadout = null;
      this.run.freshWeapon = null;
      this.arena = Arena.makeArena(def, layer, this.viewW, GROUND_Y);
      this.cam = { x: 0 };
      this.minions = [];   // nothing follows you in
      this.bullets = [];
      this.pickups = [];
      this.run.allies.length = 0;
      this.fx = Wpn.makeFx();
      this.deaths = [];
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
      /**
       * A STEP THAT PAUSES THE GAME ENDS THE FRAME. `this.paused` is checked on
       * the way IN to update(), but a step can raise it — the boss-room exit
       * door arms `confirmExit`, sets paused and returns, waiting for an answer.
       *
       * Without this the loop ran step() again immediately, `confirmExit` was
       * now truthy so its own guard fell through, and the warp fired: the door
       * asked "leave the room?" and left at the same time. Answering BACK only
       * cleared `paused`, so the already-started warp then ran and threw the
       * player out of the room they had just chosen to stay in.
       *
       * It needed two steps in one frame, so it never happened at a locked
       * 60fps and always happened at 30 — which is the worst possible shape for
       * a bug to have, because it is invisible on the machine it is written on.
       */
      if (this.paused || this.warp) break;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0; // spiral guard
    this.draw();
  }

  step() {
    const r = this.run, p = this.player;
    r.frame++;
    /**
     * REBUILT EVERY FRAME, exactly like `arena.push`. Thorn Man's ground cover
     * writes it while the player is standing in overgrowth and never clears it,
     * because a hazard that has to remember to switch itself off is a hazard
     * that will one day forget — and a permanent 28% speed loss carried out of
     * a boss room and into the rest of the run is the kind of bug that reads as
     * "the game feels sluggish now" rather than as anything to do with a floor.
     *
     * LATCHED, THEN CLEARED — and that is the whole fix. `thornHazard` is the
     * only writer and it runs from stepBoss(), ~150 lines BELOW the only
     * reader; this clear then ran at the top of the next frame, before the read
     * again. So the value was destroyed every single frame before anything
     * could use it and THORN_HAZ.slow had never once applied — his layer-1
     * hazard, whose entire designed content is a movement speed drop, did
     * nothing at all.
     *
     * Reading one frame late is imperceptible at 60Hz and keeps the property
     * the comment above is protecting: the hazard still just writes while you
     * stand in it and never has to remember to switch itself off.
     */
    r.coverSlowActive = r.coverSlow ?? 1;
    r.coverSlow = 1;

    // keyboard movement folded into the same intent object touch uses
    const k = this.keys;
    let kb = 0;
    if (k.A.isDown || k.LEFT.isDown) kb = -1;
    if (k.D.isDown || k.RIGHT.isDown) kb = 1;
    const moveDir = kb !== 0 ? kb : this.intent.moveDir;

    // DIAGONAL AIM ON A KEYBOARD. The touch pads have had up-left and up-right
    // buttons all along, so `player.diagInput` was reachable on a phone and
    // nowhere else — which meant the Thorn Lash's Lv3 diagonal could not be
    // played in a browser or reached by the smoke test at all.
    //
    // W rather than UP, because UP is jump. Only set from the keyboard when a
    // key is actually down, so a touch player's diagonal is never cleared by a
    // keyboard that nobody is touching.
    if (k.W.isDown && kb !== 0) p.diagInput = kb < 0 ? 'ul' : 'ur';
    else if (k.W.isDown || kb !== 0) p.diagInput = null;

    const wasOnGround = p.onGround;
    const fallVy = p.vy;
    if (p.beam) {
      this.stepBeam();
    } else {
      Phys.stepPlayer(p, this.world, {
        moveDir,
        jumpHeld: this.intent.jumpHeld,
        /**
         * Stun is a stacking slow on movement AND attack speed, so it is
         * applied here and again to the weapon cooldown below.
         *
         * `coverSlow` is Thorn Man's overgrowth dragging at your feet, and it
         * MULTIPLIES rather than replaces: at layer 2 the same tile also applies
         * constrict, and a floor that made you slow but immune to being slowed
         * further would be the one place in his room worth standing. Rebuilt to
         * 1 every frame by the hazard loop, exactly like `arena.push`, so
         * stepping off it is instant and no state can be left behind.
         */
        speedMult: Attr.speedMult(this.status) * (this.run.coverSlowActive ?? 1),
        // "Jumps while in contact with knee-deep water have half the jump
        // strength; midair jumps are only affected by the rain forces." Wading
        // is the cost of standing in Tempest Man's floor water, and it does
        // not follow you into the air.
        jumpMult: this.inWadingWater() ? FEEL.wadeJumpMult : 1,
        // Cliff Edge Mastery: how far below a ledge a grab still reaches,
        // and how long it hangs there first. Rank 0 is near enough to zero.
        cliffGrab: r.cliffGrab,
        cliffStick: r.cliffRank > 0 ? FEEL.cliffStickFrames : 0,
        // The Thorn Lash plants you for the length of a lash, and the Gale
        // Vortex trades fall speed for air control. Both are asserted by the
        // weapon each frame and cleared in stepEquipped, so an unequipped
        // weapon cannot leave either of them switched on.
        rooted: r.rootFrames > 0,
        fallCap: r.glideFall,
        airControl: r.airControl,
      }, GROUND_Y);
      if (!this.arena) {
        this.cam.x = Phys.stepCamera(this.cam, p, this.viewW);
        if (p.x < this.cam.x) p.x = this.cam.x; // never walk off the left edge
      }
    }
    // A landing is an EVENT, not a state — Torrent Cannon vents on it and
    // Quake Hammer resolves its pound on it, and both need the impact speed,
    // which is gone by the time stepPlayer returns.
    this.landVy = fallVy;
    this.justLanded = !wasOnGround && p.onGround;

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
      // Solid props (Tempest Man's floating barrels) join the same list, so
      // standing on one uses the ordinary one-way platform path rather than a
      // second copy of it.
      this.world.platforms = [
        ...this.arena.platforms.filter((pl) => pl.on),
        ...this.arena.hazards.filter((h) => h.solid),
      ];
      this.stepArenaHazards(box);
      // Sealed room: no streaming, no camera, walls hold you in. The beam is
      // exempt — it deliberately travels above the ceiling.
      if (!p.beam) Arena.clampToArena(this.arena, p);
      // The wrap door only exists once the boss is down.
      for (const d of this.world.doors) {
        if (!d.alive) continue;
        const on = Phys.overlaps(box, { x: d.x, y: d.y - d.h, w: d.w, h: d.h });
        // A door that spawned under the player arms only once they step off it.
        if (!d.armed) { if (!on) d.armed = true; continue; }
        if (on) {
          /**
           * THE EXIT DOOR IS WHERE THE LOADOUT IS COMMITTED.
           *
           * "Remains freely open to adjustments until contact with boss exit
           * door, which generates a pop-up confirming the current loadout."
           * Walking into the door used to warp immediately, which meant the
           * re-quip window ended by surprise — you left the room and found out
           * afterwards that you were done choosing. Now the door ASKS, and the
           * answer is what closes the window.
           *
           * Only while the window is open. Once it is shut the door is a door.
           */
          if (this.run.requipOpen && !this.run.confirmExit) {
            this.run.confirmExit = d;
            this.paused = true;
            return;
          }
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

    /**
     * I-FRAMES DO NOT TICK WHILE THE PLAYER IS NOT PLAYING.
     *
     * Two holds. The beam is the obvious one — mercy granted for a hazard must
     * not be spent travelling to where the hazard put you. `graceHeld` is the
     * subtler one: after touchdown the clock stays parked until the first thing
     * the player DOES, or until something damages them anyway. Standing there
     * getting your bearings is not a use of your invulnerability.
     */
    if (r.graceHeld && (moveDir !== 0 || this.intent.jumpHeld
      || this.intent.fireHeld || p.sliding)) r.graceHeld = false;
    if (r.invuln > 0 && !p.beam && !r.graceHeld) r.invuln--;
    if (r.cooldown > 0) r.cooldown--;
    if (p.hitAnim > 0) p.hitAnim--;
    if (r.comboTimer > 0 && --r.comboTimer === 0) r.combo = 1;
    // The hold length has to survive the frame the button comes UP, because
    // that is the frame a tap resolves into a jab rather than a finisher.
    const held = this.intent.fireHeld ? r.fireHeldFrames + 1 : r.fireHeldFrames;
    r.fireHeldFrames = this.intent.fireHeld ? held : 0;

    this.stepEquipped();
    this.stepFireInput(held);
    this.intent.firePressed = false;
    this.intent.fireReleased = false;

    this.stepMinions(box);
    this.stepPickups(box);
    this.stepBullets();
    this.stepBoss();
  }

  /**
   * Advance every equipped weapon, plus the allies and effects they own.
   *
   * Runs AFTER movement so a weapon reads the position the player actually
   * ended the frame at, and before collision so anything it spawns is resolved
   * on the same frame it appeared.
   */
  stepEquipped() {
    const r = this.run;
    const ids = Loadout.equippedIds(r.loadout)
      .filter((id) => Loadout.isEnabled(r.loadout, id));
    // EVERY PER-FRAME GRANT IS CLEARED HERE AND RE-ASSERTED BY WHOEVER GRANTS
    // IT. Otherwise benching the Strike Gauntlet mid-swing would leave its
    // damage reduction switched on for the rest of the run, and the same is
    // true of the Gale Vortex's glide, the Thorn Lash's root and the Eclipse
    // Blade's aggro tax. A weapon that is not running grants nothing, and this
    // is the one line that guarantees it.
    r.meleeArmor = 0;
    r.rootFrames = 0;
    r.glideFall = null;
    r.airControl = 1;
    r.aggroFire = 1;
    r.aggroPause = null;
    Wpn.pruneStates(r.wstate, ids);
    Wpn.coolWeapons(r.wstate);
    const ctx = this.weaponCtx(ids);
    Wpn.stepWeapons(ctx, ids);
    if (this.justLanded) Wpn.notify(ctx, ids, 'land');
    // A jump is an input event, so it lands between sim steps. Banked and
    // spent HERE so a weapon never acts outside the fixed timestep — the same
    // rule the fire button follows.
    if (this.jumpEvent) { this.jumpEvent = false; Wpn.notify(ctx, ids, 'jump'); }
    Wpn.stepFx(this.fx);
    // Boss deaths outlive `this.boss` by design — the body keeps coming apart
    // after the fight is over, which is the whole point of it.
    const dying = this.deaths.length;
    this.deaths = this.deaths.filter((d) => Death.stepDeath(d));
    // THE WHEEL FOLLOWS THE DEATH, never interrupts it. Opening on the frame
    // the boss died would cut the one animation the fight was building toward;
    // waiting until the body has finished coming apart makes the two read as
    // one sequence rather than as a menu popping over a cutscene.
    // The door out arrives with the wheel, for the same reason — see
    // spawnWrapDoor. Outside the `requipOpen` guard because a door the player
    // cannot leave through would strand the run; the wheel is optional, the
    // exit is not.
    if (dying && !this.deaths.length) {
      this.spawnWrapDoor();
      if (this.run.requipOpen) this.scene.get('UI')?.promptRequip();
    }
  }

  /**
   * The one object every weapon behaviour reads the world through.
   *
   * Built fresh each frame rather than cached, because half of it (the enemy
   * list, the arena) changes underneath it. Keeping the surface small and
   * explicit is what stops systems/weaponry.js reaching into the scene.
   */
  weaponCtx(ids = null) {
    const r = this.run;
    const equipped = ids || Loadout.equippedIds(r.loadout);
    return {
      run: r,
      player: this.player,
      bullets: this.bullets,
      allies: r.allies,
      // Minions and the boss are one list to a weapon: nothing in the ladders
      // distinguishes them except Frost Guard, which checks `isBoss` itself.
      enemies: this.boss ? [...this.minions, this.boss] : this.minions,
      arena: this.arena,
      // Live solid platforms — what the Thorn Lash's grapple can catch. The
      // same list physics stands the player on, so a vine can never grab a
      // platform that has phased out from under him.
      platforms: this.world.platforms,
      // The player's own status bag, for a weapon that clears it (Eclipse).
      statusBag: this.status,
      floorY: GROUND_Y,
      landVy: this.landVy || 0,
      equipped,
      fx: this.fx,
      levelOf: (id) => r.wpLevels[id] || 1,
      spawn: (spec) => this.spawnPlayerShot(spec),
      hitEnemy: (e, dmg, opts) => this.hitEnemy(e, dmg, opts),
      overGround: (x) => Phys.isOverGround(this.world, x),
      shake: (mag, dur) => { this.shake = { mag, dur, t: dur }; },
      puff: (spec) => Wpn.puff(this.fx, spec),
      arc: (a, b) => Wpn.arcFx(this.fx, a, b),
      patch: (id, x, w, surfaceY, frames) => {
        if (!this.arena) return;
        // `source: 'player'` is what makes you immune to your own Hot — see
        // patchAt() in systems/attributes.js.
        Attr.addPatch(this.arena.patches,
          Attr.surfacePatch(id, x, w, surfaceY, frames, 'player'));
      },
      sfx: (name, opts) => sfx(name, opts),
      // Lifesteal. Capped at the same ceiling an E-Tank respects, so no weapon
      // can quietly raise the health bar past what the upgrades bought.
      heal: (amount) => {
        r.hp = Math.min(FEEL.hpMax + r.hpBonus + (r.runHpBonus || 0), r.hp + amount);
      },
    };
  }

  /**
   * Damage an enemy from a player weapon, wherever the hit came from.
   *
   * One entry point because minions and bosses die differently but everything
   * that hits them cares about neither — and because `lastDamaged` (which the
   * Swarm Caller's allies prioritise) has to be stamped on every path, not just
   * the projectile one.
   */
  hitEnemy(e, dmg, opts = {}) {
    if (!e || e.hp <= 0) return;
    e.hp -= dmg;
    this.run.lastDamaged = e;
    // A BOSS IS NEVER MOVED BY A HIT. Its position is driven by a state machine
    // that patrols to arena bounds and perches on platforms; shoving it would
    // desync that from what it thinks it is doing. Flinch and knockback are
    // basic hitbox interaction everywhere else, and this is the one exception.
    if (!e.isBoss) {
      if (opts.knockback) {
        const dir = Math.sign((e.x + e.w / 2) - (opts.from ?? this.player.x + 12)) || 1;
        e.kbVx = dir * opts.knockback;
      }
      if (opts.launch) e.vy = -opts.launch;
    }
    if (opts.stun) {
      Attr.applyStatus(e.status || (e.status = {}), 'stun', opts.stun,
        { step: FEEL.stunEnemyStep });
    }
    if (e.hp <= 0) {
      if (e === this.boss) this.killBoss();
      else this.killMinion(e);
    }
  }

  /** A projectile owned by the player. Player shots use the generous pad. */
  spawnPlayerShot(spec) {
    this.bullets.push({
      vy: 0, life: 180, charged: false, enemy: false, ...spec,
    });
  }

  // ── Weapons ─────────────────────────────────────────────────────────
  /**
   * Route the fire button to whatever is holding it.
   *
   * Three shapes, and which one applies is a property of the weapon:
   *
   *   generic     no runtime yet — auto-repeat on its own cooldown, plus a
   *               charged shot on release. The placeholder path, and still what
   *               the sidearm and eleven specials use.
   *   repeat      a runtime that fires while held (Blaze Wheel, Volt Spark).
   *               It paces itself; this just keeps offering.
   *   longPress   a runtime with two moves on one button (Strike Gauntlet,
   *               Quake Hammer). The heavy move fires the INSTANT the hold
   *               crosses 0.4s rather than waiting for release, because making
   *               the player release to commit adds latency to the move that
   *               can least afford it. Releasing before then gives the tap.
   */
  stepFireInput(held) {
    const r = this.run;
    if (this.intent.firePressed) r.fireConsumed = false;

    const id = r.activeWeapon;
    const beh = Wpn.hasRuntime(id) ? Wpn.RUNTIME[id] : null;

    if (!beh?.fire) {
      if (this.intent.fireHeld && r.cooldown === 0) this.fire(false);
      if (this.intent.fireReleased) this.releaseFire();
      return;
    }

    const ctx = this.weaponCtx();
    if (!beh.longPress) {
      if (this.intent.fireHeld) Wpn.fireActive(ctx, id, held);
      return;
    }
    // A weapon may declare its OWN hold length. The Quake Hammer's is 1.5s
    // because its long press is a commitment rather than a modifier; everything
    // else takes the shared 0.4s.
    const holdFor = beh.holdFrames
      ? beh.holdFrames(r.wpLevels[id] || 1)
      : Wpn.LONG_PRESS_FRAMES;
    if (this.intent.fireHeld && held >= holdFor && !r.fireConsumed) {
      if (Wpn.fireActive(ctx, id, held)) r.fireConsumed = true;
    } else if (this.intent.fireReleased && !r.fireConsumed) {
      Wpn.fireActive(ctx, id, held);
      r.fireConsumed = true;
    }
  }

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
    // Stun cuts attack speed as well as movement, so it stretches the cooldown
    // by the same factor it shrinks the walk by.
    /**
     * Stun stretches the cooldown as well as movement — but the cooldown is
     * computed ONCE, here, from the stun in effect at the instant you fired.
     * That means a long one outlives the status that caused it, so it is capped
     * at a multiple of the weapon's own rhythm. Without this a heavily stunned
     * shot could bank a cooldown measured in minutes and the fire button simply
     * never came back.
     */
    const slowed = w.cooldown * r.cdMult / Attr.speedMult(this.status);
    r.cooldown = Math.max(1, Math.round(Math.min(slowed, w.cooldown * r.cdMult * 4)));
  }

  /**
   * Is the player standing in water deep enough to wade in?
   *
   * Grounded only, deliberately: the tracker is explicit that "midair jumps are
   * only affected by the rain forces", so the question is "are my boots in it",
   * not "am I overlapping it". Lava is excluded — that is a hazard to be
   * escaped, not terrain to slog through.
   */
  inWadingWater() {
    const q = this.arena?.liquid;
    if (!q || q.kind !== 'water' || q.h <= 0.5) return false;
    const p = this.player;
    return p.onGround && p.y + 24 > this.arena.floorY - q.h;
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
      // `this.gameOver()` — which has never existed — used to be called here.
      // Burning to death threw a TypeError inside step(), so the one way an
      // elemental attribute can finish you took the crash overlay instead of
      // the results screen. Burn is live on Blaze Man and the Blaze Wheel, so
      // this was reachable in ordinary play. Found by `npm run sim` on its very
      // first simulated fight; tests/scenes.test.js now refuses to let it — or
      // anything like it — back.
      if (r.hp <= 0) return this.die();
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
   * ARENA HAZARD ENTITIES — the physical objects a hazard loop puts in a room.
   *
   * One list and one contract, because four bosses now need loose objects and
   * writing a bespoke loop per boss is how they end up disagreeing about what a
   * hit is worth. The hazard loop in systems/bossFights.js owns where each one
   * goes and how it moves; this owns what happens when the player meets it.
   *
   * Fields, all optional except x/y/w/h and kind:
   *
   *   damage         a real hit on contact — flinch, knockback, i-frames
   *   burn / stun    an attribute applied with that hit, in frames
   *   crumbles       dies on the first surface it touches, leaving `leaves`
   *   solid          the player can stand on it (it joins world.platforms)
   *   hp             shootable; player fire chips it and destroys it at zero
   *   popsOnBall     dies on contact with the drain's spike ball
   *   ttl            despawns after this many frames whatever else happens
   *
   * Motion is NOT here. A rock falls, a barrel floats and a training bag swings
   * on a rail — those are the hazards' designs, not a shared rule.
   */
  stepArenaHazards(box) {
    const a = this.arena;
    const ball = a.drain?.ball;

    for (let i = a.hazards.length - 1; i >= 0; i--) {
      const h = a.hazards[i];
      if (h.ttl !== undefined && --h.ttl <= 0) { a.hazards.splice(i, 1); continue; }

      const touching = box.x < h.x + h.w && box.x + box.w > h.x
        && box.y < h.y + h.h && box.y + box.h > h.y;
      // A solid prop is footing, not a hit: you are meant to stand on a barrel.
      if (touching && h.damage && this.run.invuln === 0) {
        this.hurt(h.x + h.w / 2, h.damage);
        if (h.burn) Attr.applyStatus(this.status, 'burn', h.burn);
        if (h.stun) {
          Attr.applyStatus(this.status, 'stun', h.stun, { step: FEEL.stunPlayerStep });
        }
        if (h.diesOnHit) { a.hazards.splice(i, 1); continue; }
      }

      // "Barrels break open and despawn on contact with the spike ball" — and
      // at layer 2 the floating spike balls do the same, which is the only
      // thing keeping the room from filling up with them.
      if (h.popsOnBall && ball
        && h.x < ball.x + ball.r && h.x + h.w > ball.x - ball.r
        && h.y < ball.y + ball.r && h.y + h.h > ball.y - ball.r) {
        a.hazards.splice(i, 1);
        sfx('enemyDie', { pitch: 0.7 });
        continue;
      }

      if (h.crumbles) {
        // Crumble on the first surface it meets.
        let landed = h.y + h.h >= a.floorY ? a.floorY : null;
        for (const pl of a.platforms) {
          if (!pl.on) continue;
          if (h.x + h.w > pl.x && h.x < pl.x + pl.w
            && h.y + h.h >= pl.y && h.y + h.h <= pl.y + pl.h + (h.vy || 0) + 1) {
            landed = pl.y;
            if (h.leaves === 'hot') pl.hot = FEEL.hotLingerFrames;
            break;
          }
        }
        if (landed !== null) {
          // A rock leaves a rock-wide scorch — see surfacePatch for why the
          // footprint is derived rather than padded.
          if (h.leaves) {
            Attr.addPatch(a.patches,
              Attr.surfacePatch(h.leaves, h.x, h.w, landed, FEEL.hotLingerFrames));
          }
          a.hazards.splice(i, 1);
        }
      }
    }

    // Shootable props. Kept out of the bullet loop because a barrel is scenery
    // rather than an enemy: destroying one scores nothing and drops nothing,
    // and routing it through hitEnemy would give it a combo and an EXP roll.
    for (const b of this.bullets) {
      if (b.enemy || b.life <= 0) continue;
      const bb = this.bulletBox(b);
      for (let i = a.hazards.length - 1; i >= 0; i--) {
        const h = a.hazards[i];
        /**
         * A PSYCHIC HIT LIFTS A TRAINING BAG — "if damaged by psychic type gain
         * a purple outline, slowly rise in the air, then slam the boss".
         *
         * ELEMENT, NOT WEAPON ID. Asking for `psi_orb` by name would be a rule
         * about one weapon; asking for the element is a rule about a KIND, so
         * anything psychic the game gains later works here with no edit. It
         * reads through `elementOf`, which takes the answer from the boss the
         * weapon came from rather than storing a second copy on the weapon.
         *
         * Only psychic registers. An ordinary shot passes straight through, so
         * two bags swinging across the room never turn this fight into waiting
         * for a gap in your own line of fire.
         */
        if (h.psiTarget && h.mode === 'swing') {
          if (elementOf(b.weapon) !== 'Psychic' || !Phys.overlaps(bb, h)) continue;
          b.life = -1;
          h.mode = 'psi';
          h.outline = 0x9B4DFF;
          sfx('charge', { pitch: 1.1 });
          break;
        }
        if (h.hp === undefined) continue;
        if (!Phys.overlaps(bb, h)) continue;
        b.life = -1;
        if ((h.hp -= b.damage) <= 0) { a.hazards.splice(i, 1); sfx('enemyDie', { pitch: 0.8 }); }
        break;
      }
    }
  }

  /**
   * The top of whatever a rolling thing at world-x `wx` would rest on, given
   * that its underside is currently at `y`. Null when there is nothing under it.
   *
   * Deliberately the SAME two surfaces the player stands on — live platforms and
   * ground spans — so a fireball that rolls off a ledge falls exactly where the
   * player would, and a platform that phases out drops both of them. A weapon
   * that used its own idea of the floor would be a second physics model, and the
   * two would drift the first time either was tuned.
   *
   * `slop` allows a shallow step down (platform to ground) to be taken as a roll
   * rather than as a fall, which is what keeps a roller from stuttering into the
   * air at every seam.
   */
  supportY(wx, y, slop = 6) {
    let best = null;
    for (const pl of this.world.platforms) {
      if (wx < pl.x || wx > pl.x + pl.w) continue;
      if (y > pl.y + slop) continue;                 // already past it
      if (best == null || pl.y < best) best = pl.y;
    }
    const floor = this.arena ? this.arena.floorY : GROUND_Y;
    // In a sealed arena the floor runs wall to wall; in the stream it exists
    // only where a span does, and the gaps between spans are the pits.
    const solid = this.arena || Phys.isOverGround(this.world, wx);
    if (solid && y <= floor + slop && (best == null || floor < best)) best = floor;
    return best != null && y >= best ? best : null;
  }

  stepBullets() {
    const r = this.run;
    const pcx = this.player.x + 12, pcy = this.player.y + 12;
    const spawned = [];
    // Built ONCE. Seeking and splitting both need the enemy list, and building
    // a fresh context per bullet per frame was allocating a closure-heavy
    // object dozens of times a frame for two lookups.
    let seekCtx = null;
    const enemyCtx = () => (seekCtx || (seekCtx = this.weaponCtx()));

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
      // PLAYER-SIDE seeking, aimed at an enemy rather than at the player. Same
      // steer-don't-snap shape as `homing` above, but it also carries the
      // acceleration the Nullfire Drone's ladder asks for at Lv6 and Lv10.
      if (b.seek) {
        /**
         * A DEAD TARGET NORMALLY MEANS PICK ANOTHER — except where the rung
         * forbids it. The Nullfire Drone's Lv6 fragments "can not change target
         * mid flight", so a locked shot whose target died simply stops steering
         * and carries on where it was pointed.
         */
        if (b.seek.hp <= 0) {
          b.seek = b.seekLock ? null : Wpn.nearestEnemy(enemyCtx(), b.x, b.y);
        }
        if (b.seek) {
          const c = Wpn.centreOf(b.seek);
          const dx = c.x - b.x, dy = c.y - b.y;
          const d = Math.hypot(dx, dy) || 1;
          const sp = Math.hypot(b.vx, b.vy) || 1;
          b.vx += (dx / d) * sp * (b.seekTurn || 0.05);
          b.vy += (dy / d) * sp * (b.seekTurn || 0.05);
          const ns = Math.hypot(b.vx, b.vy) || 1;
          b.vx = (b.vx / ns) * sp;
          b.vy = (b.vy / ns) * sp;
        }
      }
      if (b.accel && b.accel !== 1) {
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const cap = b.maxSpeed || 8;
        const next = Math.min(cap, sp * b.accel);
        b.vx = (b.vx / sp) * next;
        b.vy = (b.vy / sp) * next;
      }
      // A ground-hugging wave (Torrent's tidal, Quake's shockwave) rides the
      // floor line instead of falling, so it stays a floor attack whatever the
      // terrain under it is doing.
      if (b.hugsFloor) b.y = (this.arena ? this.arena.floorY : GROUND_Y) - 5;

      // Ballistic shots: gravity, a bounce off the floor, and a climb up the
      // sealed walls. Blaze Man's fireballs are the reason all three exist —
      // "bouncing fireballs that climb up walls and leave hot trails".
      if (b.gravity) b.vy += b.gravity;
      b.x += b.vx; b.y += b.vy; b.life--;

      // BLAZE WHEEL's lob converting to a roll. The arc ends the first time it
      // touches the floor; from there it is a ground weapon that spends a
      // distance budget laying Hot behind it. `drag` below 1 is the Lv3 "rapid
      // deceleration"; above 1 is the Lv10 acceleration. Distance, not time, is
      // what the ladder scales, so the budget is in pixels.
      if (b.roll) {
        const land = this.supportY(b.x, b.y + b.radius);
        if (!b.rolling && land != null) {
          b.rolling = true;
          b.y = land - b.radius;
          b.rollG = b.rollG ?? b.gravity ?? 0.16; // kept, so it can fall again
          b.vy = 0; b.gravity = 0;
          b.vx = Math.sign(b.vx || 1) * b.roll.speed;
          // "High Fireball contact damage, LOW rolling contact damage." The
          // wheel you catch in the air is the dangerous one; the burning trail
          // is area denial. Applied once, on the transition, so a long roll
          // does not keep shedding damage.
          if (b.rollDmgMult) b.damage *= b.rollDmgMult;
          if (b.roll.left <= 0) b.life = -1;      // Lv1: lands and stops dead
        }
        if (b.rolling) {
          // "AFFECTED BY PITS AND PLATFORMS". The roller reads the surface
          // under its new position every step rather than riding a global floor
          // line, so it rolls off a ledge into a pit, rolls along a platform and
          // drops off the end of it, and steps down onto the ground below.
          // Without this a fireball would roll across thin air over a pit, which
          // is the one thing a ground weapon must never do.
          const under = this.supportY(b.x, b.y + b.radius);
          if (under == null) {
            b.rolling = false;                    // ran out of floor: fall
            b.gravity = b.rollG;
          } else {
            b.y = under - b.radius;
            b.roll.left -= Math.abs(b.vx);
            b.vx = Math.max(-6, Math.min(6, b.vx * b.roll.drag));
            if (b.hot && this.arena) {
              Attr.addPatch(this.arena.patches,
                Attr.surfacePatch('hot', b.x - b.radius, b.radius * 2, under, b.hot, 'player'));
            }
            if (b.roll.left <= 0 || Math.abs(b.vx) < 0.15) b.life = -1;
          }
        }
      }

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

      /**
       * DISTANCE FALLOFF. Volt Man's bolts weaken with TOTAL TRAVEL DISTANCE,
       * not per bounce: "damage and size and stun duration decrease with total
       * travel distance". Those are different rules and they play differently —
       * per-bounce means a bolt crossing an empty room stays lethal forever and
       * a bolt in a corner dies instantly, which is backwards. Distance makes
       * range the thing you read.
       *
       * Recomputed from the ORIGINALS every frame rather than multiplied down,
       * so it cannot compound with the ricochet loss below or drift as the
       * frame rate banks steps.
       */
      if (b.fadeDist) {
        b.travelled = (b.travelled || 0) + Math.hypot(b.vx, b.vy);
        const k = Math.pow(b.fadeK, b.travelled / b.fadeDist);
        b.damage = Math.max(0.5, b.dmg0 * k);
        // Layer 3 keeps its size: "bolts no longer lose size on bounce, only
        // reduce in damage delt". Same switch, since size and damage are the
        // two halves of the same falloff.
        if (b.fadeSize) b.radius = Math.max(1.5, b.rad0 * Math.max(0.5, k));
        if (b.stun0) b.stun = Math.round(b.stun0 * Math.max(0.25, k));
      }

      // ZIGZAG. Volt Man's bolts do not travel in a line — they kink by a fixed
      // angle on an alternating beat, which is what makes their path readable
      // as a lightning bolt rather than as a slow projectile.
      if (b.zigzag && --b.zigT <= 0) {
        b.zigT = b.zigzag;
        b.zigSign = -(b.zigSign || 1);
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const th = Math.atan2(b.vy, b.vx) + b.zigSign * (b.zigAngle || 0.7);
        b.vx = Math.cos(th) * sp;
        b.vy = Math.sin(th) * sp;
      }

      // RICOCHET off every sealed surface, losing damage each time. `ricochet`
      // is a bounce BUDGET, so a bolt's reach is a count rather than a timer
      // and the tracker's "longer bounce life" at layer 2 is one number.
      if (b.ricochet) {
        const a = this.arena;
        // A SEALED ROOM HAS FOUR SURFACES; THE STREAM HAS TWO. Outside an arena
        // there are no side walls to bounce off — the world is endless — so a
        // ricochet weapon there rebounds off the ground and the top of the
        // screen only. Without this the Alloy Blade would be a weapon that
        // silently stopped ricocheting everywhere except a boss room.
        const x0 = a ? a.x0 : -Infinity;
        const x1 = a ? a.x1 : Infinity;
        const ceil = a ? a.ceilY : 0;
        const floor = a ? a.floorY : GROUND_Y;
        let bounced = 0;
        if (b.x - b.radius <= x0) { b.x = x0 + b.radius; b.vx = Math.abs(b.vx); bounced++; }
        if (b.x + b.radius >= x1) { b.x = x1 - b.radius; b.vx = -Math.abs(b.vx); bounced++; }
        if (b.y - b.radius <= ceil) { b.y = ceil + b.radius; b.vy = Math.abs(b.vy); bounced++; }
        if (b.y + b.radius >= floor) {
          b.y = floor - b.radius; b.vy = -Math.abs(b.vy); bounced++;
          // `pn.marked` used to be set here, scanning every panel on every
          // floor bounce, and nothing ever read it. Its comment claimed layer 3
          // discharges into "every panel the last bolt touched" — but the slam
          // in voltAttack energises EVERY panel unconditionally, which is what
          // the tracker actually asks for ("BRIEFLY energising every panel").
          // A leftover from a superseded design, not a hook.
        }
        if (bounced) {
          b.damage *= b.bounceDmg ?? 0.75;
          if (b.bounceShrink) b.radius = Math.max(1.5, b.radius * b.bounceShrink);
          // A CORNER IS TWO SURFACES ON ONE FRAME. `cornerSafe` charges it as
          // one bounce — "blades survive contact with terrain corners" — where
          // without it a corner eats two, which is why a shot aimed into one
          // dies visibly early. The budget is the reach the player is reading.
          b.ricochet -= b.cornerSafe ? 1 : bounced;
          if (b.ricochet <= 0) b.life = -1;
        }
      }

      // Split after a delay into a fan of smaller, mildly homing fragments.
      if (b.splitIn) {
        if (--b.splitIn <= 0) {
          b.life = -1;
          const n = b.splitCount || 3;
          // The Nullfire Drone's Lv6 pair sends its two sets after DIFFERENT
          // enemies — "the first set of 3 shall target the nearest enemy and
          // the second set the next nearest" — so the rank the parent was
          // fired at picks which enemy this set locks onto.
          let target = null;
          if (b.splitSeekRank !== undefined) {
            const ranked = Wpn.enemiesByRange(enemyCtx(), b.x, b.y);
            target = ranked[Math.min(b.splitSeekRank, ranked.length - 1)] || null;
          }
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
            spawned.push({
              ...b,
              x: b.x, y: b.y,
              vx: Math.cos(a) * (b.splitSpeed || 1.5),
              vy: Math.sin(a) * (b.splitSpeed || 1.5),
              radius: b.splitRadius || 2.5,
              homing: b.splitHoming || 0,
              seek: target, seekTurn: b.splitSeekTurn, accel: b.splitAccel,
              seekLock: b.splitLock,
              splitIn: 0, life: 240,
            });
          }
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
      // A bolt "bounces and arcs on contact with surfaces OR the player", so
      // it survives the hit and turns around rather than being spent on it.
      if (b.bouncesOffPlayer && b.ricochet > 0) {
        b.vx = -b.vx; b.vy = -Math.abs(b.vy);
        b.damage *= b.bounceDmg ?? 0.75;
        b.ricochet--;
      } else {
        b.life = -1;
      }
      if (r.invuln === 0) {
        this.hurt(b.x, b.damage || 1);
        if (b.burn) Attr.applyStatus(this.status, 'burn', b.burn);
        if (b.stun) {
          Attr.applyStatus(this.status, 'stun', b.stun, { step: FEEL.stunPlayerStep });
        }
      }
    }

    /**
     * Shots flagged `blocks` eat player fire, so cover matters.
     *
     * A DELIBERATE HOOK, kept per CLAUDE.md's fill-don't-delete rule — the
     * design has a jetpack that "blocks player bullets" and a shield rung that
     * blocks projectiles, and neither is built. But NOTHING sets `blocks` on a
     * bullet today, so this walked the whole bullet list every frame to run an
     * inner loop that could never execute, and the shape it walks it in is
     * O(n^2).
     *
     * One `.some()` decides whether the pass is worth entering at all, so the
     * hook stays live and costs a single scan instead of a nested one.
     */
    if (this.bullets.some((w) => w.blocks && w.life > 0)) {
      for (const w of this.bullets) {
        if (!w.blocks || w.life <= 0) continue;
        const wb = this.bulletBox(w);
        for (const b of this.bullets) {
          if (b.enemy || b.life <= 0) continue;
          if (Phys.overlaps(this.bulletBox(b), wb)) b.life = -1;
        }
      }
    }

    // PLAYER SHOTS HITTING ENEMIES.
    //
    // Minions and the boss go through one loop and one entry point, because
    // every property a shot can carry — pierce, knockback, Burn, Stun — applies
    // to both and keeping two copies is how they drift apart.
    //
    // killBoss() nulls this.boss, so a hit that kills it MUST stop touching it.
    // The old loop kept going, and the next bullet overlapping the boss on that
    // same frame dereferenced null — which threw out of update() and killed
    // Phaser's game loop, freezing the game on the frame the boss died. It took
    // two bullets landing on one frame, so the sidearm almost never triggered
    // it and a multi-projectile weapon triggered it most times. `hitEnemy`
    // owns the null now, and the `!this.boss` re-check below is what keeps a
    // pierce shot from carrying on into a boss that no longer exists.
    /**
     * ONE TARGET LIST PER FRAME, NOT ONE PER BULLET.
     *
     * The spread below used to sit inside the bullet loop and again inside the
     * explosion branch, so a busy fight allocated a fresh array of every minion
     * plus the boss for EVERY bullet, every frame — dozens of throwaway arrays
     * a frame, thousands a second, which is steady GC pressure that surfaces as
     * periodic hitches on a phone.
     *
     * Hoisting is safe for exactly the reason the snapshot existed: holding the
     * boss OBJECT is fine after `hitEnemy` nulls `this.boss`, because the object
     * still exists and the `hp <= 0` guard below is what actually stops a pierce
     * shot carrying on into a corpse. What was never safe was re-reading
     * `this.boss` off the scene mid-loop, and nothing here does that.
     */
    const targets = this.boss ? [...this.minions, this.boss] : this.minions;

    for (const b of this.bullets) {
      if (b.enemy || b.life <= 0) continue;
      const box = this.bulletBox(b);
      // Normalised to a NUMBER before the loop below decrements it. Not all
      // spawners set `pierce` (weaponry.js:1497 passes `L.pierce` straight
      // through, which is undefined for most rungs), and `undefined--` is NaN —
      // which fails `<= 0` and would leave an ordinary shot immortal.
      b.pierce = b.pierce || 0;
      // Only a piercing shot needs to remember who it has already passed
      // through; everything else dies on first contact and cannot hit twice.
      if (b.pierce > 0 && !b.hitSet) b.hitSet = new Set();

      // A snapshot: hitEnemy can null `this.boss` mid-loop, and reading it
      // again from the scene after that is exactly the crash described above.
      // The `hp <= 0` guard is what stops a pierce shot hitting a corpse.
      for (const e of targets) {
        if (e.hp <= 0 || b.hitSet?.has(e)) continue;
        if (!Phys.overlaps(box, { x: e.x, y: e.y, w: e.w, h: e.h })) continue;

        // A GUARD STANCE EATS THE FIRST SHOT IT TAKES, then drops. Strike Man's
        // layer-2 stance is the only user so far. Resolved before damage and
        // before the hit set, so a guarded shot neither hurts him nor burns a
        // pierce charge — it simply stops, which is what makes chipping a
        // walking boss from across the room stop being free.
        //
        // IT FIZZLES RATHER THAN REFLECTING. Turning the player's own bullet
        // around is a second thing to dodge arriving from a direction nothing
        // else in the game shoots from, and the stance already does its job by
        // denying the damage. Denial is legible; a surprise return shot is not.
        if (e.guard > 0) {
          e.guard = 0;
          b.life = -1;
          sfx('select', { pitch: 0.7 });
          break;
        }

        /**
         * RANGED DAMAGE IS A DIFFERENT THING FROM DAMAGE, and only the bullet
         * loop knows the difference. Strike Man's layer-2 bag shield answers
         * shots specifically — a Strike Gauntlet jab or a Volt Spark zap calls
         * hitEnemy directly and never becomes a projectile, so a boss reacting
         * to raw HP loss would raise a shield against a weapon already inside
         * his guard. Consumed and cleared by whoever reads it.
         */
        e.rangedHits = (e.rangedHits || 0) + 1;
        b.hitSet?.add(e);

        /**
         * A SHOT THAT BURSTS RATHER THAN PASSING THROUGH. The Blaze Wheel's top
         * rung trades pierce for this: everything inside the blast takes the
         * same damage the direct hit did, and wears the same Burn.
         *
         * Resolved before the direct hit so the victim is not paid twice — it
         * is inside its own blast by definition.
         */
        if (b.explodeR) {
          const bx = b.x, by = b.y, r2 = (b.explodeR + 8) ** 2;
          for (const o of targets) {
            if (o === e || o.hp <= 0) continue;
            const ox = o.x + o.w / 2 - bx, oy = o.y + o.h / 2 - by;
            if (ox * ox + oy * oy > r2) continue;
            if (b.explodeBurn) {
              Attr.applyStatus(o.status || (o.status = {}), 'burn', b.explodeBurn);
            }
            this.hitEnemy(o, b.damage, { from: bx });
          }
          Wpn.puff(this.fx, { x: bx, y: by, w: b.explodeR * 4, life: 10, color: 0xE8541A });
        }
        // Attributes land BEFORE the damage, so an enemy the shot kills still
        // shows the element that killed it rather than dying clean.
        if (b.burn) Attr.applyStatus(e.status || (e.status = {}), 'burn', b.burn);
        this.hitEnemy(e, b.damage, {
          knockback: b.knockback, from: b.x, stun: b.stun,
        });
        if (b.explodeR) { b.life = -1; break; }   // a burst is spent on one hit
        /**
         * PIERCE IS SPENT ON THE BULLET, NOT ON THE FRAME. This decremented a
         * local re-read from `b.pierce` at the top of every frame, so the
         * budget silently reset sixty times a second: a `pierce: 2` blade
         * passed through an UNLIMITED number of enemies as long as no more than
         * three of them overlapped it on the same frame — which is the normal
         * case for a shot travelling through a spread-out row. The Lv1 -> Lv3
         * pierce step was invisible in play because level 1 was already
         * effectively infinite.
         */
        if (b.pierce-- <= 0) { b.life = -1; break; }
      }
    }
    /**
     * CULLED ON BOTH AXES. This tested X only, and inside an arena `cam.x` is 0
     * and the room is exactly 0..viewW — so the horizontal test could never
     * fire in a boss room and nothing culled vertically anywhere. A Blaze
     * fireball that wall-bounces gets `vy = -1.6` against `gravity = 0.02`,
     * climbs off the top of the screen and then lives out its full 420-frame
     * life: seven seconds of invisible bullet still being stepped, drawn and
     * collision-tested every frame, several at a time in a long fight.
     *
     * The vertical margin is generous because lobbed arcs — the Blaze Wheel's
     * catapult, the drone's Lv10 skyward shot — legitimately leave the top of
     * the screen and come back down.
     */
    this.bullets = this.bullets.filter(
      (b) => b.life > 0
        && b.x > this.cam.x - 40 && b.x < this.cam.x + this.viewW + 40
        && b.y > -200 && b.y < VIEW_H + 120,
    );
  }

  // ── Minions ─────────────────────────────────────────────────────────
  stepMinions(box) {
    const r = this.run;

    // NO AMBIENT MINIONS DURING A BOSS FIGHT. A boss arena is sealed: the only
    // enemies in it are the boss and anything its own moveset summons (which
    // comes from systems/bossFights.js, not from here). The ambient stream resumes
    // when the fight ends.
    //
    // ONLY THE SPAWNER IS SUPPRESSED. This used to return outright, which also
    // switched off movement, collision and pruning — so a boss-summoned minion
    // stood frozen and intangible in the middle of its own fight. What a fight
    // must not have is the AMBIENT stream, not minions.
    if (!this.boss && --this.spawnTimer <= 0) {
      // Spawn cadence tightens with the difficulty step, which is keyed to
      // elapsed time — camping does not slow this down.
      this.spawnTimer = Minions.spawnIntervalFrames(Minions.difficultyStep(r.frame));
      if (this.minions.length < FEEL.maxMinions) {
        const m = Minions.trySpawn(this.world, this.cam.x, this.viewW, r.frame, GROUND_Y);
        if (m) this.minions.push(m);
      }
    }

    // Attribute damage (Burn, Poison) routes through the same kill path as a
    // THE ECLIPSE BLADE'S PURSUIT PAUSES. "When pursuing the player they will
    // pause very briefly at random times" — rolled per minion per frame, so a
    // crowd stutters raggedly rather than all freezing on the same beat, which
    // is what makes it read as losing track of you rather than as lag.
    // The hold is a `held` status so every existing consumer already honours it.
    const ag = r.aggroPause;
    if (ag) {
      for (const e of this.minions) {
        if (e.hp <= 0 || Attr.hasStatus(e.status, 'cloakHold')) continue;
        if (Math.random() < ag.chance) Attr.applyStatus(e.status, 'cloakHold', ag.frames);
      }
    }
    // bullet, so a minion that burns to death still drops its EXP.
    for (const { e, dot } of Minions.stepMinions(this.minions, this.world, this.player, GROUND_Y)) {
      e.hp -= dot;
      if (e.hp <= 0) this.killMinion(e);
    }

    // A SEALED ROOM HOLDS ITS MINIONS TOO. Everything a minion knows about the
    // world says "drift left off the edge of the screen", which is right in the
    // stream and wrong in an arena — a summon would walk into the wall and be
    // pruned out of the fight it was summoned for. They turn at the walls, the
    // same walls that hold the player in.
    if (this.arena) {
      for (const e of this.minions) {
        if (e.x < this.arena.x0) { e.x = this.arena.x0; e.vx = Math.abs(e.vx); }
        if (e.x + e.w > this.arena.x1) { e.x = this.arena.x1 - e.w; e.vx = -Math.abs(e.vx); }
      }
    }

    for (const e of this.minions) {
      if (e.hp <= 0) continue;
      if (r.invuln === 0 && Phys.overlaps(box, { x: e.x, y: e.y, w: e.w, h: e.h })) {
        this.hurt(e.x + e.w / 2);
      }
    }
    this.minions = Minions.pruneMinions(this.minions, this.arena ? -1e9 : this.cam.x);
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
      isBoss: true,      // weapons that treat a boss differently check this
      status: {},        // elemental attributes, same bag shape as the player's
      fs: null, // attack-loop state, owned by systems/bossFights.js
      hs: null, // hazard-loop state
    };
  }

  stepBoss() {
    const b = this.boss;
    if (!b) return;
    b.anim++;
    // Elemental attributes tick on the boss exactly as they do on a minion.
    // Burn routed through hitEnemy so a boss finished off by a status still
    // runs the full death path — drops, wrap door, the weapon unlock.
    const dot = Attr.stepStatus(b.status);
    if (dot > 0) { this.hitEnemy(b, dot); if (!this.boss) return; }
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

    // Contact damage. `contactDamage` lets a boss whose whole attack IS its
    // body — Tempest Man flies at you and never fires — cost more to touch
    // than one whose body is incidental.
    const box = Phys.hitboxOf(this.player);
    if (this.run.invuln === 0 && Phys.overlaps(box, { x: b.x, y: b.y, w: b.w, h: b.h })) {
      this.hurt(b.x + b.w / 2, b.contactDamage || 1);
    }
  }

  /**
   * Advance one of the boss's two loops. Called every frame so a boss can
   * patrol, telegraph and fire in sequence rather than teleporting between
   * cooldowns. A loop with no behaviour for this layer simply does nothing —
   * see the null entries in systems/bossFights.js.
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
      /**
       * THE PLAYER'S OWN SHOTS AND THE RUN, for a hazard that reacts to what
       * the player is DOING rather than to where they are standing.
       *
       * Thorn Man's ground cover is the first: it retreats from any damage
       * source that passes near it, so the room has to be able to see the
       * bullets. `run` comes with it because the same hazard reads the Swarm
       * Caller's allies off it — a Bug weapon working a Grass room is the type
       * chart showing up as a mechanic.
       */
      bullets: this.bullets,
      run: this.run,
      shoot: (spec) => this.spawnEnemyShot(spec),
      // A fight makes its own noises. `shake` already plays the rumble that
      // goes with it, but a hazard with a moment of its own — Strike Man
      // hurling a bag — needs to be able to say so without shaking the room.
      sfx: (name, opts) => sfx(name, opts),
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
      /**
       * THE ROOM HITTING ITS OWN BOSS. Strike Man's training bag is the first
       * thing to need it: the player lifts it with a psychic shot and it comes
       * down on him for a quarter of his bar.
       *
       * Routed through `hitEnemy` rather than subtracting from `hp`, so a slam
       * that finishes him runs the whole death path — the drops, the wrap door,
       * the weapon unlock. A boss killed by his own furniture must not be a
       * boss whose room the player can never leave.
       */
      hitBoss: (dmg, from) => {
        if (this.boss) this.hitEnemy(this.boss, dmg, { from });
      },
      status: (id, frames, opts) => Attr.applyStatus(this.status, id, frames, opts),
      // The room's own enemies, for a hazard that travels THROUGH them —
      // Volt Man's layer-3 arc chains along whatever is standing in the way.
      // Minions only: a hazard must never be able to chain into its own boss.
      minions: this.minions,
      // Destroyed BY THE ROOM, so no score, no combo and no EXP. The arc did
      // the work; crediting the player for standing near it would make the
      // hazard a reward.
      vaporise: (e) => {
        if (e.hp <= 0) return;
        e.hp = 0;
        sfx('enemyDie', { pitch: 1.2 });
      },
      /**
       * A BOSS-SUMMONED MINION. The only way an enemy other than the boss gets
       * into a sealed arena — the ambient spawner is off for the whole fight,
       * and this is what "whatever its own moveset summons" means.
       *
       * `cap` is per summoning boss and counts what is already in the room, so
       * a fight cannot slowly fill up with leftovers from earlier cycles.
       */
      summon: (kind, x, y, cap = 99) => {
        if (this.minions.filter((m) => m.hp > 0 && m.def.kind === kind).length >= cap) return null;
        const m = Minions.spawnAt(kind, x, y, this.run.frame);
        if (m) this.minions.push(m);
        return m;
      },
      // Move the player without going through the hit path. Tempest Man's
      // jetpack exhaust is a FORCE, not an attack: it repositions you without
      // costing health or granting the i-frames a hit would.
      shove: (dx, dy) => { this.player.x += dx; this.player.y += dy; },
      // Eat player fire in a radius. The same jetpack "blocks player bullets",
      // which needs the projectile list a fight behaviour cannot see.
      blockAt: (x, y, r) => {
        for (const b of this.bullets) {
          if (b.enemy || b.life <= 0) continue;
          if ((b.x - x) ** 2 + (b.y - y) ** 2 <= r * r) b.life = -1;
        }
      },
      // A whole-room light flash. `at` is 0-1 across the room width, for
      // placing the lightning bolt that goes with it.
      /**
       * A whole-room light flash. `at` is 0-1 across the room width, for
       * placing the lightning bolt that goes with it. `hard` is how bright the
       * wash burns, 0-1.
       *
       * ONE MECHANISM, TWO JOBS. At 0.34 it is a telegraph you read through —
       * Tempest Man's rain about to turn, Volt Man earthing himself. At 0.92
       * it is layer 3's "bright enough to wash out the screen like a flash
       * bang", and the recovery is the part you play through.
       */
      flash: (frames, at, hard) => {
        if (!this.arena) return;
        this.arena.flash = Math.max(this.arena.flash, frames);
        this.arena.flashN = frames;
        this.arena.flashHard = hard ?? 0.34;
        if (at !== undefined) this.arena.boltX = at;
      },
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
    // THE ECLIPSE BLADE'S AGGRO TAX, applied at the one choke point every enemy
    // projectile in the game passes through. "Enemies will fire projectiles
    // slightly less frequently" is a dropped shot rather than a longer
    // cooldown: a cooldown change would desync a boss's telegraph from what
    // comes out of it, and the telegraph is the fight.
    if (this.run.aggroFire < 1 && Math.random() > this.run.aggroFire) return;
    this.bullets.push({
      vy: 0, life: 300, charged: false, weapon: null,
      ...spec,
      enemy: true,
    });
  }

  killBoss() {
    const b = this.boss;
    sfx('bossDie');
    // The body comes apart in its own element. Purely cosmetic and deliberately
    // NOT gated on anything below: the unlock, the drops and the wrap door all
    // land on this frame, so a death sequence can never strand a run. The
    // player may walk into the door while he is still falling.
    this.deaths.push(Death.makeDeath(b));
    this.shake = { mag: 2, dur: 24, t: 24 };
    this.run.kills++;
    this.run.score += Math.round((500 + this.run.combo * 100) * this.run.scoreMult);
    this.run.bossesDefeated.push(b.id);
    this.pickups.push(...Pickups.dropsFor(
      'boss', b.x + b.w / 2 - 3, b.y + b.h / 2, this.run.luckMult,
    ));
    recordBossKill(b.id);
    // THE RE-QUIP WINDOW. Open from here until the next arena is entered, so
    // rearranging the loadout is something you do between fights — with or
    // without a drop to place. See canRequip.
    this.run.requipOpen = true;
    /**
     * ALREADY OWN IT? TAKE A LEVEL INSTEAD.
     *
     * A boss you have beaten before dropped literally nothing, which made the
     * second and third clears of the same fight feel like a waste of a door.
     * A level on that boss's own weapon keeps the reward tied to the thing you
     * just beat — Chips are already the run-END payout and would read as the
     * same generic trickle you get for existing.
     */
    if (b.dropWeapon && this.run.unlocked.has(b.dropWeapon)) {
      const lv = this.run.wpLevels[b.dropWeapon] || 1;
      if (lv < FEEL.weaponMaxLevel) {
        this.run.wpLevels[b.dropWeapon] = lv + 1;
        this.run.bonusLevel = b.dropWeapon;
        this.run.wstate = {};   // runtimes cache their rung at creation
      }
    }
    // THE weapon unlock: this is the only way a special enters the run.
    if (b.dropWeapon && !this.run.unlocked.has(b.dropWeapon)) {
      this.run.unlocked.add(b.dropWeapon);
      this.run.wpLevels[b.dropWeapon] = 1;
      this.run.justUnlocked = b.dropWeapon;   // UIScene surfaces this
      // ...and the wheel haloes it for the whole window, banner or no banner.
      this.run.freshWeapon = b.dropWeapon;
      // Slot it silently while there is room; make it a decision once there is
      // not. Benching a weapon the player just fought a boss for without saying
      // so would be the worst possible reading of the slot cap.
      //
      // Unless the class has no tradeable position AT ALL, which is what
      // Loadout Mastery rank 0 means. Then there is no decision to offer and
      // opening a picker onto a padlocked row would only look broken.
      const cls = classOf(b.dropWeapon);
      if (Loadout.autoEquip(this.run.loadout, b.dropWeapon) < 0
          && Loadout.tradeableSlots(this.run.loadout, cls) > 0) {
        this.run.pendingLoadout = b.dropWeapon;
      }
      this.run.activeWeapon = Loadout.normaliseActive(this.run.loadout, this.run.activeWeapon);
    }
    /**
     * THE ROOM GETS ITS LIGHTS BACK. Volt Man's layer-2 sweep parks `dim` at 1
     * and only its own sequence clears it — and that sequence lives in the
     * HAZARD loop, which stops the frame he dies. Kill him at the wrong moment
     * and the room stayed dark through the death animation, the re-quip wheel
     * and the whole walk to the door, with a live bolt column still standing in
     * it. Anything the fight was mid-way through owning has to be handed back
     * here, because there is no other frame on which to hand it back.
     */
    if (this.arena) {
      this.arena.dim = 0;
      for (const c of this.arena.conductors) { c.arc = 0; c.tell = 0; c.fade = 0; }
    }
    // The wrap door is NOT spawned here — see spawnWrapDoor, which runs once
    // the death animation has finished coming apart.
    this.boss = null;
  }

  /**
   * THE WRAP DOOR OUT — late, on the RIGHT, and inert until the player steps
   * clear of it.
   *
   * THREE separate things went wrong with it and all three are fixed here.
   *
   * It used to appear the instant the boss died, so finishing a fight standing
   * on the spot warped you straight out — past the death animation and past the
   * re-quip wheel, the two things the whole fight was building toward. It now
   * spawns from the same moment the wheel does: when the body has finished
   * coming apart.
   *
   * It used to appear at MID-SCREEN. The game reads left to right, so walking
   * forward out of a room you have cleared is the direction the run already
   * moves in; anywhere else asks the player to turn around.
   *
   * And it can still land under someone who happened to be standing there, so
   * it spawns `armed: false` and only becomes usable once they are off it —
   * drawn plainly grey and unlit until then, because a door that ignores you
   * without saying why is indistinguishable from a broken one.
   */
  spawnWrapDoor() {
    if (this.world.doors.length) return;
    this.world.doors = [{
      x: this.viewW - 40, y: GROUND_Y, w: 16, h: 28, alive: true, wrap: true,
      armed: false,
    }];
  }

  // ── Damage / death ──────────────────────────────────────────────────
  hurt(sourceX, amount = 1) {
    const r = this.run, p = this.player;
    if (r.invuln > 0) return;
    // Strike Gauntlet's "damage reduction during attack animations". Rounded up
    // so a reduction can never turn a real hit into a free one — armour should
    // make a trade survivable, not make you immune while mashing.
    if (r.meleeArmor > 0) amount = Math.max(1, Math.ceil(amount * (1 - r.meleeArmor)));
    r.hp -= amount;
    // DEV: the hit lands in full — flinch, knockback and i-frames all apply —
    // it just cannot finish you.
    if (dev('hpFloor')) r.hp = Math.max(1, r.hp);
    r.invuln = FEEL.invulnFrames + r.armorBonus;
    // Taking a hit ends the respawn grace even if the player never moved: the
    // hold is there so mercy is not wasted, and a hit is not it being wasted.
    r.graceHeld = false;
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
    this.clearInput();
  }

  /**
   * Drop every held and buffered input on the floor.
   *
   * A beam takes the better part of a second and the player's hands do not
   * stop moving during it — so without this you touched down already walking,
   * already firing, and with whatever you pressed mid-beam queued up behind a
   * buffer that outlived the fall. Called at the start of a beam AND on
   * touchdown, because a press made WHILE beaming has to be discarded too.
   */
  clearInput() {
    const p = this.player;
    this.intent.moveDir = 0;
    this.intent.jumpHeld = false;
    this.intent.fireHeld = false;
    this.intent.firePressed = false;
    this.intent.fireReleased = false;
    p.jumpBuffer = 0;
    p.coyote = 0;
    p.diagInput = null;
    this.jumpTapFrame = null;
    this.jumpEvent = false;
    this.run.fireHeldFrames = 0;
  }

  stepBeam() {
    const p = this.player;
    // Nothing pressed during the beam survives it — see clearInput. Held keys
    // are re-read from the keyboard the frame control comes back, so a player
    // who never let go simply carries on; a player mashing does not.
    this.clearInput();
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
      /**
       * THE GRACE. Invulnerability does not start counting down until the
       * player does something — see `run.graceHeld`.
       *
       * The beam is long, and the i-frames it hands you used to be burning
       * through it and through the moment afterward where you are still working
       * out where you have been put. Landing with two thirds of your mercy
       * already spent is what made a pit feel like it cost two hits.
       */
      this.run.invuln = FEEL.respawnInvulnFrames;
      this.run.graceHeld = true;
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
    /**
     * ONCE PER RUN, AND THIS GUARD IS LOAD-BEARING — it writes to the save.
     *
     * `stepAttributes`' damage-over-time death does `return this.die()`, which
     * returns from stepAttributes, NOT from step(). step() then carries on into
     * half a dozen further `this.hurt()` calls — hot patches, arena hazards,
     * enemy shots, contact — and dot damage never sets `invuln`, so burning to
     * death while touching a minion or standing in a hazard reached here twice
     * in one frame and banked the whole payout twice.
     *
     * That is permanent, silent save inflation: save.runs and save.chips both
     * double-count, and it reads from the outside as "the Chip payout is
     * inconsistent". scene.start() only queues, so it cannot stop the step.
     */
    if (this.dead) return;
    this.dead = true;
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
  /**
   * A jump, and the double-tap that turns one into a slide.
   *
   * THE JUMP ALWAYS WINS THE FIRST TAP. Detecting a double-tap before jumping
   * would put input latency on every jump in the game, which is the one thing a
   * Mega Man-grade platformer cannot afford. So the jump fires immediately and a
   * second tap inside a TIGHT window cancels it: the player is put back exactly
   * where he launched from and dropped into a slide instead.
   *
   * The cancel window is deliberately short. A tap at the very tail of it
   * un-does a jump that has visibly started, so the wider the window the more
   * often you see a hop that should not have happened — and there is currently
   * no art for those in-between frames.
   *
   * `jumpFromY` is captured while still GROUNDED, because that is the only
   * moment the launch height is known; the jump itself is buffered and applied
   * inside the fixed step, so reading `y` later would give a rising player.
   */
  doJump() {
    const p = this.player, r = this.run;
    if (this.tryCancelIntoSlide()) return;
    this.intent.jumpHeld = true;
    if (p.onGround) { p.jumpFromY = p.y; this.jumpTapFrame = r.frame; }
    // Only sound a jump that actually leaves the ground. A buffered press while
    // airborne may never become a jump at all.
    const kind = Phys.requestJump(this.player);
    if (kind !== 'jump' && kind !== 'double') return;
    sfx('jump');
    // Torrent Cannon vents on a jump from Lv3. Banked rather than fired here,
    // because this runs from an input handler between sim steps — see
    // stepEquipped. Flagged on the real jump only, so a buffered press that
    // never becomes one cannot trigger it.
    this.jumpEvent = true;
  }
  endJump() { this.intent.jumpHeld = false; }

  /**
   * Second tap of a rapid double-tap: undo the jump, slide instead.
   *
   * Refuses unless the jump is still going UP — either still rising, or cut
   * short by the player letting go — and still inside the window, so a player
   * who taps again at the top of an arc gets their double jump rather than
   * being yanked to the floor. Refuses too if the slide would not start (Slide
   * Mastery rank 0), in which case the second tap falls through to the double
   * jump it would otherwise have been — never a dead input.
   *
   * `p.jumpCut` IS WHY A DOUBLE-TAP WORKS AT ALL. The test used to be `vy < 0`
   * alone, and `FEEL.jumpCutMult` is 0 — releasing the jump key while rising
   * sets vy to exactly zero, and gravity has it falling on the very next step.
   * A double TAP is press, release, press, so by the second press the first
   * jump was never rising any more and the cancel refused every time. It only
   * ever fired for a player who held the button down through both taps, which
   * is not a double-tap. Under a thumb that made the slide unreliable; on a
   * keyboard, where the field now gives the slide no key of its own, it would
   * have removed the move outright.
   *
   * The apex case the `vy` test was protecting is covered by the window: eight
   * frames is nowhere near the top of a jump that rises for nineteen, and a
   * HELD jump at its apex has `jumpCut` false, so it still gets its double jump.
   */
  tryCancelIntoSlide() {
    const p = this.player, r = this.run;
    if (this.jumpTapFrame == null || p.onGround) return false;
    if (p.vy >= 0 && !p.jumpCut) return false;
    if (r.frame - this.jumpTapFrame > FEEL.slideTapFrames) return false;
    if (p.jumpFromY == null) return false;

    // Put him back on the ground he left, then slide from there.
    const wasY = p.y, wasVy = p.vy;
    p.y = p.jumpFromY;
    p.vy = 0;
    p.onGround = true;
    p.airActions = FEEL.maxAirActions;
    p.djPause = 0;
    if (!this.toggleSlide()) {
      p.y = wasY; p.vy = wasVy; p.onGround = false;   // rank 0: leave the jump alone
      return false;
    }
    this.jumpTapFrame = null;
    this.intent.jumpHeld = false;
    return true;
  }

  toggleSlide() {
    const r = this.run;
    if (this.player.sliding) { Phys.cancelSlide(this.player); return true; }
    const started = Phys.startSlide(this.player, {
      rank: r.slideRank,             // rank 0 refuses outright — no slide yet
      durMult: r.slideDurMult,
      speedBonus: r.slideSpeedBonus,
    });
    // Rank 3 turns the slide into a dodge. Granted on the opening frames only,
    // so it rewards sliding INTO danger on purpose rather than parking in one.
    if (started && r.slideIframes > 0) r.invuln = Math.max(r.invuln, r.slideIframes);
    if (started) sfx('slide');
    // Reported so the jump-cancel can put the jump back when a slide refuses.
    return started;
  }
  setMove(dir) { this.intent.moveDir = dir; }

  /**
   * Fire is EDGE-TRACKED, not just held.
   *
   * The press and release flags are consumed inside the fixed step rather than
   * acted on here, so a weapon never fires outside the simulation — a tap
   * arriving between two sim steps has to resolve on the next one, or the whole
   * determinism the fixed timestep buys is gone.
   */
  beginFire() {
    this.intent.fireHeld = true;
    this.intent.firePressed = true;
    this.intent.fireStart = performance.now();
  }
  endFire() {
    this.intent.fireHeld = false;
    this.intent.fireReleased = true;
  }

  /**
   * THE OFFENSIVE MODULE GESTURE: aim first, switch off second.
   *
   * Offensive weapons share one fire button, so "live" and "AIMED" are
   * different states — a rank-2 or rank-3 loadout has two offensive weapons
   * running and exactly one of them on the trigger. Nothing was ever changing
   * which one, so a full offensive row still only ever fired its first weapon
   * and the second slot looked broken. `normaliseActive` cannot do it: it only
   * moves `activeWeapon` when the current one has stopped being firable.
   *
   * One gesture covers both jobs, and which one it does is the obvious one:
   *
   *   a live weapon you are NOT holding   becomes the one you are holding
   *   the one you ARE holding             switches off, handing aim to the other
   *   a switched-off weapon               switches on AND takes the trigger
   *
   * Where mastery caps the class at one live weapon this collapses back into
   * the radio switch it already was — switching one on switches the other off,
   * and the last one standing refuses, so the fire button is never dead.
   */
  aimWeapon(id) {
    const r = this.run, lo = r.loadout;
    if (!r.unlocked.has(id) && !dev('unlockAnyWeapon')) return;
    if (Loadout.firables(lo).includes(id) && r.activeWeapon !== id) {
      r.activeWeapon = id;
      return;
    }
    Loadout.toggleEnabled(lo, id);
    r.activeWeapon = Loadout.normaliseActive(lo, r.activeWeapon);
    // Switching one on is also a request to hold it — otherwise turning a
    // weapon on would leave the trigger pointed at the one you turned it on
    // instead of, which is never what the gesture meant.
    if (Loadout.firables(lo).includes(id)) r.activeWeapon = id;
  }

  /**
   * Can slots be rearranged right now?
   *
   * A LOADOUT CHANGE IS PART OF THE WEAPON ACQUIRE SEQUENCE. The window opens
   * when a boss goes down and closes when you warp into the next arena, so the
   * build you walk into a fight with is the build you fight it with. Swapping
   * mid-fight would turn every hard attack pattern into a menu problem.
   *
   * DEV MODE DOES NOT BYPASS THIS. It used to, and that was a mistake: the
   * whole feel of the loadout is that a change is an event you earn, and a
   * playtest that could re-quip whenever it liked was never testing the thing
   * being designed. Use the boss selector to reach a defeat instead.
   *
   * Switching a slotted weapon ON or OFF is NOT gated by this — that is a
   * moment-to-moment call (quieting the drone in a boss room) and it cannot
   * change what you are carrying.
   */
  canRequip() { return !!this.run.requipOpen; }

  /** The pop-up's YES: the loadout is committed and the door opens. */
  confirmExit() {
    const d = this.run.confirmExit;
    this.run.confirmExit = null;
    this.run.requipOpen = false;
    this.paused = false;
    if (d) d.alive = false;
    this.warpToNextArea();
  }

  /**
   * The pop-up's NO: back into the room with the window still open.
   *
   * The door is DISARMED on the way out, so standing in the doorway does not
   * re-open the pop-up every frame — it re-arms once the player steps off it,
   * which is the same rule a freshly spawned door already follows.
   */
  cancelExit() {
    const d = this.run.confirmExit;
    this.run.confirmExit = null;
    this.paused = false;
    if (d) d.armed = false;
  }

  /** Slot a weapon and keep the fire button pointed at something real. */
  equipSlot(id, index) {
    const r = this.run;
    if (!r.unlocked.has(id) && !dev('unlockAnyWeapon')) return false;
    if (!this.canRequip()) return false;
    if (!Loadout.canEquip(r.loadout, id, index)) return false;
    Loadout.equip(r.loadout, id, index);
    r.activeWeapon = Loadout.normaliseActive(r.loadout, r.activeWeapon);
    return true;
  }

  toggleWeapon(id) {
    const r = this.run;
    Loadout.toggleEnabled(r.loadout, id);
    r.activeWeapon = Loadout.normaliseActive(r.loadout, r.activeWeapon);
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
    /**
     * THE VERTICAL HALF OF THE SAME SHAKE, and it was missing.
     *
     * `sx` folded in `sh.x` so every world actor shook horizontally, but there
     * was no `sy` — only the arena backdrop and the doors moved vertically, and
     * the doors did it by hand-adding `sh.y` at two call sites. So on every
     * boss telegraph the room and the doors bounced up and down while the
     * ground, the player, the boss, the minions and every projectile stayed put
     * on that axis: the door visibly detached from the ground line it stands on.
     *
     * Shake still moves the WORLD and never the HUD — the HUD is a whole scene
     * above this one.
     */
    const sy = (wy) => wy + sh.y;

    if (this.arena) {
      Arena.drawArena(g, this.arena, this.viewW, sh);
      // After the room, so a barrel floats ON the water rather than under it.
      Arena.drawHazards(g, this.arena, sh);
    } else {
    // ground spans; the gaps between them are the pits
    for (const s of this.world.groundSpans) {
      if (s.x2 < cam - 8 || s.x1 > cam + this.viewW + 8) continue;
      g.fillStyle(0x0a1628, 1);
      g.fillRect(sx(s.x1), sy(GROUND_Y), s.x2 - s.x1, VIEW_H - GROUND_Y);
      g.fillStyle(0x1a3050, 1);
      g.fillRect(sx(s.x1), sy(GROUND_Y), s.x2 - s.x1, 2);
    }
    for (const s of this.world.spikes) {
      g.fillStyle(0xc0c0c8, 1);
      const n = Math.max(1, Math.round(s.w / 5));
      for (let i = 0; i < n; i++) {
        const tx = sx(s.x + i * (s.w / n));
        g.fillTriangle(tx, sy(s.y + s.h), tx + s.w / n / 2, sy(s.y), tx + s.w / n, sy(s.y + s.h));
      }
    }
    for (const p of this.world.platforms) {
      g.fillStyle(0x1a3a60, 1);
      g.fillRect(sx(p.x), sy(p.y), p.w, p.h);
    }
    }

    // Doors exist in both spaces: the boss door in an area, the wrap door out
    // of an arena. The wrap door is gold-cored to read as an exit, not a threat.
    for (const d of this.world.doors) {
      // AN UNARMED DOOR LOOKS UNARMED: no halo, no pulse, grey. It spawned
      // under the player and will not answer until they step off it, and a door
      // that silently ignores you is indistinguishable from a broken one.
      const live = d.armed !== false;
      if (live) {
        g.fillStyle(0xf5d328, 0.6 + 0.4 * Math.sin(r.frame * 0.08));
        g.fillRect(sx(d.x) - 2, sy(d.y - d.h - 2), d.w + 4, d.h + 4);
      }
      g.fillStyle(live ? (d.wrap ? 0xf5d328 : 0x5cadd5) : 0x4a4a44, live ? 1 : 0.55);
      g.fillRect(sx(d.x), sy(d.y - d.h), d.w, d.h);
    }

    for (const p of this.pickups) {
      const style = Pickups.PICKUP_STYLE[p.type];
      L.pickups.draw(
        { ...p, id: `pickup:${p.type}`, x: sx(p.x), y: sy(p.y), palette: style },
        (gg, a) => drawPickup(gg, a, style, r.frame),
      );
    }

    for (const e of this.minions) {
      L.minions.draw({
        id: e.id, x: sx(e.x), y: sy(e.y), w: e.w, h: e.h,
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
      // Same flashing readout the player gets. An enemy that is burning or
      // frozen has to say so, or a status weapon has no visible effect at all
      // until the health bar you cannot see runs out.
      const ef = Attr.statusFlash(e.status);
      if (ef.tint !== null && Math.floor(r.frame / 4) % 2 === 0) {
        L.minions.g.fillStyle(ef.tint, 0.5 * ef.alpha * Attr.statusIntensity(e.status));
        L.minions.g.fillRect(sx(e.x), sy(e.y), e.w, e.h);
      }
    }

    for (const b of this.bullets) {
      const cx = sx(b.x), cy = sy(b.y);
      L.bullets.draw(
        {
          ...b, id: `shot:${b.weapon}`,
          x: cx - b.radius, y: cy - b.radius, w: b.radius * 2, h: b.radius * 2,
          facing: Math.sign(b.vx) || 1,
          palette: { primary: b.color, secondary: b.color },
        },
        (gg, a) => drawProjectile(gg, { ...a, x: cx, y: cy }, r.frame),
      );
    }

    if (this.boss) {
      const b = this.boss;
      L.boss.draw({
        id: b.id, x: sx(b.x), y: sy(b.y), w: b.w, h: b.h,
        facing: -1, clip: b.state,
        palette: { primary: b.primary, secondary: b.secondary, outline: b.outline },
      });
      // Hardware whose orientation is game state — see drawBossRig. Not a
      // silhouette: the rectangle underneath is still the honest footprint.
      drawBossRig(L.boss.g, b, sx(b.x), sy(b.y));
      const bf = Attr.statusFlash(b.status);
      if (bf.tint !== null && Math.floor(r.frame / 4) % 2 === 0) {
        L.boss.gOver.fillStyle(bf.tint, 0.45 * bf.alpha * Attr.statusIntensity(b.status));
        L.boss.gOver.fillRect(sx(b.x), sy(b.y), b.w, b.h);
      }
    }

    // A boss coming apart, on the boss layer and in world space, so it shakes
    // and scrolls with everything else and sits exactly where the body was.
    // Over the sprites for the same reason the player's flash is: a death that
    // drew behind the body would be invisible the day bosses have art.
    for (const d of this.deaths) Death.drawDeath(L.boss.gOver, sx, d, sy);

    // player — flashes while invulnerable
    if (!(r.invuln > 0 && Math.floor(r.frame / 3) % 2 === 0)) {
      const p = this.player;
      L.player.draw({
        id: 'player',
        x: sx(p.x), y: sy(p.y + (p.sliding ? 12 : 0)),
        w: 24, h: p.sliding ? 12 : 24,
        facing: p.facing,
        clip: playerClip(p),
        // THE PLAYER IS ALWAYS THIS BLUE. Equipping a weapon used to recolour
        // the suit from the source boss's palette; that is scrubbed. The suit
        // is the player's identity and does not change, and what you are
        // carrying reads from the hardware drawn on him below.
        palette: PLAYER_PALETTE,
      });
      // An active attribute flashes its colour over the suit. Flashing rather
      // than tinting leaves the suit readable underneath, so a status never
      // makes the player harder to find on a busy screen.
      //
      // ON `gOver`, NOT `g`. The player has real art now, and within a layer
      // sprites draw above shapes — so every one of these would have gone
      // behind him and silently stopped existing.
      const pf = Attr.statusFlash(this.status);
      if (pf.tint !== null && Math.floor(r.frame / 4) % 2 === 0) {
        L.player.gOver.fillStyle(pf.tint, 0.45 * pf.alpha * Attr.statusIntensity(this.status));
        L.player.gOver.fillRect(sx(p.x), sy(p.y + (p.sliding ? 12 : 0)), 24, p.sliding ? 12 : 24);
      }
    }

    /**
     * WEAPONRY IS DRAWN OUTSIDE THE I-FRAME FLASH, and that is the whole fix.
     *
     * This used to sit inside the branch above, so for the 90 frames after
     * every hit the drone, the shield and every summoned ally strobed at 10Hz
     * along with the player. None of them is the player: the flash says "you
     * are briefly invulnerable", and blinking a drone hovering three feet away
     * says nothing at all — it just makes the screen harder to read at exactly
     * the moment the player is trying to recover.
     *
     * Still on the player's layer, so the drone and the shield sit above every
     * world actor with him.
     */
    Wpn.drawWeaponry(L.player.gOver, sx, this.weaponCtx());

    /**
     * THE ROOM LOSING POWER. Volt Man's layer-2 sweep ends by flickering the
     * lights and leaving them out, so the bolts that follow arrive in the dark.
     *
     * UNDER the flash rather than over it, and they are opposite gestures on
     * purpose: this one subtracts light from the whole room and holds, the
     * flash adds it and clears. Drawn without the shake for the same reason the
     * flash is — darkness is not an impact.
     *
     * It never reaches full black. At 1.0 the player would lose sight of
     * himself, which is the one thing this game does not do; 0.72 is dark
     * enough that a neon bolt is the brightest thing in the room and light
     * enough that the floor is still readable.
     */
    if (this.arena?.dim > 0) {
      L.player.g.fillStyle(0x02040C, Math.min(0.72, this.arena.dim * 0.72));
      L.player.g.fillRect(0, 0, this.viewW, VIEW_H);
    }
    // ...and the things that EMIT light go on top of it. Volt Man's power-line
    // bolts are the only ones so far, and they are the whole reason the room
    // turned its lights off. They keep the shake, because unlike the flash they
    // are objects in the world rather than light cast across it.
    // THE SAME OFFSET THE REST OF THE FRAME USED. `shakeOffset` re-rolls its
    // random on every call, so calling it a second time here gave the bolts a
    // different displacement from the room they are attached to — during a
    // shake Volt Man's power-line arcs visibly detached from their own
    // conductors. One roll per frame, shared.
    Arena.drawArenaBolts(L.player.g, this.arena, sh);

    // A lightning or arc flash washes the whole room. Drawn on the topmost
    // world layer and WITHOUT the shake offset: light does not shake, and a
    // flash that moved would read as a second impact.
    if (this.arena?.flash > 0) {
      const a = this.arena;
      // Squared, so a flash bang blinds hard and then clears quickly rather
      // than fading out through a long grey haze.
      const t = a.flash / (a.flashN || 10);
      L.player.g.fillStyle(0xBFD8FF, Math.min(0.95, a.flashHard * t * t));
      L.player.g.fillRect(0, 0, this.viewW, VIEW_H);
    }

    for (const l of Object.values(L)) l.end();
  }
}
