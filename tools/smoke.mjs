#!/usr/bin/env node
/**
 * SMOKE TEST — boot the real production bundle in a browser and play it.
 *
 * `npm run smoke` (after `npm run build`).
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT PART OF `npm test`
 * ----------------------------------------------------
 * The unit suite runs in ~0.1s against fake contexts, which is the right
 * standard for plumbing and the reason it gets run before every commit. But a
 * fake context can be WRONG in a way that hides a bug rather than finding one:
 * the boss harness in tests/fights.test.js was missing `anim`, every behaviour
 * reading it produced NaN, the state machine wedged before reaching the line
 * that actually crashed, and the suite stayed green through a fight that dies
 * on the real thing within seconds. This caught that. Nothing else could have.
 *
 * It takes about three minutes and needs a browser, so it stays opt-in and out
 * of CI — the APK build runs `npm test` and should keep doing exactly that.
 * Playwright is deliberately NOT a devDependency: its postinstall pulls ~150MB
 * of browsers onto every CI run for a job CI does not run.
 *
 *     npx playwright@latest install chromium      # once
 *     npm run build && npm run smoke
 *
 * WHAT IT DOES. Serves dist/, opens it, starts a run, then visits every boss
 * whose fight is built and fights each one; then equips every weapon that has a
 * ladder, at every rung, and fires them. It fails on any page exception,
 * console error, failed request, crash overlay, non-finite position, or
 * runaway projectile count.
 *
 * Navigation goes through `globalThis.__game`, the dev-only handle main.js
 * publishes for exactly this. Clicking pixel coordinates was unreliable and,
 * worse, failed SILENTLY — a missed click just left the game sitting on the
 * title screen with nothing to report and a cheerful pass. Play input still
 * goes through the real keyboard, so the input path is exercised for real.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('playwright is not installed — this tool is deliberately opt-in.\n');
  console.log('  npx playwright@latest install chromium');
  console.log('  npm i --no-save playwright');
  console.log('  npm run build && npm run smoke\n');
  process.exit(1);
}

const ROOT = fileURLToPath(new URL('../dist', import.meta.url));
if (!existsSync(join(ROOT, 'index.html'))) {
  console.log('no dist/ — run `npm run build` first.');
  process.exit(1);
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = join(ROOT, url === '/' ? 'index.html' : url);
  if (!existsSync(file)) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4173, r));

// Screenshots go to a scratch directory, never into the repo.
const OUT = mkdtempSync(join(tmpdir(), 'megadash-smoke-'));
const shot = (name) => join(OUT, name);

// Prefer a pre-installed browser when the environment has one (CI images and
// container sandboxes usually do), otherwise let Playwright find its own.
const PINNED = process.env.SMOKE_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(
  existsSync(PINNED) ? { executablePath: PINNED } : {},
);
const page = await browser.newPage({ viewport: { width: 900, height: 420 } });

const problems = [];
const fail = (m) => problems.push(m);
page.on('console', (m) => {
  const t = m.text();
  // 'Failed to load resource' carries no URL; the response handler sees the
  // same event WITH one, so this would only ever be a duplicate.
  if (m.type() !== 'error') return;
  if (/favicon/i.test(t) || /Failed to load resource/i.test(t)) return;
  /**
   * THE HOST HAVING NO SPEAKERS IS NOT A BUG IN THE GAME.
   *
   * "The AudioContext encountered an error from the audio device or the WebAudio
   * renderer" is Chromium reporting that there is no output device to open —
   * which is the normal state of a headless browser, a CI runner and a desktop
   * with audio disabled. It failed the whole run on this machine while every
   * boss, every weapon and every arena passed.
   *
   * Deliberately narrow: it matches the DEVICE message only. An exception
   * thrown by systems/sfx.js still arrives through `pageerror` and still fails,
   * so the audio path itself is as covered as it was.
   */
  if (/AudioContext encountered an error from the audio device/i.test(t)) return;
  fail(`console.error: ${t}`);
});
page.on('response', (r) => {
  if (r.status() >= 400 && !/favicon/i.test(r.url())) fail(`HTTP ${r.status()} ${r.url()}`);
});
page.on('pageerror', (e) => fail(`pageerror: ${e.message}\n${e.stack}`));

