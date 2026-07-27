import Phaser from 'phaser';
import { VIEW_H } from '../config/display.js';
import { save, fullReset } from '../systems/save.js';

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
    this.add.text(cx, 46, title, { fontFamily: 'monospace', fontSize: '20px', color: '#5CADD5' })
      .setOrigin(0.5);
    this.add.text(cx, 66, this.died ? '' : 'FIND THE DOOR · BEAT THE BOSS',
      { fontFamily: 'monospace', fontSize: '7px', color: '#3A6A8A' }).setOrigin(0.5);

    if (this.died && this.run) {
      const s = this.run;
      const stats = [
        `SCORE ${Math.floor(s.score)}`,
        `LEVEL ${s.level}   DIST ${Math.floor(s.dist)}m`,
        `KILLS ${s.kills}   BOSSES ${s.bossesDefeated.length}`,
      ];
      stats.forEach((t, i) => this.add.text(cx, 86 + i * 11, t,
        { fontFamily: 'monospace', fontSize: '8px', color: '#E0F0FF' }).setOrigin(0.5));
    }

    this.btn(cx, 136, this.died ? 'TRY AGAIN' : 'START', () => this.scene.start('Game'));
    this.btn(cx, 158, `HUB   (${save.chips} chips)`, () => this.scene.start('Hub'));
    this.add.text(cx, VIEW_H - 12, 'full reset', { fontFamily: 'monospace', fontSize: '6px', color: '#804040' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => confirm('Wipe ALL saved data and reload?') && fullReset());
  }

  btn(x, y, label, fn) {
    const t = this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '9px', color: '#5CADD5',
      backgroundColor: '#0d1420', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerdown', fn);
    return t;
  }
}
