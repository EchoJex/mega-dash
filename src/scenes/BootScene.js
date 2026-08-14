import Phaser from 'phaser';
import { preloadArt, createAnims } from '../systems/assets.js';
import { installFont } from '../systems/font.js';
import { DEV, setDevMode, loadDevSettings } from '../config/dev.js';

/**
 * Loads any real art declared in the asset MANIFEST and registers its
 * animations. Both are no-ops while the manifest is empty, which is the normal
 * state until art lands — see systems/assets.js.
 *
 * Also builds the HUD bitmap font, which is painted in code rather than loaded,
 * so it has to exist before any scene tries to draw a label.
 *
 * Then it answers the one question the rest of the game hangs off: which branch
 * are we on? A build with the dev branch in it stops at the LAUNCH DIALOG; a
 * shipped build (`DEV.available === false`) goes straight to the title with
 * every dev path already dead.
 */
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() { preloadArt(this); }
  create() {
    installFont(this);
    createAnims(this);

    if (!DEV.available) { this.scene.start('Title'); return; }

    /**
     * `?dev=1` SKIPS THE DIALOG. Not a convenience — it is the only way an
     * automated playtest can reach dev mode, because tools/smoke.mjs drives the
     * real bundle through the keyboard and has no business clicking its way
     * through a menu to get to the thing it came to test. `?dev=0` forces the
     * clean branch the same way.
     */
    const forced = new URLSearchParams(location.search).get('dev');
    if (forced !== null) {
      setDevMode(forced !== '0');
      if (DEV.enabled) loadDevSettings();
      this.scene.start('Title');
      return;
    }

    this.scene.start('Launch');
  }
}