// `?dev=1` answers the launch dialog for us. The game now opens on a DEV MODE
// vs PLAYTESTER choice, and every perk this script relies on — the whole
// arsenal unlocked, the boss jump, the HP floor — lives down the dev branch.
await page.goto('http://localhost:4173/?seed=4821&dev=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const has = await page.evaluate(() => !!globalThis.__game);
if (!has) { console.log('FAIL — no __game handle; is DEV.available off?'); process.exit(1); }

/**
 * Hold real keys, so the input path is exercised rather than bypassed.
 *
 * These are the CURRENT bindings — Space jumps, right shift fires — and they
 * have to stay in step with GameScene's keyboard block. When the two swapped,
 * this script kept holding Space for fire and shift for jump: the run still
 * moved, so nothing looked broken, and it quietly stopped testing whether the
 * player could shoot at all.
 */
async function play(seconds, keys) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    for (const k of keys) {
      await page.keyboard.down(k);
      await page.waitForTimeout(55 + Math.random() * 85);
      await page.keyboard.up(k);
    }
  }
}

/** Whatever the crash overlay is showing, or null. It is raw DOM, so readable. */
const crashText = () => page.evaluate(() => {
  const t = document.body.innerText || '';
  return /CRASH/i.test(t) ? t.slice(0, 700) : null;
});

await page.evaluate(() => {
  globalThis.__game.scene.getScene('Title').scene.start('Game');
});
await page.waitForTimeout(1400);

const started = await page.evaluate(() => !!globalThis.__game.scene.getScene('Game')?.run);
if (!started) fail('the run never started');

/**
 * Dismiss the loadout wheel. A dev-mode run opens on the post-boss re-quip
 * window (DEV.requipAtStart), which is a hard pause — so without this every
 * key press below lands on a stopped simulation and the whole script proves
 * nothing. Esc is the shipping way out of it, so this exercises that too.
 */
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const running = await page.evaluate(() => !globalThis.__game.scene.getScene('Game').paused);
if (!running) fail('still paused after Esc — did the start-of-run wheel close?');

await play(6, ['ArrowRight', 'Space', 'ShiftRight', 'ArrowRight', 'Space', 'ArrowLeft', 'KeyW']);
await page.screenshot({ path: shot('area.png') });

/**
 * Visit every boss whose fight is built. This is the point of the exercise:
 * arenas, hazard loops and attack state machines only run inside a sealed room
 * and none of it is reachable from the scrolling area.
 *
 * DERIVED, NEVER LISTED — and derived from FURNISHED rather than hasFight.
 *
 * The hardcoded five it replaced matched `hasFight`, which is the SHIPPED gate:
 * a boss with no layer-1 attack loop stays out of a playtester's bag. But this
 * script is not a playtester. It exists to run real code in a browser and see
 * whether it throws, and an arena with hazard layers built is real code whether
 * or not its boss has learned to fight yet — Thorn Man's greenhouse is exactly
 * that today, six rooms against five fights, and it was the newest content in
 * the repo with nothing exercising it.
 *
 * So this takes the wider set on purpose. A boss joins the sweep on the day his
 * ROOM lands, with no edit here, which is the same rule CLAUDE.md states for
 * both content gates: derive it, never keep a list.
 */
const { FURNISHED } = await import('../src/systems/arena.js');
const BUILT_BOSSES = FURNISHED();
console.log(`  bosses with a room built: ${BUILT_BOSSES.join(', ')}`);

