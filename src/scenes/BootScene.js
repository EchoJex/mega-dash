import Phaser from 'phaser';
import { preloadArt, createAnims } from '../systems/assets.js';

/**
 * Loads any real art declared in the asset MANIFEST and registers its
 * animations. Both are no-ops while the manifest is empty, which is the normal
 * state until art lands — see systems/assets.js.
 */
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() { preloadArt(this); }
  create() {
    createAnims(this);
    this.scene.start('Title');
  }
}
