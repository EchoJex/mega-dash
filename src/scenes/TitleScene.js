import Phaser from 'phaser';
import { VIEW_H, viewWidthOf } from '../config/display.js';
import { fitCamera, label, plate } from '../systems/text.js';
import { save, fullReset } from '../systems/save.js';
import { checkForUpdate, pickChannel, canUpdate } from '../systems/updater.js';
import { DEV } from '../config/dev.js';

const LONG_PRESS_MS = 500;

/**
 * Title + results. Doubles as the game-over screen (pass { died, run }).
 * The full Vampire-Survivors style results panel lands in the finishing passes.
 */
export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  init(data) { this.died = data?.died; this.run = data?.run; }

  create() {
    const w = viewWidthOf(this.scale), cx = w / 2;
    fitCamera(this, w);
    this.add.rectangle(0, 0, w, VIEW_H, 0x060614).setOrigin(0);

    const title = this.died ? 'GAME OVER' : 'MEGA DASH';
    label(this, cx, 46, title, { scale: 3, color: '#5CADD5', origin: 0.5 });
    label(this, cx, 68, this.died ? '' : 'FIND THE DOOR · BEAT THE BOSS',
      { color: '#3A6A8A', origin: 0.5 });

    if (this.died && this.run) {
      const s = this.run;
      const stats = [
        `SCORE ${Math.floor(s.score)}`,
        `LEVEL ${s.level}   DIST ${Math.floor(s.dist)}m`,
        `KILLS ${s.kills}   BOSSES ${s.bossesDefeated.length}`,
      ];
      stats.forEach((t, i) => label(this, cx, 80 + i * 11, t, { color: '#E0F0FF', origin: 0.5 }));

      // The conversion, itemised. Score alone earns Chips, so even a run that
      // never reaches a boss still buys something in the Hub.
      const c = s.chipsEarned;
      if (c) {
        const parts = [`score ${c.fromScore}`];
        if (c.fromBosses) parts.push(`bosses ${c.fromBosses}`);
        if (c.mult !== 1) parts.push(`x${c.mult.toFixed(2)}`);
        label(this, cx, 116, `+${c.total} CHIPS`, { color: '#F5D328', origin: 0.5 });
        label(this, cx, 126, parts.join('  ·  '), { color: '#8A7A30', origin: 0.5 });
      }
    }

    /**
     * THE DEV MENU LIVES HERE AND NOWHERE ELSE — top corner, out of the run of
     * buttons, present only on a DEV MODE launch. Its presence IS the marker
     * that says which branch you launched into; a playtester launch draws
     * nothing here and has no way to reach any of it.
     */
    if (DEV.enabled) {
      this.btn(w - 34, 12, 'DEV', () => this.scene.start('DevMenu'), '#F5D328');
    }

    this.btn(cx, 136, this.died ? 'TRY AGAIN' : 'START', () => this.scene.start('Game'));
    this.btn(cx, 158, `HUB   (${save.chips} chips)`, () => this.scene.start('Hub'));
    this.updateBtn(cx, 176);

    this.note = label(this, cx, VIEW_H - 24, '', { color: '#3A6A8A', origin: 0.5 });

    label(this, cx, VIEW_H - 12, 'full reset', { color: '#804040', origin: 0.5 })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => confirm('Wipe ALL saved data and reload?') && fullReset());
  }

  /**
   * UPDATE — tap for main's newest build, long-press to pick a branch channel.
   *
   * This is how builds reach the phone during development, so it lives on the
   * title screen rather than behind a menu. The button renders in the browser
   * too and explains itself there instead of silently doing nothing.
   */
  updateBtn(x, y) {
    const { rect: t } = plate(this, x, y, 'UPDATE', {
      color: canUpdate() ? '#2AAB1C' : '#3A6A8A', padX: 8, padY: 3,
    });

    let timer = null, fired = false;
    t.on('pointerdown', () => {
      fired = false;
      timer = this.time.delayedCall(LONG_PRESS_MS, () => {
        fired = true;                       // long-press wins; the tap is cancelled
        this.say(pickChannel() || 'Pick a build channel…');
      });
    });
    const release = () => {
      if (timer) { timer.remove(); timer = null; }
      if (!fired) this.say(checkForUpdate() || 'Checking main for a newer build…');
    };
    t.on('pointerup', release);
    t.on('pointerout', () => { if (timer) { timer.remove(); timer = null; } });

    label(this, x, y + 12, 'tap: main · hold: pick branch', { color: '#3A6A8A', origin: 0.5 });
    return t;
  }

  /** Native builds report via toasts; the browser has nowhere else to put this. */
  say(msg) {
    this.note?.setText(msg);
  }

  btn(x, y, text, fn, colour = '#5CADD5') {
    const { rect } = plate(this, x, y, text, { color: colour, padX: 8, padY: 4 });
    rect.on('pointerdown', fn);
    return rect;
  }
}
