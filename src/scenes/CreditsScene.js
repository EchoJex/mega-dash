import Phaser from 'phaser';
import { VIEW_H, viewWidthOf } from '../config/display.js';
import { fitCamera, label, plate } from '../systems/text.js';
import { playMusic, TRACK } from '../systems/music.js';

/**
 * CREDITS — who made what the game borrows, opened from the title screen.
 *
 * An overlay, like AUDIO, so opening it from GAME OVER keeps the run's results
 * underneath. It plays the credits track once, and BACK gives the screen that
 * opened it its own track again (`back`).
 *
 * A track under CC-BY-SA owes its title, its author as he asks to be named,
 * where it came from and its licence wherever the game is shared. This screen
 * is where the game itself says so; the tracker's `bgm` lines say it in full.
 * The font has no long dash, so the lines use `-` and `·`.
 */
const LINES = [
  ['MUSIC', '#F5D328'],
  ['"8BIT TITLE SCREEN" BY JOTH', '#E0F0FF'],
  ['OPENGAMEART.ORG/CONTENT/8BIT-TITLE-SCREEN', '#5CADD5'],
  ['CC0 (PUBLIC DOMAIN)', '#3A6A8A'],
  null,
  ['"HERO IMMORTAL" BY TREVOR LENTZ', '#E0F0FF'],
  ['OPENGAMEART.ORG/CONTENT/HERO-IMMORTAL', '#5CADD5'],
  ['CC-BY-SA 3.0', '#3A6A8A'],
  ['CREATIVECOMMONS.ORG/LICENSES/BY-SA/3.0', '#3A6A8A'],
  ['CUT TO 0:36 FOR GAME OVER, LOOPED AT 0:20', '#3A6A8A'],
];

export default class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }
  init(data) { this.back = data?.back ?? TRACK.menu; }

  create() {
    const w = viewWidthOf(this.scale), cx = w / 2;
    fitCamera(this, w);
    this.add.rectangle(0, 0, w, VIEW_H, 0x060614, 1).setOrigin(0).setInteractive();
    label(this, cx, 18, 'CREDITS', { scale: 2, color: '#5CADD5', origin: 0.5 });
    LINES.forEach((l, i) => l && label(this, cx, 44 + i * 12, l[0], { color: l[1], origin: 0.5 }));
    playMusic(TRACK.credits);

    const { rect } = plate(this, cx, VIEW_H - 18, 'BACK', { color: '#5CADD5', padX: 10, padY: 4 });
    rect.on('pointerdown', () => this.close());
    // Esc on key UP, as AUDIO does: the key-down must not reach anything else first.
    this.input.keyboard?.on('keyup-ESC', () => this.close());
    this.input.keyboard?.on('keydown-ENTER', () => this.close());
  }

  close() {
    playMusic(this.back);
    this.scene.stop();
  }
}
