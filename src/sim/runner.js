/**
 * RUNNER — Monte Carlo over one encounter, inside the page.
 *
 * THE TIMESTEP IS THE POINT. `GameScene.update()` banks a real-time delta and
 * spends it in whole 1/60s `step()` calls; this calls `step()` directly, so the
 * simulation is bound by the CPU rather than by the display. Nothing is mocked
 * to achieve that — `step()` is already a pure function of the fixed timestep
 * and `intent`, and `draw()` is a separate call that simply never happens.
 *
 * WHERE THE VARIANCE COMES FROM. Boss attack selection uses `Math.random`, so
 * two runs of the same encounter genuinely differ. The world seed does not
 * matter here: an arena is a sealed room built by `makeArena`, not procedural
 * terrain, and no ambient minions spawn in one.
 */

import { SimController } from './controller.js';
import { setUp, completeness, takeOverDev, isPassive } from './encounter.js';
import { aggregate, TIMEOUT_SEC } from './metrics.js';

/**
 * Neutralise the three things a run does on its way out that a THOUSAND runs
 * must not do: bank the save, tear the scene down, and stop the world.
 *
 * Installed once and left in place — the sim page is not the game.
 */
function stub(game) {
  const gs = game.scene.getScene('Game');
  const ui = game.scene.getScene('UI');

  // `die()` writes runs and Chips into the save and starts the Title scene.
  gs.die = function simDie() { this.simDied = true; };
  // The post-boss wheel hard-pauses the game. There is nobody to dismiss it.
  if (ui) {
    ui.promptRequip = () => {};
    ui.openWheel = () => {};
    ui.openCards = () => {};
  }
  // `recordBossKill` persists on every kill. The browser profile is throwaway,
  // but tens of thousands of localStorage writes are not free.
  try { localStorage.setItem = () => {}; } catch { /* nothing to silence */ }
  return gs;
}

/** One fight. Returns the record `aggregate` wants. */
function runOnce(gs, spec) {
  const info = setUp(gs, spec);
  const ai = new SimController(gs, { passive: info.passive });
  /**
   * HOW CLOSE DID IT GET, AND DID IT SHOOT AT ALL.
   *
   * A 0% win rate has two completely different causes — the fight is hard, or
   * the weapon never fired — and the four headline metrics cannot tell them
   * apart. Damage dealt and shots fired can, so they are collected rather than
   * inferred.
   *
   * Shots are counted off `gs.bullets` rather than by wrapping a spawn method,
   * because there is no single choke point: the runtime weapons go through
   * `spawnPlayerShot`, and the sidearm and the flat weapons push straight into
   * the array from `fire()`. Wrapping the former alone reported the SIDEARM as
   * firing zero shots while it took 39% off a boss's bar.
   */
  let shots = 0;
  const maxFrames = Math.round(TIMEOUT_SEC * 60);
  const bossId = spec.bossId;

  gs.simDied = false;
  gs.paused = false;
  let frames = 0;
  let win = false;

  /**
   * UNAVOIDABLE DAMAGE, attributed one hit at a time.
   *
   * The controller decides BEFORE the frame resolves and records whether any
   * action it could have taken was clean. So when health drops during the step
   * that follows, that flag says whether a different input would have helped.
   * Damage with no escape available is the boss's design; damage with one is
   * the player's execution — and only the first kind tells you a fight is
   * unfair rather than merely hard.
   */
  let dmgTotal = 0, dmgUnavoidable = 0;

  while (frames < maxFrames) {
    ai.step();
    const escape = ai.hadEscape;
    const hp0 = gs.run.hp;
    const before = gs.bullets.length;
    gs.step();
    const lost = hp0 - gs.run.hp;
    if (lost > 0) { dmgTotal += lost; if (!escape) dmgUnavoidable += lost; }
    for (let i = before; i < gs.bullets.length; i++) if (!gs.bullets[i].enemy) shots++;
    frames++;
    if (gs.simDied) break;
    // The boss object is cleared the frame he dies; `bossesDefeated` is what
    // survives it. Checking the list rather than `!gs.boss` also refuses to
    // call a fight won if the reference vanished for any other reason.
    if (gs.run.bossesDefeated.includes(bossId)) { win = true; break; }
    // A wrap door, a warp, or the exit confirmation means the fight is over one
    // way or another. The pop-up is a human question and there is no human.
    if (gs.warp || gs.run.confirmExit) break;
  }

  const hpLostFrac = gs.simDied ? 1 : Math.max(0, (info.maxHp - gs.run.hp) / info.maxHp);
  // The boss object is gone on a win, so a win is 100% of his bar dealt.
  const bossDealt = win ? 1
    : Math.max(0, (info.bossMaxHp - (gs.boss?.hp ?? 0)) / info.bossMaxHp);
  return {
    win,
    ttkMs: (frames / 60) * 1000,
    hpLostFrac,
    errorFrames: ai.errorFrames,
    frames,
    shots,
    bossDealt,
    // The three new axes.
    dmgTotal,
    dmgUnavoidable,
    inputs: ai.inputs,
    noEscapeFrames: ai.noEscapeFrames,
    timedOut: !win && !gs.simDied,
  };
}

/**
 * Run one encounter `iterations` times and fold the result.
 *
 * Refuses an incomplete pairing rather than scoring it — a boss with no
 * behaviour stands still while the player shoots him, and that is not an easy
 * fight, it is no fight. See `completeness`.
 */
export function runEncounter(game, spec) {
  const { weaponId, level, bossId, layer, iterations = 100, force = false } = spec;
  const state = completeness(weaponId, bossId, layer);
  if (!state.ok && !force) {
    return { weaponId, level, bossId, layer, skipped: state.skip, warn: state.warn };
  }

  const gs = stub(game);
  const restore = takeOverDev(layer);
  const runs = [];
  try {
    for (let i = 0; i < iterations; i++) {
      runs.push(runOnce(gs, { weaponId, level, bossId, layer, withSidearm: spec.withSidearm }));
    }
  } finally {
    restore();
  }

  return {
    weaponId, level, bossId, layer,
    passive: isPassive(weaponId),
    warn: state.warn,
    forced: !state.ok,
    timeouts: runs.filter((r) => r.timedOut).length,
    // Diagnostics, not difficulty: they exist to say WHY a score is what it is.
    avgShots: runs.reduce((n, r) => n + r.shots, 0) / runs.length,
    avgBossDealtPct: 100 * runs.reduce((n, r) => n + r.bossDealt, 0) / runs.length,
    ...aggregate(runs, spec.weights),
  };
}
