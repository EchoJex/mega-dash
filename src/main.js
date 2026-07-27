/**
 * Entry point. Phaser owns rendering, input, scenes and audio.
 * Gameplay physics are hand-rolled in systems/physics.js — see that file for why.
 */
import Phaser from 'phaser';
import { VIEW_H, computeViewWidth } from './config/display.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import HubScene from './scenes/HubScene.js';
import UIScene from './scenes/UIScene.js';

const viewW = computeViewWidth(window.innerWidth, window.innerHeight);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: viewW,
  height: VIEW_H,
  backgroundColor: '#060614',
  // pixelArt + FIT + integer zoom = crisp square pixels at every screen size
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, GameScene, HubScene, UIScene],
});
