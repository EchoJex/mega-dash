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
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

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
                        (needs no browser and no build — answers from source)
    --no-build          skip the SIM=1 rebuild and score the existing dist/
    --json              raw JSON instead of a table
    --save              write the run to design/sim/ and diff it against the last
`);
  process.exit(0);
}

/** What `--list` prints. Kept beside the flag so both paths read as one thing. */
function printCatalogue(cat) {
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
}

// ── --list, before anything expensive ─────────────────────────────────

/**
 * `--list` ANSWERS FROM THE SOURCE, not from a running game.
 *
 * The catalogue is a pure derivation over `bosses.js`, `bossFights.js` and
 * `weapons.js` — it imports nothing that touches a DOM — so listing what can be
 * simulated needs no browser, no bundle and no server. It used to read
 * `globalThis.__sim.catalogue()` out of the page, which meant the one command
 * that exists to tell you what this tool can do was the one command you could
 * not run without first installing 150MB of Chromium and waiting out a build.
 *
 * Handled here, above the build and the playwright import, so it stays instant.
 */
if (args.list) {
  const { catalogue } = await import('../src/sim/catalogue.js');
  printCatalogue(catalogue());
  process.exit(0);
}

/**
 * PLAYWRIGHT IS DELIBERATELY NOT A DEPENDENCY — its postinstall would pull
 * ~150MB of browsers onto every APK build for a job CI does not run. So it may
 * genuinely be absent, and a bare top-level import turned that into eight lines
 * of `ERR_MODULE_NOT_FOUND` Node internals. `tools/smoke.mjs` already says the
 * useful thing instead; this is the same message.
 */
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('playwright is not installed — this tool is deliberately opt-in.\n');
  console.log('  npx playwright@latest install chromium');
  console.log('  npm i --no-save playwright');
  console.log('  npm run sim -- --list      (this one needs neither)\n');
  process.exit(1);
}

// ── The bundle ────────────────────────────────────────────────────────

/**
 * The sim page only exists when the build was told to make it, so build it
 * rather than telling the reader to. SIM=1 adds `sim.html` as a second Vite
 * entry; a plain `npm run build` — and therefore `npm run apk` — never does.
 */
/**
 * REBUILD EVERY RUN UNLESS TOLD NOT TO. This used to build only when
 * `dist/sim.html` was ABSENT, so the loop this tool exists for — change the
 * game, run the sim, read the numbers — silently scored the FIRST build
 * forever after. Getting the same difficulty score back from code you just
 * changed is the most misleading thing a measurement tool can do.
 *
 * A build is ~25s against a sweep that runs for minutes, so paying it by
 * default is the right trade. `--no-build` is the escape hatch when you are
 * re-reading a sweep rather than testing a change.
 */
if (!args['no-build']) {
  console.log('building dist/sim.html (SIM=1 vite build)...');
  // `shell: true` because on Windows the executable is `npx.cmd`, and
  // execFileSync without a shell cannot resolve it — the auto-build died with
  // ENOENT on the platform the game is developed on.
  execFileSync('npx', ['vite', 'build'], {
    cwd: REPO, env: { ...process.env, SIM: '1' }, stdio: 'inherit', shell: true,
  });
} else if (!existsSync(join(ROOT, 'sim.html'))) {
  console.error('--no-build, but dist/sim.html does not exist. Drop the flag.');
  process.exit(1);
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
  const table = (rows) => {
    const cols = Object.keys(rows[0]);
    const w = cols.map((c) => Math.max(c.length, ...rows.map((x) => x[c].length)));
    const line = (cells) => '  ' + cells.map((v, i) => String(v).padEnd(w[i])).join('  ');
    console.log(line(cols));
    console.log('  ' + w.map((n) => '-'.repeat(n)).join('  '));
    for (const row of rows) console.log(line(cols.map((c) => row[c])));
  };

  const metricCells = (r) => ({
    'WIN%': (r.winRate * 100).toFixed(0),
    'HP%': r.hpLostPct.toFixed(0),
    'UNFAIR%': r.unfairPct.toFixed(0),
    'TTK s': r.winRate ? (r.avgTtkMsWins / 1000).toFixed(1) : '—',
    'IN/s': r.inputsPerSec.toFixed(1),
    INPUTS: r.inputs.toFixed(0),
    'ERR f/s': r.errorFramesPerSec.toFixed(1),
    'BOSS%': r.avgBossDealtPct.toFixed(0),
    DIFF: r.difficulty.toFixed(1),
  });

  console.log('\nPER LOADOUT — one row per weapon, level, boss and layer');
  table(ran.map((r) => ({
    WEAPON: r.weaponId, LV: String(r.level), BOSS: r.bossId, L: String(r.layer),
    ...metricCells(r),
  })));

  /**
   * PER BOSS — the same fight seen across every loadout that fought it.
   *
   * The per-loadout table answers "can this weapon beat him"; this one answers
   * "how hard is HE", which is a different question and the one a difficulty
   * pass actually asks. Averaged over loadouts rather than pooled, so a boss is
   * not judged by whichever weapon happened to be tested most.
   */
  const byBoss = new Map();
  for (const r of ran) {
    const k = `${r.bossId} L${r.layer}`;
    if (!byBoss.has(k)) byBoss.set(k, []);
    byBoss.get(k).push(r);
  }
  if (byBoss.size) {
    const avg = (xs, f) => (xs.length ? xs.reduce((a, b) => a + f(b), 0) / xs.length : 0);
    const bossRows = [...byBoss.entries()]
      .map(([k, rs]) => ({ k, rs, d: avg(rs, (r) => r.difficulty) }))
      .sort((a, b) => b.d - a.d)
      .map(({ k, rs, d }) => ({
        BOSS: k,
        LOADOUTS: String(rs.length),
        ...metricCells({
          winRate: avg(rs, (r) => r.winRate),
          hpLostPct: avg(rs, (r) => r.hpLostPct),
          unfairPct: avg(rs, (r) => r.unfairPct),
          avgTtkMsWins: avg(rs.filter((r) => r.winRate), (r) => r.avgTtkMsWins),
          inputsPerSec: avg(rs, (r) => r.inputsPerSec),
          inputs: avg(rs, (r) => r.inputs),
          errorFramesPerSec: avg(rs, (r) => r.errorFramesPerSec),
          avgBossDealtPct: avg(rs, (r) => r.avgBossDealtPct),
          difficulty: d,
        }),
      }));
    console.log('\nPER BOSS — averaged across every loadout tested, hardest first');
    table(bossRows);
  }

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

console.log(`\nUNFAIR% = the share of damage taken that NO available input could have`);
console.log(`avoided. The controller scores every action each frame, so "was there an out"`);
console.log(`is already known — a high UNFAIR% means unfair, not merely hard.`);
console.log(`IN/s and INPUTS = how busy your hands were, and what a kill cost in presses.`);
console.log(`BOSS% = how much of his bar came off. A 0% win rate with a low BOSS% is a`);
console.log(`weapon that cannot reach him, not a hard fight.`);
console.log(`\nDIFF 0-100 = 30% loss rate + 25% HP lost + 15% unavoidable share`
  + ` + 15% TTK + 10% time-in-hitbox + 5% inputs-per-second`);
console.log(`weapon damage, boss HP and the ramp are all placeholders — read this as`);
console.log(`"does this weapon function against this boss", not as balance.`);
console.log(`\n${ran.length} simulated, ${skipped.length} skipped, ${secs}s\n`);

/**
 * --save — KEEP THE RESULTS IN THE REPO, NEXT TO THE DESIGN THEY JUDGE.
 *
 * The loop this exists for is: change the game, run the sim, read the numbers,
 * change the game again. That only works if a run can be compared to the one
 * before it, and a number in a terminal that has scrolled away cannot be. So a
 * saved run is a FILE and therefore a commit: `git log design/sim/` is the
 * history of how hard this game has been, and any two runs are a `git diff`.
 *
 * The JSON is the record; `latest.md` is the thing to actually read, and it
 * carries the delta against the previous save so a tweak's effect is the first
 * thing on screen rather than something to work out by eye.
 */
if (args.save && ran.length) {
  const dir = join(REPO, 'design', 'sim');
  mkdirSync(dir, { recursive: true });

  // The previous save, for the delta — read BEFORE the new one lands.
  const prior = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().pop();
  const before = prior
    ? JSON.parse(readFileSync(join(dir, prior), 'utf8')).results || []
    : [];
  const key = (r) => `${r.weaponId}|${r.level}|${r.bossId}|${r.layer}`;
  const wasBy = new Map(before.map((r) => [key(r), r]));

  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO })
    .toString().trim();

  writeFileSync(join(dir, `${stamp}.json`), `${JSON.stringify({
    stamp, commit: head, iterations: ITER, weights: null, results: ran,
  }, null, 2)}\n`);

  // The readable half, rewritten each save so `latest.md` is always the newest.
  const md = [];
  md.push(`# Simulation — ${stamp} (\`${head}\`)`, '');
  md.push(`${ran.length} pairings x ${ITER} iterations. Higher DIFF is harder.`, '');
  if (prior) md.push(`Delta is against \`${prior.replace('.json', '')}\`.`, '');
  md.push('## Per boss, hardest first', '');
  md.push('| boss | loadouts | win% | hp% | unfair% | ttk s | in/s | inputs | diff | vs last |');
  md.push('|---|---|---|---|---|---|---|---|---|---|');

  const groups = new Map();
  for (const r of ran) {
    const k = `${r.bossId} L${r.layer}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const mean = (xs, f) => (xs.length ? xs.reduce((a, b) => a + f(b), 0) / xs.length : 0);
  const rows = [...groups.entries()].map(([k, rs]) => {
    const now = mean(rs, (r) => r.difficulty);
    const wasRs = rs.map((r) => wasBy.get(key(r))).filter(Boolean);
    const was = wasRs.length ? mean(wasRs, (r) => r.difficulty) : null;
    return { k, rs, now, was };
  }).sort((a, b) => b.now - a.now);

  for (const { k, rs, now, was } of rows) {
    const d = was === null ? '—'
      : `${now - was >= 0 ? '+' : ''}${(now - was).toFixed(1)}`;
    md.push(`| ${k} | ${rs.length} | ${(100 * mean(rs, (r) => r.winRate)).toFixed(0)} `
      + `| ${mean(rs, (r) => r.hpLostPct).toFixed(0)} `
      + `| ${mean(rs, (r) => r.unfairPct).toFixed(0)} `
      + `| ${(mean(rs.filter((r) => r.winRate), (r) => r.avgTtkMsWins) / 1000).toFixed(1)} `
      + `| ${mean(rs, (r) => r.inputsPerSec).toFixed(1)} `
      + `| ${mean(rs, (r) => r.inputs).toFixed(0)} `
      + `| **${now.toFixed(1)}** | ${d} |`);
  }

  md.push('', '## Per loadout', '');
  md.push('| weapon | lv | boss | l | win% | hp% | unfair% | ttk s | in/s | inputs | boss% | diff | vs last |');
  md.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of [...ran].sort((a, b) => b.difficulty - a.difficulty)) {
    const w = wasBy.get(key(r));
    const d = w ? `${r.difficulty - w.difficulty >= 0 ? '+' : ''}${(r.difficulty - w.difficulty).toFixed(1)}` : '—';
    md.push(`| ${r.weaponId} | ${r.level} | ${r.bossId} | ${r.layer} `
      + `| ${(r.winRate * 100).toFixed(0)} | ${r.hpLostPct.toFixed(0)} | ${r.unfairPct.toFixed(0)} `
      + `| ${r.winRate ? (r.avgTtkMsWins / 1000).toFixed(1) : '—'} `
      + `| ${r.inputsPerSec.toFixed(1)} | ${r.inputs.toFixed(0)} | ${r.avgBossDealtPct.toFixed(0)} `
      + `| **${r.difficulty.toFixed(1)}** | ${d} |`);
  }
  writeFileSync(join(dir, 'latest.md'), `${md.join('\n')}\n`);
  console.log(`saved design/sim/${stamp}.json and refreshed design/sim/latest.md`);
  if (prior) console.log(`  delta is against ${prior}`);
}
