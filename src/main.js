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

// The APK pins landscape in AndroidManifest.xml; this is the browser's
// best effort at the same thing. It only succeeds in fullscreen on most
// browsers, hence the silent catch — the game is playable either way.
try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch { /* unsupported */ }

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
  // MULTI-TOUCH. Phaser tracks ONE active pointer by default, which silently
  // makes this game unplayable on a phone: you cannot hold left and jump, or
  // move and shoot, because the second finger is simply never reported. The
  // control layout assumes at least three fingers (move + jump + fire), so
  // four gives a margin for a stray palm.
  input: { activePointers: 4 },
  scene: [BootScene, TitleScene, GameScene, HubScene, UIScene],
});
