import Phaser from 'phaser';
import { VIEW_H, viewWidthOf, BUILD } from '../config/display.js';
import { fitCamera, label, plate } from '../systems/text.js';
import { DEV, setDevMode, loadDevSettings } from '../config/dev.js';

/**
 * THE LAUNCH DIALOG — which game are you playing today?
 *
 * It sits BEFORE the title screen and asks one question with two answers:
 *
 *   DEV MODE     every perk, the dev menu on the title screen, the diagnostic
 *                overlay, the boss picker. Nothing about the run is honest.
 *   PLAYTESTER   the shipped game. No perks, no dev menu, no dev markers, no
 *                dev branches taken anywhere — `dev()` answers false to
 *                everything, which is the same state `available: false` leaves
 *                the build in permanently.
 *
 * WHY A DIALOG AND NOT A REBUILD. Both were previously the same switch, so
 * checking how the game actually plays meant editing config/dev.js, rebuilding
 * and reinstalling — which is expensive enough that it did not happen, and a
 * build nobody ever plays clean is a build whose balance nobody knows. One tap
 * is cheap enough that it happens every session.
 *
 * The answer is NOT remembered. A stale one is a whole playtest misread as
 * balanced while unkillable, and re-picking costs a tap.
 *
 * This scene does not exist in a shipped build: `DEV.available` gates it in
 * BootScene, which goes straight to the title instead.
 */
export default class LaunchScene extends Phaser.Scene {
  constructor() { super('Launch'); }

  create() {
    const w = viewWidthOf(this.scale), cx = w / 2;
    fitCamera(this, w);
    this.add.rectangle(0, 0, w, VIEW_H, 0x060614).setOrigin(0);

    label(this, cx, 34, 'MEGA DASH', { scale: 3, color: '#5CADD5', origin: 0.5 });
    label(this, cx, 58, 'HOW ARE YOU PLAYING', { color: '#3A6A8A', origin: 0.5 });

    this.pick(cx, 92, 'DEV MODE', '#F5D328',
      'perks, dev menu, debug overlay', true);
    this.pick(cx, 140, 'PLAYTESTER', '#2AAB1C',
      'the shipped game, nothing added', false);

    label(this, cx, VIEW_H - 12, `BUILD ${BUILD}`, { color: '#2A3A4A', origin: 0.5 });
  }

  /** One answer: a plate, and a line under it saying what you are choosing. */
  pick(x, y, text, colour, sub, on) {
    const { rect } = plate(this, x, y, text, { color: colour, padX: 12, padY: 5 });
    rect.on('pointerdown', () => this.choose(on));
    label(this, x, y + 14, sub, { color: '#3A6A8A', origin: 0.5 });
    return rect;
  }

  choose(on) {
    setDevMode(on);
    // Settings are only loaded down the DEV branch. A playtester launch must
    // not read them at all — a leftover `nextLayer` from last night deciding
    // what layer a boss fights at is exactly the kind of ghost this dialog
    // exists to rule out.
    if (DEV.enabled) loadDevSettings();
    this.scene.start('Title');
  }
}
