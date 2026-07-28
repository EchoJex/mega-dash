import Phaser from 'phaser';
import { VIEW_H } from '../config/display.js';
import { TEXT_RES } from '../systems/text.js';
import { save, fullReset } from '../systems/save.js';
import { checkForUpdate, pickChannel, canUpdate } from '../systems/updater.js';

const LONG_PRESS_MS = 500;

/**
 * Title + results. Doubles as the game-over screen (pass { died, run }).
 * PHASE 5 gives this the full Vampire-Survivors style results panel.
 */
export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  init(data) { this.died = data?.died; this.run = data?.run; }

  create() {
    const w = this.scale.gameSize.width, cx = w / 2;
    this.add.rectangle(0, 0, w, VIEW_H, 0x060614).setOrigin(0);

    const title = this.died ? 'GAME OVER' : 'MEGA DASH';
    this.add.text(cx, 46, title, { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '20px', color: '#5CADD5' })
      .setOrigin(0.5);
    this.add.text(cx, 66, this.died ? '' : 'FIND THE DOOR · BEAT THE BOSS',
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '7px', color: '#3A6A8A' }).setOrigin(0.5);

    if (this.died && this.run) {
      const s = this.run;
      const stats = [
        `SCORE ${Math.floor(s.score)}`,
        `LEVEL ${s.level}   DIST ${Math.floor(s.dist)}m`,
        `KILLS ${s.kills}   BOSSES ${s.bossesDefeated.length}`,
      ];
      stats.forEach((t, i) => this.add.text(cx, 78 + i * 10, t,
        { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '8px', color: '#E0F0FF' }).setOrigin(0.5));

      // The conversion, itemised. Score alone earns Chips, so even a run that
      // never reaches a boss still buys something in the Hub.
      const c = s.chipsEarned;
      if (c) {
        const parts = [`score ${c.fromScore}`];
        if (c.fromBosses) parts.push(`bosses ${c.fromBosses}`);
        if (c.mult !== 1) parts.push(`x${c.mult.toFixed(2)}`);
        this.add.text(cx, 112, `+${c.total} CHIPS`,
          { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '9px', color: '#F5D328' }).setOrigin(0.5);
        this.add.text(cx, 122, parts.join('  ·  '),
          { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '6px', color: '#8A7A30' }).setOrigin(0.5);
      }
    }

    this.btn(cx, 136, this.died ? 'TRY AGAIN' : 'START', () => this.scene.start('Game'));
    this.btn(cx, 158, `HUB   (${save.chips} chips)`, () => this.scene.start('Hub'));
    this.updateBtn(cx, 176);

    this.note = this.add.text(cx, VIEW_H - 22, '',
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '6px', color: '#3A6A8A' }).setOrigin(0.5);

    this.add.text(cx, VIEW_H - 12, 'full reset', { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '6px', color: '#804040' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true })
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
    const t = this.add.text(x, y, 'UPDATE', {
      resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '8px',
      color: canUpdate() ? '#2AAB1C' : '#3A6A8A',
      backgroundColor: '#0d1420', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

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

    this.add.text(x, y + 13, 'tap: main · hold: pick branch',
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '6px', color: '#3A6A8A' }).setOrigin(0.5);
    return t;
  }

  /** Native builds report via toasts; the browser has nowhere else to put this. */
  say(msg) {
    this.note?.setText(msg);
  }

  btn(x, y, label, fn) {
    const t = this.add.text(x, y, label, {
      resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '9px', color: '#5CADD5',
      backgroundColor: '#0d1420', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerdown', fn);
    return t;
  }
}