for (const id of BUILT_BOSSES) {
  const jumped = await page.evaluate((want) => {
    const gs = globalThis.__game.scene.getScene('Game');
    // Draw from the shuffle bag until the wanted boss turns up, then use the
    // real dev jump — which drops the player OUTSIDE the door, so the door,
    // the warp and the room building all get exercised too.
    for (let i = 0; i < 40; i++) {
      const def = gs.nextBoss();
      if (def.id !== want) continue;
      gs.devJumpToBoss(def);
      return true;
    }
    return false;
  }, id);
  if (!jumped) { fail(`${id}: never came out of the bag`); continue; }

  // Walk into the door — 72px at 1.375px/frame is about a second.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(2200);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(900);

  const inArena = await page.evaluate(() => {
    const gs = globalThis.__game.scene.getScene('Game');
    return { arena: !!gs.arena, boss: !!gs.boss };
  });
  if (!inArena.arena) { fail(`${id}: never reached the arena (door missed?)`); continue; }
  if (!inArena.boss) fail(`${id}: arena built with no boss in it`);

  // Fight for a while. Both loops get frames, and the fixed seed makes it the
  // same fight on every run.
  await play(11, ['ArrowRight', 'Space', 'ShiftRight', 'Space', 'ArrowLeft', 'ShiftRight', 'KeyW']);
  await page.screenshot({ path: shot(`${id}.png`) });

  const crash = await crashText();
  if (crash) { fail(`${id} crashed:\n${crash}`); break; }

  const alive = await page.evaluate(() => {
    const gs = globalThis.__game.scene.getScene('Game');
    const p = gs.player;
    return {
      run: !!gs.run,
      finite: Number.isFinite(p.x) && Number.isFinite(p.y),
      bossFinite: !gs.boss || (Number.isFinite(gs.boss.x) && Number.isFinite(gs.boss.y)),
    };
  });
  if (!alive.run) fail(`${id}: the run ended mid-fight`);
  if (!alive.finite) fail(`${id}: the player ended at a non-finite position`);
  if (!alive.bossFinite) fail(`${id}: the boss ended at a non-finite position`);
}

/**
 * The loadout and the wheel. Unlock a weapon of each class at max level, slot
 * them from the arc, switch one off — the paths a real run only reaches after
 * several bosses have fallen.
 *
 * Loadout Mastery is forced to the top rank and the re-quip window is forced
 * open, because both are gates a real run passes through the Hub and a boss
 * kill to reach. What is under test here is the wheel, not the gates.
 */
const wheel = await page.evaluate(() => {
  const g = globalThis.__game;
  const gs = g.scene.getScene('Game');
  const ui = g.scene.getScene('UI');
  const out = {};
  for (const id of ['blaze_wheel', 'volt_spark', 'core_blaster', 'torrent_cannon',
    'frost_guard', 'strike_gauntlet', 'quake_hammer', 'swarm_caller',
    'thorn_lash', 'gale_vortex', 'eclipse_blade', 'alloy_blade']) {
    gs.run.unlocked.add(id);
    gs.run.wpLevels[id] = 10;              // the top rung of every ladder
  }
  gs.run.loadout.rank.offensive = 3;
  gs.run.loadout.rank.defensive = 3;
  gs.run.offRank = gs.run.defRank = 3;
  gs.run.requipOpen = true;
  ui.openWheel();
  out.slotsDrawn = ui.active.length + ui.arc.length;

  /**
   * TWO TAPS, IN EITHER ORDER — a weapon, then a module. A single tap on the
   * arc only SELECTS now; it used to equip into a slot the wheel chose for
   * you, and driving it that way here silently stopped filling anything.
   */
  for (const m of ui.active.filter((s) => s.kind === 'slot' && !s.rankLocked)) {
    const cand = ui.arc.find((a) => a.cls === m.cls && !a.vacant);
    if (!cand) continue;
    ui.tapSlot(cand);
    ui.tapSlot(m);
  }
  out.offensive = [...gs.run.loadout.offensive];
  out.defensive = [...gs.run.loadout.defensive];
  /**
   * MOVING THE TRIGGER. `aimWeapon` is a gesture, not a setter: aimed at the
   * weapon already on the trigger it switches that one OFF. So aim at the one
   * that is NOT held — which is the exact case a full offensive row used to
   * get wrong, firing only ever its first weapon.
   */
  const [o0, o1] = gs.run.loadout.offensive;
  const other = gs.run.activeWeapon === o0 ? o1 : o0;
  out.wanted = other;
  gs.aimWeapon(other);
  out.selected = gs.run.activeWeapon;
  gs.toggleWeapon(other);                  // switching it off must re-point the button
  out.afterDisable = gs.run.activeWeapon;
  gs.toggleWeapon(other);
  ui.closeWheel();
  return out;
});
if (wheel.slotsDrawn !== 22) fail(`wheel drew ${wheel.slotsDrawn} slots, expected 22`);
if (wheel.offensive.filter(Boolean).length !== 2) fail(`offensive slots: ${wheel.offensive}`);
if (wheel.defensive.filter(Boolean).length !== 2) fail(`defensive slots: ${wheel.defensive}`);
if (wheel.selected !== wheel.wanted) {
  fail(`aiming at ${wheel.wanted} left the trigger on ${wheel.selected}`);
}
// At rank 3 the arc taps trade the sidearm away, so the fall-back is the OTHER
// offensive slot. What matters is that the fire button never ends up pointed at
// something it cannot fire.
if (!wheel.offensive.includes(wheel.afterDisable)) {
  fail(`disabling the live weapon left ${wheel.afterDisable}`);
}

