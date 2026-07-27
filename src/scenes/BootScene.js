import Phaser from 'phaser';
import { preloadArt } from '../systems/assets.js';

/** Loads any real art declared in the asset MANIFEST. No-op while it's empty. */
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() { preloadArt(this); }
  create() { this.scene.start('Title'); }
}
