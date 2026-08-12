/**
 * UIScene — HUD and the four-zone touch layout, drawn above GameScene.
 *
 * LAYOUT
 *   1 top-left      energy pips, score, level + EXP bar
 *   2 top-right     pause
 *   3 bottom-left   movement: four buttons  ◀  ◸  ◹  ▶  · drag down = slide
 *   4 bottom-right  [] jump   () shoot, hold to charge
 *   between them    RE-QUIP — the radial weapon wheel
 *
 * Every control is a REAL BUTTON you can see, not an invisible band split by
 * arithmetic. What is pressable is exactly what is drawn, which is the only way
 * a touch layout is honest on a phone.
 *
 * The two diagonal buttons walk like their outer neighbour today and set
 * `diagInput` on the player. Nothing consumes it yet — it exists because several
 * special weapons are planned to fire from a standing diagonal, and the input
 * has to be a distinct press before a weapon can read it.
 *
 * THE RE-QUIP WHEEL
 * -----------------
 * One button, two ways in, deliberately priced differently:
 *
 *   TAP    hard pause. Gameplay dims, the wheel comes up to full opacity. The
 *          safe read-everything-and-choose route.
 *   SWIPE  no pause. Time collapses to a crawl, a ghosted wheel appears, and
 *          the DIRECTION of the swipe picks the weapon. Fast, but it costs real
 *          seconds and you are still being shot at.
 *
 * LAYOUT — the loadout is the wheel, and the wheel is the loadout:
 *
 *                       ( ) SIDE ARM
 *                 ___________________
 *              /       OFFENSIVE       \        <- upper arc of the ring
 *            |    ┌──────┐ ┌──────┐     |
 *            |    │ sword│ │ sword│     |       <- the 2x2 module grid
 *            |    └──────┘ └──────┘     |
 *            |    ┌──────┐ ┌──────┐     |
 *            |    │shield│ │shield│     |
 *            |    └──────┘ └──────┘     |
 *              \       DEFENSIVE       /        <- lower arc of the ring
 *                       ‾‾‾‾‾‾‾‾‾
 *
 * The ring is the frame and its two halves are LABELLED, so which row is which
 * needs no explaining. The four modules are square, black, and carry a sword or
 * shield watermark — the watermark says what the slot IS even when it is empty,
 * which a coloured disc never did.
 *
 * THE SIDEARM OCCUPIES A MODULE like everything else. Its dot above the ring is
 * its BENCH, not a free extra weapon: below offensive mastery rank 3 the sidearm
 * is welded into a module and the dot never appears, and at rank 3 you may trade
 * it out for a second special — at which point the dot shows up, holding it, one
 * tap from going back in. It keeps its own fixed spot rather than joining the
 * arc so it never moves.
 *
 * Benched and locked specials sit ON the ring, in the half belonging to their
 * class. Everything you are carrying is large and central; everything you own
 * but are not carrying is small and out at the rim.
 *
 *   TAP a module              select it — white corners
 *   TAP a benched weapon      drop it into the selected module of its class
 *   PRESS AND HOLD a module   switch that weapon on or off
 *
 * LOADOUT MASTERY IS DRAWN, NOT EXPLAINED. A module past your rank keeps its
 * shape and its watermark under a padlock, so the row's full size is always
 * visible as something to work toward. Where the rank caps how many may run at
 * once, press-and-hold becomes a radio switch between them — the gesture does
 * not change and the cyan border always says which one won.
 *
 * SLOTS ONLY CHANGE BETWEEN FIGHTS. Equipping is live from a boss going down
 * until you warp into the next arena; outside that the wheel still opens, still
 * reads, and still toggles what is running. See GameScene.canRequip.
 *
 * ONE GESTURE, BOTH ROWS. Select then fill works the same for offensive and
 * defensive, which the earlier version did not: a tap on an offensive module
 * meant "make this live", a tap on a defensive one meant nothing at all, and a
 * weapon tapped on the ring landed in whichever slot the game chose for you.
 *
 * BORDERS ARE STATE, and there are only two: a cyan border means the module is
 * carrying something and running it, and no border means it is not. A red cross
 * used to mark the switched-off case and read as an error rather than as a
 * choice the player had made. White corners are separate from all of that —
 * they mark the SELECTED module, which is about what happens next rather than
 * about what is running.
 *
 * ARC POSITIONS ARE FIXED (ARC_ORDER in data/weapons.js) whether or not a
 * weapon is unlocked, and locked ones sit under a padlock rather than being
 * skipped. The arc therefore never reshuffles under your thumb as bosses fall,
 * which is the only way any of this becomes muscle memory. A position vacates
 * while its weapon is in a module, so nothing is ever shown twice.
 */

import Phaser from 'phaser';
import { VIEW_H, viewWidthOf, DISPLAY_DIAG, BUILD } from '../config/display.js';
import { fitCamera, label, plate } from '../systems/text.js';
import { FEEL } from '../config/feel.js';
import {
  weaponOf, WHEEL_ORDER, SIDEARM_ID, OFFENSIVE, DEFENSIVE, specialsOfClass, classOf,
} from '../data/weapons.js';
import * as Loadout from '../systems/loadout.js';
import { BOSSES, bossLayer } from '../data/bosses.js';
import { dev, DEV } from '../config/dev.js';
import { save, persist } from '../systems/save.js';
import { hexNum } from '../systems/assets.js';
import { sfx, unlockAudio } from '../systems/sfx.js';

const SLIDE_DEADZONE = 14; // virtual px of downward drag before a slide fires
const SWIPE_DEADZONE = 10; // virtual px of travel before a re-quip tap becomes a swipe
/**
 * How long the in-situ wheel holds slow motion with nothing decided.
 *
 * A dead man's handle. Opening it stops time from moving at a useful rate, so
 * an accidental touch with no way out would be a soft lock — and the player's
 * hands are already occupied. Long enough to read four modules and choose.
 */
const SITU_TIMEOUT_MS = 7000;

/**
 * TOUCH COORDINATES — always convert, never use pointer.x directly.
 *
 * `pointer.x/y` are CANVAS pixels. Every control here is laid out in VIRTUAL
 * pixels, and the camera zooms by RENDER_SCALE (2-5x), so the two spaces differ
 * by that factor. Reading pointer.x raw made every touch land 2-5x too far
 * right: the movement strip always resolved to its rightmost column and the
 * jump/fire split always resolved to fire, which presented as "I can only walk
 * right and shoot". Route every pointer through here.
 */
const vpt = (scene, p) => scene.cameras.main.getWorldPoint(p.x, p.y);

/**
 * How far a finger may slide off a button before the hold drops.
 *
 * ASYMMETRIC on purpose, and that asymmetry is the fix for holds dropping as if
 * the finger had lifted. Sideways drift means you are reaching for a neighbour,
 * so it stays tight. UPWARD drift is just thumb roll — the pads are only 30px
 * tall and sit on the bottom edge, so a pressing thumb wanders above the pad
 * constantly. A symmetric margin small enough to be "mild" sideways is far too
 * small vertically, which is what kept cancelling holds mid-jump.
 *
 * Downward is unbounded: there is nothing below the pads but the screen edge,
 * and the slide gesture is a deliberate drag that way.
 */
const GRACE_X = 10;
const GRACE_UP = 34;

/**
 * Controls rest at the opacity the pressed state used to use, and PRESSING them
 * clears the fill entirely so only the border remains. Pressing is the moment you
 * most need to see the ground you are standing on, so the button gets out of the
 * way rather than lighting up.
 */
const PAD_ALPHA = 0.62;
const PAD_ALPHA_ON = 0;

/**
 * Wheel geometry, in virtual pixels. Every number is fenced by the HUD above
 * (three lines in dev mode, so up to y=33) and the thumb pads below (from
 * y=194), and checked at the narrowest supported virtual width (320).
 *
 * A true CIRCLE, not the ellipse an earlier version used: the ring is now the
 * frame the whole control hangs off, and a squashed one reads as a mistake
 * rather than as a design. It fits because the modules moved inside it.
 */
const SIDEARM_Y = 40, SIDEARM_R = 6;
/**
 * THE RING IS AN OVAL, not a circle.
 *
 * The playfield is 224 tall and 320-480 wide, so a circle big enough to hold
 * seventeen discs at a comfortable spacing does not fit vertically while
 * leaving most of the horizontal room unused. An ellipse spends the axis the
 * screen actually has. Discs and the ring frame are placed from the SAME two
 * radii, so they cannot disagree about where the ring is.
 */
const RING_CY = 112, RING_RX = 96, RING_RY = 52;
const MOD = 26, MOD_GAP = 6;       // module size and the gap between columns
// Pulled IN toward the grid rather than out toward the rim: the ring is
// widest at its middle, so a label nearer the centre line has more clear
// space either side of it, not less.
const LABEL_OFF_Y = 76, LABEL_DEF_Y = 148;
const ARC_SLOT_R = 6;
const ARC_END = 0.12;              // keep the arc ends a little clear of horizontal
const READ_Y = 180;
const SWIPE_CY = 74;               // between the sidearm and the offensive row
const HOLD_MS = 350;               // press-and-hold to switch a module off
const CYAN = 0x5cadd5;
const FRAME_DARK = 0x2a323c;       // the grid frame when a module is not running
const LOCKED_FILL = 0x3a3f4a;
const LOCKED_ALPHA = 0.45;
const BENCH_ALPHA = 0.55;          // unlocked but not carried
// In the in-situ wheel the ring is context, not a menu. Low enough that the
// eye goes to the four modules and stays there.
const SITU_BENCH_ALPHA = 0.16;
const IDLE_ALPHA = PAD_ALPHA; // RE-QUIP rests at the same opacity as the pads