/**
 * Every weapon with a runtime, at every rung of its ladder, actually fired.
 *
 * Tapping the whole arc above left two weapons with no runtime in the slots,
 * so it proved the wheel worked and nothing about the weapons. This pairs each
 * offensive weapon with a defensive one, sets both to a rung, and plays — so
 * every laddered runtime steps, draws and fires against a live boss. The
 * count is deliberately not written down here: it was 'eight' above a list of
 * twelve by the time anyone checked.
 */
const PAIRS = [
  ['blaze_wheel', 'core_blaster'],
  ['volt_spark', 'torrent_cannon'],
  ['strike_gauntlet', 'frost_guard'],
  ['quake_hammer', 'swarm_caller'],
  ['thorn_lash', 'gale_vortex'],
  ['alloy_blade', 'eclipse_blade'],
];

for (const level of [1, 3, 6, 10]) {
  for (const [off, def] of PAIRS) {
    const ok = await page.evaluate(([o, d, lv]) => {
      const gs = globalThis.__game.scene.getScene('Game');
      const lo = gs.run.loadout;
      lo.rank.offensive = 3; lo.rank.defensive = 3;   // no welded sidearm slot
      lo.offensive[0] = o; lo.offensive[1] = null;
      lo.defensive[0] = d; lo.defensive[1] = null;
      lo.disabled.clear();
      gs.run.wpLevels[o] = lv; gs.run.wpLevels[d] = lv;
      gs.run.wstate = {};            // re-init both runtimes at the new rung
      // Guarded: aiming at the weapon already held switches it OFF.
      if (gs.run.activeWeapon !== o) gs.aimWeapon(o);
      return gs.run.activeWeapon === o;
    }, [off, def, level]);
    if (!ok) { fail(`could not select ${off} at Lv${level}`); continue; }

    // Tap-fire, then a long hold — the two branches of a long-press weapon.
    await play(3, ['Space', 'ArrowRight', 'ShiftLeft', 'Space', 'ArrowLeft', 'KeyS']);
    await page.keyboard.down('Space');
    await page.waitForTimeout(1100);
    await page.keyboard.up('Space');
    await page.waitForTimeout(400);

    const crash = await crashText();
    if (crash) { fail(`${off}+${def} Lv${level} crashed:\n${crash}`); break; }
    const sane = await page.evaluate(() => {
      const gs = globalThis.__game.scene.getScene('Game');
      return Number.isFinite(gs.player.x) && Number.isFinite(gs.player.y)
        && gs.bullets.every((b) => Number.isFinite(b.x) && Number.isFinite(b.y))
        && gs.bullets.length < 400;
    });
    if (!sane) fail(`${off}+${def} Lv${level}: non-finite state or runaway projectiles`);
  }
  if (problems.length) break;
}
await page.screenshot({ path: shot('weapons.png') });

const lastCrash = await crashText();
if (lastCrash) fail(`weapons crashed:\n${lastCrash}`);

await browser.close();
server.close();

if (problems.length) {
  console.log(`FAIL — ${problems.length} problem(s):\n`);
  for (const p of problems.slice(0, 8)) console.log(p + '\n');
  process.exit(1);
}
console.log(`OK — booted, fought ${BUILT_BOSSES.length} built boss(es) (${BUILT_BOSSES.join(', ')}), exercised the loadout`);
console.log(`screenshots: ${OUT}`);
