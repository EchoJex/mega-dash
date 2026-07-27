/**
 * UIScene — HUD and the four-zone touch layout, drawn above GameScene.
 *
 * ZONES (see docs/control-zones.md for the full spec)
 *   1 top-left      energy pips, score, level + EXP bar
 *   2 top-right     pause
 *   3 bottom-left   movement: 4 columns  <-  <^  ^>  ->  · drag down = slide
 *   4 bottom-right  [] jump   () shoot, hold to charge
 *   bottom-centre   RE-QUIP — the radial weapon wheel
 *
 * Zone 3's diagonal columns move identically to their neighbour today but set
 * `diagInput` on the player. Nothing consumes it yet — it is reserved for
 * special moves that have not been designed.
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
import { VIEW_H } from '../config/display.js';
import { FEEL } from '../config/feel.js';
import { WEAPON_BY_ID, WHEEL_ORDER } from '../data/weapons.js';
import { hexNum } from '../systems/assets.js';

const SLIDE_DEADZONE = 14; // virtual px of downward drag before a slide fires
const SWIPE_DEADZONE = 10; // virtual px of travel before a re-quip tap becomes a swipe

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
    const w = this.scale.gameSize.width;
    this.w = w;
    this.g = this.add.graphics();
    this.zoneH = 44;
    this.z3 = { x: 0, y: VIEW_H - this.zoneH, w: Math.min(w * 0.46, 120), h: this.zoneH };
    this.z4 = { x: w - Math.min(w * 0.36, 96), y: VIEW_H - this.zoneH, w: Math.min(w * 0.36, 96), h: this.zoneH };

    this.hud = this.add.text(4, 3, '', { fontFamily: 'monospace', fontSize: '7px', color: '#E0F0FF' });

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
  }

  mkTap(x, y, w, h, label, fn) {
    const r = this.add.rectangle(x, y, w, h, 0x0d1420, 0.7).setOrigin(0)
      .setInteractive({ useHandCursor: true });
    const t = this.add.text(x + w / 2, y + h / 2, label,
      { fontFamily: 'monospace', fontSize: '7px', color: '#5CADD5' }).setOrigin(0.5);
    r.on('pointerdown', fn);
    return { r, t };
  }

  /** Zone 3 — four directional columns plus drag-down-to-slide. */
  bindZone3() {
    const z = this.z3;
    const zone = this.add.rectangle(z.x, z.y, z.w, z.h, 0x000000, 0.001).setOrigin(0)
      .setInteractive({ useHandCursor: true });
    let startY = 0, slid = false, tapT = 0;

    const dirFor = (px) => {
      const t = (px - z.x) / z.w;
      if (t < 0.25) return { dir: -1, diag: null };
      if (t < 0.5) return { dir: -1, diag: 'ul' };
      if (t < 0.75) return { dir: 1, diag: 'ur' };
      return { dir: 1, diag: null };
    };

    zone.on('pointerdown', (p) => {
      startY = p.y; slid = false; tapT = performance.now();
      const d = dirFor(p.x);
      this.game_.setMove(d.dir);
      this.game_.player.diagInput = d.diag;
    });
    zone.on('pointermove', (p) => {
      if (!p.isDown) return;
      const d = dirFor(p.x);
      this.game_.setMove(d.dir);
      this.game_.player.diagInput = d.diag;
      if (!slid && p.y - startY > SLIDE_DEADZONE) { slid = true; this.game_.toggleSlide(); }
    });
    const up = () => {
      this.game_.setMove(0);
      this.game_.player.diagInput = null;
      // a quick tap while sliding cancels the slide
      if (!slid && performance.now() - tapT < 150 && this.game_.player.sliding) {
        this.game_.toggleSlide();
      }
    };
    zone.on('pointerup', up);
    zone.on('pointerout', up);
  }

  /**
   * Zone 4 — [] jump on the left half, () shoot/charge on the right.
   *
   * Swipe-to-cycle used to live here. It is gone: cycling blind through 18
   * weapons was never a real choice, and the re-quip wheel replaces it with a
   * directional pick you can actually aim.
   */
  bindZone4() {
    const z = this.z4;
    const zone = this.add.rectangle(z.x, z.y, z.w, z.h, 0x000000, 0.001).setOrigin(0)
      .setInteractive({ useHandCursor: true });
    let mode = null;

    zone.on('pointerdown', (p) => {
      if (p.x - z.x < z.w / 2) { mode = 'jump'; this.game_.doJump(); }
      else { mode = 'fire'; this.game_.beginFire(); }
    });
    const up = () => { if (mode === 'fire') this.game_.endFire(); mode = null; };
    zone.on('pointerup', up);
    zone.on('pointerout', up);
  }

  togglePause() {
    this.game_.paused = !this.game_.paused;
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
      const wd = WEAPON_BY_ID[id];
      const ink = inkFor(wd.palette.primary);

      const disc = this.add.circle(x, y, SLOT_R, hexNum(wd.palette.primary))
        .setStrokeStyle(1, hexNum(wd.palette.outline || '#0A0A12'))
        .setInteractive({ useHandCursor: true });
      disc.on('pointerdown', () => this.pick(id));
      disc.on('pointerover', () => { if (this.mode === 'open') this.setReadout(id); });

      // first three letters of the leading word — unique across all 18, and the
      // only label that fits inside an 18px slot
      const abbr = this.add.text(x, y - 2, wd.name.split(' ')[0].slice(0, 3),
        { fontFamily: 'monospace', fontSize: '6px', color: ink }).setOrigin(0.5);
      const lvl = this.add.text(x, y + 4, '',
        { fontFamily: 'monospace', fontSize: '5px', color: ink }).setOrigin(0.5);

      this.wheel.add([disc, abbr, lvl]);
      return { id, x, y, angle, disc, abbr, lvl, locked: false };
    });

    // padlocks sit ON TOP of their greyed slot, so added after every disc
    this.lockG = this.add.graphics();
    this.wheel.add(this.lockG);

    this.readName = this.add.text(cx, cy - 5, '',
      { fontFamily: 'monospace', fontSize: '7px', color: '#E0F0FF' }).setOrigin(0.5);
    this.readLv = this.add.text(cx, cy + 5, '',
      { fontFamily: 'monospace', fontSize: '6px', color: '#5CADD5' }).setOrigin(0.5);
    this.wheel.add([this.readName, this.readLv]);
  }

  buildRequip() {
    const bw = 60, bh = 20;
    const x = this.w / 2 - bw / 2, y = VIEW_H - 24;
    this.reqBox = this.add.rectangle(x, y, bw, bh, 0x0d1420).setOrigin(0)
      .setStrokeStyle(1, 0x5cadd5)
      .setAlpha(IDLE_ALPHA)
      .setInteractive({ useHandCursor: true });
    this.reqTxt = this.add.text(x + bw / 2, y + bh / 2, 'RE-QUIP',
      { fontFamily: 'monospace', fontSize: '7px', color: '#5CADD5' })
      .setOrigin(0.5).setAlpha(IDLE_ALPHA);

    this.reqBox.on('pointerdown', (p) => { this.press = { x: p.x, y: p.y, swiping: false }; });

    // Move and release are tracked at SCENE level, not on the button: a swipe
    // leaves a 60x20 button within a few pixels, and the button stops seeing
    // its own pointer the moment it does.
    this.input.on('pointermove', (p) => {
      const pr = this.press;
      if (!pr || !p.isDown) return;
      const dx = p.x - pr.x, dy = p.y - pr.y;
      if (!pr.swiping) {
        if (this.mode === 'open') return; // already tapped open — ignore drags
        if (Math.hypot(dx, dy) < SWIPE_DEADZONE) return;
        pr.swiping = true;
        this.beginSwipe();
      }
      this.aimSwipe(dx, dy);
    });
    this.input.on('pointerup', () => {
      const pr = this.press;
      if (!pr) return;
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
      const wd = WEAPON_BY_ID[s.id];
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
    const wd = WEAPON_BY_ID[id], r = this.game_.run;
    this.readName.setText(wd.name);
    this.readLv.setText(r.unlocked.has(id) ? `Lv ${r.wpLevels[id] || 1}` : 'LOCKED');
  }

  /** Tapping a slot while paused equips it and resumes. Padlocks are inert. */
  pick(id) {
    if (this.mode !== 'open') return;
    if (!this.game_.run.unlocked.has(id)) return;
    this.game_.selectWeapon(id);
    this.closeWheel();
  }

  update() {
    const gm = this.game_;
    if (!gm?.run) return;
    const r = gm.run, w = WEAPON_BY_ID[r.activeWeapon];
    const maxHp = FEEL.hpMax + r.hpBonus + r.runHpBonus;
    this.hud.setText(
      `HP ${'|'.repeat(Math.max(0, r.hp))}${'.'.repeat(Math.max(0, maxHp - r.hp))}\n` +
      `SC ${String(Math.floor(r.score)).padStart(6, '0')}  Lv${r.level}\n` +
      `${w.name} L${r.wpLevels[r.activeWeapon] || 1}`,
    );

    // control glyphs, drawn at 40% so they never fight the gameplay for attention
    const g = this.g;
    g.clear();
    g.fillStyle(0x5cadd5, 0.4);
    const z3 = this.z3, cw = z3.w / 4;
    for (let i = 0; i < 4; i++) {
      g.fillRect(z3.x + i * cw + cw * 0.3, z3.y + z3.h - 16, cw * 0.4, 10);
    }
    const z4 = this.z4;
    g.fillRect(z4.x + z4.w * 0.16, z4.y + z4.h - 20, 14, 14);       // [] jump
    g.fillCircle(z4.x + z4.w * 0.74, z4.y + z4.h - 13, 8);          // () shoot
    // EXP bar
    g.fillStyle(0x1a1a2e, 1); g.fillRect(4, 26, 60, 3);
    g.fillStyle(0xf5d328, 1); g.fillRect(4, 26, 60 * Math.min(1, r.exp / r.expToNext), 3);
  }
}
