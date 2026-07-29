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
 *   TAP    hard pause. Gameplay dims, the wheel and every unlocked weapon come
 *          up to full opacity. The safe read-everything-and-choose route.
 *   SWIPE  no pause. Time collapses to a crawl, a ghosted wheel appears, and
 *          the DIRECTION of the swipe picks the weapon. Fast, but it costs real
 *          seconds and you are still being shot at.
 *
 * Slot positions are fixed (WHEEL_ORDER in data/weapons.js) whether or not a
 * weapon is unlocked. Locked slots stay in place under a padlock rather than
 * being skipped, so the wheel never reshuffles under your thumb as bosses fall
 * and the swipe can become muscle memory.
 */

import Phaser from 'phaser';
import { VIEW_H, viewWidthOf } from '../config/display.js';
import { TEXT_RES, fitCamera } from '../systems/text.js';
import { FEEL } from '../config/feel.js';
import { weaponOf, WHEEL_ORDER } from '../data/weapons.js';
import { dev, DEV } from '../config/dev.js';
import { save, persist } from '../systems/save.js';
import { hexNum } from '../systems/assets.js';

const SLIDE_DEADZONE = 14; // virtual px of downward drag before a slide fires
const SWIPE_DEADZONE = 10; // virtual px of travel before a re-quip tap becomes a swipe

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
 * Deliberately MILD. An unlimited grip (tracking the finger anywhere on screen
 * until it lifts) stops a control ever releasing when you roll your thumb onto
 * a neighbour; zero grip drops a held jump the instant your thumb shifts, which
 * cuts the rise mid-flight. A few pixels covers normal thumb roll and nothing
 * more.
 */
const GRACE = 8;

// Controls are visible but recede: solid enough to aim at, faint enough not to
// cover the playfield. They brighten on press so a touch is confirmed on screen.
const PAD_ALPHA = 0.30;
const PAD_ALPHA_ON = 0.62;