/**
 * Readable label colour for a given fill. The 17 primaries deliberately span
 * near-white (Frost) to near-black (Eclipse), so a single fixed ink colour is
 * illegible on roughly half the wheel.
 */
function inkFor(hex) {
  if (!hex) return '#E0F0FF'; // transparent cell (NULL_WEAPON) — light ink on the void
  const n = hexNum(hex);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140 ? '#0A0A12' : '#E0F0FF';
}

/**
 * MODULE WATERMARKS — a sword for the offensive row, a shield for the
 * defensive one.
 *
 * They are drawn on the module itself rather than beside it, so an EMPTY slot
 * still says what belongs in it. That is the job a coloured disc could not do:
 * an empty disc is just a hole, an empty square with a shield in it is an
 * obvious invitation.
 *
 * Deliberately blocky. These sit at 16px inside a 26px square and get
 * integer-scaled up with everything else, so anything finer would alias.
 */
function drawSword(g, cx, cy, s, colour, alpha) {
  g.fillStyle(colour, alpha);
  const b = Math.round(s * 0.5);
  g.fillRect(cx - 1, cy - b, 3, Math.round(s * 0.62));        // blade
  g.fillRect(cx - Math.round(s * 0.34), cy + 1, Math.round(s * 0.68) + 1, 2); // guard
  g.fillRect(cx - 1, cy + 3, 3, Math.round(s * 0.24));        // grip
  g.fillRect(cx - 3, cy + Math.round(s * 0.42), 7, 2);        // pommel
}

function drawShield(g, cx, cy, s, colour, alpha) {
  g.fillStyle(colour, alpha);
  const w = Math.round(s * 0.66), h = Math.round(s * 0.8);
  const x = cx - Math.round(w / 2), y = cy - Math.round(h / 2);
  const flat = Math.round(h * 0.52);
  g.fillRect(x, y, w, flat);
  // Taper to a point in whole-pixel steps, so the bevel stays crisp.
  const steps = 4, band = Math.max(1, Math.round((h - flat) / steps));
  for (let i = 0; i < steps; i++) {
    const iw = Math.max(2, w - Math.round(((i + 1) / steps) * (w - 2)));
    g.fillRect(cx - Math.round(iw / 2), y + flat + i * band, iw, band);
  }
}

/** Padlock glyph for a locked slot: shackle arch over a body with a keyhole. */
function drawPadlock(g, x, y, s) {
  g.lineStyle(Math.max(1, s * 0.15), 0xc8ceda, 1);
  g.beginPath();
  g.arc(x, y - s * 0.2, s * 0.3, Math.PI, Math.PI * 2, false);
  g.strokePath();
  g.fillStyle(0xc8ceda, 1);
  g.fillRect(x - s * 0.42, y - s * 0.04, s * 0.84, s * 0.6);
  g.fillStyle(0x2a2e3a, 1);
  g.fillRect(x - s * 0.08, y + s * 0.14, s * 0.16, s * 0.24);
}

