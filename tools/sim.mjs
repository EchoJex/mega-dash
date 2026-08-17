/**
 * npm run sim — Monte Carlo difficulty for one weapon against one boss.
 *
 *   npm run sim -- --weapon=blaze_wheel --level=3 --boss=blaze --layer=2 --iterations=100
 *   npm run sim -- --list                      what can be simulated today
 *   npm run sim -- --all --iterations=25       every complete pairing
 *
 * HOW IT RUNS THE GAME. It serves `dist/`, opens `sim.html` in headless
 * Chromium, and calls `GameScene.step()` directly in a loop inside the page.
 * Nothing is mocked: the physics, the boss state machines, the hazard loops and
 * the weapon runtimes are the ones that ship. Skipping `requestAnimationFrame`
 * is what makes it fast — measured at ~340,000 steps/sec, about 5,600x real
 * time, so a 100-iteration encounter takes about a second.
 *
 * WHY NOT PLAIN NODE. Phaser dereferences `window` at module scope, so neither
 * it nor `GameScene` can be imported outside a browser. The alternative — a
 * second copy of the frame order written in Node — would drift from the game
 * and quietly report numbers about the copy. A browser is cheaper than that.
 *
 * DELIBERATELY NOT IN CI AND NOT A DEPENDENCY, exactly like tools/smoke.mjs:
 * Playwright's postinstall drags ~150MB of browsers onto every APK build for a
 * job CI does not run.
 *
 *   npx playwright@latest install chromium     # once
 *   npm run sim -- --list
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../dist', import.meta.url));
const REPO = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

// ── Arguments ─────────────────────────────────────────────────────────

/** `--key=value`, `--flag`. No dependency for four kinds of argument. */
function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=');
    out[k] = v === undefined ? true : v;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const num = (v, d) => (v === undefined ? d : Number(v));

const ITER = num(args.iterations, 100);
const LEVELS = args.level ? String(args.level).split(',').map(Number) : [1];
const LAYERS = args.layer ? String(args.layer).split(',').map(Number) : [1];

if (args.help) {
  console.log(`
  npm run sim -- [options]

    --weapon=<id>[,<id>] weapon(s) under test        (required unless --all/--list)
    --boss=<id>[,<id>]  boss(es) to fight           (required unless --all/--list)
    --level=1,3,6,10    weapon level(s)             default 1
    --layer=1,2,3       boss layer(s)               default 1
    --iterations=N      runs per pairing            default 100
    --with-sidearm      keep the sidearm alongside an offensive weapon
    --force             simulate an incomplete pairing anyway
    --all               sweep every complete pairing
    --list              print what can be simulated today, and what cannot
    --json              raw JSON instead of a table
`);
  process.exit(0);
}

// ── The bundle ────────────────────────────────────────────────────────

/**
 * The sim page only exists when the build was told to make it, so build it
 * rather than telling the reader to. SIM=1 adds `sim.html` as a second Vite
 * entry; a plain `npm run build` — and therefore `npm run apk` — never does.
 */
if (!existsSync(join(ROOT, 'sim.html')) || args.build) {
  console.log('building dist/sim.html (SIM=1 vite build)...');
  execFileSync('npx', ['vite', 'build'], {
    cwd: REPO, env: { ...process.env, SIM: '1' }, stdio: 'inherit',
  });
}

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = join(ROOT, url === '/' ? 'sim.html' : url);
  if (!existsSync(file)) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4174, r));

// A pre-installed browser when the environment has one (CI images and container
// sandboxes usually do), otherwise let Playwright find its own.
const PINNED = process.env.SMOKE_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
const page = await browser.newPage({ viewport: { width: 900, height: 420 } });

