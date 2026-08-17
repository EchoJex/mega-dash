/**
 * THE SIMULATION ENTRY POINT — a second Vite page that boots the real game
 * with no renderer and hands the CLI a handle to drive it.
 *
 * IT IS A SEPARATE ENTRY, not a flag inside main.js, so the shipped bundle
 * never carries a byte of this. `vite.config.js` only adds `sim.html` to the
 * build when SIM=1 is set, which `npm run sim` does and `npm run apk` does not.
 *
 * IT IS `Phaser.CANVAS`, NOT `Phaser.HEADLESS`, AND THAT IS DELIBERATE.
 * HEADLESS was tried first and it does not work here: `installFont` builds the
 * HUD glyph sheet with `textures.createCanvas`, which the headless renderer
 * does not provide, so every scene died on `Invalid BitmapText key: megafont`
 * before a fight could start. The renderer costs nothing anyway — the harness
 * calls `GameScene.step()` directly and `draw()` is never reached, so the
 * canvas is allocated and then ignored. Headlessness comes from the BROWSER
 * being headless, which is where it was always going to come from: Phaser
 * cannot be imported under bare Node at all, since it dereferences `window` at
 * module scope.
 *
 * Sound is silenced at the source rather than mocked. `sfx.js` already
 * self-disables when there is no AudioContext, but a browser HAS one, and
 * thousands of fights would build tens of thousands of oscillator nodes for
 * nobody to hear.
 */

import Phaser from 'phaser';
import { VIEW_H, computeViewWidth } from '../config/display.js';
import BootScene from '../scenes/BootScene.js';
import TitleScene from '../scenes/TitleScene.js';
import GameScene from '../scenes/GameScene.js';
import UIScene from '../scenes/UIScene.js';
import { setMuted } from '../systems/sfx.js';
import { FONT_KEY } from '../systems/font.js';
import { runEncounter } from './runner.js';
import { catalogue } from './catalogue.js';

setMuted(true);

const viewW = computeViewWidth(window.innerWidth || 800, window.innerHeight || 450);

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: 'app',
  // RENDER_SCALE is a render-density choice and there is no render. The virtual
  // playfield is the only thing that matters to the simulation, so the canvas
  // is exactly it — 1:1, no zoom to undo.
  width: viewW,
  height: VIEW_H,
  backgroundColor: '#060614',
  banner: false,
  audio: { noAudio: true },
  // Phaser's own loop still runs, but nothing depends on it: the harness calls
  // `GameScene.step()` directly, so the simulation is never gated on a frame.
  scene: [BootScene, TitleScene, GameScene, UIScene],
});

/**
 * The CLI's whole surface. Everything is synchronous once the game has booted,
 * because the simulation deliberately does not wait for frames.
 */
globalThis.__sim = {
  ready: false,
  catalogue,
  run: (spec) => runEncounter(game, spec),
};

/**
 * Boot, then start the run scene ONCE and leave it up. Every iteration calls
 * `startRun()` on the same scene rather than restarting it — a scene restart is
 * deferred to Phaser's next loop tick, and the harness does not run one.
 */
game.events.once('ready', () => {
  const boot = () => {
    /**
     * WAIT FOR THE FONT, not for the game.
     *
     * `ready` fires before BootScene has run, and BootScene is what paints the
     * HUD glyph sheet into a texture. Starting the run scene off `ready` races
     * it, and every `label()` in every scene then dies on `Invalid BitmapText
     * key: megafont` — which looks exactly like a renderer problem and is not
     * one. The font cache entry is the honest signal that Boot has finished.
     */
    if (!game.cache.bitmapFont.exists(FONT_KEY)) { setTimeout(boot, 20); return; }
    const gs = game.scene.getScene('Game');
    if (!gs) { setTimeout(boot, 20); return; }
    if (!gs.scene.isActive()) { gs.scene.start('Game'); setTimeout(boot, 20); return; }
    if (!gs.run) { setTimeout(boot, 20); return; }
    gs.paused = true;                  // nothing advances until the harness says so
    globalThis.__sim.ready = true;
  };
  boot();
});