// Wheel geometry. Sized to clear the HUD above and both thumb pads below on the
// narrowest supported virtual width (320).
const WHEEL_CY = 100;
const WHEEL_R = 64;
const SLOT_R = 9;
const LOCKED_FILL = 0x3a3f4a;
const LOCKED_ALPHA = 0.45;
const IDLE_ALPHA = 0.5; // the button's resting transparency

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
    // Height is capped by the FLOOR, not by thumb comfort: GROUND_Y sits at
    // VIEW_H-40, so a taller pad starts covering actors standing on the ground —
    // and during Blaze Man's layer-3 flood it would hide the lava you are
    // standing in. The size increase this layout needed came from WIDTH and from
    // the pads being visible at all, not from eating the playfield.
    this.padH = 46;
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
    this.hud = this.add.text(4, 15, '', { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '7px', color: '#E0F0FF' });

    // zone 2 — pause
    this.mkTap(w - 20, 2, 18, 12, '||', () => this.togglePause());

    this.bindZone3();
    this.bindZone4();

    // Creation order IS draw order: the scrim goes in after the HUD and the
    // control glyphs so it dims them too, and before the wheel and the button
    // so both stay at full strength on top of it.
    this.scrim = this.add.rectangle(0, 0, w, VIEW_H, 0x2a2e3a, 0.55)
      .setOrigin(0).setVisible(false).setInteractive();

    this.mode = null;   // null | 'open' (paused) | 'swipe' (slow motion)
    this.aimIndex = -1;
    this.press = null;
    this.buildWheel();
    this.buildRequip();

    // Warp fade — above every other overlay, including the HUD, so a transition
    // is a clean cut to black rather than a dimmed-but-still-readable screen.
    this.fade = this.add.rectangle(0, 0, w, VIEW_H, 0x000000, 0)
      .setOrigin(0).setDepth(100).setVisible(false);
  }

  mkTap(x, y, w, h, label, fn) {
    const r = this.add.rectangle(x, y, w, h, 0x0d1420, 0.7).setOrigin(0)
      .setInteractive({ useHandCursor: true });
    const t = this.add.text(x + w / 2, y + h / 2, label,
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '7px', color: '#5CADD5' }).setOrigin(0.5);
    r.on('pointerdown', fn);
    return { r, t };
  }

  /** A visible pad: translucent body, glyph, and a brighter state while held. */
  mkPad(b, glyph) {
    const r = this.add.rectangle(b.x, b.y, b.w, b.h, 0x0d1420, PAD_ALPHA).setOrigin(0)
      .setStrokeStyle(1, 0x5cadd5, PAD_ALPHA)
      .setInteractive({ useHandCursor: true });
    const t = this.add.text(b.x + b.w / 2, b.y + b.h / 2, glyph, {
      resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '11px', color: '#5CADD5',
    }).setOrigin(0.5).setAlpha(PAD_ALPHA + 0.25);
    b.rect = r; b.txt = t;
    return b;
  }

  /** Light a pad up while it is being held, so a touch is visibly acknowledged. */
  litPad(b, on) {
    b.rect.setAlpha(on ? PAD_ALPHA_ON : PAD_ALPHA);
    b.rect.setStrokeStyle(1, 0x5cadd5, on ? 0.9 : PAD_ALPHA);
    b.txt.setAlpha(on ? 1 : PAD_ALPHA + 0.25);
  }

  /** Is this virtual point inside b, allowing GRACE px of thumb roll? */
  static within(b, v, pad = GRACE) {
    return v.x >= b.x - pad && v.x <= b.x + b.w + pad
        && v.y >= b.y - pad && v.y <= b.y + b.h + pad;
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
      // Sliding down toward the screen edge must not count as leaving the strip.
      const left = v.x < z.x - GRACE || v.x > z.x + z.w + GRACE || v.y < z.y - GRACE;
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
    if (this.cards || this.panel || this.mode === 'open') return;
    this.openPause();
  }

  openPause() {
    this.game_.paused = true;
    const cx = this.w / 2;
    this.pausePanel = this.add.container(0, 0).setDepth(60);
    this.pausePanel.add(this.add.rectangle(0, 0, this.w, VIEW_H, 0x060614, 0.9)
      .setOrigin(0).setInteractive());
    this.pausePanel.add(this.add.text(cx, 60, 'PAUSED',
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '14px', color: '#5CADD5' }).setOrigin(0.5));

    const btn = (y, label, colour, fn) => {
      const t = this.add.text(cx, y, label, {
        resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '9px', color: colour,
        backgroundColor: '#0d1420', padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', fn);
      this.pausePanel.add(t);
    };
    btn(104, 'RESUME', '#5CADD5', () => this.closePause());
    btn(132, 'ABORT RUN', '#C04040', () => this.abortRun());
    this.pausePanel.add(this.add.text(cx, 150, 'ends the run and banks your Chips',
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '6px', color: '#6A5A5A' }).setOrigin(0.5));
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
  buildWheel() {
    const cx = this.w / 2, cy = WHEEL_CY;
    const n = WHEEL_ORDER.length;
    this.wheel = this.add.container(0, 0).setVisible(false);

    // rim + aim line, under the slots
    this.aimG = this.add.graphics();
    this.wheel.add(this.aimG);

    this.slots = WHEEL_ORDER.map((id, i) => {
      const angle = -Math.PI / 2 + (i / n) * Math.PI * 2; // slot 0 at 12 o'clock
      const x = cx + Math.cos(angle) * WHEEL_R;
      const y = cy + Math.sin(angle) * WHEEL_R;
      const wd = weaponOf(id);
      const ink = inkFor(wd.palette.primary);

      const disc = this.add.circle(x, y, SLOT_R, hexNum(wd.palette.primary))
        .setStrokeStyle(1, hexNum(wd.palette.outline || '#0A0A12'))
        .setInteractive({ useHandCursor: true });
      disc.on('pointerdown', () => this.pick(id));
      disc.on('pointerover', () => { if (this.mode === 'open') this.setReadout(id); });

      // first three letters of the leading word — unique across all 18, and the
      // only label that fits inside an 18px slot
      const abbr = this.add.text(x, y - 2, wd.name.split(' ')[0].slice(0, 3),
        { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '6px', color: ink }).setOrigin(0.5);
      const lvl = this.add.text(x, y + 4, '',
        { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '5px', color: ink }).setOrigin(0.5);

      this.wheel.add([disc, abbr, lvl]);
      return { id, x, y, angle, disc, abbr, lvl, locked: false };
    });

    // padlocks sit ON TOP of their greyed slot, so added after every disc
    this.lockG = this.add.graphics();
    this.wheel.add(this.lockG);

    this.readName = this.add.text(cx, cy - 5, '',
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '7px', color: '#E0F0FF' }).setOrigin(0.5);
    this.readLv = this.add.text(cx, cy + 5, '',
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '6px', color: '#5CADD5' }).setOrigin(0.5);
    this.wheel.add([this.readName, this.readLv]);
  }

  buildRequip() {
    // Sits in the gap between the movement strip and the action pads, so no
    // control overlaps another and the middle of the screen stays clear.
    const gapL = this.z3.x + this.z3.w, gapR = this.z4.x;
    const bw = Math.max(44, Math.min(64, gapR - gapL - 6)), bh = 24;
    const x = Math.round((gapL + gapR) / 2 - bw / 2), y = VIEW_H - this.padH + 15;
    this.reqBox = this.add.rectangle(x, y, bw, bh, 0x0d1420).setOrigin(0)
      .setStrokeStyle(1, 0x5cadd5)
      .setAlpha(IDLE_ALPHA)
      .setInteractive({ useHandCursor: true });
    this.reqTxt = this.add.text(x + bw / 2, y + bh / 2, 'RE-QUIP',
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '7px', color: '#5CADD5' })
      .setOrigin(0.5).setAlpha(IDLE_ALPHA);

    this.reqBox.on('pointerdown', (p) => {
      if (this.press) return;
      const v = vpt(this, p);
      this.press = { id: p.id, x: v.x, y: v.y, swiping: false };
    });

    // Move and release are tracked at SCENE level, not on the button: a swipe
    // leaves a 60x20 button within a few pixels, and the button stops seeing
    // its own pointer the moment it does.
    this.input.on('pointermove', (p) => {
      const pr = this.press;
      if (!pr || p.id !== pr.id || !p.isDown) return;
      const v = vpt(this, p);
      const dx = v.x - pr.x, dy = v.y - pr.y;
      if (!pr.swiping) {
        if (this.mode === 'open') return; // already tapped open — ignore drags
        if (Math.hypot(dx, dy) < SWIPE_DEADZONE) return;
        pr.swiping = true;
        this.beginSwipe();
      }
      this.aimSwipe(dx, dy);
    });
    this.input.on('pointerup', (p) => {
      const pr = this.press;
      if (!pr || p.id !== pr.id) return;
      this.press = null;
      if (pr.swiping) this.endSwipe();
      else if (this.mode === 'open') this.closeWheel(); // tapping again backs out
      else this.openWheel();
    });
  }

  /** Sync every slot to current unlock state and weapon levels. */
  refreshWheel() {
    const r = this.game_.run;
    this.lockG.clear();
    for (const s of this.slots) {
      const unlocked = r.unlocked.has(s.id);
      const wd = weaponOf(s.id);
      s.locked = !unlocked;
      s.disc.setFillStyle(unlocked ? hexNum(wd.palette.primary) : LOCKED_FILL);
      s.disc.setAlpha(unlocked ? 1 : LOCKED_ALPHA);
      s.disc.setScale(1);
      s.abbr.setVisible(unlocked);
      s.lvl.setVisible(unlocked).setText(String(r.wpLevels[s.id] || 1));
      if (!unlocked) drawPadlock(this.lockG, s.x, s.y, SLOT_R * 1.6);
    }
  }

  /** TAP route — hard pause, everything unlocked comes up to full opacity. */
  openWheel() {
    this.mode = 'open';
    this.game_.paused = true;
    this.refreshWheel();
    this.aimIndex = -1;
    this.scrim.setVisible(true);
    this.wheel.setVisible(true).setAlpha(1);
    this.reqBox.setAlpha(1);
    this.reqTxt.setAlpha(1);
    this.setReadout(this.game_.run.activeWeapon);
    this.drawAim();
  }

  closeWheel() {
    this.mode = null;
    this.game_.paused = false;
    this.scrim.setVisible(false);
    this.wheel.setVisible(false);
    this.reqBox.setAlpha(IDLE_ALPHA);
    this.reqTxt.setAlpha(IDLE_ALPHA);
  }

  /** SWIPE route — no pause, ghosted wheel, time drops to a crawl. */
  beginSwipe() {
    this.mode = 'swipe';
    this.refreshWheel();
    this.aimIndex = -1;
    this.wheel.setVisible(true).setAlpha(IDLE_ALPHA);
    this.game_.setTimeScale(FEEL.requipSlowScale, FEEL.requipSlowInFrames);
  }

  endSwipe() {
    if (this.aimIndex >= 0) this.game_.selectWeapon(this.slots[this.aimIndex].id);
    this.mode = null;
    this.wheel.setVisible(false);
    this.game_.setTimeScale(1, FEEL.requipSlowOutFrames);
  }

  /** Swipe vector -> the slot lying in that direction, snapped to an unlocked one. */
  aimSwipe(dx, dy) {
    const a = Math.atan2(dy, dx);
    let best = 0, bestD = Infinity;
    this.slots.forEach((s, i) => {
      const d = Math.abs(((a - s.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d < bestD) { bestD = d; best = i; }
    });
    this.aimIndex = this.nearestUnlocked(best);
    this.highlight(this.aimIndex);
  }

  /**
   * Walk outward from a slot to the closest unlocked one. Aiming at a padlock
   * should still give you a weapon — a swipe that silently does nothing reads
   * as a dropped input, not as a rule.
   */
  nearestUnlocked(i) {
    const n = this.slots.length, un = this.game_.run.unlocked;
    for (let d = 0; d <= n / 2; d++) {
      for (const k of d === 0 ? [i] : [i + d, i - d]) {
        const j = ((k % n) + n) % n;
        if (un.has(this.slots[j].id)) return j;
      }
    }
    return 0;
  }

  highlight(i) {
    this.slots.forEach((s, k) => s.disc.setScale(k === i ? 1.35 : 1));
    if (i >= 0) this.setReadout(this.slots[i].id);
    this.drawAim();
  }

  drawAim() {
    const g = this.aimG, cx = this.w / 2, cy = WHEEL_CY;
    g.clear();
    g.lineStyle(1, 0x5cadd5, 0.3);
    g.strokeCircle(cx, cy, WHEEL_R);
    if (this.aimIndex >= 0) {
      const s = this.slots[this.aimIndex];
      // starts outside the centre readout so the line never crosses the text
      g.lineStyle(1, 0xf5d328, 0.9);
      g.lineBetween(cx + Math.cos(s.angle) * 26, cy + Math.sin(s.angle) * 26, s.x, s.y);
    }
  }

  setReadout(id) {
    const wd = weaponOf(id), r = this.game_.run;
    this.readName.setText(wd.name);
    this.readLv.setText(r.unlocked.has(id) ? `Lv ${r.wpLevels[id] || 1}` : 'LOCKED');
  }

  /** Tapping a slot while paused equips it and resumes. Padlocks are inert. */
  pick(id) {
    if (this.mode !== 'open') return;
    // Dev mode equips through the padlock; otherwise a locked slot is inert.
    if (!this.game_.run.unlocked.has(id) && !dev('unlockAnyWeapon')) return;
    this.game_.selectWeapon(id);
    this.closeWheel();
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
        title: wd.name.split(' ')[0],
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
    this.cards.add(this.add.text(this.w / 2, 14, `LEVEL ${level}`,
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '10px', color: '#F5D328' }).setOrigin(0.5));
    this.cards.add(this.add.text(this.w / 2, 26, 'CHOOSE ONE',
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '6px', color: '#5CADD5' }).setOrigin(0.5));

    const n = cards.length;
    const cw = Math.min(64, (this.w - 16) / n - 4);
    const total = n * cw + (n - 1) * 4;
    const x0 = (this.w - total) / 2;

    cards.forEach((c, i) => {
      const x = x0 + i * (cw + 4), y = 44, h = 74;
      const col = hexNum(c.tint);
      const box = this.add.rectangle(x, y, cw, h, col, 0.22).setOrigin(0)
        .setStrokeStyle(1, col, 1).setInteractive({ useHandCursor: true });
      box.on('pointerdown', () => { c.take(); this.closeCards(); });
      this.cards.add(box);
      this.cards.add(this.add.text(x + cw / 2, y + 26, c.title,
        { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '7px', color: '#E0F0FF',
          align: 'center', wordWrap: { width: cw - 6 } }).setOrigin(0.5));
      this.cards.add(this.add.text(x + cw / 2, y + 52, c.sub,
        { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '6px', color: '#8AB',
          align: 'center', wordWrap: { width: cw - 6 } }).setOrigin(0.5));
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
    if (gm.run.pendingLevelUps > 0 && !this.cards && !this.panel) this.openCards();
    const r = gm.run, w = weaponOf(r.activeWeapon);
    const maxHp = FEEL.hpMax + r.hpBonus + r.runHpBonus;
    // A DEV marker whenever perks are active — a playtest you misread as
    // "balanced" while invincible is worse than no playtest at all.
    this.hud.setText(
      `SC ${String(Math.floor(r.score)).padStart(6, '0')}  Lv${r.level}` +
        (DEV.enabled ? '  [DEV]' : '') + '\n' +
      `${w.name} L${r.wpLevels[r.activeWeapon] || 1}`,
    );

    // Stand-in for Phase 5's proper acquisition popup — just enough to confirm
    // a boss actually handed over its weapon.
    if (r.justUnlocked) {
      if (!this.unlockMsg) {
        this.unlockMsg = this.add.text(this.w / 2, 44, '', {
          fontFamily: 'monospace', fontSize: '8px', color: '#F5D328',
        }).setOrigin(0.5);
        this.unlockAt = performance.now();
      }
      this.unlockMsg.setText(`${weaponOf(r.justUnlocked).name} ACQUIRED`);
      if (performance.now() - this.unlockAt > 2500) {
        this.unlockMsg.destroy();
        this.unlockMsg = null;
        r.justUnlocked = null;
      }
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