const fatal = [];
page.on('pageerror', (e) => fatal.push(`${e.message}\n${e.stack}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
    fatal.push(`console: ${m.text()}`);
  }
});

// `?dev=0` takes the clean branch past the launch dialog. The harness forces
// the one dev hook it needs (the layer override) itself, with every perk off.
await page.goto('http://localhost:4174/sim.html?dev=0', { waitUntil: 'networkidle' });
await page.waitForFunction(() => globalThis.__sim?.ready === true, null, { timeout: 15000 })
  .catch(() => { throw new Error(`harness never booted:\n${fatal.join('\n') || '(no error)'}`); });

const cat = await page.evaluate(() => globalThis.__sim.catalogue());

// ── --list ────────────────────────────────────────────────────────────

if (args.list) {
  console.log('\nWEAPONS THAT CAN BE SIMULATED');
  for (const w of cat.weapons) {
    console.log(`  ${w.id.padEnd(17)} ${w.cls.padEnd(10)}`
      + `${w.passive ? 'passive (fires itself)' : 'active (uses the trigger)'}`);
  }
  console.log('\nSKIPPED — no ladder, so level changes only damage');
  for (const w of cat.skippedWeapons) console.log(`  ${w.id.padEnd(17)} ${w.why}`);

  console.log('\nBOSSES  (A = attack loop, H = hazard loop, = repeats the layer below)');
  for (const b of cat.bosses) {
    const cells = b.layers.map((l) => {
      if (!l.attack && !l.hazard) return ' -- ';
      return (l.attack ? (l.attackRepeat ? 'a' : 'A') : '.')
        + (l.hazard ? (l.hazardRepeat ? 'h' : 'H') : '.');
    });
    const any = b.layers.some((l) => l.attack);
    console.log(`  ${b.id.padEnd(9)} L1 ${cells[0]}  L2 ${cells[1]}  L3 ${cells[2]}`
      + (any ? '' : '   no fight built — skipped'));
  }
  console.log('\nlowercase a/h = fightFor fell back; that layer adds nothing new.\n');
  await browser.close(); server.close();
  process.exit(0);
}

// ── Planning ──────────────────────────────────────────────────────────

const plan = [];
if (args.all) {
  for (const layer of LAYERS) {
    for (const bossId of cat.bosses.filter((b) => b.layers[layer - 1]?.attack).map((b) => b.id)) {
      for (const weaponId of cat.weapons.map((w) => w.id)) {
        for (const level of LEVELS) plan.push({ weaponId, level, bossId, layer });
      }
    }
  }
} else {
  if (!args.weapon || !args.boss) {
    console.log('need --weapon and --boss (or --all, or --list). --help for the rest.');
    await browser.close(); server.close();
    process.exit(1);
  }
  // Comma lists everywhere, so one invocation can be a small sweep. The four
  // axes are independent and the product of them is the plan.
  for (const bossId of String(args.boss).split(',')) {
    for (const weaponId of String(args.weapon).split(',')) {
      for (const layer of LAYERS) {
        for (const level of LEVELS) plan.push({ weaponId, level, bossId, layer });
      }
    }
  }
}

if (!plan.length) {
  console.log('nothing to simulate — run with --list to see what is built.');
  await browser.close(); server.close();
  process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────

console.log(`\nsimulating ${plan.length} pairing(s) x ${ITER} iterations...`);
const t0 = Date.now();
const results = [];
for (const spec of plan) {
  const r = await page.evaluate((s) => globalThis.__sim.run(s), {
    ...spec,
    iterations: ITER,
    force: !!args.force,
    withSidearm: !!args['with-sidearm'],
  });
  results.push(r);
  if (fatal.length) break;
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
await browser.close();
server.close();

if (fatal.length) {
  console.log(`\nFAILED — the page threw:\n${fatal.slice(0, 3).join('\n\n')}`);
  process.exit(1);
}

// ── Output ────────────────────────────────────────────────────────────

if (args.json) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

const ran = results.filter((r) => !r.skipped);
const skipped = results.filter((r) => r.skipped);

if (ran.length) {
  const rows = ran.map((r) => ({
    WEAPON: r.weaponId,
    LV: String(r.level),
    BOSS: r.bossId,
    L: String(r.layer),
    'WIN%': (r.winRate * 100).toFixed(0),
    'HP LOST%': r.hpLostPct.toFixed(0),
    'TTK s': r.winRate ? (r.avgTtkMsWins / 1000).toFixed(1) : '—',
    'ERR f/s': r.errorFramesPerSec.toFixed(1),
    'BOSS%': r.avgBossDealtPct.toFixed(0),
    SHOTS: r.avgShots.toFixed(0),
    'T/O': String(r.timeouts),
    DIFFICULTY: r.difficulty.toFixed(1),
  }));
  const cols = Object.keys(rows[0]);
  const w = cols.map((c) => Math.max(c.length, ...rows.map((x) => x[c].length)));
  const line = (cells) => '  ' + cells.map((v, i) => String(v).padEnd(w[i])).join('  ');
  console.log();
  console.log(line(cols));
  console.log('  ' + w.map((n) => '-'.repeat(n)).join('  '));
  for (const row of rows) console.log(line(cols.map((c) => row[c])));

  const caveats = ran.filter((r) => r.warn?.length);
  if (caveats.length) {
    console.log('\nCAVEATS');
    for (const r of caveats) {
      console.log(`  ${r.weaponId} vs ${r.bossId} L${r.layer}: ${r.warn.join('; ')}`);
    }
  }
}

if (skipped.length) {
  console.log('\nSKIPPED — incomplete content, not simulated');
  for (const r of skipped) {
    console.log(`  ${r.weaponId} vs ${r.bossId} L${r.layer}: ${r.skipped.join('; ')}`);
  }
  console.log('  (--force runs them anyway; the numbers will describe a boss standing still)');
}

console.log(`\nDIFFICULTY 0-100 = 100 x (0.4 x loss rate + 0.3 x HP lost`
  + ` + 0.2 x TTK/90s + 0.1 x time-in-hitbox/15%)`);
console.log(`weapon damage, boss HP and the ramp are all placeholders — read this as`);
console.log(`"does this weapon function against this boss", not as balance.`);
console.log(`\n${ran.length} simulated, ${skipped.length} skipped, ${secs}s\n`);
