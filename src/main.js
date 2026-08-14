/**
 * Entry point. Phaser owns rendering, input, scenes and audio.
 * Gameplay physics are hand-rolled in systems/physics.js — see that file for why.
 */
// FIRST IMPORT, DELIBERATELY. Imports are hoisted and evaluated in order, so
// this module — which installs the error handlers as a side effect of loading —
// is running before any other game module has been evaluated. An exception
// thrown while the rest is still loading is invisible on a phone otherwise.
// See systems/crash.js for why it is raw DOM and imports nothing from the game.
import { setCrashContext } from './systems/crash.js';

import Phaser from 'phaser';
import { VIEW_H, RENDER_SCALE, computeViewWidth, BUILD, DISPLAY_DIAG } from './config/display.js';
import { DEV } from './config/dev.js';
import BootScene from './scenes/BootScene.js';
import LaunchScene from './scenes/LaunchScene.js';
import TitleScene from './scenes/TitleScene.js';
import DevMenuScene from './scenes/DevMenuScene.js';
import GameScene from './scenes/GameScene.js';
import HubScene from './scenes/HubScene.js';
import UIScene from './scenes/UIScene.js';

const viewW = computeViewWidth(window.innerWidth, window.innerHeight);

// Everything a crash report should carry that is known before the game starts.
// GameScene adds the run's seed and where it got to once a run exists.
setCrashContext({
  build: BUILD,
  display: `${DISPLAY_DIAG.scale}x ${DISPLAY_DIAG.cssW}x${DISPLAY_DIAG.cssH}`
    + `@${DISPLAY_DIAG.dpr.toFixed(2)} vw${viewW}`,
});

// The APK pins landscape in AndroidManifest.xml; this is the browser's
// best effort at the same thing. It only succeeds in fullscreen on most
// browsers, hence the silent catch — the game is playable either way.
try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch { /* unsupported */ }

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  // Backing store is RENDER_SCALE times the virtual size; every scene camera
  // zooms by the same factor, so world coordinates stay 400x224.
  width: viewW * RENDER_SCALE,
  height: VIEW_H * RENDER_SCALE,
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
  // LaunchScene and DevMenuScene are the dev branch. They are registered
  // unconditionally and reached conditionally — BootScene sends the game
  // straight to Title when DEV.available is false, and nothing else links to
  // either of them, so a shipped build never constructs one.
  scene: [BootScene, LaunchScene, TitleScene, DevMenuScene, GameScene, HubScene, UIScene],
});

/**
 * DEV-ONLY handle, so an automated playtest can drive a real build: reach into
 * a scene, read player state, jump straight to a boss. There is no other way to
 * verify touch controls or a boss fight without a human holding the phone.
 *
 * Gated on `available`, the COMPILE-TIME switch, not on `enabled` — the launch
 * dialog has not been answered yet when this line runs, and an automated
 * playtest needs the handle in order to reach the dialog at all. Shipping means
 * DEV.available = false, and this vanishes with the rest of the dev branch.
 */
if (DEV.available) globalThis.__game = game;
