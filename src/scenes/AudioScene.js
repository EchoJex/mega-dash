import Phaser from 'phaser';
import { VIEW_H, viewWidthOf } from '../config/display.js';
import { fitCamera, label, plate } from '../systems/text.js';
import { mix, setMix, sfx } from '../systems/sfx.js';

/**
 * AUDIO — master, music and effects. One overlay, opened from the title screen
 * and from the pause menu, so the two can never offer different settings.
 *
 * It is a SCENE laid over whichever one opened it rather than a panel inside
 * each, because a panel would have to be written twice and the pause menu's
 * copy would be the one that drifted. Its full-screen backdrop takes every
 * touch, so nothing underneath can be pressed through it.
 *
 * A slider is a bar you touch or drag anywhere along — one target, the width of
 * the bar, rather than two small arrows. The ON/OFF switch sits beside its
 * slider and leaves the slider where it was, so switching music back on
 * returns it at the level you set.
 *
 * Keyboard: up/down pick a row, left/right move a slider 10%, Enter flips a
 * switch or takes BACK, Esc closes. Esc closes on key UP, not down: the game's
 * own Esc handler runs on key down and must see this screen still open, or the
 * same press would also step the pause menu underneath.
 */
const ROWS = [
  { name: 'MASTER', vol: 'master' },
  { name: 'MUSIC', vol: 'bgm', on: 'bgmOn' },
  { name: 'SFX', vol: 'sfx', on: 'sfxOn' },
];
const STEP = 0.05;

export default class AudioScene extends Phaser.Scene {
  constructor() { super('Audio'); }

  create() {
    const w = viewWidthOf(this.scale), cx = w / 2;
    this.cx = cx;
    fitCamera(this, w);
    this.add.rectangle(0, 0, w, VIEW_H, 0x060614, 1).setOrigin(0).setInteractive();
    label(this, cx, 28, 'AUDIO', { scale: 2, color: '#5CADD5', origin: 0.5 });

    this.rows = [];
    ROWS.forEach((def, i) => this.buildRow(def, cx, 66 + i * 30));

    const { rect } = plate(this, cx, 170, 'BACK', { color: '#5CADD5', padX: 10, padY: 4 });
    rect.on('pointerdown', () => this.close());
    this.backRect = rect;

    this.at = 0;
    this.caret = label(this, 0, 0, '>', { color: '#F5D328', origin: 0.5 });
    this.drawCaret();

    // Drag: whichever bar the finger went down on keeps it until it lifts.
    this.dragging = null;
    this.input.on('pointermove', (p) => { if (this.dragging && p.isDown) this.fromPointer(this.dragging, p); });
    this.input.on('pointerup', () => { if (this.dragging) sfx('select'); this.dragging = null; });

    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-W', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-S', () => this.move(1));
    kb.on('keydown-LEFT', () => this.nudge(-0.1));
    kb.on('keydown-A', () => this.nudge(-0.1));
    kb.on('keydown-RIGHT', () => this.nudge(0.1));
    kb.on('keydown-D', () => this.nudge(0.1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keyup-ESC', () => this.close());
  }

  buildRow(def, cx, y) {
    const row = { def, y };
    label(this, cx - 138, y - 3, def.name, { color: '#E0F0FF' });   // left-aligned, centred on y
    if (def.on) {
      const { rect, txt } = plate(this, cx - 62, y, 'OFF', { color: '#5CADD5', padX: 5, padY: 3 });
      rect.on('pointerdown', () => this.flip(row));
      row.switchRect = rect; row.switchTxt = txt;
    }
    row.x0 = cx - 36; row.x1 = cx + 94;
    const bw = row.x1 - row.x0;
    this.add.rectangle(row.x0, y, bw, 4, 0x1a2a3a).setOrigin(0, 0.5);
    row.fill = this.add.rectangle(row.x0, y, bw, 4, 0x5CADD5).setOrigin(0, 0.5);
    row.knob = this.add.rectangle(row.x0, y, 4, 12, 0xE0F0FF).setOrigin(0.5);
    row.pct = label(this, cx + 116, y, '', { color: '#E0F0FF', origin: 0.5 });
    // The touch target is the bar's whole length and a thumb's height, not
    // the 4px line that is drawn.
    const hit = this.add.rectangle(row.x0 - 6, y, bw + 12, 22, 0, 0).setOrigin(0, 0.5).setInteractive();
    hit.on('pointerdown', (p) => { this.at = this.rows.indexOf(row); this.drawCaret(); this.dragging = row; this.fromPointer(row, p); });
    this.rows.push(row);
    this.paint(row);
  }

  paint(row) {
    const v = mix[row.def.vol];
    const live = row.def.on ? mix[row.def.on] : true;
    row.fill.width = Math.max(0.001, (row.x1 - row.x0) * v);
    row.fill.fillColor = live ? 0x5CADD5 : 0x2a3a4a;
    row.knob.x = row.x0 + (row.x1 - row.x0) * v;
    row.knob.fillColor = live ? 0xE0F0FF : 0x4a5a6a;
    row.pct.setText(`${Math.round(v * 100)}%`).setTint(live ? 0xE0F0FF : 0x4A5A6A);
    if (row.switchTxt) {
      row.switchTxt.setText(live ? 'ON' : 'OFF').setTint(live ? 0x2AAB1C : 0xC04040);
    }
  }

  set(row, v) {
    setMix(row.def.vol, Math.round(Math.max(0, Math.min(1, v)) / STEP) * STEP);
    this.paint(row);
  }

  fromPointer(row, p) {
    const x = this.cameras.main.getWorldPoint(p.x, p.y).x;
    this.set(row, (x - row.x0) / (row.x1 - row.x0));
  }

  flip(row) {
    setMix(row.def.on, !mix[row.def.on]);
    this.paint(row);
    sfx('select');
  }

  move(d) {
    const n = this.rows.length + 1;           // + BACK
    this.at = ((this.at + d) % n + n) % n;
    this.drawCaret();
  }

  nudge(d) {
    const row = this.rows[this.at];
    if (!row) return;
    this.set(row, mix[row.def.vol] + d);
    sfx('select');
  }

  confirm() {
    const row = this.rows[this.at];
    if (!row) return this.close();
    if (row.def.on) this.flip(row);
  }

  drawCaret() {
    const row = this.rows[this.at];
    if (row) this.caret.setPosition(this.cx - 146, row.y);
    else this.caret.setPosition(this.backRect.x - this.backRect.width / 2 - 8, this.backRect.y);
  }

  close() {
    this.scene.stop();
  }
}
