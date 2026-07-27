/**
 * UIScene — HUD and the four-zone touch layout, drawn above GameScene.
 *
 * ZONES (see docs/control-zones.md for the full spec)
 *   1 top-left      energy pips, score, level + EXP bar
 *   2 top-right     pause
 *   3 bottom-left   movement: 4 columns  <-  <^  ^>  ->
 *   4 bottom-right  [] jump   () shoot / hold to charge / swipe to cycle
 *   bottom-centre   WEAPON — pauses and opens weapon select
 *
 * Zone 3's diagonal columns move identically to their neighbour today but set
 * `diagInput` on the player. Nothing consumes it yet — it is reserved for
 * special moves that have not been designed.
 */

import Phaser from 'phaser';
import { VIEW_H } from '../config/display.js';
import { FEEL } from '../config/feel.js';
import { WEAPON_BY_ID } from '../data/weapons.js';
import { hexNum } from '../systems/assets.js';

const SLIDE_DEADZONE = 14; // virtual px of downward drag before a slide fires

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
    // bottom-centre — weapon select
    this.wsel = this.mkTap(w / 2 - 26, VIEW_H - 14, 52, 12, 'WEAPON', () => this.openWeaponSelect());

    this.bindZone3();
    this.bindZone4();
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

  /** Zone 4 — [] jump on the left half, () shoot/charge/swipe on the right. */
  bindZone4() {
    const z = this.z4;
    const zone = this.add.rectangle(z.x, z.y, z.w, z.h, 0x000000, 0.001).setOrigin(0)
      .setInteractive({ useHandCursor: true });
    let mode = null, sx = 0;

    zone.on('pointerdown', (p) => {
      if (p.x - z.x < z.w / 2) { mode = 'jump'; this.game_.doJump(); }
      else { mode = 'fire'; sx = p.x; this.game_.beginFire(); }
    });
    zone.on('pointermove', (p) => {
      if (mode !== 'fire' || !p.isDown) return;
      const dx = p.x - sx;
      if (Math.abs(dx) > 18) { this.cycleWeapon(dx > 0 ? 1 : -1); sx = p.x; }
    });
    const up = () => { if (mode === 'fire') this.game_.endFire(); mode = null; };
    zone.on('pointerup', up);
    zone.on('pointerout', up);
  }

  cycleWeapon(dir) {
    const r = this.game_.run;
    const list = [...r.unlocked];
    const i = list.indexOf(r.activeWeapon);
    this.game_.selectWeapon(list[(i + dir + list.length) % list.length]);
  }

  togglePause() {
    this.game_.paused = !this.game_.paused;
  }

  /**
   * Weapon select — pauses and lists every unlocked weapon with its level.
   * Selecting one equips it, which also recolours the player sprite live.
   */
  openWeaponSelect() {
    if (this.panel) return this.closeWeaponSelect();
    this.game_.paused = true;
    const r = this.game_.run;
    const list = [...r.unlocked];
    this.panel = this.add.container(0, 0);
    this.panel.add(this.add.rectangle(0, 0, this.w, VIEW_H, 0x060614, 0.92).setOrigin(0));
    this.panel.add(this.add.text(this.w / 2, 8, 'WEAPON SELECT',
      { fontFamily: 'monospace', fontSize: '9px', color: '#5CADD5' }).setOrigin(0.5));

    const cols = Math.floor((this.w - 12) / 46);
    list.forEach((id, i) => {
      const wdef = WEAPON_BY_ID[id];
      const lv = r.wpLevels[id] || 1;
      const x = 6 + (i % cols) * 46;
      const y = 22 + Math.floor(i / cols) * 30;
      const sel = id === r.activeWeapon;
      const box = this.add.rectangle(x, y, 42, 26, hexNum(wdef.palette.primary), sel ? 0.5 : 0.18)
        .setOrigin(0).setStrokeStyle(1, hexNum(wdef.palette.primary), sel ? 1 : 0.4)
        .setInteractive({ useHandCursor: true });
      box.on('pointerdown', () => { this.game_.selectWeapon(id); this.closeWeaponSelect(); this.openWeaponSelect(); });
      const abbr = wdef.name.split(' ').map((s) => s[0]).join('').slice(0, 3);
      this.panel.add(box);
      this.panel.add(this.add.text(x + 21, y + 8, abbr,
        { fontFamily: 'monospace', fontSize: '8px', color: '#fff' }).setOrigin(0.5));
      this.panel.add(this.add.text(x + 21, y + 18, `Lv ${lv}`,
        { fontFamily: 'monospace', fontSize: '6px', color: lv >= FEEL.weaponMaxLevel ? '#F5D328' : '#8AB' })
        .setOrigin(0.5));
    });

    const close = this.add.text(this.w / 2, VIEW_H - 14, 'RESUME', {
      fontFamily: 'monospace', fontSize: '8px', color: '#5CADD5',
      backgroundColor: '#0d1420', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closeWeaponSelect());
    this.panel.add(close);
  }

  closeWeaponSelect() {
    if (!this.panel) return;
    this.panel.destroy(true);
    this.panel = null;
    this.game_.paused = false;
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
