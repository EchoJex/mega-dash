import Phaser from 'phaser';
import { preloadArt, createAnims } from '../systems/assets.js';
import { installFont } from '../systems/font.js';

/**
 * Loads any real art declared in the asset MANIFEST and registers its
 * animations. Both are no-ops while the manifest is empty, which is the normal
 * state until art lands — see systems/assets.js.
 *
 * Also builds the HUD bitmap font, which is painted in code rather than loaded,
 * so it has to exist before any scene tries to draw a label.
 */
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() { preloadArt(this); }
  create() {
    installFont(this);
    createAnims(this);
    this.scene.start('Title');
  }
}