export default class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  init(data) { this.game_ = data.game; }

  create() {
    const w = viewWidthOf(this.scale);
    fitCamera(this, w);
    this.w = w;
    this.g = this.add.graphics();

    /**
     * CONTROL LAYOUT — bigger pads, and each one is a real button.
     *
     * The movement strip is four adjacent buttons rather than an invisible band
     * split by arithmetic, so what you can press is exactly what you can see.
     * The two diagonals are their own buttons, not decorations: several special
     * weapons are planned to fire from a standing diagonal, so the input has to
     * exist as a distinct press before the weapons can use it.
     */
    // 30px, and deliberately short. GROUND_Y sits at VIEW_H-40, so anything
    // taller starts covering the ground itself — and reading ground elevation and
    // the hazards sitting on it matters more than thumb comfort. The size this
    // layout needed came from WIDTH and from the pads being visible at all.
    // Losing the hold is handled by GRACE_UP, not by a taller button.
    this.padH = 30;
    const padY = VIEW_H - this.padH;
    // Sized proportionally then clamped, so all three clusters plus the gap
    // between them still fit at the narrowest supported virtual width (320) and
    // do not sprawl at the widest (480).
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(v)));
    const colW = clamp(w * 0.115, 36, 48);
    this.z3 = { x: 0, y: padY, w: colW * 4, h: this.padH };

    // dir is what movement does now; diag is recorded for the weapons that will
    // read it later. The two inner buttons walk like their outer neighbour.
    this.moveBtns = [
      { x: 0,        w: colW, dir: -1, diag: null, glyph: '◀' },
      { x: colW,     w: colW, dir: -1, diag: 'ul', glyph: '◸' },
      { x: colW * 2, w: colW, dir: 1,  diag: 'ur', glyph: '◹' },
      { x: colW * 3, w: colW, dir: 1,  diag: null, glyph: '▶' },
    ].map((b) => ({ ...b, y: padY, h: this.padH }));

    const actW = clamp(w * 0.17, 52, 78);
    this.z4 = { x: w - actW * 2, y: padY, w: actW * 2, h: this.padH };
    this.actBtns = [
      { id: 'jump', x: w - actW * 2, y: padY, w: actW, h: this.padH, glyph: '[ ]' },
      { id: 'fire', x: w - actW,     y: padY, w: actW, h: this.padH, glyph: '( )' },
    ];

    // HP is drawn as pips in this.g; the text picks up below it
    this.hud = label(this, 4, 15, '', { color: '#E0F0FF' });

    // zone 2 — pause
    this.mkTap(w - 20, 2, 18, 12, '||', () => this.togglePause());

    // Mobile browsers refuse to start audio until a real input happens.
    this.input.on('pointerdown', unlockAudio);

    this.bindZone3();
    this.bindZone4();

    // Creation order IS draw order: the scrim goes in after the HUD and the
    // control glyphs so it dims them too, and before the wheel and the button
    // so both stay at full strength on top of it.
    this.scrim = this.add.rectangle(0, 0, w, VIEW_H, 0x2a2e3a, 0.55)
      .setOrigin(0).setVisible(false).setInteractive();

    // null | 'open' (post-boss, paused) | 'situ' (in-fight, slow motion)
    this.mode = null;
    this.aimSlot = null;
    this.press = null;
    this.buildWheel();
    this.buildRequip();

    // Warp fade — above every other overlay, including the HUD, so a transition
    // is a clean cut to black rather than a dimmed-but-still-readable screen.
    this.fade = this.add.rectangle(0, 0, w, VIEW_H, 0x000000, 0)
      .setOrigin(0).setDepth(100).setVisible(false);
  }

  mkTap(x, y, w, h, text, fn) {
    const r = this.add.rectangle(x, y, w, h, 0x0d1420, 0.7).setOrigin(0)
      .setInteractive({ useHandCursor: true });
    const t = label(this, x + w / 2, y + h / 2, text, { color: '#5CADD5', origin: 0.5 });
    r.on('pointerdown', fn);
    return { r, t };
  }

  /** A visible pad: translucent body, glyph, and a brighter state while held. */
  mkPad(b, glyph) {
    const r = this.add.rectangle(b.x, b.y, b.w, b.h, 0x0d1420, PAD_ALPHA).setOrigin(0)
      .setStrokeStyle(1, 0x5cadd5, PAD_ALPHA)
      .setInteractive({ useHandCursor: true });
    const t = label(this, b.x + b.w / 2, b.y + b.h / 2, glyph,
      { scale: 2, color: '#5CADD5', origin: 0.5 }).setAlpha(0.95);
    b.rect = r; b.txt = t;
    return b;
  }

  /**
   * Held state: the fill drops out and only the border and a ghost of the glyph
   * survive, so a pressed pad hides as little of the playfield as possible while
   * still showing you which control your thumb is on.
   */
  litPad(b, on) {
    b.rect.setFillStyle(0x0d1420, on ? PAD_ALPHA_ON : PAD_ALPHA);
    b.rect.setStrokeStyle(1, 0x5cadd5, on ? 0.95 : 0.7);
    b.txt.setAlpha(on ? 0.3 : 0.95);
  }

  /** Is this point still on b, allowing for thumb roll? See GRACE_UP. */
  static within(b, v) {
    return v.x >= b.x - GRACE_X && v.x <= b.x + b.w + GRACE_X
        && v.y >= b.y - GRACE_UP;         // downward is unbounded
  }

  /**
   * Zone 3 — four directional buttons plus drag-down-to-slide.
   *
   * The finger may slide BETWEEN the four movement buttons freely: they are one
   * control drawn as four keys, and re-aiming without lifting is how you turn
   * around mid-fight. Leaving the strip (plus GRACE) releases. That is the
   * middle ground between the two failure modes — an unlimited grip that never
   * lets go, and a per-button `pointerout` that dropped movement whenever a
   * thumb drifted, which read as momentum dying in mid-air.
   *
   * Downward drag is exempt from the release check, because the slide gesture is
   * a deliberate drag toward the bottom edge of the screen.
   */
  bindZone3() {
    const z = this.z3;
    this.moveBtns.forEach((b) => this.mkPad(b, b.glyph));
    let owner = null, startY = 0, slid = false, tapT = 0, active = null;

    const btnAt = (v) => this.moveBtns.find((b) => v.x >= b.x && v.x < b.x + b.w)
      || (v.x < z.x ? this.moveBtns[0] : this.moveBtns[this.moveBtns.length - 1]);

    const aim = (b) => {
      if (active && active !== b) this.litPad(active, false);
      active = b;
      this.litPad(b, true);
      this.game_.setMove(b.dir);
      this.game_.player.diagInput = b.diag;
    };

    const release = () => {
      owner = null;
      if (active) this.litPad(active, false);
      active = null;
      this.game_.setMove(0);
      this.game_.player.diagInput = null;
    };

    this.moveBtns.forEach((b) => b.rect.on('pointerdown', (p) => {
      if (owner !== null) return;                 // already held by another finger
      owner = p.id; slid = false; tapT = performance.now();
      startY = vpt(this, p).y;
      aim(b);
    }));

    this.input.on('pointermove', (p) => {
      if (p.id !== owner || !p.isDown) return;
      const v = vpt(this, p);
      if (!slid && v.y - startY > SLIDE_DEADZONE) { slid = true; this.game_.toggleSlide(); }
      // Sliding down toward the screen edge must not count as leaving the strip,
      // and neither must ordinary upward thumb roll off a 30px pad.
      const left = v.x < z.x - GRACE_X || v.x > z.x + z.w + GRACE_X || v.y < z.y - GRACE_UP;
      if (left) { release(); return; }
      aim(btnAt(v));
    });

    this.input.on('pointerup', (p) => {
      if (owner === null || p.id !== owner) return;
      const quick = !slid && performance.now() - tapT < 150;
      release();
      // a quick tap while sliding cancels the slide
      if (quick && this.game_.player.sliding) this.game_.toggleSlide();
    });
  }

  /**
   * Zone 4 — [] jump and () shoot/charge, as two separate buttons.
   *
   * Each is claimed by its own pointer so both can be held at once — the whole
   * point of the split pad. Unlike the movement strip these do NOT re-target: a
   * finger sliding off jump releases jump rather than becoming a shot, because
   * turning a held jump into a held shot mid-air is never what you meant.
   */
  bindZone4() {
    const held = new Map(); // pointer id -> button
    this.actBtns.forEach((b) => this.mkPad(b, b.glyph));

    const start = (b, p) => {
      if (held.has(p.id) || b.owner != null) return;
      held.set(p.id, b); b.owner = p.id;
      this.litPad(b, true);
      if (b.id === 'jump') this.game_.doJump(); else this.game_.beginFire();
    };

    const stop = (p) => {
      const b = held.get(p.id);
      if (!b) return;
      held.delete(p.id); b.owner = null;
      this.litPad(b, false);
      // releasing jump early cuts the rise — that is variable jump height
      if (b.id === 'jump') this.game_.endJump(); else this.game_.endFire();
    };

    this.actBtns.forEach((b) => b.rect.on('pointerdown', (p) => start(b, p)));
    this.input.on('pointermove', (p) => {
      const b = held.get(p.id);
      if (b && p.isDown && !UIScene.within(b, vpt(this, p))) stop(p);
    });
    this.input.on('pointerup', stop);
  }

  // ── Pause ───────────────────────────────────────────────────────────

  /**
   * The pause button owns a real panel rather than silently freezing the sim.
   * It refuses to open on top of the card screen or the re-quip wheel — those
   * already own `paused`, and toggling it underneath them would resume the game
   * while their overlay stayed up.
   */
  togglePause() {
    if (this.pausePanel) return this.closePause();
    if (this.cards || this.bossPanel || this.mode === 'open') return;
    this.openPause();
  }

  openPause() {
    this.game_.paused = true;
    const cx = this.w / 2;
    this.pausePanel = this.add.container(0, 0).setDepth(60);
    this.pausePanel.add(this.add.rectangle(0, 0, this.w, VIEW_H, 0x060614, 0.9)
      .setOrigin(0).setInteractive());
    this.pausePanel.add(label(this, cx, 60, 'PAUSED', { scale: 2, color: '#5CADD5', origin: 0.5 }));

    const btn = (y, text, colour, fn) => {
      const { rect, txt } = plate(this, cx, y, text, { color: colour, padX: 10, padY: 4 });
      rect.on('pointerdown', fn);
      this.pausePanel.add(rect);
      this.pausePanel.add(txt);
      const t = rect;
    };
    btn(90, 'RESUME', '#5CADD5', () => this.closePause());
    if (dev('bossSelect')) btn(112, 'BOSS SELECT', '#F5D328', () => this.openBossSelect());
    /**
     * DEV — climb every unlocked weapon one rung.
     *
     * A ladder is the hardest thing in the game to reach: real levels come from
     * EXP you have to walk over, and seeing what Lv10 does meant playing a
     * whole run to get there. Deliberately in the PAUSE MENU rather than on the
     * HUD or the wheel — it must never be a thing a thumb can hit while playing,
     * and the wheel is a shipping control that dev tools should stay out of.
     */
    if (dev('levelButton')) {
      btn(134, 'WEAPONS +1 LV', '#B8DC28', () => this.devLevelUp());
      this.devLvTxt = label(this, cx, 152, '', { color: '#6A7A4A', origin: 0.5 });
      this.pausePanel.add(this.devLvTxt);
    }
    btn(174, 'ABORT RUN', '#C04040', () => this.abortRun());
    this.pausePanel.add(label(this, cx, 192, 'ends the run and banks your Chips',
      { color: '#6A5A5A', origin: 0.5 }));
    this.showDevLevels();
  }

  /**
   * DEV — every unlocked weapon gains a level, capped at the real ceiling.
   *
   * Levels only, never unlocks: which weapons you HAVE is what `startUnlocked`
   * decides, and conflating the two would make it impossible to playtest a
   * ladder on a run where you deliberately left something locked.
   */
  devLevelUp() {
    const r = this.game_.run;
    for (const id of r.unlocked) {
      r.wpLevels[id] = Math.min(FEEL.weaponMaxLevel, (r.wpLevels[id] || 1) + 1);
    }
    // The runtimes cache their ladder state at the rung they were created on,
    // so they have to be rebuilt or the new rung would not take effect until
    // the weapon was benched and re-slotted.
    r.wstate = {};
    sfx('levelUp');
    this.showDevLevels();
    this.refreshWheel();
  }

  /** The spread of levels, so the button says what it just did. */
  showDevLevels() {
    if (!this.devLvTxt) return;
    const r = this.game_.run;
    const lv = [...r.unlocked].map((id) => r.wpLevels[id] || 1);
    const lo = Math.min(...lv), hi = Math.max(...lv);
    this.devLvTxt.setText(lo === hi ? `all at LV ${lo}` : `LV ${lo} to ${hi}`);
  }

  /**
   * DEV — pick any boss and restart the area just outside his door.
   *
   * Element-slice development means fighting one boss over and over. Reaching
   * him normally costs a 60-second door timer plus a shuffle bag that may not
   * offer him for sixteen doors, which is the single biggest tax on that loop.
   *
   * Each tile shows the layer you will actually get. With `cycleLayers` on, that
   * wraps 1-2-3-1 rather than sticking at 3, so every layer stays reachable
   * however many times you have already won.
   */
  openBossSelect() {
    if (this.bossPanel) return;
    this.closePause();
    this.game_.paused = true;
    const cx = this.w / 2;
    this.bossPanel = this.add.container(0, 0).setDepth(70);
    // Fully opaque: this is a menu, not an overlay, and at 0.94 the HUD text
    // underneath bled through and collided with the tile labels.
    this.bossPanel.add(this.add.rectangle(0, 0, this.w, VIEW_H, 0x060614, 1)
      .setOrigin(0).setInteractive());
    this.bossPanel.add(label(this, cx, 8, 'BOSS SELECT', { color: '#F5D328', origin: 0.5 }));
    this.bossPanel.add(label(this, cx, 20, 'drops you outside his door · number = layer',
      { color: '#6A6A5A', origin: 0.5 }));

    // 17 tiles laid out to fit the narrowest supported width without scrolling.
    const cols = 6, tw = Math.floor((this.w - 12) / cols) - 2, th = 26;
    const x0 = Math.round((this.w - (cols * (tw + 2) - 2)) / 2);
    BOSSES.forEach((b, i) => {
      const x = x0 + (i % cols) * (tw + 2);
      const y = 34 + Math.floor(i / cols) * (th + 3);
      const layer = bossLayer(save, b.id, dev('cycleLayers'));
      const tile = this.add.rectangle(x, y, tw, th, hexNum(b.primary), 0.85).setOrigin(0)
        .setStrokeStyle(1, hexNum(b.outline), 1)
        .setInteractive({ useHandCursor: true });
      const ink = inkFor(b.primary);
      // 7 chars, not 6 — TEMPEST, GRANITE and ECLIPSE all lose their last
      // letter at 6 and read as TEMPES / GRANIT / ECLIPS.
      const name = label(this, x + tw / 2, y + 5, b.name.split(' ')[0].slice(0, 7),
        { color: ink, origin: 0.5 });
      const lv = label(this, x + tw / 2, y + 16, 'L' + layer, { color: ink, origin: 0.5 });
      tile.on('pointerdown', () => {
        sfx('select');
        this.closeBossSelect();
        this.game_.devJumpToBoss(b);
      });
      this.bossPanel.add([tile, name, lv]);
    });

    const { rect, txt } = plate(this, cx, VIEW_H - 14, 'BACK', { color: '#5CADD5', padX: 10, padY: 3 });
    rect.on('pointerdown', () => { this.closeBossSelect(); this.openPause(); });
    this.bossPanel.add([rect, txt]);
  }

  closeBossSelect() {
    this.bossPanel?.destroy(true);
    this.bossPanel = null;
  }

  closePause() {
    this.pausePanel?.destroy(true);
    this.pausePanel = null;
    this.game_.paused = false;
  }

  /** End the run deliberately — straight to the normal results screen. */
  abortRun() {
    this.pausePanel?.destroy(true);
    this.pausePanel = null;
    this.game_.paused = false;
    this.game_.die();
  }

  // ── Re-quip wheel ───────────────────────────────────────────────────

  /**
   * Built once and then only shown/hidden. The swipe route pops this up mid
   * combat, so tearing down and rebuilding ~40 game objects every time it
   * appeared would be wasteful for no gain.
   */
  /**
   * Built once and then only restyled. `refreshWheel` changes what each disc
   * SHOWS; nothing is ever created or destroyed while the game is running,
   * because the swipe route pops this up mid-combat and rebuilding two dozen
   * game objects every time would be waste for no gain.
   */
  buildWheel() {
    const cx = this.w / 2;
    // Clamped so the oval still fits the narrowest supported virtual width.
    // Only the horizontal radius can ever be the binding one — the vertical is
    // fenced by the labels above and below, not by the screen.
    this.rx = Math.min(cx - 22, RING_RX);
    this.ry = RING_RY;
    this.wheel = this.add.container(0, 0).setVisible(false);

    // The ring and its two labels never change, so they are painted once.
    this.frameG = this.add.graphics();
    this.wheel.add(this.frameG);
    this.drawRing(cx);
    this.wheel.add(label(this, cx, LABEL_OFF_Y, 'OFFENSIVE',
      { color: '#5CADD5', origin: 0.5 }));
    this.wheel.add(label(this, cx, LABEL_DEF_Y, 'DEFENSIVE',
      { color: '#5CADD5', origin: 0.5 }));

    // Benched and locked specials live on the ring, in their class's half.
    this.arcOff = this.mkArc(OFFENSIVE, cx, RING_CY, -1);
    this.arcDef = this.mkArc(DEFENSIVE, cx, RING_CY, 1);
    this.arc = [...this.arcOff, ...this.arcDef];

    // THE FIVE THINGS YOU ARE CARRYING. `id` is filled in by refreshWheel: a
    // module shows whatever is in it, so unlike an arc position it does not
    // belong to one weapon.
    const colL = cx - MOD - MOD_GAP / 2, colR = cx + MOD_GAP / 2;
    const rowT = RING_CY - MOD - MOD_GAP / 2, rowB = RING_CY + MOD_GAP / 2;
    this.active = [
      { kind: 'sidearm', cls: null, index: -1, x: cx - 35, y: SIDEARM_Y, r: SIDEARM_R },
      { kind: 'slot', cls: OFFENSIVE, index: 0, x: colL, y: rowT, mark: 'sword' },
      { kind: 'slot', cls: OFFENSIVE, index: 1, x: colR, y: rowT, mark: 'sword' },
      { kind: 'slot', cls: DEFENSIVE, index: 0, x: colL, y: rowB, mark: 'shield' },
      { kind: 'slot', cls: DEFENSIVE, index: 1, x: colR, y: rowB, mark: 'shield' },
    ].map((s) => (s.kind === 'slot' ? this.mkModule(s) : this.mkSlot(s, 3)));

    // The sidearm's label sits to the RIGHT of its dot, so the pair reads as a
    // caption rather than as a sixth slot competing with the grid.
    this.sidearmTxt = label(this, cx - 25, SIDEARM_Y - 3, '', { color: '#5CADD5' });
    this.wheel.add(this.sidearmTxt);

    // Watermarks and state borders, repainted on every refresh. After the
    // module rectangles so it draws on top of them, before the labels.
    this.moduleG = this.add.graphics();
    this.wheel.add(this.moduleG);
    // The swipe highlight goes ABOVE the modules — an aim marker drawn behind
    // the thing it is marking is not an aim marker.
    this.aimG = this.add.graphics();
    this.wheel.add(this.aimG);
    for (const s of this.active) if (s.abbr) this.wheel.bringToTop(s.abbr);
    for (const s of this.active) if (s.lvl) this.wheel.bringToTop(s.lvl);

    // Under the discs, so a halo reads as light behind a weapon rather than a
    // ring drawn over it.
    this.haloG = this.add.graphics();
    this.wheel.add(this.haloG);
    this.wheel.sendToBack?.(this.haloG);

    // Padlocks and the off-switch cross sit ON TOP of everything else.
    this.lockG = this.add.graphics();
    this.wheel.add(this.lockG);

    this.readName = label(this, cx, READ_Y, '', { color: '#E0F0FF', origin: 0.5 });
    this.readLv = label(this, cx, READ_Y + 9, '', { color: '#5CADD5', origin: 0.5 });
    this.wheel.add([this.readName, this.readLv]);

    // Press-and-hold is resolved at SCENE level, not on the disc: a thumb held
    // for a third of a second drifts, and a disc stops seeing its own pointer
    // the moment it does — the same reason the movement pads track holds here.
    this.input.on('pointerup', () => {
      const sp = this.slotPress;
      this.slotPress = null;
      if (!sp || this.mode !== 'open') return;
      if (performance.now() - sp.t >= HOLD_MS) this.toggleSlot(sp.slot);
      else this.tapSlot(sp.slot);
    });
  }

  /**
   * The outer frame: one circle, drawn as two arcs with a break at each side.
   *
   * The break is what makes it read as SPLIT rather than as a plain circle with
   * two words inside it — the labels alone would not carry that. The lower arc
   * is dimmer because the defensive row is the passive half of the loadout.
   */
  drawRing(cx) {
    const g = this.frameG;
    const gap = 0.16;
    // Phaser Graphics has no elliptical-arc primitive, so each half is stroked
    // as a sampled polyline. 40 steps is smooth at this size and the whole
    // thing is drawn once, not per frame.
    const half = (a, b, alpha) => {
      g.lineStyle(1, CYAN, alpha);
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const th = a + (i / 40) * (b - a);
        const x = cx - Math.cos(th) * this.rx;
        const y = RING_CY - Math.sin(th) * this.ry;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
    };
    half(gap, Math.PI - gap, 0.55);        // upper — the offensive half
    // The lower arc is dimmer because the defensive row is the passive half.
    half(-gap, -(Math.PI - gap), 0.32);
  }

  /**
   * A square loadout module. Black, per the spec — the watermark and the
   * border carry the meaning, and the weapon's own colour arrives in its
   * abbreviation rather than as a fill.
   */
  mkModule(s) {
    const rect = this.add.rectangle(s.x, s.y, MOD, MOD, 0x05070c)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    const cx = s.x + MOD / 2;
    const abbr = label(this, cx, s.y + 5, '', { color: '#E0F0FF', origin: 0.5 });
    const lvl = label(this, cx, s.y + 15, '', { color: '#88AABB', origin: 0.5 });
    const slot = { ...s, chars: 3, disc: rect, abbr, lvl, id: null, cxm: cx };
    rect.on('pointerdown', () => { this.slotPress = { slot, t: performance.now() }; });
    rect.on('pointerover', () => { if (this.mode === 'open') this.setReadout(slot.id); });
    this.wheel.add([rect, abbr, lvl]);
    return slot;
  }

  /** One tappable disc: body, abbreviation, level. Contents are set on refresh. */
  mkSlot(s, chars) {
    const disc = this.add.circle(s.x, s.y, s.r, LOCKED_FILL)
      .setStrokeStyle(1, 0x0a0a12)
      .setInteractive({ useHandCursor: true });
    const abbr = label(this, s.x, s.y - 5, '', { color: '#E0F0FF', origin: 0.5 });
    const lvl = label(this, s.x, s.y + 3, '', { color: '#E0F0FF', origin: 0.5 });
    const slot = { ...s, chars, disc, abbr, lvl, id: null };
    disc.on('pointerdown', () => { this.slotPress = { slot, t: performance.now() }; });
    disc.on('pointerover', () => { if (this.mode === 'open') this.setReadout(slot.id); });
    this.wheel.add([disc, abbr, lvl]);
    return slot;
  }

  /**
   * A class's benched specials, spread along a half-ellipse.
   *
   * `dir` is -1 for the arc above the offensive row and +1 for the one below
   * the defensive row. Both arcs run unbroken — nothing has to be dodged,
   * because the sidearm sits above the ring rather than on it and the readout
   * sits below.
   *
   * POSITIONS ARE CREATED FOR EVERY SPECIAL, INCLUDING LOCKED ONES, but where
   * each one SITS is decided per frame by layoutArc() from how many you have
   * actually unlocked. The order along the arc never changes; only the spacing
   * does.
   */
  mkArc(cls, cx, cy, dir) {
    return specialsOfClass(cls).map((id) => {
      const slot = this.mkSlot(
        { kind: 'arc', cls, index: -1, x: cx, y: cy, r: ARC_SLOT_R, dir }, 3,
      );
      slot.id = id;
      return slot;
    });
  }

  /**
   * Place a class's UNLOCKED specials, centred on the arc and growing outward.
   *
   * They used to sit at absolute positions covering the full half-circle from
   * the first run, so a new player saw two weapons marooned at opposite ends of
   * a ring of padlocks. Now the arc holds only what you have, centred, and it
   * spreads as you earn more — arriving at the full spread exactly when the
   * class is complete.
   *
   * WHAT THIS TRADES, DELIBERATELY. Absolute position is no longer stable: a
   * weapon shifts along the arc as its neighbours unlock. What IS stable is
   * ORDER and therefore RELATIVE position — the Blaze Wheel is always left of
   * the Volt Spark — which is what the owner asked for and what actually gets
   * remembered. It only works because re-quipping is no longer a rushed thing
   * done under fire; it happens after a boss falls, with time to look.
   */
  layoutArc(slots, unlocked) {
    const cx = this.w / 2;
    const live = slots.filter((s) => unlocked.has(s.id) || dev('unlockAnyWeapon'));
    const n = live.length;
    // The full arc, reached only when every special of the class is unlocked.
    const lo = ARC_END, hi = Math.PI - ARC_END;
    const full = specialsOfClass(live[0]?.cls || OFFENSIVE).length || 1;
    // Spacing is the FULL arc's step, so positions land where they eventually
    // will rather than sliding inward as the set grows.
    const step = (hi - lo) / Math.max(1, full - 1);
    const span = step * (n - 1);
    const mid = (lo + hi) / 2;
    const start = mid - span / 2;

    live.forEach((s, i) => {
      const th = n <= 1 ? mid : start + i * step;
      s.x = cx - Math.cos(th) * this.rx;
      s.y = RING_CY + s.dir * Math.sin(th) * this.ry;
      s.disc.setPosition(s.x, s.y);
      s.abbr.setPosition(s.x, s.y - 5);
      s.lvl.setPosition(s.x, s.y + 3);
    });
  }

  buildRequip() {
    // Sits in the gap between the movement strip and the action pads, so no
    // control overlaps another and the middle of the screen stays clear.
    const gapL = this.z3.x + this.z3.w, gapR = this.z4.x;
    const bw = Math.max(44, Math.min(64, gapR - gapL - 6)), bh = this.padH - 6;
    // Nudged up off the very bottom edge — a thumb reaching the lowest few
    // pixels of a phone screen is fighting the system gesture bar.
    const x = Math.round((gapL + gapR) / 2 - bw / 2), y = VIEW_H - this.padH - 4;
    this.reqBox = this.add.rectangle(x, y, bw, bh, 0x0d1420).setOrigin(0)
      .setStrokeStyle(1, 0x5cadd5)
      .setAlpha(IDLE_ALPHA)
      .setInteractive({ useHandCursor: true });
    this.reqTxt = label(this, x + bw / 2, y + bh / 2, 'RE-QUIP',
      { color: '#5CADD5', origin: 0.5 }).setAlpha(IDLE_ALPHA);

    /**
     * THE SLOWDOWN STARTS ON CONTACT, not on the swipe.
     *
     * Waiting for a finger to travel past a deadzone before slowing time meant
     * the most dangerous part of a re-quip — deciding — happened at full speed,
     * and the slow-mo only arrived once you had already committed to a
     * direction. Touching the button IS the decision to look, so that is where
     * the world slows.
     *
     * From there the same touch can resolve two ways, and the player picks
     * without being told which they are doing:
     *   keep moving into a diagonal   the slot that direction owns toggles
     *   lift the finger               the wheel stays up; tap a slot instead
     */
    this.reqBox.on('pointerdown', (p) => {
      if (this.press) return;
      const v = vpt(this, p);
      this.press = { id: p.id, x: v.x, y: v.y, swiping: false };
      if (this.mode === 'situ') { this.closeWheel(); return; }
      if (this.mode !== 'open') this.beginSitu();
    });

    // Move and release are tracked at SCENE level, not on the button: a swipe
    // leaves a 60x20 button within a few pixels, and the button stops seeing
    // its own pointer the moment it does.
    this.input.on('pointermove', (p) => {
      const pr = this.press;
      if (!pr || p.id !== pr.id || !p.isDown || this.mode !== 'situ') return;
      const v = vpt(this, p);
      const dx = v.x - pr.x, dy = v.y - pr.y;
      if (Math.hypot(dx, dy) < SWIPE_DEADZONE) return;
      pr.swiping = true;
      this.aimSwipe(dx, dy);
    });
    this.input.on('pointerup', (p) => {
      const pr = this.press;
      if (!pr || p.id !== pr.id) return;
      this.press = null;
      // A resolved diagonal acts and closes. Anything else LEAVES THE WHEEL UP:
      // the finger lifting is not a cancel, it is the player switching from the
      // swipe route to the tap route mid-gesture.
      if (pr.swiping && this.aimSlot) this.commitSitu();
      else if (this.mode === 'open') this.closeWheel();
      else if (this.mode !== 'situ') this.openWheel();
    });

    /**
     * A TAP ANYWHERE ELSE CANCELS. Registered on the scrim rather than as a
     * global handler so it can never swallow a press meant for a pad — the
     * scrim only exists while a wheel is up.
     */
    this.scrim.on('pointerdown', () => {
      if (this.mode === 'situ') this.closeWheel();
    });
  }

  /**
   * The in-situ wheel: time crawls, the ring ghosts in, nothing is committed.
   *
   * It is NOT the same control as the post-boss wheel and must not feel like
   * it. Here the only thing you can touch is the four modules you are already
   * carrying — the sidelined weapons are drawn right down, because changing
   * what you CARRY is a between-fights decision and offering it here would be
   * offering something the game is about to refuse.
   */
  beginSitu() {
    this.mode = 'situ';
    this.aimSlot = null;
    this.refreshWheel();
    this.wheel.setVisible(true).setAlpha(IDLE_ALPHA);
    this.scrim.setVisible(true).setAlpha(0.25);
    this.game_.setTimeScale(FEEL.requipSlowScale, FEEL.requipSlowInFrames);
    this.setReadout(this.game_.run.activeWeapon);
    // A DEAD MAN'S HANDLE. Slow motion with no way out would be a soft lock for
    // anyone who opened this by accident, and the player's hands are already
    // full. Seven seconds is long enough to read four modules and decide.
    this.situTimer?.remove();
    this.situTimer = this.time.delayedCall(SITU_TIMEOUT_MS, () => {
      if (this.mode === 'situ') this.closeWheel();
    });
  }

  /**
   * Which slot a swipe direction owns. The four diagonals map onto the 2x2 grid
   * exactly as it is drawn — up-left is the top-left module — so the gesture is
   * readable off the screen rather than memorised.
   */
  aimSwipe(dx, dy) {
    // BOTH axes have to be real. A flat horizontal or vertical flick is not one
    // of the four, and guessing at the nearest diagonal would fire a slot the
    // player never aimed at.
    const min = SWIPE_DEADZONE * 0.6;
    if (Math.abs(dx) < min || Math.abs(dy) < min) { this.aimSlot = null; this.drawAim(); return; }
    const cls = dy < 0 ? OFFENSIVE : DEFENSIVE;
    const index = dx < 0 ? 0 : 1;
    const hit = this.active.find(
      (s) => s.kind === 'slot' && s.cls === cls && s.index === index && !s.vacant,
    );
    this.aimSlot = hit || null;
    if (hit) this.setReadout(hit.id, hit);
    this.drawAim();
  }

  /** Resolve the aimed diagonal: toggle that slot, then get out of the way. */
  commitSitu() {
    const s = this.aimSlot;
    this.aimSlot = null;
    if (s) this.toggleSlot(s);
    this.closeWheel();
  }

  /**
   * Sync every disc to the current loadout, unlock state and levels.
   *
   * Four visual states, and they have to be distinguishable at a glance under
   * fire: CARRIED (full colour), SWITCHED OFF (dim with a cross), BENCHED (half
   * strength), LOCKED (grey under a padlock). A benched weapon and a locked one
   * looking alike was the specific failure of the old wheel.
   */
  refreshWheel() {
    const r = this.game_.run, lo = r.loadout;
    this.lockG.clear();
    this.moduleG.clear();
    this.haloG.clear();
    // The padlocks ride the ring's emphasis. Left at full strength they were
    // the brightest thing on an in-situ wheel whose whole point is that the
    // ring is not available.
    this.lockG.setAlpha(this.mode === 'situ' ? 0.2 : 1);

    // Where the arc discs SIT is recomputed every refresh from what is
    // unlocked — see layoutArc. Done first, because the swipe aim and the
    // readout both read positions back off these objects.
    this.layoutArc(this.arcOff, r.unlocked);
    this.layoutArc(this.arcDef, r.unlocked);

    // Modules take whatever is in them; an empty one keeps its frame and its
    // watermark rather than vanishing, so the two-per-class cap is always
    // visible and an empty slot reads as an invitation.
    for (const s of this.active) {
      s.id = s.kind === 'sidearm' ? SIDEARM_ID : Loadout.slotsOf(lo, s.cls)[s.index];
      // LOADOUT MASTERY, straight onto the module. A position past your rank is
      // padlocked exactly like a weapon you have not unlocked, because it is
      // the same kind of "not yet" and should not need a second visual language.
      s.rankLocked = s.kind === 'slot' && Loadout.slotLocked(lo, s.cls, s.index);
      s.pinned = s.kind === 'slot' && Loadout.pinnedAt(lo, s.cls) === s.index;
      if (s.rankLocked) s.id = null;
    }

    const pending = r.pendingLoadout;
    const wanted = pending ? classOf(pending) : null;

    for (const s of [...this.active, ...this.arc]) {
      const wd = weaponOf(s.id);
      const unlocked = !!s.id && r.unlocked.has(s.id);
      const carried = !!s.id && s.kind !== 'arc';
      // Only a weapon in a MODULE can be switched off. A benched one is not
      // 'off', it is simply not carried, and marking it so would say the
      // wrong thing about a weapon that is one tap from working fine.
      const off = carried && !Loadout.isEnabled(lo, s.id);
      s.locked = s.rankLocked || (!!s.id && !unlocked);

      // A weapon that is currently SLOTTED vacates its arc position. Showing it
      // in both places at once made the wheel read as two copies of the same
      // weapon, and left the player wondering which one they were about to
      // touch. The position is reserved, not reused — nothing else slides into
      // the hole, so the arc stays learnable.
      // The SIDEARM'S DOT is its bench, and follows the same rule: it only
      // appears when the sidearm is not in a module. Below offensive rank 3 it
      // is welded into one, so the dot simply never shows — which is correct,
      // because there is nothing you could do with it there.
      s.vacant = (s.kind === 'arc' || s.kind === 'sidearm')
        && Loadout.isEquipped(lo, s.id);

      /**
       * WHAT YOU HAVE NOT EARNED IS NOT DRAWN.
       *
       * A padlocked disc for every weapon you have not unlocked told a new
       * player the size of the arsenal and nothing else — seventeen padlocks on
       * a first run is a wall of things you cannot do. Same for a slot past
       * your Loadout Mastery rank: at 0/0 the wheel should be ONE module
       * holding the sidearm, not one module and three padlocks.
       *
       * Dev mode keeps them visible, because there the padlock is the point —
       * `unlockAnyWeapon` equips straight through it.
       */
      if (!dev('unlockAnyWeapon')) {
        if (s.kind === 'arc' && !unlocked) s.vacant = true;
        if (s.rankLocked) s.vacant = true;
      }
      s.disc.setVisible(!s.vacant);
      if (s.vacant) {
        s.abbr.setVisible(false);
        s.lvl.setVisible(false);
        continue;
      }

      if (s.kind === 'slot') {
        this.paintModule(s, {
          unlocked, off, wanted, selected: this.target === s, rankLocked: s.rankLocked,
        });
      } else {
        this.paintDisc(s, { wd, unlocked });
      }

      // ONLY MODULES CARRY TEXT. Eleven benched offensive weapons on a
      // half-circle land about 15px apart, and a three-glyph label is 17px
      // wide — they collided with each other and with the arc labels no matter
      // how the ring was sized. Out here a weapon is identified by its COLOUR,
      // which is what the perceptually-spaced 17 primaries are for, and the
      // readout names whatever you touch. Locked ones show a padlock only.
      const show = s.kind === 'slot' && !!s.id && unlocked;
      const ink = s.kind === 'slot'
        ? (wd.palette.primary || '#E0F0FF')
        : inkFor(wd.palette.primary);
      s.abbr.setVisible(show)
        .setText(show ? wd.short.slice(0, s.chars) : '')
        .setTint(hexNum(ink))
        .setAlpha(off ? 0.4 : 1);
      s.lvl.setVisible(show)
        .setText(show ? `L${r.wpLevels[s.id] || 1}` : '')
        .setAlpha(off ? 0.4 : 1);
      if (s.kind !== 'slot') s.lvl.setTint(hexNum(ink));

      const mx = s.kind === 'slot' ? s.cxm : s.x;
      s.abbr.setX(mx); s.lvl.setX(mx);

      const glyphR = s.kind === 'slot' ? MOD * 0.4 : s.r * 1.5;
      const gx = s.kind === 'slot' ? s.cxm : s.x;
      const gy = s.kind === 'slot' ? s.y + MOD / 2 : s.y;
      if (s.locked) drawPadlock(this.lockG, gx, gy, glyphR);
    }

    // The sidearm's caption, which lives and dies with its dot. When the sidearm
    // is in a module the module's own label says so, and a second copy up here
    // would read as a sixth weapon.
    const bench = this.active.find((s) => s.kind === 'sidearm');
    this.sidearmTxt
      .setVisible(!bench.vacant)
      .setText(`SIDE ARM  L${r.wpLevels[SIDEARM_ID] || 1}`);
  }

  /**
   * Paint one loadout module: black body, watermark, and a border that IS the
   * state. Cyan means equipped and running; a switched-off module drops to the
   * dark grid frame, which holds the 2x2 shape together without claiming the
   * weapon is doing anything.
   */
  paintModule(s, { unlocked, off, selected, wanted, rankLocked }) {
    const g = this.moduleG;
    const cx = s.cxm, cy = s.y + MOD / 2;
    const filled = !!s.id && unlocked;

    // The watermark says what BELONGS here, so it is brightest on an empty
    // module and recedes behind a weapon that has moved in. A position you have
    // not bought yet gets the faintest of all: the shape is still there, so the
    // row's full size is visible as something to work toward, but it does not
    // invite a tap that would do nothing.
    const markA = rankLocked ? 0.16 : !filled ? 0.75 : off ? 0.28 : 0.45;
    if (s.mark === 'sword') drawSword(g, cx, cy, 16, CYAN, markA);
    else drawShield(g, cx, cy, 16, CYAN, markA);

    // ACTIVE IS THE BORDER, and that is the whole vocabulary: cyan means this
    // module is carrying something and running it, no border means it is not.
    // A red cross used to mark the switched-off case and it read as an error
    // rather than as a choice the player had made.
    const running = filled && !off && !rankLocked;
    g.lineStyle(running ? 2 : 1, running ? CYAN : FRAME_DARK,
      rankLocked ? 0.4 : running ? 0.95 : 0.8);
    g.strokeRect(s.x + 0.5, s.y + 0.5, MOD - 1, MOD - 1);

    // White corners mark the SELECTED module — the one a weapon tapped on the
    // ring will drop into. A second border colour would compete with the cyan;
    // corner ticks read as an annotation on top of it.
    if (selected) {
      g.fillStyle(0xFFFFFF, 0.95);
      for (const [dx, dy] of [[0, 0], [MOD - 4, 0], [0, MOD - 2], [MOD - 4, MOD - 2]]) {
        g.fillRect(s.x + dx, s.y + dy, 4, 2);
      }
    }
    // The acquire-time picker pulses the class that just gained a weapon.
    if (wanted && s.cls === wanted) {
      g.lineStyle(1, 0xF5D328, 0.9);
      g.strokeRect(s.x - 2.5, s.y - 2.5, MOD + 4, MOD + 4);
    }
  }

  /**
   * Paint a benched or locked special out on the ring.
   *
   * TWO WHEELS, INVERSE EMPHASIS. After a boss falls the sidelined weapons are
   * the point, so they get a halo. In the in-situ wheel they are not available
   * at all — you cannot change what you CARRY mid-fight — so they drop right
   * back and stop reading as things to touch. The player never has to be told
   * which wheel they are in; the brightness says it.
   */
  paintDisc(s, { wd, unlocked }) {
    const fill = unlocked ? hexNum(wd.palette.primary || '#5CADD5') : LOCKED_FILL;
    const situ = this.mode === 'situ';
    s.disc.setFillStyle(fill)
      .setAlpha(situ ? SITU_BENCH_ALPHA : unlocked ? BENCH_ALPHA : LOCKED_ALPHA)
      .setScale(1)
      .setStrokeStyle(1, hexNum(wd.palette.outline || '#0A0A12'));

    // THE HALO — a ring around every weapon you could actually take right now.
    // Only ever drawn in the post-boss wheel, and only on something unlocked
    // and benched, so it means exactly one thing: this is the rare moment.
    if (!situ && unlocked && this.mode === 'open' && this.game_.canRequip()) {
      this.haloG.lineStyle(1, 0xF5D328, 0.55);
      this.haloG.strokeCircle(s.x, s.y, s.r + 3);
      this.haloG.lineStyle(1, 0xF5D328, 0.22);
      this.haloG.strokeCircle(s.x, s.y, s.r + 5);
    }
  }

  /** TAP route — hard pause, everything unlocked comes up to full opacity. */
  openWheel() {
    this.mode = 'open';
    this.target = null;
    this.game_.paused = true;
    // The HUD goes away for the POST-BOSS route only. The game is stopped, so
    // score and energy are not telling you anything you need right now, and the
    // dev diagnostic line runs straight through where the sidearm sits. The
    // in-situ route keeps it, because there the fight is still happening.
    this.hud.setVisible(false);
    this.refreshWheel();
    this.aimSlot = null;
    this.scrim.setVisible(true).setAlpha(0.55);
    this.wheel.setVisible(true).setAlpha(1);
    this.reqBox.setAlpha(1);
    this.reqTxt.setAlpha(1);
    this.setReadout(this.game_.run.activeWeapon);
    this.drawAim();
  }

  closeWheel() {
    const wasSitu = this.mode === 'situ';
    this.mode = null;
    this.target = null;
    this.aimSlot = null;
    this.situTimer?.remove();
    this.situTimer = null;
    this.aimG.clear();
    // Time comes back whichever way the in-situ wheel was left — swiped,
    // tapped, timed out or cancelled. Leaving slow motion running because a
    // gesture ended down an unexpected branch would be unrecoverable.
    if (wasSitu) this.game_.setTimeScale(1, FEEL.requipSlowOutFrames);
    this.hud.setVisible(true);
    // Closing on an unresolved acquire IS the answer: the new weapon goes to
    // the bench. It keeps its level and stays one tap away in the arc, so this
    // is a real third option rather than a way to get stuck.
    this.game_.run.pendingLoadout = null;
    this.game_.paused = false;
    this.scrim.setVisible(false);
    this.wheel.setVisible(false);
    this.reqBox.setAlpha(IDLE_ALPHA);
    this.reqTxt.setAlpha(IDLE_ALPHA);
  }






  /**
   * The marker around the module a swipe has landed on.
   *
   * Drawn rather than scaled: a module is a rectangle with a top-left origin,
   * so growing it to show selection would slide it out of the grid instead of
   * swelling in place. No aim LINE any more — the four diagonals are read off
   * the grid itself, and a line drawn from a thumb at the bottom of the screen
   * only crossed the thing it was pointing at.
   */
  drawAim() {
    const g = this.aimG;
    g.clear();
    const s = this.aimSlot;
    if (!s) return;
    g.lineStyle(2, 0xf5d328, 0.95);
    g.strokeRect(s.x - 2, s.y - 2, MOD + 4, MOD + 4);
  }

  /**
   * The one line of text on the wheel, and therefore the only place a "no" can
   * be explained. `slot` is the module that was touched, when one was — a
   * padlocked position has no weapon to name, so it has to speak for itself.
   *
   * The font drops any glyph it lacks silently (see FONT_CHARS), so every
   * string here stays inside plain uppercase, digits and spaces.
   */
  setReadout(id, slot = null) {
    const r = this.game_.run, lo = r.loadout;

    // A position you have not bought. Say which upgrade opens it.
    if (slot && slot.rankLocked) {
      this.readName.setText(slot.cls === OFFENSIVE ? 'OFFENSIVE SLOT 2' : 'DEFENSIVE SLOT');
      this.readLv.setText(`${slot.cls.toUpperCase()} MASTERY OPENS THIS`);
      return;
    }
    if (r.pendingLoadout) {
      this.readName.setText(weaponOf(r.pendingLoadout).name);
      this.readLv.setText('CHOOSE A SLOT OR BENCH');
      return;
    }
    if (!id) {
      this.readName.setText('EMPTY SLOT');
      this.readLv.setText(this.game_.canRequip()
        ? 'TAP A WEAPON FROM THE ARC'
        : 'BEAT A BOSS TO RE QUIP');
      return;
    }
    const wd = weaponOf(id);
    this.readName.setText(wd.name);
    this.readLv.setText(
      !r.unlocked.has(id) ? 'LOCKED'
        // The sidearm's welded position is not a restriction the player did
        // anything wrong to hit, so it reads as a fact about the slot.
        : slot && slot.pinned ? `Lv ${r.wpLevels[id] || 1}  FIXED SLOT`
          : !Loadout.isEnabled(lo, id) ? `Lv ${r.wpLevels[id] || 1}  OFF`
            : `Lv ${r.wpLevels[id] || 1}  ${wd.cls.toUpperCase()}`,
    );
  }

  /**
   * A tap, resolved by what was tapped.
   *
   * TWO TAPS, ALWAYS THE SAME TWO. Tapping a module SELECTS it — white corners
   * — and tapping a weapon then puts that weapon in it. One gesture for both
   * classes and for every slot, rather than the old arrangement where an
   * offensive module meant "make this live", a defensive one meant nothing at
   * all, and a benched weapon landed in whichever slot the game picked for you.
   *
   * Tapping the selected module again clears the selection, so the gesture is
   * reversible without a second control.
   */
  tapSlot(s) {
    if (s.vacant) return;
    const r = this.game_.run;

    // IN SITU THE RING IS SCENERY. Only the modules answer a touch, and a
    // touch on one toggles it and gets out of the way — which is the whole
    // interaction, and why it needs no instructions.
    if (this.mode === 'situ') {
      if (s.kind !== 'slot' || s.rankLocked || !s.id) return;
      this.toggleSlot(s);
      this.closeWheel();
      return;
    }

    if (s.kind === 'slot') {
      // A position past your Loadout Mastery rank is not selectable — there is
      // nothing to put in it. The readout says why rather than the tap simply
      // doing nothing, which is how a padlock turns into a goal.
      if (s.rankLocked) { this.setReadout(null, s); return; }
      // A boss drop waiting for a home short-circuits the selection: the wheel
      // opened to ask this exact question, so answer it.
      if (r.pendingLoadout && classOf(r.pendingLoadout) === s.cls
          && Loadout.canEquip(r.loadout, r.pendingLoadout, s.index)) {
        this.installPending(s);
        return;
      }
      this.target = this.target === s ? null : s;
      this.refreshWheel();
      this.setReadout(s.id, s);
      return;
    }

    // A benched or locked weapon — on the ring, or the sidearm on its own dot,
    // which behaves identically now that the sidearm competes for a slot.
    if (!r.unlocked.has(s.id) && !dev('unlockAnyWeapon')) return;
    const cls = classOf(s.id);
    // Into the selected module when the classes agree; otherwise fall back to
    // the automatic landing slot, so tapping a weapon is never a dead end even
    // if you have not selected anything.
    const index = this.target && this.target.cls === cls && !this.target.rankLocked
      ? this.target.index
      : this.landingSlot(s.id);
    if (this.game_.equipSlot(s.id, index)) {
      sfx('requip');
      this.target = null;
    }
    this.refreshWheel();
    this.setReadout(s.id);
  }

  /**
   * Which slot a benched weapon should displace.
   *
   * An empty one if there is one; otherwise the slot that is NOT the weapon
   * currently on the fire button, so a one-tap swap never silently disarms the
   * thing you were shooting with.
   */
  landingSlot(id) {
    const r = this.game_.run, lo = r.loadout, cls = classOf(id);
    const legal = [];
    for (let i = 0; i < Loadout.slotCount(lo, cls); i++) {
      if (Loadout.canEquip(lo, id, i)) legal.push(i);
    }
    if (!legal.length) return -1;
    const slots = Loadout.slotsOf(lo, cls);
    const empty = legal.find((i) => !slots[i]);
    if (empty != null) return empty;
    const keep = legal.filter((i) => slots[i] !== r.activeWeapon);
    return keep.length ? keep[0] : legal[0];
  }

  /**
   * Press-and-hold: switch a carried weapon off without giving up the slot.
   *
   * Works on both rows. A defensive weapon runs by itself, so switching it off
   * is the ONLY way to quiet it; an offensive one keeps its slot and its levels
   * while it sits out.
   *
   * WHERE MASTERY CAPS HOW MANY MAY RUN, this is a radio switch instead: at
   * offensive rank 1 it moves the one live position between the special and the
   * sidearm, and at defensive rank 2 between the two defensive slots. Same
   * gesture, and the cyan border always says which one won — so the player
   * never has to know it changed meaning.
   *
   * Unlike equipping, this is NOT gated to the post-boss window. It cannot
   * change what you are carrying, only which of it is awake, and that is a
   * moment-to-moment call.
   */
  toggleSlot(s) {
    const r = this.game_.run;
    if (!s.id || s.kind !== 'slot' || s.rankLocked) return;
    if (!r.unlocked.has(s.id) && !dev('unlockAnyWeapon')) return;
    sfx('select');
    this.game_.toggleWeapon(s.id);
    this.refreshWheel();
    this.setReadout(s.id, s);
  }

  /** Resolve the post-boss loadout choice into the slot the player picked. */
  installPending(s) {
    const r = this.game_.run;
    const id = r.pendingLoadout;
    if (!this.game_.equipSlot(id, s.index)) return;
    sfx('requip');
    r.pendingLoadout = null;
    this.refreshWheel();
    this.setReadout(id);
  }

  /**
   * Trace `t` of a rectangle's perimeter clockwise from the top-left, over a
   * dim full-perimeter track. Used for the EXP ring around the energy bar.
   */
  strokeProgress(g, x, y, w, h, t) {
    g.fillStyle(0x33301a, 1);
    g.fillRect(x, y, w, 1); g.fillRect(x + w - 1, y, 1, h);
    g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h);

    let left = Math.max(0, Math.min(1, t)) * ((w + h) * 2);
    g.fillStyle(0xf5d328, 1);
    const seg = (len, draw) => {
      const d = Math.min(left, len);
      if (d > 0) draw(d);
      left -= d;
    };
    seg(w, (d) => g.fillRect(x, y, d, 1));                     // top, L->R
    seg(h, (d) => g.fillRect(x + w - 1, y, 1, d));             // right, T->B
    seg(w, (d) => g.fillRect(x + w - d, y + h - 1, d, 1));     // bottom, R->L
    seg(h, (d) => g.fillRect(x, y + h - d, 1, d));             // left, B->T
  }

  // ── Level-up cards ──────────────────────────────────────────────────

  /**
   * Offer the level-up choice. Always an E-Tank and a Chips card, plus up to
   * FEEL.cardWeaponChoices weapon level-ups drawn from unlocked, non-maxed
   * weapons — or from every weapon when dev mode says so.
   *
   * The screen is rebuilt per level because a single large EXP orb can grant
   * several levels at once, and each one is its own decision.
   */
  openCards() {
    const r = this.game_.run;
    this.game_.paused = true;

    const pool = WHEEL_ORDER.filter((id) => {
      const unlocked = r.unlocked.has(id) || dev('cardsFromAllWeapons');
      return unlocked && (r.wpLevels[id] || 1) < FEEL.weaponMaxLevel;
    });
    const picks = [...pool].sort(() => Math.random() - 0.5)
      .slice(0, FEEL.cardWeaponChoices);

    const cards = picks.map((id) => {
      const wd = weaponOf(id);
      const lv = r.wpLevels[id] || 1;
      return {
        // The short name, not the first word: NULLFIRE DRONE reads as N-DRONE
        // on a card, and "NULLFIRE" would not match what the wheel shows.
        title: wd.short,
        sub: r.unlocked.has(id) ? `Lv ${lv} -> ${lv + 1}` : `LOCKED  Lv ${lv}->${lv + 1}`,
        tint: wd.palette.primary || '#5CADD5',
        take: () => {
          r.wpLevels[id] = (r.wpLevels[id] || 1) + 1;
          if (!r.unlocked.has(id)) r.unlocked.add(id); // dev-mode pick
        },
      };
    });

    cards.push({
      title: 'E-TANK', sub: 'Refill energy', tint: '#E11416',
      take: () => { r.hp = FEEL.hpMax + r.hpBonus + r.runHpBonus; },
    });
    cards.push({
      title: 'CHIPS', sub: `+${FEEL.cardChips}`, tint: '#F5D328',
      take: () => { save.chips += FEEL.cardChips; persist(); },
    });

    this.buildCardPanel(cards, r.level);
  }

  buildCardPanel(cards, level) {
    this.cards = this.add.container(0, 0).setDepth(50);
    this.cards.add(this.add.rectangle(0, 0, this.w, VIEW_H, 0x060614, 0.93).setOrigin(0)
      .setInteractive());
    this.cards.add(label(this, this.w / 2, 12, `LEVEL ${level}`,
      { scale: 2, color: '#F5D328', origin: 0.5 }));
    this.cards.add(label(this, this.w / 2, 30, 'CHOOSE ONE', { color: '#5CADD5', origin: 0.5 }));

    const n = cards.length;
    const cw = Math.min(64, (this.w - 16) / n - 4);
    const total = n * cw + (n - 1) * 4;
    const x0 = (this.w - total) / 2;

    cards.forEach((c, i) => {
      const x = x0 + i * (cw + 4), y = 44, h = 74;
      const col = hexNum(c.tint);
      const box = this.add.rectangle(x, y, cw, h, col, 0.22).setOrigin(0)
        .setStrokeStyle(1, col, 1).setInteractive({ useHandCursor: true });
      box.on('pointerdown', () => { sfx('select'); c.take(); this.closeCards(); });
      this.cards.add(box);
      this.cards.add(label(this, x + cw / 2, y + 26, c.title, { color: '#E0F0FF', origin: 0.5 }));
      this.cards.add(label(this, x + cw / 2, y + 52, c.sub, { color: '#88AABB', origin: 0.5 }));
    });
  }

  closeCards() {
    this.cards?.destroy(true);
    this.cards = null;
    const r = this.game_.run;
    r.pendingLevelUps = Math.max(0, r.pendingLevelUps - 1);
    // More levels banked (one big orb can grant several) — straight into the next.
    if (r.pendingLevelUps > 0) this.openCards();
    else this.game_.paused = false;
  }

  update() {
    const gm = this.game_;
    if (!gm?.run) return;

    const wa = gm.warp?.alpha ?? 0;
    this.fade.setVisible(wa > 0).setAlpha(wa);
    // Card screen takes priority over every other overlay.
    if (gm.run.pendingLevelUps > 0 && !this.cards && !this.pausePanel) this.openCards();
    const r = gm.run, w = weaponOf(r.activeWeapon);
    const maxHp = FEEL.hpMax + r.hpBonus + r.runHpBonus;
    // A DEV marker whenever perks are active — a playtest you misread as
    // "balanced" while invincible is worse than no playtest at all.
    // THE DIAGNOSTIC LINE — the three things that make a playtest note
    // actionable instead of anecdotal.
    //
    //   b1034     which build. "It felt better before" needs a before.
    //   s4821     the run's world seed. Names an exact world I can rebuild and
    //             keep as a regression test — see systems/rng.js.
    //   5x ...    render density and the viewport it was picked from. Density
    //             is chosen once at startup and a platform change can move it
    //             with no code change; 4x to 5x is 56% more pixels per frame,
    //             which reads as "sluggish" with nothing visibly different.
    //
    // Only glyphs the bitmap font actually has — see FONT_CHARS in
    // systems/font.js. `fold()` silently DROPS anything missing, so an "@"
    // here renders as nothing and the line quietly lies about the DPR.
    const diag = DEV.enabled
      ? `\nb${BUILD} s${gm.seed} ${DISPLAY_DIAG.scale}x `
        + `${DISPLAY_DIAG.cssW}x${DISPLAY_DIAG.cssH} dpr${DISPLAY_DIAG.dpr.toFixed(2)}`
      : '';
    this.hud.setText(
      `SC ${String(Math.floor(r.score)).padStart(6, '0')}  Lv${r.level}` +
        (DEV.enabled ? '  [DEV]' : '') + '\n' +
      `${w.name} L${r.wpLevels[r.activeWeapon] || 1}` + diag,
    );

    // THE WEAPON-ACQUIRE SEQUENCE. The banner names what the boss dropped;
    // then, only if both slots of that class are already full, the wheel opens
    // on the choice. A weapon that fitted straight into a free slot needs no
    // decision and does not get a menu.
    if (r.justUnlocked) {
      if (!this.unlockMsg) {
        this.unlockMsg = label(this, this.w / 2, 44, '', { color: '#F5D328', origin: 0.5 });
        this.unlockAt = performance.now();
      }
      const wd = weaponOf(r.justUnlocked);
      this.unlockMsg.setText(`${wd.name} ACQUIRED`);
      if (performance.now() - this.unlockAt > 2500) {
        this.unlockMsg.destroy();
        this.unlockMsg = null;
        r.justUnlocked = null;
      }
    } else if (r.pendingLoadout && this.mode !== 'open'
      && !this.cards && !this.pausePanel && !gm.warp) {
      // Deliberately after the banner has run its course, so the player has
      // read WHAT they got before being asked where to put it.
      this.openWheel();
    }

    // The pads draw themselves now (real rectangles with glyphs, lit while held),
    // so there are no control glyphs to paint here.
    const g = this.g;
    g.clear();
    // Energy pips, one per point of max HP, with EXP as a yellow outline around
    // the whole bar. Tying EXP to the bar's perimeter means it rescales for free
    // when an Energy Tank widens the bar.
    const pipW = 4, pipH = 6, gap = 1, bx = 5, by = 5;
    for (let i = 0; i < maxHp; i++) {
      g.fillStyle(i < r.hp ? 0x5cadd5 : 0x14243a, 1);
      g.fillRect(bx + i * (pipW + gap), by, pipW, pipH);
    }
    const barW = maxHp * (pipW + gap) - gap;
    this.strokeProgress(g, bx - 2, by - 2, barW + 4, pipH + 4, r.exp / r.expToNext);
  }
}
